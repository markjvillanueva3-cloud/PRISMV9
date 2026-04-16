$in = 'h:\PRISM\state\FINDINGS.txt'
$out = 'h:\PRISM\state\KEY_FINDINGS.txt'

$content = Get-Content $in
$output = @()

$output += "PRISM STATE RESEARCH FINDINGS - $(Get-Date)"
$output += "=" * 60
$output += ""

# Get first 50 lines (task queue stats)
$output += "TASK QUEUE STATUS:"
$output += ($content | Select-Object -First 15)
$output += ""

# Find and extract SVI section
$output += "SVI METRICS:"
$sviStart = $content | Select-String -Pattern "=== SVI-compact" -AllMatches | Select-Object -First 1
if ($sviStart) {
    $sviIndex = $content.IndexOf($sviStart.Line)
    $sviLines = $content | Select-Object -Skip ($sviIndex + 1) | Select-Object -First 20
    $output += $sviLines
}
$output += ""

# Find and extract CLAUDE.md section
$output += "CLAUDE.MD INFO:"
$claudeStart = $content | Select-String -Pattern "=== CLAUDE.md" -AllMatches | Select-Object -First 1
if ($claudeStart) {
    $claudeIndex = $content.IndexOf($claudeStart.Line)
    $claudeLines = $content | Select-Object -Skip ($claudeIndex + 1) | Select-Object -First 15
    $output += $claudeLines
}
$output += ""

# Find and extract roadmap section
$output += "ROADMAP COLLABORATION STATE:"
$roadmapStart = $content | Select-String -Pattern "=== ROADMAP" -AllMatches | Select-Object -First 1
if ($roadmapStart) {
    $roadmapIndex = $content.IndexOf($roadmapStart.Line)
    $roadmapLines = $content | Select-Object -Skip ($roadmapIndex + 1) | Select-Object -First 20
    $output += $roadmapLines
}

$output | Out-File $out -Encoding UTF8
Write-Host "Extraction written to $out"
(Get-Item $out).Length
