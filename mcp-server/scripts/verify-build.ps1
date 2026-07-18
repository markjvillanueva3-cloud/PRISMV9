# PRISM Build Verification Script
$dist = "C:\PRISM\mcp-server\dist\index.js"

if (-not (Test-Path $dist)) {
    Write-Error "FAIL: dist/index.js not found"
    exit 1
}

$size = (Get-Item $dist).Length / 1MB
if ($size -lt 3.5 -or $size -gt 5.0) {
    Write-Error "FAIL: size $([math]::Round($size,2))MB outside 3.5-5.0MB"
    exit 1
}

$required = @("pfpBlocked", "unifiedSearch", "slimCadence", "getCadenceVerbosity", "runSmokeTests", "normalizeParams", "PARAM_ALIASES")
$missing = @()
foreach ($sym in $required) {
    if (-not (Select-String -Path $dist -Pattern $sym -Quiet)) {
        $missing += $sym
    }
}

$hasBadFormula = Select-String -Path $dist -Pattern 'formulaRegistry\.search\(' -Quiet
$bad = @()
if ($hasBadFormula) { $bad += "formulaRegistry.search( found" }

Write-Output "=== PRISM Build Verification ==="
Write-Output "Size: $([math]::Round($size,2))MB"

if ($missing.Count -gt 0) {
    Write-Error "MISSING: $($missing -join ', ')"
}
if ($bad.Count -gt 0) {
    Write-Error "BAD: $($bad -join ', ')"
}

if ($missing.Count -eq 0 -and $bad.Count -eq 0) {
    Write-Output "PASS: $($required.Count) symbols OK, 0 bad patterns"
    exit 0
} else {
    exit 1
}
