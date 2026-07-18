@echo off
REM PRISM Fusion 360 Bridge — Install Script
REM Copies the add-in to Fusion 360's AddIns directory

set ADDIN_DIR=%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\PRISMBridge

echo ============================================
echo  PRISM Fusion 360 Bridge Installer
echo ============================================
echo.

REM Check if Fusion 360 AddIns directory exists
if not exist "%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns" (
    echo ERROR: Fusion 360 AddIns directory not found.
    echo Make sure Fusion 360 is installed first.
    echo Expected: %APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\
    pause
    exit /b 1
)

REM Create PRISMBridge directory
if not exist "%ADDIN_DIR%" (
    mkdir "%ADDIN_DIR%"
    echo Created: %ADDIN_DIR%
) else (
    echo Updating existing installation...
)

REM Copy files
copy /Y "%~dp0fusion360_api_server.py" "%ADDIN_DIR%\fusion360_api_server.py"
copy /Y "%~dp0fusion360_api_server.manifest" "%ADDIN_DIR%\fusion360_api_server.manifest"

echo.
echo ============================================
echo  Installation Complete!
echo ============================================
echo.
echo Files installed to:
echo   %ADDIN_DIR%
echo.
echo Next steps:
echo   1. Open Fusion 360
echo   2. Go to Utilities tab ^> Add-Ins
echo   3. Find "PRISMBridge" and click Run
echo   4. Server starts on http://localhost:18360
echo.
echo Endpoints available:
echo   CAD:   /sketch /extrude /fillet /chamfer /revolve /hole /pattern
echo   Tools: /tool-import /tool-library /tool-library/search
echo   Info:  /status /health /geometry
echo.
echo Use in PRISM: /fusion-export-tools --live
echo.
pause
