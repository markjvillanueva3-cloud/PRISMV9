# PRISM CONDENSED PROTOCOL v7.0
## Unified Single Reference Document
### Updated: 2026-01-25 | WITH ENFORCEMENT MECHANISMS

---

# 🔴 MANDATORY: EVERY SESSION - DO THIS FIRST

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  STEP 1: READ STATE                                                           ║
║  ───────────────────                                                          ║
║  Tool: Filesystem:read_file                                                   ║
║  Path: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json      ║
║                                                                               ║
║  STEP 2: PROVE YOU READ IT                                                    ║
║  ───────────────────                                                          ║
║  Quote: The quickResume field (exact text)                                    ║
║                                                                               ║
║  STEP 3: CHECK STATUS                                                         ║
║  ───────────────────                                                          ║
║  IF currentTask.status = "IN_PROGRESS":                                       ║
║     → RESUME from checkpoint. DO NOT restart.                                 ║
║  IF currentTask.status = "COMPLETE":                                          ║
║     → Start new task.                                                         ║
║                                                                               ║
║  STEP 4: LOAD SKILLS                                                          ║
║  ───────────────────                                                          ║
║  Read relevant skill from _PRISM_MASTER\SKILLS\                               ║
║                                                                               ║
║  STEP 5: DELEGATE OR EXECUTE                                                  ║
║  ───────────────────                                                          ║
║  Simple task → Do it yourself                                                 ║
║  Parallel/Complex → Delegate to API swarm                                     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# 📍 SINGLE SOURCE OF TRUTH: PATHS

```
ROOT:       C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\
            └── _PRISM_MASTER\              ← PRIMARY LOCATION
                ├── PROTOCOL\               ← All protocols (including this)
                ├── SKILLS\                 ← All 37 active skills
                ├── SCRIPTS\                ← All Python tools
                │   ├── orchestrators\      ← API system scripts
                │   ├── generators\         ← Material/machine generators
                │   ├── validators\         ← Quality checking
                │   └── utilities\          ← Helper scripts
                ├── AGENTS\                 ← 56 agent definitions
                ├── STATE\                  ← State files + backups
                └── LEARNING\               ← ML pipeline output

STATE:      C:\PRISM REBUILD...\CURRENT_STATE.json
MONOLITH:   C:\PRISM REBUILD...\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\
EXTRACTED:  C:\PRISM REBUILD...\EXTRACTED\
MATERIALS:  C:\PRISM REBUILD...\EXTRACTED\materials\
LOGS:       C:\PRISM REBUILD...\SESSION_LOGS\
```

---

# 🛠️ TOOL QUICK REFERENCE

| Task | Tool | Key Parameters |
|------|------|----------------|
| Read C: file | `Filesystem:read_file` | path |
| Write C: file | `Filesystem:write_file` | path, content |
| List C: dir | `Filesystem:list_directory` | path |
| Edit C: file | `Filesystem:edit_file` | path, edits |
| Read LARGE file | `Desktop Commander:read_file` | path, offset, length |
| **Append to file** | `Desktop Commander:write_file` | path, content, mode:"append" |
| Search content | `Desktop Commander:start_search` | searchType:"content", pattern |
| Search files | `Desktop Commander:start_search` | searchType:"files", pattern |
| Run Python | `Desktop Commander:start_process` | command, timeout_ms |
| Read skill | `view` | path in /mnt/project/ or /mnt/skills/ |

**⚠️ CRITICAL: NEVER save PRISM work to /home/claude/ - RESETS EVERY SESSION**

---

# 🚀 API MULTI-AGENT SYSTEM v4.0

## When to Delegate to API Swarm:
- Parallel extraction (5+ items simultaneously)
- Multiple expert opinions required
- Complex iteration (Ralph loops until complete)
- Heavy computation (100+ materials)
- Manufacturing analysis with verification

## Quick Commands:
```powershell
# Location: C:\PRISM REBUILD...\_SCRIPTS\

# INTELLIGENT MODE (recommended)
python prism_unified_system_v4.py --intelligent "Your task here"

# Manufacturing with verification
python prism_unified_system_v4.py --manufacturing "Ti-6Al-4V" "pocket milling"

# Ralph loop (iterate until done)
python prism_unified_system_v4.py --ralph architect "Design X" 10

# List all 56 agents
python prism_unified_system_v4.py --list
```

## 56 Agents by Category:
| Category | Count | Examples |
|----------|-------|----------|
| CORE | 8 | extractor, validator, merger, coder |
| MANUFACTURING | 10 | materials_scientist, machinist, tool_engineer |
| PRISM | 8 | monolith_navigator, migration_specialist |
| QUALITY | 6 | test_generator, code_reviewer, optimizer |
| CALCULATORS | 4 | cutting_calc, thermal_calc, force_calc |
| LOOKUP | 4 | standards_expert, formula_lookup |
| SPECIALIZED | 4 | debugger, root_cause_analyst |
| INTELLIGENCE | 12 | context_builder, learning_extractor |

---

# 🎯 37 ACTIVE SKILLS

## Level 0-1: Always-On (Auto-loaded)
```
prism-life-safety-mindset    prism-maximum-completeness
regression_skill_v2          prism-predictive-thinking
prism-skill-orchestrator_v5
```

## Level 2: SP.1 Core Workflow (8)
```
prism-sp-brainstorm          prism-sp-planning
prism-sp-execution           prism-sp-review-spec
prism-sp-review-quality      prism-sp-debugging
prism-sp-verification        prism-sp-handoff
```

## Level 2: Domain Skills
```
MONOLITH (4):   prism-monolith-index, extractor, navigator, codebase-packaging
MATERIALS (5):  prism-material-schema, physics, lookup, validator, enhancer
MASTERS (7):    prism-session-master, quality-master, code-master, 
                knowledge-master, expert-master, controller-quick-ref, dev-utilities
QUALITY (2):    prism-tdd-enhanced, prism-root-cause-tracing
```

## Level 3: References (10)
```
prism-api-contracts          prism-error-catalog
prism-manufacturing-tables   prism-wiring-templates
prism-product-calculators    prism-post-processor-reference
prism-fanuc-programming      prism-siemens-programming
prism-heidenhain-programming prism-gcode-reference
```

---

# ⚡ THE 4 ALWAYS-ON LAWS

```
LAW 1: LIFE-SAFETY
"Would I trust this with my own physical safety?"

LAW 2: COMPLETENESS  
"Is every field populated? Every case handled?"

LAW 3: ANTI-REGRESSION
"Is the new version as complete as the old?"

LAW 4: PREDICTIVE
"What are 3 ways this could fail?"
```

---

# 📋 THE 10 COMMANDMENTS

1. **USE EVERYWHERE** - 100% DB/engine utilization (min 6-8 consumers)
2. **FUSE** - Cross-domain concepts at every opportunity
3. **VERIFY** - Physics + empirical + historical (min 3 sources)
4. **LEARN** - Every interaction → ML pipeline → _LEARNING/
5. **UNCERTAINTY** - Confidence intervals on ALL numerical values
6. **EXPLAIN** - XAI for all recommendations
7. **GRACEFUL** - Fallbacks for every failure mode
8. **PROTECT** - Validate, sanitize, backup before every operation
9. **PERFORM** - <2s load, <500ms calc
10. **USER-OBSESS** - 3-click rule

---

# 🛡️ BUFFER ZONES & CHECKPOINTS

| Zone | Tool Calls | Action Required |
|------|------------|-----------------|
| 🟢 GREEN | 0-8 | Work freely |
| 🟡 YELLOW | 9-14 | Plan checkpoint, complete current unit |
| 🟠 ORANGE | 15-18 | **CHECKPOINT NOW** before continuing |
| 🔴 RED | 19+ | **EMERGENCY STOP** - full checkpoint, consider handoff |

## Checkpoint Triggers (Mandatory):
- 10+ tool calls since last save
- Before ANY destructive operation (delete, replace, overwrite)
- End of any logical unit of work
- Before session end
- Before risky operation (merge, migrate, refactor)

## Checkpoint Types:
| Type | When | What to Update |
|------|------|----------------|
| Micro | Every 5-10 ops | step counter only |
| Standard | End of units | task + checkpoint block |
| Full | Session end | everything + quickResume |

---

# 🔒 ENFORCEMENT MECHANISMS

## Hard Stops (Non-Negotiable):
```
❌ NO work without reading CURRENT_STATE.json first
❌ NO restarting IN_PROGRESS tasks - MUST resume
❌ NO exceeding 18 tool calls without checkpoint
❌ NO saving to /home/claude/
❌ NO module without ALL consumers wired
❌ NO calculation with <6 data sources
❌ NO replacement without anti-regression audit
```

## Enforcement Protocol:
```
1. STATE GATE: Cannot begin work until state read AND quoted
2. RESUME GATE: IN_PROGRESS status forces resume, blocks restart
3. CHECKPOINT GATE: Orange zone forces checkpoint before continue
4. VERIFICATION GATE: All outputs must pass 4 always-on laws
```

---

# ⚡ LARGE FILE WRITING (>50KB)

Single writes WILL truncate. Use chunked approach:

```
CHUNK 1: Filesystem:write_file (header + first 20KB)
CHUNK 2: Desktop Commander:write_file mode='append' (next 20KB)
CHUNK 3: Desktop Commander:write_file mode='append' (next 20KB)
CHUNK N: Desktop Commander:write_file mode='append' (final + closing)
```

**Rules:**
- Keep chunks under 25KB
- Verify file size after each chunk
- Use get_file_info to confirm total size

---

# 📊 DATABASE LAYERS

```
LEARNED  → AI/ML-derived (highest priority, most recent)
USER     → Shop-specific overrides
ENHANCED → Manufacturer-specific validated data
CORE     → Infrastructure defaults (fallback)
```

**4-Layer Hierarchy**: LEARNED > USER > ENHANCED > CORE

---

# 🔄 SESSION LIFECYCLE

## Start:
```
1. Read CURRENT_STATE.json
2. Quote quickResume (prove you read it)
3. Check status (IN_PROGRESS = RESUME)
4. Load relevant skills
5. Initialize buffer counter = 0
```

## During:
```
• Track tool calls since last checkpoint
• Checkpoint at yellow zone (9-14 calls)
• Full checkpoint at orange zone (15-18 calls)
• STOP at red zone (19+ calls)
```

## End:
```
1. Complete current logical unit
2. Full CURRENT_STATE.json update
3. Write quickResume (DOING/STOPPED/NEXT format)
4. Verify checkpoint saved
5. Announce next session scope
```

---

# 🎯 5-SECOND RESUME FORMAT

```
═══════════════════════════════════════════════════════════════════════════
5-SECOND RESUME
═══════════════════════════════════════════════════════════════════════════
DOING:   [one-line what we were doing]
STOPPED: [one-line where we stopped]
NEXT:    [one-line what to do immediately]
═══════════════════════════════════════════════════════════════════════════
```

---

# 🤖 SKILL → AGENT AUTO-MAPPING

| Task Keywords | Skills Triggered | Agents Spawned |
|---------------|------------------|----------------|
| brainstorm, design | sp-brainstorm, sp-planning | architect, researcher |
| extract, parse | monolith-extractor | extractor, dependency_analyzer |
| debug, fix, error | sp-debugging, root-cause-tracing | debugger, call_tracer |
| material, alloy | material-schema, material-physics | materials_scientist |
| cutting, machining | expert-master | machinist, force_calculator |
| validate, verify | sp-verification | validator, verification_chain |
| test, tdd | tdd-enhanced | test_generator, coder |
| session, resume | session-master | session_continuity |

---

# 📊 SYSTEM SUMMARY

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM UNIFIED SYSTEM v7.0                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  SKILLS:         37 active in _PRISM_MASTER\SKILLS\                          ║
║  AGENTS:         56 specialized (15 OPUS, 32 SONNET, 9 HAIKU)                ║
║  SWARMS:         8 pre-built patterns                                        ║
║  MATERIALS:      1,512 @ 127 parameters each                                 ║
║  MONOLITH:       986,621 lines | 831 modules                                 ║
║                                                                              ║
║  ENFORCEMENT:                                                                ║
║  • State verification gate (must read before work)                           ║
║  • Resume enforcement (IN_PROGRESS = no restart)                             ║
║  • Checkpoint gates (orange/red zones)                                       ║
║  • 4 always-on laws (immutable)                                              ║
║                                                                              ║
║  LOCATION:       C:\PRISM REBUILD...\_PRISM_MASTER\                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

**Document Version:** 7.0
**Created:** 2026-01-25
**Location:** C:\PRISM REBUILD...\_PRISM_MASTER\PROTOCOL\02_CONDENSED_PROTOCOL_v7.md
**Status:** PRIMARY REFERENCE - Single source of truth
