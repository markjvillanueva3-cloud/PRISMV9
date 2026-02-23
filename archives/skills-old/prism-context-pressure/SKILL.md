---
name: prism-context-pressure
description: |
  Real-time context limit monitoring with auto-protection. Defines GREEN/YELLOW/
  ORANGE/RED pressure zones based on tool calls and conversation depth.
  Never lose work to context limits with automatic checkpoints.

  MIT Foundation: 6.172 (Performance), 6.033 (Fault Tolerance), 2.852 (Queuing)
---

# PRISM Context Pressure Skill
## Real-Time Context Limit Monitoring & Auto-Protection
**MIT Foundation:** 6.172 (Performance), 6.033 (Fault Tolerance), 2.852 (Queuing)

---

## PURPOSE

**Never lose work to context limits.** This skill provides:
- Real-time pressure monitoring
- Automatic checkpoint triggers
- Graceful degradation protocols
- Emergency save procedures

---

## PRESSURE ZONES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONTEXT PRESSURE ZONES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  GREEN (0-50%)             │
│  Normal operation. Work freely.                                             │
│                                                                             │
│  ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░  YELLOW (50-70%)           │
│  Checkpoint soon. Complete current unit, then save.                         │
│                                                                             │
│  ████████████████████████████████████░░░░░░░░░░░  ORANGE (70-85%)           │
│  Checkpoint NOW. Pause, save immediately.                                   │
│                                                                             │
│  ████████████████████████████████████████████████  RED (85-100%)            │
│  EMERGENCY STOP. Save everything, generate handoff, no new work.            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PRESSURE METRICS

### 1. Tool Call Count (Primary Indicator)
| Metric | Green | Yellow | Orange | Red |
|--------|-------|--------|--------|-----|
| Calls since last save | 0-8 | 9-14 | 15-18 | 19+ |
| Action | None | Plan checkpoint | Save NOW | Emergency stop |

### 2. Conversation Depth
| Metric | Green | Yellow | Orange | Red |
|--------|-------|--------|--------|-----|
| Exchange count | 0-12 | 13-18 | 19-24 | 25+ |
| Action | None | Aware | Checkpoint | Stop |

### 3. Response Length (Current Response)
| Metric | Green | Yellow | Orange | Red |
|--------|-------|--------|--------|-----|
| Word count | 0-1500 | 1500-2500 | 2500-3500 | 3500+ |
| Action | None | Wrap up | Truncate | Split |

### 4. Task Complexity
| Metric | Green | Yellow | Orange | Red |
|--------|-------|--------|--------|-----|
| Pending operations | 0-3 | 4-6 | 7-10 | 10+ |
| Action | None | Serialize | Checkpoint | Stop |

---

## COMBINED PRESSURE SCORE

```javascript
function calculatePressure() {
  const scores = {
    toolCalls: toolCallsSinceSave / 20,      // 20 is red threshold
    exchanges: conversationDepth / 25,        // 25 is red threshold
    responseLength: currentWords / 4000,      // 4000 is red threshold
    complexity: pendingOperations / 12        // 12 is red threshold
  };
  
  // Weighted average (tool calls matter most)
  return (scores.toolCalls * 0.4) + 
         (scores.exchanges * 0.25) + 
         (scores.responseLength * 0.2) + 
         (scores.complexity * 0.15);
}

// Zone determination
if (pressure < 0.50) return 'GREEN';
if (pressure < 0.70) return 'YELLOW';
if (pressure < 0.85) return 'ORANGE';
return 'RED';
```

---

## AUTO-ACTIONS BY ZONE

### 🟢 GREEN ZONE (< 50%)
```
STATUS: Normal operation
ACTIONS: None required
DISPLAY: No indicator needed
```

### 🟡 YELLOW ZONE (50-70%)
```
STATUS: Checkpoint approaching
ACTIONS:
  1. Complete current atomic unit (material, function, file)
  2. Plan checkpoint location
  3. Avoid starting complex multi-step operations

INDICATOR: Add to response end:
"⚡ Context checkpoint recommended after this task."
```

### 🟠 ORANGE ZONE (70-85%)
```
STATUS: Checkpoint required NOW
ACTIONS:
  1. STOP after current statement
  2. Save any in-progress work immediately
  3. Update CURRENT_STATE.json
  4. Update contextDNA
  5. Brief status to user

INDICATOR:
"⚠️ CHECKPOINT: Saving progress before continuing..."
[Execute checkpoint sequence]
"✓ Checkpoint saved. Continuing..."
```

### 🔴 RED ZONE (85-100%)
```
STATUS: Emergency stop
ACTIONS:
  1. DO NOT start new work
  2. Complete minimum necessary save
  3. Write emergency handoff
  4. Update state with recovery instructions
  5. Inform user

INDICATOR:
"🛑 CONTEXT LIMIT - EMERGENCY SAVE"
[Execute emergency protocol]
[Generate handoff]
"To continue: Read CURRENT_STATE.json, resume from [position]"
```

---

## CHECKPOINT SEQUENCE (ORANGE/RED ZONES)

### Quick Checkpoint (Orange Zone)
```javascript
// 1. Save current work
if (currentFile && unsavedContent) {
  Desktop Commander:write_file({
    path: currentFile,
    content: unsavedContent,
    mode: "append"  // or "rewrite" if new file
  });
}

// 2. Update state
state.checkpoint = {
  timestamp: new Date().toISOString(),
  lastCompleted: "P-CS-035",
  nextToDo: "P-CS-036",
  filesModified: ["carbon_steels_031_040.js"],
  pressure: "ORANGE",
  notes: "Checkpoint triggered at 75% pressure"
};

// 3. Update DNA
state.contextDNA.essence.position = "After P-CS-035, checkpoint before P-CS-036";
state.contextDNA.lastUpdated = new Date().toISOString();

// 4. Write state
Filesystem:write_file({
  path: STATE_PATH,
  content: JSON.stringify(state, null, 2)
});

// 5. Confirm
"✓ Checkpoint saved: P-CS-035 complete, ready for P-CS-036"
```

### Emergency Save (Red Zone)
```javascript
// 1. Absolute minimum save
const emergencyState = {
  timestamp: new Date().toISOString(),
  emergency: true,
  lastAction: "Creating P-CS-035",
  position: "Mid-material, approximately line 50",
  unsavedContent: "[Content summary if any]",
  recovery: "Read this file, search for P-CS-035, continue from position"
};

// 2. Write emergency file
Filesystem:write_file({
  path: "C:\\PRISM REBUILD...\\EMERGENCY_RECOVERY.json",
  content: JSON.stringify(emergencyState, null, 2)
});

// 3. Update main state if possible
state.checkpoint = emergencyState;

// 4. Generate handoff
const handoff = `
🛑 EMERGENCY CONTEXT LIMIT REACHED
═══════════════════════════════════════════════════════════════
Last Action: ${emergencyState.lastAction}
Position: ${emergencyState.position}

TO RECOVER:
1. Read CURRENT_STATE.json
2. Check EMERGENCY_RECOVERY.json
3. Read last file being modified
4. Search for last completed item
5. Continue from there
═══════════════════════════════════════════════════════════════
`;
```

---

## PRESSURE TRACKING TEMPLATE

### Add to Response (When Tracking)
```markdown
<!-- PRESSURE CHECK
Tool calls: 12/20
Exchanges: 8/25  
Response: ~1800 words
Zone: YELLOW
Action: Checkpoint after current material
-->
```

### State Tracking Object
```json
{
  "sessionPressure": {
    "toolCallsSinceSave": 12,
    "currentExchange": 8,
    "lastCheckpoint": "2026-01-23T18:00:00Z",
    "currentZone": "YELLOW",
    "nextCheckpointTrigger": "After P-CS-036 or 15 tool calls"
  }
}
```

---

## PRESSURE-AWARE PATTERNS

### Pattern 1: Before Complex Operations
```
BEFORE starting multi-file or multi-step work:
1. Check current pressure
2. If YELLOW+: checkpoint first
3. If GREEN: proceed

Example:
"Before creating 10 materials, let me checkpoint current progress..."
[checkpoint]
"Now proceeding with materials P-CS-031 to P-CS-040"
```

### Pattern 2: Batch Size Adaptation
```
Based on current pressure:
- GREEN: Process 10 items per batch
- YELLOW: Process 5 items per batch
- ORANGE: Process 1 item, then checkpoint
- RED: No new processing
```

### Pattern 3: Response Length Management
```
Based on response length:
- Under 2000 words: Include explanations
- 2000-3000 words: Concise only
- Over 3000 words: Split response, checkpoint between
```

---

## INTEGRATION WITH OTHER SKILLS

| Skill | Integration |
|-------|-------------|
| prism-context-dna | Update DNA at checkpoints |
| prism-state-manager | Trigger state saves |
| prism-session-buffer | Share zone thresholds |
| prism-session-handoff | Generate handoff at RED |
| prism-large-file-writer | Checkpoint between chunks |

---

## QUICK REFERENCE

### Zone Actions
| Zone | Tool Calls | Exchanges | Action |
|------|------------|-----------|--------|
| 🟢 GREEN | 0-8 | 0-12 | Work normally |
| 🟡 YELLOW | 9-14 | 13-18 | Plan checkpoint |
| 🟠 ORANGE | 15-18 | 19-24 | Save NOW |
| 🔴 RED | 19+ | 25+ | STOP, emergency save |

### Checkpoint Triggers
- 10+ tool calls without save
- Starting complex multi-step operation
- Before any destructive operation
- When explicitly requested
- At 70%+ pressure

### Emergency Triggers
- 18+ tool calls without save
- Response approaching 4000 words
- Multiple warning signs combined
- Compaction warning received

---

## END OF SKILL

**Impact:** Zero work loss from context limits
**MIT Foundation:** 6.172 monitoring, 6.033 fault tolerance, 2.852 queue management
