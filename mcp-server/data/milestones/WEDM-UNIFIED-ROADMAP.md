# WEDM-UNIFIED — Wire EDM to 100% + Lathe Parity Roadmap

## Track: WEDM-UNIFIED | Version: 2.0.0 | Created: 2026-04-10 | RGS Pipeline v10, Loop 2 Applied
## Goal: Wire EDM matches lathe in UX completeness — upload DXF/photo → complete optimized program
##       with feature editor, secondary ops, shop config, and production validation
## Total Milestones: 7 | Total Units: 38 | Estimated Sessions: 13
## Omega Target: 1.0 | Physics engines: 29 (30,271L) | Dispatcher actions: 61 | Tests: 65

---

## LOOP 2 FIX: ENFORCEMENT INTEGRATION (all sessions)

**Hooks active during execution:**
- PRE-LEVEL: knowledge-consult (verify WEDM engine docs read), context-retention
- POST-LEVEL: stub-detector (BLOCKS placeholder returns), test-quality-gate, constants-checker
- COMPACT-LEVEL: review-gate, wiring-gate, forge-triple-gate, session-audit-agent
- POST-COMPACT: Feature Cascade (SESSION_ARTIFACTS.json auto-written)

**MCP Lifecycle (every session):**
```
SESSION START: prism_session:context_boot → dispatcher_map → memory_recall → system_snapshot
               → action_search "wire edm <session goal>"
DURING WORK:   prism_session:auto_checkpoint (every 5-10 calls) → wip_capture
SESSION END:   prism_session:memory_save → system_snapshot → checkpoint_enhanced
```

**Plugin Utilization:**
```
Vitest MCP:  npx vitest run [file] — after every component/engine creation
ESLint MCP:  mcp__eslint__lint-files — TypeScript quality gate
```

---

## SYSTEM INVENTORY (what exists — DO NOT REBUILD)

| Asset | Count | Status |
|-------|-------|--------|
| Wire EDM engines | 29 | 30,271 lines — physics complete |
| Dispatcher actions | 61 | All wired via edmDispatcher.ts |
| Orchestration stages | 30 | WEDMCompleteOrchestrationEngine (1,502L) — zero stubs |
| Controller dialects | 5 | Mitsubishi, Sodick, Makino, AgieCharmilles, Fanuc |
| Calculator integration | Full | CalculatorPage has wedmResult state + solve pipeline |
| Web components | 5 | Backplot (840L), ContourPicker (307L), Contour3D (373L), OptimizeCards (477L), PassChart (154L) |
| Test files | 65 | 30,966 lines — comprehensive physics + real program validation |
| REST endpoints | 42 | Full API in routes/edm.ts (497L) |
| FeatureEditorPanel | Built | Already supports wire_edm mode |

---

## PHASE STRUCTURE + DEPENDENCY GRAPH

```
M1 (Upload + Results) ──→ M2 (Feature Editor Wire)
        │                         │
        ├──→ M3 (Studio Integration)
        │                         
        ├──→ M4 (Shop Profile) ──→ M6 (30-Part Validation)
        │                                    │
        └──→ M5 (Calculator Panels) ──→ M6   │
                      │                       │
                      └──→ M7 (Lathe Backport)
```

M6 depends on: M1, M2, M4, M5 (needs upload flow + feature editor + shop profile + panels)

---

## MILESTONE M1: WireEdmUploadPage + WireEdmResultsPage
**Priority:** P0 | **Units:** 6 | **Sessions:** 2
**Depends on:** Nothing (standalone)

### SESSION 1: Upload + Wizard (U-WEUP01..U-WEUP03)
```
SMART CONFIG: Role=UIEngineer + WireEDMSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: WEDMCompleteOrchestrationEngine (1502L), WEDMPrintToProgramEngine (1823L),
           EDMDrawingInterpretationEngine (886L)
  UI PATTERNS: LatheUploadPage.tsx, LatheWizardPage.tsx (direct templates)
  ROUTES: routes/edm.ts — /parse-geometry, /ocr, /photo-to-program, /calculator-solve
  COMPONENTS: WireEdmContourPicker (307L), WireEdmContour3D (373L)
INTENT: User navigates to /wire-edm → uploads DXF/photo → contours parsed → wizard → submit.
  Machinist sees the same quality UX as lathe upload.
SKILLS: /forge-engines, /forge-wiring, /test, /navigate
PLUGINS: Vitest MCP, ESLint MCP
```

**U-WEUP01**: WireEdmUploadPage — file upload with real backend parsing
  - DXF → POST /api/v1/edm/parse-geometry → ContourData[]
  - Photo/PDF → POST /api/v1/edm/ocr → dimension extraction
  - Follow LatheUploadPage pattern: FileReader → base64 → real fetch (not simulated)
  - Navigate to /wire-edm/wizard with parsed data
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - FILES_CREATED: web/src/pages/WireEdmUploadPage.tsx
  - FILES_MODIFIED: web/src/App.tsx (add route)
  - ABORT_CRITERIA: >3 TS errors | fetch fails silently | no error handling for bad files
  - ROLLBACK: delete WireEdmUploadPage.tsx, revert App.tsx

**U-WEUP02**: WireEdmWizardPage — 5-step wizard
  - Step 1: Contour review (embed WireEdmContourPicker)
  - Step 2: Material + thickness
  - Step 3: Quality tier (general/precision/aerospace/medical)
  - Step 4: Machine preference
  - Step 5: Submit → POST /api/v1/edm/calculator-solve
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - FILES_CREATED: web/src/pages/WireEdmWizardPage.tsx
  - ABORT_CRITERIA: >3 TS errors | wizard doesn't pass contour selection to backend | no validation on empty fields
  - ROLLBACK: delete WireEdmWizardPage.tsx

**U-WEUP03**: SSE progress + job management
  - Backend: async job runner calling WEDMCompleteOrchestrationEngine (30 stages)
  - Frontend: EventSource polling for stage progress
  - Wire to edm.ts endpoint (create if needed) or follow latheTurning.ts pattern
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - FILES_MODIFIED: src/routes/edm.ts (add job management if missing)
  - ABORT_CRITERIA: >3 TS errors | SSE doesn't fire events | no timeout handling
  - ROLLBACK: revert edm.ts changes

### SESSION 2: Results Page + Navigation (U-WEUP04..U-WEUP06)
```
SMART CONFIG: Role=UIEngineer + ManufacturingExpert | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: EDMPostProcessGCodeEngine (2831L), EDMCostDocumentationEngine (1299L),
           WEDMSetupSheetEngine (427L), EDMMonitorSurfaceIntegrityEngine (1310L)
  UI PATTERNS: LatheResultsPage.tsx (template), WireEdmBackplot (840L), WireEdmOptimizeCards (477L)
  ROUTES: /gcode-export, /gcode-export-from-dxf, /cost, /setup-sheet
INTENT: User sees full results: backplot, pass details, surface integrity, cost, downloads.
  Every result is from real engine output — zero mock data.
SKILLS: /test, /forge-wiring, /navigate
```

**U-WEUP04**: WireEdmResultsPage
  - Tabs: Summary | Backplot | Pass Details | Setup Sheet | G-Code
  - Summary: safety score, pass count, cycle time, cost, wire consumption, Ra
  - Embed existing: WireEdmBackplot, WireEdmPassChart, WireEdmOptimizeCards
  - Fetch from backend /api/v1/edm result endpoint (real data, not mock)
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - FILES_CREATED: web/src/pages/WireEdmResultsPage.tsx
  - ABORT_CRITERIA: >3 TS errors | any mock data | downloads don't call backend
  - ROLLBACK: delete WireEdmResultsPage.tsx

**U-WEUP05**: Download buttons + edit-and-rerun
  - Download: G-code (.nc), setup sheet (.txt/.pdf), physics report, E-pack
  - Wire: /api/v1/edm/gcode-export (already exists)
  - "Edit Dimensions & Re-Run" → navigate back to wizard with state preserved
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - FILES_MODIFIED: WireEdmResultsPage.tsx
  - ABORT_CRITERIA: downloads produce empty files | edit-rerun loses state
  - ROLLBACK: revert WireEdmResultsPage.tsx

**U-WEUP06**: Navigation + App routes + tests (12+)
  - shellCatalog.ts: add "Wire EDM" nav item
  - App.tsx: add /wire-edm, /wire-edm/wizard, /wire-edm/results routes
  - Layout.tsx: add to FEATURED_COMMAND_ROUTES
  - Tests: upload → wizard → submit → results → download (full flow)
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - FILES_MODIFIED: shellCatalog.ts, App.tsx, Layout.tsx
  - FILES_CREATED: src/__tests__/wedm-upload-results.test.ts
  - ABORT_CRITERIA: >3 TS errors | nav item missing | <12 tests
  - ROLLBACK: revert nav files, delete test file

**FORGE-TRIPLE for M1:**
  HOOK: `wedm-output-gate` — blocks download if surface integrity fails spec class
  ACTION: `prism_edm:wedm_studio_pipeline` (existing)
  SKILL: `/wire-edm-program` (NEW — upload + generate CLI entry point)

**EXIT GATE:** ✓ DXF upload → contour selection → results in <90s |
  ✓ Photo upload → OCR → results | ✓ Downloads produce real NC files |
  ✓ SSE progress works | ✓ Nav entry visible | ✓ Edit-rerun preserves state |
  ✓ 12+ tests | omega_floor >= 1.0 | SVI delta: +3%

**FEATURE CASCADE:**
  NEW_HOOKS: wedm-output-gate
  NEW_ACTIONS: none (uses existing prism_edm actions)
  NEW_SKILLS: /wire-edm-program
  AVAILABLE_TO: M2, M3, M6

**/compact checkpoint after U-WEUP06**

---

## MILESTONE M2: Wire FeatureEditorPanel for wire_edm Mode
**Priority:** P0 | **Units:** 4 | **Sessions:** 1
**Depends on:** M1

### SESSION 3: Wire Feature Editor (U-WEFE01..U-WEFE04)
```
SMART CONFIG: Role=UIEngineer + EDMProcessEngineer | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: EDMDrawingInterpretationEngine (886L — punch/die/slot/pocket classification),
           EDMWireSlugCornerTaperEngine (961L — slug management, corner comp)
  UI PATTERNS: FeatureEditorPanel.tsx (already supports wire_edm mode),
               WireEdmContourPicker.tsx (bidirectional selection pattern)
  REFERENCE: SecondaryOpsEngine (stress relief, recast removal presets)
INTENT: User clicks contour → feature panel opens → edits dimensions → assigns
  secondary ops (stress relief, grinding, recast etch). Changes trigger re-solve.
SKILLS: /forge-wiring, /test
```

**U-WEFE01**: Map ContourData → PartFeature[] for wire_edm mode
  - Feature types: PUNCH_PROFILE, DIE_PROFILE, SLOT, POCKET, RELIEF, TAB
  - Dims: perimeter_mm, area_mm2, min_radius_mm, taper_angle_deg, offset_mm
  - 4-LOOP | FILES_MODIFIED: FeatureEditorPanel.tsx (extend wire-specific presets)
  - ABORT_CRITERIA: >3 TS errors | contour-to-feature mapping loses geometry

**U-WEFE02**: Wire-specific secondary ops presets
  - Stress relief anneal (post-EDM tensile stress → compressive)
  - Recast layer removal (chemical etch or light surface grind)
  - Post-EDM grinding allowance (leave 0.1-0.3mm for surface grind)
  - Hard coating (TiN/DLC for punch/die surfaces)
  - Polish allowance (die cavity mirror finish)
  - 4-LOOP | FILES_MODIFIED: FeatureEditorPanel.tsx (add WEDM_SECONDARY_OP_PRESETS)
  - ABORT_CRITERIA: >3 TS errors | presets missing spec references

**U-WEFE03**: Contour picker ↔ feature editor bidirectional selection
  - Click contour in picker → FeatureEditorPanel selects that feature
  - Click feature in tree → contour highlights in picker
  - Shared selectedFeatureId state through parent component
  - 4-LOOP | FILES_MODIFIED: CalculatorPage.tsx or WireEdmWizardPage.tsx
  - ABORT_CRITERIA: >3 TS errors | bidirectional sync broken | selection state leaks

**U-WEFE04**: Tests (10+) for wire feature editor
  - Test contour-to-feature mapping, secondary op CRUD, bidirectional selection
  - 4-LOOP | FILES_CREATED: src/__tests__/wedm-feature-editor.test.ts
  - ABORT_CRITERIA: <10 tests | trivial assertions | no edge cases

**FORGE-TRIPLE for M2:**
  HOOK: `wedm-feature-validate` — validates feature dimensions before solve (min radius > wire dia + gap)
  ACTION: `prism_edm:wedm_classify_features` (existing)
  SKILL: `/wedm-feature-edit` (NEW — CLI feature editor for wire contours)

**EXIT GATE:** ✓ Contours map to features with correct types |
  ✓ Click contour → editor opens with dims | ✓ Secondary ops assignable per contour |
  ✓ Bidirectional selection syncs | ✓ 10+ tests | omega_floor >= 1.0 | SVI delta: +2%

**FEATURE CASCADE:**
  NEW_HOOKS: wedm-feature-validate
  NEW_SKILLS: /wedm-feature-edit
  AVAILABLE_TO: M3, M6

**/compact checkpoint after U-WEFE04**

---

## MILESTONE M3: Connect Studio Wizard to Upload→Results Flow
**Priority:** P1 | **Units:** 4 | **Sessions:** 1
**Depends on:** M1

### SESSION 4: Studio Integration (U-WEST01..U-WEST04)
```
SMART CONFIG: Role=UIEngineer + WorkflowDesigner | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=30%
KNOWLEDGE:
  ENGINES: WEDMCompleteOrchestrationEngine (orchestration flow)
  UI: WireEdmStudioPage.tsx (6-step wizard — StepImport through StepProgram)
  UI: WireEdmUploadPage.tsx (M1), WireEdmResultsPage.tsx (M1)
INTENT: Studio wizard and upload wizard are unified — user chooses Quick or Studio mode.
  Studio output feeds into results page for download.
SKILLS: /forge-wiring, /test
```

**U-WEST01**: Studio entry from upload page — "Open in Studio" button
  - 4-LOOP | FILES_MODIFIED: WireEdmUploadPage.tsx, WireEdmWizardPage.tsx
  - ABORT_CRITERIA: >3 TS errors | studio doesn't receive parsed DXF data

**U-WEST02**: Studio output → results page — "View Results" button
  - 4-LOOP | FILES_MODIFIED: WireEdmStudioPage.tsx, WireEdmResultsPage.tsx
  - ABORT_CRITERIA: >3 TS errors | results page shows mock instead of studio output

**U-WEST03**: Quick/Studio mode selector on wizard page
  - After upload: user picks "Quick Mode" (auto-everything) or "Studio Mode" (full control)
  - 4-LOOP | FILES_MODIFIED: WireEdmWizardPage.tsx
  - ABORT_CRITERIA: mode selector not visible | routing broken

**U-WEST04**: Tests (8+)
  - 4-LOOP | FILES_CREATED: src/__tests__/wedm-studio-integration.test.ts
  - ABORT_CRITERIA: <8 tests

**FORGE-TRIPLE for M3:**
  HOOK: forge_triple_note: "M3 wires existing components — no new hook needed"
  ACTION: `prism_edm:wedm_run_pipeline` (existing — used by both quick and studio)
  SKILL: `/wedm-studio` (NEW — open studio wizard from CLI)

**EXIT GATE:** ✓ Studio receives uploaded DXF | ✓ Studio results in results page |
  ✓ Quick/Studio mode works | ✓ 8+ tests | omega_floor >= 1.0 | SVI delta: +1%

**/compact checkpoint after U-WEST04**

---

## MILESTONE M4: Wire EDM Shop Profile Integration
**Priority:** P1 | **Units:** 4 | **Sessions:** 1
**Depends on:** M1

### SESSION 5: Shop Profile Wire EDM (U-WESP01..U-WESP04)
```
SMART CONFIG: Role=SystemArchitect + WireEDMSpecialist | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=30%
KNOWLEDGE:
  ENGINES: EDMMaterialMachineWireEngine (1753L — machine selection + wire compatibility),
           ShopConfigurationEngine (existing — extend for wire EDM)
  REFERENCE: wedm-published-machines.ts (10 machine specs)
  UI: ShopProfilePage.tsx (extend existing page)
INTENT: User adds their Sodick/Makino/etc to shop profile. Programs respect UV travel,
  max taper, auto-threading, submerged capability. Wire inventory tracked.
SKILLS: /forge-wiring, /test
```

**U-WESP01**: Add wire EDM machine fields to ShopMachine type
  - Brand, controller, UV travel (mm), max taper (deg), max workpiece height (mm)
  - Auto-threading, submerged cutting, wire types in stock
  - 4-LOOP | FILES_MODIFIED: ShopConfigurationEngine.ts, ShopProfilePage.tsx
  - ABORT_CRITERIA: >3 TS errors | machine fields not persisted

**U-WESP02**: Machine selection in wizard uses shop profile
  - 4-LOOP | FILES_MODIFIED: WireEdmWizardPage.tsx
  - ABORT_CRITERIA: wizard doesn't show user's machines

**U-WESP03**: Wire inventory in shop profile
  - Track wire types, spool lengths, alert when running low
  - 4-LOOP | FILES_MODIFIED: ShopProfilePage.tsx, shopProfile.ts route
  - ABORT_CRITERIA: wire inventory not persisted

**U-WESP04**: Tests (8+)
  - 4-LOOP | FILES_CREATED: src/__tests__/wedm-shop-profile.test.ts
  - ABORT_CRITERIA: <8 tests

**FORGE-TRIPLE for M4:**
  HOOK: `wedm-machine-limits-gate` — blocks program if UV travel/taper exceeds user's machine
  ACTION: `prism_edm:wedm_select_machine` (existing — wire to shop profile)
  SKILL: `/wedm-shop-setup` (NEW — configure wire EDM machines from CLI)

**EXIT GATE:** ✓ Wire EDM machines in shop profile | ✓ Programs use machine limits |
  ✓ Wire inventory tracked | ✓ 8+ tests | omega_floor >= 1.0 | SVI delta: +2%

**/compact checkpoint after U-WESP04**

---

## MILESTONE M5: Enhanced Wire EDM Calculator Panels
**Priority:** P1 | **Units:** 6 | **Sessions:** 2
**Depends on:** M1

### SESSION 6: Wire-Specific Panels (U-WECP01..U-WECP03)
```
SMART CONFIG: Role=UIEngineer + EDMPhysicist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: EDMMonitorSurfaceIntegrityEngine (1310L), EDMCostDocumentationEngine (1299L),
           EDMFeasibilityEngine (838L)
  FORMULAS: Carslaw & Jaeger recast: d_recast = 2*sqrt(alpha*t_on)
            Klocke Ra: Ra = k_ra * I_p^alpha * t_on^beta
            DiBitonto crater: d_crater = K1 * E^(1/3)
  UI PATTERNS: LatheChatterPanel, LatheCostPanel (templates for new wire panels)
INTENT: Calculator shows surface integrity prediction, cost breakdown, and feasibility
  check when in wire_edm mode. Machinist sees recast depth, HAZ, spec compliance.
SKILLS: /forge-engines, /test, /physics-verify
```

**U-WECP01**: WireEdmSurfaceIntegrityPanel
  - Recast depth, HAZ depth, residual stress, spec compliance (aerospace/medical/precision/general)
  - Cross-section diagram showing recast/HAZ zones
  - Wire: prism_edm:wedm_assess_surface_integrity
  - 4-LOOP | FILES_CREATED: web/src/components/calculator/WireEdmSurfaceIntegrityPanel.tsx
  - ABORT_CRITERIA: >3 TS errors | recast formula not Carslaw & Jaeger | wrong spec limits

**U-WECP02**: WireEdmCostBreakdownPanel
  - Wire cost, power, dielectric, consumables, labor, per-pass cost progression
  - Wire: prism_edm:wedm_estimate_cost
  - 4-LOOP | FILES_CREATED: web/src/components/calculator/WireEdmCostBreakdownPanel.tsx
  - ABORT_CRITERIA: >3 TS errors | missing cost categories

**U-WECP03**: WireEdmFeasibilityPanel
  - Conductivity check, tolerance achievability, min inside radius, taper feasibility
  - Wire: prism_edm:wedm_assess_feasibility
  - 4-LOOP | FILES_CREATED: web/src/components/calculator/WireEdmFeasibilityPanel.tsx
  - ABORT_CRITERIA: >3 TS errors | non-conductive material not caught

### SESSION 7: Shared Cross-Mode Components (U-WECP04..U-WECP06)
```
SMART CONFIG: Role=UIEngineer + ComponentArchitect | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=30%
KNOWLEDGE:
  UI: WireEdmPassChart (154L — template), LatheToolLifePanel, LatheCostPanel
INTENT: Build shared components that both wire EDM and lathe use — pass schedule chart,
  surface integrity card. Reduces duplication, improves consistency.
SKILLS: /test, /forge-wiring
```

**U-WECP04**: PassScheduleChart — shared component (wire passes + lathe threading passes)
  - 4-LOOP | FILES_CREATED: web/src/components/calculator/PassScheduleChart.tsx
  - ABORT_CRITERIA: >3 TS errors | doesn't accept both wire and lathe data formats

**U-WECP05**: SurfaceIntegrityCard — shared component (wire recast + lathe white layer)
  - 4-LOOP | FILES_CREATED: web/src/components/calculator/SurfaceIntegrityCard.tsx
  - ABORT_CRITERIA: >3 TS errors | doesn't render for both modes

**U-WECP06**: Tests (10+) + wire panels into CalculatorPage
  - 4-LOOP | FILES_CREATED: src/__tests__/wedm-calculator-panels.test.ts
  - FILES_MODIFIED: CalculatorPage.tsx (add panel rendering for wire_edm mode)
  - ABORT_CRITERIA: <10 tests | panels not visible in wire_edm mode

**FORGE-TRIPLE for M5:**
  HOOK: `wedm-feasibility-gate` — blocks solve if material not conductive or tolerance impossible
  ACTION: `prism_edm:wedm_assess_feasibility` (existing)
  SKILL: `/wedm-feasibility` (NEW — quick feasibility check from CLI)

**EXIT GATE:** ✓ Surface integrity shows recast + HAZ + spec compliance |
  ✓ Cost breakdown covers wire + power + dielectric + consumables |
  ✓ Feasibility catches non-conductive + impossible tolerance |
  ✓ Shared components work for both wire + lathe |
  ✓ 10+ tests | omega_floor >= 1.0 | SVI delta: +3%

**FEATURE CASCADE:**
  NEW_HOOKS: wedm-feasibility-gate
  NEW_SKILLS: /wedm-feasibility
  NEW_COMPONENTS: PassScheduleChart (shared), SurfaceIntegrityCard (shared)
  AVAILABLE_TO: M6, M7

**/compact checkpoint after U-WECP06**

---

## MILESTONE M6: 30-Part Validation + Production Gate
**Priority:** P1 | **Units:** 8 | **Sessions:** 3
**Depends on:** M1, M2, M4, M5

### SESSION 8: Common Parts (U-WEVA01..U-WEVA03)
```
SMART CONFIG: Role=TestEngineer + WireEDMValidator | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: All 29 WEDM engines
  REFERENCE: wedm-published-conditions.ts, wedm-published-machines.ts
  DATA: data/programs/ (existing wire EDM programs)
INTENT: Prove 30 diverse parts produce correct, safe, spec-compliant programs.
SKILLS: /test, /program-validate, /physics-verify
```

**U-WEVA01**: 10 punch/die profiles (D2, S7, A2, M2, carbide × 10-100mm thickness)
  - 4-LOOP | FILES_CREATED: src/__tests__/wedm-validation-30parts.test.ts
  - ABORT_CRITERIA: <10 part tests | mock data in any test

**U-WEVA02**: 10 precision parts (tight tolerance, micro features, medical, turbine slots)
  - 4-LOOP | FILES_MODIFIED: wedm-validation-30parts.test.ts
  - ABORT_CRITERIA: <20 cumulative tests

**U-WEVA03**: 10 complex parts (multi-opening, taper, bi-material, thick, wire break recovery)
  - 4-LOOP | FILES_MODIFIED: wedm-validation-30parts.test.ts
  - ABORT_CRITERIA: <30 cumulative tests

### SESSION 9: Fix + Certify (U-WEVA04..U-WEVA06)

**U-WEVA04**: Fix all failures — iterate to 90%+ (27/30)
  - 4-LOOP | FILES_MODIFIED: engine files as needed
  - ABORT_CRITERIA: pass rate < 90%

**U-WEVA05**: WEDM_VALIDATION_REPORT.json
  - 4-LOOP | FILES_CREATED: data/state/WEDM_VALIDATION_REPORT.json
  - ABORT_CRITERIA: report missing any part

**U-WEVA06**: Regression suite (15 best → permanent CI tests)
  - 4-LOOP | FILES_CREATED: src/__tests__/wedm-regression-suite.test.ts
  - ABORT_CRITERIA: <15 regression tests

### SESSION 10: Production Gate (U-WEVA07..U-WEVA08)

**U-WEVA07**: WEDM_PRODUCTION_READINESS.json
  - 4-LOOP | FILES_CREATED: data/state/WEDM_PRODUCTION_READINESS.json
  - ABORT_CRITERIA: score < 85

**U-WEVA08**: Wire EDM skills: /wedm-program, /wedm-feasibility, /wedm-cost
  - 4-LOOP | FILES_CREATED: 3 skill files
  - ABORT_CRITERIA: <3 skills | skills don't call real dispatchers

**FORGE-TRIPLE for M6:**
  HOOK: `wedm-production-gate` — blocks deployment if validation < 90% or readiness < 85
  ACTION: `prism_edm:wedm_verify_quality` (existing)
  SKILL: `/wedm-validate` (NEW — run validation suite from CLI)

**EXIT GATE:** ✓ 27/30 parts correct (90%) | ✓ Cycle time within 20% of reference |
  ✓ Zero programs with recast exceeding spec | ✓ Regression suite in CI |
  ✓ Production readiness score >= 85 | omega_floor >= 1.0 | SVI delta: +4%

**/compact checkpoint after U-WEVA08**

---

## MILESTONE M7: Lathe Backport — Wire EDM Patterns to Lathe
**Priority:** P2 | **Units:** 6 | **Sessions:** 2
**Depends on:** M5

### SESSION 11: Shared Components on Lathe (U-WEBK01..U-WEBK03)
```
SMART CONFIG: Role=UIEngineer + TurningSpecialist | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=30%
KNOWLEDGE:
  COMPONENTS: PassScheduleChart (M5), SurfaceIntegrityCard (M5)
  UI: LatheThreadingPanel, LatheHardTurningPanel, LatheCostPanel
INTENT: Lathe gets wire EDM's better viz: pass chart on threading, surface integrity
  on hard turning, enhanced cost breakdown. Both modes look and feel unified.
SKILLS: /test, /forge-wiring
```

**U-WEBK01**: Pass schedule chart on lathe threading panel
  - 4-LOOP | FILES_MODIFIED: LatheThreadingPanel.tsx
  - ABORT_CRITERIA: chart doesn't render | wrong pass data format

**U-WEBK02**: Surface integrity card on hard turning results
  - 4-LOOP | FILES_MODIFIED: LatheHardTurningPanel.tsx
  - ABORT_CRITERIA: card doesn't show white layer | missing VB limit

**U-WEBK03**: Enhanced cost breakdown on lathe results (per-operation allocation)
  - 4-LOOP | FILES_MODIFIED: LatheCostPanel.tsx
  - ABORT_CRITERIA: cost breakdown less detailed than wire EDM version

### SESSION 12: Unified Patterns + Tests (U-WEBK04..U-WEBK06)

**U-WEBK04**: Unified results page base layout
  - Abstract shared layout: tabs, safety score, download buttons
  - Both lathe + wire EDM use same base, mode-specific content via children
  - 4-LOOP | FILES_CREATED: web/src/components/results/ResultsPageLayout.tsx
  - ABORT_CRITERIA: >3 TS errors | layout breaks existing pages

**U-WEBK05**: Feature editor improvements
  - Per-mode dimension validation (min/max ranges)
  - Linked dims (change OD → wall thickness updates)
  - 4-LOOP | FILES_MODIFIED: FeatureEditorPanel.tsx
  - ABORT_CRITERIA: validation breaks existing functionality

**U-WEBK06**: Tests (10+)
  - 4-LOOP | FILES_CREATED: src/__tests__/shared-components.test.ts
  - ABORT_CRITERIA: <10 tests

**FORGE-TRIPLE for M7:**
  HOOK: `unified-results-gate` — validates results page renders all required sections
  ACTION: `prism_turning:turning_calc_to_program` (existing — enhanced with shared viz)
  SKILL: `/lathe-thread` (ENHANCED — now shows pass schedule chart)

**EXIT GATE:** ✓ Pass chart on threading panel | ✓ Surface integrity on hard turning |
  ✓ Unified results layout | ✓ Feature editor validation works both modes |
  ✓ 10+ tests | omega_floor >= 1.0 | SVI delta: +2%

---

## SCORING TARGET

| Dimension | Current | After M1-M2 | After M3-M5 | After M6-M7 |
|-----------|---------|-------------|-------------|--------------|
| Upload→program flow | 40% | 85% | 90% | 95% |
| Feature editor | 0% (wire) | 80% | 85% | 90% |
| Shop personalization | 0% | 0% | 80% | 85% |
| Surface integrity UI | 30% | 40% | 90% | 90% |
| Part diversity | 60% | 65% | 70% | 90% |
| User experience | 35% | 70% | 85% | 90% |
| **Composite** | **~28%** | **~57%** | **~75%** | **~90%** |
