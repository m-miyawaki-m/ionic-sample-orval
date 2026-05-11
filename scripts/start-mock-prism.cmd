@echo off
setlocal
cd /d %~dp0..

set PRISM_BIN=frontend\node_modules\.bin\prism.cmd
if not exist "%PRISM_BIN%" (
  echo [error] %PRISM_BIN% not found.
  echo         Run `cd frontend ^&^& npm install` first.
  exit /b 1
)

echo Starting Prism mock server on port 4010 (local @stoplight/prism-cli)...
echo Spec: openapi/openapi.yaml
echo.
call "%PRISM_BIN%" mock openapi/openapi.yaml --port 4010
endlocal
