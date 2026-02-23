# Check R4, R5, R6 for existing milestone tables
Write-Output "=== R4 MILESTONE TABLE ==="
Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R4_ENTERPRISE.md" -Pattern "MS\d.*Role|MS\d.*Model|\| MS" | ForEach-Object {
    $txt = $_.Line.Trim()
    if ($txt.Length -gt 130) { $txt = $txt.Substring(0, 130) + "..." }
    Write-Output "  L$($_.LineNumber): $txt"
}
Write-Output "`n=== R5 ==="
Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R5_VISUAL.md" -Pattern "MS\d.*Role|MS\d.*Model|\| MS|MILESTONE" | ForEach-Object {
    $txt = $_.Line.Trim()
    if ($txt.Length -gt 130) { $txt = $txt.Substring(0, 130) + "..." }
    Write-Output "  L$($_.LineNumber): $txt"
}
Write-Output "`n=== R6 ==="
Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R6_PRODUCTION.md" -Pattern "MS\d.*Role|MS\d.*Model|\| MS|MILESTONE" | ForEach-Object {
    $txt = $_.Line.Trim()
    if ($txt.Length -gt 130) { $txt = $txt.Substring(0, 130) + "..." }
    Write-Output "  L$($_.LineNumber): $txt"
}
