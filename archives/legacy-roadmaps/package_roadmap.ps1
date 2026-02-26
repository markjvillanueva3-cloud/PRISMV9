$srcDir = "C:\PRISM\mcp-server\data\docs\roadmap"
$zipPath = "C:\PRISM\roadmap-v14.3.zip"
$refDir = Join-Path $srcDir "reference"

if (Test-Path $zipPath) { Remove-Item $zipPath }

# Create temp staging directory
$staging = "C:\PRISM\roadmap-v14.3"
if (Test-Path $staging) { Remove-Item $staging -Recurse }
New-Item -ItemType Directory -Path $staging | Out-Null
New-Item -ItemType Directory -Path (Join-Path $staging "reference") | Out-Null

# Copy root .md files (exclude archive folder)
Get-ChildItem -Path $srcDir -Filter "*.md" -File | Copy-Item -Destination $staging

# Copy reference folder
if (Test-Path $refDir) {
    Get-ChildItem -Path $refDir -Filter "*.md" -File | Copy-Item -Destination (Join-Path $staging "reference")
}

# Create zip
Compress-Archive -Path $staging -DestinationPath $zipPath
$info = Get-Item $zipPath
$count = (Get-ChildItem $staging -Recurse -File).Count
Write-Output "Packaged $count files into $zipPath ($($info.Length) bytes)"

# Cleanup staging
Remove-Item $staging -Recurse
