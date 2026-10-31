# Hướng dẫn Cấu hình Cloudflare CDN Edge Caching & WAF (Scale 1.000.000 CCU)

Tài liệu thiết kế kiến trúc và thông số cấu hình Cloudflare Edge Server phục vụ hấp thụ 95% lưu lượng truy cập tĩnh và bán tĩnh, bảo vệ máy chủ Origin Backend không bị quá tải.

---

## 1. Bản đồ Phân luồng Caching tại Edge

```
[Người dùng truy cập] ────> [Cloudflare Edge (250+ PoPs)]
                                   │
              ┌────────────────────┴────────────────────┐
              ▼ (95% Traffic)                           ▼ (5% Traffic)
       [CACHE HIT - 10ms]                       [CACHE MISS / DYNAMIC]
       • Hình ảnh món ăn (.webp/.png)            • Đăng ký / Đăng nhập
       • File tĩnh Next.js (_next/static)        • Giỏ hàng (Cart)
       • GET /api/v1/categories (TTL 30m)        • Tạo đơn (POST /api/v1/orders)
       • GET /api/v1/products (TTL 5m)           • SePay Webhooks
                                                        │
                                                        ▼
                                                [Origin ALB / ECS]
```

---

## 2. Quy tắc Cache Rules (Cloudflare Cache Rules)

### Quy tắc 1: Edge Caching cho API Menu & Danh mục
- **Biểu thức khớp (Expression):**
  `(http.request.method eq "GET" and http.request.uri.path in {"/api/v1/categories" "/api/v1/products" "/api/v1/products/bestsellers"})`
- **Hành động cấu hình:**
  - **Edge Cache TTL:** Override origin $\to$ `300 seconds` (5 phút)
  - **Browser Cache TTL:** Respect origin $\to$ `60 seconds`
  - **Serve Stale Content:** `Bật (Enable)` - Khi máy chủ backend đang khởi động lại hoặc bận, Cloudflare tiếp tục phục vụ bản cache cũ trong 60 giây, đảm bảo người dùng không bao giờ thấy lỗi 502/504.

### Quy tắc 2: Static Assets & Next.js Bundles
- **Biểu thức khớp:**
  `(http.request.uri.path matches "^/_next/static/.*" or http.request.uri.path matches "^/uploads/.*")`
- **Hành động cấu hình:**
  - **Edge Cache TTL:** `30 days`
  - **Browser Cache TTL:** `7 days`

### Quy tắc 3: Bypass Cache cho API Giao dịch & Webhook
- **Biểu thức khớp:**
  `(http.request.uri.path matches "^/api/v1/(auth|cart|orders).*" or http.request.method ne "GET")`
- **Hành động:**
  - **Bypass Cache:** Toàn bộ request POST/PUT/PATCH/DELETE và route cần phiên đăng nhập sẽ được chuyển tiếp trực tiếp về Origin Server.

---

## 3. Cấu hình WAF (Web Application Firewall) & DDoS Rate Limiting

1. **Chống Brute-force Login:**
   - URL: `/api/v1/auth/login`
   - Ngưỡng giới hạn: Tối đa **10 requests / 1 phút / 1 địa chỉ IP**.
   - Hành động khi vượt ngưỡng: Block trong 15 phút.

2. **Chống Spam Order Flash Sale:**
   - URL: `/api/v1/orders`
   - Ngưỡng giới hạn: Tối đa **5 requests / 10 giây / 1 IP**.
   - Hành động khi vượt ngưỡng: Managed Challenge (Hiển thị CAPTCHA Turnstile).

3. **Chế độ mã hóa SSL/TLS:**
   - Chọn chế độ: **Full (Strict)** để mã hóa từ Cloudflare tới Application Load Balancer.
