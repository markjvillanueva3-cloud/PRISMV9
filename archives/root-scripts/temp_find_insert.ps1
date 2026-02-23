$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$files = @("PHASE_R5_VISUAL.md","PHASE_R6_PRODUCTION.md","PHASE_R7_INTELLIGENCE.md","PHASE_R8_EXPERIENCE.md","PHASE_R9_INTEGRATION.md","PHASE_R10_REVOLUTION.md","PHASE_R11_PRODUCT.md")

foreach ($f in $files) {
    $path = Join-Path $dir $f
    $hits = Select-String -Path $path -Pattern "^ENV:" 
    $envLine = if ($hits) { $hits[0].LineNumber } else { -1 }
    
    $hits2 = Select-String -Path $path -Pattern "^## CONTEXT BRIDGE|^## OBJECTIVES|^### EXECUTION"
    $nextSec = if ($hits2) { "$($hits2[0].LineNumber): $($hits2[0].Line.Trim())" } else { "NOT FOUND" }
    
    Write-Output "$f : ENV at line $envLine : next = $nextSec"
}
