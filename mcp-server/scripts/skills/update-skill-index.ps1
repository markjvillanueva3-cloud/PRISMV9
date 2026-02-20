<#
.SYNOPSIS
  update-skill-index.ps1 — Scans skill directories and updates SKILL_INDEX.json
.DESCRIPTION
  Reads SKILL.md files, extracts metadata (function, triggers, domain, tags),
  and adds/updates entries in SKILL_INDEX.json. Detects duplicate triggers.
.PARAMETER SkillPath
  Path to a single skill directory, or a parent directory containing skill dirs.
.PARAMETER IndexPath
  Path to SKILL_INDEX.json. Default: C:\PRISM\skills-consolidated\SKILL_INDEX.json
.PARAMETER Batch
  If set, treats SkillPath as a parent dir and indexes all subdirs.
.EXAMPLE
  .\update-skill-index.ps1 -SkillPath "C:\PRISM\skills-consolidated\prism-unit-converter"
  .\update-skill-index.ps1 -SkillPath "C:\PRISM\skills-consolidated" -Batch
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$SkillPath,
    
    [string]$IndexPath = "C:\PRISM\skills-consolidated\SKILL_INDEX.json",
    
    [switch]$Batch,
    
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# ── Load or create index ──
if (Test-Path $IndexPath) {
    $index = Get-Content $IndexPath -Raw | ConvertFrom-Json
} else {
    $index = @{
        metadata = @{
            version = "1.0.0"; created = (Get-Date -Format "yyyy-MM-dd")
            last_updated = ""; total_skills = 0
            source_breakdown = @{ existing_atomic = 0; split_from_monolith = 0; extracted_from_course = 0; extracted_from_guide = 0 }
            avg_size_kb = 0; index_schema_version = "1.0"
        }
        skills = @()
    }
}

# Convert skills array to hashtable for fast lookup
$skillMap = @{}
foreach ($s in $index.skills) {
    $skillMap[$s.id] = $s
}

# All existing triggers for duplicate detection
$allTriggers = @{}
foreach ($s in $index.skills) {
    foreach ($t in $s.triggers) {
        if (-not $allTriggers.ContainsKey($t)) { $allTriggers[$t] = @() }
        $allTriggers[$t] += $s.id
    }
}

# ── Resolve directories to scan ──
$dirs = @()
if ($Batch) {
    $dirs = Get-ChildItem $SkillPath -Directory | Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") }
} else {
    if (Test-Path (Join-Path $SkillPath "SKILL.md")) {
        $dirs = @(Get-Item $SkillPath)
    } else {
        Write-Error "No SKILL.md found in $SkillPath"
        exit 1
    }
}

Write-Host "Scanning $($dirs.Count) skill directories..." -ForegroundColor Cyan

$added = 0; $updated = 0; $warnings = @()

foreach ($dir in $dirs) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    $content = Get-Content $skillFile -Raw
    $lines = Get-Content $skillFile
    $fileInfo = Get-Item $skillFile
    $sizeKb = [math]::Round($fileInfo.Length / 1024, 1)
    $id = $dir.Name
    
    # ── Extract frontmatter ──
    $funcDesc = ""
    $skillTriggers = @()
    $domain = "general"
    $tags = @()
    $source = "existing"
    
    # Parse YAML frontmatter if present
    if ($content -match '(?s)^---\s*\n(.+?)\n---') {
        $fm = $Matches[1]
        if ($fm -match 'description:\s*\|?\s*\n\s+(.+?)(?:\n---|\n\w)') {
            $funcDesc = ($Matches[1] -replace '\s+', ' ').Trim()
        } elseif ($fm -match 'description:\s*(.+)') {
            $funcDesc = $Matches[1].Trim()
        }
    }
    
    # Fallback: use ## PURPOSE section
    if (-not $funcDesc -and $content -match '(?s)## PURPOSE\s*\n(.+?)(?:\n---|\n##)') {
        $funcDesc = ($Matches[1] -replace '\s+', ' ').Trim()
        if ($funcDesc.Length -gt 200) { $funcDesc = $funcDesc.Substring(0, 200) + "..." }
    }
    
    # Fallback: first heading after frontmatter
    if (-not $funcDesc) {
        $firstH = $lines | Where-Object { $_ -match '^#\s+' } | Select-Object -First 1
        if ($firstH) { $funcDesc = ($firstH -replace '^#+\s*', '').Trim() }
    }
    
    # ── Extract triggers from content ──
    # Look for WHEN TO USE, Explicit Triggers, Contextual Triggers sections
    if ($content -match '(?si)WHEN TO USE[:\s]*(.+?)(?:\n##|\nFUNCTION|\nPREREQ|\nRELATED|\n---|\z)') {
        $triggerBlock = $Matches[1]
        $skillTriggers = [regex]::Matches($triggerBlock, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
    }
    if ($content -match '(?si)Explicit Triggers[:\s]*(.+?)(?:\n##|\nContextual|\n---|\z)') {
        $triggerBlock = $Matches[1]
        $skillTriggers += [regex]::Matches($triggerBlock, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
    }
    
    # Fallback: derive triggers from skill name
    if ($skillTriggers.Count -eq 0) {
        $nameParts = ($id -replace '^prism-', '') -split '-'
        $skillTriggers = @($nameParts -join ' ')
    }
    
    # ── Classify domain ──
    $domainMap = @{
        'gcode|fanuc|siemens|heidenhain|controller|post-processor' = 'cnc-programming'
        'material|physics|cutting|speed-feed|chip|thermal' = 'machining-physics'
        'safety|collision|spindle|coolant' = 'safety'
        'threading|toolpath|cam|workholding|tool-holder|tool-selector' = 'tooling'
        'session|context|memory|recovery|checkpoint' = 'session-management'
        'hook|dispatcher|orchestr|workflow' = 'system-infrastructure'
        'sp-|brainstorm|planning|review|debug|verification' = 'dev-protocol'
        'formula|equation|math|algorithm|combination' = 'calculation'
        'prompt|token|output|large-file' = 'prompt-engineering'
        'test|code-quality|code-safety|solid|design-pattern|error-handling' = 'software-engineering'
    }
    foreach ($pattern in $domainMap.Keys) {
        if ($id -match $pattern) { $domain = $domainMap[$pattern]; break }
    }
    
    # ── Extract tags from ## headers ──
    $headers = $lines | Where-Object { $_ -match '^##\s+' } | ForEach-Object { ($_ -replace '^##\s*', '').Trim().ToLower() }
    $tags = @($headers | Select-Object -First 10)
    
    # ── Detect source type ──
    if ($content -match 'SOURCE:\s*Split from') { $source = "split_from_monolith" }
    elseif ($content -match 'SOURCE:\s*Extracted from.*course') { $source = "extracted_from_course" }
    elseif ($content -match 'SOURCE:\s*Extracted from.*guide') { $source = "extracted_from_guide" }
    else { $source = "existing_atomic" }
    
    # ── Check trigger overlap ──
    foreach ($t in $skillTriggers) {
        $tLower = $t.ToLower()
        if ($allTriggers.ContainsKey($tLower)) {
            $existing = $allTriggers[$tLower] | Where-Object { $_ -ne $id }
            if ($existing.Count -gt 0) {
                $warnings += "TRIGGER OVERLAP: '$tLower' shared by [$id] and [$($existing -join ', ')]"
            }
        }
    }
    
    # ── Build entry ──
    $entry = [ordered]@{
        id = $id
        function = $funcDesc
        triggers = @($skillTriggers | ForEach-Object { $_.ToLower() } | Select-Object -Unique)
        domain = $domain
        source = $source
        size_kb = $sizeKb
        line_count = $lines.Count
        prism_phases = @()
        related = @()
        tags = @($tags | Select-Object -Unique)
        path = "skills-consolidated/$id/SKILL.md"
    }
    
    # ── Add or update ──
    if ($skillMap.ContainsKey($id)) {
        $updated++
    } else {
        $added++
    }
    $skillMap[$id] = $entry
    
    # Update trigger map
    foreach ($t in $entry.triggers) {
        if (-not $allTriggers.ContainsKey($t)) { $allTriggers[$t] = @() }
        if ($allTriggers[$t] -notcontains $id) { $allTriggers[$t] += $id }
    }
}

# ── Rebuild index ──
$allSkills = $skillMap.Values | Sort-Object { $_.id }
$totalSize = 0
foreach ($s in $allSkills) { $totalSize += $s.size_kb }
$avgSize = if ($allSkills.Count -gt 0) { [math]::Round($totalSize / $allSkills.Count, 1) } else { 0 }

# Count sources
$srcBreakdown = @{ existing_atomic = 0; split_from_monolith = 0; extracted_from_course = 0; extracted_from_guide = 0 }
foreach ($s in $allSkills) {
    $key = $s.source
    if ($srcBreakdown.ContainsKey($key)) { $srcBreakdown[$key]++ }
    else { $srcBreakdown["existing_atomic"]++ }
}

$newIndex = [ordered]@{
    '$schema' = "PRISM Skill Index v1.0"
    metadata = [ordered]@{
        version = "1.0.0"
        created = $index.metadata.created
        last_updated = (Get-Date -Format "yyyy-MM-dd")
        total_skills = $allSkills.Count
        source_breakdown = $srcBreakdown
        avg_size_kb = $avgSize
        index_schema_version = "1.0"
    }
    skills = @($allSkills)
}

if ($DryRun) {
    Write-Host "`n=== DRY RUN ===" -ForegroundColor Yellow
    Write-Host "Would add $added, update $updated skills. Total: $($allSkills.Count)" -ForegroundColor Yellow
} else {
    $json = $newIndex | ConvertTo-Json -Depth 10
    Set-Content -Path $IndexPath -Value $json -Encoding UTF8
    Write-Host "`n=== INDEX UPDATED ===" -ForegroundColor Green
    Write-Host "Added: $added | Updated: $updated | Total: $($allSkills.Count)" -ForegroundColor Green
    Write-Host "Avg size: ${avgSize}KB | Index: $IndexPath" -ForegroundColor Green
}

if ($warnings.Count -gt 0) {
    Write-Host "`n=== WARNINGS ===" -ForegroundColor Yellow
    foreach ($w in $warnings) { Write-Host "  $w" -ForegroundColor Yellow }
}

Write-Host "`nSource breakdown:" -ForegroundColor Cyan
foreach ($k in $srcBreakdown.Keys) { Write-Host "  $k : $($srcBreakdown[$k])" }
