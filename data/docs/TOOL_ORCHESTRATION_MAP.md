# PRISM Tool Orchestration Map v1.0
## ⚠️ HISTORICAL — Pre-dispatcher architecture. Current truth: MASTER_INDEX.md (31 dispatchers, 368 actions)
## autoHookWrapper is now LIVE — wraps all 31 dispatchers with universal hooks.
## Mandatory Tool Chains for Every Task Type

> **Principle**: Tools are not a menu — they're pipelines. Every task type has a defined sequence. Safety chains are non-negotiable.

---

## 🔴 CRITICAL FINDING: Dead Infrastructure

**autoHookWrapper.ts** (444 lines) exists at `src/tools/autoHookWrapper.ts` with:
- `wrapToolWithAutoHooks()` — wraps any tool with before/after hooks
- `wrapAllTools()` — batch wraps entire tool sets
- Λ(x) proof validation on ALL calc tools (24 tools covered)
- Φ(x) factual claim verification on web tools
- REFL-002 auto-fire on any tool error
- Hook execution history tracking (1000 entries)
- Hard safety blocks when Λ < 0.50

**STATUS: NOT IMPORTED IN index.ts — 100% dead code.**

**ACTION**: Wire this in. Single biggest improvement possible.

---

## COMPLETE TOOL INVENTORY (346 tools)

### Calculations (20 tools)
**Basic 8** (calculationsV2.ts): `calc_cutting_force`, `calc_tool_life`, `calc_mrr`, `calc_surface_finish`, `calc_power`, `calc_deflection`, `calc_stability`, `calc_thermal`

**Extended 2** (calculationsV2.ts): `calc_speed_feed`, `calc_chip_load`

**Toolpath 7** (toolpathCalculationsV2.ts): `calc_engagement`, `calc_trochoidal`, `calc_hsm`, `calc_scallop`, `calc_stepover`, `calc_cycle_time`, `calc_arc_fit`

**Advanced 3** (advancedCalculationsV2.ts): `calc_cost_optimize`, `calc_multi_optimize`, `calc_productivity`

### Integrated Physics (4 tools)
`prism_speed_feed`, `prism_cutting_force`, `prism_tool_life`, `prism_formula_calc`

### Safety — Collision (8 tools)
`check_toolpath_collision`, `validate_rapid_moves`, `check_fixture_clearance`, `calculate_safe_approach`, `detect_near_miss`, `generate_collision_report`, `validate_tool_clearance`, `check_5axis_head_clearance`

### Safety — Spindle (5 tools)
`check_spindle_torque`, `check_spindle_power`, `validate_spindle_speed`, `monitor_spindle_thermal`, `get_spindle_safe_envelope`

### Safety — Tool Breakage (5 tools)
`predict_tool_breakage`, `calculate_tool_stress`, `check_chip_load_limits`, `estimate_tool_fatigue`, `get_safe_cutting_limits`

### Safety — Coolant (5 tools)
`validate_coolant_flow`, `check_through_spindle_coolant`, `calculate_chip_evacuation`, `validate_mql_parameters`, `get_coolant_recommendations`

### Safety — Workholding (6 tools)
`calculate_clamp_force_required`, `validate_workholding_setup`, `check_pullout_resistance`, `analyze_liftoff_moment`, `calculate_part_deflection`, `validate_vacuum_fixture`

### Threading (12 tools)
`calculate_tap_drill`, `calculate_thread_mill_params`, `calculate_thread_depth`, `calculate_engagement_percent`, `get_thread_specifications`, `get_go_nogo_gauges`, `calculate_pitch_diameter`, `calculate_minor_major_diameter`, `select_thread_insert`, `calculate_thread_cutting_params`, `validate_thread_fit_class`, `generate_thread_gcode`

### Toolpath Strategy (8 tools)
`toolpath_strategy_select`, `toolpath_params_calculate`, `toolpath_strategy_search`, `toolpath_strategy_list`, `toolpath_strategy_info`, `toolpath_stats`, `toolpath_material_strategies`, `toolpath_prism_novel`

### Data Access (~15 tools)
`material_search/get/compare`, `machine_search/get/capabilities`, `tool_search/get/recommend`, `alarm_search/decode/fix`, `formula_get/calculate`

### Validation (8 tools)
`validate_material`, `validate_kienzle`, `validate_taylor`, `validate_johnson_cook`, `validate_safety`, `validate_completeness`, `validate_anti_regression`, `omega_compute`

### Session & Workflow (~30 tools)
Boot, state, cognitive, todo, checkpoint, GSD, brainstorm, planning, debug, evidence, gates, context pressure, etc.

### Documents (7 tools)
`doc_list`, `doc_read`, `doc_write`, `doc_append`, `roadmap_status`, `action_tracker`, `doc_migrate`

### Dev Workflow (7 tools)
`session_boot`, `build`, `code_template`, `code_search`, `file_read`, `file_write`, `server_info`

### Orchestration & AI (~20 tools)
Agents, swarms, hooks, Ralph, autopilot, cognitive, etc.

---

## MANDATORY CHAINS BY TASK TYPE

### CHAIN 1: Full Machining Parameter Setup
**Trigger**: "Calculate parameters for machining [material] on [machine]"

```
PHASE 1 — GATHER
├── material_get(material_id) → get kc1.1, mc, Taylor C/n
├── machine_get(machine_id) → get spindle specs, power limits
├── tool_get(tool_id) OR tool_recommend(material, operation)
│
PHASE 2 — CALCULATE (sequential, each feeds next)
├── calc_speed_feed(material, tool, operation) → Vc, fz, n
├── calc_cutting_force(Vc, fz, ap, ae, D, z, kc1.1, mc) → Fc, Ff, Fp
├── calc_power(Fc, Vc, D) → P_required, Torque
├── calc_mrr(Vc, fz, ap, ae, D, z) → MRR, time estimate
├── calc_tool_life(Vc, Taylor_C, Taylor_n) → T minutes
├── calc_surface_finish(fz, nose_radius) → Ra, Rz
│
PHASE 3 — SAFETY VALIDATION (mandatory, parallel OK)
├── check_spindle_torque(torque_required, machine_specs) → SAFE/UNSAFE
├── check_spindle_power(P_required, machine_specs) → SAFE/UNSAFE
├── predict_tool_breakage(Fc, tool_specs) → risk level
├── check_chip_load_limits(fz, tool_specs, material) → PASS/FAIL
├── calc_deflection(Fc, tool_D, overhang) → deflection mm
├── calc_stability(kc, stiffness, damping, fn, z) → stable/chatter
│
PHASE 4 — OPTIMIZATION (if Phase 3 passes)
├── calc_cost_optimize(Taylor, rates, tool_cost) → Vc_optimal
├── calc_productivity(all params) → full economics
│
PHASE 5 — COOLANT (if drilling/deep pocket)
├── get_coolant_recommendations(material, operation) → method
├── validate_coolant_flow(method, params) → adequate
├── calculate_chip_evacuation(if drilling, L/D ratio) → strategy
│
PHASE 6 — REPORT
└── Compile all results with safety verdicts
```

**Hard stops**: If Phase 3 returns ANY UNSAFE → do NOT proceed. Recalculate with reduced parameters.

### CHAIN 2: Drilling Operation
**Trigger**: "Drill [size] hole in [material]"

```
├── material_get → properties
├── calc_speed_feed(drilling) → Vc, f
├── calc_cutting_force → thrust force
├── check_spindle_torque → safe?
├── check_pullout_resistance(thrust, clamping) → safe?
├── calculate_chip_evacuation(depth/diameter ratio) → peck strategy
├── check_through_spindle_coolant(if available) → pressure OK?
├── IF L/D > 3: validate_coolant_flow + peck cycle mandatory
├── predict_tool_breakage → risk
└── Report with peck parameters if deep hole
```

### CHAIN 3: Threading Operation
**Trigger**: "Thread [spec] in [material]"

```
├── get_thread_specifications(thread_spec) → all dimensions
├── calculate_tap_drill(spec, engagement%) → drill size
├── IF tapping:
│   ├── select_thread_insert(spec, material, volume)
│   ├── calculate_thread_cutting_params(speed, feed, passes)
│   ├── validate_thread_fit_class(spec, tolerance)
│   └── generate_thread_gcode(all params)
├── IF thread milling:
│   ├── calculate_thread_mill_params(tool, thread_spec)
│   ├── calc_cutting_force → verify
│   └── generate_thread_gcode(thread_mill mode)
├── get_go_nogo_gauges(spec) → inspection dimensions
└── check_spindle_torque(tapping torque) → safe?
```

### CHAIN 4: 5-Axis Operation
**Trigger**: "5-axis machining" or tilted tool operations

```
├── [Standard Chain 1 for parameters]
├── check_5axis_head_clearance(orientation, fixtures) → CRITICAL
├── check_fixture_clearance(position) → clearance OK?
├── validate_rapid_moves(toolpath) → no crashes?
├── detect_near_miss(toolpath) → any close calls?
├── toolpath_strategy_select(feature, material, machine)
├── calc_engagement(ae, D, fz) → chip thinning
├── IF HSM: calc_hsm(feedrate, D, tolerance) → corner slowdown
├── calc_scallop(stepover, tool_radius) → surface quality
└── generate_collision_report(full toolpath) → final verdict
```

### CHAIN 5: Toolpath Strategy Selection
**Trigger**: "Best strategy for [feature]"

```
├── toolpath_strategy_select(feature, material, constraints)
├── toolpath_material_strategies(material_id) → what works
├── toolpath_params_calculate(strategy, material, tool)
├── IF adaptive/trochoidal: calc_trochoidal(params) → stepover, depth
├── IF HSM: calc_hsm(feedrate, D) → min radius, accel
├── IF 3D surface: calc_scallop + calc_stepover → quality
├── calc_cycle_time(distances, feeds) → production time
└── toolpath_prism_novel() → check PRISM innovations
```

### CHAIN 6: Material Addition/Validation
**Trigger**: "Add [material] to database"

```
├── material_search(name) → does it already exist?
├── validate_kienzle(kc1.1, mc, iso_group) → coefficients OK?
├── validate_taylor(C, n, iso_group) → tool life OK?
├── IF has JC: validate_johnson_cook(A,B,C,m,n) → constitutive OK?
├── validate_completeness(material) → ≥80% coverage?
├── validate_safety(material) → S(x) ≥ 0.70?
├── validate_material(material, strict=true) → combined check
├── validate_anti_regression(old_file, new_file) → no data loss
└── omega_compute(R,C,P,S,L) → Ω ≥ 0.70?
```

### CHAIN 7: Alarm Troubleshooting
**Trigger**: "Got alarm [code] on [controller]"

```
├── alarm_decode(code, controller) → description, severity
├── alarm_fix(alarm_id) → step-by-step procedure
├── IF servo alarm: alarm_search(category="SERVO") → related alarms
├── IF spindle alarm: get_spindle_safe_envelope() → check limits
├── IF overtravel: validate_rapid_moves() → check G0 moves
├── knowledge_cross_query(alarm + machine context) → related info
└── skill_recommend("troubleshoot [controller] alarm") → relevant skills
```

### CHAIN 8: New Tool Development
**Trigger**: "Build new [tool/feature] for PRISM"

```
PHASE 0 — GATE (mandatory)
├── knowledge_search(concept) → does it already exist?
├── skill_recommend(task) → existing skills to reference?
├── prism_code_search(pattern) → any partial implementation?
│ ★ HARD STOP if it already exists — wire it, don't rebuild
│
PHASE 1 — DESIGN
├── prism_sp_brainstorm(goal, constraints) → get approval
├── prism_code_template(pattern) → get boilerplate
│
PHASE 2 — BUILD
├── Write code (JS to dist/ or TS to src/)
├── prism_build() → pass/fail
│
PHASE 3 — TEST
├── Call tool via MCP → verify output
├── validate_anti_regression(if replacing) → no loss
│
PHASE 4 — VALIDATE
├── sp_review_spec(requirements vs deliverables)
├── sp_review_quality(structure, edge cases, safety)
├── ralph_loop(code) → if API key available
├── omega_compute → Ω ≥ 0.70?
│
PHASE 5 — INTEGRATE
├── Phase Checklist: skills→hooks→GSD→memories→orchestrators→state→scripts
├── prism_build() → final build
└── Restart Claude Desktop
```

### CHAIN 9: Debugging
**Trigger**: Any error or unexpected behavior

```
PHASE 1 — EVIDENCE (no guessing)
├── prism_sp_debug(phase="EVIDENCE")
├── Read error logs, outputs, tool results
├── prism_error_preserve(error details) → Law 5
│
PHASE 2 — ROOT CAUSE
├── prism_sp_debug(phase="ROOT_CAUSE")
├── prism_code_search(error pattern) → find source
├── Trace data flow
│
PHASE 3 — HYPOTHESIS
├── prism_sp_debug(phase="HYPOTHESIS")
├── Propose fix with reasoning
│
PHASE 4 — FIX
├── prism_sp_debug(phase="FIX")
├── Apply minimal targeted fix
├── prism_build() → verify
├── Test fix
└── validate_anti_regression(if file replaced)
```

### CHAIN 10: Audit/Gap Analysis
**Trigger**: "Check system health" or periodic review

```
├── prism_registry_status() → loaded counts
├── prism_working_tools(all) → callable tools
├── knowledge_stats() → registry coverage
├── prism_hook_coverage_v2() → hook gaps
├── prism_hook_gaps_v2() → missing hooks
├── prism_hook_failures_v2() → recent errors
├── DC:list_directory src/tools/ → source files
├── Compare: registered vs imported vs functional
└── Prioritize findings by safety impact
```

---

## HOOK FIRING SCHEDULE

### Currently Registered (25 hooks) — ALL decorative
| Hook | Event | When It Should Fire | Currently Fires? |
|------|-------|-------------------|-----------------|
| SYS-LAW1 | output.generate | Before ANY calc output | ❌ Never |
| SYS-LAW4 | data.replace | Before ANY file replacement | ❌ Never |
| BAYES-001 | session.start | At session boot | ❌ Never |
| RL-001 | task.complete | After each completed task | ❌ Never |
| PROC-CHECKPOINT-001 | item.complete | Every 5-8 items | ❌ Never |
| PROC-BUFFER-001 | tool.call | Every tool call | ❌ Never |
| DATA-VALIDATE-001 | data.save | Before any persistence | ❌ Never |
| VAL-QUALITY-001 | output.publish | Before shipping output | ❌ Never |

### autoHookWrapper.ts (dead) — Would Auto-Fire
| Trigger | Hook | Action |
|---------|------|--------|
| Any calc_* tool call | CALC-BEFORE-EXEC-001 | Log + validate inputs |
| Any calc_* result | CALC-AFTER-EXEC-001 | Validate output |
| Any calc_* result | INTEL-PROOF-001 | Λ(x) safety proof |
| Any calc_* with Λ < 0.5 | CALC-SAFETY-VIOLATION-001 | HARD BLOCK |
| Any web_search/fetch | INTEL-FACT-001 | Φ(x) claim verify |
| Any tool error | REFL-002 | Error analysis |

---

## MISSING HOOKS (should exist but don't)

| Need | Event | Severity |
|------|-------|----------|
| Safety chain after cutting force | calculation.force.complete | 🔴 Critical |
| Spindle check after power calc | calculation.power.complete | 🔴 Critical |
| Auto-coolant check for drilling | operation.drilling.start | 🟡 High |
| Workholding check before machining | operation.machining.start | 🟡 High |
| Collision check for 5-axis | operation.5axis.start | 🔴 Critical |
| Thread spec validation | operation.threading.start | 🟡 High |
| Material existence check before create | material.create.before | 🟢 Medium |
| Anti-regression before any write | file.replace.before | 🔴 Critical |

---

## COGNITIVE TOOL PLACEMENT

Currently ceremonial. Here's when they should actually fire:

| Tool | Concrete Trigger | Value |
|------|-----------------|-------|
| `cognitive_init` | Session boot (in session_boot chain) | Set priors for task domain |
| `cognitive_check` | Before shipping any safety-critical output | Verify R,C,P,S,L scores |
| `cognitive_bayes BAYES-001` | When loading prior session data | Initialize from history |
| `cognitive_bayes BAYES-002` | After unexpected result vs expectation | Detect drift |
| `cognitive_bayes BAYES-003` | During debugging Phase 3 (hypothesis) | Test fix hypothesis |
| `cognitive_rl RL-001` | After session_end (record state continuity) | Persist learning |
| `cognitive_rl RL-002` | After successful task completion | Record positive outcome |
| `cognitive_rl RL-003` | After failed approach is fixed | Update policy |

---

## WORKING_TOOLS CONSTANT GAPS

The `WORKING_TOOLS` in AutoPilotV2.ts is missing:

| Category | Missing Tools |
|----------|--------------|
| calculations | `calc_speed_feed`, `calc_chip_load` (2 extra in calculationsV2) |
| calculations_advanced | `calc_cost_optimize`, `calc_multi_optimize`, `calc_productivity` |
| calculations_toolpath | `calc_engagement`, `calc_trochoidal`, `calc_hsm`, `calc_scallop`, `calc_stepover`, `calc_cycle_time`, `calc_arc_fit` |
| safety_collision | All 8 collision tools (only 4 generic names listed) |
| safety_spindle | All 5 spindle tools |
| safety_breakage | All 5 tool breakage tools |
| safety_coolant | All 5 coolant tools |
| safety_workholding | All 6 workholding tools |
| threading | All 12 threading tools |
| toolpath_strategy | All 8 toolpath strategy tools |
| integrated_physics | `prism_speed_feed`, `prism_cutting_force`, `prism_tool_life`, `prism_formula_calc` |
| validation | All 8 validation tools |
| enum | `dev_tools` missing from z.enum |

**Total missing from WORKING_TOOLS**: ~80 tools not cataloged

---

## RALPH LOOP POSITIONING

| Context | Mandatory? | When |
|---------|-----------|------|
| Safety-critical calculation output | ✅ YES | After Phase 3 of Chain 1 |
| New tool/feature code | ✅ YES | Phase 4 of Chain 8 |
| Material database addition | ✅ YES | Before final commit |
| GSD/protocol document changes | 🟡 Recommended | After edit, before build |
| Simple data queries | ❌ No | Skip — overhead not justified |
| Debugging fixes | 🟡 Recommended | After fix applied |
| Alarm troubleshooting | ❌ No | Information retrieval only |

---

## PRIORITIZED ACTION ITEMS

### 🔴 P0 — Wire autoHookWrapper.ts (biggest single improvement)
- Import in index.ts
- Wrap calc tool registrations with `wrapToolWithAutoHooks()`
- Enables automatic Λ(x) + Φ(x) + error handling on ALL calculations
- Estimated effort: 1 session, ~15 tool calls

### 🔴 P1 — Expand WORKING_TOOLS constant
- Add all 80+ missing tools to their proper categories
- Add `dev_tools` to z.enum
- Enables autopilot_v2 to properly classify and route tasks
- Estimated effort: 1 session, ~10 tool calls

### 🟡 P2 — Create hook registry for safety chains
- Register new hooks: CALC-FORCE-SAFETY, POWER-SPINDLE-CHECK, DRILL-COOLANT-CHECK
- Wire into autoHookWrapper pattern
- Estimated effort: 1-2 sessions

### 🟡 P3 — Wire cognitive tools into session lifecycle
- cognitive_init in session_boot
- cognitive_check before safety-critical outputs
- RL hooks in session_end
- Estimated effort: 1 session

### 🟢 P4 — Document chain sequences as executable skills
- Create prism-chain-machining-setup skill
- Create prism-chain-drilling skill
- Create prism-chain-threading skill
- Enables skill_recommend to surface chains
- Estimated effort: 2-3 sessions

### 🟢 P5 — Create orchestration engine
- New tool: `prism_chain_execute(chain_type, params)`
- Auto-runs the full chain for a task type
- Returns compiled results with safety verdicts
- Estimated effort: 3-5 sessions (significant)

---

## VERDICT

The tools exist. The hooks exist. The auto-wrapper exists. The cognitive framework exists.

**They're just not connected to each other.**

It's like having a fully equipped machine shop where every tool is on the shelf, every fixture is in the cabinet, every gauge is calibrated — but there are no setup sheets telling the operator which tools to pull for which job, in what order, and what to verify before starting the cut.

This document IS that setup sheet. The action items convert it from documentation into enforcement.



---

## SCRUTINY LOOP FINDINGS

### Loop 1: Missing Tool Categories
- contextEngineeringTools.ts (14 tools) — Laws/KV/context tools. Already in session bucket. ✅
- geometry/index.ts — stub file, 13 lines. Not significant.
- intelligence/*.py — Python-side tools, not MCP-registered. Future integration candidate.

### Loop 2: Chain Input/Output Verification ✅
- `calc_cutting_force.Fc` → `calc_power.cutting_force` ✅ Compatible
- `calc_cutting_force.Fc` → `calc_deflection.cutting_force` ✅ Compatible
- `calc_power.power_at_spindle` → `check_spindle_power` ✅ Compatible
- `calc_power.torque` → `check_spindle_torque` ✅ Compatible
- Parameter naming is consistent across tool boundaries

### Loop 3: Edge Cases & Missing Sequences

**🔴 GAP: Chain 1 missing Phase 0 — Workholding Validation**
Before ANY machining, workholding must be validated:
```
PHASE 0 — WORKHOLDING (before cutting)
├── calculate_clamp_force_required(expected_Fc, fixture_type)
├── validate_workholding_setup(clamp_force, cutting_forces)
├── IF drilling: check_pullout_resistance(thrust_force)
├── analyze_liftoff_moment(Fc, moment_arm, clamp_arm)
└── ★ HARD STOP if workholding insufficient
```

**🔴 GAP: Chain 1 missing calc_thermal**
For superalloys (S group), stainless (M group), and titanium:
```
After Phase 2:
├── calc_thermal(Vc, fz, ap, kc, thermal_conductivity) → temperature
├── IF T > 600°C for carbide: REDUCE cutting speed
├── IF T > material phase change temp: HARD STOP
```

**🟡 GAP: No compound operation chain**
When a job includes multiple operation types (milling + drilling + threading):
```
CHAIN 11: Compound Operation
├── Decompose into individual operations
├── Run Chain 1/2/3 for each operation
├── Cross-validate: total power across all ops
├── Cross-validate: fixture can handle worst-case forces
├── Cross-validate: coolant strategy covers all ops
├── calc_cycle_time(sum of all operations)
└── calc_productivity(combined economics)
```

**🟡 GAP: No comparison workflow**
When user asks "which approach is better?":
```
CHAIN 12: Approach Comparison
├── Define Option A parameters → run Chain 1
├── Define Option B parameters → run Chain 1
├── material_compare(if different materials)
├── calc_multi_optimize(weights for each priority)
├── Side-by-side: MRR, tool life, cost, surface finish, safety
└── Recommendation with tradeoff analysis
```

**🟢 LOW: autoHookWrapper.ts references hooks that don't exist in registry**
- CALC-BEFORE-EXEC-001, CALC-AFTER-EXEC-001: Not in 25-hook registry
- INTEL-PROOF-001, INTEL-FACT-001: Not registered
- REFL-002: Not registered
- CALC-SAFETY-VIOLATION-001: Not registered
→ The wrapper creates/fires them dynamically, but they should be formally registered for hook_list/coverage tracking.

### Loop 4: Sequencing Optimizations

**Parallel execution opportunities in Chain 1:**
- Phase 3 safety checks are ALL independent → can run parallel
- `check_spindle_torque` + `check_spindle_power` + `predict_tool_breakage` simultaneously
- `calc_deflection` + `calc_stability` simultaneously
- Currently documented as sequential — should note parallel OK

**Pre-computation opportunities:**
- Material properties (kc1.1, mc, Taylor C/n) are reused across multiple chains
- Machine specs (spindle power, torque curve) are reused
- Should cache after first fetch rather than re-fetching

---

## UPDATED PRIORITY LIST (post-scrutiny)

| Priority | Item | Impact | Effort |
|----------|------|--------|--------|
| P0 | Wire autoHookWrapper.ts | All calc tools get auto-safety | 1 session |
| P0 | Add workholding Phase 0 to Chain 1 | Prevents fixture failures | Documentation |
| P0 | Add calc_thermal to Chain 1 for S/M groups | Prevents thermal damage | Documentation |
| P1 | Expand WORKING_TOOLS (+80 tools) | Proper autopilot routing | 1 session |
| P1 | Register missing hooks in registry | Coverage tracking | 1 session |
| P2 | Wire cognitive tools to lifecycle | Learning across sessions | 1 session |
| P2 | Create compound operation chain | Real-world jobs | Documentation + 1 session |
| P3 | Create comparison workflow | Decision support | 1 session |
| P3 | Document chain skills for skill_recommend | Discoverability | 2 sessions |
| P4 | Build orchestration engine tool | Full automation | 3-5 sessions |



---

## IMPLEMENTATION LOG

### 2026-02-06 Session 46: autoHookWrapper Wired (P0 COMPLETE)

**What was done:**
1. Added import: `import { wrapToolWithAutoHooks, AUTO_HOOK_CONFIG } from "./tools/autoHookWrapper.js"`
2. Created server proxy in `registerTools()` that intercepts `server.tool()` calls
3. Proxy auto-wraps handler for any tool matching `AUTO_HOOK_CONFIG.calcTools` (24 tools)
4. Removed duplicate `registerOmegaTools` import (was causing potential compilation issue)
5. Proxy restores `server.tool` to original after registration completes
6. Reports count of wrapped tools in startup log

**Build result:** PASSED (111ms esbuild)
**Bundle verification:** Proxy code at line 91743, Λ(x) validation at line 55189
**Tool name verification:** All 24 calc tool names match registered tools

**What this enables (after restart):**
- Every calc tool call auto-fires CALC-BEFORE-EXEC-001 (input validation)
- Every calc result auto-fires CALC-AFTER-EXEC-001 (output validation)
- Every calc result runs Λ(x) proof validation (INTEL-PROOF-001)
- Λ < 0.5 triggers CALC-SAFETY-VIOLATION-001 (hard block + warning injection)
- Every tool error auto-fires REFL-002 (error analysis)
- All hook executions logged to history (1000 entry ring buffer)

**Remaining P0 items:**
- ✅ Wire autoHookWrapper.ts — DONE
- 📋 Add workholding Phase 0 to Chain 1 — documentation update
- 📋 Add calc_thermal to Chain 1 for S/M groups — documentation update
