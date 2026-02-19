$dirs = Get-ChildItem 'C:\PRISM\skills-consolidated' -Directory
$results = @()
foreach ($d in $dirs) {
    $f = Join-Path $d.FullName 'SKILL.md'
    if (Test-Path $f) {
        $item = Get-Item $f
        $sz = $item.Length
        $ln = (Get-Content $f).Count
    } else {
        $sz = -1
        $ln = 0
    }
    $results += [PSCustomObject]@{
        Name  = $d.Name
        Size  = $sz
        Lines = $ln
    }
}
Write-Host "=== SKILLS BY SIZE (desc) ==="
$results | Sort-Object Size -Descending | Format-Table -AutoSize | Out-String | Write-Host

Write-Host ""
Write-Host "=== DEAD SKILLS (size <= 0) ==="
$dead = $results | Where-Object { $_.Size -le 0 }
$dead | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "Dead count: $($dead.Count)"
Write-Host "Total count: $($results.Count)"