@echo off
:: ============================================
:: Afroid — Stop All Dev Servers
:: ============================================
title Afroid Dev Stopper
echo.
echo    Stopping all Afroid dev servers...
echo.

taskkill /fi "WINDOWTITLE eq Afroid:*" /f 2>nul
taskkill /im "uvicorn.exe" /f 2>nul
taskkill /fi "WINDOWTITLE eq Afroid: Web*" /f 2>nul

echo.
echo    All services stopped.
pause
