# Check all integration targets
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

Write-Output "=== STEP 2: DA phase doc ==="
$da = (Get-Content (Join-Path $dir "PHASE_DA_DEV_ACCELERATION.md")).Count
Write-Output "DA lines: $da (expect ~1100+)"
$v = Select-String -Path (Join-Path $dir "PHASE_DA_DEV_ACCELERATION.md") -Pattern "v14\.4"
Write-Output "v14.4 ref count: $($v.Count)"

Write-Output "`n=== STEP 3: MASTER_INDEX updated? ==="
$mi = Select-String -Path (Join-Path $dir "PRISM_MASTER_INDEX.md") -Pattern "DA.*MS[5-8]|v14\.4|knowledge|hierarchical"
foreach ($m in $mi) { Write-Output "$($m.LineNumber): $($m.Line.Trim().Substring(0, [Math]::Min(80, $m.Line.Trim().Length)))" }

Write-Output "`n=== STEP 4: Recovery Card knowledge query step? ==="
$rc = Select-String -Path (Join-Path $dir "PRISM_RECOVERY_CARD.md") -Pattern "knowledge|KNOWLEDGE|STEP 1\.5|SESSION_KNOWLEDGE"
foreach ($r in $rc) { Write-Output "$($r.LineNumber): $($r.Line.Trim().Substring(0, [Math]::Min(80, $r.Line.Trim().Length)))" }

Write-Output "`n=== STEP 5: PROTOCOLS_CORE knowledge extraction? ==="
$pk = Select-String -Path (Join-Path $dir "PRISM_PROTOCOLS_CORE.md") -Pattern "KNOWLEDGE EXTRACTION|session.knowledge|knowledge.node"
foreach ($p in $pk) { Write-Output "$($p.LineNumber): $($p.Line.Trim().Substring(0, [Math]::Min(80, $p.Line.Trim().Length)))" }

Write-Output "`n=== STEP 6: HIERARCHICAL_INDEX_SPEC.md exists? ==="
$specExists = Test-Path (Join-Path $dir "HIERARCHICAL_INDEX_SPEC.md")
Write-Output "Exists: $specExists"

Write-Output "`n=== STEP 7: R1-R8 knowledge contribution sections? ==="
foreach ($f in @("PHASE_R1_REGISTRY.md","PHASE_R2_SAFETY.md","PHASE_R3_CAMPAIGNS.md","PHASE_R7_INTELLIGENCE.md")) {
    $k = Select-String -Path (Join-Path $dir $f) -Pattern "KNOWLEDGE CONTRIBUTION|knowledge.node|Branch.3"
    Write-Output "$f : $($k.Count) knowledge refs"
}

Write-Output "`n=== NEW FILES ==="
$plan = Test-Path (Join-Path $dir "OPERATIONAL_IMPROVEMENTS_PLAN.md")
$plan2 = Test-Path (Join-Path $dir "MASTER_ACTION_PLAN_v2.md")
Write-Output "OPERATIONAL_IMPROVEMENTS_PLAN.md: $plan"
Write-Output "MASTER_ACTION_PLAN_v2.md: $plan2"

Write-Output "`n=== TOTAL FILE COUNT ==="
$count = (Get-ChildItem $dir -Filter "*.md" -File).Count
Write-Output "Total .md files: $count"
