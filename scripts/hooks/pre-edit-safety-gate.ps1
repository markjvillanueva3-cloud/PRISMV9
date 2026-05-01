# pre-edit-safety-gate.ps1
# BLOCKING hook: Prevents edits to CRITICAL files without safety-physics review
# Exit code 2 = block the tool use in Claude Code
param($FilePath)

$critical_patterns = @(
    "src/engines/kienzle",
    "src/engines/taylor",
    "src/engines/safety",
    "src/engines/cutting",
    "src/engines/thermal",
    "src/tools/dispatchers/safetyDispatcher",
    "src/tools/dispatchers/calcDispatcher",
    "data/materials/"
)

$normalized = $FilePath -replace '\\', '/'

foreach ($pattern in $critical_patterns) {
    if ($normalized -like "*$pattern*") {
        Write-Output "⚠️ CRITICAL FILE: $FilePath"
        Write-Output "Safety-physics subagent review REQUIRED before editing."
        Write-Output "Invoke: Use the safety-physics subagent to review changes to $FilePath"
        exit 2  # Block the edit
    }
}

exit 0  # Allow the edit
