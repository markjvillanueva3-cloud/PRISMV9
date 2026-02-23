# Check DEPENDS ON anywhere in first 70 lines (context bridge area)
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$phases = @("DA_DEV_ACCELERATION","R1_REGISTRY","R2_SAFETY","R3_CAMPAIGNS","R4_ENTERPRISE","R5_VISUAL","R6_PRODUCTION","R7_INTELLIGENCE","R8_EXPERIENCE","R9_INTEGRATION","R10_REVOLUTION","R11_PRODUCT")
Write-Output "=== DEPENDENCY DECLARATIONS (first 70 lines) ==="
foreach ($p in $phases) {
    $file = "$dir\PHASE_${p}.md"
    $first70 = Get-Content $file -TotalCount 70
    $depLines = $first70 | Where-Object { $_ -match "DEPENDS ON:|Prerequisites:" }
    $short = $p.Split("_")[0]
    if ($depLines) { 
        foreach ($d in $depLines) { Write-Output "  $short : $($d.Trim())" }
    } else { 
        Write-Output "  $short : NO DEPS IN HEADER AREA <<<<<" 
    }
}

# Also check CONTEXT BRIDGE "WHAT COMES AFTER" in all
Write-Output "`n=== WHAT COMES AFTER ==="
foreach ($p in $phases) {
    $file = "$dir\PHASE_${p}.md"
    $content = Get-Content $file
    $wca = $content | Select-String "WHAT COMES AFTER"
    if ($wca) {
        $ln = $wca[0].LineNumber - 1
        $after = $content[$ln].Trim()
        Write-Output "  $($p.Split('_')[0]) : $after"
    } else {
        Write-Output "  $($p.Split('_')[0]) : MISSING <<<<<" 
    }
}
