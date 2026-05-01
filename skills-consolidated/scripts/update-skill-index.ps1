# update-skill-index.ps1 - Index skills into SKILL_INDEX.json
# Usage: .\update-skill-index.ps1 -SkillPath <path> [-Batch] [-IndexPath <path>]
param(
    [string]$SkillPath,
    [switch]$Batch,
    [string]$IndexPath = "C:\PRISM\skills-consolidated\SKILL_INDEX.json"
)

function Parse-SkillMd {
    param([string]$Path)
    $content = Get-Content $Path -Raw -ErrorAction Stop
    $lines = Get-Content $Path -ErrorAction Stop
    $fileSize = (Get-Item $Path).Length / 1024
    
    $skill = @{
        id = (Split-Path (Split-Path $Path -Parent) -Leaf)
        function = ""
        triggers = @()
        domain = "general"
        source = "existing_atomic"
        size_kb = [math]::Round($fileSize, 1)
        line_count = $lines.Count
        prism_phases = @()
        related = @()
        tags = @()
        path = (Split-Path $Path -Parent)
    }
    
    # Parse YAML frontmatter if present
    if ($content -match '(?s)^---\r?\n(.+?)\r?\n---') {
        $yaml = $Matches[1]
        # Extract name
        if ($yaml -match 'name:\s*(.+)') { $skill.id = $Matches[1].Trim() }
        
        # Extract multiline description (handle YAML | pipe + Windows line endings)
        $descLines = @()
        $inDesc = $false
        foreach ($yline in ($yaml -split '\r?\n')) {
            if ($yline -match '^\s*description:\s*\|?\s*$') {
                $inDesc = $true
                continue
            }
            if ($yline -match '^\s*description:\s*(.+)$') {
                $skill.function = $Matches[1].Trim()
                break
            }
            if ($inDesc) {
                if ($yline -match '^\s{2,}(.+)') {
                    $descLines += $Matches[1].Trim()
                } else {
                    break
                }
            }
        }
        if ($descLines.Count -gt 0) {
            $skill.function = ($descLines -join ' ').Trim()
        }
    }
    
    # Fallback: extract function from first heading or FUNCTION line
    if (-not $skill.function) {
        if ($content -match 'FUNCTION:\s*(.+)') {
            $skill.function = $Matches[1].Trim()
        } elseif ($content -match '^#\s+(.+)' ) {
            $skill.function = $Matches[1].Trim()
        }
    }
    
    # Extract triggers from name parts + content keywords
    $nameParts = $skill.id -replace '^prism-', '' -split '-'
    $skill.triggers = @($nameParts | Where-Object { $_.Length -gt 2 })
    
    # Extract domain from path or content
    $domains = @{
        'gcode|fanuc|siemens|heidenhain|controller' = 'cnc_programming'
        'material|physics|cutting|speed|feed' = 'machining_physics'
        'safety|validation|quality|omega|ralph' = 'quality_safety'
        'session|context|memory|recovery|compaction' = 'session_management'
        'hook|event|trigger|cadence' = 'hook_system'
        'dispatcher|orchestr|agent|swarm' = 'orchestration'
        'dev|code|build|test|debug' = 'development'
        'skill|knowledge|script' = 'skill_management'
        'tool|holder|workholding|thread' = 'tooling'
        'cam|toolpath|strategy' = 'cam_strategy'
    }
    foreach ($pattern in $domains.Keys) {
        if ($skill.id -match $pattern) {
            $skill.domain = $domains[$pattern]
            break
        }
    }
    
    # Extract tags from content
    $tagPatterns = @('WHEN TO USE:', 'triggers:', 'Gateway Routes:', 'tags:')
    foreach ($tp in $tagPatterns) {
        if ($content -match "$tp\s*(.+)") {
            $vals = $Matches[1] -split '[,;|]' | ForEach-Object { $_.Trim().ToLower() } | Where-Object { $_ }
            $skill.tags += $vals
        }
    }
    $skill.tags = @($skill.tags | Select-Object -Unique | Where-Object { $_.Length -gt 2 })
    
    # Extract related skills
    if ($content -match '(?s)RELATED:?\s*(.+?)(?:\r?\n(?:#|\r?\n))') {
        $rels = $Matches[1] -split '[,\r\n]' | ForEach-Object { $_.Trim() -replace '^\s*[-*]\s*', '' } | Where-Object { $_ -match 'prism-' }
        $skill.related = @($rels)
    }
    
    return $skill
}

function Update-Index {
    param([object]$NewSkill, [object]$Index)
    $existing = $Index.skills | Where-Object { $_.id -eq $NewSkill.id }
    if ($existing) {
        # Update existing entry
        $idx = [array]::IndexOf($Index.skills, $existing)
        $Index.skills[$idx] = $NewSkill
        Write-Host "  Updated: $($NewSkill.id)" -ForegroundColor Yellow
    } else {
        $Index.skills += $NewSkill
        Write-Host "  Added: $($NewSkill.id)" -ForegroundColor Green
    }
    
    # Check trigger overlap with other skills
    foreach ($s in $Index.skills) {
        if ($s.id -ne $NewSkill.id -and $s.triggers) {
            $overlap = ($s.triggers | Where-Object { $_ -in $NewSkill.triggers }).Count
            $total = [math]::Max($s.triggers.Count, 1)
            if ($overlap / $total -gt 0.8) {
                Write-Host "  ⚠️  TRIGGER OVERLAP >80%: $($NewSkill.id) ↔ $($s.id)" -ForegroundColor Red
            }
        }
    }
}

# Main execution
if (-not (Test-Path $IndexPath)) {
    $index = @{
        '$schema' = "PRISM Skill Index v1.0"
        metadata = @{
            version = "1.0.0"; created = (Get-Date -Format "yyyy-MM-dd")
            last_updated = (Get-Date -Format "yyyy-MM-dd"); total_skills = 0
            source_breakdown = @{ split_from_monolith = 0; existing_atomic = 0; extracted_from_guide = 0; extracted_from_course = 0 }
            avg_size_kb = 0; index_schema_version = "1.0"
        }
        skills = @()
    }
} else {
    $index = Get-Content $IndexPath -Raw | ConvertFrom-Json
    # Ensure skills is a mutable list
    $index.skills = @($index.skills)
}

if ($Batch) {
    # Index all skills in skills-consolidated directory
    $skillsRoot = "C:\PRISM\skills-consolidated"
    $dirs = Get-ChildItem $skillsRoot -Directory | Where-Object { $_.Name -match '^prism-' }
    $count = 0
    foreach ($dir in $dirs) {
        $skillMd = Join-Path $dir.FullName "SKILL.md"
        if (Test-Path $skillMd) {
            try {
                $skill = Parse-SkillMd -Path $skillMd
                Update-Index -NewSkill $skill -Index $index
                $count++
            } catch {
                Write-Host "  ❌ Error parsing $($dir.Name): $_" -ForegroundColor Red
            }
        }
    }
    Write-Host "`n✅ Indexed $count skills" -ForegroundColor Green
} elseif ($SkillPath) {
    $skillMd = Join-Path $SkillPath "SKILL.md"
    if (-not (Test-Path $skillMd)) { $skillMd = $SkillPath }
    $skill = Parse-SkillMd -Path $skillMd
    Update-Index -NewSkill $skill -Index $index
} else {
    Write-Host 'Usage: .\update-skill-index.ps1 -SkillPath <path> [-Batch] [-IndexPath <path>]'
    exit 1
}

# Update metadata
$index.metadata.last_updated = (Get-Date -Format "yyyy-MM-dd")
$index.metadata.total_skills = $index.skills.Count
$sizes = $index.skills | ForEach-Object { $_.size_kb }
if ($sizes) { $index.metadata.avg_size_kb = [math]::Round(($sizes | Measure-Object -Average).Average, 1) }
$index.metadata.source_breakdown.existing_atomic = ($index.skills | Where-Object { $_.source -eq "existing_atomic" }).Count
$index.metadata.source_breakdown.split_from_monolith = ($index.skills | Where-Object { $_.source -eq "split_from_monolith" }).Count
$index.metadata.source_breakdown.extracted_from_course = ($index.skills | Where-Object { $_.source -eq "extracted_from_course" }).Count

$json = $index | ConvertTo-Json -Depth 10
$tempPath = "$IndexPath.tmp"
[System.IO.File]::WriteAllText($tempPath, $json, [System.Text.Encoding]::UTF8)
if (Test-Path $IndexPath) { Remove-Item $IndexPath -Force }
Rename-Item $tempPath $IndexPath
$msg = "Index saved: " + $index.metadata.total_skills + " skills, avg " + $index.metadata.avg_size_kb + "KB"
Write-Host $msg -ForegroundColor Cyan
