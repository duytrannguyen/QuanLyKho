@echo off
chcp 65001 >nul
echo ========================================================
echo   QKSHOP WMS - ĐÓNG GÓI GÓI ZIP ĐẨY LÊN SERVER VPS
echo ========================================================
echo.

for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
set "DEPLOY_DIR=%ROOT_DIR%\deploy"
set "ZIP_FILE=%DEPLOY_DIR%\qkshop-vps-deploy.zip"

cd /d "%ROOT_DIR%"

echo [1/4] Kiểm tra và build Backend (.jar)...
cd /d "%ROOT_DIR%\backend"
call mvn clean package -DskipTests
if %ERRORLEVEL% NEQ 0 (
    echo [LỖI] Build Backend thất bại!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Kiểm tra và build Frontend (dist)...
cd /d "%ROOT_DIR%\frontend"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [LỖI] Build Frontend thất bại!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/4] Cập nhật các file vào thư mục deploy...
if not exist "%DEPLOY_DIR%\backend\target" mkdir "%DEPLOY_DIR%\backend\target"
copy /y "%ROOT_DIR%\backend\target\tonkho-2.0.0.jar" "%DEPLOY_DIR%\backend\target\tonkho-2.0.0.jar" >nul
xcopy /e /y /q "%ROOT_DIR%\frontend\dist\*" "%DEPLOY_DIR%\frontend\dist\" >nul
copy /y "%ROOT_DIR%\database\schema\01_init_schema.sql" "%DEPLOY_DIR%\database\init\01_init_schema.sql" >nul
copy /y "%ROOT_DIR%\database\seed\02_initial_data.sql" "%DEPLOY_DIR%\database\init\02_initial_data.sql" >nul

echo.
echo [4/4] Đang nén các thành phần deploy thành file ZIP (%ZIP_FILE%)...
tar.exe -a -c -f "%ZIP_FILE%" -C "%DEPLOY_DIR%" --exclude "scripts" --exclude "qkshop-vps-deploy.zip" .

echo.
echo ========================================================
echo   HOÀN TẤT THÀNH CÔNG!
echo   File nén sẵn sàng đẩy lên VPS:
echo   %ZIP_FILE%
echo ========================================================
echo.
pause
