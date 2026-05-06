---
name: cad-fusion-live-ms0-h-drive-archaeology
type: lesson
tags: [cad, fusion-live, training, archaeology, recovery]
session: 5ea0222e
date: 2026-05-06
parent_milestone: CAD-FUSION-LIVE-MS0
search_window: October_2025_through_February_2026
agents_dispatched: 10_parallel
---

# H: Drive Archaeology — CAD-FUSION-LIVE-MS0 Stagnant Work Recovery

**Brief:** "look for any other engines, algorithms and systems that should be feeding into this. search the entire H drive. and look for anything in github that would improve our system" → "do a deeper search of the h drive. we built a bunch of stuff 5 months ago that are probably sitting stagnant" → "utilize 10 parallel agents to fan out and search, also use codex and gemini" → "late 2025 early 2026"

10 parallel discovery agents fanned out across non-overlapping search slices. Findings ranked by recovery value to the active CAD-FUSION-LIVE-MS0 surface (`CADCorpusIngestionEngine`, `CADClassFeatureLibraryEngine`, `STEPGeometryParserEngine`, `BlueprintVisionOCREngine`, `MasterCADControlBrainEngine.cadAITrainingSurface`).

---

## TIER 0 — THE STRAY `H:/prism/src/` TREE (highest-value find)

**Location:** `H:/prism/src/` (NOT `mcp-server/src/`) — a parallel root-level tree containing **1,511 untracked engine files + 1,188 untracked test files**, mtimes Mar 16 → Apr 18 2026. Substantial print-to-program work landed in the wrong path and was never committed.

### Top 10 untracked files worth recovering NOW

| # | File | Size | Mtime | State | Action |
|---|------|------|-------|-------|--------|
| 1 | `H:/prism/src/engines/PrintToProgramPipelineEngine.ts` | 91 KB | Apr 7 | **Complete** — 5-stage orchestrator (Drawing→Features→Plan→G-code→Validate) with canonical-physics imports, wires SmartTool/Coolant/EntryExit/Sequencing/Workholding/MachineEnvelope/TribalKnowledge | Move to `mcp-server/src/engines/`, commit `[CAD-PTP-MS0]/U-PTP-RECOVER` |
| 2 | `H:/prism/src/engines/AutoPrintToProgramBridgeEngine.ts` | 24 KB | Mar 23 | **Complete** — chains BlueprintOCR → PDFDimExtractor → StepImport → IGES → DXF → PrintToGeometry → mill-vs-turn router. Self-described "THE MISSING LINK" | Move + wire to `prism_cad`, `prism_cam` |
| 3 | `H:/prism/src/engines/MultiAxisPrintToProgramEngine.ts` | 39 KB | Apr 4 | **Complete** — 3+2/5-axis indexed milling, Rodrigues rotation, scallop-height, singularity detection | Move + commit (test exists) |
| 4 | `H:/prism/src/engines/StepImportEngine.ts` | 39 KB | Mar 16 | **Complete** — `occt-import-js` WASM wrapper. Unblocks "RX-MS0 P3-U02 deferred STEP parsing" — exactly the GitHub research finding #6 (occt-import-js) but ALREADY ON DISK | Move + commit. Replaces text-based ISO 10303-21 entity counting with real OCCT topology in 1 day, not 2 weeks. |
| 5 | `H:/prism/src/engines/TurningCADImportEngine.ts` | 33 KB | Apr 6 | **Complete** — STEP/IGES → axisymmetric XZ silhouette → TurningFeature[]. Tagged `LATHE-PRO-MS-1` | Move + paired test exists |
| 6 | `H:/prism/mcp-server/src/engines/MillingPrintToProgramEngine.ts` | 81 KB | Apr 18 | **Complete + @ts-nocheck** — 5 JM Die machines wired (Haas VF-2, Hurco VM10i/VMX30i, Roku-Roku HSM-5, Okuma MU-4000V), Sandvik chip-thinning Eq. 7.3, canonical-constants imports | Strip `@ts-nocheck`, fix types, commit. Highest immediate value — physically routes to JM Die's actual mills. |
| 7 | `H:/prism/mcp-server/src/engines/STEPAP242PMIExtractorEngine.ts` | 24 KB | Apr 17 | **Complete** — full GD&T / datum / tolerance / surface-texture extraction from ISO 10303-242. Test exists | Commit as-is. PMI is the missing front-end for `BlueprintVisionOCREngine.flagExpectedFeatures` |
| 8 | `H:/prism/mcp-server/data/state/CAD_COVERAGE_MATRIX.json` | 16,039 files scanned | Apr 19 | **Complete data artifact** — 7,092 .mcx-8 + 4,151 .ipt + 1,779 .mcx classification of read/write bridges | Commit |
| 9 | `H:/prism/mcp-server/scripts/{extract-training-procedures.ts, cadquery-executor.py, wedm_extract_parameter_corpus.ts, wedm_train_lora.py}` | 4 scripts | Apr | **Complete** training-pipeline workhorses sitting unused | Commit batch |
| 10 | Test pairs for engines 1-7 (some untracked, some tracked-without-engine) | ~12 files | Apr | Mismatch — tests reference engines whose `.ts` is in stray tree | Per-pair: locate engine, move both, commit per-engine |

### Ghost engines (proof-of-existence in `dist.bak-20260504-143257/engines/`)

The May 4 build snapshot has type-defs for engines whose `.ts` sources are now only in the stray tree:
`LathePrintToProgramDLIntelligence`, `LathePrintToProgramKnowledgeGraph`, `LathePrintToProgramReasoning`, `MillPrintToProgram`, `WireEDMAIPrintToProgram`, `PrintToProgramCoverageAnalyzer`, `PrintToProgramRegressionHarness`, `PrintToProgramTutorial`, `SinkerEDMPrintToProgram`. Recover after Tier 0 #1-7 land.

---

## TIER 1 — STASH JACKPOTS (mostly already shipped, verify diffs first)

10 stash entries, 6 CAD-related. Three are **already on the branch** (commits `3cac3e525`, `73c1f6a8b`, `5071e6121`/`44b525150`/`03837ab3e`/`784fd4f7b`). The lint-staged hook is the bug — it stashes faster than commits clear them.

| Stash | Date | Topic | Status |
|-------|------|-------|--------|
| `stash@{1}` | 2026-05-06 10:18 | 3 corpus engines + 8953-file manifest + 8 test suites | **SHIPPED** as `3cac3e525` — drop |
| `stash@{0}` | 2026-05-06 12:37 | CADClassFeatureLibraryEngine | **SHIPPED** as `73c1f6a8b` — drop |
| `stash@{2}` | 2026-05-06 10:15 | BlueprintVisionOCREngine + Fusion360LiveBridgeEngine + PrintToFusion360Bridge + ToleranceExtractionEngine | **SHIPPED** as `5071e6121`+`44b525150`+`03837ab3e`+`784fd4f7b` — drop |
| `stash@{7}` | 2026-05-05 20:57 | CAM118 Reasoning Chain + PrintToInventorHSMBridge wiring | **APPLY** to `work/cam-exhaust-ms0` (wrong branch for cad-fusion-live) |
| `stash@{8}` | 2026-05-05 13:24 | Mass-deletion (~6500 lines: ArchiveCrawlerEngine, DarkContentClassifier, 11 WEDM engines, etc.) | **REVIEW INTENT** before touching |
| Others (3-6, 9) | Various | Cross-process Tier 4 / Tier 2 engines, CAM dashboard, Fusion360CodeGeneratorEngine | Already shipped or superseded — verify-then-drop |

**Recovery action:** drop stashes 0, 1, 2 after diff confirms duplicate. Apply stash 7 to cam-exhaust branch. Audit stash 8.

---

## TIER 2 — IN-TREE ARCHIVE (1 high-value find, 16 deletable)

Single highest-value hit: **`data/docs/roadmap/archive/superseded/PHASE_CC_CAD_CAM_MACHINING_LEARNING_ENGINE_v2.md`** (88 KB, 2026-02-24) — 12-milestone phase doc that is effectively the prior-art design spec for CAD-FUSION-LIVE-MS0. Contains:
- **CC-MS4 Feature Primitive Library** — direct mapping to `CADClassFeatureLibraryEngine`
- Vision API pipeline (yt-dlp → ffmpeg → Tesseract → Claude Vision → structured extraction) — exactly what `BlueprintVisionOCREngine` reimplements in TS
- ~10 reference parts, supported CAD/CAM platform list, Vision API budget controls
- Action: **cite-as-reference** in CADCorpusIngestionEngine + BlueprintVisionOCREngine design notes; copy CC-MS4 feature primitive table verbatim into the class library seed

**Other in-tree finds (medium-low):**
- `registries/_archive/COMPLETE_HIERARCHY_v15.json` (24.5 MB) — 28,370 records / 490 formulas / 447 engines wiring map. Cite-as-reference.
- `registries/_archive/FORMULA_REGISTRY_WAVE3.json` (158 KB, 202 formulas) — diff against active and port any missing.
- `data/controllers/alarms/archive/*` (15 files, 12 controller families) — port to active alarm dir before MS0 ships.
- 591 closed handoffs in `state/shared/handoffs/archive/` — none CAD-related, safe to delete.

---

## TIER 3 — `_ORPHAN-PRISM-MCP-SERVER-archived-20260421` (pre-MCP-refactor JS dump)

**Location:** `H:/_ORPHAN-PRISM-MCP-SERVER-archived-20260421/` — 8,817 files, 538 MB, archived 2026-04-21. Inner files date 2025-12-26 → 2026-01-31 — exactly the user's "5 months ago" target window.

This is the actual pre-MCP-server monolith. The `EXTRACTED/` directory the wiki claimed at `H:/PRISM_ARCHIVE_2026-02-01/EXTRACTED/` does NOT exist; the orphan archive is the real one.

**Top 10 CAD-relevant .js engines (run `/dedup` against active before any merge):**

| File | Relevance |
|------|-----------|
| `extracted/engines/ai_ml/PRISM_ML_FEATURE_RECOGNITION.js` | **HIGH** — direct match for feature recognizer |
| `extracted/engines/ai_ml/PRISM_UNIFIED_CAD_LEARNING_SYSTEM.js` | **HIGH** — training surface scaffold |
| `extracted/engines/ai_ml/PRISM_COMPLEX_CAD_LEARNING_ENGINE.js` | **HIGH** — class taxonomy logic |
| `extracted/engines/ai_ml/PRISM_AI_TRAINING_DATA.js` | **HIGH** — corpus seed |
| `extracted/engines/ai_ml/PRISM_OCR_ENGINE.js` | **HIGH** — drawing OCR |
| `extracted/engines/cad_cam/PRISM_BREP_CAD_GENERATOR_V2.js` | **HIGH** — B-rep topology |
| `extracted/engines/cad_cam/PRISM_CAD_KERNEL_MIT.js` | **HIGH** — CAD math kernel (MIT-attributed, likely OpenCASCADE bindings) |
| `extracted/engines/cad_cam/PRISM_PARAMETRIC_CAD_ENHANCEMENT_ENGINE.js` | **HIGH** — synthetic training data generation |
| `extracted/engines/ai_ml/PRISM_FUSION_SKETCH_CONSTRAINT_ENGINE.js` | **MEDIUM** — naming collision risk with FUSION-LIVE-MS0 — audit before merge |
| `extracted/engines/cad_cam/PRISM_CAD_QUALITY_ASSURANCE_ENGINE.js` | **MEDIUM** — likely contains GD&T rule fragments |

**Quarantine path:** stage candidates into `H:/prism/.cad-fusion-import/` and run through `duplicationGuardEngine.checkBeforeCreating()` before commit. Most assets likely have descendant equivalents already wired (orphan was archived precisely because it predates the current MCP architecture).

### Tier 3 deepest finds (agent 10 — orphan archive walked geometry_engines + extracted_modules)

Agent 10's deeper walk surfaced engines NOT visible in the surface inventory:

- **`extracted_modules/geometry_engines/PRISM_STEP_PARSER_ENHANCED.js`** (41 KB, 2026-01-30) — **HIGH** — regex/entity-walker for CARTESIAN_POINT, AXIS2_PLACEMENT_3D, B-spline curves/surfaces, advanced faces, closed shells. **Diff against active `STEPGeometryParserEngine.ts` and port any missing entity types.** Together with TIER 0 #4 (`StepImportEngine.ts` — occt-import-js wrapper), this gives PRISM both a regex-fallback and a real-OCCT path.
- **`extracted_modules/geometry_engines/`** (uninspected pool) — `PRISM_BSPLINE_ENGINE`, `PRISM_SDF_ENGINE`, `PRISM_MESH_BOOLEAN_ADVANCED_ENGINE`, `PRISM_MESH_DECIMATION_ENGINE`, `PRISM_OCTREE_3D`, `PRISM_POINT_CLOUD_PROCESSING`, `PRISM_CSG_BOOLEAN_ENGINE`, `PRISM_SHAPE_DESCRIPTOR_ENGINE`, `PRISM_FILLETING_ENGINE`, `PRISM_GEODESIC_DISTANCE_ENGINE`. None present in active surface — verify against ENGINE_DIGEST.md before each port. SDF/voxel/octree are directly usable in `CADCorpusFeaturePrevalenceLearnerEngine`.
- **`PRISM_ML_FEATURE_RECOGNITION.js`** carries **20 feature types** (HOLE_THROUGH/BLIND/COUNTERSUNK/COUNTERBORED, POCKET_*, SLOT_DOVETAIL/T, BOSS_*, CHAMFER, FILLET, THREAD_INTERNAL/EXTERNAL, GROOVE) — current `CADClassFeatureLibraryEngine` has 12 classes. The 8 missing types (DOVETAIL, T-slot, internal/external thread, COUNTERSUNK/COUNTERBORED variants, etc.) are direct expansions.
- **`PRISM_AI_TRAINING_DATA.js`** generates supervised input/output pairs (hardness/tensile/conductivity/machinability/family-encoding → speed/feed/Taylor n+C/surface_finish_factor) with embedded representative dataset. Direct seed for `CADCorpusIngestionEngine` initialization.
- **Caveat:** The 197,608-byte uniform size on many `cad_cam/` and `ai_ml/` JS files is a monolith-extraction artifact ("Lines 972621-972906" headers) — content is real but `PRISM_MATERIALS_MASTER`-style globals are dangling refs that need rewiring on port. Read 30 lines before each port.

---

## TIER 4 — SIBLING WORKTREE DIVERGENCE (`work/cad-fidx-solidworks`)

`H:/prism-cad-sw-fidx` is the only sibling worktree with **novel** CAD engines vs active. Ships a complete 6-CAD function-index + execution-bridge family + unified router:

**HIGH-value cherry-picks (5 files for current MS0):**
1. `CADSystemRouterEngine.ts` (592 lines) — unified router across 6 CAD plan↔exec bridges. Lets `MasterCADControlBrainEngine.cadAITrainingSurface` dispatch training across every CAD vendor uniformly.
2. `Fusion360CADFunctionIndexEngine.ts` (393 lines) — direct catalog parity for FUSION-LIVE.
3. `AutodeskFusionMCPProxyEngine.ts` (387 lines) — JSON-RPC client for Autodesk's official Fusion 360 MCP server (released 2026-04-28). Audit overlap with existing `Fusion360LiveBridgeEngine` (1461 lines) before merge.
4-5. `SolidWorksCADFunctionIndexEngine.ts` + `MastercamCADFunctionIndexEngine.ts` (~400 lines each) — cross-CAD generalization optionality.

**Cherry-pick targets** (visible in cad-sw-fidx log): `f4b60cf97`, `23726a9dd`, `343b05315`, `8044144aa`, `99b5f41b9`. Run dedup before each pick.

---

## TIER 5 — KNOWLEDGE BASE FORMULAS (35-40 unported)

`Resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js` (128 KB, 2280 lines, 107+ MIT courses) — already declared as source by `CrossDisciplinaryFormulaIntegrationEngine.ts`, but only **~25 of 60-100 typed formulas** registered. Latent (in source, NOT typed):

**Top 10 missing formulas with concrete integration:**
1. **Johnson-Cook flow stress + Extended Taylor** (MIT 3.22) — wire to `MillingPhysicsKernelEngine` + `LatheCuttingChemistryEngine`
2. **Error Budget RSS + Abbe error + Bryan's 5 Principles** (MIT 2.75) — wire to `ToleranceExtractionEngine` for stack-up validation
3. **Merchant shear + theoretical Ra = fz²/(8R)** (MIT 2.008) — wire to `SpeedFeedOrchestrator` + `cam-toolpath-check`
4. **NURBS / de Casteljau / B-spline curve fit** (Stanford GeoModeling) — new `CADParametricCurveEngine`
5. **EKF + LQR + PID** (MIT 2.004) — new `engines/control/` family
6. **Voronoi (Fortune) + Delaunay** (MIT 18.086) — new `MedialAxisEngine` for `prism_cam` adaptive-clearing
7. **Log-Barrier IP + Revised Simplex** (MIT 6.251J) — new `OptimizationSolverEngine` for `prism_omega`
8. **Hohmann transfer Z-link** (Orbital Mechanics) — wire to `cam-toolpath-check` for Z-link smoothness
9. **Wright/Hick/Fitts/Miller** (Sec 7) — new `OperatorErgonomicsEngine`
10. **Lanchester / Bass / OODA** (Sec 8-9) — wire to `ResourceAllocationEngine` + `bid-to-win`

---

## TIER 6 — ORPHAN MILESTONES (3 in roadmap, status `not_started`)

| Milestone | Topic | Status | Recommendation |
|-----------|-------|--------|----------------|
| `F360-REV-MS7` | "PrintToGeometry STEP Bridge + Fusion Import" | not_started | Fold into CAD-FUSION-LIVE-MS0 |
| `CC-MS0` | "CadQuery Integration + CAD Kernel Bridge" — 5,700 LOC TS engines referenced | not_started | Verify units against current inventory, fold survivors |
| `BP-MS0` | E2/QB/Xometry parity — File upload + CAD storage + DFM | not_started | CAD-storage + DFM units belong in CAD-FUSION-LIVE; reconcile |

---

## NOT FOUND (premise verification)

Wiki entry `[[project_archive_outdated]]` claimed `H:/PRISM_ARCHIVE_2026-02-01/EXTRACTED/` has 684 .js files. **The path does not exist on disk.** Closest analogs:
- `H:/prism-forge-archive` (forge worktree, not 684-file dump)
- `H:/_ORPHAN-PRISM-MCP-SERVER-archived-20260421` (this is the real one, see Tier 3)
- `H:/.prism-recovery-backup-20260428-1830` (recovery backup)

**Action:** lint the wiki entry — either correct the path to the orphan archive or mark deprecated.

---

## RECOMMENDED RECOVERY SEQUENCE

| Order | Target | Reason |
|-------|--------|--------|
| 1 | **Add to `.gitignore`**: `Python/`, `archives/`, `.sessions/`, `cad-engine/output/`, `**/__pycache__/`, `dist.bak-*/` | Stop the bleed — make `git status` legible |
| 2 | **Tier 0 #4: StepImportEngine.ts** | 1-day occt-import-js wire (vs 2-week GitHub integration plan) |
| 3 | **Tier 0 #1-3: PrintToProgramPipeline + AutoBridge + MultiAxis** | Headline asset, complete on disk |
| 4 | **Tier 0 #6-7: MillingPrintToProgram + STEPAP242PMI** | JM Die mills + GD&T extraction |
| 5 | **Tier 4: cherry-pick 5 cad-sw-fidx engines** | Cross-CAD router + vendor parity |
| 6 | **Tier 2: cite PHASE_CC doc, copy CC-MS4 feature primitive table** | Design alignment |
| 7 | **Tier 5 #1-3: Johnson-Cook + Abbe + Merchant** | Top-3 unported formulas |
| 8 | **Tier 1: drop stashes 0/1/2 (already shipped)** | Hygiene |
| 9 | **Tier 6: reconcile F360-REV-MS7 + CC-MS0 + BP-MS0** | Roadmap alignment |
| 10 | **Tier 3: dedup-then-quarantine top 10 orphan archive engines** | Last because each needs `duplicationGuardEngine.checkBeforeCreating()` |

Steps 1-4 are the immediate wins — they unlock the full print-to-program user-facing capability that's been sitting on disk since March 2026.

---

## METRICS

- 10 parallel agents dispatched, 8 returned actionable findings, 2 returned partial
- Search window: October 2025 - February 2026 (per user)
- Untracked files surfaced: ~140 CAD-relevant of 75,612 total
- Stash entries audited: 10 (3 already shipped, 1 misplaced, 6 supersedable)
- In-tree archive dirs: 17 canonical (after dedup), 1 high-value find
- Sibling worktrees with novel CAD: 1 of 4 (`cad-fidx-solidworks`)
- Pre-MCP orphan archive: 257 .js engines, 10 CAD-relevant
- Latent formulas in MIT corpus: 35-40 documented but not typed
- Orphan milestones: 3 `not_started` matching active scope

**Bottom line:** the print-to-program user-facing pipeline (Stages 1-5 + multi-axis + auto-bridge + STEP import + turning import) was substantially built in March-April 2026 and is sitting on disk uncommitted, mostly because work landed in stray `H:/prism/src/` instead of `H:/prism/mcp-server/src/`. Recovering Tier 0 items #1-#7 unlocks the entire `print-to-program` user-facing capability and directly serves the CAD-FUSION-LIVE-MS0 training surface.
