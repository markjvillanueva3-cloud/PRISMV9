$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$files = @(
    "PRISM_RECOVERY_CARD.md",
    "PRISM_PROTOCOLS_CORE.md",
    "PRISM_MASTER_INDEX.md",
    "PHASE_R1_REGISTRY.md",
    "PHASE_DA_DEV_ACCELERATION.md",
    "ROADMAP_INSTRUCTIONS.md",
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
    "SKILLS_SCRIPTS_HOOKS_PLAN.md",
    "PHASE_P0_ACTIVATION.md"
)

foreach ($f in $files) {
    $path = Join-Path $dir $f
    if (Test-Path $path) {
        $info = Get-Item $path
        $bytes = $info.Length
        # Count by splitting on newlines, handling both CRLF and LF
        $content = [System.IO.File]::ReadAllText($path)
        $lines = ($content -split "`n").Count
        Write-Output "$f | $lines lines | $bytes bytes"
    } else {
        Write-Output "$f | MISSING"
    }
}
