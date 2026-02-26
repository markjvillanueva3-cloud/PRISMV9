# Add Wave 8 to MASTER_ACTION_PLAN_v2
$file = "C:\PRISM\mcp-server\data\docs\roadmap\MASTER_ACTION_PLAN_v2.md"
$text = [System.IO.File]::ReadAllText($file)

# 1. Update overview counts
$text = $text.Replace(
    "# Scope: 15 operational improvements + 4-branch hierarchical index + session knowledge system",
    "# Scope: 15 operational improvements + 4-branch hierarchical index + session knowledge system + skill atomization"
)
$text = $text.Replace(
    "Organized into 7 implementation waves by dependency order",
    "Organized into 8 implementation waves by dependency order"
)

# 2. Update inventory header
$text = $text.Replace(
    "## FULL INVENTORY (22 items, re-prioritized)",
    "## FULL INVENTORY (24 items, re-prioritized)"
)

# 3. Add items 23-24 to inventory table (find last table row, append before closing)
$text = $text.Replace(
    "| 13 | Companion asset tracking | W0 | LOW | Trivial | Any |",
    "| 13 | Companion asset tracking | W0 | LOW | Trivial | Any |`n| 23 | Skill atomization (34 skills -> atomic) | W8 | HIGH | Very High | Haiku+Sonnet+Opus |`n| 24 | Course extraction (206 MIT + 25 CNC/CAM) | W8 | HIGH | Very High | Haiku+Sonnet |"
)

# 4. Insert Wave 8 before "END OF MASTER ACTION PLAN"
$wave8 = @"

---

## WAVE 8: SKILL ATOMIZATION + COURSE EXTRACTION (NEW in v14.5)
**The knowledge multiplication wave.** Transforms 34 monolithic skills + 206 MIT courses + ~25 CNC/CAM
training resources into ~3,880 atomic single-function skills, each <=5KB, all indexed.

**Depends on:** W5 (skill phase-loading uses SKILL_INDEX.json from this wave)
**Tracked in:** DA-MS9 (infrastructure) + DA-MS10 (pilot), then parallel tracks alongside R1+
**Total estimated sessions:** 50-80 (mostly Haiku bulk work)
**Token savings:** 70-90% reduction in per-query skill loading costs

### Phase 1: Infrastructure (DA-MS9, 2 sessions)
**Role:** Data Architect | **Model:** Opus (schema) then Sonnet (scripts) | **Effort:** L

| # | Task | Model | Calls |
|---|------|-------|-------|
| 1 | Create SKILL_INDEX.json schema | Opus | 3 |
| 2 | Build split-skill.ps1 automation | Sonnet | 4 |
| 3 | Build extract-course-skills.ps1 pipeline | Sonnet | 4 |
| 4 | Build update-skill-index.ps1 tool | Sonnet | 3 |
| 5 | Index existing 65 right-sized skills | Haiku | 3 |

**Gate:** 4 scripts tested. Index has 65 entries. Split tool proposes reasonable splits.

### Phase 2: Pilot (DA-MS10, 4 sessions)
**Role:** Data Architect | **Model:** Haiku (extraction) then Sonnet (review) then Opus (validation) | **Effort:** XL

Pilot Set A - Skill Splits (3 flagship skills -> ~100 atomic):
  Split 1: prism-gcode-reference (62KB, 37 sections -> ~37 skills)
  Split 2: prism-material-physics (37.5KB, 59 sections -> ~50 skills)
  Split 3: prism-safety-framework (24.9KB, 32 sections -> ~30 skills)

Pilot Set B - Course Extraction (3 courses -> ~70-90 skills):
  Course 1: 2.830j Control of Manufacturing Processes (~25 skills)
  Course 2: 3.012 Fundamentals of Materials Science (~25 skills)
  Course 3: 18.03 Differential Equations (~20 skills)

**Gate:** ~170-200 new atomic skills. All <=5KB. All indexed. Zero knowledge loss.

### Phase 3: Bulk Execution (parallel tracks, 40-65 sessions)
**Role:** Data Architect | **Model:** Haiku (bulk) then Sonnet (batch review)

Track A - Remaining Skill Splits (31 skills -> ~560 atomic, 5-8 sessions):
  Model: Haiku (splitting) then Sonnet (quality review per batch of 5)
  Batch size: 5 skills per session
  Quality gate: each batch reviewed before next

Track B - Course Extraction by Tier (206 courses -> ~2,800 skills):
  T1 Manufacturing (25 courses): 5-8 sessions | Haiku extract, Sonnet review | Runs during R1
  T2 Materials (11 courses): 2-3 sessions | Haiku extract, Sonnet review | Runs during R1
  T3 Math (28 courses): 4-6 sessions | Haiku extract, Sonnet review | Runs during R3
  T4 CS/Algorithms (52 courses): 8-12 sessions | Haiku extract, Sonnet review | Runs during R3
  T5 Operations (20 courses): 3-5 sessions | Haiku extract, Sonnet review | Runs during R7
  T6+ Other (70 courses): 10-15 sessions | Haiku extract, Sonnet review | Runs during R7+

Track C - CNC/CAM Training (~25 resources -> ~420 skills, 3-5 sessions):
  Model: Haiku (parsing) then Sonnet (manufacturing accuracy review)
  Content: SolidCAM, InventorCAM, HyperMILL, CNC Cookbook guides, Post Processor guides
  Runs during R3 (feeds toolpath intelligence directly)

### Phase 4: Cross-Reference + Quality (3-5 sessions)
**Role:** Data Architect | **Model:** Sonnet (linking) then Opus (gap analysis)
  - Link related skills (G-code skill <-> toolpath skill)
  - Verify no gaps (every PRISM calculation has supporting skill)
  - Verify no duplicates (course skill vs split skill)
  - Build skill dependency graph
  - Final SKILL_INDEX.json validation

### W8 Companion Assets:
```
SCRIPT: scripts/skills/split-skill.ps1
SCRIPT: scripts/skills/extract-course-skills.ps1
SCRIPT: scripts/skills/update-skill-index.ps1
FILE:   skills-consolidated/SKILL_INDEX.json
FILE:   skills-consolidated/_archived/ (originals)
DIR:    ~3,880 new atomic skill directories
FILE:   SKILL_ATOMIZATION_TRACKER.md
```

**TOTAL NEW ASSETS:** ~3,880 skill directories, 3 scripts, 2 tracking files

"@

$text = $text.Replace("---`nEND OF MASTER ACTION PLAN v2.0", "$wave8`n---`nEND OF MASTER ACTION PLAN v2.0")
# Alternative in case line ending differs
$text = $text.Replace("---`r`nEND OF MASTER ACTION PLAN v2.0", "$wave8`n---`nEND OF MASTER ACTION PLAN v2.0")

[System.IO.File]::WriteAllText($file, $text)
Write-Output "MAP updated: $((Get-Content $file).Count) lines"
