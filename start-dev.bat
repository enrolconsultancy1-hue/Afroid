@echo off
:: ============================================
:: Afroid Sovereign Platform — Local Dev Server
:: ============================================
:: Right-click > Run as Administrator (optional)
:: Starts all microservices + frontend in separate windows.
:: Press Ctrl+C in any window to stop that service.
:: ============================================

title Afroid Dev Launcher
echo.
echo    AfroID Sovereign Startup Factory
echo    ================================
echo    Starting all development servers...
echo.

cd /d "%~dp0"

:: --- Core Services ---
start "Afroid: Auth (8010)" cmd /k "cd /d %~dp0 && uv run uvicorn services.auth.app.main:app --port 8010 --reload"
timeout /t 2 /nobreak >nul

start "Afroid: Orchestrator (8014)" cmd /k "cd /d %~dp0 && uv run uvicorn services.orchestrator.app.main:app --port 8014 --reload"
timeout /t 2 /nobreak >nul

start "Afroid: Platform (8011)" cmd /k "cd /d %~dp0 && uv run uvicorn services.platform.app.main:app --port 8011 --reload"
timeout /t 1 /nobreak >nul

start "Afroid: Intake (8019)" cmd /k "cd /d %~dp0 && uv run uvicorn services.intake.app.main:app --port 8019 --reload"
timeout /t 1 /nobreak >nul

start "Afroid: Certify (8012)" cmd /k "cd /d %~dp0 && uv run uvicorn services.certify.app.main:app --port 8012 --reload"
timeout /t 1 /nobreak >nul

start "Afroid: Codegen (8015)" cmd /k "cd /d %~dp0 && uv run uvicorn services.codegen.app.main:app --port 8015 --reload"
timeout /t 1 /nobreak >nul

start "Afroid: Notification (8017)" cmd /k "cd /d %~dp0 && uv run uvicorn services.notification.app.main:app --port 8017 --reload"
timeout /t 1 /nobreak >nul

start "Afroid: Workspace (8018)" cmd /k "cd /d %~dp0 && uv run uvicorn services.workspace.app.main:app --port 8018 --reload"
timeout /t 1 /nobreak >nul

:: --- Gateway (routes all /v1/* traffic) ---
start "Afroid: Gateway (8090)" cmd /k "cd /d %~dp0 && uv run uvicorn services.gateway.app.main:app --port 8090 --reload"
timeout /t 2 /nobreak >nul

:: --- Frontend ---
start "Afroid: Web Frontend (3000)" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo    All services launched!
echo    ----------------------
echo    Gateway:      http://localhost:8090
echo    Frontend:     http://localhost:3000
echo    Auth:         http://localhost:8010
echo    Orchestrator: http://localhost:8014
echo    Intake:       http://localhost:8019
echo.
echo    Close this window or press any key to exit the launcher.
echo    (Service windows stay open independently)
pause >nul
