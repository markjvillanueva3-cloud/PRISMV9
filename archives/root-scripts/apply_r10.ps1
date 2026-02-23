# Apply role/model/effort to R10 (Revolution structure)
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R10_REVOLUTION.md"
$lines = [System.Collections.ArrayList](Get-Content $file)
$assignments = @{
    "^## REVOLUTION 1: THE MANUFACTURING GENOME" = "### Role: Research Architect | Model: Opus (genome architecture, novel system) | Effort: XL (30 calls) | Sessions: 3"
    "^## REVOLUTION 2: INVERSE PROBLEM" = "### Role: Research Architect | Model: Opus (inverse solver design) then Sonnet (impl) | Effort: XL (25 calls) | Sessions: 2"
    "^## REVOLUTION 3: GENERATIVE PROCESS" = "### Role: Research Architect | Model: Opus (AI-driven generation logic) | Effort: XL (25 calls) | Sessions: 2"
    "^## REVOLUTION 4: THE ANONYMOUS" = "### Role: Research Architect | Model: Opus (federated learning architecture) then Sonnet (impl) | Effort: L (20 calls) | Sessions: 2"
    "^## REVOLUTION 5: FAILURE FORENSICS" = "### Role: Safety Engineer | Model: Opus (SAFETY-CRITICAL forensics analysis) then Sonnet (impl) | Effort: L (18 calls) | Sessions: 1-2"
    "^## REVOLUTION 6: PREDICTIVE MAINTENANCE" = "### Role: Intelligence Architect | Model: Opus (prediction model design) then Sonnet (impl) | Effort: L (18 calls) | Sessions: 1-2"
    "^## REVOLUTION 7: THE MACHINIST" = "### Role: UX Architect | Model: Opus (apprentice learning design) then Sonnet (impl) | Effort: XL (25 calls) | Sessions: 2-3"
    "^## REVOLUTION 8: SUSTAINABILITY" = "### Role: Intelligence Architect | Model: Sonnet (optimization models) then Opus (sustainability validation) | Effort: M (12 calls) | Sessions: 1"
    "^## REVOLUTION 9: REAL-TIME" = "### Role: Integration Engineer | Model: Opus (real-time adaptive architecture) then Sonnet (impl) | Effort: XL (30 calls) | Sessions: 3"
    "^## REVOLUTION 10: THE MANUFACTURING KNOWLEDGE" = "### Role: Research Architect | Model: Opus (knowledge graph architecture) then Haiku (bulk extraction) then Sonnet (wiring) | Effort: XL (35 calls) | Sessions: 3-4"
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
Write-Output "R10: $((Get-Content $file).Count) lines ($($insertions.Count) inserted)"
