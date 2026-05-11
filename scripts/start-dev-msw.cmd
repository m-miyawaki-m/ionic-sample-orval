@echo off
setlocal
cd /d %~dp0..

echo Starting frontend in MSW mode (no backend, no Prism)...
echo   Frontend: http://localhost:5173
echo   API:      intercepted by Service Worker (msw)
echo.
echo Close the window (or press Ctrl+C inside) to stop.
echo.

start "ionic-sample-orval :: frontend (MSW)" cmd /k "cd /d %CD%\frontend && set VITE_USE_MOCK=msw&& set VITE_API_BASE_URL=&& npm run dev"

endlocal
