$srcDir = "C:\PRISM\mcp-server\data\docs\roadmap"
$zipPath = "C:\PRISM\roadmap-v14.5.zip"
$staging = "C:\PRISM\roadmap-v14.5"

if (Test-Path $zipPath) { Remove-Item $zipPath }
if (Test-Path $staging) { Remove-Item $staging -Recurse }

New-Item -ItemType Directory -Path $staging | Out-Null
New-Item -ItemType Directory -Path (Join-Path $staging "reference") | Out-Null

# Copy root .md files (exclude archive folder and old versioned duplicates)
Get-ChildItem -Path $srcDir -Filter "*.md" -File | Copy-Item -Destination $staging

# Copy reference folder
$refDir = Join-Path $srcDir "reference"
if (Test-Path $refDir) {
    Get-ChildItem -Path $refDir -Filter "*.md" -File | Copy-Item -Destination (Join-Path $staging "reference")
}

# Create zip
Compress-Archive -Path $staging -DestinationPath $zipPath
$info = Get-Item $zipPath
$rootCount = (Get-ChildItem $staging -Filter "*.md" -File).Count
$refCount = (Get-ChildItem (Join-Path $staging "reference") -Filter "*.md" -File).Count
$totalCount = $rootCount + $refCount
Write-Output "Packaged $totalCount files ($rootCount root + $refCount reference) into $zipPath"
Write-Output "Size: $([math]::Round($info.Length / 1KB)) KB"

# Cleanup staging
Remove-Item $staging -Recurse
