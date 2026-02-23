# PRISM Dev Tools Skill
## 20 Developer Productivity Tools for Background Tasks, Checkpoints, Impact Analysis, Semantic Search, and Context Sync

---

## TRIGGER PATTERNS
Use this skill when:
- "run tests in background", "start build", "spawn task"
- "create checkpoint", "snapshot state", "rollback"
- "what does this affect", "impact analysis", "who uses this"
- "find code that does X", "semantic search", "similar code"
- "watch for changes", "sync context", "file changes"

---

## TOOL REFERENCE

### Background Tasks (5 tools)
```
dev_task_spawn(command, label, working_dir?, timeout_minutes?, env?)
  → Starts process in background, returns task_id
  
dev_task_status(task_id)
  → Get status, output, exit_code

dev_task_stream(task_id, since_line?)
  → Incremental output from running task

dev_task_kill(task_id)
  → Terminate running task

dev_task_list(status_filter?, limit?)
  → List all tasks
```

### Checkpoints (5 tools)
```
dev_checkpoint_create(label, paths?, include_untracked?)
  → Snapshot current state for rollback
  
dev_checkpoint_list(limit?)
  → List available checkpoints

dev_checkpoint_diff(checkpoint_id)
  → Compare current state to checkpoint

dev_checkpoint_restore(checkpoint_id, dry_run?)
  → Revert to checkpoint (dry_run=True to preview)

dev_checkpoint_delete(checkpoint_id)
  → Remove checkpoint to free space
```

### Impact Analysis (3 tools)
```
dev_code_impact(file, symbol?)
  → Analyze impact of changing a file
  → Shows: importers, test coverage, breaking risk

dev_impact_test_map(file, function_name?)
  → Find tests that cover a file or function

dev_impact_dependency_graph(file, depth?, direction?)
  → Build dependency graph (imports/importers/both)
```

### Semantic Search (3 tools)
```
dev_semantic_index_build(paths?, force_rebuild?)
  → Build semantic code index

dev_semantic_search(query, top_k?, file_pattern?)
  → Search code by meaning/concept

dev_semantic_similar(file, start_line, end_line, top_k?)
  → Find code similar to a snippet
```

### Context Sync (4 tools)
```
dev_context_watch_start(paths, events?)
  → Start watching paths for changes

dev_context_watch_stop(watcher_id)
  → Stop file watcher

dev_context_changes(watcher_id, since?)
  → Get detected file changes

dev_context_snapshot(watcher_id)
  → Get current state of watched paths
```

---

## BEST PRACTICES

### 1. Always Create Checkpoint Before Risky Changes
```
dev_checkpoint_create("before-refactor")
# ... make changes ...
# If broken:
dev_checkpoint_restore("checkpoint-id")
```

### 2. Run Tests in Background
```
task_id = dev_task_spawn("pytest tests/", "test-run")
# Continue working...
dev_task_status(task_id)  # Check when ready
```

### 3. Check Impact Before Editing
```
dev_code_impact("critical_module.py")
# Review importers and breaking risk before editing
```

### 4. Use Semantic Search for "How do I..."
```
dev_semantic_search("handle database connection pooling")
# Finds relevant code by meaning, not keywords
```

### 5. Watch Context During Long Sessions
```
dev_context_watch_start("src,tests")
# Later:
dev_context_changes(watcher_id)  # See what changed
```

---

## INTEGRATION WITH AUTO-HOOKS

| Event | Auto-Fire |
|-------|-----------|
| Session start | dev_context_watch_start |
| Every 10 calls | dev_checkpoint_create |
| Before risky edit | dev_code_impact |

---

## FILE LOCATIONS
```
Tools:     C:\PRISM\mcp-server\src\tools\dev_tools.py (1017 lines)
Storage:   C:\PRISM\checkpoints\
Logs:      C:\PRISM\logs\mcp_server.log
```

---

**Version:** 1.0.0
**Tools:** 20
**Category:** Developer Productivity
