# CAD Galaxy — slot:delta
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = cad-domain doctrine ONLY; never re-inline universal prose.

---

## 0. Startup: read context ledger first

`state/shared/DELTA-CONTEXT-LEDGER.md` — ROI-ordered open-threads ledger. Read on `/startup-delta` BEFORE any other context-building. Reconcile done/open on each `/handoff-delta`. Buildout queue: `state/shared/specs/DELTA-CAD-GALAXY-MAX-BUILDOUT-2026-06-12.md`.

---

## 1. Domain scope — what counts as "cad"

The cad galaxy is PRISM's **geometry + part-model layer**: prints/photos/text/intent → solid models →
feature recognition → dimensional validation → neutral-format round-trip.

**Owns:** geometry kernel + ops (Vec3/Mat4/NURBS/CSG/boolean/tessellation/fillet/chamfer/transforms);
feature recognition + taxonomy; STEP/IGES/AP242 round-trip; generative CAD (blueprint→CAD,
photo→CAD, text→CAD, parametric archetypes); seat bridges (Fusion 360, Inventor, SolidWorks,
FreeCAD, Mastercam, BobCAD, hyperCAD-S, CadQuery); drawing knowledge + GD&T; collision/stock
clearance (safety-relevant).

**EXCLUDES:** CAM toolpath strategy/generation → **cam (kilo)**; controller G-code emission →
**post-processor (echo)**; OCR/raster blueprint pixel→text → **blueprint-vision (xray)**;
auto-quote pricing from a recognized print → **quoting (charlie)**; CAD-RAG model training/retrain
triggers → **ai-training (india)**.

Slot: **delta** · worktree: `H:/prism-slot-delta` · branch: `slot/delta`.

---

## 2. Canonical constants + data paths

- **Physics constants** — import ONLY from `mcp-server/src/physics/constants.ts`. NEVER inline.
  Collision/clearance margins are safety-relevant; never re-derive material constants locally.
- **Tolerance/GD&T** (ISO 286 IT-grades, fit classes): `data/databases/ToleranceDB.json`
  (260 entries) — query via `prism_data:database_search`, NEVER full-read.
- **Thread specs:** `data/databases/ThreadDB.json` (339 entries).
- **Workholding:** `data/databases/WorkholdingDB.json` (14 entries).
- **CAD format/converter registry:** `CADAdapterRegistry.ts` (top-level engines/).
- **Algorithm registry:** `mcp-server/src/registries/AlgorithmRegistry.ts`.
- **Coverage matrix:** `mcp-server/data/state/CAD_COVERAGE_MATRIX.json` (16,039 JM files scanned).
- **External standards (pull-fresh):** wiki `[[cad-foundations]]` (ASME Y14.41/ISO 16792 MBD,
  AP242 PMI, 4-family feature-recognition taxonomy). Numeric GD&T constants stay UNVERIFIED in
  `knowledge/wiki/cad/_staging/` until delta verifies vs source.

Mark any path you have not opened `(verify)` before relying on it.

## 3. Verified engines

All names Glob-confirmed at `mcp-server/src/engines/` on 2026-06-13.

| Role | Engine file |
|------|-------------|
| Geometry kernel (Vec3/Mat4/NURBS/CSG) | `CADKernelEngine.ts` |
| Boolean/offset/fillet/transforms | `GeometryEngine.ts` |
| Mesh gen/simplify/repair | `MeshEngine.ts` |
| B-Rep → mesh tessellation | `BRepTessellatorEngine.ts` |
| Stock-removal simulation | `StockModelEngine.ts` |
| **SAFETY** AABB/OBB clearance | `CollisionDetectionEngine.ts` |
| Feature ID + classification | `CADFeatureRecognitionEngine.ts` (**stub per ENGINE_DIGEST U-EFF25 — verify body before wiring**) |
| Feature taxonomy + op classification | `CADOperationTaxonomyEngine.ts` |
| Geometric similarity + diff | `CADGeometryComparisonEngine.ts` |
| Feature embedding + memory | `CADFeatureMemoryEngine.ts` |
| Assembly tree + component graph | `CADAssemblyGraphEngine.ts` |
| Format-agnostic CAD→STEP pipeline | `CADToSTEPPipelineEngine.ts` |
| 100% accuracy gate | `CADAccuracyValidatorEngine.ts` |
| GD&T knowledge + drawing interp | `CADDrawingKnowledgeEngine.ts` |
| Archive join augmentation | `CADArchiveJoinAugmenterEngine.ts` |
| RBAC/ABAC access control | `CADAccessControlRBACABACEngine.ts` |
| Print/photo → CAD | `BlueprintToCADGenerationEngine.ts`, `PartMediaToCADEngine.ts` |
| Blisk/impeller + 5-axis templates | `BliskCADEngine.ts`, `FiveAxisCADTemplateEngine.ts` |
| Seat bridges (all Glob-confirmed) | `Fusion360CADGeneratorAdapter.ts` · `InventorCADCodeGeneratorEngine.ts` · `SolidWorksCADExecutionBridge.ts` · `FreeCADCodeGeneratorEngine.ts` · `MastercamCADExecutionBridge.ts` · `BobCADCAMBridgeEngine.ts` · `HyperCADSCodeGeneratorEngine.ts` · `CadQueryCodeGeneratorEngine.ts` |
| Format conversion + registry | `CADFormatConversionMatrixEngine.ts` · `CADAdapterRegistry.ts` |

**Algorithms** (`mcp-server/src/algorithms/` — Glob-confirmed): `SweptVolumeCollision.ts` ·
`FEASolver2D.ts`. `prism_algorithm:spatial_ransac_fit` for planar-face extraction from noisy point
clouds. Function taxonomy + op grades: `CADOperationTaxonomyEngine.ts` + wiki `[[cad-function-taxonomy]]`.

Check `ENGINE_DIGEST.md` + `duplicationGuardEngine.checkBeforeCreating()` before forging new engines.
Full engine surface list: `mcp-server/data/docs/ENGINE_DIGEST.md`.

---

## 4. Dispatcher quick-ref

All four dispatchers Glob-confirmed at `mcp-server/src/tools/dispatchers/` on 2026-06-13.
Action counts from PATHS.md — verify against the dispatcher `z.enum` before quoting exact counts.

| Dispatcher | Key actions |
|------------|-------------|
| `cadDispatcher.ts` (~564 actions) | `geometry_create` · `mesh_generate` · `feature_recognize` · `sketch_solve` · `assembly_analyze` · `step_parse` · `cad_validate` · `collision_check` |
| `cadAutomationDispatcher.ts` (~367 actions) | `open` · `create_sketch` · `extrude_feature` · `export_step` · `navigate_by_reference` |
| `cadDrawingKnowledgeDispatcher.ts` (~11 actions) | `gdt_select` · `tolerance_apply` |
| `cadRegressionDispatcher.ts` (~37 actions) | `test_run` · `checkpoint` · `classify` · `triage` |

Full action lists: grep the dispatcher source `z.enum` — never trust a cached count.
MCP-down fallback: `node scripts/cad-text-to-cadquery.mjs` (text→CadQuery, qwen2.5-coder:32b).

---

## 5. Domain gotchas / safety rails

1. **`CADFeatureRecognitionEngine` stub (U-EFF25).** Grep body before wiring to cam/quoting — sub-500-byte file = stub candidate.
2. **Fusion 360 API unit trap: API returns cm, display mm.** `value_mm = api_cm * 10` (factor-of-10; distinct from the global 25.4x inch/mm trap).
3. **hyperCAD-S: v31 RUNNING, NOT v33.** Use v31 native hook for macro/feature automation; v33 installed but not active.
4. **SolidWorks COM unregistered.** `SolidWorksCADExecutionBridge.ts` fails until COM re-registered. Do not treat as live.
5. **UNITS — JM Die convention is INCH.** Verify per-part from `G20`/`G21` or STEP `CONVERSION_BASED_UNIT`. Mismatch = 25.4x scale error → scrap.
6. **Collision is the S(x) gate.** `CollisionDetectionEngine.ts` clearance margins gate cutting. Wrong constant here = machine crash. Always pair with `prism_safety`.
7. **`CADArchiveJoinAugmenterEngine` under-integrated.** Must complement (not duplicate) `ProgramEquivalentIndexEngine` (U-PPL-D4). Verify edge is consumed.

---

## 6. What NOT to do (domain refuses)

- NEVER export STEP without `CADAccuracyValidatorEngine` — unvalidated STEP causes cam collision misses.
- NEVER bypass `CollisionDetectionEngine` clearance — it is the S(x) gate; skipping = machine-crash path.
- NEVER modify B-Rep with an unverified boolean — silent geometry corruption; verify against expected volume.
- NEVER inline ISO 286 fit values — read from `data/databases/ToleranceDB.json` only.
- NEVER assume `CADFeatureRecognitionEngine` output is correct — flagged stub (U-EFF25); validate before wiring to cam.
- NEVER write directly to `knowledge/tribal/cad-*.md` — auto-overwritten on regen; use `prism_knowledge:tribal_capture slot=delta`.
- NEVER reference `cad-fleet-verify.mjs`, `cad-fleet-regen-valid.mjs`, `cad-analyze-step.mjs` — do NOT exist on disk (Glob-verified 2026-06-13).

---

## 7. Text→CAD generation lane

`scripts/cad-text-to-cadquery.mjs` (Glob-confirmed) — text→CadQuery via qwen2.5-coder:32b, staged at `state/shared/cad-text-gen/`. Wiki: `[[cad-text-to-cad-landscape]]`. Navigate-by-reference: Fusion add-in `:18365` endpoints (`[[fusion-backend-nav-map]]`, `state/shared/fusion-backend/BACKEND-NAV-MAP.md`).

---

## 8. Tribal + corpus pointers

- **Wiki:** `knowledge/wiki/architecture/cad-galaxy.md` · `cad-step-toolchain.md` · `cad-electrode-generation.md`; lessons `knowledge/wiki/lessons/cad-step-failure-modes.md`; corpus index `knowledge/wiki/training/cad-corpus-index.md`; path atlas `[[cad-corpus-paths]]` (129,306-file corpus); tribal `knowledge/wiki/code-tribal/math-cad-geometry-nurbs-gdt.md`.
- **CAD tribal corpus:** `state/shared/cad-tribal-corpus.jsonl` (21.7K) · `state/shared/cadcam-consolidated-corpus.json` (221K).
- **JM Die corpus:** `H:/PRISM/JM DIE/` — 1,154 `.step` / 10,532 `.ipt` / 1,581 `.dxf` / 85,334 `.pdf`. Access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NOT Glob/Grep. Resource roots: `resources/CAD FILES`, `resources/FUSION360`, `JM DIE/FUSION CAD AND CAM FILES`.
- **Memory search:** `prism_memory:semantic_search query="cad" topK=20`. Regenerate AI-fleet state: `node scripts/ai-systems-fleet-state.mjs`.

---

## 9. Cross-galaxy edges (PSN)

cad is the **upstream geometry origin** of the print-to-program pipeline.

- **cad → cam (kilo):** `feature_recognize` output → `cam_strategy_recommend` → `toolpath_generate`.
- **cad ← blueprint-vision (xray):** xray produces raster→text extractions; cad consumes via `BlueprintToCADGenerationEngine`.
- **cad → quoting (charlie):** recognized features + GD&T + material → auto-quote-from-print.
- **cad → ai-training (india):** CAD classifier + CAD-RAG emit features for india GNN tier-5 classifier. Bridge action names: `xproc_kg_project_features` // UNVERIFIED — grep india dispatcher before calling.
- **cad ↔ academy (lima):** synthesized CAD examples feed training corpus; academy references CAD/GD&T knowledge.
- **cad → safety:** `CollisionDetectionEngine` clearance → `prism_safety` S(x) gate before any cut.

---

## 10. Closed-loop integration (india)

Per `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`: publish outcomes via `xproc_outcome_publish {slot:'delta', domain:'cad'}` // UNVERIFIED; emit features via `xproc_kg_project_features` // UNVERIFIED — grep india dispatcher before calling either. Tribal capture: `prism_knowledge:tribal_capture slot=delta` (NEVER direct markdown writes). `outcome-bus-auto-tap.mjs` exists at `.claude/hooks/` — verify wiring in settings.json.

---

## 11. Test commands

```bash
cd mcp-server && rtk npx vitest run -t "CAD"
cd mcp-server && rtk npx vitest run src/__tests__/CADKernelEngine.test.ts
```

Engine tests live in `mcp-server/src/__tests__/` only (`stop_on_unwired_assets.mjs` scans that dir).

---

## 12. AI / reasoning surface

`node scripts/lib/galaxy-reasoning-bridge.mjs cad "<question>"` — Ollama routing: STEP AP242 feature tree → `gpt-oss:20b`; CAD engine code lint → `qwen2.5-coder:32b`; deep synthesis → `gpt-oss:120b`. Use octopus when `feature_recognize` confidence is low or STEP-vs-IGES unit disputes arise. CAG for static AP242 taxonomy; RAG for live JM Die corpus coverage state.

<!-- AI-SYSTEMS-STATE:BEGIN -->
> Fleet AI state: `knowledge/memories/patterns/ai-systems-fleet-state.md`. Regen: `node scripts/ai-systems-fleet-state.mjs`.
<!-- AI-SYSTEMS-STATE:END -->
