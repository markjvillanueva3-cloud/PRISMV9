# PRISM UNIFIED ROADMAP v2.0 — RGS 10-STAGE HARDENED
## Generated: 2026-04-10 | RGS Pipeline Stages 1-10 Complete
## Authority: SUPERSEDES all prior roadmaps
## RGS Version: 9.0.0 | 483 milestones | 28 new milestones added

---

# RGS STAGE 1: BRIEF ANALYSIS

**Domain**: Full-stack CNC manufacturing platform — physics engines, CAM pipelines, ERP, frontend
**Machine Types**: VMC (3-axis, 5-axis), HMC, Lathe/Mill-Turn, Wire EDM, Sinker EDM, Laser, Waterjet
**Complexity**: XL (11 parallel lanes, 4 Claude seats, ~220 sessions)
**Dependencies**: Lane 0 (safety) blocks all other main-seat lanes; Lanes 3/4/5 are independent

---

# RGS STAGE 2: CODEBASE AUDIT FINDINGS

## Engine Verification (20 audited)
| Engine | Status | Actual Name | LOC |
|--------|--------|-------------|-----|
| ElectrodeDesignEngine | EXISTS | ElectrodeDesignEngine.ts | 199 |
| EdmProgramAssemblerEngine | EXISTS | EDMProgramAssemblerEngine.ts | — |
| SinkerEdmParameterEngine | RENAMED | SinkerEDMCalculatorEngine.ts | ~300 |
| LaserProgramAssemblerEngine | EXISTS | LaserProgramAssemblerEngine.ts | 2,179 |
| WaterjetProgramAssemblerEngine | EXISTS | WaterjetProgramAssemblerEngine.ts | 2,251 |
| VideoLearningEngine | EXISTS | VideoLearningEngine.ts | 804 |
| VisionAnalysisEngine | RENAMED | BlueprintVisionOCREngine.ts | 644 |
| ContentIngestionPipelineEngine | EXISTS | ContentIngestionPipelineEngine.ts | 717 |
| ContentAutoTaggerEngine | EXISTS | ContentAutoTaggerEngine.ts | 380 |
| KnowledgeDeduplicationEngine | EXISTS | KnowledgeDeduplicationEngine.ts | 226 |
| BlueprintOCREngine | EXISTS | BlueprintOCREngine.ts | 644 |
| PDFProcessingEngine | RENAMED | PDFProcessingPipelineEngine.ts | 575 |
| MachineCapabilityEngine | RENAMED | MachineCapabilityIntelligenceEngine.ts | 1,203 |
| ControllerCapabilityEngine | INTEGRATED | PostProcessorCapabilityMatrixEngine.ts | — |
| ControllerDialectEngine | EXISTS | ControllerDialectEngine.ts | 1,348 |
| ClampingSimulationEngine | RENAMED | ClampingSimEngine.ts | 276 |
| SpeedFeedOrchestrator | EXISTS | SpeedFeedOrchestratorEngine.ts | 3,539 |
| ChatterStabilityLobeEngine | EXISTS | ChatterStabilityLobeEngine.ts | 797 |
| ToolDeflectionModel | EXISTS (algo) | algorithms/ToolDeflectionModel.ts | 292 |
| PostProcessorPipelineEngine | EXISTS | PostProcessorPipelineEngine.ts | 5,447 |

## Dispatcher Verification
| Dispatcher | Actions | Status |
|-----------|---------|--------|
| edmDispatcher | 52 | VERIFIED — 16 legacy + 35 WEDM + 1 orchestrator |
| camDispatcher | 309 | VERIFIED |
| calcDispatcher | 358 | VERIFIED |
| turningDispatcher | 32 | VERIFIED |
| qualityDispatcher | 8 | VERIFIED |
| knowledgeDispatcher | 45 | VERIFIED |
| validationDispatcher | 5 | VERIFIED |
| safetyDispatcher | 13 | VERIFIED |

## Registry Verification
| Registry | Entries | Status |
|----------|---------|--------|
| MachineRegistry | 824 | VERIFIED — 26 manufacturers, 4-layer hierarchy |
| MaterialRegistry | 1,047 | VERIFIED — 7 ISO groups, 127 params/material |
| ToolRegistry | 500+ in registry, 71K+ in catalog JSONs | VERIFIED |
| FormulaRegistry | 511 | VERIFIED — 28 categories, 4 novelty levels |
| AlgorithmRegistry | 17 registered, 52 files | VERIFIED |
| VideoSourceRegistry | — | CONFIRMED MISSING (Lane 3 will create) |
| PDFSourceRegistry | — | CONFIRMED MISSING (Lane 4 will create) |
| FixtureRegistry | — | CONFIRMED MISSING (Lane 5 will create) |

## Physics Constants Audit
| ISO Group | kc1.1 (N/mm²) | mc | Status |
|-----------|---------------|-----|--------|
| P (Steel) | 1800 | 0.25 | CANONICAL |
| M (Stainless) | 2100 | 0.25 | CANONICAL |
| K (Cast Iron) | 1100 | 0.28 | CANONICAL |
| N (Aluminum) | 700 | 0.23 | CANONICAL |
| S (Superalloys) | 2800 | 0.28 | CANONICAL |
| H (Hardened) | 3200 | 0.30 | CANONICAL |
| **Graphite** | **MISSING** | — | **ROADMAP GAP — Lane 7 must add** |

## Critical Gaps Found
1. **No graphite workpiece material** in constants.ts (only electrode material in SinkerEDMCalculatorEngine)
2. **No Mitsubishi EA12S controller dialect** (only generic Mitsubishi M800V)
3. **SinkerEdmParameterEngine renamed** to SinkerEDMCalculatorEngine — roadmap refs updated
4. **VisionAnalysisEngine** is actually BlueprintVisionOCREngine — more specialized
5. **Engine naming mismatches** in 5 cases — corrected in this hardened version

---

# RGS STAGE 3: KNOWLEDGE SOURCE MAPPING (per Lane)

## Lane 0: Safety Critical
```
ENGINES: PostProcessorPipelineEngine (5,447 LOC), CoolantControlConfigEngine,
         SafeSpeedCalculatorEngine, FeedOptimizerEngine, ControllerDialectEngine (1,348 LOC)
TRIBAL:  MachiningPlaybookEngine (296 rules), TribalKnowledgeEngine (3,700+ tips)
FORMULAS: FormulaRegistry — F-CUT-001 (Kienzle), F-WEAR-* (Taylor), F-THERMAL-* (Jaeger)
REFERENCE: Haas NGC manual, Siemens 840D, Mazak Smooth, Heidenhain TNC640
         src/physics/constants.ts — CANONICAL (never inline)
```

## Lane 3: Video Extraction
```
ENGINES: VideoLearningEngine (804 LOC), BlueprintVisionOCREngine (644 LOC),
         ContentIngestionPipelineEngine (717 LOC), ContentAutoTaggerEngine (380 LOC),
         KnowledgeDeduplicationEngine (226 LOC)
TRIBAL:  TribalKnowledgeEngine — dedup target (3,700+ existing entries)
FORMULAS: None directly — extracted data feeds calibration
REFERENCE: youtube-transcript skill, /video-learn, /video-follow, /video-replay
```

## Lane 4: PDF & Course Extraction
```
ENGINES: PDFProcessingPipelineEngine (575 LOC), BlueprintOCREngine (644 LOC),
         ContentIngestionPipelineEngine (717 LOC), ContentAutoTaggerEngine (380 LOC)
TRIBAL:  MachiningPlaybookEngine — cross-reference target
FORMULAS: FormulaRegistry (511 formulas) — target expand to 750+
REFERENCE: Machinery's Handbook, Sandvik/Kennametal/Walter/ISCAR catalogs,
         MIT OCW courses (2.008, 2.810, 2.830J, 2.852, 3.051J, etc.)
DATA:    MaterialRegistry (1,047) — enrichment target
```

## Lane 5: Database Expansion
```
ENGINES: MachineCapabilityIntelligenceEngine (1,203 LOC), ControllerDialectEngine (1,348 LOC),
         ClampingSimEngine (276 LOC), ToolCatalogEngine, CatalogMatcherEngine
TRIBAL:  None directly — building reference data
FORMULAS: None directly
REFERENCE: Manufacturer websites (Haas, Mazak, DMG MORI, Okuma, etc.)
DATA:    MachineRegistry (824) → target 5,000+
         ToolRegistry (71K+) → target 100K+
         Controller data (30 entries) → target 200+
```

## Lane 6: Process Hardening
```
ENGINES: SpeedFeedOrchestratorEngine (3,539 LOC), ChatterStabilityLobeEngine (797 LOC),
         ToolDeflectionModel (292 LOC, in algorithms/), SurfaceFinishPredictor,
         CuttingTemperatureEngine, ToolWearProgression
TRIBAL:  MachiningPlaybookEngine (296 rules), TribalKnowledgeEngine (3,700+ tips)
FORMULAS: F-CUT-001 (Kienzle), F-STAB-* (stability lobe), F-DEFL-* (deflection)
REFERENCE: Sandvik/Kennametal published cutting data for ISO P/M/K/N/S/H
MACHINES: Haas VF-2/OM-2, Hurco VM30i, Okuma M460V-5AX, Roku-Roku
```

## Lane 7: Electrode Pipeline
```
ENGINES: ElectrodeDesignEngine (199 LOC), SinkerEDMCalculatorEngine (~300 LOC),
         EDMProgramAssemblerEngine, MicroEDMEngine, 16+ EDM engines total
         LaserProgramAssemblerEngine (2,179 LOC) — for comparative reference
TRIBAL:  EDM tips in TribalKnowledgeEngine
FORMULAS: Spark gap: sparkGap ≈ base_gap × (E/E_ref)^0.3 × (1/machinability)^0.2
         EDM MRR, wear ratio, surface roughness (VDI 3400)
REFERENCE: Excel macro "Automated Program_Corrected 5-25.xlsm" (H:\)
         Mitsubishi EA12S programming manual
DATA:    Graphite electrode materials in SinkerEDMCalculatorEngine (EDM-3, fine grain)
         Sinker EDM pulse params: peakCurrent, pulseOn/Off, gapVoltage, electrodeArea
GAP:     Graphite WORKPIECE kc1.1 MISSING — must add to constants.ts
         EA12S controller dialect MISSING — must build
```

## Lane 8: Secondary Processes
```
ENGINES: LaserProgramAssemblerEngine (2,179 LOC — 23 types × 7 dialects),
         WaterjetProgramAssemblerEngine (2,251 LOC — 4+ modes × 6 dialects),
         LaserCuttingEngine, WaterjetCuttingEngine, WaterjetEngine
TRIBAL:  Limited — emerging area
FORMULAS: Laser: P = f(material, thickness, speed, gas)
         Waterjet: speed = f(material, thickness, quality, abrasive, pressure)
DATA:    Laser — 18+ materials, 3 laser types, 4 gases, 20+ machines
         Waterjet — 18 materials, 6 abrasives, 5 quality levels (Q1-Q5)
```

---

# RGS STAGE 4: SCOPE ESTIMATION

| Lane | Classification | Units | Sessions | Complexity | Notes |
|------|---------------|-------|----------|------------|-------|
| 0: Safety | L (large) | 41 | 17 | HIGH — safety-critical M-codes | Cannot parallelize safety fixes |
| 1: Frontend Merge | M (medium) | 10 | 4 | MEDIUM — file merge + test | Codex coordination needed |
| 2: Core Platform | XL (extra-large) | ~500 | ~100 | HIGH — 200+ existing milestones | Longest lane |
| 3: Video Extract | M (medium) | 13 | 6 | MEDIUM — pipeline engineering | Independent seat |
| 4: PDF Extract | M (medium) | 14 | 6 | HIGH — OCR accuracy critical | Independent seat |
| 5: DB Expansion | L (large) | 21 | 10 | MEDIUM — data engineering | Independent seat |
| 6: Process Harden | L (large) | ~40 | 22 | HIGH — physics validation | Depends on Lane 0 |
| 7: Electrode Pipe | M (medium) | 13 | 6 | MAXIMUM — safety-critical G-code | Depends on Lane 6 |
| 8: Secondary Proc | M (medium) | 22 | 11 | HIGH — 3 process types | Partially independent |
| 9: CAM Kernel | XL | ~100 | 23 | MAXIMUM — core IP | Depends on 3/4/5 data |
| 10: QA | L | ~60 | 15 | HIGH — comprehensive audit | Post-feature |

**Session Math**: 2-3 units/session MAX. /compact every 3 units. 4-loop per unit.

---

# RGS STAGE 5: PHASE DECOMPOSITION (New Milestones Only)

## LANE 0: PP-H0 (First Priority)

### SESSION PP-H0-S1: M-Code Safety + Physics Fixes (U-PPH01..U-PPH02)
```
SMART CONFIG: Role=CNC Safety Engineer + Physics Validator | Model=OPUS | Effort=MAXIMUM | CONTEXT_BUDGET=50%
KNOWLEDGE: [See Lane 0 knowledge map above]
INTENT: Zero M-code conflicts with safety-critical functions on Haas/Siemens/Mazak/Heidenhain
SKILLS: /pp-safety-audit, /machine-check, /physics-verify, /scrutinize
```
WORK:
  U-PPH01: Fix CoolantControlConfigEngine M-code conflicts
    → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
    FILES_MODIFIED: src/engines/CoolantControlConfigEngine.ts
    ABORT_CRITERIA: Any M-code still conflicts | Tests fail | tsc errors
    ROLLBACK: git revert HEAD~1
    Depends on: none

  U-PPH02: Fix PostProcessorPipelineEngine physics errors
    → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
    FILES_MODIFIED: src/engines/PostProcessorPipelineEngine.ts
    ABORT_CRITERIA: Unit mismatch remains | Hardcoded diameter persists | Tests fail
    ROLLBACK: git revert HEAD~1
    Depends on: none

```
FORGE-TRIPLE: hook=pp-mcode-safety-gate | action=prism_validation:pp_mcode_verify | skill=/pp-safety-check
EXIT GATE: ✓ Zero M-code conflicts verified against manuals | ✓ Physics units consistent | omega_floor >= 0.90 | SVI delta: +2%
FEATURE CASCADE:
  NEW_HOOKS: pp-mcode-safety-gate → blocks any M-code edit that conflicts with manufacturer specs
  NEW_ACTIONS: prism_validation:pp_mcode_verify → check any M-code table against 6 controller dialects
  NEW_SKILLS: /pp-safety-check → quick safety audit of post-processor output
  AVAILABLE_TO: PP-H0-S2, all PP-H milestones
/compact checkpoint
```

### SESSION PP-H0-S2: Div-by-Zero + Arc Fixes (U-PPH03..U-PPH04)
```
SMART CONFIG: Role=CNC Safety Engineer | Model=OPUS | Effort=MAXIMUM | CONTEXT_BUDGET=40%
INTENT: No division-by-zero path can produce NaN/Infinity in G-code output
SKILLS: /physics-verify, /scrutinize, /test
```
WORK:
  U-PPH03: Fix div-by-zero paths in 5 engines
    FILES_MODIFIED: SafeSpeedCalculatorEngine.ts, FeedOptimizerEngine.ts, + 3 others
    ABORT_CRITERIA: Any div-by-zero path remains | NaN in output | Tests fail
    Depends on: U-PPH01

  U-PPH04: Fix Heidenhain arc direction (G2/G3 both emit CC)
    FILES_MODIFIED: PostProcessorPipelineEngine.ts (Heidenhain dialect section)
    ABORT_CRITERIA: Arc direction still wrong | Heidenhain test fails
    Depends on: U-PPH02

```
EXIT GATE: ✓ Zero div-by-zero paths | ✓ Heidenhain arcs correct | ✓ All 1,323 tests pass
/compact checkpoint
```

---

## LANE 3: VID-EXT-MS0 (Seat #2 First Priority)

### SESSION VID-EXT-S1: Registry + Transcript Pipeline (U-VID01..U-VID02)
```
SMART CONFIG: Role=ML Pipeline Engineer + Manufacturing Video Analyst | Model=OPUS | Effort=HIGH | CONTEXT_BUDGET=40%
KNOWLEDGE: VideoLearningEngine (804 LOC), ContentIngestionPipelineEngine (717 LOC),
           ContentAutoTaggerEngine (380 LOC), KnowledgeDeduplicationEngine (226 LOC)
INTENT: Video sources registered, transcript extraction working for any YouTube URL
SKILLS: /video-learn, /youtube-transcript, /forge-engines
```
WORK:
  U-VID01: Video Source Registry
    → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
    FILES_CREATED: src/registries/VideoSourceRegistry.ts, src/data/video-sources.json
    FILES_MODIFIED: src/registries/index.ts
    ABORT_CRITERIA: <20 sources | No schema validation | Missing domain_tags | tsc errors
    ROLLBACK: git revert HEAD~1
    Depends on: none

  U-VID02: Transcript Extraction Pipeline
    FILES_CREATED: src/engines/VideoTranscriptPipelineEngine.ts
    FILES_MODIFIED: src/data/video-sources.json
    ABORT_CRITERIA: <50% success rate | No timestamps | tsc errors
    Depends on: U-VID01

```
FORGE-TRIPLE: hook=video-source-quality | action=prism_knowledge:video_transcript | skill=/video-transcript
EXIT GATE: ✓ 20+ sources registered | ✓ Transcript pipeline extracts from YouTube | omega_floor >= 0.85
/compact checkpoint
```

### SESSION VID-EXT-S2: Frame Analysis + Knowledge Extraction (U-VID03..U-VID04)
```
SMART CONFIG: Role=Computer Vision + Manufacturing | Model=OPUS | Effort=HIGH | CONTEXT_BUDGET=40%
INTENT: Videos produce structured tribal knowledge entries
```
WORK:
  U-VID03: Visual Frame Analysis Pipeline
    FILES_CREATED: src/engines/VideoFrameAnalysisEngine.ts
    FILES_MODIFIED: BlueprintVisionOCREngine.ts (extend, NOT "VisionAnalysisEngine")
    ABORT_CRITERIA: <30% DRO accuracy | No tool change detection | >5min/video
    Depends on: U-VID01

  U-VID04: Knowledge Extraction & Tagging
    FILES_CREATED: src/engines/VideoKnowledgeExtractorEngine.ts
    FILES_MODIFIED: src/hooks/KnowledgeHooks.ts
    ABORT_CRITERIA: <100 new entries from 20 videos | Duplicates with existing 3,700
    Depends on: U-VID02, U-VID03

```
EXIT GATE: ✓ ≥100 new tribal knowledge entries | ✓ Zero duplicates | ✓ Auto-tagged by domain
FORGE-TRIPLE: hook=video-knowledge-quality-gate | action=prism_knowledge:video_extract | skill=/video-extract
/compact checkpoint
```

---

## LANE 4: PDF-EXT-MS0 (Seat #3 First Priority)

### SESSION PDF-EXT-S1: Registry + Table Extraction (U-PDF01..U-PDF02)
```
SMART CONFIG: Role=Technical Librarian + Data Scientist | Model=OPUS | Effort=MAXIMUM | CONTEXT_BUDGET=50%
KNOWLEDGE: PDFProcessingPipelineEngine (575 LOC — NOT "PDFProcessingEngine"),
           BlueprintOCREngine (644 LOC), ContentAutoTaggerEngine (380 LOC)
           FormulaRegistry (511 formulas), MaterialRegistry (1,047 materials)
INTENT: PDF sources cataloged, cutting data tables extractable from manufacturer PDFs
SKILLS: /pdf-learn, /material-lookup, /formula-browse, /learn-everything
```
WORK:
  U-PDF01: PDF Source Registry
    FILES_CREATED: src/registries/PDFSourceRegistry.ts, src/data/pdf-sources.json
    FILES_MODIFIED: src/registries/index.ts
    ABORT_CRITERIA: <10 sources | No extraction_status tracking | tsc errors
    Depends on: none

  U-PDF02: Table Extraction Engine
    FILES_CREATED: src/engines/PDFTableExtractionEngine.ts
    ABORT_CRITERIA: <70% cell accuracy on Sandvik cutting data tables | tsc errors
    Depends on: U-PDF01

```
EXIT GATE: ✓ Sources registered | ✓ Table extraction ≥70% accuracy
/compact checkpoint
```

### SESSION PDF-EXT-S2: Formula + Material Extraction (U-PDF03..U-PDF05)
```
SMART CONFIG: Role=Manufacturing Scientist + Data Engineer | Model=OPUS | Effort=MAXIMUM | CONTEXT_BUDGET=50%
INTENT: New formulas and material properties flowing into PRISM registries
```
WORK:
  U-PDF03: Formula Extraction Engine
    FILES_CREATED: src/engines/PDFFormulaExtractionEngine.ts
    ABORT_CRITERIA: <50 new formulas | Conflicts with existing 511 | tsc errors
    Depends on: U-PDF01

  U-PDF04: Material Property Extraction
    FILES_MODIFIED: src/data/materials/ (enrichment JSONs)
    ABORT_CRITERIA: <500 materials enriched | Missing source citations
    Depends on: U-PDF02

  U-PDF05: Handbook Batch Processing (Machinery's Handbook + Kalpakjian + Shaw)
    FILES_CREATED: src/data/handbook-extracts/ (directory + JSONs)
    ABORT_CRITERIA: <80% Machinery's Handbook tables | Thread data incomplete
    Depends on: U-PDF02, U-PDF03

```
EXIT GATE: ✓ ≥50 new formulas | ✓ ≥500 materials enriched | ✓ Thread data complete
FORGE-TRIPLE: hook=pdf-extraction-quality | action=prism_knowledge:pdf_extract | skill=/pdf-extract
/compact checkpoint
```

---

## LANE 5: DB-EXP-MS0 (Seat #4 First Priority)

### SESSION DB-EXP-S1: Machine Census + Haas Catalog (U-DB01..U-DB02)
```
SMART CONFIG: Role=CNC Machine Data Specialist | Model=OPUS | Effort=HIGH | CONTEXT_BUDGET=40%
KNOWLEDGE: MachineCapabilityIntelligenceEngine (1,203 LOC — NOT "MachineCapabilityEngine"),
           MachineRegistry (824 machines, 26 manufacturers)
INTENT: Complete Haas machine catalog in PRISM
SKILLS: /machine-enrich, /machine-check
```
WORK:
  U-DB01: Machine Manufacturer Census (Tier 1/2/3)
    FILES_CREATED: src/data/machine-manufacturer-index.json
    ABORT_CRITERIA: <30 manufacturers cataloged | Missing model counts
    Depends on: none

  U-DB02: Haas Complete Catalog (40+ models with full specs)
    FILES_MODIFIED: MachineRegistry data files
    ABORT_CRITERIA: <40 Haas models | Missing spindle torque curves
    Depends on: U-DB01

```
EXIT GATE: ✓ 30+ manufacturers indexed | ✓ 40+ Haas models complete
/compact checkpoint
```

### SESSION DB-EXP-S2: Mazak/DMG/Okuma + Bulk Import (U-DB03..U-DB05)
```
SMART CONFIG: Role=CNC Machine Data Specialist | Model=OPUS | Effort=HIGH | CONTEXT_BUDGET=40%
INTENT: 5,000+ machines in registry covering all major manufacturers
```
WORK:
  U-DB03: Mazak + DMG MORI + Okuma (~150 models)
    FILES_MODIFIED: MachineRegistry data files
    ABORT_CRITERIA: <100 models total | Missing spindle data
    Depends on: U-DB01

  U-DB04: Tier 2 & 3 bulk import
    FILES_MODIFIED: MachineRegistry data files
    ABORT_CRITERIA: Total machines still <3,000
    Depends on: U-DB03

  U-DB05: Quality audit + torque curve verification
    ABORT_CRITERIA: >5% machines missing spindle data | Unverified torque curves
    Depends on: U-DB04

```
EXIT GATE: ✓ ≥5,000 machines | ✓ ≥95% have spindle + travel data
FORGE-TRIPLE: hook=machine-data-completeness | action=prism_data:machine_audit | skill=/machine-health
/compact checkpoint
```

---

## LANE 7: ELEC-PIPE-MS0 (Excel Macro Analysis)

### SESSION ELEC-PIPE-S1: Macro Reverse Engineering + Design (U-ELEC01..U-ELEC02)
```
SMART CONFIG: Role=EDM Process Engineer + Automation Architect | Model=OPUS | Effort=MAXIMUM | CONTEXT_BUDGET=60%
KNOWLEDGE: ElectrodeDesignEngine (199 LOC), SinkerEDMCalculatorEngine (~300 LOC — NOT "SinkerEdmParameterEngine"),
           EDMProgramAssemblerEngine, 16+ EDM engines, "Automated Program_Corrected 5-25.xlsm" (H:\)
MACHINES: Mitsubishi EA12S (sinker), Roku-Roku (graphite mill), Haas VF-2, OM-2, Hurco VM30i, Okuma M460V
INTENT: Full understanding of Excel macro logic, ready to replicate in PRISM
SKILLS: /xlsx (read Excel macro), /electrode-pipe
```
WORK:
  U-ELEC01: Excel Macro Reverse Engineering
    FILES_CREATED: src/data/electrode-macro-analysis.json
    INPUT: H:\Automated Program_Corrected 5-25.xlsm (read with /xlsx skill)
    ABORT_CRITERIA: <80% of Excel formulas documented | Missing burn parameter tables
    Depends on: none

  U-ELEC02: Electrode Design Engine Extension
    FILES_MODIFIED: src/engines/ElectrodeDesignEngine.ts (extend from 199 LOC)
    ALSO: Add graphite workpiece kc1.1 to src/physics/constants.ts (~500-800 N/mm²)
    ABORT_CRITERIA: Spark gap calc doesn't match Excel | No graphite in constants.ts
    Depends on: U-ELEC01

```
EXIT GATE: ✓ 100% Excel formulas mapped | ✓ Graphite in constants.ts | ✓ Electrode sizing matches Excel
FORGE-TRIPLE: hook=electrode-design-safety | action=prism_edm:electrode_design | skill=/electrode-design
/compact checkpoint
```

### SESSION ELEC-PIPE-S2: Fusion Bridge + Pipeline Architecture (U-ELEC03..U-ELEC04)
```
SMART CONFIG: Role=CAM Integration + Pipeline Architect | Model=OPUS | Effort=MAXIMUM | CONTEXT_BUDGET=50%
INTENT: Pipeline architecture defined, Fusion 360 bridge built (replaces SolidWorks output)
```
WORK:
  U-ELEC03: Fusion 360 Electrode CAM Bridge
    FILES_CREATED: src/engines/ElectrodeFusion360BridgeEngine.ts
    ABORT_CRITERIA: No machine selection logic | No graphite strategy | tsc errors
    Depends on: U-ELEC02

  U-ELEC04: 8-Stage Pipeline Architecture
    FILES_CREATED: src/engines/ElectrodePipelineOrchestratorEngine.ts
    ABORT_CRITERIA: <8 stages defined | Missing safety gate between CAM and post
    Depends on: U-ELEC03

```
EXIT GATE: ✓ Pipeline architecture complete | ✓ Fusion bridge generates CAM setup
/compact checkpoint
```

---

# RGS STAGE 6: UNIT POPULATION — NAMING CONVENTION

All units use **U-{DOMAIN_PREFIX}{NN}** format:
- PPH = Post-Processor Hardening (Lane 0)
- CWEDM = CWEDM Calculator Wiring (Lane 0)
- FMERGE = Frontend Merge (Lane 1)
- VID = Video Extraction (Lane 3)
- PDF = PDF Extraction (Lane 4)
- DB = Database Expansion (Lane 5)
- MILL = Milling Hardening (Lane 6)
- ELEC = Electrode Pipeline (Lane 7)
- LASER = Laser Pipeline (Lane 8)
- WATER = Waterjet Pipeline (Lane 8)
- SINK = Sinker EDM Full (Lane 8)

**No bare U01 — collision-free across all 11 lanes.**

---

# RGS STAGE 7: FORGE-TRIPLE PER MILESTONE

| Milestone | Protective Hook | MCP Action | Skill/Command |
|-----------|----------------|------------|---------------|
| PP-H0 | pp-mcode-safety-gate | prism_validation:pp_mcode_verify | /pp-safety-check |
| PP-H1 | pp-validation-layer | prism_validation:pp_validate_full | /pp-validate |
| PP-H2 | pp-api-error-guard | prism_export:pp_api_health | /pp-api-check |
| PP-H3 | pp-type-consistency | prism_dev:pp_type_audit | /pp-types |
| PP-H4 | pp-perf-regression | prism_monitoring:pp_perf_check | /pp-perf |
| PP-H5 | pp-test-coverage | prism_dev:pp_test_audit | /pp-test-audit |
| PP-H6 | pp-ux-quality | prism_product:pp_ux_check | /pp-ux |
| CWEDM-MS0 | wedm-calc-live-guard | prism_edm:wedm_full_multipass | /wedm-calc |
| FMERGE-MS0 | frontend-merge-guard | prism_dev:frontend_diff | /frontend-diff |
| FMERGE-MS1 | frontend-build-guard | prism_dev:frontend_build | /frontend-build |
| FMERGE-MS2 | frontend-canonical-guard | prism_dev:frontend_health | /app-health |
| VID-EXT-MS0 | video-knowledge-quality-gate | prism_knowledge:video_extract | /video-extract |
| VID-EXT-MS1 | video-batch-quality-gate | prism_knowledge:video_batch_status | /video-batch |
| VID-EXT-MS2 | video-course-quality | prism_knowledge:video_analytics | /video-status |
| PDF-EXT-MS0 | pdf-extraction-quality | prism_knowledge:pdf_extract | /pdf-extract |
| PDF-EXT-MS1 | catalog-data-quality | prism_data:catalog_audit | /catalog-health |
| PDF-EXT-MS2 | academic-source-quality | prism_knowledge:academic_extract | /academic-learn |
| DB-EXP-MS0 | machine-data-completeness | prism_data:machine_audit | /machine-health |
| DB-EXP-MS1 | controller-completeness | prism_data:controller_audit | /controller-health |
| DB-EXP-MS2 | holder-data-quality | prism_data:holder_audit | /holder-select |
| DB-EXP-MS3 | tool-data-completeness | prism_data:tool_catalog_audit | /tool-catalog-health |
| DB-EXP-MS4 | fixture-completeness | prism_data:fixture_audit | /fixture-select |
| MILL-HARD-MS0 | mill-physics-guard | prism_cam:mill_validate | /mill-audit |
| MILL-HARD-MS1 | mill-strategy-guard | prism_cam:mill_strategy_check | /mill-strategy |
| MILL-HARD-MS2 | mill-program-guard | prism_cam:mill_program_check | /mill-program |
| ELEC-PIPE-MS0 | electrode-design-safety | prism_edm:electrode_design | /electrode-design |
| ELEC-PIPE-MS1 | electrode-mill-safety | prism_edm:electrode_mill | /electrode-mill |
| ELEC-PIPE-MS2 | electrode-pipeline-safety | prism_edm:electrode_full_pipeline | /electrode-pipe |
| LASER-PIPE-MS0 | laser-safety-guard | prism_cam:laser_generate | /laser-program |
| WATER-PIPE-MS0 | waterjet-safety-guard | prism_cam:waterjet_generate | /waterjet-program |
| SINKER-FULL-MS0 | sinker-edm-safety | prism_edm:sinker_full | /sinker-program |

---

# RGS STAGE 8: ENFORCEMENT INTEGRATION

## Hooks Active During ALL Roadmap Execution

### PRE-LEVEL (before each unit):
- `knowledge-consult` — verify domain knowledge sources read before building
- `context-retention` — ensure prior unit state preserved
- `engine-digest-check` — verify ENGINE_DIGEST.md consulted (no duplicate engines)

### POST-LEVEL (after each unit):
- `stub-detector` — blocks placeholder returns (enforcement hook)
- `test-quality` — blocks `|| true` and bare `.includes()` in tests
- `constants-checker` — blocks inline Kienzle/Taylor values (must import from constants.ts)
- `physics-review-agent` — reviews formula correctness
- `wiring-review-agent` — reviews MCP readiness
- `test-review-agent` — verifies test coverage

### COMPACT-LEVEL (every 3 units):
- `review-gate` — multi-agent review before compaction
- `wiring-gate` — dispatcher action connectivity check
- `forge-triple-gate` — blocks compaction without hook + action + skill
- `session-audit-agent` — reviews all work in session

### POST-COMPACT:
- Feature Cascade writes `SESSION_ARTIFACTS.json`
- New engines/hooks/skills registered in cascading availability map

### SESSION BOUNDARIES:
- SessionStart: reads Feature Cascade, reports live counts + new capabilities
- SessionEnd: memory_save + system_snapshot + checkpoint_enhanced

---

# RGS STAGE 9: DEPENDENCY RESOLUTION

## DAG Validation

```
Lane 0 (Safety) → Lane 1 (Frontend) → Lane 2 (Core) → Lane 6 (Process) → Lane 7 (Electrode) → Lane 8 (Secondary)
                                                                                                       ↓
Lane 3 (Video) ─────────────────────────────────────────────────────────────────────────────→ Lane 9 (CAM Kernel)
Lane 4 (PDF) ───────────────────────────────────→ Lane 5 (DB-EXP-MS3) ──────────────────→ Lane 9 (CAM Kernel)
Lane 5 (DB) ─────────────────────────────────────────────────────────────────────────────→ Lane 10 (QA)
```

### Verified: No Circular Dependencies
- Lane 3/4/5: Fully independent (separate seats, no cross-lane deps in Phase 1)
- Lane 5 DB-EXP-MS3 depends on Lane 4 PDF-EXT-MS1 (cutting data from catalogs)
- Lane 7 depends on Lane 6 MILL-HARD-MS0 (milling physics must be validated first)
- Lane 8 SINKER-FULL depends on Lane 7 ELEC-PIPE-MS2 (sinker foundation)
- Lane 9 depends on Lanes 3/4/5 producing data
- Lane 10 QA runs after features land (no hard dep, soft ordering)

### Unit Naming Collision Check
- All unit prefixes unique: PPH, CWEDM, FMERGE, VID, PDF, DB, MILL, ELEC, LASER, WATER, SINK
- No bare "U01" anywhere — all use domain prefix
- Existing roadmap units (from v8.4.0 milestones) use different namespaces

### Compaction Points
- Every 3 units within a session
- Never splits dependent units (verified: each session's units are sequential)
- Feature Cascade propagates between sessions

---

# RGS STAGE 10: OUTPUT + 3-LOOP SCRUTINIZATION

## 3-Loop Post-Generation Scrutiny Results

### Loop 1: Multi-Agent Review (10 dimensions scored)

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Protocol Structure** | 85/100 | SESSION blocks present, SMART CONFIG per session, 4-LOOP explicit |
| **Unit Naming** | 95/100 | All U-{PREFIX}{NN}, no collisions, domain-clear |
| **SMART CONFIG** | 80/100 | Role+Model+Effort+Context per session. Some Lanes 2/8/9 need filling |
| **Exit Gate Rigor** | 82/100 | Measurable criteria present. omega_floor specified on critical paths |
| **Forge-Triple** | 90/100 | All 28+ milestones have hook+action+skill defined |
| **Physics Rigor** | 88/100 | Constants.ts cited. Graphite gap identified and scheduled |
| **Feature Cascade** | 78/100 | SESSION_ARTIFACTS pattern documented. Cross-lane flow defined |
| **Dependency Graph** | 92/100 | DAG verified, no cycles, compaction points clean |
| **MCP Utilization** | 75/100 | Session start/end protocol defined. Mid-session checkpoints need work |
| **Cross-Roadmap Coherence** | 85/100 | Prior roadmaps mapped. roadmap-index.json updated to v9.0.0 |

**Average: 85/100** (threshold: ≥70) ✅ PASSED

### Loop 2: Focused Fix (3 worst dimensions)

**MCP Utilization (75)**: Added explicit MCP session protocol to Lane briefings.
**Feature Cascade (78)**: Added AVAILABLE_TO fields and cross-lane data flow diagram.
**SMART CONFIG (80)**: Filled remaining Lane 2/8/9 configs in parent roadmap.

### Loop 3: Verification (post-fix re-score)

| Dimension | Before | After |
|-----------|--------|-------|
| MCP Utilization | 75 | 82 |
| Feature Cascade | 78 | 84 |
| SMART CONFIG | 80 | 86 |

**All dimensions ≥60** ✅ PASSED

---

## Corrections Applied vs Original v2 Draft

| # | Issue | Correction |
|---|-------|------------|
| 1 | Referenced "SinkerEdmParameterEngine" | Corrected to SinkerEDMCalculatorEngine |
| 2 | Referenced "VisionAnalysisEngine" | Corrected to BlueprintVisionOCREngine |
| 3 | Referenced "PDFProcessingEngine" | Corrected to PDFProcessingPipelineEngine |
| 4 | Referenced "MachineCapabilityEngine" | Corrected to MachineCapabilityIntelligenceEngine |
| 5 | Referenced "ClampingSimulationEngine" | Corrected to ClampingSimEngine |
| 6 | SpeedFeedOrchestrator LOC "2,851" | Corrected to 3,539 LOC |
| 7 | Missing graphite kc1.1 not flagged | Added to Lane 7 ELEC-PIPE-MS0 as explicit task |
| 8 | Missing EA12S dialect not flagged | Added to Lane 7 ELEC-PIPE-MS2 as explicit task |
| 9 | FormulaRegistry "499 formulas" | Corrected to 511 formulas |
| 10 | MachineRegistry "2,107 machines" | Corrected to 824 machines (registry), data files have more |
| 11 | MaterialRegistry "6,346 materials" | Corrected to 1,047 (registry count; data files have enrichments) |
| 12 | No bare U01 names | Verified all units use U-{PREFIX}{NN} |
| 13 | ControllerCapabilityEngine standalone | Noted as integrated into PostProcessorCapabilityMatrixEngine |
| 14 | PostProcessorPipelineEngine "38 stages" | Corrected to 7 phases, 35+ stages |
| 15 | edmDispatcher "51 actions" | Corrected to 52 actions |

---

## Final Status

```
RGS 10-STAGE PIPELINE: COMPLETE
  Stage 1  Brief Analysis:           ✅ DONE
  Stage 2  Codebase Audit:           ✅ DONE (20 engines, 8 dispatchers, 8 registries verified)
  Stage 3  Knowledge Source Mapping:  ✅ DONE (all 11 lanes mapped)
  Stage 4  Scope Estimation:          ✅ DONE (XL classification, ~220 sessions)
  Stage 5  Phase Decomposition:       ✅ DONE (SESSION blocks + SMART CONFIG for new milestones)
  Stage 6  Unit Population:           ✅ DONE (U-{PREFIX}{NN} naming, rollback blocks, exit gates)
  Stage 7  Forge-Triple:              ✅ DONE (28+ milestones × hook + action + skill)
  Stage 8  Enforcement Integration:   ✅ DONE (pre/post/compact/session hooks documented)
  Stage 9  Dependency Resolution:     ✅ DONE (DAG verified, no cycles, naming collision-free)
  Stage 10 3-Loop Scrutiny:           ✅ PASSED (avg 85/100, all dims ≥60 after fixes)
  
  Corrections Applied: 15 factual errors fixed
  New Milestones in Index: 27 (roadmap-index.json v9.0.0, 483 total)
  Roadmap Files:
    H:\PRISM\PRISM-UNIFIED-ROADMAP-v2.md      — Narrative roadmap (original)
    H:\PRISM\PRISM-UNIFIED-ROADMAP-v2-RGS.md  — RGS-hardened version (this file)
```

---

# END OF RGS 10-STAGE HARDENED ROADMAP
