# Fix R3 - avoid special characters in hash values
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R3_CAMPAIGNS.md"
$lines = [System.Collections.ArrayList](Get-Content $file)

# Build assignments as simple objects to avoid PS parsing issues
$pairs = @(
    @("R3-MS0:", "### Role: Systems Architect | Model: Opus (cross-system design) then Sonnet (impl) | Effort: L (14 calls) | Sessions: 1-2"),
    @("R3-MS0.5:", "### Role: Systems Architect | Model: Sonnet (wiring) then Opus (integration validation) | Effort: M (10 calls) | Sessions: 1"),
    @("R3-MS1:", "### Role: Safety Engineer | Model: Opus (formula verification, SAFETY-CRITICAL) | Effort: M (12 calls) | Sessions: 1"),
    @("R3-MS2:", "### Role: Intelligence Architect | Model: Sonnet (impl) then Opus (strategy selection logic) | Effort: M (8 calls) | Sessions: 1"),
    @("R3-MS3:", "### Role: Intelligence Architect | Model: Opus (cross-system chain design) then Sonnet (impl) | Effort: M (12 calls) | Sessions: 1-2"),
    @("R3-MS4:", "### Role: Data Architect | Model: Haiku (bulk extraction) then Sonnet (enrichment + validation) | Effort: L (20 calls) | Sessions: 2"),
    @("R3-MS5:", "### Role: Systems Architect | Model: Sonnet (tests) then Opus (gate review) | Effort: M (10 calls) | Sessions: 1")
)

$insertions = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    foreach ($pair in $pairs) {
        $marker = $pair[0]
        $assignment = $pair[1]
        if ($lines[$i] -match "^## $marker" -and ($i+1 -ge $lines.Count -or $lines[$i+1] -notmatch "^### Role:")) {
            $insertions += [PSCustomObject]@{Index=$i+1; Text=$assignment}
            Write-Output "R3: Will insert after line $($i+1) for $marker"
        }
    }
}

$insertions | Sort-Object Index -Descending | ForEach-Object { $lines.Insert($_.Index, $_.Text) }
[System.IO.File]::WriteAllLines($file, $lines.ToArray())
Write-Output "R3: $((Get-Content $file).Count) lines ($($insertions.Count) inserted)"
