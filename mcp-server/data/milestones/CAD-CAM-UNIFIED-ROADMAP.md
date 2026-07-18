# CAD/CAM Unified Roadmap — Consolidated Master Plan

**Generated:** 2026-04-18
**Tracks Consolidated:** CC, CAMX, CAMK, F360, HM, CAD-AI, CAM-AI
**Total Milestones:** 136 (31 complete, 105 pending)
**Total Units:** 556 (103 done, 453 remaining)
**Overall Progress:** 19%

## Executive Summary

This document consolidates 7 separate CAD/CAM roadmap tracks into a unified execution plan. The goal is to eliminate redundancy, clarify dependencies, and provide a single source of truth for CAD/CAM development.

## Track Status Overview

| Track | Description | Milestones | Complete | Progress |
|-------|-------------|------------|----------|----------|
| **CAMK** | CAM Kernel (Feature→G-code) | 4 | 4 | 100% |
| **CAD-AI** | CAD AI Engines | 2 | 2 | 100% |
| **CAM-AI** | CAM AI Engines | 1 | 1 | 100% |
| **HM** | hyperMILL Integration | 33 | 15 | 45% |
| **F360** | Fusion 360 Integration | 36 | 6 | 17% |
| **CAMX** | CAM Extraction/Taxonomy | 41 | 3 | 7% |
| **CC** | CadQuery/CAD Core | 19 | 0 | 0% |

## Execution Phases

### Phase 1: Foundation (CC-MS0 through CC-MS2)
**Status:** NOT STARTED | **Dependency:** L8-P1-MS1 (COMPLETE)

1. **CC-MS0**: CadQuery Integration + CAD Kernel Bridge
   - Python CAD engine with CadQuery 2.x
   - TypeScript bridge for MCP integration
   - 10 reference STEP parts validation

2. **CC-MS1**: Video Ingestion Pipeline + Vision Analysis
   - Video frame extraction
   - Action recognition for CAD/CAM operations
   - Annotation storage

3. **CC-MS2**: Knowledge Extraction Engine
   - CAD DRAW domain: parametric patterns
   - CAD LEARN domain: feature primitives
   - SHOP LEARN domain: machining practices

### Phase 2: Learning Engines (CC-MS3 through CC-MS6)
**Status:** NOT STARTED | **Dependency:** CC-MS2

4. **CC-MS3**: Parametric Code Generator (CAD DRAW)
5. **CC-MS4**: Feature Primitive Library (CAD LEARN)
6. **CC-MS5**: CAM Strategy Learning Engine
7. **CC-MS6**: Machining Practice Knowledge Base (SHOP LEARN)

### Phase 3: Integration (CC-MS7 through CC-MS11)
**Status:** NOT STARTED | **Dependency:** CC-MS3..6

8. **CC-MS7**: Persistent Memory + Boot Integration
9. **CC-MS8**: MCP Tool Surface (CONNECT)
10. **CC-MS9**: Manufacturability Validation Bridge
11. **CC-MS10**: Operator Guidance Interface
12. **CC-MS11**: Integration Testing + Safety Certification

### Phase 4: Fusion 360 Completion (F360-MS*)
**Status:** 46% | **Parallel Track**

Remaining F360 milestones:
- F360-MS0: PRISM Panel Add-In (Python UI)
- F360-REV-MS*: Reverse engineering tools
- F360-FULL-MS*: Full automation stack

### Phase 5: CAM Extraction Completion (CAMX-MS*)
**Status:** 7% | **Parallel Track**

Remaining CAMX milestones:
- CAMX-MS0..MS22: Strategy taxonomy, normalization
- CAMX-V17-P*: Version 17 features

### Phase 6: hyperMILL Completion (HM-*)
**Status:** 45% | **Parallel Track**

Remaining HM milestones:
- HM-PLG-MS*: Plugin development
- HM-KC-MS*: Knowledge capture

## Cross-Track Dependencies

```
CAMK (COMPLETE) ────┐
                    ├──► CC-MS0 ──► CC-MS1..11
CAD-AI (COMPLETE) ──┤
CAM-AI (COMPLETE) ──┘

F360-* ◄───────────────► CC-MS5 (strategy learning)
                    │
HM-* ◄─────────────────► CC-MS6 (practice KB)
                    │
CAMX-* ◄───────────────► CC-MS3 (code generator)
```

## Existing Assets (Leverage These)

### Engines (184 CAD/CAM-specific)
- AdaptiveToolpathRouterEngine
- BlueprintOCREngine, BlueprintVisionOCREngine
- CAMKernelEngine (COMPLETE)
- FeatureRecognitionEngine
- MastercamBridgeEngine, HyperMillBridgeEngine
- PartGeometryEngine
- STEPFeatureExtractorEngine
- ToolpathGenerationEngine

### Dispatchers (3 dedicated)
- cadDispatcher: CAD operations, STEP parsing
- camDispatcher: CAM operations, toolpath
- cadDrawingKnowledgeDispatcher: Blueprint learning

### Formulas (CAD/CAM relevant)
- Feature recognition algorithms
- Toolpath optimization (HSM, trochoidal)
- Strategy selection logic

## Phase 0: CAD/CAM AGI Orchestration (NEW — PRIORITY)
**Status:** NOT STARTED | **Dependency:** CAD-CAM-MASTER

**CADCAM-AGI-MS0**: CAD/CAM AGI Orchestration System — Foundation
- 24 units covering:
  - LOCBasedAdaptiveParameterEngine (LOC → RPM/feed/stepover auto-adjust)
  - AdaptiveEngagementMonitorEngine (real-time tool engagement)
  - CADCAMAGIOrchestrationEngine (master controller)
  - Auto-selection chains (stock, fixture, tooling)
  - CAM bridge engines (CadQuery, FreeCAD, Mastercam, Inventor)
  - Master post-processor optimization
  - Safety validation gates

**Software Priority:**
1. FreeCAD + CadQuery (FREE, Python) — foundation/default
2. Fusion 360 ($545/yr, REST API) — cloud CAM
3. Mastercam (.NET) / hyperMILL (COM) — advanced 5-axis

**Key Innovation:** Adaptive LOC → parameter adjustment
- As LOC changes on 3D adaptive roughing, RPM/feed/stepover adjust automatically
- Variability tracking across sessions
- Ever-evolving cutting conditions

## Recommended Execution Order

1. **Start CADCAM-AGI-MS0** (AGI orchestration) - PRIORITY
2. **Continue CC-MS0** (CadQuery foundation) - parallel track
3. **Continue F360-MS0** (Fusion add-in) - parallel track
4. **Continue CAMX pending** - parallel track
5. **Complete HM remaining** - parallel track

## Success Criteria

- [ ] All 136 milestones complete
- [ ] 556 units done
- [ ] CAD kernel operational (CadQuery 2.x)
- [ ] All CAM systems bridged (Fusion, hyperMILL, Mastercam, SolidCAM)
- [ ] Video learning pipeline active
- [ ] Knowledge extraction across all domains

## Related Files

- `CC-MS0.json` through `CC-MS11.json`: CadQuery milestones
- `CAMX-MS0.json` through `CAMX-MS22.json`: CAM extraction
- `F360-*.json`: Fusion 360 milestones
- `HM-*.json`: hyperMILL milestones
- `roadmap-index.json`: Master index (all milestones)

---

## CAD/CAM Deep AGI Track (NEW — 2026-04-18)

**Authority**: User directive for full near-AGI capability on CAD generation + CAM orchestration.

**Envelope**: `CADCAM-DEEPAGI-MASTER.json` (96 units, 32 sessions, 8 sub-milestones)

### Sub-milestones (execution order)

| ID | Title | Units | Sessions | Priority |
|----|-------|-------|----------|----------|
| CADCAM-DAGI-MS0 | CAD Neural Drawing Foundation | 14 | 5 | P0 |
| CADCAM-DAGI-MS1 | CAD Software Action Learning (7 softwares) | 16 | 5 | P0 |
| CADCAM-DAGI-MS2 | Complex Feature Synthesis | 14 | 4 | P0 |
| CADCAM-DAGI-MS3 | CAD Accuracy Validation (100% gate) | 10 | 3 | P0 |
| CADCAM-DAGI-MS4 | CAM AGI Orchestrator (optimal toolpath any moment) | 16 | 5 | P0 |
| CADCAM-DAGI-MS5 | Adaptive Execution (LOC-driven RPM/feed/stepover) | 10 | 3 | P0 |
| CADCAM-DAGI-MS6 | MasterPostProcessor AGI Enhancement | 8 | 3 | P1 |
| CADCAM-DAGI-MS7 | E2E Integration (Print→Shipped) | 8 | 4 | P0 |

### Software Priority Tiers

- **T1 FREE**: FreeCAD, CadQuery
- **T2 Commercial**: Fusion360
- **T3 Commercial**: Mastercam, hyperMILL, Inventor, SolidCAM

### Key Engines Delivered

- **MS0**: NeuralCADGenerationEngine, CADTokenRepresentationEngine, CADSequenceTrainerEngine
- **MS1**: 7 software action executors (FreeCAD/CadQuery/Fusion/Mastercam/hyperMILL/Inventor/SolidCAM)
- **MS2**: AdvancedSweep/Loft/BoundarySurface/Freeform/Pattern/Configuration/Parametric/MultiBody/Assembly/Weldment/SheetMetal/Drawing/BOM
- **MS3**: BRepTopologyValidator, Dimensional/Intent/DFM/ToleranceStack/Interference/Stress/RebuildOrchestrator + CAD-CAM gate hook
- **MS4**: MomentContext/StrategyMomentSelector/OptimalToolpathAtMoment/LOCDynamic/VariabilityAdaptive/MultiObjective/CycleTime/CAMAGIOrchestrator
- **MS5**: LOCRealtimeSensing/ToolEngagementGeometry/AdaptiveRPM/AdaptiveFeed/AdaptiveStepover/SafetyEnvelope/MachineCommOverride
- **MS6**: ControllerCannedCycle/ArcFitting/ControllerDialect/RedundantMove/CycleTimeMinimizer/GCodeCompression/SubProgramMacroLibrary
- **MS7**: PrintToShipped/PrintIngest/CADCAMHandoff/OptimalMachineSelector/JMDieRegressionCorpus/AGIvsHumanBenchmark/ShippedPartValidator

### Feature Cascade Totals

- **86 new hooks** (safety gates, validators, monitors)
- **96 new MCP actions** (callable via mcp__prism__prism_cad/cam)
- **96 new skills** (slash commands)

### Acceptance Criteria

- AGI beats human CAM operators on **80%+ of 24,545 JM Die programs** (cycle time + surface + tool life)
- 100% of generated CAD models pass MS3 validation
- 0 safety incidents in 100-hour production burn-in
- Shop foreman signs off on production deployment

### Adaptive Variability Integration

Every learner engine (idiom miners, Neural CAD, LOC sensor) feeds into Phase 0.25 `VariabilitySourceTrackerEngine` + `AdaptiveParameterSpaceEngine`. System continuously self-adapts from real shop-floor data.

### Execution Start

First unit: `CADCAM-DAGI-MS0 U-DAGI01` (CADTokenRepresentationEngine).
