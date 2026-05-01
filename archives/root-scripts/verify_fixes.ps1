# Verify current fix status across all phases
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$phases = @("DA_DEV_ACCELERATION","R1_REGISTRY","R2_SAFETY","R3_CAMPAIGNS","R4_ENTERPRISE","R5_VISUAL","R6_PRODUCTION","R7_INTELLIGENCE","R8_EXPERIENCE","R9_INTEGRATION","R10_REVOLUTION","R11_PRODUCT")

Write-Output "=== FIX VERIFICATION ==="

Write-Output "`n--- C4: DEPENDS ON headers ---"
foreach ($p in $phases) {
    $has = (Select-String -Path "$dir\PHASE_${p}.md" -Pattern "^# DEPENDS ON:" -ErrorAction SilentlyContinue).Count
    $short = $p.Split("_")[0]
    Write-Output "  $short : $(if ($has -gt 0) {'OK'} else {'MISSING'})"
}

Write-Output "`n--- S1: CONTEXT BRIDGE ---"
foreach ($p in @("R7_INTELLIGENCE","R8_EXPERIENCE","R9_INTEGRATION","R10_REVOLUTION")) {
    $has = (Select-String -Path "$dir\PHASE_${p}.md" -Pattern "CONTEXT BRIDGE" -ErrorAction SilentlyContinue).Count
    Write-Output "  $($p.Split('_')[0]) : $(if ($has -gt 0) {'OK'} else {'MISSING'})"
}

Write-Output "`n--- C1: Per-MS companion schedules ---"
foreach ($p in @("R1_REGISTRY","R2_SAFETY","R3_CAMPAIGNS","R7_INTELLIGENCE","R8_EXPERIENCE")) {
    $has = (Select-String -Path "$dir\PHASE_${p}.md" -Pattern "PER-MS COMPANION SCHEDULE" -ErrorAction SilentlyContinue).Count
    Write-Output "  $($p.Split('_')[0]) : $(if ($has -gt 0) {'OK'} else {'MISSING'})"
}

Write-Output "`n--- C2: R2 safety skills ---"
$r2skills = (Select-String -Path "$dir\PHASE_R2_SAFETY.md" -Pattern "prism-safety-calculation-guide|prism-golden-values|prism-edge-case" -ErrorAction SilentlyContinue).Count
Write-Output "  R2 safety skills: $(if ($r2skills -ge 3) {'OK (3 found)'} else {"MISSING ($r2skills found)"})"

Write-Output "`n--- C3: New companion sections ---"
foreach ($p in @("R4_ENTERPRISE","R5_VISUAL","R6_PRODUCTION","R9_INTEGRATION","R10_REVOLUTION")) {
    $has = (Select-String -Path "$dir\PHASE_${p}.md" -Pattern "COMPANION ASSETS.*v14.5|PER-MS COMPANION" -ErrorAction SilentlyContinue).Count
    Write-Output "  $($p.Split('_')[0]) : $(if ($has -gt 0) {'OK'} else {'MISSING'})"
}

Write-Output "`n--- C5: Smoke test enforcement ---"
$template = (Select-String -Path "$dir\PHASE_TEMPLATE.md" -Pattern "SMOKE TEST" -ErrorAction SilentlyContinue).Count
Write-Output "  PHASE_TEMPLATE: $(if ($template -gt 0) {'OK'} else {'NOT YET'})"

Write-Output "`n--- C6: Parallel track checkpoints ---"
$r1chk = (Select-String -Path "$dir\PHASE_R1_REGISTRY.md" -Pattern "SKILL_INDEX.*count|parallel.*checkpoint" -ErrorAction SilentlyContinue).Count
Write-Output "  R1 checkpoint: $(if ($r1chk -gt 0) {'OK'} else {'NOT YET'})"

Write-Output "`n--- S2: Wiring protocol ---"
$wire = (Select-String -Path "$dir\PHASE_TEMPLATE.md" -Pattern "WIRING PROTOCOL" -ErrorAction SilentlyContinue).Count
Write-Output "  PHASE_TEMPLATE wiring: $(if ($wire -gt 0) {'OK'} else {'NOT YET'})"
