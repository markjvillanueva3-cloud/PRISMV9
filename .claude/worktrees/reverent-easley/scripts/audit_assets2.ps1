Write-Output "=== SKILL DIRECTORIES ==="
$dirs = Get-ChildItem 'C:\PRISM\skills-consolidated' -Directory
foreach ($d in $dirs) {
    Write-Output $d.Name
}

Write-Output ""
Write-Output "=== TOOLPATH STRATEGY REGISTRY LINES ==="
$tsr = Get-Content 'C:\PRISM\mcp-server\src\registries\ToolpathStrategyRegistry.ts'
Write-Output ("Lines: {0}" -f $tsr.Count)

Write-Output ""
Write-Output "=== CONTROLLER DATA ==="
Get-ChildItem 'C:\PRISM\data\controllers' -File | ForEach-Object {
    Write-Output ("{0}: {1} KB" -f $_.Name, [math]::Round($_.Length/1024))
}

Write-Output ""
Write-Output "=== DATABASES ==="
Get-ChildItem 'C:\PRISM\data\databases' -File | ForEach-Object {
    Write-Output ("{0}: {1} KB" -f $_.Name, [math]::Round($_.Length/1024))
}

Write-Output ""
Write-Output "=== MACHINES ENHANCED DIR ==="
$machDirs = Get-ChildItem 'C:\PRISM\data\machines' -Directory
foreach ($d in $machDirs) {
    $count = (Get-ChildItem $d.FullName -Filter '*.json' -File).Count
    Write-Output ("{0}: {1} files" -f $d.Name, $count)
}
