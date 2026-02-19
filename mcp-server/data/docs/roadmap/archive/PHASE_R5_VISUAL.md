# PHASE R5: VISUAL PLATFORM — v14.0 (STUB — expand via Brainstorm-to-Ship at phase start)
# Status: not-started | Sessions: 4-5 | Role: Platform Engineer
# v14.0: UI FEATURE LIST EXPANDED with R3 intelligence features.
#         The original v13.9 stub had 5 dashboard objectives. v14.0 adds 7 more UI components
#         powered by the new intelligence actions from R3:
#           - Job Planner Page (job_plan → formatted plan with G-code)
#           - Calculator Page (9 formula_calculate formulas with interactive inputs)
#           - Toolpath Advisor (strategy_for_job → visual strategy comparison)
#           - Tool Selector (tool_facets → filterable tool catalog with indexed search)
#           - Machine Compatibility Matrix (machine_recommend → part fit visualization)
#           - What-If Analysis (what_if → parameter sensitivity visualization)
#           - Material Comparator (material_substitute → side-by-side property comparison)
#         All other v13.9 content (mandatory requirements, tool anchors, Opus patterns) unchanged.
#
# v13.9: Cross-Audit Governance Hardening — artifact manifest, fault injection, test levels.
# v13.5: Authentication, dual build pipeline, v1 API. All retained.

---

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

TEST LEVELS: L1-L3 required (unit + contract + integration)

FAULT INJECTION TEST (XA-13):
  R5 FAULT TEST: Return malformed data from API → verify dashboard shows error, not garbage.
  WHEN: After dashboard data binding is working.
  HOW: Temporarily modify a dispatcher to return invalid JSON for one field.
  EXPECTED: Dashboard displays meaningful error message, not NaN/undefined/blank.
  PASS: User sees "Data unavailable" or similar. No misleading numbers displayed.
  FAIL: Dashboard renders garbage data that an operator might act on.
  EFFORT: ~5 calls.

---

## MANDATORY REQUIREMENTS (brainstorm MUST include ALL of these)

```
0. TECHNOLOGY STACK DECISION (must be made during brainstorm, before any MS):
   Select and document: Frontend framework, bundler, UI library, hosting model.
1. All dependency versions pinned (no ^ or ~ — Law 7)
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

## STUB OBJECTIVES (expand at phase start using PHASE_TEMPLATE.md)

### ORIGINAL (from v13.9):
1. Safety dashboard: Real-time S(x) scores across active jobs
2. Alarm resolution UI: Operator-facing alarm decode with resolution steps
3. Report generation: Comprehensive safety audit reports
4. Tool life tracking: Visual tool wear curves with PFP predictions
5. Parameter recommendation UI: Operator inputs material + operation → safe parameters

### NEW (v14.0 — powered by R3 intelligence features):
6. **Job Planner Page**: Full-screen job planning interface
   - Material/operation/machine dropdowns (data from registries)
   - "Generate Plan" button → calls job_plan action
   - Display: pass strategy diagram, parameters table, G-code preview, safety status
   - Export: Setup sheet PDF, G-code file download
   - Data source: job_plan, setup_sheet actions

7. **Calculator Page**: Interactive manufacturing calculator
   - 9 formula cards (RPM, Feed Rate, MRR, Power, Torque, Surface Finish ×2, Cost, Taylor)
   - Each card: input fields → live output as user types
   - Equation display (LaTeX rendered)
   - Input validation (min/max from formula schema, red borders on invalid)
   - Data source: formula_calculate action with F-CALC-001 through F-CALC-009

8. **Toolpath Advisor**: Strategy recommendation interface
   - Feature selector (pocket, slot, contour, facing, drilling, threading)
   - Material selector (from material registry)
   - Machine config (axes, spindle type)
   - "Get Strategies" → calls strategy_for_job action
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
    - "Find Machines" → calls machine_recommend action
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

## TOOL ANCHORS (concrete starting points for Brainstorm-to-Ship expansion)

```
DASHBOARD DATA SOURCES — Every visual component is powered by a specific dispatcher call.
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
  → Show related knowledge articles alongside resolution steps.

REPORT GENERATION (comprehensive safety audit reports):
  Data sources:
    prism_ralph action=assess target="[report_scope]"  [effort=max]
    prism_omega action=compute target="[report_scope]"  [effort=max]
    prism_doc action=read name=R2_CALC_RESULTS.md  [effort=low]  → historical baselines
  Output: Single-pass report via 128K output with streaming (.stream() + .get_final_message()).
  Store: prism_doc action=write name=SAFETY_AUDIT_REPORT_[date].md  [effort=low]

TOOL LIFE TRACKING (visual wear curves):
  Data source: prism_calc action=tool_life material="[selected]" operation="[selected]"  [effort=max, structured output]
  PFP overlay: prism_pfp action=analyze target="[tool] [machine_hours]"  [effort=max]
  Display: Taylor curve + PFP prediction overlay. X=time, Y=wear. Threshold line at replacement point.

PARAMETER RECOMMENDATION UI (operator inputs → safe parameters):
  Data flow:
    1. Operator selects: material (dropdown) + operation (dropdown) + machine (dropdown)
    2. Backend: prism_data action=material_get material="[selected]"  [effort=high]
    3. Backend: prism_calc action=speed_feed material="[selected]" operation="[selected]"  [effort=max, structured output]
    4. Display: Vc, fz, ap, n_rpm, Fc, tool_life_min, safety_score
    5. If safety_score < 0.70 → display WARNING with explanation. Do NOT show parameters.

JOB PLANNER PAGE (v14.0 — full-screen job planning):
  Data source: prism_data action=job_plan  [effort=max]
  Data flow:
    1. Operator inputs: material + operation + machine + total_stock + target_Ra
    2. Backend: job_plan chains 8 internal calls (material_get → speed_feed → multi_pass →
       machine_check → tool_recommend → coolant → gcode → safety)
    3. Display: pass strategy diagram, parameters table, G-code preview, safety status
    4. Export: setup_sheet action → PDF format for shop floor printing

CALCULATOR PAGE (v14.0 — 9 interactive formulas):
  Data source: prism_data action=formula_calculate  [effort=medium]
  Display: 9 formula cards (RPM, Feed Rate, MRR, Power, Torque, Surface Finish ×2, Cost, Taylor)
  Each card: input fields → live output as user types. Equation display (LaTeX rendered).
  Input validation: min/max from formula schema, red borders on invalid.

TOOLPATH ADVISOR (v14.0 — strategy recommendations):
  Data source: prism_data action=strategy_for_job + strategy_compare  [effort=high]
  Data flow: Feature + Material + Machine axes → top 3 strategies with pros/cons cards
  Compare mode: side-by-side strategy comparison with MRR/tool_life/surface_finish analysis

TOOL SELECTOR (v14.0 — faceted search):
  Data source: prism_data action=tool_facets  [effort=low] + tool_search  [effort=high]
  Display: Category sidebar, vendor checkboxes with counts, diameter range slider, coating filter
  Real-time count update as filters change. Tool detail modal on click.

MACHINE COMPATIBILITY MATRIX (v14.0 — part-machine fit):
  Data source: prism_data action=machine_recommend  [effort=high]
  Display: Ranked machine list with fit visualization, score breakdown

WHAT-IF ANALYSIS (v14.0 — parameter sensitivity):
  Data source: prism_data action=what_if  [effort=high]
  Display: Slider for parameter change, live impact metrics, traffic light indicators

MATERIAL COMPARATOR (v14.0 — substitution analysis):
  Data source: prism_data action=material_substitute  [effort=high]
  Display: Side-by-side property comparison table, machinability improvement % visualization

THREAD CALCULATOR (v14.0 — thread recommendations):
  Data source: prism_thread action=thread_recommend  [effort=high]
  Display: Tap drill size, thread mill option, Go/NoGo limits

UNIFIED SEARCH BAR (v14.0 — cross-registry search):
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

## GATE REQUIREMENTS
Ralph >= B+ | Omega >= 0.70 | Build passes (BOTH server + frontend — OB-5) |
All 17 UI components functional | Reports generate correctly | Authentication working (SL-3) |
No R2/R3 regressions | Bundle <500KB initial load
