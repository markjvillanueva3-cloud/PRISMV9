# Verify stubs have assignment tables
$phases = @("PHASE_R4_ENTERPRISE.md", "PHASE_R5_VISUAL.md", "PHASE_R6_PRODUCTION.md")
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
foreach ($p in $phases) {
    $path = Join-Path $dir $p
    $count = (Select-String -Path $path -Pattern "MILESTONE ASSIGNMENTS").Count
    $rows = (Select-String -Path $path -Pattern "^\| MS\d").Count
    Write-Output "$p : $count assignment sections, $rows milestone rows"
}
