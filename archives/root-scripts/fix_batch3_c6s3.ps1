# C6: Add parallel track coordination checkpoints to R1, R3, R7 gates
# S3: Add knowledge extraction enforcement to DA companion
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# === R1: Add skill atomization checkpoint to MS9 gate ===
$r1 = [System.IO.File]::ReadAllText("$dir\PHASE_R1_REGISTRY.md")
# Find R1-MS9 gate area and add checkpoint
$r1 = $r1.Replace(
    "MS9 GATE VERIFIES:",
    "MS9 GATE VERIFIES:`r`n  PARALLEL TRACK CHECK: SKILL_INDEX.json count >= 300 (65 existing + T1/T2 course skills)`r`n  If count < 300: T1/T2 extraction is behind schedule, allocate next session to catch up"
)
[System.IO.File]::WriteAllText("$dir\PHASE_R1_REGISTRY.md", $r1)
Write-Output "C6: R1 parallel checkpoint added"

# === R3: Add checkpoint ===
$r3 = [System.IO.File]::ReadAllText("$dir\PHASE_R3_CAMPAIGNS.md")
$r3 = $r3.Replace(
    "MS5 GATE VERIFIES:",
    "MS5 GATE VERIFIES:`r`n  PARALLEL TRACK CHECK: SKILL_INDEX.json count >= 1200 (300 from R1 + T3/T4 course skills + CNC/CAM)`r`n  If count < 1200: T3/T4/CNC extraction behind schedule, allocate catch-up sessions`r`n  PARALLEL: R7-MS6 (Manufacturer Catalog Extraction) can begin as independent track"
)
[System.IO.File]::WriteAllText("$dir\PHASE_R3_CAMPAIGNS.md", $r3)
Write-Output "C6: R3 parallel checkpoint added"

# === R7: Add checkpoint ===
$r7 = [System.IO.File]::ReadAllText("$dir\PHASE_R7_INTELLIGENCE.md")
$r7 = $r7.Replace(
    "GATE VERIFIES:",
    "GATE VERIFIES:`r`n  PARALLEL TRACK CHECK: SKILL_INDEX.json count >= 3500 (all tiers complete)`r`n  Cross-reference check: no duplicate skills between course-derived and split-derived`r`n  Skill dependency graph complete and validated"
)
[System.IO.File]::WriteAllText("$dir\PHASE_R7_INTELLIGENCE.md", $r7)
Write-Output "C6: R7 parallel checkpoint added"

# === S3: Add knowledge extraction enforcement to DA-MS7 area ===
# Find the DA companion assets section and add enforcement language
$da = [System.IO.File]::ReadAllText("$dir\PHASE_DA_DEV_ACCELERATION.md")
$da = $da.Replace(
    "session_shutdown",
    "session_shutdown          (INCLUDES MANDATORY knowledge extraction)"
)
# Also add enforcement note near the session_handoff_reminder hook
$da = $da.Replace(
    "session_handoff_reminder",
    "session_handoff_reminder   +  knowledge_extraction_gate (BLOCKING: session cannot end`r`n                               without prism_knowledge extract OR manual override)"
)
[System.IO.File]::WriteAllText("$dir\PHASE_DA_DEV_ACCELERATION.md", $da)
Write-Output "S3: Knowledge extraction enforcement added to DA companion"

Write-Output "`n--- Batch 3 (C6 + S3) complete ---"
