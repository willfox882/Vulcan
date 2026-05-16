@echo off
setlocal
title Vulcan Dev Server

:: Get the directory of this batch file
set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%"

echo Checking dependencies...
if not exist "node_modules\" (
    echo node_modules not found. Installing dependencies...
    call npm install
)

echo Starting Vulcan dev server...
:: Open the dev server in a new window
start "Vulcan Dev Server" cmd /k "npm run dev"

echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo Opening browser...
start "" "http://localhost:5173"

echo Vulcan is starting! You can close this window, but keep the "Vulcan Dev Server" window open.
pause
endlocal
