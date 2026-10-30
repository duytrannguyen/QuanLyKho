@echo off
chcp 65001 >nul
echo ========================================================
echo   QKSHOP WMS - ĐÓNG GÓI TOÀN BỘ SẢN PHẨM (BUILD ALL)
echo ========================================================
echo.

for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%"

echo [1/2] Đang đóng gói Backend Spring Boot (Maven Package)...
cd /d "%ROOT_DIR%\backend"
call mvn clean package -DskipTests
if %ERRORLEVEL% NEQ 0 (
    echo [LỖI] Build Backend thất bại! Vui lòng kiểm tra mã nguồn Java.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Đang đóng gói Frontend React Vite (Production Build)...
cd /d "%ROOT_DIR%\frontend"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [LỖI] Build Frontend thất bại! Vui lòng kiểm tra mã nguồn React.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   ĐÓNG GÓI HOÀN TẤT THÀNH CÔNG 100%!
echo   - Backend JAR: backend\target\tonkho-2.0.0.jar
echo   - Frontend Dist: frontend\dist\
echo ========================================================
echo.
pause
