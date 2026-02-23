$dirs = Get-ChildItem 'C:\PRISM\skills-consolidated' -Directory
foreach ($d in $dirs) {
    $md = Join-Path $d.FullName 'SKILL.md'
    $exists = Test-Path $md
    $size = if ($exists) { (Get-Item $md).Length } else { 0 }
    Write-Output "$($d.Name)|$exists|$size"
}
