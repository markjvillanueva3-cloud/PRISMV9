$path = "C:\PRISM\mcp-server\data\docs\roadmap\HIERARCHICAL_INDEX_SPEC.md"
$results = Select-String -Path $path -Pattern "^## BRANCH|^## CROSS|^## STORAGE|^## PHASE|^## IMPL|^## THE|^## PURPOSE"
foreach ($r in $results) { Write-Output "$($r.LineNumber): $($r.Line.Trim())" }
Write-Output "=== TOTAL: $((Get-Content $path).Count) lines ==="
