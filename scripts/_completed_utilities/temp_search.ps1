$content = Get-Content "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_PROTOCOLS_CORE.md" -Encoding UTF8
$lineNum = 0
foreach ($line in $content) {
    $lineNum++
    if ($line -match "powershell|code.standard|BUILD|ESSENTIAL|position.*save|companion") {
        Write-Output "${lineNum}: $line"
    }
}
