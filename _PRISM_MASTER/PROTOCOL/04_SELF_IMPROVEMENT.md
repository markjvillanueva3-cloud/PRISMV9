# PRISM SELF-IMPROVEMENT LOOP MECHANISM v1.0
## Automatic Learning Extraction and Pattern Storage
### Location: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_PRISM_MASTER\PROTOCOL\04_SELF_IMPROVEMENT.md

---

# ════════════════════════════════════════════════════════════════════════════════
# PURPOSE
# ════════════════════════════════════════════════════════════════════════════════

This protocol ensures Claude automatically:
1. Extracts learnings after EVERY task completion
2. Stores patterns for future reference
3. Identifies areas for improvement
4. Updates protocols based on experience
5. Improves over time without user intervention

---

# ════════════════════════════════════════════════════════════════════════════════
# WHEN TO TRIGGER
# ════════════════════════════════════════════════════════════════════════════════

## Automatic Triggers (No User Input Needed)

1. **After EVERY microsession completion**
2. **After EVERY task completion**
3. **After EVERY debugging session**
4. **After EVERY error resolution**
5. **Before EVERY session handoff**

---

# ════════════════════════════════════════════════════════════════════════════════
# LEARNING EXTRACTION PROTOCOL
# ════════════════════════════════════════════════════════════════════════════════

## After Each Microsession, Auto-Ask:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SELF-IMPROVEMENT CHECK (Internal - Don't Output Unless Significant)        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 1. What worked well in this microsession?                                   │
│    □ Tool usage pattern that was efficient                                  │
│    □ Decomposition strategy that fit well                                   │
│    □ Checkpoint timing that prevented loss                                  │
│                                                                             │
│ 2. What could have been better?                                             │
│    □ Too many tool calls for the scope                                      │
│    □ Chunk size too large/small                                             │
│    □ Missing information that required re-reading                           │
│                                                                             │
│ 3. Any surprises or edge cases?                                             │
│    □ Unexpected file format                                                 │
│    □ Data inconsistency found                                               │
│    □ Tool behavior different than expected                                  │
│                                                                             │
│ 4. Protocol compliance?                                                     │
│    □ Did I follow microsession framework?                                   │
│    □ Did I checkpoint at yellow zone?                                       │
│    □ Did I apply predictive thinking?                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Learning Storage Format

Store significant learnings in: `_PRISM_MASTER/LEARNING/learnings_YYYY-MM.json`

```json
{
  "learnings": [
    {
      "date": "2026-01-25T20:00:00Z",
      "task": "Material enhancement",
      "microsession": "MS-003",
      "category": "efficiency",
      "pattern": "Processing 20 materials per MS optimal for yellow zone compliance",
      "confidence": 0.9,
      "reusable": true
    }
  ]
}
```

---

# ════════════════════════════════════════════════════════════════════════════════
# AUTOMATIC PROTOCOL IMPROVEMENT
# ════════════════════════════════════════════════════════════════════════════════

## Pattern Detection Rules

After 3+ occurrences of same pattern:
- If positive pattern → Consider adding to default protocols
- If negative pattern → Add to anti-pattern list

## Improvement Categories

1. **Chunk Size Optimization**
   - Track: items_per_ms vs tool_calls_used
   - Optimize: Adjust recommended chunk sizes

2. **Checkpoint Timing**
   - Track: checkpoint_trigger vs context_loss_events
   - Optimize: Adjust zone thresholds if needed

3. **Tool Usage Patterns**
   - Track: tool_combinations that work well
   - Optimize: Create shortcuts for common patterns

4. **Error Prevention**
   - Track: errors and their root causes
   - Optimize: Add defensive checks

---

# ════════════════════════════════════════════════════════════════════════════════
# CONTINUOUS SELF-SCRUTINY
# ════════════════════════════════════════════════════════════════════════════════

## Questions to Ask Continuously (Internal)

During EVERY operation:
1. "Is this the most efficient approach?"
2. "Am I following all protocols?"
3. "Could this fail? How?"
4. "Is there a better tool for this?"
5. "Am I duplicating previous work?"

## After EVERY Response:

1. "Did I provide maximum value?"
2. "Did I miss any edge cases?"
3. "Was my explanation clear?"
4. "Could the user misunderstand anything?"
5. "Did I follow all 6 always-on laws?"

---

# ════════════════════════════════════════════════════════════════════════════════
# ANTI-PATTERN DETECTION
# ════════════════════════════════════════════════════════════════════════════════

## Watch For These Anti-Patterns:

| Anti-Pattern | Detection | Response |
|--------------|-----------|----------|
| Restarting completed work | Reading file already in context | Use existing context |
| Oversized microsessions | >15 tool calls in MS | Split into smaller MS |
| Missing checkpoints | Tool count > 12 without save | Checkpoint immediately |
| Ignoring IN_PROGRESS | Starting fresh when should resume | Read state, resume |
| Bare numbers | Output without uncertainty | Add confidence intervals |
| Skipping predictive | Action without failure analysis | Stop, do 3-failure check |

---

# ════════════════════════════════════════════════════════════════════════════════
# META-IMPROVEMENT
# ════════════════════════════════════════════════════════════════════════════════

## After Every 10 Tasks, Review:

1. **Protocol Effectiveness**
   - Are microsessions the right size?
   - Are checkpoint triggers appropriate?
   - Are zone thresholds correct?

2. **Skill Utilization**
   - Which skills are used most?
   - Which skills are never used?
   - Are there missing skills?

3. **Agent Effectiveness** (if using API)
   - Which agents provide best results?
   - Which combinations work well?
   - Any agents underperforming?

4. **User Satisfaction**
   - Are tasks completing successfully?
   - Are restarts happening?
   - Is work being lost?

---

# ════════════════════════════════════════════════════════════════════════════════
# IMPLEMENTATION
# ════════════════════════════════════════════════════════════════════════════════

## Automatic Actions (No User Input)

1. **Track internally**: Tool calls, chunk sizes, checkpoint timing
2. **Note internally**: What worked, what didn't
3. **Store if significant**: Save to _LEARNING/ when pattern detected
4. **Apply immediately**: Use learnings in current session

## Optional Report (User Can Request)

User can ask: "Show me learnings from recent sessions"
Claude responds with aggregated patterns and improvements.

---

# ════════════════════════════════════════════════════════════════════════════════
# EXAMPLE SELF-IMPROVEMENT CYCLE
# ════════════════════════════════════════════════════════════════════════════════

```
SESSION START:
├── Read CURRENT_STATE.json ✅
├── Check learnings from _LEARNING/ (if exists)
├── Apply any relevant patterns

DURING WORK:
├── Track: tool calls, timing, patterns
├── Apply: continuous self-scrutiny
├── Checkpoint: at yellow zone

MICROSESSION END:
├── Self-check: What worked/didn't
├── If significant: Store learning

SESSION END:
├── Update CURRENT_STATE.json
├── Store session learnings
├── Note improvements for next session
```

---

**This mechanism ensures Claude continuously improves without requiring user intervention.**
**Every task makes the system smarter. Every session adds knowledge.**
