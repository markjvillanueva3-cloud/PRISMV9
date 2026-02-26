$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$zip = "C:\PRISM\roadmap-v14.3"

# Check if zip dir still exists on disk
if (Test-Path $zip) {
    Write-Output "Zip staging dir exists at $zip"
} else {
    Write-Output "NO ZIP STAGING DIR - need to extract from container"
    exit 1
}

$files = @("PRISM_PROTOCOLS_CORE.md","PRISM_MASTER_INDEX.md","PHASE_R1_REGISTRY.md","ROADMAP_INSTRUCTIONS.md")
foreach ($f in $files) {
    $diskFile = Join-Path $dir $f
    $zipFile = Join-Path $zip $f
    if ((Test-Path $diskFile) -and (Test-Path $zipFile)) {
        $diskLines = (Get-Content $diskFile).Count
        $zipLines = (Get-Content $zipFile).Count
        $diff = $diskLines - $zipLines
        Write-Output "$f : zip=$zipLines disk=$diskLines delta=$diff"
    }
}
