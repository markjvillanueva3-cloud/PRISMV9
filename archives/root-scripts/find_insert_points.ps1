$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$phases = @("PHASE_R3_CAMPAIGNS.md","PHASE_R4_ENTERPRISE.md","PHASE_R5_VISUAL.md",
            "PHASE_R6_PRODUCTION.md","PHASE_R7_INTELLIGENCE.md","PHASE_R8_EXPERIENCE.md",
            "PHASE_R9_INTEGRATION.md","PHASE_R10_REVOLUTION.md","PHASE_R11_PRODUCT.md")

foreach ($f in $phases) {
    $path = Join-Path $dir $f
    $lines = Get-Content $path
    $lineNum = 0
    $quickRefEnd = 0
    $contextBridge = 0
    $execModel = 0
    foreach ($line in $lines) {
        $lineNum++
        if ($line -match "^---$" -and $quickRefEnd -eq 0 -and $lineNum -gt 20) { $quickRefEnd = $lineNum }
        if ($line -match "CONTEXT BRIDGE|EXECUTION MODEL|OBJECTIVES") {
            if ($contextBridge -eq 0) { $contextBridge = $lineNum }
        }
    }
    Write-Output "$f | total=$($lines.Count) | first_divider=$quickRefEnd | first_section=$contextBridge"
}
