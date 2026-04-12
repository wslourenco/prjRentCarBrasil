@echo off
title SisLoVe

echo Iniciando SisLoVe...

start "SisLoVe - Backend" cmd /k "cd /d %~dp0backend && npm install --silent && node server.js"

timeout /t 2 /nobreak >nul

start "SisLoVe - Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.