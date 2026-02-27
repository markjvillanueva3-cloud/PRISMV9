# PRISM PREDICTIVE FRAMEWORK AUTO-TRIGGER v1.0
## Automatic Failure Mode Analysis Before Every Significant Action
### Location: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_PRISM_MASTER\PROTOCOL\05_PREDICTIVE_TRIGGERS.md

---

# ════════════════════════════════════════════════════════════════════════════════
# CORE PRINCIPLE
# ════════════════════════════════════════════════════════════════════════════════

**BEFORE every significant action, Claude MUST automatically run predictive analysis.**

This is not optional. This is built into the execution flow.

---

# ════════════════════════════════════════════════════════════════════════════════
# AUTO-TRIGGER CONDITIONS
# ════════════════════════════════════════════════════════════════════════════════

## Predictive Analysis AUTOMATICALLY Triggers Before:

| Action Type | Trigger Level | Analysis Depth |
|-------------|---------------|----------------|
| File write/overwrite | MANDATORY | Full 3-failure analysis |
| File delete | MANDATORY | Full + rollback verification |
| Large extraction (>100 items) | MANDATORY | Full + resource check |
| State file update | MANDATORY | Backup verification |
| Microsession start | STANDARD | Quick 3-failure check |
| Tool call in orange zone | STANDARD | Context preservation check |
| Any destructive operation | MANDATORY | Full + user awareness |
| New task start | STANDARD | Scope verification |

---

# ════════════════════════════════════════════════════════════════════════════════
# PREDICTIVE ANALYSIS TEMPLATES
# ════════════════════════════════════════════════════════════════════════════════

## Quick Check (Internal, 2 seconds)

For routine operations:
```
Quick predictive: 
1. Could this lose data? → [Y/N + mitigation if Y]
2. Could this fail? → [Y/N + recovery if Y]
3. Is there a backup? → [Y/N]
→ Proceed / Stop
```

## Standard Check (Announce if significant risk)

For microsession starts and medium operations:
```
Predictive check for [action]:
1. Failure mode: [specific] → Mitigation: [specific]
2. Failure mode: [different] → Mitigation: [specific]
3. Failure mode: [edge case] → Mitigation: [specific]
Rollback: [how to undo]
→ Proceeding with mitigations in place
```

## Full Analysis (Announce always)

For destructive or risky operations:
```
═══════════════════════════════════════════════════════════════════════════════
PREDICTIVE ANALYSIS: [Operation]
═══════════════════════════════════════════════════════════════════════════════

FAILURE MODE 1: [Specific description]
├── Probability: [Low/Medium/High]
├── Impact: [Low/Medium/High/Critical]
├── Mitigation: [Specific action]
└── Detection: [How to know if it happened]

FAILURE MODE 2: [Different description]
├── Probability: [assessment]
├── Impact: [assessment]
├── Mitigation: [action]
└── Detection: [method]

FAILURE MODE 3: [Edge case]
├── Probability: [assessment]
├── Impact: [assessment]
├── Mitigation: [action]
└── Detection: [method]

ROLLBACK PLAN:
├── Step 1: [specific]
├── Step 2: [specific]
└── Step 3: [specific]

VERIFICATION:
├── Before: [what to check before proceeding]
├── After: [what to check after completion]
└── Success criteria: [how to confirm success]

DECISION: [Proceed / Stop / Modify approach]
═══════════════════════════════════════════════════════════════════════════════
```

---

# ════════════════════════════════════════════════════════════════════════════════
# COMMON FAILURE MODES BY OPERATION
# ════════════════════════════════════════════════════════════════════════════════

## File Write Operations

| Failure Mode | Mitigation |
|--------------|------------|
| Truncation (file too large) | Use chunked write with append |
| Encoding error | Specify encoding explicitly |
| Permission denied | Check path, use correct tool |
| Overwrite good data | Verify file doesn't exist OR backup first |
| Partial write | Verify file size after write |

## File Read Operations

| Failure Mode | Mitigation |
|--------------|------------|
| File not found | Verify path, check for typos |
| File too large | Use offset/length parameters |
| Encoding error | Handle gracefully, try alternatives |
| Context overflow | Chunk reading, process incrementally |

## Extraction Operations

| Failure Mode | Mitigation |
|--------------|------------|
| Missing dependencies | Map dependencies before extraction |
| Data corruption | Validate output, compare checksums |
| Incomplete extraction | Verify item counts |
| Consumer breakage | Map consumers, verify wiring after |
| Regression | Run regression checker |

## State Operations

| Failure Mode | Mitigation |
|--------------|------------|
| State corruption | Backup before every write |
| Lost checkpoint | Verify write succeeded |
| Invalid JSON | Validate before write |
| Race condition | Single-writer pattern |

---

# ════════════════════════════════════════════════════════════════════════════════
# PREDICTIVE THINKING INTEGRATION
# ════════════════════════════════════════════════════════════════════════════════

## Integration with Other Skills

**prism-mandatory-microsession:**
- Predictive check at microsession start
- Verify scope is achievable
- Check for potential blockers

**prism-session-master:**
- Predictive check before session end
- Verify checkpoint will succeed
- Check for incomplete work

**prism-anti-regression:**
- Predictive check before any replacement
- Verify new ≥ old
- Check for content loss

**prism-sp-execution:**
- Predictive check before each execution step
- Verify dependencies satisfied
- Check for resource availability

---

# ════════════════════════════════════════════════════════════════════════════════
# AUTOMATIC INTEGRATION
# ════════════════════════════════════════════════════════════════════════════════

## How This Works (No User Input Needed)

1. **Claude receives task or starts operation**
2. **Predictive trigger fires automatically** based on operation type
3. **Analysis runs internally** (quick) or **announced** (significant risk)
4. **Mitigations applied** before proceeding
5. **Rollback plan ready** in case of failure
6. **Operation proceeds** with safeguards in place

## Example Flow

```
User: "Extract all P_STEELS materials"

Claude (internal):
├── Trigger: Large extraction → MANDATORY full analysis
├── Failure 1: Missing dependencies → Map dependencies first
├── Failure 2: Data corruption → Validate JSON after extraction
├── Failure 3: Consumer breakage → Map consumers, verify after
├── Rollback: Keep original, don't delete until verified
└── Decision: Proceed with mitigations

Claude (output):
"Extracting P_STEELS materials. Predictive check complete:
- Dependencies mapped
- Validation enabled
- Consumer wiring verified
- Rollback ready

Proceeding with MS-001: Extract materials 0-24..."
```

---

# ════════════════════════════════════════════════════════════════════════════════
# CONTINUOUS PREDICTIVE AWARENESS
# ════════════════════════════════════════════════════════════════════════════════

## During Execution, Continuously Monitor:

1. **Tool call count** → If approaching limit, predict context issues
2. **Response size** → If growing large, predict truncation
3. **Complexity** → If increasing, predict scope creep
4. **Time** → If taking long, predict timeout issues

## Adaptive Response

| Observation | Prediction | Automatic Response |
|-------------|------------|-------------------|
| Tool calls > 10 | May hit limit | Plan checkpoint |
| Response > 3000 words | May truncate | Summarize, checkpoint |
| Scope expanding | May not finish | Decompose further |
| Errors occurring | May cascade | Stop, diagnose, fix |

---

# ════════════════════════════════════════════════════════════════════════════════
# SUCCESS CRITERIA
# ════════════════════════════════════════════════════════════════════════════════

## This Framework is Working When:

✅ No data loss from unexpected failures
✅ No restarts due to preventable issues
✅ Rollback plans available for every risky operation
✅ Mitigations prevent most failure modes
✅ Early detection of issues before they cascade

---

**Predictive thinking is not a suggestion. It's automatic. It's always on. It protects the work.**
