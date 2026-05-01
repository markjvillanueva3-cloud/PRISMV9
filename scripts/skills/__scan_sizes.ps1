$base = 'C:\PRISM\skills-consolidated'
Get-ChildItem $base -Directory | ForEach-Object {
    $skill = Join-Path $_.FullName 'SKILL.md'
    if (Test-Path $skill) {
        $s = Get-Item $skill
        $kb = [math]::Round($s.Length / 1024, 1)
        "$($_.Name),$($s.Length),$kb"
    } else {
        "$($_.Name),0,0"
    }
} | Sort-Object { [int](($_ -split ',')[1]) } -Descending
