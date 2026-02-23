# Apply ALL role/model/effort to DA phase - single read, single write
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md"
$lines = [System.Collections.ArrayList](Get-Content $file)

# Build insertion map: milestone pattern → assignment line
$assignments = @{
    "^## DA-MS0:" = "### Role: Context Engineer | Model: Sonnet (audit) `u{2192} Haiku (bulk anchors) | Effort: M (10-15 calls) | Sessions: 1-2"
    "^## DA-MS1:" = "### Role: Systems Architect | Model: Opus (subagent arch) `u{2192} Sonnet (impl) | Effort: L (15-20 calls) | Sessions: 2"
    "^## DA-MS2:" = "### Role: Context Engineer | Model: Sonnet (skill conversion + commands) | Effort: L (15-20 calls) | Sessions: 2"
    "^## DA-MS3:" = "### Role: Systems Architect | Model: Opus (strategy) `u{2192} Sonnet (impl) | Effort: M (10-15 calls) | Sessions: 1"
    "^## DA-MS4:" = "### Role: Systems Architect | Model: Sonnet (hook config + test) | Effort: S (5-8 calls) | Sessions: 0.5"
    "^## DA-MS8:" = "### Role: Systems Architect | Model: Sonnet (tests) `u{2192} Opus (gate review) | Effort: M (10-15 calls) | Sessions: 1"
}

# Track insertions (must process bottom-up to preserve indices)
$insertions = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    foreach ($pattern in $assignments.Keys) {
        if ($lines[$i] -match $pattern) {
            # Check if next line already has Role: assignment
            if ($i + 1 -lt $lines.Count -and $lines[$i + 1] -notmatch "^### Role:") {
                $insertions += [PSCustomObject]@{Index=$i+1; Text=$assignments[$pattern]}
                Write-Output "Will insert at line $($i+2): $pattern"
            } else {
                Write-Output "Already has assignment: $pattern"
            }
        }
    }
}

# Insert bottom-up
$insertions | Sort-Object Index -Descending | ForEach-Object {
    $lines.Insert($_.Index, $_.Text)
}

# Write once
[System.IO.File]::WriteAllLines($file, $lines.ToArray())
$newCount = (Get-Content $file).Count
Write-Output "`nDA file: $newCount lines (inserted $($insertions.Count) assignment lines)"
