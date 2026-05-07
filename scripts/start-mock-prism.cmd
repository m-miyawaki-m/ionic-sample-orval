@echo off
setlocal
cd /d %~dp0..
echo Starting Prism mock server on port 4010...
echo Spec: openapi/openapi.yaml
echo.
npx -y @stoplight/prism-cli mock openapi/openapi.yaml --port 4010
endlocal
