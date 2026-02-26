$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

Write-Output "=== KNOWLEDGE CONTRIBUTION SECTIONS IN PHASE DOCS ==="
foreach ($f in @("PHASE_R1_REGISTRY.md","PHASE_R2_SAFETY.md","PHASE_R3_CAMPAIGNS.md","PHASE_R4_ENTERPRISE.md","PHASE_R5_VISUAL.md","PHASE_R6_PRODUCTION.md","PHASE_R7_INTELLIGENCE.md","PHASE_R8_EXPERIENCE.md","PHASE_R9_INTEGRATION.md","PHASE_R10_REVOLUTION.md","PHASE_R11_PRODUCT.md")) {
    $path = Join-Path $dir $f
    if (Test-Path $path) {
        $hits = (Select-String -Path $path -Pattern "KNOWLEDGE CONTRIBUTION|Knowledge Contribution" | Measure-Object).Count
        Write-Output "$f : $hits hits"
    }
}

Write-Output ""
Write-Output "=== ALL FILE LINE COUNTS ==="
$files = Get-ChildItem -Path $dir -Filter "*.md" -File | Sort-Object Name
foreach ($fi in $files) {
    $content = [System.IO.File]::ReadAllText($fi.FullName)
    $lines = ($content -split "`n").Count
    Write-Output "$($fi.Name) : $lines lines : $($fi.Length) bytes"
}
