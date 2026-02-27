---
name: prism-task-continuity
description: |
  Task state preservation across sessions and compactions.
---

> ⚡ **FOR ROUTINE STARTS:** Use `prism-quick-start` (contains anti-restart essentials)

## 🔴 READ SKILLS BEFORE STARTING TASKS

**Optimized v1.3 Protocol:**
1. Read `prism-quick-start` ONLY (100 lines, has everything)
2. Read CURRENT_STATE.json `quickResume` section
3. Check `currentTask` - if exists, RESUME it
4. Execute

**Only read additional skills when needed for complex tasks.**

## The Problem

Claude often:
- Jumps into tasks without reading relevant skills first
- Stops mid-task and restarts from the beginning
- Re-reads files already read
- Pivots mid-task to "figure out how"

**This wastes tokens and causes compaction.**

## The Solution: READ → CHECKPOINT → CONTINUE → COMPLETE

### Before ANY Task:
```
1. READ prism-quick-start (not 5+ skills!)
2. CHECK currentTask in state file
3. RESUME if in-progress, or START new
4. EXECUTE with tools from quick-start
```

### During Task:
```
1. CHECKPOINT - Update currentTask every 3 tool calls
2. CONTINUE - Pick up from checkpoint
3. COMPLETE - Finish before switching
4. VERIFY - Check at END, not mid-stream
```

## Skill Reading Protocol (v1.3)

| Situation | Read |
|-----------|------|
| Session start | `prism-quick-start` ONLY |
| Need module line numbers | `prism-extraction-index` |
| Complex extraction | + `prism-extractor` |
| Error occurred | + `prism-error-recovery` |
| Unsure which tool | + `prism-tool-selector` |

## Mandatory Checkpointing

Update `currentTask` in CURRENT_STATE.json:

| Trigger | Action |
|---------|--------|
| After reading a file | Update `lastCheckpoint` |
| After writing a file | Add to `completedItems` |
| Every 3 tool calls | Update `currentStep` |
| Before risky operation | Full checkpoint |

### currentTask Structure
```json
{
  "currentTask": {
    "name": "Task description",
    "totalSteps": 6,
    "currentStep": 3,
    "status": "IN_PROGRESS",
    "completedItems": ["Item 1", "Item 2"],
    "remainingItems": ["Item 3", "Item 4"]
  }
}
```

## Anti-Restart Checklist

Before ANY restart impulse:
```
□ Did I read prism-quick-start?             → If no, READ NOW but don't restart
□ Have I checkpointed currentTask?           → If no, SAVE FIRST
□ Can I continue from where I stopped?       → Almost always YES
□ Is restarting ACTUALLY necessary?          → Almost always NO
□ Did the user explicitly request restart?   → Required for restart
```

## Restart is ONLY Allowed When:

1. ✅ User explicitly says "start over" or "restart"
2. ✅ Critical error makes previous work INVALID (user confirms)
3. ✅ State file corrupted (user confirms)
4. ❌ NOT because didn't read skills (read now, continue)
5. ❌ NOT because "uncertain" (checkpoint and ask)
6. ❌ NOT because want to "figure out how" (should have read quick-start)

## Summary

```
┌─────────────────────────────────────────────────────────────┐
│              TASK CONTINUITY PROTOCOL v1.3                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   📖 Read prism-quick-start at session start                │
│   📍 Use prism-extraction-index for line numbers            │
│   🚫 NEVER restart mid-task                                 │
│   ✅ CHECKPOINT → CONTINUE → COMPLETE                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
