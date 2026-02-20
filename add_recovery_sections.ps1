# Add skill atomization and role sections to Recovery Card
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_RECOVERY_CARD.md"
$content = Get-Content $file -Raw

$newSection = @"

## ROLE / MODEL ASSIGNMENT (v14.5)

``````
Every milestone has a Role + Model + Effort assignment (### Role: line after ## header).
RULE: Follow the assigned model. Do NOT use Haiku for safety-critical work.
  Haiku  = Bulk ops, file scanning, grep, mechanical transforms
  Sonnet = Implementation, testing, scripts, validation, wiring
  Opus   = Architecture, safety-critical review, phase gates, schema design
CANONICAL REF: ROLE_MODEL_EFFORT_MATRIX.md (668 lines, all 95 milestones)
``````

## SKILL ATOMIZATION PARALLEL TRACK (v14.5)

``````
RUNS ALONGSIDE: R1+ phases (not blocking, not blocked by)
WHAT: Split 34 oversized skills + extract from 206 MIT courses + 25 CNC/CAM resources
OUTPUT: ~3,880 atomic skills, each <=5KB, indexed in SKILL_INDEX.json
DA-MS9: Build infrastructure (index schema, automation scripts)
DA-MS10: Pilot (3 skill splits + 3 course extractions to validate pattern)
BULK: Haiku extracts, Sonnet reviews quality, batches of 10-20 skills per session
SPEC: SKILL_ATOMIZATION_SPEC.md + FULL_COURSE_INVENTORY.md
COURSES AT: C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MIT COURSES\ + RESOURCE PDFS\
``````

"@

$content = $content -replace "## ESSENTIAL RULES \(standalone", "$newSection`n## ESSENTIAL RULES (standalone"
[System.IO.File]::WriteAllText($file, $content)
$newCount = (Get-Content $file).Count
Write-Output "Recovery Card updated: $newCount lines"
