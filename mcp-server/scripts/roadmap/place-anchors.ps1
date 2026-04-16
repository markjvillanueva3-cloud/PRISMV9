# W1-1: Place section anchors across all roadmap .md files
# Format: <!-- ANCHOR: [prefix]_[section_name] --> before each ## and ### header

$roadmapDir = "C:\PRISM\mcp-server\data\docs\roadmap"

# File-to-prefix mapping
$prefixMap = @{
    "PRISM_PROTOCOLS_CORE.md"       = "pc"
    "PRISM_PROTOCOLS_BOOT.md"       = "pb"
    "PRISM_PROTOCOLS_CODING.md"     = "pcd"
    "PRISM_PROTOCOLS_SAFETY.md"     = "ps"
    "PRISM_PROTOCOLS_REFERENCE.md"  = "pr"
    "PRISM_RECOVERY_CARD.md"        = "rc"
    "PRISM_MASTER_INDEX.md"         = "mi"
    "PHASE_P0_ACTIVATION.md"        = "p0"
    "PHASE_DA_DEV_ACCELERATION.md"  = "da"
    "PHASE_R1_REGISTRY.md"          = "r1"
    "PHASE_R2_SAFETY.md"            = "r2"
    "PHASE_R3_CAMPAIGNS.md"         = "r3"
    "PHASE_R4_ENTERPRISE.md"        = "r4"
    "PHASE_R5_VISUAL.md"            = "r5"
    "PHASE_R6_PRODUCTION.md"        = "r6"
    "PHASE_R7_INTELLIGENCE.md"      = "r7"
    "PHASE_R8_EXPERIENCE.md"        = "r8"
    "PHASE_R9_INTEGRATION.md"       = "r9"
    "PHASE_R10_REVOLUTION.md"       = "r10"
    "PHASE_R11_PRODUCT.md"          = "r11"
}

function Convert-ToAnchorName {
    param([string]$headerText)
    # Strip markdown header prefix, trim, lowercase, replace non-alphanum with underscore
    $clean = $headerText -replace '^#{2,3}\s+', ''
    $clean = $clean.Trim()
    $clean = $clean.ToLower()
    $clean = $clean -replace '[^a-z0-9]+', '_'
    $clean = $clean.TrimEnd('_').TrimStart('_')
    return $clean
}

$totalAnchors = 0
$fileResults = @()

foreach ($fileName in $prefixMap.Keys) {
    $filePath = Join-Path $roadmapDir $fileName
    if (-not (Test-Path $filePath)) {
        Write-Host "SKIP: $fileName (not found)"
        continue
    }

    $lines = Get-Content $filePath -Encoding UTF8
    $newLines = @()
    $anchorsInFile = 0

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]

        # Check if line is a ## or ### header (but not # single)
        if ($line -match '^(#{2,3})\s+(.+)') {
            $prefix = $prefixMap[$fileName]
            $anchorName = Convert-ToAnchorName $line
            $anchorTag = "<!-- ANCHOR: ${prefix}_${anchorName} -->"

            # Check if previous line is already an anchor
            $prevLine = if ($newLines.Count -gt 0) { $newLines[$newLines.Count - 1] } else { "" }
            if ($prevLine -match '<!-- ANCHOR:') {
                # Already anchored, skip
                $newLines += $line
            } else {
                $newLines += $anchorTag
                $newLines += $line
                $anchorsInFile++
            }
        } else {
            $newLines += $line
        }
    }

    if ($anchorsInFile -gt 0) {
        Set-Content -Path $filePath -Value $newLines -Encoding UTF8
    }

    $totalAnchors += $anchorsInFile
    $fileResults += [PSCustomObject]@{
        File = $fileName
        Anchors = $anchorsInFile
    }
    Write-Host "${fileName}: ${anchorsInFile} anchors placed"
}

Write-Host ""
Write-Host "=== RESULTS ==="
Write-Host "Total anchors placed: $totalAnchors"
Write-Host ""
$fileResults | Sort-Object -Property Anchors -Descending | Format-Table -AutoSize
