# LATHE-UNIFIED — Print → Optimized Program + Calculator Integration Roadmap

## Track: LATHE-UNIFIED | Version: 1.0.0 | Created: 2026-04-09
## Goal: Upload print/CAD → fully optimized CNC lathe program for YOUR shop's equipment,
##       with calculator page panels for every turning operation, tool purchase ROI,
##       and full integration of 78 lathe engines + 136 dispatcher actions
## Total Milestones: 10 | Total Units: 68 | Estimated Sessions: 23

---

## SYSTEM INVENTORY (what we're wiring)

| Asset | Count |
|-------|-------|
| Lathe engines | 78 (43,857 lines) |
| Dispatcher actions | 136+ (70 turning + 14 program + 21 thread + 3 pipeline + 28 secondary) |
| Calculator page | 633KB, lathe modes exist, 10 panels missing |
| Upload/Wizard/Results pages | 3 pages, all using mock data |
| Components | LatheBackplot, AmbiguityResolver, SetupInstructionPanel, LatheInputWizard |
| REST endpoints | 12 (5 lathe + 7 turning) |
| Tool catalogs | 4 vendors, 5,781+ turning tools |
| Real CNC programs | 2,118 Okuma production files |
| Post processors | 95 CPS files, 40+ controllers |
| Canned cycles | 9 (G71/G70/G72/G73/G74/G75/G76/G32/G92) |
| Controller dialects | 6 (Fanuc, Haas, Okuma, Mazak, Siemens, DMG MORI) |
| Existing UI engines (unwired) | ShopConfigurationEngine, ToolCribEngine, ToolROIEngine, ROIAdvisorEngine |
| Existing UI components (unwired) | PurchaseRecommendationModal, DownloadButtons, ExportButton |

### KEY INSIGHT
**This is a WIRING roadmap, not an engineering roadmap.** 78 engines and 136 actions sit behind
a UI that uses mock data. The #1 priority is connecting what exists — not building new engines.

---

## PHASE STRUCTURE

```
PHASE 1: CALCULATOR PANELS        M1: Threading + Insert + Workholding Panels [9 units]
(Expose 78 engines in calculator)  M2: Grooving + Hard Turn + Tool Life + Boring Panels [9 units]
                                   M3: Chatter + Cost + Spindle + Program Gen Button [6 units]

PHASE 2: UPLOAD PIPELINE           M4: Wire Upload → Real Backend (replace all mocks) [8 units]
(Make upload→program REAL)

PHASE 3: SHOP PERSONALIZATION      M5: Shop Profile + Machine Config + Tool Magazine [8 units]
(YOUR machines, YOUR tools)

PHASE 4: TOOLING INTELLIGENCE      M6: Tool Purchase ROI + Cost Analysis [8 units]
(Smart purchasing + economics)      M7: Tool Life Optimization + Alternatives [6 units]

PHASE 5: DEPTH + VALIDATION        M8: Wire LATHE-PRO MS6b-MS12 (remaining depth) [6 units]
(Prove it works, wire remaining)    M9: 50-Part Validation Suite [6 units]

PHASE 6: PRODUCTION READY          M10: Navigation + Skills + Production Gates [4 units]
```

---

## MILESTONE M1: Calculator Threading + Insert + Workholding Panels
**Priority:** P0 | **Units:** 9 | **Sessions:** 3
**Depends on:** Nothing
**Intent:** When a user selects "lathe" on the calculator page, they see panels for threading,
  insert selection, and workholding — powered by 34 existing engines and 29 dispatcher actions.
**Existing engines:** ThreadCalculationEngine (723L), ThreadGageEngine (165L), SinglePointThreadEngine (385L),
  ThreadMethodSelectorEngine (183L), ThreadMillingPhysicsEngine (1228L), InsertGradeSelectionEngine (355L),
  ChuckJawForceEngine (218L), WorkholdingEngine (1511L), WorkholdingIntelligenceEngine (499L),
  WorkholdingVerificationEngine (466L), TailstockForceEngine (201L), SteadyRestPlacementEngine (177L)
**Existing dispatchers:** prism_thread (21 actions), prism_turning (chuck_force, tailstock, steady_rest,
  turning_jaw_select, turning_trilobe_analysis, turning_mandrel_sizing, turning_face_driver_check)

### SESSION 1: Threading Calculator Panel (U-CALC01..U-CALC03)
```
SMART CONFIG: Role=UIEngineer + ThreadingSpecialist | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: ThreadCalculationEngine, ThreadGageEngine, SinglePointThreadEngine, ThreadMethodSelectorEngine
  DISPATCHERS: prism_thread (21 actions), prism_turning (turning_thread_* 8 actions)
  UI: CalculatorPage.tsx (633KB), SpeedFeedPanel.tsx
INTENT: User selects "Threading" operation in calculator → sees complete thread parameter panel
  with form selection, pitch diameter, 3-wire measurement, infeed method, go/no-go gages.
```

**U-CALC01**: ThreadingPanel component
  - Input: thread designation (M10x1.5, 1/4-20 UNC, 1/2-14 NPT, etc.)
  - Auto-parse via `prism_thread:calculate_tap_drill` → pitch, major/minor dia, pitch dia
  - Display: thread geometry diagram, tolerance class, pitch diameter limits
  - Wire: `prism_turning:turning_thread_calculate` for full calculation
  - FILES_CREATED: web/src/components/calculator/ThreadingPanel.tsx

**U-CALC02**: Thread measurement sub-panel
  - 3-wire measurement calculator: best wire size, M value over wires
  - Go/no-go gage dimensions per class (2A/3A, 6g/6H)
  - Wire: `prism_thread:get_go_nogo_gauges`, `prism_turning:turning_thread_measure`
  - Thread relief groove: DIN 76 dimensions from `prism_turning:turning_thread_relief_groove`

**U-CALC03**: Infeed method advisor sub-panel
  - Material + pitch + form → recommended infeed method (radial/flank/modified/alternating/constant-area)
  - Spring pass count by material group
  - Pass schedule visualization (depth per pass chart)
  - Wire: `prism_turning:turning_thread_infeed_select`
  - G76 syntax preview for selected controller

### SESSION 2: Insert Selection Panel (U-CALC04..U-CALC06)

**U-CALC04**: InsertSelectorPanel component
  - Input: material ISO group, operation (rough/finish/groove/thread), DOC, feed
  - Output: insert shape (CNMG/DNMG/VNMG/etc), grade, chipbreaker, nose radius
  - Wire: InsertGradeSelectionEngine via `prism_turning:turning_cbn_select` (hard turning)
    and direct engine call for general insert selection
  - Show: insert diagram with geometry dimensions
  - Cross-reference: 4 manufacturer catalogs (Kennametal, Tungaloy, Mitsubishi, Widia)
  - FILES_CREATED: web/src/components/calculator/InsertSelectorPanel.tsx

**U-CALC05**: Insert catalog browser sub-panel
  - Filter by: shape, grade, material group, chipbreaker type
  - Show: available inserts from all 4 catalogs with pricing
  - Compare: up to 3 inserts side-by-side (life, cost, finish capability)
  - Wire: ToolCatalogEngine data + InventoryAwareToolSelectorEngine

**U-CALC06**: Holder recommendation sub-panel
  - Given selected insert: recommend compatible holders
  - Show: holder orientation (B1/B2/B3/B4), minimum stickout
  - Include: boring bars with L/D ratio and deflection check
  - Wire: BoringBarEngine, BoringBarDeflectionEngine

### SESSION 3: Workholding Panel (U-CALC07..U-CALC09)

**U-CALC07**: WorkholdingPanel component
  - Input: part OD, grip length, material, operation forces
  - Output: required chuck force, jaw type (hard/soft/special), tailstock yes/no
  - Safety: 2.5× SF per ISO 10218 — show RED if insufficient
  - Wire: `prism_turning:chuck_force`, `prism_turning:tailstock`, `prism_turning:steady_rest`
  - FILES_CREATED: web/src/components/calculator/WorkholdingPanel.tsx

**U-CALC08**: Workholding intelligence sub-panel
  - Trilobe deformation check for thin walls: `prism_turning:turning_trilobe_analysis`
  - Soft jaw boring recommendation: `prism_turning:turning_soft_jaw_boring`
  - Expanding mandrel sizing: `prism_turning:turning_mandrel_sizing`
  - Face driver check: `prism_turning:turning_face_driver_check`
  - Show: recommended workholding strategy with reasoning

**U-CALC09**: Tests (12+) for all 3 panels
  - Test each panel renders with real manufacturing inputs
  - Test dispatcher actions return valid data
  - Test edge cases: zero diameter, missing material, internal thread

**FORGE-TRIPLE:**
  HOOK: `calculator-lathe-panel-gate` — validates panel inputs before engine call
  ACTION: `prism_turning:turning_calculator_threading` (composite action)
  SKILL: `/lathe-calc`

**EXIT GATE:** ✓ Threading panel shows pitch dia within 0.001mm of reference |
  ✓ Insert selector returns valid ISO 513 grade | ✓ Workholding shows safety factor |
  ✓ 12+ tests | ✓ All panels call real dispatcher actions (no mock data)

---

## MILESTONE M2: Calculator Grooving + Hard Turn + Tool Life + Boring Panels
**Priority:** P0 | **Units:** 9 | **Sessions:** 3
**Depends on:** M1
**Intent:** Complete the calculator's lathe operation coverage with grooving/parting,
  hard turning advisor, tool life estimation, and boring bar selection.
**Existing engines:** GrooveClassificationEngine (460L), PartOffForceEngine (223L),
  HardTurningDecisionEngine (463L), TurningInsertLifeEngine (478L),
  TurningWearPredictionEngine (478L), BoringBarEngine (234L), BoringBarDeflectionEngine (220L),
  BoreFinishingEngine (297L), HoningEngine (351L)

### SESSION 4: Grooving + Hard Turning Panels (U-CALC10..U-CALC12)

**U-CALC10**: GroovingPartingPanel component
  - Groove type selector: 8 types (full-radius, V, rectangular, O-ring, circlip, thread relief, bearing relief, face)
  - Per-type: dimensions, strategy (single plunge/shift/peck), blade stress check
  - Peck intelligence by material (ISO group → peck depth, retract, coolant)
  - Part-off: blade width selection, feed reduction curve, part catcher timing
  - Wire: `prism_turning:turning_groove_classify`, `turning_partoff_optimize`
  - FILES_CREATED: web/src/components/calculator/GroovingPartingPanel.tsx

**U-CALC11**: HardTurningPanel component
  - Input: hardness (HRC), surface finish target, interrupted cut yes/no
  - Output: hard turning vs grinding recommendation with confidence %
  - CBN/ceramic insert selection with grade, edge prep, DOC limit
  - Surface integrity prediction: white layer depth, residual stress
  - Grinding replacement comparison: side-by-side (Ra, cycle time, cost, Cpk)
  - Wire: `prism_turning:turning_hard_turning_analyze`
  - FILES_CREATED: web/src/components/calculator/HardTurningPanel.tsx

**U-CALC12**: Tests (10+)

### SESSION 5: Tool Life + Boring Panels (U-CALC13..U-CALC15)

**U-CALC13**: ToolLifePanel component
  - Input: insert grade, material, speed, feed, DOC
  - Output: predicted tool life (minutes), parts per edge, cost per part
  - Batch planning: "This 500-part batch will use 8 inserts at T03"
  - Wear curve visualization (flank wear VB vs cutting time)
  - Wire: `prism_turning:turning_predict_insert_life`, `turning_batch_life_plan`
  - FILES_CREATED: web/src/components/calculator/ToolLifePanel.tsx

**U-CALC14**: BoringPanel component
  - Input: bore ID, depth, bar material (steel/carbide/dampened)
  - L/D ratio check with color coding (green/yellow/red)
  - Deflection prediction: δ = F×L³/(3EI) with tolerance comparison
  - Bar material recommendation: steel ≤4, carbide ≤6, dampened ≤10
  - Honing parameters for precision bores (stone, pressure, grit)
  - Wire: `prism_turning:lathe_boring_reach`, `lathe_beam_deflection`
  - FILES_CREATED: web/src/components/calculator/BoringPanel.tsx

**U-CALC15**: Tests (10+)

**FORGE-TRIPLE:**
  HOOK: `hard-turning-safety-gate` — blocks hard turning params if VB limit exceeded
  ACTION: `prism_turning:turning_calculator_grooving` (composite)
  SKILL: `/lathe-groove`

**EXIT GATE:** ✓ All 4 panels render with real data | ✓ Hard turning recommends CBN for 60 HRC |
  ✓ Tool life matches Taylor within 15% | ✓ Boring deflection uses .toBeCloseTo() | ✓ 10+ tests

---

## MILESTONE M3: Calculator Chatter + Cost + Spindle + Program Generation
**Priority:** P1 | **Units:** 6 | **Sessions:** 2
**Depends on:** M1, M2
**Intent:** Complete remaining calculator panels and add the critical "Generate Program" button
  that takes calculator parameters and produces a full CNC program.
**Existing engines:** ChatterStabilityLobeEngine, SpindleHarmonicsQualityEngine,
  SpindleTorqueCurveEngine, CostEstimationEngine, JobCostingEngine,
  TurningProgramAssemblerEngine (2615L), TurningPrintToProgramEngine (1794L)

### SESSION 6: Chatter + Cost + Spindle (U-CALC16..U-CALC18)

**U-CALC16**: ChatterPanel component
  - Stability lobe diagram (RPM vs DOC) — SVG chart
  - Safe RPM zones highlighted in green
  - Spindle speed variation (SSV) recommendation for chatter suppression
  - Wire: `prism_turning:lathe_chatter_analysis`
  - FILES_CREATED: web/src/components/calculator/ChatterPanel.tsx

**U-CALC17**: CostPanel component
  - Per-part cost breakdown: material + machine time + tooling + secondary ops + overhead
  - Batch economics: setup amortization, bar remnant optimization
  - Wire: CostEstimationEngine, JobCostingEngine via turning dispatcher
  - FILES_CREATED: web/src/components/calculator/CostPanel.tsx

**U-CALC18**: SpindleTorqueOverlay
  - Overlay on speed/feed results showing torque/power curve
  - Visual: operating point plotted on machine's torque-speed curve
  - Warning if operating near machine power limit
  - Wire: SpindleTorqueCurveEngine, SpindlePowerCheckEngine

### SESSION 7: Program Generation from Calculator (U-CALC19..U-CALC21)

**U-CALC19**: "Generate Program" button on calculator results
  - After user calculates S/F for all operations → "Generate CNC Program" button
  - Collects: all operations with parameters → TurningProgramAssemblerEngine
  - Output: complete G-code program with calculated S/F applied
  - Controller selection from calculator machine mode
  - Opens program viewer modal with syntax highlighting

**U-CALC20**: Program viewer + download modal
  - G-code display with line numbers and operation comments
  - Download as: .nc, .tap (Fanuc), .mpf (Siemens), .min (Okuma)
  - Setup sheet tab
  - Wire: PostDownloadEngine for format conversion

**U-CALC21**: Tests (10+)

**FORGE-TRIPLE:**
  HOOK: `program-gen-safety-gate` — validates all S/F before program generation
  ACTION: `prism_turning:turning_calc_to_program`
  SKILL: `/lathe-program`

**EXIT GATE:** ✓ Chatter SLD renders | ✓ Cost breakdown matches manual within 10% |
  ✓ "Generate Program" produces valid G-code | ✓ Program downloads in 4 formats | ✓ 10+ tests

---

## MILESTONE M4: Wire Upload Pipeline (Replace All Mocks)
**Priority:** P0 | **Units:** 8 | **Sessions:** 3
**Depends on:** M1
**Intent:** The LatheUploadPage → WizardPage → ResultsPage flow works with REAL backend
  processing. Zero mock data. Real file parsing, real physics, real G-code output.

### SESSION 8: Backend Wiring (U-WIRE01..U-WIRE03)

**U-WIRE01**: Wire file upload to real engines
  - LatheUploadPage currently simulates 400ms delay
  - Replace with real callTool: photo → `turning_blueprint_intake`, CAD → `turning_cad_import`
  - Pass extracted dimensions to wizard page via navigation state
  - Handle errors: show AmbiguityResolver for low-confidence dimensions

**U-WIRE02**: Wire wizard submit to real physics pipeline
  - LatheWizardPage POSTs to `/api/v1/lathe/wizard-submit`
  - Backend currently runs 35 visual stages with fake delays
  - Replace: call `turning_print_to_program` or `lathe_orchestrate` with real params
  - Store real result in job object

**U-WIRE03**: Wire SSE progress to frontend
  - SSE endpoint at `/api/v1/lathe/progress/:jobId` exists but frontend ignores it
  - Frontend should: EventSource → update progress bar with real stage names
  - Backend should: broadcast real stage completion events as pipeline runs

### SESSION 9: Results Wiring (U-WIRE04..U-WIRE06)

**U-WIRE04**: Wire results page to real data
  - LatheResultsPage currently calls `createMockResult()` on line 76
  - Replace: fetch from `/api/v1/lathe/result/:jobId`
  - Parse: program_text, cycle_time, tools, cost, safety_checks from engine output
  - Map engine output format → UI component props

**U-WIRE05**: Wire backplot to real moves
  - LatheBackplot currently renders 26 mock moves
  - Parse: LatheOrchestrationEngine output → BackplotMove[] format
  - Map: G00 → rapid, G01 rough → roughing, G01 finish → finishing, G75 → groove, G76 → thread
  - Include: actual XZ coordinates from program

**U-WIRE06**: Wire setup sheet + downloads to real data
  - SetupInstructionPanel currently shows 8 mock steps
  - Parse: engine output → SetupStep[], ToolStation[], MeasurementPoint[]
  - Download buttons: call `/api/v1/lathe/download/:jobId/gcode` (etc.) for real files

### SESSION 10: Error Handling + Tests (U-WIRE07..U-WIRE08)

**U-WIRE07**: Error recovery for all failure modes
  - File upload failure → retry button with error message
  - Engine timeout → partial results with warning
  - Missing feature → degrade gracefully, show what worked
  - Network failure → queued retry (not silent mock fallback)

**U-WIRE08**: End-to-end integration tests (10+)
  - Test: upload → wizard → submit → progress → results → download (full flow)
  - Test: each file type (PDF, STEP, photo)
  - Test: error recovery paths
  - Test: SSE progress events received
  - Test: download produces valid .nc file

**FORGE-TRIPLE:**
  HOOK: `pipeline-output-gate` — blocks delivery if ProgramValidateEngine fails
  ACTION: `prism_turning:turning_upload_to_program`
  SKILL: `/print-to-lathe`

**EXIT GATE:** ✓ Zero mock data in upload→results flow | ✓ SSE progress works |
  ✓ Real G-code in results | ✓ Downloads produce real files |
  ✓ Error recovery for all modes | ✓ 10+ tests

---

## MILESTONE M5: Shop Profile + Machine Config + Tool Magazine
**Priority:** P0 | **Units:** 8 | **Sessions:** 3
**Depends on:** M4
**Intent:** User configures their shop (machines, tools, preferences). Every program
  generated is optimized for THEIR equipment. Tools in their magazine are used first.
**Existing engines:** ShopConfigurationEngine (exists, needs persistence),
  ToolCribEngine (exists, needs API), InventoryAwareToolSelectorEngine (exists),
  MachineRegistryEngine (910 machines)

### SESSION 11: Shop Profile (U-SHOP01..U-SHOP03)

**U-SHOP01**: Persist ShopConfigurationEngine
  - Currently in-memory Map — swap to JSON file persistence
  - Add: machine brand/model autocomplete from MachineRegistry (910 machines)
  - Auto-populate: controller, max RPM, max power, work envelope from registry
  - REST API: POST/PUT/GET `/api/v1/shop/profile`

**U-SHOP02**: ShopProfilePage (new web page)
  - Add/remove machines with autocomplete search
  - Per-machine: controller, capabilities, coolant, bar feeder, sub-spindle, live tooling
  - Shop preferences: optimization priority, default material, tolerance class
  - Save button → persist to `data/shop/shop-profile.json`
  - FILES_CREATED: web/src/pages/ShopProfilePage.tsx

**U-SHOP03**: Wire shop profile to program generation
  - LatheOrchestrationEngine Stage 3 uses machine-specific limits
  - G50 RPM clamp from user's actual machine max RPM
  - Controller dialect auto-selected from user's machine controller
  - Work envelope checked against user's actual X/Z travel

### SESSION 12: Tool Magazine (U-SHOP04..U-SHOP06)

**U-SHOP04**: Wire ToolCribEngine with persistence + API
  - Add REST endpoints: GET/POST/PUT `/api/v1/shop/tools`
  - Import from CSV (shop-tools-turning.csv format)
  - Per-machine turret map: T01-T12 → insert + holder
  - Track edge usage on multi-edge inserts

**U-SHOP05**: ToolMagazinePage (new web page)
  - Visual turret layout: 12 stations with current tool assignments
  - Drag-and-drop tool assignment
  - Tool life remaining per station (color-coded)
  - "What tools do I need for this part?" query
  - FILES_CREATED: web/src/pages/ToolMagazinePage.tsx

**U-SHOP06**: Magazine-aware program generation
  - Stage 4 (TOOL_SELECT) checks user's magazine first
  - Tools in magazine → assigned directly with T-number
  - Tools NOT in magazine → flagged with alternatives from magazine
  - Setup sheet includes tool change instructions for missing tools

### SESSION 13: Multi-Machine Routing + Tests (U-SHOP07..U-SHOP08)

**U-SHOP07**: Multi-machine best-fit routing
  - Given part requirements, rank user's machines by suitability
  - Swing/bar capacity vs part OD, power vs MRR, live tooling needs
  - Output: "Best: Haas ST-20 (rating 95%), Alt: Okuma LB3000 (82%)"

**U-SHOP08**: Tests (12+) + wire dispatcher actions
  - Test: shop profile CRUD, persistence across restart
  - Test: magazine tool lookup, alternative suggestion
  - Test: multi-machine routing
  - Actions: `turning_shop_configure`, `turning_magazine_check`, `turning_machine_route`

**FORGE-TRIPLE:**
  HOOK: `shop-profile-gate` — blocks program generation if no shop profile configured
  ACTION: `prism_turning:turning_shop_configure`
  SKILL: `/shop-setup-lathe`

**EXIT GATE:** ✓ Shop profile persists across sessions | ✓ Magazine-aware tool selection |
  ✓ Multi-machine routing ranks correctly | ✓ 12+ tests

---

## MILESTONE M6: Tool Purchase ROI + Cost Analysis
**Priority:** P1 | **Units:** 8 | **Sessions:** 3
**Depends on:** M5
**Intent:** System recommends which tools to BUY with ROI analysis, and provides
  per-part cost breakdowns for quoting.
**Existing engines:** ToolROIEngine (full ROI), ROIAdvisorEngine (upgrade advisor),
  CostEstimationEngine, ActualCostEngine, JobCostingEngine,
  PurchaseRecommendationModal (UI component exists)

### SESSION 14: Purchase Intelligence (U-ROI01..U-ROI03)

**U-ROI01**: Wire ToolROIEngine to calculator + results
  - After S/F calculation: show "Upgrade Tool" button if better option exists
  - ROI card: current cost/part vs proposed cost/part, payback period
  - Wire: ToolROIEngine (already has budget/standard/premium tiers)
  - Wire: PurchaseRecommendationModal (already built as component)

**U-ROI02**: ToolPurchasePage (new web page)
  - Dashboard: recommended purchases ranked by ROI
  - Per-tool: cost, expected savings, payback period, annual value
  - Filter by: urgency, ROI magnitude, material application
  - "Add to cart" → export as purchase order CSV
  - FILES_CREATED: web/src/pages/ToolPurchasePage.tsx

**U-ROI03**: Tooling package recommendations
  - Starter packages by material family (steel, stainless, aluminum, exotic)
  - Upgrade packages: current inventory vs optimal
  - Wire: ROIAdvisorEngine for upgrade suggestions with payback

### SESSION 15: Cost Breakdown + Batch Economics (U-ROI04..U-ROI06)

**U-ROI04**: Per-part cost breakdown
  - Material: bar stock × weight × $/kg
  - Machine time: hourly rate × cycle time (from ShopConfigurationEngine rates)
  - Tooling: insert cost ÷ parts per edge (from TurningInsertLifeEngine)
  - Secondary ops: heat treat, plating, grinding (from SecondaryOpsEngine)
  - Overhead: shop rate allocation
  - Wire: CostEstimationEngine, ActualCostEngine, JobCostingEngine

**U-ROI05**: Batch economics optimizer
  - Setup amortization by batch size (1, 10, 100, 500, 5000 parts)
  - Tool change scheduling: minimize changes per batch
  - Bar remnant: parts per bar, bars per batch, remnant waste
  - Break-even: at what volume does a tool upgrade pay off?

**U-ROI06**: Tests (10+)

### SESSION 16: Manufacturer Comparison + Tests (U-ROI07..U-ROI08)

**U-ROI07**: Manufacturer comparison report
  - Same insert shape (CNMG 120408) across Kennametal, Tungaloy, Mitsubishi, Widia
  - Compare: expected life (Taylor), cost per edge, surface finish capability
  - Recommend: best value per application (not always cheapest)

**U-ROI08**: Tests (10+) + dispatcher actions
  - Actions: `turning_tool_roi`, `turning_purchase_recommend`, `turning_cost_breakdown`
  - Test: ROI within 5% of manual spreadsheet
  - Test: batch economics for varying quantities

**FORGE-TRIPLE:**
  HOOK: `cost-validation-gate` — validates estimates against industry benchmarks
  ACTION: `prism_turning:turning_tool_purchase_roi`
  SKILL: `/tool-roi`

**EXIT GATE:** ✓ ROI within 5% of manual calc | ✓ Per-part cost covers 5 categories |
  ✓ Manufacturer comparison covers 4 vendors | ✓ Batch economics scales | ✓ 10+ tests

---

## MILESTONE M7: Tool Life Optimization + Alternatives
**Priority:** P1 | **Units:** 6 | **Sessions:** 2
**Depends on:** M5, M6
**Existing engines:** TurningInsertLifeEngine (478L), TurningWearPredictionEngine (478L),
  TurningToolpathWearEngine (269L), InsertChangeRecommendationEngine (233L),
  AdaptiveSpindleControlEngine (647L)

### SESSION 17: Life Optimization (U-LIFE01..U-LIFE03)

**U-LIFE01**: Adaptive speed/feed for life extension
  - Taylor: 10% speed reduction → ~40% life increase
  - Auto-generate Fanuc macro for progressive speed reduction
  - Wire: TurningInsertLifeEngine + AdaptiveSpindleControlEngine

**U-LIFE02**: Alternative tool suggestion engine
  - Tool fails early → diagnose: wrong grade/chipbreaker/feed
  - Tool succeeds → log parameters for tribal knowledge
  - Cross-reference: same operation, different inserts → winner
  - Wire: InsertChangeRecommendationEngine

**U-LIFE03**: Predictive tool change scheduling
  - Batch plan: "Change T03 after part 47, T05 after part 112"
  - Wire: TurningWearPredictionEngine + turning_batch_life_plan action

### SESSION 18: Dashboard + Tests (U-LIFE04..U-LIFE06)

**U-LIFE04**: Tool life dashboard data API
  - Per-tool: actual vs predicted life (calibration)
  - Per-material: best insert grades
  - Per-machine: tool consumption rate and cost

**U-LIFE05**: Wire dashboard to ToolMagazinePage
  - Color-coded life remaining on turret visual
  - Alerts for tools below 20% remaining life

**U-LIFE06**: Tests (10+)

**EXIT GATE:** ✓ Speed reduction extends life per Taylor | ✓ Alternatives ranked |
  ✓ Predictive schedule within 20% of actual | ✓ 10+ tests

---

## MILESTONE M8: Wire LATHE-PRO MS6b-MS12 (Remaining Depth)
**Priority:** P2 | **Units:** 6 | **Sessions:** 2
**Depends on:** M4
**Intent:** Wire the remaining LATHE-PRO milestones (MS6b through MS12) by connecting
  existing engines. These are NOT new builds — they're wiring into the orchestration pipeline.

### SESSION 19: Swiss + Chip + Quality (U-DEPTH01..U-DEPTH03)

**U-DEPTH01**: MS6b Swiss production — wire BarPullerTimingEngine, BarStockVibrationEngine,
  guide bush logic, gang slide vs turret into MillTurnSwissPipelineEngine

**U-DEPTH02**: MS7 Chip control — wire ChipBreakingEngine as Stage 8, CoolantStrategyEngine
  per-operation, chip wrapping risk model for CSS, unmanned readiness score

**U-DEPTH03**: MS8-MS9 Quality — wire FirstArticleInspectionPipelineEngine, GaugingEngine,
  MetrologyUncertaintyEngine, TraceabilityEngine, ProcessCapabilityPredictionEngine

### SESSION 20: Cost + Shop Floor + Simulation (U-DEPTH04..U-DEPTH06)

**U-DEPTH04**: MS10 Cost — wire OEEEngine, ActualCostEngine, JobCostingEngine

**U-DEPTH05**: MS11 Shop floor — wire DNCTransferEngine, JobTravelerEngine

**U-DEPTH06**: MS12 Simulation — wire CNCSimulationPipelineEngine, CollisionDetectionEngine
  + tests for all wired capabilities (15+)

**EXIT GATE:** ✓ Chip control in pipeline | ✓ FAI report generates |
  ✓ Simulation detects collision | ✓ 15+ tests

---

## MILESTONE M9: 50-Part Validation Suite
**Priority:** P1 | **Units:** 6 | **Sessions:** 2
**Depends on:** M4, M5

### SESSION 21: Validate 50 Parts (U-VAL01..U-VAL03)

**U-VAL01**: Validation harness against 2,118 Okuma .MIN programs
**U-VAL02**: 25 shaft/bore/sleeve parts (common lathe work)
**U-VAL03**: 25 complex parts (multi-op, difficult materials, threading, grooving)

### SESSION 22: Fix + Certify (U-VAL04..U-VAL06)

**U-VAL04**: Fix all failures — iterate until 90% pass rate
**U-VAL05**: Generate LATHE_VALIDATION_REPORT.json
**U-VAL06**: Extract 20 best cases → permanent regression test suite

**EXIT GATE:** ✓ 45/50 parts correct (90%) | ✓ Cycle time within 15% |
  ✓ Zero unsafe programs | ✓ Regression suite in CI

---

## MILESTONE M10: Navigation + Skills + Production Gates
**Priority:** P2 | **Units:** 4 | **Sessions:** 1
**Depends on:** M4, M9

### SESSION 23: Final Integration (U-FIN01..U-FIN04)

**U-FIN01**: Add lathe to main navigation (shellCatalog.ts)
  - "Lathe Programming" section with sub-items: Upload, Calculator, Tool Magazine, Shop Profile
  - Icon: lathe.png (already exists in web/public/media/machine-modes/)

**U-FIN02**: Create 5 lathe slash-command skills
  - /lathe-program, /lathe-thread, /lathe-groove, /hard-turn, /tool-roi

**U-FIN03**: Production readiness gate
  - Run 20-part regression suite
  - Generate LATHE_PRODUCTION_READINESS.json
  - Score all dimensions, PASS/FAIL gate

**U-FIN04**: Final test sweep — all lathe tests green (250+)

**EXIT GATE:** ✓ Lathe in main nav | ✓ 5 active skills | ✓ Production gate PASSES

---

## DEPENDENCY GRAPH

```
M1 (Calc Panels: Thread/Insert/WH)
  ├──→ M2 (Calc Panels: Groove/HardTurn/Life/Bore)
  │       └──→ M3 (Calc Panels: Chatter/Cost/Spindle + GenProgram)
  │
  └──→ M4 (Wire Upload Pipeline) ──→ M5 (Shop Profile + Magazine)
          │                                  │
          │                                  ├──→ M6 (Tool ROI + Cost)
          │                                  │       └──→ M7 (Tool Life Opt)
          │                                  │
          └──→ M8 (Wire MS6b-MS12) ─────────┤
                                             │
                                        M9 (50-Part Validation)
                                             │
                                        M10 (Nav + Skills + Gates)
```

## SCORING TARGET

| Dimension | Current | After M1-M3 | After M4-M5 | After M6-M10 |
|-----------|---------|-------------|-------------|--------------|
| Calculator lathe panels | 25% | 90% | 90% | 95% |
| Upload→program pipeline | 35% (mock) | 35% | 95% | 95% |
| Shop personalization | 0% | 0% | 90% | 90% |
| Tooling intelligence | 50% | 60% | 65% | 90% |
| Part diversity | 40% | 40% | 50% | 90% |
| Quality/compliance | 30% | 30% | 35% | 80% |
| Cost analysis | 35% | 50% | 55% | 85% |
| User experience | 10% | 40% | 70% | 90% |
| **Composite** | **~28%** | **~43%** | **~64%** | **~89%** |

---

## ENGINE UTILIZATION MAP

### Engines CURRENTLY EXPOSED in calculator (lathe mode):
- SpeedFeedOrchestratorEngine (turning_rough, turning_finish, boring, grooving)

### Engines to be WIRED by this roadmap:

| Milestone | Engines Wired | Count |
|-----------|--------------|-------|
| M1 | ThreadCalc, ThreadGage, SinglePointThread, ThreadMethod, ThreadMillPhysics, InsertGradeSelection, ChuckJawForce, Workholding, WorkholdingIntelligence, WorkholdingVerification, Tailstock, SteadyRest | 12 |
| M2 | GrooveClassification, PartOffForce, HardTurningDecision, TurningInsertLife, TurningWearPrediction, BoringBar, BoringBarDeflection, BoreFinishing, Honing | 9 |
| M3 | ChatterStabilityLobe, SpindleHarmonics, SpindleTorqueCurve, SpindlePowerCheck, CostEstimation, JobCosting, TurningProgramAssembler | 7 |
| M4 | TurningPrintIntake, TurningCADImport, TurningRevProfile, TurningFeatureTaxonomy, LatheOrchestration, PostDownload | 6 |
| M5 | ShopConfiguration, ToolCrib, InventoryAwareToolSelector, MachineRegistry | 4 |
| M6 | ToolROI, ROIAdvisor, ActualCost | 3 |
| M7 | TurningToolpathWear, InsertChangeRecommendation, AdaptiveSpindleControl | 3 |
| M8 | ChipBreaking, Coolant, FAI, Metrology, Gauging, Traceability, OEE, DNCTransfer, CNCSimulation | 9 |
| **Total** | | **53 engines newly wired** |

After completion: **54 of 78 lathe engines** actively wired to user-facing UI (69%).
Remaining 24 are internal physics/support engines called by the wired engines.
Effective coverage: **100% of lathe capability exposed through UI or pipeline.**
