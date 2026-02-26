# Apply role/model/effort to R8 phase
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R8_EXPERIENCE.md"
$lines = [System.Collections.ArrayList](Get-Content $file)
$assignments = @{
    "^## MS0: INTENT" = "### Role: UX Architect | Model: Opus (intent taxonomy + decomposition) → Sonnet (impl) | Effort: XL (25 calls) | Sessions: 2"
    "^## MS1: PERSONA" = "### Role: UX Architect | Model: Sonnet (formatter + persona templates) | Effort: M (10 calls) | Sessions: 1"
    "^## MS2: PRE-BUILT" = "### Role: UX Architect | Model: Sonnet (chain construction) → Opus (correctness validation) | Effort: M (10 calls) | Sessions: 1"
    "^## MS3: ONBOARDING" = "### Role: UX Architect | Model: Sonnet (flow impl) | Effort: S (5 calls) | Sessions: 0.5"
    "^## MS4: SETUP" = "### Role: UX Architect | Model: Sonnet (template + generation) | Effort: M (10 calls) | Sessions: 1"
    "^## MS5: CONVERSATIONAL" = "### Role: Intelligence Architect | Model: Opus (memory integration design) → Sonnet (impl) | Effort: M (10 calls) | Sessions: 1"
    "^## MS6: USER WORKFLOW" = "### Role: UX Architect | Model: Sonnet (skill impl) → Haiku (bulk testing) | Effort: L (15 calls) | Sessions: 1-2"
    "^## MS7: USER ASSISTANCE" = "### Role: UX Architect | Model: Sonnet (skill impl) | Effort: M (10 calls) | Sessions: 1"
}
$insertions = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    foreach ($p in $assignments.Keys) {
        if ($lines[$i] -match $p -and ($i+1 -ge $lines.Count -or $lines[$i+1] -notmatch "^### Role:")) {
            $insertions += [PSCustomObject]@{Index=$i+1; Text=$assignments[$p]}
        }
    }
}
$insertions | Sort-Object Index -Descending | ForEach-Object { $lines.Insert($_.Index, $_.Text) }
[System.IO.File]::WriteAllLines($file, $lines.ToArray())
Write-Output "R8: $((Get-Content $file).Count) lines ($($insertions.Count) inserted)"
