@echo off
cd /d "%~dp0"

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  start "" "http://localhost:3000"
  exit /b
)

echo Starting exam system...
start "" cmd /c "npm start"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
exit /b
