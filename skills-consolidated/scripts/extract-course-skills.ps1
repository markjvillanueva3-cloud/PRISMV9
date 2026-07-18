# extract-course-skills.ps1 - Extract skills from MIT OCW course directories
# Usage: .\extract-course-skills.ps1 -CoursePath <path> [-OutputDir <path>]
param(
    [Parameter(Mandatory=$true)]
    [string]$CoursePath,
    [string]$OutputDir = "C:\PRISM\skills-consolidated",
    [switch]$FromZip
)

# Handle zip extraction if needed
$tempDir = $null
if ($FromZip -or $CoursePath -match '\.zip$') {
    $tempDir = Join-Path $env:TEMP "prism-course-$(Get-Random)"
    Write-Host "Extracting ZIP to temp..." -ForegroundColor Yellow
    Expand-Archive -Path $CoursePath -DestinationPath $tempDir -Force
    $CoursePath = $tempDir
    # Find the actual course root (may be nested)
    $nested = Get-ChildItem $tempDir -Directory | Select-Object -First 1
    if ($nested) { $CoursePath = $nested.FullName }
}

$courseName = Split-Path $CoursePath -Leaf
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  COURSE SKILL EXTRACTION: $courseName" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

# Find content files
$contentFiles = @()
$extensions = @('*.htm', '*.html', '*.txt', '*.md', '*.pdf')
foreach ($ext in $extensions) {
    $contentFiles += Get-ChildItem $CoursePath -Recurse -Filter $ext -ErrorAction SilentlyContinue
}

Write-Host "Found $($contentFiles.Count) content files" -ForegroundColor Yellow

# Look for syllabus, content map, or lecture index
$syllabusPatterns = @('syllabus*', 'index*', 'content*', 'calendar*', 'schedule*', 'overview*')
$syllabusFiles = @()
foreach ($sp in $syllabusPatterns) {
    $syllabusFiles += Get-ChildItem $CoursePath -Recurse -Filter $sp -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -match '\.(htm|html|txt|md)$' }
}

# Parse lecture/topic structure from content files
$topics = @()
$lecturePattern = '(?i)(lecture|topic|module|chapter|unit|session|week)\s*(\d+)[:\s-]*(.+)'
$sectionPattern = '(?i)<h[23][^>]*>(.+?)</h[23]>'

foreach ($file in $contentFiles) {
    try {
        $text = Get-Content $file.FullName -Raw -ErrorAction Stop
        
        # Extract from HTML headers
        $htmlMatches = [regex]::Matches($text, $sectionPattern)
        foreach ($m in $htmlMatches) {
            $title = $m.Groups[1].Value -replace '<[^>]+>', '' -replace '&\w+;', '' 
            $title = $title.Trim()
            if ($title.Length -gt 5 -and $title.Length -lt 200) {
                $topics += @{
                    title = $title
                    source_file = $file.Name
                    source_path = $file.FullName
                    type = "html_header"
                }
            }
        }
        
        # Extract from lecture patterns
        $lectureMatches = [regex]::Matches($text, $lecturePattern)
        foreach ($m in $lectureMatches) {
            $title = "$($m.Groups[1].Value) $($m.Groups[2].Value): $($m.Groups[3].Value)" -replace '<[^>]+>', ''
            $topics += @{
                title = $title.Trim()
                source_file = $file.Name
                source_path = $file.FullName
                type = "lecture_pattern"
            }
        }
    } catch {
        if ($VerbosePreference -eq 'Continue') { Write-Host "  Skip: $($file.Name)" -ForegroundColor DarkGray }
    }
}

# Deduplicate topics by normalized title
$seen = @{}
$uniqueTopics = @()
foreach ($t in $topics) {
    $normalized = $t.title.ToLower() -replace '[^a-z0-9]', ''
    if (-not $seen.ContainsKey($normalized) -and $normalized.Length -gt 5) {
        $seen[$normalized] = $true
        $uniqueTopics += $t
    }
}

Write-Host "Extracted $($uniqueTopics.Count) unique topics from $($contentFiles.Count) files" -ForegroundColor Yellow

# Generate skill proposals
$proposals = @()
$courseId = $courseName -replace '[^a-zA-Z0-9.-]', '-' -replace '-+', '-'
$num = 0

foreach ($topic in $uniqueTopics) {
    $num++
    $cleanTitle = $topic.title.ToLower() -replace '[^a-z0-9\s-]', '' -replace '\s+', '-' -replace '-+', '-'
    $cleanTitle = $cleanTitle.Substring(0, [math]::Min($cleanTitle.Length, 40))
    
    $proposals += @{
        num = $num
        proposed_id = "prism-course-$courseId-$cleanTitle"
        topic_title = $topic.title
        source_file = $topic.source_file
        source_course = $courseName
        extraction_type = $topic.type
        action = "CREATE_SKILL"
        notes = "Needs content extraction from source file"
    }
}

# Output results
Write-Host "`n$('─' * 80)" -ForegroundColor Gray
Write-Host "  SKILL PROPOSALS ($($proposals.Count) skills from $courseName)" -ForegroundColor Green
Write-Host "$('─' * 80)" -ForegroundColor Gray

foreach ($p in $proposals) {
    Write-Host ("{0,3}. {1}" -f $p.num, $p.topic_title) -ForegroundColor Green
    Write-Host ("     → {0} (from {1})" -f $p.proposed_id, $p.source_file) -ForegroundColor DarkGray
}

Write-Host "`n$('─' * 80)" -ForegroundColor Gray
Write-Host "  SUMMARY: $($proposals.Count) proposed skills from $courseName" -ForegroundColor Cyan
Write-Host "  Source files scanned: $($contentFiles.Count)" -ForegroundColor Cyan
Write-Host "  Syllabus files found: $($syllabusFiles.Count)" -ForegroundColor Cyan
Write-Host "$('─' * 80)" -ForegroundColor Gray

# Save proposals
$outputPath = Join-Path $CoursePath "COURSE_SKILL_PROPOSALS.json"
$proposals | ConvertTo-Json -Depth 5 | Set-Content $outputPath -Encoding UTF8
Write-Host "`nProposals saved to: $outputPath" -ForegroundColor Green

# Cleanup temp dir
if ($tempDir -and (Test-Path $tempDir)) {
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Temp directory cleaned up." -ForegroundColor DarkGray
}
