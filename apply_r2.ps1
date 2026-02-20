# Apply role/model/effort to R2 phase
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R2_SAFETY.md"
$lines = [System.Collections.ArrayList](Get-Content $file)
$assignments = @{
    "^## R2-MS0:" = "### Role: Safety Engineer | Model: Opus (golden values) → Sonnet (test harness) | Effort: XL (25 calls) | Sessions: 2"
    "^## R2-MS1:" = "### Role: Safety Engineer | Model: Opus (safety review) → Sonnet (activation) → Opus (gate) | Effort: XL (30 calls) | Sessions: 2-3"
    "^## R2-MS1\.5:" = "### Role: Safety Engineer | Model: Opus (regression criteria) → Sonnet (suite impl) | Effort: M (8 calls) | Sessions: 1"
    "^## R2-MS2:" = "### Role: Safety Engineer | Model: Opus (adversarial edge case generation) | Effort: M (10 calls) | Sessions: 1"
    "^## R2-MS3:" = "### Role: Safety Engineer | Model: Opus (fix review) → Sonnet (fix impl) | Effort: L (15 calls) | Sessions: 1-2"
    "^## R2-MS4:" = "### Role: Safety Engineer | Model: Opus (MANDATORY safety phase gate) | Effort: M (10 calls) | Sessions: 1"
    "^## R2-MS5:" = "### Role: Safety Engineer | Model: Opus (uncertainty design) → Sonnet (impl) | Effort: M (8 calls) | Sessions: 1"
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
                Write-Output "R2: Insert at $($i+2) for $pattern"
            }
        }
    }
}
$insertions | Sort-Object Index -Descending | ForEach-Object { $lines.Insert($_.Index, $_.Text) }
[System.IO.File]::WriteAllLines($file, $lines.ToArray())
Write-Output "R2: $((Get-Content $file).Count) lines"
