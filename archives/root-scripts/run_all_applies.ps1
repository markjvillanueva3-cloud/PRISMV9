# Run all phase assignment scripts in sequence
$scripts = @(
    "C:\PRISM\apply_r1.ps1",
    "C:\PRISM\apply_r2.ps1",
    "C:\PRISM\apply_r3.ps1",
    "C:\PRISM\apply_r7.ps1",
    "C:\PRISM\apply_r8.ps1",
    "C:\PRISM\apply_r9.ps1"
)
foreach ($s in $scripts) {
    Write-Output "--- Running $($s | Split-Path -Leaf) ---"
    & $s
    Start-Sleep -Milliseconds 500
}
