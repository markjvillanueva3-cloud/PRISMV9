@echo off
REM PRISM Python Wrapper - finds Python across computers
REM Check common Python locations

if exist "C:\Users\Mark Villanueva\.local\bin\python.exe" (
    "C:\Users\Mark Villanueva\.local\bin\python.exe" %*
    exit /b %errorlevel%
)

if exist "C:\Python312\python.exe" (
    "C:\Python312\python.exe" %*
    exit /b %errorlevel%
)

if exist "C:\Python311\python.exe" (
    "C:\Python311\python.exe" %*
    exit /b %errorlevel%
)

if exist "C:\Python310\python.exe" (
    "C:\Python310\python.exe" %*
    exit /b %errorlevel%
)

REM Try py launcher
py -3 %* 2>/dev/null
if %errorlevel% equ 0 exit /b 0

REM Try PATH
python %*
