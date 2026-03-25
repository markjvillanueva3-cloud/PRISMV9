@echo off
echo Starting Okuma Macro Converter...
python okuma_macro_converter.py
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Could not start the application.
    echo Make sure Python 3.8+ is installed and in your PATH.
    echo.
    pause
)
