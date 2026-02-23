# Audit: Check dependency flow and transition gaps
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# Check if each phase explicitly states what it depends on at the PHASE level
Write-Output "=== PHASE-LEVEL DEPENDENCY DECLARATIONS ==="
$phases = @("DA_DEV_ACCELERATION","R1_REGISTRY","R2_SAFETY","R3_CAMPAIGNS","R4_ENTERPRISE","R5_VISUAL","R6_PRODUCTION","R7_INTELLIGENCE","R8_EXPERIENCE","R9_INTEGRATION","R10_REVOLUTION","R11_PRODUCT")
foreach ($p in $phases) {
    $file = "$dir\PHASE_${p}.md"
    $first30 = Get-Content $file -TotalCount 30
    $depLine = $first30 | Where-Object { $_ -match "DEPENDS ON:" }
    if ($depLine) { Write-Output "  $($p.Substring(0,[Math]::Min(20,$p.Length))): $depLine" }
    else { Write-Output "  $($p.Substring(0,[Math]::Min(20,$p.Length))): NO DEPENDS ON HEADER <<<<<" }
}

# Check SKILL_PHASE_MAP existence
Write-Output "`n=== CRITICAL FILE EXISTENCE ==="
$checkFiles = @(
    "SKILL_PHASE_MAP.json",
    "SKILL_INDEX.json",
    "PARALLEL_TASK_MAP.md",
    "SKILL_TIER_MAP.json",
    "CONTEXT_AUDIT.md",
    "CURRENT_POSITION.md",
    "SESSION_HANDOFF.md",
    "ROADMAP_SECTION_INDEX.md"
)
foreach ($f in $checkFiles) {
    $exists = Test-Path "$dir\$f"
    if (-not $exists) { $exists = Test-Path "C:\PRISM\mcp-server\data\docs\$f" }
    if (-not $exists) { $exists = Test-Path "C:\PRISM\mcp-server\$f" }
    $status = if ($exists) { "EXISTS" } else { "NOT YET (DA creates)" }
    Write-Output "  $f : $status"
}

# Check WHAT COMES AFTER in R7-R10
Write-Output "`n=== TRANSITION GUIDANCE (WHAT COMES AFTER) ==="
foreach ($p in @("R7_INTELLIGENCE","R8_EXPERIENCE","R9_INTEGRATION","R10_REVOLUTION")) {
    $file = "$dir\PHASE_${p}.md"
    $wca = Select-String -Path $file -Pattern "WHAT COMES AFTER|COMES AFTER|TRANSITION" -ErrorAction SilentlyContinue
    if ($wca) { Write-Output "  $p : Found ($($wca.Count) refs)" }
    else { Write-Output "  $p : MISSING TRANSITION GUIDANCE <<<<<" }
}

# Check if R2 mentions safety skills in companion
Write-Output "`n=== R2 SAFETY SKILL GAP ==="
$r2 = Get-Content "$dir\PHASE_R2_SAFETY.md"
$r2ca = ($r2 | Select-String "R2 COMPANION").LineNumber
if ($r2ca) {
    $block = $r2[($r2ca[0]-1)..([Math]::Min($r2ca[0]+15, $r2.Count-1))]
    $hasSkill = ($block | Where-Object { $_ -match "SKILL" }).Count
    Write-Output "  Skills in R2 companion: $hasSkill references"
    if ($hasSkill -eq 0) { Write-Output "  WARNING: Safety phase produces ZERO skills <<<<<" }
}
