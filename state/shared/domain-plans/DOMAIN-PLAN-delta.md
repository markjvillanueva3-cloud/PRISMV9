---
artifact: domain-buildout-plan
slot: delta
galaxy: cad
galaxy_dir: mcp-server/src/engines/cad/
kienzle_pages:
  - Kienzle CAD Features.dc.html
  - Kienzle Collision Gap.dc.html
  - Kienzle Thermal Comp.dc.html
  - Kienzle Trilobe Creator.dc.html
  - Kienzle Warm-Up Generator.dc.html
backend_dispatchers: [prism_cad]
frontend_owner: quebec
status: draft
generated_by: delta-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — delta (cad)

> Takes the cad galaxy to PhD-master depth, then test → simulate → validate → fine-tune,
> then builds/fleshes out the five Kienzle CAD frontend pages.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub · no-inline-constants ·
> physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

---

## §1 — Domain identity & scope

- **Owns:** geometry kernel + ops (Vec3/Mat4/NURBS/CSG/boolean/fillet/tessellation);
  feature recognition + taxonomy; STEP/IGES/AP242 round-trip; generative CAD
  (blueprint→CAD, photo→CAD, text→CadQuery, parametric archetypes); seat bridges
  (Fusion 360, Inventor, SolidWorks, FreeCAD, Mastercam, BobCAD, hyperCAD-S, CadQuery);
  GD&T drawing knowledge; collision/stock clearance (S(x) gate — safety-relevant).
- **Excludes:** CAM toolpath strategy/generation → cam (kilo); G-code controller emission
  → post-processor (echo); raster blueprint OCR → blueprint-vision (xray); auto-quote
  pricing from a recognized print → quoting (charlie); LoRA/GNN retrain triggers →
  ai-training (india).
- **Slot worktree:** `H:/prism-slot-delta` · branch `slot/delta`
- **Galaxy brain:** `mcp-server/src/engines/cad/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`
  · context ledger: `state/shared/DELTA-CONTEXT-LEDGER.md` (read first on `/startup-delta`).

---

## §2 — Current state (verified — R12)

- **Scaffolding:** PARTIAL — AWARENESS.md present; AI-synergy score 4/4 on all 4 measured
  dimensions (discoverability / ownsOrWiresAi / vaultSynergy / crossSubstrate); PATHS /
  TOOLBELT / MEMORY present; context ledger live; buildout queue at
  `state/shared/specs/DELTA-CAD-GALAXY-MAX-BUILDOUT-2026-06-12.md`.

- **Engines (Glob-confirmed 2026-06-13 per cad/CLAUDE.md §3):** 28 named engines including
  `CADKernelEngine` · `GeometryEngine` · `MeshEngine` · `BRepTessellatorEngine` ·
  `StockModelEngine` · `CollisionDetectionEngine` (S(x) gate) ·
  `CADFeatureRecognitionEngine` (**STUB — U-EFF25** — verify body before any downstream
  wiring) · `CADOperationTaxonomyEngine` · `CADGeometryComparisonEngine` ·
  `CADFeatureMemoryEngine` · `CADAssemblyGraphEngine` · `CADToSTEPPipelineEngine` ·
  `CADAccuracyValidatorEngine` · `CADDrawingKnowledgeEngine` ·
  `CADArchiveJoinAugmenterEngine` · `CADAccessControlRBACABACEngine` ·
  `BlueprintToCADGenerationEngine` · `PartMediaToCADEngine` · `BliskCADEngine` ·
  `FiveAxisCADTemplateEngine` · 8 seat-bridge adapters (Fusion360 / Inventor / SolidWorks /
  FreeCAD / Mastercam / BobCAD / HyperCADS / CadQuery) · `CADFormatConversionMatrixEngine` ·
  `CADAdapterRegistry`. 5 AI engines: `CADEmbeddingIndexOrchestratorEngine` ·
  `CADFeatureEmbeddingEngine` · `CADReasoningChainEngine` ·
  `CADRetrievalAugmentationEngine` · `CADSystemNeuralArchAdapterEngine`.

- **Dispatcher surface (4 dispatchers, action counts from PATHS.md — verify vs z.enum):**
  `cadDispatcher.ts` (~564 actions: `geometry_create` · `mesh_generate` ·
  `feature_recognize` · `sketch_solve` · `assembly_analyze` · `step_parse` ·
  `cad_validate` · `collision_check`) · `cadAutomationDispatcher.ts` (~367 actions:
  `open` · `create_sketch` · `extrude_feature` · `export_step` · `navigate_by_reference`) ·
  `cadDrawingKnowledgeDispatcher.ts` (~11 actions: `gdt_select` · `tolerance_apply`) ·
  `cadRegressionDispatcher.ts` (~37 actions: `test_run` · `checkpoint` · `classify`).
  18 AI-specific actions confirmed in AWARENESS.md
  (e.g. `cad_reasoning_generate` · `cad_reasoning_why` · `cad_reasoning_get`).

- **PSN 11-leg health:**
  - Healthy: #1 Obsidian brain (`cad_synthesis.md` present; vault→LoRA feed active) ·
    #3 Wiki (cad-corpus-index · cad-foundations · cad-step-toolchain verified) ·
    #6 System-viz (owned-by-slot + documented-by cross-substrate edges materialized) ·
    #10 NN/GNN (reasoning bridge live; CAG+RAG hybrid default via U-FLOR-HYBRID-DEFAULT).
  - Thin/open: #4 Memories (104 files present; migration to
    `knowledge/memories/cad/{feedback,reference,project}/` pending U-GALAXY-MS1-C1) ·
    #5 Tribal (277 tips matching cad heuristic; target 400; capture pipeline exists but
    not saturated) · #7 Algorithms (only `SweptVolumeCollision.ts` + `FEASolver2D.ts`
    confirmed; `spatial_ransac_fit` via `prism_algorithm`; GD&T stack-up algorithm absent).
  - Gap: #8 Formulas (ISO 286 IT-grade values live in `data/databases/ToleranceDB.json`
    but not registered in a formula registry) · #9 LoRA dataset
    (`cad_lora_{train,test}.jsonl` not confirmed on disk).

- **Known landmines (R12):**
  1. `CADFeatureRecognitionEngine` stub (U-EFF25) — silent wrong-feature output if wired
     to cam/quoting before body is filled.
  2. `CollisionDetectionEngine` probabilistic-mode default (`PRISM_PROBABILISTIC_COLLISION`)
     is the WRONG default for a safety gate. Kienzle Collision Gap doc confirms: must
     re-base on conservative bounds. Discrete sampling also misses between steps;
     `SweptVolumeCollision.ts` must be wired as conservative CCD (swept-volume across the
     whole move), not visual lofting.
  3. Fusion 360 API returns cm; display is mm. Factor-of-10 trap (`value_mm = api_cm * 10`).
     Distinct from the global 25.4× inch/mm trap.
  4. `SolidWorksCADExecutionBridge.ts` fails until COM re-registered — not live.
  5. `CADArchiveJoinAugmenterEngine` under-integrated; must complement (not duplicate)
     `ProgramEquivalentIndexEngine` (U-PPL-D4).
  6. GPU embedder migration to nv-embedqa-e5-v5 (1024-d) deferred; currently 768-d CPU ONNX.

---

## §3 — Deepening roadmap → PhD master

- **Tribal tips:** 277 (current) → 400 (target). Sources: JM Die STEP corpus
  (1,154 `.step` files — mine via `cad-analyze-step.mjs`); MIT-OCW CAD/GD&T courses;
  ISO 10303-242 AP242 standard commentary; hyperCAD-S macro patterns; `Automated
  Program.xlsm` trilobe CAM field extraction. Capture via
  `prism_knowledge:tribal_capture slot=delta` — never direct markdown writes.
  Priority topics: conservative CCD binding recipe; AP242 PMI/GD&T tolerance application;
  Fusion API unit-trap mitigation; STEP B-Rep boolean integrity verification;
  trilobe punch+die electrode geometry parametrics.

- **Wiki entries to write/cross-link:**
  - `knowledge/wiki/lessons/cad-feature-recognition-stub-hazard.md` — U-EFF25 lesson +
    safe verification recipe before downstream wiring.
  - `knowledge/wiki/lessons/cad-collision-conservative-ccd.md` — probabilistic→conservative
    re-base; swept-volume binding; Kienzle Collision Gap 7-pillar status map.
  - `knowledge/wiki/architecture/cad-dispatcher-action-map.md` — 4 dispatchers × action
    category map (so kilo/charlie know what to call).
  - `knowledge/wiki/cad/cad-tolerance-stack-up.md` — ISO 286 IT-grade arithmetic stack-up
    with `ToleranceDB.json` query pattern; no inline values.
  - `knowledge/wiki/cad/cad-api-unit-traps.md` — per-seat-bridge unit facts
    (Fusion 360 cm · SolidWorks mm · CadQuery mm · hyperCAD-S mm).

- **Memories to write:**
  - `reference_delta_collision_conservative_rebase_<date>.md` — conservative CCD wiring recipe.
  - `reference_delta_feature_recognition_stub_fix_<date>.md` — U-EFF25 body-verify pattern.
  - `feedback_cad_swept_volume_safety_gate.md` — standing doctrine: swept-volume check
    is mandatory before any cut; `prism_safety:validate_physics` S(x) gate pairs it.

- **RAG corpus:** `state/shared/cad-tribal-corpus.jsonl` (21.7K entries) +
  `state/shared/cadcam-consolidated-corpus.json` (221K). Re-embed after any tribal-capture
  batch via `scripts/build-tribal-embed-index.mjs` (use cap-safe streaming reader —
  see 2026-06-08 V8 512MiB string-cap regression). Coverage matrix:
  `mcp-server/data/state/CAD_COVERAGE_MATRIX.json` (16,039 JM files scanned) — re-run
  `cad-analyze-step.mjs` on the 1,154 STEP files to expand coverage signal.

- **CAG cold-anchor:** cache `knowledge/wiki/cad/cad-foundations.md` (AP242/MBD static
  doctrine; ASME Y14.41 / ISO 16792; 4-family feature-recognition taxonomy) via
  `scripts/lib/cag-router.mjs`. Low-churn anchor — refresh only on standards update.

- **NN/GNN features:** emit per-engine feature vectors for `CADFeatureRecognitionEngine` ·
  `CollisionDetectionEngine` · `CADToSTEPPipelineEngine` into
  `state/shared/nn-graph/node-embeddings-768d.jsonl`. Tags:
  `ghost.cad.feature_recognition` · `ghost.cad.collision` · `ghost.cad.step_pipeline`.
  India GNN tier-5 owns the retrain.

- **LoRA dataset:** produce `state/shared/lora/cad_lora_train.jsonl` +
  `cad_lora_test.jsonl` (80/20 split). Instruction pairs: STEP-file-in → feature-list-out;
  text-description → CadQuery-script-out; GD&T-drawing-text → tolerance-spec-out.
  Emit via `vault-to-lora-dataset.mjs` (`PRISM_GALAXY_BRIDGE_LORA_EMIT=1`).
  India triggers the retrain on ≥50-pair threshold.

- **Engineered loop + cron:** nightly at 2:17am —
  `mine-galaxy-transcripts.mjs --galaxy cad` (qwen2.5-coder:32b, Ollama, free) →
  tribal capture → re-embed → `cad_synthesis.md` refresh →
  `cad-analyze-step.mjs` coverage audit (50 new STEP files sampled) →
  delta-append `CAD_COVERAGE_MATRIX.json`. Acceptance: tribal tips ≥ 400 AND
  coverage matrix ≥ 85% of JM STEP corpus.

- **Ollama offload:** STEP parsing + feature-list summarization → `gpt-oss:20b`;
  GD&T text interpretation → `qwen2.5-coder:32b`; deep AP242 synthesis →
  `gpt-oss:120b`. Never route mechanical text ops to Claude (R5).

---

## §4 — Test plan (real assertions — R9)

- **Unit — reference-value / algebraic-invariant tests:**
  - `CADKernelEngine.test.ts`: Vec3 cross-product anti-commutativity (`A × B = −B × A`);
    NURBS evaluation at knot endpoints returns exact control point (Farin, §5); CSG union
    volume ≤ sum of operand volumes (inclusion-exclusion bound).
  - `CollisionDetectionEngine.test.ts`: AABB clearance for two non-overlapping boxes =
    exact gap in mm; overlapping boxes returns gap ≤ 0; swept-volume path through a known
    obstacle returns `collision:true`; conservative mode never returns false-clear on any
    intersecting pair (adversarial: tool radius tangent to fixture face).
  - `CADToSTEPPipelineEngine.test.ts`: round-trip box → STEP → re-parse → volume error
    < 0.001%; `CADAccuracyValidatorEngine` PASS required before export; bypass path THROWS.
  - `CADDrawingKnowledgeEngine.test.ts`: ISO 286 H7/h6 clearance fit ⌀25mm returns
    positive allowance range [0, +21µm]; G7/h6 returns overlap with correct sign.
    Values read from `data/databases/ToleranceDB.json` — never hardcoded.
    Source: ISO 286-1:2010.

- **Integration — through the dispatcher:**
  - `cadDispatcher → geometry_create → mesh_generate → feature_recognize →
    assembly_analyze` on `SIG_CORE_CAVITY.step` (7 features); assert feature count = 7,
    types match known taxonomy (pocket / hole / boss / chamfer).
  - `cadDispatcher → step_parse → cad_validate → collision_check` on a JM Die STEP file
    with known clearance; assert S(x) ≥ 0.98 when clear, < 0.70 when tool inside fixture.
  - `cadAutomationDispatcher → navigate_by_reference` via `:18365` endpoint; assert
    response JSON contains `featureId` for a known Fusion 360 part.

- **E2E — JM Die live data:**
  - Load sample `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/*.ipt`; run full pipeline to
    STEP; verify `CADAccuracyValidatorEngine` passes (volume error < 0.01%).
  - Run `feature_recognize` on 5 sampled JM STEP files; assert ≥ 4 feature types recognized.

- **Coverage floor:** happy path + ≥3 failure modes (malformed STEP / null geometry /
  zero-volume solid) + ≥2 adversarial (NaN coordinate / Infinity bounding box) + ≥3
  spanning configs (inch vs mm STEP / 2-setup vs 5-axis part / Fusion vs CadQuery origin).

- **Target test files:**
  `mcp-server/src/__tests__/CADKernelEngine.test.ts` ·
  `mcp-server/src/__tests__/CollisionDetectionEngine.test.ts` ·
  `mcp-server/src/__tests__/CADToSTEPPipelineEngine.test.ts` ·
  `mcp-server/src/__tests__/CADDrawingKnowledgeEngine.test.ts` ·
  `mcp-server/src/__tests__/cadDispatcher.integration.test.ts`

- **Runner:** `cd mcp-server && rtk npx vitest run -t "CAD"` · CI gate green.

---

## §5 — Simulation plan

- **What to simulate:** dry-run feature recognition on JM Die corpus; conservative CCD
  swept-volume simulation (tool path segment × fixture geometry); GD&T tolerance stack-up
  Monte-Carlo (N=10,000 draws per dimension chain) for a representative JM Die die-set.

- **Tools:** `CollisionDetectionEngine` + `SweptVolumeCollision.ts`;
  `FEASolver2D.ts` (2D deflection proxy if tolerance-stack action absent);
  `cad-analyze-step.mjs` headless corpus runner.

- **Scenarios:**
  1. JM Die core cavity (SIG_CORE_CAVITY.step, 5.2×3.4×2.1 in, 2 setups): 5-axis M460V
     toolpath segment entering pocket — swept volume must not intersect fixture plate.
     Pass: zero collisions, conservative CCD.
  2. ⌀.7500 +.0005 bore (tight tolerance): tolerance stack for bore + locating pin chain;
     Monte-Carlo Cpk ≥ 1.33 at ±3σ.
  3. 4× ⌀.250 thru holes H7 fit: `feature_recognize` identifies all 4 holes + correct
     fit class; DFM flag fires if pocket inside corners force radius < tool ⌀ (design per
     Kienzle CAD Features: ⌀.25 forces ⅛" finish tool).
  4. Adversarial — zero-clearance fixture: tool cylinder exactly tangent to fixture face;
     conservative CCD must flag collision (no false-clear).
  5. Edge — 0-feature STEP (flat slab): pipeline returns 0 features, DFM score = 100,
     no crash, no NaN in output.

- **Pass criteria:** CCD false-clear rate = 0 on adversarial corpus; feature recognition
  F1 ≥ 0.80 on 5 sampled JM parts; tolerance stack Cpk ≥ 1.33 for H7/h6 ⌀25 reference;
  pipeline throughput ≥ 1 STEP file/second on Ollama offload.

---

## §6 — Validation plan (live data + numbers — R12/R15)

- **Live-data validation:** run `cadDispatcher → feature_recognize → cad_validate →
  collision_check` on 50 randomly sampled JM Die STEP files from
  `H:/PRISM/resources/CAD FILES`; compare feature counts to manual reference labels
  (5 files hand-labeled as ground truth).

- **Acceptance gates:**
  - Feature recognition F1 ≥ 0.80 on 5 labeled ground-truth JM STEP files.
  - STEP round-trip volume error < 0.001% (mirrors §4 unit gate).
  - Conservative CCD: 0 false-clears on 10 adversarial fixture-overlap fixtures.
  - Parity probe: `cadDispatcher:feature_recognize` output vs `CADFeatureRecognitionEngine`
    singleton output — feature count ratio = 1.0 (exact match, no tolerance).
  - `CADDrawingKnowledgeEngine` GD&T tolerance values agree with ISO 286 table to ≤ 1µm.

- **Safety gate:** `prism_safety:validate_physics` S(x) ≥ 0.98 required before any
  clearance result is presented to the user. Clearance < 0.5mm forces S(x) < 0.70
  (hard block). Verify at the dispatcher level, not the engine singleton.

- **Parity probe:** `CADRegenerationDashboardPage` displayed feature count must match
  `cadDispatcher:feature_recognize` JSON response count within ±0 (exact integer).

---

## §7 — Fine-tune loop (results → retrain)

- **Outcome capture:** publish simulation + validation results via
  `xproc_outcome_publish {slot:'delta', domain:'cad'}` — grep `aiReasoningDispatcher.ts`
  for the exact action name before calling (UNVERIFIED). Ledger:
  `mcp-server/data/state/cad-outcome-ledger.jsonl` (append-only, schemaVersion field).

- **LoRA:** failed feature-recognition cases (F1 < 0.80 on any JM part) → add instruction
  pair to `state/shared/lora/cad_lora_train.jsonl`. India retrains on ≥50-pair threshold
  (`PRISM_GALAXY_BRIDGE_LORA_EMIT=1`). Promote IFF validation F1 ≥ 0.85 on held-out split.

- **RAG/CAG:** newly validated tribal tips → re-embed via
  `scripts/build-tribal-embed-index.mjs` (use cap-safe streaming reader; V8 512MiB string
  cap is a live landmine — 2026-06-08 regression). Refresh CAG cold-anchor when
  `cad-foundations.md` changes (semver-bump the anchor key in `cag-router.mjs`).

- **NN/GNN:** after each validation run, push new labeled ghost nodes
  (`ghost.cad.feature_recognition` status wired/dormant) to india refpool via
  `vault-to-gnn-refpool.mjs`. Promote model IFF AUROC ≥ 0.78 / macro-F1 ≥ 0.55 /
  Brier ≤ 0.15 (fleet gates). India owns the promote check (weekly).

- **Trigger + cadence:** nightly cron (2:17am) runs mine → capture → re-embed →
  coverage audit → outcome-ledger append. LoRA retrain fires on 50-pair threshold (india).
  Delta monitors GNN status via `node scripts/system-viz-query.mjs node-card ghost.cad.*`.

---

## §8 — Frontend build (Kienzle Claude-Design rollout)

Design source: `mcp-server/web/design-imports/kienzle-app-build/*.dc.html`.
Design language: iOS fleet (`web/DESIGN.md` tokens — never inline hex/px). JetBrains Mono
for all numerics/G-code. `var(--press-scale)` critically-damped spring for taps.
44pt minimum tap targets. `<MobileSafeArea>` wrapper. Bottom-center CTAs on mobile.
`inputMode="decimal"` on all numeric fields.

---

### Page 1 — CAD & Feature Recognition (`Kienzle CAD Features.dc.html`)

**Design:** full-bleed dark HUD; 72px sidebar with active CAD icon; header = file name +
feature-count badge + "Send to Quote →" CTA; left pane = Three.js 3D orbit viewer
(pocket=orange / hole=blue / boss=amber legend) + 4-stat row (STOCK / REMOVAL% / SETUPS /
DFM); right pane = scrollable feature list (icon + name + op + click-to-highlight) +
auto-routing note + DFM flags.

**Target React page:** `mcp-server/web/src/pages/CADRegenerationDashboardPage.tsx` —
**extend** (Codex Page Protection; add feature-list panel + 3D viewer tab + DFM/routing
sections to the existing regen dashboard).

**Backend:** `prism_cad` actions: `step_parse` · `feature_recognize` · `cad_validate` ·
`assembly_analyze`. Client: `web/src/api/cadClient.ts`. Route:
`POST /api/v1/cad/feature-recognize` on `:3100`.

**Data bindings:** `fileName` · `featCount` · `features[]` (id/name/detail/op/kind) ·
`stockSize` · `removalPct` · `setups` · `dfmScore` · `routingNote` · `dfmFlags[]` —
all from `cadDispatcher:feature_recognize` response JSON.

---

### Page 2 — Collision Avoidance Gap (`Kienzle Collision Gap.dc.html`)

**Design:** document layout (max-width 940px, scrollable); header = title + SAFETY-CRITICAL
badge; 3 KPI chips (components-exist % / pillars-open count / validation-corpus count);
7-pillar list (name + detail + status chip + have-text); red alert block (2 blocking items);
road-to-independent-verifier (3 phase cards: P1 wire swept-vol / P2 validation corpus /
P3 independent verifier).

**Target React page:** `mcp-server/web/src/pages/CADAIStatePage.tsx` — **extend** with a
"Collision Provability" tab showing live 7-pillar status + KPI chips.

**Backend:** `prism_cad` action: `collision_check` (returns clearance + pillar statuses).
`prism_safety:validate_physics` S(x) surfaced as the KPI badge color. Route:
`GET /api/v1/cad/collision-status` on `:3100`.

**Data bindings:** `pillars[]` (7 items: name / status / have / detail) · `componentPct` ·
`pillarsOpen` · `validationCorpusSize` · `blockingItems[]`.

---

### Page 3 — Thermal Compensation (`Kienzle Thermal Comp.dc.html`)

**Design:** full-bleed app shell; machine selector (M460V / VM30i / Multus / Roku-Roku);
gate banner (warm-up %, status icon/color); SVG dual-line chart (spindle °C in orange,
Z-growth µm in blue, stable vertical marker, now-cursor dots); right panel = current
readings + compensation recommendations.

**Target React page:** New tab "Thermal" inside
`mcp-server/web/src/pages/CADRegenerationDashboardPage.tsx` — no new file; tab extends
existing page.

**Backend:** `prism_cad` action: `thermal_compensation_get` (machine_id → warm_pct /
spindle_temp_c / z_growth_um / time_series[]). Route:
`GET /api/v1/cad/thermal/:machineId` on `:3100`. Physics: `ThermalExpansionEngine` /
`CuttingTemperatureEngine` (mill galaxy, cross-galaxy call). Constants from
`src/physics/constants.ts` only — never inline.

**Data bindings:** `mid` · `clock` · `warmPct` · `gateTitle` · `gateDetail` · `tempLine`
(SVG polyline points) · `growthLine` · `stableX` · `nowX` · `nowTempY` · `nowGrowthY`.

---

### Page 4 — Trilobe Creator (`Kienzle Trilobe Creator.dc.html`)

**Design:** 3-column app shell; left = geometry inputs (CAM macro XLS import chip +
family/size selectors + dimension sliders for trilobe parameters); center = live 2D/3D
trilobe profile preview; right = output panel (punch + die electrode specs, tolerance
summary). Header: family label + size label + "CAM macro linked" chip + export CTA.

**Target React page:** `mcp-server/web/src/pages/TrilobeCreatorPage.tsx` — **new file**
(no existing trilobe page in `web/src/pages/`). Wire into `App.tsx` route `/trilobe`.

**Backend:** `prism_cad` action: `trilobe_generate` (family / size_in / clearance_in →
punch_profile[] / die_profile[] / electrode_program). Route:
`POST /api/v1/cad/trilobe` on `:3100`. Source engine: extend `BliskCADEngine.ts` with
trilobe parametric solver OR new `TrilobeCADEngine.ts` after
`duplicationGuardEngine.checkBeforeCreating()` confirms no duplicate.

**Data bindings:** `familyLabel` · `sizeLabel` · `programNo` (from macro import) ·
`exportLabel` (STEP / DXF toggle) · punch_profile[] / die_profile[] coordinate arrays.

---

### Page 5 — Warm-Up Generator (`Kienzle Warm-Up Generator.dc.html`)

**Design:** 3-column app shell; left = machine selector (M460V / VM30i / VF-2 / Roku-Roku
/ Multus / LB3000) + travel-limit chips (X/Y/Z) + existing-fixture selector (empty / Kurt
vise / fixture plate / trunnion) + collision-avoidance note; center = G-code preview
(JetBrains Mono, scrollable, line numbers); right = program metadata + safety status badge
+ "Save Program" CTA. Header: COLLISION-SAFE · FIXTURE-AWARE · dialect label.

**Target React page:** `mcp-server/web/src/pages/WarmUpGeneratorPage.tsx` — **new file**
(no existing warm-up page). Wire into `App.tsx` route `/warmup`.

**Backend:** `prism_cad` action: `warmup_program_generate` (machine_id / fixture_type →
gcode_lines[] / safe_status / dialect_label). Route: `POST /api/v1/cad/warmup` on `:3100`.
`CollisionDetectionEngine` must gate every warm-up move against the fixture envelope before
emitting a line. S(x) < 0.98 → block program output entirely (safety-critical path).

**Data bindings:** `mid` · `fixType` · `travelChips[]` · `safeLabel` · `safeColor` ·
`safeLabel` · `saveLabel` · G-code line array for preview pane.

---

**Build/verify loop (all pages):** edit → `cd mcp-server && rtk npm run build:fast` →
Playwright screenshot at 1440px desktop + iPhone 14 (390×844) + Pixel 7 (412×915) →
compare to `.dc.html` intent → iterate. Minimum 3 screenshots per change.

---

## §9 — Dependencies & sequencing

- **Blocked by:**
  - U-EFF25 resolution (delta owns): `CADFeatureRecognitionEngine` stub must be de-stubbed
    before feature-recognition tests can pass.
  - india: LoRA retrain + GNN refpool promote.
  - xray (blueprint-vision): feeds `BlueprintToCADGenerationEngine` with raster→text.
  - quebec: implements the `.tsx` UI pages (delta owns the backend/API they consume).

- **Blocks:**
  - kilo (cam): needs `feature_recognize` output for `cam_strategy_recommend`.
  - charlie (quoting): needs recognized features + GD&T for auto-quote-from-print.
  - echo (post-processor): collision-clear output gates G-code emission.

- **Logical order (R13):**
  1. Fix `CADFeatureRecognitionEngine` stub — core unproven while stub.
  2. Re-base `CollisionDetectionEngine` on conservative CCD — safety gate wrong-default.
  3. Write + run unit tests (§4) — prove core on real reference values.
  4. Run simulations (§5) — JM Die corpus dry-run.
  5. Live-data validation + acceptance gates (§6).
  6. Deepen knowledge loop (§3) — tribal/wiki/memory fill post-validation.
  7. Fine-tune loop (§7) — LoRA/RAG/GNN with validated results.
  8. Frontend pages (§8) — UI last; never atop unproven backend.

---

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] WIRE: `CADFeatureRecognitionEngine` stub replaced and body verified; conservative CCD
      wired via `SweptVolumeCollision.ts`; both actions in `cadDispatcher.ts` with no
      orphan. `TrilobeCreatorPage.tsx` + `WarmUpGeneratorPage.tsx` wired into `App.tsx`.
- [ ] TEST: All 5 test files green; happy + ≥3 failure + ≥2 adversarial + ≥3 spanning
      configs; round-tripped through `cadDispatcher` (not the singleton); no `.skip`.
- [ ] VALIDATE: Feature recognition F1 ≥ 0.80; CCD zero false-clears; STEP volume error
      < 0.001%; S(x) ≥ 0.98 on clear fixtures; parity probe exact match; live `:3100`
      round-trips passing on all 5 page backends.
- [ ] APPLY: Nightly deepening cron live; tribal tip count ≥ 400; coverage matrix ≥ 85%;
      all 5 Kienzle pages rendering live dispatcher data; 3-viewport screenshots accepted.
- [ ] Per-file 2-arm scrutiny on every code file + 3-of-3 Stop gate on the session.
