@echo off
echo ================================================================================
echo ITSM Platform - Test Suite Runner
echo ================================================================================
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please create a virtual environment first:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if test dependencies are installed
echo Checking test dependencies...
pip show requests >nul 2>&1
if errorlevel 1 (
    echo Installing test dependencies...
    pip install -r test_requirements.txt
) else (
    echo Test dependencies already installed.
)

echo.
echo ================================================================================
echo Starting Test Execution
echo ================================================================================
echo.

REM Run the test script
python test_all_endpoints.py

REM Check exit code
if errorlevel 1 (
    echo.
    echo ================================================================================
    echo TESTS FAILED - Please review the output above
    echo ================================================================================
) else (
    echo.
    echo ================================================================================
    echo ALL TESTS PASSED
    echo ================================================================================
)

echo.
echo Test results saved to: test_results.json
echo.
pause
