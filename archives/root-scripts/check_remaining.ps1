# Show milestone headers in remaining phases
$phases = @(
    "PHASE_R4_ENTERPRISE.md",
    "PHASE_R5_VISUAL.md",
    "PHASE_R6_PRODUCTION.md",
    "PHASE_R10_REVOLUTION.md",
    "PHASE_R11_PRODUCT.md"
)
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
foreach ($p in $phases) {
    Write-Output "=== $p ==="
    Select-String -Path (Join-Path $dir $p) -Pattern "^## " | ForEach-Object {
        $txt = $_.Line.Trim()
        if ($txt.Length -gt 100) { $txt = $txt.Substring(0,100) + "..." }
        Write-Output "  L$($_.LineNumber): $txt"
    }
    Write-Output ""
}
