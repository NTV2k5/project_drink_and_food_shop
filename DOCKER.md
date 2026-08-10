## Hướng Dẫn Sử Dụng Docker

### Yêu cầu
- Docker Desktop >= 24.0
- Docker Compose >= 2.0

### Khởi động (Production)
```bash
docker-compose up -d
```

### Khởi động (Development với hot-reload)
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Xem logs
```bash
# Tất cả services
docker-compose logs -f

# Chỉ backend
docker-compose logs -f backend
```

### Dừng và xóa containers
```bash
docker-compose down

# Xóa cả volumes (dữ liệu MongoDB, Redis)
docker-compose down -v
```

### Services & Ports
| Service  | Port  | Mô tả              |
|----------|-------|--------------------|
| MongoDB  | 27017 | Database chính     |
| Redis    | 6379  | Cache & Session     |
| Backend  | 4000  | Express.js API      |
| Frontend | 3000  | Next.js App         |
