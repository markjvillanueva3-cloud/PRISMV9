# Check MS5-MS10 status and add missing Role assignments
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md"
$lines = [System.Collections.ArrayList](Get-Content $file)

$assignments = @{
    "^## DA-MS5:" = "### Role: Context Engineer | Model: Sonnet (scripts) → Opus (protocol split) | Effort: L (15-20 calls) | Sessions: 2"
    "^## DA-MS6:" = "### Role: Data Architect | Model: Opus (schema) → Haiku (scanning) → Sonnet (extraction) | Effort: XL (25-35 calls) | Sessions: 3"
    "^## DA-MS7:" = "### Role: Intelligence Architect | Model: Opus (protocol design) → Sonnet (impl) | Effort: L (15-20 calls) | Sessions: 2"
    "^## DA-MS9:" = "### Role: Data Architect | Model: Opus (SKILL_INDEX schema) → Sonnet (automation scripts) | Effort: L (15-20 calls) | Sessions: 2"
    "^## DA-MS10:" = "### Role: Data Architect | Model: Haiku (bulk extraction) → Sonnet (quality review) → Opus (pattern validation) | Effort: XL (25-40 calls) | Sessions: 4"
}

$insertions = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    foreach ($pattern in $assignments.Keys) {
        if ($lines[$i] -match $pattern) {
            # Check next few lines for existing Role/Model annotation
            $hasRole = $false
            for ($j = 1; $j -le 3; $j++) {
                if ($i + $j -lt $lines.Count -and $lines[$i + $j] -match "^### Role:") {
                    $hasRole = $true
                    break
                }
            }
            if (-not $hasRole) {
                # Find right insertion point (after any existing ### lines)
                $insertAt = $i + 1
                while ($insertAt -lt $lines.Count -and $lines[$insertAt] -match "^### |^# Role:|^# Model:") {
                    $insertAt++
                }
                $insertions += [PSCustomObject]@{Index=$insertAt; Text=$assignments[$pattern]; Pattern=$pattern}
                Write-Output "Will insert at line $($insertAt+1): $pattern"
            } else {
                Write-Output "Already has Role: $pattern"
            }
        }
    }
}

$insertions | Sort-Object Index -Descending | ForEach-Object {
    $lines.Insert($_.Index, $_.Text)
}

[System.IO.File]::WriteAllLines($file, $lines.ToArray())
$newCount = (Get-Content $file).Count
Write-Output "`nDA file: $newCount lines (inserted $($insertions.Count) more)"
