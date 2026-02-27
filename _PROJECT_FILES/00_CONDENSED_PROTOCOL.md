# PRISM CONDENSED PROTOCOL v4.0
## Quick Reference (Updated 2026-01-24)
### Now with 79 Skills (62 Domain + 17 Superpowers)

---

## 🔴 EVERY SESSION - DO THIS FIRST

```
1. READ: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
2. CHECK: Is currentTask IN_PROGRESS? → Resume from checkpoint, don't restart
3. LOAD: Always-on mindsets are automatic (Level 0-1 in /mnt/project/)
4. READ: Phase-appropriate skill from C:\_SKILLS\prism-sp-*
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
SKILLS:     C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\ (79 skills)
SP SKILLS:  C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\prism-sp-*
LOGS:       C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\
PROJECT:    /mnt/project/ (always-on skills)
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

## 🎯 79 SKILLS BY CATEGORY

### SUPERPOWERS (17 new) - C:\_SKILLS\prism-sp-*

**SP.1 Core Development Workflow (8):**
prism-sp-brainstorm, prism-sp-planning, prism-sp-execution, prism-sp-review-spec, prism-sp-review-quality, prism-sp-debugging, prism-sp-verification, prism-sp-handoff

**SP.2 Monolith Navigation (3):**
prism-monolith-index, prism-monolith-extractor, prism-monolith-navigator

**SP.3 Materials System (5):**
prism-material-schema, prism-material-physics, prism-material-lookup, prism-material-validator, prism-material-enhancer

**SP.4 Session Management (1 consolidation):**
prism-session-master (consolidates 5 skills)

### DOMAIN SKILLS (62) - C:\_SKILLS\prism-*

**Core Development (9):** prism-development, prism-state-manager, prism-extractor, prism-auditor, prism-utilization, prism-consumer-mapper, prism-hierarchy-manager, prism-swarm-orchestrator, prism-python-tools

**Monolith Navigation (3):** prism-monolith-index, prism-monolith-navigator, prism-extraction-index

**Materials System (5):** prism-material-template, prism-material-templates, prism-material-lookup, prism-physics-formulas, prism-physics-reference

**Session Management (4):** prism-session-handoff, prism-session-buffer, prism-task-continuity, prism-planning

**Quality & Validation (6):** prism-validator, prism-verification, prism-quality-gates, prism-tdd, prism-review, prism-debugging

**Code & Architecture (6):** prism-coding-patterns, prism-algorithm-selector, prism-dependency-graph, prism-tool-selector, prism-unit-converter, prism-large-file-writer

**Context Management (4):** prism-context-dna, prism-context-pressure, prism-quick-start, prism-category-defaults

**Knowledge Base (2):** prism-knowledge-base, prism-error-recovery

**AI Expert Roles (10):** prism-expert-cad-expert, prism-expert-cam-programmer, prism-expert-master-machinist, prism-expert-materials-scientist, prism-expert-mathematics, prism-expert-mechanical-engineer, prism-expert-post-processor, prism-expert-quality-control, prism-expert-quality-manager, prism-expert-thermodynamics

**CNC Controllers (4):** prism-fanuc-programming, prism-heidenhain-programming, prism-siemens-programming, prism-gcode-reference

**Additional (9):** prism-manufacturing-tables, prism-post-processor-reference, prism-product-calculators, prism-wiring-templates, prism-api-contracts, prism-error-catalog, prism-derivation-helpers, prism-anti-regression, prism-category-defaults

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

| Task | Skills to Read |
|------|---------------|
| **Session start** | `prism-session-master` (consolidated) |
| **New feature** | `prism-sp-brainstorm` → `prism-sp-planning` |
| **Execution** | `prism-sp-execution` + domain skill |
| **Review** | `prism-sp-review-spec` → `prism-sp-review-quality` |
| **Debugging** | `prism-sp-debugging` |
| **Materials** | `prism-material-schema`, `prism-material-physics` |
| **Extraction** | `prism-monolith-extractor`, `prism-monolith-index` |
| **Code writing** | `prism-coding-patterns`, `prism-large-file-writer` |
| **Handoff** | `prism-sp-handoff`, `prism-session-master` |

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

## 📊 CURRENT PROGRESS

```
Superpowers: 17/68 skills (30.9%)
SP.0-4: ✅ COMPLETE
SP.5+: ⬜ PENDING
Total: 1.21MB, 28,847 lines
```
