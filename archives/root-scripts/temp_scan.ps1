$results = Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md" -Pattern "^## |^### "
foreach ($r in $results) {
    Write-Output "$($r.LineNumber): $($r.Line.Trim())"
}
