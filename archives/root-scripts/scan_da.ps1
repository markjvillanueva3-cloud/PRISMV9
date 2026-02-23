$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md"
$lines = Get-Content $file
$lineNum = 0
foreach ($line in $lines) {
    $lineNum++
    if ($line -match "^## DA-MS|^### DA-MS|^## GATE|^## COMPANION|^## KNOWLEDGE|CHECKLIST|^## CONTEXT") {
        Write-Output "${lineNum}: $line"
    }
}
Write-Output "TOTAL LINES: $($lines.Count)"
