$results = Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\HIERARCHICAL_INDEX_SPEC.md" -Pattern "^## BRANCH|^## CROSS|^## IMPLEMENTATION|^## PHASE|^---$"
foreach ($r in $results) { Write-Output "$($r.LineNumber): $($r.Line.Trim())" }
Write-Output "=== TOTAL ==="
$lines = (Get-Content "C:\PRISM\mcp-server\data\docs\roadmap\HIERARCHICAL_INDEX_SPEC.md").Count
Write-Output "Lines: $lines"
