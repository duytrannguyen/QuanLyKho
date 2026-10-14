FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

# Thiết lập múi giờ Việt Nam
ENV TZ=Asia/Ho_Chi_Minh

# Copy file .jar đã đóng gói trước ở local (trong thư mục target)
COPY target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-Duser.timezone=Asia/Ho_Chi_Minh", "-Dfile.encoding=UTF-8", "-jar", "app.jar"]