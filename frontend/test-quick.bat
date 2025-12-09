@echo off
echo.
echo ====================================
echo Quick Test - Authentication Only
echo ====================================
echo.

REM Check if backend is running
echo Checking if backend is running...
curl -s http://localhost:8000/docs >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Backend is not running!
    echo Please start the backend first.
    echo.
    pause
    exit /b 1
)
echo [OK] Backend is running

echo.
echo Running authentication tests only...
echo.
call npx playwright test e2e/01-authentication.spec.ts --reporter=line

echo.
echo ====================================
echo Test complete!
echo ====================================
echo.
echo If all tests passed, run full test suite with:
echo    run-tests.bat
echo.
pause
