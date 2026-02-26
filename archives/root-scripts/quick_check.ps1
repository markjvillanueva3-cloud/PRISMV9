# Copy matrix file from outputs
$src = Get-Content "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md" -TotalCount 1
Write-Output "DA header: $src"
