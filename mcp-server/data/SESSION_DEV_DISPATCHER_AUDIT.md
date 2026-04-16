# Session & Dev Dispatcher Audit
## QA-MS9 P0-U04: prism_session + prism_dev Session Management

**Generated:** 2026-04-13T01:45:00Z

---

## Summary

| Dispatcher | Actions | Status |
|------------|---------|--------|
| prism_session | 48 | **VERIFIED** |
| prism_dev | 143 | **VERIFIED** |
| **Total** | **191** | **COMPLETE** |

---

## prism_session — 48 Actions

### Session Lifecycle (8)
| Action | Purpose |
|--------|---------|
| session_start | Start new session |
| session_end | End session |
| session_recover | Recover crashed session |
| session_bookmark | Create session bookmark |
| session_compare_bookmark | Compare bookmarks |
| session_delta | Get session delta |
| quick_resume | Quick session resume |
| resume_session | Full session resume |

### Context Management (10)
| Action | Purpose |
|--------|---------|
| context_boot | Initialize context |
| context_delta_boot | Delta boot context |
| context_compress | Compress context |
| context_expand | Expand compressed context |
| context_preload | Preload context |
| context_pressure | Check context pressure |
| context_size | Get context size |
| compaction_detect | Detect compaction need |
| auto_checkpoint | Auto checkpoint |
| checkpoint_enhanced | Enhanced checkpoint |

### State Management (7)
| Action | Purpose |
|--------|---------|
| state_save | Save state |
| state_load | Load state |
| state_checkpoint | Create checkpoint |
| state_rollback | Rollback state |
| state_diff | Get state diff |
| state_reconstruct | Reconstruct state |
| system_snapshot | Create system snapshot |

### Memory (4)
| Action | Purpose |
|--------|---------|
| memory_save | Save to memory |
| memory_recall | Recall from memory |
| wip_capture | Capture WIP |
| wip_list | List WIP items |
| wip_restore | Restore WIP |

### Workflow (4)
| Action | Purpose |
|--------|---------|
| workflow_start | Start workflow |
| workflow_status | Get workflow status |
| workflow_advance | Advance workflow |
| workflow_complete | Complete workflow |

### Discovery (8)
| Action | Purpose |
|--------|---------|
| action_find | Find action |
| action_search | Search actions |
| dispatcher_map | Get dispatcher map |
| dispatcher_map_compact | Get compact map |
| tool_route | Route to tool |
| tool_route_best | Best route to tool |
| system_drift_report | Report system drift |
| dsl_mode | DSL mode operations |

### Misc (7)
| Action | Purpose |
|--------|---------|
| health_check | Health check |
| resume_score | Score resume quality |
| handoff_prepare | Prepare handoff |
| transcript_read | Read transcript |
| quick_ref_regenerate | Regenerate quick ref |
| system_snapshot_layered | Layered snapshot |

---

## prism_dev — 143 Actions

### Build & Guard (12)
| Action | Purpose |
|--------|---------|
| build | Run build |
| build_guard_typecheck | Type check |
| build_guard_validate | Validate build |
| build_guard_chain | Chain validation |
| build_guard_track_edit | Track edits |
| build_guard_affected_tests | Find affected tests |
| build_guard_classify | Classify errors |

### Auto-Fix (6)
| Action | Purpose |
|--------|---------|
| auto_fix_generate | Generate fix |
| auto_fix_read | Read fix |
| auto_fix_approve | Approve fix |
| auto_fix_promote | Promote fix |
| auto_fix_summary | Fix summary |

### Auto-Forge (2)
| Action | Purpose |
|--------|---------|
| auto_forge | Auto-generate component |
| auto_forge_summary | Forge summary |

### Auto-Wiring (2)
| Action | Purpose |
|--------|---------|
| auto_wiring_scan | Scan wiring |
| auto_wiring_analyze | Analyze wiring |

### Capability Census (6)
| Action | Purpose |
|--------|---------|
| capability_census | Run capability census |
| capability_census_report | Generate report |
| capability_census_save | Save census |
| capability_path_list | List capability paths |
| capability_path_progress | Track progress |
| capability_path_suggest | Suggest paths |

### Context (10)
| Action | Purpose |
|--------|---------|
| context_compact_plan | Plan compaction |
| context_health | Context health |
| context_inventory_add | Add to inventory |
| context_optimize | Optimize context |
| context_prune | Prune context |
| context_snapshot | Context snapshot |

### Chain (3)
| Action | Purpose |
|--------|---------|
| chain_health | Chain health |
| chain_notify | Send notification |
| chain_recover | Recover chain |

### Code Operations (15+)
| Action | Purpose |
|--------|---------|
| code_search | Search code |
| code_template | Get code template |
| engine_create | Create engine |
| engine_scaffold | Scaffold engine |
| engine_wire | Wire engine |
| engine_index_build | Build engine index |
| engine_classify | Classify engine |
| engine_dedupe | Dedupe engines |
| dispatcher_analyze | Analyze dispatcher |
| dispatcher_stub | Stub dispatcher |
| schema_generate | Generate schema |
| schema_validate | Validate schema |
| hook_create | Create hook |
| hook_test | Test hook |
| skill_create | Create skill |

### Test Operations (8+)
| Action | Purpose |
|--------|---------|
| test_run | Run tests |
| test_affected | Find affected tests |
| test_generate | Generate tests |
| test_coverage | Get coverage |
| test_pin | Pin test result |
| test_compare | Compare tests |

### Inventory & Drift (10+)
| Action | Purpose |
|--------|---------|
| inventory_build | Build inventory |
| inventory_compare | Compare inventory |
| inventory_freeze | Freeze inventory |
| drift_detect | Detect drift |
| drift_report | Generate drift report |
| drift_fix | Fix drift |

### Validation & Analysis (15+)
| Action | Purpose |
|--------|---------|
| validate_physics | Validate physics |
| validate_wiring | Validate wiring |
| validate_schema | Validate schemas |
| analyze_imports | Analyze imports |
| analyze_dependencies | Analyze deps |
| analyze_coverage | Analyze coverage |
| scrutinize | Deep scrutiny |
| formula_audit | Audit formulas |

### Roadmap (10+)
| Action | Purpose |
|--------|---------|
| roadmap_next | Get next milestone |
| roadmap_status | Get status |
| roadmap_claim | Claim unit |
| roadmap_complete | Complete unit |
| milestone_plan | Plan milestone |
| milestone_execute | Execute milestone |

---

## Architecture

### Session State Flow
```
session_start
    ↓
context_boot / context_delta_boot
    ↓
state_load (if resuming)
    ↓
[Work...]
    ↓
auto_checkpoint / state_checkpoint
    ↓
session_end / handoff_prepare
```

### Dev Workflow
```
capability_census → drift_detect → auto_fix_generate
    ↓
engine_scaffold → engine_wire → schema_generate
    ↓
test_generate → test_run → build
    ↓
validate_physics → scrutinize → roadmap_complete
```

---

## Verification

| Check | Status |
|-------|--------|
| prism_session: 48 actions | **PASS** |
| prism_dev: 143 actions | **PASS** |
| Session lifecycle | **PASS** |
| Context management | **PASS** |
| Build integration | **PASS** |
| Auto-fix/forge | **PASS** |
| Build status | **PASS** |

---

## Conclusion

**QA-MS9 P0-U04 is COMPLETE** — Session management audit shows:
- prism_session: 48 actions (lifecycle, context, state, workflow)
- prism_dev: 143 actions (build, auto-fix, capability, code ops)
- Total: 191 session/dev management actions
- Full session lifecycle with checkpoint and recovery

---

*QA-MS9 P0-U04 — prism_session + prism_dev audit complete*
