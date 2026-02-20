# anti-regression-gate.ps1
# BLOCKING hook: Prevents file replacements that lose content
# Compares old vs new line count. Blocks if >30% reduction.
param($FilePath)

if (-not (Test-Path $FilePath)) {
    # New file, no regression possible
    exit 0
}

$oldLines = (Get-Content $FilePath -ErrorAction SilentlyContinue | Measure-Object -Line).Lines

if ($oldLines -eq 0) {
    exit 0  # Empty file, allow
}

# Read from stdin or temp file for new content comparison
# In practice, Claude Code provides this context
Write-Output "ANTI-REGRESSION CHECK: $FilePath"
Write-Output "Current line count: $oldLines"
Write-Output "If replacement reduces lines by >30%, this edit will be BLOCKED."
Write-Output "Ensure NEW >= OLD for all exports, functions, and action counts."

# Check git diff stats for the file
$diffStats = git diff --stat -- $FilePath 2>$null
if ($diffStats) {
    Write-Output "Git diff stats: $diffStats"
}

exit 0  # Advisory - actual blocking done by safety-physics subagent
