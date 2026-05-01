# Read structure of ALL phase docs for role/model/effort audit
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
    $lines = (Get-Content $path).Count
    Write-Output "=== $p ($lines lines) ==="
    # Get header block (role, model, env, status)
    Get-Content $path -TotalCount 8 | ForEach-Object { Write-Output "  $_" }
    # Get milestone headers with any role/model annotations
    Select-String -Path $path -Pattern "^## .*MS\d|Role:|Model:|Effort:|Sessions:" | ForEach-Object {
        Write-Output "  L$($_.LineNumber): $($_.Line.Trim().Substring(0, [Math]::Min(90, $_.Line.Trim().Length)))"
    }
    Write-Output ""
}
