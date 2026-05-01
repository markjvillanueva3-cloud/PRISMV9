# Retry with copy-rename approach to bypass file locks
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
    $tempPath = Join-Path $roadmapDir ("_temp_" + $fileName)
    
    $lines = [System.IO.File]::ReadAllLines($filePath)
    $newLines = [System.Collections.ArrayList]::new()
    $count = 0
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match '^(#{2,3})\s+(.+)') {
            $prefix = $retryFiles[$fileName]
            $anchorName = Convert-ToAnchorName $line
            $anchorTag = "<!-- ANCHOR: ${prefix}_${anchorName} -->"
            $prevIdx = $newLines.Count - 1
            $prevLine = if ($prevIdx -ge 0) { $newLines[$prevIdx] } else { "" }
            if ($prevLine -notmatch '<!-- ANCHOR:') {
                [void]$newLines.Add($anchorTag)
                $count++
            }
        }
        [void]$newLines.Add($line)
    }
    
    # Write to temp file, then replace
    [System.IO.File]::WriteAllLines($tempPath, $newLines.ToArray())
    
    # Try to replace
    try {
        [System.IO.File]::Delete($filePath)
        [System.IO.File]::Move($tempPath, $filePath)
        Write-Host "OK ${fileName}: ${count} anchors"
    } catch {
        # If delete fails, try Move with overwrite via copy
        try {
            Copy-Item $tempPath $filePath -Force
            Remove-Item $tempPath -Force
            Write-Host "OK (copy) ${fileName}: ${count} anchors"
        } catch {
            Write-Host "FAIL ${fileName}: $($_.Exception.Message)"
        }
    }
}
