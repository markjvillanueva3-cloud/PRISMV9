---
name: prism-session-buffer
description: |
  Graceful session limit management with buffer zones. Prevents lost progress by: (1) Recognizing warning signs of approaching limits, (2) Establishing checkpoints during long tasks, (3) Auto-saving state before limits hit, (4) Creating perfect resume points. Use ALWAYS during extended work sessions, material creation, large extractions, or any multi-step task.
---

# PRISM Session Buffer Manager

> 🛡️ **CORE PRINCIPLE:** Never lose progress. Always save BEFORE the limit, not after you hit it.

## 🔴 THE PROBLEM

| Scenario | What Happens | Lost Work |
|----------|--------------|-----------|
| Context fills up | Conversation compacts | Recent work context |
| Response too long | Output truncates mid-stream | Partial file, corrupted data |
| Session ends | No graceful shutdown | Unsaved state, no handoff |
| Tool call limit | Blocked from saving | Everything since last save |

**Solution:** Buffer zones + checkpoints + mandatory saves

---

## 🚨 WARNING SIGNS (Monitor These!)

### 1. Response Length Warnings
```
⚠️ WARNING SIGN: Claude's response is getting very long
   TRIGGER: Response exceeds ~3000 words / ~15KB
   ACTION: Stop current item, save immediately
```

### 2. Tool Call Count
```
⚠️ WARNING SIGN: Many sequential tool calls
   TRIGGER: 15+ tool calls without checkpoint
   ACTION: Pause, update state, create checkpoint
```

### 3. Conversation Length
```
⚠️ WARNING SIGN: Long back-and-forth
   TRIGGER: 20+ exchanges in conversation
   ACTION: Summarize progress, save state, suggest new chat
```

### 4. Complex Multi-Step Tasks
```
⚠️ WARNING SIGN: Task has many sub-steps
   TRIGGER: Task will require 10+ operations
   ACTION: Break into checkpointed phases, save after each
```

### 5. Large Content Generation
```
⚠️ WARNING SIGN: Creating large files/content
   TRIGGER: File will exceed 50KB
   ACTION: Use chunked approach (prism-large-file-writer)
```

---

## 🎯 CHECKPOINT SYSTEM

### What is a Checkpoint?
A checkpoint is a saved state that allows perfect resumption:
- Current progress (what's done)
- Next step (what to do next)
- Files modified (what changed)
- Resume instructions (how to continue)

### Checkpoint Frequency Rules

| Task Type | Checkpoint Every | Example |
|-----------|------------------|---------|
| Material creation | After each material | "P-CS-031 done, next: P-CS-032" |
| File extraction | After each file | "tools.js extracted, next: materials.js" |
| Database work | After 5-10 entries | "Entries 1-10 added, next: 11-20" |
| Code writing | After each function | "calculateSpeed() done, next: calculateForce()" |
| Any task | Every 10-15 minutes | Minimum checkpoint frequency |

---

## 📋 CHECKPOINT PROTOCOL

### Mini-Checkpoint (Every 3-5 Operations)
```javascript
// Mental note - track these internally:
// - Last completed item
// - Current item in progress  
// - Next item to do
// - Any issues encountered
```

### Standard Checkpoint (Every 10-15 Operations)
```javascript
// Update CURRENT_STATE.json with:
{
  "checkpoint": {
    "timestamp": "2026-01-23T03:30:00Z",
    "lastCompleted": "P-CS-034",
    "inProgress": null,
    "nextToDo": "P-CS-035",
    "filesModified": ["carbon_steels_031_040.js"],
    "resumeInstructions": "Continue with P-CS-035, append to existing file"
  }
}
```

### Full Checkpoint (Every Major Phase)
```javascript
// Update CURRENT_STATE.json completely
// Write session log entry
// Verify all files saved
// Create explicit handoff message
```

---

## 🛑 BUFFER ZONE TRIGGERS

### YELLOW ZONE (Caution - Checkpoint Soon)
**Triggers:**
- 10+ tool calls since last checkpoint
- Response reaching ~2000 words
- 15+ conversation exchanges
- Complex task 50% complete

**Action:**
```
1. Finish current atomic unit (one material, one function, one entry)
2. Save/append current work to file
3. Update CURRENT_STATE.json checkpoint
4. Continue if safe, or announce pause point
```

### RED ZONE (Stop Now - Save Immediately)
**Triggers:**
- 18+ tool calls since last save
- Response reaching ~3500 words
- 25+ conversation exchanges
- Any sign of slowdown or issues
- User mentions "one more thing" after long session

**Action:**
```
1. STOP current work at nearest clean break
2. IMMEDIATELY save all pending work
3. IMMEDIATELY update CURRENT_STATE.json
4. Write handoff message with exact resume point
5. Do NOT start new work
```

---

## 📝 MANDATORY SAVE PROTOCOL

### Before ANY of These:
- [ ] Starting a new major task
- [ ] Before risky operations
- [ ] Before large file writes
- [ ] Every 15 minutes of work
- [ ] When user says "last thing" or "one more"
- [ ] When response is getting long
- [ ] Before ending conversation

### Save Sequence (Non-Negotiable):
```
STEP 1: Complete current atomic unit
        (Don't stop mid-material, mid-function, mid-entry)

STEP 2: Write/append work to target file
        Filesystem:write_file or Desktop Commander:write_file

STEP 3: Verify file saved correctly
        Desktop Commander:get_file_info (check size)

STEP 4: Update CURRENT_STATE.json
        - checkpoint.lastCompleted
        - checkpoint.nextToDo
        - checkpoint.timestamp
        - checkpoint.resumeInstructions

STEP 5: Acknowledge save complete
        "✓ Checkpoint saved: [description]"
```

---

## 🔄 GRACEFUL STOP TEMPLATE

When hitting buffer zone, use this format:

```markdown
═══════════════════════════════════════════════════════════════════════════
🛑 BUFFER ZONE REACHED - GRACEFUL STOP
═══════════════════════════════════════════════════════════════════════════

## Progress This Session
✓ Completed: [list what was done]
✓ Files saved: [list files with sizes]
✓ Last item: [exact last completed item]

## Checkpoint Saved
- State file: CURRENT_STATE.json ✓
- Timestamp: [time]
- Resume point: [exact description]

## To Continue (Next Session)
1. Read CURRENT_STATE.json
2. Resume from: [exact item/step]
3. Continue with: [next action]

## Why Stopping
[Reason: response length / tool calls / session length / user request]

═══════════════════════════════════════════════════════════════════════════
```

---

## 🎯 TASK-SPECIFIC BUFFER RULES

### Material Database Creation
```
CHECKPOINT: After every material (not mid-material!)
BUFFER ZONE: After 3-4 materials in single response
SAVE FORMAT: Append completed materials, note next ID
RESUME: "Continue from P-CS-XXX"
```

### Module Extraction
```
CHECKPOINT: After each complete module
BUFFER ZONE: After 2-3 modules or 5000 lines
SAVE FORMAT: Write extracted module, update index
RESUME: "Extract MODULE_NAME next, line XXXXX"
```

### Code Writing
```
CHECKPOINT: After each function/class
BUFFER ZONE: After 3-4 functions or 500 lines
SAVE FORMAT: Write to file, note next function
RESUME: "Implement functionName() next"
```

### Database Entry Work
```
CHECKPOINT: After every 5-10 entries
BUFFER ZONE: After 15-20 entries
SAVE FORMAT: Append entries, note count
RESUME: "Continue from entry #XX"
```

---

## ⚡ QUICK REFERENCE

### Start of Session
```
□ Read CURRENT_STATE.json
□ Check for existing checkpoint
□ Resume from checkpoint if exists
□ Announce session start with plan
```

### During Session
```
□ Track operations mentally (mini-checkpoints)
□ Save checkpoint every 10-15 operations
□ Watch for buffer zone triggers
□ Never start new major work near limits
```

### Approaching Limits
```
□ Finish current atomic unit
□ Save work to file
□ Update CURRENT_STATE.json
□ Write graceful stop message
□ Do NOT start anything new
```

### End of Session
```
□ Complete or checkpoint current work
□ Save all pending changes
□ Update CURRENT_STATE.json fully
□ Write session log
□ Provide explicit handoff
```

---

## 🚫 ANTI-PATTERNS (Never Do These)

### ❌ DON'T: Start new work when tired
```
User: "One more material before we stop"
Claude: "I notice we're at 20+ exchanges. Let me save checkpoint first, 
        THEN we can do one more with a fresh save point."
```

### ❌ DON'T: Skip saves to "save time"
```
// BAD: "I'll save at the end"
// GOOD: Save every checkpoint, every time
```

### ❌ DON'T: Stop mid-unit
```
// BAD: Stop halfway through a material definition
// GOOD: Finish the material, THEN stop
```

### ❌ DON'T: Trust memory over state file
```
// BAD: "I remember we were at P-CS-035"
// GOOD: "CURRENT_STATE.json shows checkpoint at P-CS-034"
```

---

## 📊 BUFFER ZONE MATH

### Estimate Work Capacity Per Session
```
Conservative estimate per response:
- ~3-4 materials (127 params each)
- ~2-3 module extractions
- ~500 lines of new code
- ~15-20 database entries

Plan for 70% of this to allow buffer:
- 2-3 materials per response cycle
- 1-2 module extractions per response
- 300-400 lines of code per response
- 10-15 database entries per response
```

### Response Budget
```
Total response capacity: ~4000 words / ~20KB
Buffer zone starts: ~3000 words / ~15KB (75%)
Hard stop: ~3500 words / ~17KB (87%)
Reserve for handoff: ~500 words / ~3KB (13%)
```

---

## 🔧 INTEGRATION WITH OTHER SKILLS

| Skill | Integration |
|-------|-------------|
| `prism-large-file-writer` | Chunked writes ARE checkpoints |
| `prism-state-manager` | Checkpoint updates go to state |
| `prism-task-continuity` | Buffer stops create continuity |
| `prism-error-recovery` | Failed saves trigger recovery |

---

## ✅ SUCCESS METRICS

A well-buffered session has:
- [ ] Zero lost progress
- [ ] Clean resume points
- [ ] State file always current
- [ ] No truncated files
- [ ] No mid-unit stops
- [ ] Clear handoff message
- [ ] Next session can start immediately

---

## 🎯 MANTRA

```
"Save early, save often, save BEFORE the limit."

"If in doubt, checkpoint now."

"Better to save twice than lose once."

"Finish the unit, then stop—never mid-stream."
```
