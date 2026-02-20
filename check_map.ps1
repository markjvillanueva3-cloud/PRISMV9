# Find the wave headers in MASTER_ACTION_PLAN_v2
Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\MASTER_ACTION_PLAN_v2.md" -Pattern "^## WAVE|^## FULL INVENTORY|^## OVERVIEW|^## PARALLEL|^## APPENDIX" | ForEach-Object {
    Write-Output "L$($_.LineNumber): $($_.Line.Trim())"
}
Write-Output "`nTotal lines: $((Get-Content 'C:\PRISM\mcp-server\data\docs\roadmap\MASTER_ACTION_PLAN_v2.md').Count)"
