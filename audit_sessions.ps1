# Quick audit of session skills - read first 20 lines from each
$sessions = @('prism-session-master','prism-session-buffer','prism-session-handoff','prism-state-manager','prism-task-continuity','prism-mandatory-microsession')
foreach ($s in $sessions) {
    $md = "C:\PRISM\skills-consolidated\$s\SKILL.md"
    if (Test-Path $md) {
        $size = [math]::Round((Get-Item $md).Length/1024, 1)
        $lines = (Get-Content $md).Count
        Write-Host "=== $s (${size}KB, ${lines}L) ==="
        Get-Content $md -TotalCount 12 | ForEach-Object { Write-Host $_ }
        Write-Host ""
    }
}