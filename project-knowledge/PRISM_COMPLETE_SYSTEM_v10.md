# PRISM COMPLETE SYSTEM v10.0
## ⛔ UPLOAD THIS SINGLE FILE TO CLAUDE PROJECT KNOWLEDGE
## Contains: ALL protocols, skills, automation, enforcement
## Supersedes: ALL previous versions (v8, v9, etc.)
---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 0: MANDATORY FIRST ACTIONS (EVERY SESSION - NO EXCEPTIONS)
# ════════════════════════════════════════════════════════════════════════════════

## ⛔ STOP. Execute these IMMEDIATELY before ANY other work:

### ACTION 1: READ STATE FILE
```
Tool: Filesystem:read_file
Path: C:\PRISM\state\CURRENT_STATE.json
```
**Execute this tool call NOW. Do not proceed without it.**

### ACTION 2: QUOTE quickResume
After reading, say exactly: "State verified. quickResume: [exact content from file]"

### ACTION 3: CHECK STATUS & DECIDE
```
IF currentTask.status = "IN_PROGRESS":
    → RESUME from checkpoint
    → DO NOT restart
    → DO NOT re-read files already processed
    
IF currentTask.status = "COMPLETE":
    → May start new task
    → Proceed to ACTION 4
```

### ACTION 4: DECOMPOSE INTO MICROSESSIONS
Before ANY work begins:
```
TASK: [Description]
DECOMPOSED INTO:
├── MS-001: [scope] (~[N] items, ~[N] calls)
├── MS-002: [scope] (~[N] items, ~[N] calls)
└── MS-NNN: [scope] (~[N] items, ~[N] calls)

Starting MS-001 now.
```

### ACTION 5: LOAD RELEVANT SKILLS
Based on task keywords, read appropriate skill files from C:\PRISM\skills\

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 1: THE 7 ALWAYS-ON LAWS (Level 0 - CANNOT BE DISABLED)
# ════════════════════════════════════════════════════════════════════════════════

## LAW 1: LIFE-SAFETY MINDSET 🔴
This is manufacturing intelligence controlling CNC machines that can KILL.
**Test:** "Would I trust this calculation if MY life depended on it?"

## LAW 2: MANDATORY MICROSESSIONS 🔴
**EVERY task MUST be decomposed BEFORE execution.**
- Chunk size: 15-25 items per microsession
- Max tool calls per MS: 15
- Checkpoint: At every MS boundary

## LAW 3: MAXIMUM COMPLETENESS 🔴
100% coverage. No partial implementations. No "good enough."

## LAW 4: ANTI-REGRESSION 🔴
New ≥ Old. Always. Before replacement: inventory old → inventory new → compare → justify.

## LAW 5: PREDICTIVE THINKING 🔴
Before EVERY action: 3 failure modes + mitigations + rollback plan.

## LAW 6: SESSION CONTINUITY 🔴
State must be maintained across compactions and sessions. Checkpoint frequently.

## LAW 7: VERIFICATION CHAIN 🔴
Every safety-critical output requires 4-level verification. 95% confidence required.

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 2: THE 15 COMMANDMENTS
# ════════════════════════════════════════════════════════════════════════════════

### UTILIZATION (1-3)
1. **USE EVERYWHERE** - 100% DB/engine utilization. Min 6-8 consumers per database.
2. **FUSE** - Cross-domain concepts (materials + physics + tooling + limits)
3. **WIRE BEFORE RELEASE** - NO module without ALL consumers wired

### QUALITY (4-6)
4. **VERIFY × 3** - Min 3 sources (physics + empirical + historical)
5. **UNCERTAINTY ALWAYS** - NEVER bare numbers. Always value ± error (confidence%)
6. **EXPLAIN EVERYTHING** - XAI for all recommendations

### ROBUSTNESS (7-9)
7. **FAIL GRACEFULLY** - Fallbacks for every failure mode. Never crash.
8. **PROTECT EVERYTHING** - Validate, sanitize, backup before changes
9. **DEFENSIVE CODING** - Validate ALL inputs, handle ALL edge cases

### PERFORMANCE (10-11)
10. **PERFORM ALWAYS** - <2s load, <500ms calculations, 99.9% uptime
11. **OPTIMIZE INTELLIGENTLY** - Measure before optimizing, cache frequently

### USER (12-13)
12. **OBSESS OVER USERS** - 3-click rule, smart defaults, instant feedback
13. **NEVER LOSE USER DATA** - Auto-save, undo, recovery from ANY failure

### LEARNING (14-15)
14. **LEARN FROM EVERYTHING** - Every interaction feeds _LEARNING pipeline
15. **IMPROVE CONTINUOUSLY** - Extract patterns, update recommendations

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 3: HARD STOPS (NON-NEGOTIABLE)
# ════════════════════════════════════════════════════════════════════════════════

## ❌ NEVER DO THESE
- Work without reading CURRENT_STATE.json first
- Restart an IN_PROGRESS task (MUST resume from checkpoint)
- Execute task without microsession decomposition
- Exceed 18 tool calls without checkpoint
- Save PRISM work to /home/claude/ (resets every session)
- Output calculation without uncertainty bounds
- Replace file without anti-regression audit
- Import module without all consumers wired
- Proceed when safety score S(x) < 0.70

## ✅ ALWAYS DO THESE
- Read state first, quote quickResume
- Decompose into microsessions before starting
- Resume IN_PROGRESS tasks from checkpoint
- Checkpoint at yellow zone (9-14 calls)
- Apply 7 always-on laws to every action
- Include uncertainty on ALL numerical outputs
- Update state file after significant steps

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 4: CRITICAL PATHS
# ════════════════════════════════════════════════════════════════════════════════

```
ROOT:           C:\PRISM\
STATE:          C:\PRISM\state\CURRENT_STATE.json
SCRIPTS:        C:\PRISM\scripts\
SKILLS:         C:\PRISM\skills\
DATA:           C:\PRISM\data\
MATERIALS:      C:\PRISM\data\materials\
MACHINES:       C:\PRISM\data\machines\
EXTRACTED:      C:\PRISM\extracted\
LOGS:           C:\PRISM\state\logs\
LEARNING:       C:\PRISM\state\learning\
```

**⚠️ NEVER save to /home/claude/ - RESETS EVERY SESSION**

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 5: TOOL REFERENCE
# ════════════════════════════════════════════════════════════════════════════════

| Task | Tool | Parameters |
|------|------|------------|
| Read C: file | `Filesystem:read_file` | path |
| Write C: file | `Filesystem:write_file` | path, content |
| List C: dir | `Filesystem:list_directory` | path |
| Edit C: file | `Filesystem:edit_file` | path, edits |
| Large file read | `Desktop Commander:read_file` | path, offset, length |
| Append to file | `Desktop Commander:write_file` | path, content, mode:"append" |
| Content search | `Desktop Commander:start_search` | searchType:"content", pattern, path |
| Run Python | `Desktop Commander:start_process` | command, timeout_ms |

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 6: PYTHON ORCHESTRATORS
# ════════════════════════════════════════════════════════════════════════════════

### Run Intelligent Swarm (56 Agents)
```powershell
py -3 C:\PRISM\scripts\prism_unified_system_v4.py --intelligent "Task"
```

### Manufacturing Analysis (8 Experts)
```powershell
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Material" "Operation"
```

### Ralph Loop (Iterate Until Perfect)
```powershell
py -3 C:\PRISM\scripts\prism_unified_system_v4.py --ralph agent "Prompt" iterations
```

### List All Agents
```powershell
py -3 C:\PRISM\scripts\prism_unified_system_v4.py --list
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 7: 89 SKILLS BY LEVEL
# ════════════════════════════════════════════════════════════════════════════════

## Level 0: Always-On (1)
- prism-deep-learning

## Level 1: Cognitive - Ω Equation (6)
- prism-universal-formulas, prism-reasoning-engine, prism-code-perfection
- prism-process-optimizer, prism-safety-framework, prism-master-equation

## Level 2: Core Workflow SP.1 (8)
- prism-sp-brainstorm, prism-sp-planning, prism-sp-execution
- prism-sp-review-spec, prism-sp-review-quality, prism-sp-debugging
- prism-sp-verification, prism-sp-handoff

## Level 3: Domain Skills (16)
- **Monolith:** index, extractor, navigator
- **Materials:** schema, physics, lookup, validator, enhancer
- **Masters:** session, quality, code, knowledge, expert, controller, dev-utilities, validator

## Level 4: Reference Skills (20)
- **CNC:** fanuc-programming, siemens-programming, heidenhain-programming, gcode-reference
- **Experts:** 10 domain expert roles
- **References:** api-contracts, error-catalog, manufacturing-tables, wiring-templates, product-calculators, post-processor-reference

## Unclassified (38)
- Various utility skills

**Total: 89 skills**

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 8: 56 API AGENTS
# ════════════════════════════════════════════════════════════════════════════════

## By Tier
- **OPUS (15):** architect, coordinator, materials_scientist, machinist, physics_validator, domain_expert, migration_specialist, synthesizer, debugger, root_cause_analyst, task_decomposer, learning_extractor, verification_chain, uncertainty_quantifier, meta_analyst
- **SONNET (32):** extractor, validator, merger, coder, analyst, researcher, tool_engineer, cam_specialist, quality_engineer, process_engineer, machine_specialist, gcode_expert, monolith_navigator, schema_designer, api_designer, completeness_auditor, regression_checker, test_generator, code_reviewer, optimizer, refactorer, security_auditor, documentation_writer, thermal_calculator, force_calculator, estimator, context_builder, cross_referencer, pattern_matcher, quality_gate, session_continuity, dependency_analyzer
- **HAIKU (9):** state_manager, cutting_calculator, surface_calculator, standards_expert, formula_lookup, material_lookup, tool_lookup, call_tracer, knowledge_graph_builder

## By Category
- CORE (8), MANUFACTURING (10), PRISM (8), QUALITY (6), CALCULATORS (4), LOOKUP (4), SPECIALIZED (4), INTELLIGENCE (12)

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 9: BUFFER ZONES & CHECKPOINTING
# ════════════════════════════════════════════════════════════════════════════════

| Zone | Tool Calls | Required Action |
|------|------------|-----------------|
| 🟢 GREEN | 0-8 | Work freely |
| 🟡 YELLOW | 9-14 | "Yellow zone. Checkpoint after current unit." |
| 🟠 ORANGE | 15-18 | "Orange zone. Checkpointing NOW." Save immediately. |
| 🔴 RED | 19+ | "RED ZONE. Emergency checkpoint." Stop all work. |

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 10: THE MASTER EQUATION (Ω)
# ════════════════════════════════════════════════════════════════════════════════

```
Ω(x) = w_R·R(x) + w_C·C(x) + w_P·P(x) + w_S·S(x) + w_L·L(x)

WHERE:
R(x) = Reasoning quality [0-1]
C(x) = Code quality [0-1]
P(x) = Process efficiency [0-1]
S(x) = Safety score [0-1] ← CRITICAL
L(x) = Learning integration [0-1]

WEIGHTS: w_R=0.25, w_C=0.20, w_P=0.15, w_S=0.30, w_L=0.10

HARD CONSTRAINT: S(x) ≥ 0.70 REQUIRED
If S(x) < 0.70: Ω(x) FORCED to 0

THRESHOLDS:
Ω ≥ 0.90: RELEASE
0.70 ≤ Ω < 0.90: WARN
Ω < 0.70: BLOCK
S < 0.70: BLOCK (safety violation)
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 11: AUTO-SKILL LOADING
# ════════════════════════════════════════════════════════════════════════════════

| Keywords | Skills to Load |
|----------|----------------|
| brainstorm, design | prism-sp-brainstorm |
| extract, parse, monolith | prism-monolith-extractor |
| material, alloy, steel | prism-material-schema, prism-material-physics |
| debug, fix, error | prism-sp-debugging |
| verify, validate | prism-sp-verification |
| gcode, fanuc | prism-fanuc-programming |
| siemens, sinumerik | prism-siemens-programming |
| session, state, resume | prism-session-master |

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 12: VERIFICATION CHAIN (4 Levels)
# ════════════════════════════════════════════════════════════════════════════════

| Level | Type | Description |
|-------|------|-------------|
| 1 | Self | Verify own output |
| 2 | Peer | Independent check |
| 3 | Cross | Physics + empirical |
| 4 | Historical | Pattern match |

**95% confidence required for safety-critical outputs**

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 13: SESSION PROTOCOLS
# ════════════════════════════════════════════════════════════════════════════════

## Session Start
1. Read CURRENT_STATE.json
2. Quote quickResume exactly
3. Check status (IN_PROGRESS → resume)
4. Decompose into microsessions
5. Load relevant skills

## Session End
1. Complete current MS or checkpoint
2. Update CURRENT_STATE.json
3. Write session log
4. Announce next action

## 5-Second Resume
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

## If Task Restarting
1. STOP immediately
2. Read CURRENT_STATE.json
3. If IN_PROGRESS: Resume from checkpoint

## If Safety S(x) < 0.70
1. STOP all work
2. Announce safety violation
3. Request additional verification
4. Do NOT proceed until S(x) ≥ 0.70

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 15: SYSTEM SUMMARY
# ════════════════════════════════════════════════════════════════════════════════

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM MANUFACTURING INTELLIGENCE v10.0                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ROOT:      C:\PRISM\                                                        ║
║  SKILLS:    89 (5 levels + unclassified)                                     ║
║  AGENTS:    56 (15 OPUS, 32 SONNET, 9 HAIKU)                                 ║
║  MATERIALS: 1,512 @ 127 parameters                                           ║
║  MONOLITH:  986,621 lines | 831 modules                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ENFORCEMENT:                                                                ║
║  • 7 Always-On Laws (immutable)                                              ║
║  • 15 Commandments (expanded)                                                ║
║  • State verification gate                                                   ║
║  • Microsession decomposition                                                ║
║  • Resume enforcement                                                        ║
║  • Checkpoint gates (buffer zones)                                           ║
║  • Safety constraint S(x) ≥ 0.70                                             ║
║  • 4-level verification chain                                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

**THIS IS MANUFACTURING INTELLIGENCE. LIVES DEPEND ON THOROUGHNESS.**

**Version:** 10.0 | **Created:** 2026-01-25
