$files = @(
  "PRISM_MASTER_INDEX.md",
  "PRISM_PROTOCOLS_CORE.md",
  "PHASE_R1_REGISTRY.md",
  "PHASE_DA_DEV_ACCELERATION.md",
  "SYSTEM_CONTRACT.md",
  "ROADMAP_INSTRUCTIONS.md",
  "SKILLS_SCRIPTS_HOOKS_PLAN.md",
  "CLAUDE_CODE_INTEGRATION.md",
  "PHASE_R7_INTELLIGENCE.md",
  "PHASE_R2_SAFETY.md",
  "PHASE_R3_CAMPAIGNS.md",
  "PHASE_R4_ENTERPRISE.md",
  "PHASE_R5_VISUAL.md",
  "PHASE_R6_PRODUCTION.md",
  "PHASE_R8_EXPERIENCE.md",
  "PHASE_R9_INTEGRATION.md",
  "PHASE_R10_REVOLUTION.md",
  "PHASE_R11_PRODUCT.md"
)

$diskDir = "C:\PRISM\mcp-server\data\docs\roadmap"

foreach ($f in $files) {
  $diskPath = Join-Path $diskDir $f
  if (Test-Path $diskPath) {
    $content = Get-Content $diskPath
    $lineCount = $content.Count
    $header = $content[0]
    Write-Output "DISK | $f | $lineCount lines | $header"
  } else {
    Write-Output "DISK | $f | MISSING"
  }
}
