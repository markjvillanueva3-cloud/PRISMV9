# PRISM CTX-STATE HOOKS v1.0
## Append-Only State Enforcement | Session 0.2

---

## HOOK: CTX-STATE-001 - Append Entry

```yaml
id: CTX-STATE-001
category: context_engineering
law: Manus Law 3 (File System as Context)
trigger:
  - decision_made
  - file_created
  - file_modified
  - error_occurred
  - metric_computed
action: |
  1. Create StateEntry with timestamp, type, data
  2. Compute SHA-256 hash of data
  3. Append to STATE_LOG.jsonl (NEVER overwrite)
  4. Increment calls_since_checkpoint
  5. If entry_count > 1000, trigger CTX-STATE-003
enforcement: ALWAYS
integration: state_manager_v2.py._append_entry()
```

---

## HOOK: CTX-STATE-002 - Checkpoint Creation

```yaml
id: CTX-STATE-002
category: context_engineering
law: Manus Law 3 + Law 4 (Recitation)
trigger:
  - calls_since_checkpoint >= 5
  - session_end
  - manual_checkpoint_request
  - context_pressure_warning
action: |
  1. Summarize work since last checkpoint
  2. Count files created/modified
  3. Count decisions made
  4. Create checkpoint entry with quick_resume
  5. Update CURRENT_STATE.json
  6. Reset calls_since_checkpoint = 0
enforcement: ALWAYS (every 5 tool calls minimum)
integration: state_manager_v2.py.create_checkpoint()
```

---

## HOOK: CTX-STATE-003 - Compression Trigger

```yaml
id: CTX-STATE-003
category: context_engineering
law: Manus Law 3 (Restorable Compression)
trigger:
  - entry_count > 1000
  - session_end
  - manual_compress_request
action: |
  1. Keep last 100 entries in active log
  2. Archive older entries to archives/archive_TIMESTAMP.jsonl
  3. Create restore_index mapping session → archive location
  4. Create compression entry with summary
  5. Rewrite active log with compression marker + recent entries
enforcement: AUTOMATIC
integration: state_manager_v2.py.compress()
```

---

## HOOK: CTX-STATE-004 - Restore Validation

```yaml
id: CTX-STATE-004
category: context_engineering
law: Manus Law 3 (Zero Loss)
trigger:
  - restore_request
  - session_recovery
  - search_history
action: |
  1. Check if session in active log
  2. If not, find compression entry with restore_index
  3. Load archive file
  4. Read specified range
  5. Verify hash integrity
  6. Return restored entries
enforcement: ALWAYS on restore
integration: state_manager_v2.py.restore_session()
```

---

## INTEGRATION POINTS

### gsd_startup.py
```python
from state_manager_v2 import StateManager

# At session start
sm = StateManager()
sm.start_session(session_id)
last_cp = sm.get_last_checkpoint()
if last_cp:
    print(f"Resume: {last_cp.data['quick_resume']}")
```

### Tool call wrapper
```python
# After each tool call
sm.calls_since_checkpoint += 1
if sm.calls_since_checkpoint >= 5:
    sm.create_checkpoint(current_task, completed, total)
```

### Session end
```python
sm.end_session(status="COMPLETE", summary="...")
sm.compress()  # Archive old entries
```

---

## METRICS

| Metric | Target | Hook |
|--------|--------|------|
| append_only_compliance | 100% | CTX-STATE-001 |
| checkpoint_interval | ≤5 calls | CTX-STATE-002 |
| compression_ratio | >10:1 | CTX-STATE-003 |
| restore_success_rate | 100% | CTX-STATE-004 |

---

## CLI COMMANDS

```powershell
# Check status
py -3 C:\PRISM\scripts\state_manager_v2.py status

# Create checkpoint
py -3 C:\PRISM\scripts\state_manager_v2.py checkpoint --task "Session 0.2" --completed 5 --total 10 --next "Item 6"

# Compress old entries
py -3 C:\PRISM\scripts\state_manager_v2.py compress

# Search decisions
py -3 C:\PRISM\scripts\state_manager_v2.py search --keyword "algorithm"

# Restore session
py -3 C:\PRISM\scripts\state_manager_v2.py restore --session "SESSION-20260201-001"
```

---

**v1.0 | Session 0.2 | 4 Hooks | Zero Work Loss**
