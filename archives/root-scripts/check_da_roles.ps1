Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md" -Pattern "### Role:" | ForEach-Object {
    $txt = $_.Line.Trim()
    if ($txt.Length -gt 110) { $txt = $txt.Substring(0, 110) + "..." }
    Write-Output "L$($_.LineNumber): $txt"
}
Write-Output "---"
$lines = (Get-Content "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md").Count
Write-Output "Total lines: $lines"
