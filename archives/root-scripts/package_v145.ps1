# Package roadmap v14.5
$src = "C:\PRISM\mcp-server\data\docs\roadmap"
$zip = "C:\PRISM\roadmap-v14.5.zip"

# Remove old zip if exists
if (Test-Path $zip) { Remove-Item $zip }

# Get all roadmap files
$files = Get-ChildItem $src -File -Recurse
Write-Output "Files to package: $($files.Count)"
$totalKB = [math]::Round(($files | Measure-Object Length -Sum).Sum / 1KB)
Write-Output "Total size: ${totalKB}KB"

# Create zip
Compress-Archive -Path "$src\*" -DestinationPath $zip -CompressionLevel Optimal
$zipSize = [math]::Round((Get-Item $zip).Length / 1KB)
Write-Output "Zip created: $zip (${zipSize}KB)"

# List contents
Write-Output "`n--- Contents ---"
$files | Sort-Object Name | ForEach-Object {
    $sizeKB = [math]::Round($_.Length / 1KB)
    Write-Output "  $($_.Name) (${sizeKB}KB)"
}
