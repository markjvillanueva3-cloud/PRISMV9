# CTX-STATE: Append-Only State Persistence Hooks
# Ensures state survives ANY failure through event sourcing

---

## CTX-STATE-001: Event Append on State Change

**Trigger Conditions:**
- Any state modification requested
- Session state changes (start, end, progress)
- Task completion or failure
- Decision recorded

**Actions:**
1. NEVER overwrite state directly
2. Always append event via event_logger.py
3. Let state be rebuilt from events
4. Verify event was logged successfully

**Implementation:**
```python
# WRONG - Direct state modification
state["currentSession"]["status"] = "COMPLETE"
save_state(state)

# RIGHT - Append event
from event_logger import log_state_update
log_state_update("currentSession.status", "COMPLETE")
```

**Why This Matters:**
- Direct writes can fail mid-operation → corrupted state
- Appended events are atomic (single line write)
- State can always be rebuilt from events
- Full audit trail preserved

---

## CTX-STATE-002: Auto-Checkpoint on Thresholds

**Trigger Conditions:**
- 100+ events since last checkpoint
- Before risky operations (rollback, major changes)
- Session end
- Context pressure > YELLOW

**Actions:**
1. Check if auto-checkpoint needed
2. Create checkpoint with appropriate type
3. Update checkpoint index
4. Log checkpoint event

**Implementation:**
```python
from checkpoint_mgr import CheckpointManager, CheckpointType

mgr = CheckpointManager()

# Auto-check
if mgr.should_auto_checkpoint():
    mgr.create(CheckpointType.AUTO, "Automatic checkpoint")

# Before risky operation
mgr.create(CheckpointType.EMERGENCY, "Pre-rollback safety")

# Session end
mgr.create(CheckpointType.SESSION_END, "Session complete")
```

**Checkpoint Types:**
- AUTO: Periodic (every 100 events)
- MANUAL: User-requested
- EMERGENCY: Before risky operations
- SESSION_END: At session completion
- MILESTONE: At major milestones

---

## CTX-STATE-003: State Rebuild on Corruption Detection

**Trigger Conditions:**
- State file fails JSON parse
- Checksum mismatch detected
- Required fields missing
- State inconsistent with event log

**Actions:**
1. Detect corruption via checksums or parse errors
2. Find latest valid checkpoint
3. Rebuild state from checkpoint + events
4. Verify rebuilt state
5. Save and continue

**Implementation:**
```python
from state_version import StateVersionManager

mgr = StateVersionManager()

try:
    state = load_state()
except (json.JSONDecodeError, KeyError) as e:
    print(f"State corruption detected: {e}")
    # Rebuild from checkpoint
    state = mgr.rebuild_from_checkpoint()
    mgr.save()
    print("State rebuilt successfully")
```

**Corruption Indicators:**
- JSON parse failure
- Missing required keys (version, lastUpdated, currentSession)
- Checksum in state_version.json doesn't match
- Event sequence gaps

---

## CTX-STATE-004: Graceful Recovery Chain

**Trigger Conditions:**
- Session start after crash
- State file missing or corrupted
- Explicit recovery request

**Recovery Priority:**
1. Try loading state file directly
2. If fails → rebuild from latest checkpoint + events
3. If no checkpoint → rebuild from all events
4. If no events → initialize fresh state from defaults

**Implementation:**
```python
def recover_state():
    """Recovery chain - tries each method in order."""
    
    # Level 1: Direct load
    try:
        state = load_state()
        if validate_state(state):
            return state
    except Exception:
        pass
    
    # Level 2: Checkpoint + events
    mgr = StateVersionManager()
    try:
        state = mgr.rebuild_from_checkpoint()
        if state:
            mgr.save()
            return state
    except Exception:
        pass
    
    # Level 3: All events
    try:
        state = mgr.rebuild_from_events()
        if state:
            mgr.save()
            return state
    except Exception:
        pass
    
    # Level 4: Fresh start
    return initialize_default_state()
```

**Integration with Session Start:**
```python
# In gsd_startup.py
state = recover_state()
if state.get("_recovered"):
    print("[!] State was recovered from backup")
```

---

## Event Log Structure

Location: `C:\PRISM\state\event_log.jsonl`

Each line is a JSON event:
```json
{"id":"EVT-20260201-120000-0001","type":"STATE_UPDATE","timestamp":"2026-02-01T12:00:00","sequence":1,"data":{"path":"currentSession.status","value":"COMPLETE"},"checksum":"abc123"}
```

**Properties:**
- Append-only (never modify existing lines)
- One event per line (JSONL format)
- Atomic appends (single write operation)
- Chain linked via parentEventId

---

## Checkpoint Structure

Location: `C:\PRISM\state\checkpoints\CP-YYYYMMDD-HHMMSS.json`

```json
{
  "id": "CP-20260201-120000",
  "timestamp": "2026-02-01T12:00:00Z",
  "sequence": 500,
  "eventId": "EVT-20260201-115959-0500",
  "type": "AUTO",
  "state": { ... full state ... },
  "checksum": "abc123def456"
}
```

**Properties:**
- Full state snapshot
- Linked to event sequence
- Verifiable via checksum
- Parent chain for history

---

## MCP Tools

| Tool | Purpose |
|------|---------|
| prism_state_append | Append state update event |
| prism_checkpoint_create | Create state checkpoint |
| prism_checkpoint_restore | Restore from checkpoint |
| prism_state_rebuild | Rebuild state from events |

---

## CLI Reference

```bash
# Event operations
py -3 event_logger.py append STATE_UPDATE --path "x.y" --value "z"
py -3 event_logger.py list --limit 20
py -3 event_logger.py verify

# Checkpoint operations
py -3 checkpoint_mgr.py create --type MANUAL --reason "Before deploy"
py -3 checkpoint_mgr.py list
py -3 checkpoint_mgr.py verify --all

# State operations
py -3 state_version.py rebuild --from-checkpoint --save
py -3 state_version.py version

# Rollback operations
py -3 state_rollback.py preview CP-20260201-120000
py -3 state_rollback.py to CP-20260201-120000 --reason "Bug found"
py -3 state_rollback.py undo
```

---

## Success Criteria

✓ State survives power loss (atomic appends)
✓ State survives corruption (rebuild from events)  
✓ State survives missing file (rebuild from checkpoints)
✓ Full audit trail (every change logged)
✓ Point-in-time recovery (rollback to any checkpoint)
✓ No data loss (append-only, never delete)

---

**Version:** 1.0.0
**Created:** 2026-02-01
**Hook IDs:** CTX-STATE-001, CTX-STATE-002, CTX-STATE-003, CTX-STATE-004
