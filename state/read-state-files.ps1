$ErrorActionPreference = 'Continue'

Write-Host "=== TASK_QUEUE.json ==="
$path1 = 'h:\PRISM\state\shared\TASK_QUEUE.json'
if (Test-Path $path1) {
    Get-Content $path1 -Raw | Write-Host
} else {
    Write-Host "Not found"
}

Write-Host "`n=== CLAUDE.md ==="
$path2 = 'h:\PRISM\CLAUDE.md'
if (Test-Path $path2) {
    Get-Content $path2 -Raw | Write-Host
} else {
    Write-Host "Not found"
}

Write-Host "`n=== SVI-compact.md ==="
$path3 = 'h:\PRISM\state\shared\SVI-compact.md'
if (Test-Path $path3) {
    Get-Content $path3 -Raw | Write-Host
} else {
    Write-Host "Not found"
}
