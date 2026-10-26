@echo off
title NoxOS - Frontend Expo
color 0B

:: 1. Detectar IP Wi-Fi real (evitando adaptadores virtuales como Ethernet 2 o VPN)
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -match 'Wi-Fi|Wireless' -or $_.IPAddress -like '192.168.18.*'}).IPAddress | Select-Object -First 1"`) do set LOCAL_IP=%%i
if "%LOCAL_IP%"=="" set LOCAL_IP=192.168.18.11

echo =========================================================
echo    INICIANDO MANDALA NOX-OS (BACKEND + FRONTEND EXPO)
echo =========================================================
echo  [*] IP Wi-Fi de tu PC:  %LOCAL_IP%
echo  [*] URL Expo Go:        exp://%LOCAL_IP%:8081
echo  [*] URL API Backend:    http://%LOCAL_IP%:8000/api
echo =========================================================
echo.

:: 2. Iniciar Backend FastAPI en una ventana independiente
echo  [*] Abriendo ventana del Backend (FastAPI)...
start "NoxOS - Backend FastAPI" cmd /k "title NoxOS - Backend FastAPI && color 0E && cd /d %~dp0..\MANDALA_FASTAPI && echo ===================================== && echo   SERVIDOR BACKEND FASTAPI ACTIVO && echo   URL: http://0.0.0.0:8000/api && echo ===================================== && echo. && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: 3. Configurar variables de entorno para que Expo use la IP correcta del Wi-Fi
set REACT_NATIVE_PACKAGER_HOSTNAME=%LOCAL_IP%
set EXPO_PUBLIC_API_URL=http://%LOCAL_IP%:8000/api

:: 4. Iniciar Expo Metro Bundler con el codigo QR
echo  [*] Iniciando Expo con codigo QR para Expo Go...
echo.
cd /d %~dp0
npx expo start -c

pause
