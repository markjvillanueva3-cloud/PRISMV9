$idx = Get-Content 'C:\PRISM\skills-consolidated\SKILL_INDEX.json' -Raw | ConvertFrom-Json
Write-Host "Total: $($idx.metadata.total_skills) skills"
Write-Host ""
Write-Host "First entry: $($idx.skills[0].id)"
Write-Host "Function: $($idx.skills[0].function)"
Write-Host ""
$gc = $idx.skills | Where-Object { $_.id -eq 'prism-gcode-reference' }
Write-Host "GCode ref: $($gc.id)"
Write-Host "Function: $($gc.function)"
Write-Host ""
$empty = ($idx.skills | Where-Object { -not $_.function -or $_.function -eq '|' }).Count
Write-Host "Entries with empty/broken function: $empty"