# W2-3: Roadmap Regression Test — wraps lint + index rebuild + structure validation
# Run after ANY batch of roadmap edits

$scriptDir = "C:\PRISM\mcp-server\scripts\roadmap"
$exitCode = 0

Write-Host "=== ROADMAP REGRESSION TEST ==="
Write-Host ""

# Step 1: Lint
Write-Host "--- Step 1: Roadmap Lint ---"
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "roadmap-lint.ps1")
if ($LASTEXITCODE -gt 0) {
    Write-Host "Lint returned exit code $LASTEXITCODE"
    if ($LASTEXITCODE -gt $exitCode) { $exitCode = $LASTEXITCODE }
}
Write-Host ""

# Step 2: Section index rebuild check
Write-Host "--- Step 2: Section Index Freshness ---"
$indexFile = "C:\PRISM\mcp-server\data\docs\roadmap\ROADMAP_SECTION_INDEX.md"
if (Test-Path $indexFile) {
    $indexAge = (Get-Date) - (Get-Item $indexFile).LastWriteTime
    if ($indexAge.TotalHours -gt 24) {
        Write-Host "WARN: Section index is $([math]::Round($indexAge.TotalHours, 1)) hours old. Consider rebuilding." -ForegroundColor Yellow
    } else {
        Write-Host "Section index is fresh ($([math]::Round($indexAge.TotalHours, 1)) hours old)" -ForegroundColor Green
    }
} else {
    Write-Host "WARN: Section index not found" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Token estimates
Write-Host "--- Step 3: Token Estimates ---"
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "update-token-estimates.ps1")
Write-Host ""

# Step 4: Structure check — all roadmap dirs exist
Write-Host "--- Step 4: Directory Structure ---"
$requiredDirs = @(
    "C:\PRISM\mcp-server\data\docs\roadmap",
    "C:\PRISM\mcp-server\data\docs\roadmap\archive",
    "C:\PRISM\mcp-server\data\docs\roadmap\reference"
)
foreach ($d in $requiredDirs) {
    if (Test-Path $d) {
        Write-Host "  OK: $d" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: $d" -ForegroundColor Red
        $exitCode = 2
    }
}

Write-Host ""
Write-Host "=== RESULT: Exit code $exitCode ==="
exit $exitCode
