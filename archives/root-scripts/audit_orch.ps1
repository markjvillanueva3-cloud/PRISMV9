$skills = @('prism-agent-selector','prism-batch-orchestrator','prism-swarm-coordinator','prism-autonomous-execution','prism-api-acceleration')
foreach ($s in $skills) {
    $md = "C:\PRISM\skills-consolidated\$s\SKILL.md"
    if (Test-Path $md) {
        $size = [math]::Round((Get-Item $md).Length/1024, 1)
        $lines = (Get-Content $md).Count
        Write-Host "=== $s (${size}KB, ${lines}L) ==="
        Get-Content $md -TotalCount 15 | ForEach-Object { Write-Host $_ }
        Write-Host ""
    }
}