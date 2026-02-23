# Apply role/model/effort to R11 (formal milestones)
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R11_PRODUCT.md"
$lines = [System.Collections.ArrayList](Get-Content $file)
$assignments = @{
    "^## MS0: SPEED" = "### Role: Product Manager | Model: Sonnet (build pipeline + packaging) | Effort: L (15 calls) | Sessions: 2"
    "^## MS1: POST" = "### Role: Product Manager | Model: Haiku (bulk doc gen) then Sonnet (editorial) | Effort: L (18 calls) | Sessions: 2"
    "^## MS2: SHOP" = "### Role: Product Manager | Model: Opus (compliance review) then Sonnet (impl) | Effort: M (10 calls) | Sessions: 1"
    "^## MS3: AUTO" = "### Role: Product Manager | Model: Opus (MANDATORY final launch gate) | Effort: M (12 calls) | Sessions: 1"
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
Write-Output "R11: $((Get-Content $file).Count) lines ($($insertions.Count) inserted)"
