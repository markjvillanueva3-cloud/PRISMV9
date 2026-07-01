---
name: reference-cad-domain-map-for-delta-2026-05-27
description: "Comprehensive map of every PRISM CAD-domain node delta-slot needs to know about — engines, algorithms, dispatchers, databases, corpus locations, system-viz nodes, PSN connections. Built per operator directive after iter112. Parallel-agent-hunted (4 agents). Replaces guess-and-grep with one indexed lookup."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.493Z
aliases: reference_cad_domain_map_for_delta_2026_05_27
---


# CAD-domain master map for slot:delta (2026-05-27, iter112)

> Built per operator directive ("add to memory anything cad related — prints and cad model locations, engines, algos, database etc; if a node connects to cad domain node, memorize it for delta"). 4 parallel Explore agents hunted file/node locations; this consolidates their findings.

## 1. CAD engines (top 30, H:/prism/mcp-server/src/engines/)

### Computational core
- `CADKernelEngine.ts` — Vec3/Mat4/NURBS/CSG/boolean ops/mesh tessellation kernel
- `GeometryEngine.ts` — boolean, offset, fillet, chamfer, distance, area/volume, transforms
- `MeshEngine.ts` — generate, simplify, subdivide, repair, format conversion
- `BRepTessellatorEngine.ts` — B-Rep → mesh tessellation (32.2K)
- `CollisionDetectionEngine.ts` — SAFETY CRITICAL: AABB/OBB, tool/fixture/part clearance, plunge checks
- `StockModelEngine.ts` — stock removal simulation + tracking

### Assembly + features + classification
- `CADAssemblyGraphEngine.ts` — assembly tree, component relationships, hierarchical queries
- `CADFeatureRecognitionEngine.ts` — feature ID + classification from geometry
- `CADOperationTaxonomyEngine.ts` — feature taxonomy + operation classification
- `CADGeometryComparisonEngine.ts` — geometric similarity + diff analysis
- `CADFeatureMemoryEngine.ts` — feature embedding + memory (22.1K)
- `CADFileIndexerEngine.ts` — CAD file indexing + search
- `CADReverseTemplateEngine.ts` — template extraction from existing CAD

### Output + bridges (per-software)
- `CADToSTEPPipelineEngine.ts` — STEP file generation + conversion
- `CadQueryCodeGeneratorEngine.ts` — CadQuery parametric code gen
- `Fusion360CADGeneratorAdapter.ts` — Fusion 360 automation
- `InventorCADCodeGeneratorEngine.ts` — Autodesk Inventor (78.8K)
- `SolidWorksCADExecutionBridge.ts` — SolidWorks API bridge
- `HyperCADSCodeGeneratorEngine.ts` — HyperCAD-S code gen
- `MastercamCADExecutionBridge.ts` — Mastercam exec bridge
- `FreeCADCodeGeneratorEngine.ts` — FreeCAD parametric (31.5K)
- `AutoCADAddinPluginEngine.ts` — AutoCAD addin/plugin
- `BobCADCAMBridgeEngine.ts` — BobCAD/CAM integration (46.3K)
- `PrintToHyperCADSBridge.ts` — print → HyperCAD pipeline

### Specialized + input pipelines
- `PartMediaToCADEngine.ts` — image/photo → CAD (24.2K)
- `BlueprintToCADGenerationEngine.ts` — blueprint image → CAD (20.9K)
- `BliskCADEngine.ts` — blisk/impeller CAD gen (28.0K)
- `FiveAxisCADTemplateEngine.ts` — 5-axis part template gen (51.1K)
- `CADDrawingKnowledgeEngine.ts` — GD&T knowledge + drawing interp (34.7K)
- `CADLicenseHealthEngine.ts` — CAD system license monitoring

## 2. CAD algorithms (H:/prism/mcp-server/src/algorithms/)

- `SweptVolumeCollision.ts` — Minkowski-sum swept volume collision
- `MinkowskiSum.ts` — Minkowski sum primitive
- `InterpolationEngine.ts` — curve/surface interpolation
- `SurfaceFinishPredictor.ts` — surface finish ↔ geometry model
- `ToolDeflectionModel.ts` — tool-deflection geometry compensation
- `FEASolver2D.ts` — 2D finite element solver
- `ThermalFEAModel.ts` — thermal FEA for temp distribution
- `FiniteElementMethod1D.ts` — 1D structural FEM
- `InverseKinematicsSolverEngine.ts` — 5-axis IK from part geometry
- `EffectiveDiameterCompensator.ts` — tool effective-diameter compensation
- `JointSpeedFeedOptimizer.ts` — speed/feed w/ geometry constraints
- `LinearStateSpaceModel.ts` · `KalmanFilter.ts` · `LagrangianMechanics.ts` · `RegressionEngine.ts` — supporting math

## 3. CAD dispatchers (H:/prism/mcp-server/src/tools/dispatchers/)

| Dispatcher | Actions | Key actions |
|------------|---------|-------------|
| `cadDispatcher` | **564** | geometry_create, mesh_generate, feature_recognize, sketch_solve, assembly_analyze |
| `cadAutomationDispatcher` | **367** | open, create_sketch, extrude_feature, assembly_create, export_step |
| `camDispatcher` | **2475** | toolpath_generate, collision_check, strategy_select, simulate_run |
| `cadDrawingKnowledgeDispatcher` | 11 | gdt_select, symbol_interpret, tolerance_apply |
| `cadRegressionDispatcher` | 37 | test_run, checkpoint, classify, triage |
| `camFunctionDispatcher` | 8 | function_index, natural_language_route |

## 4. CAD libraries on slot-delta worktree (H:/prism-slot-delta/scripts/lib/)

All built/maintained by slot:delta. The Layer-1/2/3 piece-3 pipeline:
- `cad-assembly-plan-lib.mjs` — Layer 1: `planFromArchetype`, `validateAssemblyPlan`, 10 ARCHETYPE_RECIPES (turbine, blisk, impeller, mold-die, weldment, sheet-metal-enclosure, die-set, gear, bracket, pulley)
- `cad-assembly-synthesize-lib.mjs` — Layer 2: **29 ops, 37 distinct primitives at iter112** — 6 sketch primitives (circle/rect/polygon/ellipse/spline/arc), 2 feature ops (extrude/revolve), 21 composed ops (assembly, boolean, pattern, hole, fillet, chamfer, draft, shell, sweep, loft, mirror, fromPlan, linearArray, helix, rectGrid, polarArray, ribPattern, bend, slot, counterbore, countersink, boss, structuralChannel, keyway), 4 STEP entity primitives (sphericalSurface, offsetSurface, trimmedCurve, edgeCurve, orientedEdge)
- `step-extract-lib.mjs` / `step-assembly-extract-lib.mjs` — round-trip parsers; `countAllEntities`, `classifyShape`, `complexityScore`
- `cad-template-*.mjs` — template generation + consumer

### Orchestrators + CLIs
- `H:/prism-slot-delta/scripts/cad-generate-assembly-demo.mjs` — single (sw, archetype) end-to-end pipeline
- `H:/prism-slot-delta/scripts/cad-fleet-verify.mjs` — 70-file fleet round-trip
- `H:/prism-slot-delta/scripts/cad-fleet-report-md.mjs` — human-readable report

## 5. Python CAD pipelines (H:/prism/cad-engine/)

- `cad-engine/mcp_cad_converter.py` — primary converter
- `cad-engine/data/cad_drawing_ref/` — drawing reference data
- `cad-engine/data/cam_strategies/` — CAM strategy DB
- `cad-engine/data/platform_maps/` — platform integration maps
- `cad-engine/data/test_feedback/` — test validation feedback
- `cad-engine/exports/test/` — test exports
- `H:/prism/mcp-cadquery/` — CadQuery bridge (6 STEP files)

## 6. CAD file corpus (where CAD files live)

### By extension (full repo)
| ext | count | example |
|-----|------:|---------|
| .step | **1,154** | state/shared/cad-generated/blisk-catia.step |
| .nc | 114,713 | JM DIE/CNC LATHE/ACME/... |
| .pdf | 85,334 | JM DIE/.../source.pdf (drawings + manuals) |
| .ipt | 10,532 | JM DIE/.../inventor parts |
| .iam | 1,164 | JM DIE/.../inventor assemblies |
| .dxf | 1,581 | JM DIE/CNC LATHE/... |
| .dwg | 223 | JM DIE/... |
| .idw | 361 | JM DIE/... (inventor drawings) |
| .stp | 184 | JM DIE/... |

### JM Die test shop (H:/prism/JM DIE/)
- **119 customer folders** under CNC LATHE/, 59 under CNC MILL HAAS/, WIRE EDM/, OKUMA/
- Top customers (~1-3K files each): ACME, ACUMENT, ADDISON FASTENERS, AEROTECH, AFI INDUSTRIES, AGRATI, AKKO, ALCOA (3.2K), ALLFAST, AMGLO, ANDERSON, ARCHER, ARCONIC, ATF, BELVIDERE, BIRMINGHAM FASTENER, BRAINARD RIVET

### Synthesized STEP fleet (H:/prism/state/shared/cad-generated/)
- **70 STEP files** = 10 archetypes × 7 CAD softwares
- Archetypes: turbine, blisk, impeller, mold-die, weldment, sheet-metal-enclosure, die-set, gear, bracket, pulley
- Softwares: solidworks, inventor, fusion-360, catia, siemens-nx, rhino, onshape
- QA: FLEET-VERIFY-REPORT.{json,md}

### CAD corpus directories (H:/prism/state/shared/)
- `cad-action-templates/` — action template library
- `cad-cam-pdf-nodes/` — PDF node extraction
- `cad-regen-output-proof/` — regeneration validation
- `cad-pipeline-knowledge-index.json` (337K) — pipeline knowledge index
- `cad-tribal-corpus.jsonl` (21.7K) — tribal knowledge
- `cadcam-consolidated-corpus.json` (221K) — consolidated corpus

## 7. CAD state JSONs (H:/prism/mcp-server/data/state/)

- `CAD_COVERAGE_MATRIX.json` — 16,039 JM DIE files scanned; 7,092 .mcx-8 (Mastercam), 4,151 .ipt, 1,779 .mcx, 112 .stp, 38 .sldprt, 31 .hmc; 33.33% coverage
- `CAM_AI_ACTIONS_INDEX.json` (310K) — CAM action routing/resolution
- `CAM_TRIBAL_RAG_INDEX.json` (5.3MB) — tribal RAG index
- `cad-cam-resources-pdf-index.json` — 3,936 PDFs indexed (38 CAD, 164 CAM, 116 hyperMILL, 21 Mastercam, 14 SolidWorks)
- `cross-session-asset-registry.json` — CAM/CAD engine registry
- `jm_die_provenance_audit.ndjson` — 45+ CAD corpus ingestion records

## 8. CAD ingestion cache (H:/prism/mcp-server/data/ingestion_cache/)
- `CAD-CORPUS-CATALOG-2026-05-24.json` — JM DIE-sourced catalog
- `extracted-pdfs/` — 24+ JSONL files from SolidWorks, Mastercam, HyperMILL, InventorCAM, Autodesk, CNC Cookbook manuals
- `FREE-CAD-BOOK-CATALOG-EXTENDED-2026-05-26.json` — free CAD learning catalog

## 9. CAD wiki entries (H:/prism/knowledge/wiki/)

- `lessons/cad-blueprint-revolve-2475-037.md` — CAD revolution lesson
- `lessons/cad-fusion-live-ms0-integration-discovery.md` — Fusion live findings
- `lessons/cad-fusion-live-ms0-h-drive-archaeology.md` — corpus discovery
- `code-tribal/canonical/hypermill-*.md` (80+ files) — HyperMILL tips canonicalized

## 10. CAD registries (H:/prism/mcp-server/src/registries/)

- `CAMSystemRegistry.ts` — canonical slug for every CAM (mastercam, hypermill, fusion360, solidcam, catia-cam, powermill, nx-cam, mastercam-solidcam, inventorcam, autocad-cad); Tier 1/2/3 priority
- `ToolpathStrategyRegistry.ts` — 762+ strategies (milling rough 127, milling finish 156, hole 98, turning 124, multi-axis 157) + 50+ PRISM novel strategies
- `index.ts` master index — MaterialRegistry (6.3K materials), MachineRegistry (2.1K), ToolRegistry (15.9K), AlarmRegistry (2.5K), PostProcessorRegistry (8), SkillRegistry (135), ScriptRegistry (163)
- `AlgorithmRegistry.ts` — 52+ algorithms × 14 types

## 11. CAD-domain milestones (state/shared/specs/ROADMAP-CONSOLIDATED)

- `CAD-AI-DEEP` — deep learning, deep reasoning, physics-informed, generative
- `CAD-AI-ULTRA` — CAD-CAM integration, knowledge/learning, multi-system, workholding
- `CAD-AUTOMATION-MS0` — SolidWorks, Inventor, FreeCAD, Mastercam, Fusion360, hyperMILL bridges
- `CAD-CAM-MASTER` — consolidated 7-track roadmap
- `CAD-COMPLETE-MS0` — universal index + multi-system gen + regeneration test
- `CAD-DRAW-MAX-MS0` — autonomous propose→execute→publish loop on hyperCAD-S
- `CAD-GROUND-TRUTH-MS0` — native parsers, STEP pipelines, canonical refs
- `CAD-INFRA-MS0` — regression test infra
- `CAD-TRAINING-EXTRACT-MS0` — PDF/video knowledge harvest
- `CAD-UIX-MS0` — every UI input/setting for 6 priority CAD systems
- `CAD-UNIVERSAL-CONTROL-MS0` — full AI to control all CAD softwares
- `CADCAM-AGI-MS0` — foundation (ghost roost, pending)
- `CADCAM-DAGI-MS0..7` — deep neural drawing + feature synthesis (ghost roosts)
- `CADCAM-DEEPAGI-MASTER` — full neural drawing + intelligent CAM orchestration

## 12. /system-viz CAD-domain hub nodes (incoming/outgoing)

- `CAMBaselineRegressorEngine` (in 14, out 4803) — hub
- `CAMMLSplitEngine` (in 14, out 4801)
- `CAMCatalogPhysicsLinkerEngine` (in 12, out 4798)
- `FiveAxisCAMIntegrationEngine` (in 17, out 4744)
- `dispatcher-cam` (in 4631, out 2191)

## 13. PSN leg connections to CAD

| PSN leg | CAD connection |
|---------|----------------|
| #1 Obsidian brain | `knowledge/memories/{feedback,reference,project}/cad_*` |
| #2 PRISM OS | `prism_cad:*` dispatcher actions exist |
| #3 Wiki | `knowledge/wiki/architecture/cad/` + `code-tribal/cad/` |
| #5 Tribal | `knowledge/tribal/cad/` |
| #6 System Viz | CAD galaxy lens (proposed roost) |
| #7 Engines | 60+ `engines/cad/CAD*Engine.ts` |
| #9 Formulas | domain-partitioned CAD physics formulas |

## 14. CAD galaxy sentinel status

**No canonical CAD soul exists yet** (DOMAIN-GALAXY-DOCTRINE-MS0):
- P1 Galactic center (`engines/cad/CLAUDE.md`) — 🔴 missing
- P2 Noise filter (per-cad .claude/noise-deny.json) — 🔴 missing
- P6 Soul affinity — 🔴 no slot canonically assigned

**Delta is the de-facto CAD slot** per [[reference_juliett_12chat_allocation_2026_05_17|JULIETT-12CHAT-ALLOCATION]]-MS0; phase A of Galaxy-DOCTRINE-MS0 roadmap targets CAD slot establishment.

## 15. CAD ghost-roosts (planned, not built)

- `CADCAM-AGI-MS0` — L8/ghost foundation
- `CADCAM-DAGI-MS1` — per-software action learning (ghost)
- `CADCAM-DAGI-MS2` — complex feature synthesis (ghost)
- `CADCAM-DAGI-MS3` — accuracy validation (ghost)
- `CADCAM-DAGI-MS4..7` — advanced synthesis/reasoning/control (ghosts)
- `CADCAM-DEEPAGI-MASTER` — full system coord (ghost)

## 16. CAD-related SQLite + KV stores
- `H:/prism/.swarm/memory.db` — cross-session memory store; CAD/CAM state + patterns

## 17. Quick-recall commands

```bash
# Read CAD coverage matrix:
node -e "console.log(require('H:/prism/mcp-server/data/state/CAD_COVERAGE_MATRIX.json'))"

# Regenerate piece-3 fleet:
for sw in solidworks inventor fusion-360 catia siemens-nx rhino onshape; do
  for archetype in turbine blisk impeller mold-die weldment sheet-metal-enclosure die-set gear bracket pulley; do
    node H:/prism-slot-delta/scripts/cad-generate-assembly-demo.mjs "$archetype" "$sw"
  done
done

# Re-verify fleet:
node H:/prism-slot-delta/scripts/cad-fleet-verify.mjs

# Test delta's synth lib:
cd H:/prism-slot-delta && node --test scripts/lib/cad-assembly-synthesize-lib.test.mjs
```

## 18. Anchor memories (chain)

- `reference_cad_template_coverage_plateau_2026_05_27` — early plateau analysis
- `reference_cad_template_engineering_wins_2026_05_27` — 6× ROI doctrine
- `reference_cad_assembly_gen_layer1_live_2026_05_27` — Layer-1 milestone
- `reference_cad_piece3_complete_2026_05_27` — iter25-iter64 state
- `reference_cad_piece3_fleet_complete_2026_05_27` — 0-empty fleet @ iter84 + iter85-100 + iter96-105 post-resume continuation
- **THIS memory** — full CAD-domain map @ iter112 (37 primitives, 137 tests passing)
