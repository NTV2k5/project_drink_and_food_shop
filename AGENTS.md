# AGENTS.md - PROJECT CONSTITUTION & SKILL ROUTING RULES

## 1. NGUYÊN TẮC BẤT DI BẤT DỊCH (CORE GUARDRAILS)
- Kiến trúc: Luôn tuân thủ Clean Architecture 3 lớp (Domain -> Application -> Infrastructure -> Interfaces).
- Kiểu dữ liệu: Bắt buộc TypeScript Strict, CẤM TUYỆT ĐỐI dùng `any`. Mọi input phải validate qua `Zod`.
- Xử lý lỗi: Mọi lỗi phải kế thừa `AppError`. Cấm dùng `catch (e) {}` nuốt lỗi rỗng.
- Logging: CẤM dùng `console.log`. Bắt buộc dùng `pino` logger với format JSON kèm `traceId`.
- Bảo mật: Cấm hardcode API keys/secrets. Không bao giờ commit file `.env`.

## 2. BẢN ĐỒ ĐIỀU HƯỚNG SKILL (SKILL ROUTING MAP)
Khi thực hiện các nhiệm vụ chuyên biệt, Agent BẮT BUỘC phải đọc file SKILL tương ứng trước khi viết code:

- Khi lập trình Backend, thiết kế API, Database Index, Transaction hoặc Concurrency:
  ➔ ĐỌC: .agents/skills/backend-patterns/SKILL.md
  ➔ ĐỌC: .agents/skills/production-engineering-lifecycle/SKILL.md

- Khi làm việc với Dữ liệu Bệnh án, Masking danh tính bệnh nhân, hoặc chuẩn y tế:
  ➔ ĐỌC: .agents/skills/healthcare-compliance-and-security/SKILL.md

- Khi làm việc với Giao diện Người dùng (UI), Form đặt khám cho người lớn tuổi:
  ➔ ĐỌC: .agents/skills/web-accessibility-elderly/SKILL.md
  ➔ ĐỌC: .agents/skills/design-ux-ui/SKILL.md

- Khi viết module hiển thị Sóng Điện Tâm Đồ (ECG/EKG) hoặc xử lý luồng dữ liệu thời gian thực:
  ➔ ĐỌC: .agents/skills/realtime-ecg-canvas/SKILL.md

- Khi viết mã hạ tầng Cloud, Docker, CI/CD hoặc Terraform AWS:
  ➔ ĐỌC: .agents/skills/aws-cloud-terraform/SKILL.md
