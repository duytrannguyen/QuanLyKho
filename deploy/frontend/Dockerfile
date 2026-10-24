# Sử dụng Nginx Alpine siêu nhẹ (~25MB)
FROM nginx:alpine

# Thiết lập múi giờ Việt Nam
ENV TZ=Asia/Ho_Chi_Minh
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

# Xóa các trang mặc định của Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copy thư mục dist đã được build trước ở máy local (npm run build)
COPY dist /usr/share/nginx/html

# Copy cấu hình Nginx tối ưu cho React SPA và API Reverse Proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]