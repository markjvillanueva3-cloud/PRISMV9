# zulu: surgical cleanup of ORPHANED vitest worker node procs (dead parent only) + memory report.
# Peer-safe: a peer's ACTIVE vitest worker has a LIVE parent and is NOT touched; only dead-parent
# leftovers from this session's crashed full-suite runs are killed. Non-vitest node (MCP/hooks/reaper) untouched.
$ErrorActionPreference = 'SilentlyContinue'
$alive = @{}
Get-Process | ForEach-Object { $alive[$_.Id] = $true }
$nodes = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'")
$orphans = @($nodes | Where-Object {
  $_.CommandLine -match 'vitest|tinypool' -and -not $alive.ContainsKey([int]$_.ParentProcessId)
})
Write-Host ("BEFORE: node.exe=" + $nodes.Count + "  orphan-vitest-workers(dead-parent)=" + $orphans.Count)
foreach ($o in $orphans) {
  $age = [int]((Get-Date) - $o.CreationDate).TotalMinutes
  Write-Host ("  kill pid=" + $o.ProcessId + " ppid=" + $o.ParentProcessId + " age=" + $age + "m")
  Stop-Process -Id $o.ProcessId -Force
}
Start-Sleep -Milliseconds 600
$after = @(Get-Process node)
Write-Host ("AFTER: node.exe=" + $after.Count)
$os = Get-CimInstance Win32_OperatingSystem
$totGB = [math]::Round($os.TotalVisibleMemorySize/1MB,1)
$freeGB = [math]::Round($os.FreePhysicalMemory/1MB,1)
Write-Host ("RAM: free " + $freeGB + " / " + $totGB + " GB (" + [math]::Round(($totGB-$freeGB)/$totGB*100,1) + "% used)")
