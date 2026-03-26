@echo off
title GitLearn — Starting...

:: ── CRITICAL: Pin working directory to the folder that contains THIS bat file.
:: Without this, running the bat from any other directory (double-clicking from
:: a parent folder, running from cmd opened elsewhere, etc.) causes every
:: relative path below to resolve against the wrong directory.
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║         GitLearn AI Platform             ║
echo  ║    Starting backend and frontend...      ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.11+ from python.org
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js from nodejs.org
    pause
    exit /b 1
)

:: Create .env if missing
if not exist "backend\.env" (
    echo [INFO] Creating backend\.env from example...
    copy "backend\.env.example" "backend\.env" >nul
    echo [INFO] Edit backend\.env to add your GITHUB_TOKEN (optional: ANTHROPIC_API_KEY)
)

:: Install Python deps if venv missing
if not exist "backend\venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv backend\venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [INFO] Installing Python dependencies...
    call backend\venv\Scripts\activate.bat
    pip install -r backend\requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] pip install failed. Check requirements.txt and your internet connection.
        pause
        exit /b 1
    )
) else (
    call backend\venv\Scripts\activate.bat
)

:: Install Node deps if missing.
:: IMPORTANT: Do NOT use "cd frontend / cd .." here — changing directory in the
:: parent process corrupts the working directory that the two child cmd windows
:: inherit below.  Use --prefix to run npm without changing the CWD.
if not exist "frontend\node_modules" (
    echo [INFO] Installing Node dependencies...
    
    start "NPM Install" cmd /k "cd /d "%ROOT%frontend" && npm install"
    
    echo [INFO] Waiting for npm install window to finish...
    pause
)

:: Capture the absolute root so child windows always resolve paths correctly.
:: %~dp0 = absolute directory path of start.bat, e.g. C:\projects\gitlearn-app\
set ROOT=%~dp0

echo.
echo [OK] Starting backend on http://localhost:8888
start "GitLearn Backend" cmd /k "cd /d "%ROOT%backend" && call venv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8888 --host 127.0.0.1"

timeout /t 2 /nobreak >nul

echo [OK] Starting frontend on http://localhost:3000
start "GitLearn Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo  ════════════════════════════════════════════
echo   GitLearn is running!
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8888
echo   API Docs:  http://localhost:8888/docs
echo  ════════════════════════════════════════════
echo.
echo  Press any key to open in browser...
pause >nul
start http://localhost:3000
