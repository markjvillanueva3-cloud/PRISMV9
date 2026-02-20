# teammate-quality-gate.ps1
# Hook: Runs when a teammate marks a task complete
# Triggers verifier subagent to check work before accepting
param($TaskId)

Write-Output "QUALITY GATE: Task $TaskId marked complete by teammate"
Write-Output "Verifier subagent should check:"
Write-Output "  1. Build still passes (npm run build:fast)"
Write-Output "  2. No regressions (npm run test:regression if available)"
Write-Output "  3. Files modified are within teammate's assigned scope"
Write-Output "  4. No CRITICAL files edited without safety-physics approval"

# Run quick build check
$buildResult = & npm run build:fast 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Output "❌ BUILD BROKEN after teammate completion"
    exit 2  # Block task completion
}

Write-Output "✅ Build passes - teammate work accepted"
exit 0
