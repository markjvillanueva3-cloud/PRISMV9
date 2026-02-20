# Check R10 and R11 role assignments
Write-Output "=== R10 ==="
Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R10_REVOLUTION.md" -Pattern "### Role:" | ForEach-Object {
    $txt = $_.Line.Trim()
    if ($txt.Length -gt 120) { $txt = $txt.Substring(0,120) + "..." }
    Write-Output "L$($_.LineNumber): $txt"
}
Write-Output "`n=== R11 ==="
Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R11_PRODUCT.md" -Pattern "### Role:" | ForEach-Object {
    $txt = $_.Line.Trim()
    if ($txt.Length -gt 120) { $txt = $txt.Substring(0,120) + "..." }
    Write-Output "L$($_.LineNumber): $txt"
}
