# PRISM GSD v11.0 - Dev Tools Enhanced Edition
## Get Shit Done - With Dev Tools, Auto-Orchestration & Cognitive Hooks

---

## SESSION START PROTOCOL (MANDATORY)
```
1. prism_gsd_core                         → Load instructions
2. py C:\PRISM\claude-dev\bootstrap.py    → Load enhancement package
3. Read ACTION_TRACKER.md                 → What did I do last?
4. Read CURRENT_STATE.json                → Quick resume
5. dev_context_watch_start("src,state")   → Watch for file changes
6. prism_todo_update                      → Anchor attention
```

## 5 LAWS (HARD REQUIREMENTS)
1. **S(x)≥0.70** - Safety score HARD BLOCK
2. **No placeholders** - 100% complete
3. **New≥Old** - Never lose data
4. **MCP First** - 297 tools (277 + 20 dev) before files
5. **TRACK EVERYTHING** - ACTION_TRACKER every response

---

## DEV TOOLS (20 NEW - TIER 1)

### Background Tasks - Run Tests/Builds Without Blocking
```python
# Start long-running process
result = dev_task_spawn("npm test", "run-tests")
task_id = result["task_id"]  # Returns immediately

# Check progress
status = dev_task_status(task_id)
print(status["output"])  # See output so far

# Stream incremental output
stream = dev_task_stream(task_id, since_line=50)

# Kill if needed
dev_task_kill(task_id)

# List all tasks
dev_task_list(status_filter="running")
```

### Checkpoints - Snapshot Before Risky Changes
```python
# BEFORE any file modification:
cp = dev_checkpoint_create("before-refactor", paths="src,state")
checkpoint_id = cp["checkpoint_id"]

# ... make changes ...

# If something breaks:
diff = dev_checkpoint_diff(checkpoint_id)  # See what changed
dev_checkpoint_restore(checkpoint_id, dry_run=True)  # Preview
dev_checkpoint_restore(checkpoint_id, dry_run=False)  # Restore

# Cleanup old checkpoints
dev_checkpoint_list()
dev_checkpoint_delete(old_checkpoint_id)
```

### Impact Analysis - Know What You're Breaking
```python
# Before changing a file:
impact = dev_code_impact("src/tools/myfile.ts")
print(impact["breaking_risk"])  # critical/high/medium/low
print(impact["direct_importers"])  # Who uses this?
print(impact["test_coverage"])  # What tests cover this?

# Find tests for a file
tests = dev_impact_test_map("src/core/Calculator.ts")

# Build dependency graph
graph = dev_impact_dependency_graph("src/index.ts", depth=3)
```

### Semantic Search - Find Code by Meaning
```python
# Build index (first time or after major changes)
dev_semantic_index_build(paths="src", force_rebuild=True)

# Search by concept, not just keywords
results = dev_semantic_search("calculate cutting force physics")
for r in results["results"]:
    print(f"{r['file']}:{r['start_line']} - {r['summary']}")

# Find similar code
similar = dev_semantic_similar("src/engines/Kienzle.ts", 10, 50)
```

### Context Sync - Know When Files Change
```python
# Start watching
watcher = dev_context_watch_start("src,state,config")
watcher_id = watcher["watcher_id"]

# Check for changes
changes = dev_context_changes(watcher_id)
if changes["context_stale"]:
    print("Files changed! Re-read context.")

# Get current snapshot
snapshot = dev_context_snapshot(watcher_id)

# Stop when done
dev_context_watch_stop(watcher_id)
```

---

## DEV TOOLS INTEGRATION PATTERNS

### Pattern 1: Safe File Modification
```python
# 1. Checkpoint BEFORE changes
cp = dev_checkpoint_create("before-edit")

# 2. Analyze impact
impact = dev_code_impact(target_file)
if impact["breaking_risk"] == "critical":
    print("WARNING: High-impact change!")

# 3. Make changes
# ... edit files ...

# 4. Run tests in background
test = dev_task_spawn("npm test", "verify-changes")

# 5. Check results
status = dev_task_status(test["task_id"])
if status["exit_code"] != 0:
    dev_checkpoint_restore(cp["checkpoint_id"])  # Rollback!
```

### Pattern 2: Continuous Context Awareness
```python
# Session start
watcher = dev_context_watch_start("src")

# Every 5-8 operations
changes = dev_context_changes(watcher["watcher_id"])
if changes["files_affected"] > 0:
    # Re-index if needed
    dev_semantic_index_build(force_rebuild=True)
```

### Pattern 3: Background Build + Continue Working
```python
# Start build
build = dev_task_spawn("npm run build", "build-project")

# Continue other work while building...
# ...

# Check later
status = dev_task_status(build["task_id"])
if status["status"] == "completed":
    print("Build done!")
```

---

## CLAUDE DEV PACKAGE
```
Location: C:\PRISM\claude-dev\
├── swarms/          → 8 pattern templates
├── hooks/           → Cognitive + Context (13 hooks)
├── orchestration/   → Auto-orchestrator
├── context/         → Pressure + Memory
├── bootstrap.py     → Session initializer
└── CLAUDE_DEV_SKILL.md → Master docs
```

## AUTO-ORCHESTRATION (Updated)
| Task Type | Auto-Selected Tools |
|-----------|---------------------|
| calculation | calc_cutting_force, calc_tool_life |
| data_query | material_search, alarm_search |
| code_change | **dev_checkpoint_create** → sp_brainstorm → sp_execute → **dev_task_spawn** (tests) |
| analysis | **dev_code_impact** → cognitive_check → agent swarm |
| search | **dev_semantic_search** → conversation_search |
| orchestration | swarm_parallel, plan_create |

## COGNITIVE HOOKS (Fire Automatically)
| Hook | When | Purpose |
|------|------|---------|
| BAYES-001 | Session start | Initialize priors |
| BAYES-002 | Data changes | Detect anomalies |
| BAYES-003 | Task complete | Extract patterns |
| RL-001 | Context switch | Maintain continuity |
| RL-002 | Action done | Record outcome |
| RL-003 | Session end | Update policy |
| OPT-001 | Resource select | Optimize choice |
| **DEV-001** | **Before file edit** | **Auto-checkpoint** |
| **DEV-002** | **After code change** | **Run impact analysis** |
| **DEV-003** | **Session start** | **Start context watcher** |

## MANUS 6 LAWS (Integrated)
1. **KV-Cache** - Sorted JSON, stable prefixes
2. **Tool Masking** - State-based availability
3. **External Memory** - Hot/Warm/Cold tiers
4. **Attention Anchor** - todo.md every 5 ops
5. **Error Preserve** - NEVER clean errors
6. **Response Vary** - Prevent mimicry

## CONTEXT PRESSURE (Auto-Monitor)
```
🟢 GREEN  (0-60%)  → Normal operation
🟡 YELLOW (60-75%) → Start batching, checkpoint
🟠 ORANGE (75-85%) → CREATE CHECKPOINT, prepare handoff
🔴 RED    (85-92%) → URGENT handoff, save all state
⚫ CRITICAL (>92%) → STOP ALL WORK, checkpoint everything
```

## SWARM PATTERNS (8 Ready)
| Pattern | Use Case |
|---------|----------|
| PARALLEL | Independent extraction |
| PIPELINE | Sequential processing |
| CONSENSUS | Multi-agent voting |
| HIERARCHICAL | Tiered review |
| COMPETITIVE | Best solution wins |
| MAP_REDUCE | Split & merge |
| ENSEMBLE | Expert collaboration |
| COOPERATIVE | Shared learning |

## WORKFLOW (Dev-Tools Enhanced)
```
START → dev_context_watch_start
          ↓
BRAINSTORM → dev_code_impact (if code change)
          ↓
PLAN → dev_checkpoint_create (before changes)
          ↓
EXECUTE → dev_task_spawn (background tests)
          ↓
REVIEW → dev_checkpoint_diff (verify changes)
          ↓
END → dev_context_watch_stop
```

## MEMORY HIERARCHY
```
HOT  (50 items)  → In-memory, <1ms
WARM (500 items) → JSON file, <10ms  
COLD (unlimited) → Checkpoints, <100ms
```

## TOOL COUNTS (Updated)
- **PRISM MCP**: 277 tools
- **Dev Tools**: 20 tools (NEW)
- **Total**: 297 tools

## SESSION END PROTOCOL
```
1. dev_checkpoint_create("session-end")   → Save state
2. Update ACTION_TRACKER.md              → Log what was done
3. Update CURRENT_STATE.json             → Quick resume
4. dev_context_watch_stop(watcher_id)    → Cleanup
5. prism_session_end_full                → Full handoff
```
