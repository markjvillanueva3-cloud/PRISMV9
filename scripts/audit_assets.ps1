# List all engines with sizes
Write-Output "=== ENGINES ==="
Get-ChildItem 'C:\PRISM\mcp-server\src\engines' -Filter '*.ts' -File | ForEach-Object {
    $kb = [math]::Round($_.Length/1024)
    $lines = (Get-Content $_.FullName).Count
    Write-Output ("  {0}: {1} KB, {2} lines" -f $_.Name, $kb, $lines)
} | Sort-Object

Write-Output ""
Write-Output "=== DISPATCHERS ==="
Get-ChildItem 'C:\PRISM\mcp-server\src\tools\dispatchers' -Filter '*.ts' -File | ForEach-Object {
    $kb = [math]::Round($_.Length/1024)
    Write-Output ("  {0}: {1} KB" -f $_.Name, $kb)
}

Write-Output ""
Write-Output "=== REGISTRIES ==="
Get-ChildItem 'C:\PRISM\mcp-server\src\registries' -Filter '*.ts' -File | ForEach-Object {
    $kb = [math]::Round($_.Length/1024)
    Write-Output ("  {0}: {1} KB" -f $_.Name, $kb)
}

Write-Output ""
Write-Output "=== SKILLS (data) ==="
$skillDir = 'C:\PRISM\data\skills'
if (Test-Path $skillDir) {
    Get-ChildItem $skillDir -Filter '*.md' -File -Recurse | ForEach-Object {
        $kb = [math]::Round($_.Length/1024)
        if ($kb -ge 10) {
            Write-Output ("  {0}: {1} KB" -f $_.Name, $kb)
        }
    }
} else {
    Write-Output "  Skills dir not found at $skillDir"
    # Check alternative locations
    $altDirs = @('C:\PRISM\skills-consolidated','C:\PRISM\mcp-server\data\skills')
    foreach ($d in $altDirs) {
        if (Test-Path $d) {
            Write-Output ("  Found at: {0}" -f $d)
            Get-ChildItem $d -Filter '*.md' -File -Recurse | ForEach-Object {
                $kb = [math]::Round($_.Length/1024)
                if ($kb -ge 10) {
                    Write-Output ("    {0}: {1} KB" -f $_.Name, $kb)
                }
            }
        }
    }
}

Write-Output ""
Write-Output "=== DATA DIRECTORIES ==="
Get-ChildItem 'C:\PRISM\data' -Directory | ForEach-Object {
    $name = $_.Name
    $fileCount = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue).Count
    $totalKB = 0
    Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { $totalKB += $_.Length }
    $totalMB = [math]::Round($totalKB / 1048576, 1)
    Write-Output ("  {0}: {1} files, {2} MB" -f $name, $fileCount, $totalMB)
}
