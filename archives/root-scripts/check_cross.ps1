$results = Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\HIERARCHICAL_INDEX_SPEC.md" -Pattern "CROSS-BRANCH|COMBINED TRAVERSAL"
foreach ($r in $results) { Write-Output "$($r.LineNumber): $($r.Line.Trim())" }
