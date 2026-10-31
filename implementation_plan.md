# Kế Hoạch Triển Khai Kỹ Thuật Hoàn Thiện: Web Đặt Lịch & Điều Phối Khám Bệnh Viện Tim (Cardiology Web System)

> **Tiêu chuẩn dự án:** Enterprise Healthcare Web Platform  
> **Hai trụ cột cốt lõi:** **Khả năng Duy trì (Maintainability)** & **Khả năng Mở rộng (Scalability)**  
> **Tuân thủ quy chuẩn:** `production-engineering-lifecycle` protocol, chuẩn y tế quốc tế HL7 FHIR R4, Nghị định 13/2023/NĐ-CP & HIPAA-compliant AWS Architecture.

---

## User Review Required

> [!IMPORTANT]
> **1. Quyết định Cổng Thanh toán (Đã chốt phương án tối ưu):**  
> Hệ thống sử dụng **SePay Payment Gateway kết hợp sinh mã VietQR Động (Napas 247)**:
> - **Dòng tiền:** Tiền đi thẳng 100% từ tài khoản bệnh nhân vào tài khoản ngân hàng chính thức của bệnh viện (không bị bên thứ ba giữ tiền).
> - **Tự động hóa:** SePay bắn Webhook xác nhận giao dịch trong **1 - 2 giây** kèm chữ ký số HMAC-SHA256. Trình duyệt tự động chuyển trạng thái `CONFIRMED` và xuất vé khám tức thì.
> - **Chi phí:** Không chịu phí hoa hồng 1.5% - 2.2% như cổng VNPay/MoMo thông thường.

> [!IMPORTANT]
> **2. Quyết định Hạ tầng AWS Cloud Production (HIPAA & High-Availability):**  
> Toàn bộ hệ thống production sẽ được triển khai trên nền tảng **Amazon Web Services (AWS)** với mô hình **Serverless Containers**:
> - **Compute:** AWS ECS Fargate (Stateless Containers, Auto-scaling 2 đến 10 tasks theo tải).
> - **Database:** Amazon Aurora PostgreSQL Serverless v2 (Multi-AZ, tách cụm Read Replica phục vụ báo cáo).
> - **Caching & Concurrency Lock:** Amazon ElastiCache for Redis (Multi-AZ, Redis Cluster) cho Redlock giữ slot < 2ms.
> - **Storage Y tế:** Amazon S3 với mã hóa AWS KMS (AES-256) lưu trữ ảnh đơn thuốc, kết quả Holter ECG, ảnh siêu âm tim DICOM.
> - **Bảo mật & Phân phối:** AWS CloudFront (CDN) + AWS WAF (Tường lửa chống DDoS, Rate Limiting 20r/s) + Route 53.
> - **Hạ tầng bằng mã (IaC):** Quản lý 100% bằng **Terraform** trong thư mục `infra/terraform/`.

> [!NOTE]
> **3. Luồng xác thực tối ưu cho người lớn tuổi (Zero-Friction Booking):**  
> Áp dụng cơ chế **Guest Booking có xác thực SĐT OTP qua Zalo ZNS / SMS**: Bệnh nhân không cần nhớ mật khẩu tài khoản; chỉ cần nhập Họ tên + Số điện thoại là nhận ngay vé khám điện tử.

---

## Open Questions

> [!NOTE]
> - **Khởi tạo mã nguồn:** Dự án sẽ được tạo trong thư mục riêng độc lập `d:\cardiology_hospital_web` với cấu trúc Monorepo tiêu chuẩn (`apps/web-patient`, `apps/web-clinical`, `apps/web-admin`, `packages/shared`).

---

## Kiến Trúc Hệ Thống Tổng Thể (Enterprise AWS Architecture)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                 KIẾN TRÚC AWS PRODUCTION & HỆ SINH THÁI WEB BỆNH VIỆN TIM                       │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. EDGE & SECURITY LAYER (AWS Edge):                                                            │
│    ├── AWS Route 53 (DNS độ trễ thấp)                                                           │
│    └── AWS CloudFront (CDN) + AWS WAF (Tường lửa chống DDoS, SQLi, Bot cào slot, Rate limit 20r/s│
│                                           │                                                     │
│ 2. INGRESS & LOAD BALANCING (Public Subnet):                                                    │
│    └── AWS Application Load Balancer (ALB) + SSL TLS 1.3 ACM (Auto-renewal)                     │
│                                           │                                                     │
│ 3. COMPUTE LAYER (Private Subnet - AWS ECS Fargate Serverless):                                 │
│    ├── Patient Web Portal (Next.js 15 PWA, WCAG 2.2 AA, Mobile-First) - Task Auto-Scaling       │
│    ├── Clinical Doctor Station (Vite/React 19 Kanban Realtime, Canvas ECG 60fps)                │
│    └── Core Backend API (Node.js/NestJS Clean Architecture 3 lớp)                               │
│                                           │                                                     │
│ 4. REALTIME, CONCURRENCY & ASYNC QUEUES (Private Subnet):                                       │
│    ├── Amazon ElastiCache for Redis (Redlock giữ chỗ 10 phút, SSE Pub/Sub, Latency < 2ms)       │
│    └── Amazon SQS / BullMQ (Hàng đợi gửi Zalo ZNS/SMS, giải phóng slot quá hạn)                 │
│                                           │                                                     │
│ 5. DATA STORAGE & MEDICAL RECORDS (Private Subnet):                                             │
│    ├── Amazon Aurora PostgreSQL Serverless v2 (Primary Write + Read Replica, ACID Row Locks)   │
│    └── Amazon S3 + AWS KMS AES-256 (Lưu trữ ảnh siêu âm DICOM, file sóng Holter ECG, EMR)      │
│                                           │                                                     │
│ 6. THIRD-PARTY PAYMENT INTEGRATION:                                                             │
│    └── SePay Gateway Webhook (Nhận biến động số dư VietQR Napas 247 trong 1-2s qua HTTPS)       │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Chi Tiết 7 Pha Triển Khai Thực Chiến Chuẩn Production

---

### PHẦN 1: THIẾT LẬP DỰ ÁN & QUẢN TRỊ NGỮ CẢNH AI (SCAFFOLDING & AI RULES)
*Mục tiêu: Đặt nền móng kỹ thuật vững chắc, áp dụng ngay SKILL `production-engineering-lifecycle`.*

- [ ] **Khởi tạo Monorepo Workspace tại `d:\cardiology_hospital_web`:**
  - `apps/web-patient`: Next.js 15 (App Router, Tailwind CSS, Radix UI, PWA Service Worker).
  - `apps/web-clinical`: Vite + React 19 + TypeScript (Giao diện trạm điều dưỡng/bác sĩ, Canvas ECG Viewer).
  - `apps/backend-api`: Node.js + Express/NestJS (Clean Architecture 3 lớp: Domain, Application, Infrastructure, Interfaces).
  - `packages/shared`: Shared TypeScript types, Zod schemas, FHIR R4 interfaces, error definitions.
  - `infra/terraform`: Toàn bộ script Terraform quản trị hạ tầng AWS.
- [ ] **Thiết lập Rào chắn Quản trị AI (`.cursorrules` & `AGENTS.md`):**
  - Cấm tiệt kiểu dữ liệu `any`. Bắt buộc dùng `unknown` kèm type guards.
  - Bắt buộc kiểm tra quyền sở hữu đối tượng (Anti-BOLA/IDOR) cho mọi API có chứa `id`.
  - Mọi thao tác tranh chấp slot khám bắt buộc tuân thủ quy tắc 2 lớp: **Redis Distributed Lock** + **Postgres `SELECT FOR UPDATE`**.
  - Logging chuẩn JSON qua thư viện `pino` có gắn `traceId`, cấm dùng `console.log`.
- [ ] **Cấu hình `.aiignore` / `.cursorignore`:**
  - Loại trừ `.env*`, `*.pem`, `credentials.json`, `dist/`, `node_modules/` để bảo vệ bí mật dự án.
- [ ] **Cấu hình Docker Compose Local:**
  - Chạy local đầy đủ: PostgreSQL 16, Redis 7, MinIO (giả lập AWS S3 local), Mailpit.

---

### PHẦN 2: THIẾT KẾ DATA MODELING, FHIR R4 & API CONTRACT-FIRST
*Mục tiêu: Chốt toàn bộ Schema và Hợp đồng API trước khi code logic.*

- [ ] **Thiết kế Database Schema (Aurora PostgreSQL) Chuẩn Hóa:**
  - Cột kiểm toán bắt buộc trên mọi bảng: `created_at`, `updated_at`, `deleted_at` (soft delete), `version` (optimistic locking).
  - Bảng `departments`: Khoa Cấp cứu Can thiệp Tim mạch, Phẫu thuật Tim, Nhịp học, Suy tim, v.v.
  - Bảng `doctors`: Thông tin bác sĩ, học hàm học vị, quota tối đa/buổi khám.
  - Bảng `schedules` & `schedule_slots`: Quản lý từng slot 15-20 phút, trường trạng thái `AVAILABLE | HELD | BOOKED | BLOCKED`.
  - Bảng `appointments`: Mã định danh y tế duy nhất `TIM-xxxxxx`, thông tin bệnh nhân, mã BHYT, lý do khám, trạng thái khám.
  - Bảng `triage_assessments`: Điểm số phân loại nguy cơ tim mạch, triệu chứng đau ngực, huyết áp, cờ báo đỏ `is_emergency`.
  - Bảng `payments`: Mã tham chiếu SePay, số tiền tạm ứng, mã VietQR Napas 247, chữ ký xác thực Webhook.
  - Bảng `audit_logs`: Bảng ghi nhật ký bất biến theo dõi lịch sử đọc/sửa bệnh án (bắt buộc theo chuẩn y tế).
- [ ] **Tương thích Chuẩn Y Tế Quốc Tế HL7 FHIR R4:**
  - Định nghĩa adapter chuyển đổi dữ liệu sang FHIR Resources: `Patient`, `Practitioner`, `Appointment`, `Observation` (huyết áp, nhịp tim).
- [ ] **Đặc tả Hợp đồng API (OpenAPI 3.0 / Swagger):**
  - `POST /api/v1/triage/evaluate`: Đánh giá triệu chứng khẩn cấp.
  - `GET /api/v1/doctors/{id}/slots`: Lấy danh sách slot theo ngày.
  - `POST /api/v1/slots/hold`: Khóa tạm slot trong 10 phút (Redis Redlock).
  - `GET /api/v1/slots/live-stream`: Server-Sent Events (SSE) cập nhật slot realtime.
  - `POST /api/v1/appointments/checkout`: Tạo yêu cầu khám và sinh mã SePay VietQR.
  - `POST /api/v1/webhooks/sepay`: Endpoint nhận webhook đối soát số dư ngân hàng từ SePay.

---

### PHẦN 3: XÂY DỰNG CORE BOOKING ENGINE & TÍCH HỢP SEPAY VIETQR
*Mục tiêu: Đảm bảo khả năng chịu tải cao, không bao giờ bị double-booking và thanh toán tự động 100%.*

- [ ] **Cơ chế Khóa Tranh Chấp 2 Lớp (Two-Tier Concurrency Guard):**
  - **Lớp 1 (Redis Distributed Lock):** Khi bệnh nhân click chọn slot, Redis Lua script thực thi lệnh nguyên tử:
    `SET slot:{slotId}:hold {patientPhone} NX PX 600000` (giữ trong 600,000ms = 10 phút).
    Nếu slot đã bị người khác giữ, trả về HTTP 409 Conflict ngay tại tầng RAM trong < 2ms.
  - **Lớp 2 (PostgreSQL ACID Transaction):** Khi nhận được Webhook thanh toán thành công từ SePay:
    ```sql
    BEGIN;
    SELECT id, status FROM schedule_slots WHERE id = $slotId AND status = 'HELD' FOR UPDATE;
    UPDATE schedule_slots SET status = 'BOOKED', updated_at = NOW() WHERE id = $slotId;
    INSERT INTO appointments (...) VALUES (...);
    COMMIT;
    ```
- [ ] **Tích Hợp Cổng Thanh Toán SePay (VietQR Động):**
  - Tạo hàm sinh mã QR động chuẩn VietQR:
    `https://qr.sepay.vn/img?acc={BANK_ACCOUNT}&bank={BANK_NAME}&amount={FEE}&des=TIM{APPOINTMENT_ID}`.
  - Controller Webhook xử lý an toàn:
    - Xác thực `API_KEY` và chữ ký HMAC-SHA256 từ header của SePay.
    - Kiểm tra Idempotency (chống xử lý trùng lặp nếu webhook bị bắn lại nhiều lần).
    - So khớp số tiền nhận được với chi phí khám.
    - Đổi trạng thái lịch hẹn sang `CONFIRMED` và kích hoạt Worker xuất vé khám điện tử.
- [ ] **Hàng đợi Tác vụ Ngầm (BullMQ / SQS):**
  - Worker 1: Hủy giữ chỗ và nhả slot tự động nếu quá 10 phút bệnh nhân không thanh toán.
  - Worker 2: Bắn tin Zalo ZNS / SMS Brandname gửi mã vé khám kèm hướng dẫn nhịn ăn sáng cho bệnh nhân.

---

### PHẦN 4: CLINICAL TRIAGE ENGINE & SÀNG LỌC CẤP CỨU NHỒI MÁU CƠ TIM
*Mục tiêu: Đảm bảo an toàn tính mạng người bệnh trước khi vào luồng đặt khám thường.*

- [ ] **Xây dựng Thuật toán Phân loại Nguy cơ Tim mạch (Triage Algorithm):**
  - Dựa trên thang điểm ESI (Emergency Severity Index) và khuyến cáo của Hội Tim mạch Việt Nam:
    - *Triệu chứng 1:* Đau thắt ngực kiểu đè ép nghẹt sau xương ức kéo dài > 15 phút.
    - *Triệu chứng 2:* Đau lan lên cằm, vai trái, cánh tay trái hoặc sau lưng.
    - *Triệu chứng 3:* Vã mồ hôi lạnh, khó thở dữ dội, choáng váng hoặc ngất.
    - *Triệu chứng 4:* Tiền sử đặt Stent mạch vành hoặc Nhồi máu cơ tim.
- [ ] **Quy trình Kích hoạt Báo Động Đỏ (Red Alert Protocol):**
  - Nếu bệnh nhân có đồng thời các dấu hiệu cấp tính:
    - **Khóa ngay lập tức luồng đặt lịch hẹn thông thường.**
    - Giao diện Web chuyển sang chế độ Khẩn cấp (Màu đỏ tương phản cao).
    - Nút bấm to toàn màn hình: **[GỌI NGAY CẤP CỨU 115 BỆNH VIỆN TIM]**.
    - Hiển thị bản đồ GPS chỉ đường ngắn nhất đến Phòng Cấp Cứu Can Thiệp Mạch Vành (CathLab) gần nhất.

---

### PHẦN 5: PHÁT TRIỂN 3 GIAO DIỆN WEB (PORTAL DEVELOPMENT)
*Mục tiêu: Giao diện thân thiện tối đa với người cao tuổi, trạm bác sĩ mượt mà không độ trễ.*

- [ ] **Patient Web Portal (Cổng Bệnh Nhân - PWA Next.js 15):**
  - **Chuẩn tiếp cận WCAG 2.2 AA:** Cỡ chữ mặc định 18px, nút bấm tối thiểu 48px, tương phản cao, phím tắt đổi font `[A-] [A] [A+]`.
  - **Lưới chọn Slot trực quan:** Ca sáng (07:30 - 11:30) và Ca chiều (13:30 - 16:30), tự động cập nhật màu xám theo thời gian thực qua Server-Sent Events (SSE).
  - **Màn hình Thanh toán VietQR:** Hiển thị mã QR SePay kèm đồng hồ đếm ngược 10:00 ➔ 00:00. Tự động chuyển trang thành công ngay khi nhận tín hiệu WebSocket.
  - **Vé Khám Điện Tử (E-Ticket):** Mã QR check-in tại viện, lưu ảnh PNG vào điện thoại, hỗ trợ lưu Offline trong Service Worker PWA và chuẩn in ấn Print CSS (khổ A4/A5).
- [ ] **Doctor & Nurse Station Web (Cổng Bác Sĩ & Điều Dưỡng - Vite/React 19):**
  - Giao diện Kanban điều phối bệnh nhân thời gian thực: *Chờ khám lâm sàng ➔ Đang làm Cận lâm sàng (ECG, Siêu âm tim) ➔ Đã có đủ kết quả*.
  - Phím tắt bàn phím: `F2` gọi bệnh nhân kế tiếp, `F4` in phiếu kết quả.
  - **HTML5 Canvas ECG Viewer:** Module hiển thị sóng điện tâm đồ thời gian thực trên nền lưới hồng milimet y tế đạt tốc độ 60 FPS không gây đơ lag trình duyệt.
- [ ] **Admin & Quota Management Web (Cổng Quản Trị):**
  - Cấu hình ca trực theo tuần của bác sĩ, thiết lập quota tối đa (20 ca/buổi).
  - Biểu đồ thời gian chờ thực tế (Realtime Patient Wait Time) phát hiện nghẽn buồng khám.

---

### PHẦN 6: KIỂM THỬ TOÀN DIỆN, BẢO MẬT OWASP & TESTING PYRAMID
*Mục tiêu: Độ bao phủ kiểm thử > 80%, không có lỗ hổng bảo mật rò rỉ bệnh án.*

- [ ] **Kiểm thử Concurrency & Tải nặng (k6 Load Testing):**
  - Kịch bản k6: Bắn 1,000 requests đồng thời trong 1 giây tranh chấp 1 slot duy nhất.
  - *Tiêu chí nghiệm thu:* Đúng 1 request được chuyển sang trạng thái `HELD`, 999 requests còn lại nhận HTTP 409 Conflict an toàn, không có lỗi 500 hay dữ liệu bị đè.
- [ ] **Rà soát Lỗ hổng Bảo mật Y tế (OWASP API Top 10):**
  - Chống BOLA/IDOR: Bệnh nhân chỉ có thể tra cứu vé khám khi sở hữu đúng mã truy cập mã hóa hoặc OTP số điện thoại.
  - Data Masking: Tên bệnh nhân hiển thị trên bảng điện tử công cộng bị ẩn một phần: `Nguyễn V*** A`.
  - Rate Limiting: Giới hạn 20 request/giây trên IP để chống bot cào vét slot của các Giáo sư.
- [ ] **Kiểm thử Tích hợp (Integration Tests với Testcontainers):**
  - Chạy PostgreSQL và Redis thật trong Docker container để kiểm thử luồng rollback khi giao dịch ngân hàng thất bại.

---

### PHẦN 7: TRIỂN KHAI AWS LIVE PRODUCTION & ZERO-DOWNTIME PIPELINE
*Mục tiêu: Đưa toàn bộ hệ sinh thái lên AWS Cloud tự động hóa 100%.*

- [ ] **Đóng gói Docker Multi-Stage Tối Ưu (< 150MB):**
  - Base image `node:20-alpine`, chạy dưới user không đặc quyền `appuser` (non-root), quản lý tiến trình bằng `dumb-init`.
- [ ] **Viết Mã Hạ Tầng Terraform (`infra/terraform/`):**
  - Module VPC: 2 Public Subnets (cho ALB), 2 Private Subnets (cho ECS và Aurora RDS).
  - Module Security Groups: Port 5432 (Postgres) và 6379 (Redis) chỉ nhận traffic nội bộ từ subnet ECS.
  - Module ECS Fargate Service: Cấu hình Task Definition, Memory 1024MB, CPU 512, Auto-scaling policy.
  - Module Aurora Serverless v2: Min ACU 0.5, Max ACU 8, bật Multi-AZ và KMS encryption.
  - Module S3 Bucket: Cấu hình block public access 100%, bật versioning và KMS key.
- [ ] **Xây Dựng Pipeline GitHub Actions (`.github/workflows/production-deploy.yml`):**
  - Quality Gate: ESLint + TypeScript `tsc --noEmit` + Vitest Unit & Integration Tests.
  - Security Gate: Quét lỗ hổng Docker image bằng Trivy, quét leak keys bằng Gitleaks.
  - Push Image: Đẩy Docker image lên **Amazon ECR** với tag `sha-${{ github.sha }}`.
  - Zero-Downtime Live Deploy: Kích hoạt ECS Rolling Update (chỉ cắt traffic sang task mới khi endpoint `/readyz` trả về HTTP 200).
- [ ] **Giám sát & Vận hành (Observability):**
  - Tích hợp Sentry APM theo dõi unhandled errors.
  - CloudWatch Alarms: Bắn cảnh báo vào Telegram/Slack nếu tỷ lệ lỗi HTTP 5xx vượt quá 1% hoặc CPU task > 80%.
  - Healthcheck Probes: `/livez` (tiến trình Node sống) và `/readyz` (Database + Redis kết nối sẵn sàng).

---

## Bảng Checklist Nghiệm Thu Production (25 Tiêu Chí Chuẩn Skill)

| Nhóm | STT | Tiêu Chí Kiểm Tra (Production Readiness Review) | Trạng Thái |
| :--- | :---: | :--- | :---: |
| **Bảo Mật** | 1 | HTTPS TLS 1.3 kích hoạt kèm HSTS `max-age=31536000; includeSubDomains` | [ ] |
| | 2 | Đầy đủ Security Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, CSP | [ ] |
| | 3 | Không có Secret/API Key nào lưu trong Git (đã quét qua `gitleaks`) | [ ] |
| | 4 | Rate limiting kích hoạt ở tầng AWS WAF và tầng API Route | [ ] |
| | 5 | Toàn bộ API truy vấn hồ sơ bệnh án đều kiểm soát quyền sở hữu (Chống BOLA/IDOR) | [ ] |
| | 6 | Dữ liệu định danh bệnh nhân (PII) được che giấu (masking) trên màn hình công cộng và logs | [ ] |
| **Dữ Liệu** | 7 | B-Tree Index đầy đủ trên các khóa ngoại và cột query (`doctor_id`, `date`, `status`) | [ ] |
| | 8 | Thao tác giữ slot và chốt đơn khám bọc trong Transaction với Row-Level Lock | [ ] |
| | 9 | Connection Pool của Aurora PostgreSQL giới hạn ngưỡng an toàn (`max: 30`) | [ ] |
| | 10 | Bật sao lưu tự động (Automated Snapshot) hàng ngày trên AWS RDS | [ ] |
| **Độ Ổn Định** | 11 | Docker image chạy quyền `appuser` (non-root) và PID 1 `dumb-init` | [ ] |
| | 12 | Có hàm Graceful Shutdown (`SIGTERM`/`SIGINT`) đóng kết nối DB sạch trước khi tắt | [ ] |
| | 13 | Cuộc gọi ra ngoài (SePay, Zalo ZNS) đều có timeout khống chế tối đa 5 giây | [ ] |
| | 14 | API Webhook SePay bắt buộc xác thực chữ ký HMAC-SHA256 và có cơ chế Idempotency | [ ] |
| **Hiệu Năng** | 15 | Độ bao phủ kiểm thử tự động (Test Coverage) đạt > 80% | [ ] |
| | 16 | Đã kiểm tra không có rò rỉ N+1 query trên toàn bộ các endpoint tra cứu lịch | [ ] |
| | 17 | Static web assets được nén Brotli và cache trên AWS CloudFront Edge | [ ] |
| | 18 | Kích thước Docker Image tối ưu < 150MB | [ ] |
| **Giám Sát** | 19 | Hai endpoint `/livez` và `/readyz` hoạt động chính xác phục vụ ALB Healthcheck | [ ] |
| | 20 | Mọi dòng log xuất ra định dạng JSON chuẩn (Pino) có gắn `traceId` | [ ] |
| | 21 | Sentry APM và CloudWatch Alarms sẵn sàng bắn thông báo khi có sự cố | [ ] |
| | 22 | Không có dữ liệu nhạy cảm (mật khẩu, thông tin thẻ) bị ghi vào log server | [ ] |
| **Triển Khai**| 23 | Pipeline CI/CD tự động bẻ gãy build nếu lint, test hoặc scan CVE thất bại | [ ] |
| | 24 | Migration Database tuân thủ quy tắc Expand & Contract đảm bảo Zero-Downtime | [ ] |
| | 25 | Có kịch bản Rollback phiên bản trước trên AWS ECS trong vòng dưới 2 phút | [ ] |
