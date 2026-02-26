# Full v14.5 state check
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

Write-Output "=== MASTER_INDEX VERSION ==="
Get-Content (Join-Path $dir "PRISM_MASTER_INDEX.md") -TotalCount 3

Write-Output "`n=== INDEX REFERENCES IN MASTER_INDEX ==="
Select-String -Path (Join-Path $dir "PRISM_MASTER_INDEX.md") -Pattern "v14\.5|skill.atom|course|MS9|MS10|MS11" |
    ForEach-Object { Write-Output "  L$($_.LineNumber): $($_.Line.Trim().Substring(0, [Math]::Min(90, $_.Line.Trim().Length)))" }

Write-Output "`n=== ALL INDEX SYSTEMS REFERENCED ==="
# Check for all 8 indexes
$checks = @(
    @{Name="1. Execution Chain Index"; Pattern="BRANCH 1|Execution Chain"},
    @{Name="2. Data Taxonomy Index"; Pattern="BRANCH 2|Data Taxonomy"},
    @{Name="3. Relationship Graph"; Pattern="BRANCH 3|Relationship"},
    @{Name="4. Session Knowledge Index"; Pattern="BRANCH 4|Session Knowledge|SESSION_KNOWLEDGE"},
    @{Name="5. Skill Index"; Pattern="SKILL_INDEX|skill.index|Skill Index"},
    @{Name="6. Course Index"; Pattern="COURSE_INDEX|course.index|Course Index"},
    @{Name="7. Section Index"; Pattern="SECTION_INDEX|Section Index|ROADMAP_SECTION"},
    @{Name="8. Master Index"; Pattern="MASTER_INDEX|Master Index"}
)
foreach ($c in $checks) {
    $hits = (Select-String -Path (Join-Path $dir "HIERARCHICAL_INDEX_SPEC.md") -Pattern $c.Pattern).Count
    $hitsDA = (Select-String -Path (Join-Path $dir "PHASE_DA_DEV_ACCELERATION.md") -Pattern $c.Pattern).Count
    Write-Output "  $($c.Name): SPEC=$hits refs, DA=$hitsDA refs"
}

Write-Output "`n=== DA PHASE FILE SIZES ==="
foreach ($f in @("PHASE_DA_DEV_ACCELERATION.md","PRISM_MASTER_INDEX.md","HIERARCHICAL_INDEX_SPEC.md","PRISM_RECOVERY_CARD.md","PRISM_PROTOCOLS_CORE.md")) {
    $lines = (Get-Content (Join-Path $dir $f)).Count
    Write-Output "  $f : $lines lines"
}

Write-Output "`n=== COURSE COUNT IN DA DOC ==="
Select-String -Path (Join-Path $dir "PHASE_DA_DEV_ACCELERATION.md") -Pattern "200\+|171|191" |
    ForEach-Object { Write-Output "  L$($_.LineNumber): $($_.Line.Trim().Substring(0, [Math]::Min(80, $_.Line.Trim().Length)))" }
