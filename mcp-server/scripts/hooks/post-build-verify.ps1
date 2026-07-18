# post-build-verify.ps1
# NON-BLOCKING hook: Runs after any npm run build command
# Reports build health but doesn't block

$buildOutput = & npm run build:fast 2>&1
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Output "❌ BUILD FAILED - check errors above"
    Write-Output "Fix build errors before continuing"
    exit 1
}

# Check for verify-build script
$verifyScript = "scripts/verify-build.ps1"
if (Test-Path $verifyScript) {
    $verifyOutput = & powershell -File $verifyScript 2>&1
    $verifyExit = $LASTEXITCODE
    if ($verifyExit -ne 0) {
        Write-Output "⚠️ VERIFY-BUILD WARNINGS:"
        Write-Output $verifyOutput
        exit 0  # Non-blocking, just warn
    }
}

Write-Output "✅ Build + verify passed"
exit 0
