# COMPREHENSIVE MCP SERVER AUTO-ACTIVATION AUDIT
============================================================

## EXECUTIVE SUMMARY

| Metric | Count |
|--------|-------|
| Tools that SHOULD auto-fire | 28 |
| Tools currently auto-firing | 6 |
| GAP | 22 |
| Auto-activation rate | 21% |

## CURRENTLY AUTO-FIRING (6 tools)

| Tool | Trigger | Status |
|------|---------|--------|
| intel_budget_reset | session_start | [ACTIVE] |
| intel_budget_status | session_start | [ACTIVE] |
| intel_review_cascade | code_write | [ACTIVE] |
| intel_ast_complexity | code_write | [ACTIVE] |
| intel_entropy_quick | code_write | [ACTIVE] |
| intel_hook_on_failure | on_failure | [ACTIVE] |

## SHOULD BE AUTO-FIRING (Gap Analysis)

### Trigger: `session_start`

| Tool | Currently Auto? | Priority |
|------|-----------------|----------|
| prism_session_start_full | NO | HIGH |
| prism_quick_resume | NO | HIGH |
| intel_budget_reset | YES | HIGH |
| intel_budget_status | YES | HIGH |
| dev_context_watch_start | NO | HIGH |
| prism_gsd_core | NO | HIGH |

### Trigger: `session_end`

| Tool | Currently Auto? | Priority |
|------|-----------------|----------|
| prism_session_end_full | NO | HIGH |
| intel_budget_report | NO | HIGH |
| intel_review_stats | NO | HIGH |
| auto_hooks_session_end | NO | HIGH |
| dev_context_watch_stop | NO | HIGH |

### Trigger: `code_write`

| Tool | Currently Auto? | Priority |
|------|-----------------|----------|
| intel_review_cascade | YES | MEDIUM |
| intel_ast_complexity | YES | MEDIUM |
| intel_entropy_quick | YES | MEDIUM |
| dev_code_change_risk | NO | MEDIUM |
| dev_semantic_index | NO | MEDIUM |

### Trigger: `on_failure`

| Tool | Currently Auto? | Priority |
|------|-----------------|----------|
| intel_hook_on_failure | YES | CRITICAL |
| prism_error_preserve | NO | CRITICAL |

### Trigger: `before_calculation`

| Tool | Currently Auto? | Priority |
|------|-----------------|----------|
| validate_safety | NO | MEDIUM |

### Trigger: `before_file_write`

| Tool | Currently Auto? | Priority |
|------|-----------------|----------|
| validate_anti_regression | NO | MEDIUM |

### Trigger: `periodic_5_ops`

| Tool | Currently Auto? | Priority |
|------|-----------------|----------|
| prism_todo_update | NO | MEDIUM |
| dev_checkpoint_create | NO | MEDIUM |

### Trigger: `periodic_context_check`

| Tool | Currently Auto? | Priority |
|------|-----------------|----------|
| prism_context_pressure | NO | MEDIUM |

### Trigger: `before_machining`

| Tool | Currently Auto? | Priority |
|------|-----------------|----------|
| check_toolpath_collision | NO | MEDIUM |
| validate_workholding_setup | NO | MEDIUM |
| predict_tool_breakage | NO | MEDIUM |
| get_spindle_safe_envelope | NO | MEDIUM |
| validate_coolant_flow | NO | MEDIUM |

## SAFETY-CRITICAL TOOLS (NOT Auto-Firing)

These tools protect against injury/death and should fire automatically:

| Category | Tool | Recommended Trigger |
|----------|------|---------------------|
| collision | check_toolpath_collision | before_machining |
| collision | validate_rapid_moves | before_machining |
| collision | check_fixture_clearance | before_machining |
| collision | calculate_safe_approach | before_machining |
| collision | detect_near_miss | before_machining |
| collision | generate_collision_report | before_machining |
| collision | validate_tool_clearance | before_machining |
| collision | check_5axis_head_clearance | before_machining |
| spindle | check_spindle_torque | before_machining |
| spindle | check_spindle_power | before_machining |
| spindle | validate_spindle_speed | before_machining |
| spindle | monitor_spindle_thermal | before_machining |
| spindle | get_spindle_safe_envelope | before_machining |
| tool_breakage | predict_tool_breakage | before_machining |
| tool_breakage | calculate_tool_stress | before_machining |
| tool_breakage | check_chip_load_limits | before_machining |
| tool_breakage | estimate_tool_fatigue | before_machining |
| tool_breakage | get_safe_cutting_limits | before_machining |
| workholding | calculate_clamp_force_required | before_machining |
| workholding | validate_workholding_setup | before_machining |
| workholding | check_pullout_resistance | before_machining |
| workholding | analyze_liftoff_moment | before_machining |
| workholding | calculate_part_deflection | before_machining |
| workholding | validate_vacuum_fixture | before_machining |
| coolant | validate_coolant_flow | before_machining |
| coolant | check_through_spindle_coolant | before_machining |
| coolant | calculate_chip_evacuation | before_machining |
| coolant | validate_mql_parameters | before_machining |
| coolant | get_coolant_recommendations | before_machining |

## RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Session Lifecycle (Immediate - 30 min)
```
1. intel_budget_report      -> session_end
2. intel_review_stats       -> session_end
3. dev_context_watch_start  -> session_start
4. dev_context_watch_stop   -> session_end
5. prism_gsd_core           -> session_start (first tool call)
```

### Phase 2: Periodic Operations (30 min)
```
1. prism_todo_update        -> every 5 tool calls
2. dev_checkpoint_create    -> every 10 tool calls
3. prism_context_pressure   -> every 20 tool calls
```

### Phase 3: Code Quality (30 min)
```
1. dev_code_change_risk     -> code_write
2. dev_semantic_index       -> file_write
```

### Phase 4: Safety Critical (1 hour)
```
1. validate_anti_regression -> before_file_replace
2. validate_safety          -> before_calculation
3. Safety tools integrated  -> before_machining_output
```

## IMPLEMENTATION ARCHITECTURE

```
+------------------------------------------------------------+
|                    AUTO-HOOK SYSTEM                        |
+------------------------------------------------------------+
|  TRIGGER          |  FIRES                                 |
+-------------------+----------------------------------------+
|  First tool call  |  gsd_core, budget_reset, context_watch |
|  Code write       |  review_cascade, ast, entropy, risk    |
|  File replace     |  anti_regression                       |
|  Any exception    |  hook_on_failure, error_preserve       |
|  Every 5 calls    |  todo_update                           |
|  Every 10 calls   |  checkpoint_create                     |
|  Every 20 calls   |  context_pressure                      |
|  Session end      |  budget_report, review_stats, stop     |
|  Before calc      |  validate_safety (S(x) >= 0.70)        |
|  Before machining |  collision, spindle, breakage checks   |
+-------------------+----------------------------------------+
```

## TOTAL EFFORT ESTIMATE

| Phase | Tools | Effort | Impact |
|-------|-------|--------|--------|
| 1. Session Lifecycle | 5 | 30 min | HIGH |
| 2. Periodic Ops | 3 | 30 min | HIGH |
| 3. Code Quality | 2 | 30 min | MEDIUM |
| 4. Safety Critical | 3+ | 1 hour | CRITICAL |
| **TOTAL** | **13+** | **2.5 hours** | **CRITICAL** |
