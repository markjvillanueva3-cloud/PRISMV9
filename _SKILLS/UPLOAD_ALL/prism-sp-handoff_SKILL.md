---
name: prism-sp-handoff
description: |
  Session transition protocol. State capture and next-session preparation.
---

A complete handoff consists of 5 components. Each serves a specific purpose in ensuring session continuity.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           5 HANDOFF COMPONENTS                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ 1. STATE CAPTURE                                                                │   │
│  │    CURRENT_STATE.json - Machine-readable state                                  │   │
│  │    Purpose: Enable programmatic state restoration                               │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ 2. QUICK RESUME                                                                 │   │
│  │    One paragraph in quickResume field                                           │   │
│  │    Purpose: Human-readable instant context                                      │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ 3. SESSION LOG                                                                  │   │
│  │    Entry in SESSION_LOGS/                                                       │   │
│  │    Purpose: Historical record for reference                                     │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ 4. NEXT SESSION PREP                                                            │   │
│  │    nextSession object in state                                                  │   │
│  │    Purpose: Clear direction for next session                                    │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ 5. HANDOFF VERIFICATION                                                         │   │
│  │    Checklist confirming all components complete                                 │   │
│  │    Purpose: Ensure nothing is missed                                            │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Component 1: State Capture

### Purpose
Save all relevant session state to CURRENT_STATE.json for machine-readable restoration.

### What to Capture

| Field | Description | Example |
|-------|-------------|---------|
| version | State format version | "3.22.0" |
| lastUpdated | Timestamp of update | "2026-01-24T19:45:00Z" |
| currentSession | This session's info | { id, name, status, deliverables } |
| superpowersPhase | Current phase progress | { phase, completed, sessions } |
| skillsCreated | Skills built so far | [ { id, skill, size, lines } ] |
| nextSession | What comes next | { id, name, description } |
| quickResume | One-paragraph summary | "SP.1.7 COMPLETE..." |

### Location
```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
```

## 2.3 Component 2: Quick Resume

### Purpose
Provide a human-readable summary that enables instant context in ~10 seconds of reading.

### Format
```
[SESSION_ID] COMPLETE. [What was created with key metrics]. 
[Current progress state]. [What's next with specifics]. 
[Key path if relevant].
```

### Requirements
- One paragraph, 50-100 words
- Session ID and status
- What was created (file, size, key features)
- Current progress (X of Y complete, percentage)
- Specific next task
- No fluff, pure information density

### Location
```json
{
  "quickResume": {
    "forNextChat": "SP.1.7 COMPLETE. Created prism-sp-verification..."
  }
}
```

## 2.4 Component 3: Session Log

### Purpose
Maintain a historical record of all sessions for reference and audit.

### Format
```markdown
# SESSION LOG: [SESSION_ID]

**Date:** [YYYY-MM-DD]
**Duration:** [approximate]
**Status:** COMPLETE / PARTIAL / ABORTED

## Work Completed
- [item 1]
- [item 2]

## Files Created/Modified
- [path]: [description]

## Issues Encountered
- [issue 1]: [resolution]

## Notes
[any relevant notes]
```

### Location
```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\
  └── [YYYY-MM-DD]-[SESSION_ID].md
```

## 2.5 Component 4: Next Session Prep

### Purpose
Provide clear, actionable direction for the next session.

### What to Include

| Field | Description | Example |
|-------|-------------|---------|
| id | Next session ID | "SP.1.8" |
| name | Descriptive name | "prism-sp-handoff Skill" |
| description | What will be done | "Session transition protocol..." |
| deliverable | Expected output | "prism-sp-handoff/SKILL.md" |
| estimatedSize | Size estimate | "~35KB" |
| skillsToLoad | Skills needed | ["prism-sp-handoff"] |
| prerequisites | What must exist | ["SP.1.7 complete"] |

### Location
```json
{
  "nextSession": {
    "id": "SP.1.8",
    "name": "prism-sp-handoff Skill",
    "description": "Session transition protocol...",
    "deliverable": "prism-sp-handoff/SKILL.md",
    "estimatedSize": "~35KB"
  }
}
```

## 2.6 Component 5: Handoff Verification

### Purpose
Ensure all handoff components are complete before session ends.

### Checklist

```markdown
## HANDOFF CHECKLIST

☐ STATE CAPTURE
  ☐ CURRENT_STATE.json updated
  ☐ Version incremented
  ☐ currentSession complete
  ☐ Progress metrics updated

☐ QUICK RESUME
  ☐ quickResume field written
  ☐ Contains session ID
  ☐ Contains what was done
  ☐ Contains what's next
  ☐ Under 100 words

☐ SESSION LOG
  ☐ Log file created
  ☐ Work completed listed
  ☐ Files listed
  ☐ Issues documented

☐ NEXT SESSION PREP
  ☐ nextSession object complete
  ☐ Clear task description
  ☐ Expected deliverable defined
  ☐ Prerequisites listed

☐ FINAL VERIFICATION
  ☐ State file readable
  ☐ No missing fields
  ☐ Next session can start immediately

**HANDOFF STATUS:** ☐ COMPLETE / ☐ INCOMPLETE
```

## 2.7 Component Summary

| Component | Purpose | Location | Priority |
|-----------|---------|----------|----------|
| State Capture | Machine-readable state | CURRENT_STATE.json | CRITICAL |
| Quick Resume | Human-readable context | quickResume field | CRITICAL |
| Session Log | Historical record | SESSION_LOGS/ | IMPORTANT |
| Next Session Prep | Direction for next | nextSession field | CRITICAL |
| Handoff Verification | Quality check | Checklist | REQUIRED |

**HANDOFF STATUS:** 
☐ COMPLETE - All checks passed
☐ INCOMPLETE - Missing: [list]
```

### Step 5 Checklist
- [ ] All 4 previous steps verified
- [ ] State file is valid JSON
- [ ] All required fields present
- [ ] Handoff status = COMPLETE

## 3.7 Process Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     HANDOFF PROCESS QUICK REFERENCE                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  STEP 1: CAPTURE STATE                                                                  │
│  ☐ Update CURRENT_STATE.json                                                            │
│  ☐ Increment version                                                                    │
│  ☐ Set currentSession to COMPLETE                                                       │
│  ☐ Update progress metrics                                                              │
│                                                                                         │
│  STEP 2: WRITE QUICK RESUME                                                             │
│  ☐ Session ID + status                                                                  │
│  ☐ Deliverable + size + lines                                                           │
│  ☐ Key features (2-3)                                                                   │
│  ☐ Progress metrics                                                                     │
│  ☐ Next task                                                                            │
│                                                                                         │
│  STEP 3: LOG SESSION                                                                    │
│  ☐ Create log file in SESSION_LOGS/                                                     │
│  ☐ List work completed                                                                  │
│  ☐ List deliverables                                                                    │
│  ☐ Document issues                                                                      │
│                                                                                         │
│  STEP 4: PREPARE NEXT                                                                   │
│  ☐ Define next session ID                                                               │
│  ☐ Clear task description                                                               │
│  ☐ Expected deliverable                                                                 │
│  ☐ Size estimate                                                                        │
│                                                                                         │
│  STEP 5: VERIFY                                                                         │
│  ☐ All steps complete                                                                   │
│  ☐ State file valid                                                                     │
│  ☐ Next session can start immediately                                                   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

# SECTION 5: QUICK RESUME FORMAT

## 5.1 Purpose

The quick resume is a high-density paragraph that enables the next Claude instance to understand the current state in under 10 seconds of reading.

## 5.2 Format Template

```
[SESSION_ID] [STATUS]. [Created/Did DELIVERABLE] ([SIZE], [LINES] lines) - 
[KEY_FEATURE_1], [KEY_FEATURE_2], [KEY_FEATURE_3]. [PHASE] now [PERCENT]% 
done ([N]/[N] items). Total [CATEGORY]: [TOTAL_SIZE] across [N] items 
([TOTAL_LINES] lines). NEXT: [NEXT_ID] [NEXT_NAME] (~[SIZE]) - [BRIEF_DESC].
```

## 5.3 Components

| Component | Required | Description | Example |
|-----------|----------|-------------|---------|
| Session ID | YES | Completed session | "SP.1.7" |
| Status | YES | COMPLETE or other | "COMPLETE" |
| Deliverable | YES | What was created | "prism-sp-verification skill" |
| Size | YES | File size | "(81KB, 2645 lines)" |
| Key features | YES | 2-3 main aspects | "5 evidence levels, no-claim-without-proof" |
| Phase progress | YES | Current progress | "SP.1 now 87.5% done (7/8)" |
| Total cumulative | IF RELEVANT | Running totals | "643KB across 7 skills" |
| Next task | YES | What's coming | "NEXT: SP.1.8 prism-sp-handoff" |
| Next estimate | YES | Size/effort | "(~35KB)" |

## 5.4 Writing Guidelines

### DO
- Start with session ID and status
- Include specific numbers (KB, lines, percentages)
- Mention 2-3 key features, not all features
- Include cumulative totals for context
- End with specific next task
- Keep under 100 words

### DON'T
- Use vague language ("worked on stuff")
- Omit numbers/metrics
- Write multiple paragraphs
- Include unnecessary details
- Forget the next task
- Exceed 100 words

## 5.5 Examples

### Example 1: Skill Creation Session

```
SP.1.6 COMPLETE. Created prism-sp-debugging skill (109KB, 2949 lines) - 
4-phase mandatory debugging process with NO PHASE SKIPPING rule, defense-in-depth 
requiring 3+ prevention layers, 10+ bug patterns and anti-patterns documented. 
SP.1 now 75% done (6/8 skills). Total skill content: 562KB across 6 skills 
(13,369 lines). NEXT: SP.1.7 prism-sp-verification (~40KB) - evidence-based 
completion proof.
```

### Example 2: Database Enhancement Session

```
DB.3.2 COMPLETE. Enhanced titanium alloys database (45KB, 125 materials) - 
added Kienzle coefficients, Johnson-Cook parameters, and Taylor tool life 
data to all entries. Materials expansion now 85% done (127/150 categories). 
Total database: 2.3MB across 847 materials. NEXT: DB.3.3 aluminum alloys 
(~40KB, ~100 materials) - complete 7xxx series aerospace alloys.
```

### Example 3: Phase Completion Session

```
SP.1 COMPLETE! All 8 core development workflow skills created (678KB, 16,964 lines): 
brainstorm, planning, execution, review-spec, review-quality, debugging, verification, 
handoff. SP.1 establishes the methodology for all future PRISM development - every 
skill is now governed by this workflow. Overall: 12/68 superpowers complete (17.6%). 
NEXT: SP.2 Monolith Navigation (~100KB) - skills for working with the 986K line monolith.
```

## 5.6 Quick Resume Checklist

```markdown
## QUICK RESUME VALIDATION

☐ Session ID present
☐ Status word (COMPLETE/PARTIAL)
☐ Deliverable named
☐ Size in KB
☐ Line count
☐ 2-3 key features
☐ Phase progress (X% or N/N)
☐ Cumulative totals (if relevant)
☐ NEXT: with specific session ID
☐ Next session estimate
☐ Under 100 words

**Word Count:** [N] words
**Valid:** ☐ YES / ☐ NO
```

## Work Completed

### Primary Deliverable
- **File:** [filename]
- **Path:** [full path]
- **Size:** [size]
- **Lines:** [count]

### Tasks Completed
1. [Task 1 description]
2. [Task 2 description]
3. [Task N description]

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| [Issue 1] | [How resolved] |
| [Issue 2] | [How resolved] |

*(None if no issues)*

## Notes

[Any relevant notes for future reference]

*Log created: [TIMESTAMP]*
```

## 6.5 Log Example

```markdown
# SESSION LOG: SP.1.7

## Session Info

| Field | Value |
|-------|-------|
| **Date** | 2026-01-24 |
| **Session ID** | SP.1.7 |
| **Name** | prism-sp-verification Skill |
| **Status** | COMPLETE |
| **Duration** | ~1 hour |

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| 5 levels vs 3 | More granularity helps identify exactly what's missing |
| Level 5 required | Lower levels leave room for error |
| Both PowerShell + Bash | User works on Windows, skills should work everywhere |

## Files Created/Modified

| File | Action | Path |
|------|--------|------|
| SKILL.md | Created | \_SKILLS\prism-sp-verification\SKILL.md |
| CURRENT_STATE.json | Modified | Root directory |

## Next Session

| Field | Value |
|-------|-------|
| **ID** | SP.1.8 |
| **Task** | prism-sp-handoff Skill |
| **Expected** | ~35KB skill for session transitions |

# SECTION 7: RECOVERY PROTOCOL

## 7.1 Purpose

Sometimes handoffs are incomplete or sessions end unexpectedly. This section covers how to recover and continue.

## 7.2 Recovery Scenarios

### Scenario 1: Session Ended Without Handoff

**Symptoms:**
- CURRENT_STATE.json outdated
- No session log for last session
- Unclear what was done

**Recovery Steps:**
1. Check file timestamps in working directories
2. Look for recently modified files
3. Review any partial work
4. Reconstruct state from file system
5. Update CURRENT_STATE.json
6. Create retroactive session log

**Recovery Template:**
```markdown
## RECOVERY: Incomplete Handoff

**Last Known State:** [from CURRENT_STATE.json]
**Actual Current State:** [from file system inspection]

### Files Found Since Last Update
| File | Modified | Size | Notes |
|------|----------|------|-------|
| [file] | [timestamp] | [size] | [description] |

### State Reconstruction
Based on files found:
- Completed: [list]
- In progress: [list]
- Unknown: [list]

### Updated State
[Write corrected CURRENT_STATE.json]
```

### Scenario 2: CURRENT_STATE.json Corrupted/Missing

**Symptoms:**
- JSON parse error
- File not found
- State inconsistent

**Recovery Steps:**
1. Check for backup (CURRENT_STATE.json.bak)
2. Check Box version history
3. Reconstruct from SESSION_LOGS
4. Inspect file system for current state
5. Create new state file

**Recovery Template:**
```markdown
## RECOVERY: State File Missing/Corrupted

**Problem:** [describe issue]

### Recovery Sources
1. Backup file: ☐ Available / ☐ Not found
2. Box history: ☐ Available / ☐ Not found
3. Session logs: ☐ Available / ☐ Not found

### State Reconstruction
Based on available sources:

**Last Verified Session:** [SESSION_ID]
**Files Present:**
[list from directory inspection]

**Reconstructed State:**
[create new CURRENT_STATE.json]
```

### Scenario 3: Session Partially Complete

**Symptoms:**
- Work started but not finished
- Status = "IN_PROGRESS" or "PARTIAL"
- Some deliverables exist, others don't

**Recovery Steps:**
1. Read CURRENT_STATE.json for partial state
2. Check what deliverables exist
3. Determine what remains
4. Resume from last checkpoint
5. Update state to reflect current position

**Recovery Template:**
```markdown
## RECOVERY: Partial Session

**Session:** [SESSION_ID]
**Status:** PARTIAL

### What Was Completed
- [x] [Task 1]
- [x] [Task 2]
- [ ] [Task 3] ← Resume here
- [ ] [Task 4]

### Deliverable Status
| Deliverable | Status | Notes |
|-------------|--------|-------|
| [file1] | Complete | [verified] |
| [file2] | Partial | [what's missing] |
| [file3] | Not started | [needs work] |

### Resume Point
Start from: [specific task/location]
First action: [what to do first]
```

## 7.3 Recovery Checklist

```markdown
## RECOVERY CHECKLIST

### 1. Assess Situation
☐ What's the last known good state?
☐ What files exist now?
☐ What session logs are available?
☐ What was the user working on?

### 2. Gather Evidence
☐ Check CURRENT_STATE.json
☐ Check SESSION_LOGS/
☐ Check file timestamps
☐ Check Box version history (if available)

### 3. Reconstruct State
☐ Determine actual current state
☐ Identify completed work
☐ Identify incomplete work
☐ Document discrepancies

### 4. Update State
☐ Write corrected CURRENT_STATE.json
☐ Create recovery log entry
☐ Set correct next session

### 5. Resume Work
☐ Clear understanding of current state
☐ Clear next task
☐ Ready to proceed

**Recovery Complete:** ☐ YES / ☐ NO (blocking issues: ___)
```

## 7.4 Prevention

To minimize need for recovery:

| Practice | Benefit |
|----------|---------|
| Save state frequently | Less to reconstruct |
| Use checkpoints | Clear resume points |
| Don't rely on memory | Everything in files |
| Complete handoff | No orphaned sessions |
| Sync to Box periodically | Backup available |

## 8.2 Example 2: Phase Completion Handoff

### Scenario
SP.1.8 completes, finishing the entire SP.1 phase. Major milestone.

### Handoff Execution

**Step 1: Capture State (Phase Complete)**
```json
{
  "version": "4.0.0",
  "lastUpdated": "2026-01-24T21:00:00Z",
  "currentSession": {
    "id": "SP.1.8",
    "name": "prism-sp-handoff Skill",
    "status": "COMPLETE"
  },
  "superpowersPhase": {
    "phase": "SP.1",
    "name": "Core Development Workflow",
    "totalSessions": 8,
    "completed": 8,
    "progress": "100%"
  },
  "completedPhases": {
    "SP.0": { "status": "COMPLETE" },
    "SP.1": { "status": "COMPLETE", "skills": 8, "totalSize": "678KB" }
  },
  "nextSession": {
    "id": "SP.2.1",
    "name": "Monolith Navigation Skills",
    "description": "Skills for navigating the 986K line monolith"
  },
  "quickResume": {
    "forNextChat": "🎉 SP.1 COMPLETE! All 8 core workflow skills done (678KB, 16,964 lines). Phase establishes methodology for all PRISM development. NEXT: SP.2 Monolith Navigation - extracting from the 986K line codebase."
  }
}
```

**Step 2: Quick Resume (Celebratory)**
```
🎉 SP.1 COMPLETE! All 8 core development workflow skills created (678KB, 
16,964 lines): brainstorm, planning, execution, review-spec, review-quality, 
debugging, verification, handoff. This phase establishes the methodology for 
ALL future PRISM development. Overall progress: 12/68 superpowers (17.6%). 
NEXT: SP.2 Monolith Navigation (~100KB) - skills for working with the 
986K line v8.89 codebase.
```

**Step 3: Session Log**
Created: `SESSION_LOGS/2026-01-24-SP.1.8.md`
(Note: Log includes phase completion summary)

**Step 4: Verify Handoff**
All checks passed. Phase transition complete.

# SECTION 9: INTEGRATION

## 9.1 Skill Metadata

```yaml
skill_id: prism-sp-handoff
version: 1.0.0
category: development-core
priority: CRITICAL

triggers:
  keywords:
    - "handoff", "hand off", "hand-off"
    - "end session", "session complete"
    - "save state", "capture state"
    - "wrap up", "wrapping up"
    - "transition", "next session"
  contexts:
    - After verification (SP.1.7)
    - When session is ending
    - When context window is filling
    - At natural completion points

activation_rule: |
  IF (work verified complete via SP.1.7)
  OR (session ending)
  OR (user indicates wrap up)
  THEN activate prism-sp-handoff
  AND execute 5-step handoff process

outputs:
  - Updated CURRENT_STATE.json
  - Quick resume paragraph
  - Session log entry
  - Next session preparation
  - Verified handoff checklist

next_skills:
  automatic: Next phase skills (e.g., SP.2.x)
```

## 9.2 Handoff Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           HANDOFF INTEGRATION FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  CURRENT SESSION                          HANDOFF                    NEXT SESSION       │
│  ─────────────────                       ────────                   ──────────────      │
│                                                                                         │
│  ┌────────────┐                         ┌────────┐                 ┌────────────┐      │
│  │ SP.1.7     │                         │ SP.1.8 │                 │ SP.2.1     │      │
│  │ Verified   │─────────────────────────│Handoff │─────────────────│ Starts     │      │
│  │ Complete   │                         │        │                 │ Immediately│      │
│  └────────────┘                         └────────┘                 └────────────┘      │
│        │                                     │                           │              │
│        │                                     │                           │              │
│        ▼                                     ▼                           ▼              │
│  ┌────────────┐                         ┌────────┐                 ┌────────────┐      │
│  │ Evidence   │                         │ State  │                 │ Read       │      │
│  │ Report     │                         │ File   │────────────────▶│ State      │      │
│  └────────────┘                         └────────┘                 └────────────┘      │
│                                              │                           │              │
│                                              ▼                           ▼              │
│                                         ┌────────┐                 ┌────────────┐      │
│                                         │ Quick  │────────────────▶│ Instant    │      │
│                                         │ Resume │                 │ Context    │      │
│                                         └────────┘                 └────────────┘      │
│                                              │                           │              │
│                                              ▼                           ▼              │
│                                         ┌────────┐                 ┌────────────┐      │
│                                         │Session │                 │ Begin      │      │
│                                         │ Log    │                 │ Work       │      │
│                                         └────────┘                 └────────────┘      │
│                                                                                         │
│  TIME: ◄────────────────────────────────────────────────────────────────────────────►  │
│        Session N ends                                          Session N+1 starts      │
│                                                                 (30 seconds later)     │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 9.3 State Files Location

```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\
├── CURRENT_STATE.json          ← Primary state file
├── CURRENT_STATE.json.bak      ← Backup (optional)
├── SESSION_LOGS\               ← Historical logs
│   ├── 2026-01-24-SP.1.6.md
│   ├── 2026-01-24-SP.1.7.md
│   └── 2026-01-24-SP.1.8.md
└── _SKILLS\                    ← Created skills
    ├── prism-sp-brainstorm\
    ├── prism-sp-planning\
    └── ...
```

## 9.4 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-SP-HANDOFF QUICK REFERENCE                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ⏱️ THE 30-SECOND RULE: Next session starts working in 30 seconds ⏱️                   │
│                                                                                         │
│  5 HANDOFF COMPONENTS                                                                   │
│  ─────────────────────                                                                  │
│  1. State Capture   → CURRENT_STATE.json                                                │
│  2. Quick Resume    → quickResume field                                                 │
│  3. Session Log     → SESSION_LOGS/[date]-[id].md                                       │
│  4. Next Session    → nextSession object                                                │
│  5. Verification    → Handoff checklist                                                 │
│                                                                                         │
│  5-STEP PROCESS                                                                         │
│  ─────────────────────                                                                  │
│  1. Capture state in CURRENT_STATE.json                                                 │
│  2. Write quick resume (50-100 words)                                                   │
│  3. Create session log entry                                                            │
│  4. Prepare next session info                                                           │
│  5. Verify handoff complete                                                             │
│                                                                                         │
│  QUICK RESUME FORMAT                                                                    │
│  ─────────────────────                                                                  │
│  [ID] [STATUS]. [Deliverable] ([size], [lines]) - [key features].                       │
│  [Phase progress]. Total: [cumulative]. NEXT: [next task] (~[size]).                    │
│                                                                                         │
│  REMEMBER:                                                                              │
│  • State in files, not memory                                                           │
│  • Write for a stranger (next Claude knows nothing)                                     │
│  • Actionable, not just descriptive                                                     │
│  • Verify before ending                                                                 │
│  • Enable instant resume                                                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 9.5 Full Handoff Checklist

```markdown
## COMPLETE HANDOFF CHECKLIST

**Session:** [SESSION_ID]
**Date:** [YYYY-MM-DD]

**HANDOFF STATUS:** ☐ COMPLETE / ☐ INCOMPLETE

**If INCOMPLETE, missing:**
- [ ] _______________
- [ ] _______________

# DOCUMENT END

**Skill:** prism-sp-handoff
**Version:** 1.0
**Total Sections:** 9
**Part of:** SP.1 Core Development Workflow (SP.1.8 of 8) - **FINAL SKILL**
**Created:** Session SP.1.8
**Status:** COMPLETE

**Key Features:**
- 5 handoff components (state, resume, log, next prep, verify)
- 5-step handoff process
- 30-second resume rule
- CURRENT_STATE.json schema
- Quick resume format and examples
- Session logging protocol
- Recovery procedures
- Complete checklists
