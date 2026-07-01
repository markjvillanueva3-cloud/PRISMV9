# hyperMILL Full Integration Roadmap
## Version: 1.0.0 | Date: 2026-04-04

## Overview

Three parallel tracks for comprehensive hyperMILL integration into PRISM:

| Track | Milestones | Units | Sessions | Focus |
|-------|-----------|-------|----------|-------|
| HM-REV | 14 | 75 | 28 | Infrastructure wiring + integration |
| HM-KC | 11 | 55 | 27 | Knowledge capture + 8,163 parameter catalog |
| HM-PLUGIN | 8 | 34 | 16 | Proprietary add-in panels inside hyperMILL |
| **Total** | **33** | **164** | **71** | |

## Architecture

```
PRISM PRE-CAM (91/100):
  Kienzle → Deflection → SLD → SpeedFeedOrchestrator → Cycle Parameter Brief
      ↓ (manual or AC API)
hyperMILL: Toolpath geometry (geometrically optimal)
      ↓ (NC file)
PRISM POST-CAM (97/100):
  PPP 38 stages → per-block S/F → surface integrity → quality report
```

hyperMILL = geometry engine. PRISM = physics engine. Orthogonal, not competing.

## Existing Assets (Pre-Roadmap Baseline)

### 11 Engines (6,207 LOC)
| Engine | LOC | Actions | Tests |
|--------|-----|---------|-------|
| HyperMillCodeGeneratorEngine | 982 | 2 | 0 |
| HyperMillToolExportEngine | 1,136 | 2 | 0 |
| HyperMillMultiAxisEngine | 657 | 0 | 14 |
| HyperMillCycleDefaultsEngine | 636 | 0 | 0 |
| HyperMillMaterialMapEngine | 562 | 0 | 0 |
| HyperMillMaterialBridgeEngine | 521 | 5 | 219 |
| HyperMillStrategyEngine | 492 | 0 | 16 |
| HyperMillControllerCatalogEngine | 430 | 0 | 0 |
| HyperMillThreadStandardEngine | 295 | 0 | 0 |
| HyperMillSafetyHooks | 264 | 0 | 45 |
| HyperMillCycleCatalogEngine | 232 | 0 | 0 |

### 9 Data Files (273K+ lines)
- hypermill-materials.json (2,544 materials, 113K lines)
- hypermill-tools.json (587 tools, 75K lines)
- hypermill-cutting-tech.json (106 materials, 57K lines)
- hypermill-iso-fits.json (209 definitions, 22K lines)
- hypermill-materials-catalog.ts (2,614 lines)
- hypermill-cam-tips-ext.ts (83 tips, 1,402 lines)
- hypermill-tool-schema-notes.ts (525 lines)
- hypermill-post-configs.json (17 configs, 79 lines)
- hypermill-speed-feed-catalog.ts (19 entries, 66 lines)

### 200 Tribal Knowledge Tips
- 117 in TribalKnowledgeEngine (TK-DL-hm-001 to hm-117)
- 83 in hypermill-cam-tips-ext.ts (hm-118 to hm-160)

---

## Track 1: HM-REV — Integration Wiring (14 milestones)

### Dependency Graph
```
MS0 (CAD Automation) ──────────────────────────────┐
MS1 (Wiring + Safety Fix) ← none                   │
MS2 (Material + PPP Default) ← MS1                 │
MS3 (Cycles + Skills Phase 1) ← MS1                │
MS4 (Multi-Axis + Mold) ← MS2, MS3                 ├─→ MS13 (E2E)
MS5 (Probing + Surface Integrity) ← MS1            │
MS6 (Grinding + EDM + HeatTreat) ← MS2             │
MS7 (Turning + Medical) ← MS2, MS3                 │
MS8 (Data Extraction) ← MS1                        │
MS9 (AC Bridge + Deploy) ← MS4, MS8                │
MS10 (Quality + Formulas) ← MS5, MS6               │
MS11 (PPP Integration) ← MS9, MS10                 │
MS12 (Skills + Scripts Batch) ← MS3, MS11           │
```

### Parallelization
- MS0 + MS1 (CAD automation independent of engine wiring)
- MS5 + MS6 + MS8 (probing, grinding, data extraction independent)
- MS3 + MS5 (cycle wiring and probing wiring independent)

### Milestones

#### HM-REV-MS0: HyperCAD-S CAD Automation + Mock Layer
**Type:** 4 BUILD, 1 WIRE | **Sessions:** 2
- Build HyperCADSAutomationEngine (CAD API: import/heal/analyze/stock-model)
- PrintToHyperCADSBridge (STEP → AC Python import)
- HyperCADSStockModelEngine (automated offset solid creation)
- FeatureToStrategyBridgeEngine (features → strategy recommendations)
- HyperCADSMockLayer for CI testability (no USB needed)

#### HM-REV-MS1: Engine Wiring + Safety Hook Invocation Fix
**Type:** 3 WIRE, 1 FIX, 1 BUILD | **Sessions:** 2
- Export all 11 engines from index.ts
- Wire remaining 9 engines with MCP actions
- FIX: Add hookExecutor.firePhase() calls to calcDispatcher + camDispatcher
- Build comprehensive test suite for all engines
- All 14+ dispatcher actions verified end-to-end

#### HM-REV-MS2: Material Bridge + PPP Default Path
**Type:** 5 WIRE | **Sessions:** 2
- Wire MaterialBridgeEngine to SpeedFeedOrchestratorEngine
- Wire MaterialMapEngine to ISO group → cutting data pipeline
- Wire AutoSpeedFeedEngine as default PPP post-processing path
- Wire hypermill-cutting-tech.json into S/F resolver chain
- Verify 2,544-material coverage with physics-backed S/F output

#### HM-REV-MS3: Cycle + Controller + Thread + Skills Scaffold
**Type:** 4 WIRE, 2 BUILD | **Sessions:** 2
- Wire CycleCatalogEngine with MCP actions (120+ cycles queryable)
- Wire CycleDefaultsEngine with per-controller defaults
- Wire ControllerCatalogEngine (16 families, 60+ post variants)
- Wire ThreadStandardEngine (11 standards, tap drill sizes)
- Build 15 Phase 1 skills (material-lookup, speeds-feeds, drill, etc.)
- Build skill scaffold infrastructure for Phase 2+3

#### HM-REV-MS4: Multi-Axis Pipeline (Impeller/Blisk/Mold)
**Type:** 3 WIRE, 3 BUILD | **Sessions:** 2
- Wire MultiAxisEngine through physics pipeline (Kienzle → deflection → SLD)
- Build HyperMillMoldCycleEngine (cavity, core, parting line)
- Build blade roughing cycle logic + open/closed channel detection
- Wire blade/impeller/tube/dental to 5-axis post-processor path
- Build blisk-specific multi-tool cascade strategy
- Wire mold domain to EDM electrode extraction pipeline

#### HM-REV-MS5: Probing + Surface Integrity + Safety Gate
**Type:** 5 WIRE | **Sessions:** 2
- Wire 6 probe engines to hyperMILL workflow
- Wire ResidualStressPredictionEngine to per-operation output
- Wire WhiteLayerDetectionEngine as hard gate (BLOCK on white layer risk)
- Wire SurfaceIntegrityEngine to finishing operations
- Wire safety gate for surface integrity compliance (aerospace)

#### HM-REV-MS6: Grinding + EDM + Heat Treatment Routing
**Type:** 5 WIRE, 1 BUILD | **Sessions:** 2
- Wire 31 grinding engines to hyperMILL operation types
- Wire EDM pipeline (sinker, wire, micro) from hyperMILL
- Wire HeatTreatmentResponseEngine for routing split
- Build heat treatment routing logic (pre-harden → treat → post-harden)
- Wire grinding process planning (wheel selection, dressing cycle)
- Connect thermal damage detection to grinding operations

#### HM-REV-MS7: Turning/Mill-Turn + Medical Domain
**Type:** 4 WIRE, 2 BUILD | **Sessions:** 2
- Wire turning operations through TurningPrintToProgramEngine
- Build mill-turn GeometryTypes for HyperMillStrategyEngine
- Wire Swiss-type support for medical device parts
- Build CoCr/PEEK cutting parameter validation
- Build dental blank router (disc, block, abutment)
- Wire bar feeder automation M-codes

#### HM-REV-MS8: Data Extraction Pipeline (5 databases)
**Type:** 5 BUILD | **Sessions:** 2
- Extract demo.db (547 tools + 2,706 cutting technologies)
- Extract IM_Macro_DB (drilling macro parameters)
- Extract AC_Standard_ToolDB (standard tool library)
- Extract IM_Tool_DB v1 (historical tool data)
- Extract Metric.cfg directory (full cycle parameter catalog)

#### HM-REV-MS9: Automation Center Bridge + Deployment
**Type:** 4 BUILD, 1 WIRE | **Sessions:** 2
- Build AC companion HTTP server on port 18365
- Build AC connection manager (COM/API bridge)
- Build script execution engine (run AC Python from PRISM)
- Build job status monitoring (calculate/simulate/post progress)
- Wire PPP output to file writer (G-code actually saved to disk)

#### HM-REV-MS10: Quality Chain + Setup Sheet + Formula Registry
**Type:** 3 WIRE, 2 BUILD | **Sessions:** 2
- Wire SetupSheetEngine to hyperMILL output (PDF generation)
- Wire FAI plan (AS9102) from operation data
- Wire SPC to per-operation measurement plan
- Build 20 formula registrations (F-HM-001 to F-HM-020)
- Build formula documentation with canonical source citations

#### HM-REV-MS11: PPP-hyperMILL Integration + G43.4 Fix
**Type:** 3 WIRE, 2 BUILD | **Sessions:** 2
- Wire PostProcessorPipelineEngine to hyperMILL NC output
- Fix G43.4 parser bug (dwell misclassification)
- Build TRAORI passthrough (Siemens 5-axis)
- Build HyperMillPPPBridgeHooks for pre/post processing
- Wire 20 controller dialects to hyperMILL post configs

#### HM-REV-MS12: Skills Phase 2+3 + Scripts + Hooks Batch
**Type:** 6 BUILD | **Sessions:** 2
- Build 45 remaining skills (Phase 2: 20 operational + Phase 3: 25 advanced)
- Build 30 AC Python scripts (7 extraction + 10 AC + 6 bridge + 7 utility)
- Verify all 20 safety hooks registered and firing
- Build hook registration verification test suite
- Build skill integration tests (each skill produces valid output)
- Build script execution tests (each script runs without error)

#### HM-REV-MS13: E2E Integration Testing (5 parts)
**Type:** 5 BUILD | **Sessions:** 2
- Test part 1: Prismatic bracket (3-axis, pockets, holes)
- Test part 2: 5-axis impeller (blade, hub, shroud)
- Test part 3: Mill-turn shaft (OD/ID, threading, grooving)
- Test part 4: Grinding case (surface, cylindrical, creep feed)
- Test part 5: Wire EDM die (taper, multi-axis, bi-material)

---

## Track 2: HM-KC — Knowledge Capture (11 milestones)

Data-driven parameter extraction and artifact generation covering ~8,163 input parameters.

### Pipeline
```
EXTRACTION (from hyperMILL installation files):
  Metric.cfg → Cycle parameter schemas + defaults
  omCycles.txt → Cycle type → parameter list mapping
  demo.db → Tool parameter schemas (29 geometry classes)
  IM_Tool_DB → Cutting technology parameter schemas

GENERATION (automated from extracted schemas):
  Parameter Schema → Zod validation schema (.ts)
  Parameter Schema → Skill template (.md) with physics mapping
  Parameter Schema → AC Python setter script (.py)
  Parameter Schema → Safety hook rule (.ts) for out-of-range values
```

### Milestones
- KC-0: Parameter Extraction Pipeline (8 extractor scripts)
- KC-1: CAD Parameter Catalog (~275 schemas)
- KC-2: Fixture/Setup Parameter Catalog (~200 schemas)
- KC-3: CAM Core Parameter Catalog (~2,500 schemas)
- KC-4: CAM Advanced Parameter Catalog (~1,500 schemas)
- KC-5: Linking/Approach Parameter Catalog (~960 schemas)
- KC-6: Simulation + NC Parameter Catalog (~500 schemas)
- KC-7: Settings + Preferences Catalog (~265 schemas)
- KC-8: Physics Mapping Layer (~8,163 mappings)
- KC-9: Validation + Artifact Testing
- KC-10: CAD Learning Pipeline (5 engines for part upload → learning)

---

## Track 3: HM-PLUGIN — Proprietary Add-In (8 milestones)

Native hyperMILL plugin with 5 PRISM panels via Automation Center.

### Architecture
```
hyperCAD-S / hyperMILL
  └─ PRISM PLUGIN (AC Add-In)
       ├─ Physics Advisor Panel
       ├─ Quality Gate Panel
       ├─ Post Enhancer Panel
       ├─ Tool Crib Panel
       └─ Learning Dashboard
            └─ HTTP → localhost:18361 → PRISM MCP Server
```

### Milestones
- PLG-1: AC Python Plugin Skeleton
- PLG-2: Physics Advisor Panel (Kienzle + SLD + deflection)
- PLG-3: Quality Gate Panel (surface integrity + collision)
- PLG-4: Post Enhancer Panel (PPP per-block S/F)
- PLG-5: Tool Crib Panel + TDB Import (95K catalog)
- PLG-6: Learning Dashboard Panel (Bayesian + tips)
- PLG-7: Auto-Optimize Pipeline (full auto workflow)
- PLG-8: Plugin Hardening + Licensing

---

## Shared Resources (No Duplication)

These are shared with F360-REV and other tracks:
- F360-REV-MS1 Safety Hardening — ALREADY COMPLETE
- Physics backend (PPP, SpeedFeedOrchestrator, Kienzle) — shared
- Probing engines (6) — shared, MS5 wires to hyperMILL
- Surface integrity engines (3) — shared, MS5 wires to hyperMILL
- Grinding/EDM pipeline engines (31) — shared, MS6/MS7 wires
- DFM, heat treatment, material cert — shared, MS6 wires
- Quality chain (SPC, FAI, metrology) — shared, MS10 wires

## USB Key Requirements

| Track | Without USB Key | With USB Key |
|-------|----------------|-------------|
| HM-REV | MS0-MS12 (97%) | MS13 E2E testing |
| HM-KC | KC-0 through KC-8 (87%) | KC-9 validation |
| HM-PLUGIN | PLG-1 through PLG-7 (87%) | PLG-8 hardening |

90%+ of all work can proceed without the USB key.

## Verification Per Milestone
- `npx tsc --noEmit` — 0 new errors
- `npx vitest run` — 0 regressions
- omega_floor >= 0.90 per session
- Feature Cascade tracked in SESSION_ARTIFACTS.json
