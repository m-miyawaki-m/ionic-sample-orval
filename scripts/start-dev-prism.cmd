@echo off
setlocal
cd /d %~dp0..

set PRISM_BIN=frontend\node_modules\.bin\prism.cmd
if not exist "%PRISM_BIN%" (
  echo [error] %PRISM_BIN% not found.
  echo         Run `cd frontend ^&^& npm install` first.
  exit /b 1
)

echo Starting Prism mock and frontend in separate windows...
echo   Prism:    http://localhost:4010
echo   Frontend: http://localhost:5173
echo   API:      proxied to Prism (VITE_USE_MOCK=none, VITE_API_BASE_URL=http://localhost:4010)
echo.
echo Close each window (or press Ctrl+C inside) to stop that process.
echo.

start "ionic-sample-orval :: prism (mock)"      cmd /k "cd /d %CD% && call %PRISM_BIN% mock openapi/openapi.yaml --port 4010"
start "ionic-sample-orval :: frontend (Prism)"  cmd /k "cd /d %CD%\frontend && set VITE_USE_MOCK=none&& set VITE_API_BASE_URL=http://localhost:4010&& npm run dev"

endlocal
