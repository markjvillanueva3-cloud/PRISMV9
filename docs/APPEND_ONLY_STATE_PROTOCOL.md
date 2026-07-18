# PRISM APPEND-ONLY STATE PROTOCOL v1.0
## Manus Law 3: Zero Work Loss on Compaction

---

## CORE PRINCIPLE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APPEND-ONLY STATE PATTERN                        │
│  ─────────────────────────────────────────────────────────────────  │
│  NEVER delete state. ONLY append new entries.                       │
│  Compaction = summarize + archive, NOT discard.                     │
│  Any point in history = fully restorable.                           │
└─────────────────────────────────────────────────────────────────────┘
```

**Why:** Context compaction loses work. Append-only ensures:
- Every decision preserved
- Every file change logged
- Every checkpoint recoverable
- Session resume in <30 seconds

---

## STATE ARCHITECTURE

### Traditional (LOSSY)
```
State = { current values only }
Compaction → State lost → Work repeated
```

### Append-Only (LOSSLESS)
```
State = [
  { timestamp: T1, action: "created file X" },
  { timestamp: T2, action: "modified file X", diff: {...} },
  { timestamp: T3, action: "checkpoint", summary: "..." },
  ...
]
Compaction → Entries compressed → Full restore possible
```

---

## DATA STRUCTURES

### 1. State Entry (Atomic Unit)
```json
{
  "id": "entry-uuid",
  "timestamp": "ISO8601",
  "type": "decision|file_change|checkpoint|error|metric",
  "session_id": "SESSION-XXX",
  "data": { ... },
  "hash": "sha256 of data"
}
```

### 2. Entry Types

#### DECISION
```json
{
  "type": "decision",
  "data": {
    "question": "Which algorithm for optimization?",
    "choice": "PSO over GA",
    "reasoning": "Better for continuous parameters",
    "alternatives": ["GA", "Simulated Annealing"],
    "confidence": 0.85
  }
}
```

#### FILE_CHANGE
```json
{
  "type": "file_change",
  "data": {
    "path": "C:\\PRISM\\scripts\\example.py",
    "action": "create|modify|delete",
    "size_before": 0,
    "size_after": 1500,
    "lines_changed": 50,
    "diff_summary": "Added optimization function",
    "hash_after": "sha256..."
  }
}
```

#### CHECKPOINT
```json
{
  "type": "checkpoint",
  "data": {
    "task": "Session 0.2 items 1-5",
    "completed": 5,
    "total": 12,
    "files_created": ["a.py", "b.md"],
    "files_modified": ["c.json"],
    "decisions_made": 3,
    "next_action": "Continue with item 6",
    "quick_resume": "Working on append-only state, 5/12 done"
  }
}
```

#### ERROR
```json
{
  "type": "error",
  "data": {
    "error_type": "FileNotFound",
    "message": "Path X not accessible",
    "context": "Trying to read config",
    "resolution": "Created default config",
    "prevention": "Check path exists before read"
  }
}
```

#### METRIC
```json
{
  "type": "metric",
  "data": {
    "name": "S(x)",
    "value": 0.85,
    "threshold": 0.70,
    "passed": true,
    "components": {"safety_check": 0.90, "validation": 0.80}
  }
}
```

---

## COMPRESSION STRATEGY

### When to Compress
- State log exceeds 1000 entries
- Session ends
- Context pressure detected
- Manual trigger

### How to Compress
```
1. Keep last 100 entries verbatim (hot data)
2. Summarize older entries by session:
   - Session ID
   - Duration
   - Files created/modified
   - Key decisions
   - Final checkpoint
3. Archive full entries to disk
4. Maintain restore index
```

### Compression Entry
```json
{
  "type": "compression",
  "data": {
    "entries_compressed": 500,
    "sessions_covered": ["S1", "S2", "S3"],
    "archive_path": "C:\\PRISM\\state\\archives\\archive_20260201.jsonl",
    "summary": {
      "total_decisions": 45,
      "total_files_changed": 23,
      "total_errors": 2,
      "key_milestones": ["Completed Phase 0.1", "Created 5 scripts"]
    },
    "restore_index": {
      "S1": { "start": 0, "end": 150 },
      "S2": { "start": 151, "end": 350 },
      "S3": { "start": 351, "end": 500 }
    }
  }
}
```

---

## RESTORE PROTOCOL

### Quick Restore (Last Session)
```python
def quick_restore():
    # 1. Load current state log
    entries = load_state_log()
    
    # 2. Find last checkpoint
    checkpoint = find_last_checkpoint(entries)
    
    # 3. Extract quick resume
    return checkpoint.data.quick_resume
```

### Full Restore (Any Session)
```python
def full_restore(session_id):
    # 1. Check if in current log
    if session_in_current_log(session_id):
        return extract_session(session_id)
    
    # 2. Check compression entries
    compression = find_compression_containing(session_id)
    
    # 3. Load from archive
    archive_path = compression.data.archive_path
    index = compression.data.restore_index[session_id]
    
    # 4. Read archived entries
    return read_archive_range(archive_path, index.start, index.end)
```

---

## HOOKS

### CTX-STATE-001: Append Entry
```yaml
id: CTX-STATE-001
trigger: any_state_change
action: |
  1. Create entry with timestamp, type, data
  2. Compute hash
  3. Append to state log (never overwrite)
  4. If log > 1000 entries, trigger compression
enforcement: ALWAYS
```

### CTX-STATE-002: Checkpoint Creation
```yaml
id: CTX-STATE-002
trigger: 
  - every 5 tool calls
  - session_end
  - manual request
action: |
  1. Summarize work since last checkpoint
  2. Create checkpoint entry
  3. Update quick_resume field
  4. Append to state log
enforcement: ALWAYS
```

### CTX-STATE-003: Compression Trigger
```yaml
id: CTX-STATE-003
trigger:
  - log_size > 1000
  - session_end
  - context_pressure_detected
action: |
  1. Identify entries to compress
  2. Create summary
  3. Archive full entries to disk
  4. Create compression entry
  5. Prune compressed entries from active log
enforcement: AUTOMATIC
```

### CTX-STATE-004: Restore Validation
```yaml
id: CTX-STATE-004
trigger: restore_request
action: |
  1. Verify archive integrity (hash check)
  2. Load requested entries
  3. Validate entry chain (no gaps)
  4. Return restored state
enforcement: ALWAYS
```

---

## FILE LOCATIONS

```
C:\PRISM\state\
├── STATE_LOG.jsonl           # Active append-only log
├── CURRENT_STATE.json        # Quick access (derived from log)
├── SESSION_MEMORY.json       # Session-specific cache
├── archives/
│   ├── archive_20260201.jsonl
│   ├── archive_20260131.jsonl
│   └── ...
└── indexes/
    └── restore_index.json    # Maps session → archive location
```

---

## INTEGRATION WITH EXISTING SYSTEM

### gsd_startup.py Integration
```python
# Add to session start
from state_manager_v2 import StateManager

def on_session_start():
    sm = StateManager()
    
    # Restore last state
    last_checkpoint = sm.get_last_checkpoint()
    print(f"Quick Resume: {last_checkpoint.quick_resume}")
    
    # Start new session
    sm.start_session(session_id)
```

### Tool Call Integration
```python
# Wrap tool calls to auto-log
def logged_tool_call(tool_name, params):
    result = execute_tool(tool_name, params)
    
    # Log file changes
    if result.files_changed:
        for f in result.files_changed:
            StateManager().log_file_change(f)
    
    # Checkpoint every 5 calls
    if StateManager().calls_since_checkpoint >= 5:
        StateManager().create_checkpoint()
    
    return result
```

---

## RECOVERY SCENARIOS

### Scenario 1: Context Compaction Mid-Session
```
Before: Working on task, 10 items done
Event: Context compacted
After: 
  1. Transcript reference appears
  2. Read STATE_LOG.jsonl
  3. Find last checkpoint: "10/20 items done, next: item 11"
  4. Continue from item 11
```

### Scenario 2: New Chat Session
```
Before: Previous session ended at checkpoint
Event: Start new chat
After:
  1. Run session_init.py
  2. Load CURRENT_STATE.json
  3. Read quick_resume
  4. Continue from last known state
```

### Scenario 3: Need to Review Old Decision
```
Request: "What did we decide about algorithm X?"
Action:
  1. Search STATE_LOG for decisions containing "algorithm X"
  2. If not in active log, search archives
  3. Return full decision entry with reasoning
```

---

## METRICS

| Metric | Target | Measurement |
|--------|--------|-------------|
| restore_time | < 5s | Time to load last checkpoint |
| archive_integrity | 100% | Hash verification pass rate |
| compression_ratio | > 10:1 | Entries compressed vs summary size |
| zero_loss_rate | 100% | Work recoverable after compaction |

---

## IMPLEMENTATION CHECKLIST

- [ ] StateManager class with append-only log
- [ ] Entry creation for all types
- [ ] Checkpoint auto-creation
- [ ] Compression with archiving
- [ ] Restore from archive
- [ ] Integration with gsd_startup.py
- [ ] CTX-STATE-001/002/003/004 hooks active
- [ ] Metrics tracking

---

**v1.0 | Session 0.2 | Manus Law 3 | Zero Work Loss**
