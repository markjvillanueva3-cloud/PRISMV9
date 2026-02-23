# Check R4-R6 companion assets and R8-R10 missing sections
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

Write-Output "=== R4 COMPANION ==="
$r4 = Get-Content "$dir\PHASE_R4_ENTERPRISE.md"
$ca = ($r4 | Select-String "COMPANION").LineNumber
if ($ca) { $r4[($ca[0]-1)..([Math]::Min($ca[0]+25, $r4.Count-1))] | ForEach-Object { Write-Output "  $_" } }
else { Write-Output "  NO COMPANION SECTION" }

Write-Output "`n=== R5 COMPANION ==="
$r5 = Get-Content "$dir\PHASE_R5_VISUAL.md"
$ca = ($r5 | Select-String "COMPANION").LineNumber
if ($ca) { $r5[($ca[0]-1)..([Math]::Min($ca[0]+25, $r5.Count-1))] | ForEach-Object { Write-Output "  $_" } }
else { Write-Output "  NO COMPANION SECTION" }

Write-Output "`n=== R6 COMPANION ==="
$r6 = Get-Content "$dir\PHASE_R6_PRODUCTION.md"
$ca = ($r6 | Select-String "COMPANION").LineNumber
if ($ca) { $r6[($ca[0]-1)..([Math]::Min($ca[0]+25, $r6.Count-1))] | ForEach-Object { Write-Output "  $_" } }
else { Write-Output "  NO COMPANION SECTION" }

Write-Output "`n=== R8 COMPANION ==="
$r8 = Get-Content "$dir\PHASE_R8_EXPERIENCE.md"
$ca = ($r8 | Select-String "COMPANION").LineNumber
if ($ca) { $r8[($ca[0]-1)..([Math]::Min($ca[0]+25, $r8.Count-1))] | ForEach-Object { Write-Output "  $_" } }
else { Write-Output "  NO COMPANION SECTION" }

Write-Output "`n=== R9 COMPANION CHECK ==="
$r9 = Get-Content "$dir\PHASE_R9_INTEGRATION.md"
$ca = ($r9 | Select-String "COMPANION|PRODUCES").LineNumber
if ($ca) { Write-Output "  Found at lines: $($ca -join ', ')" }
else { Write-Output "  COMPLETELY MISSING - NO COMPANION ASSETS AT ALL <<<<<" }

Write-Output "`n=== R10 COMPANION ==="
$r10 = Get-Content "$dir\PHASE_R10_REVOLUTION.md"
$ca = ($r10 | Select-String "COMPANION").LineNumber
if ($ca) { $r10[($ca[0]-1)..([Math]::Min($ca[0]+25, $r10.Count-1))] | ForEach-Object { Write-Output "  $_" } }
else { Write-Output "  NO COMPANION SECTION" }
