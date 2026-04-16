# LATHE-PRO v3.0 — Complete Lathe Programming Intelligence Roadmap

## Track: LATHE-PRO | Version: 3.0.1 | Created: 2026-04-05 | Loop 2 Fix Applied
## Total Milestones: 17 | Total Units: 142 | Estimated Sessions: 48
## Scoring History:
##   v1.0: 37.4/100 avg (20-agent) — 8 MS, 62 units
##   v2.0: 72.3/100 avg (20-agent) — 15 MS, 126 units
##   v3.0: projected 81.6/100 avg — 17 MS, 142 units
## v3.0 Focus: Fix 4 agents below 60 (Swiss 34, Threading 44, CAD/CAM 46, Workholding 49)
## Goal: Zero-experience user uploads photo/CAD -> master-level safe CNC lathe program

---

## LOOP 2 FIX AMENDMENT (addressing 3 worst structural dimensions from Loop 1)

### FIX 1: MCP FULL UTILIZATION PROTOCOL (was 18/100 — mandatory for ALL sessions)

Every session in this roadmap MUST execute these MCP actions. This is NOT optional.

**Session Start (before ANY code work):**
```
prism_session:context_boot           — Full context hydration
prism_session:dispatcher_map         — Discover all 79 dispatchers, 3,898+ actions
prism_session:memory_recall          — Load cross-session knowledge
prism_session:system_snapshot        — Capture baseline state
prism_session:action_search "<goal>" — Route to optimal dispatcher for this session
```

**During Work (every 5-10 tool calls):**
```
prism_session:auto_checkpoint        — Save incremental state
prism_session:action_search "<need>" — Route intent to optimal dispatcher
prism_session:wip_capture            — Snapshot work-in-progress
```

**Session End / Pre-Compact:**
```
prism_session:memory_save            — Persist cross-session knowledge
prism_session:system_snapshot        — Capture post-work state (diff against baseline)
prism_session:checkpoint_enhanced    — Detailed checkpoint with artifact list
```

**Plugin Utilization (every session where applicable):**
```
Vitest MCP:  npx vitest run [file] — after every engine creation/modification
ESLint MCP:  mcp__eslint__lint-files — TypeScript quality gate before commit
```

**Skill Utilization (per session, reference the specific skills):**
- /forge-engines, /forge-wiring — engine creation sessions
- /prism-review, /scrutinize — every session at SCRUTINIZE loop
- /test — every session at GAP FILL loop
- /physics-verify — physics-touching sessions
- /forge-triple — milestone completion sessions
- /trace — wiring verification sessions
- /navigate, /code-index — file location
- /program-validate — G-code output sessions

### FIX 2: PHYSICS RIGOR PROTOCOL (was 44/100 — canonical constants enforcement)

**Mandatory for ALL physics-touching units (MS0, MS1, MS2, MS4a, MS5, MS7, MS10, MS12):**

1. **NEVER inline physics constants.** All Kienzle, Taylor, material properties MUST import:
   ```typescript
   import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, CANONICAL_MATERIAL_DB,
            kienzleForce, taylorLife, toolDeflection, predictedRa, cuttingPower
   } from "../physics/constants.js";
   ```

2. **Formula citations required.** Every physics calculation MUST cite its source:
   - Kienzle: Fc = kc1_1 × ap × h^(1-mc) — Ref: Altintas "Manufacturing Automation" §2.3
   - Taylor: T = (C/Vc)^(1/n) — Ref: ISO 3685:1993, F.W. Taylor (1907)
   - Extended Taylor: V×T^n×f^a×d^b = C — Ref: Kronenberg "Machining Science"
   - Usui wear: dW/dt = A×σn×Vs×exp(-B/θ) — Ref: Usui, Shirakashi & Kitagawa (1978)
   - Loewen-Shaw: T = C×Vc^0.4×f^0.2 — Ref: Loewen & Shaw, Trans ASME (1954)
   - Ra = f²/(32×r_e) — Ref: Brammertz (1961), Boothroyd "Fundamentals" (1989)
   - Deflection: δ = F×L³/(3EI) — Ref: Euler-Bernoulli beam theory
   - Trilobe: δ = F×R³/(E×I) — Ref: Roark's "Formulas for Stress and Strain"
   - Lame: σ_r = p×r_i²/(r_o²-r_i²) — Ref: Lame thick-wall cylinder equations

3. **Safety factors MUST reference standards:**
   - Clamping: 2.5× per ISO 10218
   - Machine power: 80% headroom (20% safety margin)
   - Deflection: δ < tolerance/3 (standard practice)
   - Boring bar L/D: steel ≤4, carbide ≤6, dampened ≤10 (Sandvik general turning guide)
   - VB_max: 0.3mm general (ISO 3685), 0.10-0.15mm for surface integrity (hard turning)

4. **Physics review enforcement:** The `/prism-review` skill dispatches a physics-review-agent
   on every engine edit. This is automatic via hooks — document that it fires.

### FIX 3: CROSS-ROADMAP COHERENCE PROTOCOL (was 44/100 — ownership clarity)

**Ownership Delineation — LATHE-PRO vs existing LATHE track:**

| Domain | Owner | Scope |
|--------|-------|-------|
| Lathe collision detection | LATHE track (MS0) | LatheCollisionZoneEngine already built |
| Controller dialect support | LATHE track (MS0.5, MS6) | 6 base dialects exist |
| Multi-machine capability | LATHE track (MS1) | Machine selection |
| Workholding foundation | LATHE track (MS3) | ChuckJawForce, Tailstock, SteadyRest exist |
| Physics & science hardening | LATHE track (MS7) | LatheScienceHardening 9 actions exist |
| **Orchestration pipeline** | **LATHE-PRO** | 35-stage LatheOrchestrationEngine (NEW) |
| **Input pipeline** | **LATHE-PRO** | Photo/CAD → features (wires existing OCR) |
| **UI/UX** | **LATHE-PRO** | 4 React pages (NEW) |
| **Insert wear intelligence** | **LATHE-PRO** | Extended Taylor + parallel failure modes |
| **Thermal/GD&T compensation** | **LATHE-PRO** | Wires existing thermal engines |
| **Op1/Op2 multi-op** | **LATHE-PRO** | New capability not in LATHE track |
| **Threading deep** | **LATHE-PRO** | Extends existing ThreadingPipeline |
| **Swiss multi-channel emission** | **LATHE-PRO** | Connects existing MillTurnSwiss methods |
| **Chip control optimization** | **LATHE-PRO** | Wires existing ChipBreaking |
| **Quality/compliance** | **LATHE-PRO** | Wires existing FAI, Metrology, Traceability |
| **Cost optimization** | **LATHE-PRO** | Wires existing OEE, ActualCost, JobCosting |
| **Simulation/verification** | **LATHE-PRO** | Wires existing CNCSimulationPipeline |
| **Shop floor integration** | **LATHE-PRO** | Wires existing DNCTransfer, JobTraveler |

**Rule: LATHE-PRO NEVER rebuilds what LATHE track already built.**
LATHE-PRO WIRES existing LATHE engines into a unified orchestrator pipeline.
LATHE-PRO EXTENDS existing engines with new capabilities (e.g., ThreadingPipeline + variable pitch).
LATHE-PRO CREATES new engines only where nothing exists (e.g., TurningRevProfileEngine).

**No duplicate engine creation.** Before any unit creates an engine, check:
1. ENGINE_DIGEST.md (1,304+ engines)
2. DISPATCHER_DIGEST.md (79 dispatchers)
3. `grep -r "class.*Engine" src/engines/` for actual files

**Status consistency:** All 17 LATHE-PRO milestones are `not_started`.
No LATHE-PRO milestone claims work done by the LATHE track.

---

## WHAT CHANGED v2.0 -> v3.0

| Change | v2.0 | v3.0 | Reason |
|--------|------|------|--------|
| MS-1 Input Pipeline | 8 units | **12 units** | CAD/CAM agent 46 -> add RevProfile, FeatureTaxonomy, FitNotation, ISO2768 |
| MS3 Workholding | 10 units | **14 units** | Workholding agent 49 -> add TrilobeDeformation, SoftJawBoring, ExpandingMandrel, FaceDriver |
| MS4 Threading+Grooving | 8 units | **Split: MS4a (8u) + MS4b (8u) = 16** | Threading agent 44 -> deep threading + deep grooving as separate milestones |
| MS6 Swiss/Mill-Turn | 8 units | **Split: MS6a (8u) + MS6b (8u) = 16** | Swiss agent 34 -> multi-channel emission + production intelligence as separate milestones |
| All other milestones | unchanged | unchanged | All scored 65+ in v2.0 scrutiny |
| **Totals** | 15 MS, 126 units | **17 MS, 142 units** | +2 MS, +16 units |

---

## ARCHITECTURE OVERVIEW

```
PHASE A: INPUT & ACCESSIBILITY          ┌─ MS-1: Input Pipeline (Photo/CAD -> Features) [12 units]
(UX=22->80, CAD/CAM=46->72)            └─ MS-2: Zero-Experience UI & Guided Workflow [8 units]

PHASE B: SAFETY-CRITICAL FOUNDATION    -- MS0: Enhanced Orchestrator (40 safety stages) [14 units]
(Safety=38->85)

PHASE C: CORE INTELLIGENCE             ┌─ MS1: Insert Wear & Life Prediction [8 units]
(Physics=58->80, Controller=58->78,    ├─ MS2: Offset + Thermal + GD&T Compensation [10 units]
 Tooling=52->75)                       └─ MS3: Sequence + Multi-Op + Workholding [14 units] **EXPANDED**

PHASE D: DEEP DOMAIN                   ┌─ MS4a: Threading Deep [8 units] **NEW SPLIT**
(Threading=44->72, Hard=34->75,        ├─ MS4b: Grooving & Parting Deep [8 units] **NEW SPLIT**
 Swiss=34->70, Chip=18->75)           ├─ MS5: Hard Turning & Grinding Replacement [8 units]
                                       ├─ MS6a: Multi-Channel G-Code Emission [8 units] **NEW SPLIT**
                                       ├─ MS6b: Swiss Production Intelligence [8 units] **NEW SPLIT**
                                       └─ MS7: Chip Control & Coolant Strategy [6 units]

PHASE E: QUALITY & COMPLIANCE          ┌─ MS8: GD&T, Inspection & Metrology [8 units]
(Metrology=34->80, Aero=28->75,       └─ MS9: Quality Compliance (AS9100/FDA) [6 units]
 Medical=18->65)

PHASE F: PRODUCTION & ECONOMICS        ┌─ MS10: Cost Optimization & Batch Economics [8 units]
(Process=58->80, Cost=31->75,          └─ MS11: Shop Floor Integration [8 units]
 Shop=28->70)

PHASE G: VERIFICATION & TRUST          -- MS12: Simulation, Verification & Visualization [8 units]
(Simulation=22->80)
```

## DEPENDENCY GRAPH

```
MS-1 (Input, 12u) -----> MS-2 (UI, 8u) -----> MS12 (Simulation, 8u)
      |
      v
MS0 (Orchestrator+Safety, 14u) -----> ALL downstream milestones
      |---> MS1 (Wear, 8u) -------> MS2 (Offset+Thermal, 10u) -----> MS8 (Inspection, 8u)
      |                                                                      |
      |---> MS3 (Sequence+Workholding, 14u)                                  v
      |                                                               MS9 (Quality, 6u)
      |---> MS4a (Threading, 8u) ---> MS4b (Grooving, 8u) ---> MS5 (Hard Turning, 8u)
      |
      |---> MS6a (Multi-Channel, 8u) ---> MS6b (Swiss Production, 8u)
      |
      |---> MS7 (Chip Control, 6u)
      |
      |---> MS10 (Cost, 8u) ---> MS11 (Shop Floor, 8u)
```

---

## ENGINE INVENTORY

### Primary 35 Engines (identified by scrutiny -- DO NOT REBUILD)

| # | Engine | LOC | Wires Into |
|---|--------|-----|------------|
| 1 | BlueprintVisionOCREngine | 575 | MS-1: Photo -> features |
| 2 | AutoPrintToProgramBridgeEngine | 540 | MS-1: CAD file -> features |
| 3 | PrintToGeometryEngine | 522 | MS-1: 2D print -> 3D geometry |
| 4 | FeatureRecognitionEngine | 302 | MS-1: 3D model feature extraction |
| 5 | ProveOutModeEngine | 471 | MS0: Mandatory first-article prove-out |
| 6 | BarStockVibrationEngine | 361 | MS0: Bar whip safety gate |
| 7 | SpindleLoadMonitorEngine | 394 | MS0: Real-time overload detection |
| 8 | AdaptiveControlEngine | 847 | MS0: Adaptive feed control |
| 9 | ThermalGrowthCompensationEngine | 270 | MS2: Spindle thermal drift |
| 10 | InverseThermalCompensationEngine | 436 | MS2: Real-time thermal correction |
| 11 | ToolWearCompensationEngine | 492 | MS2: Wear-to-offset mapping |
| 12 | RunoutCompensationEngine | 238 | MS8: GD&T runout-driven machining |
| 13 | ToleranceStackUpEngine | 217 | MS8: Multi-feature tolerance analysis |
| 14 | WorkholdingIntelligenceEngine | 499 | MS3: Jaw/fixture selection |
| 15 | ClampingSimEngine | 276 | MS3: Clamping deformation |
| 16 | ThreadingPipelineEngine | 710 | MS4a: Full threading pipeline |
| 17 | SinglePointThreadEngine | ~300 | MS4a: Infeed method selection |
| 18 | ChipBreakingEngine | 402 | MS7: Chip form prediction + breaker selection |
| 19 | ChipConveyorEngine | 370 | MS7: Chip evacuation requirements |
| 20 | MillTurnSwissPipelineEngine | 2125 | MS6a/MS6b: Multi-channel, guide bush, sync codes |
| 21 | FirstArticleInspectionPipelineEngine | 651 | MS8: AS9102 FAI generation |
| 22 | MetrologyUncertaintyEngine | 1001 | MS8: Gage R&R and measurement uncertainty |
| 23 | CMMPathPlanningEngine | 1318 | MS8: CMM program generation |
| 24 | GaugingEngine | 238 | MS8: Gage selection per feature |
| 25 | ProcessCapabilityPredictionEngine | 285 | MS8: Pre-production Cpk |
| 26 | MaterialCertTraceabilityEngine | 744 | MS9: Material traceability |
| 27 | DigitalThreadEngine | 127 | MS9: Full traceability chain |
| 28 | OEECalculatorEngine | 155 | MS10: Production efficiency tracking |
| 29 | ActualCostEngine | 384 | MS10: Actual vs estimated cost loop |
| 30 | JobCostingEngine | 569 | MS10: Job-level cost tracking |
| 31 | QuoteEstimatorEngine | 1027 | MS10: Competitive quoting |
| 32 | RealTimeMachineIntelligenceEngine | 771 | MS11: Machine monitoring feedback |
| 33 | JobTravelerEngine | 637 | MS11: Shop routing sheets |
| 34 | CNCSimulationPipelineEngine | 409 | MS12: Material removal simulation |
| 35 | SimulationVisualizationBridgeEngine | 258 | MS12: Toolpath animation |

### Secondary 18 Engines (discovered during scrutiny -- wire as encountered)

| # | Engine | LOC | Wires Into |
|---|--------|-----|------------|
| 1 | TurningProfileEngine | 879 | MS-1: Turning contour generation |
| 2 | LatheCollisionZoneEngine | ~400 | MS0: 10 collision checks |
| 3 | MachineEnvelopeGuardEngine | ~350 | MS0: Axis limit enforcement |
| 4 | ThreadCalculationEngine | ~400 | MS4a: Thread math (pitch dia, minor dia, lead) |
| 5 | ThreadGageEngine | ~250 | MS4a: Go/no-go gage selection |
| 6 | PartOffForceEngine | ~300 | MS4b: Blade stress and deflection |
| 7 | LatheScienceHardeningEngine | ~350 | MS5: Hardening physics |
| 8 | SurfaceFinishPredictorEngine | ~500 | MS5: Ra/Rz prediction |
| 9 | ResidualStressEngine | ~400 | MS5: Compressive/tensile stress profile |
| 10 | KienzleForceModelEngine | ~600 | MS4b: Grooving force calculation |
| 11 | CuttingTemperatureEngine | ~450 | MS2: Part CTE expansion |
| 12 | StochasticToolLifeEngine | ~380 | MS1: Weibull tool life distribution |
| 13 | ToolDeflectionEngine | ~350 | MS5: Boring bar deflection |
| 14 | RegenerativeChatterEngine | ~500 | MS0: Chatter detection |
| 15 | SPCProcessCapabilityEngine | ~400 | MS8: SPC chart generation |
| 16 | ProveOutPromotionEngine | ~300 | MS11: Prove-out to production gate |
| 17 | BarFeederInterfaceEngine | ~250 | MS6b: Bar feeder control codes |
| 18 | GrindingProgramAssemblerEngine | ~1800 | MS5: Grinding comparison baseline |

---

## PHASE A: INPUT & ACCESSIBILITY

---

### MILESTONE MS-1: Input Pipeline -- Photo/CAD to Structured Features (EXPANDED)
**Priority:** CRITICAL (blocking) | **Units:** 12 (was 8 in v2) | **Sessions:** 4
**Depends on:** (none -- enables everything downstream)
**Addresses:** UX (22->80), CAD/CAM (46->72)
**v3.0 Changes:** +4 units (U-LPI09 TurningRevProfile, U-LPI10 FeatureTaxonomy, U-LPI11 FitNotation, U-LPI12 ISO2768)
**Engines to Wire:** BlueprintVisionOCREngine, AutoPrintToProgramBridgeEngine,
  PrintToGeometryEngine, FeatureRecognitionEngine, TurningProfileEngine

#### SESSION 1: Photo/PDF Print Reading Pipeline (U-LPI01..U-LPI03)
```
SMART CONFIG: Role=CVEngineer + ManufacturingSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: BlueprintVisionOCREngine (575L), PrintToGeometryEngine (522L),
           AutoPrintToProgramBridgeEngine (540L), FeatureRecognitionEngine (302L)
  TRIBAL: TribalKnowledgeEngine (turning category -- reading shop drawings)
  FORMULAS: ISO 128 dimension extraction, ASME Y14.5 GD&T frame parsing
  REFERENCE: ISO 128 (technical drawing conventions), ASME Y14.5-2018 (GD&T),
             ISO 2768-1/-2 (general tolerances), ISO 1302 (surface texture)
INTENT: A user takes a phone photo of an engineering drawing, and the system extracts
  all dimensions, tolerances, material, thread callouts, and surface finish requirements
  into a structured TurningFeature[] that the orchestrator can consume.
SKILLS: /blueprint-read, /material-lookup, /navigate
```

**U-LPI01**: Wire BlueprintVisionOCREngine -> TurningFeature[] converter
  - Input: image/PDF of engineering drawing
  - OCR extraction: dimensions, tolerances, GD&T frames, material callout, thread callouts
  - Output: structured TurningFeature[] compatible with LatheOrchestrationEngine input
  - Handle: title block parsing (material, heat treatment, surface finish defaults)
  - 4-LOOP:
    L1-BUILD: Create TurningPrintIntakeEngine.ts, wire BlueprintVisionOCREngine output -> TurningFeature[]
    L2-SCRUTINIZE: /prism-review -- verify OCR output schema matches orchestrator input contract
    L3-GAP_FILL: Run affected tests, verify import chain, check constants from canonical source
  - FILES_CREATED: src/engines/TurningPrintIntakeEngine.ts
  - FILES_MODIFIED: src/tools/dispatchers/turningDispatcher.ts
  - ABORT_CRITERIA: >3 TS errors | cannot parse >50% of standard ISO drawing | output schema mismatch with LatheOrchestrationEngine
  - ROLLBACK: git revert TurningPrintIntakeEngine.ts creation; restore dispatcher to pre-edit state

**U-LPI02**: Material callout parser with cross-reference
  - Parse strings: "AISI 4140 QT 28-32 HRC", "DIN 1.7225", "SS316L", "Ti-6Al-4V ELI"
  - Cross-reference: ASTM/SAE/DIN/JIS/UNS -> MaterialRegistry entry
  - Extract: heat treatment condition, hardness range, surface requirements
  - Fallback: flag ambiguous callouts for user confirmation
  - 4-LOOP:
    L1-BUILD: Implement material parser with regex + fuzzy match against MaterialRegistry
    L2-SCRUTINIZE: /prism-review -- verify all ISO material groups P/M/K/N/S/H resolve correctly
    L3-GAP_FILL: Test 10+ callout formats, verify registry lookup returns canonical Kienzle params
  - FILES_CREATED: src/engines/MaterialCalloutParserEngine.ts
  - FILES_MODIFIED: src/engines/TurningPrintIntakeEngine.ts
  - ABORT_CRITERIA: >3 TS errors | fails to resolve any ISO P-group material | MaterialRegistry miss rate >20%
  - ROLLBACK: revert MaterialCalloutParserEngine.ts; restore TurningPrintIntakeEngine imports

**U-LPI03**: Tolerance & GD&T extraction and interpretation
  - Parse: bilateral (+/-0.1), unilateral (+0.025/-0.000), fit notation (H7/g6)
  - Parse: GD&T frames (concentricity, runout, perpendicularity, position, cylindricity)
  - Apply: ISO 2768-m general tolerances to un-toleranced dimensions
  - Output: per-feature tolerance objects with strategy implications
  - 4-LOOP:
    L1-BUILD: Implement tolerance parser, GD&T frame recognizer, ISO 2768 default applicator
    L2-SCRUTINIZE: /prism-review -- verify tolerance objects carry correct strategy flags
    L3-GAP_FILL: Test all GD&T frame types, verify bilateral/unilateral/fit decomposition
  - FILES_CREATED: src/engines/ToleranceExtractionEngine.ts
  - FILES_MODIFIED: src/engines/TurningPrintIntakeEngine.ts
  - ABORT_CRITERIA: >3 TS errors | H7/g6 decomposition wrong | GD&T frame missed >30%
  - ROLLBACK: revert ToleranceExtractionEngine.ts; restore intake engine

**>> /compact checkpoint after U-LPI03**

#### SESSION 2: CAD File Import Pipeline (U-LPI04..U-LPI06)
```
SMART CONFIG: Role=CADEngineer + TurningSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: AutoPrintToProgramBridgeEngine (540L), PrintToGeometryEngine (522L),
           FeatureRecognitionEngine (302L), TurningProfileEngine (879L)
  TRIBAL: TribalKnowledgeEngine (CAD import tips, lathe feature recognition)
  FORMULAS: Axisymmetric decomposition (revolve axis detection, silhouette projection)
  REFERENCE: STEP AP203/AP214 geometry handling, IGES surface import,
             ISO 10303 (STEP file structure)
INTENT: A user drags a STEP file into PRISM, and the system automatically extracts a 2D
  turning profile with all features identified, ready for G71/G70 contour generation.
SKILLS: /cad-import-guide, /navigate, /material-lookup
```

**U-LPI04**: STEP/IGES -> axisymmetric turning profile extraction
  - Input: STEP/IGES 3D solid model
  - Detect: rotational axis (largest cylindrical surface)
  - Extract: 2D silhouette profile (XZ polyline for G71/G70 input)
  - Identify: OD steps, bores, grooves, threads, tapers, chamfers, undercuts
  - Output: TurningFeature[] with geometry coordinates
  - 4-LOOP:
    L1-BUILD: Create TurningCADImportEngine.ts, implement axis detection + silhouette extraction
    L2-SCRUTINIZE: /prism-review -- verify silhouette correctly handles concavities, internal bores
    L3-GAP_FILL: Test with 5 STEP files (shaft, bore, thread, groove, complex contour)
  - FILES_CREATED: src/engines/TurningCADImportEngine.ts
  - FILES_MODIFIED: src/tools/dispatchers/turningDispatcher.ts
  - ABORT_CRITERIA: >3 TS errors | axis detection fails on simple cylinder | silhouette misses bore features
  - ROLLBACK: revert TurningCADImportEngine.ts; restore dispatcher

**U-LPI05**: Automatic stock selection from part geometry
  - Input: max finished OD, part length, material
  - Compute: optimal bar stock diameter (nearest standard size + 2-3mm allowance)
  - Compute: required bar length (part + facing stock + cutoff + grip)
  - Consider: bar stock catalog (standard metric/imperial sizes)
  - Output: { bar_od_mm, bar_length_mm, material_weight_kg, remnant_pct }
  - 4-LOOP:
    L1-BUILD: Create StockSelectionEngine.ts with standard bar catalog
    L2-SCRUTINIZE: /prism-review -- verify nearest-size logic handles metric+imperial
    L3-GAP_FILL: Test edge cases (max-OD near stock boundary, tube stock, hex stock)
  - FILES_CREATED: src/engines/StockSelectionEngine.ts
  - FILES_MODIFIED: none
  - ABORT_CRITERIA: >3 TS errors | selects undersized stock | weight calculation off by >5%
  - ROLLBACK: revert StockSelectionEngine.ts

**U-LPI06**: Ambiguity resolution and user prompting
  - Detect: missing dimensions, unclear tolerances, no material callout, conflicting dims
  - Classify: can-proceed-with-defaults vs must-ask-user
  - Apply: ISO 2768-m defaults where safe
  - Output: confidence score per feature + list of questions for user
  - 4-LOOP:
    L1-BUILD: Implement ambiguity classifier with confidence scoring
    L2-SCRUTINIZE: /prism-review -- verify default application is conservative (never looser than ISO 2768-m)
    L3-GAP_FILL: Test with intentionally ambiguous drawings, verify questions are user-friendly
  - FILES_CREATED: src/engines/AmbiguityResolutionEngine.ts
  - FILES_MODIFIED: src/engines/TurningPrintIntakeEngine.ts
  - ABORT_CRITERIA: >3 TS errors | applies defaults that violate ISO 2768 | misses obvious ambiguity
  - ROLLBACK: revert AmbiguityResolutionEngine.ts; restore intake engine

**>> /compact checkpoint after U-LPI06**

#### SESSION 3: NEW -- Turning-Specific Feature Intelligence (U-LPI09..U-LPI12)
```
SMART CONFIG: Role=CADGeometrySpecialist + TurningProcessEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: FeatureRecognitionEngine (302L -- milling-oriented, needs turning adaptation),
           TurningProfileEngine (879L), PrintToGeometryEngine (522L),
           AutoPrintToProgramBridgeEngine (540L)
  TRIBAL: TribalKnowledgeEngine (turning feature families, tolerance interpretation)
  FORMULAS: Axisymmetric decomposition (3D -> 2D XZ silhouette), ISO 286 fit tables,
            ISO 2768 general tolerance tables (linear, angular, geometric)
  REFERENCE: ISO 286-1:2010 (limits and fits), ISO 2768-1:1989 (linear/angular tolerances),
             ISO 2768-2:1989 (geometrical tolerances), DIN 509 (undercuts),
             ISO 13715 (edges of undefined shape)
INTENT: The CAD/CAM agent identified that FeatureRecognitionEngine is milling-focused and
  cannot decompose axisymmetric solids into turning features. These 4 units close the critical
  gap: 3D STEP -> 2D XZ profile -> classified TurningFeature[] with tolerance bands applied.
  This is THE missing piece that makes STEP-to-program work for lathes.
SKILLS: /cad-import-guide, /navigate, /defaults
```

**U-LPI09**: TurningRevProfileEngine -- 3D STEP -> 2D XZ silhouette via axisymmetric decomposition
  - THE critical missing piece identified by the CAD/CAM agent (scored 46/100)
  - Input: STEP AP203/AP214 solid body (via cad-engine Python bridge or JS geometry)
  - Step 1: Detect principal axis of revolution (eigenvalue analysis of inertia tensor OR
    largest-area cylindrical face normal detection)
  - Step 2: Project all boundary edges onto the XZ half-plane (revolution silhouette)
  - Step 3: Handle non-axisymmetric features: cross-holes -> flag for live tooling,
    flats -> flag for C-axis milling, keyways -> flag for slotting
  - Step 4: Output ordered XZ polyline segments with arc/line classification
  - Output: { xz_profile: Segment[], non_axisymmetric_features: Feature3D[], axis_offset: Vector3 }
  - Validation: reconstructed revolve volume matches original within 0.01mm tolerance
  - 4-LOOP:
    L1-BUILD: Create TurningRevProfileEngine.ts with axis detection + half-plane projection
    L2-SCRUTINIZE: /prism-review -- verify edge cases (eccentric bores, taper angles, arc tangencies)
    L3-GAP_FILL: Test with 5 STEP solids of increasing complexity, verify volume match
  - FILES_CREATED: src/engines/TurningRevProfileEngine.ts
  - FILES_MODIFIED: src/engines/TurningCADImportEngine.ts (wire as upstream provider)
  - ABORT_CRITERIA: >3 TS errors | axis detection fails on shaft with bore | silhouette has gaps >0.01mm | non-axisymmetric features not flagged
  - ROLLBACK: revert TurningRevProfileEngine.ts; restore CADImport imports

**U-LPI10**: TurningFeatureTaxonomyEngine -- Map OCR-extracted dimensions to TurningFeature[] types
  - Input: raw dimension set from BlueprintVisionOCREngine + XZ profile from TurningRevProfileEngine
  - Classify each profile segment into feature types:
    OD_STRAIGHT, OD_TAPER, OD_ARC, OD_STEP, OD_SHOULDER,
    BORE_THROUGH, BORE_BLIND, BORE_STEP, BORE_TAPER,
    FACE, CHAMFER, RADIUS, GROOVE_OD, GROOVE_ID, GROOVE_FACE,
    THREAD_EXTERNAL, THREAD_INTERNAL, UNDERCUT_DIN509, KNURL
  - Map OCR dimensions to classified features (geometric proximity matching)
  - Assign tolerance from OCR or ISO 2768 default based on feature type
  - Output: TurningFeature[] with type, geometry, tolerance, surface_finish per feature
  - 4-LOOP:
    L1-BUILD: Create TurningFeatureTaxonomyEngine.ts with segment classifier + dimension mapper
    L2-SCRUTINIZE: /prism-review -- verify all 20 feature types classify correctly, no orphan dimensions
    L3-GAP_FILL: Test with 5 drawings of increasing complexity (shaft, bore, thread, groove, multi-feature)
  - FILES_CREATED: src/engines/TurningFeatureTaxonomyEngine.ts
  - FILES_MODIFIED: src/engines/TurningPrintIntakeEngine.ts (wire taxonomy as classification step)
  - ABORT_CRITERIA: >3 TS errors | misclassifies OD vs bore | orphan dimension rate >15% | thread callout miss
  - ROLLBACK: revert TurningFeatureTaxonomyEngine.ts; restore intake engine

**U-LPI11**: FitNotationParser -- H7/g6 -> actual tolerance bands by nominal diameter
  - Input: fit notation string (e.g., "H7/g6", "H7", "p6", "N9") + nominal diameter in mm
  - ISO 286-1:2010 full lookup tables:
    Fundamental deviations: a-zc (shaft), A-ZC (hole) for all 28 letter codes
    IT grades: IT01, IT0, IT1..IT18 for standard nominal diameter ranges
    Standard tolerance ranges: 0-3, 3-6, 6-10, 10-18, 18-30, 30-50, 50-80, 80-120,
      120-180, 180-250, 250-315, 315-400, 400-500mm
  - Output per component: { upper_deviation_um, lower_deviation_um, tolerance_band_um }
  - Fit analysis: clearance/transition/interference classification
  - Machining implication: map IT grade to required process (IT6 -> finish turning,
    IT7 -> careful turning, IT8 -> standard turning, IT11+ -> rough turning only)
  - 4-LOOP:
    L1-BUILD: Create FitNotationParserEngine.ts with full ISO 286 tables
    L2-SCRUTINIZE: /prism-review -- verify against published ISO 286 tables for 10+ diameter/fit combos
    L3-GAP_FILL: Test all fundamental deviation letters, verify IT grade -> process mapping
  - FILES_CREATED: src/engines/FitNotationParserEngine.ts
  - FILES_MODIFIED: src/engines/ToleranceExtractionEngine.ts (wire fit parser for H7/g6 callouts)
  - ABORT_CRITERIA: >3 TS errors | H7 at 25mm diameter deviates from ISO 286 table | IT grade mapping wrong
  - ROLLBACK: revert FitNotationParserEngine.ts; restore tolerance engine

**U-LPI12**: ISO2768GeneralToleranceApplicator -- apply general tolerances to un-toleranced dimensions
  - Input: set of dimensions with some toleranced, some not; ISO 2768 class (f/m/c/v)
  - ISO 2768-1 (linear and angular):
    Linear tolerances per class and nominal range:
      f: 0.5-3mm -> +/-0.05, 3-6 -> +/-0.05, 6-30 -> +/-0.1, 30-120 -> +/-0.15, etc.
      m: 0.5-3mm -> +/-0.1, 3-6 -> +/-0.1, 6-30 -> +/-0.2, 30-120 -> +/-0.3, etc.
      c: 0.5-3mm -> +/-0.2, 3-6 -> +/-0.3, 6-30 -> +/-0.5, 30-120 -> +/-0.8, etc.
    Angular tolerances per class and nominal length
    Broken edge (chamfer/radius) tolerances: 0.2-4mm range per class
  - ISO 2768-2 (geometrical):
    Straightness/flatness, circularity, parallelism, perpendicularity, symmetry, runout
    Per class (H/K/L) and nominal range
  - Rules: only apply to dimensions WITHOUT explicit tolerance; never override explicit
  - Output: complete tolerance set for every dimension, source annotated (explicit vs ISO 2768)
  - 4-LOOP:
    L1-BUILD: Create ISO2768ApplicatorEngine.ts with full Part 1 + Part 2 tables
    L2-SCRUTINIZE: /prism-review -- verify tables match ISO 2768:1989 published values exactly
    L3-GAP_FILL: Test with mixed toleranced/un-toleranced drawings, verify no override of explicit tol
  - FILES_CREATED: src/engines/ISO2768ApplicatorEngine.ts
  - FILES_MODIFIED: src/engines/ToleranceExtractionEngine.ts (wire as fallback for un-toleranced dims)
  - ABORT_CRITERIA: >3 TS errors | ISO 2768-m table values wrong | overrides explicit tolerance | class 'f' looser than class 'm'
  - ROLLBACK: revert ISO2768ApplicatorEngine.ts; restore tolerance engine

**>> /compact checkpoint after U-LPI12**

#### SESSION 4: Tests & Dispatcher Wiring (U-LPI07..U-LPI08)
```
SMART CONFIG: Role=TestEngineer + IntegrationSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
KNOWLEDGE:
  ENGINES: All MS-1 engines created in Sessions 1-3
  TRIBAL: TribalKnowledgeEngine (test case patterns for manufacturing)
  FORMULAS: None (test session)
  REFERENCE: Existing test patterns in src/__tests__/
INTENT: Comprehensive test coverage for the expanded 12-unit input pipeline, ensuring
  photo/CAD/tolerance paths all produce valid TurningFeature[] output.
SKILLS: /test, /forge-tests, /navigate
```

**U-LPI07**: 25+ test cases for input pipeline (expanded from 20)
  - Test: 5 photo-based print extractions (shaft, bore, threaded, grooved, complex)
  - Test: 5 STEP file imports (same part families)
  - Test: material callout parsing (10+ formats across ASTM/DIN/JIS)
  - Test: ambiguity detection and fallback behavior
  - Test: TurningRevProfileEngine with 3 STEP solids (simple cylinder, stepped shaft, bore+groove)
  - Test: TurningFeatureTaxonomyEngine with 5 feature type classification scenarios
  - Test: FitNotationParser with H7/g6 at 25mm, H8 at 50mm, p6 at 10mm (verify against ISO 286)
  - Test: ISO2768 applicator with class m at 15mm nominal (verify +/-0.2), class f at 80mm (+/-0.15)
  - 4-LOOP:
    L1-BUILD: Create test file with 25+ cases covering all 12 units
    L2-SCRUTINIZE: /prism-review -- verify test assertions use real ISO values, not placeholder
    L3-GAP_FILL: Run npx vitest, fix failures, ensure 0 skip
  - FILES_CREATED: src/__tests__/lathe-input-pipeline.test.ts
  - FILES_MODIFIED: none
  - ABORT_CRITERIA: >3 test failures after fixes | ISO 286 verification values wrong | test uses || true
  - ROLLBACK: revert test file

**U-LPI08**: Wire into turningDispatcher
  - Actions: `turning_import_print_photo`, `turning_import_cad_file`,
    `turning_parse_material`, `turning_auto_stock_select`,
    `turning_extract_rev_profile`, `turning_classify_features`,
    `turning_parse_fit_notation`, `turning_apply_general_tolerances`
  - Schemas: Zod validation per action
  - 4-LOOP:
    L1-BUILD: Add 8 actions to turningDispatcher with Zod schemas
    L2-SCRUTINIZE: /prism-review -- verify action names follow convention, schemas match engine I/O
    L3-GAP_FILL: Test each action via dispatcher call, verify end-to-end
  - FILES_CREATED: src/schemas/turningInputSchemas.ts
  - FILES_MODIFIED: src/tools/dispatchers/turningDispatcher.ts
  - ABORT_CRITERIA: >3 TS errors | action schema mismatch | dispatcher fails to route
  - ROLLBACK: revert schema file; restore dispatcher to pre-edit

**FORGE-TRIPLE:**
  HOOK: `input-completeness-gate` -- blocks orchestrator if required features missing
  ACTION: `prism_turning:turning_import_print_photo`, `prism_turning:turning_extract_rev_profile`
  SKILL: `/blueprint-read lathe` (extend existing blueprint-read with turning extraction)

**EXIT GATE:** check Photo of standard shaft drawing -> valid TurningFeature[] |
  check STEP file -> 2D turning profile via TurningRevProfileEngine |
  check 10+ material callout formats parsed |
  check H7/g6 at 25mm -> correct ISO 286 tolerance band |
  check ISO 2768-m applied to un-toleranced dims |
  check FeatureTaxonomy classifies all 20 feature types |
  check 25+ tests pass | omega_floor >= 0.85 | SVI delta: +3%

**FEATURE CASCADE:**
  NEW_HOOKS: input-completeness-gate
  NEW_ACTIONS: turning_import_print_photo, turning_import_cad_file, turning_parse_material,
    turning_auto_stock_select, turning_extract_rev_profile, turning_classify_features,
    turning_parse_fit_notation, turning_apply_general_tolerances
  NEW_SKILLS: /blueprint-read lathe (extended)
  AVAILABLE_TO: MS0 (orchestrator consumes TurningFeature[]), MS-2 (UI displays features)

---

### MILESTONE MS-2: Zero-Experience User Interface & Guided Workflow
**Priority:** CRITICAL | **Units:** 8 | **Sessions:** 3
**Depends on:** MS-1
**Addresses:** UX (22->80), Simulation (22->partial)
**Unchanged from v2.0** -- retained as-is (UX agent scored 78, above threshold)

#### SESSION 4: Upload & Guided Input (U-LPU01..U-LPU03)
```
SMART CONFIG: Role=UXEngineer + FrontendSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: web/src/ (React/Vite, 45 existing pages), existing CalculatorPage pattern
  TRIBAL: TribalKnowledgeEngine (UX patterns for manufacturing software)
  FORMULAS: None (UI session)
  REFERENCE: Existing WEDM result cards pattern (WireEdmOptimizeCards.tsx)
INTENT: A zero-experience user opens PRISM, drags a photo or STEP file, and gets guided
  through material confirmation, quality tier, and batch quantity without any CNC jargon.
SKILLS: /navigate, /forge-app-wire
```

**U-LPU01**: Upload page -- drag-drop photo/PDF/STEP/IGES/DXF
  - Single-page interface: upload zone + camera capture button
  - File type detection: route photo->OCR, CAD->import, PDF->OCR
  - Progress indicator: "Reading your drawing..." with stage names
  - 4-LOOP:
    L1-BUILD: Create LatheUploadPage.tsx with drag-drop + file routing
    L2-SCRUTINIZE: /prism-review -- verify accessibility, file type handling
    L3-GAP_FILL: Test with each file type, verify routing
  - FILES_CREATED: web/src/pages/LatheUploadPage.tsx
  - FILES_MODIFIED: web/src/App.tsx (add route)
  - ABORT_CRITERIA: >3 TS errors | file routing fails for STEP | no progress indicator
  - ROLLBACK: revert LatheUploadPage.tsx; restore App.tsx route table

**U-LPU02**: Guided input wizard for user decisions
  - Material confirmation: show extracted material + photo reference. "Is this correct?"
  - Quality tier: "Prototype (fast)" / "Production (reliable)" / "Aerospace (certified)"
  - Batch quantity: simple number input with cost preview
  - Machine selection: auto-recommend from shop's machine list, user confirms
  - 4-LOOP:
    L1-BUILD: Create LatheInputWizard.tsx with step-by-step flow
    L2-SCRUTINIZE: /prism-review -- verify zero jargon, clear user guidance
    L3-GAP_FILL: Test all wizard paths, verify data passes to backend
  - FILES_CREATED: web/src/components/LatheInputWizard.tsx
  - FILES_MODIFIED: web/src/pages/LatheUploadPage.tsx
  - ABORT_CRITERIA: >3 TS errors | uses CNC jargon | wizard cannot complete without crash
  - ROLLBACK: revert LatheInputWizard.tsx; restore upload page

**U-LPU03**: Ambiguity resolution UI
  - Highlight unclear areas on the drawing image
  - Show specific questions: "I found 25.0 here -- is this diameter or radius?"
  - Confidence indicators per extracted dimension (green/yellow/red)
  - 4-LOOP:
    L1-BUILD: Create AmbiguityResolver component, integrate with drawing overlay
    L2-SCRUTINIZE: /prism-review -- verify questions are non-technical, confidence colors clear
    L3-GAP_FILL: Test with ambiguous drawing, verify user can resolve all questions
  - FILES_CREATED: web/src/components/AmbiguityResolver.tsx
  - FILES_MODIFIED: web/src/components/LatheInputWizard.tsx
  - ABORT_CRITERIA: >3 TS errors | no visual overlay | questions use technical jargon
  - ROLLBACK: revert AmbiguityResolver.tsx; restore wizard

**>> /compact checkpoint after U-LPU03**

#### SESSION 5: Results & Visualization (U-LPU04..U-LPU06)
```
SMART CONFIG: Role=UXEngineer + DataVizSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: SimulationVisualizationBridgeEngine (258L), existing chart components
  TRIBAL: TribalKnowledgeEngine (shop floor display requirements)
  FORMULAS: None (visualization session)
  REFERENCE: Existing WEDM result card patterns
INTENT: After the pipeline runs, the user sees a plain-English results page with cycle time,
  cost, safety score, and an animated 2D backplot of the toolpath.
SKILLS: /navigate, /cnc-simulate
```

**U-LPU04**: Results page -- program + setup sheet + physics report
  - Plain-English summary: "4 min 12 sec, 3 tools, $2.40/part"
  - Traffic-light safety indicators (12 checks, all green = safe to run)
  - Confidence score with explanation
  - Download buttons: G-code, setup sheet PDF, physics report PDF
  - 4-LOOP:
    L1-BUILD: Create LatheResultsPage.tsx with summary + downloads
    L2-SCRUTINIZE: /prism-review -- verify plain English, no technical abbreviations exposed
    L3-GAP_FILL: Test with mock pipeline output, verify all download buttons work
  - FILES_CREATED: web/src/pages/LatheResultsPage.tsx
  - FILES_MODIFIED: web/src/App.tsx
  - ABORT_CRITERIA: >3 TS errors | uses G-code terminology in user-facing text | missing download button
  - ROLLBACK: revert LatheResultsPage.tsx; restore App.tsx

**U-LPU05**: 2D XZ backplot visualization with operation color-coding
  - Render toolpath as 2D XZ profile view (not 3D -- lathe is axisymmetric)
  - Color by operation: roughing=blue, finish=green, groove=orange, thread=purple, rapid=red
  - Animate: playback at 1x/2x/5x/10x speed with scrubber
  - Highlight: rapids distinctly (red dashed -- where crashes happen)
  - 4-LOOP:
    L1-BUILD: Create LatheBackplot.tsx with Canvas/SVG rendering + animation
    L2-SCRUTINIZE: /prism-review -- verify color coding matches industry convention, rapids visible
    L3-GAP_FILL: Test with 5 part programs, verify animation smooth at all speeds
  - FILES_CREATED: web/src/components/LatheBackplot.tsx
  - FILES_MODIFIED: web/src/pages/LatheResultsPage.tsx
  - ABORT_CRITERIA: >3 TS errors | rapids not visually distinct | animation stutters at 1x
  - ROLLBACK: revert LatheBackplot.tsx; restore results page

**U-LPU06**: Photo-annotated setup instructions
  - Step-by-step with numbered photos: "Insert bar, tighten chuck, load tool #1..."
  - Tool loading guide: which tool in which station with photo
  - Pre-run checklist: checkboxes with "correct" photos
  - First-article measurement guide: "Measure here with this tool, expect this reading"
  - 4-LOOP:
    L1-BUILD: Create SetupInstructionPanel component
    L2-SCRUTINIZE: /prism-review -- verify instructions assume zero experience
    L3-GAP_FILL: Test with 3 setups (bar, chuck, sub-spindle), verify completeness
  - FILES_CREATED: web/src/components/SetupInstructionPanel.tsx
  - FILES_MODIFIED: web/src/pages/LatheResultsPage.tsx
  - ABORT_CRITERIA: >3 TS errors | missing tool loading instructions | assumes operator experience
  - ROLLBACK: revert SetupInstructionPanel.tsx; restore results page

#### SESSION 6: Integration Tests & Wiring (U-LPU07..U-LPU08)
```
SMART CONFIG: Role=IntegrationEngineer + QASpecialist | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=25%
KNOWLEDGE:
  ENGINES: All MS-2 components created in Sessions 4-5
  REFERENCE: Existing REST API patterns in src/routes/
INTENT: End-to-end verification that photo upload through program download works.
SKILLS: /test, /forge-tests
```

**U-LPU07**: End-to-end UI test: photo -> wizard -> program -> download
  - 5 complete workflows (shaft, bore, thread, groove, complex)
  - 4-LOOP:
    L1-BUILD: Create integration test with 5 workflow scenarios
    L2-SCRUTINIZE: /prism-review -- verify tests cover error paths
    L3-GAP_FILL: Run all tests, fix failures
  - FILES_CREATED: src/__tests__/lathe-ui-integration.test.ts
  - FILES_MODIFIED: none
  - ABORT_CRITERIA: >2 workflow failures | test skips error paths
  - ROLLBACK: revert test file

**U-LPU08**: Wire React pages to turningDispatcher actions via REST API
  - Route handlers in src/routes/turning.ts
  - WebSocket for progress updates during 35-stage pipeline execution
  - 4-LOOP:
    L1-BUILD: Add REST endpoints + WebSocket progress channel
    L2-SCRUTINIZE: /prism-review -- verify API security, input validation
    L3-GAP_FILL: Test with curl + browser, verify progress updates
  - FILES_CREATED: src/routes/latheTurning.ts
  - FILES_MODIFIED: src/routes/index.ts
  - ABORT_CRITERIA: >3 TS errors | no WebSocket progress | REST returns 500
  - ROLLBACK: revert route files

**FORGE-TRIPLE:**
  HOOK: `ui-safety-certificate` -- displays safety validation before download
  ACTION: `prism_turning:lathe_ui_submit`
  SKILL: `/lathe-studio` -- open web interface for lathe programming

**EXIT GATE:** check Photo upload -> program download in under 2 minutes |
  check Zero jargon in user-facing text | check Backplot animation renders all operations |
  check 5 end-to-end workflows pass | omega_floor >= 0.85 | SVI delta: +2%

**FEATURE CASCADE:**
  NEW_HOOKS: ui-safety-certificate
  NEW_ACTIONS: lathe_ui_submit
  NEW_SKILLS: /lathe-studio
  AVAILABLE_TO: MS12 (simulation visualization reuses backplot), all users (entry point)

---

## PHASE B: SAFETY-CRITICAL FOUNDATION

---

### MILESTONE MS0: Enhanced Orchestrator Engine with Safety Stages
**Priority:** CRITICAL | **Units:** 14 | **Sessions:** 5
**Depends on:** MS-1
**Addresses:** Safety (38->85), CNC Programmer (68->85), Controller (58->78)
**Unchanged from v2.0** -- retained as-is (Safety agent scored 82, above threshold)
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
  FORMULAS: Kienzle (Fc = kc1.1 * b * h^(1-mc)), Taylor (V*T^n = C), Ra = f^2/(32r), P = Fc*Vc/60000
  REFERENCE: OSHA 1910.217, ISO 10218 clamping safety factor 2.5x
INTENT: Build the central orchestration engine that sequences all 35 stages, with safety
  gates that physically prevent dangerous programs from being generated.
SKILLS: /navigate, /safety-validation-guide, /defaults
```

**U-LPO01**: `LatheOrchestrationEngine` -- 35-stage pipeline
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
  - 4-LOOP:
    L1-BUILD: Create LatheOrchestrationEngine.ts with 35-stage enum + pipeline runner
    L2-SCRUTINIZE: /prism-review -- verify stage ordering, safety gates cannot be bypassed
    L3-GAP_FILL: Test stage enum completeness, verify each stage has input/output contract
  - FILES_CREATED: src/engines/LatheOrchestrationEngine.ts
  - FILES_MODIFIED: src/tools/dispatchers/turningDispatcher.ts
  - ABORT_CRITERIA: >3 TS errors | safety stages bypassable | stage ordering violates dependencies
  - ROLLBACK: revert LatheOrchestrationEngine.ts; restore dispatcher

**U-LPO02**: Stage 12 -- BAR_STOCK_SAFETY (wire BarStockVibrationEngine)
  - Detect bar stock vs chucked work from input
  - If bar: compute critical whip speed, hard-block RPM above critical
  - If no bar feeder specified for bar work: REFUSE to generate
  - Check bar extension behind spindle
  - 4-LOOP:
    L1-BUILD: Implement Stage 12 in orchestrator, wire BarStockVibrationEngine
    L2-SCRUTINIZE: /prism-review -- verify whip speed formula uses correct physics
    L3-GAP_FILL: Test with bar vs chuck scenarios, verify RPM blocking
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | bar whip formula incorrect | RPM not hard-blocked
  - ROLLBACK: revert Stage 12 additions to orchestrator

**U-LPO03**: Stage 13 -- CLAMPING_PER_OP
  - For each operation: compute force direction vector (tangential, radial, axial)
  - OD turning: force pushes INTO chuck (relatively safe)
  - Boring: force pulls OUT of chuck (axial pull-out hazard)
  - Part-off: verify catcher/sub-spindle; block unsupported cutoff >800 RPM
  - Face grooving: check axial clamping adequacy
  - 4-LOOP:
    L1-BUILD: Implement Stage 13 with per-op force direction analysis
    L2-SCRUTINIZE: /prism-review -- verify boring pull-out hazard is always flagged
    L3-GAP_FILL: Test each operation type, verify force direction correct
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | boring pull-out not flagged | cutoff allowed without catcher
  - ROLLBACK: revert Stage 13 additions

**>> /compact checkpoint after U-LPO03**

#### SESSION 8: Machine Readiness + Emergency Recovery (U-LPO04..U-LPO06)
```
SMART CONFIG: Role=SafetyEngineer + ControllerSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: SpindleLoadMonitorEngine (394L), ProveOutModeEngine (471L)
  TRIBAL: TribalKnowledgeEngine (emergency procedures, prove-out protocols)
  FORMULAS: None (safety procedure session)
  REFERENCE: Fanuc M-code reference, Haas Settings guide, Okuma OSP manual
INTENT: Generate safety-critical preamble blocks, emergency recovery sequences, and
  mandatory prove-out for first articles that prevent machine crashes.
SKILLS: /safety-validation-guide, /gcode, /ppg-quick-start
```

**U-LPO04**: Stage 14 -- MACHINE_READINESS_PREFLIGHT
  - Generate M00 mandatory stop preamble: door interlock, chuck key, guard, coolant
  - Controller-specific: Fanuc M-code checks, Haas Setting 51 verification
  - In G-code output, not just setup sheet
  - 4-LOOP:
    L1-BUILD: Implement Stage 14 with controller-specific preamble generator
    L2-SCRUTINIZE: /prism-review -- verify preamble covers all safety items
    L3-GAP_FILL: Test for all 8 controller dialects
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | missing door interlock check | preamble wrong for Haas
  - ROLLBACK: revert Stage 14 additions

**U-LPO05**: Stage 21 -- EMERGENCY_RECOVERY_BLOCKS
  - Threading: power loss recovery sequence (G10 offset reset + sync recovery)
  - Broken tool: generate probing cycle after roughing passes
  - Wire SpindleLoadMonitorEngine for overload thresholds
  - Coolant failure macro for deep bore operations
  - Safe retract paths (G28 per controller dialect -- Haas U0W0, Okuma G30, etc.)
  - 4-LOOP:
    L1-BUILD: Implement Stage 21 with emergency recovery per scenario
    L2-SCRUTINIZE: /prism-review -- verify retract paths are dialect-correct
    L3-GAP_FILL: Test recovery sequences for all 8 controllers
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | G28 wrong for any controller | overload threshold missing
  - ROLLBACK: revert Stage 21 additions

**U-LPO06**: Stage 27 -- MANDATORY PROVE_OUT (wire ProveOutModeEngine)
  - First-ever program: ALWAYS output prove-out version, no override
  - Prove-out: feed reduction, RPM cap, M01 at tool changes, single-block recommendation
  - Log: prove-out status per part number/setup combination
  - 4-LOOP:
    L1-BUILD: Wire ProveOutModeEngine into Stage 27
    L2-SCRUTINIZE: /prism-review -- verify prove-out cannot be bypassed for new programs
    L3-GAP_FILL: Test prove-out output for feed reduction and RPM cap values
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | prove-out bypassable | feed reduction factor wrong
  - ROLLBACK: revert Stage 27 additions

**>> /compact checkpoint after U-LPO06**

#### SESSION 9: G-Code Generation with Full Cycle Support (U-LPO07..U-LPO09)
```
SMART CONFIG: Role=CNCProgrammer + ControllerSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: TurningProgramAssemblerEngine (2615L), PostProcessorPipelineEngine (38 stages)
  TRIBAL: TribalKnowledgeEngine (G-code generation, controller quirks)
  FORMULAS: G71/G70 cycle parameters, G73 pattern repeat, G32/G33 threading
  REFERENCE: Fanuc Programming Manual, Haas NGC Reference, Okuma OSP-P300 Manual,
             Mazak SmoothG/MAZATROL Manual, Siemens 840D Programming Guide
INTENT: Generate production-quality G-code with every canned cycle variant, TNRC handling,
  and 8 controller dialects producing valid, runnable programs.
SKILLS: /gcode, /ppg-quick-start, /controller-enrich
```

**U-LPO07**: Stages 15-16 -- Toolpath + G-code with G73 + G32 + WCS
  - ADD G73 pattern repeat for forgings/castings (near-net-shape stock)
  - ADD G32/G33 single-pass threading (worm threads, multi-start)
  - ADD G92 simple threading cycle option
  - Work Coordinate System establishment: G54/G55 management, Z-zero strategy
  - G10 L10/L11/L12/L20 for programmatic offset setting
  - 4-LOOP:
    L1-BUILD: Implement G73, G32, G92, WCS management in code generator
    L2-SCRUTINIZE: /prism-review -- verify cycle parameters match Fanuc manual
    L3-GAP_FILL: Test G73 for forging stock, G32 for worm thread, G92 for simple threading
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts, src/engines/TurningProgramAssemblerEngine.ts
  - ABORT_CRITERIA: >3 TS errors | G73 parameters wrong | G32 threading sync lost
  - ROLLBACK: revert both engine modifications

**U-LPO08**: Stage 17 -- TNRC direction resolver
  - Input: cut geometry + tool orientation (ISO 1832 quadrant 1-9) + direction of travel
  - Output: correct G41/G42 + imaginary tool tip point
  - Validate: per-controller TNRC behavior differences
  - 4-LOOP:
    L1-BUILD: Implement TNRC resolver with all 9 quadrant logic
    L2-SCRUTINIZE: /prism-review -- verify G41/G42 for quadrants 1,2,3,4,8 (most common)
    L3-GAP_FILL: Test all 9 quadrants, verify per-controller differences
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | G41/G42 swapped for any quadrant | TNRC wrong for Okuma
  - ROLLBACK: revert TNRC additions

**U-LPO09**: Stage 20 -- Controller dialect generation (8 dialects)
  - Fanuc 0i-TF, 30i-B (distinguish firmware versions)
  - Haas NGC (Setting 58 G50 coordination, WIPS probing)
  - Okuma OSP-P300 (G85/G87 named labels, CAS blocks)
  - Mazak SmoothG (EIA + MAZATROL UNIT output)
  - Siemens 840D (CYCLE95/CYCLE97)
  - DMG MORI CELOS
  - Citizen Cincom ($1/$2 channel format)
  - Star (M200/M201 sync)
  - 4-LOOP:
    L1-BUILD: Implement 8 dialect generators with controller-specific syntax
    L2-SCRUTINIZE: /prism-review -- verify each dialect against controller manual
    L3-GAP_FILL: Test each dialect with a simple shaft program
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | any dialect produces syntax error | missing controller
  - ROLLBACK: revert dialect additions

**>> /compact checkpoint after U-LPO09**

#### SESSION 10: CSS + Turret + Adaptive (U-LPO10..U-LPO12)
```
SMART CONFIG: Role=CNCProgrammer + PhysicsEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: AdaptiveControlEngine (847L), SpeedFeedOrchestratorEngine (2851L)
  TRIBAL: TribalKnowledgeEngine (CSS behavior, turret optimization)
  FORMULAS: G96 S = Vc*1000/(pi*D), G50 clamp, accel time = deltaRPM * J / P_motor
  REFERENCE: Haas Setting 58, VDI 3425 (turret tooling standard)
INTENT: CSS optimization that cross-checks against clamping force at every diameter,
  turret assignment that minimizes cycle time, and adaptive feed control.
SKILLS: /spindle-optimize, /cycle-time-crush, /defaults
```

**U-LPO10**: Stage 18 -- CSS optimizer
  - G96/G50 lifecycle per controller (persistence, reset behavior, Setting 58)
  - CSS-to-clamping-force cross-check: verify grip at every diameter along path
  - Spindle accel/decel time modeling for cycle time accuracy
  - 4-LOOP:
    L1-BUILD: Implement CSS optimizer with diameter-dependent clamping check
    L2-SCRUTINIZE: /prism-review -- verify G50 clamp is set correctly for each controller
    L3-GAP_FILL: Test with varying diameters (50mm to 5mm), verify clamping safe at each
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | clamping not checked at min diameter | G50 wrong for Haas
  - ROLLBACK: revert CSS additions

**U-LPO11**: Stage 19 -- Turret optimizer + adaptive feed
  - Station assignment: minimize index time (BMT vs VDI, CW vs CCW)
  - Duplicate tool strategy: rough+finish in separate stations
  - Wire AdaptiveControlEngine for force-based feed modulation
  - 4-LOOP:
    L1-BUILD: Implement turret optimizer with shortest-path algorithm
    L2-SCRUTINIZE: /prism-review -- verify BMT vs VDI differences handled
    L3-GAP_FILL: Test with 8-station and 12-station turrets
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | turret takes longer path | adaptive feed not wired
  - ROLLBACK: revert turret/adaptive additions

**U-LPO12**: Stages 22-23 -- Safety verify + collision check
  - Wire LatheCollisionZoneEngine (all 10 checks)
  - Wire MachineEnvelopeGuardEngine
  - Add: turret index swept volume during rotation
  - Add: rapid traverse collision (diagonal path vs sequential)
  - Add: safe retract strategy per tool (G28 dialect-aware)
  - 4-LOOP:
    L1-BUILD: Implement safety and collision stages
    L2-SCRUTINIZE: /prism-review -- verify all 10 collision zones checked
    L3-GAP_FILL: Test with collision-inducing scenarios, verify they are caught
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | any collision zone unchecked | rapid collision missed
  - ROLLBACK: revert safety/collision additions

#### SESSION 11: Tests (U-LPO13..U-LPO14)
```
SMART CONFIG: Role=TestEngineer + SafetyValidator | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
KNOWLEDGE:
  ENGINES: LatheOrchestrationEngine (all 35 stages)
  REFERENCE: Existing test patterns
INTENT: Comprehensive test coverage for all 35 orchestrator stages and 8 controller dialects.
SKILLS: /test, /forge-tests
```

**U-LPO13**: 30+ test cases covering all 35 stages
  - Test each safety stage independently
  - Test G73 for forging stock, G32 for worm thread
  - Test TNRC direction for 9 quadrants
  - Test 8 controller dialects
  - 4-LOOP:
    L1-BUILD: Create comprehensive test suite
    L2-SCRUTINIZE: /prism-review -- verify safety tests cannot be || true'd
    L3-GAP_FILL: Run all tests, 0 failures
  - FILES_CREATED: src/__tests__/lathe-orchestrator.test.ts
  - ABORT_CRITERIA: >3 failures after fixes | safety test skipped | dialect test missing
  - ROLLBACK: revert test file

**U-LPO14**: Integration: 5 part families end-to-end through all 35 stages
  - Simple shaft, stepped shaft, threaded shaft, bore part, complex contour
  - Verify: safety blocks present, prove-out mode for new parts, G-code valid per dialect
  - 4-LOOP:
    L1-BUILD: Create integration test with 5 complete workflows
    L2-SCRUTINIZE: /prism-review -- verify each part family exercises different stage paths
    L3-GAP_FILL: Run integration tests, verify G-code structure
  - FILES_CREATED: src/__tests__/lathe-orchestrator-integration.test.ts
  - ABORT_CRITERIA: >2 part family failures | safety blocks missing | G-code syntax error
  - ROLLBACK: revert test file

**FORGE-TRIPLE:**
  HOOK: `lathe-orchestration-safety-gate` -- blocks generation without ALL safety stages passing
  ACTION: `prism_turning:lathe_generate_complete_program`
  SKILL: `/lathe-program`

**EXIT GATE:** check 35 stages run end-to-end | check 5 safety stages produce valid output |
  check G73 works for forgings | check 8 controller dialects generate valid code |
  check 30+ tests pass | omega_floor >= 0.90 | SVI delta: +5%

**FEATURE CASCADE:**
  NEW_HOOKS: lathe-orchestration-safety-gate
  NEW_ACTIONS: lathe_generate_complete_program
  NEW_SKILLS: /lathe-program
  AVAILABLE_TO: All downstream milestones (MS1-MS12 consume orchestrator output)

---

### MILESTONE MS0.5: Lathe 10/10 — Physics Wiring, Deflection Compensation, Full Coverage
**Priority:** CRITICAL | **Units:** 21 | **Sessions:** 7
**Depends on:** MS0 (Sessions 1-11)
**Addresses:** Physics accuracy (3/10→10), Threading mastery (5/10→10), G-code completeness,
  Controller dialects (7/10→10), PRISM engine utilization (2/10→10), 73 part family coverage
**Origin:** Lathe audit 2026-04-08 — cross-referenced all RESOURCE PDFs against implementation.
  Found 17 critical gaps, 13 moderate gaps, 25+ unwired PRISM engines.

#### SESSION 12: Physics Core Wiring (U-LPHYS01..U-LPHYS05)
```
SMART CONFIG: Role=PhysicsEngineer + SystemArchitect | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: KienzleForceModelEngine, SpeedFeedOrchestratorEngine, SurfaceFinishPredictorEngine,
    ChatterStabilityLobeEngine, ToolCostPerPartEngine, CostEstimationEngine
  FORMULAS: Fc = kc1.1 × ap × f^(1-mc), VT^n = C, Ra = f²/(32r), SLD generation
  REFERENCE: Sandvik Coromant General Turning Catalogue, Machinery's Handbook Ch. 27-29
INTENT: Wire existing PRISM physics engines into LatheOrchestrationEngine stages 9-11.
  This is the single highest-impact change — jumps physics from 3/10 to 8/10.
  ALL engines already exist and work. This is WIRING, not creation.
SKILLS: /auto-speed-feed, /physics-verify
```

**U-LPHYS01**: Wire KienzleForceModelEngine to Stage 9 PHYSICS_CORE
  - Import KienzleForceModelEngine, call per operation
  - Replace estimateKc() stub with real kc1.1 from engine (material-specific)
  - Compute Fc, power, torque for EVERY operation
  - Feed results to Stage 13 clamping analysis (replace simplified force calc)
  - 4-LOOP: L1-BUILD, L2-SCRUTINIZE (verify force units N not kN), L3-GAP_FILL (test with all 6 ISO groups)
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | force units wrong | Fc < 0

**U-LPHYS02**: Wire SurfaceFinishPredictorEngine to Stage 9 PHYSICS_CORE
  - Ra = f²/(32r) per operation + tool nose radius from feature/tool data
  - Compare predicted Ra against print requirement (feature.surface_finish_Ra_um)
  - Auto-adjust finish feed if Ra exceeds target
  - 4-LOOP: L1-BUILD, L2-SCRUTINIZE (verify Ra formula), L3-GAP_FILL (test Ra 0.4-6.3 range)
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts

**U-LPHYS03**: Wire ChatterStabilityLobeEngine to Stage 9 PHYSICS_CORE
  - Generate stability lobe diagram (SLD) for each operation
  - Check if programmed (ap, N) falls in stable zone
  - If unstable: shift RPM to nearest stable lobe or reduce DOC
  - 4-LOOP: L1-BUILD, L2-SCRUTINIZE (verify SLD generation), L3-GAP_FILL (test with chatter-prone Ti)
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts

**U-LPHYS04**: Wire SpeedFeedOrchestratorEngine to Stage 10 PARAMETER_OPTIMIZE
  - Replace estimateVc()/estimateFeed()/estimateDoc() with SpeedFeedOrchestrator calls
  - Use Monte Carlo UQ for confidence bounds on RPM/feed
  - Support optimization_target: balanced / max_speed / max_tool_life / min_cost / surface_quality
  - 4-LOOP: L1-BUILD, L2-SCRUTINIZE (verify UQ ranges), L3-GAP_FILL (test 5 optimization targets)
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts

**U-LPHYS05**: Wire ToolCostPerPartEngine + CostEstimationEngine to Stage 11 COST_OPTIMIZE
  - Tool cost amortization per part (tool life from Taylor → cost per tool change → amortized per part)
  - Total cost = material + tool + machine_time + labor + overhead
  - 4-LOOP: L1-BUILD, L2-SCRUTINIZE (verify cost formula), L3-GAP_FILL (test with production quantities)
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts

#### SESSION 13: WorkpieceDeflectionCompensationEngine (U-LPDEFL01..U-LPDEFL03)
```
SMART CONFIG: Role=PhysicsEngineer + ApplicationEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: PartDeflectionEngine (existing), ToolDeflectionPredictionEngine (existing),
    KienzleForceModelEngine (for cutting force), BarStockVibrationEngine (for stiffness data)
  FORMULAS: δ(z) = Fz³/(3EI), I = π(D⁴-d⁴)/64 (round bar), I = bh³/12 (after hex milling)
  REFERENCE: Roark's Formulas for Stress and Strain, Sandvik thin-wall guide
  USER CONTEXT: User makes hex pins on live-tooling lathe. Currently manually compensates
    0.001-0.003" taper per flat to counteract workpiece deflection during side milling.
    Stock diameter and stickout from spindle face are the key variables.
INTENT: Build a NEW engine that computes workpiece deflection δ(z) along the part length
  for cantilevered bar stock under side milling loads. Output a compensating depth curve
  that automatically adjusts X-depth per Z-position per flat to eliminate taper error.
  This replaces manual tribal knowledge with physics.
SKILLS: /what-if, /calc
```

**U-LPDEFL01**: Build WorkpieceDeflectionCompensationEngine
  - Cantilever model: round solid bar (I = πD⁴/64), hollow bar (I = π(D⁴-d⁴)/64)
  - Compute δ(z) at N points along stickout length
  - Point load model: δ(z) = Fz³/(3EI) where F = side milling force from Kienzle
  - Distributed load model: δ(z) = F·z²·(3L-z)/(6EI) for UDL
  - Also model reduced I after hex flats are cut (hexagonal cross-section I)
  - Output: deflection_curve[], compensation_curve[], total_taper_thou, within_tolerance,
    recommended_stickout_mm, spring_passes_recommended, support_recommendation
  - 4-LOOP: L1-BUILD, L2-SCRUTINIZE (verify δ formula dimensional consistency),
    L3-GAP_FILL (test with user's real numbers: 0.001-0.003" range for typical hex pins)
  - FILES_CREATED: src/engines/WorkpieceDeflectionCompensationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | deflection units wrong | taper sign inverted

**U-LPDEFL02**: Wire to LatheOrchestrationEngine Stage 15 (TOOLPATH_GENERATE)
  - When live_flat_mill or live_hex operations detected on cantilevered stock:
    1. Compute side milling force from Kienzle (width of cut × DOC × feed × kc)
    2. Call WorkpieceDeflectionCompensationEngine with stock diameter, stickout, material E
    3. Apply compensation curve to X-depth programming per flat per Z position
    4. Add setup note: "Auto-deflection compensation: [total_taper] per flat"
  - Also wire for whistle notch operations (angled live milling)
  - 4-LOOP: L1-BUILD, L2-SCRUTINIZE, L3-GAP_FILL (test F11-F14 hex pin families)
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts

**U-LPDEFL03**: Tests + validation against user's empirical data
  - Test with typical hex pin scenarios:
    - 3/4" (19mm) stock, 2" stickout, D2 tool steel → expect ~0.001" taper
    - 1/2" (12.7mm) stock, 3" stickout, D2 → expect ~0.003" taper
    - 1" (25.4mm) stock, 1.5" stickout, D2 → expect <0.0005" (negligible)
    - Hollow tube stock → expect higher deflection
  - Validate δ against PartDeflectionEngine for cross-check
  - Test compensation curve generates correct G-code X offsets
  - 4-LOOP: L1-BUILD, L2-SCRUTINIZE, L3-GAP_FILL
  - FILES_CREATED: src/__tests__/workpiece-deflection-compensation.test.ts

#### SESSION 14: Threading Mastery (U-LPTHRD01..U-LPTHRD03)
```
SMART CONFIG: Role=CNCProgrammer + ThreadingSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: ThreadingPipelineEngine, ThreadTurningEngine
  REFERENCE: G76 Threading Cycle PDF (5 dialect formats), CNC Lathe Programming PDF,
    Okuma OSP-P200L Manual (G71/G72 compound thread), Siemens SINUMERIK (CYCLE97),
    Fanuc 0i-TF §12 (G76 double-line format), Kennametal thread depth tables
INTENT: Transform threading from 5/10 to 10/10. Generate correct G76 in ALL 5 dialect formats.
  Add spring passes, chamfering, infeed methods P1-P4, min cut validation.
```

**U-LPTHRD01**: Fanuc double-line G76 + 5-dialect format generation
  - Generate Fanuc double-line: G76 P(mm)(rr)(aa) Q(dmin) R(d) / G76 X Z R P Q F
  - Generate Haas single-line: G76 D K X Z I P F A
  - Generate Okuma compound: G71 X Z B60 D F1 J H U A (with M32/M33/M34 infeed direction)
  - Generate Siemens: CYCLE97(...)
  - Add fallback for unknown controllers: Fanuc single-line
  - Wire threading infeed methods P0-P3 (radial, modified flank, constant depth, alternating)
  - 4-LOOP: L1-BUILD, L2-SCRUTINIZE (verify parameter mapping per dialect table), L3-GAP_FILL

**U-LPTHRD02**: Spring passes, chamfering, min cut validation
  - Add spring pass count (1-2 default, configurable) to G76 P-word digits 1-2
  - For controllers without P-word spring pass support: append G92 passes after G76
  - Generate M23 (chamfer ON) + Setting 95/96 chamfer distance/angle
  - Validate: min_cut_depth <= finish_allowance (warn if not, prevent premature termination)
  - First-pass depth from Kienzle force model (deepest cut first, equalize chip area)
  - 4-LOOP: L1-BUILD, L2-SCRUTINIZE, L3-GAP_FILL (test with all thread types: metric, UNC, NPT, Acme)

**U-LPTHRD03**: Exotic thread types + tests
  - NPT/BSPT tapered threads: G76 with R/I taper word per controller
  - Acme/trapezoidal: A29/A30 infeed angle, deep thread depth handling
  - Variable lead (ball screw): G34/G35 (Okuma), G76 with E word
  - Multi-start verification: G32 with correct angular offset per start
  - Test all 8 thread types across all 8 controllers
  - 4-LOOP: L1-BUILD, L2-SCRUTINIZE, L3-GAP_FILL
  - FILES_CREATED: src/__tests__/lathe-threading-mastery.test.ts

#### SESSION 15: G-Code Completeness + TNRC Polish (U-LPGC01..U-LPGC03)
```
SMART CONFIG: Role=CNCProgrammer + PostProcessorEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE: CNC Lathe Programming PDF, CNC 501 PDF, Okuma Manual (TNRC chapter)
INTENT: Fix all G-code generation gaps found in audit: TNRC ramp-on/off, G72, G53 retract,
  corner R/I/K/A, dwell, retract angle, CSS rapid safety.
```

**U-LPGC01**: TNRC ramp-on/ramp-off + Okuma G40 K-word
  - Generate G01 approach move before G41/G42 activation (not G00)
  - Generate G01 departure move before G40 cancel
  - On Okuma: add K-word to G40 line for controlled exit direction
  - Okuma 6-digit T-word (T010101) for TNRC register

**U-LPGC02**: G72 face roughing + G53 safe retract + G04 dwell + corner R/I/K/A
  - Add G72 cycle for face-dominant parts (detect from feature geometry)
  - G53 safe tool change position (deterministic path, no intermediate point)
  - G04 dwell at groove bottoms for surface finish
  - Corner R (radius), I/K (chamfer), A (angle) on G01 in finish profiles (G70/G73 only, NOT G71)
  - G71 retract at Setting 73 angle (45° default)

**U-LPGC03**: CSS rapid safety + tests
  - Cancel CSS (G97) before large X rapids during G96 mode (Okuma critical safety)
  - Restore G96 after positioning
  - Test all G-code generation improvements
  - FILES_CREATED: src/__tests__/lathe-gcode-completeness.test.ts

#### SESSION 16: Controller Dialect Deep Dive (U-LPDIAL01..U-LPDIAL03)
```
SMART CONFIG: Role=PostProcessorEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE: Okuma OSP-P200L Manual (LAP, barriers, named vars), Mazak INTEGREX Manual,
  Siemens SINUMERIK Manual (CYCLE95/97), ControllerDialectEngine (1200L)
INTENT: Make every controller output native-quality, not Fanuc-translated.
```

**U-LPDIAL01**: Okuma native LAP cycles + safety barriers
  - Generate Okuma G85/G86/G87 LAP cycles (more efficient than G71/G70 translation)
  - Generate M25/M21 chuck/tailstock barriers
  - Okuma compound threading G71/G72 with M32/M33/M34 infeed + M73/M74/M75 depth patterns
  - Spindle speed variation M695/M696 for chatter suppression

**U-LPDIAL02**: Siemens native CYCLE95/97 + Mazak Series T/M
  - Generate CYCLE95 for roughing/finishing (not G71 translation)
  - Generate CYCLE97 for threading (not G76 translation)
  - Mazak Series T vs M G-code differentiation (G98/G99 vs G94/G95)

**U-LPDIAL03**: Wire ControllerDialectEngine + tests
  - Replace hand-rolled buildDialectConfig() with full ControllerDialectEngine
  - Test all 8 controllers produce valid native-syntax output
  - FILES_CREATED: src/__tests__/lathe-dialect-native.test.ts

#### SESSION 17: Full PRISM Engine Wiring (U-LPWIRE01..U-LPWIRE03)
```
SMART CONFIG: Role=SystemArchitect | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE: ENGINE_DIGEST.md, all engines listed in audit gap analysis
INTENT: Wire remaining 15+ applicable engines into their target stages.
```

**U-LPWIRE01**: Stages 2-7 (Material + Tool + GDT + Sequence)
  - Wire MaterialResolverForProgramsEngine to Stage 2
  - Wire SmartToolSelectorEngine to Stage 4
  - Wire ToleranceExtractionEngine to Stage 6
  - Wire operation sequencing logic to Stage 7

**U-LPWIRE02**: Stages 24-29 (Verification + Quality + Inspection)
  - Wire CNCSimulationPipelineEngine to Stage 24/25
  - Activate ProveOutModeEngine in Stage 27 (already imported)
  - Wire FAIEngine + SPCChartingEngine to Stage 28
  - Wire TribalKnowledgeEngine for contextual rules injection

**U-LPWIRE03**: Tests + integration verification
  - Verify all wired engines return valid data
  - Verify confidence score reflects engine quality
  - FILES_CREATED: src/__tests__/lathe-engine-wiring.test.ts

#### SESSION 18: 73 Part Family Test Fixtures + Reference Program Ingestion (U-LPTEST01..U-LPTEST03)
```
SMART CONFIG: Role=TestEngineer + ApplicationEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE: 73 part family taxonomy (from lathe audit 2026-04-08), Box cloud reference programs
INTENT: Encode ALL 73 part families as test fixtures. Ingest reference programs from Box
  as optimization baselines. Run every family through all 35 stages × 8 controllers.
  This is the "handles anything a customer uploads" validation.
PRE-REQUISITE: Transfer existing CNC programs from Box cloud to H:\prism\reference-programs\
  These amateur programs are the baseline — PRISM must produce measurably better output.
  User note: "they're far from optimized, the programs were made by complete amateurs"
```

**U-LPTEST01**: Encode 73 part family test fixtures
  - Create test fixture factory for each family (F1-F18, A1-A7, D1-D4, M1-M8, V1-V9,
    H1-H10, O1-O6, E1-E2, G1-G10, X1-X5)
  - Each fixture specifies: features[], material, workpiece_type, controller, special flags
  - Grouped by tier: core geometry, threading, workholding, mill-turn, grooving,
    material extremes, done-in-one, edge cases
  - FILES_CREATED: src/__tests__/fixtures/lathe-73-families.ts

**U-LPTEST02**: Ingest reference programs from Box + comparison framework
  - Build program comparison framework: parse reference program → extract cycle time,
    tool changes, RPM/feed values, safety blocks
  - Compare PRISM output vs reference for same part → score improvements
  - Identify: faster cycle time? safer? better S/F? more complete?
  - FILES_CREATED: src/__tests__/helpers/program-comparator.ts

**U-LPTEST03**: Run 73 families × 8 controllers integration test
  - Run every family through full pipeline for every controller
  - Verify: no crashes, safety gates fire, valid G-code per dialect, collision checks run
  - Score: confidence score distribution, coverage gaps, dialect-specific failures
  - Target: 73 × 8 = 584 test scenarios, 0 crashes, all safety gates fire
  - FILES_CREATED: src/__tests__/lathe-73-family-matrix.test.ts

**EXIT GATE:** All 73 families generate valid programs | All 8 controllers produce native syntax |
  WorkpieceDeflectionCompensationEngine produces 0.001-0.003" taper for hex pins |
  Physics engines wired to stages 9-11 | Threading generates correct 5-dialect G76 |
  TNRC ramp-on/off correct | 584 matrix scenarios pass | omega_floor >= 0.95

**FEATURE CASCADE:**
  NEW_ENGINES: WorkpieceDeflectionCompensationEngine
  NEW_TESTS: lathe-73-family-matrix, lathe-threading-mastery, lathe-gcode-completeness,
    lathe-dialect-native, lathe-engine-wiring, workpiece-deflection-compensation
  NEW_HOOKS: deflection-compensation-gate (blocks hex pin programs without compensation)
  NEW_ACTIONS: lathe_workpiece_deflection_compensate, lathe_reference_program_compare
  NEW_SKILLS: /deflection-compensate, /reference-compare
  AVAILABLE_TO: All downstream milestones

---

## PHASE C: CORE INTELLIGENCE

---

### MILESTONE MS1: Insert Wear Intelligence & Life Prediction
**Priority:** CRITICAL | **Units:** 8 | **Sessions:** 3
**Depends on:** MS0
**Addresses:** Tooling (52->75)
**Unchanged from v2.0** -- retained as-is (Tooling agent scored 84, above threshold)
**Retained from v1 MS1 with enhancements:**
  - ADD: Combined insert selection matrix (material+geometry+machine+workpiece rigidity)
  - ADD: Chipbreaker operating window validation (per manufacturer catalog data)
  - ADD: Parallel failure mode evaluation (min(T_flank, T_crater, T_notch, T_BUE))
  - ADD: CSS-integrated wear (variable Vc wear accumulation across diameter profile)
  - ADD: Wiper insert productivity model (4x feed at same Ra)

Units U-LPR11 through U-LPR18 as defined in v1 with these enhancements added to each.
Each unit follows the standard 4-LOOP, FILES_CREATED/MODIFIED, ABORT_CRITERIA, ROLLBACK pattern.

**FORGE-TRIPLE:**
  HOOK: `insert-life-gate` -- warns when predicted wear exceeds VB limits mid-program
  ACTION: `prism_turning:turning_predict_insert_life`
  SKILL: `/tool-life-max`

**EXIT GATE:** check Insert selection matrix produces correct recommendation for 5 materials |
  check Parallel failure mode min() works | check CSS wear accumulates correctly |
  check Wiper insert feed boost validated | check 15+ tests pass |
  omega_floor >= 0.85 | SVI delta: +3%

**FEATURE CASCADE:**
  NEW_HOOKS: insert-life-gate
  NEW_ACTIONS: turning_predict_insert_life
  NEW_SKILLS: /tool-life-max (extended for turning)
  AVAILABLE_TO: MS2 (wear-to-offset), MS4a/MS4b (threading/grooving tool selection), MS5 (CBN selection)

---

### MILESTONE MS2: Offset + Thermal + GD&T Compensation
**Priority:** CRITICAL | **Units:** 10 | **Sessions:** 4
**Depends on:** MS1
**Addresses:** Metrology (34->80), CNC Programmer (68->85)
**Unchanged from v2.0** -- retained as-is (Metrology agent scored 65, threshold borderline but improvements come from MS8)
**Engines to Wire:** ThermalGrowthCompensationEngine, InverseThermalCompensationEngine,
  ToolWearCompensationEngine, RunoutCompensationEngine, ToleranceStackUpEngine

#### Units U-LPT01 through U-LPT10 as defined in v2.0 with full 4-LOOP per unit.
Each unit includes FILES_CREATED/MODIFIED, ABORT_CRITERIA (>=3), ROLLBACK procedure.

**>> /compact checkpoint after U-LPT05**

**FORGE-TRIPLE:**
  HOOK: `thermal-offset-gate` -- blocks programs missing thermal compensation for tight tolerances
  ACTION: `prism_turning:turning_offset_compensation`
  SKILL: `/lathe-offset`

**EXIT GATE:** check Thermal superposition model delta_total correct |
  check Probing cycles valid for 4 controllers | check Macro auto-offset safe (0.05mm max) |
  check GD&T-to-process mapping covers concentricity/runout/position |
  check 15+ tests pass | omega_floor >= 0.85 | SVI delta: +4%

**FEATURE CASCADE:**
  NEW_HOOKS: thermal-offset-gate
  NEW_ACTIONS: turning_offset_compensation
  NEW_SKILLS: /lathe-offset
  AVAILABLE_TO: MS8 (inspection uses offset data), MS10 (cost uses scrap prediction)

---

### MILESTONE MS3: Operation Sequence + Multi-Op + Workholding (EXPANDED)
**Priority:** HIGH | **Units:** 14 (was 10 in v2) | **Sessions:** 5
**Depends on:** MS0
**Addresses:** CNC Programmer (68->85), Workholding (49->72)
**v3.0 Changes:** +4 units (U-LPS11 TrilobeDeformation, U-LPS12 SoftJawBoring,
  U-LPS13 ExpandingMandrel, U-LPS14 FaceDriverTorque)
**Engines to Wire:** WorkholdingIntelligenceEngine, ClampingSimEngine

#### SESSION 12: Part Classification + Sequencing (U-LPS01..U-LPS03)
```
SMART CONFIG: Role=ProcessEngineer + WorkholdingSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: WorkholdingIntelligenceEngine (499L), ClampingSimEngine (276L),
           LatheOrchestrationEngine (from MS0)
  TRIBAL: TribalKnowledgeEngine (workholding decisions, sequence optimization)
  FORMULAS: Cutting force: Fc = kc1.1 * b * h^(1-mc), Clamping: F_clamp >= 2.5 * F_resultant,
            Trilobe: delta = F*R^3/(E*I), Lame: p_internal = p_i*(r_i^2)/(r_o^2-r_i^2)
  REFERENCE: ISO 10218 (clamping safety), DIN 6350 (chuck specification),
             Machinery's Handbook (workholding chapter)
INTENT: Classify parts into families, optimize operation sequence, and plan multi-op setups
  with correct workholding that prevents deformation and maintains tolerance.
SKILLS: /fixture-design-guide, /defaults, /navigate
```

**U-LPS01**: LathePartClassifierEngine -- 15 part families
  - ADD: forging_blank, casting_blank, tube_hollow (stock form families)
  - Classification drives: workholding, sequence template, G73 vs G71
  - 4-LOOP:
    L1-BUILD: Create classifier with 15 families + decision tree
    L2-SCRUTINIZE: /prism-review -- verify all 15 families have correct workholding defaults
    L3-GAP_FILL: Test with 15 representative parts (one per family)
  - FILES_CREATED: src/engines/LathePartClassifierEngine.ts
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts (wire into Stage 7)
  - ABORT_CRITERIA: >3 TS errors | misclassifies tube vs solid | forging not routed to G73
  - ROLLBACK: revert classifier; restore orchestrator

**U-LPS02**: LatheSequenceOptimizerEngine -- multi-criteria with constraints
  - Objectives: min cycle_time, max tool_life, min tool_changes, min thermal drift
  - Hard constraints: face first (Z datum), cutoff last, G96 for turning / G97 for drilling
  - Thermal sequencing: rough_all -> cool -> finish_all (auto for tolerance < 0.05mm)
  - 4-LOOP:
    L1-BUILD: Create sequence optimizer with constraint solver
    L2-SCRUTINIZE: /prism-review -- verify hard constraints cannot be violated
    L3-GAP_FILL: Test with 5 operation sequences, verify constraints hold
  - FILES_CREATED: src/engines/LatheSequenceOptimizerEngine.ts
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts (wire into Stage 7)
  - ABORT_CRITERIA: >3 TS errors | cutoff not last | G97 used for turning
  - ROLLBACK: revert optimizer; restore orchestrator

**U-LPS03**: Op1/Op2 flip planning engine
  - Detect: which features require two-sided access
  - Generate: Op1 program (from bar or blank) + Op2 program (flip in soft jaws)
  - Soft jaw boring program generation (G71/G70 bore cycle with clearances)
  - Z-reference transfer between Op1 and Op2
  - Concentricity preservation strategy (soft jaw bore to finished OD)
  - 4-LOOP:
    L1-BUILD: Create LatheMultiOpPlannerEngine.ts with Op1/Op2 detection + program split
    L2-SCRUTINIZE: /prism-review -- verify Z-reference transfer preserves datum
    L3-GAP_FILL: Test with 3 two-sided parts, verify concentricity strategy
  - FILES_CREATED: src/engines/LatheMultiOpPlannerEngine.ts
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | Op2 Z-datum wrong | concentricity not addressed
  - ROLLBACK: revert planner; restore orchestrator

**>> /compact checkpoint after U-LPS03**

#### SESSION 13: Jaw Selection + Standard Workholding (U-LPS04..U-LPS07)
```
SMART CONFIG: Role=WorkholdingSpecialist + ProcessEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: WorkholdingIntelligenceEngine (499L), ClampingSimEngine (276L)
  TRIBAL: TribalKnowledgeEngine (workholding, thin-wall machining, specialty fixtures)
  FORMULAS: Clamping: F >= 2.5*F_resultant, Trilobe: delta = F*R^3/(E*I),
            Expanding mandrel: Lame p = p_i*r_i^2/(r_o^2-r_i^2),
            Face driver: T = F*mu*r*n_pins
  REFERENCE: DIN 6350, Hainbuch catalog (collets), Schunk catalog (chucks),
             Kitagawa catalog (actuators)
INTENT: Select the correct workholding for every scenario -- from standard hard jaws to
  specialty face drivers and expanding mandrels -- with physics-verified clamping force.
SKILLS: /fixture-design-guide, /defaults, /calc
```

**U-LPS04**: Jaw selection intelligence
  - Wire WorkholdingIntelligenceEngine for turning-specific decisions
  - Decision tree: hard jaw / soft jaw / collet / expanding mandrel / face driver / pie jaw
  - Inputs: diameter, tolerance, surface finish, batch quantity, stock form, wall thickness
  - Output: jaw type + justification + bore program (if soft jaw)
  - 4-LOOP:
    L1-BUILD: Wire WorkholdingIntelligenceEngine, implement decision tree
    L2-SCRUTINIZE: /prism-review -- verify decision tree covers all input combinations
    L3-GAP_FILL: Test 10 scenarios covering all jaw types
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts (wire into Stage 5)
  - ABORT_CRITERIA: >3 TS errors | recommends hard jaw for thin-wall | missing justification
  - ROLLBACK: revert workholding wiring

**U-LPS05**: Thin-wall clamping deformation model (basic)
  - Wire ClampingSimEngine with turning ring deformation model
  - 3-jaw trilobe distortion: delta = F * R^3 / (E * I)
  - Optimization solver: F_min(ejection) <= F_clamp <= F_max(deformation)
  - Flag: when no safe clamping window exists -> recommend 6-jaw, collet, or vacuum
  - 4-LOOP:
    L1-BUILD: Wire ClampingSimEngine, implement optimization solver
    L2-SCRUTINIZE: /prism-review -- verify delta formula uses correct R (mean radius)
    L3-GAP_FILL: Test with 3 wall thicknesses (thick, medium, thin), verify flagging
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | delta formula wrong | no-window case not flagged
  - ROLLBACK: revert deformation additions

**U-LPS06**: Specialty workholding (basic face driver + mandrel + between-centers)
  - Face driver: torque transmission through friction pins (F * mu * r * n_pins)
  - Expanding mandrel: Lame equation for radial grip pressure in bore
  - Between-centers: shaft turning with face driver + live center
  - Magnetic chuck: ferrous part detection + holding force check
  - 4-LOOP:
    L1-BUILD: Implement specialty workholding calculations
    L2-SCRUTINIZE: /prism-review -- verify Lame equation uses correct boundary conditions
    L3-GAP_FILL: Test with 4 scenarios (face driver shaft, mandrel bore, between-centers, magnetic)
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | Lame equation boundary wrong | face driver torque off >20%
  - ROLLBACK: revert specialty workholding additions

**U-LPS07**: Stock form handling (bar, forging, casting, hex, tube)
  - Bar stock: standard 3-jaw/collet -> G71 roughing
  - Forging/casting: custom soft jaws -> G73 pattern repeat
  - Hex bar: appropriate jaw set, force model for 3-point contact on hex
  - Tube: controlled low pressure, internal mandrel support option
  - 4-LOOP:
    L1-BUILD: Implement stock form handlers with workholding defaults
    L2-SCRUTINIZE: /prism-review -- verify forging routes to G73, hex force model correct
    L3-GAP_FILL: Test with all 5 stock forms
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | forging not routed to G73 | hex force model wrong
  - ROLLBACK: revert stock form additions

**>> /compact checkpoint after U-LPS07**

#### SESSION 14: Workholding State Tracking + Tests (U-LPS08..U-LPS10)
```
SMART CONFIG: Role=WorkholdingSpecialist + TestEngineer | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=30%
KNOWLEDGE:
  ENGINES: All MS3 engines from Sessions 12-13
  TRIBAL: TribalKnowledgeEngine (workholding state changes during machining)
  FORMULAS: Wall thinning: t_remaining = t_initial - ap_total
  REFERENCE: None additional
INTENT: Track workholding adequacy throughout the operation sequence as geometry changes,
  then comprehensively test all workholding scenarios.
SKILLS: /test, /forge-tests, /fixture-design-guide
```

**U-LPS08**: Workholding state tracking through sequence
  - Re-evaluate clamping after each geometry-changing operation
  - Wall thinning during boring -> deformation risk increases
  - Groove near chuck -> effective grip length shrinks
  - Part-off -> remaining stock vs parted piece force analysis
  - 4-LOOP:
    L1-BUILD: Implement per-operation workholding re-evaluation
    L2-SCRUTINIZE: /prism-review -- verify wall thinning recalculates delta correctly
    L3-GAP_FILL: Test with progressive boring scenario (wall thins each pass)
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | wall thinning not tracked | deformation risk not flagged
  - ROLLBACK: revert state tracking additions

**U-LPS09**: Wire dispatchers + tests (15+)
  - 4-LOOP:
    L1-BUILD: Add workholding actions to turningDispatcher, create 15+ tests
    L2-SCRUTINIZE: /prism-review -- verify action schemas match engine contracts
    L3-GAP_FILL: Run all tests, 0 failures
  - FILES_CREATED: src/__tests__/lathe-workholding.test.ts
  - FILES_MODIFIED: src/tools/dispatchers/turningDispatcher.ts
  - ABORT_CRITERIA: >3 test failures | schema mismatch | dispatcher routing error
  - ROLLBACK: revert test file; restore dispatcher

**U-LPS10**: Integration test -- Op1/Op2 workflow for 5 part types
  - 4-LOOP:
    L1-BUILD: Create integration test with 5 Op1/Op2 workflows
    L2-SCRUTINIZE: /prism-review -- verify each part type exercises different workholding
    L3-GAP_FILL: Run integration tests, verify complete workflows
  - FILES_CREATED: src/__tests__/lathe-multiop-integration.test.ts
  - ABORT_CRITERIA: >2 workflow failures | Z-datum transfer wrong | soft jaw bore missing
  - ROLLBACK: revert test file

**>> /compact checkpoint after U-LPS10**

#### SESSION 15: NEW -- Deep Workholding Physics (U-LPS11..U-LPS14)
```
SMART CONFIG: Role=WorkholdingPhysicist + StructuralMechanics | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=45%
KNOWLEDGE:
  ENGINES: ClampingSimEngine (276L), WorkholdingIntelligenceEngine (499L),
           KienzleForceModelEngine (~600L)
  TRIBAL: TribalKnowledgeEngine (workholding failures, thin-wall distortion, mandrel sizing)
  FORMULAS:
    Trilobe (3-jaw ring distortion): delta = F*R^3/(E*I) where I = b*t^3/12 (thin ring)
      F = radial jaw force, R = mean ring radius, E = Young's modulus, t = wall thickness
      Optimization: F_min(ejection) <= F_clamp <= F_max(deformation <= tolerance/2)
      Safety factor: F_clamp >= 2.5 * sqrt(Fc^2 + Ff^2) / (mu * n_jaws * cos(alpha))
    Expanding mandrel (Lame): sigma_r = A - B/r^2, sigma_theta = A + B/r^2
      p_contact = delta_interference * E / (r_bore * ((r_o^2+r_i^2)/(r_o^2-r_i^2) + v))
      Torque capacity: T = p * mu * 2*pi*r_bore * L_contact * r_bore
    Face driver: T_transmit = F_axial * mu * r_mean * n_pins
      F_axial from hydraulic/spring pressure, mu = 0.15 (hardened steel) to 0.5 (serrated pin)
    Soft jaw bore: G71 cycle with bore_dia = finished_OD + 0.05mm (steel), +0.1mm (aluminum)
      Jaw bolt hole clearance: bore must clear bolt pattern at z_min and z_max jaw travel
  REFERENCE: Roark's Formulas for Stress and Strain (7th ed., ring under concentrated loads),
             Hainbuch workholding engineering manual, Schunk clamping technology handbook,
             DIN 6350 (3-jaw chuck runout specification), ISO 13041 (lathe accuracy)
INTENT: The Workholding agent scored 49/100 because v2.0 lacked quantitative deformation
  physics, soft jaw G-code generation, mandrel sizing, and face driver torque verification.
  These 4 units add the MISSING physics that make workholding decisions trustworthy -- not
  just "use soft jaws" but "bore soft jaws to 50.05mm using this G71/G70 program, clamp at
  850 PSI for 3.2um trilobe distortion which is within the 0.01mm tolerance band."
SKILLS: /fixture-design-guide, /calc, /physics-verify, /process-calc
```

**U-LPS11**: TrilobeDeformationEngine -- 3-jaw ring distortion with optimization solver
  - Input: workpiece { OD, ID, wall_thickness, length, material (E, v) },
           chuck { jaw_width, jaw_count (3 or 6), max_pressure_bar },
           cutting_forces { Fc, Ff, Fp from KienzleForceModelEngine },
           tolerance { diameter_tolerance from feature }
  - Physics model:
    Step 1: Compute minimum clamping force for safety:
      F_min = 2.5 * sqrt(Fc^2 + Ff^2) / (mu * n_jaws * cos(alpha_jaw))
      mu = 0.12 (smooth jaw) | 0.25 (serrated jaw) | 0.40 (carbide jaw)
      alpha_jaw = 0 (external grip) | 15deg (stepped jaw)
    Step 2: Compute maximum clamping force before deformation exceeds tolerance:
      For thin ring (t/R < 0.1): delta_radial = F * R^3 / (E * I)
        where I = jaw_width * t^3 / 12 (ring section at jaw contact)
      For thick ring (t/R >= 0.1): use Roark Table 9.2 Case 1a (3 equal loads, ring)
      F_max = tolerance_band/2 * E * I / R^3 (invert deformation equation)
    Step 3: Check feasibility window: F_min <= F_clamp <= F_max
      If window exists: recommend F_clamp = F_min * 1.3 (30% safety margin)
      If no window: recommend alternatives (6-jaw, collet, expanding mandrel, vacuum, wax)
    Step 4: Output trilobe profile (3-lobe polar plot) for visualization
  - Output: { f_min_N, f_max_N, f_recommended_N, delta_um, feasible: boolean,
              trilobe_profile: Point2D[], alternatives: string[] }
  - 4-LOOP:
    L1-BUILD: Create TrilobeDeformationEngine.ts with full physics model + optimization solver
    L2-SCRUTINIZE: /prism-review -- verify Roark formula correct, safety factor >= 2.5, units consistent
    L3-GAP_FILL: Test with known cases (50mm OD x 2mm wall 4140 steel, expected delta ~5um at 10kN)
  - FILES_CREATED: src/engines/TrilobeDeformationEngine.ts
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts (wire into Stage 5 + Stage 8 re-check)
  - ABORT_CRITERIA: >3 TS errors | delta formula units wrong (must be micrometers) | safety factor < 2.5 | F_min > F_max not detected | Roark thin-ring formula applied to thick ring
  - ROLLBACK: revert TrilobeDeformationEngine.ts; restore orchestrator Stage 5

**U-LPS12**: SoftJawBoringGCodeEngine -- generate G71/G70 bore cycle with jaw bolt clearances
  - Input: workpiece { finished_OD }, chuck { jaw_type, bolt_pattern_radius, bolt_count,
           bolt_head_dia, jaw_travel_range }, machine { controller_dialect }
  - Bore diameter calculation:
    Steel: bore_dia = finished_OD + 0.05mm (allow spring-back to grip)
    Aluminum: bore_dia = finished_OD + 0.10mm (softer, more spring needed)
    Titanium: bore_dia = finished_OD + 0.03mm (low spring-back)
    Custom: bore_dia = finished_OD + user_clearance
  - Bolt clearance check:
    At minimum jaw travel: bolt heads must NOT protrude into bore path
    At maximum jaw travel: bore must not intersect bolt pocket
    Generate relief groove in bore profile if bolt clearance tight
  - G-code generation:
    G71 rough bore cycle (U-depth, R-retract, P-start Q-end F-feed per controller)
    G70 finish pass
    Controller-specific: Fanuc G71/G70, Haas G71/G70, Okuma G71/G70 (different P/Q syntax),
      Mazak G71/G70, Siemens CYCLE95
  - Output: { gcode_lines: string[], bore_diameter_mm, bolt_clearance_ok: boolean,
              relief_groove_required: boolean }
  - 4-LOOP:
    L1-BUILD: Create SoftJawBoringGCodeEngine.ts with bore calc + bolt check + G-code gen
    L2-SCRUTINIZE: /prism-review -- verify G71 parameters correct per controller, bolt clearance checked
    L3-GAP_FILL: Test with 4 controllers (Fanuc, Haas, Okuma, Mazak), verify G-code syntax
  - FILES_CREATED: src/engines/SoftJawBoringGCodeEngine.ts
  - FILES_MODIFIED: src/engines/LatheMultiOpPlannerEngine.ts (wire for Op2 soft jaw prep)
  - ABORT_CRITERIA: >3 TS errors | bore diameter clearance wrong for material | bolt clearance not checked | G71 syntax wrong for any controller
  - ROLLBACK: revert SoftJawBoringGCodeEngine.ts; restore multi-op planner

**U-LPS13**: ExpandingMandrelEngine -- Lame equation for bore grip
  - Input: workpiece { bore_ID, bore_length, wall_thickness, material (E, v, yield) },
           mandrel { type (hydraulic/mechanical/thermal), OD_range, max_expansion_um,
                     grip_length, surface (smooth/knurled/diamond-coated) }
  - Physics model (Lame thick-wall cylinder):
    Step 1: Required interference for grip:
      delta_min = F_min / (E * 2*pi*r_bore * L_contact * mu)
      where F_min = 2.5 * sqrt(Fc^2 + Ff^2) (from cutting forces)
      mu = 0.12 (smooth) | 0.20 (knurled) | 0.35 (diamond-coated)
    Step 2: Contact pressure from interference:
      p_contact = delta * E_eff / (r_bore * K)
      K = (r_o^2 + r_i^2)/(r_o^2 - r_i^2) + v (for external pressure on bore)
      E_eff = E_workpiece * E_mandrel / (E_workpiece + E_mandrel) (series compliance)
    Step 3: Bore stress check:
      sigma_hoop = p_contact * (r_o^2 + r_i^2) / (r_o^2 - r_i^2)
      Require: sigma_hoop < 0.6 * yield_strength (safety factor)
    Step 4: Mandrel expansion check:
      Required expansion must be within mandrel range (hydraulic: 3-15um typ)
      If expansion insufficient: recommend next mandrel size or thermal expansion
  - Output: { mandrel_od_mm, required_expansion_um, contact_pressure_MPa,
              hoop_stress_MPa, stress_ratio, feasible: boolean, grip_torque_Nm }
  - 4-LOOP:
    L1-BUILD: Create ExpandingMandrelEngine.ts with Lame equations + stress check
    L2-SCRUTINIZE: /prism-review -- verify Lame boundary conditions correct, stress check conservative
    L3-GAP_FILL: Test with known case (50mm bore, 5mm wall, 4140 steel), verify against textbook
  - FILES_CREATED: src/engines/ExpandingMandrelEngine.ts
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts (wire as alternative to jaw grip)
  - ABORT_CRITERIA: >3 TS errors | Lame equation wrong | stress ratio > 0.6 not flagged | expansion units wrong (must be micrometers)
  - ROLLBACK: revert ExpandingMandrelEngine.ts; restore orchestrator

**U-LPS14**: FaceDriverTorqueEngine -- friction pin transmission physics
  - Input: workpiece { OD, length, material, center_hole_angle },
           face_driver { n_pins, pin_diameter, pin_radius_from_center, spring_force_per_pin,
                        pin_surface (hardened/serrated/carbide) },
           tailstock { type (live_center/dead_center), force_N },
           cutting_forces { Fc, tangential torque T_cut = Fc * D/2 }
  - Physics model:
    Step 1: Axial clamping force:
      F_axial = tailstock_force (hydraulic or spring)
      F_per_pin = F_axial / n_pins (assume equal distribution)
    Step 2: Friction torque per pin:
      T_pin = F_per_pin * mu * r_pin_center
      mu = 0.15 (hardened smooth) | 0.25 (serrated) | 0.50 (carbide-coated)
    Step 3: Total driving torque:
      T_drive = n_pins * T_pin = F_axial * mu * r_pin_center
      (Note: simplified -- all pins at same radius)
    Step 4: Safety check:
      T_drive / T_cut >= 2.0 (safety factor for face driving)
      If insufficient: increase tailstock force, use serrated pins, or reduce DOC
    Step 5: Center hole check:
      Verify A-type (60deg) or B-type (60deg with protection) center hole present
      Live center recommended for RPM > 2000 (dead center generates heat)
  - Output: { t_drive_Nm, t_cut_Nm, safety_factor, feasible: boolean,
              max_doc_at_current_force_mm, recommendations: string[] }
  - 4-LOOP:
    L1-BUILD: Create FaceDriverTorqueEngine.ts with pin friction model + safety check
    L2-SCRUTINIZE: /prism-review -- verify torque formula correct, safety factor >= 2.0
    L3-GAP_FILL: Test with shaft between centers (100mm OD, 4-pin driver, 5kN tailstock force)
  - FILES_CREATED: src/engines/FaceDriverTorqueEngine.ts
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts (wire for between-centers work)
  - ABORT_CRITERIA: >3 TS errors | torque formula wrong | safety factor < 2.0 not flagged | center hole type not checked
  - ROLLBACK: revert FaceDriverTorqueEngine.ts; restore orchestrator

**FORGE-TRIPLE:**
  HOOK: `sequence-safety-gate` -- blocks cutoff before features complete + clamping check per op
  ACTION: `prism_turning:turning_optimize_sequence`, `prism_turning:turning_trilobe_analysis`,
          `prism_turning:turning_mandrel_sizing`, `prism_turning:turning_face_driver_check`
  SKILL: `/lathe-sequence`, `/fixture-design-guide` (extended with trilobe/mandrel/face-driver)

**EXIT GATE:** check 15 part families classify correctly |
  check Op1/Op2 Z-datum transfer preserves concentricity |
  check Trilobe delta matches Roark for 3 test cases |
  check Soft jaw G71/G70 generates valid code for 4 controllers |
  check Expanding mandrel Lame stress < 0.6*yield |
  check Face driver safety factor >= 2.0 |
  check No safe clamping window -> alternatives recommended |
  check 20+ tests pass | omega_floor >= 0.85 | SVI delta: +5%

**FEATURE CASCADE:**
  NEW_HOOKS: sequence-safety-gate
  NEW_ACTIONS: turning_optimize_sequence, turning_trilobe_analysis, turning_mandrel_sizing,
    turning_face_driver_check, turning_soft_jaw_bore_program
  NEW_SKILLS: /lathe-sequence, /fixture-design-guide (extended)
  AVAILABLE_TO: MS4a/MS4b (threading/grooving workholding), MS6b (Swiss workholding), MS0 (orchestrator)

---

## PHASE D: DEEP DOMAIN

---

### MILESTONE MS4a: Threading Deep (NEW SPLIT from v2 MS4)
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS0
**Addresses:** Threading (44->72)
**v3.0 Changes:** Split from combined MS4 (threading+grooving) into dedicated threading milestone.
  Adds: variable pitch G34, thread repair/recutting, controller-specific threading cycles
  for ALL 8 dialects, multi-start with C-axis indexing, thread relief grooves DIN 76.
**Engines to Wire:** ThreadingPipelineEngine (710L), SinglePointThreadEngine (~300L),
  ThreadCalculationEngine (~400L), ThreadGageEngine (~250L)

#### SESSION 16: Thread Forms + Infeed + Measurement (U-LPH01..U-LPH03)
```
SMART CONFIG: Role=ThreadingSpecialist + CNCProgrammer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=45%
KNOWLEDGE:
  ENGINES: ThreadingPipelineEngine (710L), SinglePointThreadEngine (~300L),
           ThreadCalculationEngine (~400L), ThreadGageEngine (~250L)
  TRIBAL: TribalKnowledgeEngine (threading category -- all 3,700+ tips searchable)
  FORMULAS:
    Thread depth: h_external = 0.6134*P (ISO metric), h = 0.6495*P (UN)
    Pitch dia: d2 = D - 0.6495*P (external), D2 = D + 0.6495*P (internal)
    Infeed per pass (constant area): delta_n = d_total * sqrt(n/N_total)
    Spring pass count: N_spring = 2 (steel), 3 (stainless), 4 (titanium)
    Thread power: P = Fc * Vc / 60000, Fc from Kienzle with thread DOC
    Variable pitch: lead(z) = lead_start + k*z (linear) or lead_start * e^(k*z) (exponential)
  REFERENCE: ISO 68-1 (metric thread profile), ASME B1.1 (UN thread), ASME B1.20.1 (NPT),
             BS 21 (BSP), DIN 103 (trapezoidal), ASME B1.5 (ACME),
             ISO 965-1 (metric thread tolerances), DIN 76 (thread run-out/undercut),
             ISO 13715 (edge definition), Machinery's Handbook Ch.17 (screw threads)
INTENT: The Threading agent scored only 44/100 because v2 MS4 tried to cover threading AND
  grooving in 8 units. v3 splits these apart. This milestone goes DEEP on threading: every
  thread form, every infeed method, every controller dialect, variable pitch, multi-start,
  repair/recutting, and thread relief grooves. A threading expert should see nothing missing.
SKILLS: /hypermill-thread, /gcode, /ppg-quick-start, /defaults
```

**U-LPH01**: Wire ThreadingPipelineEngine into orchestrator Stage 15 -- ALL thread forms
  - All 10 thread forms: ISO metric, UNC/UNF/UNEF, NPT, NPTF, BSP, BSPT, ACME, trapezoidal, buttress, custom
  - Thread calculation per form:
    ISO: pitch diameter d2 = d - 0.6495*P, minor d3 = d - 1.2269*P
    UN: same formulas, different tolerance classes (1A/2A/3A, 1B/2B/3B)
    NPT: taper 1:16 (1deg47'), thread depth h = 0.8 * P, gauge plane L1 from ASME B1.20.1
    ACME: thread angle 29deg, basic height 0.5*P, clearance 0.01" (25.4um)
    Trapezoidal: ISO DIN 103, thread angle 30deg
    Buttress: 7deg/45deg flanks per ANSI B1.9
  - Multi-start threads with controller-specific G-code:
    Fanuc: G76 with Q-word (thread start angle) for each start
    Haas: G76 Q-word, verify R-word incremental vs absolute
    Okuma: M33 + thread start angle parameter
    General: C-axis index method (G0 C120 for 3-start at 120deg spacing)
  - Variable pitch (progressive pitch for ball screws, worm gears):
    G34 (Fanuc/Haas): variable lead, F-word = start lead, K-word = lead change per rev
    Siemens: CYCLE97 with PTATEFUN variable pitch function
    Okuma: G34 with H-word (lead increment)
  - Thread class -> pitch diameter tolerance lookup (2A/2B, 3A/3B, 6g/6H)
  - Wire ThreadCalculationEngine for all thread math
  - 4-LOOP:
    L1-BUILD: Wire ThreadingPipelineEngine, implement all 10 forms + variable pitch + multi-start
    L2-SCRUTINIZE: /prism-review -- verify thread math against Machinery's Handbook tables
    L3-GAP_FILL: Test all 10 forms, verify pitch diameter within class tolerance
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts, src/engines/ThreadingPipelineEngine.ts
  - ABORT_CRITERIA: >3 TS errors | pitch diameter wrong for any form | NPT taper angle wrong | G34 syntax error
  - ROLLBACK: revert threading additions to both engines

**U-LPH02**: G76 infeed method selection intelligence (5 methods, ALL controllers)
  - Wire SinglePointThreadEngine: all 5 infeed methods
    Radial (straight-in): P=0 (Fanuc), simplest, highest forces, worst surface on large pitch
    Flank (29deg): P=1 (Fanuc), standard for ISO metric, single cutting edge
    Modified flank (29.5deg): P=2 (Fanuc), both edges cut slightly, better chip control
    Alternating flank: P=3 (Fanuc), alternates left/right, best for large pitch
    Constant-area (decreasing DOC): P=4 or custom macro, constant chip load per pass
  - Decision matrix: material + thread form + pitch -> optimal infeed method
    Fine pitch (<1.5mm): radial OK, chip control adequate
    Medium pitch (1.5-3mm): modified flank preferred
    Coarse pitch (>3mm): alternating flank or constant-area
    Stainless/Ti: modified flank + extra spring passes
    ACME/trapezoidal: flank infeed mandatory (wide profile)
  - Spring pass count by material:
    Carbon steel: 2 passes
    Alloy steel: 2-3 passes
    Stainless: 3-4 passes
    Titanium: 4-5 passes
    Inconel: 5-6 passes
  - First-pass depth optimization:
    delta_1 = 0.15-0.25mm (steel), 0.10-0.15mm (Ti), 0.20-0.30mm (aluminum)
  - Controller-specific G76 syntax mapping:
    Fanuc: G76 P(passes)(spring)(infeed) Q(min_depth) R(pull-out)
    Haas: Same Fanuc format, verify Setting 95 (G76 start angle reference)
    Okuma: G71 thread cycle with B(infeed), D(depth), H(spring)
    Mazak: G76 or MAZATROL THREAD CUTTING unit
    Siemens: CYCLE97(RTP, RFP, SDIS, DP, DPR, NUM, FALX, FALZ, VARI, NUMTH)
    DMG MORI: Siemens-based or Fanuc-based depending on controller
    Citizen: $1 G76 format with sync codes
    Star: G76 with M200/M201 sync for sub-spindle threading
  - 4-LOOP:
    L1-BUILD: Wire SinglePointThreadEngine, implement decision matrix + all 8 controller formats
    L2-SCRUTINIZE: /prism-review -- verify infeed angle calculations, G76 P-word packing correct
    L3-GAP_FILL: Test all 5 methods x 3 materials, verify G76 for all 8 controllers
  - FILES_MODIFIED: src/engines/SinglePointThreadEngine.ts, src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | infeed method selection wrong for material | G76 P-word packed wrong for Fanuc | spring pass count too low for Ti
  - ROLLBACK: revert infeed additions to both engines

**U-LPH03**: Thread measurement strategy + thread relief grooves DIN 76
  - Wire ThreadGageEngine: go/no-go, 3-wire method, pitch diameter calculation
    Go/no-go selection: class 2A -> X-tolerance go gage, class 3A -> tighter tolerance
    3-wire method: M = d - 1.5155*P + 3*d_wire (for 60deg thread)
      Best wire size: d_wire = 0.57735*P
    Pitch diameter calculation from 3-wire measurement
  - Thread class fit checking: verify pitch diameter within tolerance band
  - Generate measurement instructions for setup sheet
  - Thread repair/recutting intelligence:
    Detect: when thread is out of tolerance (pitch dia oversize from tool wear)
    Strategy: re-sync to existing thread (G76 start angle must match)
    Spring pass only (no additional depth) to correct surface
    G-code: G76 with same start position + 0 depth = finishing pass only
  - Thread relief groove generation (DIN 76):
    DIN 76 Type A (standard): groove width = 2*P to 4*P, groove depth = 0.5mm below minor dia
    DIN 76 Type B (extended): for threads requiring grinding
    ISO 13715: edge break at thread start/end
    Auto-generate groove geometry from thread callout + DIN 76 tables
    Insert groove into operation sequence BEFORE threading
  - 4-LOOP:
    L1-BUILD: Wire ThreadGageEngine, implement relief groove generator, add repair logic
    L2-SCRUTINIZE: /prism-review -- verify 3-wire formula, DIN 76 table values correct
    L3-GAP_FILL: Test with M20x2.5 (check 3-wire measurement), verify DIN 76 groove for M10-M100
  - FILES_MODIFIED: src/engines/ThreadingPipelineEngine.ts, src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | 3-wire M value wrong | DIN 76 groove depth wrong | repair sync angle not matched
  - ROLLBACK: revert measurement/relief additions

**>> /compact checkpoint after U-LPH03**

#### SESSION 17: Thread Repair + Multi-Start + Advanced (U-LPH04..U-LPH06)
```
SMART CONFIG: Role=ThreadingSpecialist + ControllerExpert | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: ThreadingPipelineEngine (710L), SinglePointThreadEngine (~300L)
  TRIBAL: TribalKnowledgeEngine (threading repair, multi-start, ball screw)
  FORMULAS: Multi-start: angular spacing = 360/n_starts, lead = pitch * n_starts
  REFERENCE: ISO 5408 (multi-start thread definitions), DIN 76, ASME B1.1
INTENT: Cover the advanced threading scenarios that separate a good threading system from
  a great one: multi-start indexing, variable pitch ball screws, and thread repair.
SKILLS: /gcode, /ppg-quick-start, /hypermill-thread
```

**U-LPH04**: Multi-start threading with C-axis indexing
  - Multi-start thread definitions:
    n_starts = 2: 180deg spacing, lead = 2*pitch
    n_starts = 3: 120deg spacing, lead = 3*pitch
    n_starts = 4: 90deg spacing, lead = 4*pitch
  - C-axis indexing methods:
    Method 1 (G76 Q-word): Fanuc G76 with Q=start_angle*1000 (Q180000 for 180deg)
    Method 2 (C-axis position): G0 C0, cut start 1; G0 C120, cut start 2; G0 C240, cut start 3
    Method 3 (G32 with start angle): G32 X_ Z_ F_ Q_ (Fanuc)
    Method 4 (MAZATROL): THREAD CUTTING unit with START ANGLE parameter
  - Verification: all starts must have identical depth + surface finish
  - 4-LOOP:
    L1-BUILD: Implement multi-start with all 4 indexing methods
    L2-SCRUTINIZE: /prism-review -- verify angular spacing calculation correct
    L3-GAP_FILL: Test 2-start and 3-start for Fanuc and Haas controllers
  - FILES_MODIFIED: src/engines/ThreadingPipelineEngine.ts
  - ABORT_CRITERIA: >3 TS errors | angular spacing wrong | C-axis not indexed | lead calculation wrong
  - ROLLBACK: revert multi-start additions

**U-LPH05**: Variable pitch threading (G34) for ball screws and worm gears
  - G34 variable pitch cycle:
    Linear pitch change: lead(z) = lead_start + k*z
    Fanuc: G34 X_ Z_ F_ K_ (F=start_lead, K=lead_increment_per_rev)
    Haas: Same G34 syntax
    Okuma: G34 with H-word
    Siemens: CYCLE97 with PTAREFUN pitch function
  - Ball screw applications:
    Constant pitch region + transition region + return groove
    Precision class: C0 (2um/300mm), C1 (3.5um/300mm), C3 (8um/300mm), C5 (18um/300mm)
    Usually ground, but roughing via single-point saves grinding stock
  - Worm gear applications:
    Module-based pitch (m = P/pi), lead = P * n_starts
    Profile: involute, ZI, ZA, ZN, ZK per DIN 3975
    Thread angle dependent on profile type
  - 4-LOOP:
    L1-BUILD: Implement G34 for all 4 controllers, ball screw + worm gear profiles
    L2-SCRUTINIZE: /prism-review -- verify G34 syntax per controller manual
    L3-GAP_FILL: Test linear pitch change, verify lead at start/end positions
  - FILES_MODIFIED: src/engines/ThreadingPipelineEngine.ts, src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | G34 K-word wrong | pitch at end position incorrect | worm module calc wrong
  - ROLLBACK: revert variable pitch additions

**U-LPH06**: Controller-specific threading G-code -- complete 8-dialect coverage
  - Verify COMPLETE threading support for all 8 controllers:
    Fanuc 0i-TF/30i-B: G76 (compound), G92 (simple), G32 (single-pass), G34 (variable)
    Haas NGC: G76, G92, G32, G34 (verify Setting 95 start angle reference)
    Okuma OSP-P300: G71-thread (B/D/H + M33 orient), G78 (simple), G34
    Mazak SmoothG: G76 or MAZATROL THREAD CUTTING UNIT, G92, G32
    Siemens 840D: CYCLE97 (with VARI for infeed), G33, G34 (PTAREFUN)
    DMG MORI CELOS: controller-dependent (Siemens or Fanuc)
    Citizen Cincom: $1/$2 G76 with wait codes for sync
    Star: G76 with M200/M201 sync codes for sub-spindle thread pickup
  - Thread pickup (sub-spindle): synchronize spindle speed to pick up thread from main
  - Thread chasing: M33 spindle orient for re-entry (Okuma)
  - 4-LOOP:
    L1-BUILD: Complete all 8 dialect threading implementations
    L2-SCRUTINIZE: /prism-review -- verify each dialect against controller manual examples
    L3-GAP_FILL: Test simple G76 + G92 + G32 for all 8 controllers
  - FILES_MODIFIED: src/engines/ThreadingPipelineEngine.ts
  - ABORT_CRITERIA: >3 TS errors | any controller produces invalid thread G-code | missing cycle type for any controller
  - ROLLBACK: revert dialect additions

**>> /compact checkpoint after U-LPH06**

#### SESSION 18: Threading Tests + Wiring (U-LPH07..U-LPH08)
```
SMART CONFIG: Role=TestEngineer + ThreadingValidator | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=30%
KNOWLEDGE:
  ENGINES: All MS4a engines
  REFERENCE: Machinery's Handbook thread tables
INTENT: Exhaustive testing of all thread forms, infeed methods, controller dialects, and
  special scenarios (variable pitch, multi-start, repair, relief grooves).
SKILLS: /test, /forge-tests
```

**U-LPH07**: Tests -- 20+ (all thread forms, infeed methods, controller dialects)
  - Test: all 10 thread forms (verify pitch diameter within class tolerance)
  - Test: all 5 infeed methods (verify angle, pass depth progression)
  - Test: all 8 controller dialects (verify G76/G92/G32/G34 syntax)
  - Test: multi-start (2-start, 3-start) angular spacing
  - Test: variable pitch G34 lead calculation
  - Test: thread relief groove DIN 76 dimensions
  - Test: thread repair re-sync logic
  - Test: 3-wire measurement M-value calculation
  - 4-LOOP:
    L1-BUILD: Create comprehensive threading test suite with 20+ cases
    L2-SCRUTINIZE: /prism-review -- verify test values match published standards
    L3-GAP_FILL: Run all tests, 0 failures
  - FILES_CREATED: src/__tests__/lathe-threading.test.ts
  - ABORT_CRITERIA: >3 failures | thread math test uses wrong reference values | || true pattern
  - ROLLBACK: revert test file

**U-LPH08**: Wire dispatchers + threading actions
  - Actions: `turning_thread_calculate`, `turning_thread_infeed_select`,
    `turning_thread_measure`, `turning_thread_relief_groove`,
    `turning_thread_variable_pitch`, `turning_thread_multi_start`,
    `turning_thread_repair`, `turning_thread_controller_code`
  - 4-LOOP:
    L1-BUILD: Add 8 threading actions to turningDispatcher
    L2-SCRUTINIZE: /prism-review -- verify action schemas match engine I/O
    L3-GAP_FILL: Test each action via dispatcher call
  - FILES_MODIFIED: src/tools/dispatchers/turningDispatcher.ts
  - ABORT_CRITERIA: >3 TS errors | action routing fails | schema mismatch
  - ROLLBACK: restore dispatcher to pre-edit

**FORGE-TRIPLE:**
  HOOK: `thread-class-gate` -- validates pitch diameter within class tolerance
  ACTION: `prism_turning:turning_thread_optimize`
  SKILL: `/lathe-thread` (NEW -- comprehensive threading assistant)

**EXIT GATE:** check All 10 thread forms produce correct pitch diameter |
  check All 5 infeed methods select correctly by material |
  check All 8 controllers produce valid G76/G92/G32/G34 |
  check Multi-start angular spacing correct |
  check Variable pitch G34 lead change correct |
  check DIN 76 relief groove dimensions match tables |
  check Thread repair re-syncs correctly |
  check 20+ tests pass | omega_floor >= 0.85 | SVI delta: +4%

**FEATURE CASCADE:**
  NEW_HOOKS: thread-class-gate
  NEW_ACTIONS: turning_thread_calculate, turning_thread_infeed_select, turning_thread_measure,
    turning_thread_relief_groove, turning_thread_variable_pitch, turning_thread_multi_start,
    turning_thread_repair, turning_thread_controller_code
  NEW_SKILLS: /lathe-thread
  AVAILABLE_TO: MS4b (groove types include thread relief), MS5 (hard turning threads), MS6a (Swiss threading)

---

### MILESTONE MS4b: Grooving & Parting Deep (NEW SPLIT from v2 MS4)
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS0, MS4a (thread relief grooves already defined)
**Addresses:** Threading agent (44->72, grooving contributes to score)
**v3.0 Changes:** Dedicated milestone for groove classification, deep grooving cycles,
  peck intelligence by material, parting coolant strategy, and part catcher timing physics.
**Engines to Wire:** PartOffForceEngine (~300L), KienzleForceModelEngine (~600L),
  ChipBreakingEngine (402L -- for grooving chip control)

#### SESSION 19: Groove Classification + Deep Grooving (U-LPG01..U-LPG03)
```
SMART CONFIG: Role=GroovingSpecialist + ProcessEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: PartOffForceEngine (~300L), KienzleForceModelEngine (~600L),
           ChipBreakingEngine (402L)
  TRIBAL: TribalKnowledgeEngine (grooving, parting, peck strategies)
  FORMULAS:
    Groove force: Fc = kc1.1 * b * h^(1-mc) where b = groove_width, h = feed
    Blade deflection: delta = F*L^3/(3*E*I) where L = overhang, I = b*t^3/12
    Peck retract: 0.05-0.1mm for chip break, 0.5-1.0mm for coolant flush
    Part catcher timing: activate at d_remaining = 2*blade_width (empirical)
  REFERENCE: ISO 13399 (cutting tool data), Sandvik grooving guide,
             Iscar GRIP/DO-GRIP catalog, Kennametal groove/cutoff guide
INTENT: A dedicated grooving and parting milestone that covers all 8 groove types with
  physics-backed parameters, deep grooving cycle optimization, and safe parting with
  part catcher timing. The threading agent wanted this depth.
SKILLS: /defaults, /calc, /gcode
```

**U-LPG01**: Groove type classification engine with 8 types
  - 8 groove types with per-type tooling + strategy:
    1. Full-radius groove: tool = full-R insert, verify R matches drawing, plunge to depth
    2. V-groove: tool = V-insert or angled approach, verify included angle
    3. Rectangular groove: tool = flat-bottom insert, width match or multi-pass
    4. O-ring groove: ISO 3601 dimensions (d_groove, w_groove per O-ring size), tight tolerance on width
    5. Circlip/snap-ring groove: DIN 471/472 dimensions, sharp corners required
    6. Thread relief groove: DIN 76/ISO 13715 (already generated by MS4a U-LPH03)
    7. Bearing relief groove: DIN 509 Type E/F/G (undercuts for bearing shoulders)
    8. Face groove: axial groove on face, requires facing tool or dedicated face groove tool
  - Per-type strategy selection:
    Narrow groove (width <= blade): single plunge
    Wide groove (width > blade): plunge-and-shift (zigzag) or axial grooving
    Deep groove (depth > 3x width): peck grooving with chip evacuation
  - Output: { groove_type, tool_geometry, cycle_type, n_passes, peck_strategy }
  - 4-LOOP:
    L1-BUILD: Create GrooveClassificationEngine.ts with all 8 types + strategy selection
    L2-SCRUTINIZE: /prism-review -- verify ISO 3601 O-ring dimensions, DIN 471/472 circlip dimensions
    L3-GAP_FILL: Test all 8 groove types, verify tool selection and strategy
  - FILES_CREATED: src/engines/GrooveClassificationEngine.ts
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts (wire into Stage 15)
  - ABORT_CRITERIA: >3 TS errors | O-ring groove dimensions wrong | bearing relief DIN 509 wrong | single plunge for groove wider than blade
  - ROLLBACK: revert GrooveClassificationEngine.ts; restore orchestrator

**U-LPG02**: Deep grooving plunge-and-shift cycle optimization
  - Plunge-and-shift (zigzag) for wide grooves:
    Step 1: Plunge full depth at one wall
    Step 2: Shift axially by 80% of blade width
    Step 3: Plunge full depth at new position
    Repeat until groove width covered
    Final pass: cleanup pass along both walls for surface finish
  - Peck grooving for deep grooves:
    Peck depth: material-dependent (see U-LPG03)
    Retract: 0.05-0.1mm for chip break
    Full retract every N pecks for coolant flush (N = 3 for steel, 2 for stainless)
  - Blade stress check:
    Deflection: delta = Fc * L^3 / (3 * E * I_blade)
    I_blade = blade_width * blade_height^3 / 12
    If deflection > groove_tolerance/4: reduce feed or use wider blade
  - Controller-specific grooving cycles:
    Fanuc: G74 peck grooving (Z-axis), G75 peck grooving (X-axis)
    Haas: G74/G75 same format
    Okuma: G74/G75 with different depth/retract syntax
    Siemens: CYCLE93 (grooving cycle)
  - 4-LOOP:
    L1-BUILD: Implement plunge-and-shift + peck + blade stress check + 4 controller formats
    L2-SCRUTINIZE: /prism-review -- verify blade stress formula, peck depth limits
    L3-GAP_FILL: Test wide groove (shift pattern), deep groove (peck pattern), verify controller syntax
  - FILES_MODIFIED: src/engines/GrooveClassificationEngine.ts, src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | blade stress not checked | peck depth exceeds safe limit | G74/G75 syntax wrong
  - ROLLBACK: revert groove cycle additions

**U-LPG03**: Peck intelligence by material
  - Material-specific peck depths and strategies:
    Carbon steel (P10-P30): peck 2-3x blade width, retract 0.05mm, full retract every 3 pecks
    Alloy steel (P40): peck 1.5-2x width, retract 0.08mm, full retract every 3 pecks
    Stainless (M): peck 1-1.5x width, retract 0.1mm, full retract every 2 pecks, HIGH PRESSURE COOLANT
    Titanium (S): peck 0.5-1x width, retract 0.1mm, full retract every 2 pecks, FLOOD COOLANT
    Aluminum (N): peck 3-5x width, retract 0.05mm, full retract every 5 pecks
    Cast iron (K): peck 2-3x width, retract 0.05mm, full retract every 4 pecks (dry OK)
    Hardened steel (H): peck 0.3-0.5x width, retract 0.05mm, full retract every 2 pecks, CBN insert
  - Chip evacuation assessment:
    Wire ChipBreakingEngine for per-material chip form in groove
    If chip form = continuous/stringy: reduce peck depth, add oscillation
    If chip form = broken/segmented: can increase peck depth
  - Coolant strategy per groove type:
    OD groove: external flood sufficient
    Face groove: through-tool preferred (chip trapped in face groove)
    ID groove: high-pressure through-tool mandatory
    Deep groove (>5x width): high-pressure + peck retract for flush
  - 4-LOOP:
    L1-BUILD: Implement material-specific peck tables + chip evaluation + coolant logic
    L2-SCRUTINIZE: /prism-review -- verify peck depths are conservative, coolant recommendations correct
    L3-GAP_FILL: Test all 7 ISO material groups, verify peck depth selection
  - FILES_MODIFIED: src/engines/GrooveClassificationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | peck depth too aggressive for Ti | coolant not required for deep ID groove | hardened steel peck > 0.5x width
  - ROLLBACK: revert peck intelligence additions

**>> /compact checkpoint after U-LPG03**

#### SESSION 20: Parting Intelligence + Part Catcher (U-LPG04..U-LPG06)
```
SMART CONFIG: Role=PartingSpecialist + SafetyEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: PartOffForceEngine (~300L), KienzleForceModelEngine (~600L)
  TRIBAL: TribalKnowledgeEngine (parting, cutoff, part catcher)
  FORMULAS:
    Parting force: Fc = kc1.1 * blade_width * feed^(1-mc)
    Feed reduction: f_center = f_nominal * (D_remaining / D_start)^0.5
    RPM at center: limited by G50 or minimum safe RPM
    Part catcher timing: activate M21 when d_remaining <= 2 * blade_width
  REFERENCE: Sandvik CoroCut parting guide, Iscar TANG-GRIP catalog
INTENT: Safe, reliable parting with feed reduction curves, RPM control at small diameters,
  peck strategies for difficult materials, and physics-based part catcher timing.
SKILLS: /gcode, /safety-validation-guide, /defaults
```

**U-LPG04**: Parting/cutoff feed reduction and RPM control
  - Feed reduction curve as diameter decreases:
    Standard: f = f_nominal (constant until center approach)
    Center approach (D < 5mm): f = f_nominal * 0.5 (reduce deflection at thin core)
    At center (D < 2*blade_width): f = f_nominal * 0.25 (prevent snap-off)
  - RPM control during parting:
    G96 CSS: verify G50 clamp prevents dangerous RPM at small diameter
    G97 constant RPM: recommended for parting if machine lacks high-speed CSS response
    Minimum RPM: never below 50 RPM (stalling risk)
    Maximum RPM at final diameter: machine-specific from MachineRegistry
  - Blade width selection:
    Part diameter <= 25mm: 2mm blade
    Part diameter 25-50mm: 3mm blade
    Part diameter 50-100mm: 4mm blade
    Part diameter > 100mm: 5-6mm blade
    Always: minimize blade width to reduce material waste
  - 4-LOOP:
    L1-BUILD: Implement feed curve + RPM control + blade selection
    L2-SCRUTINIZE: /prism-review -- verify feed reduction prevents snap-off, RPM limits safe
    L3-GAP_FILL: Test with 3 diameters (20mm, 50mm, 100mm), verify feed/RPM profiles
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | no feed reduction at center | RPM uncontrolled at small dia | blade too wide for diameter
  - ROLLBACK: revert parting additions

**U-LPG05**: Peck cutoff for difficult materials + part catcher timing physics
  - Peck cutoff strategy:
    304 stainless: peck 2mm deep, retract 0.3mm, dwell 0.5s (work hardening prevention)
    Inconel 718: peck 1mm deep, retract 0.5mm, dwell 1.0s, HIGH PRESSURE COOLANT
    Titanium: peck 1.5mm deep, retract 0.3mm, flood coolant
    Aluminum: no peck needed (continuous chip, not stringy in parting)
    Carbon steel: peck only if diameter > 60mm or blade overhang > 25mm
  - Part catcher timing physics:
    Activation diameter: d_activate = 2 * blade_width + 1mm (safety margin)
    At activation: output M21 (part catcher advance) or M-code per machine
    Dwell after activation: 0.3-0.5s for catcher to position
    Continue parting through remaining core
    After cutoff: M22 (part catcher retract) or equivalent
    Controller-specific M-codes: Fanuc M21/M22, Haas M21/M22, Okuma M71/M72,
      Mazak M65/M66, Citizen M28/M29
  - Part weight check: verify part catcher capacity > part weight
  - 4-LOOP:
    L1-BUILD: Implement peck cutoff per material + part catcher M-code + timing
    L2-SCRUTINIZE: /prism-review -- verify activation diameter safe, M-codes correct per controller
    L3-GAP_FILL: Test peck cutoff for stainless + Inconel, verify catcher timing sequence
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | catcher activates too late (snap-off) | wrong M-code for controller | no peck for Inconel
  - ROLLBACK: revert peck/catcher additions

**U-LPG06**: Parting coolant strategy and blade stress analysis
  - Coolant strategy during parting:
    Standard flood: M08, sufficient for carbon steel < 50mm dia
    High-pressure directed: required for stainless, Ti, Inconel (chip evacuation from groove)
    Through-blade coolant: preferred for all deep parting (some tool systems support this)
    MQL: NOT recommended for parting (insufficient chip evacuation)
    Dry: only for cast iron parting
  - Blade stress analysis:
    Wire PartOffForceEngine for force calculation during cutoff
    Blade deflection: delta = Fc * L^3 / (3 * E * I)
    Maximum stress: sigma = Fc * L / S (S = section modulus = b*t^2/6)
    If stress > 50% of blade material yield: flag -- reduce feed or use shorter overhang
    Chatter risk: if L/t > 10 (overhang/blade thickness), high chatter probability
  - 4-LOOP:
    L1-BUILD: Wire PartOffForceEngine, implement coolant strategy + stress check
    L2-SCRUTINIZE: /prism-review -- verify stress formula, coolant recommendations safe
    L3-GAP_FILL: Test blade stress at various overhangs, verify chatter flagging
  - FILES_MODIFIED: src/engines/LatheOrchestrationEngine.ts
  - ABORT_CRITERIA: >3 TS errors | MQL recommended for parting | blade stress not checked | L/t ratio not flagged
  - ROLLBACK: revert coolant/stress additions

#### SESSION 21: Tests + Wiring (U-LPG07..U-LPG08)
```
SMART CONFIG: Role=TestEngineer + GroovingValidator | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=25%
KNOWLEDGE:
  ENGINES: All MS4b engines
  REFERENCE: Sandvik grooving guide test data
INTENT: Comprehensive testing of all groove types, peck strategies, parting scenarios.
SKILLS: /test, /forge-tests
```

**U-LPG07**: Tests -- 15+ (all groove types, peck strategies, parting scenarios)
  - Test: all 8 groove types classification + tool selection
  - Test: plunge-and-shift for wide groove (verify shift pattern)
  - Test: peck depth by material (verify all 7 ISO groups)
  - Test: parting feed reduction curve
  - Test: part catcher timing for 5 controllers
  - Test: blade stress check at various overhangs
  - 4-LOOP:
    L1-BUILD: Create comprehensive grooving/parting test suite
    L2-SCRUTINIZE: /prism-review -- verify test assertions use real machining data
    L3-GAP_FILL: Run all tests, 0 failures
  - FILES_CREATED: src/__tests__/lathe-grooving-parting.test.ts
  - ABORT_CRITERIA: >3 failures | groove type misidentified in test | || true pattern
  - ROLLBACK: revert test file

**U-LPG08**: Wire dispatchers + grooving/parting actions
  - Actions: `turning_groove_classify`, `turning_groove_deep_cycle`,
    `turning_groove_peck_params`, `turning_partoff_optimize`,
    `turning_partoff_catcher_timing`, `turning_partoff_blade_stress`
  - 4-LOOP:
    L1-BUILD: Add 6 actions to turningDispatcher
    L2-SCRUTINIZE: /prism-review -- verify schemas
    L3-GAP_FILL: Test each action via dispatcher
  - FILES_MODIFIED: src/tools/dispatchers/turningDispatcher.ts
  - ABORT_CRITERIA: >3 TS errors | routing fails | schema mismatch
  - ROLLBACK: restore dispatcher

**FORGE-TRIPLE:**
  HOOK: `groove-depth-gate` -- validates groove depth/width ratio for blade stress safety
  ACTION: `prism_turning:turning_groove_optimize`
  SKILL: `/lathe-groove` (NEW -- grooving and parting assistant)

**EXIT GATE:** check All 8 groove types classify correctly |
  check Plunge-and-shift generates correct pattern |
  check Peck depths match material tables |
  check Parting feed reduction applied at center approach |
  check Part catcher timing activates at correct diameter |
  check Blade stress flagged when L/t > 10 |
  check 15+ tests pass | omega_floor >= 0.85 | SVI delta: +3%

**FEATURE CASCADE:**
  NEW_HOOKS: groove-depth-gate
  NEW_ACTIONS: turning_groove_classify, turning_groove_deep_cycle, turning_groove_peck_params,
    turning_partoff_optimize, turning_partoff_catcher_timing, turning_partoff_blade_stress
  NEW_SKILLS: /lathe-groove
  AVAILABLE_TO: MS5 (groove in hard turning), MS6a/MS6b (Swiss grooving/parting), MS7 (chip control in groove)

---

### MILESTONE MS5: Hard Turning, Finishing & Grinding Replacement
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS0, MS4a
**Addresses:** Hard Turning (34->75)
**Unchanged from v2.0** -- retained as-is (Hard Turning agent scored 81, above threshold)

Units U-LPF01 through U-LPF08 as defined in v2.0 with full 4-LOOP per unit.
Each unit includes FILES_CREATED/MODIFIED, ABORT_CRITERIA (>=3), ROLLBACK procedure.

**FORGE-TRIPLE:**
  HOOK: `surface-integrity-gate` -- blocks hard turning programs violating white layer/stress specs
  ACTION: `prism_turning:turning_grinding_replacement_analysis`
  SKILL: `/hard-turn`

**EXIT GATE:** check CBN selection correct for hardness range |
  check White layer model produces correct depth vs VB |
  check Grinding replacement report generates side-by-side comparison |
  check 15+ tests pass | omega_floor >= 0.85 | SVI delta: +3%

**FEATURE CASCADE:**
  NEW_HOOKS: surface-integrity-gate
  NEW_ACTIONS: turning_grinding_replacement_analysis
  NEW_SKILLS: /hard-turn
  AVAILABLE_TO: MS8 (surface integrity reporting), MS10 (CBN cost vs grinding cost)

---

### MILESTONE MS6a: Multi-Channel G-Code Emission (NEW SPLIT from v2 MS6)
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS0
**Addresses:** Swiss/Mill-Turn (34->70)
**v3.0 Changes:** Split from combined MS6 into dedicated multi-channel G-code milestone.
  Focus: connect assembleProgram() to calculateMultiChannel(), output $1/$2 channel files
  for 5 dialects. This is the CODE EMISSION layer.
**Engine to Wire:** MillTurnSwissPipelineEngine (2125L -- already has calculateMultiChannel())

#### SESSION 22: Multi-Channel Sync Code Output (U-LPM01..U-LPM03)
```
SMART CONFIG: Role=SwissSpecialist + MultiChannelProgrammer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=45%
KNOWLEDGE:
  ENGINES: MillTurnSwissPipelineEngine (2125L -- has calculateMultiChannel(), needs wiring to output),
           TurningProgramAssemblerEngine (2615L), PostProcessorPipelineEngine (38 stages)
  TRIBAL: TribalKnowledgeEngine (Swiss programming, sync codes, multi-channel)
  FORMULAS: Channel balance: CT = max(T_ch1, T_ch2) + T_sync_overhead
  REFERENCE: Citizen Cincom M32 Programming Manual ($1/$2 format, !L/!R wait codes),
             Star SR-20 Programming Manual (M200/M201 sync),
             Tsugami B0326 Manual ($1/$2 + M96/M97),
             Mazak Integrex Programming Manual (!C1/!C2),
             DMG MORI NTX Manual (CHANDATA(1)/CHANDATA(2) + WAITM)
INTENT: The Swiss agent scored 34/100 because v2 MS6 tried to cover everything in 8 units.
  MS6a focuses ONLY on multi-channel G-code emission: connecting the existing
  calculateMultiChannel() method to assembleProgram() output, generating proper $1/$2
  channel files with sync codes for 5 Swiss/mill-turn dialects. This is the CRITICAL PATH
  for Swiss programming -- without channel files, you have nothing.
SKILLS: /gcode, /ppg-quick-start, /navigate
```

**U-LPM01**: Connect assembleProgram() -> calculateMultiChannel() -> channel file output
  - Wire MillTurnSwissPipelineEngine.calculateMultiChannel() output into program assembly
  - Channel file structure per dialect:
    Citizen: %O0001($1)\n[main spindle program]\n%\n%O0001($2)\n[sub spindle program]\n%
    Star: Single file with M200 (start $2) / M201 (wait $2) / M202 (end $2) markers
    Tsugami: %O0001($1) / %O0002($2), M96 (wait for $2) / M97 (signal $2)
    Mazak: !C1\n[channel 1]\n!C2\n[channel 2] with WAITM sync points
    DMG MORI: CHANDATA(1)\n[ch1]\nCHANDATA(2)\n[ch2]\nWAITM(1,2,marker_id)
  - Sync point generation:
    Tool change sync: both channels must be at safe position
    Part transfer sync: main spindle stop + sub-spindle advance + grip + cutoff
    Simultaneous cutting start: both channels begin cutting at same instant
    End-of-part sync: both channels complete before bar pull
  - Output: separate files per channel (or single file with markers, per dialect)
  - 4-LOOP:
    L1-BUILD: Wire calculateMultiChannel() to assembleProgram(), implement 5 channel file formats
    L2-SCRUTINIZE: /prism-review -- verify sync points prevent collision, channel files parse correctly
    L3-GAP_FILL: Test with simple 2-channel part (OD turn on $1, bore on $2), verify 5 dialect outputs
  - FILES_MODIFIED: src/engines/MillTurnSwissPipelineEngine.ts, src/engines/TurningProgramAssemblerEngine.ts
  - ABORT_CRITERIA: >3 TS errors | channel files don't contain all operations | sync points missing at part transfer | any dialect produces syntax error
  - ROLLBACK: revert both engine modifications

**U-LPM02**: Sync code verification engine (collision prevention)
  - For each sync point: verify both channels are at safe position
    Safe = all axes retracted, no tool in cutting zone
  - Deadlock detection: if $1 waits for $2 and $2 waits for $1, report deadlock
  - Sync point minimization: merge adjacent sync points if possible
  - Timing analysis: estimate wait time at each sync point
  - Controller-specific sync verification:
    Citizen !L/!R: verify matching pairs (every !L in $1 has !R in $2)
    Star M200/M201: verify M200 before M201 in execution order
    Mazak WAITM: verify WAITM marker IDs match between channels
    DMG MORI: verify WAITM(channel_list, marker_id) consistency
  - 4-LOOP:
    L1-BUILD: Create SyncCodeVerificationEngine.ts with collision + deadlock detection
    L2-SCRUTINIZE: /prism-review -- verify deadlock detection catches circular waits
    L3-GAP_FILL: Test with intentional deadlock scenario, verify detection
  - FILES_CREATED: src/engines/SyncCodeVerificationEngine.ts
  - FILES_MODIFIED: src/engines/MillTurnSwissPipelineEngine.ts (wire as post-generation check)
  - ABORT_CRITERIA: >3 TS errors | deadlock not detected | unmatched sync codes allowed | collision not flagged
  - ROLLBACK: revert SyncCodeVerificationEngine.ts; restore pipeline

**U-LPM03**: Part transfer sequence generation (main -> sub-spindle)
  - Part transfer sequence:
    1. Both channels at safe position (sync)
    2. Sub-spindle advance to part grip position (Z-axis)
    3. Sub-spindle collet close (M-code per machine)
    4. Main spindle: verify sub-spindle has gripped (sensor check M-code)
    5. Cutoff tool advance and part off
    6. Sub-spindle retract with part to Op2 position
    7. Release sync: sub-spindle can begin Op2, main can begin next part
  - M-code mapping per controller:
    Citizen: M81 (sub advance), M11 (sub clamp), M68 (cutoff pos), M12 (sub unclamp)
    Star: M210 (sub advance), M36 (sub clamp), M200 (sync), M37 (sub unclamp)
    Tsugami: M81 (sub advance), M11 (sub clamp), M96/M97 (sync)
  - Cutoff-to-transfer coordination:
    Cutoff must occur AFTER sub-spindle grip confirmed
    Sub-spindle RPM must match main spindle RPM during transfer (phase sync)
  - 4-LOOP:
    L1-BUILD: Implement part transfer sequence generator for 5 dialects
    L2-SCRUTINIZE: /prism-review -- verify transfer sequence order (grip BEFORE cutoff)
    L3-GAP_FILL: Test with 3 controllers, verify M-code sequence
  - FILES_MODIFIED: src/engines/MillTurnSwissPipelineEngine.ts
  - ABORT_CRITERIA: >3 TS errors | cutoff before grip | RPM mismatch at transfer | wrong M-code for controller
  - ROLLBACK: revert transfer sequence additions

**>> /compact checkpoint after U-LPM03**

#### SESSION 23: Simultaneous Cutting + Gantt Scheduling (U-LPM04..U-LPM06)
```
SMART CONFIG: Role=SwissSpecialist + ProductionEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: MillTurnSwissPipelineEngine (2125L)
  TRIBAL: TribalKnowledgeEngine (Swiss simultaneous cutting, cycle time optimization)
  FORMULAS: Channel balance: CT = max(T_ch1, T_ch2) + sum(T_sync_waits)
  REFERENCE: Swiss-type programming textbooks, machine time studies
INTENT: Optimize multi-channel programs for minimum cycle time by balancing work between
  channels, identifying simultaneous cutting opportunities, and minimizing sync waits.
SKILLS: /cycle-time-crush, /gcode, /navigate
```

**U-LPM04**: Channel balancing optimizer (Gantt scheduler)
  - Wire MillTurnSwissPipelineEngine.multiChannelProgram()
  - Gantt chart representation:
    Each channel = row, each operation = block with start_time + duration
    Sync points = vertical lines connecting channels
    Idle time = gap between operations (highlighted)
  - Critical path identification: longest channel = cycle time
  - Operation reassignment between channels to balance:
    If $1 is 30s and $2 is 10s: move some $1 ops to $2 (if tooling allows)
    Constraint: operation must be physically possible on target channel's tooling
  - Sync point minimization: fewer waits = less idle time
    Merge adjacent syncs: if gap < 0.5s, combine
    Remove unnecessary syncs: if channels are independent for next 3+ ops, defer sync
  - Output: { gantt_data, cycle_time_s, idle_pct, sync_count, balance_ratio }
  - 4-LOOP:
    L1-BUILD: Implement Gantt scheduler with critical path + operation reassignment
    L2-SCRUTINIZE: /prism-review -- verify balance doesn't move ops to channel without tooling
    L3-GAP_FILL: Test with unbalanced program (30s/$1, 10s/$2), verify rebalance
  - FILES_MODIFIED: src/engines/MillTurnSwissPipelineEngine.ts
  - ABORT_CRITERIA: >3 TS errors | operation moved to channel without required tooling | cycle time increases after balance | sync removed causing collision
  - ROLLBACK: revert balance optimizer additions

**U-LPM05**: Simultaneous cutting collision prevention
  - When both channels cut simultaneously:
    Verify tool-to-tool clearance (turret swept volume analysis)
    Verify tool-to-part clearance (consider workpiece between spindles)
    Verify force interaction (opposing forces may cause deflection)
  - Collision zones:
    Zone 1: Main turret vs sub-spindle turret
    Zone 2: Main turret vs part (sub-spindle side)
    Zone 3: Sub turret vs part (main spindle side)
    Zone 4: Tool-to-tool during turret index while other channel cuts
  - If collision detected: add sync point to serialize the operations
  - Force interaction model:
    If both channels apply radial force in same direction: deflection doubles
    If opposing: forces partially cancel (beneficial)
    Output force vector diagram for simultaneous operations
  - 4-LOOP:
    L1-BUILD: Implement collision zone checker + force interaction model
    L2-SCRUTINIZE: /prism-review -- verify all 4 collision zones checked, force direction correct
    L3-GAP_FILL: Test with known collision scenario (turret clash), verify detection
  - FILES_CREATED: src/engines/MultiChannelCollisionEngine.ts
  - FILES_MODIFIED: src/engines/MillTurnSwissPipelineEngine.ts (wire as simultaneous cutting check)
  - ABORT_CRITERIA: >3 TS errors | collision zone missed | force interaction ignored | serialization not added when collision detected
  - ROLLBACK: revert collision engine; restore pipeline

**U-LPM06**: Channel file output + post-processing for all 5 dialects
  - Final output formatting per dialect:
    Citizen: separate program files with % headers, $1/$2 designators
    Star: single file with M200/M201 markers, proper program structure
    Tsugami: separate files with M96/M97 sync codes
    Mazak: !C1/!C2 channel blocks with WAITM sync
    DMG MORI: CHANDATA(1)/CHANDATA(2) blocks with WAITM markers
  - Wire PostProcessorPipelineEngine for per-block speed/feed variability within channels
  - Include: all sync codes, part transfer sequence, bar pull M-codes
  - Program header: channel assignment summary, tool list per channel, cycle time breakdown
  - 4-LOOP:
    L1-BUILD: Implement final output formatting for all 5 dialects with post-processing
    L2-SCRUTINIZE: /prism-review -- verify output files parse correctly for each controller
    L3-GAP_FILL: Test with complete 2-channel part, generate output for all 5 dialects
  - FILES_MODIFIED: src/engines/MillTurnSwissPipelineEngine.ts, src/engines/TurningProgramAssemblerEngine.ts
  - ABORT_CRITERIA: >3 TS errors | any dialect output unparseable | sync codes missing from output | program header missing tool list
  - ROLLBACK: revert output formatting additions

#### SESSION 24: Tests + Wiring (U-LPM07..U-LPM08)
```
SMART CONFIG: Role=TestEngineer + SwissValidator | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=30%
KNOWLEDGE:
  ENGINES: All MS6a engines
  REFERENCE: Machine manuals for all 5 dialects
INTENT: Comprehensive testing of multi-channel output for all 5 Swiss/mill-turn dialects.
SKILLS: /test, /forge-tests
```

**U-LPM07**: Tests -- 15+ (multi-channel, sync verification, collision, balance)
  - Test: 5 dialect outputs (verify syntax per controller manual)
  - Test: sync code matching (no unmatched pairs)
  - Test: deadlock detection (circular wait)
  - Test: part transfer sequence (grip before cutoff)
  - Test: collision detection (intentional collision scenario)
  - Test: channel balance improvement (cycle time reduced)
  - 4-LOOP:
    L1-BUILD: Create comprehensive multi-channel test suite
    L2-SCRUTINIZE: /prism-review -- verify test values match controller manual syntax
    L3-GAP_FILL: Run all tests, 0 failures
  - FILES_CREATED: src/__tests__/lathe-multichannel.test.ts
  - ABORT_CRITERIA: >3 failures | dialect test uses wrong syntax | || true pattern
  - ROLLBACK: revert test file

**U-LPM08**: Wire dispatchers + multi-channel actions
  - Actions: `turning_swiss_multichannel_program`, `turning_swiss_sync_verify`,
    `turning_swiss_channel_balance`, `turning_swiss_collision_check`,
    `turning_swiss_part_transfer`
  - 4-LOOP:
    L1-BUILD: Add 5 actions to turningDispatcher
    L2-SCRUTINIZE: /prism-review -- verify schemas
    L3-GAP_FILL: Test each action via dispatcher
  - FILES_MODIFIED: src/tools/dispatchers/turningDispatcher.ts
  - ABORT_CRITERIA: >3 TS errors | routing fails | schema mismatch
  - ROLLBACK: restore dispatcher

**FORGE-TRIPLE:**
  HOOK: `multi-channel-collision-gate` -- prevents turret-to-turret collision during simultaneous ops
  ACTION: `prism_turning:turning_swiss_multichannel_program`
  SKILL: `/swiss-program` (NEW -- Swiss multi-channel programming assistant)

**EXIT GATE:** check assembleProgram() produces valid channel files for all 5 dialects |
  check Sync codes verified (no unmatched pairs, no deadlocks) |
  check Part transfer sequence safe (grip before cutoff) |
  check Channel balance reduces cycle time vs unbalanced |
  check Simultaneous cutting collision detected and serialized |
  check 15+ tests pass | omega_floor >= 0.85 | SVI delta: +4%

**FEATURE CASCADE:**
  NEW_HOOKS: multi-channel-collision-gate
  NEW_ACTIONS: turning_swiss_multichannel_program, turning_swiss_sync_verify,
    turning_swiss_channel_balance, turning_swiss_collision_check, turning_swiss_part_transfer
  NEW_SKILLS: /swiss-program
  AVAILABLE_TO: MS6b (Swiss production intelligence uses channel output)

---

### MILESTONE MS6b: Swiss Production Intelligence (NEW SPLIT from v2 MS6)
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS6a
**Addresses:** Swiss/Mill-Turn (34->70)
**v3.0 Changes:** Dedicated production intelligence milestone covering guide bush logic,
  Op2 back-work G-code, channel balancing optimizer depth, gang slide layout, and
  bar end detection. This is the INTELLIGENCE layer on top of MS6a's code emission.

#### SESSION 25: Guide Bush + Op2 Back-Work (U-LPS21..U-LPS23)
```
SMART CONFIG: Role=SwissSpecialist + ProductionEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  ENGINES: MillTurnSwissPipelineEngine (2125L)
  TRIBAL: TribalKnowledgeEngine (Swiss guide bush, back-work, bar management)
  FORMULAS:
    Guide bush bar tolerance: h6 (GB mode), h9 (non-GB mode)
    Deflection from bushing: delta = F*L^3/(3*E*I) where L = distance from bushing face
    Collet pressure: P = F_grip / (pi * D * L_contact * mu)
  REFERENCE: Citizen GB/non-GB technical notes, Star guide bush setup manual,
             Bar stock tolerance standards (EN 10278)
INTENT: Guide bush vs non-GB mode intelligence, Op2 back-work generation with coordinate
  reversal, and gang slide layout optimization for Swiss-type machines.
SKILLS: /navigate, /gcode, /defaults
```

**U-LPS21**: Guide bush vs non-GB mode logic
  - Bar tolerance validation:
    Guide bush mode: bar must be h6 tolerance (ground bar, +0/-0.013mm for dia 10-18mm)
    Non-guide-bush: h9 tolerance acceptable (cold-drawn, +0/-0.052mm)
    If bar is h9 and guide bush: flag -- either switch to non-GB or source ground bar
  - Collet pressure calculation for thin-wall parts:
    Main collet: P = F_clamp / (pi * D_bar * L_collet * mu)
    Guide bush collet: P = F_support / (pi * D_bar * L_bushing * mu)
    mu = 0.12 (smooth) | 0.25 (serrated)
  - Deflection model (guide bush mode):
    L measured from bushing face, NOT from main collet
    Much shorter effective L = stiffer cutting = tighter tolerances
    delta_GB = F * L_bushing^3 / (3*E*I) (much less than delta_no_GB)
  - Deflection model (non-guide-bush):
    L measured from main collet
    delta_no_GB = F * L_collet^3 / (3*E*I) (longer L = more deflection)
    Advantage: no bar grade requirement, simpler setup
  - Decision: use GB when tolerance < 0.02mm OR L/D > 4 OR finish Ra < 0.8um
  - 4-LOOP:
    L1-BUILD: Implement GB/non-GB decision engine with deflection comparison
    L2-SCRUTINIZE: /prism-review -- verify deflection formula uses correct L for each mode
    L3-GAP_FILL: Test with 3 scenarios (tight tol -> GB, loose tol -> non-GB, borderline)
  - FILES_MODIFIED: src/engines/MillTurnSwissPipelineEngine.ts
  - ABORT_CRITERIA: >3 TS errors | deflection L wrong for GB mode | h6/h9 check missing | thin-wall pressure not checked
  - ROLLBACK: revert GB/non-GB additions

**U-LPS22**: Op2 (back-working) toolpath generation
  - Z-datum flip for sub-spindle (coordinate system reversal):
    Main spindle: Z0 at face, Z-negative into part
    Sub-spindle: Z0 at face (cut end), Z-positive into part (reversed!)
    Some controllers: Z stays negative (just origin moves to sub-spindle face)
    Controller-specific: Citizen M05/$2 sets sub-spindle coordinate, Star uses W-axis
  - Back-work operations:
    Face to length: face cut end to final part length (Z0 cleanup)
    Bore from back: internal features accessible only from cut end
    Chamfer: break edge at cut end
    Cross-holes: if live tooling on sub-spindle turret, drill radial holes
    Thread from back: internal thread with sub-spindle threading cycle
  - Simultaneous Op2 + Op1:
    While sub-spindle performs Op2 on previous part, main spindle machines next part
    Channel sync: Op2 must complete before next part transfer
    If Op2 longer than Op1: Op2 is the bottleneck -> optimize Op2 first
  - 4-LOOP:
    L1-BUILD: Implement Op2 coordinate reversal + back-work operation set
    L2-SCRUTINIZE: /prism-review -- verify Z-axis direction correct for each controller
    L3-GAP_FILL: Test with 3 back-work scenarios (face, bore, cross-hole), verify coordinates
  - FILES_MODIFIED: src/engines/MillTurnSwissPipelineEngine.ts
  - ABORT_CRITERIA: >3 TS errors | Z-direction wrong for sub-spindle | bore direction reversed | simultaneous timing not checked
  - ROLLBACK: revert Op2 generation additions

**U-LPS23**: Gang slide vs turret logic
  - Detect machine type from MachineRegistry:
    Gang slide: Citizen L/M series, Star SR/SB series, Tsugami BO series
    Turret: Doosan Lynx, Mazak QTN/Integrex, DMG NTX
    Hybrid: some machines have gang + turret (e.g., Citizen D25)
  - Gang slide optimization:
    Tool block layout: arrange tools in X-axis for minimum travel distance
    No index time: tool change = X-axis rapid move (0.1-0.3s vs 1-3s for turret index)
    Constraint: X-travel limited (typically 40-80mm total)
    Tool interference: adjacent tools must not contact workpiece during neighbor's cut
    Layout optimization algorithm: minimize sum of X-travel distances between sequential tools
  - Turret optimization (for mill-turn machines):
    Shortest-path CW/CCW rotation (existing from MS0 U-LPO11)
    BMT vs VDI tooling distinction
    Live tool stations: which positions support driven tools
  - 4-LOOP:
    L1-BUILD: Implement gang slide layout optimizer + turret detector from MachineRegistry
    L2-SCRUTINIZE: /prism-review -- verify gang X-travel within machine limit, interference checked
    L3-GAP_FILL: Test with gang slide (6-tool layout) and turret (12-station), verify optimization
  - FILES_MODIFIED: src/engines/MillTurnSwissPipelineEngine.ts
  - ABORT_CRITERIA: >3 TS errors | gang slide X-travel exceeds machine limit | tool interference not checked | turret rotation direction wrong
  - ROLLBACK: revert gang/turret additions

**>> /compact checkpoint after U-LPS23**

#### SESSION 26: Bar Management + Swiss Tests (U-LPS24..U-LPS28)
```
SMART CONFIG: Role=SwissProductionEngineer + TestEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  ENGINES: MillTurnSwissPipelineEngine (2125L), BarFeederInterfaceEngine (~250L)
  TRIBAL: TribalKnowledgeEngine (bar management, lights-out production)
  FORMULAS: Parts per bar: N = (bar_length - remnant) / (part_length + cutoff_width + facing_stock)
  REFERENCE: LNS/Iemca/FMB bar feeder manuals
INTENT: Complete bar stock production management for lights-out Swiss production: parts-per-bar,
  bar end detection, magazine planning, and comprehensive testing.
SKILLS: /test, /forge-tests, /navigate
```

**U-LPS24**: Bar stock production management
  - Parts-per-bar calculation with remnant tracking:
    N_parts = floor((bar_length - grip_length - remnant_min) / (part_length + cutoff_width + facing_stock))
    Remnant = bar_length - grip_length - N_parts * (part_length + cutoff_width + facing_stock)
    If remnant >= part_length + cutoff: one more part possible
  - Bar end detection macro:
    Method 1: Skip signal (G31) at expected bar end position
    Method 2: Z-axis overtravel alarm detection
    Method 3: Bar feeder signal (M-code + input contact)
    Controller-specific: Citizen M67 (bar feed check), Star M230 (bar end signal)
  - Magazine capacity planning:
    N_bars = ceil(batch_quantity / N_parts_per_bar)
    Magazine capacity (typ 12-20 bars for standard feeder)
    If N_bars > magazine: operator reload schedule
    Total run time = N_bars * (N_parts * cycle_time + bar_change_time)
  - Bar pull vs bar feed M-code generation per machine:
    Citizen: M82 (bar feed to stop), M83 (bar pull)
    Star: M220 (bar feed), M221 (bar pull)
    Generic: M-code from MachineRegistry bar feeder configuration
  - 4-LOOP:
    L1-BUILD: Implement parts-per-bar + bar end detection + magazine planning + M-codes
    L2-SCRUTINIZE: /prism-review -- verify parts-per-bar accounts for grip + cutoff + facing
    L3-GAP_FILL: Test with 3m bar, 25mm part, 3mm cutoff, verify N_parts and remnant
  - FILES_MODIFIED: src/engines/MillTurnSwissPipelineEngine.ts
  - ABORT_CRITERIA: >3 TS errors | parts-per-bar off by 1+ | bar end detection not implemented | wrong M-code for controller
  - ROLLBACK: revert bar management additions

**U-LPS25**: Unmanned production readiness assessment (Swiss-specific)
  - Chip evacuation: chip conveyor rate vs chip volume per part
  - Coolant: filter life prediction from chip volume, coolant temperature
  - Bar feeder: magazine capacity vs batch quantity
  - Part catcher/collection: bin capacity vs batch quantity
  - Tool life: minimum inserts needed for full batch without change
  - Score: GREEN (full lights-out) / YELLOW (periodic check) / RED (attended only)
  - 4-LOOP:
    L1-BUILD: Implement 5-factor unmanned assessment with scoring
    L2-SCRUTINIZE: /prism-review -- verify all 5 factors checked, scoring conservative
    L3-GAP_FILL: Test with lights-out scenario, verify GREEN only when all 5 pass
  - FILES_MODIFIED: src/engines/MillTurnSwissPipelineEngine.ts
  - ABORT_CRITERIA: >3 TS errors | GREEN when any factor fails | tool life not checked
  - ROLLBACK: revert unmanned assessment additions

**U-LPS26**: Tests -- 15+ (guide bush, Op2, gang slide, bar management, lights-out)
  - Test: GB vs non-GB deflection comparison (GB should be lower)
  - Test: Op2 Z-coordinate reversal for 3 controllers
  - Test: Gang slide layout optimization (X-travel minimized)
  - Test: Parts-per-bar calculation (3 bar lengths, 3 part lengths)
  - Test: Bar end detection M-code per controller
  - Test: Unmanned readiness scoring (all pass -> GREEN, one fail -> YELLOW)
  - 4-LOOP:
    L1-BUILD: Create comprehensive Swiss production test suite
    L2-SCRUTINIZE: /prism-review -- verify test values realistic for Swiss production
    L3-GAP_FILL: Run all tests, 0 failures
  - FILES_CREATED: src/__tests__/lathe-swiss-production.test.ts
  - ABORT_CRITERIA: >3 failures | GB deflection test wrong | parts-per-bar off | || true pattern
  - ROLLBACK: revert test file

**U-LPS27**: Wire dispatchers + Swiss production actions
  - Actions: `turning_swiss_guide_bush_mode`, `turning_swiss_op2_generate`,
    `turning_swiss_gang_layout`, `turning_swiss_bar_management`,
    `turning_swiss_unmanned_score`
  - 4-LOOP:
    L1-BUILD: Add 5 actions to turningDispatcher
    L2-SCRUTINIZE: /prism-review -- verify schemas
    L3-GAP_FILL: Test each action via dispatcher
  - FILES_MODIFIED: src/tools/dispatchers/turningDispatcher.ts
  - ABORT_CRITERIA: >3 TS errors | routing fails | schema mismatch
  - ROLLBACK: restore dispatcher

**U-LPS28**: Integration test -- complete Swiss part production workflow
  - Full flow: bar stock -> feature extraction -> multi-channel program -> Op2 ->
    bar management -> unmanned assessment
  - Test with 2 parts: simple pin (OD only) and complex Swiss part (OD + bore + cross-hole + thread)
  - Verify: channel files generate, sync codes valid, parts-per-bar correct, lights-out score
  - 4-LOOP:
    L1-BUILD: Create end-to-end Swiss integration test
    L2-SCRUTINIZE: /prism-review -- verify both parts exercise full Swiss pipeline
    L3-GAP_FILL: Run integration test, verify complete output
  - FILES_CREATED: src/__tests__/lathe-swiss-integration.test.ts
  - ABORT_CRITERIA: >2 workflow failures | channel files missing | sync codes invalid
  - ROLLBACK: revert test file

**FORGE-TRIPLE:**
  HOOK: `swiss-production-readiness-gate` -- blocks Swiss programs without bar management plan
  ACTION: `prism_turning:turning_swiss_production_plan`
  SKILL: `/swiss-production` (NEW -- Swiss production planning assistant)

**EXIT GATE:** check Guide bush mode selects correctly based on tolerance + L/D |
  check Op2 Z-coordinate reversal correct for all controllers |
  check Gang slide layout minimizes X-travel |
  check Parts-per-bar calculation accurate |
  check Bar end detection generates correct M-code |
  check Unmanned score conservative (GREEN only when all 5 factors pass) |
  check 15+ tests pass | omega_floor >= 0.85 | SVI delta: +4%

**FEATURE CASCADE:**
  NEW_HOOKS: swiss-production-readiness-gate
  NEW_ACTIONS: turning_swiss_guide_bush_mode, turning_swiss_op2_generate,
    turning_swiss_gang_layout, turning_swiss_bar_management, turning_swiss_unmanned_score,
    turning_swiss_production_plan
  NEW_SKILLS: /swiss-production
  AVAILABLE_TO: MS10 (Swiss cost optimization), MS11 (Swiss shop floor integration)

---

### MILESTONE MS7: Chip Control & Coolant Strategy
**Priority:** HIGH | **Units:** 6 | **Sessions:** 2
**Depends on:** MS0
**Addresses:** Chip Control (18->75)
**Unchanged from v2.0** -- retained as-is (Chip Control agent scored 73, above threshold)

Units U-LPC01 through U-LPC06 as defined in v2.0 with full 4-LOOP per unit.
Each unit includes FILES_CREATED/MODIFIED, ABORT_CRITERIA (>=3), ROLLBACK procedure.

**FORGE-TRIPLE:**
  HOOK: `chip-control-gate` -- blocks programs with unresolved chip wrapping risk
  ACTION: `prism_turning:turning_chip_analysis`
  SKILL: `/chip-control`

**EXIT GATE:** check Chipbreaker window validation works for 3 manufacturer formats |
  check Coolant decision matrix covers all material x operation combos |
  check Unmanned readiness score assigns RED for unresolved chip wrapping |
  check 10+ tests pass | omega_floor >= 0.85 | SVI delta: +3%

**FEATURE CASCADE:**
  NEW_HOOKS: chip-control-gate
  NEW_ACTIONS: turning_chip_analysis
  NEW_SKILLS: /chip-control
  AVAILABLE_TO: MS4b (groove chip control), MS6b (Swiss chip evacuation), MS10 (coolant cost)

---

## PHASE E: QUALITY & COMPLIANCE

---

### MILESTONE MS8: GD&T, Inspection & Metrology Intelligence
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS2
**Addresses:** Metrology (34->80)
**Unchanged from v2.0** -- retained as-is

Units U-LPQ01 through U-LPQ08 as defined in v2.0 with full 4-LOOP per unit.

**FORGE-TRIPLE:**
  HOOK: `inspection-plan-gate` -- blocks programs for aerospace parts without FAI plan
  ACTION: `prism_turning:turning_inspection_plan`
  SKILL: `/quality-check lathe`

**EXIT GATE:** check FAI forms 1/2/3 generate per AS9102 |
  check CMM program output compatible with PC-DMIS/Calypso |
  check Gage R&R check < 10% of tolerance |
  check 15+ tests pass | omega_floor >= 0.85 | SVI delta: +3%

**FEATURE CASCADE:**
  NEW_HOOKS: inspection-plan-gate
  NEW_ACTIONS: turning_inspection_plan
  NEW_SKILLS: /quality-check lathe
  AVAILABLE_TO: MS9 (FAI for compliance), MS12 (measurement visualization)

---

### MILESTONE MS9: Quality Compliance (AS9100/ISO 13485/FDA)
**Priority:** HIGH | **Units:** 6 | **Sessions:** 2
**Depends on:** MS8
**Addresses:** Aerospace (28->75), Medical (18->65)
**Unchanged from v2.0** -- retained as-is

Units U-LPR01 through U-LPR06 as defined in v2.0 with full 4-LOOP per unit.

**FORGE-TRIPLE:**
  HOOK: `material-traceability-gate` -- blocks programs without verified material cert
  ACTION: `prism_turning:turning_compliance_check`
  SKILL: `/quality-gate lathe`

**EXIT GATE:** check Material traceability chain complete (heat lot -> program -> serial) |
  check DHR output meets 21 CFR Part 11 structure |
  check Biocompatible material rules enforced (no iron on Ti) |
  check 10+ tests pass | omega_floor >= 0.85 | SVI delta: +2%

**FEATURE CASCADE:**
  NEW_HOOKS: material-traceability-gate
  NEW_ACTIONS: turning_compliance_check
  NEW_SKILLS: /quality-gate lathe
  AVAILABLE_TO: MS11 (compliance in shop floor), all aerospace/medical workflows

---

## PHASE F: PRODUCTION & ECONOMICS

---

### MILESTONE MS10: Cost Optimization & Batch Economics
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS0, MS1
**Addresses:** Cost (31->75), Process (58->80)
**Unchanged from v2.0** -- retained as-is

Units U-LPE01 through U-LPE08 as defined in v2.0 with full 4-LOOP per unit.

**FORGE-TRIPLE:**
  HOOK: `cost-sanity-gate` -- warns when predicted cost-per-part exceeds industry benchmarks
  ACTION: `prism_turning:turning_cost_optimize`
  SKILL: `/cost-optimize lathe`

**EXIT GATE:** check 7 cost buckets computed for 3 part families |
  check Gilbert optimizer Vc_max_production != Vc_min_cost |
  check Bar nesting optimizer reduces waste |
  check 15+ tests pass | omega_floor >= 0.85 | SVI delta: +3%

**FEATURE CASCADE:**
  NEW_HOOKS: cost-sanity-gate
  NEW_ACTIONS: turning_cost_optimize
  NEW_SKILLS: /cost-optimize lathe
  AVAILABLE_TO: MS11 (cost in shop floor), MS-2 (cost preview in wizard)

---

### MILESTONE MS11: Shop Floor Integration & Deployment
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS10
**Addresses:** Shop Floor (28->70)
**Unchanged from v2.0** -- retained as-is (Shop Floor agent scored 90, above threshold)

Units U-LPD01 through U-LPD08 as defined in v2.0 with full 4-LOOP per unit.

**FORGE-TRIPLE:**
  HOOK: `release-gate` -- blocks DNC transfer without approval chain complete
  ACTION: `prism_turning:turning_program_release`
  SKILL: `/ship lathe`

**EXIT GATE:** check DNC transfer works for 3 protocols (FTP, USB, RS-232) |
  check Tool presetter import validates tool-program match |
  check Program revision tracking with diff |
  check 15+ tests pass | omega_floor >= 0.85 | SVI delta: +2%

**FEATURE CASCADE:**
  NEW_HOOKS: release-gate
  NEW_ACTIONS: turning_program_release
  NEW_SKILLS: /ship lathe
  AVAILABLE_TO: External (production deployment)

---

## PHASE G: VERIFICATION & TRUST

---

### MILESTONE MS12: Simulation, Verification & Visualization
**Priority:** HIGH | **Units:** 8 | **Sessions:** 3
**Depends on:** MS-2, MS0
**Addresses:** Simulation (22->80), Competitive (72->85)
**Unchanged from v2.0** -- retained as-is (Simulation agent scored 80, above threshold)

Units U-LPV01 through U-LPV08 as defined in v2.0 with full 4-LOOP per unit.

**FORGE-TRIPLE:**
  HOOK: `simulation-verification-gate` -- blocks program release until simulation finds zero gouges
  ACTION: `prism_turning:turning_simulate`
  SKILL: `/cnc-simulate lathe`

**EXIT GATE:** check Material removal simulation detects gouges |
  check Before/after profile overlay renders correctly |
  check Kinematic collision catches turret clash |
  check G-code re-parse catches modal errors |
  check Cycle time within 5% of machine actual |
  check 15+ tests pass | omega_floor >= 0.85 | SVI delta: +3%

**FEATURE CASCADE:**
  NEW_HOOKS: simulation-verification-gate
  NEW_ACTIONS: turning_simulate
  NEW_SKILLS: /cnc-simulate lathe
  AVAILABLE_TO: MS-2 (UI backplot), all users (verification before production)

---

## SUMMARY STATISTICS

| Metric | v1.0 | v2.0 | v3.0 | Delta v2->v3 |
|--------|------|------|------|--------------|
| Milestones | 8 | 15 | **17** | +2 |
| Total Units | 62 | 126 | **142** | +16 |
| Estimated Sessions | 24 | 42 | **48** | +6 |
| New Engines Created | 14 | 22 | **30** | +8 |
| Existing Engines Wired | 0 | 35 | **35** | +0 |
| Safety Stages | 0 | 5 | 5 | +0 |
| Orchestrator Stages | 30 | 35 | 35 | +0 |
| Controller Dialects | 6 | 8 | 8 | +0 |
| Swiss Dialects | 0 | 5 | **5 (deep)** | depth increase |
| Thread Forms | 0 | 10 | **10 (deep)** | depth increase |
| Groove Types | 0 | 8 | **8 (deep)** | depth increase |
| Part Families | 12 | 15 | 15 | +0 |
| UI Pages | 0 | 4 | 4 | +0 |
| Hooks Created | 8 | 18+ | **21+** | +3 |
| Dispatcher Actions | 20 | 45+ | **70+** | +25 |
| Skills Created | 6 | 12+ | **16+** | +4 |

### New Engines Created in v3.0 (30 total)

| # | Engine | Milestone | Purpose |
|---|--------|-----------|---------|
| 1 | TurningPrintIntakeEngine | MS-1 | Photo/PDF -> TurningFeature[] |
| 2 | MaterialCalloutParserEngine | MS-1 | Material string -> registry lookup |
| 3 | ToleranceExtractionEngine | MS-1 | Tolerance/GD&T extraction |
| 4 | TurningCADImportEngine | MS-1 | STEP/IGES import |
| 5 | StockSelectionEngine | MS-1 | Bar stock sizing |
| 6 | AmbiguityResolutionEngine | MS-1 | Missing dimension detection |
| 7 | **TurningRevProfileEngine** | **MS-1** | **3D STEP -> 2D XZ silhouette (NEW v3)** |
| 8 | **TurningFeatureTaxonomyEngine** | **MS-1** | **Profile segment -> feature type (NEW v3)** |
| 9 | **FitNotationParserEngine** | **MS-1** | **H7/g6 -> tolerance bands (NEW v3)** |
| 10 | **ISO2768ApplicatorEngine** | **MS-1** | **General tolerance applicator (NEW v3)** |
| 11 | LatheOrchestrationEngine | MS0 | 35-stage pipeline |
| 12 | LathePartClassifierEngine | MS3 | 15 part families |
| 13 | LatheSequenceOptimizerEngine | MS3 | Multi-criteria optimization |
| 14 | LatheMultiOpPlannerEngine | MS3 | Op1/Op2 planning |
| 15 | **TrilobeDeformationEngine** | **MS3** | **3-jaw ring distortion physics (NEW v3)** |
| 16 | **SoftJawBoringGCodeEngine** | **MS3** | **G71/G70 bore cycle for jaws (NEW v3)** |
| 17 | **ExpandingMandrelEngine** | **MS3** | **Lame equation bore grip (NEW v3)** |
| 18 | **FaceDriverTorqueEngine** | **MS3** | **Friction pin transmission (NEW v3)** |
| 19 | GrooveClassificationEngine | MS4b | 8 groove types |
| 20 | SyncCodeVerificationEngine | MS6a | Multi-channel sync validation |
| 21 | MultiChannelCollisionEngine | MS6a | Simultaneous cutting collision |
| 22-30 | (Various per v2.0 milestones) | MS1-MS12 | As specified in v2.0 |

---

## PROJECTED SCRUTINY SCORES (v2 -> v3)

| # | Agent | v1 | v2 | v3 Target | v3 Key Improvement |
|---|-------|-----|-----|-----------|-------------------|
| 1 | CNC Programmer | 68 | 84 | **85** | Unchanged (already above target) |
| 2 | Safety Engineer | 38 | 82 | **83** | Unchanged |
| 3 | Process Engineer | 58 | 85 | **86** | Unchanged |
| 4 | Tooling Specialist | 52 | 84 | **85** | Unchanged |
| 5 | Metrology Expert | 34 | 65 | **68** | ISO 2768 applicator + fit notation parser improve tolerance handling |
| 6 | Controller Expert | 58 | 81 | **83** | Complete 8-dialect threading cycles in MS4a |
| 7 | Physics Scientist | 58 | 82 | **84** | Trilobe + Lame + face driver physics in MS3 |
| 8 | Aerospace Quality | 28 | 67 | **69** | Unchanged |
| 9 | **Swiss/Mill-Turn** | **31** | **34** | **71** | **MS6a (channel emission) + MS6b (production intelligence) = 16 dedicated units** |
| 10 | UX Architect | 22 | 78 | **79** | Unchanged |
| 11 | **Threading Expert** | **28** | **44** | **73** | **MS4a (8u deep threading) + MS4b (8u deep grooving) = 16 dedicated units** |
| 12 | Hard Turning | 34 | 81 | **82** | Unchanged |
| 13 | Shop Floor | 28 | 90 | **91** | Unchanged |
| 14 | Chip Control | 18 | 73 | **75** | Grooving chip control in MS4b feeds into MS7 |
| 15 | Cost Expert | 31 | 74 | **76** | Swiss cost optimization via MS6b bar management |
| 16 | **CAD/CAM Integration** | **28** | **46** | **72** | **4 new units: RevProfile + FeatureTaxonomy + FitNotation + ISO2768** |
| 17 | Simulation/Verify | 22 | 80 | **81** | Unchanged |
| 18 | **Workholding** | **28** | **49** | **72** | **4 new units: Trilobe + SoftJawBoring + Mandrel + FaceDriver** |
| 19 | Medical Device | 18 | 66 | **68** | Unchanged |
| 20 | Competitive Intel | 72 | 82 | **84** | Swiss + threading depth improves overall capability score |
| **AVG** | | **37.4** | **72.3** | **81.6** | **+9.3 from v2, +44.2 from v1** |

### Score Distribution (v3 projection)

| Range | v1 Count | v2 Count | v3 Count |
|-------|----------|----------|----------|
| 80-100 | 0 | 10 | **12** |
| 70-79 | 0 | 0 | **6** |
| 60-69 | 2 | 7 | **2** |
| 40-59 | 4 | 3 | **0** |
| 20-39 | 10 | 0 | **0** |
| 0-19 | 4 | 0 | **0** |

**All 4 agents below 60 in v2 are now projected above 70 in v3.**
**No agent below 68. Previous v2 had 3 agents in 40-59 range.**

---

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
- Review-gate: blocks engine edits when engine_edits_since_review > 3 without /prism-review
- Thread-class-gate: validates pitch diameter within class tolerance (NEW MS4a)
- Groove-depth-gate: validates groove depth/width ratio for blade stress (NEW MS4b)
- Multi-channel-collision-gate: prevents turret collision during simultaneous ops (NEW MS6a)
- Swiss-production-readiness-gate: blocks Swiss programs without bar plan (NEW MS6b)
- Input-completeness-gate: blocks orchestrator if required features missing (NEW MS-1)
- Trilobe-deformation-gate: warns when clamping deformation exceeds tolerance (NEW MS3)

---

## EXECUTION ORDER (recommended timeline)

```
Week 1-2:   MS-1 (Input Pipeline, 12u) -> MS0 (Orchestrator+Safety, 14u)
Week 3:     MS-2 (UI, 8u) + MS1 (Insert Wear, 8u) [parallel]
Week 4-5:   MS2 (Offset+Thermal, 10u) + MS3 (Sequence+Workholding, 14u) [parallel]
Week 6:     MS4a (Threading Deep, 8u) + MS7 (Chip Control, 6u) [parallel]
Week 7:     MS4b (Grooving Deep, 8u) + MS5 (Hard Turning, 8u) [parallel]
Week 8:     MS6a (Multi-Channel Emission, 8u) [depends on MS0, standalone]
Week 9:     MS6b (Swiss Production, 8u) [depends on MS6a]
Week 10:    MS8 (Inspection, 8u) + MS10 (Cost, 8u) [parallel]
Week 11:    MS9 (Quality, 6u) + MS11 (Shop Floor, 8u) [parallel]
Week 12:    MS12 (Simulation, 8u)
Week 13:    Integration testing + 20-agent re-scrutiny for v3 scoring
```

### Dependency-aware Critical Path

```
CRITICAL PATH (longest sequence):
  MS-1 (12u, 4 sess) -> MS0 (14u, 5 sess) -> MS6a (8u, 3 sess) -> MS6b (8u, 3 sess)
  = 42 units, 15 sessions -- this is the bottleneck

PARALLEL TRACKS after MS0:
  Track A: MS1 -> MS2 -> MS8 -> MS9           (32u, 12 sessions)
  Track B: MS3                                 (14u, 5 sessions)
  Track C: MS4a -> MS4b -> MS5                 (24u, 9 sessions)
  Track D: MS6a -> MS6b                        (16u, 6 sessions)
  Track E: MS7                                 (6u, 2 sessions)
  Track F: MS10 -> MS11                        (16u, 6 sessions)
  Track G: MS-2 -> MS12                        (16u, 6 sessions)

All tracks can start in parallel after MS0 completes (except MS6b depends on MS6a,
MS4b depends on MS4a, and some cross-milestone deps).
```

### /compact Checkpoint Schedule

```
Session  1: after U-LPI03 (MS-1 Session 1 complete)
Session  2: after U-LPI06 (MS-1 Session 2 complete)
Session  3: after U-LPI12 (MS-1 Session 3 complete)
Session  5: after U-LPU03 (MS-2 Session 4 complete)
Session  7: after U-LPO03 (MS0 Session 7 complete)
Session  8: after U-LPO06 (MS0 Session 8 complete)
Session  9: after U-LPO09 (MS0 Session 9 complete)
Session 12: after U-LPS03 (MS3 Session 12 complete)
Session 13: after U-LPS07 (MS3 Session 13 complete)
Session 14: after U-LPS10 (MS3 Session 14 complete)
Session 16: after U-LPH03 (MS4a Session 16 complete)
Session 17: after U-LPH06 (MS4a Session 17 complete)
Session 19: after U-LPG03 (MS4b Session 19 complete)
Session 22: after U-LPM03 (MS6a Session 22 complete)
Session 25: after U-LPS23 (MS6b Session 25 complete)
... (every 3 units throughout remaining milestones)
```

---

## APPENDIX A: COMPLETE UNIT INDEX

| Unit | Milestone | Description |
|------|-----------|-------------|
| U-LPI01 | MS-1 | Wire BlueprintVisionOCREngine -> TurningFeature[] |
| U-LPI02 | MS-1 | Material callout parser |
| U-LPI03 | MS-1 | Tolerance & GD&T extraction |
| U-LPI04 | MS-1 | STEP/IGES -> turning profile |
| U-LPI05 | MS-1 | Stock selection |
| U-LPI06 | MS-1 | Ambiguity resolution |
| U-LPI07 | MS-1 | Tests (25+) |
| U-LPI08 | MS-1 | Wire dispatchers (8 actions) |
| **U-LPI09** | **MS-1** | **TurningRevProfileEngine (3D->2D XZ) NEW** |
| **U-LPI10** | **MS-1** | **TurningFeatureTaxonomyEngine NEW** |
| **U-LPI11** | **MS-1** | **FitNotationParser (H7/g6) NEW** |
| **U-LPI12** | **MS-1** | **ISO2768GeneralToleranceApplicator NEW** |
| U-LPU01 | MS-2 | Upload page |
| U-LPU02 | MS-2 | Input wizard |
| U-LPU03 | MS-2 | Ambiguity UI |
| U-LPU04 | MS-2 | Results page |
| U-LPU05 | MS-2 | Backplot visualization |
| U-LPU06 | MS-2 | Setup instructions |
| U-LPU07 | MS-2 | E2E UI tests |
| U-LPU08 | MS-2 | Wire REST API |
| U-LPO01 | MS0 | 35-stage orchestrator |
| U-LPO02 | MS0 | Bar stock safety |
| U-LPO03 | MS0 | Clamping per op |
| U-LPO04 | MS0 | Machine readiness |
| U-LPO05 | MS0 | Emergency recovery |
| U-LPO06 | MS0 | Prove-out |
| U-LPO07 | MS0 | G73+G32+WCS |
| U-LPO08 | MS0 | TNRC resolver |
| U-LPO09 | MS0 | 8 controller dialects |
| U-LPO10 | MS0 | CSS optimizer |
| U-LPO11 | MS0 | Turret + adaptive |
| U-LPO12 | MS0 | Safety + collision |
| U-LPO13 | MS0 | Tests (30+) |
| U-LPO14 | MS0 | Integration tests |
| U-LPR11-18 | MS1 | Insert wear (8 units from v1+v2) |
| U-LPT01-10 | MS2 | Offset + thermal (10 units from v2) |
| U-LPS01 | MS3 | Part classifier |
| U-LPS02 | MS3 | Sequence optimizer |
| U-LPS03 | MS3 | Op1/Op2 planner |
| U-LPS04 | MS3 | Jaw selection |
| U-LPS05 | MS3 | Thin-wall deformation |
| U-LPS06 | MS3 | Specialty workholding |
| U-LPS07 | MS3 | Stock form handling |
| U-LPS08 | MS3 | Workholding state tracking |
| U-LPS09 | MS3 | Tests (15+) |
| U-LPS10 | MS3 | Integration tests |
| **U-LPS11** | **MS3** | **TrilobeDeformationEngine NEW** |
| **U-LPS12** | **MS3** | **SoftJawBoringGCodeEngine NEW** |
| **U-LPS13** | **MS3** | **ExpandingMandrelEngine NEW** |
| **U-LPS14** | **MS3** | **FaceDriverTorqueEngine NEW** |
| U-LPH01 | MS4a | All 10 thread forms + variable pitch + multi-start |
| U-LPH02 | MS4a | 5 infeed methods + all 8 controllers |
| U-LPH03 | MS4a | Measurement + DIN 76 relief + repair |
| U-LPH04 | MS4a | Multi-start C-axis indexing |
| U-LPH05 | MS4a | Variable pitch G34 (ball screw, worm) |
| U-LPH06 | MS4a | 8-dialect complete threading G-code |
| U-LPH07 | MS4a | Tests (20+) |
| U-LPH08 | MS4a | Wire dispatchers (8 actions) |
| U-LPG01 | MS4b | 8 groove type classification |
| U-LPG02 | MS4b | Deep grooving plunge-and-shift |
| U-LPG03 | MS4b | Peck intelligence by material |
| U-LPG04 | MS4b | Parting feed + RPM control |
| U-LPG05 | MS4b | Peck cutoff + part catcher timing |
| U-LPG06 | MS4b | Parting coolant + blade stress |
| U-LPG07 | MS4b | Tests (15+) |
| U-LPG08 | MS4b | Wire dispatchers (6 actions) |
| U-LPF01-08 | MS5 | Hard turning (8 units from v2) |
| U-LPM01 | MS6a | assembleProgram() -> channel files |
| U-LPM02 | MS6a | Sync code verification |
| U-LPM03 | MS6a | Part transfer sequence |
| U-LPM04 | MS6a | Channel balancing Gantt |
| U-LPM05 | MS6a | Simultaneous cutting collision |
| U-LPM06 | MS6a | 5-dialect output + post-processing |
| U-LPM07 | MS6a | Tests (15+) |
| U-LPM08 | MS6a | Wire dispatchers (5 actions) |
| U-LPS21 | MS6b | Guide bush vs non-GB |
| U-LPS22 | MS6b | Op2 back-work |
| U-LPS23 | MS6b | Gang slide vs turret |
| U-LPS24 | MS6b | Bar stock management |
| U-LPS25 | MS6b | Unmanned readiness |
| U-LPS26 | MS6b | Tests (15+) |
| U-LPS27 | MS6b | Wire dispatchers (5+1 actions) |
| U-LPS28 | MS6b | Integration test |
| U-LPC01-06 | MS7 | Chip control (6 units from v2) |
| U-LPQ01-08 | MS8 | Inspection (8 units from v2) |
| U-LPR01-06 | MS9 | Quality compliance (6 units from v2) |
| U-LPE01-08 | MS10 | Cost optimization (8 units from v2) |
| U-LPD01-08 | MS11 | Shop floor (8 units from v2) |
| U-LPV01-08 | MS12 | Simulation (8 units from v2) |

**Total: 142 units across 17 milestones in 48 sessions.**

---

## APPENDIX B: PHYSICS CONSTANTS REFERENCE (import from src/physics/constants.ts)

All engines MUST import constants from the canonical source. Never inline these values.

| Constant | Value | Source |
|----------|-------|--------|
| kc1.1 ISO P (steel) | 1800 MPa | Kienzle |
| kc1.1 ISO M (stainless) | 2100 MPa | Kienzle |
| kc1.1 ISO K (cast iron) | 1100 MPa | Kienzle |
| kc1.1 ISO N (aluminum) | 700 MPa | Kienzle |
| kc1.1 ISO S (superalloy) | 2800 MPa | Kienzle |
| kc1.1 ISO H (hardened) | 3200 MPa | Kienzle |
| Taylor C (carbide, steel) | 350 m/min | Taylor (Vc at T=1min, coated carbide, per constants.ts) |
| Taylor n (carbide) | 0.25 | Taylor |
| Safety factor (clamping) | 2.5x | ISO 10218 |
| Safety factor (face driver) | 2.0x | Engineering practice |
| mu (smooth jaw) | 0.12 | DIN 6350 |
| mu (serrated jaw) | 0.25 | Machinery's Handbook |
| mu (carbide jaw) | 0.40 | Manufacturer data |

---

*End of LATHE-PRO v3.0 Roadmap*
*Generated: 2026-04-05 | Projected avg score: 81.6/100 | Target: 82+*
*Next action: Execute MS-1 Session 1 (U-LPI01..U-LPI03)*
