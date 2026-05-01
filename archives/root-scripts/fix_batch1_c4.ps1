# BATCH 1: Add DEPENDS ON headers to R1-R6 + WHAT COMES AFTER to R7-R10
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# === C4: DEPENDS ON headers ===
$edits = @(
    @{
        File = "PHASE_R1_REGISTRY.md"
        After = "# Status: in-progress"
        Insert = "# DEPENDS ON: DA complete (dev infrastructure optimized), P0 complete (dispatchers wired)"
    },
    @{
        File = "PHASE_R2_SAFETY.md"
        After = "# Status: not-started"
        Insert = "# DEPENDS ON: R1-MS9 complete (registries loaded, data validated, formulas wired)"
    },
    @{
        File = "PHASE_R3_CAMPAIGNS.md"
        After = "# Status: not-started"
        Insert = "# DEPENDS ON: R1 complete (data foundation), R2 complete (safety validated, golden values locked)"
    },
    @{
        File = "PHASE_R4_ENTERPRISE.md"
        After = "# Status: not-started"
        Insert = "# DEPENDS ON: R3 complete (intelligence actions live, formula registry integrated)"
    },
    @{
        File = "PHASE_R5_VISUAL.md"
        After = "# Status: not-started"
        Insert = "# DEPENDS ON: R4 complete (API layer + auth), R3 complete (intelligence data for UI)"
    },
    @{
        File = "PHASE_R6_PRODUCTION.md"
        After = "# Status: not-started"
        Insert = "# DEPENDS ON: R4 complete (API), R5 complete (UI), R2 complete (safety baselines for load validation)"
    }
)

foreach ($edit in $edits) {
    $path = Join-Path $dir $edit.File
    $lines = [System.Collections.ArrayList](Get-Content $path)
    
    # Find the Status line
    $found = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match $edit.After) {
            # Check if DEPENDS ON already exists nearby
            $hasDep = $false
            for ($j = $i; $j -lt [Math]::Min($i+5, $lines.Count); $j++) {
                if ($lines[$j] -match "^# DEPENDS ON:") { $hasDep = $true; break }
            }
            if (-not $hasDep) {
                $lines.Insert($i + 1, $edit.Insert)
                $found = $true
                Write-Output "C4: Added DEPENDS ON to $($edit.File) at line $($i+2)"
            } else {
                Write-Output "C4: $($edit.File) already has DEPENDS ON"
            }
            break
        }
    }
    if (-not $found -and -not $hasDep) { Write-Output "C4: WARNING - could not find anchor in $($edit.File)" }
    
    [System.IO.File]::WriteAllLines($path, $lines.ToArray())
}

Write-Output "`n--- C4 complete ---"
