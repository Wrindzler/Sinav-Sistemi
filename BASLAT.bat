@echo off
title SINAV SISTEMI
color 0A

echo.
echo ========================================
echo    SINAV SISTEMI BASLATILIYOR
echo ========================================
echo.

cd /d "%~dp0"

REM Eski processleri temizle
echo [*] Onceki processler kontrol ediliyor...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Backend*" 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Frontend*" 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [1/2] Backend baslatiiliyor (Port 5000)...
start /MIN "Backend" cmd /c "venv\Scripts\activate && py app.py"
timeout /t 5 /nobreak >nul

echo [2/2] Frontend baslatiiliyor (Port 3000)...
echo.
echo ========================================
echo    SISTEM HAZIR!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Giris Bilgileri:
echo   Kullanici: admin
echo   Sifre:     admin123
echo.
echo ========================================
echo Sistemleri durdurmak icin CTRL+C basin
echo veya bu pencereyi kapatin.
echo ========================================
echo.

set PATH=%PATH%;C:\Program Files\nodejs\
call npm run dev
