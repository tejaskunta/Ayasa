@echo off
echo Starting AYASA Demo...
echo.

REM Start ML Backend
start "AYASA ML Backend" cmd /k "cd /d %~dp0ml-backend && python -m uvicorn main:app --port 8000 --reload"

REM Wait 3 seconds then start Node server
timeout /t 3 /nobreak > nul
start "AYASA Server" cmd /k "cd /d %~dp0server && node server.js"

REM Wait 2 seconds then start React
timeout /t 2 /nobreak > nul
start "AYASA Client" cmd /k "cd /d %~dp0client && npm start"

echo.
echo All three services are starting in separate windows.
echo.
echo  ML Backend : http://localhost:8000/health
echo  API Server : http://localhost:5000/health
echo  App        : http://localhost:3000
echo.
echo Wait about 60 seconds for the ML models to load, then open:
echo http://localhost:3000
echo.
pause
