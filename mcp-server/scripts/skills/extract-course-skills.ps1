<#
.SYNOPSIS
  extract-course-skills.ps1 — Extracts skill proposals from MIT OCW course directories
.DESCRIPTION
  Scans extracted course content for syllabi, lecture notes, and content maps.
  Identifies discrete topics/functions and proposes atomic skills.
  Handles both extracted directories and zip files.
.PARAMETER CoursePath
  Path to a course directory or zip file
.PARAMETER OutputPath
  Where to write the extraction proposal JSON
.PARAMETER TempDir
  Temp directory for zip extraction. Default: $env:TEMP\prism-course-extract
.EXAMPLE
  .\extract-course-skills.ps1 -CoursePath "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\2.830j"
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$CoursePath,
    
    [string]$OutputPath = "",
    
    [string]$TempDir = "$env:TEMP\prism-course-extract"
)

$ErrorActionPreference = "Stop"

# ── Handle zip files ──
$isZip = $CoursePath -match '\.zip$'
$workDir = $CoursePath

if ($isZip) {
    if (-not (Test-Path $CoursePath)) { Write-Error "Zip not found: $CoursePath"; exit 1 }
    $zipName = [System.IO.Path]::GetFileNameWithoutExtension($CoursePath)
    $workDir = Join-Path $TempDir $zipName
    if (Test-Path $workDir) { Remove-Item $workDir -Recurse -Force }
    Write-Host "Extracting $zipName..." -ForegroundColor Cyan
    Expand-Archive -Path $CoursePath -DestinationPath $workDir -Force
}

if (-not (Test-Path $workDir)) { Write-Error "Directory not found: $workDir"; exit 1 }

$courseName = (Get-Item $workDir).Name
Write-Host "=== COURSE SKILL EXTRACTION ===" -ForegroundColor Cyan
Write-Host "Course: $courseName" -ForegroundColor Cyan
Write-Host "Path: $workDir" -ForegroundColor DarkGray

# ── Scan for content files ──
$allFiles = Get-ChildItem $workDir -Recurse -File -ErrorAction SilentlyContinue
$textFiles = $allFiles | Where-Object { $_.Extension -match '\.(txt|md|htm|html|py|m|tex|pdf)$' }
$totalFiles = $allFiles.Count
$totalSizeMb = [math]::Round(($allFiles | Measure-Object -Property Length -Sum).Sum / 1MB, 1)

Write-Host "Files: $totalFiles ($totalSizeMb MB)" -ForegroundColor DarkGray

# ── Find syllabus / content map ──
$syllabusFiles = $allFiles | Where-Object { $_.Name -match 'syllabus|content|index|overview|readme' -and $_.Extension -match '\.(txt|md|htm|html)$' }
$lectureFiles = $allFiles | Where-Object { $_.FullName -match 'lecture|lec|notes' -and $_.Extension -match '\.(txt|md|htm|html|pdf)$' }
$assignmentFiles = $allFiles | Where-Object { $_.FullName -match 'assignment|problem|pset|hw|homework' }
$labFiles = $allFiles | Where-Object { $_.FullName -match 'lab|experiment' }

Write-Host "Syllabus/index files: $($syllabusFiles.Count)" -ForegroundColor DarkGray
Write-Host "Lecture files: $($lectureFiles.Count)" -ForegroundColor DarkGray
Write-Host "Assignment files: $($assignmentFiles.Count)" -ForegroundColor DarkGray

# ── Extract topics from content ──
$topics = @()

# Strategy 1: Parse syllabus/index HTML for topic lists
foreach ($sf in $syllabusFiles) {
    try {
        $syllabusContent = Get-Content $sf.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $syllabusContent) { continue }
        
        # Extract topics from HTML lists, headings, table rows
        $h2matches = [regex]::Matches($syllabusContent, '<h[23][^>]*>([^<]+)</h[23]>')
        foreach ($m in $h2matches) {
            $topic = $m.Groups[1].Value.Trim() -replace '&amp;', '&' -replace '&#\d+;', '' -replace '&\w+;', '' -replace '\s+', ' ' -replace '\u2013|\u2014', '-'
            if ($topic.Length -gt 5 -and $topic -notmatch 'navigation|menu|footer|header|copyright') {
                $topics += [ordered]@{ title = $topic; source = $sf.Name; type = "heading" }
            }
        }
        
        # Extract from table cells (common in OCW syllabi)
        $tdMatches = [regex]::Matches($syllabusContent, '<td[^>]*>([^<]{10,100})</td>')
        foreach ($m in $tdMatches) {
            $topic = $m.Groups[1].Value.Trim() -replace '&amp;', '&' -replace '&#\d+;', '' -replace '&\w+;', '' -replace '\s+', ' ' -replace '\u2013|\u2014', '-'
            if ($topic -match 'lecture|topic|module|chapter|week' -or $topic.Length -gt 20) {
                $topics += [ordered]@{ title = $topic; source = $sf.Name; type = "table" }
            }
        }
    } catch { continue }
}

# Strategy 2: Use lecture filenames as topics
foreach ($lf in $lectureFiles) {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($lf.Name)
    $cleanName = $name -replace '_', ' ' -replace '-', ' ' -replace 'lec\d+', '' -replace '^\d+\s*', ''
    if ($cleanName.Length -gt 3) {
        $topics += [ordered]@{ title = $cleanName.Trim(); source = $lf.Name; type = "filename" }
    }
}

# Strategy 3: Scan directory names for topic structure
$subDirs = Get-ChildItem $workDir -Directory -Recurse -ErrorAction SilentlyContinue
foreach ($d in $subDirs) {
    $dirName = $d.Name -replace '_', ' ' -replace '-', ' '
    # Skip hash-named dirs, static dirs, and very short names
    if ($d.Name -match '^[a-z0-9]{8,}$' -or $d.Name -match '^(static|resources|download|pages|css|js|fonts|images)') { continue }
    if ($dirName -match 'lecture|module|unit|chapter|topic|week' -or $dirName -match '^\d+\s+\w{4,}') {
        $topics += [ordered]@{ title = $dirName.Trim(); source = "directory: $($d.Name)"; type = "directory" }
    }
}

# ── Deduplicate and generate proposals ──
# Priority: heading > table > filename > directory (so best titles win dedup)
$typePriority = @{ 'heading' = 1; 'table' = 2; 'filename' = 3; 'directory' = 4 }
$topics = $topics | Sort-Object { if ($typePriority.ContainsKey($_.type)) { $typePriority[$_.type] } else { 5 } }

$seen = @{}
$proposals = @()
$courseId = $courseName -replace '[\.\s]', '-' -replace '[^a-zA-Z0-9-]', ''

# ── Noise filters ──
$noisePatterns = @(
    '^\d+\.?(jpg|jpeg|png|gif|pdf|xls|xlsx|csv|zip|srt|vtt|css|js|jmp)$',  # file extensions
    '^[a-f0-9]{20,}',                                                        # hash strings
    '^\d+\s*(jpg|xls|pdf)',                                                   # "10.jpg" style
    '^(course info|study materials|readings|syllabus|calendar|exams?)$',       # navigation
    '^(course meeting times|prerequisites|required text|reference texts|grading)$',
    '^(3play|caption|pdf file)',                                               # media artifacts
    '^\d+$',                                                                  # bare numbers
    '^(index|video.galleries|lecture notes|lecture videos|lecture slides)$',    # section nav
    'assignment\s*\d+\s*due',                                                 # "assignment 3 due..."
    '^\w{1,3}\d+\w*\s+(jpg|pdf|xls)',                                        # resource filenames
    '^(ps|sol|q[12])\d',                                                      # problem sets, solutions
    '^sample_',                                                                # sample files
    '^(tungsten|kurtosis|ieee_template|hardt_siu|dof|variancecomponents)',     # specific data files
    '(\.pdf|\.xls|\.jmp|\.zip|\.jpg|\.png)$',                                # trailing extensions
    '^[a-f0-9]{10,}\s+lecture',                                               # hash+lecture combos
    '^\d+\s*:\s*$',                                                           # "10: " with no title
    '^(project presentations|final project)\s*\d*$',                          # generic project entries
    '^\d+\s+[a-f0-9]{5,}',                                                   # "2 830js08 th" hash-like
    '^(assignments?|introduction|control lab video)$',                         # too generic standalone
    '-th\.jpg',                                                               # thumbnail refs
    '^\d+-\d+[a-z]+\d+',                                                    # course-number style "2-830js08"
    '^\d+\s+\d+[a-z]+\d+'                                                    # space variant "2 830js08"
)
$noiseRegex = ($noisePatterns -join '|')

foreach ($t in $topics) {
    # Clean HTML entities in title
    $t.title = $t.title -replace '&ldquo;|&rdquo;', '"' -replace '&lsquo;|&rsquo;', "'" -replace '&mdash;|&ndash;|–|—', '-' -replace '&\w+;', '' -replace '\s+', ' '
    
    # Normalize for dedup: strip leading "N:" or "N " prefix, lowercase, alpha-only
    $key = $t.title.ToLower() -replace '^\d+[:\s]+', '' -replace '[^a-z0-9\s]', '' -replace '\s+', ' '
    if ($key.Length -lt 6) { continue }
    if ($seen.ContainsKey($key)) { continue }
    
    # Apply noise filter
    $titleLower = $t.title.ToLower().Trim()
    if ($titleLower -match $noiseRegex) { continue }
    # Skip if title is mostly digits/hashes
    $alphaOnly = $titleLower -replace '[^a-z]', ''
    if ($alphaOnly.Length -lt 4) { continue }
    
    $seen[$key] = $true
    
    # Generate skill ID
    $atomicName = $key -replace '\s+', '-'
    if ($atomicName.Length -gt 40) { $atomicName = $atomicName.Substring(0, 40) -replace '-$', '' }
    $fullId = "prism-course-$courseId-$atomicName"
    
    $proposals += [ordered]@{
        proposed_id = $fullId
        topic = $t.title
        source_file = $t.source
        source_type = $t.type
        course = $courseName
        estimated_size_kb = "TBD"
        notes = "Requires content extraction from source material"
    }
}

Write-Host "`nFound $($topics.Count) raw topics, $($proposals.Count) unique proposals" -ForegroundColor Green

# ── Summary by source type ──
$byType = $proposals | Group-Object { $_.source_type }
foreach ($g in $byType) {
    Write-Host "  $($g.Name): $($g.Count) topics" -ForegroundColor DarkGray
}

# Display proposals
Write-Host "`n=== PROPOSED SKILLS ===" -ForegroundColor Green
$i = 0
foreach ($p in $proposals) {
    $i++
    Write-Host ("  {0,3}. {1}" -f $i, $p.topic) -ForegroundColor White
}

# ── Write proposal file ──
if (-not $OutputPath) { $OutputPath = Join-Path $workDir "COURSE_SKILL_PROPOSAL.json" }

$output = [ordered]@{
    course = $courseName
    source_path = $CoursePath
    analysis_date = (Get-Date -Format "yyyy-MM-dd")
    total_files = $totalFiles
    total_size_mb = $totalSizeMb
    lecture_files = $lectureFiles.Count
    raw_topics = $topics.Count
    unique_proposals = $proposals.Count
    proposals = $proposals
}

$json = $output | ConvertTo-Json -Depth 10
Set-Content -Path $OutputPath -Value $json -Encoding UTF8
Write-Host "`nProposal written to: $OutputPath" -ForegroundColor Green

# ── Cleanup temp if zip ──
if ($isZip -and (Test-Path $workDir)) {
    Remove-Item $workDir -Recurse -Force
    Write-Host "Cleaned up temp directory" -ForegroundColor DarkGray
}
