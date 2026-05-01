# Integrity verification for v14.5
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$pass = 0; $fail = 0; $warn = 0

function Test ($name, $condition) {
    if ($condition) { 
        $script:pass++; Write-Output "  PASS: $name"
    } else { 
        $script:fail++; Write-Output "  FAIL: $name"
    }
}

Write-Output "=== INTEGRITY VERIFICATION v14.5 ==="
Write-Output ""

# 1. All phase docs exist
Write-Output "--- Phase Doc Existence ---"
$phases = @("DA_DEV_ACCELERATION","R1_REGISTRY","R2_SAFETY","R3_CAMPAIGNS","R4_ENTERPRISE","R5_VISUAL","R6_PRODUCTION","R7_INTELLIGENCE","R8_EXPERIENCE","R9_INTEGRATION","R10_REVOLUTION","R11_PRODUCT")
foreach ($p in $phases) {
    Test "PHASE_${p}.md exists" (Test-Path "$dir\PHASE_${p}.md")
}

# 2. Master files exist
Write-Output "`n--- Master Files ---"
Test "PRISM_MASTER_INDEX.md" (Test-Path "$dir\PRISM_MASTER_INDEX.md")
Test "PRISM_RECOVERY_CARD.md" (Test-Path "$dir\PRISM_RECOVERY_CARD.md")
Test "MASTER_ACTION_PLAN_v2.md" (Test-Path "$dir\MASTER_ACTION_PLAN_v2.md")
Test "SYSTEM_CONTRACT.md" (Test-Path "$dir\SYSTEM_CONTRACT.md")
Test "HIERARCHICAL_INDEX_SPEC.md" (Test-Path "$dir\HIERARCHICAL_INDEX_SPEC.md")

# 3. Version consistency
Write-Output "`n--- Version Consistency (all should say v14.5 or compatible) ---"
$indexVer = (Get-Content "$dir\PRISM_MASTER_INDEX.md" -TotalCount 1) -match "v14\.[45]"
Test "Master Index version" $indexVer
$rcVer = (Get-Content "$dir\PRISM_RECOVERY_CARD.md" -TotalCount 1) -match "v14\.5"
Test "Recovery Card version" $rcVer
$daVer = (Get-Content "$dir\PHASE_DA_DEV_ACCELERATION.md" -TotalCount 1) -match "v14\.5"
Test "DA phase version" $daVer

# 4. Role/Model assignments per phase
Write-Output "`n--- Role/Model Assignments ---"
$roleMap = @{
    "DA"=11; "R1"=7; "R2"=7; "R3"=7; "R4"=5; "R5"=6; "R6"=6; "R7"=7; "R8"=8; "R9"=7; "R10"=10; "R11"=4
}
foreach ($p in $phases) {
    $file = "$dir\PHASE_${p}.md"
    $roleCount = (Select-String -Path $file -Pattern "### Role:|^\| MS\d" -ErrorAction SilentlyContinue).Count
    $short = $p.Split("_")[0]
    if ($short -eq "DA") { $short = "DA" }
    elseif ($short -eq "DEV") { $short = "DA" }
    $expected = $roleMap[$short]
    if (-not $expected) { $expected = 0 }
    # Check for at least some assignments
    $hasAny = $roleCount -gt 0
    Test "PHASE_${p}: $roleCount assignments (has assignments)" $hasAny
}

# 5. Skill atomization presence
Write-Output "`n--- Skill Atomization (v14.5) ---"
Test "DA-MS9 exists" ((Select-String -Path "$dir\PHASE_DA_DEV_ACCELERATION.md" -Pattern "DA-MS9").Count -gt 0)
Test "DA-MS10 exists" ((Select-String -Path "$dir\PHASE_DA_DEV_ACCELERATION.md" -Pattern "DA-MS10").Count -gt 0)
Test "206 course count in DA" ((Select-String -Path "$dir\PHASE_DA_DEV_ACCELERATION.md" -Pattern "206").Count -gt 0)
Test "Wave 8 in Action Plan" ((Select-String -Path "$dir\MASTER_ACTION_PLAN_v2.md" -Pattern "WAVE 8").Count -gt 0)
Test "SKILL_INDEX in DA-MS9" ((Select-String -Path "$dir\PHASE_DA_DEV_ACCELERATION.md" -Pattern "SKILL_INDEX").Count -gt 0)
Test "Skill atomization in Recovery Card" ((Select-String -Path "$dir\PRISM_RECOVERY_CARD.md" -Pattern "SKILL ATOMIZATION|skill atomization|Skill Atomization").Count -gt 0)

# 6. Knowledge contribution sections in phase docs
Write-Output "`n--- Knowledge Contribution Sections ---"
foreach ($p in ($phases | Where-Object { $_ -match "R[0-9]" })) {
    $hasKC = (Select-String -Path "$dir\PHASE_${p}.md" -Pattern "KNOWLEDGE CONTRIBUTION" -ErrorAction SilentlyContinue).Count -gt 0
    Test "PHASE_${p}: Knowledge Contributions" $hasKC
}

# 7. Cross-references
Write-Output "`n--- Cross-References ---"
Test "MAP items 23-24" ((Select-String -Path "$dir\MASTER_ACTION_PLAN_v2.md" -Pattern "\| 23 |\| 24 ").Count -ge 2)
Test "MAP scope includes skill" ((Select-String -Path "$dir\MASTER_ACTION_PLAN_v2.md" -Pattern "skill atomization" -CaseSensitive:$false).Count -gt 0)
Test "Index v14.5 changelog" ((Select-String -Path "$dir\PRISM_MASTER_INDEX.md" -Pattern "v14\.5.*Skill Atomization|Skill Atomization.*v14\.5" -CaseSensitive:$false).Count -gt 0)

Write-Output "`n=== SUMMARY ==="
Write-Output "PASS: $pass | FAIL: $fail | WARN: $warn"
Write-Output "Total checks: $($pass + $fail + $warn)"
