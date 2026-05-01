# CTX-HANDOFF: Session Handoff Protocol Hooks
# Ensures next session knows EXACTLY what to do

---

## CTX-HANDOFF-001: Context Pressure Monitoring

**Trigger Conditions:**
- Every 5 messages in conversation
- Before loading new skills
- Before starting new major task
- After writing large files

**Actions:**
1. Estimate current token usage
2. Check pressure level
3. Take action based on level

**Pressure Levels:**
| Level | Threshold | Action |
|-------|-----------|--------|
| 🟢 GREEN | 0-60% | Continue normally |
| 🟡 YELLOW | 60-75% | Plan checkpoint |
| 🟠 ORANGE | 75-85% | Create checkpoint NOW |
| 🔴 RED | 85-92% | Immediate handoff prep |
| ⚫ CRITICAL | >92% | Emergency shutdown |

**Implementation:**
```python
from context_pressure import ContextPressureMonitor

monitor = ContextPressureMonitor()

# Estimate tokens (rough)
tokens = monitor.estimate_tokens(
    message_count=20,  # Messages so far
    file_paths=loaded_files  # Files loaded
)

# Check pressure
reading = monitor.check(tokens)
print(f"{reading.level.value}: {reading.recommendation}")

# Should we checkpoint?
should_cp, reason = monitor.should_checkpoint(tokens)
if should_cp:
    # Create checkpoint immediately
    checkpoint_mgr.create(CheckpointType.AUTO, reason)

# Should we handoff?
should_ho, reason = monitor.should_handoff(tokens)
if should_ho:
    # Begin handoff procedure
    graceful_shutdown.execute(ShutdownType.CHECKPOINT)
```

**MCP Tool:**
```
prism_context_pressure tokens_used=100000 action=check
```

---

## CTX-HANDOFF-002: WIP Capture Before Handoff

**Trigger Conditions:**
- Context pressure reaches ORANGE
- User requests session end
- Checkpoint interval reached
- Before any handoff

**Actions:**
1. Identify incomplete work
2. Capture file states
3. Record pending decisions
4. Save progress metrics

**WIP Types:**
| Type | What to Capture |
|------|-----------------|
| FILE | Partial file content, line number, next step |
| TASK | Description, progress (x/y), blocked by |
| DECISION | Options, context, deadline |
| CODE | Code so far, remaining functions, tests needed |

**Implementation:**
```python
from wip_capturer import WIPCapturer

capturer = WIPCapturer()

# Auto-capture from state
items = capturer.auto_capture_from_state()

# Or capture specific items
capturer.capture_task(
    description="Build handoff MCP tools",
    completed=2,
    total=3,
    next_step="Create prism_context_pressure"
)

capturer.capture_file(
    path="C:/PRISM/scripts/core/handoff_mcp.py",
    description="MCP tools for handoff",
    next_step="Add error handling"
)

# Get summary for handoff
summary = capturer.get_handoff_summary()
```

**CLI:**
```bash
py -3 wip_capturer.py auto --json
py -3 wip_capturer.py capture-task "Build MCP tools" --completed 2 --total 3
py -3 wip_capturer.py summary
```

---

## CTX-HANDOFF-003: Graceful Shutdown Execution

**Trigger Conditions:**
- Context pressure CRITICAL
- User requests "end session"
- Session timeout reached
- Checkpoint milestone reached

**Shutdown Checklist:**
1. ☐ Capture all WIP
2. ☐ Create SESSION_END checkpoint
3. ☐ Update state files
4. ☐ Generate handoff document
5. ☐ Mark LKG (optional)

**Implementation:**
```python
from graceful_shutdown import GracefulShutdown, ShutdownType

shutdown = GracefulShutdown()

# Execute shutdown
result = shutdown.execute(
    shutdown_type=ShutdownType.GRACEFUL,
    summary="Completed Session 0.4: Handoff Protocol",
    next_action="Start Session 1.1: KV-Cache Infrastructure",
    warnings=["State files large, consider cleanup"],
    do_not_forget=["Run sync after next session starts"]
)

if result.success:
    print(f"Handoff ready: {result.handoff_id}")
    print(f"Checkpoint: {result.checkpoint_id}")
else:
    print(f"Errors: {result.errors}")
```

**MCP Tool:**
```
prism_session_end shutdown_type=GRACEFUL summary="Session complete" next_action="Continue next task"
```

---

## CTX-HANDOFF-004: Next Session Preparation

**Trigger Conditions:**
- After graceful shutdown
- When generating handoff document
- Manual prep request

**What to Prepare:**
1. Quick resume text (max 500 chars)
2. Immediate action (what to do FIRST)
3. Load order (files and skills)
4. Warnings and do-not-forget
5. Complexity estimate

**Implementation:**
```python
from next_session_prep import NextSessionPreparer

preparer = NextSessionPreparer()

# Generate preparation
prep = preparer.generate()

# Get formatted for Claude
text = preparer.format_for_claude(prep)
print(text)

# Or get specific parts
print(f"Immediate action: {prep.immediate_action}")
print(f"Complexity: {prep.complexity.value}")
print(f"Time estimate: {prep.estimated_time}")

# Save for next session
preparer.save(prep)
```

**MCP Tool:**
```
prism_handoff_prepare format=CLAUDE save=true
```

---

## Quick Reference

### MCP Tools

| Tool | Purpose | Key Params |
|------|---------|------------|
| prism_session_end | Graceful shutdown | shutdown_type, summary, next_action |
| prism_handoff_prepare | Prepare handoff doc | format, save, include_wip |
| prism_context_pressure | Check pressure | tokens_used, action |

### CLI Commands

```bash
# Context pressure
py -3 context_pressure.py check --tokens 100000
py -3 context_pressure.py recommend --level ORANGE
py -3 context_pressure.py buffer --tokens 100000

# WIP capture
py -3 wip_capturer.py auto
py -3 wip_capturer.py list
py -3 wip_capturer.py summary

# Graceful shutdown
py -3 graceful_shutdown.py prepare
py -3 graceful_shutdown.py execute --summary "Done" --next "Continue"
py -3 graceful_shutdown.py checklist

# Next session prep
py -3 next_session_prep.py generate --claude
py -3 next_session_prep.py action
py -3 next_session_prep.py complexity
```

### Handoff Document Structure

```json
{
  "meta": {
    "schema": "prism-handoff-v1",
    "handoffType": "GRACEFUL",
    "timestamp": "2026-02-01T22:00:00Z"
  },
  "currentState": {
    "summary": "What was done",
    "roadmapPosition": {...}
  },
  "workInProgress": {
    "activeTask": {...},
    "pendingTasks": [...]
  },
  "nextSession": {
    "immediateAction": "EXACT first thing to do",
    "context": "Everything needed",
    "warnings": [...],
    "doNotForget": [...]
  }
}
```

### Session End Protocol

```
1. Check pressure level
   py -3 context_pressure.py check --tokens N

2. If ORANGE+, capture WIP
   py -3 wip_capturer.py auto

3. Execute graceful shutdown
   py -3 graceful_shutdown.py execute \
     --summary "Session complete" \
     --next "Continue with X"

4. Verify handoff created
   check C:\PRISM\state\current_handoff.json

5. End conversation
```

---

## Success Criteria

✓ Next session knows EXACTLY what to do
✓ No context lost at handoff
✓ WIP captured and recoverable
✓ Clear immediate action defined
✓ Load order optimized
✓ Warnings communicated
✓ Critical items preserved

---

**Version:** 1.0.0
**Created:** 2026-02-01
**Hook IDs:** CTX-HANDOFF-001, CTX-HANDOFF-002, CTX-HANDOFF-003, CTX-HANDOFF-004
