# PRISM TODO.MD PROTOCOL v1.0
## Manus Law 4: Attention Anchors | No Goal Drift

---

## CORE PRINCIPLE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TODO.MD AS ATTENTION ANCHOR                      │
│  ─────────────────────────────────────────────────────────────────  │
│  ALWAYS place current focus at END of context.                      │
│  Claude's attention is STRONGEST at context boundaries.             │
│  End-of-context = "What I should be doing right now"                │
└─────────────────────────────────────────────────────────────────────┘
```

**Why:** Goal drift is real. Without explicit anchoring:
- Session starts with clear task
- Middle of session: subtle drift occurs
- End of session: working on wrong thing
- Post-compaction: original goal forgotten

**Solution:** Structured todo.md recitation protocol

---

## TODO.MD STRUCTURE

### Minimal Required Structure
```markdown
# CURRENT TASK
[Single sentence: What I'm doing RIGHT NOW]

# PROGRESS
- [x] Item completed
- [x] Item completed  
- [ ] Item in progress ← CURRENT
- [ ] Item pending
- [ ] Item pending

# NEXT ACTION
[Exact next step when current item completes]

# SESSION CONTEXT
- Session: [ID]
- Phase: [Name]
- Started: [Time]
- Checkpoint: [N] of [M]
```

### Full Structure (For Complex Tasks)
```markdown
# CURRENT TASK
Implementing Session 0.3 todo.md Protocol

# WHY THIS MATTERS
Manus Law 4 prevents goal drift. Attention anchors keep focus.

# PROGRESS
- [x] Created TODO_MD_PROTOCOL.md
- [x] Defined structure
- [ ] Create todo_manager.py ← CURRENT
- [ ] Define CTX-TODO hooks
- [ ] Integrate with session_init.py
- [ ] Test and validate

# BLOCKED BY
[Nothing currently blocking]

# DECISIONS MADE
1. Use markdown format (universal, readable)
2. Place at END of context (attention boundary)
3. Auto-recite on every response

# NEXT ACTION
Create todo_manager.py with add/complete/recite functions

# SESSION CONTEXT
- Session: SESSION-0.3
- Phase: Phase 0 Context Engineering
- Law: Manus Law 4
- Progress: 2/6 items (33%)
```

---

## ATTENTION MECHANISM

### Why End-of-Context Matters

```
CONTEXT WINDOW:
┌────────────────────────────────────────────────────────────────────┐
│ [System Prompt - STABLE PREFIX]                                    │
│                                                                    │
│ [Skills loaded]                                                    │
│                                                                    │
│ [Previous conversation turns]                                      │
│                                                                    │
│ [State information]                                                │
│                                                                    │
│ [Current message from user]                                        │
│                                                                    │
│ ════════════════════════════════════════════════════════════════   │
│ [TODO.MD - ATTENTION ANCHOR] ← STRONGEST ATTENTION HERE            │
└────────────────────────────────────────────────────────────────────┘
```

Claude's attention pattern:
- **Beginning**: System identity, rules (stable, referenced)
- **Middle**: Conversation history (degrading attention)
- **End**: Current focus (PEAK ATTENTION)

### Recitation Protocol

**On every substantive response:**
```
1. Before acting: Read current todo.md
2. Verify: "Am I working on the CURRENT item?"
3. If drift detected: Correct course
4. After acting: Update progress
5. End response: Recite next action
```

---

## IMPLEMENTATION

### File Location
```
C:\PRISM\state\TODO.md          # Primary (read/write)
C:\PRISM\state\TODO_HISTORY\    # Archived todos by session
```

### todo_manager.py Functions

```python
class TodoManager:
    # Core Operations
    def load() -> Todo                    # Load current todo
    def save(todo: Todo)                  # Save todo
    def recite() -> str                   # Get attention anchor text
    
    # Item Management  
    def add_item(text: str)               # Add pending item
    def complete_item(index: int)         # Mark item complete
    def set_current(index: int)           # Set current focus
    def skip_item(index: int, reason: str) # Skip with reason
    
    # Session Management
    def start_session(task: str, items: list)  # Initialize todo
    def end_session()                          # Archive and clear
    def checkpoint()                           # Save progress snapshot
    
    # Context Injection
    def get_attention_anchor() -> str     # Full anchor block
    def get_minimal_anchor() -> str       # Just current + next
```

### Attention Anchor Format

```markdown
═══════════════════════════════════════════════════════════════════
ATTENTION ANCHOR (Read this. This is what you're doing.)
═══════════════════════════════════════════════════════════════════

CURRENT TASK: [Task name]
CURRENT ITEM: [Specific item in progress]
PROGRESS: [N/M] items complete
NEXT ACTION: [What to do when current completes]

═══════════════════════════════════════════════════════════════════
```

---

## HOOKS

### CTX-TODO-001: Load on Session Start
```yaml
id: CTX-TODO-001
trigger: session_start
action: |
  1. Check for existing TODO.md
  2. If exists: Load and display current task
  3. If not: Prompt for task definition
  4. Inject attention anchor into context
enforcement: ALWAYS
```

### CTX-TODO-002: Recite on Response
```yaml
id: CTX-TODO-002
trigger: before_response
action: |
  1. Load current todo
  2. Check if response aligns with CURRENT item
  3. If drift detected: Log warning, suggest correction
  4. Append minimal anchor to response
enforcement: ALWAYS (for substantive responses)
exception: Simple Q&A, clarifications
```

### CTX-TODO-003: Update on Progress
```yaml
id: CTX-TODO-003
trigger: 
  - task_completed
  - item_completed
  - manual_update
action: |
  1. Update progress in TODO.md
  2. Advance CURRENT pointer if item complete
  3. Log to STATE_LOG (CTX-STATE-001)
  4. Refresh attention anchor
enforcement: ALWAYS
```

### CTX-TODO-004: Archive on Session End
```yaml
id: CTX-TODO-004
trigger: session_end
action: |
  1. Save final TODO.md state
  2. Archive to TODO_HISTORY/{session_id}.md
  3. Clear or reset TODO.md
  4. Log completion status
enforcement: ALWAYS
```

---

## INTEGRATION POINTS

### With session_init.py
```python
def on_session_start():
    # ... existing initialization ...
    
    # CTX-TODO-001: Load or create todo
    tm = TodoManager()
    if tm.exists():
        anchor = tm.get_attention_anchor()
        print(anchor)
    else:
        print("[TODO] No active task. Define task with todo_manager.py start")
```

### With State Manager
```python
# When todo changes, log to append-only state
def on_todo_change(change_type, details):
    sm = StateManager()
    sm.log_decision(
        question=f"Todo {change_type}",
        choice=details,
        reasoning="Progress tracking"
    )
```

### With Response Generation
```python
# Pseudo-code for response flow
def generate_response(user_message):
    # 1. Load context
    todo = TodoManager().load()
    
    # 2. Check alignment
    if not aligns_with_todo(planned_response, todo.current):
        log_drift_warning()
    
    # 3. Generate response
    response = ...
    
    # 4. Append anchor
    response += "\n\n" + todo.get_minimal_anchor()
    
    return response
```

---

## DRIFT DETECTION

### Signs of Goal Drift
1. Response doesn't mention current task
2. Working on item not marked CURRENT
3. Adding new items without completing current
4. Skipping items without explicit decision
5. Session focus changed without todo update

### Drift Recovery
```
1. STOP current work
2. RECITE todo.md fully
3. IDENTIFY drift point
4. DECIDE: 
   - Return to original task, OR
   - Update todo to reflect new direction
5. LOG decision to state
6. CONTINUE with clear focus
```

---

## CLI COMMANDS

```bash
# Start new task
py -3 todo_manager.py start "Task Name" --items "item1" "item2" "item3"

# Show current todo
py -3 todo_manager.py show

# Get attention anchor
py -3 todo_manager.py anchor

# Complete current item
py -3 todo_manager.py complete

# Skip item with reason
py -3 todo_manager.py skip --reason "Blocked by X"

# Add item
py -3 todo_manager.py add "New item"

# End session
py -3 todo_manager.py end
```

---

## EXAMPLE SESSION FLOW

```
=== SESSION START ===

$ py -3 session_init.py
...
$ py -3 todo_manager.py start "Implement Cache System" --items \
    "Design cache structure" \
    "Implement cache store" \
    "Add invalidation logic" \
    "Write tests" \
    "Document API"

═══════════════════════════════════════════════════════════════════
ATTENTION ANCHOR
═══════════════════════════════════════════════════════════════════
CURRENT TASK: Implement Cache System
CURRENT ITEM: Design cache structure
PROGRESS: 0/5 items complete
NEXT ACTION: Complete cache structure design
═══════════════════════════════════════════════════════════════════

=== DURING SESSION ===

[User works on cache design]

$ py -3 todo_manager.py complete
[✓] Completed: Design cache structure
[→] Now working on: Implement cache store

═══════════════════════════════════════════════════════════════════
ATTENTION ANCHOR
═══════════════════════════════════════════════════════════════════
CURRENT TASK: Implement Cache System
CURRENT ITEM: Implement cache store
PROGRESS: 1/5 items complete
NEXT ACTION: Complete cache store implementation
═══════════════════════════════════════════════════════════════════

=== CONTEXT COMPACTION ===

[Context compacted, transcript reference added]

RECOVERY:
1. Read TODO.md → "Implement Cache System, 1/5 done, working on cache store"
2. Read STATE_LOG → Recent file changes, decisions
3. Resume from exact point

=== SESSION END ===

$ py -3 todo_manager.py end
[ARCHIVE] Saved to TODO_HISTORY/SESSION-20260201-013500.md
[CLEAR] TODO.md reset for next session
```

---

## METRICS

| Metric | Target | Measurement |
|--------|--------|-------------|
| drift_rate | < 5% | Responses not aligned with todo |
| recovery_time | < 30s | Time to resume after compaction |
| anchor_presence | 100% | Substantive responses with anchor |
| completion_tracking | 100% | Items logged when completed |

---

## TROUBLESHOOTING

### Todo Not Loading
```
Symptom: session_init.py doesn't show todo
Fix:
  1. Check C:\PRISM\state\TODO.md exists
  2. Verify JSON/markdown format valid
  3. Run: py -3 todo_manager.py show --debug
```

### Drift Detected But No Warning
```
Symptom: Working on wrong item, no alert
Fix:
  1. Verify CTX-TODO-002 hook active
  2. Check drift detection threshold
  3. Manually recite: py -3 todo_manager.py anchor
```

### Anchor Not Appearing
```
Symptom: Responses missing anchor block
Fix:
  1. Verify TodoManager integration
  2. Check response generation flow
  3. Manually append: todo.get_minimal_anchor()
```

---

**v1.0 | Session 0.3 | Manus Law 4 | Zero Goal Drift**
