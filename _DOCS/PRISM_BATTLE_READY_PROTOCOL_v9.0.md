# PRISM BATTLE-READY DEVELOPMENT PROTOCOL v9.0
## Defensive + Predictive + Full Resource Integration
### Superpowers-Enhanced Universal Guide
**Created:** January 24, 2026 | **Status:** PRODUCTION

---

# ⚔️ PROTOCOL OVERVIEW

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                        BATTLE-READY DEVELOPMENT PROTOCOL                                   ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║   This protocol provides BULLETPROOF defensive and predictive tactics for ALL             ║
║   PRISM project activities with full utilization of 59 skills, 220+ courses,              ║
║   285 algorithms, and 10 AI expert roles.                                                 ║
║                                                                                           ║
║   LAYERS:                                                                                 ║
║   ┌─────────────────────────────────────────────────────────────────────────────────┐     ║
║   │  LAYER 5: RECOVERY       - Context compaction, session interruption, rollback   │     ║
║   │  LAYER 4: PREDICTIVE     - Anticipation, forecasting, pre-emptive saves         │     ║
║   │  LAYER 3: DEFENSIVE      - Validation gates, error prevention, data protection  │     ║
║   │  LAYER 2: METHODOLOGY    - Superpowers workflow, 4-phase debugging              │     ║
║   │  LAYER 1: RESOURCES      - 59 skills, 10 experts, MIT courses, algorithms       │     ║
║   │  LAYER 0: FOUNDATION     - State management, filesystem, tools                  │     ║
║   └─────────────────────────────────────────────────────────────────────────────────┘     ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# 🛡️ LAYER 0: FOUNDATION

## Dual Filesystem Architecture

| Filesystem | Tools | Persistence | Use For |
|------------|-------|-------------|---------|
| **C: Drive** | `Filesystem:*`, `Desktop Commander:*` | ✅ PERMANENT | ALL PRISM work |
| **Container** | `view`, `bash_tool` | ❌ RESETS | Reading skills only |

**🚫 ABSOLUTE RULE:** Never save PRISM work to `/home/claude/` or container paths.

## Critical Paths

```
STATE FILE:     C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
MONOLITH:       C:\..\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\*.html (986,621 lines)
EXTRACTED:      C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\
SKILLS:         /mnt/skills/user/prism-*/SKILL.md (59 skills)
SESSION LOGS:   C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\
DOCS:           C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_DOCS\
```

## Tool Matrix

| Operation | Primary Tool | Fallback | When to Use |
|-----------|--------------|----------|-------------|
| Read small file (<500 lines) | `Filesystem:read_file` | - | Default |
| Read large file | `Desktop Commander:read_file` | `Filesystem:read_file` with ranges | Files >500 lines |
| Write file | `Filesystem:write_file` | - | Default |
| Append to file | `Desktop Commander:write_file` mode="append" | Write full file | Building large files |
| Search files | `Desktop Commander:start_search` | `Filesystem:search_files` | Finding modules |
| Search content | `Desktop Commander:start_search` searchType="content" | - | Finding code patterns |
| Read skill | `view` | - | Always for skills |

---

# 🛡️ LAYER 1: RESOURCE INTEGRATION

## Complete Skill Inventory (59 Skills)

### Auto-Activation Triggers

| Trigger Pattern | Auto-Load Skills |
|-----------------|------------------|
| Session start | `prism-state-manager`, `prism-quick-start` |
| "extract" or "monolith" | `prism-extractor`, `prism-monolith-index`, `prism-auditor` |
| "material" or "steel" or "aluminum" | `prism-material-template`, `prism-physics-formulas`, `prism-expert-materials-scientist` |
| "machine" or "CNC" or "lathe" or "mill" | `prism-expert-mechanical-engineer`, `prism-expert-cam-programmer` |
| "G-code" or "post" or "NC" | `prism-gcode-reference`, `prism-expert-post-processor` |
| "FANUC" | `prism-fanuc-programming`, `prism-gcode-reference` |
| "Siemens" or "Sinumerik" | `prism-siemens-programming`, `prism-gcode-reference` |
| "Heidenhain" or "TNC" | `prism-heidenhain-programming`, `prism-gcode-reference` |
| "speed" or "feed" or "SFM" or "IPM" | `prism-manufacturing-tables`, `prism-product-calculators` |
| "force" or "Kienzle" or "cutting" | `prism-physics-formulas`, `prism-expert-mechanical-engineer` |
| "thermal" or "heat" or "temperature" | `prism-expert-thermodynamics`, `prism-physics-formulas` |
| "error" or "debug" or "problem" or "issue" | `prism-debugging`, `prism-error-catalog`, `prism-expert-master-machinist` |
| "quality" or "tolerance" or "SPC" | `prism-quality-gates`, `prism-expert-quality-control` |
| "wiring" or "consumer" or "integration" | `prism-consumer-mapper`, `prism-wiring-templates`, `prism-utilization` |
| "API" or "gateway" or "route" | `prism-api-contracts`, `prism-wiring-templates` |
| "large file" or ">1000 lines" | `prism-large-file-writer`, `prism-coding-patterns` |
| "skill" or "create skill" | `prism-coding-patterns`, `prism-large-file-writer` |
| "plan" or "roadmap" or "schedule" | `prism-planning`, `prism-session-handoff` |
| "context" or "compaction" or "tokens" | `prism-context-pressure`, `prism-context-dna` |

### Skill Combination Matrix

| Primary Task | Essential | Supporting | Expert |
|--------------|-----------|------------|--------|
| **Extraction** | extractor, monolith-index | auditor, verification | - |
| **Materials DB** | material-template, physics-formulas | manufacturing-tables | materials-scientist |
| **Machine DB** | coding-patterns, hierarchy-manager | wiring-templates | mechanical-engineer, cam-programmer |
| **Engine Dev** | coding-patterns, algorithm-selector | dependency-graph, tdd | mathematics |
| **G-code Work** | gcode-reference, [controller]-programming | post-processor-reference | post-processor |
| **API Dev** | api-contracts, wiring-templates | error-catalog, validator | - |
| **Debugging** | debugging, error-catalog | verification | master-machinist |
| **Quality** | quality-gates, validator | verification, tdd | quality-control, quality-manager |
| **Calculations** | product-calculators, physics-formulas | manufacturing-tables | thermodynamics, mechanical-engineer |

### 10 AI Expert Roles - Activation Rules

| Expert | Invoke When | Key Capabilities |
|--------|-------------|------------------|
| `prism-expert-master-machinist` | Troubleshooting, practical problems, "why isn't this working" | 40+ years experience, intuitive diagnosis |
| `prism-expert-materials-scientist` | Material selection, heat treatment, metallurgy | Composition, microstructure, properties |
| `prism-expert-mechanical-engineer` | Stress, deflection, force, vibration | FEA concepts, factor of safety, dynamics |
| `prism-expert-cam-programmer` | Toolpath strategy, operation sequencing | CAM systems, machining strategy |
| `prism-expert-cad-expert` | Feature recognition, DFM, geometry | CAD kernels, BREP, modeling |
| `prism-expert-post-processor` | G-code generation, controller specifics | Syntax, macros, cycles |
| `prism-expert-thermodynamics` | Heat transfer, thermal expansion | Conduction, convection, cooling |
| `prism-expert-mathematics` | Numerical methods, matrix operations | Algorithms, optimization, calculus |
| `prism-expert-quality-control` | SPC, measurement, Cp/Cpk | Inspection, statistical methods |
| `prism-expert-quality-manager` | ISO, PPAP, documentation | Compliance, certification |

### MIT/Stanford Course Integration (220+ Courses)

| Domain | Key Courses | Use For |
|--------|-------------|---------|
| Manufacturing | 2.008, 2.810, 2.830 | Cutting mechanics, process planning |
| Materials | 3.012, 3.032, 3.14 | Material science, mechanical behavior |
| Dynamics | 2.003, 2.032 | Vibration, modal analysis |
| Thermal | 2.51, 2.55 | Heat transfer, thermal systems |
| AI/ML | 6.867, 6.036, 9.520 | Machine learning, neural networks |
| Optimization | 6.255, 15.093 | Linear/nonlinear optimization |
| Controls | 6.302, 2.14 | Feedback systems, control design |
| Signal Processing | 6.003, 6.011 | Digital signals, FFT |

### Algorithm Registry (285 Algorithms)

| Category | Key Algorithms | PRISM Engine |
|----------|----------------|--------------|
| Cutting Forces | Kienzle, Merchant, Oxley | PRISM_FORCE_ENGINE |
| Tool Life | Taylor, Kronenberg, Extended Taylor | PRISM_TOOL_LIFE_ENGINE |
| Constitutive | Johnson-Cook, Zerilli-Armstrong, MTS | PRISM_CONSTITUTIVE_ENGINE |
| Optimization | PSO, GA, ACO, Bayesian | PRISM_OPTIMIZER |
| Signal | FFT, Wavelet, Hilbert | PRISM_SIGNAL_ENGINE |
| ML | Random Forest, XGBoost, Neural Net | PRISM_ML_ENGINE |

---

# 🛡️ LAYER 2: SUPERPOWERS METHODOLOGY

## Core Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SUPERPOWERS WORKFLOW                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   REQUEST                                                                       │
│      ↓                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  BRAINSTORM (MANDATORY)                                                 │   │
│   │  • STOP before implementing                                             │   │
│   │  • Socratic refinement (ask clarifying questions)                       │   │
│   │  • Present in chunks: Scope → Approach → Details                        │   │
│   │  • Get EXPLICIT approval before proceeding                              │   │
│   │  • Document alternatives considered                                     │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│      ↓ (approval required)                                                      │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  PLAN                                                                   │   │
│   │  • EXACT file paths (no placeholders)                                   │   │
│   │  • COMPLETE code (no "// implement later")                              │   │
│   │  • 2-5 minute executable tasks                                          │   │
│   │  • Verification commands for each step                                  │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│      ↓                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  EXECUTE                                                                │   │
│   │  • Checkpoint every significant step                                    │   │
│   │  • Update state file frequently                                         │   │
│   │  • Batch processing with save points                                    │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│      ↓                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  REVIEW (Two Stages - Sequential)                                       │   │
│   │  Stage 1: SPECIFICATION - Does it meet requirements?                    │   │
│   │     ↓ (must pass before Stage 2)                                        │   │
│   │  Stage 2: QUALITY - Is it well-implemented?                             │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│      ↓                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  VERIFY (Evidence-Based)                                                │   │
│   │  • Never claim "done" without PROOF                                     │   │
│   │  • Evidence types: file listings, line counts, test output, approval    │   │
│   │  • Document what was actually created/changed                           │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│      ↓                                                                          │
│   HANDOFF (State update, session log, next steps)                               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 4-Phase Debugging Protocol (MANDATORY)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      4-PHASE DEBUGGING - NO SKIPPING                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   PHASE 1: EVIDENCE COLLECTION                                                  │
│   ═══════════════════════════════                                               │
│   • Reproduce the issue 3+ times                                                │
│   • Log at boundaries (input/output/state changes)                              │
│   • Capture exact error messages, stack traces                                  │
│   • Document what DOES work vs what DOESN'T                                     │
│   • 🔒 GATE: Cannot proceed to Phase 2 without documented evidence              │
│                                                                                 │
│   PHASE 2: ROOT CAUSE TRACING                                                   │
│   ═══════════════════════════════                                               │
│   • Trace backward from symptom to source                                       │
│   • Identify the FIRST point of corruption                                      │
│   • Check: Data? Logic? State? Environment? Dependencies?                       │
│   • Use binary search to narrow down location                                   │
│   • 🔒 GATE: Cannot proceed to Phase 3 without identified root cause            │
│                                                                                 │
│   PHASE 3: HYPOTHESIS TESTING                                                   │
│   ═══════════════════════════════                                               │
│   • Form specific, testable hypothesis                                          │
│   • Create MINIMAL reproduction case                                            │
│   • Test hypothesis with smallest possible change                               │
│   • Validate fix in isolation before integration                                │
│   • 🔒 GATE: Cannot proceed to Phase 4 without validated hypothesis             │
│                                                                                 │
│   PHASE 4: FIX + PREVENTION                                                     │
│   ═══════════════════════════════                                               │
│   • Fix at ROOT CAUSE (not symptoms)                                            │
│   • Add validation layer to prevent recurrence                                  │
│   • Add regression test                                                         │
│   • Document the fix and prevention measure                                     │
│   • Update error catalog if new error pattern                                   │
│                                                                                 │
│   ⚠️ ANTI-PATTERN: Fixing symptoms without root cause = FAILURE                 │
│   ⚠️ ANTI-PATTERN: Skipping phases = PROHIBITED                                 │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# 🛡️ LAYER 3: DEFENSIVE PROTOCOLS

## Pre-Action Validation Gates

### Gate 1: State Verification (EVERY SESSION)
```
BEFORE ANY WORK:
□ Read CURRENT_STATE.json
□ Verify currentTask status
□ If IN_PROGRESS → Resume from checkpoint (DO NOT restart)
□ If COMPLETE → Start next queued task
□ Load relevant skills for task
```

### Gate 2: Resource Availability Check
```
BEFORE MAJOR OPERATIONS:
□ Verify target paths exist
□ Check file permissions (can write?)
□ Estimate output size (will it fit?)
□ Check for existing files (avoid overwrite without backup)
□ Verify tool availability (Desktop Commander? Filesystem?)
```

### Gate 3: Data Integrity Check
```
BEFORE MODIFYING DATA:
□ Create backup of original (or document original state)
□ Validate input format/structure
□ Check for required fields
□ Verify data types match expected
□ Document what will change
```

### Gate 4: Dependency Check
```
BEFORE ADDING/MODIFYING MODULES:
□ Identify all dependencies
□ Verify dependencies exist
□ Check for circular dependencies
□ Verify consumer compatibility
□ Document dependency chain
```

## Error Prevention Rules

### File Operations
```
ALWAYS:
✓ Use full absolute paths (never relative)
✓ Escape backslashes in Windows paths (\\)
✓ Verify directory exists before writing
✓ Check file exists before reading
✓ Use Desktop Commander for large files (>500 lines)

NEVER:
✗ Overwrite without backup/confirmation
✗ Delete without explicit user approval
✗ Assume path exists
✗ Use relative paths
✗ Write to container for PRISM work
```

### Code Generation
```
ALWAYS:
✓ Include complete error handling
✓ Add validation at boundaries
✓ Include fallback values
✓ Document assumptions
✓ Test edge cases mentally before writing

NEVER:
✗ Leave "TODO" or "implement later" placeholders
✗ Assume inputs are valid
✗ Ignore edge cases
✗ Skip error handling
✗ Hardcode environment-specific values
```

### Database Operations
```
ALWAYS:
✓ Validate against schema before insert
✓ Check for duplicates
✓ Verify referential integrity
✓ Include audit fields (created, modified)
✓ Document data sources

NEVER:
✗ Insert without validation
✗ Modify without backup
✗ Delete production data
✗ Skip null checks
✗ Ignore data type constraints
```

## Data Loss Prevention

### Checkpoint Protocol
```
MANDATORY CHECKPOINTS:
• After every file write
• Before risky operations
• Every 10 tool calls
• Before context-heavy operations
• At natural task boundaries
```

### Backup Strategy
```
BEFORE MODIFYING EXISTING FILES:
1. Document original state (first 50 lines minimum)
2. Or copy to .bak file
3. Or include original in session log
4. Verify backup before proceeding
```

### State Persistence
```
CURRENT_STATE.json MUST CONTAIN:
• Current task ID and status
• Checkpoint details (what's done, what's next)
• Files created/modified this session
• Any blockers or issues
• Quick resume instructions
```

---

# 🛡️ LAYER 4: PREDICTIVE PROTOCOLS

## Context Compaction Anticipation

### Warning Signs
| Indicator | Risk Level | Action |
|-----------|------------|--------|
| 50+ tool calls in session | 🟡 MEDIUM | Checkpoint, summarize progress |
| Large file reads (>1000 lines) | 🟡 MEDIUM | Process in chunks |
| Multiple large outputs | 🟡 MEDIUM | Save incrementally |
| Complex multi-step task | 🟡 MEDIUM | Pre-plan checkpoints |
| 75+ tool calls | 🔴 HIGH | STOP, create recovery state |

### Pre-Compaction Protocol
```
WHEN CONTEXT PRESSURE HIGH:
1. Update CURRENT_STATE.json with full progress
2. Write session log with detailed notes
3. Document exact next steps
4. List files created/modified
5. Summarize key decisions made
6. Include quick resume instructions
```

### Post-Compaction Recovery
```
AFTER COMPACTION DETECTED:
1. Read transcript file from /mnt/transcripts/
2. Read CURRENT_STATE.json
3. Read latest session log
4. DO NOT re-do completed work
5. Resume from documented checkpoint
6. Verify no data was lost
```

## Task Complexity Forecasting

### Complexity Indicators
| Factor | Low | Medium | High |
|--------|-----|--------|------|
| Files to create | 1-2 | 3-5 | 6+ |
| Lines of code | <500 | 500-2000 | 2000+ |
| Dependencies | 0-2 | 3-5 | 6+ |
| Skill combinations | 1-2 | 3-4 | 5+ |
| Expert roles needed | 0-1 | 2-3 | 4+ |

### Pre-Task Planning
```
FOR HIGH COMPLEXITY TASKS:
1. Break into 2-5 minute sub-tasks
2. Identify checkpoint boundaries
3. Determine skill loading order
4. Plan verification steps
5. Estimate context consumption
6. Schedule interim saves
```

## Resource Pre-Check

### Before Major Operations
```
□ Skill availability confirmed (view test)
□ Filesystem access confirmed (list test)
□ Source files exist and readable
□ Target directories exist
□ No conflicting operations in progress
□ Sufficient "context budget" for task
```

---

# 🛡️ LAYER 5: RECOVERY PROTOCOLS

## Context Compaction Recovery

```
IF CONVERSATION COMPACTED:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1. READ transcript: /mnt/transcripts/[latest].txt                              │
│ 2. READ state: C:\...\CURRENT_STATE.json                                        │
│ 3. READ session log: C:\...\SESSION_LOGS\[latest].md                            │
│ 4. IDENTIFY last completed checkpoint                                           │
│ 5. VERIFY no data loss (check files created)                                    │
│ 6. RESUME from checkpoint (do NOT restart)                                      │
│ 7. ANNOUNCE: "Resuming from [checkpoint]. Last completed: [task]"               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Session Interruption Recovery

```
IF SESSION ENDED UNEXPECTEDLY:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1. READ CURRENT_STATE.json                                                      │
│ 2. CHECK currentTask.status                                                     │
│ 3. IF "IN_PROGRESS":                                                            │
│    a. Read checkpoint details                                                   │
│    b. Verify files from checkpoint exist                                        │
│    c. Resume from last verified point                                           │
│ 4. IF "PAUSED" or "BLOCKED":                                                    │
│    a. Read blocker description                                                  │
│    b. Attempt to resolve blocker                                                │
│    c. If unresolvable, escalate to user                                         │
│ 5. NEVER restart completed portions                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Corruption Recovery

```
IF DATA APPEARS CORRUPTED:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1. STOP all operations immediately                                              │
│ 2. DO NOT overwrite anything                                                    │
│ 3. DOCUMENT the corruption (what's wrong, where)                                │
│ 4. CHECK for backups:                                                           │
│    - .bak files                                                                 │
│    - Session logs with original content                                         │
│    - Previous versions in _ARCHIVE                                              │
│    - Box cloud backup                                                           │
│ 5. RESTORE from backup if available                                             │
│ 6. IF no backup: RECONSTRUCT from source (monolith or other files)              │
│ 7. REPORT to user with recovery plan                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Rollback Procedures

### File Rollback
```
TO ROLLBACK A FILE CHANGE:
1. Check if .bak exists → restore from .bak
2. Check session log for original content → restore from log
3. Check _ARCHIVE for previous version → restore from archive
4. If no backup available → document loss, reconstruct from source
```

### State Rollback
```
TO ROLLBACK STATE:
1. Identify last known good state (from session log)
2. Rewrite CURRENT_STATE.json with good state
3. Verify files match state
4. Document rollback in new session log
```

---

# 📋 THE 10 COMMANDMENTS (Expanded)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           THE 10 COMMANDMENTS                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. IF IT EXISTS, USE IT EVERYWHERE                                             │
│     • Every database → minimum 6-8 consumers                                    │
│     • Every engine → maximum utilization                                        │
│     • Every algorithm → cross-domain application                                │
│     • VERIFY: "What else could use this?"                                       │
│                                                                                 │
│  2. FUSE THE UNFUSABLE                                                          │
│     • Combine physics + ML + heuristics                                         │
│     • Cross-domain insights (ecology → manufacturing)                           │
│     • Multi-source validation                                                   │
│     • Emergent capabilities from fusion                                         │
│                                                                                 │
│  3. TRUST BUT VERIFY                                                            │
│     • Physics-based calculation first                                           │
│     • Empirical data validation second                                          │
│     • Historical correlation third                                              │
│     • Minimum 3 sources for any recommendation                                  │
│                                                                                 │
│  4. LEARN FROM EVERYTHING                                                       │
│     • Every user interaction → learning pipeline                                │
│     • Every outcome → feedback loop                                             │
│     • Every error → pattern recognition                                         │
│     • Continuous model improvement                                              │
│                                                                                 │
│  5. PREDICT WITH UNCERTAINTY                                                    │
│     • Every output has confidence interval                                      │
│     • Monte Carlo for uncertainty propagation                                   │
│     • Bayesian updates with new data                                            │
│     • Clear communication of confidence                                         │
│                                                                                 │
│  6. EXPLAIN EVERYTHING                                                          │
│     • XAI for all recommendations                                               │
│     • Show your work (calculation breakdown)                                    │
│     • Cite sources and assumptions                                              │
│     • User can always ask "why?"                                                │
│                                                                                 │
│  7. FAIL GRACEFULLY                                                             │
│     • Every operation has fallback                                              │
│     • Degrade functionality, never crash                                        │
│     • Clear error messages with recovery steps                                  │
│     • No blank screens, no silent failures                                      │
│                                                                                 │
│  8. PROTECT EVERYTHING                                                          │
│     • Validate all inputs                                                       │
│     • Sanitize all outputs                                                      │
│     • Backup before modify                                                      │
│     • Encrypt sensitive data                                                    │
│                                                                                 │
│  9. PERFORM ALWAYS                                                              │
│     • <2s page load                                                             │
│     • <500ms calculations                                                       │
│     • 99.9% uptime                                                              │
│     • Optimize critical paths                                                   │
│                                                                                 │
│  10. OBSESS OVER USERS                                                          │
│      • 3-click rule (any task in 3 clicks)                                      │
│      • Smart defaults (90% don't need to change)                                │
│      • Instant feedback (never leave user waiting)                              │
│      • Progressive disclosure (simple → advanced)                               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# ⚡ BUFFER ZONES & CHECKPOINTING

## Tool Call Tracking

| Zone | Tool Calls Since Save | Status | Action |
|------|----------------------|--------|--------|
| 🟢 GREEN | 0-9 | Safe | Normal operation |
| 🟡 YELLOW | 10-14 | Caution | Plan checkpoint soon |
| 🟠 ORANGE | 15-17 | Warning | Checkpoint at next opportunity |
| 🔴 RED | 18+ | Critical | STOP IMMEDIATELY, save everything |

## Checkpoint Contents

```json
{
  "checkpointId": "CP-[timestamp]",
  "sessionId": "S.X.X",
  "taskId": "current-task-id",
  "status": "IN_PROGRESS",
  "completed": ["list", "of", "completed", "items"],
  "inProgress": "current item being worked on",
  "remaining": ["list", "of", "remaining", "items"],
  "filesCreated": ["path/to/file1.js", "path/to/file2.js"],
  "filesModified": ["path/to/existing.js"],
  "nextStep": "exact next action to take",
  "notes": "any important context",
  "toolCallsSinceSave": 0
}
```

---

# 🚨 ABSOLUTE REQUIREMENTS

## ALWAYS DO

```
✓ Read CURRENT_STATE.json at session start
✓ Load relevant skills before task
✓ Brainstorm before implementing
✓ Get approval before major changes
✓ Checkpoint after significant work (every 10 tool calls max)
✓ Verify with evidence (not claims)
✓ Update state file before session end
✓ Document next steps for handoff
✓ Use full absolute paths
✓ Include error handling in all code
✓ Follow 4-phase debugging for issues
✓ Back up before modifying existing files
```

## NEVER DO

```
✗ Start tasks without reading state
✗ Implement without brainstorming/approval
✗ Skip skill loading for task
✗ Create module without ALL consumers wired
✗ Make calculation with <6 data sources
✗ Claim "done" without evidence
✗ Restart completed work
✗ Overwrite without backup
✗ Save PRISM work to container
✗ Skip debugging phases
✗ Leave TODO/placeholder comments
✗ Ignore validation errors
✗ Proceed without checkpoint when in YELLOW+ zone
```

---

# 📊 PROJECT STATUS DASHBOARD

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                              PRISM v9.0 PROJECT STATUS                                     ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║   PHASE 0: Superpowers Upgrade     68 sessions    ⬅️ FIRST PRIORITY    [ 0% ]             ║
║   PHASE 1: Skills Completion        4 sessions                         [ 0% ]             ║
║   PHASE 2: Materials Database      42 sessions                         [ 2% ]             ║
║   PHASE 3: Machine Database        28 sessions                         [ 0% ]             ║
║   PHASE 4: Engine Extraction       32 sessions                         [ 0% ]             ║
║   PHASE 5: Systems & Knowledge     14 sessions                         [ 0% ]             ║
║   PHASE 6: Architecture Build       8 sessions                         [ 0% ]             ║
║   PHASE 7: Migration & Wiring      12 sessions                         [ 0% ]             ║
║   PHASE 8: Product Integration      8 sessions                         [ 0% ]             ║
║   PHASE 9: Testing & Deployment    18 sessions                         [ 0% ]             ║
║   ─────────────────────────────────────────────────────────────────────────────           ║
║   TOTAL: 234 sessions | Complete: 19 (~8%)                                                ║
║                                                                                           ║
║   RESOURCES: 59 skills | 220+ courses | 285 algorithms | 10 AI experts                    ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

**Document Version:** 9.0.0  
**Created:** January 24, 2026  
**Classification:** BATTLE-READY PRODUCTION  
**Total Skills:** 59 (42 Superpowers planned)  
**Methodology:** Superpowers + Defensive + Predictive
