$files = @(
    "PRISM_RECOVERY_CARD.md",
    "PRISM_PROTOCOLS_CORE.md",
    "PRISM_MASTER_INDEX.md",
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
    "PHASE_R11_PRODUCT.md",
    "SYSTEM_CONTRACT.md",
    "ROLE_MODEL_EFFORT_MATRIX.md",
    "CURRENT_POSITION.md",
    "ROADMAP_TRACKER.md"
)
$basePath = "C:\PRISM\mcp-server\data\docs\roadmap"
foreach ($f in $files) {
    $path = Join-Path $basePath $f
    if (Test-Path $path) {
        $info = Get-Item $path
        $lines = (Get-Content $path | Measure-Object -Line).Lines
        $tokens = [math]::Round($info.Length / 4)
        Write-Output "$f | $($info.Length) bytes | $lines lines | ~$tokens tokens"
    } else {
        Write-Output "$f | NOT FOUND"
    }
}
