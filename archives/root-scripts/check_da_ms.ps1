Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md" -Pattern "^## DA-MS" | ForEach-Object { Write-Output "$($_.LineNumber): $($_.Line.Trim())" }
Write-Output "`n=== TOTAL LINES ==="
$lines = (Get-Content "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md").Count
Write-Output "Lines: $lines"
Write-Output "`n=== HEADER ==="
Get-Content "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md" -TotalCount 7
