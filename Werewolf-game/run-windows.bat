@echo off
REM Windows icin basit calistirma betigi - Node.js kurulu olmasi gerekiyor.
if not exist package.json (
  echo package.json dosyasi bulunamadi.
  pause
  exit /b 1
)
echo Paketler yukleniyor...
npm install
if errorlevel 1 (
  echo npm install sirasinda hata olustu.
  pause
  exit /b 1
)
echo Oyun baslatiliyor...
npm start
pause