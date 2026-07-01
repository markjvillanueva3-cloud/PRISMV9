# PRISM COMPLETE SYSTEM v9.0
## ⛔ UPLOAD THIS SINGLE FILE TO CLAUDE PROJECT KNOWLEDGE
## Contains: ALL protocols, skills, automation, enforcement
### Location: C:\PRISM\project-knowledge\PRISM_COMPLETE_SYSTEM_v9.md
---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 0: MANDATORY FIRST ACTIONS (EVERY SESSION)
# ════════════════════════════════════════════════════════════════════════════════

## ⛔ STOP. Do these IMMEDIATELY before anything else.

### ACTION 1: READ STATE FILE
```
Tool: Filesystem:read_file
Path: C:\PRISM\state\CURRENT_STATE.json
```
**Execute this tool call NOW.**

### ACTION 2: QUOTE quickResume
After reading, say: "State verified. quickResume: [exact content]"

### ACTION 3: CHECK STATUS
- If `currentTask.status = "IN_PROGRESS"` → **RESUME from checkpoint. DO NOT RESTART.**
- If `currentTask.status = "COMPLETE"` → May start new task.

### ACTION 4: DECOMPOSE INTO MICROSESSIONS
Before ANY work, decompose the task into microsessions (15-25 items each).

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 1: THE 6 ALWAYS-ON LAWS (Level 0 - Cannot Be Disabled)
# ════════════════════════════════════════════════════════════════════════════════

## LAW 1: LIFE-SAFETY MINDSET
This is manufacturing intelligence controlling CNC machines that can KILL.
**Test:** "Would I trust this if MY life depended on it?"

## LAW 2: MANDATORY MICROSESSIONS
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
- Apply 6 always-on laws to every action

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 3: CRITICAL PATHS (NEW CLEAN STRUCTURE)
# ════════════════════════════════════════════════════════════════════════════════

```
ROOT:           C:\PRISM\
STATE:          C:\PRISM\state\CURRENT_STATE.json
SCRIPTS:        C:\PRISM\scripts\
SKILLS:         C:\PRISM\skills\
  ├── level0-always-on\     (Always active)
  ├── level1-cognitive\     (Ω equation skills)
  ├── level2-workflow\      (SP.1 workflow)
  ├── level3-domain\        (Domain skills)
  ├── level4-reference\     (Reference docs)
  └── unclassified\         (Other skills)
DATA:           C:\PRISM\data\
  ├── materials\            (1,512 materials)
  ├── machines\             (43 manufacturers)
  └── tools\                (Cutting tool catalogs)
MONOLITH:       C:\PRISM REBUILD...\PRISM_v8_89_002_TRUE_100_PERCENT\
```

**⚠️ NEVER save to /home/claude/ - RESETS EVERY SESSION**

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 4: TOOL QUICK REFERENCE
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
| Run Python | `Desktop Commander:start_process` | command:"py -3 ...", timeout_ms |
| File info | `Desktop Commander:get_file_info` | path |

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 5: PYTHON SCRIPTS (Ready to Run)
# ════════════════════════════════════════════════════════════════════════════════

### Run Intelligent Swarm (56 Agents)
```
py -3 C:\PRISM\scripts\prism_unified_system_v4.py --intelligent "Your task here"
```

### Manufacturing Analysis
```
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Ti-6Al-4V" "face milling"
```

### Ralph Loop (Iterate Until Perfect)
```
py -3 C:\PRISM\scripts\prism_unified_system_v4.py --ralph agent "prompt" iterations
```

### List All Agents
```
py -3 C:\PRISM\scripts\prism_unified_system_v4.py --list
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 6: 89 SKILLS BY LEVEL
# ════════════════════════════════════════════════════════════════════════════════

## Level 0: Always-On (1 skill)
- prism-deep-learning

## Level 1: Cognitive Foundation (6 skills)
- prism-universal-formulas (109 manufacturing formulas)
- prism-reasoning-engine (R(x) quality metric)
- prism-code-perfection (C(x) code quality)
- prism-process-optimizer (P(x) process metric)
- prism-safety-framework (S(x) safety metric - MANDATORY ≥ 0.70)
- prism-master-equation (Ω(x) unified quality function)

## Level 2: Core Workflow (8 skills)
- prism-sp-brainstorm, prism-sp-planning, prism-sp-execution
- prism-sp-review-spec, prism-sp-review-quality, prism-sp-debugging
- prism-sp-verification, prism-sp-handoff

## Level 3: Domain Skills (16 skills)
- **Monolith:** index, extractor, navigator
- **Materials:** schema, physics, lookup, validator, enhancer
- **Masters:** session, quality, code, knowledge, expert, controller, dev-utilities, validator

## Level 4: Reference Skills (20 skills)
- **CNC Controllers:** fanuc-programming, siemens-programming, heidenhain-programming, gcode-reference
- **Expert Roles:** 10 domain experts
- **References:** api-contracts, error-catalog, manufacturing-tables, wiring-templates, etc.

## Unclassified (38 skills)
- Various utility skills in `C:\PRISM\skills\unclassified\`

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 7: 56 API AGENTS
# ════════════════════════════════════════════════════════════════════════════════

**CORE (8):** extractor, validator, merger, coder, analyst, researcher, architect, coordinator
**MANUFACTURING (10):** materials_scientist, machinist, tool_engineer, physics_validator, cam_specialist, quality_engineer, process_engineer, machine_specialist, gcode_expert, domain_expert
**PRISM (8):** monolith_navigator, migration_specialist, schema_designer, api_designer, completeness_auditor, regression_checker, state_manager, synthesizer
**QUALITY (6):** test_generator, code_reviewer, optimizer, refactorer, security_auditor, documentation_writer
**CALCULATORS (4):** cutting_calculator, thermal_calculator, force_calculator, surface_calculator
**LOOKUP (4):** standards_expert, formula_lookup, material_lookup, tool_lookup
**SPECIALIZED (4):** debugger, root_cause_analyst, task_decomposer, estimator
**INTELLIGENCE (12):** context_builder, learning_extractor, verification_chain, uncertainty_quantifier, cross_referencer, knowledge_graph_builder, pattern_matcher, quality_gate, session_continuity, meta_analyst, dependency_analyzer, call_tracer

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 8: THE 10 COMMANDMENTS
# ════════════════════════════════════════════════════════════════════════════════

1. **USE EVERYWHERE** - 100% DB utilization. Min 6-8 consumers per database.
2. **FUSE** - Cross-domain concepts (materials + physics + tooling + limits)
3. **VERIFY** - Min 3 sources (physics + empirical + historical)
4. **LEARN** - Extract patterns after every task → store in learning
5. **UNCERTAINTY** - ALWAYS confidence intervals, NEVER bare numbers
6. **EXPLAIN** - XAI for all recommendations
7. **GRACEFUL** - Fallbacks for every failure mode
8. **PROTECT** - Validate, sanitize, backup before changes
9. **PERFORM** - <2s load, <500ms calculations
10. **USER-OBSESS** - 3-click rule

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 9: BUFFER ZONES & AUTO-CHECKPOINT
# ════════════════════════════════════════════════════════════════════════════════

| Zone | Tool Calls | Required Action |
|------|------------|-----------------|
| 🟢 GREEN | 0-8 | Work freely |
| 🟡 YELLOW | 9-14 | Say: "Yellow zone. Checkpoint after current unit." |
| 🟠 ORANGE | 15-18 | Say: "Orange zone. Checkpointing NOW." Then save immediately. |
| 🔴 RED | 19+ | Say: "RED ZONE. Emergency checkpoint." Stop all work. |

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 10: MASTER EQUATION (Ω)
# ════════════════════════════════════════════════════════════════════════════════

```
Ω(x) = w_R·R(x) + w_C·C(x) + w_P·P(x) + w_S·S(x) + w_L·L(x)

SUBJECT TO: S(x) ≥ 0.70 (HARD SAFETY CONSTRAINT - cannot be bypassed)

Default weights: w_R=0.25, w_C=0.20, w_P=0.15, w_S=0.30, w_L=0.10

Decision thresholds:
- Ω ≥ 0.90: RELEASE (high confidence)
- 0.70 ≤ Ω < 0.90: WARN (release with warnings)
- Ω < 0.70: BLOCK (do not release)
- S < 0.70: BLOCK (safety violation, Ω forced to 0)
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 11: AUTO-SKILL LOADING
# ════════════════════════════════════════════════════════════════════════════════

| Keywords | Load These Skills |
|----------|------------------|
| brainstorm, design | level2-workflow/prism-sp-brainstorm |
| extract, parse | level3-domain/prism-monolith-extractor |
| material, alloy | level3-domain/prism-material-* |
| debug, fix, error | level2-workflow/prism-sp-debugging |
| verify, validate | level2-workflow/prism-sp-verification |
| test, tdd | unclassified/prism-tdd |
| gcode, fanuc | level4-reference/prism-*-programming |

### How to Load a Skill
```
Tool: Filesystem:read_file
Path: C:\PRISM\skills\[level]\[skill-name]\SKILL.md
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 12: SESSION END PROTOCOL
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
# SECTION 13: EMERGENCY PROCEDURES
# ════════════════════════════════════════════════════════════════════════════════

## If Context Compacted
1. Read C:\PRISM\state\CURRENT_STATE.json immediately
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
# SECTION 14: SYSTEM SUMMARY
# ════════════════════════════════════════════════════════════════════════════════

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM MANUFACTURING INTELLIGENCE v9.0                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ROOT:      C:\PRISM\                                                        ║
║  STATE:     C:\PRISM\state\CURRENT_STATE.json                                ║
║  SKILLS:    89 total across 5 levels + unclassified                          ║
║  AGENTS:    56 specialized API agents                                        ║
║  MATERIALS: 1,512 @ 127 parameters                                           ║
║  MACHINES:  43 manufacturers with enhanced specifications                    ║
║  MONOLITH:  986,621 lines | 831 modules                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ENFORCEMENT:                                                                ║
║  • State verification gate (must read before work)                           ║
║  • Microsession decomposition (mandatory for all tasks)                      ║
║  • Resume enforcement (IN_PROGRESS = no restart)                             ║
║  • Checkpoint gates (yellow/orange/red zones)                                ║
║  • 6 always-on laws (immutable)                                              ║
║  • Safety constraint S(x) ≥ 0.70 (cannot be bypassed)                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

**THIS IS MANUFACTURING INTELLIGENCE. LIVES DEPEND ON THOROUGHNESS.**

**File:** PRISM_COMPLETE_SYSTEM_v9.md
**Version:** 9.0
**Location:** C:\PRISM\project-knowledge\
**For:** Claude Project Knowledge Upload
**Created:** 2026-01-25
