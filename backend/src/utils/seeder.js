require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Review = require('../models/Review');
const Location = require('../models/Location');
const CartItem = require('../models/CartItem');
const Region = require('../models/Region');
const Store = require('../models/Store');
const Promotion = require('../models/Promotion');
const Staff = require('../models/Staff');
const connectDB = require('../config/db');

const seedData = async () => {
  try {
    console.log('🌱 Bắt đầu nạp dữ liệu mẫu cho MongoDB...');

    // 1. Dọn dẹp dữ liệu cũ trong các collection
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Coupon.deleteMany({}),
      Review.deleteMany({}),
      Location.deleteMany({}),
      CartItem.deleteMany({}),
      Region.deleteMany({}),
      Store.deleteMany({}),
      Promotion.deleteMany({}),
      Staff.deleteMany({})
    ]);
    console.log('  🧹 Đã xóa toàn bộ dữ liệu cũ trong cơ sở dữ liệu.');

    // 2. Tạo người dùng mặc định (Có mật khẩu băm)
    console.log('  👤 Đang tạo người dùng mẫu...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('123456', salt);

    const users = await User.create([
      {
        email: 'admin@fb.com',
        phone: '0987654321',
        fullName: 'Quản trị viên F&B',
        passwordHash,
        role: 'ADMIN',
        loyaltyPoints: 500,
        loyaltyTier: 'GOLD'
      },
      {
        email: 'shipper@fb.com',
        phone: '0912345678',
        fullName: 'Shipper Nguyễn Văn An',
        passwordHash,
        role: 'SHIPPER'
      },
      {
        email: 'customer@fb.com',
        phone: '0901234567',
        fullName: 'Khách hàng Trần Thị Bình',
        passwordHash,
        role: 'CUSTOMER',
        loyaltyPoints: 120,
        loyaltyTier: 'SILVER',
        addresses: [
          {
            label: 'Nhà riêng',
            fullAddress: '235 Nguyễn Văn Cừ, Quận 5, TP.HCM',
            lat: 10.7624,
            lng: 106.6823,
            isDefault: true
          },
          {
            label: 'Văn phòng',
            fullAddress: '32 Đường Ba Tháng Hai, Quận 10, TP.HCM',
            lat: 10.7766,
            lng: 106.6778,
            isDefault: false
          }
        ]
      },
      {
        email: 'customer2@fb.com',
        phone: '0902345678',
        fullName: 'Khách hàng Lê Văn Cường',
        passwordHash,
        role: 'CUSTOMER',
        loyaltyPoints: 50,
        loyaltyTier: 'BRONZE'
      },
      {
        email: 'shipper2@fb.com',
        phone: '0903456789',
        fullName: 'Shipper Phạm Văn Dũng',
        passwordHash,
        role: 'SHIPPER'
      }
    ]);
    console.log(`    Đã tạo thành công ${users.length} người dùng.`);

    // 3. Tạo Coupons (Mã giảm giá)
    console.log('  🎫 Đang tạo mã giảm giá mẫu...');
    const coupons = await Coupon.create([
      {
        code: 'GIAM20',
        type: 'PERCENT',
        value: 20,
        minOrderAmount: 40000,
        maxUsage: 100,
        isActive: true
      },
      {
        code: 'GIAM50K',
        type: 'FIXED',
        value: 50000,
        minOrderAmount: 150000,
        maxUsage: 50,
        isActive: true
      },
      {
        code: 'FBFREE',
        type: 'FIXED',
        value: 15000,
        minOrderAmount: 30000,
        maxUsage: 200,
        isActive: true
      },
      {
        code: 'KHAIXUAN',
        type: 'PERCENT',
        value: 10,
        minOrderAmount: 20000,
        maxUsage: 500,
        isActive: true
      },
      {
        code: 'VIPPRO',
        type: 'PERCENT',
        value: 30,
        minOrderAmount: 200000,
        maxUsage: 20,
        isActive: true
      }
    ]);
    console.log(`    Đã tạo thành công ${coupons.length} mã giảm giá.`);

    // 4. Tạo Categories (Danh mục sản phẩm)
    console.log('  🗂️ Đang tạo danh mục mẫu...');
    const categories = await Category.create([
      {
        name: 'Trà sữa',
        slug: 'tra-sua',
        description: 'Trà sữa đa dạng topping béo ngậy',
        sortOrder: 1,
        isActive: true
      },
      {
        name: 'Nước ép',
        slug: 'nuoc-ep',
        description: 'Nước ép trái cây tươi mát thanh lọc cơ thể',
        sortOrder: 2,
        isActive: true
      },
      {
        name: 'Snack & Đồ ăn vặt',
        slug: 'snack',
        description: 'Đồ ăn vặt khoai tây, xiên que thơm ngon',
        sortOrder: 3,
        isActive: true
      },
      {
        name: 'Cà phê',
        slug: 'ca-phe',
        description: 'Cà phê nguyên chất đậm vị truyền thống',
        sortOrder: 4,
        isActive: true
      },
      {
        name: 'Combo tiết kiệm',
        slug: 'combo',
        description: 'Combo món ngon giá cực ưu đãi',
        sortOrder: 5,
        isActive: true
      }
    ]);
    console.log(`    Đã tạo thành công ${categories.length} danh mục.`);

    const [traSua, nuocEp, snack, caPhe, combo] = categories;

    // Tùy chọn đi kèm cho đồ uống (Option Groups & Options)
    const drinkOptionGroups = [
      {
        name: 'Size',
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 1,
        options: [
          { name: 'Size M', extraPrice: 0, sortOrder: 1 },
          { name: 'Size L', extraPrice: 6000, sortOrder: 2 }
        ]
      },
      {
        name: 'Mức đường',
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 2,
        options: [
          { name: '100% Đường', extraPrice: 0, sortOrder: 1 },
          { name: '70% Đường', extraPrice: 0, sortOrder: 2 },
          { name: '50% Đường', extraPrice: 0, sortOrder: 3 },
          { name: '30% Đường', extraPrice: 0, sortOrder: 4 }
        ]
      },
      {
        name: 'Mức đá',
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 3,
        options: [
          { name: '100% Đá', extraPrice: 0, sortOrder: 1 },
          { name: '50% Đá', extraPrice: 0, sortOrder: 2 },
          { name: 'Không Đá', extraPrice: 0, sortOrder: 3 }
        ]
      },
      {
        name: 'Topping',
        required: false,
        minSelect: 0,
        maxSelect: 3,
        sortOrder: 4,
        options: [
          { name: 'Trân châu đen', extraPrice: 5000, sortOrder: 1 },
          { name: 'Thạch dừa', extraPrice: 5000, sortOrder: 2 },
          { name: 'Pudding trứng', extraPrice: 8000, sortOrder: 3 }
        ]
      }
    ];

    const snackOptionGroups = [
      {
        name: 'Hương vị',
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 1,
        options: [
          { name: 'Truyền thống', extraPrice: 0, sortOrder: 1 },
          { name: 'Cay nồng', extraPrice: 0, sortOrder: 2 },
          { name: 'Xốt phô mai', extraPrice: 3000, sortOrder: 3 }
        ]
      }
    ];

    // 5. Tạo Products (Sản phẩm món ăn/nước uống)
    console.log('  🍔 Đang tạo sản phẩm mẫu...');
    const products = await Product.create([
      // === Danh mục: Trà sữa ===
      {
        name: 'Trà sữa trân châu đường đen',
        slug: 'tra-sua-tran-chau-duong-den',
        description: 'Trà sữa thơm béo kết hợp trân châu đường đen dai mềm, best seller mọi thời đại.',
        basePrice: 35000,
        image: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=600',
        categoryId: traSua._id,
        isFeatured: true,
        sortOrder: 1,
        optionGroups: drinkOptionGroups
      },
      {
        name: 'Trà sữa Matcha Uji',
        slug: 'tra-sua-matcha',
        description: 'Matcha Nhật Bản thơm ngon đặc trưng, vị thanh nhẹ kết hợp kem sữa béo ngậy.',
        basePrice: 40000,
        image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600',
        categoryId: traSua._id,
        isFeatured: true,
        sortOrder: 2,
        optionGroups: drinkOptionGroups
      },
      {
        name: 'Trà sữa Thái Xanh',
        slug: 'tra-sua-thai-xanh',
        description: 'Hương trà Thái đặc trưng thanh mát kết hợp trân châu thạch dừa giòn sần sật.',
        basePrice: 32000,
        image: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=600',
        categoryId: traSua._id,
        isFeatured: true,
        sortOrder: 3,
        optionGroups: drinkOptionGroups
      },
      // === Danh mục: Nước ép ===
      {
        name: 'Nước ép cam nha đam',
        slug: 'nuoc-ep-cam-nha-dam',
        description: 'Nước cam vắt nguyên chất kết hợp tép nha đam giòn ngọt mát dịu.',
        basePrice: 28000,
        image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600',
        categoryId: nuocEp._id,
        isFeatured: false,
        sortOrder: 1,
        optionGroups: drinkOptionGroups
      },
      {
        name: 'Nước ép dưa hấu bạc hà',
        slug: 'nuoc-ep-dua-hau',
        description: 'Dưa hấu tươi mát hòa quyện lá bạc hà sảng khoái ngày hè.',
        basePrice: 28000,
        image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80',
        categoryId: nuocEp._id,
        isFeatured: true,
        sortOrder: 2,
        optionGroups: drinkOptionGroups
      },
      // === Danh mục: Đồ ăn vặt ===
      {
        name: 'Khoai tây lốc xoáy lắc phô mai',
        slug: 'khoai-tay-loc-xoay',
        description: 'Khoai tây xắt khoanh xoáy giòn rụm phủ đầy lớp bột phô mai mặn ngọt.',
        basePrice: 25000,
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600',
        categoryId: snack._id,
        isFeatured: false,
        sortOrder: 1,
        optionGroups: snackOptionGroups
      },
      {
        name: 'Cá viên chiên nước mắm tỏi ớt',
        slug: 'ca-vien-chien-nuoc-mam',
        description: 'Cá viên giòn giòn xào đậm đà sốt nước mắm keo kẹo và tỏi ớt phi thơm lừng.',
        basePrice: 30000,
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
        categoryId: snack._id,
        isFeatured: true,
        sortOrder: 2,
        optionGroups: snackOptionGroups
      },
      // === Danh mục: Cà phê ===
      {
        name: 'Cà phê muối Huế đặc sản',
        slug: 'ca-phe-muoi-hue',
        description: 'Cà phê phin truyền thống thơm nồng kết hợp lớp bọt kem muối biển mặn mà độc đáo.',
        basePrice: 25000,
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600',
        categoryId: caPhe._id,
        isFeatured: true,
        sortOrder: 1,
        optionGroups: drinkOptionGroups
      },
      {
        name: 'Bạc sỉu cốt dừa béo ngậy',
        slug: 'bac-siu-cot-dua',
        description: 'Cà phê sữa thơm béo thêm sữa dừa xay thơm ngon tuyệt đỉnh.',
        basePrice: 28000,
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600',
        categoryId: caPhe._id,
        isFeatured: false,
        sortOrder: 2,
        optionGroups: drinkOptionGroups
      },
      // === Danh mục: Combo tiết kiệm ===
      {
        name: 'Combo Trà Sữa & Cá Viên',
        slug: 'combo-tra-sua-ca-vien',
        description: '1 Trà sữa trân châu đường đen & 1 Đĩa cá viên chiên nước mắm, ăn uống no nê giá hời.',
        basePrice: 55000,
        image: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=600&auto=format&fit=crop&q=80',
        categoryId: combo._id,
        isFeatured: true,
        sortOrder: 1,
        optionGroups: snackOptionGroups
      }
    ]);
    console.log(`    Đã tạo thành công ${products.length} sản phẩm thực đơn.`);

    // 6. Tạo 5 Địa điểm cửa hàng mẫu (Tọa độ thật ở TP.HCM để minh họa geocoding)
    console.log('  📍 Đang tạo danh sách địa điểm mẫu...');
    const locations = await Location.create([
      {
        name: 'F&B Shop - Chi nhánh Quận 1 (Trụ sở chính)',
        address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',
        latitude: 10.7769,
        longitude: 106.7009,
        description: 'Nằm ngay phố đi bộ sầm uất, mở cửa 24/7.',
        phone: '0281234567',
        isActive: true
      },
      {
        name: 'F&B Shop - Chi nhánh Quận 3',
        address: '200 Cao Thắng, Phường 12, Quận 3, Thành phố Hồ Chí Minh',
        latitude: 10.7719,
        longitude: 106.6789,
        description: 'Có không gian máy lạnh yên tĩnh thích hợp học tập.',
        phone: '0282345678',
        isActive: true
      },
      {
        name: 'F&B Shop - Chi nhánh Quận 7',
        address: '700 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, Thành phố Hồ Chí Minh',
        latitude: 10.7626,
        longitude: 106.6601,
        description: 'Đối diện đại học RMIT, chỗ đậu xe hơi thoải mái.',
        phone: '0283456789',
        isActive: true
      },
      {
        name: 'F&B Shop - Chi nhánh Thủ Đức',
        address: '1 Võ Văn Ngân, Phường Linh Chiểu, Thành phố Thủ Đức, Hồ Chí Minh',
        latitude: 10.8504,
        longitude: 106.7719,
        description: 'Trung tâm ăn vặt sinh viên của làng Đại học.',
        phone: '0284567890',
        isActive: true
      },
      {
        name: 'F&B Shop - Chi nhánh Bình Thạnh',
        address: '12 Điện Biên Phủ, Phường 25, Quận Bình Thạnh, Thành phố Hồ Chí Minh',
        latitude: 10.7981,
        longitude: 106.7119,
        description: 'Chi nhánh gần Landmark 81 cực chill.',
        phone: '0285678901',
        isActive: true
      }
    ]);
    console.log(`    Đã tạo thành công ${locations.length} chi nhánh địa điểm.`);

    // 6.1. Cập nhật workingBranchId cho Admin và Shipper sau khi locations đã tạo
    console.log('  🔄 Đang liên kết người dùng mẫu với chi nhánh cửa hàng...');
    const adminUser = users.find(u => u.role === 'ADMIN');
    const shipper1 = users.find(u => u.email === 'shipper@fb.com');
    const shipper2 = users.find(u => u.email === 'shipper2@fb.com');
    
    if (adminUser) {
      adminUser.workingBranchId = locations[0]._id;
      await adminUser.save();
    }
    if (shipper1) {
      shipper1.workingBranchId = locations[1]._id;
      await shipper1.save();
    }
    if (shipper2) {
      shipper2.workingBranchId = locations[2]._id;
      await shipper2.save();
    }
    console.log('    Liên kết người dùng với chi nhánh hoàn tất.');

    // 6.2. Tạo Vùng miền (Region) và Cửa hàng (Store) mẫu
    console.log('  🏪 Đang tạo Vùng miền và Cửa hàng mẫu...');
    const regions = await Region.create([
      {
        name: 'Khu vực Trung Tâm',
        city: 'Thành phố Hồ Chí Minh',
        code: 'SG_CENTER',
        description: 'Các quận trung tâm nội thành'
      },
      {
        name: 'Khu vực Ngoại Thành',
        city: 'Thành phố Hồ Chí Minh',
        code: 'SG_OUTER',
        description: 'Các quận huyện ngoại ô'
      }
    ]);

    const stores = await Store.create([
      {
        name: 'F&B Shop Premium - Bến Nghé',
        email: 'bennghe@fbshop.com',
        phone: '0289999111',
        address: '100 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
        openingHours: '07:00 - 23:00',
        description: 'Cửa hàng flagship của hệ thống.',
        amenities: ['Wifi', 'Điều hòa', 'Chỗ đỗ xe hơi'],
        location: {
          type: 'Point',
          coordinates: [106.7020, 10.7750] // [lng, lat]
        },
        region: {
          city: regions[0].city,
          code: regions[0].code,
          name: regions[0].name
        },
        category: categories[0]._id, // Milk tea
        averageRating: 4.8,
        totalReviews: 25
      },
      {
        name: 'F&B Shop Express - Linh Chiểu',
        email: 'linhchieu@fbshop.com',
        phone: '0289999222',
        address: '10 Võ Văn Ngân, Phường Linh Chiểu, Thủ Đức, TP.HCM',
        openingHours: '08:00 - 22:00',
        description: 'Cửa hàng dịch vụ nhanh phục vụ mang đi.',
        amenities: ['Wifi', 'Thanh toán thẻ'],
        location: {
          type: 'Point',
          coordinates: [106.7725, 10.8510]
        },
        region: {
          city: regions[1].city,
          code: regions[1].code,
          name: regions[1].name
        },
        category: categories[0]._id,
        averageRating: 4.2,
        totalReviews: 12
      }
    ]);

    // 6.3. Tạo Nhân viên (Staff) cho cửa hàng
    console.log('  👥 Đang tạo Nhân viên mẫu...');
    await Staff.create([
      {
        fullName: 'Trần Văn Nhân',
        email: 'nhantran@fbshop.com',
        phone: '0977112233',
        position: 'Cửa hàng trưởng',
        hireDate: new Date('2025-01-10'),
        store: stores[0]._id
      },
      {
        fullName: 'Nguyễn Thị Thu',
        email: 'thunguyen@fbshop.com',
        phone: '0977445566',
        position: 'Thu ngân',
        hireDate: new Date('2025-02-15'),
        store: stores[0]._id
      }
    ]);

    // 6.4. Tạo Khuyến mãi (Promotion) mẫu
    console.log('  🎁 Đang tạo Khuyến mãi mẫu...');
    await Promotion.create([
      {
        title: 'Mừng Khai Trương Chi Nhánh Mới',
        description: 'Giảm giá 15% khi đặt món tại chi nhánh Bến Nghé.',
        code: 'KHAITRUONG15',
        discountPercent: 15,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-31'),
        stores: [stores[0]._id]
      },
      {
        title: 'Ưu Đãi Hè Rực Rỡ',
        description: 'Chương trình ưu đãi hè áp dụng toàn hệ thống.',
        code: 'HEVUIVE',
        discountPercent: 10,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-08-31'),
        stores: [stores[0]._id, stores[1]._id]
      }
    ]);

    // 7. Tạo Đơn hàng mẫu
    console.log('  📦 Đang tạo đơn hàng mẫu...');
    const customerUser = users.find(u => u.email === 'customer@fb.com');
    const orderProduct = products[0]; // Trà sữa trân châu đường đen

    const mockOrders = await Order.create([
      {
        orderNumber: 'DH888888',
        userId: customerUser._id,
        status: 'DELIVERED',
        subtotal: 35000,
        shippingFee: 15000,
        discountAmount: 0,
        totalAmount: 50000,
        paymentMethod: 'COD',
        paymentStatus: 'PAID',
        startLocationId: locations[0]._id,
        deliveryAddress: {
          label: 'Nhà riêng',
          fullAddress: '235 Nguyễn Văn Cừ, Quận 5, TP.HCM',
          lat: 10.7624,
          lng: 106.6823
        },
        deliveryLat: 10.7624,
        deliveryLng: 106.6823,
        note: 'Giao hàng giờ hành chính',
        items: [
          {
            productId: orderProduct._id,
            productName: orderProduct.name,
            quantity: 1,
            unitPrice: 35000,
            selectedOptions: [
              { groupId: 'size-id', optionId: 'size-m-id', optionName: 'Size M' },
              { groupId: 'sugar-id', optionId: 'sugar-100-id', optionName: '100% Đường' },
              { groupId: 'ice-id', optionId: 'ice-100-id', optionName: '100% Đá' }
            ],
            subtotal: 35000
          }
        ],
        statusLogs: [
          { status: 'CONFIRMED', note: 'Đơn COD - Xác nhận tự động', createdBy: 'system' },
          { status: 'DELIVERED', note: 'Đơn hàng giao thành công.', createdBy: 'shipper' }
        ],
        deliveredAt: new Date(),
        paidAt: new Date()
      },
      {
        orderNumber: 'DH999999',
        userId: customerUser._id,
        status: 'PENDING_PAYMENT',
        subtotal: 70000,
        shippingFee: 15000,
        discountAmount: 14000, // 20% coupon GIAM20
        totalAmount: 71000,
        paymentMethod: 'SEPAY',
        paymentStatus: 'PENDING',
        couponId: coupons[0]._id,
        startLocationId: locations[0]._id,
        deliveryAddress: {
          label: 'Văn phòng',
          fullAddress: '32 Đường Ba Tháng Hai, Quận 10, TP.HCM',
          lat: 10.7766,
          lng: 106.6778
        },
        deliveryLat: 10.7766,
        deliveryLng: 106.6778,
        note: 'Để ở quầy lễ tân',
        items: [
          {
            productId: orderProduct._id,
            productName: orderProduct.name,
            quantity: 2,
            unitPrice: 35000,
            selectedOptions: [],
            subtotal: 70000
          }
        ],
        statusLogs: [
          { status: 'PENDING_PAYMENT', note: 'Chờ thanh toán qua VietQR', createdBy: 'system' }
        ]
      }
    ]);
    console.log(`    Đã tạo thành công ${mockOrders.length} đơn hàng mẫu.`);

    // 8. Tạo Đánh giá sản phẩm mẫu
    console.log('  ⭐ Đang tạo đánh giá sản phẩm mẫu...');
    const customerUser2 = users.find(u => u.email === 'customer2@fb.com');
    await Review.create([
      {
        userId: customerUser._id,
        productId: orderProduct._id,
        orderId: mockOrders[0]._id.toString(),
        rating: 5,
        comment: 'Trà sữa ngon cực kì, trân châu dai giòn rất vừa miệng, sẽ ủng hộ tiếp!',
        images: '[]'
      },
      {
        userId: customerUser2._id,
        productId: orderProduct._id,
        orderId: mockOrders[0]._id.toString(),
        rating: 4,
        comment: 'Nước ngon, phục vụ nhanh nhưng đá hơi nhiều.',
        images: '[]'
      }
    ]);
    console.log('    Đã tạo đánh giá thành công.');

    // 9. Cập nhật averageRating và reviewCount cho các sản phẩm dựa trên review đã tạo
    console.log('  🔄 Đang đồng bộ hóa điểm đánh giá trung bình cho sản phẩm...');
    const allProducts = await Product.find({});
    for (const prod of allProducts) {
      const reviews = await Review.find({ productId: prod._id });
      if (reviews.length > 0) {
        const reviewCount = reviews.length;
        const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;
        prod.averageRating = parseFloat(averageRating.toFixed(1));
        prod.reviewCount = reviewCount;
        await prod.save();
      }
    }
    console.log('    Đồng bộ hóa điểm đánh giá hoàn tất.');

    // 10. Tạo Giỏ hàng mẫu (CartItem) để tránh collection rỗng
    console.log('  🛒 Đang tạo giỏ hàng mẫu...');
    await CartItem.create([
      {
        userId: customerUser._id,
        productId: orderProduct._id,
        quantity: 2,
        selectedOptions: [
          { groupId: 'size-id', optionId: 'size-m-id', optionName: 'Size M' }
        ],
        note: 'Độ ngọt 50%, đá ít'
      }
    ]);
    console.log('    Đã tạo giỏ hàng mẫu thành công.');

    console.log('\n🎉 Quá trình nạp dữ liệu mẫu HOÀN TẤT thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi xảy ra trong quá trình nạp dữ liệu mẫu:', error);
    process.exit(1);
  }
};

// Thực thi kết nối DB và chạy Seeder
connectDB().then(() => {
  seedData();
});
