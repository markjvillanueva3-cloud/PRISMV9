# LATHE-PRO v2.0 — Complete Lathe Programming Intelligence Roadmap

## Track: LATHE-PRO | Version: 2.0.0 | Created: 2026-04-05
## Total Milestones: 15 | Total Units: 126 | Estimated Sessions: 42
## Scrutiny Baseline: v1.0 scored 37.4/100 from 20-agent review | Target: 82+
## Goal: Zero-experience user uploads photo/CAD -> master-level safe CNC lathe program

---

## ARCHITECTURE OVERVIEW

```
PHASE A: INPUT & ACCESSIBILITY          ┌─ MS-1: Input Pipeline (Photo/CAD → Features)
(UX=22→80, CAD/CAM=28→85)              └─ MS-2: Zero-Experience UI & Guided Workflow

PHASE B: SAFETY-CRITICAL FOUNDATION     ── MS0: Enhanced Orchestrator (40→Safety stages)
(Safety=38→85)

PHASE C: CORE INTELLIGENCE              ┌─ MS1: Insert Wear & Life Prediction
(Physics=58→80, Controller=58→78,       ├─ MS2: Offset + Thermal + GD&T Compensation
 Tooling=52→75)                         └─ MS3: Sequence + Multi-Op + Workholding

PHASE D: DEEP DOMAIN                    ┌─ MS4: Threading, Grooving & Parting
(Threading=28→75, Hard=34→75,           ├─ MS5: Hard Turning & Grinding Replacement
 Swiss=31→70, Chip=18→75)              ├─ MS6: Swiss/Mill-Turn Multi-Channel
                                        └─ MS7: Chip Control & Coolant Strategy

PHASE E: QUALITY & COMPLIANCE           ┌─ MS8: GD&T, Inspection & Metrology
(Metrology=34→80, Aero=28→75,          └─ MS9: Quality Compliance (AS9100/FDA)
 Medical=18→65)

PHASE F: PRODUCTION & ECONOMICS         ┌─ MS10: Cost Optimization & Batch Economics
(Process=58→80, Cost=31→75,            └─ MS11: Shop Floor Integration
 Shop=28→70)

PHASE G: VERIFICATION & TRUST           ── MS12: Simulation, Verification & Visualization
(Simulation=22→80)
```

## DEPENDENCY GRAPH
```
MS-1 (Input) ──→ MS-2 (UI) ──→ MS12 (Simulation/Viz)
      ↓
MS0 (Orchestrator+Safety) ──→ ALL downstream milestones
      ├→ MS1 (Wear) ──→ MS2 (Offset+Thermal)
      ├→ MS3 (Sequence+MultiOp+Workholding)
      ├→ MS4 (Threading) ──→ MS5 (Hard Turning)
      ├→ MS6 (Swiss/MillTurn)
      ├→ MS7 (Chip Control)
      ├→ MS8 (Inspection) ──→ MS9 (Quality Compliance)
      └→ MS10 (Cost) ──→ MS11 (Shop Floor)
```

## EXISTING ENGINE INVENTORY (35 engines to wire — DO NOT REBUILD)

### Primary 17 (identified by scrutiny):
| Engine | LOC | Wires Into |
|--------|-----|------------|
| BlueprintVisionOCREngine | 575 | MS-1: Photo→features |
| AutoPrintToProgramBridgeEngine | 540 | MS-1: CAD file→features |
| PrintToGeometryEngine | 522 | MS-1: 2D print→3D geometry |
| ProveOutModeEngine | 471 | MS0: Mandatory first-article prove-out |
| BarStockVibrationEngine | 361 | MS0: Bar whip safety gate |
| ThermalGrowthCompensationEngine | 270 | MS2: Spindle thermal drift |
| InverseThermalCompensationEngine | 436 | MS2: Real-time thermal correction |
| RunoutCompensationEngine | 238 | MS8: GD&T runout-driven machining |
| ToleranceStackUpEngine | 217 | MS8: Multi-feature tolerance analysis |
| FirstArticleInspectionPipelineEngine | 651 | MS8: AS9102 FAI generation |
| MetrologyUncertaintyEngine | 1001 | MS8: Gage R&R and measurement uncertainty |
| CMMPathPlanningEngine | 1318 | MS8: CMM program generation |
| GaugingEngine | 238 | MS8: Gage selection per feature |
| OEECalculatorEngine | 155 | MS10: Production efficiency tracking |
| ChipConveyorEngine | 370 | MS7: Chip evacuation requirements |
| SpindleLoadMonitorEngine | 394 | MS0: Real-time overload detection |
| MillTurnSwissPipelineEngine | 2125 | MS6: Multi-channel, guide bush, sync codes |

### Secondary 18 (discovered during scrutiny):
| Engine | LOC | Wires Into |
|--------|-----|------------|
| ChipBreakingEngine | 402 | MS7: Chip form prediction + breaker selection |
| FeatureRecognitionEngine | 302 | MS-1: 3D model feature extraction |
| SimulationVisualizationBridgeEngine | 258 | MS12: Toolpath animation |
| CNCSimulationPipelineEngine | 409 | MS12: Material removal simulation |
| MaterialCertTraceabilityEngine | 744 | MS9: Material traceability |
| JobTravelerEngine | 637 | MS11: Shop routing sheets |
| ActualCostEngine | 384 | MS10: Actual vs estimated cost loop |
| ToolWearCompensationEngine | 492 | MS2: Wear-to-offset mapping |
| DigitalThreadEngine | 127 | MS9: Full traceability chain |
| ProcessCapabilityPredictionEngine | 285 | MS8: Pre-production Cpk |
| WorkholdingIntelligenceEngine | 499 | MS3: Jaw/fixture selection |
| ClampingSimEngine | 276 | MS3: Clamping deformation |
| AdaptiveControlEngine | 847 | MS0: Adaptive feed control |
| RealTimeMachineIntelligenceEngine | 771 | MS11: Machine monitoring feedback |
| JobCostingEngine | 569 | MS10: Job-level cost tracking |
| QuoteEstimatorEngine | 1027 | MS10: Competitive quoting |
| ThreadingPipelineEngine | 710 | MS4: Full threading pipeline |
| SinglePointThreadEngine | ~300 | MS4: Infeed method selection |

---

## PHASE A: INPUT & ACCESSIBILITY

---

### MILESTONE MS-1: Input Pipeline — Photo/CAD to Structured Features
**Priority:** CRITICAL (blocking) | **Units:** 8 | **Sessions:** 3
**Depends on:** (none — enables everything downstream)
**Addresses:** UX (22→80), CAD/CAM (28→85)
**Engines to Wire:** BlueprintVisionOCREngine, AutoPrintToProgramBridgeEngine,
  PrintToGeometryEngine, FeatureRecognitionEngine

#### SESSION 1: Photo/PDF Print Reading Pipeline (U-LPI01..U-LPI03)
```
SMART CONFIG: Role=CVEngineer + ManufacturingSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: BlueprintVisionOCREngine (575L), PrintToGeometryEngine (522L),
           AutoPrintToProgramBridgeEngine (540L), FeatureRecognitionEngine (302L)
  REFERENCE: ISO 128 (technical drawing conventions), ASME Y14.5 (GD&T),
             ISO 2768 (general tolerances)
INTENT: A user takes a phone photo of an engineering drawing, and the system extracts
  all dimensions, tolerances, material, thread callouts, and surface finish requirements
  into a structured TurningFeature[] that the orchestrator can consume.
```

**U-LPI01**: Wire BlueprintVisionOCREngine → TurningFeature[] converter
  - Input: image/PDF of engineering drawing
  - OCR extraction: dimensions, tolerances, GD&T frames, material callout, thread callouts
  - Output: structured TurningFeature[] compatible with LatheOrchestrationEngine input
  - Handle: title block parsing (material, heat treatment, surface finish defaults)
  → 4-LOOP | FILES_CREATED: src/engines/TurningPrintIntakeEngine.ts
  ABORT_CRITERIA: >3 TS errors, cannot parse >50% of standard ISO drawing, output schema mismatch

**U-LPI02**: Material callout parser with cross-reference
  - Parse strings: "AISI 4140 QT 28-32 HRC", "DIN 1.7225", "SS316L", "Ti-6Al-4V ELI"
  - Cross-reference: ASTM/SAE/DIN/JIS/UNS → MaterialRegistry entry
  - Extract: heat treatment condition, hardness range, surface requirements
  - Fallback: flag ambiguous callouts for user confirmation
  → Depends on: U-LPI01

**U-LPI03**: Tolerance & GD&T extraction and interpretation
  - Parse: bilateral (±0.1), unilateral (+0.025/-0.000), fit notation (H7/g6)
  - Parse: GD&T frames (concentricity, runout, perpendicularity, position, cylindricity)
  - Apply: ISO 2768-m general tolerances to un-toleranced dimensions
  - Output: per-feature tolerance objects with strategy implications
  → Depends on: U-LPI01

#### SESSION 2: CAD File Import Pipeline (U-LPI04..U-LPI06)
```
SMART CONFIG: Role=CADEngineer + TurningSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: AutoPrintToProgramBridgeEngine (540L), PrintToGeometryEngine (522L),
           FeatureRecognitionEngine (302L), TurningProfileEngine (879L)
  REFERENCE: STEP AP203/AP214 geometry handling, IGES surface import
```

**U-LPI04**: STEP/IGES → axisymmetric turning profile extraction
  - Input: STEP/IGES 3D solid model
  - Detect: rotational axis (largest cylindrical surface)
  - Extract: 2D silhouette profile (XZ polyline for G71/G70 input)
  - Identify: OD steps, bores, grooves, threads, tapers, chamfers, undercuts
  - Output: TurningFeature[] with geometry coordinates
  → 4-LOOP | FILES_CREATED: src/engines/TurningCADImportEngine.ts

**U-LPI05**: Automatic stock selection from part geometry
  - Input: max finished OD, part length, material
  - Compute: optimal bar stock diameter (nearest standard size + 2-3mm allowance)
  - Compute: required bar length (part + facing stock + cutoff + grip)
  - Consider: bar stock catalog (standard metric/imperial sizes)
  - Output: { bar_od_mm, bar_length_mm, material_weight_kg, remnant_pct }
  → FILES_CREATED: src/engines/StockSelectionEngine.ts

**U-LPI06**: Ambiguity resolution and user prompting
  - Detect: missing dimensions, unclear tolerances, no material callout, conflicting dims
  - Classify: can-proceed-with-defaults vs must-ask-user
  - Apply: ISO 2768-m defaults where safe
  - Output: confidence score per feature + list of questions for user
  → Depends on: U-LPI01..U-LPI05

#### SESSION 3: Tests & Dispatcher Wiring (U-LPI07..U-LPI08)

**U-LPI07**: 20+ test cases for input pipeline
  - Test: 5 photo-based print extractions (shaft, bore, threaded, grooved, complex)
  - Test: 5 STEP file imports (same part families)
  - Test: material callout parsing (10+ formats across ASTM/DIN/JIS)
  - Test: ambiguity detection and fallback behavior

**U-LPI08**: Wire into turningDispatcher
  - Actions: `turning_import_print_photo`, `turning_import_cad_file`,
    `turning_parse_material`, `turning_auto_stock_select`
  - Schemas: Zod validation per action

**FORGE-TRIPLE:**
  HOOK: `input-completeness-gate` — blocks orchestrator if required features missing
  ACTION: `prism_turning:turning_import_print_photo`
  SKILL: `/blueprint-read lathe` (extend existing blueprint-read with turning extraction)

**EXIT GATE:** ✓ Photo of standard shaft drawing → valid TurningFeature[] |
  ✓ STEP file → 2D turning profile | ✓ 10+ material callout formats parsed |
  ✓ 20+ tests pass | omega_floor >= 0.85 | SVI delta: +3%

---

### MILESTONE MS-2: Zero-Experience User Interface & Guided Workflow
**Priority:** CRITICAL | **Units:** 8 | **Sessions:** 3
**Depends on:** MS-1
**Addresses:** UX (22→80), Simulation (22→partial)

#### SESSION 4: Upload & Guided Input (U-LPU01..U-LPU03)
```
SMART CONFIG: Role=UXEngineer + FrontendSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: web/src/ (React/Vite, 45 existing pages), existing CalculatorPage pattern
  REFERENCE: Existing WEDM result cards pattern (WireEdmOptimizeCards.tsx)
```

**U-LPU01**: Upload page — drag-drop photo/PDF/STEP/IGES/DXF
  - Single-page interface: upload zone + camera capture button
  - File type detection: route photo→OCR, CAD→import, PDF→OCR
  - Progress indicator: "Reading your drawing..." with stage names
  → FILES_CREATED: web/src/pages/LatheUploadPage.tsx

**U-LPU02**: Guided input wizard for user decisions
  - Material confirmation: show extracted material + photo reference. "Is this correct?"
  - Quality tier: "Prototype (fast)" / "Production (reliable)" / "Aerospace (certified)"
  - Batch quantity: simple number input with cost preview
  - Machine selection: auto-recommend from shop's machine list, user confirms
  → FILES_CREATED: web/src/components/LatheInputWizard.tsx

**U-LPU03**: Ambiguity resolution UI
  - Highlight unclear areas on the drawing image
  - Show specific questions: "I found 25.0 here — is this diameter or radius?"
  - Confidence indicators per extracted dimension (green/yellow/red)
  → Depends on: U-LPU02

#### SESSION 5: Results & Visualization (U-LPU04..U-LPU06)
```
SMART CONFIG: Role=UXEngineer + DataVizSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
```

**U-LPU04**: Results page — program + setup sheet + physics report
  - Plain-English summary: "4 min 12 sec, 3 tools, $2.40/part"
  - Traffic-light safety indicators (12 checks, all green = safe to run)
  - Confidence score with explanation
  - Download buttons: G-code, setup sheet PDF, physics report PDF
  → FILES_CREATED: web/src/pages/LatheResultsPage.tsx

**U-LPU05**: 2D XZ backplot visualization with operation color-coding
  - Render toolpath as 2D XZ profile view (not 3D — lathe is axisymmetric)
  - Color by operation: roughing=blue, finish=green, groove=orange, thread=purple, rapid=red
  - Animate: playback at 1x/2x/5x/10x speed with scrubber
  - Highlight: rapids distinctly (red dashed — where crashes happen)
  → FILES_CREATED: web/src/components/LatheBackplot.tsx

**U-LPU06**: Photo-annotated setup instructions
  - Step-by-step with numbered photos: "Insert bar, tighten chuck, load tool #1..."
  - Tool loading guide: which tool in which station with photo
  - Pre-run checklist: checkboxes with "correct" photos
  - First-article measurement guide: "Measure here with this tool, expect this reading"
  → Depends on: U-LPU04

#### SESSION 6: Integration Tests & Wiring (U-LPU07..U-LPU08)

**U-LPU07**: End-to-end UI test: photo → wizard → program → download
  - 5 complete workflows (shaft, bore, thread, groove, complex)

**U-LPU08**: Wire React pages to turningDispatcher actions via REST API
  - Route handlers in src/routes/turning.ts
  - WebSocket for progress updates during 30-stage pipeline execution

**FORGE-TRIPLE:**
  HOOK: `ui-safety-certificate` — displays safety validation before download
  ACTION: `prism_turning:lathe_ui_submit`
  SKILL: `/lathe-studio` — open web interface for lathe programming

**EXIT GATE:** ✓ Photo upload → program download in under 2 minutes |
  ✓ Zero jargon in user-facing text | ✓ Backplot animation renders all operations |
  ✓ 5 end-to-end workflows pass | omega_floor >= 0.85 | SVI delta: +2%

---

## PHASE B: SAFETY-CRITICAL FOUNDATION

---

### MILESTONE MS0: Enhanced Orchestrator Engine with Safety Stages
**Priority:** CRITICAL | **Units:** 14 | **Sessions:** 5
**Depends on:** MS-1
**Addresses:** Safety (38→85), CNC Programmer (68→85), Controller (58→78)
**Engines to Wire:** ProveOutModeEngine, BarStockVibrationEngine, SpindleLoadMonitorEngine,
  AdaptiveControlEngine, LatheCollisionZoneEngine, MachineEnvelopeGuardEngine

#### SESSION 7: Orchestrator Shell + Safety Stages (U-LPO01..U-LPO03)
```
SMART CONFIG: Role=SafetyEngineer + CNCArchitect | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: WEDMCompleteOrchestrationEngine (pattern), TurningPrintToProgramEngine (1794L),
           TurningProgramAssemblerEngine (2615L), ProveOutModeEngine (471L),
           BarStockVibrationEngine (361L), SpindleLoadMonitorEngine (394L)
  TRIBAL: TribalKnowledgeEngine (turning), MachiningPlaybookEngine (sequencing+safety rules)
  FORMULAS: Kienzle, Taylor, Ra = f^2/(32r), P = Fc*Vc/60000
  REFERENCE: OSHA 1910.217, ISO 10218 clamping safety factor 2.5x
```

**U-LPO01**: `LatheOrchestrationEngine` — 35-stage pipeline (expanded from 30)
  - Stage enum (35 stages):
    1-INPUT_VALIDATE, 2-MATERIAL_ASSESS, 3-MACHINE_SELECT, 4-TOOL_SELECT,
    5-WORKHOLDING_PLAN, 6-GDT_INTERPRET, 7-OPERATION_SEQUENCE, 8-CHIP_CONTROL,
    9-PHYSICS_CORE, 10-PARAMETER_OPTIMIZE, 11-COST_OPTIMIZE,
    12-BAR_STOCK_SAFETY, 13-CLAMPING_PER_OP, 14-MACHINE_READINESS,
    15-TOOLPATH_GENERATE, 16-GCODE_GENERATE, 17-TNRC_RESOLVE,
    18-CSS_OPTIMIZE, 19-TURRET_OPTIMIZE, 20-CONTROLLER_DIALECT,
    21-EMERGENCY_RECOVERY, 22-SAFETY_VERIFY, 23-COLLISION_CHECK,
    24-CYCLE_TIME, 25-MATERIAL_REMOVAL_SIM, 26-SETUP_SHEET,
    27-PROVE_OUT, 28-INSPECTION_PLAN, 29-CONFIDENCE_SCORE,
    30-PHYSICS_REPORT, 31-COST_REPORT, 32-FAI_PLAN,
    33-PROGRAM_PACKAGE, 34-BACKPLOT_DATA, 35-RELEASE_GATE
  - Result: `LatheOrchestrationResult` with full stage traceability
  → FILES_CREATED: src/engines/LatheOrchestrationEngine.ts

**U-LPO02**: Stage 12 — BAR_STOCK_SAFETY (wire BarStockVibrationEngine)
  - Detect bar stock vs chucked work from input
  - If bar: compute critical whip speed, hard-block RPM above critical
  - If no bar feeder specified for bar work: REFUSE to generate
  - Check bar extension behind spindle
  → Depends on: U-LPO01

**U-LPO03**: Stage 13 — CLAMPING_PER_OP (per-operation force direction check)
  - For each operation: compute force direction vector (tangential, radial, axial)
  - OD turning: force pushes INTO chuck (relatively safe)
  - Boring: force pulls OUT of chuck (axial pull-out hazard)
  - Part-off: verify catcher/sub-spindle configured; block unsupported cutoff >800 RPM
  - Face grooving: check axial clamping adequacy
  → Depends on: U-LPO01

#### SESSION 8: Machine Readiness + Emergency Recovery (U-LPO04..U-LPO06)

**U-LPO04**: Stage 14 — MACHINE_READINESS_PREFLIGHT
  - Generate M00 mandatory stop preamble: door interlock, chuck key, guard, coolant
  - Controller-specific: Fanuc M-code checks, Haas Setting 51 verification
  - In G-code output, not just setup sheet
  → Depends on: U-LPO01

**U-LPO05**: Stage 21 — EMERGENCY_RECOVERY_BLOCKS
  - Threading: power loss recovery sequence (G10 offset reset + sync recovery)
  - Broken tool: generate probing cycle after roughing passes
  - Wire SpindleLoadMonitorEngine for overload thresholds
  - Coolant failure macro for deep bore operations
  - Safe retract paths (G28 per controller dialect — Haas U0W0, Okuma G30, etc.)
  → Depends on: U-LPO01

**U-LPO06**: Stage 27 — MANDATORY PROVE_OUT (wire ProveOutModeEngine)
  - First-ever program: ALWAYS output prove-out version, no override
  - Prove-out: feed reduction, RPM cap, M01 at tool changes, single-block recommendation
  - Log: prove-out status per part number/setup combination
  → Depends on: U-LPO01

#### SESSION 9: G-Code Generation with Full Cycle Support (U-LPO07..U-LPO09)

**U-LPO07**: Stages 15-16 — Toolpath + G-code with G73 + G32 + WCS
  - ADD G73 pattern repeat for forgings/castings (near-net-shape stock)
  - ADD G32/G33 single-pass threading (worm threads, multi-start)
  - ADD G92 simple threading cycle option
  - Work Coordinate System establishment: G54/G55 management, Z-zero strategy
  - G10 L10/L11/L12/L20 for programmatic offset setting
  → Depends on: U-LPO01

**U-LPO08**: Stage 17 — TNRC direction resolver
  - Input: cut geometry + tool orientation (ISO 1832 quadrant 1-9) + direction of travel
  - Output: correct G41/G42 + imaginary tool tip point
  - Validate: per-controller TNRC behavior differences
  → Depends on: U-LPO07

**U-LPO09**: Stage 20 — Controller dialect generation (enhanced 8 dialects)
  - Fanuc 0i-TF, 30i-B (distinguish firmware versions)
  - Haas NGC (Setting 58 G50 coordination, WIPS probing)
  - Okuma OSP-P300 (G85/G87 named labels, CAS blocks)
  - Mazak SmoothG (EIA + MAZATROL UNIT output)
  - Siemens 840D (CYCLE95/CYCLE97)
  - DMG MORI CELOS
  - Citizen Cincom ($1/$2 channel format)
  - Star (M200/M201 sync)
  → Depends on: U-LPO07

#### SESSION 10: CSS + Turret + Adaptive (U-LPO10..U-LPO12)

**U-LPO10**: Stage 18 — CSS optimizer (enhanced)
  - G96/G50 lifecycle per controller (persistence, reset behavior, Setting 58)
  - CSS-to-clamping-force cross-check: verify grip at every diameter along path
  - Spindle accel/decel time modeling for cycle time accuracy

**U-LPO11**: Stage 19 — Turret optimizer + adaptive feed
  - Station assignment: minimize index time (BMT vs VDI, CW vs CCW)
  - Duplicate tool strategy: rough+finish in separate stations
  - Wire AdaptiveControlEngine for force-based feed modulation

**U-LPO12**: Stage 22-23 — Safety verify + collision check (enhanced)
  - Wire LatheCollisionZoneEngine (all 10 checks)
  - Wire MachineEnvelopeGuardEngine
  - Add: turret index swept volume during rotation
  - Add: rapid traverse collision (diagonal path vs sequential)
  - Add: safe retract strategy per tool (G28 dialect-aware)

#### SESSION 11: Tests (U-LPO13..U-LPO14)

**U-LPO13**: 30+ test cases covering all 35 stages
  - Test each safety stage independently
  - Test G73 for forging stock, G32 for worm thread
  - Test TNRC direction for 9 quadrants
  - Test 8 controller dialects

**U-LPO14**: Integration: 5 part families end-to-end through all 35 stages
  - Simple shaft, stepped shaft, threaded shaft, bore part, complex contour
  - Verify: safety blocks present, prove-out mode for new parts, G-code valid per dialect

**FORGE-TRIPLE:**
  HOOK: `lathe-orchestration-safety-gate` — blocks generation without ALL safety stages passing
  ACTION: `prism_turning:lathe_generate_complete_program`
  SKILL: `/lathe-program`

**EXIT GATE:** ✓ 35 stages run end-to-end | ✓ 5 safety stages produce valid output |
  ✓ G73 works for forgings | ✓ 8 controller dialects generate valid code |
  ✓ 30+ tests pass | omega_floor >= 0.90 | SVI delta: +5%

---

## PHASE C: CORE INTELLIGENCE

---

### MILESTONE MS1: Insert Wear Intelligence & Life Prediction
**Priority:** CRITICAL | **Units:** 8 | **Sessions:** 3
**Depends on:** MS0
**Addresses:** Tooling (52→75)
**Retained from v1 MS1 with enhancements:**
  - ADD: Combined insert selection matrix (material+geometry+machine+workpiece rigidity)
  - ADD: Chipbreaker operating window validation (per manufacturer catalog data)
  - ADD: Parallel failure mode evaluation (min(T_flank, T_crater, T_notch, T_BUE))
  - ADD: CSS-integrated wear (variable Vc wear accumulation across diameter profile)
  - ADD: Wiper insert productivity model (4x feed at same Ra)

Units U-LPR11 through U-LPR18 as defined in v1 with these enhancements added to each.

**FORGE-TRIPLE:**
  HOOK: `insert-life-gate` — warns when predicted wear exceeds VB limits mid-program
  ACTION: `prism_turning:turning_predict_insert_life`
  SKILL: `/tool-life-max`

---

### MILESTONE MS2: Offset + Thermal + GD&T Compensation
**Priority:** CRITICAL | **Units:** 10 | **Sessions:** 4
**Depends on:** MS1
**Addresses:** Metrology (34→80), CNC Programmer (68→85)
**Engines to Wire:** ThermalGrowthCompensationEngine, InverseThermalCompensationEngine,
  ToolWearCompensationEngine, RunoutCompensationEngine, ToleranceStackUpEngine

#### Units (10):
**U-LPT01**: Wear-to-offset superposition model
  - delta_total = delta_wear + delta_thermal_spindle + delta_thermal_part + delta_geometric
  - Wire ThermalGrowthCompensationEngine for spindle growth
  - Wire InverseThermalCompensationEngine for real-time correction
  - Add: part CTE expansion from MaterialRegistry + CuttingTemperatureEngine
  - Add: machine geometric error profile (backlash, reversal, squareness)

**U-LPT02**: Machine warmup strategy
  - Generate warmup cycle (spindle at 50% max RPM for 15-20 min)
  - First-part offset bias (compensate cold machine)
  - Ambient temperature correction input
  - Seasonal drift model

**U-LPT03**: Probing cycle generator (enhanced — 4 controllers)
  - Renishaw OD/bore + Haas WIPS (G65 P9811/P9812/P9814)
  - Probe calibration cycles (ring gage qualification)
  - Multi-point bore probing (4+ angular positions, 2+ Z-heights for roundness/cylindricity)
  - Thread measurement strategy (3-wire method reference, go/no-go selection)

**U-LPT04**: Macro-based auto-offset (4 controllers)
  - Fanuc Custom Macro B, Okuma NVAR, Haas Macro, Mazak variables
  - Safety: max single adjustment 0.05mm, logging to DNC variable
  - G10 data input for programmatic offset changes

**U-LPT05**: GD&T-to-process mapper
  - Wire RunoutCompensationEngine: total runout → single-setup requirement
  - Wire ToleranceStackUpEngine: multi-feature tolerance analysis
  - Map: concentricity → single-chucking, runout → datum alignment, position → C-axis accuracy
  - Output: per-feature machining constraints + inspection method requirements

**U-LPT06**: Tolerance-to-strategy decision engine
  - ±0.5mm → roughing only | ±0.1mm → rough+finish | ±0.025mm → rough+finish+thermal
  - ±0.005mm → above + measurement every part | below ±0.005mm → grinding/honing required
  - H7/g6 fit → decompose to actual tolerance bands by nominal diameter
  - ISO 2768 general tolerances → applied to un-toleranced dimensions

**U-LPT07**: Machine geometric error profile integration
  - X-axis backlash, Z-axis backlash, reversal spikes
  - Enforce unidirectional approach when backlash > tolerance/4
  - Finish passes always approach from same direction
  - Default values from MachineRegistry, override with ballbar data

**U-LPT08**: Dimensional accuracy predictor per part in batch
  - Predict dimension vs part number curve (wear + thermal drift)
  - Identify: first part to exceed tolerance without offset adjustment
  - Show: with vs without auto-compensation improvement

**U-LPT09**: Wire into turningDispatcher + SPC
  - Wire ProcessCapabilityPredictionEngine for Cpk prediction
  - Actions: all offset/thermal/GD&T actions
  - 15+ tests

**U-LPT10**: Measurement frequency optimizer
  - Cpk > 2.0 → measure 1 in 10; Cpk 1.33-2.0 → 1 in 5; Cpk < 1.33 → 100%
  - Economic optimization: cost of measurement vs cost of scrap
  - Wire MetrologyUncertaintyEngine for gage R&R adequacy check

**FORGE-TRIPLE:**
  HOOK: `thermal-offset-gate` — blocks programs missing thermal compensation for tight tolerances
  ACTION: `prism_turning:turning_offset_compensation`
  SKILL: `/lathe-offset`

---

### MILESTONE MS3: Operation Sequence + Multi-Op + Workholding
**Priority:** HIGH | **Units:** 10 | **Sessions:** 4
**Depends on:** MS0
**Addresses:** CNC Programmer (68→85), Workholding (28→75)
**Engines to Wire:** WorkholdingIntelligenceEngine, ClampingSimEngine

#### Units (10):
**U-LPS01**: LathePartClassifierEngine — 15 part families (expanded from 12)
  - ADD: forging_blank, casting_blank, tube_hollow (stock form families)
  - Classification drives: workholding, sequence template, G73 vs G71

**U-LPS02**: LatheSequenceOptimizerEngine — multi-criteria with constraints
  - Objectives: min cycle_time, max tool_life, min tool_changes, min thermal drift
  - Hard constraints: face first (Z datum), cutoff last, G96 for turning / G97 for drilling
  - Thermal sequencing: rough_all → cool → finish_all (auto for tolerance < 0.05mm)

**U-LPS03**: Op1/Op2 flip planning engine
  - Detect: which features require two-sided access
  - Generate: Op1 program (from bar or blank) + Op2 program (flip in soft jaws)
  - Soft jaw boring program generation (G71/G70 bore cycle with clearances)
  - Z-reference transfer between Op1 and Op2
  - Concentricity preservation strategy (soft jaw bore to finished OD)
  → FILES_CREATED: src/engines/LatheMultiOpPlannerEngine.ts

**U-LPS04**: Jaw selection intelligence
  - Wire WorkholdingIntelligenceEngine for turning-specific decisions
  - Decision tree: hard jaw / soft jaw / collet / expanding mandrel / face driver / pie jaw
  - Inputs: diameter, tolerance, surface finish, batch quantity, stock form, wall thickness
  - Output: jaw type + justification + bore program (if soft jaw)

**U-LPS05**: Thin-wall clamping deformation model
  - Wire ClampingSimEngine with turning ring deformation model
  - 3-jaw trilobe distortion: delta = F × R³ / (E × I)
  - Optimization solver: F_min(ejection) ≤ F_clamp ≤ F_max(deformation)
  - Flag: when no safe clamping window exists → recommend 6-jaw, collet, or vacuum

**U-LPS06**: Specialty workholding (face driver, expanding mandrel)
  - Face driver: torque transmission through friction pins (F × mu × r × n_pins)
  - Expanding mandrel: Lame equation for radial grip pressure in bore
  - Between-centers: shaft turning with face driver + live center
  - Magnetic chuck: ferrous part detection + holding force check

**U-LPS07**: Stock form handling (bar, forging, casting, hex, tube)
  - Bar stock: standard 3-jaw/collet → G71 roughing
  - Forging/casting: custom soft jaws → G73 pattern repeat
  - Hex bar: appropriate jaw set, force model for 3-point contact on hex
  - Tube: controlled low pressure, internal mandrel support option

**U-LPS08**: Workholding state tracking through sequence
  - Re-evaluate clamping after each geometry-changing operation
  - Wall thinning during boring → deformation risk increases
  - Groove near chuck → effective grip length shrinks
  - Part-off → remaining stock vs parted piece force analysis

**U-LPS09**: Wire dispatchers + tests (15+)
**U-LPS10**: Integration test — Op1/Op2 workflow for 5 part types

**FORGE-TRIPLE:**
  HOOK: `sequence-safety-gate` — blocks cutoff before features complete + clamping check per op
  ACTION: `prism_turning:turning_optimize_sequence`
  SKILL: `/lathe-sequence`

---

## PHASE D: DEEP DOMAIN

---

### MILESTONE MS4: Threading, Grooving & Parting Intelligence
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS0
**Addresses:** Threading (28→75)
**Engines to Wire:** ThreadingPipelineEngine, SinglePointThreadEngine, ThreadCalculationEngine,
  ThreadGageEngine, PartOffForceEngine

#### Units (8):
**U-LPH01**: Wire ThreadingPipelineEngine into orchestrator Stage 15
  - All 10 thread forms: ISO, UN, NPT, NPTF, BSP, BSPT, ACME, trapezoidal, buttress, custom
  - Multi-start threads with controller-specific G-code (Fanuc Q-word, Okuma variant)
  - Variable pitch (progressive pitch for ball screws, worm gears)
  - Thread class → pitch diameter tolerance (2A/2B, 3A/3B)

**U-LPH02**: G76 infeed method selection intelligence
  - Wire SinglePointThreadEngine (radial, flank, modified flank, alternating flank, constant-area)
  - Decision matrix: material + thread form + pitch → optimal infeed method
  - Spring pass count by material (2 for steel, 3-4 for stainless/Ti)
  - First-pass depth optimization by material

**U-LPH03**: Thread measurement strategy
  - Wire ThreadGageEngine: go/no-go, 3-wire method, pitch diameter calculation
  - Thread class fit checking (tolerance band validation)
  - Generate measurement instructions for setup sheet
  - Thread relief groove generation (DIN 76/ISO 13715)

**U-LPH04**: Groove type classification and strategy engine
  - 8 groove types: full-radius, V-groove, rectangular, O-ring, circlip, thread relief,
    bearing relief, face groove
  - Per-type: tool geometry, tolerance, machining strategy
  - Multi-pass deep grooving: plunge-and-shift for grooves wider than blade

**U-LPH05**: Parting/cutoff intelligence (enhanced)
  - Feed reduction curve near center, RPM control as diameter decreases
  - Peck cutoff for stringy materials (304SS, Inconel)
  - Part catcher timing physics: activation at correct remaining-wall diameter
  - Wire PartOffForceEngine for blade stress and deflection

**U-LPH06**: Controller-specific threading G-code
  - Fanuc G76 (packed P-word), Haas G76 (K/D/A words), Okuma G71 threading (B/D/H + M33)
  - Siemens CYCLE97, G32/G33 single-pass variants
  - G92 simple cycle option for shops that prefer it

**U-LPH07**: Tests — 15+ (all thread forms, groove types, parting scenarios)
**U-LPH08**: Wire dispatchers + threading actions

**FORGE-TRIPLE:**
  HOOK: `thread-class-gate` — validates pitch diameter within class tolerance
  ACTION: `prism_turning:turning_thread_optimize`
  SKILL: `/lathe-thread`

---

### MILESTONE MS5: Hard Turning, Finishing & Grinding Replacement
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS0, MS4
**Addresses:** Hard Turning (34→75)

**U-LPF01**: Hard turning decision engine — when to hard turn vs grind
  - Hardness range (55-62 HRC = CBN sweet spot)
  - Surface finish: hard turning Ra 0.2-0.8, grinding Ra 0.1-0.4
  - Interrupted features: grinding handles better than CBN
  - Cost comparison: CBN edge cost vs grinding wheel dress cycle
  - Cpk achievability comparison

**U-LPF02**: CBN/ceramic insert selection intelligence
  - Low-CBN (50%) for finishing vs high-CBN (90%) for roughing
  - Edge preparation: T-land 0.1mm×20° continuous, 0.15mm×25° interrupted
  - ap < nose_radius rule enforcement (0.5-0.8 × r_epsilon)
  - Rigidity assessment: 4:1 L/D minimum for hard turning

**U-LPF03**: Surface integrity control engine (enhanced)
  - White layer: VB-dependent model (sharp CBN = zero, VB=0.2mm = 8-12μm white layer)
  - Residual stress depth profile (compressive→tensile crossover)
  - Wire LatheScienceHardeningEngine with wear coupling
  - VB limit for integrity: 0.10-0.15mm (not ISO 3685's 0.3mm)

**U-LPF04**: Super-finishing engine
  - Low-feed CBN finishing for Ra < 0.2μm (ploughing/burnishing physics)
  - Diamond turning for non-ferrous (rake/clearance geometry)
  - Roller burnishing: force control, size-before-burnishing allowance
  - Wiper insert Ra model: Ra = f²/(8 × wiper_length) replacing standard formula

**U-LPF05**: Bore finishing intelligence
  - Position-dependent deflection compensation (X offset as function of Z depth)
  - Honing parameter model: stone pressure, rotation speed, stroke, grit selection
  - Bore geometry prediction: roundness, cylindricity, straightness, taper, bell-mouth
  - Fine boring with CBN/diamond: ultra-low feed strategy

**U-LPF06**: Grinding replacement report generator
  - Side-by-side: hard turning vs grinding (Ra, stress, Cpk, cost, cycle time)
  - Recommendation with confidence score
  - Generates NADCAP/customer approval request if switching from specified grinding

**U-LPF07**: Tests (15+)
**U-LPF08**: Wire dispatchers

**FORGE-TRIPLE:**
  HOOK: `surface-integrity-gate` — blocks hard turning programs violating white layer/stress specs
  ACTION: `prism_turning:turning_grinding_replacement_analysis`
  SKILL: `/hard-turn`

---

### MILESTONE MS6: Swiss/Mill-Turn Multi-Channel Programming
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS0
**Addresses:** Swiss/Mill-Turn (31→70)
**Engine to Wire:** MillTurnSwissPipelineEngine (2125L — already has multi-channel)

**U-LPM01**: Multi-channel G-code output (wire existing sync code dialects)
  - Citizen $1/$2/$3 + !L/!R wait codes
  - Star M200/M201 sync M-codes
  - Tsugami $1/$2 + M96/M97
  - Mazak !C1/!C2 channels
  - DMG NTX CHANDATA(1)/CHANDATA(2) + WAITM

**U-LPM02**: Guide bush vs non-GB mode logic
  - Bar tolerance validation (h6 for GB, h9 for non-GB)
  - Collet pressure calculation for thin-wall parts
  - Deflection model: L/D measured from bushing face, not collet

**U-LPM03**: Op2 (back-working) toolpath generation
  - Z-datum flip for sub-spindle (coordinate system reversal)
  - Back-work operations: face to length, bore from back, chamfer, cross-holes
  - Simultaneous: Op2 on sub-spindle while Op1 runs on main

**U-LPM04**: Channel balancing optimizer (Gantt scheduler)
  - Wire MillTurnSwissPipelineEngine.multiChannelProgram()
  - Critical path identification: longest channel = cycle time
  - Operation reassignment between channels to balance
  - Sync point minimization: fewer waits = less idle time

**U-LPM05**: Bar stock production management
  - Parts-per-bar calculation with remnant tracking
  - Bar end detection macro (skip signal check)
  - Magazine capacity planning for overnight runs
  - Bar pull vs bar feed M-code generation per machine

**U-LPM06**: Gang slide vs turret logic
  - Detect machine type: gang slide (Citizen, Star) vs turret (Doosan, Mazak)
  - Gang slide: minimize X-travel between tools (no index time)
  - Turret: shortest-path CW/CCW rotation
  - Tool block layout optimization for gang

**U-LPM07**: Tests (15+) — multi-channel, guide bush, Op2, bar management
**U-LPM08**: Wire dispatchers

**FORGE-TRIPLE:**
  HOOK: `multi-channel-collision-gate` — prevents turret-to-turret collision during simultaneous ops
  ACTION: `prism_turning:turning_swiss_program`
  SKILL: `/swiss-program`

---

### MILESTONE MS7: Chip Control & Coolant Strategy
**Priority:** HIGH | **Units:** 6 | **Sessions:** 2
**Depends on:** MS0
**Addresses:** Chip Control (18→75)
**Engines to Wire:** ChipBreakingEngine, ChipConveyorEngine

**U-LPC01**: Wire ChipBreakingEngine as Stage 8 in orchestrator
  - Per-operation chip form prediction (broken/segmented/continuous/stringy/snarled)
  - Validate: feed/DOC within chipbreaker operating window
  - Flag: bird nest risk, chip wrapping risk at high RPM
  - Constraint: chip control feeds into parameter optimization

**U-LPC02**: Chipbreaker selection engine with catalog data
  - Per-manufacturer operating windows (feed vs DOC per breaker code)
  - Material-specific: Sandvik -PM (medium steel), -MF (finishing stainless), -GR (grooving)
  - Validate: chosen parameters fall within chipbreaker effective range
  - If outside window: adjust feed/DOC or recommend different breaker

**U-LPC03**: Coolant strategy engine for turning
  - Decision matrix: material × operation → coolant type
  - High-pressure (70+ bar) for: stainless boring, Ti chip breaking, deep grooves
  - MQL for: aluminum HSM, dry for: cast iron, CBN hard turning
  - Through-tool: required for bore L/D > 3, deep drilling L/D > 5
  - Coolant M-code per controller (M08 flood, M88 through-tool, M50/M51 Okuma)

**U-LPC04**: Chip wrapping risk model for CSS/high-RPM
  - As G96 increases RPM at small diameters: chip wrapping risk rises
  - Compute: risk score per operation based on material + RPM + chip form
  - Action: recommend oscillating feed, forced peck, or speed adjustment
  - Wire ChipConveyorEngine for evacuation rate validation

**U-LPC05**: Unmanned operation readiness score
  - Per-program chip management assessment
  - Chip conveyor compatibility check
  - Filter life prediction from chip volume
  - Output: "GREEN: safe for unattended" / "YELLOW: operator check at N parts" / "RED: attended only"

**U-LPC06**: Tests (10+) + wire dispatchers

**FORGE-TRIPLE:**
  HOOK: `chip-control-gate` — blocks programs with unresolved chip wrapping risk
  ACTION: `prism_turning:turning_chip_analysis`
  SKILL: `/chip-control`

---

## PHASE E: QUALITY & COMPLIANCE

---

### MILESTONE MS8: GD&T, Inspection & Metrology Intelligence
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS2
**Addresses:** Metrology (34→80)
**Engines to Wire:** FirstArticleInspectionPipelineEngine, MetrologyUncertaintyEngine,
  CMMPathPlanningEngine, GaugingEngine, ProcessCapabilityPredictionEngine

**U-LPQ01**: Inspection plan generator
  - Per-feature: what to measure, with what gage, at what frequency, acceptance criteria
  - Wire GaugingEngine: gage selection (micrometer, bore gage, plug gage, thread gage, CMM)
  - Wire MetrologyUncertaintyEngine: gage R&R adequacy check (< 10% of tolerance)
  - Sampling plan: ANSI/ASQ Z1.4 or Cpk-based skip-lot logic

**U-LPQ02**: First Article Inspection plan (AS9102)
  - Wire FirstArticleInspectionPipelineEngine
  - Generate: Forms 1, 2, 3 per AS9102
  - Link: every tolerance to measurement method and instrument
  - Auto-generate: balloon numbers on drawing overlay

**U-LPQ03**: CMM program generation for complex parts
  - Wire CMMPathPlanningEngine
  - Generate: probe points for critical features
  - Datum reference frame establishment strategy
  - Output: CMM program compatible with common platforms (PC-DMIS, Calypso)

**U-LPQ04**: SPC chart setup and prediction
  - Wire ProcessCapabilityPredictionEngine (Cpk from error stacking)
  - Generate: X-bar/R chart parameters, control limits, subgroup size
  - Nelson/Western Electric run rules activation
  - Predicted Cpk with and without offset compensation

**U-LPQ05-08**: Tests, wire dispatchers, integration

**FORGE-TRIPLE:**
  HOOK: `inspection-plan-gate` — blocks programs for aerospace parts without FAI plan
  ACTION: `prism_turning:turning_inspection_plan`
  SKILL: `/quality-check lathe`

---

### MILESTONE MS9: Quality Compliance (AS9100/ISO 13485/FDA)
**Priority:** HIGH | **Units:** 6 | **Sessions:** 2
**Depends on:** MS8
**Addresses:** Aerospace (28→75), Medical (18→65)
**Engines to Wire:** MaterialCertTraceabilityEngine, DigitalThreadEngine

**U-LPR01**: Material traceability integration
  - Wire MaterialCertTraceabilityEngine: CMTR verification before machining
  - Wire DigitalThreadEngine: heat lot → program → part serial linkage
  - Block: program generation without material cert on file

**U-LPR02**: Device History Record (DHR) output for medical
  - Per-part/batch: parameter traceability (every S, F, T with source)
  - Tool traceability: insert lot, holder serial, edge number
  - Electronic signature fields (21 CFR Part 11 structure)

**U-LPR03**: Biocompatible material handling rules
  - Titanium: no iron contact, dedicated machine enforcement
  - Coolant compatibility: no chlorinated fluids on Ti (ASTM F86)
  - Contamination prevention: material segregation alerts

**U-LPR04**: Process validation lock (IQ/OQ/PQ)
  - Validated parameter sets: once validated, locked from optimization
  - Change control: flag deviations, require revalidation
  - "Validated mode" vs "optimization mode" toggle

**U-LPR05-06**: Tests + wire dispatchers

**FORGE-TRIPLE:**
  HOOK: `material-traceability-gate` — blocks programs without verified material cert
  ACTION: `prism_turning:turning_compliance_check`
  SKILL: `/quality-gate lathe`

---

## PHASE F: PRODUCTION & ECONOMICS

---

### MILESTONE MS10: Cost Optimization & Batch Economics
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS0, MS1
**Addresses:** Cost (31→75), Process (58→80)
**Engines to Wire:** OEECalculatorEngine, ActualCostEngine, JobCostingEngine, QuoteEstimatorEngine

**U-LPE01**: Total cost-per-part model (7 cost buckets)
  - Machine time (cycle × loaded rate), Tool cost (insert/edge × amortization)
  - Material cost (blank weight × price/kg + remnant waste)
  - Setup amortization (setup time × rate / batch size)
  - Quality cost (scrap rate × part value), Energy, Secondary ops

**U-LPE02**: Gilbert/Taylor economic speed optimizer
  - Solve: Vc_opt = C / [(1/n - 1) × (t_tc + C_t/C_m)]^n
  - Output: Vc_max_production, Vc_min_cost, Vc_max_profit
  - Batch-dependent: at 10 parts → setup dominates; at 10,000 → tool cost dominates

**U-LPE03**: Bar stock nesting optimizer
  - Parts-per-bar calculation with cutoff kerf
  - Remnant management (can remnant make shorter parts?)
  - Bar diameter selection for minimum material waste
  - Wire into batch cost calculator

**U-LPE04**: Cycle time detail engine (12+ discrete components)
  - Rapid traverse (machine-specific rates from MachineRegistry)
  - Spindle accel/decel (inertia model), Turret index (CW vs CCW, BMT vs VDI)
  - Coolant settling, Chuck clamp/unclamp, Tailstock advance/retract
  - Part catcher dwell, Dwell times (G4), Look-ahead deceleration

**U-LPE05**: Wire OEECalculatorEngine
  - Availability: setup time + unplanned downtime from insert breakage
  - Performance: feed rate optimization, cycle time vs ideal
  - Quality: scrap rate prediction, rework avoidance

**U-LPE06**: Actual vs estimated cost feedback loop
  - Wire ActualCostEngine: after production, compare predicted vs actual
  - Recalibrate: Taylor coefficients, cycle time model, scrap rate
  - Wire JobCostingEngine for job-level tracking

**U-LPE07-08**: Tests + wire dispatchers + QuoteEstimatorEngine integration

**FORGE-TRIPLE:**
  HOOK: `cost-sanity-gate` — warns when predicted cost-per-part exceeds industry benchmarks
  ACTION: `prism_turning:turning_cost_optimize`
  SKILL: `/cost-optimize lathe`

---

### MILESTONE MS11: Shop Floor Integration & Deployment
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS10
**Addresses:** Shop Floor (28→70)
**Engines to Wire:** RealTimeMachineIntelligenceEngine, JobTravelerEngine

**U-LPD01**: DNC program transfer pipeline
  - File naming conventions per shop (PART-OP-REV format, O-number mapping)
  - Program number management (collision check against existing on controller)
  - Transfer protocols: network/FTP, USB staging, RS-232 drip-feed
  - Controller-specific formatting (%, O-number, program structure)

**U-LPD02**: Tool presetter data integration
  - Import measured offsets from Zoller/Haimer/Speroni
  - Tool assembly verification: programmed vs physical tool match
  - Tool inventory check before program release
  - RFID/network offset loading for automated cells

**U-LPD03**: Machine monitoring feedback loop
  - Wire RealTimeMachineIntelligenceEngine: actual vs predicted spindle load
  - FFT chatter detection feedback
  - Thermal displacement tracking from real-time data
  - Actual tool life recording → Taylor coefficient recalibration

**U-LPD04**: Program revision and approval workflow
  - Draft → Reviewed → Proved-out → Production-released states
  - Change tracking: diff between revisions
  - Wire ProveOutPromotionEngine for prove-out→production gate
  - Electronic approval with timestamps and user IDs

**U-LPD05**: Job traveler generation
  - Wire JobTravelerEngine: routing sheet from operation sequence
  - Barcode-scannable job routing
  - Per-operation: program number, tools required, setup notes, inspection points

**U-LPD06**: Multi-machine deployment
  - Auto-generate variant programs for different machines
  - Strip unavailable features (live tooling, sub-spindle)
  - Capacity-based routing recommendation
  - Machine-specific tool libraries

**U-LPD07-08**: Tests + wire dispatchers

**FORGE-TRIPLE:**
  HOOK: `release-gate` — blocks DNC transfer without approval chain complete
  ACTION: `prism_turning:turning_program_release`
  SKILL: `/ship lathe`

---

## PHASE G: VERIFICATION & TRUST

---

### MILESTONE MS12: Simulation, Verification & Visualization
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS-2, MS0
**Addresses:** Simulation (22→80), Competitive (72→85)
**Engines to Wire:** CNCSimulationPipelineEngine, SimulationVisualizationBridgeEngine

**U-LPV01**: Lathe material removal simulation engine
  - 2D axial profile stock model (not 3D voxels — lathe is axisymmetric)
  - Subtract each cutting pass: OD, bore, face, groove, thread
  - Detect: remaining stock, gouges (below finish profile), missed features
  - Output: profile delta map (stock vs finish) per stage

**U-LPV02**: Before/after part profile comparison
  - Overlay: intended geometry (from features) vs simulated result
  - Highlight: remaining stock (red), gouges (magenta), match (green)
  - Zero-experience indicator: "Your part will look like this"

**U-LPV03**: Kinematic collision simulation (enhanced)
  - Full turret index swept volume during rotation
  - Diagonal rapid path modeling (controller-specific: X-then-Z vs simultaneous)
  - Chuck jaw geometry from workholding selection
  - Tailstock/steady rest dynamic position tracking

**U-LPV04**: G-code re-parse verification loop
  - Parse generated G-code back into motion model
  - Simulate block-by-block: verify actual vs intended
  - Catch: post-processor bugs, diameter/radius mode confusion, arc endpoint errors
  - Catch: modal state errors (G96 persisting into drilling)

**U-LPV05**: Kinematic cycle time simulation
  - Axis accel/decel profiles per machine (from MachineRegistry)
  - Short moves: never reach full speed (trapezoidal motion profile)
  - Spindle ramp: time constant by inertia (RPM change × inertia / motor power)
  - Target: within 5% of actual machine cycle time

**U-LPV06**: WebGL backplot renderer with animation
  - Wire SimulationVisualizationBridgeEngine (adapted for XZ lathe view)
  - Color-coded operations, animated playback at 1x-10x
  - Collision zones highlighted in red
  - Rapid moves distinctly rendered (dashed, semi-transparent)

**U-LPV07**: Plain-language safety report generator
  - Translate every technical metric to consequence language
  - "MAX RPM safely limited to 3500" not "G50 S3500 clamp verified"
  - Traffic-light summary: all checks → single GREEN/YELLOW/RED indicator
  - Comparison: "Similar to 847 validated programs in database"

**U-LPV08**: Tests (15+) + wire dispatchers

**FORGE-TRIPLE:**
  HOOK: `simulation-verification-gate` — blocks program release until simulation finds zero gouges
  ACTION: `prism_turning:turning_simulate`
  SKILL: `/cnc-simulate lathe`

---

## SUMMARY STATISTICS

| Metric | v1.0 | v2.0 | Delta |
|--------|------|------|-------|
| Milestones | 8 | 15 | +7 |
| Total Units | 62 | 126 | +64 |
| Estimated Sessions | 24 | 42 | +18 |
| New Engines Created | 14 | 22 | +8 |
| Existing Engines Wired | 0 | 35 | +35 |
| Safety Stages | 0 | 5 | +5 |
| Orchestrator Stages | 30 | 35 | +5 |
| Controller Dialects | 6 | 8 | +2 |
| Part Families | 12 | 15 | +3 |
| UI Pages | 0 | 4 | +4 |
| Hooks Created | 8 | 18+ | +10 |
| Dispatcher Actions | 20 | 45+ | +25 |
| Skills Created | 6 | 12+ | +6 |

## PROJECTED SCRUTINY SCORES (v1→v2)

| Agent | v1 Score | v2 Target | Key Improvement |
|-------|----------|-----------|-----------------|
| CNC Programmer | 68 | 85 | G73, TNRC resolver, multi-op, WCS, prove-out |
| Safety Engineer | 38 | 88 | 5 safety stages, bar whip, door interlock, emergency |
| Process Engineer | 58 | 82 | Cycle time detail, bar nesting, OEE, batch economics |
| Tooling Specialist | 52 | 78 | Combined selection matrix, chipbreaker windows, wiper |
| Metrology Expert | 34 | 82 | GD&T mapper, thermal compensation, inspection plans |
| Controller Firmware | 58 | 80 | 8 dialects, firmware versions, MAZATROL, macro coord |
| Physics/Materials | 58 | 78 | CSS wear integration, coupled thermal-mechanical |
| Aerospace Quality | 28 | 78 | FAI, material traceability, digital thread, NADCAP |
| Swiss/Mill-Turn | 31 | 72 | Multi-channel, guide bush, Op2, channel balancing |
| UX/Automation | 22 | 82 | Photo upload, guided wizard, plain-English output |
| Threading | 28 | 78 | All infeed methods, 10 forms, measurement, relief |
| Hard Turning | 34 | 76 | CBN selection, white layer control, grinding replacement |
| Shop Floor | 28 | 72 | DNC, presetter, monitoring, approval workflow |
| Chip Control | 18 | 78 | Breaker windows, coolant strategy, unmanned readiness |
| Cost Optimization | 31 | 78 | Gilbert optimizer, 7 cost buckets, actual vs predicted |
| CAD/CAM Integration | 28 | 85 | STEP import, profile extraction, stock selection |
| Simulation/Verify | 22 | 82 | Material removal sim, backplot, G-code re-parse |
| Workholding | 28 | 76 | Op1/Op2, jaw selection, deformation, specialty |
| Medical Device | 18 | 68 | DHR, traceability, contamination, process validation |
| Competitive Intel | 72 | 88 | Photo-to-program, physics proof, batch economics |
| **AVERAGE** | **37.4** | **79.8** | **+42.4 points** |

## ENFORCEMENT HOOKS ACTIVE DURING EXECUTION
- Physics agent: reviews every engine edit for formula correctness
- Wiring agent: reviews every engine for MCP readiness
- Constants checker: blocks inline Kienzle/Taylor values
- Stub detector: blocks placeholder returns
- Test quality: blocks || true patterns
- Auto-compact: fires at 15/25/35 edit thresholds
- Forge-triple gate: blocks compaction without hook+action+skill
- Session audit agent: reviews work before every compaction
- PostCompact: Feature Cascade writes SESSION_ARTIFACTS.json
- SessionStart: reads Feature Cascade, reports new capabilities

## EXECUTION ORDER (recommended)

```
Week 1-2:  MS-1 (Input Pipeline) → MS0 (Orchestrator+Safety)
Week 3:    MS-2 (UI) + MS1 (Insert Wear) [parallel]
Week 4-5:  MS2 (Offset+Thermal) + MS3 (Sequence+MultiOp) [parallel]
Week 6-7:  MS4 (Threading) + MS7 (Chip Control) [parallel]
Week 8:    MS5 (Hard Turning) + MS6 (Swiss) [parallel]
Week 9:    MS8 (Inspection) + MS10 (Cost) [parallel]
Week 10:   MS9 (Quality) + MS11 (Shop Floor) [parallel]
Week 11:   MS12 (Simulation)
Week 12:   Integration testing + 20-agent re-scrutiny
```
