# ⛔ RESTART PREVENTION CHECKLIST
## PRISM Manufacturing Intelligence
### Use this checklist BEFORE starting any work

---

# PURPOSE

This checklist exists because **task restarts waste time and create inconsistency**.

In manufacturing intelligence:
- A restarted calculation may produce different results
- A restarted extraction may miss dependencies found earlier
- A restarted task may diverge from documented progress

**Restarts are NEVER acceptable for IN_PROGRESS tasks.**

---

# MANDATORY VERIFICATION

## Before ANY Work, Verify:

### ☐ 1. DID I READ THE STATE FILE?

```
Action: Filesystem:read_file
Path: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json

Verification: Quote the quickResume field out loud
Example: "State verified. quickResume says: SESSION 24 COMPLETE..."
```

**If you cannot quote quickResume, you have NOT read the state.**

---

### ☐ 2. IS THE PREVIOUS TASK IN_PROGRESS?

Check `currentTask.status` in the state file.

| Status | Action |
|--------|--------|
| `"IN_PROGRESS"` | **STOP** - You MUST resume, not restart |
| `"COMPLETE"` | You may start new work |
| Missing/Other | Investigate before proceeding |

**If IN_PROGRESS: Read `lastCompleted` and `nextToDo`, then RESUME from there.**

---

### ☐ 3. HAVE I ALREADY DONE THIS WORK?

Before starting what seems like new work:

| Question | Where to Check |
|----------|----------------|
| Was this file already created? | List the target directory |
| Was this extraction already done? | Check EXTRACTED folder |
| Was this step already completed? | Check state file phases |
| Is there a session log? | Check SESSION_LOGS folder |

**If work exists, DO NOT redo it. Continue from where it stopped.**

---

### ☐ 4. AM I ABOUT TO RE-READ A FILE IN CONTEXT?

If you already have file content in the current conversation:
- **DO NOT** re-read it
- **USE** the existing content
- Re-reading wastes context space

**Exception:** If file may have changed since last read.

---

### ☐ 5. IS THIS A CONTINUATION OR NEW WORK?

| Indicator | Type | Action |
|-----------|------|--------|
| User says "continue", "resume", "keep going" | Continuation | Resume from checkpoint |
| User references previous work | Continuation | Load context, then continue |
| State shows IN_PROGRESS | Continuation | MUST resume |
| User describes entirely new task | New work | May proceed (if previous complete) |
| State shows COMPLETE | New work allowed | May start fresh |

---

# RESTART PREVENTION GATES

## Gate 1: State Verification Gate

```
┌──────────────────────────────────────────────────────────────┐
│  BEFORE ANY WORK:                                            │
│                                                              │
│  ☐ Read CURRENT_STATE.json                                   │
│  ☐ Quote quickResume to prove you read it                    │
│  ☐ Check currentTask.status                                  │
│                                                              │
│  IF ANY UNCHECKED: CANNOT PROCEED                            │
└──────────────────────────────────────────────────────────────┘
```

## Gate 2: Resume Enforcement Gate

```
┌──────────────────────────────────────────────────────────────┐
│  IF currentTask.status = "IN_PROGRESS":                      │
│                                                              │
│  ⛔ Starting new task: BLOCKED                               │
│  ⛔ Restarting from beginning: BLOCKED                       │
│  ⛔ Re-processing completed items: BLOCKED                   │
│                                                              │
│  ✅ ONLY VALID ACTION: Resume from checkpoint                │
│     - Read lastCompleted                                     │
│     - Start from nextToDo                                    │
│     - Continue sequence                                      │
└──────────────────────────────────────────────────────────────┘
```

## Gate 3: Duplication Prevention Gate

```
┌──────────────────────────────────────────────────────────────┐
│  BEFORE CREATING/PROCESSING:                                 │
│                                                              │
│  ☐ Does this file already exist?                             │
│  ☐ Was this item already processed?                          │
│  ☐ Does session log show this was done?                      │
│                                                              │
│  IF ANY EXIST: Use existing, don't recreate                  │
└──────────────────────────────────────────────────────────────┘
```

---

# WHAT TO DO WHEN RESUMING

## Step 1: Understand Current Position

```
From CURRENT_STATE.json, extract:
- currentTask.step: Where are we in the sequence?
- currentTask.lastCompleted: What was the last thing done?
- currentTask.nextToDo: What should we do next?
- currentTask.phases: What is the full sequence?
```

## Step 2: Verify Previous Work

```
Check that lastCompleted actually exists:
- If it's a file: Verify file exists and has expected content
- If it's data: Verify data is in expected location
- If it's processing: Verify output exists
```

## Step 3: Continue From Checkpoint

```
Start from nextToDo, NOT from the beginning:
- Skip all completed phases
- Begin with the next incomplete phase
- Update state as you progress
```

## Step 4: Update State Immediately

```
After completing any step:
- Update currentTask.step
- Update currentTask.lastCompleted
- Update currentTask.nextToDo
- Save state file
```

---

# COMMON MISTAKES TO AVOID

## Mistake 1: "Let me start fresh"
**WRONG**: "I'll start this task from scratch to make sure I don't miss anything"
**RIGHT**: "I'll check the state file to see where we left off and continue from there"

## Mistake 2: "I should read all the files first"
**WRONG**: Re-reading files that are already in context
**RIGHT**: Using existing context, only reading new files

## Mistake 3: "The user asked for X, so I'll do X"
**WRONG**: Starting X without checking if X is already in progress
**RIGHT**: Checking state first, then either resuming X or starting X

## Mistake 4: "I don't see previous context, so this is new"
**WRONG**: Assuming no context means new task
**RIGHT**: Reading state file to understand context that may have been compacted

## Mistake 5: "This seems like a simple restart"
**WRONG**: Any restart of an IN_PROGRESS task
**RIGHT**: ALWAYS resume, NEVER restart IN_PROGRESS

---

# QUICK DECISION TREE

```
START
  │
  ▼
Read CURRENT_STATE.json
  │
  ├─── Failed to read ──► Fix state file first
  │
  ▼
Quote quickResume
  │
  ├─── Cannot quote ──► Re-read state file
  │
  ▼
Check currentTask.status
  │
  ├─── "IN_PROGRESS" ──► RESUME from nextToDo (NO EXCEPTIONS)
  │
  ├─── "COMPLETE" ──► May start new work
  │
  └─── Other ──► Investigate, likely need to RESUME
```

---

# ENFORCEMENT SCRIPT

Use the session enforcer to verify compliance:

```powershell
# Check current state
python session_enforcer.py --check

# Get status with enforcement rules
python session_enforcer.py --status

# Get resume instructions (if IN_PROGRESS)
python session_enforcer.py --resume

# Verify protocol compliance
python session_enforcer.py --verify
```

---

# REMEMBER

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   RESTARTS ARE NEVER NECESSARY                                                ║
║   RESTARTS ARE NEVER ACCEPTABLE                                               ║
║   RESTARTS ARE PROTOCOL VIOLATIONS                                            ║
║                                                                               ║
║   IF IN_PROGRESS: RESUME                                                      ║
║   IF COMPLETE: MAY START NEW                                                  ║
║   IF UNCLEAR: CHECK STATE FILE                                                ║
║                                                                               ║
║   NO EXCEPTIONS.                                                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

**Document Version:** 1.0
**Created:** 2026-01-25
**Location:** C:\PRISM REBUILD...\_PRISM_MASTER\PROTOCOL\03_RESTART_PREVENTION.md
**Status:** MANDATORY - Must be followed for all session transitions
