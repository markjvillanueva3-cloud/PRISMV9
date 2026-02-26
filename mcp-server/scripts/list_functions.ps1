$lines = Get-Content 'C:\PRISM\mcp-server\src\tools\autoHookWrapper.recovered.js'
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*(async\s+)?function\s+(\w+)') {
        Write-Host "$($i+1): $($lines[$i].Trim())"
    }
}
