# ⛔ MANDATORY SESSION START PROTOCOL v1.0
## PRISM Manufacturing Intelligence - LIVES DEPEND ON THIS
### This document MUST be read and followed at EVERY session start

---

# 🚨 CRITICAL: READ THIS BEFORE DOING ANYTHING

This protocol exists because PRISM is manufacturing intelligence software that controls CNC machines. 
**Incomplete work, restarted tasks, or lost progress can result in:**
- Incorrect cutting parameters → tool breakage → flying debris → **INJURY**
- Wrong material properties → machine overload → spindle crash → **EQUIPMENT DAMAGE**
- Lost calculations → manual override → operator error → **FATALITY**

**This is not theoretical. This is why we have this protocol.**

---

# ⛔ HARD RULES (NON-NEGOTIABLE)

## Rule 1: STATE MUST BE READ FIRST
```
BEFORE ANY OTHER ACTION:
1. Read: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
2. Quote the quickResume field to PROVE you read it
3. Only then proceed with any work
```

**VIOLATION**: Starting ANY task without reading and quoting state = PROTOCOL FAILURE

## Rule 2: NEVER RESTART IN-PROGRESS TASKS
```
IF currentTask.status = "IN_PROGRESS":
  → You MUST resume from lastCompleted
  → You MUST NOT start over
  → You MUST NOT re-read files already processed
  → You MUST continue from the checkpoint
```

**VIOLATION**: Restarting an IN_PROGRESS task = PROTOCOL FAILURE + POTENTIAL SAFETY ISSUE

## Rule 3: CHECKPOINT AT BUFFER ZONES
```
Tool Calls Since Last Checkpoint:
  0-8:   🟢 GREEN  - Work freely
  9-14:  🟡 YELLOW - Complete current unit, then checkpoint
  15-18: 🟠 ORANGE - STOP and checkpoint NOW
  19+:   🔴 RED    - EMERGENCY STOP, full checkpoint, consider handoff
```

**VIOLATION**: Exceeding 18 tool calls without checkpoint = CONTEXT LOSS RISK

## Rule 4: VERIFY BEFORE AND AFTER EVERY OPERATION
```
BEFORE: Does this operation make sense? Will it preserve data?
AFTER:  Did it work? Is the output complete? Any regression?
```

**VIOLATION**: Operating without verification = DATA LOSS RISK

---

# 📋 SESSION START CHECKLIST

Execute these steps IN ORDER. Do not skip any step.

```
□ STEP 1: Read CURRENT_STATE.json
  Tool: Filesystem:read_file
  Path: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
  
□ STEP 2: Quote quickResume (PROVE you read it)
  Say: "State verified. quickResume says: [quote the actual content]"
  
□ STEP 3: Check currentTask.status
  IF "IN_PROGRESS":
    → State: "Resuming task [id] from step [N]"
    → DO NOT start new work
    → Continue from lastCompleted
  IF "COMPLETE":
    → State: "Previous task complete. Starting new task."
    → Proceed with new work
    
□ STEP 4: Identify phase and load relevant skills
  Brainstorm → prism-sp-brainstorm
  Planning → prism-sp-planning
  Execution → prism-sp-execution
  Review → prism-sp-review-spec, prism-sp-review-quality
  Debugging → prism-sp-debugging, prism-root-cause-tracing
  Materials → prism-material-schema, prism-material-physics
  Extraction → prism-monolith-extractor, prism-monolith-navigator
  
□ STEP 5: Initialize buffer counter
  Set mental counter: toolCallsSinceCheckpoint = 0
  
□ STEP 6: State your plan
  Say: "I will [specific task]. First action: [specific action]."
```

---

# 🛡️ ANTI-RESTART MECHANISMS

## Mechanism 1: State Verification Gate
You cannot begin work until you have:
- Read CURRENT_STATE.json
- Quoted the quickResume field
- Acknowledged the currentTask status

## Mechanism 2: Resume Enforcement
If currentTask.status = "IN_PROGRESS":
- The ONLY valid action is to RESUME
- Starting fresh is BLOCKED
- Re-reading already-processed files is BLOCKED
- You MUST continue from lastCompleted

## Mechanism 3: Checkpoint Enforcement
At these triggers, you MUST checkpoint:
- 10+ tool calls since last save
- Before any destructive operation (delete, replace, overwrite)
- Before any risky operation (merge, migrate, refactor)
- At end of any logical unit of work
- Before session end

## Mechanism 4: Context Preservation
To prevent context loss:
- Keep responses concise (avoid 4000+ word responses)
- Checkpoint progress to CURRENT_STATE.json
- Use quickResume format for handoffs
- Never trust that context will survive compaction

---

# 📍 CRITICAL PATHS (Single Source of Truth)

```
PRIMARY LOCATIONS:
├── STATE:      C:\PRISM REBUILD...\CURRENT_STATE.json
├── MASTER:     C:\PRISM REBUILD...\_PRISM_MASTER\
│   ├── PROTOCOL\   ← All protocols (YOU ARE HERE)
│   ├── SKILLS\     ← All 37 active skills
│   ├── SCRIPTS\    ← All Python tools
│   ├── AGENTS\     ← Agent definitions
│   ├── STATE\      ← State files and backups
│   └── LEARNING\   ← ML pipeline output
├── MONOLITH:   C:\PRISM REBUILD...\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\
├── EXTRACTED:  C:\PRISM REBUILD...\EXTRACTED\
└── LOGS:       C:\PRISM REBUILD...\SESSION_LOGS\

TOOL USAGE:
├── Read C: files     → Filesystem:read_file
├── Write C: files    → Filesystem:write_file
├── List C: dirs      → Filesystem:list_directory
├── Large files       → Desktop Commander:read_file (offset/length)
├── Append to files   → Desktop Commander:write_file (mode:"append")
├── Search content    → Desktop Commander:start_search
└── Run Python        → Desktop Commander:start_process

⚠️ NEVER save to /home/claude/ - RESETS EVERY SESSION
```

---

# 🎯 THE 4 ALWAYS-ON LAWS

These laws are ALWAYS active. You cannot disable them.

## Law 1: LIFE-SAFETY MINDSET
"Would I trust this output with my own physical safety?"
- Every calculation affects real machines
- Every parameter affects real cutting operations
- Every incomplete task is a potential failure point

## Law 2: MAXIMUM COMPLETENESS
"Is every field populated? Every case handled? Every edge covered?"
- No partial implementations
- No "good enough" approximations
- No orphaned features or data

## Law 3: ANTI-REGRESSION
"Is the new version as complete as the old?"
- Never lose data during updates
- Never lose features during refactoring
- If replacement is smaller, justify every removed byte

## Law 4: PREDICTIVE THINKING
"What are 3 ways this could fail?"
- Anticipate edge cases before they happen
- Plan fallbacks for every operation
- Consider downstream effects of every change

---

# 📊 QUICK REFERENCE CARD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRISM SESSION QUICK REFERENCE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SESSION START                                                              │
│  ═══════════════                                                            │
│  1. Read CURRENT_STATE.json (ALWAYS)                                        │
│  2. Quote quickResume (PROVE IT)                                            │
│  3. Check status (IN_PROGRESS = RESUME)                                     │
│  4. Load relevant skills                                                    │
│  5. Initialize buffer counter = 0                                           │
│                                                                             │
│  BUFFER ZONES                                                               │
│  ═══════════════                                                            │
│  🟢 0-8 calls    → Work freely                                              │
│  🟡 9-14 calls   → Plan checkpoint                                          │
│  🟠 15-18 calls  → Checkpoint NOW                                           │
│  🔴 19+ calls    → EMERGENCY STOP                                           │
│                                                                             │
│  CHECKPOINT TRIGGERS                                                        │
│  ═══════════════                                                            │
│  • 10+ tool calls                                                           │
│  • Before delete/replace/overwrite                                          │
│  • End of logical unit                                                      │
│  • Before session end                                                       │
│                                                                             │
│  HARD STOPS                                                                 │
│  ═══════════════                                                            │
│  ❌ NO work without reading state first                                     │
│  ❌ NO restarting IN_PROGRESS tasks                                         │
│  ❌ NO skipping checkpoints at orange/red                                   │
│  ❌ NO saving to /home/claude/                                              │
│                                                                             │
│  5-SECOND RESUME FORMAT                                                     │
│  ═══════════════                                                            │
│  DOING:   [one-line what]                                                   │
│  STOPPED: [one-line where]                                                  │
│  NEXT:    [one-line action]                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 🔄 SESSION END PROTOCOL

Before ending ANY session:

```
□ STEP 1: Complete current logical unit (no partial work)

□ STEP 2: Update CURRENT_STATE.json
  - currentTask.status (COMPLETE or IN_PROGRESS)
  - currentTask.step and totalSteps
  - currentTask.lastCompleted and nextToDo
  - quickResume with 5-second format

□ STEP 3: Verify checkpoint saved
  - Re-read state file to confirm write succeeded

□ STEP 4: Announce next session scope
  - "Next session should: [specific action]"
```

---

# ⚠️ FAILURE MODES AND RECOVERY

## If you started without reading state:
1. STOP immediately
2. Read CURRENT_STATE.json NOW
3. Check if work duplicates existing progress
4. Adjust plan to avoid duplication

## If you restarted an IN_PROGRESS task:
1. STOP immediately
2. Check lastCompleted in state
3. Identify what was already done
4. Resume from the checkpoint, not the beginning

## If context compacted mid-task:
1. Read CURRENT_STATE.json
2. Check quickResume for context
3. Read last 20 lines of target file
4. Resume from documented position

## If approaching context limit:
1. Checkpoint immediately
2. Write comprehensive quickResume
3. Announce handoff needed
4. DO NOT start new work

---

# REMEMBER

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   THIS IS MANUFACTURING INTELLIGENCE SOFTWARE                                 ║
║   CONTROLLING REAL CNC MACHINES                                               ║
║   THAT CAN INJURE OR KILL OPERATORS                                           ║
║                                                                               ║
║   EVERY INCOMPLETE TASK IS A POTENTIAL FAILURE POINT                          ║
║   EVERY RESTART WASTES TIME AND RISKS INCONSISTENCY                           ║
║   EVERY LOST CHECKPOINT MAY MEAN REDOING CRITICAL WORK                        ║
║                                                                               ║
║   FOLLOW THIS PROTOCOL. NO EXCEPTIONS.                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

**Document Version:** 1.0
**Created:** 2026-01-25
**Location:** C:\PRISM REBUILD...\_PRISM_MASTER\PROTOCOL\00_SESSION_START.md
**Status:** MANDATORY - Must be followed at every session start
