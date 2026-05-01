$results = Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_PROTOCOLS_CORE.md" -Pattern "STUCK|AUTONOMOUS"
foreach ($r in $results) {
    Write-Output "$($r.LineNumber): $($r.Line.Trim())"
}
