---
name: prism-session-master
description: |
  UNIFIED session management consolidating 5+ existing skills into one reference.
  Covers: Session lifecycle, context pressure, state persistence, checkpoints,
  recovery, handoff, and quick resume. READ THIS INSTEAD OF individual session skills.
  Consolidates: state-manager, context-pressure, context-dna, session-handoff, quick-start.
  Key principle: Never lose work. Always recoverable. 5-second resume.
  Part of SP.4 Session & Context Management.
---
# PRISM-SESSION-MASTER
## Unified Session Management (Consolidates 5+ Skills)
### Version 1.0 | Session Management | ~30KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill **consolidates** all session management capabilities into ONE authoritative reference:

| Replaces | Original Size | Key Capability |
|----------|--------------|----------------|
| prism-state-manager | 350 lines | State persistence, auto-checkpoints |
| prism-context-pressure | 342 lines | Buffer zones, pressure monitoring |
| prism-context-dna | 337 lines | Compressed fingerprints, recovery |
| prism-session-handoff | 395 lines | Session transitions, 5-sec resume |
| prism-quick-start | 94 lines | Minimal startup protocol |
| **This skill** | **~700 lines** | **ALL of the above, unified** |

## 1.2 The Session Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SESSION MANAGEMENT PHILOSOPHY                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRINCIPLE 1: NEVER LOSE WORK                                                           │
│  ────────────────────────────                                                           │
│  Context limits and compaction are inevitable. Checkpoint early,                        │
│  checkpoint often. Every 8-10 tool calls, save state.                                   │
│                                                                                         │
│  PRINCIPLE 2: ALWAYS RECOVERABLE                                                        │
│  ────────────────────────────────                                                       │
│  Any new chat should achieve 90%+ context recovery in under 60 seconds.                 │
│  Store decisions and patterns, not raw data.                                            │
│                                                                                         │
│  PRINCIPLE 3: 5-SECOND RESUME                                                           │
│  ────────────────────────────────                                                       │
│  A new chat should understand context in 5 seconds via quickResume.                     │
│  Not 5 minutes reading logs. Essence over exhaustiveness.                               │
│                                                                                         │
│  PRINCIPLE 4: GRACEFUL DEGRADATION                                                      │
│  ────────────────────────────────                                                       │
│  When context pressure rises, degrade gracefully: checkpoint, reduce                    │
│  scope, handoff cleanly. Never crash mid-task.                                          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 Critical Paths

```
STATE FILE:    C:\\PRISM\CURRENT_STATE.json
SESSION LOGS:  C:\\PRISM\SESSION_LOGS\
LOCAL ROOT:    C:\\PRISM\
SKILLS:        C:\\PRISM\_SKILLS\
MONOLITH:      C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\
```

## 1.4 Tool Quick Reference

| Task | Tool | Key Params |
|------|------|------------|
| Read C: file | `Filesystem:read_file` | path |
| Write C: file | `Filesystem:write_file` | path, content |
| List C: dir | `Filesystem:list_directory` | path |
| Read LARGE file | `Desktop Commander:read_file` | path, offset, length |
| Search content | `Desktop Commander:start_search` | searchType:"content", pattern |
| Search files | `Desktop Commander:start_search` | searchType:"files", pattern |
| Run script | `Desktop Commander:start_process` | command, timeout_ms |
| Read skill | `view` | path (/mnt/skills/...) |

## 1.5 When to Use This Skill

**Explicit Triggers:**
- Session start, end, checkpoint
- Context pressure warnings
- Recovery after compaction
- Handoff between sessions

**This skill is ALWAYS relevant** - session management applies to all work.

---

# SECTION 2: SESSION LIFECYCLE

## 2.1 Session Start Protocol

### Minimal Start (5 Steps)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  SESSION START CHECKLIST (Execute in order)                                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  □ STEP 1: Read CURRENT_STATE.json                                                      │
│    Tool: Filesystem:read_file("C:\PRISM...\CURRENT_STATE.json")                 │
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

---

# SECTION 3: CONTEXT PRESSURE & BUFFER MANAGEMENT

## 3.1 Pressure Zones

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                        CONTEXT PRESSURE ZONES                                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  🟢 GREEN (0-50%)                      │
│  Tool calls: 0-8 | Exchanges: 0-15 | Response: <2000 words                              │
│  ACTION: Work freely, no restrictions                                                   │
│                                                                                         │
│  ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░  🟡 YELLOW (50-70%)                    │
│  Tool calls: 9-14 | Exchanges: 15-20 | Response: 2000-3000 words                        │
│  ACTION: Complete current unit, then checkpoint                                         │
│                                                                                         │
│  ████████████████████████████████████░░░░░░░░░░░  🟠 ORANGE (70-85%)                    │
│  Tool calls: 15-18 | Exchanges: 20-25 | Response: 3000-3500 words                       │
│  ACTION: STOP - Checkpoint NOW before continuing                                        │
│                                                                                         │
│  ████████████████████████████████████████████████  🔴 RED (85-100%)                     │
│  Tool calls: 19+ | Exchanges: 25+ | Response: >3500 words                               │
│  ACTION: EMERGENCY - Save everything, generate handoff, no new work                     │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Pressure Metrics

### Primary: Tool Call Count

| Metric | Green | Yellow | Orange | Red |
|--------|-------|--------|--------|-----|
| Calls since checkpoint | 0-8 | 9-14 | 15-18 | 19+ |
| Action required | None | Plan save | Save NOW | Emergency |

### Secondary: Conversation Depth

| Metric | Green | Yellow | Orange | Red |
|--------|-------|--------|--------|-----|
| Exchange count | 0-15 | 15-20 | 20-25 | 25+ |
| Compaction risk | Low | Medium | High | Imminent |

### Tertiary: Response Length

| Metric | Green | Yellow | Orange | Red |
|--------|-------|--------|--------|-----|
| Words per response | <2000 | 2000-3000 | 3000-3500 | >3500 |
| Truncation risk | None | Low | Medium | High |

## 3.3 Zone Response Actions

### 🟢 GREEN Zone Protocol
```
- Work normally
- No special actions required
- Optional: Micro-checkpoint every 5 operations
```

### 🟡 YELLOW Zone Protocol
```
1. Acknowledge: "Entering yellow zone"
2. Plan: Identify natural checkpoint (end of section, file, task)
3. Execute: Complete current logical unit
4. Checkpoint: Update CURRENT_STATE.json
5. Continue: Reset counter, proceed
```

### 🟠 ORANGE Zone Protocol
```
1. STOP current work immediately
2. DO NOT start new operations
3. Checkpoint NOW:
   - Update CURRENT_STATE.json fully
   - Write quickResume
   - Log progress
4. Assess: Can session continue?
   - YES → Reset counter, continue carefully
   - NO → Begin handoff
```

### 🔴 RED Zone Protocol
```
1. EMERGENCY STOP - No new operations
2. Save everything immediately:
   - Full CURRENT_STATE.json update
   - quickResume with exact stopping point
   - Any unsaved file content
3. Generate handoff:
   - What was being done
   - Exact stopping point
   - Immediate next action
4. Announce: "Session must end - context limit"
5. DO NOT attempt more work
```

## 3.4 Auto-Protection Triggers

Claude MUST checkpoint when ANY of these occur:

```javascript
const AUTO_CHECKPOINT_TRIGGERS = {
  // Quantity triggers
  toolCalls: 10,           // Calls since last save
  fileWrites: 3,           // Files created/modified
  linesWritten: 200,       // Lines of content produced
  
  // Quality triggers
  complexOperation: true,  // Multi-step, risky action
  beforeDelete: true,      // Any destructive operation
  beforeReplace: true,     // Any replacement operation
  
  // Time triggers
  minutesSinceCheckpoint: 10,  // Wall clock time
  
  // Risk triggers
  uncertainOutcome: true,  // Operation might fail
  externalDependency: true // Depends on external resource
};
```

## 3.5 Buffer Management Strategies

### Strategy 1: Chunked Output

For large content, write in chunks to manage context:

```javascript
// Instead of one massive write:
// ❌ Write 500 lines at once

// Chunk into manageable pieces:
// ✅ Write 80-100 lines
// ✅ Checkpoint
// ✅ Write 80-100 lines
// ✅ Checkpoint
// ✅ Continue...
```

### Strategy 2: Progressive Disclosure

Load skills and data only when needed:

```javascript
// Instead of loading everything at start:
// ❌ Read 10 skills, 5 files, entire state

// Load progressively:
// ✅ Read CURRENT_STATE.json (always)
// ✅ Read quickResume (always)
// ✅ Read specific skill only when entering that phase
// ✅ Read file content only when operating on it
```

### Strategy 3: Context Compression

When pressure rises, compress context:

```javascript
// Normal: Full detail
"Created prism-material-enhancer skill with 5 sections covering
 source hierarchy, physics derivations, hardness conversions,
 enhancement workflow, and batch processing..."

// Compressed: Essence only
"SP.3.5 done (37KB). Next: SP.4"
```

---

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
      "stateFile": "C:\\PRISM\\CURRENT_STATE.json",
      "lastOutputDir": "C:\\PRISM\\_SKILLS\\prism-session-master\\",
      "monolithLocation": "C:\\PRISM\\_BUILD\\PRISM_v8_89_002..."
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

---

# SECTION 5: RECOVERY & HANDOFF

## 5.1 Recovery Scenarios

### Scenario A: Normal Session Start
```
1. Read CURRENT_STATE.json
2. Check quickResume → understand in 5 seconds
3. Verify currentTask.status
   - IN_PROGRESS → Resume from lastCompleted
   - COMPLETE → Start nextToDo
4. Continue working
```

### Scenario B: Post-Compaction Recovery
```
1. Read CURRENT_STATE.json
2. If contextDNA exists:
   - Read essence (what we're doing)
   - Read keyDecisions (don't re-discuss)
   - Read patternsProven (what works)
3. Check recoveryHints for file locations
4. Verify target files exist
5. Resume from documented position
```

### Scenario C: Cross-Device Resume
```
1. Sync from Box (if needed)
2. Read CURRENT_STATE.json
3. Verify file paths still valid
4. Adjust paths if device-specific
5. Resume normally
```

### Scenario D: Emergency Recovery
```
1. Read whatever state is available
2. List recent files in work directories
3. Find most recent modifications
4. Reconstruct context from file contents
5. Ask user to confirm understanding
6. Continue carefully
```

## 5.2 Priority-Ranked Reading List

### Information Tiers (Read in Order)

| Priority | What to Read | When | Time |
|----------|--------------|------|------|
| **1** | `quickResume` in state | Always | 10 sec |
| **2** | `currentTask` in state | If IN_PROGRESS | 20 sec |
| **3** | Last 20 lines of target file | If continuing file | 30 sec |
| **4** | `contextDNA.essence` | If post-compaction | 30 sec |
| **5** | Latest session log | If context unclear | 2 min |
| **6** | Full state history | Only if necessary | 5 min |

### Reading Decision Tree

```
NEW CHAT STARTS
      │
      ▼
Read quickResume (ALWAYS - 10 sec)
      │
      ▼
Is currentTask.status = "IN_PROGRESS"?
      │
     YES ──► Read currentTask + last 20 lines of target file
      │
     NO
      │
      ▼
Is recoveryConfidence > 70%?
      │
     YES ──► Start working immediately
      │
     NO
      │
      ▼
Read contextDNA + latest session log
      │
      ▼
Verify understanding with user before proceeding
```

## 5.3 Handoff Protocol

### Standard Handoff (Session End)

```markdown
═══════════════════════════════════════════════════════════════════════════
SESSION HANDOFF
═══════════════════════════════════════════════════════════════════════════

SESSION ID: SP.4
COMPLETED:  Section 1-5 of prism-session-master skill
PROGRESS:   664 lines written, ~750 target

STATE FILE: Updated with full progress
  - currentTask: SP.4.1, step 5/7
  - quickResume: Updated
  - contextDNA: Current

NEXT SESSION SHOULD:
1. Read CURRENT_STATE.json
2. Continue with Section 6: Quick Reference Card
3. Then Section 7 (if planned) or finalize

WARNINGS: None

═══════════════════════════════════════════════════════════════════════════
```

### Emergency Handoff (Context Limit)

```markdown
═══════════════════════════════════════════════════════════════════════════
⚠️ EMERGENCY HANDOFF - CONTEXT LIMIT REACHED
═══════════════════════════════════════════════════════════════════════════

STOPPED AT: Mid-Section 5, line ~600
REASON:     Context limit (red zone)

LAST CONFIRMED SAVE:
  - File: prism-session-master/SKILL.md
  - Size: 664 lines verified
  - Sections 1-4 complete

IMMEDIATE ACTION FOR NEXT CHAT:
  1. Read CURRENT_STATE.json
  2. Verify SKILL.md exists and size
  3. Append Section 5 remainder
  4. Continue to Section 6

UNSAVED WORK: None (checkpoint just completed)

═══════════════════════════════════════════════════════════════════════════
```

## 5.4 Cross-Session Continuity

### Continuity Guarantees

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           CONTINUITY GUARANTEES                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ✓ No work lost between sessions (checkpoint protocol)                                  │
│  ✓ No repeated discussions (keyDecisions in DNA)                                        │
│  ✓ No repeated mistakes (patternsFailed in DNA)                                         │
│  ✓ 90%+ context recovery (DNA + quickResume)                                            │
│  ✓ 5-second understanding (quickResume format)                                          │
│  ✓ Clear next action (always documented)                                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### What Gets Preserved

| Preserved | How | Where |
|-----------|-----|-------|
| Task progress | currentTask object | CURRENT_STATE.json |
| File changes | Written to disk | Target files |
| Decisions made | keyDecisions array | contextDNA |
| Working patterns | patternsProven | contextDNA |
| Failed patterns | patternsFailed | contextDNA |
| Next action | nextToDo + quickResume | CURRENT_STATE.json |

### What Gets Lost (And That's OK)

| Lost | Why OK |
|------|--------|
| Conversation text | Reconstructable from state + files |
| Tool call history | Results persisted, not process |
| Intermediate thoughts | Decisions captured, not reasoning |
| Exact context window | DNA enables reconstruction |

---

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
│  State:    C:\PRISM...\CURRENT_STATE.json                                       │
│  Logs:     C:\PRISM...\SESSION_LOGS\                                            │
│  Skills:   C:\PRISM..\_SKILLS\                                                  │
│  Monolith: C:\PRISM..\_BUILD\PRISM_v8_89_002...\                                 │
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

---

# DOCUMENT END

**Skill:** prism-session-master
**Version:** 1.0
**Total Sections:** 6
**Part of:** SP.4 Session & Context Management (Consolidation)
**Created:** Session SP.4
**Status:** COMPLETE

**Consolidates:**
- prism-state-manager (350 lines)
- prism-context-pressure (342 lines)
- prism-context-dna (337 lines)
- prism-session-handoff (395 lines)
- prism-quick-start (94 lines)

**Key Features:**
- Session lifecycle (start/during/end protocols)
- 4 pressure zones (GREEN/YELLOW/ORANGE/RED)
- 3 checkpoint types (micro/standard/full)
- Context DNA for post-compaction recovery
- Recovery confidence scoring
- Priority-ranked reading list
- 5-second resume format
- Cross-session continuity guarantees

**Principle:** Never lose work. Always recoverable. 5-second resume.

---
