@echo off
chcp 65001 >nul
echo ========================================================
echo   QKSHOP WMS - KHỞI ĐỘNG LOCAL DEVELOPMENT SERVER
echo ========================================================
echo.

set ROOT_DIR=%~dp0..\..
cd /d "%ROOT_DIR%"

echo [1/2] Đang khởi động Backend (Spring Boot 3 / Java 21)...
start "QKShop - Backend Spring Boot (Port 8080)" cmd /k "cd /d %ROOT_DIR%\backend && mvn spring-boot:run"

echo [2/2] Đang khởi động Frontend (React 19 / Vite 6)...
start "QKShop - Frontend React (Port 5173)" cmd /k "cd /d %ROOT_DIR%\frontend && npm run dev"

echo.
echo ========================================================
echo   Cả hai dịch vụ đang được khởi chạy trong cửa sổ riêng!
echo   - Backend API: http://localhost:8080
echo   - Frontend UI: http://localhost:5173
echo ========================================================
echo.
pause
