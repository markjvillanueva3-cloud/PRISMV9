# Check R6 for milestone assignments
Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R6_PRODUCTION.md" -Pattern "MILESTONE ASSIGNMENTS|### Role:|## R6-MS" | ForEach-Object {
    $txt = $_.Line.Trim()
    if ($txt.Length -gt 120) { $txt = $txt.Substring(0,120) + "..." }
    Write-Output "L$($_.LineNumber): $txt"
}
Write-Output "---"
Write-Output "R6 total lines: $((Get-Content 'C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R6_PRODUCTION.md').Count)"
