[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  QKSHOP WMS - KHỞI ĐỘNG LOCAL DEVELOPMENT SERVER" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = (Resolve-Path "$PSScriptRoot\..\..").Path

Write-Host "[1/2] Đang khởi động Backend (Spring Boot 3 / Java 21)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\backend'; Write-Host '--- QKShop Backend (Port 8080) ---' -ForegroundColor Green; mvn spring-boot:run"

Write-Host "[2/2] Đang khởi động Frontend (React 19 / Vite 6)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\frontend'; Write-Host '--- QKShop Frontend (Port 5173) ---' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Cả hai dịch vụ đang được khởi chạy trong cửa sổ riêng!" -ForegroundColor Green
Write-Host "  - Backend API: http://localhost:8080" -ForegroundColor White
Write-Host "  - Frontend UI: http://localhost:5173" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green
