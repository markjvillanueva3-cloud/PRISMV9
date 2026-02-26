Get-ChildItem "C:\PRISM\mcp-server\data\docs\roadmap" -File | Sort-Object Name | ForEach-Object {
    Write-Output "$($_.Name) ($($_.Length) bytes)"
}
