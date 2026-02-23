# Fix C4: Add DEPENDS ON headers to R7, R8, R9
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# === R7 ===
$r7 = Get-Content "$dir\PHASE_R7_INTELLIGENCE.md"
$r7[2] = "## v14.2 | Prerequisites: R1 (registries loaded), R3 (campaign actions live)`r`n# DEPENDS ON: R1 complete (registries loaded), R3 complete (campaign actions live), R2 complete (safety validation)"
[System.IO.File]::WriteAllLines("$dir\PHASE_R7_INTELLIGENCE.md", $r7)
Write-Output "C4: R7 DEPENDS ON header added"

# === R8 — already has 2 but verify format ===
$r8 = Get-Content "$dir\PHASE_R8_EXPERIENCE.md"
# Check if line 3 already has proper DEPENDS ON format
$hasProperHeader = $false
foreach ($line in $r8[0..5]) {
    if ($line -match "^# DEPENDS ON:") { $hasProperHeader = $true; break }
}
if (-not $hasProperHeader) {
    # Find the Prerequisites line and add DEPENDS ON after it
    for ($i = 0; $i -lt $r8.Count; $i++) {
        if ($r8[$i] -match "Prerequisites:") {
            $r8[$i] = $r8[$i] + "`r`n# DEPENDS ON: R3 complete (actions live), R7 complete (intelligence features), R5 complete (visual layer)"
            break
        }
    }
    [System.IO.File]::WriteAllLines("$dir\PHASE_R8_EXPERIENCE.md", $r8)
    Write-Output "C4: R8 DEPENDS ON header added"
} else {
    Write-Output "C4: R8 already has DEPENDS ON header"
}

# === R9 ===
$r9 = Get-Content "$dir\PHASE_R9_INTEGRATION.md"
$r9[2] = "## v14.2 | Prerequisites: R3 (actions), R7 (intelligence), R8 (experience layer)`r`n# DEPENDS ON: R3 complete (campaign actions), R7 complete (intelligence), R8 complete (experience layer)"
[System.IO.File]::WriteAllLines("$dir\PHASE_R9_INTEGRATION.md", $r9)
Write-Output "C4: R9 DEPENDS ON header added"

# Verify
Write-Output "`n--- VERIFICATION ---"
foreach ($f in @('PHASE_R7_INTELLIGENCE.md','PHASE_R8_EXPERIENCE.md','PHASE_R9_INTEGRATION.md')) {
    $count = (Select-String -Path (Join-Path $dir $f) -Pattern "DEPENDS ON" -SimpleMatch | Measure-Object).Count
    Write-Output "$f : DEPENDS_ON=$count"
}
