---
name: prism-session-master
description: |
  Unified session management. Lifecycle, context pressure, state persistence, recovery.
---

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  SESSION START CHECKLIST (Execute in order)                                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  □ STEP 1: Read CURRENT_STATE.json                                                      │
│    Tool: Filesystem:read_file("C:\PRISM REBUILD...\CURRENT_STATE.json")                 │
│                                                                                         │
│  □ STEP 2: Check currentTask.status                                                     │
│    IF "IN_PROGRESS" → Resume (don't restart!)                                           │
│    IF "COMPLETE" → Start next task                                                      │
│                                                                                         │
│  □ STEP 3: Read quickResume (5-second context)                                          │
│    DOING: [what], STOPPED: [where], NEXT: [what]                                        │
│                                                                                         │
│  □ STEP 4: Load phase-appropriate skills                                                │
│    Brainstorm → sp-brainstorm                                                           │
│    Planning → sp-planning                                                               │
│    Execution → sp-execution                                                             │
│    Review → sp-review-spec, sp-review-quality                                           │
│                                                                                         │
│  □ STEP 5: Initialize buffer counter at 0                                               │
│    Track: tool calls since last checkpoint                                              │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Anti-Restart Rules

```
❌ NEVER restart a task that's IN_PROGRESS
❌ NEVER re-read files already in context
❌ NEVER repeat work from previous session
✅ CHECKPOINT progress → CONTINUE → COMPLETE
✅ If stuck: checkpoint first, then ask user
```

## 2.2 During Session

### Checkpoint Rhythm

```javascript
// THE CHECKPOINT CADENCE
After every 3-5 tool calls:
  → Quick mental check: "Am I in yellow zone?"
  
After every 8-10 tool calls:
  → Micro-checkpoint: Update currentTask.step
  
After completing a logical unit:
  → Standard checkpoint: Full state update
  
Before any risky operation:
  → Full checkpoint: State + handoff notes
```

### Tool Call Counter

Track this mentally or explicitly:

| Calls Since Save | Zone | Action |
|-----------------|------|--------|
| 0-8 | 🟢 GREEN | Work freely |
| 9-14 | 🟡 YELLOW | Plan checkpoint soon |
| 15-18 | 🟠 ORANGE | Checkpoint NOW |
| 19+ | 🔴 RED | EMERGENCY - Stop and save |

### Micro-Checkpoint Pattern

```javascript
// Quick update - just currentTask progress
{
  "currentTask": {
    "step": 5,  // Was 4
    "lastAction": "Completed T5",
    "nextAction": "Start T6"
  }
}
```

### Standard Checkpoint Pattern

```javascript
// Update currentTask + checkpoint block
{
  "currentTask": {
    "id": "SP.3.5",
    "status": "IN_PROGRESS",
    "step": 5,
    "totalSteps": 7,
    "lastCompleted": "Section 4: Enhancement Workflow",
    "nextToDo": "Section 5: Integration"
  },
  "checkpoint": {
    "timestamp": "2026-01-24T21:30:00Z",
    "toolCallsSinceCheckpoint": 0,
    "filesModified": ["prism-material-enhancer/SKILL.md"],
    "linesWritten": 660
  }
}
```

## 2.3 Session End Protocol

### Clean Shutdown (4 Steps)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  SESSION END CHECKLIST                                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  □ STEP 1: Complete current logical unit (no partial work)                              │
│                                                                                         │
│  □ STEP 2: Update CURRENT_STATE.json fully                                              │
│    - currentTask status                                                                 │
│    - All progress metrics                                                               │
│    - quickResume field                                                                  │
│                                                                                         │
│  □ STEP 3: Write quickResume (5-second format)                                          │
│    DOING:   [one-line what we were doing]                                               │
│    STOPPED: [one-line where we stopped]                                                 │
│    NEXT:    [one-line what to do immediately]                                           │
│                                                                                         │
│  □ STEP 4: Announce next session scope                                                  │
│    "Next session: [specific task]"                                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5-Second Resume Format

```markdown
═══════════════════════════════════════════════════════════════════════════
5-SECOND RESUME
═══════════════════════════════════════════════════════════════════════════
DOING:   Creating SP.3 Materials System skills (5 of 5)
STOPPED: After SP.3.5 prism-material-enhancer complete (37KB, 1001 lines)
NEXT:    Start SP.4 prism-session-master consolidation skill
═══════════════════════════════════════════════════════════════════════════
```

## 2.4 Session State Structure

```javascript
// CURRENT_STATE.json minimal structure
{
  "version": "6.0.0",
  "lastUpdated": "ISO timestamp",
  
  "currentSession": {
    "id": "SP.4",
    "name": "Session Management Consolidation",
    "status": "IN_PROGRESS",  // or "COMPLETE"
    "started": "ISO timestamp"
  },
  
  "currentTask": {
    "id": "SP.4.1",
    "description": "Create prism-session-master skill",
    "status": "IN_PROGRESS",
    "step": 2,
    "totalSteps": 7,
    "lastCompleted": "Section 1: Overview",
    "nextToDo": "Section 2: Session Lifecycle"
  },
  
  "checkpoint": {
    "timestamp": "ISO timestamp",
    "toolCallsSinceCheckpoint": 0,
    "filesModified": [],
    "recoveryConfidence": 95
  },
  
  "quickResume": {
    "forNextChat": "One paragraph summary for instant context"
  }
}
```

# SECTION 4: STATE PERSISTENCE & CHECKPOINTS

## 4.1 Checkpoint Types

### Micro-Checkpoint (Every 5-10 operations)
```javascript
// Minimal - just update step counter
// Use: Filesystem:edit_file with targeted edit
{
  "currentTask": {
    "step": 5,  // Increment
    "lastAction": "Completed T5"
  }
}
// Time: <5 seconds
// Frequency: Every 5-10 tool calls
```

### Standard Checkpoint (Yellow zone)
```javascript
// Medium - update task + checkpoint block
{
  "currentTask": {
    "id": "SP.4.1",
    "status": "IN_PROGRESS",
    "step": 5,
    "totalSteps": 7,
    "lastCompleted": "Section 4",
    "nextToDo": "Section 5"
  },
  "checkpoint": {
    "timestamp": "2026-01-24T21:45:00Z",
    "toolCallsSinceCheckpoint": 0,
    "filesModified": ["SKILL.md"],
    "linesWritten": 450
  }
}
// Time: ~15 seconds
// Frequency: End of each logical unit
```

### Full Checkpoint (Orange/Red zone or session end)
```javascript
// Complete - everything updated
{
  "version": "6.1.0",
  "lastUpdated": "2026-01-24T22:00:00Z",
  "currentSession": { /* full */ },
  "currentTask": { /* full */ },
  "checkpoint": { /* full */ },
  "contextDNA": { /* if applicable */ },
  "quickResume": {
    "forNextChat": "Full context summary..."
  }
}
// Time: ~30 seconds
// Frequency: Session end, emergency, handoff
```

## 4.2 State Update Patterns

### Pattern 1: Targeted Edit (Fastest)
```javascript
// For incrementing counters or simple updates
Filesystem:edit_file({
  path: "CURRENT_STATE.json",
  edits: [{
    oldText: '"step": 4',
    newText: '"step": 5'
  }]
})
```

### Pattern 2: Section Rewrite (Medium)
```javascript
// For updating a section while preserving rest
// Read → Modify in memory → Write section
```

### Pattern 3: Full Rewrite (Complete)
```javascript
// For major updates or structural changes
// Build complete new state → Write entire file
Filesystem:write_file({
  path: "CURRENT_STATE.json",
  content: JSON.stringify(newState, null, 2)
})
```

## 4.3 Context DNA (Compressed Fingerprints)

For post-compaction recovery, maintain context DNA:

```javascript
{
  "contextDNA": {
    "version": "1.0",
    "lastUpdated": "2026-01-24T22:00:00Z",
    
    // ESSENCE - What we're doing (5-second understanding)
    "essence": {
      "project": "PRISM v9.0 rebuild from v8.89 monolith",
      "currentFocus": "Creating superpowers skills",
      "currentFile": "prism-session-master/SKILL.md",
      "position": "Section 4 of 6"
    },
    
    // KEY DECISIONS - Don't repeat discussions
    "keyDecisions": [
      "127-param material schema locked",
      "Chunked writes for files >50KB",
      "ENHANCE existing before adding new",
      "Local C: primary, Box for backup",
      "Desktop Commander for large files"
    ],
    
    // PATTERNS PROVEN - What works
    "patternsProven": {
      "skillCreation": "YAML → sections → verify → checkpoint",
      "largeFiles": "append mode, 80-100 lines per chunk",
      "verification": "get_file_info for size/lines"
    },
    
    // PATTERNS FAILED - Don't repeat mistakes
    "patternsFailed": [
      "Single massive write (truncation risk)",
      "Skipping verification step",
      "Continuing past red zone"
    ],
    
    // RECOVERY HINTS - How to reconstruct
    "recoveryHints": {
      "stateFile": "C:\\PRISM REBUILD...\\CURRENT_STATE.json",
      "lastOutputDir": "C:\\PRISM REBUILD...\\_SKILLS\\prism-session-master\\",
      "monolithLocation": "C:\\PRISM REBUILD...\\_BUILD\\PRISM_v8_89_002..."
    }
  }
}
```

## 4.4 Recovery Confidence Scoring

Calculate confidence in session recovery:

```javascript
function calculateRecoveryConfidence(state) {
  let score = 0;
  
  // Core state available
  if (state.currentTask) score += 30;
  if (state.currentSession) score += 20;
  if (state.quickResume) score += 25;
  
  // Context DNA available
  if (state.contextDNA?.essence) score += 10;
  if (state.contextDNA?.keyDecisions) score += 5;
  if (state.contextDNA?.patternsProven) score += 5;
  
  // Recency bonus
  const hoursSinceUpdate = getHoursSince(state.lastUpdated);
  if (hoursSinceUpdate < 1) score += 5;
  else if (hoursSinceUpdate < 24) score += 2;
  
  return Math.min(100, score);
}

// Interpretation:
// 90-100: Full recovery, continue immediately
// 70-89:  Good recovery, verify before continuing
// 50-69:  Partial recovery, read more context
// <50:    Poor recovery, may need fresh start
```

## 4.5 Checkpoint Decision Tree

```
START OF OPERATION
       │
       ▼
Check tool call count
       │
       ├─── 0-8 calls ──► Continue working
       │
       ├─── 9-14 calls ──► Plan checkpoint at next natural break
       │
       ├─── 15-18 calls ──► CHECKPOINT NOW before continuing
       │
       └─── 19+ calls ──► EMERGENCY STOP, full checkpoint
       
AFTER ANY FILE WRITE
       │
       ▼
Verify file exists and has expected size?
       │
       ├─── YES ──► Micro-checkpoint (update progress)
       │
       └─── NO ──► STOP - Investigate before continuing

BEFORE RISKY OPERATION (delete, replace, merge)
       │
       ▼
ALWAYS checkpoint first, regardless of zone
```

# SECTION 6: INTEGRATION & QUICK REFERENCE

## 6.1 Skill Metadata

```yaml
skill_id: prism-session-master
version: 1.0.0
category: session-management
priority: CRITICAL (always relevant)

consolidates:
  - prism-state-manager (350 lines)
  - prism-context-pressure (342 lines)
  - prism-context-dna (337 lines)
  - prism-session-handoff (395 lines)
  - prism-quick-start (94 lines)

triggers:
  keywords:
    - "session start", "session end"
    - "checkpoint", "save state"
    - "context pressure", "buffer"
    - "recovery", "handoff", "resume"
  contexts:
    - Every session (always relevant)
    - Context pressure rising
    - Post-compaction recovery
    - Cross-session continuity

outputs:
  - Updated CURRENT_STATE.json
  - Session logs
  - Handoff documentation
  - quickResume summaries

related_skills:
  - prism-sp-* (core workflow phases)
  - prism-material-* (domain work)
  - All skills (session management applies universally)
```

## 6.2 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-SESSION-MASTER QUICK REFERENCE                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SESSION START (5 steps)                                                                │
│  ════════════════════════                                                               │
│  1. Read CURRENT_STATE.json                                                             │
│  2. Check currentTask.status (IN_PROGRESS? Resume!)                                     │
│  3. Read quickResume (5-second context)                                                 │
│  4. Load phase-appropriate skills                                                       │
│  5. Initialize buffer counter = 0                                                       │
│                                                                                         │
│  PRESSURE ZONES                                                                         │
│  ════════════════════════                                                               │
│  🟢 GREEN   0-8 calls    Work freely                                                    │
│  🟡 YELLOW  9-14 calls   Plan checkpoint                                                │
│  🟠 ORANGE  15-18 calls  Checkpoint NOW                                                 │
│  🔴 RED     19+ calls    EMERGENCY STOP                                                 │
│                                                                                         │
│  CHECKPOINT TYPES                                                                       │
│  ════════════════════════                                                               │
│  Micro:    Update step counter only (5 sec)                                             │
│  Standard: Update task + checkpoint block (15 sec)                                      │
│  Full:     Complete state + quickResume (30 sec)                                        │
│                                                                                         │
│  SESSION END (4 steps)                                                                  │
│  ════════════════════════                                                               │
│  1. Complete current logical unit                                                       │
│  2. Full CURRENT_STATE.json update                                                      │
│  3. Write quickResume (DOING/STOPPED/NEXT)                                              │
│  4. Announce next session scope                                                         │
│                                                                                         │
│  5-SECOND RESUME FORMAT                                                                 │
│  ════════════════════════                                                               │
│  DOING:   [one-line what]                                                               │
│  STOPPED: [one-line where]                                                              │
│  NEXT:    [one-line action]                                                             │
│                                                                                         │
│  RECOVERY PRIORITY                                                                      │
│  ════════════════════════                                                               │
│  1. quickResume (always, 10 sec)                                                        │
│  2. currentTask (if IN_PROGRESS, 20 sec)                                                │
│  3. Last 20 lines of target file (30 sec)                                               │
│  4. contextDNA.essence (if post-compaction)                                             │
│  5. Session log (only if unclear)                                                       │
│                                                                                         │
│  CRITICAL PATHS                                                                         │
│  ════════════════════════                                                               │
│  State:    C:\PRISM REBUILD...\CURRENT_STATE.json                                       │
│  Logs:     C:\PRISM REBUILD...\SESSION_LOGS\                                            │
│  Skills:   C:\PRISM REBUILD..\_SKILLS\                                                  │
│  Monolith: C:\PRISM REBUILD..\_BUILD\PRISM_v8_89_002...\                                 │
│                                                                                         │
│  ANTI-RESTART RULES                                                                     │
│  ════════════════════════                                                               │
│  ❌ NEVER restart IN_PROGRESS task                                                      │
│  ❌ NEVER re-read files in context                                                      │
│  ✅ CHECKPOINT → CONTINUE → COMPLETE                                                    │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 6.3 API Summary

| Function | Purpose | When |
|----------|---------|------|
| Session Start Protocol | Initialize session | Every new chat |
| Micro-Checkpoint | Update progress | Every 5-10 ops |
| Standard Checkpoint | Save task state | End of units |
| Full Checkpoint | Complete state save | Session end |
| Zone Assessment | Check pressure | Continuously |
| Recovery Protocol | Restore context | Post-compaction |
| Handoff Protocol | Clean transition | Session end |
| 5-Second Resume | Instant context | Every resume |
