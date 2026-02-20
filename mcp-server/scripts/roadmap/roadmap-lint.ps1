# W2-2: Roadmap Lint — Integrity checks for roadmap files
# Exit: 0=clean, 1=warnings, 2=errors

$roadmapDir = "C:\PRISM\mcp-server\data\docs\roadmap"
$errors = @()
$warnings = @()

# a. Every phase file referenced in Recovery Card exists
$recoveryCard = Get-Content (Join-Path $roadmapDir "PRISM_RECOVERY_CARD.md") -Raw
$phaseFiles = @(
    "PHASE_P0_ACTIVATION.md", "PHASE_DA_DEV_ACCELERATION.md",
    "PHASE_R1_REGISTRY.md", "PHASE_R2_SAFETY.md", "PHASE_R3_CAMPAIGNS.md",
    "PHASE_R4_ENTERPRISE.md", "PHASE_R5_VISUAL.md", "PHASE_R6_PRODUCTION.md",
    "PHASE_R7_INTELLIGENCE.md", "PHASE_R8_EXPERIENCE.md", "PHASE_R9_INTEGRATION.md",
    "PHASE_R10_REVOLUTION.md", "PHASE_R11_PRODUCT.md"
)
foreach ($pf in $phaseFiles) {
    if (-not (Test-Path (Join-Path $roadmapDir $pf))) {
        $errors += "MISSING: $pf referenced but not found on disk"
    }
}

# b. CURRENT_POSITION.md references valid phase
$posFile = Join-Path $roadmapDir "CURRENT_POSITION.md"
if (Test-Path $posFile) {
    $pos = Get-Content $posFile -Raw
    if ($pos -notmatch "CURRENT_MS:") { $errors += "CURRENT_POSITION.md missing CURRENT_MS field" }
    if ($pos -notmatch "PHASE:") { $warnings += "CURRENT_POSITION.md missing PHASE field" }
} else {
    $errors += "CURRENT_POSITION.md not found"
}

# c. Section index exists and is non-empty
$sectionIndex = Join-Path $roadmapDir "ROADMAP_SECTION_INDEX.md"
if (Test-Path $sectionIndex) {
    $siLines = (Get-Content $sectionIndex).Count
    if ($siLines -lt 10) { $warnings += "ROADMAP_SECTION_INDEX.md suspiciously small ($siLines lines)" }
} else {
    $warnings += "ROADMAP_SECTION_INDEX.md not found (optional but recommended)"
}

# d. No file shrank >10% since last lint (regression detection)
$baselineFile = Join-Path $roadmapDir ".lint-baseline.json"
$currentSizes = @{}
Get-ChildItem $roadmapDir -Filter "*.md" -File | ForEach-Object {
    $currentSizes[$_.Name] = $_.Length
}

if (Test-Path $baselineFile) {
    $baseline = Get-Content $baselineFile -Raw | ConvertFrom-Json
    foreach ($name in $currentSizes.Keys) {
        $old = $baseline.$name
        if ($old -and $old -gt 0) {
            $shrinkPct = [math]::Round(($old - $currentSizes[$name]) / $old * 100, 1)
            if ($shrinkPct -gt 10) {
                $errors += "REGRESSION: $name shrank ${shrinkPct}% ($old -> $($currentSizes[$name]) bytes)"
            }
        }
    }
}
$currentSizes | ConvertTo-Json | Set-Content $baselineFile -Encoding UTF8

# e. Recovery Card and Session Handoff exist
if (-not (Test-Path (Join-Path $roadmapDir "PRISM_RECOVERY_CARD.md"))) {
    $errors += "PRISM_RECOVERY_CARD.md missing - CRITICAL"
}
$handoff = "C:\PRISM\mcp-server\data\docs\SESSION_HANDOFF.md"
if (-not (Test-Path $handoff)) {
    $warnings += "SESSION_HANDOFF.md not found (expected after session end)"
}

# Report
Write-Host "=== ROADMAP LINT ==="
if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "ALL CHECKS PASSED (clean)" -ForegroundColor Green
    exit 0
}
if ($errors.Count -gt 0) {
    Write-Host "ERRORS ($($errors.Count)):" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  ERROR: $_" -ForegroundColor Red }
}
if ($warnings.Count -gt 0) {
    Write-Host "WARNINGS ($($warnings.Count)):" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "  WARN: $_" -ForegroundColor Yellow }
}
if ($errors.Count -gt 0) { exit 2 } else { exit 1 }
