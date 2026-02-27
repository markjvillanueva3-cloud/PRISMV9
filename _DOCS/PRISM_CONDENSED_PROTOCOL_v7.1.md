# PRISM CONDENSED PROTOCOL v7.1
## Quick Reference for Claude Development Sessions
**Last Updated:** January 22, 2026

---

# 🔴 CRITICAL: READ FIRST

```
STATE FILE → C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json

⚠️ TWO FILESYSTEMS:
   User's C: drive = PERSISTENT (use Filesystem:* tools)
   Claude container = TEMPORARY (use view, bash_tool)

🚫 NEVER save PRISM work to /home/claude/ - IT RESETS!
```

---

# 🚀 SESSION START (DO THIS FIRST)

```javascript
// 1. Read state
Filesystem:read_file("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json")

// 2. Announce
═══════════════════════════════════════════════════════════════════════════
STARTING SESSION [ID]: [NAME]
Previous: [LAST_SESSION] - [STATUS]
Focus: [CURRENT_WORK]
═══════════════════════════════════════════════════════════════════════════

// 3. Update state to IN_PROGRESS
```

---

# 🏁 SESSION END (ALWAYS DO)

```javascript
// 1. Update state file completely
// 2. Write session log to SESSION_LOGS/
// 3. Announce completion

═══════════════════════════════════════════════════════════════════════════
COMPLETING SESSION [ID]
✓ Completed: [LIST]
✓ Files saved: [LIST]
→ Next session: [NEXT_ID]
→ State saved to: CURRENT_STATE.json
═══════════════════════════════════════════════════════════════════════════

📦 Consider uploading to Box for backup
```

---

# 📁 PATH QUICK REFERENCE

| Location | Path | Use |
|----------|------|-----|
| **State** | `C:\PRISM REBUILD...\CURRENT_STATE.json` | Session state |
| **Extracted** | `C:\PRISM REBUILD...\EXTRACTED\` | Modules |
| **Logs** | `C:\PRISM REBUILD...\SESSION_LOGS\` | Session logs |
| **Skills** | `/mnt/skills/user/prism-*/SKILL.md` | Read-only guidance |
| **Resources** | `C:\...\Box\PRISM REBUILD\RESOURCES\` | Reference files |

---

# 🛠️ TOOL SELECTION

| Task | Tool | Filesystem |
|------|------|------------|
| Read state/files | `Filesystem:read_file` | User's C: |
| Write files | `Filesystem:write_file` | User's C: |
| List directories | `Filesystem:list_directory` | User's C: |
| Search files | `Desktop Commander:start_search` | User's C: |
| Read skills | `view` | Container |
| Process uploads | `view`, `bash_tool` | Container |
| Create artifacts | `create_file` + `present_files` | Container |

---

# 🎯 THE 10 COMMANDMENTS (ABBREVIATED)

1. **USE EVERYWHERE** - Every DB/engine wired to ALL consumers
2. **FUSE** - Combine cross-domain concepts
3. **VERIFY** - Physics + empirical + historical validation
4. **LEARN** - Every interaction feeds ML pipeline
5. **UNCERTAINTY** - Confidence intervals on all outputs
6. **EXPLAIN** - XAI for all recommendations
7. **GRACEFUL** - Fallbacks for everything
8. **PROTECT** - Validate, sanitize, encrypt, backup
9. **PERFORM** - <2s load, <500ms calc
10. **USER-OBSESS** - 3-click rule, smart defaults

---

# 🗂️ MODULE COUNTS

| Category | Count | Status |
|----------|-------|--------|
| Databases | 62 | Stage 1 |
| Engines | 213 | Stage 1 |
| Knowledge Bases | 14 | Stage 1 |
| Systems & Cores | 31 | Stage 1 |
| Learning Modules | 30 | Stage 1 |
| Business/Quoting | 22 | Stage 1 |
| UI Components | 16 | Stage 1 |
| Lookups | 20 | Stage 1 |
| Manufacturer Catalogs | 44+ | Stage 1 |
| Phase Modules | 46 | Stage 1 |
| **TOTAL** | **831** | **Extracting** |

---

# 🏗️ HIERARCHICAL LAYERS

```
LEARNED (AI/ML derived)     ← Highest priority
    ↓
USER (Shop-specific)
    ↓
ENHANCED (Manufacturer)     ← 33 manufacturers complete
    ↓
CORE (Infrastructure)       ← Foundation
```

Resolution: LEARNED → USER → ENHANCED → CORE → DEFAULT

---

# 📊 ABSOLUTE REQUIREMENTS

```
✗ NO module without ALL consumers wired
✗ NO calculation with fewer than 6 data sources
✗ NO session without state file update
✗ NO partial extractions
✓ VERIFY before and after EVERY operation
```

---

# 🔧 SKILLS (Read Before Complex Tasks)

| Skill | Use When |
|-------|----------|
| `prism-development` | Core protocols |
| `prism-state-manager` | Session state |
| `prism-extractor` | Module extraction |
| `prism-python-tools` | Batch processing |
| `prism-auditor` | Verify completeness |
| `prism-utilization` | 100% wiring enforcement |
| `prism-knowledge-base` | Algorithm selection |
| `prism-swarm-orchestrator` | Parallel extraction |

```javascript
// Read skill before working
view("/mnt/skills/user/prism-extractor/SKILL.md")
```

---

# 🔄 CURRENT STAGE: EXTRACTION (Stage 1)

**Focus:** Extract 831 modules from monolith to `EXTRACTED\[category]\`

**Next Session:** 1.A.1 - Extract Materials Databases (6 databases)

**Session ID Format:** `STAGE.CATEGORY.NUMBER`
- Stage 0 = Prep
- Stage 1 = Extract  ← CURRENT
- Stage 2 = Architecture
- Stage 3 = Migration

---

# 🔄 COMPACTION RECOVERY

If context compacts:
1. Read transcript file mentioned in summary
2. Read `CURRENT_STATE.json`
3. Read latest session log
4. Continue from `currentWork.nextSteps`

---

# 📝 SESSION LOG TEMPLATE

```markdown
# SESSION [ID] LOG
**Date:** [DATE]
**Status:** [COMPLETE/PAUSED]

## Objectives
- [List objectives]

## Completed
- [List completed tasks]

## Files Created/Modified
- [List files with paths]

## Issues/Notes
- [List any issues]

## Next Session
- ID: [NEXT_ID]
- Focus: [Description]
```

---

# ⚡ QUICK COMMANDS

```javascript
// Start session
Filesystem:read_file("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json")

// List extracted
Filesystem:list_directory("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\EXTRACTED\\")

// Read skill
view("/mnt/skills/user/prism-development/SKILL.md")

// Search for module
Desktop Commander:start_search({
  path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\",
  pattern: "PRISM_MATERIALS",
  searchType: "files"
})
```

---

**END OF CONDENSED PROTOCOL**

*Full documentation: PRISM_ULTIMATE_DEVELOPMENT_MASTER_v7.0.md*
