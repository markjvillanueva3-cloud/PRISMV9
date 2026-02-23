# Apply role/model/effort to R1 phase
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R1_REGISTRY.md"
$lines = [System.Collections.ArrayList](Get-Content $file)

$assignments = @{
    "^## R1-MS4\.5:" = "### Role: Data Architect | Model: Sonnet (validation scripts + test harness) | Effort: M (12 calls) | Sessions: 1"
    "^## R1-MS5:" = "### Role: Data Architect | Model: Opus (85-param schema) → Haiku (bulk scan) → Sonnet (normalization) | Effort: L (18 calls) | Sessions: 2"
    "^## R1-MS6:" = "### Role: Data Architect | Model: Haiku (bulk scan 3518 materials) → Sonnet (enrichment scripts) | Effort: L (14 calls) | Sessions: 1-2"
    "^## R1-MS7:" = "### Role: Data Architect | Model: Haiku (bulk scan) → Sonnet (controller family mapping) | Effort: L (14 calls) | Sessions: 1-2"
    "^## R1-MS8:" = "### Role: Systems Architect | Model: Opus (wiring architecture) → Sonnet (impl + tests) | Effort: L (18 calls) | Sessions: 2"
    "^## R1-MS9:" = "### Role: Safety Engineer | Model: Sonnet (metrics) → Opus (gate review + quality) | Effort: M (12 calls) | Sessions: 1"
    "^## R1-MS10:" = "### Role: Data Architect | Model: Sonnet (optimization + benchmarks) | Effort: S (6 calls) | Sessions: 0.5"
}

$insertions = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    foreach ($pattern in $assignments.Keys) {
        if ($lines[$i] -match $pattern) {
            $hasRole = $false
            for ($j = 1; $j -le 3; $j++) {
                if ($i + $j -lt $lines.Count -and $lines[$i + $j] -match "^### Role:") { $hasRole = $true; break }
            }
            if (-not $hasRole) {
                $insertions += [PSCustomObject]@{Index=$i+1; Text=$assignments[$pattern]}
                Write-Output "R1: Insert at $($i+2) for $pattern"
            }
        }
    }
}
$insertions | Sort-Object Index -Descending | ForEach-Object { $lines.Insert($_.Index, $_.Text) }
[System.IO.File]::WriteAllLines($file, $lines.ToArray())
Write-Output "R1: $(( Get-Content $file).Count) lines"
