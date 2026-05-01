# PRISM Dev Tools Skill v1.0
## Background Tasks, Checkpoints, Impact Analysis, Semantic Search, Context Sync

---

## OVERVIEW

20 tools for professional development workflows:

| Category | Tools | Purpose |
|----------|-------|---------|
| Background Tasks (5) | task_spawn/status/stream/kill/list | Run builds/tests without blocking |
| Checkpoints (5) | checkpoint_create/list/diff/restore/delete | Snapshot & rollback capability |
| Impact Analysis (3) | code_impact/test_map/dependency_graph | Know what you're breaking |
| Semantic Search (3) | index_build/search/similar | Find code by meaning |
| Context Sync (4) | watch_start/stop/changes/snapshot | Track file changes |

---

## WHEN TO USE

### ALWAYS checkpoint before:
- Editing multiple files
- Refactoring code
- Updating dependencies
- Any "risky" change

### ALWAYS analyze impact before:
- Changing exported functions
- Modifying shared utilities
- Editing core modules

### ALWAYS use background tasks for:
- Running test suites (>10 seconds)
- Building projects
- Linting large codebases

### ALWAYS use semantic search for:
- Finding code by concept
- Locating similar implementations
- Understanding codebase patterns

---

## QUICK REFERENCE

```python
# Checkpoint before changes
cp = dev_checkpoint_create("before-refactor", paths="src")

# Analyze impact
impact = dev_code_impact("src/myfile.ts")

# Run tests in background
test = dev_task_spawn("npm test", "run-tests")
status = dev_task_status(test["task_id"])

# Search code by meaning
results = dev_semantic_search("cutting force calculation")

# Watch for file changes
watcher = dev_context_watch_start("src,state")
changes = dev_context_changes(watcher["watcher_id"])

# Restore if needed
dev_checkpoint_restore(cp["checkpoint_id"], dry_run=False)
```

---

## INTEGRATION HOOKS

- **DEV-001**: Auto-checkpoint before file edits
- **DEV-002**: Impact analysis after code changes  
- **DEV-003**: Context watch on session start
