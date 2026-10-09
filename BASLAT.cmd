@echo off
title Relai
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js bulunamadi. Once Node.js kurun.
 pause
 exit /b 1
)
if not exist node_modules\txcript (
 call npm.cmd install --no-audit --no-fund
 if errorlevel 1 (
  pause
  exit /b 1
 )
)
echo Tarayicida http://127.0.0.1:4317 adresini acin.
node server.cjs
pause
