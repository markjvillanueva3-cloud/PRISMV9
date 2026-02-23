# Read first 15 lines from each skill to get purpose/description
$skills = Get-ChildItem 'C:\PRISM\skills-consolidated' -Directory | Sort-Object Name
foreach ($skill in $skills) {
    $md = Join-Path $skill.FullName "SKILL.md"
    if (Test-Path $md) {
        $lines = Get-Content $md -TotalCount 15
        $sizeKB = [math]::Round((Get-Item $md).Length/1024, 1)
        Write-Host "=== $($skill.Name) (${sizeKB}KB) ==="
        $lines | ForEach-Object { Write-Host $_ }
        Write-Host ""
    }
}