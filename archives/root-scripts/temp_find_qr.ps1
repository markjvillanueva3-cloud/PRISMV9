$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# For each remaining file, find the line number of QUICK REFERENCE closing ``` + the next ---
$files = @("PHASE_R5_VISUAL.md","PHASE_R6_PRODUCTION.md","PHASE_R7_INTELLIGENCE.md","PHASE_R8_EXPERIENCE.md","PHASE_R9_INTEGRATION.md","PHASE_R10_REVOLUTION.md","PHASE_R11_PRODUCT.md")

foreach ($f in $files) {
    $path = Join-Path $dir $f
    $lines = Get-Content $path
    $inQR = $false
    $qrEnd = -1
    $nextSection = ""
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "QUICK REFERENCE") { $inQR = $true }
        if ($inQR -and $lines[$i] -match "^``````$" -and $i -gt 20) { 
            $qrEnd = $i + 1  # line number (1-based)
            # Find what comes after --- 
            for ($j = $i + 1; $j -lt [Math]::Min($i + 10, $lines.Count); $j++) {
                if ($lines[$j] -match "^## |^### ") {
                    $nextSection = $lines[$j].Trim()
                    break
                }
            }
            break
        }
    }
    Write-Output "$f : QR ends at line $qrEnd : next section = $nextSection"
}
