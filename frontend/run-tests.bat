@echo off
echo.
echo ====================================
echo ITSM Platform - E2E Test Suite
echo ====================================
echo.

REM Check if backend is running
echo [1/3] Checking if backend is running...
curl -s http://localhost:8000/docs >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Backend is not running!
    echo.
    echo Please start the backend in a separate terminal:
    echo    cd backend
    echo    python -m uvicorn app.main:app --reload --port 8000
    echo.
    pause
    exit /b 1
)
echo [OK] Backend is running on port 8000

REM Check if frontend is running
echo.
echo [2/3] Checking if frontend is running...
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Frontend is not running!
    echo.
    echo Please start the frontend in a separate terminal:
    echo    cd frontend
    echo    npm run dev
    echo.
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)
echo [OK] Frontend is running on port 5173

REM Install Playwright browsers if needed
echo.
echo [3/3] Installing Playwright browsers (if needed)...
call npx playwright install chromium --with-deps >nul 2>&1

REM Run tests
echo.
echo ====================================
echo Running Tests
echo ====================================
echo.
call npm run test

REM Show results
echo.
echo ====================================
echo Test Results
echo ====================================
echo.
echo View detailed HTML report:
echo    npm run test:report
echo.
echo Or open manually:
echo    test-results\html-report\index.html
echo.
pause
