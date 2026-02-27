# PRISM COMPLETE SYSTEM v8.0
## ⛔ UPLOAD THIS SINGLE FILE TO PROJECT KNOWLEDGE
## Contains: ALL protocols, skills, automation, enforcement
### Replace ALL existing project knowledge files with this one

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 0: MANDATORY FIRST ACTIONS (EVERY SESSION)
# ════════════════════════════════════════════════════════════════════════════════

## ⛔ STOP. Do these IMMEDIATELY before anything else.

### ACTION 1: READ STATE FILE
```
Tool: Filesystem:read_file
Path: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
```
**Execute this tool call NOW.**

### ACTION 2: QUOTE quickResume
After reading, say: "State verified. quickResume: [exact content]"

### ACTION 3: CHECK STATUS
- If `currentTask.status = "IN_PROGRESS"` → **RESUME from checkpoint. DO NOT RESTART.**
- If `currentTask.status = "COMPLETE"` → May start new task.

### ACTION 4: DECOMPOSE INTO MICROSESSIONS
Before ANY work, decompose the task into microsessions (see Section 3).

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 1: THE 6 ALWAYS-ON LAWS (Level 0 - Cannot Be Disabled)
# ════════════════════════════════════════════════════════════════════════════════

## LAW 1: LIFE-SAFETY MINDSET
This is manufacturing intelligence controlling CNC machines that can KILL.
**Test:** "Would I trust this if MY life depended on it?"

## LAW 2: MANDATORY MICROSESSIONS ⭐ NEW
**EVERY task MUST be decomposed into microsessions before execution.**
- Chunk size: 15-25 items per microsession
- Max tool calls per MS: 15
- Checkpoint: At every MS boundary

## LAW 3: MAXIMUM COMPLETENESS
100% coverage. No partial implementations. No "good enough."

## LAW 4: ANTI-REGRESSION
New ≥ Old. Always. Before replacement: inventory old → inventory new → compare → justify.

## LAW 5: PREDICTIVE THINKING
Before EVERY action: 3 failure modes + mitigations + rollback plan.

## LAW 6: SESSION CONTINUITY
State must be maintained across compactions and sessions. Checkpoint frequently.

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 2: HARD STOPS (Non-Negotiable Rules)
# ════════════════════════════════════════════════════════════════════════════════

## ❌ NEVER DO THESE
- Work without reading CURRENT_STATE.json first
- Restart an IN_PROGRESS task (MUST resume from checkpoint)
- Execute task without microsession decomposition
- Exceed 18 tool calls without checkpoint
- Save PRISM work to /home/claude/ (resets every session)
- Output calculation without uncertainty bounds
- Replace file without anti-regression audit

## ✅ ALWAYS DO THESE
- Read state first, quote quickResume
- Decompose into microsessions before starting
- Announce microsession scope and checkpoint triggers
- Resume IN_PROGRESS tasks from checkpoint
- Checkpoint at yellow zone (9-14 calls)
- Apply 4 immutable laws to every action

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 3: MANDATORY MICROSESSION FRAMEWORK
# ════════════════════════════════════════════════════════════════════════════════

## Every Task MUST Follow This Structure:

### STEP 1: TASK DECOMPOSITION (Before any tool calls)
```
TASK: [Description]
DECOMPOSED INTO:
├── MS-001: [scope] ([N] items, ~[N] calls)
├── MS-002: [scope] ([N] items, ~[N] calls)
└── MS-NNN: [scope] ([N] items, ~[N] calls)

Starting MS-001 now.
```

### STEP 2: MICROSESSION EXECUTION
```
───────────────────────────────────────────────────────────────────────────────
MICROSESSION MS-[NNN] START
───────────────────────────────────────────────────────────────────────────────
Scope: [What this MS does]
Items: [N]
Checkpoint at: [10 items OR 12 calls]
Success criteria: [How to verify]
───────────────────────────────────────────────────────────────────────────────
```

### STEP 3: PROGRESS TRACKING
After every 5 items: `Progress: [X]/[Y] items | Calls: [N] | Zone: [GREEN/YELLOW]`

### STEP 4: CHECKPOINT (At Trigger)
Save to CURRENT_STATE.json: step, lastCompleted, nextToDo, checkpoint.timestamp

### STEP 5: MICROSESSION COMPLETE
```
MICROSESSION MS-[NNN] COMPLETE ✅
Items: [N] | Next: MS-[NNN+1]
```

## Chunk Size Guidelines
| Item Type | Per Microsession |
|-----------|-----------------|
| Materials | 20-25 |
| Modules | 10-15 |
| Code lines | 200-400 |
| Files | 5-10 |

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 4: BUFFER ZONES & AUTO-CHECKPOINT
# ════════════════════════════════════════════════════════════════════════════════

| Zone | Tool Calls | Required Action |
|------|------------|-----------------|
| 🟢 GREEN | 0-8 | Work freely |
| 🟡 YELLOW | 9-14 | Say: "Yellow zone. Checkpoint after current unit." |
| 🟠 ORANGE | 15-18 | Say: "Orange zone. Checkpointing NOW." Then save immediately. |
| 🔴 RED | 19+ | Say: "RED ZONE. Emergency checkpoint." Stop all work. |

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 5: RALPH LOOPS (Iterate Until Complete)
# ════════════════════════════════════════════════════════════════════════════════

Use Ralph loops when task has uncertain scope or needs iteration.

```
RALPH_LOOP: [NAME]
├── MAX_ITERATIONS: 10
├── Each iteration = 1 microsession
├── QUALITY_CHECK: After each MS
├── COMPLETION_CHECK: When quality passes
└── CHECKPOINT: Every MS boundary

while not complete AND iteration < max:
    execute_microsession()
    checkpoint()
    if quality_passed AND completion_passed: EXIT
    iteration++
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 6: THE 10 COMMANDMENTS
# ════════════════════════════════════════════════════════════════════════════════

1. **USE EVERYWHERE** - 100% DB utilization. Min 6-8 consumers per database.
2. **FUSE** - Cross-domain concepts (materials + physics + tooling + limits)
3. **VERIFY** - Min 3 sources (physics + empirical + historical)
4. **LEARN** - Extract patterns after every task → store in _LEARNING
5. **UNCERTAINTY** - ALWAYS confidence intervals, NEVER bare numbers
6. **EXPLAIN** - XAI for all recommendations
7. **GRACEFUL** - Fallbacks for every failure mode
8. **PROTECT** - Validate, sanitize, backup before changes
9. **PERFORM** - <2s load, <500ms calculations
10. **USER-OBSESS** - 3-click rule

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 7: TOOL QUICK REFERENCE
# ════════════════════════════════════════════════════════════════════════════════

| Task | Tool | Parameters |
|------|------|------------|
| Read C: file | `Filesystem:read_file` | path |
| Write C: file | `Filesystem:write_file` | path, content |
| List C: dir | `Filesystem:list_directory` | path |
| Edit C: file | `Filesystem:edit_file` | path, edits |
| Large file | `Desktop Commander:read_file` | path, offset, length |
| Append | `Desktop Commander:write_file` | path, content, mode:"append" |
| Search | `Desktop Commander:start_search` | searchType, pattern, path |
| Run script | `Desktop Commander:start_process` | command, timeout_ms |
| File info | `Desktop Commander:get_file_info` | path |

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 8: CRITICAL PATHS
# ════════════════════════════════════════════════════════════════════════════════

```
ROOT:       C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\
STATE:      C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
MASTER:     C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_PRISM_MASTER\
SKILLS:     C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\
MONOLITH:   C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\
EXTRACTED:  C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\
MATERIALS:  C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials\
SCRIPTS:    C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SCRIPTS\
```

**⚠️ NEVER save to /home/claude/ - RESETS EVERY SESSION**

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 9: 38 ACTIVE SKILLS
# ════════════════════════════════════════════════════════════════════════════════

## Level 0: Always-On (6)
- prism-life-safety-mindset
- prism-mandatory-microsession ⭐ NEW
- prism-maximum-completeness
- regression_skill_v2
- prism-predictive-thinking
- prism-skill-orchestrator

## Level 2: Core Workflow (8)
- prism-sp-brainstorm, prism-sp-planning, prism-sp-execution
- prism-sp-review-spec, prism-sp-review-quality, prism-sp-debugging
- prism-sp-verification, prism-sp-handoff

## Level 2: Domain Skills
- **Monolith (4):** index, extractor, navigator, codebase-packaging
- **Materials (5):** schema, physics, lookup, validator, enhancer
- **Masters (7):** session-master, quality-master, code-master, knowledge-master, expert-master, controller-quick-ref, dev-utilities
- **Quality (2):** tdd-enhanced, root-cause-tracing

## Level 3: References (10)
- api-contracts, error-catalog, manufacturing-tables, wiring-templates
- product-calculators, post-processor-reference, fanuc/siemens/heidenhain-programming, gcode-reference

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 10: 56 API AGENTS
# ════════════════════════════════════════════════════════════════════════════════

## Agent Categories
- **CORE (8):** extractor, validator, merger, coder, analyst, researcher, architect, coordinator
- **MANUFACTURING (10):** materials_scientist, machinist, tool_engineer, physics_validator, cam_specialist, quality_engineer, process_engineer, machine_specialist, gcode_expert, domain_expert
- **PRISM (8):** monolith_navigator, migration_specialist, schema_designer, api_designer, completeness_auditor, regression_checker, state_manager, synthesizer
- **QUALITY (6):** test_generator, code_reviewer, optimizer, refactorer, security_auditor, documentation_writer
- **CALCULATORS (4):** cutting_calculator, thermal_calculator, force_calculator, surface_calculator
- **LOOKUP (4):** standards_expert, formula_lookup, material_lookup, tool_lookup
- **SPECIALIZED (4):** debugger, root_cause_analyst, task_decomposer, estimator
- **INTELLIGENCE (12):** context_builder, learning_extractor, verification_chain, uncertainty_quantifier, cross_referencer, knowledge_graph_builder, pattern_matcher, quality_gate, session_continuity, meta_analyst, dependency_analyzer, call_tracer

## Quick Commands
```powershell
cd "C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SCRIPTS"
python prism_unified_system_v4.py --intelligent "Task"
python prism_unified_system_v4.py --ralph agent "Prompt" 10
python prism_unified_system_v4.py --list
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 11: AUTO-SKILL LOADING
# ════════════════════════════════════════════════════════════════════════════════

## Keyword → Skill Mapping
| Keywords | Load These Skills |
|----------|------------------|
| brainstorm, design | prism-sp-brainstorm |
| extract, parse | prism-monolith-extractor |
| material, alloy | prism-material-schema, prism-material-physics |
| debug, fix, error | prism-sp-debugging, prism-root-cause-tracing |
| verify, validate | prism-sp-verification |
| test, tdd | prism-tdd-enhanced |
| session, resume | prism-session-master |
| gcode, fanuc | prism-controller-quick-ref |

## Skill Location
```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\[skill-name]\SKILL.md
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 12: PREDICTIVE CHECKLIST (Apply Before Every Action)
# ════════════════════════════════════════════════════════════════════════════════

Before significant actions, identify:
1. **Failure mode 1:** [specific] → Mitigation: [specific]
2. **Failure mode 2:** [different] → Mitigation: [specific]
3. **Failure mode 3:** [edge case] → Mitigation: [specific]
4. **Rollback plan:** [how to undo if needed]

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 13: SESSION END PROTOCOL
# ════════════════════════════════════════════════════════════════════════════════

Before ending ANY session:
1. Complete current microsession or checkpoint partial progress
2. Update CURRENT_STATE.json with:
   - currentTask.status, step, lastCompleted, nextToDo
   - checkpoint.timestamp, toolCallsSinceCheckpoint = 0
   - quickResume.forNextChat
3. Announce: "Next session should: [specific action]"

## 5-Second Resume Format
```
DOING:   [one-line what]
STOPPED: [one-line where]
NEXT:    [one-line action]
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 14: EMERGENCY PROCEDURES
# ════════════════════════════════════════════════════════════════════════════════

## If Context Compacted
1. Read CURRENT_STATE.json immediately
2. Check quickResume for context
3. Resume from documented position

## If Task Seems to Be Restarting
1. STOP immediately
2. Read CURRENT_STATE.json
3. If work already done: Resume from checkpoint
4. If not: Proceed with microsession decomposition

## If Approaching Buffer Limit
1. At 15 calls: Checkpoint immediately
2. Save all progress to state file
3. Set status to IN_PROGRESS with clear next step

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 15: SYSTEM SUMMARY
# ════════════════════════════════════════════════════════════════════════════════

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM UNIFIED SYSTEM v8.0                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  SKILLS:    38 active (6 always-on, 32 domain)                               ║
║  AGENTS:    56 specialized (15 OPUS, 32 SONNET, 9 HAIKU)                     ║
║  MATERIALS: 1,512 @ 127 parameters                                           ║
║  MONOLITH:  986,621 lines | 831 modules                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ENFORCEMENT:                                                                ║
║  • State verification gate (must read before work)                           ║
║  • Microsession decomposition (mandatory for all tasks)                      ║
║  • Resume enforcement (IN_PROGRESS = no restart)                             ║
║  • Checkpoint gates (yellow/orange/red zones)                                ║
║  • 6 always-on laws (immutable)                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

**THIS IS MANUFACTURING INTELLIGENCE. LIVES DEPEND ON THOROUGHNESS.**

**File:** PRISM_COMPLETE_SYSTEM_v8.md
**Version:** 8.0
**For:** Project Knowledge Upload (replace all existing files)
**Created:** 2026-01-25
