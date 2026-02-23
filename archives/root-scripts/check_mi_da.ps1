$mi = "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_MASTER_INDEX.md"
Select-String -Path $mi -Pattern "PHASE_DA_DEV" | ForEach-Object {
    Write-Output "L$($_.LineNumber): $($_.Line.TrimEnd())"
}
