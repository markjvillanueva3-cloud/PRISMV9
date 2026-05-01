$j = Get-Content 'C:\PRISM\skills-consolidated\SKILL_INDEX.json' -Raw | ConvertFrom-Json
Write-Host "Total skills: $($j.skills.Count)"
Write-Host "`nLast 15 skills:"
$j.skills | Select-Object -Last 15 | ForEach-Object { Write-Host "  $($_.id) - $($_.function)" }
Write-Host "`nCourse-derived skills:"
$j.skills | Where-Object { $_.id -match 'thermal|vibration|chatter|chip-form|doe|spc|cutting-mech|surface-rough|tool-wear|cost-opt|workhold|threading|speed-feed' } | ForEach-Object { Write-Host "  $($_.id)" }
