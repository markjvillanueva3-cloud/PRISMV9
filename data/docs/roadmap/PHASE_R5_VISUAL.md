# PHASE R5: VISUAL PLATFORM    v14.2 (STUB    expand via Brainstorm-to-Ship at phase start)
### RECOMMENDED_SKILLS: prism-design-patterns, prism-perf-patterns
### HOOKS_EXPECTED: DISPATCH, FILE, STATE, BATCH
### DATA_PATHS: C:\PRISM\mcp-server\src

# Status: not-started | Sessions: 4-5 | Role: Platform Engineer
# DEPENDS ON: R4 complete (API layer + auth), R3 complete (intelligence data for UI)
# v14.0: UI FEATURE LIST EXPANDED with R3 intelligence features.
#         The original v13.9 stub had 5 dashboard objectives. v14.0 adds 7 more UI components
#         powered by the new intelligence actions from R3:
#           - Job Planner Page (job_plan â†’ formatted plan with G-code)
#           - Calculator Page (9 formula_calculate formulas with interactive inputs)
#           - Toolpath Advisor (strategy_for_job â†’ visual strategy comparison)
#           - Tool Selector (tool_facets â†’ filterable tool catalog with indexed search)
#           - Machine Compatibility Matrix (machine_recommend â†’ part fit visualization)
#           - What-If Analysis (what_if â†’ parameter sensitivity visualization)
#           - Material Comparator (material_substitute â†’ side-by-side property comparison)
#         All other v13.9 content (mandatory requirements, tool anchors, Opus patterns) unchanged.
#
# v13.9: Cross-Audit Governance Hardening    artifact manifest, fault injection, test levels.
# v13.5: Authentication, dual build pipeline, v1 API. All retained.

---

<!-- ANCHOR: r5_quick_reference_standalone_after_compaction_no_other_doc_needed -->
## QUICK REFERENCE (standalone after compaction    no other doc needed)
```
BUILD:      npm run build (NEVER standalone tsc    OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit â†’ git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails â†’ try different approach. 6 total â†’ skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R5 = Claude Code 100% | Sonnet. Product Designer. Parallel with R4.
```

---

<!-- ANCHOR: r5_knowledge_contributions_what_this_phase_feeds_into_the_hierarchical_index -->
## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
```
BRANCH 1 (Execution Chain): Visualization pipeline    data query â†’ transform â†’ render chains.
BRANCH 4 (Session Knowledge): Chart type selection rationale, performance thresholds for
  large dataset rendering, accessibility decisions, color scheme choices for manufacturing context.
AT PHASE GATE: CODEBASE_INDEX.json updated with visualization dispatcher chains.
```

---

<!-- ANCHOR: r5_context_bridge -->
## CONTEXT BRIDGE

WHAT CAME BEFORE: R4 established enterprise infrastructure (multi-tenant, compliance, data
residency, structured logging). R3 built intelligence features (job_plan, wear_prediction,
process_cost, uncertainty_chain, strategy_for_job, material_substitute, machine_recommend,
controller_optimize, what_if, formula_calculate, tool_facets, unified_search, thread_recommend).
All safety baselines from R2 maintained.

WHAT THIS PHASE DOES: Build visual reporting and dashboard layer. Operator-facing interfaces
for ALL intelligence features from R3 plus safety monitoring, alarm resolution, and tool life
tracking. The UI makes PRISM accessible to machinists who don't interact via MCP.

WHAT COMES AFTER: R6 (Production Hardening) integrates visual layer with production safeguards.

ARTIFACT MANIFEST (XA-1):
  REQUIRES: PHASE_FINDINGS.md (R4 section)
  PRODUCES: PHASE_FINDINGS.md (R5 section), src/__tests__/dashboardData.test.ts

  ACTION DEPENDENCY CHECK (Roadmap Audit 2026-02-17 Finding 13):
  Before expanding this stub, verify these actions exist and respond.
  Run: prism_autopilot_d action=working_tools
  REQUIRED (from R3 - will NOT exist until R3 completes):
    prism_data: job_plan, strategy_for_job, strategy_compare, material_substitute,
                machine_recommend, what_if, tool_facets, unified_search, formula_calculate
    prism_thread: thread_recommend
  REQUIRED (from R1/R2 - should exist by R5 start):
    prism_data: material_get, alarm_decode, tool_search, tool_get
    prism_calc: speed_feed, tool_life
    prism_validate: safety
    prism_ralph: assess
    prism_omega: compute
    prism_pfp: analyze
  IF ANY REQUIRED ACTION IS MISSING:
    Do NOT proceed with expansion. The UI component that depends on it will
    have no data source. Either complete the prerequisite phase first, or
    mark the dependent MS as BLOCKED with specific missing action noted.

TEST LEVELS: L1-L3 required (unit + contract + integration)

FAULT INJECTION TEST (XA-13):
  R5 FAULT TEST: Return malformed data from API â†’ verify dashboard shows error, not garbage.
  WHEN: After dashboard data binding is working.
  HOW: Temporarily modify a dispatcher to return invalid JSON for one field.
  EXPECTED: Dashboard displays meaningful error message, not NaN/undefined/blank.
  PASS: User sees "Data unavailable" or similar. No misleading numbers displayed.
  FAIL: Dashboard renders garbage data that an operator might act on.
  EFFORT: ~5 calls.

---

<!-- ANCHOR: r5_mandatory_requirements_brainstorm_must_include_all_of_these -->
## MANDATORY REQUIREMENTS (brainstorm MUST include ALL of these)

```
0. TECHNOLOGY STACK DECISION (must be made during brainstorm, before any MS):
   Select and document: Frontend framework, bundler, UI library, hosting model.
1. All dependency versions pinned (no ^ or ~    Law 7)
2. Color-blind accessible status indicators (NOT red/green only)
3. Bundle size budget: initial load <500KB, lazy-load all non-critical routes
4. Loading states for ALL async data (no blank screens)
5. Error states for ALL API calls (actionable errors, not generic)
6. All data from verified dispatcher calls (no hardcoded demo data)
7. Semantic HTML for accessibility (machinists may use screen readers in noisy shops)
8. Code-split by route (each dashboard loads independently)
9. AUTHENTICATION REQUIRED (SL-3)
10. DUAL BUILD PIPELINE (OB-5): npm run build compiles BOTH server AND frontend
11. BUILD AGAINST v1 API (AG-8)
```

<!-- ANCHOR: r5_stub_objectives_expand_at_phase_start_using_phase_template_md -->
## STUB OBJECTIVES (expand at phase start using PHASE_TEMPLATE.md)

<!-- ANCHOR: r5_original_from_v13_9 -->
### ORIGINAL (from v13.9):
1. Safety dashboard: Real-time S(x) scores across active jobs
2. Alarm resolution UI: Operator-facing alarm decode with resolution steps
3. Report generation: Comprehensive safety audit reports
4. Tool life tracking: Visual tool wear curves with PFP predictions
5. Parameter recommendation UI: Operator inputs material + operation â†’ safe parameters

<!-- ANCHOR: r5_new_v14_0_powered_by_r3_intelligence_features -->
### NEW (v14.0    powered by R3 intelligence features):
6. **Job Planner Page**: Full-screen job planning interface
   - Material/operation/machine dropdowns (data from registries)
   - "Generate Plan" button â†’ calls job_plan action
   - Display: pass strategy diagram, parameters table, G-code preview, safety status
   - Export: Setup sheet PDF, G-code file download
   - Data source: job_plan, setup_sheet actions

7. **Calculator Page**: Interactive manufacturing calculator
   - 9 formula cards (RPM, Feed Rate, MRR, Power, Torque, Surface Finish Ã—2, Cost, Taylor)
   - Each card: input fields â†’ live output as user types
   - Equation display (LaTeX rendered)
   - Input validation (min/max from formula schema, red borders on invalid)
   - Data source: formula_calculate action with F-CALC-001 through F-CALC-009

8. **Toolpath Advisor**: Strategy recommendation interface
   - Feature selector (pocket, slot, contour, facing, drilling, threading)
   - Material selector (from material registry)
   - Machine config (axes, spindle type)
   - "Get Strategies" â†’ calls strategy_for_job action
   - Display: top 3 strategies with pros/cons cards, parameter presets
   - Compare mode: side-by-side strategy comparison (strategy_compare action)
   - Data source: strategy_for_job, strategy_compare, novel_strategies, category_browse

9. **Tool Selector**: Filterable tool catalog with faceted search
   - Category filter sidebar (TURNING_INSERTS, MILLING, DRILLING, etc.)
   - Vendor filter (checkboxes with counts)
   - Diameter range slider
   - Coating filter
   - Real-time count update as filters change
   - Tool detail modal on click
   - Data source: tool_facets action (filter counts), tool_search (results), tool_get (detail)

10. **Machine Compatibility Matrix**: Part-machine fit checker
    - Input: part dimensions (X, Y, Z), material, operation, required axes
    - "Find Machines" â†’ calls machine_recommend action
    - Display: ranked machine list with fit visualization
    - Score breakdown: power margin, speed margin, envelope fit
    - Data source: machine_recommend action

11. **What-If Analysis**: Parameter sensitivity explorer
    - Base job definition (material, operation, machine)
    - Slider for parameter change (Vc, fz, ap, ae)
    - Live update of impact metrics (tool life, power, cost, safety)
    - Traffic light indicators: green (improvement), red (degradation), yellow (trade-off)
    - Data source: what_if action

12. **Material Comparator**: Substitution analysis
    - Source material selector
    - Reason selector (cost, availability, machinability, performance)
    - Side-by-side property comparison table
    - Machinability improvement % visualization
    - Data source: material_substitute action


<!-- ANCHOR: r5_milestone_assignments_apply_during_brainstorm_to_ship_expansion -->
## MILESTONE ASSIGNMENTS (apply during Brainstorm-to-Ship expansion)

| MS | Role | Model | Effort | Sessions |
|-----|------|-------|--------|----------|
| MS0: Dashboard Framework + Components | UX Architect | Opus (component arch) then Sonnet (React impl) | L (18 calls) | 2 |
| MS1: Calculator Page (9 formulas) | UX Architect | Sonnet (UI) then Opus (formula display accuracy) | M (12 calls) | 1 |
| MS2: Job Planner + Toolpath Advisor | UX Architect | Sonnet (page impl + data binding) | M (10 calls) | 1 |
| MS3: Real-Time Monitoring Dashboard | UX Architect | Sonnet (charts + WebSocket) | M (12 calls) | 1 |
| MS4: Report Generation + Export | UX Architect | Sonnet (PDF/Excel generation) | S (6 calls) | 0.5 |
| MS5: Phase Gate | UX Architect | Sonnet (tests) then Opus (UX review + gate) | S (6 calls) | 0.5 |

**Safety Rule:** Calculator page (MS1) requires Opus review of formula display accuracy.
**Bulk Rule:** No Haiku work in R5 (all UI requires design judgment).

<!-- ANCHOR: r5_tool_anchors_concrete_starting_points_for_brainstorm_to_ship_expansion -->
## TOOL ANCHORS (concrete starting points for Brainstorm-to-Ship expansion)

```
DASHBOARD DATA SOURCES    Every visual component is powered by a specific dispatcher call.
The brainstorm expander MUST map each UI component to its data source.

SAFETY DASHBOARD (real-time S(x) scores):
  Data source: prism_validate action=safety  [effort=max, structured output]
  Refresh: prism_calc action=speed_feed material="[active]" operation="[active]"  [effort=max, structured output]
  Display: S(x) score with color indicator (color-blind accessible: use shape + color).
  Update frequency: On-demand (operator requests) or per-job (when new job starts).

ALARM RESOLUTION UI (operator-facing):
  Data source: prism_data action=alarm_decode controller="[selected]" alarm="[entered]"  [effort=high, structured output]
  Display: alarm description, severity (info/warning/error/critical), resolution steps.
  Follow-up: prism_knowledge action=search query="[alarm description]"  [effort=high]
  â†’ Show related knowledge articles alongside resolution steps.

REPORT GENERATION (comprehensive safety audit reports):
  Data sources:
    prism_ralph action=assess target="[report_scope]"  [effort=max]
    prism_omega action=compute target="[report_scope]"  [effort=max]
    prism_doc action=read name=R2_CALC_RESULTS.md  [effort=low]  â†’ historical baselines
  Output: Single-pass report via 128K output with streaming (.stream() + .get_final_message()).
  Store: prism_doc action=write name=SAFETY_AUDIT_REPORT_[date].md  [effort=low]

TOOL LIFE TRACKING (visual wear curves):
  Data source: prism_calc action=tool_life material="[selected]" operation="[selected]"  [effort=max, structured output]
  PFP overlay: prism_pfp action=analyze target="[tool] [machine_hours]"  [effort=max]
  Display: Taylor curve + PFP prediction overlay. X=time, Y=wear. Threshold line at replacement point.

PARAMETER RECOMMENDATION UI (operator inputs â†’ safe parameters):
  Data flow:
    1. Operator selects: material (dropdown) + operation (dropdown) + machine (dropdown)
    2. Backend: prism_data action=material_get material="[selected]"  [effort=high]
    3. Backend: prism_calc action=speed_feed material="[selected]" operation="[selected]"  [effort=max, structured output]
    4. Display: Vc, fz, ap, n_rpm, Fc, tool_life_min, safety_score
    5. If safety_score < 0.70 â†’ display WARNING with explanation. Do NOT show parameters.

JOB PLANNER PAGE (v14.0    full-screen job planning):
  Data source: prism_data action=job_plan  [effort=max]
  Data flow:
    1. Operator inputs: material + operation + machine + total_stock + target_Ra
    2. Backend: job_plan chains 8 internal calls (material_get â†’ speed_feed â†’ multi_pass â†’
       machine_check â†’ tool_recommend â†’ coolant â†’ gcode â†’ safety)
    3. Display: pass strategy diagram, parameters table, G-code preview, safety status
    4. Export: setup_sheet action â†’ PDF format for shop floor printing

CALCULATOR PAGE (v14.0    9 interactive formulas):
  Data source: prism_data action=formula_calculate  [effort=medium]
  Display: 9 formula cards (RPM, Feed Rate, MRR, Power, Torque, Surface Finish Ã—2, Cost, Taylor)
  Each card: input fields â†’ live output as user types. Equation display (LaTeX rendered).
  Input validation: min/max from formula schema, red borders on invalid.

TOOLPATH ADVISOR (v14.0    strategy recommendations):
  Data source: prism_data action=strategy_for_job + strategy_compare  [effort=high]
  Data flow: Feature + Material + Machine axes â†’ top 3 strategies with pros/cons cards
  Compare mode: side-by-side strategy comparison with MRR/tool_life/surface_finish analysis

TOOL SELECTOR (v14.0    faceted search):
  Data source: prism_data action=tool_facets  [effort=low] + tool_search  [effort=high]
  Display: Category sidebar, vendor checkboxes with counts, diameter range slider, coating filter
  Real-time count update as filters change. Tool detail modal on click.

MACHINE COMPATIBILITY MATRIX (v14.0    part-machine fit):
  Data source: prism_data action=machine_recommend  [effort=high]
  Display: Ranked machine list with fit visualization, score breakdown

WHAT-IF ANALYSIS (v14.0    parameter sensitivity):
  Data source: prism_data action=what_if  [effort=high]
  Display: Slider for parameter change, live impact metrics, traffic light indicators

MATERIAL COMPARATOR (v14.0    substitution analysis):
  Data source: prism_data action=material_substitute  [effort=high]
  Display: Side-by-side property comparison table, machinability improvement % visualization

THREAD CALCULATOR (v14.0    thread recommendations):
  Data source: prism_thread action=thread_recommend  [effort=high]
  Display: Tap drill size, thread mill option, Go/NoGo limits

UNIFIED SEARCH BAR (v14.0    cross-registry search):
  Data source: prism_data action=unified_search  [effort=high]
  Display: Smart search bar that auto-detects query type and routes to appropriate registry

FAST MODE FOR DASHBOARD REFRESHES:
  Periodic status updates use speed: "fast" (LOW effort operations only).
  Dashboard refresh interval: 30s for status, 5min for full recalc.
  NEVER use Fast Mode for safety calcs feeding the parameter recommendation UI.

FINE-GRAINED STREAMING FOR LIVE UPDATES:
  eager_input_streaming: true on dashboard update tool definitions.
  Enables live parameter streaming to operator UI during calc execution.
```

<!-- ANCHOR: r5_opus_4_6_patterns_for_r5 -->
## OPUS 4.6 PATTERNS FOR R5

```
128K OUTPUT FOR REPORTS: Generate complete safety audit reports in single pass.
  Use streaming (.stream() + .get_final_message()) for reports >16K tokens.
  Flush-to-file for persistence after generation.

FINE-GRAINED TOOL STREAMING FOR DASHBOARDS:
  eager_input_streaming: true on dashboard update tools.
  Enables live parameter streaming to operator UI during calc execution.
  Operator sees partial results as they're computed, not after completion.

STRUCTURED OUTPUTS FOR UI DATA: All data feeding visual components schema-validated.
  Dashboard widgets receive guaranteed well-formed JSON. No runtime type errors in UI rendering.

FAST MODE FOR DASHBOARD REFRESHES: Periodic status updates use speed: "fast".
  Dashboard refresh rate improves without impacting safety calc depth.
```

<!-- ANCHOR: r5_gate_requirements -->
## GATE REQUIREMENTS
Ralph >= B+ | Omega >= 0.70 | Build passes (BOTH server + frontend    OB-5) |
All 17 UI components functional | Reports generate correctly | Authentication working (SL-3) |
No R2/R3 regressions | Bundle <500KB initial load

---

<!-- ANCHOR: r5_r5_companion_assets_v14_5_built_per_ms_verified_at_r5_ms5_gate -->
## R5 COMPANION ASSETS (v14.5 -- built per-MS, verified at R5-MS5 gate)

<!-- ANCHOR: r5_per_ms_companion_schedule -->
### PER-MS COMPANION SCHEDULE:
```
MS0 PRODUCES:
  SKILL: prism-dashboard-components (component library reference, props, usage patterns)

MS1 PRODUCES:
  HOOK: formula_display_accuracy (warning, post-render, verifies displayed calc matches engine)

MS3 PRODUCES:
  SKILL: prism-monitoring-dashboard (real-time data interpretation, alert thresholds)

MS4 PRODUCES:
  SCRIPT: report_generation_test (generates sample PDF/Excel, verifies formatting)

MS5 GATE VERIFIES:
  Hook fires, both skills load, report script passes
  SCRIPT: screenshot_regression (captures dashboard state for visual regression baseline)
```
