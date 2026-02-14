# PHASE R5: VISUAL PLATFORM — v13.9 (STUB — expand via Brainstorm-to-Ship at phase start)
# Status: not-started | Sessions: 4-5 | Role: Platform Engineer
# v13.9: Cross-Audit Governance Hardening — artifact manifest, fault injection, test levels (XA-1,13,7).
# v13.5: AUTHENTICATION REQUIRED on dashboard (SL-3 — operators must authenticate).
#         DUAL BUILD PIPELINE: npm run build must compile BOTH server AND frontend (OB-5).
#         Build against R4's v1 API (AG-8 — stable API contract).
# v13.3: Dashboard data source mapping added (every UI component → specific dispatcher call).
#         Parameter recommendation flow documented end-to-end.
# v13.0: 128K output for single-pass report generation. Fine-grained streaming for live dashboards.

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: R4 established enterprise infrastructure (multi-tenant, compliance, data residency, structured logging). All safety baselines from R2/R3 maintained.

WHAT THIS PHASE DOES: Build visual reporting and dashboard layer. Real-time safety monitoring. Operator-facing interfaces for alarm resolution, cutting parameter recommendations, and tool life tracking.

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
   The brainstorm MUST select and document:
     - Frontend framework (React recommended — matches PRISM skill set and shadcn/ui availability)
     - Bundler (Vite recommended for code-splitting and fast dev builds)
     - UI component library (shadcn/ui or Tailwind CSS for utility-first styling)
     - Hosting model: embedded in MCP server (single port)? Separate static site? Electron desktop?
   This decision affects ALL subsequent MS in R5. Document in expanded phase doc header.
1. All dependency versions pinned (verify package.json has NO ^ or ~ — Law 7)
2. Color-blind accessible status indicators (NOT red/green only — operators wear safety gear)
3. Bundle size budget: initial load <500KB, lazy-load all non-critical routes
4. Loading states for ALL async data (no blank screens while registries load)
5. Error states for ALL API calls (show actionable error, not generic "something went wrong")
6. All data displayed must come from verified dispatcher calls (no hardcoded demo data)
7. Semantic HTML for accessibility (machinists may use screen readers in noisy shops)
8. Code-split by route (System, Campaign, Calc, Alarm dashboards load independently)
9. AUTHENTICATION REQUIRED (SL-3):
   Dashboard must require operator authentication before showing safety-critical data.
   Authentication model decided during brainstorm: token-based, SAML, local users,
   or inherited from R4 API gateway auth. At minimum: username + API key.
   WHY: Unauthenticated dashboard → anyone on the network sees proprietary machining data
   and potentially modifies parameters. In a manufacturing environment, this is a safety risk.
10. DUAL BUILD PIPELINE (OB-5):
    npm run build MUST compile BOTH the MCP server AND the frontend.
    Add frontend build step to the existing build script (tsc --noEmit + esbuild + vite build).
    "Build passes" at the R5 gate means BOTH builds are green. Frontend type errors count.
    WHY: Without this, frontend code is never type-checked. "Build passes" is a false gate.
11. BUILD AGAINST v1 API (AG-8):
    All dashboard API calls target /v1/ endpoints from R4.
    If R4 API shape changes → R4 creates v2, R5 continues on v1 until migration.
```

## STUB OBJECTIVES (expand at phase start using PHASE_TEMPLATE.md)

1. Safety dashboard: Real-time S(x) scores across active jobs
2. Alarm resolution UI: Operator-facing alarm decode with resolution steps
3. Report generation: Comprehensive safety audit reports
4. Tool life tracking: Visual tool wear curves with PFP predictions
5. Parameter recommendation UI: Operator inputs material + operation, gets safe parameters

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
  SYSTEM_ACTIVATION_REPORT.md, REGISTRY_AUDIT.md, R2_CALC_RESULTS.md style reports
  generated without fragmented appends. Flush-to-file for persistence after generation.
  Use streaming (.stream() + .get_final_message()) for reports >16K tokens.

FINE-GRAINED TOOL STREAMING FOR DASHBOARDS:
  eager_input_streaming: true on dashboard update tools.
  Enables live parameter streaming to operator UI during calc execution.
  Operator sees partial results as they're computed, not after completion.

STRUCTURED OUTPUTS FOR UI DATA: All data feeding visual components schema-validated.
  Dashboard widgets receive guaranteed well-formed JSON.
  No runtime type errors in UI rendering.

FAST MODE FOR DASHBOARD REFRESHES: Periodic status updates use speed: "fast".
  Dashboard refresh rate improves without impacting safety calc depth.
```

## GATE REQUIREMENTS
Ralph >= B+ | Omega >= 0.70 | Build passes | Dashboard functional | Reports generate correctly
