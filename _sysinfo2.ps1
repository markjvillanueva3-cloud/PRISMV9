$ErrorActionPreference = 'SilentlyContinue'

# Fast: systeminfo alternative
$mem = [math]::Round((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize / 1MB, 1)
$free = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB, 1)
Write-Host "RAM: ${mem}GB total, ${free}GB free, $([math]::Round($mem - $free, 1))GB used"

# GPU quick
(Get-CimInstance Win32_VideoController).Name | ForEach-Object { Write-Host "GPU: $_" }

# Power plan
powercfg /getactivescheme

# Top processes
Write-Host "`n=== TOP 20 BY RAM ==="
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 20 | Format-Table @{N='Process';E={$_.ProcessName};W=40}, @{N='MB';E={[math]::Round($_.WorkingSet64/1MB,0)};W=8}, Id -AutoSize | Out-String | Write-Host

# Startup items (quick via registry)
Write-Host "=== STARTUP (HKCU) ==="
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object { Write-Host $_.Name }

Write-Host "=== STARTUP (HKLM) ==="
Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run' | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object { Write-Host $_.Name }

# Visual effects
$ve = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' -ErrorAction SilentlyContinue).VisualFXSetting
Write-Host "`nVisualFX: $ve (0=custom,2=best-perf,3=auto)"

# Pagefile
Write-Host "`n=== PAGEFILE ==="
Get-CimInstance Win32_PageFileUsage | ForEach-Object { Write-Host "$($_.Name): Alloc=$($_.AllocatedBaseSize)MB Peak=$($_.PeakUsage)MB" }
