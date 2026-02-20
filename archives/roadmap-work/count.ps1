$dir = "C:\PRISM\roadmap-work\roadmap-v14.2.1"
Get-ChildItem "$dir\*.md" | ForEach-Object {
    $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
    "$($_.Name): $lines"
}
