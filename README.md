# Website F&B — Food & Beverage Shop

Website đặt hàng nước uống & đồ ăn vặt với giao diện hiện đại và kiến trúc Fullstack Micro-services ready.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS, Zustand, TanStack Query, Socket.io Client |
| **Backend** | Node.js Express, Mongoose (ODM), Socket.io, JWT Authentication, Helmet |
| **Database & Cache** | MongoDB, Redis |
| **Payment Integration**| SePay (VietQR + Webhook) |
| **Containerization** | Docker, Multi-stage Dockerfile, Docker Compose |

## 📁 Project Structure

```
├── frontend/         # Next.js 16 Customer Frontend (Port 3000)
├── backend/          # Node.js Express RESTful API & Realtime (Port 4000)
├── docker-compose.yml # Orchestration cho MongoDB, Redis, Backend & Frontend
└── README.md
```

## 🚀 Getting Started

### Cách 1: Khởi động toàn bộ ứng dụng bằng Docker Compose (Khuyên dùng)

Đảm bảo máy tính của bạn đã cài đặt **Docker Container Engine** & **Docker Compose**, sau đó chạy lệnh:

```bash
docker compose up -d --build
```

Sau khi khởi động xong:
- 🌐 **Frontend App**: `http://localhost:3000`
- ⚡ **Backend API**: `http://localhost:4000/api/v1`
- 📚 **Swagger API Docs**: `http://localhost:4000/api-docs` (nếu bật)
- 🗄️ **MongoDB**: `localhost:27017`
- 🔴 **Redis**: `localhost:6379`

Dừng hệ thống:
```bash
docker compose down
```

---

### Cách 2: Khởi động thủ công cho Môi trường Phát triển (Local Dev)

#### 1. Khởi chạy MongoDB & Redis bằng Docker:
```bash
docker compose up -d mongodb redis
```

#### 2. Khởi động Backend:
```bash
cd backend
npm install
npm run dev
```

#### 3. Khởi động Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## 🌿 Git Workflow

```
main          ← Production ready
develop       ← Integration branch
feature/*     ← Feature branches
```
