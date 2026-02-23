Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md" -Pattern "^## DA-MS|^### DA-MS|COMPLETION CHECKLIST|^## COMPANION|^## CONTEXT BRIDGE|^---$" | ForEach-Object { Write-Output "$($_.LineNumber): $($_.Line.TrimEnd())" }
Write-Output "=== TOTAL LINES ==="
$lines = (Get-Content "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md").Count
Write-Output "Lines: $lines"
