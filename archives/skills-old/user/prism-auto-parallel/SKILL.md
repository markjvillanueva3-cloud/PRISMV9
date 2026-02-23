# prism-auto-parallel

## Description
Automatically spawns parallel Claude API instances when:
1. **15-minute timeout**: Task exceeds 15 minutes → parallel decomposition assist
2. **Batch detection**: 3+ similar items → parallel processing
3. **Post-build validation**: Automatic quality assessment after builds
4. **Post-build updates**: Auto-updates skills, GSD, memories, state after any build

## Key File Locations
```
API Key:     C:/PRISM/config/.anthropic_key (or ANTHROPIC_API_KEY env var)
Executor:    C:/PRISM/mcp-server/src/tools/intelligence/parallel_claude.py
Auto-System: C:/PRISM/mcp-server/src/tools/intelligence/auto_parallel.py
Post-Build:  C:/PRISM/mcp-server/src/tools/intelligence/post_build_updater.py
Logs:        C:/PRISM/logs/auto_parallel.log, C:/PRISM/logs/post_build.log
```

## Triggers
- Session starts → Task tracking begins (15-min monitor)
- Task > 15 minutes → Parallel API fires automatically
- 3+ similar items → Batch parallel processing
- Build completes → Validation + documentation updates
- Tool/hook/skill created → Auto-update registries and GSD

## Auto-Fire Hooks
| Event | What Fires | Location |
|-------|-----------|----------|
| Session start | start_task("session_main", 15min) | auto_hooks.py |
| Session end | complete_task(), validate if builds | auto_hooks.py |
| File write (tool/hook/skill) | on_tool_created() | auto_hooks.py |
| Parallel build completes | on_build_complete() | parallel_claude.py |

## Usage

### Automatic (No Action Needed)
Everything fires automatically through auto_hooks.py integration.

### Manual Parallel Build + Validate
```python
from intelligence.parallel_claude import parallel_build_and_validate

result = parallel_build_and_validate([
    {"task_id": "hook1", "task": "Write hook for...", "model": "haiku"},
    {"task_id": "hook2", "task": "Write hook for...", "model": "haiku"},
])
# result["all_valid"] = True if passed
# result["validation_results"] = detailed scores
```

### Manual Task Tracking
```python
from intelligence.auto_parallel import start_task, complete_task

start_task("my_task", "Complex multi-step task", timeout_minutes=15)
# ... do work ...
# If >15 min, parallel assist kicks in automatically
complete_task("my_task")
```

### Manual Validation
```python
from intelligence.auto_parallel import validate_build

result = validate_build("My build description", [
    "path/to/file1.py",
    "path/to/file2.py"
])
# 3 parallel validators assess correctness, completeness, safety
```

## Post-Build Updates (Automatic)
When parallel_build completes or a tool is created:
1. **hooks_registry.json** - New hooks registered
2. **CURRENT_STATE.json** - Tool counts, last build info
3. **GSD_v12.md** - Recent updates section
4. **post_build.log** - Build history

## Architecture
```
auto_hooks.py (V3 integration)
    ↓ on_session_start()
auto_parallel.py (15-min monitor)
    ↓ _trigger_parallel_assist()
parallel_claude.py (API executor)
    ↓ parallel_execute()
post_build_updater.py (documentation)
    ↓ on_build_complete()
All registries updated
```

## Configuration
| Setting | Default | Location |
|---------|---------|----------|
| Timeout threshold | 15 min | auto_parallel.py |
| Batch threshold | 3 items | auto_parallel.py |
| Validation workers | 3 | auto_parallel.py |
| Max parallel workers | 5 | parallel_claude.py |
| Default model | haiku | parallel_claude.py |

## Best Practices
1. **Don't manually track** - System auto-tracks session tasks
2. **Use build_and_validate** - Not just build, always validate
3. **Trust auto-updates** - Documentation updates automatically
4. **Check logs** - C:/PRISM/logs/auto_parallel.log for debugging

## Updated
2026-02-04 - Session 34
