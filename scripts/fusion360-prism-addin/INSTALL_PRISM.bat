@echo off
echo ============================================================
echo   PRISM Add-In Installer for Fusion 360
echo   (Works with Standard, Insider, and Beta builds)
echo ============================================================
echo.

:: Try to find Python
where python >nul 2>&1
if %errorlevel% equ 0 (
    python "%~dp0install.py"
) else (
    where python3 >nul 2>&1
    if %errorlevel% equ 0 (
        python3 "%~dp0install.py"
    ) else (
        echo [ERROR] Python not found in PATH.
        echo.
        echo Manual install instead:
        echo   1. Copy this entire folder to:
        echo      %%APPDATA%%\Autodesk\Autodesk Fusion 360\API\AddIns\PRISM_CAM_Optimizer
        echo.
        echo   2. Open Fusion 360 ^> Utilities ^> ADD-INS ^(Shift+S^)
        echo   3. Find "PRISM CAM Optimizer" ^> Run
        echo.

        :: Do manual copy as fallback
        set "TARGET=%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\PRISM_CAM_Optimizer"
        if not exist "%TARGET%" mkdir "%TARGET%"
        xcopy /Y /Q "%~dp0*.py" "%TARGET%\" >nul 2>&1
        xcopy /Y /Q "%~dp0*.html" "%TARGET%\" >nul 2>&1
        xcopy /Y /Q "%~dp0*.manifest" "%TARGET%\" >nul 2>&1
        xcopy /Y /Q "%~dp0*.cps" "%TARGET%\" >nul 2>&1
        xcopy /Y /Q "%~dp0*.md" "%TARGET%\" >nul 2>&1
        echo Files copied to: %TARGET%
        echo.
    )
)

pause
