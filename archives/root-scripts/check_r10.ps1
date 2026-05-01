# Check R10 milestone headers
Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R10_REVOLUTION.md" -Pattern "^## MS|^## R10|CONTEXT BRIDGE" | ForEach-Object {
    Write-Output "L$($_.LineNumber): $($_.Line.Trim().Substring(0, [Math]::Min(80, $_.Line.Trim().Length)))"
}
