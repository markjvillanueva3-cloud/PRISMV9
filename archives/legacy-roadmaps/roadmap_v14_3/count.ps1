$base = 'C:\PRISM\mcp-server\roadmap_v14_3\roadmap-v14.2.1'
Get-ChildItem "$base\*.md" | ForEach-Object {
    $n = $_.Name
    $c = (Get-Content $_.FullName | Measure-Object -Line).Lines
    Write-Output "$n`: $c"
}
Get-ChildItem "$base\reference\*.md" | ForEach-Object {
    $n = $_.Name
    $c = (Get-Content $_.FullName | Measure-Object -Line).Lines
    Write-Output "reference/$n`: $c"
}
