@echo off
title Nica Flasher Distrik Mojoroto Localhost Server
echo =======================================================
echo    Memulai Localhost Server Nica Flasher Distrik Mojoroto...
echo    Tanpa perlu XAMPP, Node.js, atau software tambahan!
echo =======================================================
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080
pause
