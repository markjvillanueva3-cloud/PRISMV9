$base = 'C:\PRISM\skills-consolidated'
$dirs = Get-ChildItem $base -Directory | Sort-Object Name
$totalSize = 0
Write-Host "=== CURRENT SKILLS INVENTORY ==="
Write-Host "Directory count: $($dirs.Count)"
Write-Host ""
foreach ($d in $dirs) {
    $md = Join-Path $d.FullName 'SKILL.md'
    if (Test-Path $md) {
        $size = [math]::Round((Get-Item $md).Length/1024, 1)
        $totalSize += (Get-Item $md).Length
        Write-Host "$($d.Name) (${size}KB)"
    } else {
        Write-Host "$($d.Name) (EMPTY - no SKILL.md)"
    }
}
$standalones = Get-ChildItem $base -Filter '*.md' -File
Write-Host ""
Write-Host "Standalone .md files: $($standalones.Count)"
foreach ($f in $standalones) { Write-Host "  $($f.Name) ($([math]::Round($f.Length/1024,1))KB)" }
Write-Host ""
Write-Host "TOTAL: $($dirs.Count) dirs, $($standalones.Count) standalones, $([math]::Round($totalSize/1024,1))KB in SKILL.md files"