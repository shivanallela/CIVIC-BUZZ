# Civic Catalyst - Quick Launch Script
Write-Host "====================================================" -ForegroundColor Green
Write-Host "Starting Civic Catalyst - Citizen Portal..." -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Green

Start-Process cmd -ArgumentList '/k', 'cd backend && python -m uvicorn main:app --reload --port 8000' -WindowStyle Normal
Start-Process cmd -ArgumentList '/k', 'cd frontend && npm run dev' -WindowStyle Normal

Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"

Write-Host "Application is live at: http://localhost:3000" -ForegroundColor Green
