/**
 * =============================================================================
 * SENIOR SOFTWARE ENGINEER - LOAD & STRESS CAPACITY BENCHMARK SUITE
 * Project: F&B Drink and Food Shop
 * Purpose: Empirical capacity testing across functional flows (100 -> 500 -> 1000 -> 2500 VUs)
 * Metrics: Throughput (RPS), Latencies (min, p50, p90, p95, p99, max), Error Rate, Heap
 * =============================================================================
 */

const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'load-test-secret-2026';
process.env.JWT_REFRESH_SECRET = 'load-test-refresh-secret-2026';

// Silence stdout during batch runs to prevent I/O blocking
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalLog = console.log.bind(console);
const originalError = console.error.bind(console);

function muteOutput() {
  process.stdout.write = () => true;
  console.log = () => {};
  console.error = () => {};
}

function unmuteOutput() {
  process.stdout.write = originalStdoutWrite;
  console.log = originalLog;
  console.error = originalError;
}

// Models & Services
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Order = require('../src/models/Order');
const Coupon = require('../src/models/Coupon');
const CartItem = require('../src/models/CartItem');
const Review = require('../src/models/Review');
const Location = require('../src/models/Location');

const app = require('../src/app');

// Prepare Valid ObjectIds
const MOCK_USER_ID = new mongoose.Types.ObjectId().toString();
const MOCK_PROD_ID_1 = new mongoose.Types.ObjectId().toString();
const MOCK_PROD_ID_2 = new mongoose.Types.ObjectId().toString();

const MOCK_TOKEN = jwt.sign(
  { id: MOCK_USER_ID, sub: MOCK_USER_ID, role: 'CUSTOMER' },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: '1h' }
);

const MOCK_PRODUCTS = [
  {
    _id: new mongoose.Types.ObjectId(MOCK_PROD_ID_1),
    id: MOCK_PROD_ID_1,
    name: 'Trà Sữa Trân Châu Hoàng Gia',
    slug: 'tra-sua-tran-chau-hoang-gia',
    basePrice: 45000,
    isAvailable: true,
    isFeatured: true,
    sortOrder: 1,
    optionGroups: [
      {
        _id: 'grp1',
        id: 'grp1',
        name: 'Size',
        options: [{ _id: 'opt1', id: 'opt1', name: 'Size L', extraPrice: 10000 }]
      }
    ],
    toJSON: function() { return { ...this, id: this.id }; }
  },
  {
    _id: new mongoose.Types.ObjectId(MOCK_PROD_ID_2),
    id: MOCK_PROD_ID_2,
    name: 'Cà Phê Muối Đặc Biệt',
    slug: 'ca-phe-muoi-dac-biet',
    basePrice: 35000,
    isAvailable: true,
    isFeatured: true,
    sortOrder: 2,
    optionGroups: [],
    toJSON: function() { return { ...this, id: this.id }; }
  }
];

function setupStubs() {
  // Product Stubs - supports both chained queries (.sort.skip.limit.populate) and direct awaits
  const makeChain = (data) => {
    const chain = {
      sort: () => chain,
      skip: () => chain,
      limit: () => chain,
      populate: () => chain,
      then: (resolve) => resolve(data)
    };
    return chain;
  };

  Product.find = (query) => {
    if (query && query._id && query._id.$in) {
      const ids = query._id.$in.map(i => i.toString());
      const filtered = MOCK_PRODUCTS.filter(p => ids.includes(p.id) || ids.includes(p._id.toString()));
      return makeChain(filtered.length > 0 ? filtered : MOCK_PRODUCTS);
    }
    return makeChain(MOCK_PRODUCTS);
  };
  Product.countDocuments = () => Promise.resolve(MOCK_PRODUCTS.length);
  Product.findById = (id) => Promise.resolve(MOCK_PRODUCTS[0]);
  Product.findOne = () => Promise.resolve(MOCK_PRODUCTS[0]);

  // User Stubs
  const mockUserObj = {
    id: MOCK_USER_ID,
    _id: new mongoose.Types.ObjectId(MOCK_USER_ID),
    fullName: 'Nguyen Van Perf',
    email: 'perf@test.com',
    loyaltyPoints: 100,
    isActive: true,
    role: 'CUSTOMER',
    save: () => Promise.resolve()
  };
  User.findById = () => Promise.resolve(mockUserObj);
  User.findOne = () => Promise.resolve({
    ...mockUserObj,
    passwordHash: '$2b$10$abcdefghijklmnopqrstuu'
  });

  // CartItem Stubs
  CartItem.find = () => ({
    populate: () => ({
      sort: () => Promise.resolve([
        {
          id: 'cart-1',
          productId: MOCK_PRODUCTS[0],
          quantity: 2,
          selectedOptions: [],
          toJSON: () => ({ id: 'cart-1', productId: MOCK_PRODUCTS[0], quantity: 2 })
        }
      ])
    }),
    then: (resolve) => resolve([])
  });
  CartItem.findOne = () => Promise.resolve(null);
  CartItem.create = (data) => Promise.resolve({ id: 'new-cart-item', ...data });
  CartItem.deleteMany = () => Promise.resolve({ acknowledged: true, deletedCount: 1 });

  // Order Stubs
  Order.aggregate = () => Promise.resolve([
    { _id: MOCK_PRODUCTS[0]._id, totalQty: 150 },
    { _id: MOCK_PRODUCTS[1]._id, totalQty: 90 }
  ]);
  Order.create = (data) => Promise.resolve({
    id: 'ord-123',
    _id: new mongoose.Types.ObjectId(),
    orderNumber: `DH${Date.now()}_${Math.random().toString(36).substring(7)}`,
    ...data,
    toJSON: () => ({ id: 'ord-123', ...data })
  });
  Order.find = () => makeChain([]);
  Order.findById = () => Promise.resolve({
    id: 'ord-123',
    orderNumber: 'DH12345678',
    status: 'CONFIRMED',
    items: [],
    totalAmount: 50000
  });

  // Review & Coupon & Category Stubs
  Review.find = () => makeChain([]);
  Coupon.findOne = () => Promise.resolve(null);
  Category.find = () => Promise.resolve([{ id: 'cat-1', name: 'Trà Sữa', slug: 'tra-sua' }]);
}

function calculateStats(latencies) {
  if (latencies.length === 0) return { min: 0, max: 0, mean: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  latencies.sort((a, b) => a - b);
  const sum = latencies.reduce((acc, v) => acc + v, 0);
  const p = (pct) => latencies[Math.min(Math.floor(latencies.length * (pct / 100)), latencies.length - 1)];

  return {
    min: latencies[0].toFixed(2),
    mean: (sum / latencies.length).toFixed(2),
    p50: p(50).toFixed(2),
    p90: p(90).toFixed(2),
    p95: p(95).toFixed(2),
    p99: p(99).toFixed(2),
    max: latencies[latencies.length - 1].toFixed(2)
  };
}

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 5000,
  maxFreeSockets: 2000,
  timeout: 10000
});

function makeRequest(port, method, path, headers = {}, body = null) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers,
      'Connection': 'keep-alive'
    };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
        agent,
        timeout: 8000
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          const endTime = process.hrtime.bigint();
          const latencyMs = Number(endTime - startTime) / 1e6;
          resolve({
            statusCode: res.statusCode,
            latencyMs,
            success: res.statusCode >= 200 && res.statusCode < 400
          });
        });
      }
    );

    req.on('error', (err) => {
      const endTime = process.hrtime.bigint();
      const latencyMs = Number(endTime - startTime) / 1e6;
      resolve({
        statusCode: 0,
        latencyMs,
        success: false,
        error: err.code || err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const endTime = process.hrtime.bigint();
      resolve({
        statusCode: 408,
        latencyMs: Number(endTime - startTime) / 1e6,
        success: false,
        error: 'ETIMEDOUT'
      });
    });

    if (payload) req.write(payload);
    req.end();
  });
}

async function executeBatch(port, getScenario, totalRequests, concurrency) {
  const latencies = [];
  let successCount = 0;
  let failCount = 0;
  const errorMap = {};

  const wallStart = Date.now();
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < totalRequests) {
      const idx = currentIndex++;
      const scenario = getScenario(idx);
      const res = await makeRequest(
        port,
        scenario.method,
        scenario.path,
        scenario.headers,
        scenario.body
      );

      latencies.push(res.latencyMs);
      if (res.success) {
        successCount++;
      } else {
        failCount++;
        const key = res.statusCode || res.error || 'UNKNOWN';
        errorMap[key] = (errorMap[key] || 0) + 1;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const durationSec = (Date.now() - wallStart) / 1000;
  const rps = (totalRequests / Math.max(durationSec, 0.001)).toFixed(1);
  const stats = calculateStats(latencies);

  return {
    totalRequests,
    concurrency,
    durationSec: durationSec.toFixed(2),
    rps,
    successCount,
    failCount,
    errorRate: ((failCount / totalRequests) * 100).toFixed(2) + '%',
    errors: errorMap,
    stats
  };
}

const SCENARIOS = {
  HEALTH: () => ({
    name: '1. Health Check (Kernel/TCP baseline)',
    fn: () => ({ method: 'GET', path: '/health' })
  }),
  CATALOG: () => ({
    name: '2. Catalog Browsing (Read-Heavy)',
    fn: (idx) => ({
      method: 'GET',
      path: idx % 2 === 0 ? '/api/v1/products?page=1&limit=20' : `/api/v1/products/${MOCK_PROD_ID_1}`
    })
  }),
  CART: () => ({
    name: '3. Cart Read & Add (Session Stateful)',
    fn: (idx) => ({
      method: idx % 2 === 0 ? 'GET' : 'POST',
      path: '/api/v1/cart',
      headers: { Authorization: `Bearer ${MOCK_TOKEN}` },
      body: idx % 2 === 0 ? null : {
        productId: MOCK_PROD_ID_1,
        quantity: 1,
        selectedOptions: [{ groupId: 'grp1', optionId: 'opt1' }]
      }
    })
  }),
  ORDER: () => ({
    name: '4. Order Checkout (Transactional Contention)',
    fn: () => ({
      method: 'POST',
      path: '/api/v1/orders',
      headers: { Authorization: `Bearer ${MOCK_TOKEN}` },
      body: {
        items: [{ productId: MOCK_PROD_ID_1, quantity: 2, selectedOptions: [] }],
        paymentMethod: 'COD',
        deliveryAddress: { label: 'Văn phòng', fullAddress: '72 Lê Thánh Tôn, Q1', lat: 10.7769, lng: 106.7009 },
        shippingFee: 15000,
        pointsUsed: 0
      }
    })
  }),
  JOURNEY: () => ({
    name: '5. Full E2E User Journey (Realistic Mix)',
    fn: (idx) => {
      const step = idx % 4;
      if (step === 0) return { method: 'GET', path: '/api/v1/products?limit=10' };
      if (step === 1) return { method: 'GET', path: `/api/v1/products/${MOCK_PROD_ID_1}` };
      if (step === 2) return {
        method: 'POST',
        path: '/api/v1/cart',
        headers: { Authorization: `Bearer ${MOCK_TOKEN}` },
        body: { productId: MOCK_PROD_ID_1, quantity: 1 }
      };
      return {
        method: 'POST',
        path: '/api/v1/orders',
        headers: { Authorization: `Bearer ${MOCK_TOKEN}` },
        body: {
          items: [{ productId: MOCK_PROD_ID_1, quantity: 1, selectedOptions: [] }],
          paymentMethod: 'COD',
          deliveryAddress: { label: 'Nhà riêng', fullAddress: '123 Nguyen Hue', lat: 10.7769, lng: 106.7009 },
          shippingFee: 15000
        }
      };
    }
  })
};

async function runAllBenchmarks() {
  setupStubs();

  const server = http.createServer(app);
  // Increase listen backlog to 2048 to prevent TCP SYN drops under spike
  await new Promise((res) => server.listen(0, '127.0.0.1', 2048, res));
  const port = server.address().port;

  unmuteOutput();
  console.log(`=============================================================================`);
  console.log(`🚀 SENIOR ENGINEER LOAD & STRESS CAPACITY BENCHMARK RUNNER`);
  console.log(`Port: ${port} | Node: ${process.version} | Platform: ${process.platform} (${process.arch})`);
  console.log(`Tiers to Test: 100 VUs -> 500 VUs -> 1,000 VUs -> 2,500 VUs`);
  console.log(`=============================================================================\n`);

  const concurrencyTiers = [
    { name: 'Tier 1 (Normal Load)', concurrency: 100, requests: 1000 },
    { name: 'Tier 2 (High Traffic)', concurrency: 500, requests: 2500 },
    { name: 'Tier 3 (Spike/Peak Load)', concurrency: 1000, requests: 4000 },
    { name: 'Tier 4 (Stress Saturation Limit)', concurrency: 2500, requests: 5000 }
  ];

  const summaryMatrix = [];

  for (const tier of concurrencyTiers) {
    unmuteOutput();
    console.log(`\n-----------------------------------------------------------------------------`);
    console.log(`🔷 EXECUTING: ${tier.name} | Concurrency: ${tier.concurrency} VUs | Batch: ${tier.requests} reqs`);
    console.log(`-----------------------------------------------------------------------------`);

    for (const [key, scenario] of Object.entries(SCENARIOS)) {
      const scenarioObj = scenario();
      muteOutput();

      // Warmup small
      await executeBatch(port, scenarioObj.fn, Math.min(tier.concurrency, 30), 10);

      const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
      const res = await executeBatch(port, scenarioObj.fn, tier.requests, tier.concurrency);
      const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;

      summaryMatrix.push({
        concurrency: tier.concurrency,
        tierName: tier.name,
        flow: scenarioObj.name,
        rps: Number(res.rps),
        p50: Number(res.stats.p50),
        p95: Number(res.stats.p95),
        p99: Number(res.stats.p99),
        max: Number(res.stats.max),
        errorRate: res.errorRate,
        heapDeltaMB: Number((memAfter - memBefore).toFixed(2))
      });

      unmuteOutput();
      console.log(`  [${scenarioObj.name}]`);
      console.log(`    -> RPS: ${res.rps} req/s | Err: ${res.errorRate} | p50: ${res.stats.p50}ms | p95: ${res.stats.p95}ms | p99: ${res.stats.p99}ms | Max: ${res.stats.max}ms`);
      if (Object.keys(res.errors).length > 0) {
        console.log(`    -> Error breakdown:`, JSON.stringify(res.errors));
      }
    }
  }

  server.close();
  unmuteOutput();
  console.log(`\n=============================================================================`);
  console.log(`✅ BENCHMARK SUITE COMPLETED SUCCESSFULLY`);
  console.log(`=============================================================================`);

  const fs = require('fs');
  fs.writeFileSync(
    'load-benchmark-results.json',
    JSON.stringify({ timestamp: new Date().toISOString(), matrix: summaryMatrix }, null, 2)
  );
  console.log('Exported results to load-benchmark-results.json');
}

runAllBenchmarks().catch((err) => {
  unmuteOutput();
  console.error('Fatal Benchmark Error:', err);
  process.exit(1);
});
