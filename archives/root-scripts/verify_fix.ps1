$rc = Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_RECOVERY_CARD.md" -Pattern "STEP 1\.5.*SECTION INDEX"
Write-Output "Section Index step found: $($rc.Count)"
foreach ($r in $rc) { Write-Output "  L$($r.LineNumber): $($r.Line.Trim())" }
$lines = (Get-Content "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_RECOVERY_CARD.md").Count
Write-Output "Recovery Card total lines: $lines"
