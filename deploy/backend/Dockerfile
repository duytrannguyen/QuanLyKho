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

# Tối ưu JVM cho VPS 1-2 vCPU / 2GB RAM (Khởi động nhanh, chống treo GC / Thread Starvation)
ENTRYPOINT [ \
  "java", \
  "-XX:+UseContainerSupport", \
  "-Xms256m", \
  "-Xmx512m", \
  "-XX:+UseG1GC", \
  "-XX:MaxGCPauseMillis=200", \
  "-XX:+TieredCompilation", \
  "-XX:TieredStopAtLevel=1", \
  "-Xss256k", \
  "-Djava.awt.headless=true", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-Duser.timezone=Asia/Ho_Chi_Minh", \
  "-Dfile.encoding=UTF-8", \
  "-jar", \
  "app.jar" \
]