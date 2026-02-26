$base = 'C:\PRISM\skills-consolidated'
$dirs = Get-ChildItem $base -Directory | Sort-Object Name
$totalSize = 0
$count = 0
foreach ($d in $dirs) {
    $md = Join-Path $d.FullName 'SKILL.md'
    if (Test-Path $md) {
        $size = [math]::Round((Get-Item $md).Length/1024, 1)
        $totalSize += (Get-Item $md).Length
        $count++
        Write-Host "$($d.Name) (${size}KB)"
    } else {
        Write-Host "$($d.Name) (EMPTY!)"
    }
}
$standalones = Get-ChildItem $base -Filter '*.md' -File
Write-Host ""
Write-Host "========================================="
Write-Host "SKILLS: $count with SKILL.md"
Write-Host "EMPTY:  $($dirs.Count - $count)"
Write-Host "STANDALONE: $($standalones.Count)"
foreach ($f in $standalones) { Write-Host "  $($f.Name) ($([math]::Round($f.Length/1024,1))KB)" }
Write-Host "TOTAL SIZE: $([math]::Round($totalSize/1024,1))KB"
Write-Host "========================================="