# Update Recovery Card for v14.5
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_RECOVERY_CARD.md"
$content = Get-Content $file -Raw

# Version bump
$content = $content -replace "PRISM RECOVERY CARD .+ v14\.3", "PRISM RECOVERY CARD `u{2014} v14.5"

# Update line counts in phase mapping
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$lineUpdates = @{
    "DA.*\(\d+ lines\)" = "DA  `u{2192} PHASE_DA_DEV_ACCELERATION.md      ($((Get-Content "$dir\PHASE_DA_DEV_ACCELERATION.md").Count) lines)"
    "R1.*\(\d+ lines.*skip" = "R1  `u{2192} PHASE_R1_REGISTRY.md             ($((Get-Content "$dir\PHASE_R1_REGISTRY.md").Count) lines `u{2014} skip to MS4.5+ via LOADER:SKIP)"
    "R2.*\(\d+ lines\)" = "R2  `u{2192} PHASE_R2_SAFETY.md               ($((Get-Content "$dir\PHASE_R2_SAFETY.md").Count) lines)"
    "R3.*\(\d+ lines\)" = "R3  `u{2192} PHASE_R3_CAMPAIGNS.md            ($((Get-Content "$dir\PHASE_R3_CAMPAIGNS.md").Count) lines)"
    "R4.*\(\d+ lines\)" = "R4  `u{2192} PHASE_R4_ENTERPRISE.md           ($((Get-Content "$dir\PHASE_R4_ENTERPRISE.md").Count) lines)"
    "R5.*\(\d+ lines\)" = "R5  `u{2192} PHASE_R5_VISUAL.md               ($((Get-Content "$dir\PHASE_R5_VISUAL.md").Count) lines)"
    "R6.*\(\d+ lines\)" = "R6  `u{2192} PHASE_R6_PRODUCTION.md           ($((Get-Content "$dir\PHASE_R6_PRODUCTION.md").Count) lines)"
    "R7.*\(\d+ lines\)" = "R7  `u{2192} PHASE_R7_INTELLIGENCE.md         ($((Get-Content "$dir\PHASE_R7_INTELLIGENCE.md").Count) lines)"
    "R8.*\(\d+ lines\)" = "R8  `u{2192} PHASE_R8_EXPERIENCE.md           ($((Get-Content "$dir\PHASE_R8_EXPERIENCE.md").Count) lines)"
    "R9.*\(\d+ lines\)" = "R9  `u{2192} PHASE_R9_INTEGRATION.md          ($((Get-Content "$dir\PHASE_R9_INTEGRATION.md").Count) lines)"
    "R10.*\(\d+ lines\)" = "R10 `u{2192} PHASE_R10_REVOLUTION.md          ($((Get-Content "$dir\PHASE_R10_REVOLUTION.md").Count) lines)"
    "R11.*\(\d+ lines\)" = "R11 `u{2192} PHASE_R11_PRODUCT.md             ($((Get-Content "$dir\PHASE_R11_PRODUCT.md").Count) lines)"
}

foreach ($pattern in $lineUpdates.Keys) {
    $content = $content -replace $pattern, $lineUpdates[$pattern]
}

[System.IO.File]::WriteAllText($file, $content)
$newCount = (Get-Content $file).Count
Write-Output "Recovery Card updated: $newCount lines"
