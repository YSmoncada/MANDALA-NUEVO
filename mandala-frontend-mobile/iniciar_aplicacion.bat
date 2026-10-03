@echo off
title NoxOS - Frontend Expo
color 0B

:: 1. Detectar IP local para conectar el celular
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /r "[0-9]"') do (
    for /f "tokens=1" %%b in ("%%a") do if not defined LOCAL_IP set LOCAL_IP=%%b
)
if "%LOCAL_IP%"=="" set LOCAL_IP=localhost

echo =========================================================
echo    INICIANDO MANDALA NOX-OS (BACKEND + FRONTEND EXPO)
echo =========================================================
echo  [*] IP Local de tu PC: %LOCAL_IP%
echo  [*] URL API Backend:   http://%LOCAL_IP%:8000/api
echo =========================================================
echo.

:: 2. Iniciar Backend FastAPI en una ventana independiente
echo  [*] Abriendo ventana del Backend (FastAPI)...
start "NoxOS - Backend FastAPI" cmd /k "title NoxOS - Backend FastAPI && color 0E && cd /d %~dp0..\MANDALA_FASTAPI && echo ===================================== && echo   SERVIDOR BACKEND FASTAPI ACTIVO && echo   URL: http://0.0.0.0:8000/api && echo ===================================== && echo. && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: 3. Configurar API URL para Expo
set EXPO_PUBLIC_API_URL=http://%LOCAL_IP%:8000/api

:: 4. Iniciar Expo Metro Bundler en esta ventana con código QR
echo  [*] Iniciando Expo con codigo QR...
echo.
cd /d %~dp0
npx expo start -c

pause
