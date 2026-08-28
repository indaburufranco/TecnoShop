@echo off
title TecnoShop - Servidor local
cd /d "%~dp0"
echo Iniciando la tienda...
echo.
call npm run dev
pause