# Retry locked files
$roadmapDir = "C:\PRISM\mcp-server\data\docs\roadmap"
$retryFiles = @{
    "PRISM_PROTOCOLS_CORE.md" = "pc"
    "PHASE_R1_REGISTRY.md" = "r1"
    "PHASE_DA_DEV_ACCELERATION.md" = "da"
}

function Convert-ToAnchorName {
    param([string]$headerText)
    $clean = $headerText -replace '^#{2,3}\s+', ''
    $clean = $clean.Trim().ToLower()
    $clean = $clean -replace '[^a-z0-9]+', '_'
    $clean = $clean.TrimEnd('_').TrimStart('_')
    return $clean
}

foreach ($fileName in $retryFiles.Keys) {
    $filePath = Join-Path $roadmapDir $fileName
    $lines = Get-Content $filePath -Encoding UTF8
    $newLines = @()
    $count = 0
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match '^(#{2,3})\s+(.+)') {
            $prefix = $retryFiles[$fileName]
            $anchorName = Convert-ToAnchorName $line
            $anchorTag = "<!-- ANCHOR: ${prefix}_${anchorName} -->"
            $prevLine = if ($newLines.Count -gt 0) { $newLines[$newLines.Count - 1] } else { "" }
            if ($prevLine -notmatch '<!-- ANCHOR:') {
                $newLines += $anchorTag
                $count++
            }
        }
        $newLines += $line
    }
    # Retry with delay
    Start-Sleep -Milliseconds 500
    Set-Content -Path $filePath -Value $newLines -Encoding UTF8
    Write-Host "${fileName}: ${count} anchors written"
}
