$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# Check DA v14.4
$da = Get-Content (Join-Path $dir "PHASE_DA_DEV_ACCELERATION.md")
$daLines = $da.Count
$daVersion = ($da | Select-String "v14\.\d" | Select-Object -First 1).Line.Trim()
Write-Output "DA: $daLines lines, $daVersion"

# Check MASTER_INDEX for v14.4 references
$mi = Select-String -Path (Join-Path $dir "PRISM_MASTER_INDEX.md") -Pattern "v14.4|DA.*9.*MS|Knowledge System"
foreach ($r in $mi) { Write-Output "MI line $($r.LineNumber): $($r.Line.Trim().Substring(0, [Math]::Min(100, $r.Line.Trim().Length)))" }

# Check Recovery Card for knowledge query step
$rc = Select-String -Path (Join-Path $dir "PRISM_RECOVERY_CARD.md") -Pattern "knowledge|STEP 1.5|STEP 2.5|SESSION_KNOWLEDGE"
foreach ($r in $rc) { Write-Output "RC line $($r.LineNumber): $($r.Line.Trim().Substring(0, [Math]::Min(100, $r.Line.Trim().Length)))" }

# Check PROTOCOLS_CORE for knowledge extraction
$pc = Select-String -Path (Join-Path $dir "PRISM_PROTOCOLS_CORE.md") -Pattern "KNOWLEDGE EXTRACTION|SESSION KNOWLEDGE|knowledge_node"
foreach ($r in $pc) { Write-Output "PC line $($r.LineNumber): $($r.Line.Trim().Substring(0, [Math]::Min(100, $r.Line.Trim().Length)))" }

# Check for HIERARCHICAL_INDEX_SPEC
$spec = Test-Path (Join-Path $dir "HIERARCHICAL_INDEX_SPEC.md")
Write-Output "HIERARCHICAL_INDEX_SPEC.md exists: $spec"

# Check for knowledge contribution sections in R1-R3
foreach ($f in @("PHASE_R1_REGISTRY.md","PHASE_R2_SAFETY.md","PHASE_R3_CAMPAIGNS.md")) {
    $c = (Select-String -Path (Join-Path $dir $f) -Pattern "KNOWLEDGE CONTRIBUTION|knowledge.*extraction|knowledge.*node" | Measure-Object).Count
    Write-Output "$f knowledge refs: $c"
}

# File line counts for regression check
foreach ($f in @("PRISM_PROTOCOLS_CORE.md","PRISM_MASTER_INDEX.md","PRISM_RECOVERY_CARD.md","PHASE_DA_DEV_ACCELERATION.md","SYSTEM_CONTRACT.md","ROADMAP_INSTRUCTIONS.md")) {
    $lines = (Get-Content (Join-Path $dir $f)).Count
    Write-Output "$f : $lines lines"
}
