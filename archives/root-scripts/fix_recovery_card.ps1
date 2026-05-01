# Update Recovery Card header to v14.5 and add new file references
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_RECOVERY_CARD.md"
$lines = [System.Collections.ArrayList]([System.IO.File]::ReadAllLines($file))

# Update version in header
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "RECOVERY CARD.*v14\.3") {
        $lines[$i] = $lines[$i].Replace("v14.3", "v14.5")
        Write-Output "Updated header to v14.5"
        break
    }
}

# Find the file table / phase file map section and add new files
$added = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "SKILL_ATOMIZATION" -or $lines[$i] -match "ROLE_MODEL") {
        $added = $true
        Write-Output "Already has skill/role references"
        break
    }
    # Find a good insertion point - after STEP 2 or the phase-file map
    if ($lines[$i] -match "PHASE_R11" -and -not $added) {
        $lines.Insert($i + 1, "ROLE_MODEL_EFFORT_MATRIX.md  — 668 lines, canonical role/model/effort for all 95 milestones")
        $lines.Insert($i + 2, "SKILL_ATOMIZATION_SPEC.md    — Skill split + course extraction spec (DA-MS9/MS10)")
        $lines.Insert($i + 3, "FULL_COURSE_INVENTORY.md     — 206 MIT courses + 25 CNC/CAM resources inventory")
        $added = $true
        Write-Output "Added new file references after R11 line"
        break
    }
}

# Add v14.5 note section
if (-not ($lines -match "v14\.5")) {
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^## STEP 0") {
            $lines.Insert($i, "")
            $lines.Insert($i + 1, "## v14.5 CHANGES: Skill Atomization + Role/Model/Effort Assignments")
            $lines.Insert($i + 2, "- DA-MS9/MS10 added (skill atomization infrastructure + pilot)")
            $lines.Insert($i + 3, "- 95 milestone-level role/model/effort assignments across ALL 12 phases")
            $lines.Insert($i + 4, "- Model rules: Haiku=bulk, Sonnet=impl, Opus=architecture+safety")
            $lines.Insert($i + 5, "- 206 MIT courses + 25 CNC/CAM resources = ~3,880 target atomic skills")
            $lines.Insert($i + 6, "- New ref files: ROLE_MODEL_EFFORT_MATRIX.md, SKILL_ATOMIZATION_SPEC.md")
            $lines.Insert($i + 7, "")
            Write-Output "Added v14.5 changes section"
            break
        }
    }
}

[System.IO.File]::WriteAllLines($file, $lines.ToArray())
Write-Output "Recovery Card: $($lines.Count) lines"
