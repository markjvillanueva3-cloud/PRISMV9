Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_RECOVERY_CARD.md" -Pattern "v14\.|ROLE_MODEL|3.880|skill atom" | ForEach-Object {
    Write-Output "L$($_.LineNumber): $($_.Line.Trim())"
}
