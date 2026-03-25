@echo off
echo ============================================
echo Okuma Macro Converter - Windows Build Script
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo Python found. Installing PyInstaller...
pip install pyinstaller

echo.
echo Building executable...
pyinstaller --onefile --windowed --name "OkumaMacroConverter" okuma_macro_converter.py

echo.
if exist "dist\OkumaMacroConverter.exe" (
    echo ============================================
    echo BUILD SUCCESSFUL!
    echo ============================================
    echo Your executable is located at:
    echo   dist\OkumaMacroConverter.exe
    echo.
    echo You can copy this file anywhere and run it.
    echo ============================================
) else (
    echo BUILD FAILED - Check for errors above
)

pause
