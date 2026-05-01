# PRISM WIRE EDM CALCULATOR WIRING ROADMAP — CWEDM-MS0
## Connect wire_edm tab to 51 EDM dispatcher actions | 5 Sessions | 12 Units

Generated: 2026-04-02 | Scrutiny Loop 2: 2026-04-02
Domain: Frontend ↔ Backend wiring for wire EDM calculator tab
Track: WEDM (aligned with WEDM-MS0/MS1 namespace)
Current state: Frontend wire_edm tab is UI-only (livePhysics=false, zero backend calls)
Backend state: PRODUCTION QUALITY — 51 actions, 19 engines, 304 tests passing
Pattern: Adapt client.ts getRequestHeaders() + sfOrchestrate() pattern for authenticated EDM calls
Prerequisites: WEDM-MS0 (built 51 actions + 19 engines), WEDM-MS1 (surface integrity + taper)

**Priority justification**: Wire EDM is a $2B+ market segment. Calculator wiring enables
physics-backed quoting and process planning for wire EDM jobs — directly supporting the
connected shop workflow spine (RFQ intake → calculator → quote). This is NOT cosmetic
calculator parity; it unlocks revenue-generating workflow for wire EDM job shops.

---

## GAP ANALYSIS

### What Backend Has (READY):
```
edmDispatcher (prism_edm): 51 actions across 19 engines
  Legacy (4): wire_settings, electrode_design, surface_integrity, micro_edm
  WEDM Pipeline (33): 12-stage P2P pipeline (geometry→feasibility→material→toolpath→
    multipass→cutting→wire/slug/corner→monitor→surface→gcode→cost→quality)
  Sinker (4), Laser (4), Waterjet (4), Geometry (2)
HTTP Routes: 26 authenticated endpoints on /api/v1/edm/*
Tests: 304 passing across 10 test files
```

### What Frontend Has (UI-ONLY):
```
CalculatorPage.tsx: wire_edm mode with operations, holders, brands, defaults
calculatorPrismMode.ts: Hardcoded $72/hr rate, static purchase tiers, no API calls
calculatorData.ts: 1 static FANUC machine, 0 wire tools, hardcoded taxonomy
calculatorWorkspace.ts: livePhysics = false → solve button DISABLED
calculatorCoolantStrategy.ts: Hardcoded "dielectric" with no variants
```

### The Gap:
```
web/src/api/wireEdm.ts              — DOES NOT EXIST (need API client with auth)
Calculator → wire_settings          — NOT WIRED (hardcoded defaults instead)
Calculator → wedm_full_multipass    — NOT WIRED (no pass plan display)
Calculator → wedm_optimize_params   — NOT WIRED (no cutting param solve)
Calculator → wedm_estimate_cost     — NOT WIRED (hardcoded $72/hr)
Calculator → wedm_predict_wire_break — NOT WIRED (no safety cards)
Calculator → wedm_calculate_corners — NOT WIRED (no corner compensation)
Calculator → wedm_solve_taper       — NOT WIRED (no taper solving)
Machine catalog wire_edm entries    — 1 STATIC (should load from MachineRegistry)
Wire/tool catalog                   — 0 ENTRIES (should load wire types from backend)
Result display for wire EDM         — EMPTY (no MRR, Ra, pass plan, wire tension shown)
livePhysics for wire_edm            — FALSE (solve button disabled)
```

---

## CROSS-ROADMAP COORDINATION

```
RELATIONSHIP TO V24 PHASES:
  Phase 10 (EDM Pipeline, 40 units): BACKEND engine work — no overlap, different scope.
    CWEDM-MS0 wires existing Phase-10-built engines to the calculator UI.
    Coordination: CWEDM-MS0 adds 4 new actions to edmDispatcher z.enum.
    Merge protocol: any Phase 10 session touching edmDispatcher z.enum must
    check for CWEDM-MS0 additions to avoid clobbering.
  Phase 13 (Final Wiring, 6 units): Covers ALL 77 dispatchers → web UI.
    CWEDM-MS0 completes wire EDM specifically. Phase 13 should skip prism_edm
    calculator wiring and reference CWEDM-MS0 as done.
  WEDM-MS0 / WEDM-MS1: Built the 51 actions we wire to. These are prerequisites.
  
3-LOOP PROTOCOL ALIGNMENT (v24):
  v24 defines a 3-step loop: BUILD → SCRUTINIZE → GAP FILL+TIE UP.
  This roadmap follows the same 3-step structure per unit.
```

---

## MCP FULL UTILIZATION PROTOCOL (MANDATORY — applies to EVERY session)

```
SESSION START:  prism_session:context_boot → dispatcher_map → memory_recall → system_snapshot → action_search "<goal>"
                Read SESSION_ARTIFACTS.json for Feature Cascade from prior sessions.
                Run dispatcher_map AFTER S1 to verify wedm_calculator_solve appears.
DURING WORK:    prism_session:auto_checkpoint (every 5-10 calls) → action_search → tool_route_best → wip_capture
SESSION END:    prism_session:memory_save → system_snapshot → checkpoint_enhanced
PLUGINS:        mcp__vitest__run_tests | mcp__eslint__lint-files | codebase-memory-mcp search_graph
FEATURE CASCADE: Read SESSION_ARTIFACTS.json at start → write via PostCompact hook at end
CONTEXT RETAIN: .compaction-survival.md + HANDOFF.md + SVI-compact.md + MEMORY.md (all auto-synced)
```

## ENFORCEMENT & KNOWLEDGE PROTOCOL (applies to EVERY session)

```
ENFORCEMENT HOOKS: Same 7 enforcement hooks as all PRISM sessions.

SKILLS: /smart frontend + wire EDM specialist, /forge-app-wire, /forge-mcp-wire,
  /forge-triple, /prism-review, /test, /trace
  SKILL SEQUENCING: /trace after each unit to verify wiring. /prism-review before EXIT GATE.
  /test after each unit (smoke) + full suite at EXIT GATE.

MASTER KNOWLEDGE SOURCES FOR ALL CWEDM SESSIONS:
  ENGINES:
    - edmDispatcher.ts (~700L) — 51 actions, lazy-load patterns
    - WireEDMSettingsEngine.ts — first-cut/skim speeds, tension, flushing
    - EDMParameterEngine.ts — peak current, pulse timing, MRR, Ra
    - EDMMultiPassStrategyEngine.ts — pass count, offset cascade, energy decay
    - EDMCuttingParamFlushEngine.ts — per-pass pulse params, wire break risk
    - EDMCostDocumentationEngine.ts — full cost breakdown, setup sheet
    - EDMWireSlugCornerTaperEngine.ts — corner compensation (delta=F*L/(4T)), taper UV solving
    - EDMMonitorSurfaceIntegrityEngine.ts — recast, HAZ, fatigue reduction
    - SpeedFeedOrchestratorEngine.ts — reference pattern for orchestration flow
  FRONTEND REFERENCE:
    - web/src/api/speedfeed.ts — sfRequest pattern (BUT: lacks auth headers — see AUTH NOTE)
    - web/src/api/client.ts — getRequestHeaders() for Bearer token injection (USE THIS for auth)
    - web/src/api/types.ts — PrismResponse<T> wrapper (result + safety + meta)
    - web/src/pages/CalculatorPage.tsx — wire_edm mode UI (lines 2922-2941 defaults)
    - web/src/utils/calculatorPrismMode.ts — PRISM mode recommendation logic
    - web/src/api/calculatorData.ts — machine/tool/holder catalog data layer
    - web/src/data/calculatorWorkspace.ts — livePhysics flag, operation defs
  AUTH NOTE: speedfeed.ts uses bare fetch() with NO Authorization header because speed-feed
    routes have no auth middleware. EDM routes DO require verifyToken (router.use(verifyToken)
    at edm.ts:51). wireEdm.ts MUST import getRequestHeaders() from client.ts and include
    the Bearer token in every request. Do NOT copy speedfeed.ts auth-free pattern blindly.
  SCHEMAS:
    - src/schemas/edmActionSchemas.ts — 4 legacy schemas
    - src/schemas/wedmPipelineActionSchemas.ts — 35 pipeline schemas (Zod)
  ROUTES:
    - src/routes/edm.ts — 26 HTTP endpoints with auth (verifyToken + requirePermission)
    - src/routes/speedfeed.ts — reference for route→callTool (but NO auth — see AUTH NOTE)
    - src/routes/index.ts — route registration (line 116: /api/v1/edm)
  TESTS:
    - src/__tests__/turning-edm-routes.test.ts — route test pattern (4 tests, auth setup)
    - src/__tests__/wedm-validation-suite.test.ts — 98 validation tests
    - src/__tests__/wedm-e2e-pipeline.test.ts — 17 E2E tests
  PHYSICS REFERENCES (cite when implementing):
    - Carslaw & Jaeger — recast depth: d = 2*sqrt(alpha*t_on)
    - Kunieda et al. CIRP 2005 — discharge energy model
    - Sato — EDM gap model: gap = f(V, I, t_on, t_off, dielectric)
    - Rajurkar — MRR: MRR = K * I * t_on / (t_on + t_off)
    - Corner compensation: delta = F * L / (4T) [NOT L^2/(8T) — corrected per engine code]
    - Ra empirical: Ra = K * t_on^0.38 * I_p^0.32 (exponents 0.3-0.5 published range)
    - All constants MUST import from src/physics/constants.ts — never inline

3-LOOP PER UNIT (MANDATORY — matches v24 protocol):
  LOOP 1 — BUILD: Write code, npx tsc --noEmit → 0 errors
  LOOP 2 — SCRUTINIZE: /prism-review → fix ALL findings
  LOOP 3 — GAP FILL + TIE UP: /test → 0 failures, /trace wiring, no TODOs
  FORGE-TRIPLE: protective hook + MCP action + skill per milestone
  /compact every 3 units (auto-triggered)

PERFORMANCE BUDGET (applies to ALL endpoints):
  Interactive endpoints (catalog, wire-catalog): < 200ms, cache 5min client-side
  Compute endpoints (calculator-solve): < 2s total (4-6 engine serial chain)
  Heavy compute (full pipeline): < 5s
  Solve button: debounce 500ms, disable during flight, show loading state
  Catalog data: fetch ONCE on wire_edm tab selection, cache in React state
  Rate limit: RL-EDM-CALC (separate from RL-EDM-COMPUTE pipeline bucket)

UNCERTAINTY QUANTIFICATION:
  All safety-critical outputs (recast, HAZ, wire break risk) MUST include
  confidence intervals or uncertainty bounds. Use StochasticEDMEngine for
  Monte Carlo UQ on critical parameters. Non-safety outputs (cost, time)
  may use point estimates with ±10% stated uncertainty.
```

---

## PER-SESSION COMPREHENSIVE ROADMAP

---

### SESSION CWEDM-MS0-S1: Foundation — API Client + Orchestration + Enable Solve (3 units)

```
SMART CONFIG: Role=full-stack + wire EDM specialist | Model=OPUS | Effort=MAX | CONTEXT_BUDGET=60%

KNOWLEDGE SOURCES:
  FRONTEND PATTERN (READ FIRST — this is the blueprint):
    - web/src/api/speedfeed.ts — sfRequest() pattern for fetch + error handling
    - web/src/api/client.ts — getRequestHeaders() for Bearer token (EDM routes need auth!)
    - web/src/api/types.ts — PrismResponse<T> wrapper (result + safety + meta)
    - web/src/pages/CalculatorPage.tsx:3056-3060 — how sfOrchestrate() is called
    - web/src/data/calculatorWorkspace.ts:3053 — livePhysics flag location
  BACKEND PATTERN (READ SECOND — what to wire TO):
    - src/routes/speedfeed.ts — how routes call callTool("prism_calc", "sf_orchestrate", body)
    - src/routes/edm.ts — existing EDM routes with auth (verifyToken + requirePermission)
    - src/tools/dispatchers/edmDispatcher.ts — all 51 actions, lazy-load pattern
    - src/schemas/wedmPipelineActionSchemas.ts — Zod schemas for validation
  ENGINE OUTPUTS (what the calculator will RECEIVE):
    - WireEDMSettingsEngine → { first_cut_speed, skim_speeds[], wire_tension, flushing_pressure,
        power_pct, time_per_100mm, wire_consumption, offset, recommendations[] }
    - EDMMultiPassStrategyEngine → { passes[]: { type, offset, energy, speed, time, predicted_Ra,
        predicted_recast_um }, total_time, total_wire, distortion_plan }
    - EDMCuttingParamFlushEngine → { per_pass: { t_on, t_off, peak_current, servo_voltage,
        wire_speed, flushing_mode, flushing_pressure }, wire_break_risk }
    - EDMWireSlugCornerTaperEngine → { corner_overtravel_mm, dwell_time_s, taper_uv_offset }
    - EDMMonitorSurfaceIntegrityEngine → { recast_depth_um, haz_depth_um, residual_stress_MPa,
        fatigue_reduction_pct, spec_compliance }
    - EDMCostDocumentationEngine → { machine_time_cost, wire_cost, consumables_cost, total_cost }

INTENT:
  After this session, a user selecting the wire_edm tab and clicking "Solve" gets REAL
  physics-backed results from the backend instead of a disabled button. The solve button
  calls wedm_calculator_solve which orchestrates 6 engines (settings + multipass + cutting
  params + corners/taper + surface integrity + cost) and returns a unified result.

SKILLS: /forge-app-wire (after each unit), /forge-mcp-wire, /trace (after each unit),
  /action-search, /test (smoke after each unit)

WORK:
  U-CWEDM01: Create web API client (web/src/api/wireEdm.ts)
    Adapt speedfeed.ts pattern WITH auth from client.ts:
    - weRequest<T>(path, body) → POST /api/v1/edm/{path} with getRequestHeaders() for Bearer token
    - weCalculatorSolve(params: WireEdmCalcParams) → /calculator-solve
    - weQuickSettings(params) → /wire (legacy fast path, fallback if orchestrator fails)
    - weMultipass(params) → /multipass
    - weCost(params) → /cost
    - weGetMachines() → GET /machines (cached 5min via Map<string, {expiresAt, promise}>)
    - weGetWireCatalog() → GET /wire-catalog (cached 5min)
    - WireEdmCalcParams interface: material, thickness_mm, profile_length_mm, target_Ra_um,
        tolerance_mm, wire_type, wire_diameter_mm, cut_type, taper_deg, machine_controller,
        machine_id, optimization_goal, workpiece_material_category, workpiece_hardness_HRC,
        is_submerged, workholding_type
    - WireEdmCalcResult interface: first_cut_speed_mm_min, skim_speeds[], wire_tension_N,
        flushing_pressure_bar, power_pct, passes[] (with offset_mm, energy_pct, speed_mm_min,
        time_min, wire_m, predicted_Ra_um, predicted_recast_um, t_on_us, t_off_us,
        peak_current_A, servo_voltage_V, wire_speed_m_min), total_time_min, total_wire_m,
        estimated_cost: { machine, wire, consumables, post_process, total_usd, breakdown[] },
        wire_break_risk: { probability, severity, factors[], mitigations[] },
        corner_compensation: { overtravel_mm, dwell_s }[],
        surface_integrity: { recast_um, haz_um, residual_stress_MPa, fatigue_reduction_pct,
          spec_compliance: { standard, pass: boolean, violations[] }[] },
        taper: { uv_offset_mm, error_um, max_capable_deg },
        recommendations[], safety_score: number
    - Cache: machine and wire catalog cached 5min with TTL map (follow toolRoiRequestCache pattern)
    - Debounce: export debounced weCalculatorSolve with 500ms delay
    SMOKE TEST: import wireEdm.ts in a vitest, verify types compile, mock fetch for basic call
    FILES_CREATED: web/src/api/wireEdm.ts, web/src/__tests__/wireEdm-api.test.ts
    ABORT_CRITERIA: tsc errors in api client, missing auth header injection, missing cache,
      missing debounce, wrong endpoint path
    ROLLBACK: git checkout -- web/src/api/wireEdm.ts; rm web/src/__tests__/wireEdm-api.test.ts
    → 3-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP

  U-CWEDM02: Create wedm_calculator_solve orchestration action + route
    Backend: new action in edmDispatcher that ORCHESTRATES 6 existing engines:
    1. Add "wedm_calculator_solve" to edmDispatcher z.enum
    2. Add Zod schema in wedmPipelineActionSchemas.ts with ALL required fields:
       material (string), thickness_mm (posNum), profile_length_mm (posNum),
       target_Ra_um (posNum), tolerance_mm (posNum), wire_type (enum), wire_diameter_mm,
       cut_type (enum), taper_deg (optional), machine_controller (enum), machine_id (optional),
       optimization_goal (enum), workpiece_hardness_HRC (optional), is_submerged (boolean)
    3. Implementation — 6-engine serial chain (data dependencies require sequential):
       a. WireEDMSettingsEngine.calculate() → base speeds, tension, offset
       b. EDMMultiPassStrategyEngine → pass plan using settings output
       c. EDMCuttingParamFlushEngine → per-pass params using pass plan
          (derives cutting_hrs from total_time for cost engine input)
       d. EDMWireSlugCornerTaperEngine → corner compensation + taper (if taper_deg > 0)
       e. EDMMonitorSurfaceIntegrityEngine → recast, HAZ, stress, spec compliance
       f. EDMCostDocumentationEngine → cost using machine_rate + cutting_hrs from (c)
       NOTE: This is a true serial chain — each engine's output feeds the next.
       Parallelization was considered and rejected due to data dependencies.
    4. Add route: POST /api/v1/edm/calculator-solve with:
       - requirePermission("edm:read") — this is read-only computation, not state mutation
       - rateLimitMiddleware("RL-EDM-CALC", "user") — SEPARATE bucket from RL-EDM-COMPUTE
    5. Populate safety.score and meta.formula_used in PrismResponse wrapper
    LATENCY: Target < 2s for 6-engine chain. Profile and log if > 1.5s.
    SMOKE TEST: vitest calling dispatcher directly with D2 50mm input, verify all 6 engine
      outputs present in response, verify < 2s execution
    FILES_MODIFIED: src/tools/dispatchers/edmDispatcher.ts, src/schemas/wedmPipelineActionSchemas.ts,
      src/routes/edm.ts
    FILES_CREATED: src/__tests__/cwedm-orchestrator-smoke.test.ts
    ABORT_CRITERIA: tsc errors, dispatcher z.enum mismatch, schema validation failures,
      response missing corner_compensation or surface_integrity, > 3s latency
    ROLLBACK: git checkout -- src/tools/dispatchers/edmDispatcher.ts src/schemas/wedmPipelineActionSchemas.ts src/routes/edm.ts
    Depends on: none (backend only)
    → 3-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP

  U-CWEDM03: Enable livePhysics for wire_edm, wire solve button
    Frontend: flip the switch and connect the button:
    1. In calculatorWorkspace.ts: set livePhysics=true for wire_edm mode
    2. In CalculatorPage.tsx runCalculation(): add mode branch —
       if (machineMode === 'wire_edm') { result = await weCalculatorSolve(params); }
       with fallback to weQuickSettings() on error (mirrors sfOrchestrate→sfQuick fallback)
    3. Map calculator selections → API params:
       - material → workpiece_material (from material catalog selection)
       - doc → thickness_mm (wire EDM "DOC" = workpiece thickness)
       - woc → wire_diameter (not traditional WOC)
       - finishTarget → target_Ra_um mapping (tight-finish=0.8, high-removal=3.2)
       - holderStyle → wire_type mapping (fine-wire=brass 0.10mm, standard=brass 0.25mm)
       - coolant → flushing mode (dielectric → submerged)
       - selectedController → machine_controller
       - selectedOperation → cut_type (wire_profile=profile, wire_skims=skim_only)
       - stabilityId → distortion_risk (detail-control=low, production-stable=medium)
       - workholdingId → workholding_type (wire-fixture=standard, slug=slug_retention)
       - MUST include: profile_length_mm (from workpiece dimensions or default 100mm)
       - MUST include: workpiece_hardness_HRC (from material catalog or manual input)
    4. Handle response: populate result state with wire EDM specific output
    5. Auth: wireEdm.ts already uses getRequestHeaders() from client.ts (built in U-CWEDM01)
    6. Loading state: disable solve button during flight, show spinner, re-enable on response
    7. Error handling: non-conductive material → show "Material not suitable for wire EDM" dialog
       with feasibility rejection reason from backend. Validation errors → show field-level hints.
    SMOKE TEST: vitest rendering CalculatorPage in wire_edm mode, mock weCalculatorSolve,
      verify button enabled and response populates result state
    FILES_MODIFIED: web/src/data/calculatorWorkspace.ts, web/src/pages/CalculatorPage.tsx
    FILES_CREATED: web/src/__tests__/calculator-wedm-solve.test.ts
    ABORT_CRITERIA: solve button still disabled, API call fails, auth 401, no loading state,
      no error handling for non-conductive material
    ROLLBACK: git checkout -- web/src/data/calculatorWorkspace.ts web/src/pages/CalculatorPage.tsx
    Depends on: U-CWEDM01, U-CWEDM02
    → 3-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP

FORGE-TRIPLE:
  PROTECTIVE HOOK: wedm-calculator-contract-check (POST-LEVEL) — validates that
    weCalculatorSolve response contains required fields (passes[], total_time,
    wire_break_risk, surface_integrity, corner_compensation) before rendering.
    Implemented as a post-edit hook on web/src/pages/CalculatorPage.tsx.
  MCP ACTION: prism_edm:wedm_calculator_solve — 6-engine orchestrator for calculator
  SKILL: /wedm-calc — "Run wire EDM calculator solve from CLI"

EXIT GATE:
  ✓ wire_edm solve button is ENABLED, debounced, shows loading state
  ✓ weCalculatorSolve() returns real physics data from 6 orchestrated engines
  ✓ Response includes corner_compensation, surface_integrity, wire_break_risk
  ✓ /api/v1/edm/calculator-solve route works with auth, returns < 2s
  ✓ RL-EDM-CALC rate limit applied (separate from pipeline bucket)
  ✓ npx tsc --noEmit → 0 errors
  ✓ All existing 304 EDM tests still pass (no regression)
  ✓ ≥8 new smoke tests pass (api client + orchestrator + solve wiring)
  ✓ omega_target = 1.0 | omega_floor >= 0.85 | SVI delta: +2%

FEATURE CASCADE:
  NEW_HOOKS: [wedm-calculator-contract-check (POST-LEVEL) → response shape validation]
  NEW_ACTIONS: [prism_edm:wedm_calculator_solve → 6-engine calculator orchestration]
  NEW_SKILLS: [/wedm-calc → CLI wire EDM calculator]
  AVAILABLE_TO: [CWEDM-MS0-S2, CWEDM-MS0-S3, CWEDM-MS0-S4, CWEDM-MS0-S5]

/compact checkpoint
```

---

### SESSION CWEDM-MS0-S2: Data Layer — Machine Catalog + Wire Catalog + Cost Engine (3 units)

```
SMART CONFIG: Role=data engineer + wire EDM specialist | Model=SONNET | Effort=MAX | CONTEXT_BUDGET=50%

KNOWLEDGE SOURCES:
  MACHINE DATA:
    - MachineRegistry (910 machines) — filter for wire EDM types
    - src/data/machine-profiles-catalog-ext2.ts — check for existing wire EDM entries
    - src/data/machine-profiles-catalog.ts — static catalog structure
    - calculatorData.ts:497-506 — current createMachineTaxonomyProfile for wire_edm
    - calculatorData.ts:546 — inferMachineMode wire detection
  WIRE/TOOL DATA:
    - ToolRegistry (95,608 tools) — check for wire electrode entries
    - EDMMaterialMachineWireEngine — wedm_select_wire action (brass/coated/moly/tungsten)
    - WireEDMSettingsEngine — wire type factors and recommendations
    - calculatorData.ts:2641-2653 — current tool counts and types per mode (wire_edm: 0!)
  COST DATA:
    - EDMCostDocumentationEngine — wedm_estimate_cost action (machine time, wire, consumables)
    - calculatorPrismMode.ts:139 — hardcoded MACHINE_RATE_PER_HOUR { wire_edm: 72 }
    - MachineRateDatabaseEngine — real rates by machine and region
  FROM SESSION S1 (via Feature Cascade):
    - web/src/api/wireEdm.ts — API client with auth + caching (just built)
    - prism_edm:wedm_calculator_solve — 6-engine orchestration action
    - wedm-calculator-contract-check hook — response validation
    - /wedm-calc skill — CLI access
  NOTE: wedm_select_machine already exists. The new wedm_get_calculator_machines is a
    SIMPLIFIED version returning only the fields the calculator dropdown needs (id, name,
    travel, controller). It does NOT overlap — wedm_select_machine does intelligent matching;
    wedm_get_calculator_machines returns the full filtered list for UI population.

INTENT:
  After this session, the wire EDM calculator shows REAL machines (Makino, Sodick, Fanuc,
  AgieCharmilles, Mitsubishi) from the MachineRegistry, lets users pick wire types/diameters
  from the actual wire catalog, and shows cost estimates from EDMCostDocumentationEngine
  instead of a hardcoded $72/hr.

SKILLS: /machine-enrich (before U-CWEDM04), /tool-enrich (before U-CWEDM05),
  /forge-app-wire (after each unit), /trace (after each unit), /test (smoke after each unit)

WORK:
  U-CWEDM04: Expand wire EDM machine catalog from MachineRegistry
    1. Add API endpoint: GET /api/v1/edm/machines → query MachineRegistry filtered by
       process_type='wire_edm', return: id, manufacturer, model, travel_xyz, travel_uv,
       max_taper_deg, auto_thread, controller, wire_dia_range, submerge_depth, max_thickness
    2. Wire weGetMachines() (already stubbed in U-CWEDM01) to this endpoint
    3. In calculatorData.ts: replace static FANUC C600iB with fetchWedmMachines() →
       map to MachineCatalogItem[] (same shape as milling machines)
    4. Fetch ONCE on wire_edm tab selection, cache in React state (not on every solve)
    5. Populate at least: Makino U3, U6, Sodick VL400Q, VZ300L, Fanuc C600iB, C400iB,
       AgieCharmilles CUT P 350/550, Mitsubishi MV1200R — from MachineRegistry or seed
    6. Wire machine selection into weCalculatorSolve params (machine_id, controller)
    SMOKE TEST: vitest fetching /api/v1/edm/machines, verify ≥5 machines returned with
      required fields (id, manufacturer, controller, travel)
    FILES_MODIFIED: src/routes/edm.ts, web/src/api/wireEdm.ts, web/src/api/calculatorData.ts
    FILES_CREATED: src/__tests__/cwedm-machine-catalog.test.ts
    ABORT_CRITERIA: <3 wire EDM machines in catalog, machine data missing travel specs,
      endpoint returns > 200ms, no client-side caching
    ROLLBACK: git checkout -- src/routes/edm.ts web/src/api/wireEdm.ts web/src/api/calculatorData.ts
    → 3-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP

  U-CWEDM05: Wire tool/wire catalog — brass, coated, moly, diameters
    NOTE: Wire catalog is machine-INDEPENDENT data (wire properties don't change per machine).
    This unit can run in PARALLEL with U-CWEDM04 — no dependency.
    1. Add API endpoint: GET /api/v1/edm/wire-catalog → returns wire types with properties:
       { id, material (brass/zinc-coated/moly/tungsten), diameter_mm, tensile_MPa,
         conductivity_pct_IACS, best_for (general/fine-detail/carbide/PCD),
         cost_per_m, max_speed_m_min }
    2. Wire weGetWireCatalog() (already stubbed in U-CWEDM01) to this endpoint
    3. In calculatorData.ts: replace empty wire_edm tool arrays with wire catalog fetch
    4. Remap holderStyle → wire selection: instead of "Fine wire package" abstraction,
       show actual wire properties: "Brass 0.10mm — fine detail, PCD" directly.
       Wire selection UI should show: material, diameter, best_for — not milling-era labels.
    5. Show wire properties in tool selection panel (diameter, material, tensile, best-for)
    6. Wire selected wire into weCalculatorSolve params (wire_type, wire_diameter_mm)
    7. Fetch ONCE on wire_edm tab selection, cache in React state
    SMOKE TEST: vitest fetching /api/v1/edm/wire-catalog, verify ≥10 options returned
    FILES_MODIFIED: src/routes/edm.ts, web/src/api/wireEdm.ts, web/src/api/calculatorData.ts,
      web/src/pages/CalculatorPage.tsx
    FILES_CREATED: src/__tests__/cwedm-wire-catalog.test.ts
    ABORT_CRITERIA: <5 wire options in catalog, no wire property display, labels still say
      "Fine wire package" instead of actual wire specs
    ROLLBACK: git checkout -- src/routes/edm.ts web/src/api/wireEdm.ts web/src/api/calculatorData.ts web/src/pages/CalculatorPage.tsx
    → 3-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP

  U-CWEDM06: Wire cost estimation from EDMCostDocumentationEngine
    1. Replace hardcoded MACHINE_RATE_PER_HOUR.wire_edm ($72) with:
       - Fetch actual rate from MachineRateDatabaseEngine per selected machine
       - Fall back to EDMCostDocumentationEngine default if no machine selected
       - Differentiate: Makino ~$95/hr, Sodick ~$85/hr, Fanuc ~$75/hr (from rate DB)
    2. Wire cost breakdown display:
       - Machine time cost (setup + cutting + idle) — from cost engine's 5-phase breakdown
       - Wire consumption cost (length × cost_per_m by wire type: brass $0.02, coated $0.04)
       - Consumables (filters $45/150hr, guides $125/1500hr, nozzles $85/500hr, resin $180/500hr)
       - Post-process cost (etch, stress relief if aerospace/medical)
       - Total per-part and batch cost (qty breaks at 1/5/10/25/100)
    3. Add weCostEstimate(params) to API client (or rely on orchestrator cost output)
    4. Role-based cost filtering: operators see cutting params only; managers/programmers
       see full cost breakdown. Check req.userRoles in route handler.
    SMOKE TEST: vitest calling cost endpoint, verify cost > $0 and breakdown has ≥4 categories
    FILES_MODIFIED: web/src/utils/calculatorPrismMode.ts, web/src/api/wireEdm.ts,
      web/src/pages/CalculatorPage.tsx
    FILES_CREATED: src/__tests__/cwedm-cost-smoke.test.ts
    ABORT_CRITERIA: cost still shows $72/hr, no breakdown display, cost < $0 or > $10000/hr,
      no role-based filtering
    ROLLBACK: git checkout -- web/src/utils/calculatorPrismMode.ts web/src/api/wireEdm.ts web/src/pages/CalculatorPage.tsx
    Depends on: U-CWEDM04 (machine rate per machine)
    → 3-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP

FORGE-TRIPLE:
  PROTECTIVE HOOK: wedm-machine-catalog-quality (POST-LEVEL) — ensures ≥5 wire EDM
    machines loaded AND each has travel specs + controller field (guards quality, not just count)
  MCP ACTION: prism_edm:wedm_get_calculator_machines — simplified machine list for UI dropdown
  SKILL: /wedm-machines — "List available wire EDM machines with capabilities"

EXIT GATE:
  ✓ ≥8 wire EDM machines available in calculator dropdown (from backend, not static)
  ✓ ≥10 wire type/diameter combinations in wire catalog
  ✓ Cost estimate uses real machine rates, not hardcoded $72/hr
  ✓ Cost breakdown shows machine time + wire + consumables + post-process
  ✓ Catalog endpoints return < 200ms, cached client-side
  ✓ npx tsc --noEmit → 0 errors
  ✓ All 304 EDM tests pass + ≥6 new smoke tests (catalog + wire + cost)
  ✓ omega_target = 1.0 | omega_floor >= 0.85 | SVI delta: +2%

FEATURE CASCADE:
  NEW_HOOKS: [wedm-machine-catalog-quality (POST-LEVEL) → catalog population + quality guard]
  NEW_ACTIONS: [prism_edm:wedm_get_calculator_machines → simplified machine list for UI]
  NEW_SKILLS: [/wedm-machines → CLI machine listing]
  AVAILABLE_TO: [CWEDM-MS0-S3, CWEDM-MS0-S4, CWEDM-MS0-S5]

/compact checkpoint
```

---

### SESSION CWEDM-MS0-S3: Results Display — Physics Output + Multi-Pass (2 units)

```
SMART CONFIG: Role=frontend + wire EDM process engineer | Model=OPUS | Effort=MAX | CONTEXT_BUDGET=55%

KNOWLEDGE SOURCES:
  RESULT DISPLAY PATTERN:
    - CalculatorPage.tsx — how mill/lathe results are rendered (speed, feed, force, power cards)
    - SpeedFeedResult interface in web/src/api/types.ts — structure for result display
  WIRE EDM RESULT DATA (what engines return — from S1 orchestrator):
    - passes[]: { type, offset_mm, energy_pct, speed_mm_min, time_min, wire_m,
        predicted_Ra_um, predicted_recast_um, t_on_us, t_off_us, peak_current_A,
        servo_voltage_V, wire_speed_m_min }
    - wire_break_risk: { probability, severity, factors[], mitigations[] }
    - corner_compensation: { overtravel_mm, dwell_s }[]
    - surface_integrity: { recast_um, haz_um, residual_stress_MPa, fatigue_reduction_pct }
    - taper: { uv_offset_mm, error_um, max_capable_deg }
    - estimated_cost: { machine, wire, consumables, post_process, total_usd }
  CONTROLLER-SPECIFIC TERMINOLOGY:
    - Fanuc: "E settings" (E001-E999 technology tables)
    - Sodick: SV (servo voltage), SF (spark frequency), WS (wire speed), WT (wire tension)
    - Makino: "technology number", "overcut"
    - Display should relabel generic params to controller-specific names when controller selected
  FROM SESSIONS S1+S2 (via Feature Cascade):
    - weCalculatorSolve() API client with auth + caching
    - wedm_calculator_solve 6-engine orchestration action
    - Machine + wire catalogs wired with real data

INTENT:
  After this session, the wire EDM calculator shows a COMPLETE result panel: multi-pass
  progression chart, per-pass cutting parameters with controller-specific labels, and
  process summary. A machinist sees per-pass Ra convergence toward target.

SKILLS: /forge-app-wire (after each unit), /prism-review (before EXIT GATE),
  /test (smoke after each unit), /trace (after each unit)

WORK:
  U-CWEDM07: Wire result display — primary physics output cards
    1. Create WireEdmResultPanel (extend existing result panel for wire_edm mode):
       - Process summary card: MRR (mm³/min), total cut time, wire consumption (m), power%
       - Per-pass table: pass# | type | speed (mm/min) | offset (mm) | energy% | Ra (µm) |
         recast (µm) | power_pct per pass
       - Cutting parameters card: voltage, current, t_on, t_off, wire speed, servo voltage
         with controller-specific labels (e.g., "SV" for Sodick, "E-setting" for Fanuc)
       - Wire tension & flushing card: tension (N), flushing mode (submerged/spray/jet),
         pressure (bar), nozzle gap guidance, DI water conductivity target (10-20 µS/cm)
    2. Map weCalculatorSolve response fields to display components
    3. Show recommendations[] from engine as actionable tips
    4. Add unit conversion toggle (mm↔inch) for wire EDM results
    5. Ensure disabled state shows "Configure wire EDM parameters first" instead of blank
    6. Add setup sheet button: "Export Setup Sheet" → calls wedm_generate_setup_sheet and
       opens printable/phone-friendly format for shop floor use
    SMOKE TEST: React render test — mount result panel with mock data, verify all cards render,
      verify controller-specific labels change when controller prop changes
    FILES_MODIFIED: web/src/pages/CalculatorPage.tsx
    FILES_CREATED: web/src/__tests__/calculator-wedm-results.test.ts
    ABORT_CRITERIA: result panel empty after solve, missing MRR or pass table, NaN in display,
      no controller-specific labels, no setup sheet export
    ROLLBACK: git checkout -- web/src/pages/CalculatorPage.tsx
    Depends on: U-CWEDM03 (livePhysics enabled, solve returns data)
    → 3-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP

  U-CWEDM08: Wire multi-pass visualization — skim progression
    1. Add pass progression visualization:
       - Horizontal bar chart: pass 1 (rough, wide bar, high energy) →
         pass 2 (semi, medium bar) → pass 3-4 (skim, thin bars, low energy)
       - Show offset reduction per pass: rough offset → finish at zero
       - Color-code: rough=orange, semi=yellow, skim=green, super-finish=blue
    2. Wire EDMMultiPassStrategyEngine.passes[] to the visualization
    3. Show predicted Ra after each pass (convergence toward target)
    4. Show predicted recast depth after each pass (decreasing through skims)
    5. Add distortion compensation indicator if distortion_risk > medium, with
       recommendation: "Consider stress-relief skim pass" or "Use tabbed cutting"
    6. Wire the pass count to operation type: wire_profile → full pass plan,
       wire_skims → skim passes only
    7. Show per-pass power_pct so machinist can verify machine capacity
    SMOKE TEST: React render test — mount chart with 4-pass mock data, verify 4 bars rendered
      with correct colors, verify Ra convergence line present
    FILES_MODIFIED: web/src/pages/CalculatorPage.tsx
    FILES_CREATED: web/src/components/calculator/WireEdmPassChart.tsx,
      web/src/__tests__/WireEdmPassChart.test.tsx
    ABORT_CRITERIA: no visual pass progression, Ra prediction missing, distortion not flagged,
      chart doesn't render with 0 passes (empty state)
    ROLLBACK: git checkout -- web/src/pages/CalculatorPage.tsx; rm web/src/components/calculator/WireEdmPassChart.tsx
    Depends on: U-CWEDM07 (result display framework)
    → 3-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP

FORGE-TRIPLE:
  PROTECTIVE HOOK: wedm-result-completeness (POST-LEVEL) — ensures result panel renders
    all mandatory cards (summary, pass table, cutting params) before allowing /compact
  MCP ACTION: prism_edm:wedm_generate_setup_sheet — already exists, now wired to UI export button
  SKILL: /wedm-setup-sheet — "Generate printable wire EDM setup sheet"

EXIT GATE:
  ✓ Result panel shows MRR, cut time, wire consumption, per-pass table, cutting params
  ✓ Multi-pass chart shows offset + energy + Ra + recast convergence
  ✓ Controller-specific parameter labels (SV/SF for Sodick, E-settings for Fanuc)
  ✓ Setup sheet export button works and produces printable output
  ✓ Flushing card shows pressure + nozzle gap + DI water conductivity target
  ✓ npx tsc --noEmit → 0 errors
  ✓ All existing tests pass + ≥8 new tests (result render + chart + controller labels)
  ✓ omega_target = 1.0 | omega_floor >= 0.85 | SVI delta: +2%

FEATURE CASCADE:
  NEW_HOOKS: [wedm-result-completeness (POST-LEVEL) → result card rendering guard]
  NEW_ACTIONS: [prism_edm:wedm_generate_setup_sheet → wired to UI export (already existed)]
  NEW_SKILLS: [/wedm-setup-sheet → printable setup sheet generation]
  AVAILABLE_TO: [CWEDM-MS0-S4, CWEDM-MS0-S5]

/compact checkpoint
```

---

### SESSION CWEDM-MS0-S4: Safety Cards + Surface Integrity (2 units)

```
SMART CONFIG: Role=frontend + safety engineer + wire EDM specialist | Model=OPUS | Effort=MAX | CONTEXT_BUDGET=50%

KNOWLEDGE SOURCES:
  SAFETY DATA (from 6-engine orchestrator):
    - surface_integrity: { recast_um, haz_um, residual_stress_MPa, fatigue_reduction_pct,
        spec_compliance: { standard, pass, violations[] }[] }
    - wire_break_risk: { probability, severity, factors[], mitigations[] }
    - corner_compensation: { overtravel_mm, dwell_s }[]
    - taper: { uv_offset_mm, error_um, max_capable_deg }
  SPEC DATABASES (from EDMMonitorSurfaceIntegrityEngine):
    - AMS 2628 (aerospace): max_recast 0µm (SEM-verified), max_haz 25µm, max_stress 400MPa
    - ASTM F86 / ISO 10993 (medical): max_recast 5µm, max_haz 50µm, max_stress 500MPa
    - Automotive: max_recast 25µm, max_haz 75µm, max_stress 700MPa
  SAFETY ENFORCEMENT:
    - Safety cards MUST render for ALL wire EDM results (not just aerospace/medical)
    - Aerospace/medical applications get elevated prominence (red border, bold text)
    - Engine returns safety_critical: boolean — when true, first recommendation is
      "SAFETY CRITICAL HOLD: part must NOT be released until spec compliance achieved"
  FROM SESSIONS S1+S2+S3 (via Feature Cascade):
    - Complete solve → result display chain
    - Machine + wire catalogs
    - Pass chart visualization

INTENT:
  After this session, every wire EDM calculation shows safety cards: wire break risk with
  green/yellow/red indicator, recast layer depth with spec compliance, corner compensation
  values, and taper solving. Aerospace/medical parts get a HOLD warning if spec fails.
  A machinist cannot dismiss or hide safety data.

SKILLS: /forge-app-wire, /prism-review, /test, /trace, /physics-verify

WORK:
  U-CWEDM09: Wire break risk + corner compensation + taper cards
    1. Wire wire-break risk indicator:
       - P(break) from orchestrator: green (<5%), yellow (5-15%), red (>15%)
       - Show contributing factors: thickness, duty cycle, flushing quality
       - Mitigation actions: reduce speed, increase flushing, use coated wire
       - Include confidence interval from StochasticEDMEngine uncertainty bounds
    2. Wire corner compensation card:
       - Over-travel distance (mm) per corner angle from wedm_calculate_corners
       - Dwell time (s) per corner — cite formula: delta = F*L/(4T)
       - Visual: corner angle indicator showing compensation direction
    3. Wire taper solving card (when taper_deg > 0):
       - UV axis offsets from wedm_solve_taper
       - Taper error prediction (µm) with uncertainty bounds
       - Max taper capability vs requested
    SMOKE TEST: React render — mount with mock wire_break_risk={probability:0.20},
      verify red indicator renders. Mount with taper={}, verify taper card hidden.
    FILES_MODIFIED: web/src/pages/CalculatorPage.tsx
    FILES_CREATED: web/src/__tests__/calculator-wedm-safety.test.tsx
    ABORT_CRITERIA: no wire break indicator, >15% risk not flagged red, corner card
      shows wrong formula, taper card renders when no taper requested
    ROLLBACK: git checkout -- web/src/pages/CalculatorPage.tsx
    Depends on: U-CWEDM07 (result display framework)
    → 3-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP

  U-CWEDM10: Surface integrity safety card — SAFETY CRITICAL
    1. Wire surface integrity card (renders for ALL wire EDM results):
       - Recast layer depth (µm) with uncertainty bounds — ALWAYS VISIBLE
       - HAZ depth (µm) with material-dependent multiplier label
       - Residual stress (MPa) — compressive vs tensile indicator
       - Fatigue life reduction factor — elevated prominence for fatigue-critical parts
       - Spec compliance panel: AMS 2628 / ASTM F86 / OEM with pass/fail per limit
       - For aerospace/medical: red border, bold, SAFETY CRITICAL HOLD warning
    2. Safety cards render for ALL applications (general, tooling, automotive, aerospace, medical)
       Aerospace/medical get elevated styling but ALL applications show the data.
    3. These cards appear in the existing safety panel — use same card layout pattern
    4. Cannot be dismissed or collapsed — always expanded for safety-critical fields
    SMOKE TEST: React render — mount with recast_um=15, spec_compliance aerospace fail,
      verify HOLD warning visible. Mount with general application, verify card still renders.
    FILES_MODIFIED: web/src/pages/CalculatorPage.tsx
    FILES_CREATED: web/src/__tests__/calculator-wedm-surface-integrity.test.tsx
    ABORT_CRITERIA: safety card hidden for any application, recast not always visible,
      spec compliance missing for aerospace, no HOLD warning when spec fails,
      card can be collapsed/dismissed
    ROLLBACK: git checkout -- web/src/pages/CalculatorPage.tsx
    Depends on: U-CWEDM09 (safety card framework)
    → 3-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP

FORGE-TRIPLE:
  PROTECTIVE HOOK: wedm-safety-display-guard (POST-LEVEL) — ensures recast + wire-break
    cards render for ALL wire EDM results (not just aerospace/medical). Blocks any edit
    that adds display:none or conditional hiding to safety card container.
  MCP ACTION: prism_edm:wedm_safety_summary — consolidated safety check for UI
  SKILL: /wedm-safety — "Check wire EDM safety metrics for a given setup"

EXIT GATE:
  ✓ Wire break risk shows green/yellow/red with confidence interval and mitigation
  ✓ Corner compensation values displayed when corners present
  ✓ Taper solving card shows UV offsets when taper requested, hidden when not
  ✓ Recast layer + HAZ shown for ALL wire EDM results (not just aerospace)
  ✓ Spec compliance (AMS 2628) shown with HOLD warning when fail + aerospace
  ✓ Safety cards cannot be dismissed or collapsed
  ✓ npx tsc --noEmit → 0 errors
  ✓ All existing tests pass + ≥8 new tests (safety render + spec compliance + HOLD)
  ✓ omega_target = 1.0 | omega_floor >= 0.85 | SVI delta: +2%

FEATURE CASCADE:
  NEW_HOOKS: [wedm-safety-display-guard (POST-LEVEL) → safety card always-visible enforcement]
  NEW_ACTIONS: [prism_edm:wedm_safety_summary → consolidated safety for UI]
  NEW_SKILLS: [/wedm-safety → CLI safety check]
  AVAILABLE_TO: [CWEDM-MS0-S5]

/compact checkpoint
```

---

### SESSION CWEDM-MS0-S5: Integration Testing + E2E Validation (2 units)

```
SMART CONFIG: Role=QA engineer + wire EDM process validator | Model=SONNET | Effort=MAX | CONTEXT_BUDGET=40%

KNOWLEDGE SOURCES:
  TEST PATTERNS:
    - src/__tests__/turning-edm-routes.test.ts — route test with auth (4 tests, just fixed)
    - src/__tests__/wedm-e2e-pipeline.test.ts — 17 E2E pipeline tests
    - src/__tests__/wedm-validation-suite.test.ts — 98 validation tests
    - src/__tests__/portal-routes.test.ts — auth + HTTP test pattern (register→login→Bearer)
    - web/src/__tests__/CalculatorPage.*.test.tsx — existing React component test patterns
  VALIDATION DATA (published ranges — cite sources):
    - D2 tool steel: brass 0.25mm wire, 4-7 mm/min first cut at 50mm (Sodick/Makino tech tables)
    - Ra after 4 skims: 0.6-1.0 µm (Klocke & Konig "Manufacturing Processes 3")
    - Carbide WC-Co: coated wire, 1-3 mm/min at 30mm
    - Recast layer rough cut D2: 10-30 µm (Rajurkar et al.)
    - Typical Fanuc D2 roughing: 60V open, 280V gap, 1.2µs on, 8µs off
    - Ti-6Al-4V aerospace: recast must be 0 per AMS 2628 (verified by SEM)
    - Wire break risk at 100mm D2: > 10% (thick stock = high risk)
  FROM SESSIONS S1-S4 (via Feature Cascade):
    - Complete frontend→backend wiring with auth, caching, debounce
    - All display components (results, pass chart, safety cards)
    - Machine + wire catalogs
    - Safety cards (always visible, cannot dismiss)

INTENT:
  After this session, the wire EDM calculator is VALIDATED end-to-end with 40+ tests:
  route integration, physics validation against published data, frontend component render
  tests, contract tests, and error handling. The full chain is proven:
  CalculatorPage → wireEdm.ts → /api/v1/edm/calculator-solve → edmDispatcher →
  6 orchestrated engines → response → result display → safety cards.

SKILLS: /test (primary), /prism-review (before EXIT GATE), /forge-triple, /program-validate,
  /physics-verify (for physics range validation)

WORK:
  U-CWEDM11: Route + physics + contract tests
    1. Route integration test (src/__tests__/cwedm-calculator-routes.test.ts):
       - POST /api/v1/edm/calculator-solve with D2, 50mm, brass 0.25mm → 200 OK
       - Verify response has: passes[], total_time_min, wire_break_risk,
         surface_integrity, corner_compensation, estimated_cost
       - GET /api/v1/edm/machines → returns ≥5 machines with travel + controller
       - GET /api/v1/edm/wire-catalog → returns ≥10 wire options
       - Auth: register admin user, include Bearer token (turning-edm-routes pattern)
       - Auth: unauthenticated request → 401
       - Rate limit: verify RL-EDM-CALC header present
    2. Physics validation test (src/__tests__/cwedm-physics-validation.test.ts):
       - D2 at 50mm: first cut speed 4-8 mm/min (Sodick/Makino tech tables)
       - D2 4-skim plan: final Ra 0.6-1.0 µm (Klocke & Konig)
       - Carbide at 30mm: first cut speed 1-3 mm/min
       - Copper at 25mm: first cut speed 6-12 mm/min (high conductivity = fast)
       - Ti-6Al-4V aerospace: recast must trigger AMS 2628 spec check
       - Wire break risk at 100mm D2: > 10% (thick stock)
       - Wire break risk at 10mm D2: < 5% (thin stock = low risk)
       - Corner over-travel for 90°: > 0 mm (compensation required)
       - Corner over-travel for 30° acute: > 90° value (sharper = more)
       - Corner over-travel for 150° obtuse: < 90° value (gentler = less)
       - Recast layer rough cut D2: 10-30 µm (Rajurkar et al.)
       - Total cost for D2 25×25mm profile: $20-$200 range (sanity)
    3. Contract test: verify weCalculatorSolve() response shape matches
       WireEdmCalcResult interface (TypeScript type assertion on every field)
    4. Regression test: run ALL 304 existing EDM tests → 0 regressions
    FILES_CREATED: src/__tests__/cwedm-calculator-routes.test.ts,
      src/__tests__/cwedm-physics-validation.test.ts
    ABORT_CRITERIA: <20 new tests, D2 speed outside published range, regression in existing tests,
      missing corner/taper/surface_integrity in response
    ROLLBACK: rm src/__tests__/cwedm-calculator-routes.test.ts src/__tests__/cwedm-physics-validation.test.ts
    → 3-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP

  U-CWEDM12: Frontend component + error + manual QA
    1. Frontend component tests (web/src/__tests__/calculator-wedm-e2e.test.tsx):
       - Mount CalculatorPage in wire_edm mode → solve button enabled
       - Mock weCalculatorSolve → verify result panel renders all cards
       - Verify pass chart renders correct number of bars (4 passes = 4 bars)
       - Verify wire break risk red indicator at probability > 0.15
       - Verify safety card always visible (cannot be hidden/collapsed)
       - Verify AMS 2628 HOLD warning when spec_compliance.pass = false
       - Verify unit toggle switches mm → inches correctly
       - Verify controller-specific labels (Sodick → "SV", Fanuc → "E-setting")
       - Verify empty state ("Configure wire EDM parameters first")
       - Verify loading spinner during solve, button disabled during flight
    2. Error handling tests:
       - Non-conductive material (PVC) → feasibility rejection with reason displayed
       - Zero thickness → validation error with field hint
       - Missing wire_type → default to brass 0.25mm (graceful fallback)
       - Network error → retry prompt, not crash
       - 429 rate limit → "Try again in X seconds" message
    3. Manual QA checklist (document in test file as comments):
       ☐ Open browser → select wire_edm tab → verify machine dropdown populated
       ☐ Select D2 steel, 50mm, brass 0.25mm → click Solve → verify numbers display
       ☐ Check per-pass table: 4-5 rows, Ra decreasing per row
       ☐ Check safety card: recast layer visible, not dismissible
       ☐ Switch to Sodick controller → verify labels change to SV/SF/WS
       ☐ Click "Export Setup Sheet" → verify printable format opens
       ☐ Resize to mobile width → verify cards stack vertically (responsive)
    FILES_CREATED: web/src/__tests__/calculator-wedm-e2e.test.tsx
    ABORT_CRITERIA: <12 frontend tests, safety card can be hidden in test, no error handling tests,
      no manual QA checklist
    ROLLBACK: rm web/src/__tests__/calculator-wedm-e2e.test.tsx
    Depends on: U-CWEDM11 (route tests validate backend before frontend tests)
    → 3-LOOP: BUILD → SCRUTINIZE → GAP FILL + TIE UP

FORGE-TRIPLE:
  PROTECTIVE HOOK: wedm-calculator-regression-gate (PRE-LEVEL) — runs cwedm-* tests on any
    edm.ts or wireEdm.ts edit, blocks commit if physics values drift outside published ranges.
    Implemented as pre-edit hook matching src/routes/edm.ts and web/src/api/wireEdm.ts.
  MCP ACTION: prism_edm:wedm_validate_calculator — self-test action that runs physics checks
  SKILL: /wedm-validate — "Validate wire EDM calculator against published data"

EXIT GATE:
  ✓ ≥40 new tests passing (20+ backend, 12+ frontend, 5+ error handling)
  ✓ ALL 304 existing EDM tests still pass (0 regressions)
  ✓ D2/carbide/copper/Ti-6Al-4V physics within published ranges
  ✓ Non-conductive material correctly rejected with user-friendly message
  ✓ Full chain tested: frontend API → route → dispatcher → 6 engines → response → display
  ✓ Safety card verified as always-visible in component tests
  ✓ Manual QA checklist completed and documented
  ✓ npx tsc --noEmit → 0 errors
  ✓ omega_target = 1.0 | omega_floor >= 0.90 | SVI delta: +5% total across all 5 sessions

FEATURE CASCADE:
  NEW_HOOKS: [wedm-calculator-regression-gate (PRE-LEVEL) → physics drift detection on edits]
  NEW_ACTIONS: [prism_edm:wedm_validate_calculator → self-test physics checks]
  NEW_SKILLS: [/wedm-validate → CLI validation against published data]
  AVAILABLE_TO: [Phase 10 EDM Pipeline, Phase 13 Final Wiring (skip prism_edm calc wiring)]

/compact → milestone complete
```

---

## DEPENDENCY GRAPH

```
U-CWEDM01 (API client)     ──┐
                              ├── U-CWEDM03 (enable livePhysics) ─┐
U-CWEDM02 (orchestration)  ──┘                                    │
                                                                   ├── U-CWEDM07 (result display)
U-CWEDM04 (machine catalog) ──── U-CWEDM06 (cost engine)          │      │
                                                                   │      ├── U-CWEDM08 (pass chart)
U-CWEDM05 (wire catalog)    [parallel with U-CWEDM04]             │      │
                                                                   ├── U-CWEDM09 (break/corner/taper)
                                                                   │      │
                                                                   │      └── U-CWEDM10 (surface integrity)
                                                                   │             │
                                                                   └── U-CWEDM11 (route+physics tests)
                                                                          │
                                                                          └── U-CWEDM12 (frontend+QA tests)
```

Session parallelism:
- S1: U-CWEDM01 ∥ U-CWEDM02, then U-CWEDM03 depends on both
- S2: U-CWEDM04 ∥ U-CWEDM05 (wire catalog is machine-independent), U-CWEDM06 after U-CWEDM04
- S3: U-CWEDM07 first, then U-CWEDM08 depends on U-CWEDM07
- S4: U-CWEDM09 first, then U-CWEDM10 depends on U-CWEDM09
- S5: U-CWEDM11 first, then U-CWEDM12 depends on U-CWEDM11

Critical path: U-CWEDM01 → U-CWEDM03 → U-CWEDM07 → U-CWEDM09 → U-CWEDM11 → U-CWEDM12

---

## ENFORCEMENT HOOKS ACTIVE DURING EXECUTION

```
PRE-LEVEL:
  - knowledge-consult: verifies domain sources read before engine edits
  - context-retention: preserves wire EDM session state across compaction
  - wedm-calculator-regression-gate (from S5): blocks edits if physics drift
POST-LEVEL:
  - stub-detector: blocks placeholder returns in wedm_calculator_solve
  - test-quality: blocks || true and bare .includes() in tests
  - constants-checker: blocks inline physics values (must import from constants.ts)
  - wiring-agent: verifies MCP readiness of new actions
  - wedm-calculator-contract-check (from S1): validates response shape
  - wedm-machine-catalog-quality (from S2): validates catalog quality
  - wedm-result-completeness (from S3): validates result card rendering
  - wedm-safety-display-guard (from S4): validates safety cards always visible
COMPACT-LEVEL:
  - review-gate: blocks compaction without /prism-review run
  - forge-triple-gate: blocks compaction without hook + action + skill
  - session-audit-agent: reviews all changes before compaction
POST-COMPACT:
  - Feature Cascade: SESSION_ARTIFACTS.json auto-written with new capabilities
  - SessionStart: reads Feature Cascade, reports live system counts + new capabilities
```

---

## SUMMARY TABLE

| Session | Units | Focus | Key Deliverable | Model |
|---------|-------|-------|-----------------|-------|
| S1 | 3 | Foundation | Solve button works, 6-engine orchestrator, auth | OPUS |
| S2 | 3 | Data | Real machines, wire catalog, cost engine | SONNET |
| S3 | 2 | Results | Result cards, pass chart, setup sheet export | OPUS |
| S4 | 2 | Safety | Wire break, corner, taper, recast safety cards | OPUS |
| S5 | 2 | Validation | 40+ tests, physics validation, frontend QA | SONNET |
| **Total** | **12** | **5 sessions** | **Wire EDM tab fully wired to backend** | |

Estimated effort: 5 sessions × ~2.5-3 hours = 12-15 hours
Omega target: 1.0 (per user standing instruction)
SVI impact: +5% (new frontend↔backend integration surface)
