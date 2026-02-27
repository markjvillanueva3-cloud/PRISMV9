---
name: prism-state-manager
description: |
  CURRENT_STATE.json management. Read, update, and recovery protocols.
---

> ⚡ **FOR ROUTINE SESSION START:** Use `prism-quick-start` instead (simpler, fewer tokens)  
> 🔄 **INTEGRATES WITH:** `prism-context-pressure`, `prism-context-dna`

## 🔴 AUTO-CHECKPOINT SYSTEM (NEW v2.0)

### Checkpoint Trigger Rules

Claude MUST checkpoint when ANY of these conditions are met:

| Trigger | Threshold | Action |
|---------|-----------|--------|
| **Tool calls** | 10+ since last save | Yellow → Checkpoint soon |
| **Tool calls** | 15+ since last save | Orange → Checkpoint NOW |
| **Tool calls** | 18+ since last save | Red → STOP, save everything |
| **Response length** | ~2000 words | Yellow zone |
| **Response length** | ~3500 words | Red zone - truncation risk |
| **Exchanges** | 15+ in conversation | Yellow zone |
| **Exchanges** | 25+ in conversation | Red zone |
| **Time** | 10+ min without save | Auto-checkpoint |
| **Complexity** | Multi-step operation | Save before starting |
| **Files created** | After EACH file write | Verify + checkpoint |

### Checkpoint Types

**1. MICRO-CHECKPOINT (Every 5-10 operations)**
```javascript
// Update just currentTask progress - fast, minimal
Desktop Commander:edit_block({
  file_path: "C:\\PRISM REBUILD...\\CURRENT_STATE.json",
  old_string: '"currentStep": 3',
  new_string: '"currentStep": 4'
})
```

**2. STANDARD CHECKPOINT (Yellow zone)**
```javascript
// Update currentTask + checkpoint.lastCompleted
{
  "checkpoint": {
    "timestamp": "2026-01-23T18:30:00Z",
    "lastCompleted": "P-CS-035 (AISI 1040 Hot Rolled)",
    "nextToDo": "P-CS-036",
    "toolCallsSinceCheckpoint": 0  // Reset counter
  }
}
```

**3. FULL CHECKPOINT (Orange/Red zone or session end)**
```javascript
// Full state update + session log + handoff
// See "Session End Protocol" section
```

### Auto-Checkpoint Code Pattern

```javascript
// At the start of each response, Claude should mentally track:
const checkpointStatus = {
  toolCallsSinceSave: 0,  // Increment with each tool call
  wordsGenerated: 0,      // Estimate from response
  exchanges: 0,           // Count from conversation
  lastCheckpointTime: Date.now()
};

// After each tool call:
checkpointStatus.toolCallsSinceSave++;
if (checkpointStatus.toolCallsSinceSave >= 10) {
  // YELLOW ZONE - Complete current unit, then checkpoint
}
if (checkpointStatus.toolCallsSinceSave >= 15) {
  // ORANGE ZONE - Checkpoint NOW before next operation
}
if (checkpointStatus.toolCallsSinceSave >= 18) {
  // RED ZONE - STOP, save everything, graceful handoff
}
```

## 📊 RECOVERY CONFIDENCE SCORING (NEW v2.0)

### What It Is
A score (0-100%) indicating how much context can be recovered from state alone.

### Scoring Rules

| Condition | Score |
|-----------|-------|
| `quickResume` complete | +30% |
| `currentTask` with details | +25% |
| `checkpoint` recent (<10 min) | +20% |
| Target file verified exists | +15% |
| Session log exists | +10% |
| **TOTAL POSSIBLE** | **100%** |

### Add to State File

```json
{
  "recoveryConfidence": {
    "score": 85,
    "breakdown": {
      "quickResume": 30,
      "currentTask": 25,
      "checkpoint": 20,
      "targetFile": 10,
      "sessionLog": 0
    },
    "missingFor100": ["Session log not yet written"],
    "reconstructionHint": "If score <70%, read transcript + last session log"
  }
}
```

### Recovery Actions by Score

| Score | Action |
|-------|--------|
| 90-100% | Resume immediately from state |
| 70-89% | Resume, but verify target file first |
| 50-69% | Read state + latest session log |
| <50% | Read state + session log + transcript |

## State File Key Sections

### quickResume (Read First)
```json
{
  "quickResume": {
    "forNextChat": "CREATE carbon_steels_031_040.js",
    "approach": "Use prism-material-templates, modify per grade",
    "skillsToUse": ["prism-material-templates", "prism-validator"],
    "lastFile": "carbon_steels_021_030.js",
    "lastItem": "P-CS-030"
  }
}
```

### currentTask (Check for In-Progress)
```json
{
  "currentTask": {
    "name": "Carbon Steels Part 4",
    "status": "IN_PROGRESS",
    "currentStep": 3,
    "completedItems": ["P-CS-031", "P-CS-032"],
    "remainingItems": ["P-CS-033", "P-CS-034", "..."],
    "targetFile": "carbon_steels_031_040.js"
  }
}
```

### checkpoint (Frequent Saves)
```json
{
  "checkpoint": {
    "timestamp": "2026-01-23T18:30:00Z",
    "lastCompleted": "P-CS-032",
    "nextToDo": "P-CS-033",
    "toolCallsSinceCheckpoint": 0,
    "resumeInstructions": "Append P-CS-033 to carbon_steels_031_040.js"
  }
}
```

## Recovery After Compaction

```
IF context compacted:
1. Read transcript path from compaction message
2. Read CURRENT_STATE.json
3. Check recoveryConfidence.score:
   - If >70%: Resume from currentTask
   - If <70%: Also read latest session log
4. DO NOT restart - CONTINUE from checkpoint
```

## Quick Reference

### Yellow Zone Actions
```
✓ Complete current atomic unit
✓ Checkpoint (micro or standard)
✓ Continue working
```

### Orange Zone Actions
```
✓ STOP after current item
✓ Full checkpoint NOW
✓ Verify file saved
✓ Resume cautiously
```

### Red Zone Actions
```
✓ STOP IMMEDIATELY
✓ Full checkpoint + handoff
✓ Write session log
✓ Generate context DNA
✓ NO new work until saved
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **2.0** | 2026-01-23 | Auto-checkpoint, delta updates, recovery scoring |
| 1.1 | 2026-01-22 | Integration with prism-quick-start |
| 1.0 | 2026-01-21 | Initial version |
