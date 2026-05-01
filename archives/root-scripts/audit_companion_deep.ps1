# Deep audit: Read companion asset sections for R1-R6
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# R1 companion
Write-Output "=== R1 COMPANION ASSETS ==="
$r1 = Get-Content "$dir\PHASE_R1_REGISTRY.md"
$r1CA = ($r1 | Select-String "R1 COMPANION ASSETS").LineNumber
if ($r1CA) {
    $start = $r1CA[0] - 1
    $end = [Math]::Min($start + 30, $r1.Count - 1)
    $r1[$start..$end] | ForEach-Object { Write-Output "  $_" }
}

Write-Output "`n=== R2 COMPANION ASSETS ==="
$r2 = Get-Content "$dir\PHASE_R2_SAFETY.md"
$r2CA = ($r2 | Select-String "R2 COMPANION ASSETS").LineNumber
if ($r2CA) {
    $start = $r2CA[0] - 1
    $end = [Math]::Min($start + 30, $r2.Count - 1)
    $r2[$start..$end] | ForEach-Object { Write-Output "  $_" }
}

Write-Output "`n=== R3 COMPANION ASSETS ==="
$r3 = Get-Content "$dir\PHASE_R3_CAMPAIGNS.md"
$r3CA = ($r3 | Select-String "R3 COMPANION ASSETS").LineNumber
if ($r3CA) {
    $start = $r3CA[0] - 1
    $end = [Math]::Min($start + 30, $r3.Count - 1)
    $r3[$start..$end] | ForEach-Object { Write-Output "  $_" }
}

Write-Output "`n=== R7 COMPANION (at MS6+) ==="
$r7 = Get-Content "$dir\PHASE_R7_INTELLIGENCE.md"
$r7CA = ($r7 | Select-String "COMPANION|PRODUCES").LineNumber
if ($r7CA) {
    foreach ($ln in $r7CA) {
        $start = $ln - 1
        $end = [Math]::Min($start + 20, $r7.Count - 1)
        $r7[$start..$end] | ForEach-Object { Write-Output "  $_" }
        Write-Output "  ---"
    }
}
