---
name: prism-sp-execution
description: |
  Checkpoint execution with progress tracking and safe interruption.
  Use when: execute plan, run tasks, implement, do the work.
  Executes task lists from planning with evidence capture.
  Requires approved plan from prism-sp-planning.
  Hands off to prism-sp-verification after completion.
  Part of SP.1 Core Development Workflow.
---

# PRISM-SP-EXECUTION
## Checkpoint Execution with Progress Tracking

---

# SECTION 1: CONTEXT BUFFER MANAGEMENT

Context buffer represents how much "room" remains in the conversation before context compaction may occur. Managing this proactively prevents lost work.

## 1.1 Buffer Zone System

```
GREEN  (0-8 msgs):   Normal execution. Checkpoint only when scheduled.
YELLOW (9-14 msgs):  Caution. Continue but checkpoint at next opportunity.
RED    (15-18 msgs): Critical. Finish current task, MANDATORY checkpoint.
BLACK  (19+ msgs):   Emergency. Do NOT start new tasks. Immediate handoff.
```

## 1.2 Zone Behavior

**GREEN:** Execute tasks sequentially. Full evidence capture. Follow scheduled checkpoints only.

**YELLOW:** Continue executing but add checkpoint at next logical boundary. May condense evidence reporting. Alert user to zone status.

**RED:** Complete current task ONLY. Mandatory checkpoint after. Minimal evidence (essentials only). Strong recommendation to stop. If user continues: 1 more task max.

**BLACK:** Do NOT start new tasks. If mid-task: finish it, then stop. Emergency checkpoint immediately. Generate handoff notes. Session must end.

## 1.3 Zone Transitions

```
GREEN -> YELLOW (9 msgs):   Plan checkpoint after current task group
YELLOW -> RED (15 msgs):    Finish current task, then MANDATORY checkpoint
RED -> BLACK (19 msgs):     STOP. Emergency handoff NOW.
```

## 1.4 Buffer Status Display

Include in every checkpoint:

```
BUFFER STATUS: [ZONE] ([N] messages)
  Remaining:  ~[N] messages before next zone
  Action:     [what to do]
```

## 1.5 Recovery

- Checkpoint restores GREEN: continue normally.
- Checkpoint still YELLOW: recommend stopping, can continue with caution.
- Checkpoint in RED/BLACK: must stop. Handoff to new session.

---

# SECTION 2: CHECKPOINT PROTOCOL

## 2.1 Checkpoint Triggers

```
SCHEDULED:  Plan says checkpoint after this task
YELLOW:     Buffer in yellow zone
REQUESTED:  User asked to checkpoint
MILESTONE:  Logical completion point (e.g., all materials created)
RED/BLACK:  Buffer critical - checkpoint NOW
```

## 2.2 Checkpoint State Format

Update CURRENT_STATE.json at each checkpoint:

```json
{
  "currentTask": {
    "phase": "execution",
    "status": "checkpointed",
    "checkpoint": { "number": 2, "afterTask": "T5" },
    "progress": {
      "completed": ["T1", "T2", "T3", "T4", "T5"],
      "remaining": ["T6", "T7", "T8"],
      "total": 8,
      "percentComplete": 62.5
    }
  },
  "evidence": {
    "filesCreated": [{"path": "...", "size": "14KB", "verified": true}],
    "filesModified": [],
    "validationsPassed": []
  },
  "resumeInstructions": {
    "nextTask": "T6",
    "nextCheckpoint": "after T8 (final)",
    "context": "Materials created, ready to wire"
  }
}
```

## 2.3 Checkpoint Report Format

```
=======================================
    CHECKPOINT [N] - SAFE TO STOP
=======================================
PROGRESS: [X]/[Y] tasks ([%])
  [x] T1: [name]  DONE
  [ ] T3: [name]  NEXT

EVIDENCE: [summary]
STATE: CURRENT_STATE.json updated
BUFFER: [zone] ([N] messages)
OPTIONS: [CONTINUE] or [STOP]
=======================================
```

## 2.4 Emergency Checkpoint (RED/BLACK)

```
WARNING: BUFFER CRITICAL - RED (16 messages)
=======================================
    EMERGENCY CHECKPOINT - MUST STOP SOON
=======================================
Current task COMPLETED - checkpointing now.
PROGRESS: 5/8 tasks (62.5%)
STATE SAVED: Yes

Recommend: Stop now and resume in new session.
Or: complete 1 more task maximum, then stop.
=======================================
```

---

# SECTION 3: EXTRACT / WIRE / VALIDATE EXECUTION PATTERNS

These task types are specific to PRISM's monolith decomposition and module integration workflow.

## 3.1 EXTRACT Tasks

**Purpose:** Pull code from PRISM monolith (PRISM_v8_89_002.html) into standalone module.

**Process:**
1. Locate source lines in monolith (from task card line numbers)
2. Verify start/end markers match expected content
3. Copy content to new file, preserving original structure
4. Add imports/exports for standalone use
5. Remove/replace hardcoded monolith dependencies

**Example:**
```
=== EXECUTING T3: Extract KIENZLE_FORCE_ENGINE from monolith ===
Source:   PRISM_v8_89_002.html lines 45230-45890
Target:   engines/physics/KIENZLE_FORCE_ENGINE.js

=== COMPLETED T3 ===
Evidence:
  [x] Source: lines 45230-45890 (660 lines)
  [x] Target: KIENZLE_FORCE_ENGINE.js (34,520 bytes)
  [x] Functions: calculateKienzleForce, calculateSpecificForce, applyCorrections
  [x] Imports added: getMaterial, getUnitConverter
  [x] Exports added: calculateKienzleForce, calculateSpecificForce
```

## 3.2 WIRE Tasks

**Purpose:** Connect an extracted PRISM database/engine to its consumers.

**Process:**
1. Verify source module exists and exports correctly
2. Read consumer file, find import section and usage location
3. Add import statement with correct relative path
4. Replace old inline data access with new import usage
5. Remove old inline data/code if specified

**Example:**
```
=== EXECUTING T7: Wire materials to speed/feed calculator ===
Source:   MATERIAL_INDEX.js
Consumer: SPEED_FEED_CALCULATOR.js

=== COMPLETED T7 ===
Evidence:
  [x] Import added: "import { getMaterial } from '../materials/MATERIAL_INDEX.js';"
  [x] Usage updated: line 145, now uses getMaterial('STEEL_1045')
  [x] Old inline lookup removed (lines 150-180 commented)
```

## 3.3 VALIDATE Tasks

**Purpose:** Verify a PRISM component or integration is complete and correct.

**Example:**
```
=== EXECUTING T8: Validate complete integration ===
Target: Materials database + calculator wiring

Checks:
  [x] Files exist: STEEL_1045 (14KB), STEEL_1050 (14KB), STEEL_1055 (14KB)
  [x] Parameter count: 127 each (verified section count)
  [x] Index exports: STEEL_1045, STEEL_1050, STEEL_1055 all present
  [x] Calculator wiring: getMaterial calls resolve correctly
  [x] kc1_1 progression: 1820 -> 1880 -> 1920 (logical increase with carbon)
```

---

# SECTION 4: EVIDENCE CAPTURE FOR MANUFACTURING

## 4.1 Core Rule

Never claim completion without proof. No evidence = not done.

```
BAD:  "Created material file"
GOOD: "Created STEEL_1045_MATERIAL.js (14,230 bytes), kc1_1 = 1820 (Machining Data Handbook p.245)"
```

## 4.2 Evidence Types

**Existence** (after CREATE/EXTRACT): File path + size via get_file_info.
```
STEEL_1045_MATERIAL.js    14,230 bytes
STEEL_1050_MATERIAL.js    14,450 bytes
STEEL_1055_MATERIAL.js    14,380 bytes
```

**Content** (after CREATE/MODIFY/EXTRACT): Key manufacturing values verified.
```
File: STEEL_1045_MATERIAL.js
  id: "STEEL_1045", kc1_1: 1820 (matches handbook), density: 7850
```

**Structure** (after CREATE/EXTRACT): Section/function inventory.
```
File: STEEL_1045_MATERIAL.js - 7 sections:
  physical(15), mechanical(20), cutting(25), johnsonCook(12),
  tooling(30), taylorCoefficients(10), meta(10)
```

**Change** (after MODIFY): Before/after for changed lines.
```
MATERIAL_INDEX.js line 23:
  Before: [did not exist]
  After:  import STEEL_1045 from './enhanced/STEEL_1045_MATERIAL.js';
```

**Integration** (after WIRE): End-to-end resolution check.
```
Consumer: SPEED_FEED_CALCULATOR.js
  getMaterial('STEEL_1045') -> returns object with kc1_1=1820
```

## 4.3 Evidence Templates

**Extract:**
```
=== EVIDENCE: T[N] Extract [module] ===
  [x] Lines [X]-[Y] from [monolith] ([Z] lines)
  [x] Target: [path] ([bytes])
  [x] Imports added: [list]
  [x] Exports added: [list]
```

**Wire:**
```
=== EVIDENCE: T[N] Wire [source] -> [consumer] ===
  [x] Import: [statement] at line [X]
  [x] Usage: [location] updated
  [x] Old refs: removed/commented
```

**Validate:**
```
=== EVIDENCE: T[N] Validate [component] ===
  [x] Check 1: [description] - PASS
  [x] Check 2: [description] - PASS
  Total: [X] passed, 0 failed
```

## 4.4 Evidence Quality Rules

- **SPECIFIC:** Exact paths, sizes, values. Not "file created" but "STEEL_1045.js (14,230 bytes)".
- **VERIFIABLE:** Reference sources. "kc1_1 = 1820 (Machining Data Handbook p.245)".
- **COMPLETE:** All criteria covered. "File exists (14KB), 7 sections, kc1_1=1820".
- **HONEST:** Report failures. "4/5 checks passed. Check 3 failed: density missing".

## 4.5 Evidence Compilation at Checkpoint

```
EVIDENCE SUMMARY - Checkpoint [N]
  FILES CREATED:  [list with sizes and key verifications]
  FILES MODIFIED: [list with change summaries]
  EXTRACTIONS:    [module -> source lines -> target]
  WIRING:         [source -> consumer -> status]
  VALIDATIONS:    [component -> checks passed]
  TOTAL ITEMS:    [count]
```

---

# SECTION 5: HANDOFF NOTES ON INTERRUPTION

## 5.1 Handoff Format

When execution stops (user choice or buffer pressure), generate:

```
=======================================
    SESSION HANDOFF
=======================================
SESSION: SP.1.3 - Materials Database Task
STOPPED: Checkpoint 2 after T5

--- RESUME INSTRUCTIONS ---
1. Read CURRENT_STATE.json
2. Start from T6: Update MATERIAL_INDEX.js
3. Remaining: T6, T7, T8
4. Next checkpoint: After T8 (final)

--- CONTEXT ---
DONE:
  - 3 material files created (STEEL_1045, 1050, 1055)
  - All 127 parameters populated
NEXT:
  - T6: Add imports/exports to MATERIAL_INDEX.js
  - T7: Update calculator to use getMaterial()
  - T8: Validate integration
KEY FILES:
  - STEEL_1045_MATERIAL.js (14KB) kc1_1=1820
  - STEEL_1050_MATERIAL.js (14KB) kc1_1=1880
  - STEEL_1055_MATERIAL.js (14KB) kc1_1=1920

--- QUICK RESUME ---
"Resume from CHECKPOINT 2. T1-T5 done. Start T6."
=======================================
```

## 5.2 Error-Triggered Handoff

```
=======================================
    ERROR HANDOFF
=======================================
STOPPED AT: T[N] due to [error type]
COMPLETED: T1-T[N-1]
STATE SAVED: Yes
ERROR: [what went wrong]
TO RESUME: Resolve [issue], then start from T[N]
=======================================
```

---

# SECTION 6: ERROR HANDLING (PRISM-SPECIFIC)

## 6.1 Error Categories

- **MINOR:** Single task (typo, wrong path). Fix immediately, retry.
- **PLAN:** Plan needs adjustment (missing dependency, wrong order). Checkpoint, present options.
- **BLOCKER:** Cannot proceed (monolith section not found, source missing). Checkpoint, escalate to prism-sp-debugging.
- **DATA:** Wrong content (extracted wrong section, kc1_1 mismatch vs handbook). Checkpoint, investigate.

## 6.2 Error Recovery

```
Can fix in <2 min? -> Fix, retry
Plan issue?        -> Checkpoint, present options to user
Blocker?           -> Checkpoint, escalate to debugging
Otherwise          -> Document, continue if possible
```

**Limits:** Max 2 retries for same error. Escalate after 3 total errors on one task.

---

# SECTION 7: SKILL INTEGRATION

```
prism-sp-planning --> prism-sp-execution --> prism-sp-verification
                            |
                            +--> On error: prism-sp-debugging
                            +--> On stop:  handoff notes
```

**Referenced during execution:**

| Situation | Skill |
|-----------|-------|
| Monolith line numbers | prism-monolith-index |
| Material file structure | prism-material-template |
| Code patterns | prism-coding-patterns |

**State on completion:**
```json
{
  "currentTask": {
    "phase": "execution",
    "status": "complete",
    "progress": { "completed": ["T1","T2","T3","T4","T5","T6","T7","T8"], "percentComplete": 100 }
  },
  "nextPhase": "verification"
}
```

---

# SECTION 8: QUICK REFERENCE

```
TRIGGERS: execute plan, run tasks, implement, do the work
INPUT:    Approved task list from prism-sp-planning
OUTPUT:   Completed work + evidence -> prism-sp-verification

BUFFER ZONES:
  GREEN  (0-8):   Normal execution
  YELLOW (9-14):  Checkpoint at next opportunity
  RED    (15-18): Checkpoint NOW
  BLACK  (19+):   STOP immediately

PRISM TASK TYPES:
  EXTRACT:  Pull from monolith -> verify captured, standalone
  WIRE:     Connect modules -> verify import, usage, no old refs
  VALIDATE: Check correctness -> verify all checks pass

EVIDENCE: file path + size + content verification
  Manufacturing values verified against handbook references
  No evidence = not done

ERRORS: Minor=fix/retry, Plan=checkpoint/options, Blocker=escalate

CHECKPOINT = SAFE STOP POINT:
  Progress + Evidence + State saved + Continue/Stop
```

---

**END OF SKILL DOCUMENT**
