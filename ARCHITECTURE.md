# Kiến trúc Client - Server của dự án

Mục tiêu: tách rõ phần client (front-end static assets) và phần server (API, DB, upload)

## Sơ đồ (ASCII)

Client (browser)
  |
  | HTTP(S) requests (static files, API calls)
  v
Server (Express)
  - Static files: serves client assets (login.html, profile.html, scripts/...)
  - API endpoints: /api/* (login, register, profile, questions)
  - Upload logic: nhận file avatar, upload lên Cloudinary, lưu secure URL vào MongoDB
  - DB: MongoDB (mongoose) kết nối qua `server/db.js`
  |
  v
Database (MongoDB Atlas)

----

## Thành phần và trách nhiệm
- Client (public/)
  - HTML/CSS/JS chạy trên trình duyệt
  - Gửi FormData để cập nhật avatar: PUT /api/profile/:userId (field `avatar`)

- Server (server/app.js)
  - Trả static client files từ `../public`
  - Xử lý API: đăng nhập, đăng ký, CRUD câu hỏi, cập nhật profile
  - Upload ảnh: multer memoryStorage => streamifier => Cloudinary
  - Lưu `user.avatar` = `secure_url` trả về từ Cloudinary

- Database
  - MongoDB Atlas, kết nối trong `server/db.js`

## Các bước triển khai/local dev
1. Cài dependencies: `npm install`
2. Thiết lập `.env` với `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (đã có `.env` trong repo nhưng kiểm tra lại giá trị nếu cần)
3. Chạy server: `npm run dev` hoặc `npm start`
4. Mở http://localhost:3000

## Gợi ý mở rộng
- Di chuyển `public/` vào `client/` nếu muốn tách repository thành mono-repo client + server.
- Thêm `public_id` của Cloudinary vào DB để có thể xóa ảnh cũ khi user thay avatar.
- Thêm bảo vệ (auth/session/JWT) cho các endpoint API.
