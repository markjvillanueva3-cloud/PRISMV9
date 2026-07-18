# split-skill.ps1 - Analyze monolithic skill and propose atomic splits
# Usage: .\split-skill.ps1 -SkillPath <path-to-skill-dir>
param(
    [Parameter(Mandatory=$true)]
    [string]$SkillPath,
    [int]$MaxSizeKB = 5,
    [switch]$ShowDetails
)

$skillMd = Join-Path $SkillPath "SKILL.md"
if (-not (Test-Path $skillMd)) {
    Write-Host "❌ SKILL.md not found at: $skillMd" -ForegroundColor Red
    exit 1
}

$content = Get-Content $skillMd -Raw
$lines = Get-Content $skillMd
$totalSize = [math]::Round((Get-Item $skillMd).Length / 1024, 1)
$skillName = Split-Path $SkillPath -Leaf

Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SKILL SPLIT ANALYSIS: $skillName" -ForegroundColor Cyan
Write-Host "  Size: ${totalSize}KB | Lines: $($lines.Count)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

# Parse sections by ## headers
$sections = @()
$currentSection = $null
$currentLines = @()
$headerPattern = '^##\s+(.+)'

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -match $headerPattern) {
        if ($currentSection) {
            $sectionContent = $currentLines -join "`n"
            $sectionSize = [math]::Round(([System.Text.Encoding]::UTF8.GetByteCount($sectionContent)) / 1024, 1)
            $sections += @{
                title = $currentSection
                start_line = $currentStart
                end_line = $i - 1
                line_count = $i - $currentStart
                size_kb = $sectionSize
                content_preview = ($currentLines | Select-Object -First 3) -join " "
            }
        }
        $currentSection = $Matches[1].Trim()
        $currentStart = $i
        $currentLines = @($line)
    } elseif ($currentSection) {
        $currentLines += $line
    }
}

# Capture last section
if ($currentSection) {
    $sectionContent = $currentLines -join "`n"
    $sectionSize = [math]::Round(([System.Text.Encoding]::UTF8.GetByteCount($sectionContent)) / 1024, 1)
    $sections += @{
        title = $currentSection
        start_line = $currentStart
        end_line = $lines.Count - 1
        line_count = $lines.Count - $currentStart
        size_kb = $sectionSize
        content_preview = ($currentLines | Select-Object -First 3) -join " "
    }
}

Write-Host "`nFound $($sections.Count) sections:" -ForegroundColor Yellow

# Generate split proposals
$proposals = @()
$proposalNum = 0
$baseName = $skillName -replace '^prism-', ''

foreach ($section in $sections) {
    $title = $section.title
    # Clean title for use as skill ID
    $cleanTitle = $title.ToLower() -replace '[^a-z0-9\s-]', '' -replace '\s+', '-' -replace '-+', '-' -replace '^-|-$', ''
    $cleanTitle = $cleanTitle.Substring(0, [math]::Min($cleanTitle.Length, 40))
    
    if ($section.size_kb -le $MaxSizeKB) {
        # Section fits as single atomic skill
        $proposalNum++
        $proposals += @{
            num = $proposalNum
            proposed_id = "prism-$baseName-$cleanTitle"
            source_section = $title
            estimated_kb = $section.size_kb
            lines = $section.line_count
            action = "EXTRACT"
            notes = ""
        }
    } else {
        # Section too large - needs sub-splitting by ### headers
        $proposalNum++
        $proposals += @{
            num = $proposalNum
            proposed_id = "prism-$baseName-$cleanTitle"
            source_section = $title
            estimated_kb = $section.size_kb
            lines = $section.line_count
            action = "EXTRACT+SUBSPLIT"
            notes = "Over ${MaxSizeKB}KB - check for ### sub-sections"
        }
    }
}

# Filter out TOC/metadata sections
$skipPatterns = @('table of contents', 'toc', 'version history', 'changelog', 'index')
$proposals = $proposals | Where-Object { 
    $skip = $false
    foreach ($p in $skipPatterns) {
        if ($_.source_section -match $p) { $skip = $true; break }
    }
    -not $skip
}

# Output results
Write-Host "`n$('─' * 80)" -ForegroundColor Gray
Write-Host "  SPLIT PROPOSALS ($($proposals.Count) atomic skills)" -ForegroundColor Green
Write-Host "$('─' * 80)" -ForegroundColor Gray

$totalProposedKB = 0
foreach ($p in $proposals) {
    $actionColor = if ($p.action -eq "EXTRACT") { "Green" } else { "Yellow" }
    $sizeWarn = if ($p.estimated_kb -gt $MaxSizeKB) { " ⚠️" } else { " ✅" }
    Write-Host ("{0,3}. {1,-50} {2,5}KB {3,4}L [{4}]{5}" -f $p.num, $p.proposed_id.Substring(0,[math]::Min($p.proposed_id.Length,50)), $p.estimated_kb, $p.lines, $p.action, $sizeWarn) -ForegroundColor $actionColor
    if ($p.notes -and $ShowDetails) { Write-Host "      → $($p.notes)" -ForegroundColor DarkGray }
    $totalProposedKB += $p.estimated_kb
}

Write-Host "`n$('─' * 80)" -ForegroundColor Gray
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "  Original: ${totalSize}KB → $($proposals.Count) skills, ~${totalProposedKB}KB total" -ForegroundColor Cyan
$underLimit = ($proposals | Where-Object { $_.estimated_kb -le $MaxSizeKB }).Count
$overLimit = ($proposals | Where-Object { $_.estimated_kb -gt $MaxSizeKB }).Count
Write-Host "  ≤${MaxSizeKB}KB: $underLimit | >${MaxSizeKB}KB (needs sub-split): $overLimit" -ForegroundColor Cyan
Write-Host "$('─' * 80)" -ForegroundColor Gray

# Output as JSON for programmatic use
$outputPath = Join-Path $SkillPath "SPLIT_PROPOSALS.json"
$json = $proposals | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($outputPath, $json, [System.Text.Encoding]::UTF8)
Write-Host "`nProposals saved to: $outputPath" -ForegroundColor Green
