@echo off
setlocal
cd /d %~dp0..
echo Building Swagger UI HTML from openapi/openapi.yaml ...
echo Output: docs/api-reference-swagger.html
echo.
node scripts\_build-html.js swagger
if errorlevel 1 (
  echo Build failed.
  exit /b 1
)
echo.
echo Done. Open with:
echo   start docs\api-reference-swagger.html
endlocal
