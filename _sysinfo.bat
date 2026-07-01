@echo off
echo ===== SYSTEM =====
hostname
echo.

echo ===== MEMORY =====
for /f "tokens=2 delims==" %%a in ('wmic os get TotalVisibleMemorySize /value 2^>nul ^| find "="') do set /a TOTMB=%%a/1024
for /f "tokens=2 delims==" %%a in ('wmic os get FreePhysicalMemory /value 2^>nul ^| find "="') do set /a FREEMB=%%a/1024
echo Total: %TOTMB% MB
echo Free: %FREEMB% MB

echo.
echo ===== GPU =====
wmic path win32_videocontroller get Name /value 2>nul | find "="

echo.
echo ===== POWER PLAN =====
powercfg /getactivescheme

echo.
echo ===== PROCESSES BY MEM (top 25) =====
tasklist /fo table /nh | sort /R /+65 2>nul | more +1

echo.
echo ===== STARTUP =====
wmic startup get Caption,Command /format:list 2>nul | find "="
