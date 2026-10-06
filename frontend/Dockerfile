# Stage 1: Build React app
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Lưu ý: Nếu bạn dùng Vite thay vì Create React App, lệnh build thường tạo ra thư mục 'dist' thay vì 'build'.

# Stage 2: Phục vụ file tĩnh bằng Nginx
FROM nginx:alpine
# Copy các file đã build từ Stage 1 sang thư mục mặc định của Nginx
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]