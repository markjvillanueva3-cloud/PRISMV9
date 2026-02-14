@echo off
title PRISM Local MCP Server
echo.
echo ============================================
echo    PRISM Local Filesystem MCP Server
echo ============================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

:: Install dependencies if needed
echo Checking dependencies...
pip show fastmcp >nul 2>&1
if errorlevel 1 (
    echo Installing fastmcp...
    pip install fastmcp
)

pip show pyngrok >nul 2>&1
if errorlevel 1 (
    echo Installing pyngrok...
    pip install pyngrok
)

pip show uvicorn >nul 2>&1
if errorlevel 1 (
    echo Installing uvicorn...
    pip install uvicorn
)

echo.
echo Starting server...
echo.

:: Run the server
python "%~dp0prism_local_mcp_server.py"

:: If server exits, pause so we can see any errors
echo.
echo Server stopped.
pause
