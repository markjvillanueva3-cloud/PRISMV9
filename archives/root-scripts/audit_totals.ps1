$files = Get-ChildItem -Recurse 'C:\PRISM\skills-consolidated' -Filter '*.md'
$totalKB = [math]::Round(($files | Measure-Object -Property Length -Sum).Sum / 1024, 1)
$totalMB = [math]::Round($totalKB / 1024, 2)
$count = $files.Count
Write-Host "Total skills: $count files"
Write-Host "Total size: ${totalKB} KB (${totalMB} MB)"
Write-Host "Approx tokens: $([math]::Round($totalKB * 0.75 * 1000 / 4, 0)) tokens (est ~0.75 tokens/byte)"