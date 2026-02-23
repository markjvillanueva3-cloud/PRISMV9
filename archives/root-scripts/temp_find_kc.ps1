$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
foreach ($f in @("PHASE_R1_REGISTRY.md","PHASE_R2_SAFETY.md")) {
    $hits = Select-String -Path (Join-Path $dir $f) -Pattern "KNOWLEDGE CONTRIBUTION"
    foreach ($h in $hits) {
        Write-Output "$f line $($h.LineNumber): $($h.Line.Trim())"
    }
}
