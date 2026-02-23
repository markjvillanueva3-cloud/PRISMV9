# Fix file lock - use WriteAllLines
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_MASTER_INDEX.md"
$lines = [System.IO.File]::ReadAllLines($file)

$newLines = [System.Collections.ArrayList]@()
$skipUntilDash = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "v14\.5.*Skill Atomization") {
        [void]$newLines.Add("# v14.5 (2026-02-16): Skill Atomization + Course Integration + Role/Model/Effort")
        [void]$newLines.Add("#   SKILL ATOMIZATION:")
        [void]$newLines.Add("#   - DA phase expanded from 9 to 11 milestones (MS0-MS10)")
        [void]$newLines.Add("#   - NEW DA-MS9: Skill Atomization Infrastructure (index schema, scripts, pipeline)")
        [void]$newLines.Add("#   - NEW DA-MS10: Skill Pilot (3 skill splits + 3 course extractions)")
        [void]$newLines.Add("#   - SKILL_INDEX.json: master registry for all atomic skills")
        [void]$newLines.Add("#   - 34 multi-function skills (10-62KB) split to ~660 atomic skills (2-5KB each)")
        [void]$newLines.Add("#   - 206 MIT OCW courses (234 zips, 12.3GB) yield ~2,800 course-derived skills")
        [void]$newLines.Add("#   - ~25 CNC/CAM training resources yield ~420 manufacturing skills")
        [void]$newLines.Add("#   - 116 manufacturer catalogs (5.3GB) scheduled for R7-MS6 extraction")
        [void]$newLines.Add("#   - Grand total: ~3,880 atomic skills from all sources")
        [void]$newLines.Add("#   - SKILL_ATOMIZATION_SPEC.md + FULL_COURSE_INVENTORY.md: full specs")
        [void]$newLines.Add("#   - Bulk extraction parallel to R1+ (Haiku extract, Sonnet review)")
        [void]$newLines.Add("#   - Token savings: 70-90% reduction in skill context usage")
        [void]$newLines.Add("#   - One skill = one function. All indexed for auto-calling.")
        [void]$newLines.Add("#   ROLE/MODEL/EFFORT ASSIGNMENTS:")
        [void]$newLines.Add("#   - 95 milestone-level role/model/effort assignments across ALL 12 phases")
        [void]$newLines.Add("#   - Every milestone: Role, Claude Model (Haiku/Sonnet/Opus), Effort, Sessions")
        [void]$newLines.Add("#   - Model rules: Haiku=bulk, Sonnet=impl, Opus=architecture+safety")
        [void]$newLines.Add("#   - Safety-critical milestones mandate Opus (no exceptions)")
        [void]$newLines.Add("#   - Phase gates mandate Opus for quality judgment")
        [void]$newLines.Add("#   - Stub phases (R4/R5/R6) get assignment tables for Brainstorm-to-Ship")
        [void]$newLines.Add("#   - ROLE_MODEL_EFFORT_MATRIX.md: canonical 668-line reference")
        $skipUntilDash = $true
        continue
    }
    if ($skipUntilDash -and $lines[$i] -match "^---") {
        $skipUntilDash = $false
    }
    if (-not $skipUntilDash) {
        [void]$newLines.Add($lines[$i])
    }
}

[System.IO.File]::WriteAllLines($file, $newLines.ToArray())
Write-Output "Done: $($newLines.Count) lines"
