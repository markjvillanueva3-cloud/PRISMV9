$src = 'C:\PRISM\mcp-server\data\docs\roadmap'
$dst = 'C:\PRISM\archives\roadmap-reference'
$dead = @(
  'BULLETPROOF_ASSESSMENT_v14.5.md',
  'COMPETITIVE_POSITIONING.md',
  'CONTEXT_AUDIT.md',
  'CONTEXT_BUDGET_LOG.md',
  'DEPLOYMENT_GUIDE.md',
  'HIERARCHICAL_INDEX_SPEC.md',
  'MASTER_ACTION_PLAN_v2.md',
  'OPERATIONAL_IMPROVEMENTS_PLAN.md',
  'OPUS_CONFIG_BASELINE.md',
  'P0_CHAIN_RESULTS.md',
  'P0_DISPATCHER_BASELINE.md',
  'PRISM_AUDIT_v14_3.md',
  'PRISM_Cross_Audit_Assessment.md',
  'PRISM_INFRASTRUCTURE_AUDIT_v13_7_IA3.md',
  'PRISM_MASTER_INDEX.md',
  'PRISM_MASTER_INDEX_SLIM.md',
  'PRISM_MASTER_INDEX_v14.2.1.md',
  'PRISM_PROTOCOLS_CHANGELOG.md',
  'PRISM_PROTOCOLS_CORE.md',
  'PRISM_PROTOCOLS_REFERENCE.md',
  'REGISTRY_AUDIT.md',
  'ROADMAP_AUDIT_2026-02-17.md',
  'ROADMAP_v14_2_GAP_ANALYSIS.md',
  'SYSTEMS_ARCHITECTURE_AUDIT.md',
  'SYSTEM_ACTIVATION_REPORT.md',
  'SYSTEM_CONTRACT_v14.2.1.md',
  'TOOL_UTILIZATION_AUDIT_v13_2.md',
  '_archived_PRISM_PROTOCOLS_CORE_pre_split.md',
  '_AUDIT_FIXES_v14.5.md'
)
$moved = 0
foreach ($f in $dead) {
  $fp = Join-Path $src $f
  if (Test-Path $fp) {
    Move-Item $fp (Join-Path $dst $f) -Force
    $moved++
  }
}
Write-Output "Moved: $moved / $($dead.Count)"
$remaining = (Get-ChildItem $src -File).Count
Write-Output "Remaining in roadmap/: $remaining files"
