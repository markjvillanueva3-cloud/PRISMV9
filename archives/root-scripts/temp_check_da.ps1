$path = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md"
$lines = Get-Content $path
$total = $lines.Count
Write-Output "TOTAL LINES: $total"
Write-Output ""
for ($i = 0; $i -lt $total; $i++) {
    if ($lines[$i] -match "^## DA-MS|^### DA-MS|^## COMPANION|^## GATE|^## KNOWLEDGE") {
        Write-Output "$($i+1): $($lines[$i])"
    }
}
