$sessions = @(
    'prism-session-buffer',
    'prism-session-handoff', 
    'prism-state-manager',
    'prism-task-continuity',
    'prism-mandatory-microsession'
)
foreach ($s in $sessions) {
    $path = "C:\PRISM\skills-consolidated\$s"
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "Removed: $s"
    }
}
Write-Host "Done - removed $($sessions.Count) session skills"