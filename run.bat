@echo off
echo ====================================================
echo Starting Civic Catalyst - Citizen Portal
echo ====================================================
echo.
start "Civic Catalyst - Backend (Port 8000)" cmd /k "cd backend && python -m uvicorn main:app --reload --port 8000"
start "Civic Catalyst - Frontend (Port 3000)" cmd /k "cd frontend && npm run dev"
timeout /t 4 >nul
start http://localhost:3000
echo Both Backend and Frontend have been launched!
echo Citizen Portal: http://localhost:3000
echo Backend Docs:   http://127.0.0.1:8000/api/docs
echo ====================================================
