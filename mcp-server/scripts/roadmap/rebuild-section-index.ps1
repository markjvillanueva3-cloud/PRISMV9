# rebuild-section-index.ps1 — W1-3
# Scans all anchored roadmap .md files, regenerates ROADMAP_SECTION_INDEX.md
# Also writes .roadmap-index-baseline.json for drift detection (>10 line shift = WARNING)

$roadmapDir = "C:\PRISM\mcp-server\data\docs\roadmap"
$indexPath = Join-Path $roadmapDir "ROADMAP_SECTION_INDEX.md"
$baselinePath = Join-Path $roadmapDir ".roadmap-index-baseline.json"

# Only scan files that have official anchors
$targetFiles = @(
    "PRISM_PROTOCOLS_CORE.md", "PRISM_PROTOCOLS_BOOT.md", "PRISM_PROTOCOLS_CODING.md",
    "PRISM_PROTOCOLS_SAFETY.md", "PRISM_PROTOCOLS_REFERENCE.md", "PRISM_RECOVERY_CARD.md",
    "PRISM_MASTER_INDEX.md", "PHASE_P0_ACTIVATION.md", "PHASE_DA_DEV_ACCELERATION.md",
    "PHASE_R1_REGISTRY.md", "PHASE_R2_SAFETY.md", "PHASE_R3_CAMPAIGNS.md",
    "PHASE_R4_ENTERPRISE.md", "PHASE_R5_VISUAL.md", "PHASE_R6_PRODUCTION.md",
    "PHASE_R7_INTELLIGENCE.md", "PHASE_R8_EXPERIENCE.md", "PHASE_R9_INTEGRATION.md",
    "PHASE_R10_REVOLUTION.md", "PHASE_R11_PRODUCT.md"
)

$output = @()
$output += "# ROADMAP SECTION INDEX"
$output += "# Auto-generated. Rebuild: scripts/roadmap/rebuild-section-index.ps1"
$output += "# Load this (~1.5K tokens) instead of full phase docs to navigate."
$output += "# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$output += ""
$output += "| File | Anchor | Line | Section |"
$output += "|------|--------|------|---------|"

$baselineEntries = @()
$totalEntries = 0

foreach ($fileName in ($targetFiles | Sort-Object)) {
    $filePath = Join-Path $roadmapDir $fileName
    if (-not (Test-Path $filePath)) { continue }
    
    $lines = Get-Content $filePath -Encoding UTF8
    $currentAnchor = $null
    $currentAnchorLine = 0
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match '<!-- ANCHOR:\s*(\S+)\s*-->') {
            $currentAnchor = $Matches[1]
            $currentAnchorLine = $i + 1
        }
        elseif ($currentAnchor -and $line -match '^(#{2,3})\s+(.+)') {
            $sectionTitle = $Matches[2].Trim()
            $output += "| $fileName | $currentAnchor | $currentAnchorLine | $sectionTitle |"
            $baselineEntries += @{
                file = $fileName
                anchor = $currentAnchor
                line = $currentAnchorLine
                section = $sectionTitle
            }
            $totalEntries++
            $currentAnchor = $null
        }
    }
}

$output += ""
$output += "**Total entries: $totalEntries**"
$tempIndex = Join-Path $roadmapDir "_temp_SECTION_INDEX.md"
[System.IO.File]::WriteAllLines($tempIndex, $output)
try { Copy-Item $tempIndex $indexPath -Force; Remove-Item $tempIndex -Force }
catch { Write-Host "WARN: Could not update index. Temp at: $tempIndex" }

# Write baseline JSON for drift detection
$baseline = @{
    generated = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
    total_entries = $totalEntries
    entries = $baselineEntries
}
$baseline | ConvertTo-Json -Depth 3 | Set-Content -Path $baselinePath -Encoding UTF8

Write-Host "Rebuilt index: $totalEntries entries"
Write-Host "Baseline written to .roadmap-index-baseline.json"

# Drift check against existing baseline
if (Test-Path $baselinePath) {
    $old = Get-Content $baselinePath -Raw | ConvertFrom-Json
    $driftCount = 0
    foreach ($newEntry in $baselineEntries) {
        $oldEntry = $old.entries | Where-Object { $_.anchor -eq $newEntry.anchor } | Select-Object -First 1
        if ($oldEntry -and [Math]::Abs([int]$newEntry.line - [int]$oldEntry.line) -gt 10) {
            Write-Host "WARNING DRIFT: $($newEntry.anchor) moved from line $($oldEntry.line) to $($newEntry.line)"
            $driftCount++
        }
    }
    if ($driftCount -eq 0) { Write-Host "No drift detected." }
}
