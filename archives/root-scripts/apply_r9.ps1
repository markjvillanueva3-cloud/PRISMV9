# Apply role/model/effort to R9 phase
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_R9_INTEGRATION.md"
$lines = [System.Collections.ArrayList](Get-Content $file)
$assignments = @{
    "^## MS0: MTCONNECT" = "### Role: Integration Engineer | Model: Opus (protocol arch) → Sonnet (adapter impl) | Effort: XL (25 calls) | Sessions: 2"
    "^## MS1: CAM" = "### Role: Integration Engineer | Model: Opus (plugin arch) → Sonnet (per-CAM impl) | Effort: XL (30 calls) | Sessions: 2-3"
    "^## MS2: DNC" = "### Role: Integration Engineer | Model: Sonnet (file transfer impl) | Effort: M (10 calls) | Sessions: 1"
    "^## MS3: MOBILE" = "### Role: UX Architect | Model: Sonnet (responsive UI) | Effort: M (12 calls) | Sessions: 1-2"
    "^## MS4: ERP" = "### Role: Integration Engineer | Model: Sonnet (API) → Opus (data mapping validation) | Effort: M (10 calls) | Sessions: 1-2"
    "^## MS5: MEASUREMENT" = "### Role: Integration Engineer | Model: Sonnet (CMM/probe integration) | Effort: M (10 calls) | Sessions: 1"
    "^## MS6: AR" = "### Role: Research Architect | Model: Opus (AR architecture) → Sonnet (prototype) | Effort: XL (25 calls) | Sessions: 2-3"
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
Write-Output "R9: $((Get-Content $file).Count) lines ($($insertions.Count) inserted)"
