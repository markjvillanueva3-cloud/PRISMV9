$files = @(
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

$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

foreach ($f in $files) {
  $path = Join-Path $dir $f
  $content = Get-Content $path -Raw
  if ($content -match "QUICK REFERENCE") {
    Write-Output "HAS_QR: $f"
  } else {
    Write-Output "MISSING: $f"
  }
}
