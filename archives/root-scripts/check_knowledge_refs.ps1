# Check knowledge contribution in ALL phase docs
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
foreach ($f in @("PHASE_R4_ENTERPRISE.md","PHASE_R5_VISUAL.md","PHASE_R6_PRODUCTION.md","PHASE_R8_EXPERIENCE.md","PHASE_R9_INTEGRATION.md","PHASE_R10_REVOLUTION.md","PHASE_R11_PRODUCT.md")) {
    $k = Select-String -Path (Join-Path $dir $f) -Pattern "KNOWLEDGE CONTRIBUTION|knowledge.node|Branch|knowledge.system"
    Write-Output "$f : $($k.Count) knowledge refs"
    foreach ($m in $k) {
        Write-Output "  L$($m.LineNumber): $($m.Line.Trim().Substring(0, [Math]::Min(70, $m.Line.Trim().Length)))"
    }
}
