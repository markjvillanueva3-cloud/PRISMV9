# Find ALL files modified today, sorted by time, to see the full work sequence
$base = 'C:\PRISM\skills-consolidated'
$today = (Get-Date).Date
$allMd = Get-ChildItem $base -Recurse -Filter 'SKILL.md' | Where-Object { $_.LastWriteTime -ge $today } | Sort-Object LastWriteTime
Write-Host "=== FILES MODIFIED TODAY ($(Get-Date -Format 'yyyy-MM-dd')) ==="
Write-Host "Count: $($allMd.Count)"
Write-Host ""
foreach ($f in $allMd) {
    $rel = $f.Directory.Name
    $size = [math]::Round($f.Length/1024, 1)
    $ts = $f.LastWriteTime.ToString('HH:mm:ss')
    Write-Host "$ts  $rel (${size}KB)"
}

# Also check for deleted directories (dirs that exist but whose SKILL.md is gone)
Write-Host ""
Write-Host "=== EMPTY DIRECTORIES ==="
$dirs = Get-ChildItem $base -Directory
foreach ($d in $dirs) {
    $md = Join-Path $d.FullName 'SKILL.md'
    if (-not (Test-Path $md)) {
        Write-Host "EMPTY: $($d.Name)"
    }
}

# Check for scripts/logs that might show deletion activity
Write-Host ""
Write-Host "=== PRISM ROOT SCRIPTS ==="
Get-ChildItem 'C:\PRISM\*.ps1' | ForEach-Object { Write-Host "$($_.Name) ($($_.LastWriteTime.ToString('HH:mm:ss')))" }