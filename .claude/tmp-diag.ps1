$cli = Get-Command claude -ErrorAction SilentlyContinue
Write-Output "=== Claude CLI location and version ==="
if ($cli) {
  Write-Output "Path: $($cli.Source)"
  Write-Output "Version:"
  & $cli.Source --version 2>&1
} else {
  Write-Output "claude command NOT on PATH"
}

Write-Output ""
Write-Output "=== Recent project sessions ==="
Get-ChildItem 'C:/Users/Mark Villanueva/.claude/projects' -Directory -ErrorAction SilentlyContinue |
  Select-Object Name, LastWriteTime |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 5 |
  Format-Table -AutoSize

Write-Output ""
Write-Output "=== Most recent transcripts ==="
Get-ChildItem 'C:/Users/Mark Villanueva/.claude/projects' -Recurse -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 5 FullName, LastWriteTime, Length |
  Format-Table -AutoSize

Write-Output ""
Write-Output "=== Claude CLI ide/host log dirs ==="
$candidates = @(
  'C:/Users/Mark Villanueva/.claude/logs',
  'C:/Users/Mark Villanueva/AppData/Local/claude-cli-nodejs',
  'C:/Users/Mark Villanueva/AppData/Local/anthropic',
  'C:/Users/Mark Villanueva/AppData/Roaming/anthropic'
)
foreach ($c in $candidates) {
  if (Test-Path $c) {
    Write-Output "FOUND: $c"
    Get-ChildItem $c -Recurse -File -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 3 FullName, LastWriteTime |
      Format-Table -AutoSize
  }
}
