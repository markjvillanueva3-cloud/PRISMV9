$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

Write-Output "=== FILE SIZES ==="
foreach ($f in @("PRISM_RECOVERY_CARD.md","PRISM_PROTOCOLS_CORE.md","PRISM_MASTER_INDEX.md","PHASE_DA_DEV_ACCELERATION.md","HIERARCHICAL_INDEX_SPEC.md","ROADMAP_SECTION_INDEX.md")) {
    $path = Join-Path $dir $f
    if (Test-Path $path) {
        $info = Get-Item $path
        Write-Output "$f : $($info.Length) bytes, modified $($info.LastWriteTime)"
    } else {
        Write-Output "$f : MISSING"
    }
}

Write-Output ""
Write-Output "=== KNOWLEDGE DIR ==="
if (Test-Path "C:\PRISM\knowledge") {
    Get-ChildItem "C:\PRISM\knowledge" -Recurse | ForEach-Object { Write-Output $_.FullName }
} else {
    Write-Output "C:\PRISM\knowledge : MISSING"
}

Write-Output ""
Write-Output "=== SCRIPTS DIR ==="
if (Test-Path "C:\PRISM\mcp-server\scripts\roadmap") {
    Get-ChildItem "C:\PRISM\mcp-server\scripts\roadmap" | ForEach-Object { Write-Output $_.FullName }
} else {
    Write-Output "C:\PRISM\mcp-server\scripts\roadmap : MISSING"
}

Write-Output ""
Write-Output "=== KNOWLEDGE EXTRACTION IN PROTOCOLS_CORE ==="
$hits = Select-String -Path (Join-Path $dir "PRISM_PROTOCOLS_CORE.md") -Pattern "KNOWLEDGE EXTRACTION|SESSION_KNOWLEDGE|knowledge_store"
foreach ($h in $hits) { Write-Output "$($h.LineNumber): $($h.Line.Trim().Substring(0, [Math]::Min(80, $h.Line.Trim().Length)))" }

Write-Output ""
Write-Output "=== RECOVERY CARD KNOWLEDGE STEP ==="
$hits = Select-String -Path (Join-Path $dir "PRISM_RECOVERY_CARD.md") -Pattern "knowledge|KNOWLEDGE|STEP 1.5|STEP 1.7"
foreach ($h in $hits) { Write-Output "$($h.LineNumber): $($h.Line.Trim().Substring(0, [Math]::Min(80, $h.Line.Trim().Length)))" }

Write-Output ""
Write-Output "=== MASTER_INDEX CHANGES ==="
$hits = Select-String -Path (Join-Path $dir "PRISM_MASTER_INDEX.md") -Pattern "DA-MS5|DA-MS6|DA-MS7|DA-MS8|knowledge|KNOWLEDGE|hierarchical"
foreach ($h in $hits) { Write-Output "$($h.LineNumber): $($h.Line.Trim().Substring(0, [Math]::Min(80, $h.Line.Trim().Length)))" }
