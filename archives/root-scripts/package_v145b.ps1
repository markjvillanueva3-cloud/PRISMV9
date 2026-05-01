# Package roadmap v14.5 - retry with robocopy to temp
$src = "C:\PRISM\mcp-server\data\docs\roadmap"
$temp = "C:\PRISM\roadmap_staging"
$zip = "C:\PRISM\roadmap-v14.5.zip"

# Clean staging
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item $temp -ItemType Directory | Out-Null

# Copy only top-level .md files (no subdirs, no duplicates)
Get-ChildItem $src -File -Filter "*.md" | ForEach-Object {
    Copy-Item $_.FullName "$temp\$($_.Name)" -Force
}

$files = Get-ChildItem $temp -File
Write-Output "Staged: $($files.Count) files"
$totalKB = [math]::Round(($files | Measure-Object Length -Sum).Sum / 1KB)
Write-Output "Total: ${totalKB}KB"

# Remove old zip
if (Test-Path $zip) { Remove-Item $zip -Force }

# Create zip from staging
Compress-Archive -Path "$temp\*" -DestinationPath $zip -CompressionLevel Optimal
$zipSize = [math]::Round((Get-Item $zip).Length / 1KB)
Write-Output "Zip: $zip (${zipSize}KB)"

# Cleanup
Remove-Item $temp -Recurse -Force
Write-Output "Done."
