@echo off
chcp 65001 >nul
echo ========================================================
echo   QKSHOP WMS - KHỞI ĐỘNG LOCAL DEVELOPMENT SERVER
echo ========================================================
echo.

for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%"

echo [1/2] Đang khởi động Backend (Spring Boot 3 / Java 21)...
start "QKShop - Backend Spring Boot (Port 8080)" /D "%ROOT_DIR%\backend" cmd /k "mvn spring-boot:run"

echo [2/2] Đang khởi động Frontend (React 19 / Vite 6)...
start "QKShop - Frontend React (Port 5173)" /D "%ROOT_DIR%\frontend" cmd /k "npm run dev"

echo.
echo ========================================================
echo   Cả hai dịch vụ đang được khởi chạy trong cửa sổ riêng!
echo   - Backend API: http://localhost:8080
echo   - Frontend UI: http://localhost:5173
echo ========================================================
echo.
pause
