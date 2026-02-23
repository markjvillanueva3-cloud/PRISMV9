$base = 'C:\PRISM\skills-consolidated'
$now = Get-Date
$dirs = Get-ChildItem $base -Directory | Sort-Object Name
foreach ($d in $dirs) {
    $md = Join-Path $d.FullName 'SKILL.md'
    if (Test-Path $md) {
        $info = Get-Item $md
        $size = [math]::Round($info.Length/1024, 1)
        $ts = $info.LastWriteTime.ToString('HH:mm:ss')
        $age = [math]::Round(($now - $info.LastWriteTime).TotalMinutes, 0)
        if ($age -lt 30) {
            Write-Host "NEW  $($d.Name) (${size}KB) @ $ts" -ForegroundColor Green
        } else {
            Write-Host "     $($d.Name) (${size}KB) @ $ts"
        }
    } else {
        Write-Host "EMPTY $($d.Name)" -ForegroundColor Red
    }
}
Write-Host ""
Write-Host "Total: $($dirs.Count) directories"