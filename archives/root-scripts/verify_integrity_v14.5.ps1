# ROADMAP v14.5 INTEGRITY VERIFICATION
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$pass = 0; $fail = 0; $warn = 0

Write-Output "=== ROADMAP v14.5 INTEGRITY VERIFICATION ==="
Write-Output "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output ""

# 1. File existence + non-empty
Write-Output "--- FILE EXISTENCE ---"
$required = @(
    "PRISM_MASTER_INDEX.md", "PRISM_PROTOCOLS_CORE.md", "PRISM_RECOVERY_CARD.md",
    "PHASE_TEMPLATE.md", "ROADMAP_INSTRUCTIONS.md", "ROADMAP_TRACKER.md",
    "CURRENT_POSITION.md", "SYSTEM_CONTRACT.md",
    "PHASE_DA_DEV_ACCELERATION.md", "PHASE_P0_ACTIVATION.md",
    "PHASE_R1_REGISTRY.md", "PHASE_R2_SAFETY.md", "PHASE_R3_CAMPAIGNS.md",
    "PHASE_R4_ENTERPRISE.md", "PHASE_R5_VISUAL.md", "PHASE_R6_PRODUCTION.md",
    "PHASE_R7_INTELLIGENCE.md", "PHASE_R8_EXPERIENCE.md", "PHASE_R9_INTEGRATION.md",
    "PHASE_R10_REVOLUTION.md", "PHASE_R11_PRODUCT.md",
    "CLAUDE_CODE_INTEGRATION.md", "SKILLS_SCRIPTS_HOOKS_PLAN.md",
    "SKILL_ATOMIZATION_SPEC.md"
)
foreach ($f in $required) {
    $path = Join-Path $dir $f
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        if ($size -gt 0) {
            $lines = (Get-Content $path | Measure-Object -Line).Lines
            Write-Output "  OK: $f ($lines lines, $size bytes)"
            $pass++
        } else {
            Write-Output "  FAIL: $f (EMPTY!)"
            $fail++
        }
    } else {
        Write-Output "  FAIL: $f (NOT FOUND)"
        $fail++
    }
}

# 2. Reference folder
Write-Output ""
Write-Output "--- REFERENCE FOLDER ---"
$refDir = Join-Path $dir "reference"
if (Test-Path $refDir) {
    $refFiles = Get-ChildItem $refDir -Filter "*.md" -File
    Write-Output "  OK: reference/ contains $($refFiles.Count) files"
    $pass++
} else {
    Write-Output "  WARN: reference/ folder not found"
    $warn++
}

# 3. Version consistency
Write-Output ""
Write-Output "--- VERSION HEADERS ---"
$phaseFiles = @("PHASE_DA_DEV_ACCELERATION.md","PHASE_P0_ACTIVATION.md","PHASE_R1_REGISTRY.md",
    "PHASE_R2_SAFETY.md","PHASE_R3_CAMPAIGNS.md","PHASE_R4_ENTERPRISE.md","PHASE_R5_VISUAL.md",
    "PHASE_R6_PRODUCTION.md","PHASE_R7_INTELLIGENCE.md","PHASE_R8_EXPERIENCE.md",
    "PHASE_R9_INTEGRATION.md","PHASE_R10_REVOLUTION.md","PHASE_R11_PRODUCT.md")
foreach ($f in $phaseFiles) {
    $hdr = (Get-Content (Join-Path $dir $f) | Select-Object -First 5) -join " "
    if ($hdr -match "v14") {
        Write-Output "  OK: $f (v14.x header)"
        $pass++
    } else {
        Write-Output "  WARN: $f (no v14.x in header)"
        $warn++
    }
}

# 4. DEPENDS ON cross-check
Write-Output ""
Write-Output "--- DEPENDS ON HEADERS ---"
$depsRequired = @("PHASE_DA_DEV_ACCELERATION.md","PHASE_R1_REGISTRY.md","PHASE_R2_SAFETY.md",
    "PHASE_R3_CAMPAIGNS.md","PHASE_R4_ENTERPRISE.md","PHASE_R5_VISUAL.md","PHASE_R6_PRODUCTION.md",
    "PHASE_R7_INTELLIGENCE.md","PHASE_R8_EXPERIENCE.md","PHASE_R9_INTEGRATION.md",
    "PHASE_R10_REVOLUTION.md","PHASE_R11_PRODUCT.md")
foreach ($f in $depsRequired) {
    $c = (Select-String -Path (Join-Path $dir $f) -Pattern "DEPENDS ON" -SimpleMatch | Measure-Object).Count
    if ($c -gt 0) { Write-Output "  OK: $f ($c)"; $pass++ }
    else { Write-Output "  FAIL: $f (MISSING)"; $fail++ }
}

# 5. Companion asset sections
Write-Output ""
Write-Output "--- COMPANION ASSETS ---"
$companionRequired = @("PHASE_R1_REGISTRY.md","PHASE_R2_SAFETY.md","PHASE_R3_CAMPAIGNS.md",
    "PHASE_R4_ENTERPRISE.md","PHASE_R5_VISUAL.md","PHASE_R6_PRODUCTION.md",
    "PHASE_R7_INTELLIGENCE.md","PHASE_R8_EXPERIENCE.md","PHASE_R9_INTEGRATION.md","PHASE_R10_REVOLUTION.md")
foreach ($f in $companionRequired) {
    $c = (Select-String -Path (Join-Path $dir $f) -Pattern "COMPANION" -SimpleMatch | Measure-Object).Count
    if ($c -gt 0) { Write-Output "  OK: $f ($c refs)"; $pass++ }
    else { Write-Output "  WARN: $f (no companion section)"; $warn++ }
}

# 6. Quick reference headers
Write-Output ""
Write-Output "--- QUICK REFERENCE ---"
foreach ($f in $phaseFiles) {
    $c = (Select-String -Path (Join-Path $dir $f) -Pattern "QUICK REFERENCE" -SimpleMatch | Measure-Object).Count
    if ($c -gt 0) { Write-Output "  OK: $f"; $pass++ }
    else { Write-Output "  WARN: $f (no QUICK REFERENCE)"; $warn++ }
}

# 7. Context bridge
Write-Output ""
Write-Output "--- CONTEXT BRIDGE ---"
foreach ($f in $phaseFiles) {
    $c = (Select-String -Path (Join-Path $dir $f) -Pattern "CONTEXT BRIDGE" -SimpleMatch | Measure-Object).Count
    if ($c -gt 0) { Write-Output "  OK: $f"; $pass++ }
    else { Write-Output "  WARN: $f (no CONTEXT BRIDGE)"; $warn++ }
}

# 8. Wiring protocol in template
Write-Output ""
Write-Output "--- TEMPLATE FEATURES ---"
$tmpl = Join-Path $dir "PHASE_TEMPLATE.md"
$features = @("WIRING PROTOCOL","SMOKE TEST","BRAINSTORM QUALITY","CONTEXT BRIDGE")
foreach ($feat in $features) {
    $c = (Select-String -Path $tmpl -Pattern $feat -SimpleMatch | Measure-Object).Count
    if ($c -gt 0) { Write-Output "  OK: PHASE_TEMPLATE has $feat"; $pass++ }
    else { Write-Output "  FAIL: PHASE_TEMPLATE missing $feat"; $fail++ }
}

# 9. Line count summary
Write-Output ""
Write-Output "--- LINE COUNTS ---"
$totalLines = 0
foreach ($f in (Get-ChildItem $dir -Filter "*.md" -File)) {
    $lines = (Get-Content $f.FullName | Measure-Object -Line).Lines
    $totalLines += $lines
    Write-Output "  $($f.Name): $lines"
}
Write-Output "  TOTAL: $totalLines lines"

# Reference files
if (Test-Path $refDir) {
    foreach ($f in (Get-ChildItem $refDir -Filter "*.md" -File)) {
        $lines = (Get-Content $f.FullName | Measure-Object -Line).Lines
        $totalLines += $lines
        Write-Output "  reference/$($f.Name): $lines"
    }
    Write-Output "  GRAND TOTAL (with reference): $totalLines lines"
}

# Summary
Write-Output ""
Write-Output "=== SUMMARY ==="
Write-Output "PASS: $pass"
Write-Output "WARN: $warn"
Write-Output "FAIL: $fail"
if ($fail -eq 0) {
    Write-Output "RESULT: ALL CHECKS PASSED"
} else {
    Write-Output "RESULT: $fail FAILURES NEED FIXING"
}
