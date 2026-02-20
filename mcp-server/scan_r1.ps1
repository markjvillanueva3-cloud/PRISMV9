Select-String -Path 'C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R1_REGISTRY.md' -Pattern 'LOADER|CURRENT_MS' | ForEach-Object {
    "$($_.LineNumber): $($_.Line)"
}
