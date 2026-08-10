# Hướng Dẫn Cài Đặt & Chạy Chương Trình Backend ExpressJS

Tài liệu này hướng dẫn chi tiết cách cài đặt các thư viện phụ thuộc, cấu hình cơ sở dữ liệu MongoDB và khởi động hệ thống RESTful API được xây dựng bằng NodeJS/ExpressJS.

---

## 📋 Yêu cầu hệ thống trước khi cài đặt

Đảm bảo máy tính của bạn đã được cài đặt sẵn:
1. **Node.js** (Phiên bản v18 trở lên).
2. **MongoDB** (Phiên bản 6.0 trở lên, chạy cục bộ qua MongoDB Community Server hoặc tài khoản trực tuyến MongoDB Atlas).
3. **Postman** hoặc công cụ tương đương (để nhập file kiểm thử `test_api.json`).

---

## 🛠️ Các bước cài đặt và chạy ứng dụng

### Bước 1: Di chuyển vào thư mục backend và cài đặt thư viện
Mở Terminal/Command Prompt trong thư mục gốc của dự án, sau đó thực hiện lệnh:

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt toàn bộ thư viện cần thiết từ package.json
npm install
```

Các thư viện chính được cài đặt bao gồm:
- `express`: Framework định tuyến HTTP và quản lý middleware.
- `mongoose`: Thư viện ODM giúp kết nối và thao tác với MongoDB.
- `axios`: Dùng để gọi API định vị ngoài (Nominatim).
- `bcryptjs`: Mã hóa băm mật khẩu người dùng.
- `jsonwebtoken`: Tạo mã xác thực token đăng nhập JWT.
- `cors`, `helmet`, `morgan`: Middleware tăng tính bảo mật, ghi log và kết nối frontend.
- `socket.io`: Hỗ trợ giao tiếp Real-time thời gian thực.
- `nodemon` (devDependencies): Tự động khởi động lại server khi mã nguồn thay đổi.

### Bước 2: Cấu hình biến môi trường
Kiểm tra file `.env` nằm ở thư mục `backend`. Bạn có thể thay đổi đường dẫn kết nối tới MongoDB nếu cần:

```env
MONGODB_URI="mongodb://localhost:27017/drink_and_food_shop"
PORT=4000
CORS_ORIGIN="http://localhost:3000"
JWT_ACCESS_SECRET="change-me-in-production-access"
JWT_REFRESH_SECRET="change-me-in-production-refresh"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="7d"
```

*Mẹo: Nếu bạn muốn dùng MongoDB Atlas (online), hãy đổi `MONGODB_URI` thành đường dẫn kết nối của cụm cơ sở dữ liệu Atlas của bạn.*

### Bước 3: Nạp dữ liệu mẫu (Seed Data)
Đề bài yêu cầu có tối thiểu 5 bản ghi mẫu. Hệ thống đã chuẩn bị sẵn một script tự động dọn dẹp cơ sở dữ liệu và chèn dữ liệu mẫu bao gồm: 5 người dùng (đầy đủ các quyền Admin/Customer/Shipper), 5 danh mục món ăn, 10 món ăn thực đơn kèm tùy chọn, 5 địa điểm cửa hàng mẫu kèm tọa độ địa lý, đơn hàng mẫu và đánh giá mẫu.

Hãy khởi chạy lệnh sau trong thư mục `backend`:

```bash
npm run seed
```

*Khi màn hình console báo `🎉 Quá trình nạp dữ liệu mẫu HOÀN TẤT thành công!`, bạn đã hoàn thành việc tạo cơ sở dữ liệu ban đầu.*

### Bước 4: Khởi động Server RESTful API
Khởi chạy dự án ở chế độ phát triển (Development Mode) để theo dõi nhật ký log request:

```bash
npm run dev
```

Server sẽ khởi động và thông báo:
```text
🍃 MongoDB Connected: localhost
🚀 API chạy tại: http://localhost:4000/api/v1
🔌 Cổng thời gian thực WebSocket: ws://localhost:4000
```

---

## 🔍 Hướng dẫn kiểm thử API (Postman)

Để làm báo cáo kiểm thử bằng hình ảnh minh họa theo yêu cầu đề bài:
1. Mở phần mềm **Postman**.
2. Nhấn nút **Import** ở góc trên cùng bên trái.
3. Chọn tệp tin `test_api.json` nằm trong thư mục `backend` của dự án để tải bộ sưu tập kiểm thử vào.
4. Bộ sưu tập sẽ tự động tạo sẵn 6 thư mục kiểm thử từ: Đăng ký/đăng nhập, lấy danh mục, lấy sản phẩm, thêm địa điểm (tự động định vị), xem giỏ hàng và đặt hàng.
5. Tiến hành gửi các request và chụp ảnh kết quả JSON phản hồi từ server để đưa vào tiểu luận.

> **Đặc biệt lưu ý chức năng Định vị (Geocoding API):**
> Gửi request `POST /locations` (Thêm địa điểm mới) với địa chỉ đầy đủ mà không truyền vĩ độ/kinh độ. Hệ thống sẽ tự động gọi OpenStreetMap Nominatim API bên ngoài và trả về tọa độ `lat` và `lng` chính xác của địa chỉ đó! Bạn có thể xem log ở màn hình console của server để thấy tiến trình này hoạt động thời gian thực.
