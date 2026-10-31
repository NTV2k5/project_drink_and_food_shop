---
name: production-engineering-lifecycle
description: End-to-end production engineering protocol for AI-Native Software Engineers to design, build, test, secure, deploy, scale, and maintain mission-critical applications with architectural guardrails.
origin: Senior Software Architect & AI Engineering Playbook
---

# Production Engineering Lifecycle: Scalability & Maintainability Protocol

A comprehensive, production-grade protocol for AI agents to build, harden, scale, and maintain software systems. This skill enforces strict architectural guardrails, preventing technical debt, hallucinated dependencies, security vulnerabilities, and scaling bottlenecks.

---

## When to Activate

Activate this skill whenever the user asks to:
- Build, design, or implement a **production-ready** feature or entire project.
- Plan architecture, database schemas, or system design with requirements for high availability and scale.
- Refactor existing code for better maintainability, testability, and clean architecture.
- Containerize, set up CI/CD, deploy to Cloud (AWS, GCP, VPS), or configure zero-downtime releases.
- Audit code for security (OWASP API Top 10), concurrency race conditions, or performance bottlenecks.
- Establish observability, structured logging, monitoring, and automated healthchecks.

---

## Core Pillars: Scalability & Maintainability

```
┌────────────────────────────────────────────────────────────────────────┐
│               THE TWO PILLARS OF PRODUCTION ENGINEERING                │
├───────────────────────────────────┬────────────────────────────────────┤
│   PILLAR 1: MAINTAINABILITY       │   PILLAR 2: SCALABILITY            │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Clean Architecture (3 Layers)   │ • Stateless App (12-Factor App)    │
│ • Contract-First (OpenAPI & Zod)  │ • Two-Tier Concurrency Lock (Redis)│
│ • Strict Type Safety (No `any`)   │ • Read/Write DB Separation (ACU)   │
│ • Unified Error Handling (AppError│ • Asynchronous Offloading (Queues) │
│ • Structured JSON Logs (Pino)     │ • Multi-Layer Caching (Cache-Aside)│
│ • Expand & Contract DB Migrations │ • Horizontal Auto-Scaling (ECS/K8s)│
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 1. Pillar 1: Maintainability Engineering

Code is read 10x more than it is written. AI agents must enforce patterns that make the codebase easy to understand, test, refactor, and maintain for years.

### 1.1. Clean Architecture (Strict 3-Layer Decoupling)
Never put business logic in controllers or database queries in HTTP handlers.
- **Domain Layer (`src/domain/`):** Enterprise entities, value objects, domain errors, business rules. Zero external dependencies (no ORM, no Express, no HTTP).
- **Application Layer (`src/application/`):** Use cases, service logic, DTO definitions, repository interfaces. Orchestrates business workflows and manages transactions.
- **Infrastructure Layer (`src/infrastructure/`):** Database ORM implementations (Prisma/Drizzle/TypeORM), Redis clients, external API adapters (Payment, SMS, Cloud S3).
- **Interfaces Layer (`src/interfaces/`):** HTTP Controllers, Middlewares, Routes, CLI commands, Event consumers. Responsible only for input parsing, validation, and HTTP serialization.

### 1.2. Contract-First & Strict Type Governance
- Every API input/output MUST have an explicit **Zod** schema and **OpenAPI 3.0** contract.
- **Zero Tolerance for `any`:** In TypeScript, use `unknown` with type guards. Enable `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`.
- **Domain Errors:** All errors must inherit from a unified `AppError`:
  ```typescript
  export class AppError extends Error {
    constructor(
      public readonly message: string,
      public readonly statusCode: number = 500,
      public readonly errorCode: string = 'INTERNAL_ERROR',
      public readonly isOperational: boolean = true,
      public readonly details?: unknown
    ) {
      super(message);
      Object.setPrototypeOf(this, new.target.prototype);
      Error.captureStackTrace(this);
    }
  }
  ```

### 1.3. Structured Logging & Observability
- **Never use `console.log`** in production code. Use a structured JSON logger (e.g., `pino` or `winston`).
- Every incoming HTTP request must be assigned a unique `traceId` (or `x-request-id`), passed down to all logs and downstream calls:
  ```json
  {"level":"info","time":1726978400000,"traceId":"a9f1...","method":"POST","path":"/api/v1/appointments","statusCode":201,"durationMs":45.2,"msg":"Appointment created"}
  ```

### 1.4. Zero-Downtime Database Migrations (Expand & Contract)
Never perform destructive schema changes (e.g., `DROP COLUMN`, `RENAME COLUMN`, changing column types directly).
1. **Expand:** Add new nullable column. Update application to write to both old and new columns, reading with fallback.
2. **Backfill:** Run an asynchronous idempotent script in batches to populate old data to the new column.
3. **Contract:** Switch application to read/write only from new column. Once stable, drop old column in a subsequent release.

---

## 2. Pillar 2: Scalability & High-Concurrency Engineering

Systems must maintain low latency (< 200ms p95) and zero data corruption under 100x traffic surges.

### 2.1. Concurrency Guard & Double-Booking Protection
When multiple users compete for a scarce resource (e.g., doctor appointment slot, flash sale inventory, seat reservation):
- **Tier 1 (In-Memory Distributed Lock):** Use **Redis Distributed Lock (Redlock / Lua Script)** for high-speed temporary reservation (e.g., hold for 10 minutes):
  ```lua
  -- Atomic check and lock slot
  if redis.call('get', KEYS[1]) == false then
      redis.call('set', KEYS[1], ARGV[1], 'PX', ARGV[2])
      return 1
  else
      return 0
  end
  ```
- **Tier 2 (Relational ACID Row-Level Lock):** At final payment/confirmation, execute database transaction with row-level locking:
  ```sql
  BEGIN;
  SELECT id, status FROM schedule_slots WHERE id = $slotId AND status = 'HELD' FOR UPDATE;
  UPDATE schedule_slots SET status = 'BOOKED', updated_at = NOW() WHERE id = $slotId;
  INSERT INTO appointments (...) VALUES (...);
  COMMIT;
  ```

### 2.2. Asynchronous Decoupling (Queue-Driven Architecture)
Do not make the HTTP thread wait for non-critical side effects. Offload them to background workers via **BullMQ** (Redis) or **AWS SQS**:
- Email / SMS / Zalo ZNS confirmations.
- Audit log archiving.
- Analytics and metric aggregation.
- Automatic expiration jobs (releasing expired held slots).

### 2.3. Multi-Tier Caching (Cache-Aside Pattern)
- **Edge Cache (CloudFront / CDN):** Cache static HTML, images, CSS/JS bundles.
- **Application Cache (Redis):** Cache read-heavy data (Doctor profiles, Department catalogs, Service prices) with explicit TTL and cache invalidation hooks upon updates.
- Protect against cache stampede / penetration: Use mutex locks on cache misses and cache null objects with short TTL (60s).

---

## 3. Step-by-Step Production Engineering Protocol

When assigned a project, execute systematically through these 7 phases:

```
[Phase 0: Inception & PRD] ➔ [Phase 1: Scaffolding & AI Rules] ➔ [Phase 2: Bottom-Up TDD]
                                                                        ▼
[Phase 6: Observability] ◀── [Phase 5: Cloud IaC Live] ◀── [Phase 4: CI/CD & Docker] ◀── [Phase 3: Security & Tests]
```

### Phase 0: Inception, PRD & Architecture RFC
1. Deconstruct fuzzy user requirements into a formal PRD (Functional, NFR: 99.9% SLA, p95 < 200ms, RPO/RTO).
2. Create Technical RFC comparing architectural tradeoffs (Next.js vs Vite, Postgres vs Mongo, Serverless vs Container).
3. Design Schema with Audit columns (`created_at`, `updated_at`, `deleted_at`, `version` for optimistic lock).
4. Author OpenAPI 3.0 spec before writing implementation code.

### Phase 1: Scaffolding & AI Context Governance
1. Initialize repository with clean directory structure (`domain`, `application`, `infrastructure`, `interfaces`).
2. Write `.cursorrules` / `AGENTS.md` enforcing coding style, strict typing, and concurrency rules.
3. Configure `.aiignore` / `.cursorignore` to prevent leaking secrets (`.env`, certificates) and wasting context window on lockfiles/build artifacts.
4. Integrate MCP servers (Postgres MCP, Git MCP) for ground-truth verification.

### Phase 2: Iterative Feature Dev via Micro-Context TDD
1. **Layer 1:** Database migration & entity type definitions.
2. **Layer 2:** Domain Repository & Core Service logic with Concurrency Locks.
3. **Layer 3:** Controller, Zod schema validation & Auth/Rate-limit middleware.
4. **Layer 4:** Accessible, mobile-first Client UI with optimistic mutation (TanStack Query).
5. Enforce **TDD cycle**: Write failing test first (Red) -> Write minimal code to pass (Green) -> Optimize & refactor.

### Phase 3: Automated Testing & Security Hardening
1. **Testing Pyramid:**
   - Unit Tests (Vitest/Jest): Mock external deps, test edge cases, nullability, math logic.
   - Integration Tests (Supertest + Testcontainers): Run real PostgreSQL & Redis in Docker; test concurrency and transaction rollback.
   - E2E Tests (Playwright): Critical user paths (Triage -> Slot Select -> VietQR Payment -> Ticket View).
2. **OWASP API Security Audit:**
   - Audit for BOLA/IDOR (validate resource ownership: `order.userId === req.user.id`).
   - Audit for Mass Assignment (explicit DTO parsing).
   - Audit for Rate Limiting & DoS (Nginx/Gateway rate limit + JSON body size limit `10kb`).

### Phase 4: Containerization & CI/CD Automation
1. Multi-stage `Dockerfile`:
   - Stage 1: Dependencies (`npm ci`).
   - Stage 2: Build (`npm run build`, `npm prune --production`).
   - Stage 3: Runner (`node:20-alpine`, non-root user `appuser`, `dumb-init` PID 1 for signal handling). Total size < 150MB.
2. `docker-compose.prod.yml`: Healthcheck probes, logging rotation (20MB limit), CPU/Memory resource constraints.
3. GitHub Actions CI/CD Pipeline: Lint -> Typecheck -> Test -> Trivy Container Security Scan -> Push Registry (GHCR/ECR) -> Rolling Deploy.

### Phase 5: Cloud Infrastructure (IaC) & Zero-Downtime Deployment
1. Infrastructure as Code via Terraform / AWS CDK:
   - VPC with Public (ALB/Nginx) and Private (ECS Tasks, Aurora RDS, ElastiCache Redis) Subnets.
   - Security Groups: Restrict port 5432/6379 strictly to application subnet.
2. Nginx Reverse Proxy: SSL TLS 1.3 Let's Encrypt (auto-renewal), HTTP/2, HSTS `max-age=31536000`, CSP headers, connection keepalive.
3. Blue-Green or Rolling Deployment: Verify `/readyz` probe returns HTTP 200 before routing live traffic.

### Phase 6: Observability & Incident Response
1. Cloud-Native Health Probes:
   - `/livez` (Liveness): Returns 200 if Node.js event loop is running.
   - `/readyz` (Readiness): Returns 200 only if DB `SELECT 1` and Redis `PING` succeed.
2. Telemetry: Pino JSON structured logs, Prometheus application metrics, Sentry APM error tracing.
3. Blameless Post-Mortem workflow for production incidents: 5 Whys RCA -> Regression test -> Hotfix deploy -> Post-mortem documentation.

---

## 4. Production Readiness Review (25-Point Verification Checklist)

Before declaring any project or feature "Production Ready", verify every item:

| Domain | Item | Verification Check |
| :--- | :---: | :--- |
| **Security** | 1 | HTTPS enforced with TLS 1.3, HSTS header `max-age=31536000; includeSubDomains` |
| | 2 | Security headers active: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, CSP |
| | 3 | Zero hardcoded secrets/keys in repository (scanned with `gitleaks`) |
| | 4 | Rate limiting enabled at gateway and sensitive API routes (Auth, Payment, Booking) |
| | 5 | All ID-based queries enforce Object Level Authorization (Anti-BOLA/IDOR) |
| | 6 | Request payloads validated with Zod and limited to 10KB to prevent memory exhaustion |
| **Database** | 7 | B-Tree indices present on all Foreign Keys and filter/sort columns |
| | 8 | Critical operations (inventory, balance, booking) wrapped in Transaction + Row Locks |
| | 9 | DB Connection Pool configured with sensible bounds (`max: 20-50`) |
| | 10 | Automated daily snapshots/backups active and tested for restore capability |
| **Reliability**| 11 | Docker container runs under non-root user `appuser` with `dumb-init` |
| | 12 | Graceful shutdown handler listening for `SIGTERM`/`SIGINT` closing DB & Redis connections |
| | 13 | External API calls wrapped with circuit breaker or strict timeouts (max 5s) |
| | 14 | Payment and order endpoints require `X-Idempotency-Key` header |
| **Performance**| 15 | Automated test coverage > 80% with zero failing tests |
| | 16 | Zero N+1 query leaks (verified via query logging or DataLoader) |
| | 17 | Static web assets compressed (Brotli/Gzip) and cached on CDN |
| | 18 | Production Docker image size optimized to < 150MB |
| **Observability**| 19 | Standard `/livez` and `/readyz` endpoints accessible to load balancer |
| | 20 | All server logs emitted in JSON format with unique `traceId` |
| | 21 | Sentry or APM tool connected to alert on unhandled exceptions |
| | 22 | PII (passwords, card details, patient identity) masked from all log streams |
| **Deployment** | 23 | CI/CD pipeline fails build on lint, typecheck, unit test, or critical CVE scan |
| | 24 | Database schema migrations use Expand & Contract pattern for zero downtime |
| | 25 | Automated or documented rollback procedure executable in < 2 minutes |
