$ErrorActionPreference = 'Stop'

$taskName = 'PRISM Node Orphan Cleaner'

try {
  Disable-ScheduledTask -TaskName $taskName | Out-Null
} catch {
  Write-Warning "Disable-ScheduledTask failed: $($_.Exception.Message)"
}

try {
  $task = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
  if ($task.Settings.Enabled) {
    throw "Task '$taskName' is still enabled."
  }
  Write-Host "Disabled scheduled task: $taskName"
} catch {
  Write-Error $_
  exit 1
}
