# PRISM CONDENSED PROTOCOL v5.0
## Quick Reference (Updated 2026-01-24)
### SUPERPOWERS COMPLETE: 34 Active Skills + 10 Comprehensive Refs

---

## 🔴 EVERY SESSION - DO THIS FIRST

```
1. READ: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
2. CHECK: Is currentTask IN_PROGRESS? → Resume from checkpoint, don't restart
3. LOAD: Always-on mindsets are automatic (Level 0-1 in /mnt/project/)
4. READ: Phase-appropriate skill from C:\_SKILLS\prism-*
5. WORK: Then begin task
```

---

## 🛠️ TOOL QUICK REFERENCE

| Task | Tool |
|------|------|
| Read C: file | `Filesystem:read_file` |
| Write C: file | `Filesystem:write_file` |
| List C: dir | `Filesystem:list_directory` |
| Read LARGE file | `Desktop Commander:read_file` (offset/length) |
| **Append to file** | `Desktop Commander:write_file` (mode:"append") |
| Search content | `Desktop Commander:start_search` (searchType:"content") |
| Read skill | `view("/mnt/skills/user/prism-[name]/SKILL.md")` |

**⚠️ NEVER save PRISM work to /home/claude/ - RESETS EVERY SESSION**

---

## 📍 KEY PATHS

```
STATE:      C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
MONOLITH:   C:\..\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\*.html (986,621 lines)
EXTRACTED:  C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\
SKILLS:     C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\
LOGS:       C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\
PROJECT:    /mnt/project/ (always-on skills)
ARCHIVED:   C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\_ARCHIVED\
```

---

## ⚡ THE 4 ALWAYS-ON LAWS

```
1. LIFE-SAFETY: "Would I trust this with my own safety?"
2. COMPLETENESS: "Is every field populated? Every case handled?"
3. ANTI-REGRESSION: "Is the new version as complete as the old?"
4. PREDICTIVE: "What are 3 ways this fails?"
```

---

## 🎯 34 ACTIVE SKILLS (Organized by Level)

### LEVEL 0-1: Always-On (/mnt/project/) - 5 Skills
```
prism-life-safety-mindset, prism-maximum-completeness, regression_skill_v2,
prism-predictive-thinking, prism-skill-orchestrator
```

### LEVEL 1: Core Workflow (SP.1) - 8 Skills
```
prism-sp-brainstorm, prism-sp-planning, prism-sp-execution,
prism-sp-review-spec, prism-sp-review-quality, prism-sp-debugging,
prism-sp-verification, prism-sp-handoff
```

### LEVEL 2: Domain Specialists - 11 Skills

**SP.2 Monolith (3):** prism-monolith-index, prism-monolith-extractor, prism-monolith-navigator

**SP.3 Materials (5):** prism-material-schema, prism-material-physics, prism-material-lookup, prism-material-validator, prism-material-enhancer

**SP.4-10 Masters (7 consolidations):**
| Skill | Consolidates | Use For |
|-------|--------------|---------|
| `prism-session-master` | 8 skills | Session/state management |
| `prism-quality-master` | 5 skills | Validation, TDD, review |
| `prism-code-master` | 6 skills | Coding patterns, algorithms |
| `prism-knowledge-master` | 3 skills | Courses, formulas, lookup |
| `prism-expert-master` | 10 skills | Expert consultations |
| `prism-controller-quick-ref` | Navigation | CNC controller selection |
| `prism-dev-utilities` | 8 skills | Development tools |

### LEVEL 3: Comprehensive References - 10 Skills (Lookup Only)
```
prism-api-contracts (186KB), prism-error-catalog (123KB),
prism-manufacturing-tables (141KB), prism-wiring-templates (89KB),
prism-product-calculators (128KB), prism-post-processor-reference (18KB),
prism-fanuc-programming (98KB), prism-siemens-programming (85KB),
prism-heidenhain-programming (86KB), prism-gcode-reference (87KB)
```

---

## 🔄 SUPERPOWERS WORKFLOW

```
BRAINSTORM → PLAN → EXECUTE → REVIEW-SPEC → REVIEW-QUALITY → HANDOFF
     │          │        │          │              │
     ▼          ▼        ▼          ▼              ▼
  Design &   Create   Implement   Verify       Code quality
  approval   detailed  with       output       patterns
  (STOP!)    tasks    checkpoints matches      10 Commandments

                      ↓ (if errors)
                 SP-DEBUGGING (4-phase)
                      ↓
              Return to previous stage
```

---

## ⚡ SKILL SELECTION BY TASK

| Task | Primary Skill | Support |
|------|---------------|---------|
| **Session start** | `prism-session-master` | - |
| **New feature** | `prism-sp-brainstorm` | `prism-sp-planning` |
| **Execution** | `prism-sp-execution` | domain skill |
| **Review** | `prism-sp-review-spec` | `prism-quality-master` |
| **Debugging** | `prism-sp-debugging` | `prism-error-catalog` |
| **Materials** | `prism-material-schema` | `prism-material-physics` |
| **Extraction** | `prism-monolith-extractor` | `prism-monolith-index` |
| **Code writing** | `prism-code-master` | `prism-sp-execution` |
| **Expert consult** | `prism-expert-master` | domain expert |
| **G-code work** | `prism-controller-quick-ref` | controller skill |
| **Handoff** | `prism-sp-handoff` | `prism-session-master` |

---

## 📋 THE 10 COMMANDMENTS

1. **USE EVERYWHERE** - 100% DB/engine utilization
2. **FUSE** - Cross-domain concepts
3. **VERIFY** - Physics + empirical + historical
4. **LEARN** - Every interaction → ML pipeline
5. **UNCERTAINTY** - Confidence intervals
6. **EXPLAIN** - XAI for all
7. **GRACEFUL** - Fallbacks
8. **PROTECT** - Validate, sanitize, backup
9. **PERFORM** - <2s load, <500ms calc
10. **USER-OBSESS** - 3-click rule

---

## 🛡️ BUFFER ZONES

| Zone | Trigger | Action |
|------|---------|--------|
| 🟢 GREEN | 0-8 tool calls | Work freely |
| 🟡 YELLOW | 9-14 tool calls | Checkpoint soon |
| 🟠 ORANGE | 15-18 tool calls | Checkpoint NOW |
| 🔴 RED | 19+ tool calls | EMERGENCY STOP |

---

## ⚡ LARGE FILE WRITING (>50KB)

Single writes truncate. Use chunked approach:
```
CHUNK 1: Filesystem:write_file (header + first items)
CHUNK 2: Desktop Commander:write_file mode='append' (more items)
CHUNK 3: Desktop Commander:write_file mode='append' (final + closing)
```
Keep chunks under 25KB.

---

## 🚨 ABSOLUTE REQUIREMENTS

- ✗ NO tasks without checking always-on laws first
- ✗ NO replacement without anti-regression protocol
- ✗ NO module without ALL consumers wired
- ✗ NO calculation with <6 data sources
- ✗ NO session without state file update
- ✗ NO mid-task restarts without user approval
- ✓ CHECKPOINT after every significant step
- ✓ VERIFY before and after EVERY operation

---

## 📊 SUPERPOWERS STATUS: COMPLETE ✓

```
═══════════════════════════════════════════════════════════════
SP.0:  Foundation ................................. ✅ COMPLETE
SP.1:  Core Workflow (8 skills, 720KB) ............ ✅ COMPLETE
SP.2:  Monolith Navigation (3 skills, 199KB) ...... ✅ COMPLETE
SP.3:  Materials System (5 skills, 244KB) ......... ✅ COMPLETE
SP.4:  prism-session-master (43KB) ................ ✅ COMPLETE
SP.5:  prism-quality-master (24KB) ................ ✅ COMPLETE
SP.6:  prism-code-master (20KB) ................... ✅ COMPLETE
SP.7:  prism-knowledge-master (12KB) .............. ✅ COMPLETE
SP.8:  prism-expert-master (12KB) ................. ✅ COMPLETE
SP.9:  prism-controller-quick-ref (9KB) ........... ✅ COMPLETE
SP.10: prism-dev-utilities (12KB) ................. ✅ COMPLETE
═══════════════════════════════════════════════════════════════
TOTAL: 24 new skills (1.30MB, 31,963 lines)
       10 comprehensive refs (1.04MB, 29,258 lines)
       45 archived source skills
       Battle Ready Prompt v10.4 (51KB, 973 lines)
═══════════════════════════════════════════════════════════════
       ~2.40MB total documentation | 34 active skills
═══════════════════════════════════════════════════════════════
```
