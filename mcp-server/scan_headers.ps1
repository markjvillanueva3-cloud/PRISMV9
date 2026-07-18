Select-String -Path 'C:\PRISM\mcp-server\data\docs\roadmap\PRISM_PROTOCOLS_CORE.md' -Pattern '^## ' | ForEach-Object {
    "$($_.LineNumber): $($_.Line)"
}
