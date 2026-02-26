# Check R3 role assignments quality
Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R3_CAMPAIGNS.md" -Pattern "### Role:" | ForEach-Object {
    $txt = $_.Line.Trim()
    if ($txt.Length -gt 120) { $txt = $txt.Substring(0, 120) + "..." }
    Write-Output "L$($_.LineNumber): $txt"
}
