$file = "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_MASTER_INDEX.md"
$lines = Get-Content $file
$lineNum = 0
foreach ($line in $lines) {
    $lineNum++
    if ($line -match "^## |^### |Phase DA|DA-MS|v14\.|Document Manifest|Phase Registry") {
        Write-Output "${lineNum}: $line"
    }
}
