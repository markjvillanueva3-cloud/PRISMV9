# Apply role/model/effort to R7 phase
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R7_INTELLIGENCE.md"
$lines = [System.Collections.ArrayList](Get-Content $file)
$assignments = @{
    "^## MS0:" = "### Role: Intelligence Architect | Model: Opus (physics models + formulas) → Sonnet (engine wiring) | Effort: L (20 calls) | Sessions: 1-2"
    "^## MS1:" = "### Role: Intelligence Architect | Model: Opus (optimization algorithm) → Sonnet (impl) | Effort: L (18 calls) | Sessions: 1"
    "^## MS2:" = "### Role: Intelligence Architect | Model: Sonnet (fixture logic) → Opus (clamping force safety review) | Effort: M (12 calls) | Sessions: 1"
    "^## MS3:" = "### Role: Intelligence Architect | Model: Sonnet (learning pipeline impl) | Effort: M (12 calls) | Sessions: 1"
    "^## MS4:" = "### Role: Intelligence Architect | Model: Opus (algorithm selection) → Sonnet (integration) | Effort: M (12 calls) | Sessions: 1"
    "^## MS5:" = "### Role: Intelligence Architect | Model: Opus (scheduling algorithm) → Sonnet (impl) | Effort: L (15 calls) | Sessions: 1"
    "^## MS6:" = "### Role: Data Architect | Model: Haiku (bulk PDF parsing 116 catalogs) → Sonnet (normalization) | Effort: XL (30+ calls) | Sessions: 2-3"
}
$insertions = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    foreach ($p in $assignments.Keys) {
        if ($lines[$i] -match $p -and $lines[$i] -notmatch "^## MS\d.*MS\d" -and ($i+1 -ge $lines.Count -or $lines[$i+1] -notmatch "^### Role:")) {
            # Make sure we match the right milestone (avoid partial matches)
            $matchedKey = $p.TrimStart('^')
            if ($lines[$i].StartsWith($matchedKey.Replace('\', '').TrimStart('^'))) {
                $insertions += [PSCustomObject]@{Index=$i+1; Text=$assignments[$p]}
            }
        }
    }
}
$insertions | Sort-Object Index -Descending | ForEach-Object { $lines.Insert($_.Index, $_.Text) }
[System.IO.File]::WriteAllLines($file, $lines.ToArray())
Write-Output "R7: $((Get-Content $file).Count) lines ($($insertions.Count) inserted)"
