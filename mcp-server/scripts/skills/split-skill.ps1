<#
.SYNOPSIS
  split-skill.ps1 — Analyzes a monolithic skill and proposes atomic splits
.DESCRIPTION
  Parses ## headers in a SKILL.md, identifies discrete functions,
  and proposes single-function skill splits. Does NOT auto-create files.
.PARAMETER SkillPath
  Path to the monolithic skill directory (must contain SKILL.md)
.PARAMETER OutputPath
  Where to write the split proposal JSON. Default: same dir as skill.
.PARAMETER MaxSizeKb
  Target max size per atomic skill. Default: 5
.EXAMPLE
  .\split-skill.ps1 -SkillPath "C:\PRISM\skills-consolidated\prism-gcode-reference"
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$SkillPath,
    
    [string]$OutputPath = "",
    
    [int]$MaxSizeKb = 5,
    
    [switch]$Execute
)

$ErrorActionPreference = "Stop"
$skillFile = Join-Path $SkillPath "SKILL.md"
if (-not (Test-Path $skillFile)) { Write-Error "No SKILL.md in $SkillPath"; exit 1 }

$content = Get-Content $skillFile -Raw
$lines = Get-Content $skillFile
$fileInfo = Get-Item $skillFile
$totalKb = [math]::Round($fileInfo.Length / 1024, 1)
$skillName = (Get-Item $SkillPath).Name

Write-Host "=== SKILL SPLIT ANALYSIS ===" -ForegroundColor Cyan
Write-Host "Skill: $skillName ($totalKb KB, $($lines.Count) lines)" -ForegroundColor Cyan
Write-Host ""

# ── Parse sections by ## headers ──
$sections = @()
$currentSection = $null
$currentLines = @()
$lineNum = 0
$inFrontmatter = $false
$frontmatterDone = $false

foreach ($line in $lines) {
    $lineNum++
    
    # Skip frontmatter
    if ($lineNum -eq 1 -and $line -match '^---') { $inFrontmatter = $true; continue }
    if ($inFrontmatter) {
        if ($line -match '^---') { $inFrontmatter = $false; $frontmatterDone = $true }
        continue
    }
    
    # Detect ## headers (section boundaries)
    if ($line -match '^##\s+(.+)') {
        # Save previous section
        if ($currentSection) {
            $sectionContent = $currentLines -join "`n"
            $sizeKb = [math]::Round(([System.Text.Encoding]::UTF8.GetByteCount($sectionContent)) / 1024, 1)
            $sections += [ordered]@{
                title = $currentSection
                start_line = $currentStart
                end_line = $lineNum - 1
                line_count = $currentLines.Count
                size_kb = $sizeKb
                content_preview = if ($currentLines.Count -gt 3) { ($currentLines[0..2] -join " ").Substring(0, [math]::Min(200, ($currentLines[0..2] -join " ").Length)) } else { $currentLines -join " " }
            }
        }
        $currentSection = $Matches[1].Trim()
        $currentStart = $lineNum
        $currentLines = @()
    } else {
        $currentLines += $line
    }
}

# Save last section
if ($currentSection) {
    $sectionContent = $currentLines -join "`n"
    $sizeKb = [math]::Round(([System.Text.Encoding]::UTF8.GetByteCount($sectionContent)) / 1024, 1)
    $sections += [ordered]@{
        title = $currentSection
        start_line = $currentStart
        end_line = $lineNum
        line_count = $currentLines.Count
        size_kb = $sizeKb
        content_preview = if ($currentLines.Count -gt 3) { ($currentLines[0..2] -join " ").Substring(0, [math]::Min(200, ($currentLines[0..2] -join " ").Length)) } else { $currentLines -join " " }
    }
}

Write-Host "Found $($sections.Count) sections:" -ForegroundColor Green

# ── Generate proposals ──
$proposals = @()
$baseId = $skillName -replace '^prism-', ''

foreach ($sec in $sections) {
    # Skip TOC, intro, overview sections (usually not standalone functions)
    $skipPatterns = @('TABLE OF CONTENTS', 'OVERVIEW', 'INTRODUCTION', 'PART \d', 'Quick Conversion')
    $skip = $false
    foreach ($p in $skipPatterns) {
        if ($sec.title -match $p) { $skip = $true; break }
    }
    
    # Generate atomic skill name from section title
    $atomicName = $sec.title.ToLower() -replace '[^a-z0-9\s-]', '' -replace '\s+', '-'
    $atomicName = $atomicName -replace '-+', '-' -replace '^-|-$', ''
    if ($atomicName.Length -gt 50) { $atomicName = $atomicName.Substring(0, 50) -replace '-$', '' }
    $fullId = "prism-$baseId-$atomicName"
    
    $proposal = [ordered]@{
        proposed_id = $fullId
        source_section = $sec.title
        source_lines = "$($sec.start_line)-$($sec.end_line)"
        estimated_size_kb = $sec.size_kb
        line_count = $sec.line_count
        skip_reason = if ($skip) { "meta-section (TOC/overview)" } else { $null }
        needs_further_split = ($sec.size_kb -gt $MaxSizeKb)
        content_preview = $sec.content_preview
    }
    $proposals += $proposal
    
    $status = if ($skip) { "SKIP" } elseif ($sec.size_kb -gt $MaxSizeKb) { "LARGE" } else { "OK" }
    $color = switch ($status) { "SKIP" { "DarkGray" } "LARGE" { "Yellow" } default { "Green" } }
    Write-Host ("  [{0,4}] {1,-50} {2,5}KB {3,4} lines" -f $status, $sec.title.Substring(0, [math]::Min(50, $sec.title.Length)), $sec.size_kb, $sec.line_count) -ForegroundColor $color
}

$actionable = $proposals | Where-Object { -not $_.skip_reason }
$oversized = $proposals | Where-Object { $_.needs_further_split -and -not $_.skip_reason }

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Total sections: $($sections.Count)"
Write-Host "Proposed atomic skills: $($actionable.Count)"
Write-Host "Already right-sized (<=5KB): $(($actionable | Where-Object { -not $_.needs_further_split }).Count)"
Write-Host "Need further splitting (>5KB): $($oversized.Count)"
Write-Host "Skipped (meta sections): $(($proposals | Where-Object { $_.skip_reason }).Count)"

# ── Write proposal file ──
if (-not $OutputPath) { $OutputPath = Join-Path $SkillPath "SPLIT_PROPOSAL.json" }

$output = [ordered]@{
    source_skill = $skillName
    source_size_kb = $totalKb
    source_lines = $lines.Count
    analysis_date = (Get-Date -Format "yyyy-MM-dd")
    max_target_kb = $MaxSizeKb
    total_sections = $sections.Count
    proposed_skills = $actionable.Count
    proposals = $proposals
}

$json = $output | ConvertTo-Json -Depth 10
Set-Content -Path $OutputPath -Value $json -Encoding UTF8
Write-Host "`nProposal written to: $OutputPath" -ForegroundColor Green

# ── Execute mode: create skill directories ──
if ($Execute) {
    Write-Host "`n=== EXECUTING SPLITS ===" -ForegroundColor Magenta
    $skillBase = Split-Path $SkillPath -Parent
    $created = 0
    
    foreach ($p in ($proposals | Where-Object { -not $_.skip_reason })) {
        $newDir = Join-Path $skillBase $p.proposed_id
        if (Test-Path $newDir) {
            Write-Host "  EXISTS: $($p.proposed_id)" -ForegroundColor Yellow
            continue
        }
        
        # Extract section content from source
        $startLine = [int]($p.source_lines -split '-')[0] - 1
        $endLine = [int]($p.source_lines -split '-')[1] - 1
        $sectionLines = $lines[$startLine..$endLine]
        
        # Create atomic SKILL.md
        $skillContent = @"
---
name: $($p.proposed_id)
description: $($p.source_section)
---
# $($p.source_section)
WHEN TO USE: Query involves $($p.source_section.ToLower())
SOURCE: Split from $skillName, section "$($p.source_section)"

$($sectionLines -join "`n")
"@
        New-Item -ItemType Directory -Path $newDir -Force | Out-Null
        Set-Content -Path (Join-Path $newDir "SKILL.md") -Value $skillContent -Encoding UTF8
        $created++
        Write-Host "  CREATED: $($p.proposed_id) ($($p.estimated_size_kb) KB)" -ForegroundColor Green
    }
    
    Write-Host "`nCreated $created atomic skills from $skillName" -ForegroundColor Magenta
    
    # Archive original
    $archiveDir = Join-Path $skillBase "_archived"
    if (-not (Test-Path $archiveDir)) { New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null }
    $archiveDest = Join-Path $archiveDir $skillName
    if (-not (Test-Path $archiveDest)) {
        Move-Item $SkillPath $archiveDest
        Write-Host "Archived original to: $archiveDest" -ForegroundColor DarkGray
    }
}
