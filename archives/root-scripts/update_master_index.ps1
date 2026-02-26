# Update MASTER_INDEX v14.5 changelog
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_MASTER_INDEX.md"
$content = Get-Content $file -Raw

$old = @"
# v14.5 (2026-02-16): Skill Atomization + Course-Derived Skills
#   - DA phase expanded from 9`u{2192}11 milestones (MS0-MS10)
#   - NEW DA-MS9: Skill Atomization Infrastructure (index schema, split scripts, course pipeline)
#   - NEW DA-MS10: Skill Pilot (3 skill splits + 3 course extractions = ~200 atomic skills)
#   - SKILL_INDEX.json: master registry for all atomic skills (triggers, tags, relationships)
#   - 34 multi-function skills (10-62KB) `u{2192} target ~660 atomic skills (2-5KB each)
#   - 171 MIT OCW courses (191 zips, 12.3GB) `u{2192} target ~2000 course-derived atomic skills
#   - SKILL_ATOMIZATION_SPEC.md: full specification and execution plan
#   - Bulk extraction (Waves 4-7) runs parallel to R1+ phases
#   - Token savings: 70-90% reduction in skill-related context usage
#   - One skill = one function principle. All indexed for auto-calling.
"@

$new = @"
# v14.5 (2026-02-16): Skill Atomization + Course Integration + Role/Model/Effort Assignments
#   SKILL ATOMIZATION:
#   - DA phase expanded from 9`u{2192}11 milestones (MS0-MS10)
#   - NEW DA-MS9: Skill Atomization Infrastructure (index schema, split scripts, course pipeline)
#   - NEW DA-MS10: Skill Pilot (3 skill splits + 3 course extractions = ~200 atomic skills)
#   - SKILL_INDEX.json: master registry for all atomic skills (triggers, tags, relationships)
#   - 34 multi-function skills (10-62KB) `u{2192} target ~660 atomic skills (2-5KB each)
#   - 206 MIT OCW courses (234 zips, 12.3GB) `u{2192} target ~2,800 course-derived skills
#   - ~25 CNC/CAM training resources `u{2192} target ~420 manufacturing-specific skills
#   - 116 manufacturer catalogs (5.3GB) `u{2192} scheduled for R7-MS6 extraction
#   - Grand total: ~3,880 atomic skills from all sources
#   - SKILL_ATOMIZATION_SPEC.md + FULL_COURSE_INVENTORY.md: full specs
#   - Bulk extraction runs parallel to R1+ (Haiku extraction, Sonnet review)
#   - Token savings: 70-90% reduction in skill-related context usage
#   - One skill = one function. All indexed for auto-calling.
#   ROLE/MODEL/EFFORT ASSIGNMENTS:
#   - 95 milestone-level role/model/effort assignments across ALL 12 phases
#   - Every milestone specifies: Role, Claude Model (Haiku/Sonnet/Opus), Effort, Sessions
#   - Model rules: Haiku=bulk, Sonnet=implementation, Opus=architecture+safety
#   - Safety-critical milestones mandate Opus (no exceptions)
#   - Phase gates mandate Opus for quality judgment
#   - Stub phases (R4/R5/R6) get assignment tables for Brainstorm-to-Ship
#   - ROLE_MODEL_EFFORT_MATRIX.md: canonical 668-line reference
"@

if ($content.Contains("171 MIT OCW courses")) {
    $content = $content.Replace($old, $new)
    [System.IO.File]::WriteAllText($file, $content)
    Write-Output "Updated v14.5 changelog with final numbers"
} else {
    Write-Output "Old text not found - checking for variant..."
    # Try simpler replacement
    $content = $content.Replace("171 MIT OCW courses (191 zips, 12.3GB)", "206 MIT OCW courses (234 zips, 12.3GB)")
    $content = $content.Replace("target ~2000 course-derived atomic skills", "target ~2,800 course-derived skills + ~420 CNC/CAM skills = ~3,880 total")
    $content = $content.Replace("Skill Atomization + Course-Derived Skills", "Skill Atomization + Course Integration + Role/Model/Effort Assignments")
    [System.IO.File]::WriteAllText($file, $content)
    Write-Output "Applied partial updates"
}
Write-Output "Master Index: $((Get-Content $file).Count) lines"
