# Add DEPENDS ON to R7, R8, R9 using their actual header patterns
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# R7: Insert after line 2 (## v14.2 | Prerequisites...)
$r7 = [System.Collections.ArrayList](Get-Content "$dir\PHASE_R7_INTELLIGENCE.md")
$hasDep = ($r7 | Where-Object { $_ -match "^# DEPENDS ON:" }).Count -gt 0
if (-not $hasDep) {
    $r7.Insert(3, "# DEPENDS ON: R1 complete (registries loaded), R3 complete (campaign actions live)")
    [System.IO.File]::WriteAllLines("$dir\PHASE_R7_INTELLIGENCE.md", $r7.ToArray())
    Write-Output "R7: DEPENDS ON added at line 4"
} else { Write-Output "R7: already has DEPENDS ON" }

# R8: Insert after line 2
$r8 = [System.Collections.ArrayList](Get-Content "$dir\PHASE_R8_EXPERIENCE.md")
$hasDep = ($r8 | Where-Object { $_ -match "^# DEPENDS ON:" }).Count -gt 0
if (-not $hasDep) {
    $r8.Insert(3, "# DEPENDS ON: R3 complete (actions live), R7 complete (intelligence features)")
    [System.IO.File]::WriteAllLines("$dir\PHASE_R8_EXPERIENCE.md", $r8.ToArray())
    Write-Output "R8: DEPENDS ON added at line 4"
} else { Write-Output "R8: already has DEPENDS ON" }

# R9: Insert after line 2
$r9 = [System.Collections.ArrayList](Get-Content "$dir\PHASE_R9_INTEGRATION.md")
$hasDep = ($r9 | Where-Object { $_ -match "^# DEPENDS ON:" }).Count -gt 0
if (-not $hasDep) {
    $r9.Insert(3, "# DEPENDS ON: R3 (actions), R7 (intelligence), R8 (experience layer)")
    [System.IO.File]::WriteAllLines("$dir\PHASE_R9_INTEGRATION.md", $r9.ToArray())
    Write-Output "R9: DEPENDS ON added at line 4"
} else { Write-Output "R9: already has DEPENDS ON" }
