@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js 22+ is required.& pause & exit /b 1)
if not exist package-lock.json (
  echo package-lock.json is missing.
  pause
  exit /b 1
)
call npm.cmd ci || (pause & exit /b 1)
call npm.cmd run start
pause
