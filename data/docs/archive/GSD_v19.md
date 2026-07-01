# 24 dispatchers | ~299 actions | MCP-native | esbuild | D1+D2+D3 COMPLETE

## 1. RULES — ALWAYS / NEVER

### ALWAYS
- S(x) ≥ 0.70 before any output (HARD BLOCK — enforced by pre-output hooks)
- prism:prism_validate action=anti_regression before replacing ANY file
- prism:prism_dev action=build for builds — NEVER tsc (OOM crash)
- Restart Claude Desktop after every build
- MCP-native dispatchers first, DC only for files OUTSIDE mcp-server/
- prism:prism_doc action=read/write for state & planning docs (NOT DC:read_file)
- Use dispatcher pattern: prism:<n> { action: "<action>", params: {...} }

### NEVER
- Never use tsc/npx tsc (hits OOM at ~1.3MB source)
- Never overwrite files without counting items first
- Never assume agent/swarm tools return real data without API key
- Never skip validation on safety-critical outputs
- Never create files without checking if they already exist
- Never use DC:read_file for ACTION_TRACKER, ROADMAP, todo, or GSD docs
- Never call old individual tool names — use dispatchers

---

## 2. SESSION PROTOCOL

### Start (2 steps)
```
1. prism:prism_dev action=session_boot     → ONE call: resume + tracker + roadmap
2. prism:prism_context action=todo_update  → Anchor attention on current task
```

### End (3 steps)
```
1. prism:prism_session action=state_save          → Persist full state
2. prism:prism_doc action=write name=ACTION_TRACKER.md  → Mark completed, add pending
3. prism:prism_context action=todo_update          → Final anchor for next session
```

### Simple questions — SKIP THE CEREMONY
If user asks "what's 4140 hardness?" or "decode alarm 100" — just answer.

### Cadence (auto-fired by cadenceExecutor — 25 functions, zero manual effort)
- Every 5 tool calls → auto todo refresh (reads todo.md from disk)
- Every 8 tool calls → auto context pressure check + adaptive truncation + attention scoring
- Every 10 tool calls → auto checkpoint (writes CURRENT_STATE.json)
- Every 12 tool calls → auto compaction detection + Python compaction prediction
- Every 20 tool calls → auto variation check
- On first call → auto pre-task recon + warm start + knowledge enrichment + compaction rehydration + script recommend
- On ANY error → error learn + D3 error chain (extractor→detector→store) + circuit breaker + retry + rollback
- On ANY success → on-outcome hooks (performance, quality trends, usage) + D3 LKG update
- On ANY calc dispatch → pre/post-calculation hooks (9 blocking + 9 non-blocking)
- On ANY output → pre-output hooks (omega gate + safety hard gate — BLOCKING)
- On file writes → pre/post-file-write hooks (backup, anti-regression, rollback, decision capture)
- At ≥70% pressure → auto-compress context snapshot + Python compress
- At ≥75% pressure → compaction survival (saves task/findings/decisions to COMPACTION_SURVIVAL.json)
- At <40% pressure → auto context pull-back + Python expand (restores externalized data)
- Buffer zones: 🟢0-8 | 🟡9-14 checkpoint | 🔴15-18 save urgently | ⚫19+ STOP

### Context Pressure Management (4-layer defense, auto-firing)
- Layer 1: Truncation — results >adaptive cap (20KB→5KB→500B) externalized to disk
- Layer 2: Slimming — results >2KB at ≥50% pressure get field-stripped (responseSlimmer.ts, 190 lines)
- Layer 3: Cadence trim — _cadence metadata scaled proportional to pressure
- Layer 4: Compaction survival — at ≥75% pressure, critical context saved to COMPACTION_SURVIVAL.json, rehydrated on next session's first call

---

## 3. BUILD & DEPLOY

### Build (MCP-native)
```
prism:prism_dev action=build → returns PASS/FAIL + errors only
```

### After ANY code change
```
1. prism:prism_dev action=build
2. Restart Claude Desktop
3. Phase checklist: skills → hooks → GSD → memories → orchestrators → state → scripts
```

---

## 4. HOOK SYSTEM — auto-firing via autoHookWrapper (1,415 lines) + cadenceExecutor (1,720 lines)

### Hook Coverage by Dispatcher
| Dispatcher | Phases Fired | Hook Count |
|---|---|---|
| calcDispatcher | pre/post-calculation, pre-kienzle/taylor/johnson-cook | 9+9+3 |
| dataDispatcher | pre/post-calculation (formula_calculate) | 9+9 |
| threadDispatcher | pre/post-calculation (7 actions), pre/post-code-generate (1) | 9+9+7 |
| toolpathDispatcher | pre/post-calculation (2 actions) | 9+9 |
| documentDispatcher | pre/post-file-write (write + append) | 6+3 |
| sessionDispatcher | on-session-start/end/checkpoint/resume/pressure/compaction | 5+4+5+3+2+1 |
| autoHookWrapper | on-error, on-outcome, pre-output (ALL dispatchers) | 5+9+2 |
| cadenceExecutor | 25 auto-functions (todo, checkpoint, pressure, D1/D2/D3, etc.) | 25 |
| hookDispatcher | manual hook execution | 16 |
| spDispatcher | Phase 0 workflow hooks | 7 |
| guardDispatcher | autohook test | 3 |

### 25 cadenceExecutor Functions (all auto-fire, zero-token server-side JS)
| Function | Trigger | Effect |
|---|---|---|
| autoTodoRefresh | @5 calls | Reads todo.md, refreshes attention anchor |
| autoCheckpoint | @10 calls | Writes CURRENT_STATE.json checkpoint |
| autoContextPressure | @8 calls | Buffer zone check + adaptive caps |
| autoAttentionScore | @8 calls | D2: Score content attention priority |
| autoCompactionDetect | @12 calls | Compaction risk scoring |
| autoPythonCompactionPredict | @12 calls | D2: Python compaction prediction |
| autoContextCompress | @70% pressure | Emergency snapshot |
| autoPythonCompress | @70% pressure | D2: Python-driven compression |
| autoCompactionSurvival | @75% pressure | D2: Save critical context pre-compaction |
| autoContextPullBack | @<40% pressure | Restore externalized data |
| autoPythonExpand | @<40% pressure | D2: Python-driven expansion |
| autoContextRehydrate | First call | D2: Restore context from previous session |
| autoErrorLearn | Any error | Failure pattern library |
| autoD3ErrorChain | Any error | D3: extractor→detector→store chain |
| autoD3LkgUpdate | Any success | D3: LKG tracker auto-update |
| autoPreTaskRecon | First call | Session warm start |
| autoQualityGate | Completion signals | Ω+S(x) verification |
| autoAntiRegression | File writes | Item count preservation |
| autoDecisionCapture | Code file writes | Decision logging |
| autoSkillHint | Calc/safety/thread | Relevant skill suggestions |
| autoKnowledgeCrossQuery | First call | Cross-registry enrichment |
| autoInputValidation | Calc tools | **BLOCKS** invalid params |
| autoScriptRecommend | First call | Script suggestions |
| autoVariationCheck | @20 calls | Response pattern diversity |
| autoWarmStartData | First call | Registry status load |

---

## 5. THE 24 DISPATCHERS — Decision Tree

### "I need to look up..."
```
prism:prism_data action=material_search    params: { query: "Ti-6Al-4V" }
prism:prism_data action=material_get       params: { identifier: "MAT-0001" }
prism:prism_data action=material_compare   params: { material_ids: ["MAT-0001","MAT-0002"] }
prism:prism_data action=machine_search     params: { query: "DMG MORI" }
prism:prism_data action=tool_recommend     params: { material_id: "...", operation: "turning" }
prism:prism_data action=alarm_decode       params: { code: "100", controller: "fanuc" }
prism:prism_data action=formula_get        params: { formula_id: "F-001" }
```

### "I need to calculate..."
```
prism:prism_calc action=cutting_force      params: { material, depth, feed, speed }
prism:prism_calc action=tool_life          params: { speed, material, feed }
prism:prism_calc action=speed_feed         params: { material, tool_diameter, operation }
prism:prism_calc action=surface_finish     params: { feed, nose_radius }
prism:prism_calc action=mrr               params: { depth, feed, speed }
prism:prism_calc action=power             params: { force, speed }
prism:prism_calc action=stability         params: { ... }
prism:prism_calc action=deflection        params: { ... }
prism:prism_calc action=thermal           params: { ... }
prism:prism_calc action=cost_optimize     params: { ... }
prism:prism_calc action=multi_optimize    params: { ... }
prism:prism_calc action=trochoidal        params: { ... }
prism:prism_calc action=hsm              params: { ... }
prism:prism_calc action=cycle_time        params: { ... }
```
⚠️ All calc actions auto-fire 9 pre-calculation + 9 post-calculation hooks

### "I need to check safety..."
```
prism:prism_safety action=check_toolpath_collision
prism:prism_safety action=check_spindle_power
prism:prism_safety action=check_spindle_torque
prism:prism_safety action=predict_tool_breakage
prism:prism_safety action=validate_workholding_setup
prism:prism_safety action=calculate_clamp_force_required
prism:prism_safety action=validate_coolant_flow
prism:prism_safety action=get_spindle_safe_envelope
```
⚠️ S(x) ≥ 0.70 HARD BLOCK enforced by pre-output hooks

### "I need threading..."
```
prism:prism_thread action=get_thread_specifications    params: { thread: "M10x1.5" }
prism:prism_thread action=calculate_tap_drill          params: { thread, engagement }
prism:prism_thread action=generate_thread_gcode        params: { thread, ... }
prism:prism_thread action=get_go_nogo_gauges          params: { thread }
prism:prism_thread action=validate_thread_fit_class
```
⚠️ 7 calc actions fire pre/post-calculation hooks; gcode fires pre/post-code-generate hooks

### "I need toolpath strategies..."
```
prism:prism_toolpath action=strategy_select       params: { feature, material, constraints }
prism:prism_toolpath action=params_calculate       params: { strategy, material, tool }
prism:prism_toolpath action=material_strategies    params: { material_id }
```

### "I need to validate..."
```
prism:prism_validate action=material               params: { material_id }
prism:prism_validate action=kienzle                params: { material_id }
prism:prism_validate action=anti_regression        params: { old_count, new_count }
prism:prism_omega action=compute                   params: { target, scores }
prism:prism_omega action=breakdown                 params: { ... }
```

### "I need to review code/content..."
```
prism:prism_ralph action=loop        params: { target, content } (LIVE API — 4-phase)
prism:prism_ralph action=scrutinize  params: { target, content } (single pass)
prism:prism_ralph action=assess      params: { target, content } (OPUS Phase 4)
prism:prism_sp action=brainstorm     params: { problem, depth:"quick"|"standard"|"deep" }
prism:prism_sp action=review_spec    params: { spec, deliverable }
prism:prism_sp action=review_quality params: { code, context }
```

### "I need to run a large-scale autonomous task..."
```
prism:prism_atcs action=task_init      params: { task_id, task_type, objective, units[] }
prism:prism_atcs action=task_resume    → Cold-resume from disk manifest
prism:prism_atcs action=queue_next     params: { task_id, count? }
prism:prism_atcs action=unit_complete  params: { task_id, unit_id, output }
prism:prism_atcs action=batch_validate params: { task_id, batch_number }
prism:prism_atcs action=checkpoint     params: { task_id? }
prism:prism_atcs action=replan         params: { task_id? }
prism:prism_atcs action=assemble       params: { task_id }
prism:prism_atcs action=stub_scan      params: { data }
```

### "I need autonomous execution..."
```
prism:prism_autonomous action=auto_plan      params: { task_id? }
prism:prism_autonomous action=auto_execute   params: { task_id?, chunk_size? }
prism:prism_autonomous action=auto_validate  params: { task_id?, batch_number? }
prism:prism_autonomous action=auto_status    params: { task_id? }
prism:prism_autonomous action=auto_configure params: { ... }
prism:prism_autonomous action=auto_dry_run   params: { task_id? }
prism:prism_autonomous action=auto_pause     params: { task_id? }
prism:prism_autonomous action=auto_resume    params: { task_id? }
```

### "I need session/context management..."
```
prism:prism_dev action=session_boot              → Combined resume+tracker+roadmap
prism:prism_session action=state_save            → Persist full state
prism:prism_session action=context_pressure      → Check buffer zone
prism:prism_session action=auto_checkpoint       → Save if cadence met
prism:prism_session action=context_compress      → When hitting red zone
prism:prism_context action=todo_update           → Attention anchor
prism:prism_context action=memory_externalize    → Unlimited expansion to disk
prism:prism_context action=attention_score       → D2: Score content attention priority
prism:prism_context action=focus_optimize        → D2: Optimize attention budget allocation
prism:prism_context action=relevance_filter      → D2: Filter irrelevant content from context
prism:prism_context action=context_monitor_check → D2: Enhanced monitoring with trend analysis
prism:prism_session action=wip_capture           → D1: Save work-in-progress to disk
prism:prism_session action=wip_list              → D1: List saved WIP snapshots
prism:prism_session action=wip_restore           → D1: Restore WIP from snapshot
prism:prism_session action=state_rollback        → D1: Revert to previous checkpoint
prism:prism_session action=resume_score          → D1: Rate session recovery quality
prism:prism_session action=checkpoint_enhanced   → D1: Richer checkpoints with metadata
prism:prism_doc action=read params={name:"..."}  → Read managed docs
prism:prism_doc action=write                     → Write docs (fires pre/post-file-write hooks)
prism:prism_doc action=roadmap_status            → Compact JSON of roadmap
prism:prism_doc action=action_tracker            → Compact JSON of tracker
```

### "I need dev workflow..."
```
prism:prism_dev action=build                     → esbuild PASS/FAIL
prism:prism_dev action=code_search               params: { pattern, scope }
prism:prism_dev action=file_read                 params: { path }
prism:prism_dev action=file_write                params: { path, content }
prism:prism_guard action=pre_call_validate       params: { tool_name }
prism:prism_guard action=error_capture           params: { error, context }
prism:prism_guard action=failure_library         params: { action, pattern }
prism:prism_guard action=pattern_scan            → D3: Detect error patterns
prism:prism_guard action=pattern_history         → D3: View pattern detection history
prism:prism_guard action=learning_query          → D3: Query learning store
prism:prism_guard action=learning_save           → D3: Persist learning
prism:prism_guard action=lkg_status              → D3: Last Known Good state
prism:prism_guard action=priority_score          → D3: Score issue priority
```

---

## 6. DEVELOPMENT PHASES STATUS

| Phase | Status | Key Deliverables |
|---|---|---|
| D1: Session Resilience | ✅ COMPLETE | wip_capture, state_rollback, resume_score, checkpoint_enhanced (6 actions) |
| D2: Context Intelligence | ✅ COMPLETE | attention_score, focus_optimize, relevance_filter, context_monitor_check (4 actions) + compaction_survival + rehydrate |
| D3: Learning & Patterns | ✅ COMPLETE | pattern_scan, learning_query/save, lkg_status, priority_score (6 actions) + errorChain + lkgUpdate auto-fire |
| D4: Performance & Caching | 🔜 NEXT | computation_cache, diff_based_updates, batch_processor, queue_manager |
| D5-D9 | 📋 PLANNED | See UNIFIED_ROADMAP_v8.md |

### Core Files
| File | Lines | Purpose |
|---|---|---|
| autoHookWrapper.ts | 1,415 | Wraps ALL 24 dispatchers with universal hooks |
| cadenceExecutor.ts | 1,720 | 25 auto-fire functions, zero dispatcher dependency |
| responseSlimmer.ts | 190 | 3-layer response slimming under pressure |
| GSD_v19.md | ~300 | This file |
