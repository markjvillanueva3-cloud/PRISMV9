$jsonPath = "C:\PRISM\mcp-server\data\registries\SCRIPT_REGISTRY.json"
if (Test-Path $jsonPath) {
    $j = Get-Content $jsonPath -Raw | ConvertFrom-Json
    Write-Host "JSON registry entries: $($j.Count)"
} else {
    Write-Host "No JSON script registry found at $jsonPath"
}

Write-Host ""
Write-Host "=== Scripts on disk by category ==="
$dirs = Get-ChildItem 'C:\PRISM\scripts' -Directory
foreach ($d in $dirs) {
    $count = (Get-ChildItem $d.FullName -File -Recurse).Count
    Write-Host "$($d.Name): $count files"
}
$total = (Get-ChildItem 'C:\PRISM\scripts' -Recurse -File).Count
Write-Host "TOTAL on disk: $total"