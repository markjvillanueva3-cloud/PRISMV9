# CAD Galaxy PATHS.md — H:/-wide path atlas for slot:delta

> Highest-ROI artifact: converts every future Grep/Glob from O(N) → O(1) for CAD work. Sourced from [[reference_cad_domain_map_for_delta_2026_05_27]] (4-parallel-agent hunt, iter112). Format: `<path> | <purpose> | <maintainer>`.
>
> **External corpus + software + launchers:** this file covers repo/engine paths; for the **129,306-file CAD/print corpus, software-seat install roots (Mastercam X8 / hyperMILL v31 / FreeCAD), launchers, and the JM DIE archive**, see the path index `[[cad-corpus-paths]]` (`knowledge/wiki/reference/cad-corpus-paths.md`, filesystem-scanned 2026-05-29).

## Engines — `H:/prism/mcp-server/src/engines/`
- `CADKernelEngine.ts` | Vec3/Mat4/NURBS/CSG/boolean/tessellation kernel | delta
- `GeometryEngine.ts` | boolean/offset/fillet/chamfer/distance/area/volume/transforms | delta
- `MeshEngine.ts` | generate/simplify/subdivide/repair/format-convert | delta
- `BRepTessellatorEngine.ts` (32K) | B-Rep → mesh | delta
- `CollisionDetectionEngine.ts` | ⚠SAFETY: AABB/OBB tool/fixture/part clearance | delta+safety
- `StockModelEngine.ts` | stock-removal simulation | delta
- `CADAssemblyGraphEngine.ts` (15K) | assembly tree + component relationships | delta
- `CADFeatureRecognitionEngine.ts` | feature ID + classification from geometry | delta
- `CADOperationTaxonomyEngine.ts` | feature taxonomy + op classification | delta
- `CADGeometryComparisonEngine.ts` | geometric similarity + diff | delta
- `CADFeatureMemoryEngine.ts` (22K) | feature embedding + memory | delta
- `CADToSTEPPipelineEngine.ts` | STEP generation + conversion | delta
- `CadQueryCodeGeneratorEngine.ts` | CadQuery parametric code gen | delta
- `Fusion360CADGeneratorAdapter.ts` | Fusion 360 automation | delta
- `InventorCADCodeGeneratorEngine.ts` (78.8K) | Autodesk Inventor | delta
- `SolidWorksCADExecutionBridge.ts` | SolidWorks API bridge | delta
- `HyperCADSCodeGeneratorEngine.ts` | HyperCAD-S code gen | delta
- `MastercamCADExecutionBridge.ts` | Mastercam exec bridge | delta
- `FreeCADCodeGeneratorEngine.ts` (31.5K) | FreeCAD parametric | delta
- `BobCADCAMBridgeEngine.ts` (46.3K) | BobCAD/CAM | delta
- `PartMediaToCADEngine.ts` (24.2K) | image/photo → CAD | delta
- `BlueprintToCADGenerationEngine.ts` (20.9K) | blueprint image → CAD | delta
- `BliskCADEngine.ts` (28K) | blisk/impeller gen | delta
- `FiveAxisCADTemplateEngine.ts` (51.1K) | 5-axis part template | delta
- `CADDrawingKnowledgeEngine.ts` (34.7K) | GD&T knowledge + drawing interp | delta
- `CADArchiveJoinAugmenterEngine.ts` (28K) · `CADAccuracyValidatorEngine.ts` (27K) · `CADAccessControlRBACABACEngine.ts` (12K) | augment/validate/RBAC | delta

## Algorithms — `H:/prism/mcp-server/src/algorithms/`
- `SweptVolumeCollision.ts` | Minkowski-sum swept-volume collision | delta
- `MinkowskiSum.ts` | Minkowski primitive | delta
- `InterpolationEngine.ts` | curve/surface interpolation | delta
- `SurfaceFinishPredictor.ts` | surface finish ↔ geometry | delta/oscar
- `ToolDeflectionModel.ts` | tool-deflection geometry comp | delta
- `FEASolver2D.ts` · `ThermalFEAModel.ts` · `FiniteElementMethod1D.ts` | FEM | delta
- `InverseKinematicsSolverEngine.ts` | 5-axis IK from geometry | delta
- `EffectiveDiameterCompensator.ts` · `JointSpeedFeedOptimizer.ts` | geometry-constrained tool/feed | delta/oscar

## Dispatchers — `H:/prism/mcp-server/src/tools/dispatchers/`
- `cadDispatcher.ts` | 564 actions (geometry_create, mesh_generate, feature_recognize, sketch_solve, assembly_analyze) | delta
- `cadAutomationDispatcher.ts` | 367 actions (open, create_sketch, extrude_feature, export_step) | delta
- `cadDrawingKnowledgeDispatcher.ts` | 11 (gdt_select, tolerance_apply) | delta
- `cadRegressionDispatcher.ts` | 37 (test_run, checkpoint, classify, triage) | delta
- `camDispatcher.ts` | 2475 (toolpath/collision/strategy/simulate) | kilo (consumer of delta output)

## Delta's worktree toolchain — `H:/prism-slot-delta/scripts/`
- `lib/cad-step-parse-lib.mjs` | pure AP203/AP242 parser | delta
- `lib/cad-step-emit-lib.mjs` | AST→STEP serializer + scalers | delta
- `lib/cad-step-ap242-emitter.mjs` | direct AP242 emitter (emitMultiPrismStep PROVEN) | delta
- `lib/cad-assembly-synthesize-lib.mjs` | 38 CAD synth primitives | delta
- `lib/cad-assembly-plan-lib.mjs` | 10 ARCHETYPE_RECIPES (turbine/blisk/impeller/mold-die/...) | delta
- `cad-analyze-step.mjs` | inspect any STEP (entity counts, coord ranges, radii) | delta
- `cad-replicate-from-template.mjs` | scale any ref STEP to new dims | delta
- `cad-generate-stepped-trilobe-cli.mjs` | parametric stepped-trilobe generator | delta
- `cad-generate-ejot-electrode-exact.mjs` | hardcoded EJOT electrode | delta
- `cad-fleet-verify.mjs` / `cad-fleet-regen-valid.mjs` | 70-file fleet round-trip | delta

## Python CAD pipelines — `H:/prism/cad-engine/`
- `mcp_cad_converter.py` | primary converter | delta
- `data/cad_drawing_ref/` · `data/cam_strategies/` · `data/platform_maps/` · `data/test_feedback/` | reference data | delta
- `H:/prism/mcp-cadquery/` | CadQuery bridge (6 STEP files) | delta

## CAD file corpus
- `H:/prism/state/shared/cad-generated/` | 70 synthesized STEP (10 archetypes × 7 CAD) + FLEET-VERIFY-REPORT | delta
- `H:/PRISM/JM DIE/` | 119 customer folders; 1,154 .step / 10,532 .ipt / 1,581 .dxf / 85,334 .pdf | test shop
- `H:/PRISM/JM DIE/_PART LIBRARY/JM EXAMPLE PARTS/trilobe-example.step` | JM 9106325 reference (6 NURBS + 6 cyl, AP203, brass) | delta
- `H:/prism/state/shared/cad-action-templates/` | action template library | delta
- `H:/prism/state/shared/cad-tribal-corpus.jsonl` (21.7K) | CAD tribal knowledge | delta
- `H:/prism/state/shared/cadcam-consolidated-corpus.json` (221K) | consolidated corpus | delta

## State JSONs — `H:/prism/mcp-server/data/state/`
- `CAD_COVERAGE_MATRIX.json` | 16,039 JM files scanned (7,092 .mcx-8 / 4,151 .ipt / ...) 33% coverage | delta
- `CAM_AI_ACTIONS_INDEX.json` (310K) · `CAM_TRIBAL_RAG_INDEX.json` (5.3MB) | CAM action/tribal RAG | kilo
- `cross-session-asset-registry.json` | CAD/CAM engine registry | delta

## Registries — `H:/prism/mcp-server/src/registries/`
- `CAMSystemRegistry.ts` | canonical CAM slugs + Tier 1/2/3 | kilo
- `ToolpathStrategyRegistry.ts` | 762+ strategies | kilo
- `AlgorithmRegistry.ts` | 52+ algorithms × 14 types | delta/tango

## Wiki — `H:/prism/knowledge/wiki/`
- `architecture/cad-galaxy.md` · `architecture/cad-step-toolchain.md` · `architecture/cad-electrode-generation.md` | delta galaxy entries | delta
- `lessons/cad-fusion-live-ms0-*.md` · `lessons/cad-step-failure-modes.md` | CAD lessons | delta
- `code-tribal/canonical/hypermill-*.md` (80+) | hyperMILL tips | kilo/delta

## CAD/CAM seats (live on this machine)
- Mastercam X8 + hyperCAD v31 RUNNING (use v31, NOT v33) — see [[reference_cad_cam_seat_paths_2026_05_27]]
- SolidWorks installed but COM unregistered — see [[reference_solidworks_local_install_2026_05_27]]

_Maintained by slot:delta. Rebuild trigger: new CAD engine / corpus dir / dispatcher. Last: 2026-05-28._

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for cad:** `resources/CAD FILES` · `resources/FUSION360` · `resources/Inventor` · `resources/SOLIDWORKS` · `resources/Freecad` · `resources/DWG TrueView 2027 - English` · `JM DIE/FUSION CAD AND CAM FILES` · `JM DIE/REVERSE ENGINEERING` · `JM DIE/PRISM CAD TESTING`
<!-- END:critical-resource-roots -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the cad galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **AlgorithmDB** (Algorithm Database) — `data/algorithms/` · 52 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **JMDieDocuStrataDB** (JM Die / DocuStrata Corpus Database) — `mcp-server/data/jm-die-database/` · 111,745 entries · manifest `mcp-server/data/jm-die-database/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **MaterialDB** (Material Database) — `data/materials/` · 6,509 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **PrismReferenceDB** (PRISM Unified Reference Database) — `mcp-server/data/prism-reference-db/` · 13,920 entries · manifest `mcp-server/data/prism-reference-db/MANIFEST.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ThreadDB** (Thread Specifications Database) — `data/databases/ThreadDB.json` · 339 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **ToleranceDB** (ISO 286 Tolerance Database) — `data/databases/ToleranceDB.json` · 260 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **WorkholdingDB** (Workholding Reference Database) — `data/databases/WorkholdingDB.json` · 14 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/cad/` (6 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/cad_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="cad" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs cad "<question>"` (hybrid CAG+RAG, local Ollama, $0)
- UP (pull from master): `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
- DOWN (push to master): write `<type>_<slot>_<topic>.md` -> master memory dir -> auto-fed to `knowledge/memories/<type>/`

**All resources -- easily pathed + usable (search the INDEX, never re-scan -- R8):**
- CAD/CAM/training/catalog/post/machine trove: `resources/RESOURCES-INDEX.md` (`H:/PRISM/resources/`) -- every CAM seat + catalogs + MIT courses + machine-sim + macro/post libs
- JM Die shop ground-truth (38,251 files): `mcp-server/data/jm-die-database/` (`manifest.json` + `.index/*.jsonl`) -- programs by controller, posts, Fusion CAD/CAM, tribal+wiki corpus
- Business/order/financial docs (257,992 files): `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` + `manifest.json` -- quote-to-ship + ERP ground truth (ALREADY indexed; do NOT re-OCR)
- Vendor catalog corpus: `mcp-server/data/vendor-catalog-db/manifest.json` (425 vendors + catalog tables)
- The 3 critical roots + per-galaxy db-intake/vendor-corpus are plotted in their own marked blocks below (`critical-resource-roots`, etc.).
- USAGE (query every resource from this domain): `prism_data:database_search` / `database_list` / `globalSearch` · skills `/resource-census` `/prism-paths` · new PDFs -> `scripts/extract-jm-die-corpus-page-by-page.py` (lima pypdf) · skip-list `state/shared/specs/PRISM-NOISE-PATHS-2026-05-26.md`
<!-- END:knowledge-atlas -->
