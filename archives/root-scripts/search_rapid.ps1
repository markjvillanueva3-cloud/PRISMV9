$results = Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_PROTOCOLS_CORE.md" -Pattern "RAPID-COMPACTION|rapid.compaction|ultra-minimal"
foreach ($r in $results) {
    Write-Output "$($r.LineNumber): $($r.Line.Trim())"
}
