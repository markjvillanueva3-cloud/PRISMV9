# Verify which phases have Role: assignments applied
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$phases = @(
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
foreach ($p in $phases) {
    $path = Join-Path $dir $p
    $roleCount = (Select-String -Path $path -Pattern "### Role:" -ErrorAction SilentlyContinue).Count
    $lines = (Get-Content $path).Count
    Write-Output "$p : $roleCount Role assignments, $lines lines"
}
