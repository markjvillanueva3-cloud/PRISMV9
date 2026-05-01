@echo off
REM Run this as Administrator to kill all orphaned node processes
REM (including those protected by Claude/Codex desktop apps)
REM Right-click > Run as Administrator

echo === PRISM Node Orphan Killer (Admin) ===
echo.

REM Count before
for /f %%a in ('tasklist /fi "imagename eq node.exe" /nh ^| find /c "node"') do set BEFORE=%%a
echo Node processes before: %BEFORE%

REM Kill all node processes with < 10s CPU time
REM Uses WMIC to get CPU time + PID, then kills idle ones
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$killed = 0; Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object { $cpu = 0; if ($_.CPU) { $cpu = [math]::Round($_.CPU, 1) }; $mem = [math]::Round($_.WorkingSet64/1MB); if ($cpu -lt 15 -and $mem -lt 400) { try { Stop-Process -Id $_.Id -Force -ErrorAction Stop; $killed++; Write-Host ('Killed PID {0}: {1}MB, CPU:{2}s' -f $_.Id, $mem, $cpu) } catch { Write-Host ('Failed PID {0}: {1}' -f $_.Id, $_.Exception.Message) } } else { Write-Host ('Keep  PID {0}: {1}MB, CPU:{2}s' -f $_.Id, $mem, $cpu) } }; Write-Host ''; Write-Host \"Killed: $killed processes\""

REM Count after
timeout /t 2 /nobreak > nul
for /f %%a in ('tasklist /fi "imagename eq node.exe" /nh ^| find /c "node"') do set AFTER=%%a
echo.
echo Node processes after: %AFTER%
echo.
pause
