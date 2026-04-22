$os = Get-CimInstance Win32_OperatingSystem
$totalGB = [math]::Round($os.TotalVisibleMemorySize/1MB,1)
$freeGB = [math]::Round($os.FreePhysicalMemory/1MB,1)
$usedGB = $totalGB - $freeGB
Write-Host "=== RAM: ${usedGB}GB used / ${totalGB}GB total (${freeGB}GB free) ==="
Write-Host ""
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 40 Name, Id, @{N='RAM_MB';E={[math]::Round($_.WorkingSet64/1MB,0)}}, @{N='CPU_s';E={[math]::Round($_.CPU,1)}} | Format-Table -AutoSize
