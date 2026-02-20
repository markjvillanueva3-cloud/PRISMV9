# Direct line-by-line replacement for Master Index
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_MASTER_INDEX.md"
$lines = Get-Content $file -Encoding UTF8

$newLines = @()
$replaced = $false
$skipUntilDash = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "v14\.5.*Skill Atomization") {
        # Replace this entire section until the --- separator
        $newLines += "# v14.5 (2026-02-16): Skill Atomization + Course Integration + Role/Model/Effort"
        $newLines += "#   SKILL ATOMIZATION:"
        $newLines += "#   - DA phase expanded from 9 to 11 milestones (MS0-MS10)"
        $newLines += "#   - NEW DA-MS9: Skill Atomization Infrastructure (index schema, scripts, pipeline)"
        $newLines += "#   - NEW DA-MS10: Skill Pilot (3 skill splits + 3 course extractions)"
        $newLines += "#   - SKILL_INDEX.json: master registry for all atomic skills"
        $newLines += "#   - 34 multi-function skills (10-62KB) split to ~660 atomic skills (2-5KB each)"
        $newLines += "#   - 206 MIT OCW courses (234 zips, 12.3GB) yield ~2,800 course-derived skills"
        $newLines += "#   - ~25 CNC/CAM training resources yield ~420 manufacturing skills"
        $newLines += "#   - 116 manufacturer catalogs (5.3GB) scheduled for R7-MS6 extraction"
        $newLines += "#   - Grand total: ~3,880 atomic skills from all sources"
        $newLines += "#   - SKILL_ATOMIZATION_SPEC.md + FULL_COURSE_INVENTORY.md: full specs"
        $newLines += "#   - Bulk extraction parallel to R1+ (Haiku extract, Sonnet review)"
        $newLines += "#   - Token savings: 70-90% reduction in skill context usage"
        $newLines += "#   - One skill = one function. All indexed for auto-calling."
        $newLines += "#   ROLE/MODEL/EFFORT ASSIGNMENTS:"
        $newLines += "#   - 95 milestone-level role/model/effort assignments across ALL 12 phases"
        $newLines += "#   - Every milestone: Role, Claude Model (Haiku/Sonnet/Opus), Effort, Sessions"
        $newLines += "#   - Model rules: Haiku=bulk, Sonnet=impl, Opus=architecture+safety"
        $newLines += "#   - Safety-critical milestones mandate Opus (no exceptions)"
        $newLines += "#   - Phase gates mandate Opus for quality judgment"
        $newLines += "#   - Stub phases (R4/R5/R6) get assignment tables for Brainstorm-to-Ship"
        $newLines += "#   - ROLE_MODEL_EFFORT_MATRIX.md: canonical 668-line reference"
        $skipUntilDash = $true
        $replaced = $true
        continue
    }
    
    if ($skipUntilDash -and $lines[$i] -match "^---") {
        $skipUntilDash = $false
        # Include the --- line
        $newLines += $lines[$i]
        continue
    }
    
    if (-not $skipUntilDash) {
        $newLines += $lines[$i]
    }
}

Set-Content $file $newLines -Encoding UTF8
Write-Output "Master Index updated: $($newLines.Count) lines (replaced=$replaced)"
