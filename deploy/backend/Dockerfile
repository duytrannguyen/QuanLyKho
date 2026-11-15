FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

# Thiết lập múi giờ Việt Nam & cài đặt thư viện font cho JasperReports PDF / Apache POI Excel
ENV TZ=Asia/Ho_Chi_Minh
RUN apt-get update && \
    apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core tzdata && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone && \
    rm -rf /var/lib/apt/lists/*

# Copy file .jar đã đóng gói trước ở local (trong thư mục target)
COPY target/*.jar app.jar

EXPOSE 8080

# Tối ưu JVM cho VPS 1-2 vCPU / 2GB RAM:
# - G1GC với 1 Parallel & 1 Concurrent thread (tránh chiếm dụng tài nguyên 1 core)
# - CICompilerCount=2: Mở khóa C2 JIT optimization đầy đủ nhưng giới hạn compiler threads
# - Xms256m / Xmx512m: Cân bằng bộ nhớ, không gây tràn RAM vật lý
# - Cho phép ghi đè qua biến JAVA_OPTS từ docker-compose hoặc file .env
ENV JAVA_OPTS="-XX:+UseContainerSupport -Xms256m -Xmx512m -XX:+UseG1GC -XX:ParallelGCThreads=1 -XX:ConcGCThreads=1 -XX:CICompilerCount=2 -Xss256k -Djava.awt.headless=true -Djava.security.egd=file:/dev/./urandom -Duser.timezone=Asia/Ho_Chi_Minh -Dfile.encoding=UTF-8"

ENTRYPOINT exec java $JAVA_OPTS -jar app.jar