# Check R7, R8, R9 first 10 lines
foreach ($f in @("PHASE_R7_INTELLIGENCE.md","PHASE_R8_EXPERIENCE.md","PHASE_R9_INTEGRATION.md")) {
    Write-Output "=== $f ==="
    Get-Content "C:\PRISM\mcp-server\data\docs\roadmap\$f" -TotalCount 10 | ForEach-Object { Write-Output "  $_" }
    Write-Output ""
}
