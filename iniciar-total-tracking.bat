@echo off
cd /d "%~dp0"

if exist "release\win-unpacked\Total Tracking.exe" (
    start "" "release\win-unpacked\Total Tracking.exe"
    exit
)

call npm run build
start "" npx electron .
exit
