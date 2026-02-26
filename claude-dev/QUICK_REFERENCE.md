# CLAUDE DEV QUICK REFERENCE v2.0
> Print this! Keep it handy!

## SESSION START (Copy/Paste)
```
py C:\PRISM\claude-dev\bootstrap.py
```

## AUTO-ORCHESTRATE ANY TASK
```python
from orchestration.auto_orchestrator import orchestrate
plan = orchestrate("your task here")
print(plan)  # Shows: tools, agents, hooks to use
```

## DEV TOOLS (20 NEW!) - USE THESE

### Before Risky Changes → Checkpoint
```python
dev_checkpoint_create("before-refactor", paths="src,state")
# If things break:
dev_checkpoint_restore(checkpoint_id, dry_run=False)
```

### Run Tests in Background → Continue Working
```python
task = dev_task_spawn("npm test", "run-tests")
# Later:
status = dev_task_status(task["task_id"])
```

### Before Changing Shared Code → Impact Analysis
```python
impact = dev_code_impact("src/tools/myfile.ts")
print(impact["breaking_risk"])  # critical/high/medium/low
```

### Find Code by Meaning → Semantic Search
```python
dev_semantic_index_build(paths="src", force_rebuild=True)
results = dev_semantic_search("cutting force calculation")
```

### Watch for File Changes
```python
watcher = dev_context_watch_start("src,state")
changes = dev_context_changes(watcher["watcher_id"])
```

## CHECK CONTEXT PRESSURE
```python
from context.pressure_monitor import status_bar
print(status_bar())
# 🟢 [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 45.0% (GREEN)
```

## STORE/RETRIEVE MEMORY
```python
from context.memory_manager import store, retrieve
store("my_key", {"data": "value"}, tags=["tag1"])
data = retrieve("my_key")
```

## FIRE COGNITIVE HOOKS
```python
from hooks.cognitive_wiring import fire
fire("BAYES-001", {"domain": "machining"})  # Init priors
fire("RL-002", {"outcome": "success"})       # Record outcome
fire("BAYES-003", {"task": "complete"})      # Extract patterns
```

## FIRE DEV HOOKS
```python
from hooks.dev_hooks import fire_dev_hook
fire_dev_hook("before_file_write")  # Auto-checkpoint
fire_dev_hook("after_code_change", {"file": "src/x.ts"})  # Impact
fire_dev_hook("session_start")       # Start watcher
```

## DEV TOOLS QUICK REF (20 tools)
| Tool | Purpose |
|------|---------|
| dev_task_spawn | Start background process |
| dev_task_status | Check task output |
| dev_task_stream | Get incremental output |
| dev_task_kill | Terminate task |
| dev_task_list | List all tasks |
| dev_checkpoint_create | Snapshot files |
| dev_checkpoint_list | List checkpoints |
| dev_checkpoint_diff | Compare to checkpoint |
| dev_checkpoint_restore | Rollback files |
| dev_checkpoint_delete | Remove checkpoint |
| dev_code_impact | Analyze change risk |
| dev_impact_test_map | Find tests for file |
| dev_impact_dependency_graph | Build import graph |
| dev_semantic_index_build | Index codebase |
| dev_semantic_search | Search by meaning |
| dev_semantic_similar | Find similar code |
| dev_context_watch_start | Watch for changes |
| dev_context_watch_stop | Stop watching |
| dev_context_changes | Get file changes |
| dev_context_snapshot | Current file state |

## SWARM PATTERNS (8)
| Pattern | Use When |
|---------|----------|
| PARALLEL | Tasks are independent |
| PIPELINE | Output feeds next input |
| CONSENSUS | Need agreement (voting) |
| HIERARCHICAL | Need tiered review |
| COMPETITIVE | Want best solution |
| MAP_REDUCE | Large data to split |
| ENSEMBLE | Multiple experts needed |
| COOPERATIVE | Shared discovery |

## PRESSURE ZONES
| Zone | Action |
|------|--------|
| 🟢 GREEN (0-60%) | Normal |
| 🟡 YELLOW (60-75%) | Batch operations |
| 🟠 ORANGE (75-85%) | CHECKPOINT NOW |
| 🔴 RED (85-92%) | HANDOFF URGENT |
| ⚫ CRITICAL (>92%) | STOP EVERYTHING |

## KEY FILES
```
C:\PRISM\claude-dev\               ← Package root
C:\PRISM\mcp-server\GSD_v11.md     ← Full instructions (updated!)
C:\PRISM\mcp-server\src\tools\dev_tools.py ← Dev tools source
C:\PRISM\skills\prism-dev-tools\   ← Dev tools skill
C:\PRISM\state\CURRENT_STATE.json  ← Session state
C:\PRISM\state\ACTION_TRACKER.md   ← Recent actions
C:\PRISM\checkpoints\              ← Checkpoint storage
```

## SAFE WORKFLOW PATTERN
```
1. dev_context_watch_start("src")   ← Start watching
2. dev_checkpoint_create("start")   ← Snapshot
3. dev_code_impact(file)            ← Check risk
4. [Make changes]
5. dev_task_spawn("npm test")       ← Background tests
6. dev_checkpoint_diff(cp_id)       ← Verify changes
7. If fail: dev_checkpoint_restore  ← Rollback
```

## EVERY 5 OPERATIONS
```
prism_todo_update → Anchor attention
dev_context_changes(watcher_id) → Check for external changes
```

## SESSION END
```python
fire("RL-003", {"session": "complete"})   # Update policy
fire("BAYES-003", {"extract": True})      # Extract patterns
dev_checkpoint_create("session-end")       # Final snapshot
dev_context_watch_stop(watcher_id)         # Cleanup
# Then update CURRENT_STATE.json
```
