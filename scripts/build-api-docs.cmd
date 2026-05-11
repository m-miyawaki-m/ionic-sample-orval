@echo off
setlocal
cd /d %~dp0..
echo Building static API reference HTML from openapi/openapi.yaml...
echo Output: docs/api-reference.html
echo.
node scripts\_build-html.js redoc
if errorlevel 1 (
  echo.
  echo Build failed.
  exit /b 1
)
echo.
echo Done. Open with:
echo   start docs\api-reference.html
endlocal
