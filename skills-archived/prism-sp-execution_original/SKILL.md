---
name: prism-sp-execution
description: |
  Checkpoint execution with progress tracking and safe interruption.
  HOOK-FIRST v8.0: Auto-fires AGENT-BEFORE-SPAWN-001, STATE-CHECKPOINT-001,
  BATCH-PROGRESS-001, CALC-SAFETY-VIOLATION-001 during execution.
  Use when: execute plan, run tasks, implement, do the work.
  Part of SP.1 Core Development Workflow.
---
# PRISM-SP-EXECUTION v8.0
## Checkpoint Execution with Hook Integration
### Version 8.0 | Hook-First Architecture | Development Workflow

---

# HOOK INTEGRATION (v8.0)

## Hooks Fired Automatically
| Phase | Hook | Purpose |
|-------|------|---------|
| Task Start | AGENT-BEFORE-SPAWN-001 | Validate agent spawn |
| Progress | BATCH-PROGRESS-001 | Track completion % |
| Checkpoint | STATE-CHECKPOINT-001 | Save progress |
| Safety Issue | CALC-SAFETY-VIOLATION-001 | Block unsafe operations |
| Error | AGENT-ERROR-001 | Log failures for recovery |
| Complete | STATE-AFTER-MUTATE-001 | Track state changes |

## Manual Hook Usage
```javascript
// Before each task execution
prism_hook_fire("AGENT-BEFORE-SPAWN-001", {
  taskId: "TASK-001",
  tier: "SONNET",
  estimatedDuration: "5min"
});

// Track progress
prism_hook_fire("BATCH-PROGRESS-001", {
  completed: 5,
  total: 12,
  currentTask: "TASK-005"
});

// Create checkpoint
prism_hook_chain_v2("state:checkpoint", {
  reason: "Buffer zone YELLOW",
  tasksComplete: 5
});
```

## Hook-Enabled Execution Flow
```
LOAD_PLAN → EXECUTE_TASK → VERIFY → CHECKPOINT → NEXT
     ↓            ↓           ↓          ↓         ↓
 STATE-001   AGENT-001    CALC-001  CHECKPOINT-001  PROGRESS-001
```

## Safety Hooks (Automatic)
- If S(x) < 0.70 → CALC-SAFETY-VIOLATION-001 fires → HARD BLOCK
- If tool call fails → AGENT-ERROR-001 fires → Recovery initiated
- If buffer zone RED → STATE-CHECKPOINT-001 fires → Auto-save

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill executes task lists produced by prism-sp-planning. It runs tasks one at a time, verifies completion, captures evidence, and manages checkpoints for safe interruption. The goal is flawless execution with proof of completion.

**Core Philosophy:** Execute exactly what the plan says. No interpretation, no design decisions. If something is unclear → STOP and flag it, don't guess.

## 1.2 When to Use

**Explicit Triggers:**
- When user says "execute the plan"
- When user says "run the tasks"
- When user says "implement this"
- When user says "do the work"
- After planning approval, before verification

**Contextual Triggers:**
- After receiving approved task list from prism-sp-planning
- When resuming from a checkpoint
- When continuing interrupted work

**NOT for:**
- Design decisions (use prism-sp-brainstorm)
- Creating task lists (use prism-sp-planning)
- Debugging failures (use prism-sp-debugging)
- Final verification (use prism-sp-verification)

## 1.3 Prerequisites

**Required Input:**
- [ ] Approved task list from prism-sp-planning
- [ ] All tasks have: ID, path, code outline, verification criteria
- [ ] Checkpoint schedule defined
- [ ] Dependency order established

**Required State:**
- [ ] CURRENT_STATE.json accessible
- [ ] Target directories exist or can be created
- [ ] Source files accessible (for extract/modify tasks)

## 1.4 Outputs

**Primary Outputs:**
- Completed tasks (files created, modified, wired)
- Evidence of completion (file listings, content samples)
- Updated state file with progress

**Checkpoint Outputs:**
- Progress report (X of Y tasks complete)
- Evidence summary
- Safe stopping point documentation
- Handoff notes if interrupted

## 1.5 Key Principles

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           EXECUTION PRINCIPLES                                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRINCIPLE 1: EXECUTE EXACTLY                                                           │
│  ─────────────────────────────                                                          │
│  Do what the plan says. No more, no less.                                               │
│  If plan says "add 3 lines" → add exactly 3 lines.                                      │
│  If plan is unclear → STOP, don't interpret.                                            │
│                                                                                         │
│  PRINCIPLE 2: ONE TASK AT A TIME                                                        │
│  ─────────────────────────────                                                          │
│  Complete T1 fully before starting T2.                                                  │
│  Never have two tasks in progress simultaneously.                                       │
│  This enables precise checkpointing.                                                    │
│                                                                                         │
│  PRINCIPLE 3: VERIFY BEFORE NEXT                                                        │
│  ─────────────────────────────                                                          │
│  After completing a task, verify it worked.                                             │
│  Run the verification checks from the task card.                                        │
│  Only proceed if verification passes.                                                   │
│                                                                                         │
│  PRINCIPLE 4: EVIDENCE REQUIRED                                                         │
│  ─────────────────────────────                                                          │
│  Every completion claim needs proof.                                                    │
│  "File created" → show file listing with size.                                          │
│  "Content correct" → show sample content.                                               │
│  No evidence = not done.                                                                │
│                                                                                         │
│  PRINCIPLE 5: CHECKPOINT DISCIPLINE                                                     │
│  ─────────────────────────────                                                          │
│  Follow the checkpoint schedule from the plan.                                          │
│  At checkpoint: save state, verify progress, report.                                    │
│  YELLOW/RED buffer → checkpoint immediately.                                            │
│                                                                                         │
│  PRINCIPLE 6: SAFE INTERRUPTION                                                         │
│  ─────────────────────────────                                                          │
│  Can stop at any checkpoint without losing work.                                        │
│  Never stop mid-task.                                                                   │
│  Handoff notes enable seamless continuation.                                            │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 2: EXECUTION LOOP

## 2.1 Core Loop Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           EXECUTION LOOP                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  START                                                                                  │
│    │                                                                                    │
│    ▼                                                                                    │
│  ┌───────────────────┐                                                                  │
│  │ 1. RECEIVE PLAN   │◀─────────────────────────────────────────────┐                   │
│  │    Load task list │                                              │                   │
│  └─────────┬─────────┘                                              │                   │
│            │                                                        │                   │
│            ▼                                                        │                   │
│  ┌───────────────────┐     ┌──────────────────────┐                 │                   │
│  │ 2. CHECK BUFFER   │────▶│ RED/BLACK?           │                 │                   │
│  │    What zone?     │     │ → CHECKPOINT NOW     │─────────────────┤                   │
│  └─────────┬─────────┘     └──────────────────────┘                 │                   │
│            │ GREEN/YELLOW                                           │                   │
│            ▼                                                        │                   │
│  ┌───────────────────┐     ┌──────────────────────┐                 │                   │
│  │ 3. SELECT TASK    │────▶│ All tasks done?      │                 │                   │
│  │    Next in order  │     │ → GO TO COMPLETE     │─────────────────┤                   │
│  └─────────┬─────────┘     └──────────────────────┘                 │                   │
│            │                                                        │                   │
│            ▼                                                        │                   │
│  ┌───────────────────┐     ┌──────────────────────┐                 │                   │
│  │ 4. EXECUTE TASK   │────▶│ Error occurred?      │                 │                   │
│  │    Do the work    │     │ → GO TO ERROR        │─────────────────┤                   │
│  └─────────┬─────────┘     └──────────────────────┘                 │                   │
│            │ Success                                                │                   │
│            ▼                                                        │                   │
│  ┌───────────────────┐     ┌──────────────────────┐                 │                   │
│  │ 5. VERIFY TASK    │────▶│ Verification failed? │                 │                   │
│  │    Check criteria │     │ → GO TO ERROR        │─────────────────┤                   │
│  └─────────┬─────────┘     └──────────────────────┘                 │                   │
│            │ Passed                                                 │                   │
│            ▼                                                        │                   │
│  ┌───────────────────┐                                              │                   │
│  │ 6. CAPTURE        │                                              │                   │
│  │    EVIDENCE       │                                              │                   │
│  └─────────┬─────────┘                                              │                   │
│            │                                                        │                   │
│            ▼                                                        │                   │
│  ┌───────────────────┐     ┌──────────────────────┐                 │                   │
│  │ 7. CHECKPOINT?    │────▶│ YES (scheduled or    │                 │                   │
│  │    Check schedule │     │      YELLOW buffer)  │                 │                   │
│  └─────────┬─────────┘     └──────────┬───────────┘                 │                   │
│            │ NO                       │                             │                   │
│            │                          ▼                             │                   │
│            │               ┌──────────────────────┐                 │                   │
│            │               │ 8. RUN CHECKPOINT    │                 │                   │
│            │               │    Save, verify,     │                 │                   │
│            │               │    report, decide    │                 │                   │
│            │               └──────────┬───────────┘                 │                   │
│            │                          │                             │                   │
│            │◀─────────────────────────┘                             │                   │
│            │                                                        │                   │
│            └────────────────────────────────────────────────────────┘                   │
│                          (Loop back to step 2)                                          │
│                                                                                         │
│  TERMINAL STATES:                                                                       │
│  ─────────────────                                                                      │
│  COMPLETE: All tasks done → Hand off to prism-sp-verification                           │
│  ERROR: Problem occurred → Invoke prism-sp-debugging or stop                            │
│  CHECKPOINT-STOP: User chooses to stop → Save state, create handoff                     │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Step-by-Step Process

### Step 1: RECEIVE PLAN

**Purpose:** Load and validate the task list

**Actions:**
1. Read task list from planning phase
2. Confirm all tasks have required fields
3. Note checkpoint schedule
4. Identify starting point (T1 or resume point)

**Validation:**
```
☐ Task list present
☐ All tasks have: ID, type, path, verification
☐ Checkpoint schedule defined
☐ Dependencies correctly ordered
```

**Output:** Ready to execute, starting task identified

---

### Step 2: CHECK BUFFER

**Purpose:** Determine context pressure level

**Actions:**
1. Count messages in conversation
2. Determine zone (GREEN/YELLOW/RED/BLACK)
3. Decide if immediate checkpoint needed

**Zone Actions:**
```
🟢 GREEN  (0-8):   Continue normally
🟡 YELLOW (9-14):  Continue but checkpoint at next opportunity
🔴 RED    (15-18): Checkpoint NOW before next task
⚫ BLACK  (19+):   STOP immediately, emergency handoff
```

**Output:** Zone status, action decision

---

### Step 3: SELECT TASK

**Purpose:** Pick the next task to execute

**Actions:**
1. Check if all tasks complete → if yes, go to COMPLETE
2. Find next incomplete task in dependency order
3. Verify dependencies are satisfied
4. Load task details

**Blocked Check:**
```
If task dependencies not complete:
  → Skip to next unblocked task
  → If all remaining tasks blocked → ERROR (circular dependency)
```

**Output:** Task card loaded, ready to execute

---

### Step 4: EXECUTE TASK

**Purpose:** Perform the actual work

**Actions:**
1. Announce task start (show executing card)
2. Perform the work specified in task card
3. Follow code outline exactly
4. Use appropriate tools (create/modify/extract)

**Execution Rules:**
```
DO:
✓ Follow plan exactly
✓ Use specified paths
✓ Match code outline structure
✓ Work incrementally for large tasks

DON'T:
✗ Add features not in plan
✗ Change paths or names
✗ Redesign during execution
✗ Skip steps to save time
```

**Output:** Work performed, ready for verification

---

### Step 5: VERIFY TASK

**Purpose:** Confirm task completed correctly

**Actions:**
1. Run each verification check from task card
2. Capture evidence of each check
3. Mark checks as passed or failed

**Verification Methods by Task Type:**
```
CREATE:
☐ File exists at path (ls/dir)
☐ File size reasonable (get_file_info)
☐ Key content present (read sample)
☐ No syntax errors

MODIFY:
☐ Change applied (read changed section)
☐ Surrounding code intact
☐ File still valid

EXTRACT:
☐ Target file created
☐ Source content captured
☐ Imports/exports updated

WIRE:
☐ Import added to consumer
☐ Consumer uses new source
☐ Old references removed

VALIDATE:
☐ All checks pass
☐ Evidence documented
```

**Output:** All checks passed → continue; Any check failed → ERROR

---

### Step 6: CAPTURE EVIDENCE

**Purpose:** Document proof of completion

**Actions:**
1. Capture file listing showing new/changed files
2. Capture content sample showing key values
3. Record any notable outcomes

**Evidence Format:**
```
EVIDENCE for T[N]:
─────────────────────────────
☑ File exists: [path] ([size])
☑ Content verified: [key value] = [expected]
☑ [other verification]
─────────────────────────────
```

**Output:** Evidence documented, ready for checkpoint decision

---

### Step 7: CHECKPOINT DECISION

**Purpose:** Determine if checkpoint needed now

**Checkpoint Triggers:**
```
SCHEDULED:  Plan says checkpoint after this task
YELLOW:     Buffer in yellow zone
REQUESTED:  User asked to checkpoint
MILESTONE:  Logical completion point
```

**Decision:**
- If any trigger → Go to Step 8 (RUN CHECKPOINT)
- If no trigger → Loop back to Step 2

---

### Step 8: RUN CHECKPOINT

**Purpose:** Save state, verify progress, report, offer choice

**Actions:**
1. Save state to CURRENT_STATE.json
2. Compile progress summary
3. List all evidence captured
4. Report to user
5. Offer continue/stop choice

**Checkpoint Report Format:**
```
═══════════════════════════════════════
    CHECKPOINT [N] - SAFE TO STOP
═══════════════════════════════════════
Completed: [task list]
Progress:  [X]/[Y] tasks ([%])
Time:      [estimate] elapsed

EVIDENCE CAPTURED:
☑ [evidence item 1]
☑ [evidence item 2]

STATE SAVED: CURRENT_STATE.json updated

BUFFER: [zone indicator]
ACTION: Continue or stop?
═══════════════════════════════════════
```

**Output:** User decides to continue or stop

---

## 2.3 Terminal States

### COMPLETE State

All tasks finished successfully.

**Actions:**
1. Compile final evidence summary
2. Update CURRENT_STATE.json to COMPLETE
3. Create handoff for prism-sp-verification

**Completion Report:**
```
═══════════════════════════════════════
    EXECUTION COMPLETE
═══════════════════════════════════════
All [X] tasks completed successfully.

FILES CREATED: [count]
FILES MODIFIED: [count]
TOTAL EVIDENCE ITEMS: [count]

Ready for: prism-sp-verification
═══════════════════════════════════════
```

---

### ERROR State

Something went wrong during execution.

**Actions:**
1. Stop execution immediately
2. Document what failed and why
3. Save current state
4. Decide: minor fix or invoke debugging

**Error Report:**
```
═══════════════════════════════════════
    EXECUTION ERROR at T[N]
═══════════════════════════════════════
Task: [task name]
Error: [what went wrong]
Evidence: [what we see]

Completed before error: T1-T[N-1]
State saved: Yes

Options:
1. Minor fix possible → Fix and retry T[N]
2. Complex issue → Invoke prism-sp-debugging
3. Plan problem → Return to prism-sp-planning
═══════════════════════════════════════
```

---

### CHECKPOINT-STOP State

User chooses to stop at checkpoint.

**Actions:**
1. Confirm state is saved
2. Create detailed handoff notes
3. Document exactly where to resume

**Handoff Format:**
```
═══════════════════════════════════════
    SESSION HANDOFF
═══════════════════════════════════════
Stopped at: Checkpoint [N] after T[X]
Progress: [X]/[Y] tasks complete

TO RESUME:
1. Read CURRENT_STATE.json
2. Load task list
3. Start from T[X+1]
4. Next checkpoint after T[Z]

CONTEXT NEEDED:
- [any important context for next session]
═══════════════════════════════════════
```



---

# SECTION 3: TASK EXECUTION

## 3.1 Execution Card Format

**When starting a task, announce:**
```
═══ EXECUTING T[N]: [Name] ═══════════════════════════════════════════════════════════════
│ Type:     [create|modify|extract|wire|validate]
│ Path:     [full path]
│ Started:  [timestamp]
│ Status:   IN PROGRESS
═══════════════════════════════════════════════════════════════════════════════════════════
```

**When completing a task, report:**
```
═══ COMPLETED T[N]: [Name] ═══════════════════════════════════════════════════════════════
│ Duration: [X] minutes
│ Status:   ✓ DONE
├─────────────────────────────────────────────────────────────────────────────────────────
│ Evidence:
│ ☑ [verification 1 - passed]
│ ☑ [verification 2 - passed]
├─────────────────────────────────────────────────────────────────────────────────────────
│ Next:     T[N+1] [name] OR CHECKPOINT [M]
═══════════════════════════════════════════════════════════════════════════════════════════
```

## 3.2 Executing CREATE Tasks

**Purpose:** Create a new file from scratch

**Process:**
```
1. VERIFY PRECONDITIONS
   ☐ Target directory exists (create if needed)
   ☐ File doesn't already exist (or OK to overwrite)
   ☐ Code outline available in task card

2. CREATE FILE
   ☐ Use exact path from task card
   ☐ Follow code outline structure exactly
   ☐ Fill in content according to plan
   ☐ Include all sections specified

3. VERIFY CREATION
   ☐ File exists at path
   ☐ Size is reasonable (matches estimate)
   ☐ Key content present
   ☐ No syntax errors

4. CAPTURE EVIDENCE
   ☐ File listing showing path and size
   ☐ Sample content showing key values
```

**Example Execution:**
```
═══ EXECUTING T3: Create STEEL_1045_MATERIAL.js ═══════════════════════════════════════════
│ Type:     create
│ Path:     C:\PRISM...\materials\enhanced\STEEL_1045_MATERIAL.js
│ Started:  2026-01-24T08:15:00Z
│ Status:   IN PROGRESS
═══════════════════════════════════════════════════════════════════════════════════════════

[Create file using write_file tool with code outline from plan]

═══ COMPLETED T3: Create STEEL_1045_MATERIAL.js ═══════════════════════════════════════════
│ Duration: 4 minutes
│ Status:   ✓ DONE
├─────────────────────────────────────────────────────────────────────────────────────────
│ Evidence:
│ ☑ File exists: STEEL_1045_MATERIAL.js (14,230 bytes)
│ ☑ Sections present: physical, mechanical, cutting, johnsonCook, tooling, taylor, meta
│ ☑ Key value verified: kc1_1 = 1820
├─────────────────────────────────────────────────────────────────────────────────────────
│ Next:     T4: Create STEEL_1050_MATERIAL.js
═══════════════════════════════════════════════════════════════════════════════════════════
```

**Tools Used:**
- `write_file` - Create the file
- `get_file_info` - Verify existence and size
- `read_file` - Verify content

## 3.3 Executing MODIFY Tasks

**Purpose:** Change an existing file

**Process:**
```
1. VERIFY PRECONDITIONS
   ☐ Source file exists
   ☐ Current state matches expected
   ☐ Change specification available

2. READ CURRENT STATE
   ☐ Read relevant section of file
   ☐ Confirm it matches "Current State" in task card
   ☐ If different → STOP, investigate

3. APPLY MODIFICATION
   ☐ Use edit_block or str_replace for precise changes
   ☐ Change only what task specifies
   ☐ Preserve surrounding content

4. VERIFY MODIFICATION
   ☐ Read modified section
   ☐ Confirm matches "Target State" in task card
   ☐ Verify file still valid (no syntax errors)
   ☐ Verify surrounding code intact

5. CAPTURE EVIDENCE
   ☐ Before/after comparison (brief)
   ☐ Line count change if applicable
```

**Example Execution:**
```
═══ EXECUTING T6: Modify MATERIAL_INDEX.js - Add steel_1045 entry ═════════════════════════
│ Type:     modify
│ Path:     C:\PRISM...\materials\MATERIAL_INDEX.js
│ Started:  2026-01-24T08:25:00Z
│ Status:   IN PROGRESS
═══════════════════════════════════════════════════════════════════════════════════════════

[Read current state - verify matches expected]
[Apply edit using edit_block]
[Verify change applied correctly]

═══ COMPLETED T6: Modify MATERIAL_INDEX.js ════════════════════════════════════════════════
│ Duration: 2 minutes
│ Status:   ✓ DONE
├─────────────────────────────────────────────────────────────────────────────────────────
│ Evidence:
│ ☑ Import added: line 23, "import STEEL_1045 from './enhanced/STEEL_1045_MATERIAL.js';"
│ ☑ Export updated: STEEL_1045 now in export list
│ ☑ No syntax errors
├─────────────────────────────────────────────────────────────────────────────────────────
│ Next:     CHECKPOINT 2
═══════════════════════════════════════════════════════════════════════════════════════════
```

**Tools Used:**
- `read_file` - Check current state
- `edit_block` - Apply precise changes
- `read_file` - Verify result

## 3.4 Executing EXTRACT Tasks

**Purpose:** Pull code from monolith into standalone file

**Process:**
```
1. VERIFY PRECONDITIONS
   ☐ Monolith accessible
   ☐ Line numbers confirmed (from task card)
   ☐ Target directory exists

2. LOCATE SOURCE
   ☐ Read specified line range from monolith
   ☐ Verify start/end markers match expected
   ☐ Note any dependencies to handle

3. EXTRACT CONTENT
   ☐ Copy content to new file
   ☐ Preserve original structure
   ☐ Include inline helpers if specified

4. MODIFY FOR STANDALONE
   ☐ Add imports (as specified in task)
   ☐ Add exports (as specified in task)
   ☐ Remove/replace hardcoded dependencies
   ☐ Update internal references

5. VERIFY EXTRACTION
   ☐ File created at target path
   ☐ All functions present
   ☐ Imports/exports correct
   ☐ No monolith dependencies remaining

6. CAPTURE EVIDENCE
   ☐ Source lines extracted
   ☐ Target file size
   ☐ Function list
```

**Example Execution:**
```
═══ EXECUTING T3: Extract KIENZLE_FORCE_ENGINE from monolith ══════════════════════════════
│ Type:     extract
│ Source:   PRISM_v8_89_002.html lines 45230-45890
│ Target:   C:\PRISM...\engines\physics\KIENZLE_FORCE_ENGINE.js
│ Started:  2026-01-24T08:30:00Z
│ Status:   IN PROGRESS
═══════════════════════════════════════════════════════════════════════════════════════════

[Read source lines from monolith]
[Verify markers match expected]
[Create target file with extracted content]
[Add imports and exports per task card]

═══ COMPLETED T3: Extract KIENZLE_FORCE_ENGINE ════════════════════════════════════════════
│ Duration: 5 minutes
│ Status:   ✓ DONE
├─────────────────────────────────────────────────────────────────────────────────────────
│ Evidence:
│ ☑ Source: lines 45230-45890 (660 lines)
│ ☑ Target: KIENZLE_FORCE_ENGINE.js (34,520 bytes)
│ ☑ Functions: calculateKienzleForce, calculateSpecificForce, applyCorrections
│ ☑ Imports added: getMaterial, getUnitConverter
│ ☑ Exports added: calculateKienzleForce, calculateSpecificForce
├─────────────────────────────────────────────────────────────────────────────────────────
│ Next:     T4: Modify for standalone use
═══════════════════════════════════════════════════════════════════════════════════════════
```

**Tools Used:**
- `read_file` with offset/length - Read monolith section
- `write_file` - Create extracted file
- `edit_block` - Add imports/exports

## 3.5 Executing WIRE Tasks

**Purpose:** Connect a database/engine to consumers

**Process:**
```
1. VERIFY PRECONDITIONS
   ☐ Source module exists and exports correctly
   ☐ Consumer file exists
   ☐ Know where to add import and usage

2. READ CONSUMER
   ☐ Find import section
   ☐ Find usage location (where old source used)
   ☐ Verify current state matches expected

3. ADD IMPORT
   ☐ Add import statement in correct location
   ☐ Use path from task card
   ☐ Import specific functions/data needed

4. UPDATE USAGE
   ☐ Replace old data access with new import
   ☐ Update function calls if interface changed
   ☐ Remove old inline data/code if specified

5. VERIFY WIRING
   ☐ Import statement present
   ☐ Usage updated
   ☐ Old references removed
   ☐ No broken references

6. CAPTURE EVIDENCE
   ☐ Import line added
   ☐ Usage location updated
```

**Example Execution:**
```
═══ EXECUTING T7: Wire materials to speed/feed calculator ═════════════════════════════════
│ Type:     wire
│ Source:   MATERIAL_INDEX.js
│ Consumer: SPEED_FEED_CALCULATOR.js
│ Started:  2026-01-24T08:40:00Z
│ Status:   IN PROGRESS
═══════════════════════════════════════════════════════════════════════════════════════════

[Read consumer file]
[Add import statement]
[Update material lookup to use import]

═══ COMPLETED T7: Wire materials to calculator ════════════════════════════════════════════
│ Duration: 3 minutes
│ Status:   ✓ DONE
├─────────────────────────────────────────────────────────────────────────────────────────
│ Evidence:
│ ☑ Import added: "import { getMaterial } from '../materials/MATERIAL_INDEX.js';"
│ ☑ Usage updated: line 145, now uses getMaterial('STEEL_1045')
│ ☑ Old inline lookup removed (lines 150-180 commented)
├─────────────────────────────────────────────────────────────────────────────────────────
│ Next:     T8: Validate complete integration
═══════════════════════════════════════════════════════════════════════════════════════════
```

**Tools Used:**
- `read_file` - Check consumer state
- `edit_block` - Add import and update usage

## 3.6 Executing VALIDATE Tasks

**Purpose:** Verify a component or feature is complete and correct

**Process:**
```
1. REVIEW SCOPE
   ☐ What components are being validated
   ☐ What checks are specified

2. RUN CHECKS
   ☐ Execute each check from task card
   ☐ Capture evidence for each
   ☐ Note any failures

3. COMPILE RESULTS
   ☐ All checks passed → DONE
   ☐ Any check failed → ERROR, document which

4. CAPTURE EVIDENCE
   ☐ Summary of all checks
   ☐ File listings
   ☐ Key content samples
```

**Example Execution:**
```
═══ EXECUTING T8: Validate complete integration ═══════════════════════════════════════════
│ Type:     validate
│ Target:   Materials database + calculator wiring
│ Started:  2026-01-24T08:45:00Z
│ Status:   IN PROGRESS
═══════════════════════════════════════════════════════════════════════════════════════════

[Check 1: All 3 files exist with correct sizes]
[Check 2: All files have 127 parameters]
[Check 3: Index exports all 3 materials]
[Check 4: Calculator can use each material]
[Check 5: kc1_1 values form logical progression]

═══ COMPLETED T8: Validate complete integration ═══════════════════════════════════════════
│ Duration: 3 minutes
│ Status:   ✓ DONE
├─────────────────────────────────────────────────────────────────────────────────────────
│ Evidence:
│ ☑ Files exist: STEEL_1045 (14KB), STEEL_1050 (14KB), STEEL_1055 (14KB)
│ ☑ Parameter count: 127 each (verified section count)
│ ☑ Index exports: STEEL_1045, STEEL_1050, STEEL_1055 all present
│ ☑ Calculator wiring: getMaterial calls resolve correctly
│ ☑ kc1_1 progression: 1820 → 1880 → 1920 (logical increase with carbon)
├─────────────────────────────────────────────────────────────────────────────────────────
│ Next:     FINAL CHECKPOINT (all tasks complete)
═══════════════════════════════════════════════════════════════════════════════════════════
```

---

# SECTION 4: CHECKPOINT PROTOCOL

## 4.1 When to Checkpoint

**Scheduled Checkpoints:**
- Plan specifies checkpoint after certain tasks
- Follow the schedule exactly

**Buffer-Triggered Checkpoints:**
- YELLOW zone (9-14 messages): Checkpoint at next opportunity
- RED zone (15-18 messages): Checkpoint NOW
- BLACK zone (19+): Emergency stop

**Milestone Checkpoints:**
- After completing a logical unit of work
- Before starting risky or complex tasks
- When user requests

## 4.2 Checkpoint Process

### Step 1: SAVE STATE

Update CURRENT_STATE.json with current progress:

```json
{
  "currentTask": {
    "phase": "execution",
    "planId": "[plan identifier]",
    "status": "in-progress",
    "checkpoint": {
      "number": 2,
      "afterTask": "T5",
      "timestamp": "2026-01-24T08:35:00Z"
    },
    "progress": {
      "completed": ["T1", "T2", "T3", "T4", "T5"],
      "remaining": ["T6", "T7", "T8"],
      "total": 8,
      "percentComplete": 62.5
    }
  },
  "evidence": {
    "filesCreated": [
      {"path": "...", "size": "14KB", "verified": true}
    ],
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

### Step 2: VERIFY PROGRESS

Confirm what's actually done:

```
PROGRESS VERIFICATION:
──────────────────────
☑ T1: Verify materials directory exists - DONE
☑ T2: Verify material template available - DONE
☑ T3: Create STEEL_1045_MATERIAL.js - DONE (14KB)
☑ T4: Create STEEL_1050_MATERIAL.js - DONE (14KB)
☑ T5: Create STEEL_1055_MATERIAL.js - DONE (14KB)
☐ T6: Update MATERIAL_INDEX.js - PENDING
☐ T7: Wire materials to calculator - PENDING
☐ T8: Validate complete integration - PENDING
```

### Step 3: COMPILE EVIDENCE

Summarize all evidence captured so far:

```
EVIDENCE SUMMARY:
─────────────────
FILES CREATED (3):
• STEEL_1045_MATERIAL.js - 14,230 bytes - kc1_1=1820 ✓
• STEEL_1050_MATERIAL.js - 14,450 bytes - kc1_1=1880 ✓
• STEEL_1055_MATERIAL.js - 14,380 bytes - kc1_1=1920 ✓

FILES MODIFIED (0):
[none yet]

VALIDATIONS (3):
• All files have 127 parameters ✓
• All kc1_1 values verified against handbook ✓
• Progressive increase pattern confirmed ✓
```

### Step 4: REPORT

Display checkpoint card to user:

```
═══════════════════════════════════════════════════════════════════════════════════════════
                         CHECKPOINT 2 - SAFE TO STOP
═══════════════════════════════════════════════════════════════════════════════════════════

PROGRESS: 5/8 tasks (62.5%)
──────────────────────────────
☑ T1: Verify materials directory       ✓
☑ T2: Verify material template         ✓
☑ T3: Create STEEL_1045_MATERIAL.js    ✓ (14KB)
☑ T4: Create STEEL_1050_MATERIAL.js    ✓ (14KB)
☑ T5: Create STEEL_1055_MATERIAL.js    ✓ (14KB)
────────────────────────────────────────
☐ T6: Update MATERIAL_INDEX.js         NEXT
☐ T7: Wire materials to calculator
☐ T8: Validate complete integration

EVIDENCE CAPTURED:
──────────────────
• 3 files created (42KB total)
• All parameters verified
• kc1_1 progression confirmed

STATE SAVED: CURRENT_STATE.json updated

BUFFER STATUS: 🟡 YELLOW (12 messages)
─────────────────────────────────────────

OPTIONS:
  [CONTINUE] → Execute T6, T7, T8 (est. 8 min remaining)
  [STOP]     → End session, handoff notes prepared

═══════════════════════════════════════════════════════════════════════════════════════════
```

### Step 5: DECIDE

**If user says CONTINUE:**
- Log decision
- Resume from next task (T6)
- Continue execution loop

**If user says STOP:**
- Confirm state saved
- Generate handoff notes
- End session cleanly

## 4.3 Emergency Checkpoint (RED/BLACK)

When buffer hits RED or BLACK, trigger immediate checkpoint:

```
⚠️  BUFFER CRITICAL: 🔴 RED (16 messages)
═══════════════════════════════════════════════════════════════════════════════════════════
                    EMERGENCY CHECKPOINT - MUST STOP SOON
═══════════════════════════════════════════════════════════════════════════════════════════

Current task T5 COMPLETED - checkpointing now.

PROGRESS: 5/8 tasks (62.5%)
[abbreviated progress display]

STATE SAVED: Yes

⚠️  Context pressure high. Recommend:
    • Stop now and resume in new session
    • OR complete 1 more task maximum, then stop

Continue for 1 more task or STOP?
═══════════════════════════════════════════════════════════════════════════════════════════
```

## 4.4 Handoff Notes Format

When stopping at checkpoint, generate handoff:

```
═══════════════════════════════════════════════════════════════════════════════════════════
                              SESSION HANDOFF
═══════════════════════════════════════════════════════════════════════════════════════════

SESSION: SP.1.3 - Materials Database Task
STOPPED: Checkpoint 2 after T5
DATE: 2026-01-24

─────────────────────────────────────────────────────────────────────────────────────────
                                 RESUME INSTRUCTIONS
─────────────────────────────────────────────────────────────────────────────────────────

1. Read CURRENT_STATE.json
2. Locate task list (same plan from this session)
3. Start from T6: Update MATERIAL_INDEX.js
4. Remaining tasks: T6, T7, T8
5. Next checkpoint: After T8 (final)

─────────────────────────────────────────────────────────────────────────────────────────
                                 CONTEXT SUMMARY
─────────────────────────────────────────────────────────────────────────────────────────

WHAT'S DONE:
• Created 3 material files (STEEL_1045, 1050, 1055)
• All 127 parameters populated
• Files in: C:\PRISM...\materials\enhanced\

WHAT'S NEXT:
• T6: Add 3 imports and exports to MATERIAL_INDEX.js
• T7: Update calculator to use getMaterial()
• T8: Validate everything works together

KEY FILES:
• STEEL_1045_MATERIAL.js (14KB) - kc1_1 = 1820
• STEEL_1050_MATERIAL.js (14KB) - kc1_1 = 1880
• STEEL_1055_MATERIAL.js (14KB) - kc1_1 = 1920

─────────────────────────────────────────────────────────────────────────────────────────
                                 QUICK RESUME
─────────────────────────────────────────────────────────────────────────────────────────

Copy/paste to start next session:
"Resume execution from CHECKPOINT 2. Tasks T1-T5 done. Start T6."

═══════════════════════════════════════════════════════════════════════════════════════════
```



---

# SECTION 5: BUFFER MANAGEMENT

## 5.1 Buffer Zones Explained

Context buffer represents how much "room" remains in the conversation before context compaction may occur. Managing this proactively prevents lost work.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           BUFFER ZONE SYSTEM                                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  🟢 GREEN ZONE (0-8 messages)                                                           │
│  ─────────────────────────────                                                          │
│  Status:  Comfortable, no pressure                                                      │
│  Action:  Execute normally                                                              │
│  Checkpoint: Follow scheduled checkpoints only                                          │
│                                                                                         │
│  🟡 YELLOW ZONE (9-14 messages)                                                         │
│  ─────────────────────────────                                                          │
│  Status:  Caution, checkpoint soon                                                      │
│  Action:  Continue but plan to checkpoint                                               │
│  Checkpoint: At next scheduled OR after current task                                    │
│                                                                                         │
│  🔴 RED ZONE (15-18 messages)                                                           │
│  ─────────────────────────────                                                          │
│  Status:  Critical, must checkpoint                                                     │
│  Action:  Finish current task, checkpoint immediately                                   │
│  Checkpoint: MANDATORY before next task                                                 │
│                                                                                         │
│  ⚫ BLACK ZONE (19+ messages)                                                           │
│  ─────────────────────────────                                                          │
│  Status:  Emergency, stop now                                                           │
│  Action:  Do not start new tasks                                                        │
│  Checkpoint: IMMEDIATE, prepare emergency handoff                                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Zone Tracking

**At the start of each task, check zone:**

```
BUFFER CHECK:
─────────────
Messages: [count]
Zone:     [🟢/🟡/🔴/⚫]
Action:   [action based on zone]
```

**Zone transition announcements:**

```
ZONE TRANSITION: 🟢 → 🟡
────────────────────────────
Messages: 9
Previous: GREEN (comfortable)
Current:  YELLOW (caution)
Action:   Plan checkpoint after current task group
```

```
ZONE TRANSITION: 🟡 → 🔴
────────────────────────────
⚠️ ENTERING RED ZONE
Messages: 15
Action:   Finish current task, then MANDATORY checkpoint
```

## 5.3 Zone-Based Decisions

### GREEN Zone Behavior

```
Normal execution:
1. Execute tasks sequentially
2. Checkpoint only when scheduled
3. Full evidence capture
4. No urgency adjustments
```

### YELLOW Zone Behavior

```
Cautious execution:
1. Continue executing tasks
2. Add checkpoint at next logical boundary
3. May condense evidence reporting
4. Alert user to zone status
5. Prepare for potential stop
```

### RED Zone Behavior

```
Urgent execution:
1. Complete current task only
2. MANDATORY checkpoint after
3. Minimal evidence (essentials only)
4. Strong recommendation to stop
5. If continue: 1 more task max
```

### BLACK Zone Behavior

```
Emergency protocol:
1. Do NOT start new tasks
2. If mid-task: finish it, then stop
3. Emergency checkpoint immediately
4. Generate handoff notes
5. Session must end
```

## 5.4 Buffer Status Display

**Include in every checkpoint and major milestone:**

```
BUFFER STATUS: 🟢 GREEN (6 messages)
├── Zone:       Normal execution
├── Remaining:  ~12 messages before yellow
├── Action:     Continue as planned
└── Next check: After T8 (scheduled)
```

```
BUFFER STATUS: 🟡 YELLOW (11 messages)
├── Zone:       Caution
├── Remaining:  ~4 messages before red
├── Action:     Checkpoint at next opportunity
└── Recommend:  Complete T6, then checkpoint
```

```
BUFFER STATUS: 🔴 RED (16 messages)
├── Zone:       Critical
├── Remaining:  ~3 messages before black
├── Action:     CHECKPOINT NOW
└── Recommend:  Stop after this checkpoint
```

```
BUFFER STATUS: ⚫ BLACK (20 messages)
├── Zone:       EMERGENCY
├── Status:     Context compaction imminent
├── Action:     STOP IMMEDIATELY
└── Handoff:    Generating emergency notes
```

## 5.5 Recovery from Zone Pressure

**If checkpoint restores GREEN:**
User can continue normally in same session.

**If checkpoint still in YELLOW:**
Recommend stopping, but can continue with caution.

**If checkpoint in RED/BLACK:**
Must stop. Handoff to new session.

---

# SECTION 6: EVIDENCE CAPTURE

## 6.1 Evidence Philosophy

**Core Rule:** Never claim completion without proof.

Evidence transforms "I did it" into "Here's proof I did it."

```
WITHOUT EVIDENCE:
"Created material file" → Claims completion, no verification

WITH EVIDENCE:
"Created material file:
 • Path: C:\...\STEEL_1045_MATERIAL.js
 • Size: 14,230 bytes
 • Content: kc1_1 = 1820 (verified)"
→ Proves completion with specifics
```

## 6.2 Evidence Types

### Type 1: Existence Evidence

**What:** Proof that files exist at expected locations
**How:** File listing with paths and sizes
**When:** After CREATE and EXTRACT tasks

```
EXISTENCE EVIDENCE:
───────────────────
Command: list_directory or get_file_info
Result:
  STEEL_1045_MATERIAL.js    14,230 bytes
  STEEL_1050_MATERIAL.js    14,450 bytes
  STEEL_1055_MATERIAL.js    14,380 bytes
Verdict: ✓ All 3 files exist with expected sizes
```

### Type 2: Content Evidence

**What:** Proof that file contains expected content
**How:** Read sample of key values
**When:** After CREATE, MODIFY, EXTRACT tasks

```
CONTENT EVIDENCE:
─────────────────
File: STEEL_1045_MATERIAL.js
Sample:
  id: "STEEL_1045" ✓
  kc1_1: 1820 ✓ (matches handbook)
  density: 7850 ✓
Verdict: ✓ Key values correct
```

### Type 3: Structure Evidence

**What:** Proof that file has correct structure
**How:** Verify sections/functions present
**When:** After CREATE and EXTRACT tasks

```
STRUCTURE EVIDENCE:
───────────────────
File: STEEL_1045_MATERIAL.js
Expected sections: 7
Found sections:
  ✓ physical (15 fields)
  ✓ mechanical (20 fields)
  ✓ cutting (25 fields)
  ✓ johnsonCook (12 fields)
  ✓ tooling (30 fields)
  ✓ taylorCoefficients (10 fields)
  ✓ meta (10 fields)
Verdict: ✓ All sections present
```

### Type 4: Change Evidence

**What:** Proof that modification was applied
**How:** Show before/after for changed section
**When:** After MODIFY tasks

```
CHANGE EVIDENCE:
────────────────
File: MATERIAL_INDEX.js
Line 23:
  Before: [line did not exist]
  After:  import STEEL_1045 from './enhanced/STEEL_1045_MATERIAL.js';
Export list:
  Before: { STEEL_1040, ... }
  After:  { STEEL_1040, STEEL_1045, ... }
Verdict: ✓ Import and export added correctly
```

### Type 5: Integration Evidence

**What:** Proof that components work together
**How:** Verify wiring resolves correctly
**When:** After WIRE tasks

```
INTEGRATION EVIDENCE:
─────────────────────
Consumer: SPEED_FEED_CALCULATOR.js
Import: getMaterial from MATERIAL_INDEX.js ✓
Usage: getMaterial('STEEL_1045') ✓
Resolution: Returns STEEL_1045 object with kc1_1=1820 ✓
Verdict: ✓ Wiring functional
```

## 6.3 Evidence Capture Templates

### Template: Create Task Evidence

```
═══ EVIDENCE: T[N] Create [filename] ═══
Existence:
  ☑ File: [path]
  ☑ Size: [X] bytes
Structure:
  ☑ Sections: [count] present
  ☑ Functions: [list]
Content:
  ☑ [key1]: [value1] ✓
  ☑ [key2]: [value2] ✓
═══════════════════════════════════════
```

### Template: Modify Task Evidence

```
═══ EVIDENCE: T[N] Modify [filename] ═══
Change applied:
  Location: Line [X]
  Before: [old content]
  After:  [new content]
File integrity:
  ☑ Surrounding code intact
  ☑ No syntax errors
═══════════════════════════════════════
```

### Template: Extract Task Evidence

```
═══ EVIDENCE: T[N] Extract [module] ═══
Source:
  ☑ Lines [X]-[Y] from [monolith]
  ☑ [Z] lines captured
Target:
  ☑ File: [path]
  ☑ Size: [bytes]
Modifications:
  ☑ Imports added: [list]
  ☑ Exports added: [list]
═══════════════════════════════════════
```

### Template: Wire Task Evidence

```
═══ EVIDENCE: T[N] Wire [source] → [consumer] ═══
Import:
  ☑ Added: [import statement]
  ☑ Location: Line [X]
Usage:
  ☑ Updated: [usage location]
  ☑ Pattern: [how it's used]
Old references:
  ☑ Removed/commented: [what]
═══════════════════════════════════════
```

### Template: Validate Task Evidence

```
═══ EVIDENCE: T[N] Validate [component] ═══
Checks performed:
  ☑ Check 1: [description] - PASS
  ☑ Check 2: [description] - PASS
  ☑ Check 3: [description] - PASS
Summary:
  Total checks: [X]
  Passed: [X]
  Failed: 0
═══════════════════════════════════════
```

## 6.4 Evidence Compilation

**At each checkpoint, compile all evidence:**

```
═══════════════════════════════════════════════════════════════════════════════════════════
                           EVIDENCE SUMMARY - Checkpoint [N]
═══════════════════════════════════════════════════════════════════════════════════════════

FILES CREATED ([count]):
────────────────────────
• [filename1] - [size] - [key verification]
• [filename2] - [size] - [key verification]

FILES MODIFIED ([count]):
─────────────────────────
• [filename] - [change summary]

EXTRACTIONS ([count]):
──────────────────────
• [module] - [source lines] → [target file]

WIRING ([count]):
─────────────────
• [source] → [consumer] - [status]

VALIDATIONS ([count]):
──────────────────────
• [component] - [check count] checks passed

TOTAL EVIDENCE ITEMS: [count]

═══════════════════════════════════════════════════════════════════════════════════════════
```

## 6.5 Evidence Quality Rules

```
EVIDENCE QUALITY CHECKLIST:

☐ SPECIFIC: Exact paths, exact sizes, exact values
  Bad:  "File created successfully"
  Good: "File created: C:\...\STEEL_1045.js (14,230 bytes)"

☐ VERIFIABLE: Can be re-checked
  Bad:  "Content looks correct"
  Good: "kc1_1 = 1820 (verified against Machining Data Handbook p.245)"

☐ COMPLETE: All verification criteria covered
  Bad:  "File exists"
  Good: "File exists (14KB), has 7 sections, kc1_1=1820"

☐ HONEST: Report failures, not just successes
  Bad:  [silent about issues]
  Good: "4 of 5 checks passed. Check 3 failed: density value missing"
```



---

# SECTION 7: ERROR HANDLING

## 7.1 Error Categories

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           ERROR CATEGORIES                                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  CATEGORY 1: MINOR ERRORS                                                               │
│  ─────────────────────────────                                                          │
│  Impact:   Single task affected                                                         │
│  Examples: Typo, wrong path, missing comma                                              │
│  Action:   Fix immediately, retry task                                                  │
│                                                                                         │
│  CATEGORY 2: PLAN ERRORS                                                                │
│  ─────────────────────────────                                                          │
│  Impact:   Plan needs adjustment                                                        │
│  Examples: Missing dependency, wrong order, ambiguous task                              │
│  Action:   Checkpoint, adjust plan, continue or escalate                                │
│                                                                                         │
│  CATEGORY 3: BLOCKER ERRORS                                                             │
│  ─────────────────────────────                                                          │
│  Impact:   Cannot proceed without resolution                                            │
│  Examples: Source file missing, permission denied, dependency not found                 │
│  Action:   Stop execution, invoke prism-sp-debugging                                    │
│                                                                                         │
│  CATEGORY 4: DATA ERRORS                                                                │
│  ─────────────────────────────                                                          │
│  Impact:   Wrong or corrupted content                                                   │
│  Examples: Extracted wrong section, data doesn't match expected                         │
│  Action:   Checkpoint, investigate, may need design review                              │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 7.2 Error Detection

**During Execution:**
- Tool returns error → Capture error message
- Unexpected result → Compare to expected
- Verification fails → Document which check failed

**Error Detection Checklist:**
```
☐ Did the tool complete without error?
☐ Does the result match expectations?
☐ Do all verification checks pass?
☐ Is the file valid (no syntax errors)?
☐ Are dependencies still satisfied?
```

## 7.3 Error Response Protocol

### For MINOR Errors

```
═══ MINOR ERROR in T[N] ═══════════════════════════════════════════════════════════════════
Task:    [task name]
Error:   [what went wrong]
Impact:  LOW - single task affected
─────────────────────────────────────────────────────────────────────────────────────────
FIX:
[Description of fix]
[Apply fix]
─────────────────────────────────────────────────────────────────────────────────────────
RETRY:
[Re-execute task]
[Verify success]
─────────────────────────────────────────────────────────────────────────────────────────
RESULT: ✓ Fixed and completed
═══════════════════════════════════════════════════════════════════════════════════════════
```

**Example:**
```
═══ MINOR ERROR in T3 ═════════════════════════════════════════════════════════════════════
Task:    Create STEEL_1045_MATERIAL.js
Error:   Syntax error - missing comma after line 45
Impact:  LOW - typo in generated content
─────────────────────────────────────────────────────────────────────────────────────────
FIX:
Add missing comma after density field
─────────────────────────────────────────────────────────────────────────────────────────
RETRY:
Fixed file, re-verified
─────────────────────────────────────────────────────────────────────────────────────────
RESULT: ✓ T3 completed successfully
═══════════════════════════════════════════════════════════════════════════════════════════
```

### For PLAN Errors

```
═══ PLAN ERROR detected ═══════════════════════════════════════════════════════════════════
Task:    T[N] [name]
Error:   [what's wrong with the plan]
Impact:  MEDIUM - plan adjustment needed
─────────────────────────────────────────────────────────────────────────────────────────
ANALYSIS:
[Why this is a plan issue, not execution issue]
─────────────────────────────────────────────────────────────────────────────────────────
OPTIONS:
1. [Minor adjustment - can fix and continue]
2. [Return to planning - need revised plan]
3. [Return to brainstorm - design issue]
─────────────────────────────────────────────────────────────────────────────────────────
RECOMMENDATION: [Which option and why]
═══════════════════════════════════════════════════════════════════════════════════════════
```

### For BLOCKER Errors

```
═══ ⛔ BLOCKER ERROR ═══════════════════════════════════════════════════════════════════════
Task:    T[N] [name]
Error:   [what's blocking]
Impact:  HIGH - cannot proceed
─────────────────────────────────────────────────────────────────────────────────────────
ATTEMPTED:
[What was tried]
─────────────────────────────────────────────────────────────────────────────────────────
BLOCKED BECAUSE:
[Root cause if known]
─────────────────────────────────────────────────────────────────────────────────────────
PROGRESS SAVED:
Completed: [tasks done before blocker]
State:     CURRENT_STATE.json updated
─────────────────────────────────────────────────────────────────────────────────────────
ESCALATION:
→ Invoke prism-sp-debugging for resolution
═══════════════════════════════════════════════════════════════════════════════════════════
```

## 7.4 Error Recovery Rules

```
RECOVERY DECISION TREE:

Error Detected
    │
    ├─▶ Can fix in <2 min without changing plan?
    │       │
    │       YES ──▶ Fix immediately, retry task
    │       │
    │       NO ──▶ Is it a plan issue?
    │                   │
    │                   YES ──▶ Checkpoint, present options to user
    │                   │
    │                   NO ──▶ Is it a blocker?
    │                              │
    │                              YES ──▶ Checkpoint, escalate to debugging
    │                              │
    │                              NO ──▶ Document, continue if possible
```

**Recovery Attempt Limits:**
- Same error: Maximum 2 retry attempts
- After 2 failures: Escalate, don't keep trying
- Different errors on same task: Escalate after 3 total errors

---

# SECTION 8: SKILL INTEGRATION

## 8.1 Input from prism-sp-planning

This skill receives executable task lists from the planning phase.

**Expected Input:**
```
From prism-sp-planning:
├── Task List
│   ├── Ordered by dependencies
│   ├── Each task with: ID, type, path, outline, verification
│   └── Time estimates
│
├── Checkpoint Schedule
│   ├── Which tasks trigger checkpoints
│   └── Checkpoint criteria
│
├── Dependency Map
│   ├── What blocks what
│   └── Critical path
│
└── Context
    ├── What was approved in brainstorm
    └── Any constraints or preferences
```

**Validation Before Execution:**
- [ ] Task list present and complete
- [ ] All tasks have required fields
- [ ] Checkpoint schedule defined
- [ ] Starting point clear (T1 or resume point)

## 8.2 Output to prism-sp-verification

This skill produces completed work and evidence for verification.

**Output Package:**
```
To prism-sp-verification:
├── Completion Report
│   ├── All tasks marked done
│   ├── Total time elapsed
│   └── Any issues encountered
│
├── Evidence Package
│   ├── File listings with sizes
│   ├── Content samples
│   ├── Verification check results
│   └── Integration confirmations
│
├── File Manifest
│   ├── Files created (paths, sizes)
│   ├── Files modified (changes made)
│   └── Files wired (connections made)
│
└── State File
    ├── CURRENT_STATE.json updated
    └── Status: "ready-for-verification"
```

## 8.3 Integration with Other Skills

**Primary Flow:**
```
prism-sp-planning ──▶ prism-sp-execution ──▶ prism-sp-verification
                            │
                            ├─▶ On error: prism-sp-debugging
                            └─▶ On stop: prism-sp-handoff (notes)
```

**Skills Used During Execution:**
| Situation | Reference Skill |
|-----------|-----------------|
| Extract from monolith | prism-monolith-index (line numbers) |
| Material file content | prism-material-template (structure) |
| Code patterns | prism-coding-patterns (standards) |

**Skills NOT Used During Execution:**
| Skill | Why Not |
|-------|---------|
| prism-sp-brainstorm | Design phase complete |
| prism-sp-planning | Planning phase complete |
| prism-expert-* | No design decisions during execution |

## 8.4 State File Management

**During Execution - Update Frequently:**

```json
{
  "currentTask": {
    "phase": "execution",
    "status": "in-progress",
    "activeTask": "T5",
    "progress": {
      "completed": ["T1", "T2", "T3", "T4"],
      "current": "T5",
      "remaining": ["T6", "T7", "T8"]
    }
  }
}
```

**At Checkpoint - Full Update:**

```json
{
  "currentTask": {
    "phase": "execution",
    "status": "checkpointed",
    "checkpoint": {
      "number": 2,
      "afterTask": "T5",
      "timestamp": "2026-01-24T09:00:00Z"
    },
    "progress": {
      "completed": ["T1", "T2", "T3", "T4", "T5"],
      "remaining": ["T6", "T7", "T8"],
      "percentComplete": 62.5
    }
  },
  "evidence": {
    "filesCreated": [
      {"path": "...", "size": "14KB"}
    ]
  },
  "resumeFrom": "T6"
}
```

**On Completion:**

```json
{
  "currentTask": {
    "phase": "execution",
    "status": "complete",
    "completedAt": "2026-01-24T09:30:00Z",
    "progress": {
      "completed": ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"],
      "remaining": [],
      "percentComplete": 100
    }
  },
  "nextPhase": "verification"
}
```

---

# SECTION 9: QUICK REFERENCE CARD

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    PRISM-SP-EXECUTION - QUICK REFERENCE                                    ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  TRIGGERS: execute plan, run tasks, implement, do the work                                ║
║                                                                                           ║
║  EXECUTION LOOP:                                                                          ║
║  ───────────────                                                                          ║
║  1. CHECK BUFFER ──▶ Determine zone (🟢/🟡/🔴/⚫)                                          ║
║  2. SELECT TASK ───▶ Next in dependency order                                             ║
║  3. EXECUTE ───────▶ Do exactly what plan says                                            ║
║  4. VERIFY ────────▶ Run verification checks                                              ║
║  5. EVIDENCE ──────▶ Capture proof of completion                                          ║
║  6. CHECKPOINT? ───▶ If scheduled or yellow+ zone                                         ║
║  7. LOOP ──────────▶ Back to step 1                                                       ║
║                                                                                           ║
║  BUFFER ZONES:                                                                            ║
║  ─────────────                                                                            ║
║  🟢 GREEN  (0-8):   Normal execution                                                      ║
║  🟡 YELLOW (9-14):  Checkpoint at next opportunity                                        ║
║  🔴 RED    (15-18): Checkpoint NOW                                                        ║
║  ⚫ BLACK  (19+):   STOP immediately                                                      ║
║                                                                                           ║
║  TASK TYPES:                                                                              ║
║  ───────────                                                                              ║
║  CREATE:   Make new file → verify exists, size, content                                   ║
║  MODIFY:   Change file → verify change applied, file valid                                ║
║  EXTRACT:  Pull from monolith → verify captured, modified for standalone                  ║
║  WIRE:     Connect components → verify import, usage, no old refs                         ║
║  VALIDATE: Check correctness → verify all checks pass                                     ║
║                                                                                           ║
║  EVIDENCE REQUIRED:                                                                       ║
║  ─────────────────                                                                        ║
║  Every completion needs: file path + size + content verification                          ║
║  No evidence = not done                                                                   ║
║                                                                                           ║
║  ERROR HANDLING:                                                                          ║
║  ───────────────                                                                          ║
║  Minor (<2min fix): Fix immediately, retry                                                ║
║  Plan issue: Checkpoint, present options                                                  ║
║  Blocker: Checkpoint, escalate to debugging                                               ║
║                                                                                           ║
║  CHECKPOINT FORMAT:                                                                       ║
║  ─────────────────                                                                        ║
║  Progress: X/Y tasks (%)                                                                  ║
║  Evidence: files created/modified + verifications                                         ║
║  State: CURRENT_STATE.json updated                                                        ║
║  Options: Continue or Stop                                                                ║
║                                                                                           ║
║  ❌ DON'T: Interpret ambiguous tasks, skip verification, continue in red+ without CP     ║
║  ✓ DO: Execute exactly, capture evidence, checkpoint on schedule, stop when critical      ║
║                                                                                           ║
║  INPUT:  Task list from prism-sp-planning                                                 ║
║  OUTPUT: Completed work + evidence                                                        ║
║  NEXT:   prism-sp-verification                                                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# SECTION 10: VALIDATION CHECKLIST

## 10.1 Skill Completeness

- [x] YAML frontmatter with name, description
- [x] All sections present (9+ sections)
- [x] Execution loop fully documented
- [x] All 5 task types covered
- [x] Buffer zone system explained
- [x] Evidence capture templates provided
- [x] Error handling categories defined
- [x] Integration points documented
- [x] Quick reference card included

## 10.2 Content Quality

- [x] Visual cards and formats provided
- [x] Step-by-step processes clear
- [x] Examples included for each task type
- [x] Decision trees for error handling
- [x] Zone transitions documented

---

# DOCUMENT METADATA

```
Skill:        prism-sp-execution
Version:      1.0.0
Created:      2026-01-24
Session:      SP.1.3
Author:       Claude (PRISM Development)
Category:     Development Workflow (SP.1)

Purpose:      Execute task lists with checkpoints, evidence,
              and safe interruption capability

Triggers:     execute plan, run tasks, implement, do the work
Prerequisites: Approved task list from prism-sp-planning
Outputs:      Completed work, evidence package, updated state

Input Skill:  prism-sp-planning
Output Skill: prism-sp-verification

Key Principles:
  1. Execute exactly - do what plan says, no more, no less
  2. One task at a time - enables precise checkpointing
  3. Verify before next - confirm completion with evidence
  4. Evidence required - no proof = not done
  5. Checkpoint discipline - follow schedule, respect buffer zones
  6. Safe interruption - can stop at any checkpoint cleanly
```

---

**END OF SKILL DOCUMENT**

