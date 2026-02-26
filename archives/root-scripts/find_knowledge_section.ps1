$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$r1 = Get-Content (Join-Path $dir "PHASE_R1_REGISTRY.md")
$inSection = $false
$startLine = 0
$lineNum = 0
foreach ($line in $r1) {
    $lineNum++
    if ($line -match "KNOWLEDGE CONTRIBUTION") {
        $inSection = $true
        $startLine = $lineNum
    }
    if ($inSection) {
        Write-Output "${lineNum}: $line"
        if ($lineNum -gt ($startLine + 40)) { break }
    }
}
