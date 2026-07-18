# LATHE-PRO — Lathe Programming Orchestrator & Optimization Roadmap

## Track: LATHE-PRO
## Version: 1.0.0
## Created: 2026-04-05
## Total Milestones: 8
## Total Units: 62
## Estimated Sessions: 24

## OVERVIEW

Build a WEDM-class unified lathe programming system with intelligent operation
sequencing, insert wear prediction, automatic offset management, machine control
feature utilization, and knowledge-derived rules. This track complements the
existing LATHE track (collision avoidance, dialects, workholding) by adding the
orchestration intelligence layer.

### Pattern Source: WEDM Architecture
```
WEDMCompleteOrchestrationEngine (30 stages) → replicate for lathe
  Stage 1-6:  Material, machine, tool selection
  Stage 7-13: Physics core (force, power, thermal, wear)
  Stage 14-20: Toolpath + G-code generation
  Stage 21-30: Verification & documentation
```

### Existing Foundation (DO NOT REBUILD):
- 29 turning engines, 34 dispatcher actions, 180+ strategies
- TurningPrintToProgramEngine (1,794 LOC) — base orchestrator
- TurningProgramAssemblerEngine (2,615 LOC) — assembly pipeline
- LatheCollisionZoneEngine (732 LOC) — 10-point safety
- LatheScienceHardeningEngine (472 LOC) — chatter, hard turning
- 11 tool wear engines (Taylor, Bayesian, Stochastic, Usui, etc.)
- MachiningKnowledgeBaseEngine (3,400 LOC) — operation sequences
- ToolpathStrategyRegistry (180+ turning strategies)
- 6 controller dialects (Fanuc, Haas, Okuma, Mazak, Siemens, DMG MORI)
- 95,608 tools, 910 machines, 2,957 materials in registries

---

## MILESTONE 0: LATHE-PRO-MS0 — Unified Orchestrator Engine

**Priority:** critical | **Units:** 10 | **Sessions:** 4
**Depends on:** (none — builds on TurningPrintToProgramEngine)

### INTENT
A machinist submits a part description (features, material, tolerances) and receives
a complete, physics-validated CNC turning program with full traceability — exactly
like the WEDM `generateCompleteProgram()` pipeline but for lathe operations.

### SESSION 1: Core Orchestrator Shell (U-LPR01..U-LPR03)
```
SMART CONFIG: Role=CNC-Programmer + LatheSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: WEDMCompleteOrchestrationEngine (pattern template), TurningPrintToProgramEngine (existing base),
           TurningProgramAssemblerEngine, MachiningKnowledgeBaseEngine
  TRIBAL: TribalKnowledgeEngine (turning category), MachiningPlaybookEngine (sequencing + turning rules)
  FORMULAS: Kienzle force, Taylor life, Ra = f²/(32r), P = Fc×Vc/60000
  REFERENCE: CANONICAL_KIENZLE, CANONICAL_TAYLOR, CANONICAL_MATERIAL_DB from constants.ts
INTENT: Machinist gets a unified entry point that chains all 30 stages with typed results.
SKILLS: /forge-engine, /trace, /navigate
```

**U-LPR01**: `LatheOrchestrationEngine` — shell class with 30-stage sequence
  - Stage enum: MATERIAL_ASSESS, MACHINE_SELECT, TOOL_SELECT, WORKHOLDING_PLAN,
    OPERATION_SEQUENCE, PHYSICS_CORE (force/power/thermal/wear per op),
    PARAMETER_OPTIMIZE, TOOLPATH_GENERATE, GCODE_GENERATE, CYCLE_TIME,
    SAFETY_VERIFY, SETUP_SHEET, CONFIDENCE_SCORE
  - Result type: `LatheOrchestrationResult` with full traceability (like WEDMOrchestrationResult)
  - Stages: completed[], skipped[], failed[], warnings[]
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_CREATED: src/engines/LatheOrchestrationEngine.ts
  ABORT_CRITERIA: >3 TS errors, fails to match WEDMCompleteOrchestrationEngine result shape, no stage tracking
  ROLLBACK: git checkout src/engines/LatheOrchestrationEngine.ts

**U-LPR02**: Stages 1-6 — Material, Machine, Tool, Workholding selection
  - Wire to: MaterialRegistry.resolve(), MachineRegistry.resolve(), ToolRegistry.resolve()
  - Wire to: ChuckJawForceEngine, TailstockForceEngine, SteadyRestPlacementEngine
  - Auto-detect: chuck vs collet, tailstock need (L/D > 3), steady rest (L/D > 8)
  - Tool selection: match ISO turning inserts to operation type + material
  → Depends on: U-LPR01

**U-LPR03**: Stages 7-12 — Operation sequencing + physics per operation
  - Wire to: MachiningKnowledgeBaseEngine.OPERATION_SEQUENCE_RULES.lathe
  - Per-operation: Kienzle force, Taylor life, Ra prediction, power check
  - Sequence optimization: minimize tool changes while respecting datum rules
  → Depends on: U-LPR02

### SESSION 2: G-Code Generation & Verification (U-LPR04..U-LPR06)
```
SMART CONFIG: Role=PostProcessor-Engineer + LatheSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: LathePostProcessorEngine, TurningProfileEngine, LatheCollisionZoneEngine,
           PostProcessorPipelineEngine (per-block S/F variability pattern)
  REFERENCE: Controller dialect data (Fanuc/Haas/Okuma/Mazak/Siemens)
```

**U-LPR04**: Stages 13-18 — Toolpath + G-code generation with per-block S/F
  - Wire to: TurningProfileEngine for G71/G70 contour profiles
  - G-code cycles: G71 (roughing), G70 (finishing), G72 (facing), G75 (grooving),
    G76 (threading), G83 (peck drilling), G84 (tapping)
  - Per-block physics: variable speed/feed based on diameter change (CSS compensation)
  - Controller dialect selection from MachineRegistry
  → Depends on: U-LPR03

**U-LPR05**: Stages 19-24 — Safety verification & cycle time
  - Wire to: LatheCollisionZoneEngine (all 10 checks), MachineEnvelopeGuardEngine
  - Cycle time: per-op estimation with rapid traverse, tool change, spindle ramp
  - Safety: G50 spindle clamp verification, tailstock clearance, part-off Z position
  → Depends on: U-LPR04

**U-LPR06**: Stages 25-30 — Setup sheet, confidence score, documentation
  - Setup sheet generation: tool list, jaw setup, tailstock position, Z datum, work offset
  - Confidence scoring: % of physics parameters within published ranges
  - Cost estimation: cycle time × machine rate + tooling cost per part
  → Depends on: U-LPR05

### SESSION 3: Dispatcher Wiring & Integration (U-LPR07..U-LPR08)
```
SMART CONFIG: Role=MCP-Architect + IntegrationSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
```

**U-LPR07**: Wire `LatheOrchestrationEngine` into `turningDispatcher`
  - New action: `lathe_generate_complete_program` → LatheOrchestrationEngine.orchestrate()
  - New action: `lathe_plan_operations` → LatheOrchestrationEngine.planOnly() (no G-code)
  - Zod schemas in turningActionSchemas.ts
  → Depends on: U-LPR06

**U-LPR08**: Wire into turningProgramDispatcher + REST API
  - Update turning.ts route handlers
  - Bridge params from frontend format to engine input
  - Add to DISPATCHER_DIGEST.md
  → Depends on: U-LPR07

### SESSION 4: Tests & Validation (U-LPR09..U-LPR10)
```
SMART CONFIG: Role=QA-Engineer + PhysicsValidator | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
```

**U-LPR09**: Unit tests — 20+ test cases covering all 30 stages
  - Test each stage independently with known inputs
  - Test full pipeline with benchmark parts (shaft, disk, sleeve, threaded)
  - Test error handling: missing material, unknown tool, exceeded machine limits
  → Depends on: U-LPR08

**U-LPR10**: Integration test — end-to-end with real part descriptions
  - Test 5 part families: simple shaft, stepped shaft, threaded shaft, bore part, complex contour
  - Verify G-code output against golden reference programs
  - Verify physics predictions against benchmark ranges
  → Depends on: U-LPR09

**FORGE-TRIPLE:**
  HOOK: `lathe-orchestration-guard` — blocks program generation without physics validation
  ACTION: `prism_turning:lathe_generate_complete_program`
  SKILL: `/lathe-program` — one-shot lathe program generation

**EXIT GATE:** ✓ 30-stage orchestrator runs end-to-end | ✓ 20+ tests pass |
  ✓ 5 part families produce valid G-code | ✓ Physics within benchmark ranges |
  omega_floor >= 0.85 | SVI delta: +2%

---

## MILESTONE 1: LATHE-PRO-MS1 — Insert Wear Intelligence & Life Prediction

**Priority:** critical | **Units:** 8 | **Sessions:** 3
**Depends on:** LATHE-PRO-MS0

### INTENT
The system accurately predicts when a turning insert needs replacement or offset
adjustment based on the specific material being cut, cutting parameters, toolpath
engagement, and accumulated cut length. A machinist trusts these predictions because
they match real shop experience within ±15%.

### SESSION 5: Material-Aware Taylor Calibration (U-LPR11..U-LPR13)
```
SMART CONFIG: Role=ToolLife-Scientist + MetalCuttingSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: ToolWearProgressionEngine, BayesianToolLifeEngine, StochasticToolLifeEngine,
           ThermalWearCouplingEngine, AdvancedWearPhysicsEngine, UsuiWearModel
  FORMULAS: Taylor T=(C/Vc)^(1/n), Extended Taylor T=(C/(Vc^n × f^a × ap^b)),
            Usui adhesive: dW/dt = A×σn×Vs×exp(-B/θ), Archard abrasive
  REFERENCE: CANONICAL_TAYLOR, CANONICAL_MATERIAL_DB, kennametal-turning-catalog.ts,
             Sandvik Coromant General Turning (Chapter 5: Insert Wear),
             ISO 3685:1993 Tool-life testing, Metcut Machining Data Handbook
  TRIBAL: TribalKnowledgeEngine (tool_life category), MachiningPlaybookEngine (tool_life rules)
```

**U-LPR11**: `TurningInsertLifeEngine` — material-specific extended Taylor model
  - Extended Taylor: T = C / (Vc^(1/n) × f^a × ap^b) with material-specific C, n, a, b
  - Material database: per-ISO-group + material-specific overrides (like BENCH-MS0 pattern)
  - Coating multipliers: TiN=1.3, TiAlN=1.5, AlTiN=1.6, CVD=1.8 (from canonical)
  - Insert grade matching: material ISO group → recommended insert grade family
  FILES_CREATED: src/engines/TurningInsertLifeEngine.ts

**U-LPR12**: Toolpath engagement adjustment — ae/D equivalent for turning
  - OD turning: engagement = ap/nose_radius ratio affects wear distribution
  - Interrupted cuts: entry/exit impacts per revolution (shock loading multiplier)
  - CSS compensation: as diameter changes, Vc changes → wear rate varies along part
  - Variable wear model: integrate wear rate over toolpath length, not just time
  → Depends on: U-LPR11

**U-LPR13**: Insert change recommendation engine
  - Wear criteria: VB_max=0.3mm (ISO 3685), VB_notch=0.6mm, crater KT=0.06+0.3f
  - Remaining life estimator: current accumulated cut length vs predicted total life
  - Change urgency: GREEN (>50% life), YELLOW (25-50%), RED (<25%), CRITICAL (<10%)
  - Output: { insert_station, current_wear_pct, remaining_parts, change_at_part_N, urgency }
  → Depends on: U-LPR12

### SESSION 6: Toolpath-Aware Wear Prediction (U-LPR14..U-LPR16)
```
SMART CONFIG: Role=WearPhysics-Engineer + TurningSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: ThermalWearCouplingEngine (RK4 ODE — Usui model), CuttingTemperatureEngine,
           KienzleForceModelEngine
  FORMULAS: Usui dW/dt = A×σn×Vs×exp(-B/θ), Loewen-Shaw temperature,
            Kienzle Fc = kc1_1 × ap × fz^(1-mc)
```

**U-LPR14**: Per-operation wear accumulation model
  - For each operation in the sequence, compute:
    Cut length [mm] = (part_length × passes) or (π × D_avg × N_revolutions)
    Wear rate [µm/m] from Usui model based on local Fc, θ, Vc
  - Accumulate across operations on the same insert
  - Account for roughing vs finishing (different inserts, different wear patterns)
  → Depends on: U-LPR13

**U-LPR15**: Chip form prediction → wear mode mapping
  - Chip types: continuous (steel), segmented (Ti, Inconel), discontinuous (cast iron)
  - Wear modes by chip type:
    Continuous → crater + flank wear (abrasion + diffusion)
    Segmented → notch wear + thermal cracking (cyclic loading)
    Discontinuous → flank wear + edge chipping (abrasion)
  - Material-specific coefficients from Sandvik wear guide
  → Depends on: U-LPR14

**U-LPR16**: Multi-part batch life predictor
  - Input: part program + batch quantity
  - Output: { parts_per_edge, insert_changes_per_batch, optimal_change_points[],
              total_insert_cost, cost_per_part_tooling }
  - Optimization: suggest parameter adjustments to hit target batch size per edge
    (e.g., "reduce Vc by 8% to get 25 parts/edge instead of 18")
  → Depends on: U-LPR15

### SESSION 7: Tests & Wiring (U-LPR17..U-LPR18)

**U-LPR17**: 15+ test cases for insert life prediction
  - Test against published Sandvik insert life data (CNMG, DNMG, WNMG)
  - Test material spectrum: carbon steel, alloy steel, stainless, titanium, aluminum
  - Test batch prediction: 10-part, 100-part, 1000-part batches

**U-LPR18**: Wire into turningDispatcher
  - New actions: `turning_predict_insert_life`, `turning_batch_life_plan`,
    `turning_wear_accumulation`, `turning_insert_change_schedule`
  → Depends on: U-LPR17

**FORGE-TRIPLE:**
  HOOK: `insert-life-gate` — warns when predicted wear exceeds VB_max=0.3mm mid-program
  ACTION: `prism_turning:turning_predict_insert_life`
  SKILL: `/tool-life-max` (enhance existing skill with turning-specific intelligence)

**EXIT GATE:** ✓ Extended Taylor within ±15% of Sandvik published data |
  ✓ Batch predictor accounts for Vc variation (CSS) | ✓ 15+ tests pass |
  ✓ All 7 material groups covered | omega_floor >= 0.85 | SVI delta: +3%

---

## MILESTONE 2: LATHE-PRO-MS2 — Automatic Offset Management & Accuracy Control

**Priority:** critical | **Units:** 7 | **Sessions:** 3
**Depends on:** LATHE-PRO-MS1

### INTENT
The system recommends tool offset adjustments mid-production run to compensate for
insert wear, maintaining dimensional accuracy without stopping the machine. It
generates macro code for in-process measurement and auto-correction when the
machine supports it.

### SESSION 8: Offset Compensation Model (U-LPR19..U-LPR21)
```
SMART CONFIG: Role=MetrologyEngineer + OffsetSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: ToolWearCompensationEngine, ToolOffsetEngine (if exists), MachineEnvelopeGuardEngine
  FORMULAS: Wear compensation: ΔX = VB × tan(κ_r), ΔZ = VB × cos(κ_r)/sin(κ_r)
  REFERENCE: ISO 3685 wear measurement, Renishaw probing cycles, Fanuc Custom Macro B
  TRIBAL: MachiningPlaybookEngine (dimensional_accuracy rules)
```

**U-LPR19**: `TurningOffsetCompensationEngine` — wear-to-offset mapping
  - Flank wear VB → diameter growth: ΔD = 2 × VB × cos(κ_r) for approach angle κ_r
  - Nose wear → Z-direction shift: ΔZ = nose_wear × sin(κ_r)
  - Offset correction: X_offset_adj = -ΔD/2 (negative = tighter tolerance)
  - Temperature compensation: thermal growth of part + spindle during long runs
  FILES_CREATED: src/engines/TurningOffsetCompensationEngine.ts

**U-LPR20**: Probing cycle generator — in-process measurement
  - Generate Renishaw-compatible touch probe cycles:
    G65 P9023 D_ Z_ (Renishaw single surface OD probe)
    G65 P9814 Z_ (bore probe cycle)
  - Auto-calculate measurement point based on critical dimensions
  - Trigger logic: every N parts, or when predicted wear crosses threshold
  → Depends on: U-LPR19

**U-LPR21**: Macro-based auto-offset adjustment
  - Generate Custom Macro B (Fanuc), NVAR (Okuma), Macro (Haas) code:
    Measure → Compare to nominal → Adjust tool offset register → Continue
  - Safety limits: max single adjustment = 0.05mm (prevent catastrophic crash)
  - Logging: record all offset changes to DNC variable for SPC tracking
  → Depends on: U-LPR20

### SESSION 9: Accuracy Prediction & SPC Integration (U-LPR22..U-LPR24)

**U-LPR22**: Dimensional accuracy predictor per part in batch
  - Input: nominal tolerance, batch size, wear rate
  - Output: predicted dimension vs part number curve
  - Identify: which part number will first exceed tolerance without offset adjustment
  - Show: with vs without auto-compensation improvement

**U-LPR23**: SPC integration — Cp/Cpk prediction
  - Wire to: SPCProcessCapabilityEngine
  - Predict Cpk with and without offset management
  - Target: Cpk >= 1.67 (6-sigma capability)
  → Depends on: U-LPR22

**U-LPR24**: Wire into dispatcher + tests
  - Actions: `turning_offset_compensation`, `turning_probing_cycle`,
    `turning_accuracy_prediction`, `turning_auto_offset_macro`
  - 12+ tests covering all offset scenarios
  → Depends on: U-LPR23

**U-LPR25**: Controller-specific macro templates
  - Fanuc: Custom Macro B with #variables
  - Haas: Macro with Setting 33 enabled
  - Okuma: NVAR-based with M50/M51 coolant integration
  - Mazak: !L/!R channel coordination for sub-spindle measurement
  → Depends on: U-LPR24

**FORGE-TRIPLE:**
  HOOK: `offset-safety-gate` — blocks offset adjustments > 0.05mm single step
  ACTION: `prism_turning:turning_auto_offset_macro`
  SKILL: `/lathe-offset` — generate probing + auto-offset code for any controller

**EXIT GATE:** ✓ Offset model matches wear geometry (κ_r correction) |
  ✓ Probing cycles generate for 4 controllers | ✓ Safety limit enforced |
  ✓ SPC Cpk improvement demonstrated | omega_floor >= 0.85 | SVI delta: +2%

---

## MILESTONE 3: LATHE-PRO-MS3 — Operation Sequence Optimization

**Priority:** high | **Units:** 8 | **Sessions:** 3
**Depends on:** LATHE-PRO-MS0

### INTENT
Every lathe program has the optimal operation sequence for its part type —
safe, logical, and fully optimized for minimum cycle time and maximum tool life.
The system handles 12+ part families with specific sequence strategies.

### SESSION 10: Part Type Classification & Base Sequences (U-LPR26..U-LPR28)
```
SMART CONFIG: Role=ProcessPlanner + TurningSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: MachiningKnowledgeBaseEngine (OPERATION_SEQUENCE_RULES.lathe),
           IntelligentSequencingEngine, OperationSequencerEngine, SequenceFeasibilityEngine
  TRIBAL: course-5-turning-operations.ts (all 10 modules), MachiningPlaybookEngine (sequencing rules)
  REFERENCE: Haas Lathe Programming Workbook (Productivity Inc 2022),
             Machinery's Handbook 31st (Chapter: Lathe Operations),
             Sandvik General Turning Application Guide (Section: Process Planning)
```

**U-LPR26**: `LathePartClassifierEngine` — classify part into optimization family
  - 12 families: simple_shaft, stepped_shaft, flanged_shaft, threaded_shaft,
    hollow_shaft, disk_face, sleeve, hub, complex_contour, bar_stock_family,
    swiss_type, live_tool_part
  - Classification from feature list: if has_threads + OD_steps → threaded_shaft
  - Each family has a base operation template (optimized sequence)
  FILES_CREATED: src/engines/LathePartClassifierEngine.ts

**U-LPR27**: `LatheSequenceOptimizerEngine` — multi-criteria optimization
  - Objectives: minimize cycle_time, maximize tool_life, minimize tool_changes
  - Constraints: datum rules (face first), safety rules (cutoff last), material rules
  - Algorithm: weighted priority scheduling with constraint satisfaction
  - Account for: thermal growth ordering (rough all → cool → finish all)
  FILES_CREATED: src/engines/LatheSequenceOptimizerEngine.ts

**U-LPR28**: Per-family base sequences with variants
  - Simple shaft: face → center_drill → drill → OD_rough → OD_finish → groove → thread → cutoff
  - Flanged shaft: face → OD_rough_step1 → flange_face → OD_rough_step2 → OD_finish → cutoff
  - Hollow shaft: face → center_drill → drill → bore_rough → bore_finish → OD_rough → OD_finish → cutoff
  - Swiss type: guide_bush_feed → OD_rough → OD_finish → cross_drill → cutoff → bar_pull
  - 8 more families with optimized sequences
  → Depends on: U-LPR27

### SESSION 11: Advanced Optimization (U-LPR29..U-LPR31)
```
SMART CONFIG: Role=OptimizationEngineer + TurningSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
```

**U-LPR29**: Tool change minimization — group operations by tool
  - Group compatible operations that use the same insert/holder
  - Re-sequence within groups while respecting constraints
  - Example: if OD_rough (CNMG) and OD_groove (same holder with groove blade) → consider order

**U-LPR30**: Thermal growth compensation sequencing
  - Pattern: rough_all → dwell/cool → finish_all (minimizes thermal drift)
  - For tight tolerances (<±0.025mm): insert thermal stabilization cycle
  - Auto-detect: if any feature tolerance < 0.05mm → enforce thermal sequencing

**U-LPR31**: Sub-spindle transfer sequencing (mill-turn/swiss)
  - Wire to: MillTurnSwissPipelineEngine
  - Optimization: minimize sub-spindle transfers, balance work between spindles
  - Synchronization: which ops can overlap (main spindle turning + sub-spindle drilling)

### SESSION 12: Tests & Wiring (U-LPR32..U-LPR33)

**U-LPR32**: 15+ test cases for sequence optimization
  - Test all 12 part families
  - Test constraint satisfaction (cutoff always last, face always first)
  - Test optimization: verify cycle time reduction vs naive sequence

**U-LPR33**: Wire into dispatcher
  - Actions: `turning_classify_part`, `turning_optimize_sequence`,
    `turning_sequence_plan`, `turning_thermal_sequence`

**FORGE-TRIPLE:**
  HOOK: `sequence-safety-gate` — blocks cutoff before all features complete
  ACTION: `prism_turning:turning_optimize_sequence`
  SKILL: `/lathe-sequence` — optimize operation sequence for any turning part

**EXIT GATE:** ✓ 12 part families classified | ✓ Cycle time reduced ≥5% vs naive |
  ✓ All safety constraints enforced | ✓ 15+ tests pass |
  omega_floor >= 0.85 | SVI delta: +2%

---

## MILESTONE 4: LATHE-PRO-MS4 — Machine Control Feature Integration

**Priority:** high | **Units:** 8 | **Sessions:** 3
**Depends on:** LATHE-PRO-MS0

### INTENT
The system leverages advanced machine control features (CSS, adaptive feed,
macro-based measurement, sub-spindle synchronization) to produce programs that
use the machine's full capability, not just basic G71/G70 cycles.

### SESSION 13: Spindle Control Intelligence (U-LPR34..U-LPR36)
```
SMART CONFIG: Role=CNC-ControlSpecialist + LatheExpert | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: ControllerDialectEngine, ControllerKnowledgeDBEngine, OkumaParametricProgramEngine
  REFERENCE: okuma-dialect-knowledge.ts, Fanuc 31i-B manual (CSS section),
             Haas NGC operator manual (Chapter: Turning)
  TRIBAL: controller-knowledge-tips.ts
```

**U-LPR34**: `LatheCSSOptimizerEngine` — Constant Surface Speed intelligence
  - G96 S_rpm → optimal CSS with G50 S_max_rpm clamp
  - Auto-calculate S_max from machine spindle spec and part min_diameter
  - CSS transition points: where to switch G96→G97 (threading, drilling, small diameter)
  - Spindle acceleration compensation: adjust feedrate during diameter transitions
  FILES_CREATED: src/engines/LatheCSSOptimizerEngine.ts

**U-LPR35**: Adaptive feed control integration
  - Fanuc AFC (Adaptive Feed Control): generate M-codes + parameter setup
  - Okuma Machining Navi: configure force monitoring parameters
  - Haas: TCPC (Tool Center Point Control) for live tooling
  - Generate macro code for constant chip load at varying diameters

**U-LPR36**: Turret optimization & tool station mapping
  - Optimal turret station assignment: minimize index time (clockwise preference)
  - Duplicate tool strategy: when to put same insert in 2 stations (rough+finish)
  - Tool change overlap with spindle ramp (start spindle accel during turret index)

### SESSION 14: Advanced Machine Features (U-LPR37..U-LPR39)
```
SMART CONFIG: Role=AdvancedCNC-Specialist + MillTurnExpert | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
```

**U-LPR37**: C-axis and live tooling integration
  - C-axis positioning: index for flats, hexes, keyways
  - Live tool synchronization: M-codes for spindle orient + live tool engage
  - Y-axis off-center milling (when available)
  - Polar interpolation (G12.1) for face milling patterns

**U-LPR38**: Sub-spindle and part catcher
  - Sub-spindle pick-off sequence: synchronize rpm → engage → part-off → transfer
  - Part catcher activation timing: M-codes coordinated with part-off
  - Bar puller integration: cycle end → bar pull → bar stop → re-chuck

**U-LPR39**: Tailstock automation
  - Auto-engage/retract tailstock based on L/D ratio
  - Programmable tailstock pressure (for thin-wall parts, reduce force)
  - Quill extend synchronization with facing/OD operations

### SESSION 15: Tests & Wiring (U-LPR40..U-LPR41)

**U-LPR40**: 15+ tests for machine feature integration
  - Test CSS optimization for 5 diameter ranges
  - Test turret optimization (verify index direction minimizes time)
  - Test C-axis + live tooling sequence generation

**U-LPR41**: Wire into dispatcher + schemas
  - Actions: `turning_css_optimize`, `turning_turret_optimize`,
    `turning_live_tool_sequence`, `turning_sub_spindle_transfer`,
    `turning_adaptive_feed_setup`

**FORGE-TRIPLE:**
  HOOK: `css-safety-gate` — blocks G96 without G50 S_max clamp
  ACTION: `prism_turning:turning_css_optimize`
  SKILL: `/spindle-optimize` (enhance existing with turning CSS intelligence)

**EXIT GATE:** ✓ CSS optimizer produces valid G96/G50 pairs |
  ✓ 4 controllers supported | ✓ Live tooling sequences safe |
  ✓ 15+ tests pass | omega_floor >= 0.85 | SVI delta: +2%

---

## MILESTONE 5: LATHE-PRO-MS5 — Knowledge Rules Generation Pipeline

**Priority:** high | **Units:** 8 | **Sessions:** 3
**Depends on:** LATHE-PRO-MS0

### INTENT
Generate comprehensive turning rules from handbooks, training manuals, tribal
knowledge, and manufacturer data. These rules feed into the orchestrator's
decision engine and enforce best practices automatically.

### SESSION 16: Handbook & Manual Rule Extraction (U-LPR42..U-LPR44)
```
SMART CONFIG: Role=KnowledgeEngineer + ManufacturingSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: TribalKnowledgeEngine, MachiningPlaybookEngine, MachiningKnowledgeBaseEngine
  REFERENCE: Machinery's Handbook 31st, Sandvik General Turning Application Guide,
             Kennametal Master Catalog (Turning Section), ISCAR Turning Guide,
             course-5-turning-operations.ts
  TRIBAL: All 3,700+ tribal tips (filter: turning + lathe + bore + thread + groove)
```

**U-LPR42**: `TurningRulesGeneratorEngine` — extract rules from structured sources
  - Parse MachiningPlaybookEngine rules (turning, threading, hard_turning categories)
  - Parse TribalKnowledgeEngine tips (turning domain)
  - Parse course-5 curriculum into executable rules
  - Output: typed rule objects { id, category, condition, action, source, confidence }
  FILES_CREATED: src/engines/TurningRulesGeneratorEngine.ts

**U-LPR43**: Material-specific rules from catalog data
  - Extract from kennametal-turning-catalog.ts: speed/feed limits by material + insert
  - Extract from tungaloy-turning-catalog.ts: chip breaker recommendations
  - Extract from widia-2022-turning-catalog.ts: DOC limits by insert shape
  - Create: per-material rule sets { material, max_vc, max_f, max_ap, chipbreaker, coolant }

**U-LPR44**: Safety rules generation — anti-patterns and hard limits
  - Anti-patterns from playbook: "never groove before OD finish", "never face with worn insert"
  - Hard limits: max RPM by part diameter, max DOC by insert IC size, max feed by nose radius
  - Generate enforcement rules that the orchestrator can check per-operation
  → Depends on: U-LPR43

### SESSION 17: Video & PDF Learning Integration (U-LPR45..U-LPR47)
```
SMART CONFIG: Role=MLEngineer + LearningPipelineSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
```

**U-LPR45**: Video learning pipeline for turning knowledge
  - Wire to: /video-learn skill for YouTube machining channels
  - Target channels: Titans of CNC, Haas Automation, NYC CNC, This Old Tony
  - Extract: operation sequences, tool selections, speeds/feeds, tips
  - Format: TribalKnowledgeEngine-compatible tip objects

**U-LPR46**: PDF learning pipeline for manufacturer data
  - Wire to: /pdf-learn skill
  - Target: Sandvik General Turning catalog PDF, Kennametal Turning Solutions PDF
  - Extract: insert grade → material mapping, recommended parameters, wear patterns
  - Format: catalog-compatible data objects

**U-LPR47**: Rule deduplication & confidence scoring
  - Merge rules from all sources (handbook, catalog, tribal, video, PDF)
  - Deduplicate by condition+action similarity
  - Score confidence: iso_standard > manufacturer_data > empirical_validated > heuristic
  - Output: consolidated rule database with provenance tracking
  → Depends on: U-LPR46

### SESSION 18: Tests & Integration (U-LPR48..U-LPR49)

**U-LPR48**: Test rule generation pipeline
  - Verify rules generated from each source type
  - Verify deduplication works correctly
  - Verify confidence scoring matches expected hierarchy

**U-LPR49**: Wire rules into orchestrator
  - LatheOrchestrationEngine reads rules at stage 5 (operation sequencing)
  - Rules influence: operation order, parameter selection, safety gates
  - Actions: `turning_generate_rules`, `turning_query_rules`, `turning_validate_against_rules`

**FORGE-TRIPLE:**
  HOOK: `turning-rules-enforcement` — blocks programs that violate CRITICAL rules
  ACTION: `prism_turning:turning_query_rules`
  SKILL: `/playbook turning` (extend existing playbook with generated rules)

**EXIT GATE:** ✓ 100+ rules generated from structured sources |
  ✓ Rules deduplicated with confidence scores | ✓ Orchestrator respects rules |
  ✓ Video/PDF pipeline produces valid output | omega_floor >= 0.85 | SVI delta: +3%

---

## MILESTONE 6: LATHE-PRO-MS6 — Enforcement Scripts & Hooks

**Priority:** high | **Units:** 7 | **Sessions:** 3
**Depends on:** LATHE-PRO-MS0, LATHE-PRO-MS1

### INTENT
Automated enforcement prevents bad lathe programs from reaching the shop floor.
Scripts catch errors that humans miss; hooks enforce standards at every stage.

### SESSION 19: Pre-Program Hooks (U-LPR50..U-LPR52)
```
SMART CONFIG: Role=SafetyEngineer + HookSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
KNOWLEDGE:
  ENGINES: LatheCollisionZoneEngine, MachineEnvelopeGuardEngine, LatheScienceHardeningEngine
  REFERENCE: Hook patterns from ForgeTripleHooks.ts, SpecialtyManufacturingHooks.ts
```

**U-LPR50**: `LathePreProgramHooks` — pre-calculation safety gates
  - RPM limit check: G96 Smax ≤ machine spec, G97 S ≤ machine max
  - Feed limit check: per-insert max feed from catalog
  - DOC limit check: ap ≤ insert IC × 0.67 (Sandvik rule of thumb)
  - Workholding check: cutting force < clamping force × 0.7 (30% safety margin)
  FILES_CREATED: src/hooks/LathePreProgramHooks.ts

**U-LPR51**: `LathePostProgramHooks` — post-generation validation
  - G50 present before every G96 block (CSS without clamp = dangerous)
  - Part-off Z-position: verify part falls into catcher, not onto bed
  - Tool change retract: verify X > part_OD + turret_radius before M6/T-code
  - Coolant consistency: verify coolant ON before cutting, OFF at tool change

**U-LPR52**: `LathePhysicsHooks` — physics validation gates
  - Power check: required kW < machine spindle kW × 0.8 (20% headroom)
  - Deflection check: boring bar δ < tolerance/3
  - Chatter check: predicted frequency vs stability lobe (from LatheScienceHardeningEngine)
  - Temperature check: interface temperature < insert grade limit

### SESSION 20: Enforcement Scripts (U-LPR53..U-LPR54)
```
SMART CONFIG: Role=AutomationEngineer + ScriptSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
```

**U-LPR53**: `lathe-program-validator.mjs` — standalone G-code validation script
  - Parse G-code for lathe-specific issues:
    Missing G50 before G96, missing M08 (coolant), T-code without M06,
    X-axis moves below zero (crash into spindle), Z moves past tailstock
  - Output: pass/fail with issue list
  FILES_CREATED: scripts/lathe-program-validator.mjs

**U-LPR54**: `lathe-physics-audit.mjs` — batch physics audit script
  - Audit all turning programs in a directory
  - Check: forces within machine limits, tool life estimates, surface finish predictions
  - Output: HTML report with pass/fail per program per metric
  FILES_CREATED: scripts/lathe-physics-audit.mjs

### SESSION 21: SVI Integration & Tests (U-LPR55..U-LPR56)

**U-LPR55**: Wire hooks into HookRegistryEngine
  - Register all lathe hooks with proper priority (critical/high/normal)
  - Wire into edmDispatcher-style pre/post-calculation hook execution
  - Verify hooks fire correctly on turningDispatcher actions

**U-LPR56**: Test suite — 20+ tests for hooks and scripts
  - Test each hook catches its target violation
  - Test hooks don't false-positive on valid programs
  - Test scripts produce correct reports

**FORGE-TRIPLE:**
  HOOK: All hooks from U-LPR50..U-LPR52 (6+ hooks total)
  ACTION: `prism_turning:turning_validate_program` (runs all hooks)
  SKILL: `/program-validate lathe` (extend existing with lathe hooks)

**EXIT GATE:** ✓ 6+ hooks registered and active | ✓ 2 scripts production-ready |
  ✓ Hooks catch all defined violations | ✓ Zero false positives on golden programs |
  ✓ 20+ tests pass | omega_floor >= 0.90 | SVI delta: +2%

---

## MILESTONE 7: LATHE-PRO-MS7 — Validation Benchmark & Production Testing

**Priority:** high | **Units:** 6 | **Sessions:** 2
**Depends on:** LATHE-PRO-MS0 through MS6

### INTENT
Prove the system produces programs that match or exceed human-programmed results
across diverse part families, materials, and machines. Benchmark against real shop
programs and manufacturer reference data.

### SESSION 22: Benchmark Suite (U-LPR57..U-LPR59)
```
SMART CONFIG: Role=QA-Lead + BenchmarkSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: BenchmarkSuiteEngine (pattern from BENCH-MS0), benchmark-industry-programs.ts,
           benchmark-parts.ts
  REFERENCE: Real shop programs from box-programs, manufacturer demo programs
```

**U-LPR57**: `LatheBenchmarkSuiteEngine` — 18 turning benchmark scenarios
  - Scenario categories: simple shaft, complex contour, thread-heavy, bore-heavy,
    swiss-type, production batch, tight-tolerance, interrupted cut
  - Materials: AISI1045, SS316L, Ti6Al4V, Al6061, Inconel718, brass, cast iron
  - Reference: published cycle times, forces, tool life from Sandvik/Kennametal
  FILES_CREATED: src/engines/LatheBenchmarkSuiteEngine.ts

**U-LPR58**: Golden program comparison — PRISM vs human-programmed
  - Compare 5 real shop programs (from box-programs) against PRISM output
  - Metrics: cycle time (within 10%), tool life prediction (within 20%),
    surface finish (within 1 Ra grade), dimensional accuracy expectation
  - Report: per-program scorecard with pass/fail/improvement notes

**U-LPR59**: End-to-end regression test suite
  - 30+ tests covering the full orchestrator pipeline
  - Regression protection: if any scenario degrades >5%, test fails
  - CI-friendly: runs in <60 seconds

### SESSION 23: Production Validation & Documentation (U-LPR60..U-LPR62)

**U-LPR60**: Production-ready validation checklist
  - Run all hooks on benchmark programs → zero violations
  - Run physics audit script → all metrics within range
  - Run SPC prediction → Cpk >= 1.33 for all critical dimensions

**U-LPR61**: Documentation and training material
  - User guide: how to use /lathe-program, /lathe-sequence, /lathe-offset
  - Architecture doc: orchestrator pipeline stages, data flow
  - Troubleshooting: common issues and resolutions

**U-LPR62**: SVI variability maximization
  - Verify all new engines/dispatchers/hooks increase Ψ (reachability)
  - Connect: tool catalog → insert life → offset management → G-code → validation
  - Target: Turning pipeline Ψ from current 78% → 95%+
  - Wire ALL 7 new engines to dispatchers, ensure all data paths connected

**FORGE-TRIPLE:**
  HOOK: `lathe-benchmark-regression` — blocks merges that degrade benchmark scores
  ACTION: `prism_turning:turning_benchmark_run`
  SKILL: `/lathe-benchmark` — run full turning benchmark suite

**EXIT GATE:** ✓ 18/18 benchmark scenarios pass | ✓ 5/5 golden programs within 10% |
  ✓ 30+ regression tests pass | ✓ Turning Ψ >= 95% |
  ✓ All documentation complete | omega_floor >= 0.90 | SVI delta: +5%

---

## DEPENDENCY GRAPH

```
LATHE-PRO-MS0 (Orchestrator)
  ├── LATHE-PRO-MS1 (Insert Wear) ──→ LATHE-PRO-MS2 (Offset Management)
  ├── LATHE-PRO-MS3 (Sequence Optimization)
  ├── LATHE-PRO-MS4 (Machine Control)
  ├── LATHE-PRO-MS5 (Knowledge Rules)
  └── LATHE-PRO-MS6 (Hooks & Scripts) ←── MS0 + MS1
                                            │
  ALL ──────────────────────────────────→ LATHE-PRO-MS7 (Validation)
```

## ENFORCEMENT HOOKS ACTIVE DURING EXECUTION
- Physics agent: reviews every engine edit for formula correctness
- Wiring agent: reviews every engine for MCP readiness
- Constants checker: blocks inline Kienzle/Taylor values (MUST import)
- Stub detector: blocks placeholder returns
- Test quality: blocks || true patterns
- Forge-triple gate: blocks compaction without hook + action + skill
- Auto-compact: fires at 15/25/35 edit thresholds

## NEW ENGINES CREATED (14 total)
1. LatheOrchestrationEngine — unified 30-stage orchestrator
2. TurningInsertLifeEngine — material-specific extended Taylor
3. TurningOffsetCompensationEngine — wear-to-offset mapping
4. LathePartClassifierEngine — 12 part families
5. LatheSequenceOptimizerEngine — multi-criteria sequence optimization
6. LatheCSSOptimizerEngine — constant surface speed intelligence
7. TurningRulesGeneratorEngine — handbook/tribal/catalog rule extraction
8. LatheBenchmarkSuiteEngine — 18 turning validation scenarios
+ 6 supporting engines/scripts

## NEW DISPATCHER ACTIONS (20+)
- lathe_generate_complete_program, lathe_plan_operations
- turning_predict_insert_life, turning_batch_life_plan
- turning_offset_compensation, turning_probing_cycle, turning_auto_offset_macro
- turning_classify_part, turning_optimize_sequence
- turning_css_optimize, turning_turret_optimize, turning_live_tool_sequence
- turning_generate_rules, turning_query_rules
- turning_validate_program, turning_benchmark_run
+ 5 more

## NEW HOOKS (8+)
- lathe-orchestration-guard, insert-life-gate, offset-safety-gate
- sequence-safety-gate, css-safety-gate, turning-rules-enforcement
- lathe-benchmark-regression + LathePreProgramHooks (4 sub-hooks)
+ LathePostProgramHooks (4 sub-hooks) + LathePhysicsHooks (4 sub-hooks)

## NEW SKILLS (6)
- /lathe-program, /lathe-sequence, /lathe-offset
- /lathe-benchmark, /tool-life-max (enhanced), /spindle-optimize (enhanced)

## SVI IMPACT
- 14 new engines × 3 dims = 42 new variability dimensions
- 20+ new actions = 20 new variability paths
- 8+ new hooks = enforcement coverage increase
- Target: Turning pipeline Ψ 78% → 95%, System Ψ 97.7% → 98.2%
