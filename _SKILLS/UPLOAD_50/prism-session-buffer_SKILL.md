---
name: prism-session-buffer
description: |
  Graceful session limit management with buffer zones. Prevents lost progress.
---

> 🛡️ **CORE PRINCIPLE:** Never lose progress. Always save BEFORE the limit, not after you hit it.

## 🔴 THE PROBLEM

| Scenario | What Happens | Lost Work |
|----------|--------------|-----------|
| Context fills up | Conversation compacts | Recent work context |
| Response too long | Output truncates mid-stream | Partial file, corrupted data |
| Session ends | No graceful shutdown | Unsaved state, no handoff |
| Tool call limit | Blocked from saving | Everything since last save |

**Solution:** Buffer zones + checkpoints + mandatory saves

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
