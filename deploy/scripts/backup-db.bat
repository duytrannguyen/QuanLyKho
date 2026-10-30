@echo off
chcp 65001 >nul
echo ========================================================
echo   QKSHOP WMS - SAO LƯU CƠ SỞ DỮ LIỆU TỰ ĐỘNG (BACKUP)
echo ========================================================
echo.

for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%"

if not exist "%ROOT_DIR%\backups" mkdir "%ROOT_DIR%\backups"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^^>nul') do set datetime=%%I
if "%datetime%"=="" (
    for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set mydate=%%c%%b%%a
    for /f "tokens=1-3 delims=:. " %%a in ("%time%") do set mytime=%%a%%b%%c
    set TIMESTAMP=%mydate%_%mytime%
) else (
    set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
)
set "BACKUP_FILE=%ROOT_DIR%\backups\backup_qkshop_%TIMESTAMP%.sql"

echo Đang tiến hành trích xuất CSDL MySQL...
echo File đích: %BACKUP_FILE%
echo.

mysqldump -u root -p --default-character-set=utf8mb4 --routines --triggers qkshop_tonkho > "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo [THÀNH CÔNG] Bản sao lưu đã được lưu an toàn tại:
    echo %BACKUP_FILE%
) else (
    echo [LỖI] Sao lưu thất bại! Vui lòng kiểm tra dịch vụ MySQL Server hoặc mật khẩu.
)

echo.
pause
