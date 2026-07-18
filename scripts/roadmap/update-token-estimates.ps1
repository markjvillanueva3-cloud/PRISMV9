# W2-1: Token Estimate Updater
# Counts words in each roadmap .md, estimates tokens (words / 0.75)
# Updates a baseline JSON for drift detection

$roadmapDir = "C:\PRISM\mcp-server\data\docs\roadmap"
$baselineFile = Join-Path $roadmapDir ".token-baseline.json"

$files = Get-ChildItem $roadmapDir -Filter "*.md" -File
$results = @{}
$totalTokens = 0

foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    $lines = ($content -split "`n").Count
    $words = ($content -split '\s+').Count
    $tokens = [math]::Round($words / 0.75)
    $results[$f.Name] = @{
        lines = $lines
        words = $words
        tokens = $tokens
        size_kb = [math]::Round($f.Length / 1024, 1)
    }
    $totalTokens += $tokens
}

# Compare to baseline if exists
$drift = @()
if (Test-Path $baselineFile) {
    $baseline = Get-Content $baselineFile -Raw | ConvertFrom-Json
    foreach ($name in $results.Keys) {
        $old = $baseline.$name
        if ($old) {
            $oldTokens = $old.tokens
            $newTokens = $results[$name].tokens
            $pctChange = if ($oldTokens -gt 0) { [math]::Round(($newTokens - $oldTokens) / $oldTokens * 100, 1) } else { 0 }
            if ([math]::Abs($pctChange) -gt 10) {
                $drift += "$name : $oldTokens -> $newTokens ($pctChange%)"
            }
        }
    }
}

# Save new baseline
$results | ConvertTo-Json -Depth 3 | Set-Content $baselineFile -Encoding UTF8

# Report
Write-Host "=== TOKEN ESTIMATES ==="
$sorted = $results.GetEnumerator() | Sort-Object { $_.Value.tokens } -Descending
foreach ($entry in $sorted) {
    $v = $entry.Value
    Write-Host ("{0,-50} {1,5} lines  ~{2,6} tokens  {3,6} KB" -f $entry.Key, $v.lines, $v.tokens, $v.size_kb)
}
Write-Host ""
Write-Host "TOTAL: $($files.Count) files, ~$totalTokens tokens"

if ($drift.Count -gt 0) {
    Write-Host ""
    Write-Host "=== DRIFT DETECTED (>10% change) ==="
    $drift | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "No drift from baseline (or first run)."
}
