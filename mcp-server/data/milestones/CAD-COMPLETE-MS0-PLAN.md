# CAD-COMPLETE-MS0 Execution Plan

## Milestone Overview
**Title:** Complete CAD Capability — Universal Index + Multi-System Generation + Regeneration Test  
**Track:** CAD-COMPLETE  
**Status:** Ready for Execution  
**RGS Score:** 1.000 (100%)  
**Created:** 2026-04-19  

## Objective
Build a complete CAD capability pipeline that:
1. Indexes ALL 9,794 CAD files across H:/prism (all formats)
2. Generates CAD code for FreeCAD, Inventor, and SolidWorks
3. Creates complex geometry (turbine blades, impellers, blisks)
4. Trains on the full corpus for neural CAD generation
5. Verifies regeneration accuracy against original files

## CAD File Inventory (Target)
| Format | Count | Location |
|--------|-------|----------|
| Inventor (.ipt/.iam) | 4,810 | JM DIE archive |
| DXF | 2,882 | JM DIE archive |
| STEP/STP | 818 | BOX + cad-engine |
| SolidWorks (.sldprt/.sldasm) | 611 | JM DIE archive |
| STL | 414 | BOX + exports |
| DWG | 225 | JM DIE archive |
| IGES | 31 | JM DIE archive |
| Fusion 360 (.f3d) | 3 | BOX |
| **TOTAL** | **9,794** | |

## Installed CAD Software (Available)
- **FreeCAD** — `H:/prism/resources/Freecad/` (full install)
- **Inventor 2027** — `H:/prism/resources/Inventor 2027/` (full install)
- **Fusion 360** — `H:/prism/resources/FUSION360/`
- **hyperMILL** — `H:/prism/resources/HYPERMILL/`
- **HSMWorks 2027** — `H:/prism/resources/HSMWorks 2027/`

## Phase Execution Plan

### PHASE-0: Universal CAD File Registry (4 units)
**Goal:** Index every CAD file in the system

| Unit | Title | Deliverables |
|------|-------|--------------|
| U-CADC01 | UniversalCADIndexEngine | `src/engines/UniversalCADIndexEngine.ts` |
| U-CADC02 | CAD_FILE_REGISTRY.json | `data/state/CAD_FILE_REGISTRY.json` |
| U-CADC03 | CADRegistryDispatcher | MCP actions for registry access |
| U-CADC04 | Initial Full Scan | Registry populated with 9,000+ files |

**Dependencies:** None  
**Est. Sessions:** 2

### PHASE-1: FreeCAD Integration (3 units)
**Goal:** Generate and execute FreeCAD Python scripts

| Unit | Title | Deliverables |
|------|-------|--------------|
| U-CADC05 | FreeCADCodeGeneratorEngine | Python script generator |
| U-CADC06 | FreeCAD Executor Script | `scripts/freecad-executor.py` |
| U-CADC07 | FreeCAD Integration Tests | 10 end-to-end tests |

**Dependencies:** PHASE-0  
**Est. Sessions:** 2

### PHASE-2: Inventor Integration (3 units) ║ Parallel with PHASE-1
**Goal:** Generate Inventor iLogic/VBA scripts

| Unit | Title | Deliverables |
|------|-------|--------------|
| U-CADC08 | InventorCodeGeneratorEngine | iLogic/VBA generator |
| U-CADC09 | Inventor Executor Script | `scripts/inventor-executor.ps1` |
| U-CADC10 | Inventor Integration Tests | 10 integration tests |

**Dependencies:** PHASE-0  
**Est. Sessions:** 2

### PHASE-3: SolidWorks Integration (2 units) ║ Parallel with PHASE-1, PHASE-2
**Goal:** Generate SolidWorks VBA macros

| Unit | Title | Deliverables |
|------|-------|--------------|
| U-CADC11 | SolidWorksCodeGeneratorEngine | VBA/VSTA generator |
| U-CADC12 | SolidWorks Integration Tests | Tests with mock execution |

**Dependencies:** PHASE-0  
**Est. Sessions:** 1

### PHASE-4: Complex Geometry Generation (4 units)
**Goal:** Generate turbines, impellers, and blisks from parameters

| Unit | Title | Deliverables |
|------|-------|--------------|
| U-CADC13 | BladeProfileLibraryEngine | 200+ NACA/NASA airfoil profiles |
| U-CADC14 | TurbineBladeCADEngine | Parametric blade geometry |
| U-CADC15 | ImpellerCADEngine | Parametric impeller geometry |
| U-CADC16 | BliskCADEngine | Multi-blade rotor assembly |

**Dependencies:** PHASE-1  
**Est. Sessions:** 2

### PHASE-5: Training Pipeline (4 units)
**Goal:** Build transformer-ready training corpus from all CAD files

| Unit | Title | Deliverables |
|------|-------|--------------|
| U-CADC17 | CADTrainingCorpusBuilderEngine | JSONL training data |
| U-CADC18 | CADEmbeddingIndexEngine | HNSW vector index |
| U-CADC19 | CADTrainingPipelineOrchestratorEngine | End-to-end orchestration |
| U-CADC20 | Training Pipeline MCP Actions | 3 MCP actions |

**Dependencies:** PHASE-0  
**Est. Sessions:** 2

### PHASE-6: Regeneration Verification (5 units)
**Goal:** Verify we can regenerate original CAD files

| Unit | Title | Deliverables |
|------|-------|--------------|
| U-CADC21 | CADRegenerationTestEngine | Compare generated vs original |
| U-CADC22 | Regeneration Test Harness | Batch testing script |
| U-CADC23 | Simple Part Validation | 100 simple parts, 90% target |
| U-CADC24 | Medium Complexity Validation | 100 JM Die parts, 70% target |
| U-CADC25 | Regeneration Dashboard | Web UI for tracking progress |

**Dependencies:** PHASE-1, PHASE-2, PHASE-3, PHASE-4, PHASE-5  
**Est. Sessions:** 2

## Success Criteria
- [ ] 9,000+ CAD files indexed in registry
- [ ] FreeCAD code generator working with executor
- [ ] Inventor code generator working with executor
- [ ] SolidWorks code generator working
- [ ] Complex geometry engines generating valid parts
- [ ] Training corpus built from all files
- [ ] 90% regeneration pass rate on simple parts
- [ ] 70% regeneration pass rate on medium complexity parts
- [ ] Dashboard showing regeneration metrics

## Session Estimates
- **P50:** 10 sessions
- **P90:** 15 sessions
- **Units per session:** ~2.5

## Execution Order (Recommended)
```
Session 1:  U-CADC01, U-CADC02          (PHASE-0 core)
Session 2:  U-CADC03, U-CADC04          (PHASE-0 complete)
Session 3:  U-CADC05, U-CADC08          (FreeCAD + Inventor start) [parallel]
Session 4:  U-CADC06, U-CADC09          (Executors) [parallel]
Session 5:  U-CADC07, U-CADC10, U-CADC11 (Tests + SolidWorks)
Session 6:  U-CADC12, U-CADC13          (SW tests + Blade profiles)
Session 7:  U-CADC14, U-CADC15          (Turbine + Impeller)
Session 8:  U-CADC16, U-CADC17          (Blisk + Training corpus)
Session 9:  U-CADC18, U-CADC19, U-CADC20 (Embedding + Pipeline)
Session 10: U-CADC21, U-CADC22, U-CADC23 (Regen testing)
Session 11: U-CADC24, U-CADC25          (Final validation + Dashboard)
```

## Risk Mitigation
| Risk | Mitigation |
|------|------------|
| FreeCAD headless execution fails | Use Xvfb virtual display |
| Inventor COM automation issues | Document manual steps as fallback |
| SolidWorks not installed | Mock execution in CI, real on dev |
| Complex geometry math errors | Validate against reference profiles |
| Training corpus too large | Incremental processing with checkpoints |
| Regeneration accuracy low | Iterative model tuning, feature matching |

## Related Milestones
- **CADCAM-DAGI-MS0** — Neural CAD foundation (14 units, complete)
- **LATHE-PROD-READY-MS0** — Lathe production pipeline (127 units, in progress)

---
*Generated by /rgs pipeline — 2026-04-19*
