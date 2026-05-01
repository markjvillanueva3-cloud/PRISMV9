Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_MASTER_INDEX.md" -Pattern "206|3.880|Role.Model|95 milestone" | ForEach-Object {
    Write-Output "L$($_.LineNumber): $($_.Line.Trim())"
}
