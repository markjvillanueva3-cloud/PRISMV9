Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\HIERARCHICAL_INDEX_SPEC.md" -Pattern "^## BRANCH|atom|course|MIT|skill.split|SKILL_INDEX" |
    ForEach-Object { Write-Output "L$($_.LineNumber): $($_.Line.Trim().Substring(0, [Math]::Min(90, $_.Line.Trim().Length)))" }
