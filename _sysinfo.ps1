# System info dump for optimization
$ErrorActionPreference = 'SilentlyContinue'

Write-Host "========== SYSTEM SPECS =========="
$cs = Get-CimInstance Win32_ComputerSystem
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor
Write-Host "CPU: $($cpu.Name)"
Write-Host "Cores/Threads: $($cpu.NumberOfCores)/$($cpu.NumberOfLogicalProcessors)"
Write-Host "Total RAM: $([math]::Round($cs.TotalPhysicalMemory / 1GB, 1)) GB"
Write-Host "Free RAM: $([math]::Round($os.FreePhysicalMemory / 1MB, 1)) GB"
Write-Host "Used RAM: $([math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1MB, 1)) GB"

Write-Host ""
Write-Host "========== GPU =========="
Get-CimInstance Win32_VideoController | ForEach-Object {
    Write-Host "GPU: $($_.Name) | VRAM: $([math]::Round($_.AdapterRAM / 1GB, 1)) GB | Driver: $($_.DriverVersion)"
}

Write-Host ""
Write-Host "========== DISK (H: and C:) =========="
Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:' OR DeviceID='H:'" | ForEach-Object {
    $free = [math]::Round($_.FreeSpace / 1GB, 1)
    $total = [math]::Round($_.Size / 1GB, 1)
    Write-Host "$($_.DeviceID) $free GB free / $total GB total ($($_.FileSystem))"
}

Write-Host ""
Write-Host "========== PAGEFILE =========="
Get-CimInstance Win32_PageFileUsage | ForEach-Object {
    Write-Host "$($_.Name): Allocated=$($_.AllocatedBaseSize) MB, Peak=$($_.PeakUsage) MB, Current=$($_.CurrentUsage) MB"
}

Write-Host ""
Write-Host "========== TOP 30 PROCESSES BY RAM =========="
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 30 | ForEach-Object {
    $mb = [math]::Round($_.WorkingSet64 / 1MB, 0)
    Write-Host ("{0,-40} {1,6} MB   PID:{2}" -f $_.ProcessName, $mb, $_.Id)
}

Write-Host ""
Write-Host "========== STARTUP APPS =========="
Get-CimInstance Win32_StartupCommand | ForEach-Object {
    Write-Host "$($_.Name) | $($_.Command)"
}

Write-Host ""
Write-Host "========== SERVICES (Running, non-Microsoft) =========="
Get-Service | Where-Object { $_.Status -eq 'Running' } | ForEach-Object {
    $wmi = Get-CimInstance Win32_Service -Filter "Name='$($_.Name)'" -ErrorAction SilentlyContinue
    if ($wmi -and $wmi.PathName -and $wmi.PathName -notmatch 'Windows|Microsoft|svchost') {
        Write-Host "$($_.Name): $($wmi.PathName)"
    }
}

Write-Host ""
Write-Host "========== VISUAL EFFECTS =========="
$ve = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' -ErrorAction SilentlyContinue).VisualFXSetting
Write-Host "VisualFX Setting: $ve (0=custom, 1=best appearance, 2=best performance, 3=let Windows decide)"

Write-Host ""
Write-Host "========== POWER PLAN =========="
$plan = powercfg /getactivescheme 2>&1
Write-Host $plan
