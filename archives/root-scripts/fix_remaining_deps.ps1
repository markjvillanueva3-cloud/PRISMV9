# Add DEPENDS ON to R7-R11 (R7-R10 already have Prerequisites in v14.2 format, standardize)
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

$edits = @(
    @{ File="PHASE_R7_INTELLIGENCE.md"; After="# Status: not-started"; Line="# DEPENDS ON: R1 complete (registries loaded), R3 complete (campaign actions live)" },
    @{ File="PHASE_R8_EXPERIENCE.md"; After="# Status: not-started"; Line="# DEPENDS ON: R3 complete (actions live), R7 complete (intelligence features)" },
    @{ File="PHASE_R9_INTEGRATION.md"; After="# Status: not-started"; Line="# DEPENDS ON: R3 (actions), R7 (intelligence), R8 (experience layer)" },
    @{ File="PHASE_R10_REVOLUTION.md"; After="Prerequisites: R7-R9"; Line="# DEPENDS ON: R7 (physics), R8 (experience), R9 (real-world integration)" },
    @{ File="PHASE_R11_PRODUCT.md"; After="# Status: not-started"; Line="# DEPENDS ON: R1 (registries), R2 (safety), R3 (intelligence), R7 (coupled physics)" }
)

foreach ($edit in $edits) {
    $path = Join-Path $dir $edit.File
    $lines = [System.Collections.ArrayList](Get-Content $path)
    
    # Check if already has DEPENDS ON
    $hasDep = $false
    for ($i = 0; $i -lt [Math]::Min(15, $lines.Count); $i++) {
        if ($lines[$i] -match "^# DEPENDS ON:") { $hasDep = $true; break }
    }
    
    if (-not $hasDep) {
        # Find the anchor line
        for ($i = 0; $i -lt [Math]::Min(15, $lines.Count); $i++) {
            if ($lines[$i] -match $edit.After) {
                $lines.Insert($i + 1, $edit.Line)
                Write-Output "Added DEPENDS ON to $($edit.File) at line $($i+2)"
                break
            }
        }
    } else {
        Write-Output "$($edit.File) already has DEPENDS ON"
    }
    
    [System.IO.File]::WriteAllLines($path, $lines.ToArray())
}
