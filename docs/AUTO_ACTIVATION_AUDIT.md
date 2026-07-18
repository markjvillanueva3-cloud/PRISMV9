# AUTO-ACTIVATION AUDIT
## Built in Last 24 Hours - What's Actually Automatic?

Generated: 2026-02-04T21:35:00Z

---

## SUMMARY

| Category | Total Tools | Auto-Fire | Manual | Auto % |
|----------|-------------|-----------|--------|--------|
| Claude Dev (P0.5) | 8 swarms | 0 | 8 | 0% |
| Dev Tools (P1-T1) | 20 | 0 | 20 | 0% |
| Intel Tools (P1-INTEL) | 22 | 6 | 16 | 27% |
| **TOTAL** | **50** | **6** | **44** | **12%** |

---

## P0.5: CLAUDE DEV ENHANCEMENT (17 files, 4132 lines)

| Component | Auto? | Activation |
|-----------|-------|------------|
| bootstrap.py | ❌ | Manual: `py bootstrap.py` |
| 8 Swarms | ❌ | Manual: import and call |
| 7 Cognitive Hooks | ❌ | Manual: hook.process() |
| 6 Manus Laws | ❌ | Manual: law.apply() |
| Auto-orchestrator | ❌ | Manual: orchestrator.run() |
| Pressure monitor | ❌ | Manual: monitor.check() |

**STATUS: 0% AUTO** - All require manual invocation

---

## P1-TIER1: MCP DEV TOOLS (20 tools, 1017 lines)

| Tool | Auto? | Should Be? |
|------|-------|------------|
| dev_task_start | ❌ | No - explicit start |
| dev_task_status | ❌ | No - on-demand |
| dev_task_update | ❌ | No - explicit |
| dev_task_complete | ❌ | No - explicit |
| dev_task_list | ❌ | No - on-demand |
| dev_checkpoint_create | ❌ | **YES - every N operations** |
| dev_checkpoint_restore | ❌ | No - explicit |
| dev_checkpoint_list | ❌ | No - on-demand |
| dev_checkpoint_diff | ❌ | No - on-demand |
| dev_checkpoint_auto | ❌ | **YES - should enable auto** |
| dev_code_impact | ❌ | No - on-demand |
| dev_code_dependency_graph | ❌ | No - on-demand |
| dev_code_change_risk | ❌ | **YES - on code write** |
| dev_semantic_search | ❌ | No - on-demand |
| dev_semantic_index | ❌ | **YES - on file change** |
| dev_semantic_similar | ❌ | No - on-demand |
| dev_context_watch_start | ❌ | **YES - session start** |
| dev_context_watch_stop | ❌ | **YES - session end** |
| dev_context_sync | ❌ | **YES - periodic** |
| dev_context_status | ❌ | No - on-demand |

**STATUS: 0% AUTO** - 7 SHOULD be auto-firing

---

## P1-INTEL: INTELLIGENCE FOUNDATION (22 tools, 2644 lines)

### ✅ AUTO-FIRING (Server-Level)

| Tool | Trigger | Status |
|------|---------|--------|
| intel_budget_reset | Session start (first tool call) | ✅ ACTIVE |
| intel_budget_status | Session start (first tool call) | ✅ ACTIVE |
| intel_review_cascade | Code write (>20 lines) | ✅ ACTIVE |
| intel_ast_complexity | Python file save | ✅ ACTIVE |
| intel_entropy_quick | Code file save | ✅ ACTIVE |
| intel_hook_on_failure | ANY exception | ✅ ACTIVE |

### ❌ MANUAL (Should Some Be Auto?)

| Tool | Manual? | Should Be Auto? |
|------|---------|-----------------|
| intel_budget_spend | ❌ | No - explicit spend |
| intel_budget_report | ❌ | **YES - session end** |
| intel_budget_can_spend | ❌ | No - check before |
| intel_reflection_run | ❌ | No - on-demand deep analysis |
| intel_reflection_cache_status | ❌ | No - on-demand |
| intel_review_stats | ❌ | **YES - session end** |
| intel_embed_local | ❌ | No - on-demand |
| intel_hooks_list | ❌ | No - admin |
| intel_hooks_fire | ❌ | No - manual trigger |
| intel_hooks_enable | ❌ | No - admin |
| intel_hooks_disable | ❌ | No - admin |
| intel_hooks_log | ❌ | No - admin |
| auto_hooks_status | ❌ | No - admin |
| auto_hooks_enable | ❌ | No - admin |
| auto_hooks_disable | ❌ | No - admin |
| auto_hooks_session_end | ❌ | **YES - should be auto** |

**STATUS: 27% AUTO** (6/22)

---

## GAPS TO FIX

### Priority 1: Session Lifecycle (Easy)
```
Session Start → Already auto-fires budget_reset, budget_status
Session End → MISSING: budget_report, review_stats
```
**Fix:** Wire `auto_hooks_session_end` to fire automatically (needs trigger)

### Priority 2: Dev Tools Auto-Activation (Medium)
```
Need to auto-fire:
- dev_checkpoint_create → every 10 tool calls
- dev_context_watch_start → session start
- dev_context_sync → every 5 minutes
- dev_semantic_index → on file write
- dev_code_change_risk → on code write
```
**Fix:** Create dev_auto_hooks.py like intel auto_hooks

### Priority 3: Claude Dev Bootstrap (Easy)
```
bootstrap.py should auto-run on MCP server start
```
**Fix:** Add to server startup sequence

---

## RECOMMENDED ACTIONS

### Immediate (This Session)
1. ✅ Wire `intel_budget_report` to session end
2. ✅ Wire `intel_review_stats` to session end
3. ✅ Document current auto-activation in GSD

### Next Session
4. Create `dev_auto_hooks.py` for dev tools
5. Auto-start `dev_context_watch_start` on session
6. Auto-checkpoint every 10 operations

### Future
7. Auto-run bootstrap.py on server start
8. Auto-index files on change (semantic search)

---

## CONCLUSION

**Only 12% of tools built in last 24 hours have auto-activation.**

The auto-hook system WORKS (tested and verified), but only covers 6 intel tools.
The other 44 tools require manual invocation.

To reach 50%+ auto-activation, we need:
1. Session end hooks (2 more tools)
2. Dev tools auto-hooks (7 tools)
3. Periodic checkpoints (1 tool)

**Total effort: ~2 hours to wire remaining auto-activation**
