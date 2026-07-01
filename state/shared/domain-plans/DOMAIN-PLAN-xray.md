---
artifact: domain-buildout-plan
slot: xray
galaxy: blueprint-vision
galaxy_dir: mcp-server/src/engines/blueprint-vision/
kienzle_pages: ["Kienzle Blueprint Intake.dc.html"]
backend_dispatchers: [prism_cad]
frontend_owner: quebec
status: draft
generated_by: xray-plan-agent (fanout-rescue)
generated_at: 2026-06-27
---

# DOMAIN BUILDOUT PLAN — XRAY (blueprint-vision)

> Finalized plan to take the blueprint-vision galaxy to **PhD-master depth**, then **test →
> simulate → validate → fine-tune**, then **build/flesh out the frontend** from the Kienzle
> Claude-Design build (`Kienzle Blueprint Intake.dc.html`).
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub · no-inline-constants ·
> canonical physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

## §1 — Domain identity & scope

- **Owns:** Blueprint OCR, multi-print PDF split discipline, VLM-ensemble extraction, GD&T
  callout parsing (FCF/datum-3-2-1), tolerance stackup, CAD-file dimension extraction (DXF /
  STEP / STL / F3D / FCStd), ground-truth registry, extraction confidence gating, LoRA
  training-set emission, cross-source dimension reconciliation (print + CAD + CNC program),
  and the blueprint→CAD/quote/program bridge surfaces. Owns the full pipeline from an
  unstructured source (PDF, raster scan, native CAD file) to a structured PRISM extraction
  contract (`BlueprintExtractionContract`). Also owns multi-page OCR corpus management
  (worklist ~7,794 prints, per-print resumable cursor), the closed-loop calibration store,
  and VLM A/B benchmarking gate.
- **Excludes:** CAD geometry authoring → delta; CAM toolpath strategy → kilo; quote pricing
  logic → charlie; G-code post-processing → echo; feature-to-strategy mapping → cam galaxy.
- **Slot worktree:** `H:/prism-slot-xray` · branch `slot/xray`
- **Galaxy brain:** `mcp-server/src/engines/blueprint-vision/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`
- **Downstream consumers (cross-galaxy edges):**
  - delta (cad) — consumes xray geometry extractions for CAD reconstruction
  - kilo (cam) — consumes via `print_to_program_*` for toolpath generation
  - charlie (quoting) — consumes via `blueprint_to_quote` / `BlueprintToQuoteBridgeEngine`
  - foxtrot / whiskey / mike — consume extracted features for print-to-program
  - india (ai-training) — consumes extraction outcomes for GNN/LoRA training loop
  - juliett (database-expansion) — owns the fast-search layer xray queries

## §2 — Current state (verified — R12)

### Scaffolding
PASS on all 5 galaxy-brain artifacts (CLAUDE.md / MEMORY.md / PATHS.md / TOOLBELT.md /
AWARENESS.md present). AI-synergy audit (2026-06-11): all 4 dimensions score 1 —
discoverability, ownsOrWiresAi, vaultSynergy, crossSubstrate. PSN legs #1/#3/#6/#10
present per AWARENESS.md.

### Verified engines (disk-confirmed 2026-05-29, extended by subsequent sessions)

**OCR tier:**
- `BlueprintVisionOCREngine.ts` (primary, 37.9KB)
- `BlueprintOCREngine.ts` (35.7KB) + `BlueprintOCRAdapter.ts`
- `CADLiveBlueprintOcrAdapter.ts`
- `ImageOCRPipelineEngine.ts` + `OCRResultEngine.ts`
- `TesseractOCRBridgeEngine.ts`
- `MachineServiceTagOCREngine.ts`

**PDF/blueprint extraction:**
- `PDFBlueprintDimensionExtractorEngine.ts`
- `PDFBlueprintPatternRescueEngine.ts`
- `BlueprintExtractionRAGEngine.ts`

**GD&T / tolerance:**
- `GDTCalloutParserEngine.ts` + `PrismEnhancedGDTEngine.ts`
- `FCFSyntaxValidatorEngine.ts`
- `ToleranceEngine.ts` + `ToleranceAwareGenerationEngine.ts`

**CAD format parsers:**
- `DXFGeometryParserEngine.ts` + `DXFParserEngine.ts`
- `F3DSQLiteParserEngine.ts` (Fusion 360 .f3d/.f3z)
- `FCStdNativeParserEngine.ts` (FreeCAD .fcstd)
- `STLToVoxelGridEngine.ts`

**Feature recognition:**
- `CADFeatureRecognitionEngine.ts` + `CADFeatureClassifierEngine.ts`
- `FeatureRecognitionEngine.ts`
- `LatheTurningFeatureRecognizerEngine.ts`

**Orchestration / corpus / bridges:**
- `BlueprintToCADGenerationEngine.ts` + `BlueprintToAllCADsOrchestratorEngine.ts`
- `BlueprintProgramJoinEngine.ts` (45.4KB)
- `BlueprintCorpusHarvestEngine.ts` + `BlueprintCoverageAuditEngine.ts`
- `BlueprintLoRABridgeEngine.ts`
- `BlueprintToQuoteBridgeEngine.ts`
- `GroundTruthRegistryEngine.ts` + `GroundTruthValidationEngine.ts`
- `PrintToCADOrchestratorEngine.ts`

**New (2026-06 sessions, grep-confirmed):**
- `engines/blueprint-vision/extractionPlanExecutor.ts` — executes `BlueprintExtractionContract`
  across business/cam/quality/calc/cad consumers (`POST /api/v1/drawing/execute`); shipped
  commit `fd46f6cff7` (U-XRAY-EXTRACTION-PLAN-EXECUTOR).
- `mcp-server/src/schemas/BlueprintExtractionContract.ts` — versioned app-facing contract
  (`normalizeFusedToContract` + 0.70 confirm floor).
- `scripts/lib/cad-dimension-gt-lib.mjs` — CAD-model GT from neutral STEP + `triangulateGT`.
- `scripts/lib/reconcile-candidate-adapters.mjs` — cnc+print+cad source-adapter trio feeding
  `CrossSourceDimensionReconciliationEngine` (`prism_cad:cad_dimension_reconcile`).
- `scripts/lib/calibration-sample-store.mjs` — durable calibration store (accumulates across
  runs; `reliable:true` triggers at MIN_RELIABLE=50 samples; currently n≈24 → `reliable:false`).

**STEP/IGES backing engine:** name unconfirmed on disk — route via `cad_step_parse_file`
dispatcher action only; never reference a class name directly.

**Standing CAD-format gaps:** no native reader for SAT, OBJ, FBX, X_T (Parasolid) — forge
or vendor SDK required.

### Dispatcher surface (verified in `cadDispatcher.ts` and `aiReasoningDispatcher.ts`)

**Primary: `prism_cad` / `cadDispatcher.ts` (~40 blueprint-vision actions)**

Core blueprint actions (grep-confirmed present in cadDispatcher.ts):
| Action | Engine | Use |
|--------|--------|-----|
| `cad_pdf_blueprint_extract` | `PDFBlueprintDimensionExtractorEngine` | Multi-page PDF text → dim list |
| `cad_pdf_pattern_rescue_extract` | `PDFBlueprintPatternRescueEngine` | Low-confidence OCR rescue |
| `cad_live_blueprint_ocr` | `CADLiveBlueprintOcrAdapter` | Live OCR adapter |
| `cad_gdt_callout_parse` | `GDTCalloutParserEngine` | GD&T callout text → FCF struct |
| `cad_gdt_parse_enhanced` | `PrismEnhancedGDTEngine` | Enhanced GD&T parse |
| `cad_tolerance_stackup` | `ToleranceEngine` | Tolerance stackup |
| `cad_step_parse_file` | (action-only; engine name unconfirmed) | STEP file parse |
| `cad_dxf_geom_parse` | `DXFGeometryParserEngine` | DXF geometry parse |
| `cad_f3d_parse` | `F3DSQLiteParserEngine` | Fusion 360 parse |
| `cad_fcstd_parse` | `FCStdNativeParserEngine` | FreeCAD parse |
| `blueprint_to_all_cads` | `BlueprintToAllCADsOrchestratorEngine` | Blueprint→CAD reconstruction |
| `blueprint_coverage_audit` | `BlueprintCoverageAuditEngine` | Corpus coverage audit |
| `blueprint_rag_extract` | `BlueprintExtractionRAGEngine` | RAG-assisted extraction |
| `blueprint_extract_route` | `extractionPlanExecutor` | Contract → fan-out routing |
| `cad_dimension_reconcile` | `CrossSourceDimensionReconciliationEngine` | Cross-source dim consensus |
| `blueprint_lora_prepare_set` | `BlueprintLoRABridgeEngine` | LoRA training set prep |
| `feature_recognize` | `CADFeatureRecognitionEngine` | Feature recognition |

**Secondary dispatchers (verified in CLAUDE.md §3):**
- `businessDispatcher`: `blueprint_to_quote`, `blueprint_resolve_material`
- `qualityDispatcher`: `blueprint_compare_revisions`, `blueprint_extract`, `blueprint_inspection_plan`
- `camDispatcher`: `print_to_program_full`, `cam_feature_recognize`
- `resourceExtractionDispatcher`: `ocr_process`, `ocr_stats`
- `cadDrawingKnowledgeDispatcher`: `cad_select_gdt`, `cad_plan_drawing`

### Knowledge legs (PSN 11-leg)

- **#1 Obsidian brain:** PARTIAL — `knowledge/memories/patterns/blueprint-vision_synthesis.md`
  exists but is **polluted** with off-domain BM25 results (post-processor/holder/Fusion content
  as of 2026-06-10). Trust CLAUDE.md + MEMORY.md over synthesis brain until re-synthesized.
  Fix owned by sierra/india. [[reference_xray_synthesis_pollution_2026_06_10]]
- **#3 Wiki:** PASS — 202 wiki entries matching domain keyword heuristic; key leaves verified
  on disk (see CLAUDE.md §8). Missing: `lessons/blueprint-ocr-cad-reading-atlas` (memory-only).
- **#5 Tribal:** PARTIAL — 54 tribal tips (target 100+). Capture path confirmed:
  `prism_knowledge:tribal_capture slot=xray`.
- **#6 System-viz:** PASS — typed `owned-by-slot` + `documented-by` + `embeds` cross-substrate
  edges present.
- **#10 NN/GNN:** PASS via reasoning bridge (`scripts/lib/galaxy-reasoning-bridge.mjs
  blueprint-vision`). LoRA bridge wired (`BlueprintLoRABridgeEngine`; `blueprint_lora_prepare_set`
  confirmed in cadDispatcher.ts:3568).

### Algorithm primitives available (PSN leg #8 — papa 2026-06-09)
- `spatial_ransac_fit` — robust line/circle/planar-edge fit; canonical primitive for recovering
  a dimension line or hole-circle from noisy raster (low inlier ratio = low confidence signal).
- `ml_knn` / `ml_gmm` — cluster/retrieve dimension-callout regimes (linear vs diameter vs
  GD&T-FCF) for nearest-neighbour callout classification.
Invokable via `prism_algorithm`.

### Known landmines (R12 — verified in MEMORY.md / CLAUDE.md)

1. **VLM JSON dropout (~30–37% prints dropped):** `qwen2.5vl:7b` hits `num_predict:4096`
   mid-structure → malformed JSON → print excluded from training set. **FIX SHIPPED** (commit
   `40b613afa7`, U-XRAY-FORMAT-JSON-WIRE): `buildOllamaRequestBody` now threads `opts.format`
   and `run-ocr-training-loop-overnight.ps1` passes `--format-json`. No longer an open fix.

2. **llama3.2-vision:11b returns empty 100%:** empirically tested 2026-06-10 (0/32 prints
   survived). **DO NOT re-add** to the VLM ensemble; the 2-model pin is empirically correct.

3. **OCR closed-loop multipage page-0-only bug:** was fixed (commit area `265e8a6e41`) —
   training loop now OCRs ALL pages (cap 12pp). 96% of JM drawings are multi-page; the
   page-0-only path dropped ~76% of dimension-bearing pages. **FIXED.**

4. **Calibration under-powered:** `reliable:false` (n≈24, MIN_RELIABLE=50 samples). Durable
   accumulation now works (`U-XRAY-CALIB-ACCUMULATE`, commit `5ab3c49002`). Do NOT use
   isotonic curve for safety gates until n≥200 samples.

5. **U-XRAY-EXECUTOR-PAYLOAD-ADAPT open seam (P2):** `extractionPlanExecutor` consumer
   payloads ≠ action params — `spc_calculate` needs measurements not dims; `material_resolve`
   needs `params.material`; `feature_recognize` needs geometry. Advisory consumers currently
   no-op while recorded `executed`. Needs per-consumer drivability reconciliation.
   [[reference_xray_extraction_plan_executor_2026_06_25]]

6. **Synthesis brain polluted:** `knowledge/memories/patterns/blueprint-vision_synthesis.md`
   carries off-domain BM25 content. Trust THIS CLAUDE.md + MEMORY.md over synthesis until
   sierra/india re-synthesizes.

7. **CAD parser silent success:** many parsers return empty geometry without erroring. Cross-
   check geometry volume vs source-file size; flag if implausible.

8. **STEP AP203/AP214 carries geometry ONLY — no GD&T.** GD&T survives via
   `PrintToCADOrchestratorEngine` side-channel; never assume STEP carries GD&T.

9. **Per-field confidence is mandatory:** every extracted field emits `confidence: 0..1`.
   Verified floor: OCR per-field 0.70 → operator-confirm
   ([[reference_xray_confidence_thresholds_reconciled]]). Seed's 0.85/0.95/0.99 tiers are
   uncorroborated; do not enforce them.

10. **Alpha-seed hallucination (resolved):** 21 engine names in original seed did not exist
    on disk; corrected 2026-05-29 by 3 parallel inventory agents. Standing rule: Glob/Grep
    any engine name before enshrining it; NEVER trust a title.

11. **Multi-print split before OCR:** one output object spanning N prints corrupts every
    downstream consumer. Use `scripts/extract-jm-die-corpus-page-by-page.py` (pypdf; 76×
    deeper than pdf-parse). Phase21: 8,154 container PDFs → 36,638 single-print PDFs.

12. **Foreign-language print annotations:** JM Die operators are Polish/Spanish-primary
    ([[project_jm_die_shop_floor_languages]]); print notes may contain non-English text; do
    not assume English-only OCR is sufficient.

## §3 — Deepening roadmap → PhD master

### Tribal tips
Current: 54 tips → target: 100+ tips. Sources:
- JM Die corpus (`JM DIE/PRISM CAD TESTING/`, `JM DIE/REVERSE ENGINEERING/`, `JM DIE/Prism JM Die/`
  406 customer dirs) — extract per-customer print annotation quirks as tribal tips.
- ISO 1101:2017 online browsing platform (free-read) — FCF families, MMC/LMC/RFS, 1st/3rd-angle
  projection discipline.
- NIST "Testing the Digital Thread in Support of Model-Based Manufacturing and Inspection"
  (pub_id 919497) — STEP AP242/QIF integration patterns.
- `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (T1=6 primary sources for xray).
- Mine via `scripts/mine-galaxy-transcripts.mjs --galaxy blueprint-vision` (Ollama-first,
  `qwen2.5-coder:32b`); capture via `prism_knowledge:tribal_capture slot=xray` (NEVER direct
  markdown writes to `knowledge/tribal/blueprint-vision-*.md`).

### Wiki entries to write / cross-link
- `knowledge/wiki/blueprint-vision/gdt-fcf-datum-discipline.md` — FCF 5 families (form/
  orientation/location/runout/profile) + MMC/LMC/RFS modifier discipline + datum-3-2-1
  rule (an FCF without datum-3-2-1 is meaningless at parse time); cross-link
  `GDTCalloutParserEngine`, `FCFSyntaxValidatorEngine`.
- `knowledge/wiki/blueprint-vision/ocr-ensemble-calibration.md` — 2-VLM agreement fraction
  → isotonic calibration → gold/silver/bronze/reject tiers; why `reliable:false` until n≥200;
  yield mechanics (f=0.5→~0.57 bronze, f=1.0→~0.90 gold); cross-link `vision-ensemble-fuse.mjs`.
- `knowledge/wiki/blueprint-vision/cross-source-dimension-reconciliation.md` — print + CAD +
  CNC-program triangulation; `CrossSourceDimensionReconciliationEngine`; the confirmed/produced/
  quoted/inferred ground-truth tier hierarchy; why CAD-GT-for-OCR-recall is currently ceiling-
  bound (only 5/11 neutral-STEP parts have a posted program).
- `knowledge/wiki/blueprint-vision/extraction-contract-schema.md` — `BlueprintExtractionContract`
  versioning; `normalizeFusedToContract`; 0.70 confirm floor; why the contract is the keystone
  for the `POST /api/v1/drawing/execute` route.
- `knowledge/wiki/lessons/vlm-dropout-format-json-fix-2026-06.md` — lesson from `40b613afa7`:
  VLM JSON dropout is a `num_predict` runaway-repetition class, not a model failure; fix is
  Ollama grammar-constrained decode (`format:"json"`); cite llama3.2-vision empty-100% result.
- Update (not create): `knowledge/wiki/architecture/blueprint-vision-knowledge-index.md` — add
  pointers to the new leaves above + the executor/contract schema session commits.

### Memories to write
- `reference_xray_extraction_contract_schema_<date>.md` — version, shape, confirm floor, field
  list; the app-integration keystone.
- `reference_xray_executor_payload_adapt_gap_<date>.md` — documents the open U-XRAY-EXECUTOR-
  PAYLOAD-ADAPT P2 seam; per-consumer drivability reconciliation required before advisor consumers
  can fully execute.
- `reference_xray_calibration_target_<date>.md` — n≈24 current, n≥50 reliable, n≥200 safety-gate
  ready; accumulation mechanism confirmed live (`calibration-sample-store.mjs`); path to n≥200
  is GPU-gated (nightly OCR cron must be elevated and running).
- `reference_xray_vlm_benchmark_gate_<date>.md` — `bench-vision-ocr-ab.mjs` built 2026-06-03,
  empirical run pending quiet fleet window; gate criteria before any VLM promotion.

### RAG corpus
Primary: `mcp-server/data/state/blueprint-vision-cited-tips.ts` (if present) + DocuStrata
`.index/` chunked passages. Supplement with:
- NIST STEP AP242 QIF integration PDF (via `/pdf-learn`).
- ISO 1101:2017 FCF family excerpts (free browsing platform → manual capture).
- JM Die closed-loop outcome bus records (per-print extraction events from
  `blueprint-accuracy-events.jsonl`).
Embed target: 200+ chunked passages via `scripts/embed-cited-tips.mjs`. Dedup gate:
`prism_data:database_search` against `JMDieDocuStrataDB` (111,745 entries) before extracting
any paid DocuStrata corpus.

### CAG cold-anchor
Cache in `scripts/lib/cag-router.mjs`:
- `mcp-server/src/schemas/BlueprintExtractionContract.ts` — the versioned extraction contract.
- `mcp-server/src/engines/blueprint-vision/CLAUDE.md` — the no-OCR-without-split + no-STEP-GD&T
  + ensemble ≥2-agree safety doctrine.
- `knowledge/wiki/blueprint-vision/blueprint-vision-knowledge-index.md` (once updated) — the
  compiled domain index.

### NN/GNN features
`BlueprintExtractionRAGEngine` and `BlueprintLoRABridgeEngine` nodes need 768-d feature vectors
for GNN refpool feed. Route via `vault-to-gnn-refpool.mjs`. Owner: india. Xray produces labeled
extraction outcomes via `xproc_outcome_publish {slot:'xray', domain:'blueprint-vision'}` (note:
this action is marked `// UNVERIFIED` in CLAUDE.md §10 — grep-confirm in dispatcher source
before relying on it).

### LoRA dataset
`blueprint-vision_lora_train.jsonl` / `blueprint-vision_lora_test.jsonl` in
`mcp-server/data/state/lora-datasets/`. Generated by `BlueprintLoRABridgeEngine` via
`blueprint_lora_prepare_set` (confirmed present in cadDispatcher.ts:3568 and
aiReasoningDispatcher.ts:92). Production batch emitted from the closed-loop training loop
when gold/silver tier reached. India trains; xray produces dataset + acceptance gate.
**Privacy gate:** scrub customer names, part numbers, and program content before export;
blocklist: ITW, OPTIMAS, SFS, HOLO-KROME, ALCOA, Continental Midland.

### Engineered loop + cron
Nightly scheduled task (`PRISM OCR Training Loop` — currently Ready/idle, last ran 2026-06-09):
1. `scripts/run-ocr-training-loop-overnight.ps1` → `scripts/blueprint-ocr-training-loop.mjs`
   (VLM ensemble, `--format-json`, ALL pages up to cap 12pp, resumable cursor).
2. `scripts/mine-galaxy-transcripts.mjs --galaxy blueprint-vision` (Ollama summarize → tribal
   tips; `qwen2.5-coder:32b`).
3. `prism_cad:blueprint_coverage_audit` (PSN leg refresh → coverage floor check).
4. `scripts/validate-perfect-parts.mjs --cad-triangulate` (cross-source GT triangulation on
   any new STEP + CNC-program pairs).
Acceptance signal: tribal tips ≥100 AND calibration n≥50 (`reliable:true`) AND corpus
`AL-queue` (active-learning backlog) cleared to <20 prints awaiting operator gold-verification.
The cron task requires elevation (PowerShell `Run As Administrator` or SYSTEM principal via
fleet-reaper-registered task) — this is the blocking constraint on calibration reaching n≥50.

### Ollama offload
- Summarize STEP/DXF tree → `gpt-oss:20b`
- Classify extracted dims / lint engine code → `qwen2.5-coder:32b`
- Deep domain reasoning (ensemble consensus, ground-truth tier disputes) → `gpt-oss:120b`
  (Blackwell 96GB VRAM)
- VLM OCR: `qwen2.5vl:7b` primary (format-json fix shipped); ≥2-VLM agreement = corroborated.
  `llama3.2-vision:11b` is permanently banned from the ensemble.

## §4 — Test plan (real assertions — R9)

All tests round-trip **through the dispatcher** (`prism_cad` action enum + Zod schema + lazy
import). Never `toBeDefined()` — always concrete numeric bounds or structural invariants.

### Unit — extend existing test files

**`mcp-server/src/__tests__/GDTCalloutParserEngine.test.ts` (extend or create):**
- FCF string `"|⊕|Ø.005(M)|A|B|C|"` → assert `type:'position'`, `tolerance:0.005`,
  `modifier:'MMC'`, `datums:['A','B','C']`.
- FCF without datum reference → structured error (not throw); `FCFSyntaxValidatorEngine`
  rejects it with an explicit `"datum-schema missing"` reason.
- All 5 GD&T families (form / orientation / location / runout / profile): one valid FCF per
  family → assert the returned `type` enum value matches.
- Adversarial: empty string → structured error; non-FCF text → `null` result (not throw);
  unicode box-drawing-character variant → normalized correctly.

**`mcp-server/src/__tests__/PDFBlueprintDimensionExtractorEngine.test.ts` (extend or create):**
- Leading-dot decimal `.171` in JSON → repaired to `0.171` (regression lock for
  e354869c93 class — VLM leading-dot parse fix).
- Truncated JSON response (unterminated trailing string) → `repairTruncatedJson` closes it;
  extraction still emits ≥1 dim (regression lock for e354869c93 class).
- Leading-`+` value (`+0.015` tolerance) → stripped to `0.015`.
- All emitted dims carry `confidence: number` (0..1, never undefined) — per-field confidence
  mandatory gate.
- Adversarial: empty PDF text → structured error; Infinity/NaN values → rejected.

**`mcp-server/src/__tests__/BlueprintExtractionContract.test.ts` (new):**
- `normalizeFusedToContract` with a VLM `fused` payload containing 3 dims (2 above 0.70
  floor, 1 below) → contract has 2 confirmed dims + 1 needs_confirm=true.
- Unknown unit dimension (DXF `$INSUNITS` unknown) → `unit:'unknown'`, `needs_confirm:true`
  (regression lock for e036b2d353 DXF units-trust gap fix).
- Imperial dimension input → normalized to mm in contract output; imperial never in PRISM graph.
- Schema version field present and matches `BlueprintExtractionContract.VERSION`.

### Integration — round-trip through cadDispatcher

**`mcp-server/src/__tests__/blueprint-cad-dispatcher-roundtrip.test.ts` (new):**
- `cad_pdf_blueprint_extract {text_content: "PART: BRACKET-4471\nMATL: 6061-T6\n4.250\n2.875"}` →
  response contains dims 4.250 and 2.875 in mm, each with confidence field.
- `cad_gdt_callout_parse {callout: "|⊕|Ø.005(M)|A|B|C|"}` → `type:'position'`, `datums` present.
- `blueprint_rag_extract` missing required fields → Zod rejects at dispatcher; structured error
  returned (not 500).
- `blueprint_extract_route` with invalid contract (missing schemaVersion) → dispatcher error
  (not executor panic).
- `cad_dimension_reconcile` with 3 source candidates (print + CAD + CNC) → response carries
  `consensus` + `conflicts` fields; confident consensus dims have `confirmed:true`.
- Dispatcher contract: action strings in `z.enum`; lazy import fires `cadDispatcher`; Zod
  validates required fields before engine invocation.

### E2E — closed-loop parity

**`mcp-server/src/__tests__/blueprint-extraction-e2e.test.ts` (new):**
- Load a JM Die test fixture print from `H:/PRISM/JM DIE/PRISM CAD TESTING/` (SHA-dedup first).
- Run full pipeline: PDF split → per-page VLM ensemble → contract normalization →
  `cad_dimension_reconcile` → ground-truth tier assignment.
- Assert: every extracted dim has `confidence` field; dims above 0.70 floor are `confirmed`;
  title-block fields (part number, material, tolerance) all present; output is in mm.
- Assert: `GroundTruthValidationEngine` tier for a known-ERP-shipped part is `confirmed` or
  `produced` (never `inferred` for a real JM Die part with an existing program).

### Coverage floor
Happy path + ≥3 failure modes (truncated VLM, missing datum schema, unknown units) + ≥2
adversarial (NaN dim value, Infinity confidence, empty PDF) + ≥3 spanning configs (DXF / PDF
raster / STEP AP242). Runner:
```bash
cd mcp-server && rtk npx vitest run \
  src/__tests__/GDTCalloutParserEngine.test.ts \
  src/__tests__/PDFBlueprintDimensionExtractorEngine.test.ts \
  src/__tests__/BlueprintExtractionContract.test.ts \
  src/__tests__/blueprint-cad-dispatcher-roundtrip.test.ts \
  src/__tests__/blueprint-extraction-e2e.test.ts
```

## §5 — Simulation plan

### What to simulate
Dry-run replay of the full extraction pipeline over a representative batch of JM Die prints
without writing to the production ledger (`--dry-run` flag on `blueprint-ocr-training-loop.mjs`).
Also: cross-source triangulation simulation over the 11 neutral-STEP test parts to measure
GT triangulation coverage before incurring GPU cost.

### Tools
- `prism_cad:blueprint_coverage_audit` — corpus coverage audit (no GPU needed).
- `node scripts/blueprint-ocr-training-loop.mjs --dry-run` — full pipeline without ledger write.
- `node scripts/validate-perfect-parts.mjs --cad-triangulate` — cross-source GT triangulation
  (GPU-free path; reads existing STEP + CNC programs).
- `prism_cad:cad_dimension_reconcile` — cross-source reconciliation dispatch (simulation target).
- `scripts/bench-vision-ocr-ab.mjs` — VLM A/B gate (run before any new VLM promotion; requires
  quiet fleet window per MEMORY.md; built 2026-06-03 but not yet empirically run).

### Scenarios

1. **JM Die aluminum bracket (6061-T6, Kienzle design data — 4 features):**
   Full pipeline replay on a PDF matching the Kienzle Blueprint Intake mock-up
   (part BRACKET-4471, 4.250×2.875 profile, 4× ⌀.281 holes, center pocket, chamfer).
   Assert: title block extracted with ≥4 of 6 fields at confidence ≥0.85; all 4 features
   recognized; dimensions in mm; quote bridge produces draft estimate.

2. **Multi-page D2 tool-steel die print (4pp):**
   4-page PDF via `extract-jm-die-corpus-page-by-page.py` → 4 per-page VLM calls → dim union
   with dedup. Assert: 4 page-level result objects (not 1); dim count > single-page result;
   no duplicate dim entries (dedup on source page + nominal value).

3. **DXF inch file (real tool-library DXF):**
   `cad_dxf_geom_parse` on a known-inch DXF file. Assert: `$INSUNITS` detected as inch;
   output dims marked `unit:'unknown'` or `needs_confirm:true` until unit confirmed; no silent
   25.4× scale error in downstream contract (units-guard regression lock).

4. **STEP AP203 file (geometry-only):**
   `cad_step_parse_file` on a known AP203 STEP. Assert: geometry returned; no GD&T fields
   in response (STEP AP203/AP214 carries geometry only); any GD&T in the final part record
   must come from the `PrintToCADOrchestratorEngine` side-channel separately.

5. **Adversarial: DocuStrata SHA dedup gate:**
   Re-submit a print with a SHA already present in `blueprint-accuracy-events.jsonl`. Assert:
   pipeline skips re-extraction and returns the cached result (no duplicate GPU OCR call).

### Pass criteria
- Scenario 1: ≥4/6 title-block fields extracted; F1 vs ground-truth dims ≥0.65 (silver tier).
- Scenario 2: dim count in multi-page ≥ 1.5× single-page count (confirms page-0-only fix held).
- Scenario 3: no implicit mm assumption on an inch-origin file; `needs_confirm` flag set.
- Scenario 4: zero GD&T fields in STEP-only response; no silent parse failure.
- Scenario 5: re-submission returns cache hit in <200ms; no re-OCR; dedup count incremented.

## §6 — Validation plan (live data — R12/R15)

### Live-data validation
Run the full extraction pipeline on 10 real JM Die prints sampled from
`H:/PRISM/JM DIE/PRISM CAD TESTING/` (the verified test fixture directory). For each print:
- Compare extracted dims (normalized to mm) vs ground-truth dim from `GroundTruthRegistryEngine`
  (tier: `confirmed` or `produced`).
- Report per-field F1 score (precision × recall / (precision + recall)).
- Report per-print extraction yield (trainable dims / total dims detected).

### Acceptance gates
- **Per-field confidence floor:** every field emits `confidence: 0..1`. Verified floor: 0.70
  for operator-confirm. Do not enforce the seed's 0.85/0.95/0.99 tiers until calibration
  reaches n≥200 reliable.
- **Ensemble agreement:** dims require ≥2-VLM agreement (corroborated) to be gold/silver
  trainable. Never promote a single-VLM extraction as training truth.
- **Gold-tier F1 gate:** gold (f=1.0, calibrated →~0.90) vs ground-truth ≥0.85 F1 on the
  10-print validation set.
- **Silver-tier F1 gate:** silver (f=0.5–1.0) vs ground-truth ≥0.65 F1.
- **mm normalization boundary:** 0 imperial dims in the PRISM graph after normalization — the
  25.4× unit trap has zero tolerance (UNITS FIRST rail).
- **Safety gate:** `prism_safety:validate_physics` on any dimension that feeds a downstream
  physics calculation (e.g. bore diameter → deflection check). S(x) ≥ 0.98 before accepting
  a safety-relevant dim as `confirmed`.
- **Dedup gate:** `prism_data:database_search` against `JMDieDocuStrataDB` (111,745 entries)
  confirms no re-OCR of the paid DocuStrata corpus.

### Numbers to report
- MAPE (mean absolute percentage error) for numeric dims vs ground-truth, by dim class
  (linear / diameter / angular / GD&T tolerance).
- Extraction yield per print (trainable / total).
- Calibration n count (current ≈ 24; target 50 for `reliable:true`).
- Corpus worklist progress: current cursor position / 7,794 total drawing prints.

### Page↔core parity probe
`BlueprintQuotePage.tsx` extracted-features panel vs `prism_cad:cad_pdf_blueprint_extract`
backend response: feature count, dim values, title-block fields must agree. Ratio of numeric
dim values frontend vs backend ≤1.01 (normalization should be lossless; not a ±30% physics
tolerance — this is a data-pass-through).

## §7 — Fine-tune loop (results → retrain)

### Outcome capture
`xproc_outcome_publish {slot:'xray', domain:'blueprint-vision'}` after every extraction action.
Note: this action is marked `// UNVERIFIED` in CLAUDE.md §10 — grep-confirm in dispatcher
source before relying on it in automation. Write to `blueprint-accuracy-events.jsonl` (the
confirmed ledger path).

### LoRA
Gold/silver extraction events → `blueprint_lora_prepare_set {confidenceTier:'gold'}` (confirmed
present in cadDispatcher.ts:3568). Append to `blueprint-vision_lora_train.jsonl`. India retrains
on weekly cadence. Promotion gate: acceptance tests green + F1 ≥0.85 on gold tier + calibration
holds `reliable:true` post-retrain. Privacy gate mandatory before dataset export (blocklist per
CLAUDE.md §6 "What NOT to do").

### RAG/CAG
New wiki leaves and tribal tips → `scripts/embed-cited-tips.mjs` re-embeds. Galaxy reasoning
bridge (`galaxy-reasoning-bridge.mjs blueprint-vision`) auto-consumes updated CAG cold cache.
Dense/hybrid RAG arm is on by default (`PRISM_GALAXY_RAG_DENSE=1` default since 2026-06-10,
commit `52b83b819f`) — sparse retrieve → nomic-embed rerank → RRF-fuse.

### NN/GNN
New labeled extraction outcomes → `vault-to-gnn-refpool.mjs` → GraphSAGE retrain (india).
Promote IFF: AUROC ≥0.78 / macro-F1 ≥0.55 / Brier ≤0.15 at minConf=0.70 selective gate.
The extraction domain is a classification problem (feature-type/dim-class labels) well-suited
to the GNN refpool.

### A/B VLM gate
Before any new VLM model promotion: `node scripts/bench-vision-ocr-ab.mjs` (paired synthetic
A/B → upgrade/stay verdict feeding `vision-model-select.mjs`). Run only during a quiet fleet
window (vision cold-load starves under live Ollama contention). Never promote based on a
single-seed test run.

### Cadence summary
Nightly: OCR cron (all-pages, resumable, format-json) + mine transcripts + coverage audit.
Weekly: LoRA dataset emit → india retrain → parity probe. On-threshold: GNN retrain when
refpool label count exceeds prior training set + 20%. All results → `blueprint-accuracy-events.jsonl`
+ Obsidian brain for cross-session recall.

## §8 — Frontend build (Kienzle Claude-Design rollout)

### Assigned Kienzle page
`mcp-server/web/design-imports/kienzle-app-build/Kienzle Blueprint Intake.dc.html`
(179 lines — full content read and verified). 2-column layout: left = blueprint viewer with
OCR scan animation + 4-step pipeline strip; right = extracted title block + recognized
features + auto-quote draft + review flags panel.

### Target React pages
**Primary: EXTEND `mcp-server/web/src/pages/BlueprintQuotePage.tsx`** (confirmed on disk).
This page already exists and matches the core Kienzle Blueprint Intake concept (blueprint →
quote flow). Do NOT create a new page; analyze and improve the existing one.

**Secondary surface: EXTEND `mcp-server/web/src/pages/DocumentInboxPage.tsx`** (confirmed on
disk) — the document upload / intake entry point. The Kienzle design's 4-step pipeline strip
("Upload/scan → OCR title block → Feature detect → Draft quote") maps naturally onto the
inbox flow as a status-progress component.

### Design extraction (Kienzle HTML → React fields)

**Blueprint viewer panel (left, ~60% width):**
- Blueprint sheet rendered as a live SVG or PDF canvas with OCR-detected region overlay boxes
  (color-coded: green = title block, orange = part geometry, yellow = hole callouts, blue =
  dimension lines). Match the `.dc.html` `ocrBoxes` pattern.
- Scan-line animation during active OCR (`@keyframes kzscan`, 2.2s ease-in-out infinite;
  `kzpulse` for the stage indicator dot). Use CSS animation via CSS vars, never inline style.
- 4-step pipeline strip at bottom: Upload/scan · OCR title block · Feature detect · Draft quote.
  Steps use the PRISM status spectrum: complete = emerald (`#36D399`), active = orange
  (`#FF7A4D`), pending = dim (`#6B7280`). Map to `--status-success` / `--accent-sfc` / `--fg-dim`
  tokens (never inline hex).

**Results panel (right, 432px, scrollable):**
- "EXTRACTED · TITLE BLOCK" header in JetBrains Mono 10.5px letter-spacing 0.16em, color
  `#FF5A2B` (the PRISM accent — map to `--accent-primary`).
- Title-block key-value rows: `Part number / Material / Quantity / Tolerance / Revision /
  Customer`. Each row has a confidence badge (JetBrains Mono 9px): green ≥95%, amber ≥85%,
  red <85% — using `--status-success` / `--status-warning` / `--status-error` tokens.
  Source: `prism_cad:cad_pdf_blueprint_extract` response, normalized through
  `BlueprintExtractionContract`.
- "RECOGNIZED FEATURES" section: feature cards with icon chip, feature name, detail line
  (tolerance / floor Ra / operation type), and operation label (drill / adaptive / chamfer /
  profile). Map to `prism_cad:feature_recognize` response.
- "AUTO-QUOTE DRAFT" panel: emerald gradient border, auto-priced estimate from
  `blueprint_to_quote` via `businessDispatcher`. One-click CTA "Create quote →" navigates
  to `QuoteBuilderPage` with pre-filled blueprint data.
- "NEEDS REVIEW" panel: amber border, flag list from low-confidence fields
  (confidence < 0.85) or ambiguous dim calls. Populated by `BlueprintExtractionContract`
  `needs_confirm` fields.

### Backend wiring
- **Primary extraction:** `prism_cad:cad_pdf_blueprint_extract` (PDF text → dims) and
  `prism_cad:cad_live_blueprint_ocr` (live VLM OCR path for phone-camera scans).
- **GD&T:** `prism_cad:cad_gdt_callout_parse` on any FCF-containing field.
- **Feature recognition:** `prism_cad:feature_recognize`.
- **Cross-source reconciliation:** `prism_cad:cad_dimension_reconcile` (confirmed in
  cadDispatcher.ts:505 and :694).
- **Quote bridge:** `businessDispatcher:blueprint_to_quote` (confirmed in CLAUDE.md §3).
- **Full fan-out route:** `prism_cad:blueprint_extract_route` (confirmed cadDispatcher.ts:307
  and :3700) — takes a `BlueprintExtractionContract`, re-derives a trusted plan, fans out to
  eligible consumers.
- **API client:** create or extend `mcp-server/web/src/api/blueprintApi.ts` — POST to:
  - `:3100/api/v1/cad/blueprint-extract` (verify route exists via grep `mcp-server/src/routes/`)
  - `:3100/api/v1/drawing/execute` (confirmed route from `extractionPlanExecutor.ts` commit)
  - Before shipping: grep `mcp-server/src/routes/` for both routes to confirm live (dead-wire
    prevention).

### Design language
iOS fleet tokens (`DESIGN.md` + `web/DESIGN.md` + `src/index.css`). Background: `#070809`
(matches Kienzle `.dc.html` exactly — map to `--bg-base`). Accent: `#FF5A2B` (map to
`--accent-primary`). Status: emerald `#36D399` / amber `#F4B740` / red `#FF5247` (map to
`--status-success` / `--status-warning` / `--status-error`). Blueprint wire color: `#7FB2FF`
(map to `--accent-secondary` or `--info`). JetBrains Mono for all data values, confidence
badges, monospace labels. Space Grotesk for headings. Archivo for body. NEVER inline hex
or px values.

Mobile-first: 44pt tap targets on all interactive elements. "Create quote →" CTA in
thumb-zone (bottom-center on mobile). Blueprint viewer collapses to full-width on <600px;
results panel stacks below. Safe-area insets via `<MobileSafeArea>`. `inputMode="decimal"`
on any numeric tolerance input field.

### Build/verify loop
`npm run build:fast` → Playwright screenshot → compare to `.dc.html` intent → iterate.
No physics constants in frontend JS; all extraction results fetched from `:3100`.

### 3-viewport acceptance
1. **375×667 (iPhone SE):** upload button full-width above fold; results panel scrollable;
   title-block rows readable at 11.5px; no truncation of feature names.
2. **390×844 (iPhone 14 — primary iOS fleet target):** blueprint viewer renders at ≥200px
   height; OCR scan line visible; confidence badges clear; "Create quote →" in thumb zone.
3. **1440×900 (desktop):** 2-column Kienzle layout intact; blueprint panel 60% / results
   432px; auto-quote draft and review flags both visible without scroll.

## §9 — Dependencies & sequencing

### Blocked by
- **GPU access / elevated OCR cron:** calibration reaching n≥50 (`reliable:true`) requires the
  nightly `PRISM OCR Training Loop` task to run uninterrupted under elevated permissions.
  Currently Ready/idle (not running nightly). This is the single biggest bottleneck for the
  fine-tune loop reaching production-safe confidence thresholds.
- **india (ai-training):** LoRA retrain and GNN refpool promotion. Xray produces dataset;
  india trains. `vault-to-gnn-refpool.mjs` must be wired to extraction outcome ledger.
- **U-XRAY-EXECUTOR-PAYLOAD-ADAPT (open P2):** per-consumer payload drivability reconciliation
  needed before advisory consumers in `extractionPlanExecutor` fully execute rather than no-op.
- **Synthesis brain re-synthesis (sierra/india):** `blueprint-vision_synthesis.md` carries
  off-domain content; fix owned by sierra/india.
- **juliett (database-expansion):** fast-search layer for DocuStrata `.index/` queries; xray
  is an asymmetric consumer (juliett CLAUDE.md does not yet list xray as consumer — flag to
  juliett to add the edge).
- **Quebec (frontend):** implements the Kienzle Blueprint Intake design; xray owns the backend
  it consumes.

### Blocks
- delta (cad) — consumes xray geometry extractions for CAD reconstruction.
- kilo (cam) — `print_to_program_*` toolpath generation depends on xray feature extractions.
- charlie (quoting) — `blueprint_to_quote` quote pricing depends on xray extracted features
  and confidence tiers.

### Logical order (R13)
Deepen core (§3: tribal + wiki + memories + RAG embed) → test core (§4: dispatcher round-trips
+ unit tests) → simulate (§5: dry-run + triangulation) → validate live (§6: 10-print F1 + mm
normalization gate) → activate fine-tune loop (§7: elevate OCR cron + LoRA emit) → frontend
build (§8: BlueprintQuotePage + DocumentInboxPage). Frontend LAST — never build UI atop an
unproven extraction backend. OCR cron elevation unblocks the calibration bottleneck and should
be actioned as early as possible (it requires operator-side PowerShell task elevation, not
code).

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] **WIRE:** every new asset (wiki leaves, tribal tips, LoRA dataset, GNN labels,
  extraction contract schema) wired to its consumer in the same commit. U-XRAY-EXECUTOR-
  PAYLOAD-ADAPT P2 seam resolved or explicitly scoped. Juliett cross-galaxy edge added
  (juliett CLAUDE.md updated to list xray as consumer). `xproc_outcome_publish` action
  grep-confirmed in dispatcher source before automation relies on it.
- [ ] **TEST:** all 5 test files green; no `.skip`; ≥3 failure modes + ≥2 adversarial + ≥3
  spanning format configs; dispatcher round-trip exercised for every primary blueprint action.
  VLM A/B benchmark (`bench-vision-ocr-ab.mjs`) run at least once against synthetic fixtures.
- [ ] **VALIDATE:** 10-print live validation complete; gold F1 ≥0.85 and silver F1 ≥0.65
  reported; mm normalization gate: 0 imperial dims in PRISM graph; calibration n count
  reported (target ≥50 for `reliable:true`); page↔core parity probe passes ≤1.01× ratio.
- [ ] **APPLY:** deepening cron live (elevated, running nightly); tribal tips ≥100; wiki
  leaves ≥5 new in blueprint-vision namespace; `BlueprintQuotePage.tsx` and
  `DocumentInboxPage.tsx` rendering live data from `:3100`; LoRA dataset produced and
  privacy-scrubbed; synthesis brain re-synthesized (sierra/india handoff complete). Per-file
  2-arm scrutiny on every code file + 3-of-3 Stop gate on the session.
