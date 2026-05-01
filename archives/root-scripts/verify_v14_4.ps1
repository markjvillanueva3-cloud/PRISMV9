# PRISM Roadmap v14.4 Integrity Verification
# Checks all integration targets are consistent

$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$errors = @()
$warnings = @()
$pass = @()

Write-Output "========================================="
Write-Output " PRISM ROADMAP v14.4 INTEGRITY CHECK"
Write-Output "========================================="
Write-Output ""

# --- CHECK 1: All expected files exist ---
Write-Output "CHECK 1: File existence"
$expectedFiles = @(
    "PRISM_RECOVERY_CARD.md",
    "PRISM_PROTOCOLS_CORE.md",
    "PRISM_MASTER_INDEX.md",
    "ROADMAP_INSTRUCTIONS.md",
    "SYSTEM_CONTRACT.md",
    "HIERARCHICAL_INDEX_SPEC.md",
    "SKILLS_SCRIPTS_HOOKS_PLAN.md",
    "OPERATIONAL_IMPROVEMENTS_PLAN.md",
    "PHASE_P0_ACTIVATION.md",
    "PHASE_DA_DEV_ACCELERATION.md",
    "PHASE_R1_REGISTRY.md",
    "PHASE_R2_SAFETY.md",
    "PHASE_R3_CAMPAIGNS.md",
    "PHASE_R4_ENTERPRISE.md",
    "PHASE_R5_VISUAL.md",
    "PHASE_R6_PRODUCTION.md",
    "PHASE_R7_INTELLIGENCE.md",
    "PHASE_R8_EXPERIENCE.md",
    "PHASE_R9_INTEGRATION.md",
    "PHASE_R10_REVOLUTION.md",
    "PHASE_R11_PRODUCT.md"
)
foreach ($f in $expectedFiles) {
    if (Test-Path (Join-Path $dir $f)) {
        $pass += "EXISTS: $f"
    } else {
        $errors += "MISSING: $f"
    }
}
Write-Output "  Files checked: $($expectedFiles.Count)"

# --- CHECK 2: Version consistency ---
Write-Output "`nCHECK 2: Version headers"
$v14_4_files = @("PRISM_MASTER_INDEX.md","PHASE_DA_DEV_ACCELERATION.md","PRISM_PROTOCOLS_CORE.md","PRISM_RECOVERY_CARD.md")
foreach ($f in $v14_4_files) {
    $path = Join-Path $dir $f
    $firstLines = Get-Content $path -TotalCount 10
    $hasV14_4 = ($firstLines | Select-String "v14\.[34]").Count -gt 0
    if ($hasV14_4) { $pass += "VERSION OK: $f" }
    else { $warnings += "VERSION MISSING v14.3/4: $f (first 10 lines lack version)" }
}

# --- CHECK 3: DA phase structure ---
Write-Output "`nCHECK 3: DA phase milestones (expect MS0-MS8)"
$daPath = Join-Path $dir "PHASE_DA_DEV_ACCELERATION.md"
$daMilestones = (Select-String -Path $daPath -Pattern "^## DA-MS\d").Count
if ($daMilestones -eq 9) { $pass += "DA MILESTONES: 9 (MS0-MS8) correct" }
else { $errors += "DA MILESTONES: Expected 9, found $daMilestones" }

$daLines = (Get-Content $daPath).Count
if ($daLines -gt 1000) { $pass += "DA SIZE: $daLines lines (detailed)" }
else { $warnings += "DA SIZE: $daLines lines (expected >1000 for v14.4)" }

# --- CHECK 4: QUICK REFERENCE headers in all phase docs ---
Write-Output "`nCHECK 4: Quick Reference headers"
$phaseDocs = @("PHASE_DA_DEV_ACCELERATION.md","PHASE_R1_REGISTRY.md","PHASE_R2_SAFETY.md",
    "PHASE_R3_CAMPAIGNS.md","PHASE_R4_ENTERPRISE.md","PHASE_R5_VISUAL.md","PHASE_R6_PRODUCTION.md",
    "PHASE_R7_INTELLIGENCE.md","PHASE_R8_EXPERIENCE.md","PHASE_R9_INTEGRATION.md",
    "PHASE_R10_REVOLUTION.md","PHASE_R11_PRODUCT.md")
foreach ($f in $phaseDocs) {
    $qr = (Select-String -Path (Join-Path $dir $f) -Pattern "QUICK REFERENCE").Count
    if ($qr -ge 1) { $pass += "QUICK REF: $f" }
    else { $errors += "MISSING QUICK REF: $f" }
}

# --- CHECK 5: Knowledge contribution sections ---
Write-Output "`nCHECK 5: Knowledge Contribution sections in phase docs"
foreach ($f in $phaseDocs) {
    $kc = (Select-String -Path (Join-Path $dir $f) -Pattern "KNOWLEDGE CONTRIBUTION").Count
    if ($kc -ge 1) { $pass += "KNOWLEDGE CONTRIB: $f" }
    else { $warnings += "NO KNOWLEDGE CONTRIB: $f" }
}

# --- CHECK 6: Recovery Card completeness ---
Write-Output "`nCHECK 6: Recovery Card structure"
$rcPath = Join-Path $dir "PRISM_RECOVERY_CARD.md"
$rcChecks = @(
    @{Pattern="STEP 0.*DETECT ENVIRONMENT"; Name="Env Detection"},
    @{Pattern="STEP 1.*FIND POSITION"; Name="Position Recovery"},
    @{Pattern="STEP 1\.5.*SECTION INDEX"; Name="Section Index Load"},
    @{Pattern="STEP 2.*LOAD PHASE DOC"; Name="Phase Doc Load"},
    @{Pattern="STEP 2\.5.*KNOWLEDGE"; Name="Knowledge Query"},
    @{Pattern="STEP 3.*EXECUTE"; Name="Execution"},
    @{Pattern="ESSENTIAL RULES"; Name="Essential Rules"},
    @{Pattern="STUCK PROTOCOL"; Name="Stuck Protocol"},
    @{Pattern="COMPACTION ADAPTATION"; Name="Compaction Adaptation"},
    @{Pattern="PHASE TRANSITION"; Name="Phase Transition"},
    @{Pattern="SESSION END"; Name="Session End"},
    @{Pattern="KNOWLEDGE EXTRACTION"; Name="Knowledge Extraction"}
)
foreach ($c in $rcChecks) {
    $found = (Select-String -Path $rcPath -Pattern $c.Pattern).Count
    if ($found -ge 1) { $pass += "RECOVERY CARD: $($c.Name)" }
    else { $errors += "RECOVERY CARD MISSING: $($c.Name)" }
}

# --- CHECK 7: PROTOCOLS_CORE new sections ---
Write-Output "`nCHECK 7: PROTOCOLS_CORE v14.4 additions"
$pcPath = Join-Path $dir "PRISM_PROTOCOLS_CORE.md"
$pcChecks = @(
    @{Pattern="STEP 0\.5.*ENVIRONMENT"; Name="Env Detection"},
    @{Pattern="STUCK PROTOCOL.*AUTONOMOUS"; Name="Autonomous Stuck Protocol"},
    @{Pattern="RAPID-COMPACTION"; Name="Rapid Compaction Detection"},
    @{Pattern="SESSION.HANDOFF"; Name="Session Handoff Protocol"},
    @{Pattern="SESSION KNOWLEDGE EXTRACTION"; Name="Knowledge Extraction Protocol"}
)
foreach ($c in $pcChecks) {
    $found = (Select-String -Path $pcPath -Pattern $c.Pattern).Count
    if ($found -ge 1) { $pass += "PROTOCOLS: $($c.Name)" }
    else { $errors += "PROTOCOLS MISSING: $($c.Name)" }
}

# --- CHECK 8: HIERARCHICAL_INDEX_SPEC completeness ---
Write-Output "`nCHECK 8: Hierarchical Index Spec"
$hiPath = Join-Path $dir "HIERARCHICAL_INDEX_SPEC.md"
$hiBranches = @("BRANCH 1.*EXECUTION","BRANCH 2.*DATA","BRANCH 3.*RELATIONSHIP","BRANCH 4.*SESSION")
foreach ($b in $hiBranches) {
    $found = (Select-String -Path $hiPath -Pattern $b).Count
    if ($found -ge 1) { $pass += "INDEX SPEC: $b" }
    else { $errors += "INDEX SPEC MISSING: $b" }
}
$hiLines = (Get-Content $hiPath).Count
if ($hiLines -gt 400) { $pass += "INDEX SPEC SIZE: $hiLines lines" }
else { $warnings += "INDEX SPEC SIZE: $hiLines lines (expected >400)" }

# --- CHECK 9: MASTER_INDEX reflects v14.4 changes ---
Write-Output "`nCHECK 9: MASTER_INDEX changelog"
$miPath = Join-Path $dir "PRISM_MASTER_INDEX.md"
$miChecks = @("DA.*MS[5-8]|DA-MS5|DA-MS6|DA-MS7","HIERARCHICAL_INDEX_SPEC","Knowledge System","v14\.4")
foreach ($c in $miChecks) {
    $found = (Select-String -Path $miPath -Pattern $c).Count
    if ($found -ge 1) { $pass += "MASTER_INDEX: $c present" }
    else { $errors += "MASTER_INDEX MISSING: $c" }
}

# --- CHECK 10: LOADER:SKIP markers ---
Write-Output "`nCHECK 10: LOADER:SKIP markers"
$p0Skip = (Select-String -Path (Join-Path $dir "PHASE_P0_ACTIVATION.md") -Pattern "LOADER.*SKIP").Count
if ($p0Skip -ge 1) { $pass += "SKIP MARKER: P0" } else { $errors += "NO SKIP: P0" }
$r1Skip = (Select-String -Path (Join-Path $dir "PHASE_R1_REGISTRY.md") -Pattern "LOADER.*SKIP").Count
if ($r1Skip -ge 1) { $pass += "SKIP MARKER: R1 ($r1Skip markers)" } else { $errors += "NO SKIP: R1" }

# --- CHECK 11: Line count anti-regression (against known v14.3 baselines) ---
Write-Output "`nCHECK 11: Anti-regression (no files shrank vs v14.3)"
$baselines = @{
    "PRISM_PROTOCOLS_CORE.md" = 2021
    "PRISM_MASTER_INDEX.md" = 550
    "PHASE_R1_REGISTRY.md" = 1481
    "PRISM_RECOVERY_CARD.md" = 152
    "PHASE_DA_DEV_ACCELERATION.md" = 514
    "SYSTEM_CONTRACT.md" = 498
    "ROADMAP_INSTRUCTIONS.md" = 284
    "PHASE_R2_SAFETY.md" = 731
    "PHASE_R3_CAMPAIGNS.md" = 969
}
foreach ($kv in $baselines.GetEnumerator()) {
    $path = Join-Path $dir $kv.Key
    if (Test-Path $path) {
        $current = (Get-Content $path).Count
        $baseline = $kv.Value
        $delta = $current - $baseline
        if ($current -ge $baseline) { $pass += "SIZE OK: $($kv.Key) ($current >= $baseline, +$delta)" }
        else { $errors += "SHRANK: $($kv.Key) ($current < $baseline, $delta lines)" }
    }
}

# --- CHECK 12: Total file count ---
Write-Output "`nCHECK 12: File count"
$totalFiles = (Get-ChildItem $dir -Filter "*.md" -File).Count
$refFiles = (Get-ChildItem (Join-Path $dir "reference") -Filter "*.md" -File -ErrorAction SilentlyContinue).Count
$pass += "TOTAL FILES: $totalFiles root + $refFiles reference"

# =========================================
# RESULTS SUMMARY
# =========================================
Write-Output ""
Write-Output "========================================="
Write-Output " RESULTS SUMMARY"
Write-Output "========================================="
Write-Output ""

Write-Output "PASSED ($($pass.Count)):"
foreach ($p in $pass) { Write-Output "  [PASS] $p" }

if ($warnings.Count -gt 0) {
    Write-Output "`nWARNINGS ($($warnings.Count)):"
    foreach ($w in $warnings) { Write-Output "  [WARN] $w" }
}

if ($errors.Count -gt 0) {
    Write-Output "`nERRORS ($($errors.Count)):"
    foreach ($e in $errors) { Write-Output "  [FAIL] $e" }
}

Write-Output ""
if ($errors.Count -eq 0) {
    Write-Output "VERDICT: ALL CHECKS PASSED"
    Write-Output "Roadmap v14.4 integrity: VERIFIED"
} elseif ($errors.Count -le 3) {
    Write-Output "VERDICT: MOSTLY CLEAN ($($errors.Count) issues to fix)"
} else {
    Write-Output "VERDICT: NEEDS ATTENTION ($($errors.Count) errors found)"
}

Write-Output ""
Write-Output "Total checks: $($pass.Count + $warnings.Count + $errors.Count)"
Write-Output "Passed: $($pass.Count) | Warnings: $($warnings.Count) | Errors: $($errors.Count)"
