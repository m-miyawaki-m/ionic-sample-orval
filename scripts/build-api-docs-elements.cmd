@echo off
setlocal
cd /d %~dp0..
echo Building Stoplight Elements HTML from openapi/openapi.yaml ...
echo Output: docs/api-reference-elements.html
echo.
node scripts\_build-html.js elements
if errorlevel 1 (
  echo Build failed.
  exit /b 1
)
echo.
echo Done. Open with:
echo   start docs\api-reference-elements.html
endlocal
