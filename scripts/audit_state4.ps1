# Deep check material format
$sample = 'C:\PRISM\data\materials\P_STEELS\bearing_steel_verified.json'
$raw = [System.IO.File]::ReadAllText($sample)
Write-Output ("File size: {0} bytes" -f $raw.Length)
Write-Output ("First 500 chars:")
Write-Output $raw.Substring(0, [Math]::Min(500, $raw.Length))

Write-Output ""
Write-Output "---"
# Check another material file
$files = Get-ChildItem 'C:\PRISM\data\materials\P_STEELS' -Filter '*.json' -File
Write-Output ("P_STEELS files: {0}" -f $files.Count)
foreach ($f in $files) {
    $size = [Math]::Round($f.Length / 1024)
    Write-Output ("  {0} ({1} KB)" -f $f.Name, $size)
}

Write-Output ""
Write-Output "---"
# Check mcp-server data directory for alarms/formulas
Write-Output "MCP-SERVER DATA:"
if (Test-Path 'C:\PRISM\mcp-server\data') {
    Get-ChildItem 'C:\PRISM\mcp-server\data' -Directory | ForEach-Object {
        $name = $_.Name
        $jsonCount = (Get-ChildItem $_.FullName -Filter '*.json' -File -Recurse -ErrorAction SilentlyContinue).Count
        Write-Output ("  {0}: {1} json files" -f $name, $jsonCount)
    }
}

# Check materials_complete for M-0 status
Write-Output ""
Write-Output "M-0 CHECK - materials_complete dir:"
$mcDir = 'C:\PRISM\data\materials_complete'
if (Test-Path $mcDir) {
    Get-ChildItem $mcDir -Directory | ForEach-Object {
        $name = $_.Name
        $count = (Get-ChildItem $_.FullName -Filter '*.json' -File).Count
        Write-Output ("  {0}: {1} files" -f $name, $count)
    }
    # Sample one to check schema
    $mcSample = Get-ChildItem $mcDir -Recurse -Filter '*.json' -File | Select-Object -First 1
    if ($mcSample) {
        Write-Output ("  Sample: {0}" -f $mcSample.Name)
        $raw = [System.IO.File]::ReadAllText($mcSample.FullName)
        $raw = $raw.TrimStart([char]0xFEFF)
        Write-Output ("  First 400 chars: {0}" -f $raw.Substring(0, [Math]::Min(400, $raw.Length)))
    }
}
