# PRISM CONTEXT ENGINEERING HOOKS v1.0
## Complete Reference for Manus 6 Laws Implementation
## Phase 0 Completion Document

---

## OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTEXT ENGINEERING HOOKS                        │
│  ─────────────────────────────────────────────────────────────────  │
│  18 Hooks implementing Manus 6 Laws for Context Optimization        │
│  Total hooks: 206 (188 + 18 CTX)                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## HOOK SUMMARY BY LAW

| Law | Hooks | Script | Purpose |
|-----|-------|--------|---------|
| Law 1: KV-Cache | CTX-CACHE-001/002/003 | cache_checker.py, prism_json_sort.py | 10x token efficiency |
| Law 2: Tool Mask | CTX-TOOL-001/002/003 | tool_masking.py | Stable context |
| Law 3: File System | CTX-STATE-001/002/003/004 | state_manager_v2.py | Zero work loss |
| Law 4: Recitation | CTX-FOCUS-001/002/003 | todo_manager.py | No goal drift |
| Law 5: Keep Errors | CTX-ERR-001/002/003 | error_preservation.py | Learn from mistakes |
| Law 6: Variation | CTX-VAR-001/002/003 | pattern_variation.py | Prevent mimicry |

---

## LAW 1: KV-CACHE STABILITY

### CTX-CACHE-001: Validate Prefix Stability
```yaml
trigger: session_start, prompt_load
action: Compare prefix hash vs previous session
metric: cache_hit_potential
enforcement: WARN if prefix changed
script: cache_checker.py
```

### CTX-CACHE-002: Block Dynamic in Prefix
```yaml
trigger: prompt_construction
action: Scan first 50 lines for forbidden patterns
enforcement: HARD_BLOCK if dynamic content detected
patterns: timestamps, session IDs, counts, versions
script: cache_checker.py --audit
```

### CTX-CACHE-003: Force Sorted JSON
```yaml
trigger: json_serialize, json_write
action: Intercept and force sort_keys=True
rationale: {"b":1,"a":2} ≠ {"a":2,"b":1} breaks cache
script: prism_json_sort.py
```

---

## LAW 2: MASK DON'T REMOVE

### CTX-TOOL-001: All Tools Present
```yaml
trigger: context_build
action: Include all 200+ tools in context
enforcement: ALWAYS (never dynamically load/unload)
script: tool_masking.py
```

### CTX-TOOL-002: State Controls Availability
```yaml
trigger: tool_call
action: Check tool availability via state machine
states: INITIALIZATION, BRAINSTORM, PLANNING, EXECUTION, VALIDATION, ERROR_RECOVERY
enforcement: BLOCK if tool masked in current state
script: tool_masking.py --check --tool X
```

### CTX-TOOL-003: Prevent Dynamic Loading
```yaml
trigger: load_tool, unload_tool, add_tool, remove_tool
action: Block dynamic tool changes
enforcement: HARD_BLOCK
message: "Use state transitions to change availability"
```

---

## LAW 3: FILE SYSTEM AS CONTEXT

### CTX-STATE-001: Append Entry
```yaml
trigger: decision_made, file_changed, error_occurred
action: Create entry, compute hash, append to STATE_LOG.jsonl
enforcement: ALWAYS (never overwrite)
auto_compress: If log > 1000 entries
script: state_manager_v2.py
```

### CTX-STATE-002: Checkpoint Creation
```yaml
trigger: calls_since_checkpoint >= 5, session_end
action: Summarize work, create checkpoint, update quick_resume
enforcement: ALWAYS
output: CURRENT_STATE.json updated
script: state_manager_v2.py checkpoint
```

### CTX-STATE-003: Compression Trigger
```yaml
trigger: entry_count > 1000, session_end
action: Archive old entries, create restore index
keep_recent: 100 entries
archive_to: C:\PRISM\state\archives\
script: state_manager_v2.py compress
```

### CTX-STATE-004: Restore Validation
```yaml
trigger: restore_request
action: Verify hash, load from archive, validate chain
enforcement: ALWAYS on restore
script: state_manager_v2.py restore --session X
```

---

## LAW 4: ATTENTION VIA RECITATION

### CTX-FOCUS-001: Update todo.md
```yaml
trigger: checkpoint_created
action: Rewrite todo.md with current progress
content: Task, progress bar, steps, quality gates, next action
script: todo_manager.py
```

### CTX-FOCUS-002: Inject Goals at End
```yaml
trigger: context_build
action: Add attention anchor at END of context
position: Last 200 tokens
content: Task, progress, focus, next action
script: todo_manager.py anchor
```

### CTX-FOCUS-003: Track Goal Drift
```yaml
trigger: every 10 actions
action: Compute drift score from goal_history.jsonl
threshold: < 10% drift
enforcement: WARN if threshold exceeded
script: todo_manager.py drift
```

---

## LAW 5: KEEP WRONG STUFF

### CTX-ERR-001: Preserve Error
```yaml
trigger: error_occurred
action: Create ErrorEntry, detect pattern, append to ERROR_LOG.jsonl
preservation: NEVER delete errors
script: error_preservation.py log
```

### CTX-ERR-002: Log with Recovery Path
```yaml
trigger: error_resolved
action: Add resolution and prevention rule to error
learning: Extract pattern for future avoidance
script: error_preservation.py (add_resolution)
```

### CTX-ERR-003: Feed to BAYES-003
```yaml
trigger: error_pattern_detected
action: Update Bayesian beliefs about error resolution
integration: BAYES-003 belief update
output: prevention_rules updated
script: error_preservation.py learning
```

---

## LAW 6: DON'T GET FEW-SHOTTED

### CTX-VAR-001: Vary Templates
```yaml
trigger: output_generation
action: Select from 3+ template variants
avoid: Recently used templates (last 3)
templates: task_description, checkpoint_message, status_update
script: pattern_variation.py vary
```

### CTX-VAR-002: Randomize Ordering
```yaml
trigger: list_generation, json_serialization
action: Shuffle non-critical ordering
preserve: First/last elements if critical
script: pattern_variation.py
```

### CTX-VAR-003: Detect Mimicry
```yaml
trigger: every 10 actions
action: Compute diversity index, check for patterns
threshold: diversity_index >= 0.7
detection: periodic patterns, excessive repeats
enforcement: WARN if mimicry detected
script: pattern_variation.py check
```

---

## INTEGRATION POINTS

### Session Start (session_init.py)
```python
# 1. CTX-CACHE-001: Check prefix stability
# 2. CTX-STATE-002: Load last checkpoint
# 3. CTX-FOCUS-002: Prepare attention anchor
# 4. CTX-TOOL-002: Set initial state (INITIALIZATION)
```

### During Execution
```python
# Every tool call:
#   - CTX-TOOL-002: Check availability
#   - CTX-STATE-001: Log action
#   - CTX-VAR-001: Vary output

# Every 5 calls:
#   - CTX-STATE-002: Create checkpoint
#   - CTX-FOCUS-001: Update todo.md

# On error:
#   - CTX-ERR-001: Preserve error
#   - CTX-ERR-002: Add resolution
#   - CTX-ERR-003: Update beliefs
```

### Session End
```python
# 1. CTX-STATE-002: Final checkpoint
# 2. CTX-STATE-003: Compress if needed
# 3. CTX-FOCUS-001: Final todo.md update
# 4. CTX-VAR-003: Check diversity
```

---

## METRICS DASHBOARD

| Metric | Target | Hook | Script |
|--------|--------|------|--------|
| cache_hit_rate | ≥ 80% | CTX-CACHE-001 | cache_checker.py |
| prefix_stability | 100% | CTX-CACHE-002 | cache_checker.py |
| json_sort_compliance | 100% | CTX-CACHE-003 | prism_json_sort.py |
| tool_context_stability | 100% | CTX-TOOL-001 | tool_masking.py |
| checkpoint_interval | ≤ 5 calls | CTX-STATE-002 | state_manager_v2.py |
| restore_success_rate | 100% | CTX-STATE-004 | state_manager_v2.py |
| goal_adherence | ≥ 90% | CTX-FOCUS-003 | todo_manager.py |
| error_repeat_rate | < 10% | CTX-ERR-003 | error_preservation.py |
| action_diversity | ≥ 0.7 | CTX-VAR-003 | pattern_variation.py |

---

## CLI QUICK REFERENCE

```powershell
# Cache Stability
py -3 C:\PRISM\scripts\cache_checker.py --report
py -3 C:\PRISM\scripts\prism_json_sort.py C:\PRISM\state --all

# Tool Masking
py -3 C:\PRISM\scripts\tool_masking.py status
py -3 C:\PRISM\scripts\tool_masking.py --check --tool prism_file_write

# State Management
py -3 C:\PRISM\scripts\state_manager_v2.py status
py -3 C:\PRISM\scripts\state_manager_v2.py checkpoint --task "X" --completed 5 --total 10

# todo.md
py -3 C:\PRISM\scripts\todo_manager.py status
py -3 C:\PRISM\scripts\todo_manager.py anchor

# Error Preservation
py -3 C:\PRISM\scripts\error_preservation.py status
py -3 C:\PRISM\scripts\error_preservation.py recent

# Pattern Variation
py -3 C:\PRISM\scripts\pattern_variation.py status
py -3 C:\PRISM\scripts\pattern_variation.py demo
```

---

## PHASE 0 COMPLETION SUMMARY

| Session | Name | Deliverables | Lines |
|---------|------|--------------|-------|
| 0.0 | Resource Activation | peak_activator.py, PEAK_RESOURCES.json | 311 |
| 0.1 | KV-Cache Prefix | cache_checker.py, prism_json_sort.py, session_init.py | 578 |
| 0.2 | Append-Only State | state_manager_v2.py, APPEND_ONLY_STATE_PROTOCOL.md | 871 |
| 0.3 | Tool Masking | tool_masking.py | 264 |
| 0.4 | Error Preservation | error_preservation.py | 371 |
| 0.5 | todo.md Recitation | todo_manager.py | 316 |
| 0.6 | Compression | (in state_manager_v2.py) | - |
| 0.7 | Pattern Variation | pattern_variation.py | 347 |

**Total: 3,058 lines of production code**
**Total hooks: 206 (188 existing + 18 CTX)**

---

**v1.0 | Phase 0 Complete | Manus 6 Laws Implemented | 2026-02-01**
