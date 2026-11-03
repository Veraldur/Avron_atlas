@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  start "AvronAtlas Local Server" cmd /k py -3 -m http.server 8765 --bind 127.0.0.1
  goto OPEN_BROWSER
)
where python >nul 2>nul
if not errorlevel 1 (
  start "AvronAtlas Local Server" cmd /k python -m http.server 8765 --bind 127.0.0.1
  goto OPEN_BROWSER
)
echo Python is not installed. Opening index.html directly. Browser restrictions may block map images.
start "" "%~dp0index.html"
pause
exit /b
:OPEN_BROWSER
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8765/"
exit /b
