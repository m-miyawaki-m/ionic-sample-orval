@echo off
setlocal
cd /d %~dp0..

echo Starting backend (Spring Boot) and frontend (Vite) in separate windows...
echo   Backend:  http://localhost:8080
echo   Frontend: http://localhost:5173
echo.
echo Close each window (or press Ctrl+C inside) to stop that process.
echo.

start "ionic-sample-orval :: backend (Spring Boot)" cmd /k "cd /d %CD%\backend && .\mvnw.cmd spring-boot:run"
start "ionic-sample-orval :: frontend (Backend)"    cmd /k "cd /d %CD%\frontend && set VITE_USE_MOCK=none&& set VITE_API_BASE_URL=http://localhost:8080&& npm run dev"

endlocal
