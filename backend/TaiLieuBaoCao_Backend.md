# 📘 TÀI LIỆU ÔN TẬP TOÀN DIỆN & BÁO CÁO MÔN LẬP TRÌNH NODE.JS
## THEO ĐÚNG KHUNG GIẢNG DẠY 5 CHƯƠNG BÀI HỌC VÀ DỰ ÁN HỆ THỐNG F&B SHOP

**Môn học:** Lập trình Node.js (Server-side Web Development)  
**Tài liệu biên soạn dựa trên:** Giáo trình chuẩn 5 Chương môn học (JavaScript ES6+, Node.js Core, HTTP Server, Express, Template Engines Jade/Handlebars, HTML Forms, Encodings, AJAX, Multer Upload, Middleware, MongoDB, Mongoose, Routing, REST API, JSON, CORS, Error Handling, Postman).

---

# 📜 MỤC LỤC CHI TIẾT

- [CHƯƠNG 1: ÔN TẬP JAVASCRIPT, GIỚI THIỆU NODE.JS, TERMINAL & HTTP SERVER](#chuong-1-on-tap-javascript-gioi-thieu-nodejs-terminal--http-server)
  - 1.1. Ôn tập ngôn ngữ JavaScript (Biến, Hàm, Scope, Closures, Arrow Functions, Destructuring, Async/Promise)
  - 1.2. Giới thiệu Node.js (Kiến trúc V8 + libuv, Single-thread, Event Loop, NPM, CommonJS vs ESM)
  - 1.3. Sử dụng Terminal (Các lệnh thao tác CLI cơ bản, Environment Variables `process.env`)
  - 1.4. Xây dựng Web Server đơn giản bằng Module `http` thuần
  - 1.5. Giới thiệu Express.js Framework
- [CHƯƠNG 2: REQUEST, RESPONSE & SERVER-SIDE TEMPLATE ENGINES](#chuong-2-request-response--server-side-template-engines)
  - 2.1. Request & Response trong Express (Thành phần URL, `req`/`res`, Body Parser Middleware)
  - 2.2. Chọn Template Engine (SSR vs CSR, Jade/Pug vs Handlebars vs EJS)
  - 2.3. Cú pháp & Kỹ thuật lập trình với Jade / Pug (Variables, Conditionals, Loops, `extends`/`block`, `include`)
  - 2.4. Cú pháp & Kỹ thuật lập trình với Handlebars (hbs) (Expressions, Helpers, Partials, Layouts)
- [CHƯƠNG 3: XỬ LÝ FORM, AJAX VÀ UPLOAD FILE VỚI MULTER](#chuong-3-xu-ly-form-ajax-va-upload-file-voi-multer)
  - 3.1. Xử lý Form I: HTML Forms & Kiểu mã hóa dữ liệu Enctype (`urlencoded`, `multipart/form-data`, `text/plain`)
  - 3.2. Xử lý Form II: AJAX Forms (`Fetch API`, `FormData`) & Tải tệp lên Server bằng **Multer**
- [CHƯƠNG 4: MIDDLEWARE - LƯU TRỮ - ĐỊNH TUYẾN (MONGODB & MONGOOSE)](#chuong-4-middleware---luu-tru---dinh-tuyen)
  - 4.1. Kiến trúc xử lý yêu cầu theo tầng & Middleware trong Express.js
  - 4.2. Khái niệm & Cơ chế Lưu trữ dữ liệu với MongoDB (NoSQL Document Store, BSON vs JSON)
  - 4.3. Thao tác Cơ sở dữ liệu nâng cao với Mongoose ODM (Schemas, Models, Validation, Hooks, Virtuals, Lean)
  - 4.4. Tổ chức Định tuyến (Routing) trong Express (Module Routes, Route Parameters, Route Chaining)
- [CHƯƠNG 5: REST API VÀ JSON](#chuong-5-rest-api-va-json)
  - 5.1. Định dạng dữ liệu JSON & Hàm xử lý trong JavaScript (`JSON.stringify`, `JSON.parse`)
  - 5.2. Kiến trúc REST API chuẩn hóa (Statelessness, HTTP Verbs, HTTP Status Codes, Naming Conventions)
  - 5.3. Cơ chế Xử lý Lỗi tập trung (Centralized Error Handling Architecture & Class `ApiError`)
  - 5.4. Cấu hình CORS (Cross-Origin Resource Sharing) & Preflight Request
  - 5.5. Kiểm thử API bằng Postman / Thunder Client & Xuất file Collection
- [CHƯƠNG 6: TÍCH HỢP NGOÀI & DỰ ÁN THỰC TẾ (GEOCODING, AUTH JWT, WEBSOCKETS)](#chuong-6-tich-hop-ngoai--du-an-thuc-te)
  - 6.1. Tích hợp OpenStreetMap Nominatim Geocoding API & Cơ chế Kháng lỗi Fault Tolerance
  - 6.2. Xác thực JWT Auth & Phân quyền RBAC (`CUSTOMER`, `SHIPPER`, `ADMIN`)
  - 6.3. Tương tác thời gian thực với WebSockets (Socket.io)
  - 6.4. Phân tích mã nguồn dự án thực tế F&B Shop API
- [CHƯƠNG 7: BỘ 35 CÂU HỎI - ĐÁP PHẢN BIỆN TỔNG HỢP THEO ĐÚNG GIÁO TRÌNH BÀI HỌC](#chuong-7-bo-35-cau-hoi---dap-phan-bien-tong-hop)

---

# CHƯƠNG 1: ÔN TẬP JAVASCRIPT, GIỚI THIỆU NODE.JS, TERMINAL & HTTP SERVER

### 1.1. Ôn tập ngôn ngữ JavaScript (JS Foundations)
JavaScript là nền tảng bắt buộc trước khi học Node.js. Cần nắm vững 5 trụ cột cốt lõi:

#### a) Khai báo Biến (`var`, `let`, `const`) & Phạm vi (Scope)
- `var`: Phạm vi hàm (Function Scope), bị hiện tượng **Hoisting** (kéo lên đầu phạm vi nhưng có giá trị `undefined`), cho phép khai báo lại.
- `let`: Phạm vi khối (`{}` Block Scope), bị Hoisting nhưng rơi vào vùng **Temporal Dead Zone (TDZ)** nên không thể truy cập trước khi khai báo, không cho phép khai báo lại trong cùng scope.
- `const`: Phạm vi khối (Block Scope), bắt buộc phải gán giá trị ngay khi khai báo và **không thể gán lại** (Immutability cho hằng số). *Lưu ý: Với Object/Array khai báo bằng `const`, ta vẫn có thể sửa thuộc tính/phần tử bên trong*.

#### b) Hàm (Functions) & Arrow Functions
- **Function Declaration**: Có hoisting, tự định nghĩa con trỏ `this` dựa trên ngữ cảnh gọi hàm.
- **Arrow Function (`() => {}`)**: Không có `this` riêng (kế thừa `this` từ phạm vi cha bao quanh - Lexical Scope), không có đối tượng `arguments`, cú pháp ngắn gọn.

```javascript
// Function Declaration
function add(a, b) { return a + b; }

// Arrow Function
const addArrow = (a, b) => a + b;
```

#### c) Closure (Đóng gói hàm)
- **Closure** là một hàm có khả năng ghi nhớ và truy cập vào các biến thuộc phạm vi cha (Lexical Scope) của nó ngay cả khi hàm cha đã thực thi xong và thoát khỏi Call Stack.

```javascript
function createCounter() {
  let count = 0; // Biến private nhờ Closure
  return function() {
    count++;
    return count;
  };
}
const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
```

#### d) Cấu trúc dữ liệu & cú pháp ES6+ hiện đại
- **Destructuring**: Phân rã mảng/đối tượng dễ dàng.
  ```javascript
  const user = { name: 'An', age: 22 };
  const { name, age } = user;
  ```
- **Rest / Spread Operator (`...`)**:
  ```javascript
  const arr1 = [1, 2];
  const arr2 = [...arr1, 3, 4]; // Spread: Sao chép mảng
  const sum = (...nums) => nums.reduce((a, b) => a + b, 0); // Rest: Gom tham số
  ```
- **Array Higher-Order Methods**: `map()`, `filter()`, `reduce()`, `find()`, `some()`, `every()`.

#### e) Lập trình Bất đồng bộ (Asynchronous JavaScript)
- JavaScript chạy đơn luồng. Tác vụ bất đồng bộ được xử lý qua 3 giai đoạn tiến hóa:
  1. **Callback**: Hàm truyền vào dưới dạng tham số (Dễ bị *Callback Hell*).
  2. **Promise**: Đối tượng đại diện cho giá trị tương lai (`Pending`, `Fulfilled`, `Rejected`). Dùng `.then()` và `.catch()`.
  3. **Async / Await**: Cú pháp bọc ngoài Promise giúp viết mã bất đồng bộ phẳng và tự nhiên như mã đồng bộ.

---

### 1.2. Giới thiệu Node.js & Hệ thống Module
- **Node.js** là môi trường thực thi (Runtime) phía Máy chủ cho JavaScript dựa trên V8 Engine (Google) và `libuv` (C++).
- **Kiến trúc cơ bản**: Single-Threaded, Event-Driven, Non-blocking I/O.
- **NPM (Node Package Manager)**:
  - `npm init -y`: Khởi tạo file cấu hình `package.json`.
  - `package.json`: Quản lý thông tin dự án, danh sách thư viện phụ thuộc (`dependencies`, `devDependencies`) và các câu lệnh thực thi (`scripts`).
  - `package-lock.json`: Ghi lại cây phụ thuộc chính xác từng phiên bản (Exact Version) để đảm bảo môi trường nhất quán khi cài đặt ở máy khác.
- **Hệ thống Module (Module Systems)**:
  - **CommonJS (CJS - Chuẩn mặc định)**: Dùng `require()` để nạp và `module.exports` để xuất. Nạp **đồng bộ** tại Runtime. Có cơ chế **Caching** (`require.cache`).
  - **ES Modules (ESM - Chuẩn ES6)**: Dùng `import` / `export`. Nạp **bất đồng bộ** ở pha phân tích tĩnh (Static Parse).

---

### 1.3. Sử dụng Terminal (Dòng lệnh cơ bản)
Các câu lệnh CLI (Command Line Interface) thiết yếu trong phát triển Node.js:
- `cd <path>`: Di chuyển thư mục.
- `ls` (Linux/macOS) hoặc `dir` (Windows): Liệt kê danh sách file/thư mục.
- `mkdir <folder>`: Tạo thư mục mới.
- `node <filename.js>`: Thực thi file JavaScript bằng Node.js.
- `node --watch <filename.js>` hoặc `nodemon`: Tự động khởi động lại server khi file code thay đổi.
- **Biến môi trường (Environment Variables)**: Truy cập qua `process.env.VAR_NAME`. Dùng thư viện `dotenv` để nạp từ file `.env`.

---

### 1.4. Web Server đơn giản dùng Module `http` thuần
Xây dựng web server nguyên bản bằng module lõi `http` không cần thư viện ngoài:

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Trang chủ F&B Shop - HTTP Pure Server</h1>');
  } else if (req.url === '/api/info' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ app: 'F&B Shop', version: '1.0.0' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found - Đường dẫn không tồn tại');
  }
});

server.listen(5000, () => {
  console.log('Server HTTP thuần đang chạy tại http://localhost:5000');
});
```

---

### 1.5. Giới thiệu Express.js Framework
- **Express.js** là web framework tối giản, linh hoạt cho Node.js, bọc lấy module `http` thuần.
- **Lợi ích**: Cung cấp hệ thống Định tuyến (Routing) ngắn gọn, hỗ trợ cơ chế Middleware mạnh mẽ, dễ dàng quản lý Request/Response.

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World từ Express.js!');
});

app.listen(5000, () => console.log('Express Server running on port 5000'));
```

---

# CHƯƠNG 2: REQUEST, RESPONSE & SERVER-SIDE TEMPLATE ENGINES

### 2.1. Request & Response trong Express.js

#### a) Các thành phần của một URL
Một URL chuẩn bao gồm:  
`https://localhost:5000/api/v1/products/search?category=drink#section1`
- **Protocol**: `https`
- **Host/Domain**: `localhost`
- **Port**: `5000`
- **Pathname**: `/api/v1/products/search`
- **Query String**: `?category=drink` (cặp key=value)
- **Hash/Anchor**: `#section1`

#### b) Đối tượng Request (`req`)
- `req.params`: Chứa các tham số tĩnh khai báo trên tuyến đường Route (`/products/:id` $\rightarrow$ `req.params.id`).
- `req.query`: Chứa tham số truy vấn trên Query String (`?search=tra-sua` $\rightarrow$ `req.query.search`).
- `req.body`: Chứa dữ liệu gửi lên từ Client (Form hoặc JSON body). Cần middleware parser để đọc.
- `req.headers`: Chứa các HTTP Request Headers (ví dụ `Authorization`, `Content-Type`).

#### c) Đối tượng Response (`res`)
- `res.status(code)`: Thiết lập mã trạng thái HTTP (200, 201, 404, 500...).
- `res.json(data)`: Gửi phản hồi dạng dữ liệu JSON (Tự động set `Content-Type: application/json`).
- `res.send(body)`: Gửi phản hồi đa dạng (Chuỗi HTML, Buffer, Object).
- `res.redirect(url)`: Chuyển hướng người dùng sang URL khác.
- `res.render(viewName, data)`: Biên dịch Template Engine và trả về file HTML.

---

### 2.2. Chọn Template Engine (Server-Side Rendering - SSR)
- **Server-Side Rendering (SSR)**: Server nhận request $\rightarrow$ Lấy dữ liệu từ DB $\rightarrow$ Chèn dữ liệu vào Template Engine $\rightarrow$ Biên dịch thành file HTML hoàn chỉnh $\rightarrow$ Trả về cho Trình duyệt hiển thị.
- **Client-Side Rendering (CSR)**: Server chỉ trả về file HTML rỗng + File JS (như React/Vue/Next.js) $\rightarrow$ Trình duyệt tự gọi API lấy JSON và tự dựng giao diện trên máy Client.

---

### 2.3. Cú pháp & Kỹ thuật lập trình với Jade / Pug
```pug
//- Khai báo layout trong Pug
doctype html
html(lang="vi")
  head
    title= pageTitle
    link(rel="stylesheet", href="/css/style.css")
  body
    h1.title-main Dịch vụ F&B Shop
    if isAdmin
      button.btn.btn-danger Quản lý Admin
    ul.product-list
      each product in products
        li.product-item= product.name + ' - ' + product.price + 'đ'
```

---

### 2.4. Cú pháp & Kỹ thuật lập trình với Handlebars (hbs)
```html
<!-- Cú pháp Handlebars -->
<h1>{{title}}</h1>

{{#if isLogged}}
  <p>Xin chào, {{user.fullName}}!</p>
{{else}}
  <a href="/login">Đăng nhập</a>
{{/if}}

<ul>
  {{#each items}}
    <li>{{this.name}} - {{formatCurrency this.price}}</li>
  {{/each}}
</ul>
```

---

# CHƯƠNG 3: XỬ LÝ FORM, AJAX VÀ UPLOAD FILE VỚI MULTER

### 3.1. Xử lý Form I: HTML Forms & Kiểu mã hóa Dữ liệu (Enctype)
1. **`application/x-www-form-urlencoded` (Mặc định)**: Dùng cho Form chứa chữ thường, dữ liệu mã hóa thành chuỗi `key1=val1&key2=val2`. Middleware: `express.urlencoded({ extended: true })`.
2. **`multipart/form-data` (Bắt buộc khi Upload File)**: Dùng khi có thẻ `<input type="file" />`. Dữ liệu chia thành từng Part phân tách bởi Boundary Header. Bắt buộc dùng thư viện **Multer**.
3. **`text/plain`**: Dữ liệu gửi đi dạng văn bản thô không mã hóa.

---

### 3.2. Xử lý Form II: AJAX Forms & Upload File với Multer
```javascript
const multer = require('multer');

// Cấu hình Nơi lưu file và Đổi tên chống trùng
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

// Validator kiểm tra định dạng file ảnh
const fileFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh JPG, PNG, WEBP!'), false);
  }
};

const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter });

// Route Upload Single File
app.post('/api/v1/upload', upload.single('avatar'), (req, res) => {
  res.json({ success: true, filePath: `/uploads/${req.file.filename}` });
});
```

---

# CHƯƠNG 4: MIDDLEWARE - LƯU TRỮ - ĐỊNH TUYẾN

*(Tập trung nội dung bài học Chương 4 theo slide: Middleware, MongoDB, Mongoose, Routing)*

### 4.1. Kiến trúc Xử lý Yêu cầu theo Tầng & Middleware trong Express.js

#### a) Bản chất Middleware
Middleware là một hoặc nhiều hàm trung gian xử lý Request trước khi đến được Controller cuối cùng. Một ứng dụng Express bản chất là một chuỗi đường ống các hàm Middleware nối tiếp nhau qua hàm `next()`:
$$Request \longrightarrow [Middleware_1] \xrightarrow{next()} [Middleware_2] \xrightarrow{next()} [Controller] \longrightarrow Response$$

#### b) Phân loại 5 loại Middleware trong Express:
1. **Application-level Middleware**: Gắn trực tiếp vào `app.use()` (ví dụ: logger, static files).
2. **Router-level Middleware**: Gắn vào từng đối tượng `router.use()` hoặc route cụ thể.
3. **Built-in Middleware**: Tích hợp sẵn trong Express như `express.json()`, `express.urlencoded()`, `express.static()`.
4. **Error-handling Middleware**: Middleware xử lý lỗi với **4 tham số signature**: `(err, req, res, next)`.
5. **Third-party Middleware**: Thư viện từ npm như `morgan`, `cors`, `helmet`, `cookie-parser`.

#### c) Thực hành viết Custom Middleware tự viết trong dự án:
- **Custom Request Logger (`backend/src/middleware/logger.js`)**:
  ```javascript
  const loggerMiddleware = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[LOG] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  };
  module.exports = loggerMiddleware;
  ```
- **Custom Body Validation (`backend/src/middleware/validation.js`)**:
  ```javascript
  const validateBody = (requiredFields) => {
    return (req, res, next) => {
      const missingFields = requiredFields.filter(field => !req.body[field]);
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Thiếu các trường thông tin bắt buộc: ${missingFields.join(', ')}`
        });
      }
      next();
    };
  };
  module.exports = { validateBody };
  ```

---

### 4.2. Khái niệm & Cơ chế Lưu trữ Dữ liệu với MongoDB

#### a) MongoDB là gì?
- **MongoDB** là Cơ sở dữ liệu NoSQL hướng tài liệu (Document Database) phổ biến nhất thế giới.
- **Cấu trúc tương quan giữa SQL và MongoDB NoSQL**:

| Khái niệm trong RDBMS (SQL) | Khái niệm tương đương trong MongoDB (NoSQL) |
| :--- | :--- |
| **Database** (Cơ sở dữ liệu) | **Database** (Cơ sở dữ liệu) |
| **Table** (Bảng dữ liệu) | **Collection** (Tập hợp các tài liệu) |
| **Row / Record** (Hàng / Bản ghi) | **Document** (Tài liệu dạng BSON/JSON) |
| **Column** (Cột dữ liệu) | **Field** (Trường dữ liệu cặp Key-Value) |
| **Primary Key** (Khóa chính ID) | **`_id` Field** (Tự động sinh ObjectId 12-byte) |
| **JOIN** (Phép nối bảng) | **Lookup / Populate / Embedding** |

#### b) So sánh BSON vs JSON
- **JSON**: Chuỗi văn bản thuần túy (Text-based), chỉ hỗ trợ String, Number, Boolean, Array, Object, Null.
- **BSON (Binary JSON)**: Nén dữ liệu nhị phân, cho phép duyệt và phân tích cú pháp siêu nhanh, mở rộng kiểu dữ liệu phong phú như `ObjectId`, `Date`, `BinData`, `Int64`.

#### c) Cài đặt & Kết nối MongoDB trong Node.js
Kết nối MongoDB (Local hoặc MongoDB Atlas Cloud URI) thông qua chuỗi Connection String: `mongodb://localhost:27017/fb_shop_db`.

---

### 4.3. Thao tác Cơ sở dữ liệu Nâng cao với Mongoose ODM

#### a) Định nghĩa Schema & Model trong Mongoose
```javascript
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên chi nhánh không được để trống'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Địa chỉ không được để trống']
  },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Location', locationSchema);
```

#### b) Thực hành các thao tác CRUD cơ bản với Mongoose Model
- **Create (Tạo mới)**:
  ```javascript
  const newLocation = await Location.create({ name: 'Chi nhánh Q1', address: '123 Nguyễn Huệ', latitude: 10.7769, longitude: 106.7009 });
  ```
- **Read (Đọc & Lọc)**:
  ```javascript
  const locations = await Location.find({ isActive: true }).sort({ createdAt: -1 }).select('name address latitude longitude');
  const location = await Location.findById(id);
  ```
- **Update (Cập nhật)**:
  ```javascript
  const updatedLocation = await Location.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  ```
- **Delete (Xóa)**:
  ```javascript
  await Location.findByIdAndDelete(id);
  ```

#### c) Mongoose Middlewares (Pre/Post Hooks), Virtuals & Lean Queries
- **`pre('save')` Hook**: Can thiệp trước khi lưu (ví dụ băm mật khẩu).
- **Virtuals & JSON Transform**: Chuyển `_id` $\rightarrow$ `id`, xóa `passwordHash`, `__v` khi xuất JSON.
- **Lean Queries (`.lean()`)**: Bỏ qua Mongoose Instance giúp tăng tốc độ đọc dữ liệu gấp 2-3 lần.
- **Cấu trúc 12-byte ObjectId**: `4-byte Timestamp + 5-byte Random Value + 3-byte Counter`.

---

### 4.4. Tổ chức Định tuyến (Routing) trong Express.js

#### a) Khái niệm Router trong Express
Express cung cấp đối tượng `express.Router()` cho phép chia nhỏ các tuyến đường (Routes) thành các module độc lập theo tài nguyên (Tách file `auth.routes.js`, `location.routes.js`, `product.routes.js`).

#### b) Cấu trúc Tách Routes Module chuẩn chuẩn hóa (`backend/src/routes/location.routes.js`)
```javascript
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { requireAuth, restrictTo } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');

// Định tuyến công khai (Public Routes)
router.get('/', locationController.getAllLocations);
router.get('/:id', locationController.getLocationById);

// Định tuyến bảo vệ (Protected Admin Routes)
router.post('/', requireAuth, restrictTo('ADMIN'), validateBody(['name', 'address']), locationController.createLocation);
router.put('/:id', requireAuth, restrictTo('ADMIN'), locationController.updateLocation);
router.delete('/:id', requireAuth, restrictTo('ADMIN'), locationController.deleteLocation);

module.exports = router;
```

#### c) Đăng ký Router chính trong `app.js`:
```javascript
const locationRoutes = require('./routes/location.routes');
app.use('/api/v1/locations', locationRoutes);
```

---

# CHƯƠNG 5: REST API VÀ JSON

*(Tập trung nội dung bài học Chương 5 theo slide: JSON, REST API, CORS, Postman)*

### 5.1. Định dạng Dữ liệu JSON & Hàm Xử lý trong JavaScript

#### a) Khái niệm JSON (JavaScript Object Notation)
- **JSON** là định dạng trao đổi dữ liệu văn bản mỏng nhẹ, dễ đọc đối với con người và dễ phân tích cú pháp đối với máy tính.
- **Quy tắc JSON nghiêm ngặt**:
  - Tên thuộc tính (Keys) bắt buộc phải bọc trong dấu ngoặc kép `""` (Ví dụ: `{"name": "Trà sữa"}`).
  - Không cho phép dấu phẩy thừa (Trailing Comma) ở phần tử cuối cùng.
  - Không hỗ trợ hàm (Functions), `undefined` hay `Date` nguyên bản (Date chuyển thành chuỗi ISO String).

#### b) Hàm xử lý JSON trong JavaScript
- `JSON.stringify(object)`: Chuyển đổi một đối tượng JS Object/Array thành chuỗi văn bản JSON (Serialization).
- `JSON.parse(jsonString)`: Chuyển đổi một chuỗi JSON thành đối tượng JS Object/Array (Deserialization).
- Trong Express, hàm `res.json(data)` tự động thực thi `JSON.stringify()` và thiết lập Header `Content-Type: application/json`.

---

### 5.2. Kiến trúc REST API Chuẩn hóa

#### a) Định nghĩa REST API
- **REST (Representational State Transfer)** là kiểu kiến trúc phần mềm chuẩn hóa xây dựng Web Services truyền nhận dữ liệu qua giao thức HTTP.
- **Tính chất Statelessness (Phi trạng thái)**: Server không lưu Session State của Client giữa các request. Mỗi request từ Client độc lập và phải chứa đầy đủ thông tin xác thực (Authorization Bearer Token).

#### b) Quy tắc đặt tên URL Danh từ (Resource Naming Conventions)
- Sử dụng **Danh từ số nhiều** cho tài nguyên, không dùng Động từ trên URL:
  - ❌ **Kém**: `/api/getProducts`, `/api/deleteUser?id=5`
  - ✅ **Chuẩn REST**: `GET /api/v1/products`, `DELETE /api/v1/users/5`

#### c) Hệ thống Phương thức HTTP (HTTP Verbs)
- `GET`: Đọc tài nguyên (Danh sách hoặc Chi tiết).
- `POST`: Tạo tài nguyên mới.
- `PUT`: Cập nhật toàn bộ (Thay thế) tài nguyên.
- `PATCH`: Cập nhật một phần tài nguyên.
- `DELETE`: Xóa tài nguyên.

#### d) Mã trạng thái HTTP Status Codes chuẩn hóa:
- **2xx (Thành công)**:
  - `200 OK`: Truy vấn / Cập nhật thành công.
  - `201 Created`: Tạo mới tài nguyên thành công.
  - `204 No Content`: Xóa thành công, không trả về dữ liệu body.
- **4xx (Lỗi Phía Client)**:
  - `400 Bad Request`: Lỗi dữ liệu gửi lên không đúng dạng/thiếu trường.
  - `401 Unauthorized`: Chưa đăng nhập hoặc Token hết hạn.
  - `403 Forbidden`: Đã đăng nhập nhưng không đủ quyền thực hiện.
  - `404 Not Found`: Đường dẫn/tài nguyên không tồn tại.
- **5xx (Lỗi Phía Server)**:
  - `500 Internal Server Error`: Lỗi sập máy chủ/ngoại lệ chưa bắt.

---

### 5.3. Cơ chế Xử lý Lỗi Tập trung (Centralized Error Handling)

#### a) Lớp ngoại lệ tùy chỉnh `ApiError` (`backend/src/middleware/errorHandler.js`)
```javascript
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}
```

#### b) Middleware xử lý lỗi tập trung chuẩn 4 tham số signature:
```javascript
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Lỗi hệ thống máy chủ nội bộ.';

  // 1. Xử lý lỗi trùng Unique Index trong MongoDB (code 11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Dữ liệu thuộc tính ${field} đã tồn tại trong hệ thống.`;
  }

  // 2. Xử lý lỗi sai định dạng ObjectId của Mongoose (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Mã định danh ID "${err.value}" không đúng định dạng MongoDB.`;
  }

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: message
  });
};

module.exports = { ApiError, errorHandler };
```

---

### 5.4. Cấu hình CORS (Cross-Origin Resource Sharing)

#### a) Khái niệm CORS & Chính sách Đồng nguồn (Same-Origin Policy)
- **Same-Origin Policy**: Chính sách bảo mật của Trình duyệt chỉ cho phép JS gọi API trên cùng một Origin (Bộ 3: `Protocol + Domain + Port`).
- **CORS**: Cơ chế cho phép Server phát tín hiệu cấp quyền cho Trình duyệt ở tên miền khác (`Cross-Origin`) được gọi API.

#### b) Request Preflight (OPTIONS request)
Trước khi gửi các request thay đổi dữ liệu như `POST`, `PUT`, `DELETE` từ Frontend, Trình duyệt tự động gửi một **OPTIONS Request ngầm** (Preflight Request) để hỏi Server xem Origin này có được cấp quyền không.

#### c) Cấu hình gói `cors` trong Express (`backend/src/app.js`)
```javascript
const cors = require('cors');

const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
```

---

### 5.5. Kiểm thử API bằng Postman / Thunder Client

#### a) Các bước kiểm thử REST API
1. Chọn Phương thức HTTP (`GET`, `POST`, `PUT`, `DELETE`).
2. Nhập URL API (Ví dụ: `http://localhost:5000/api/v1/locations`).
3. Cấu hình Request Headers (`Content-Type: application/json`, `Authorization: Bearer <token>`).
4. Truyền dữ liệu vào Request Body (Dạng `raw` JSON).
5. Bấm **Send** và kiểm tra: Mã HTTP Status Code (200/201), Response Body JSON, Thời gian phản hồi (Response Time).

#### b) Xuất file Postman Collection
Dự án đã đính kèm sẵn file **`backend/test_api.json`** chứa toàn bộ danh mục bài test API để nộp kèm báo cáo tiểu luận.

---

# CHƯƠNG 6: TÍCH HỢP NGOÀI & DỰ ÁN THỰC TẾ

### 6.1. Tích hợp Geocoding API ngoài & Fault Tolerance
Gọi OpenStreetMap Nominatim API để chuyển địa chỉ thành `lat`/`lng`. Có cơ chế Timeout 5s & Giá trị dự phòng (Fallback Coordinates) trung tâm TP.HCM (`10.7769, 106.7009`) nếu gặp sự cố.

### 6.2. Xác thực JWT Auth & Phân quyền RBAC
Dùng cặp `accessToken` / `refreshToken`, mã hóa mật khẩu `bcrypt` salt 12 vòng, phân 3 quyền: `CUSTOMER`, `SHIPPER`, `ADMIN`.

### 6.3. Tương tác thời gian thực với WebSockets (Socket.io)
Truyền vị trí GPS của Shipper và cập nhật trạng thái đơn hàng thời gian thực tới Khách hàng qua Socket.io.

---

# CHƯƠNG 7: BỘ 35 CÂU HỎI - ĐÁP PHẢN BIỆN TỔNG HỢP THEO ĐÚNG GIÁO TRÌNH BÀI HỌC

Dưới đây là bộ **35 câu hỏi - đáp phản biện bảo vệ tiểu luận** bám sát 100% nội dung 5 Chương trong các slide giảng dạy của môn học:

---

### ❓ Câu 1: Phân biệt `var`, `let`, và `const`. Hoisting và Temporal Dead Zone (TDZ) là gì?
> **💬 Trả lời:** `var` thuộc Function Scope, bị Hoisting lên giá trị `undefined`. `let`/`const` thuộc Block Scope, bị Hoisting rơi vào vùng TDZ nên không thể truy cập trước dòng khai báo. `const` không thể gán lại địa chỉ ô nhớ.

### ❓ Câu 2: Arrow Function khác gì Function Declaration truyền thống? Khi nào không nên dùng?
> **💬 Trả lời:** Arrow Function kế thừa `this` từ phạm vi cha (Lexical `this`) và không có đối tượng `arguments`. Không dùng làm Method trong Object/Class hoặc Event Listener DOM.

### ❓ Câu 3: Closure là gì? Ứng dụng trong Node.js?
> **💬 Trả lời:** Closure là hàm nhớ phạm vi biến cha ngay cả khi hàm cha đã thoát khỏi Call Stack. Dùng tạo biến private và Middleware Factories trong Express.

### ❓ Câu 4: Phân biệt `process.nextTick()` và `setImmediate()`.
> **💬 Trả lời:** `process.nextTick()` thuộc Microtask Queue có độ ưu tiên cao nhất, chạy ngay khi Call Stack rỗng. `setImmediate()` thuộc Macrotask Queue, chạy ở Check Phase của Event Loop.

### ❓ Câu 5: Phân biệt CommonJS (`require`) và ES Modules (`import`).
> **💬 Trả lời:** CommonJS nạp đồng bộ ở Runtime. ES Modules nạp bất đồng bộ ở pha phân tích tĩnh (Static Parse).

### ❓ Câu 6: File `package-lock.json` có tác dụng gì?
> **💬 Trả lời:** Lưu lại cây phụ thuộc phiên bản chính xác (Exact Version) của từng gói npm để đảm bảo môi trường cài đặt nhất quán giữa các máy.

### ❓ Câu 7: Phân biệt đối tượng `req` và `res` trong module `http` thuần.
> **💬 Trả lời:** `req` là Stream Readable chứa thông tin client gửi lên. `res` là Stream Writable chứa hàm ghi dữ liệu phản hồi trả về.

### ❓ Câu 8: Phân biệt `req.params` và `req.query` trong Express.js.
> **💬 Trả lời:** `req.params` chứa tham số khai báo trên route URL (`/products/:id`). `req.query` chứa tham số truy vấn sau dấu `?` (`?search=tra-sua`).

### ❓ Câu 9: Server-Side Rendering (SSR) khác gì Client-Side Rendering (CSR)?
> **💬 Trả lời:** SSR biên dịch HTML đầy đủ dữ liệu tại Server rồi gửi về Client (tốt cho SEO). CSR trả về HTML rỗng + JS, Browser tự gọi API lấy JSON để render.

### ❓ Câu 10: So sánh Jade/Pug và Handlebars (hbs).
> **💬 Trả lời:** Jade/Pug dựa vào thụt lề (Indentation) không thẻ đóng, code ngắn. Handlebars giữ nguyên HTML chuẩn, chèn biến qua `{{variable}}`, hỗ trợ Layouts, Partials, Helpers.

### ❓ Câu 11: Phân biệt `extends` và `include` trong Jade/Pug.
> **💬 Trả lời:** `include` chèn nội dung file con (Partial). `extends` kế thừa khung Layout cha và ghi đè nội dung vào khối `block`.

### ❓ Câu 12: Phân biệt `{{value}}` và `{{{value}}}` trong Handlebars.
> **💬 Trả lời:** `{{value}}` tự động Escape HTML chống XSS. `{{{value}}}` render trực tiếp chuỗi HTML thô.

### ❓ Câu 13: Trình bày 3 kiểu mã hóa Enctype của HTML Forms.
> **💬 Trả lời:** `application/x-www-form-urlencoded` (mặc định form chữ), `multipart/form-data` (bắt buộc cho upload file), `text/plain` (văn bản thô).

### ❓ Câu 14: Tại sao `express.urlencoded()` không đọc được form `multipart/form-data`?
> **💬 Trả lời:** Vì `urlencoded` chỉ đọc chuỗi query string. `multipart/form-data` chứa file nhị phân chia nhiều Part phân tách bởi Boundary Header, phải dùng parser Multer.

### ❓ Câu 15: Đối tượng `FormData` trong AJAX có tác dụng gì?
> **💬 Trả lời:** Đóng gói dữ liệu Form và FileUpload bằng JavaScript để gửi lên Server qua Fetch API mà không làm tải lại trang.

### ❓ Câu 16: Phân biệt `diskStorage` và `memoryStorage` trong Multer.
> **💬 Trả lời:** `diskStorage` lưu file trực tiếp vào ổ đĩa Server (lâu dài). `memoryStorage` lưu tạm trong RAM dạng Buffer (dùng nén ảnh rồi upload lên Cloud).

### ❓ Câu 17: Làm sao lọc chỉ cho upload file ảnh JPG/PNG trong Multer?
> **💬 Trả lời:** Cấu hình `fileFilter`, kiểm tra `file.mimetype` có thuộc mảng `['image/jpeg', 'image/png']` hay không.

### ❓ Câu 18: Phân biệt `upload.single()`, `upload.array()` và `upload.fields()` trong Multer.
> **💬 Trả lời:** `single()` xử lý 1 file ở 1 field (`req.file`). `array()` xử lý mảng file ở 1 field (`req.files`). `fields()` xử lý nhiều file ở các field khác nhau.

### ❓ Câu 19: Phân loại Middleware trong Express.js.
> **💬 Trả lời:** 5 loại: Application-level, Router-level, Built-in (`express.json`), Error-handling (`4-arity`), và Third-party (`cors`, `morgan`).

### ❓ Câu 20: Tác dụng của hàm `next()` và `next(err)` trong Express Middleware?
> **💬 Trả lời:** `next()` chuyển quyền sang middleware tiếp theo. `next(err)` bỏ qua các middleware thường để nhảy thẳng tới Middleware xử lý lỗi tập trung.

### ❓ Câu 21: So sánh CSDL SQL (RDBMS) và MongoDB NoSQL.
> **💬 Trả lời:** SQL lưu dạng Table/Row/Column với Schema cứng nhắc. MongoDB lưu dạng Collection/Document/Field BSON với Schema linh hoạt, mở rộng chiều ngang dễ dàng.

### ❓ Câu 22: Phân biệt BSON và JSON trong MongoDB.
> **💬 Trả lời:** JSON là chuỗi văn bản thô. BSON là nén nhị phân của JSON giúp máy tính tìm kiếm siêu nhanh và bổ sung kiểu `ObjectId`, `Date`.

### ❓ Câu 23: Cấu trúc 12-byte ObjectId trong MongoDB gồm những gì?
> **💬 Trả lời:** `4-byte Timestamp + 5-byte Random Value + 3-byte Counter`.

### ❓ Câu 24: Thao tác `.lean()` trong Mongoose có tác dụng gì?
> **💬 Trả lời:** Trả về Plain JS Object thay vì Mongoose Document Instance, giúp truy vấn đọc nhanh gấp 2-3 lần và tiết kiệm bộ nhớ RAM.

### ❓ Câu 25: Phân biệt `express.Router()` và `app`.
> **💬 Trả lời:** `app` đại diện cho toàn bộ ứng dụng Express. `express.Router()` là một mini-app giúp chia nhỏ tuyến đường thành các module độc lập theo tài nguyên.

### ❓ Câu 26: RESTful API là gì? Nêu 5 mã HTTP Status Codes phổ biến.
> **💬 Trả lời:** REST là kiến trúc API phi trạng thái (Stateless). 5 Status codes: `200` (OK), `201` (Created), `400` (Bad Request), `401` (Unauthorized), `404` (Not Found).

### ❓ Câu 27: Phân biệt `PUT` và `PATCH` trong REST API.
> **💬 Trả lời:** `PUT` thay thế toàn bộ tài nguyên. `PATCH` chỉ cập nhật một phần các trường được truyền lên.

### ❓ Câu 28: Middleware bắt lỗi tập trung trong Express có điểm gì đặc biệt về mặt cú pháp?
> **💬 Trả lời:** Bắt buộc phải khai báo đúng 4 tham số signature: `(err, req, res, next)`.

### ❓ Câu 29: CORS là gì? Request Preflight (OPTIONS) là gì?
> **💬 Trả lời:** CORS là cơ cấp cấp quyền gọi API giữa các Origin khác nhau. Preflight (OPTIONS request) là request ngầm do Trình duyệt tự gửi trước để hỏi Server xem Origin có được cấp quyền gửi dữ liệu hay không.

### ❓ Câu 30: Mục đích của việc kiểm thử API bằng Postman là gì?
> **💬 Trả lời:** Kiểm tra tính đúng đắn của đường dẫn URL, phương thức HTTP, Request Body, Response Status Code, Response Body JSON và tạo bộ sưu tập (Collection) đính kèm báo cáo.

### ❓ Câu 31: Tại sao phải băm mật khẩu bằng `bcrypt` trước khi lưu vào MongoDB?
> **💬 Trả lời:** Tránh lộ mật khẩu thô khi CSDL bị rò rỉ. Bcrypt dùng Salt ngẫu nhiên chống tấn công Rainbow Table.

### ❓ Câu 32: Nêu cơ chế dự phòng (Fault Tolerance) khi gọi OpenStreetMap Nominatim Geocoding API bị lỗi/timeout.
> **💬 Trả lời:** Thiết lập Timeout 5s trong Axios, bọc khối `try...catch`. Nếu lỗi/timeout tự động gán tọa độ dự phòng trung tâm TP.HCM (`10.7769, 106.7009`) để request tạo địa điểm của user không bị crash (HTTP 500).

### ❓ Câu 33: Phân biệt WebSockets và HTTP Polling.
> **💬 Trả lời:** HTTP Polling gửi request liên tục tốn băng thông Header. WebSockets tạo kết nối song công 2 chiều bền vững duy nhất trên TCP.

### ❓ Câu 34: Lớp `ApiError` trong dự án đóng vai trò gì?
> **💬 Trả lời:** Là lớp tùy chỉnh kế thừa từ `Error` giúp gán thêm thuộc tính `statusCode` (400, 401, 404) để ném lỗi đồng nhất về cho Middleware xử lý lỗi tập trung.

### ❓ Câu 35: Trình bày cách dùng PM2 Cluster Mode để tối ưu hiệu năng Node.js trên máy chủ đa nhân CPU.
> **💬 Trả lời:** Dùng lệnh `pm2 start app.js -i max` để nhân bản các tiến trình Node.js worker độc lập chạy trên tất cả nhân CPU và tự động cân bằng tải.

---
*Tài liệu được biên soạn công phu bám sát 100% theo đúng khung 5 Chương giảng dạy môn Lập trình Node.js!*
