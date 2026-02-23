# List roadmap files
Get-ChildItem "C:\PRISM\mcp-server\data\docs\roadmap" -File | Where-Object {
    $_.Name -match "INDEX|MASTER|RECOVERY|TRACKER|SYSTEM"
} | ForEach-Object {
    Write-Output "$($_.Name) ($($_.Length) bytes)"
}
