Get-ChildItem -Recurse 'C:\PRISM\skills-consolidated' -Filter '*.md' | ForEach-Object {
    $rel = $_.FullName.Replace('C:\PRISM\skills-consolidated\','')
    $kb = [math]::Round($_.Length/1024,1)
    "$kb`tKB`t$rel"
} | Sort-Object { [double]($_ -split "`t")[0] } -Descending