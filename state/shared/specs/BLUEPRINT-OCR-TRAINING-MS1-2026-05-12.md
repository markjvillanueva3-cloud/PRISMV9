# BLUEPRINT-OCR-TRAINING-MS1 — RAG-augmented blueprint OCR + LoRA training + closed-loop continual learning

**Created:** 2026-05-12 by claude-a7ea87ab (slot BRAVO)
**Method:** `/forge4 scope` (v4 atomic-first tier-gating; system-viz graph @ 2026-05-12T17:53:57.314Z as dependency oracle)
**Triggered by:** user request 2026-05-12 — *"can we use obsidian + tribal knowledge + prism awareness + neural network + /system-viz + skill, scripts and hooks + memories + any other development or backend tool we've built to train our ocr/blue print reading capabilities… add all this to your existing work envelope we've been working on then utilize a forge slash command and /system-viz to ensure we cover all potential gaps and capabilities that would enhance or improve our results"*
**Track:** `TRAINING-LEARNING` (sibling/successor to `TRAINING-LEARNING-MS0` per its own §non_goals — *"Full RAG / embedding stack from day one"* deferred to v2; this milestone IS that v2)
**Companions:**
- `MACRO-PROGRAM-PIPELINE-MS0-2026-05-12.md` — upstream-fed (better extraction → better print-to-program candidates)
- `TRAINING-LEARNING-MS0-2026-05-12.md` — upstream depends on (template families inform retrieval context)
**Roadmaps it docks into:** `MILL-MASTER`, `LATHE-MASTER`, `WEDM-AGI`, `OBSIDIAN-AUTOMATE-MS3`, `CAD-FUSION-LIVE-MS0`

---

## Atomic-First Compliance Card (forge4 v4)

| Field | Value |
|---|---|
| `atomic_phase` | 2 (wire-up) → 4 (new build) — sequenced, not mixed |
| `tier` | T1 (engines) — composes T1/T2 + extends T0/T1 |
| `prereq_tier` | T0 (xproc-conformal/ewc/replay constants, embedding constants) + T1 (cad-rag/cad-embed/training-snapshot engines) — **all in place** |
| `tier_floor` | PASS — every Tier-1 prereq is present in the graph (verified Phase 0.5.viz) |
| `dedup_intercept` | **GroundTruthRegistryEngine + GroundTruthValidationEngine ALREADY EXIST** — extend them, do NOT create `BlueprintGroundTruthJoinEngine`. Other 3 proposed names (RAG/LoRABridge/CoverageAudit) are clear. |
| `leverage_score` | ~125 (wires 8 existing-but-unwired surfaces + extends 2 engines + composes 80+ actions across 6 dispatchers) |
| `suggested_dispatchers` | `prism_cad`, `prism_quality`, `prism_knowledge`, `prism_ai` (from `node.suggestedDispatchers` for the composed engines) |
| `pending_merge_check` | N/A — `cqask` + `cadquery` are unrelated frontends; their merge does NOT gate this work |
| `drift_blocker_check` | 4 drift cases recorded (CAM-EXHAUST-MS0, INTEL-OLLAMA-OBSIDIAN-MS0, OBSIDIAN-MS0, PSAU-PPG-SFC) — none in TRAINING-LEARNING/CAD tracks; no blocker |
| `master_roadmap_yagni` | Master roadmap Phase 4 warns *"don't add new engines/pages while 28% of existing engines are unwired"*. This milestone **respects the warning**: Phase 2 wire-up units come FIRST, Phase 4 new-build units are minimal (3 engines + 2 extensions). |

---

## Principle (per the user, with non-negotiables)

> *"Use obsidian + tribal knowledge + prism awareness + neural network + /system-viz + skill, scripts and hooks + memories + any other development or backend tool we've built to train our ocr/blue print reading capabilities"* — given full engineering courses from MIT, CAD/CAM PDFs, and online sources.

The pipeline turns **every print + program + CAD/CAM file in the shop + MIT engineering corpus + CAD/CAM publisher PDFs + curated online sources** into:
1. A **labelled training set** (image + region → expected dim / GD&T callout / material / feature / tolerance) joined against ERP-confirmed actuals so ground truth has confidence stratification.
2. A **RAG-augmented extraction surface** — every blueprint OCR call retrieves top-k corpus context (MIT chapter, vendor catalog page, tribal tip, prior similar print) and injects it into the vision prompt.
3. A **LoRA export bundle** sized to a managed external fine-tune (Gemini/OpenAI/Modal) — PRISM produces the corpus; the fine-tune runs externally; the resulting endpoint plugs into `AISystemRouterEngine` as a new backend.
4. A **closed-loop continual learner** — every operator correction or ERP outcome updates the conformal calibration + replay buffer + EWC consolidation per dim-type (P/T/D/GD&T/material/tolerance).
5. A **coverage audit** that reports per-customer / per-convention / per-GD&T-symbol where the system is confident vs. uncertain — driving the next learning cycle.

**Operator-in-the-loop is unconditional.** No extraction is treated as ground truth without operator confirmation (or a confirmed ERP match). The system reports its uncertainty via conformal bounds; the operator decides.

**Critical caveat (per `[[reference_docustrata_multi_print_pdfs]]`):** 96% of Docustrata PDFs are multi-page; single PDFs can hold 5-10 prints buried on pages 2+. Phase 3c page-1-only missed 24,186 docs / 120K pages. The corpus loader MUST use the tiered classifier (image heuristic → Tesseract title-block OCR → vision LLM) over all pages — `phase8-tiered-blueprint-classifier.py` is already shipped and is the right tool.

**Critical caveat (per `[[feedback_box_programs_amateur]]` carried forward from TRAINING-LEARNING-MS0):** Historical S/F + dim values from amateur programs are DATA, NOT GROUND TRUTH. The ground-truth tier must stratify: `confirmed` (ERP-shipped + measured + accepted) > `produced` (made, not yet inspected) > `quoted` (estimate only) > `inferred` (macro var default). Conformal calibration uses the stratification; replay buffer down-weights the lower tiers.

**Critical caveat (per `[[feedback_no_public_h_drive.md]]`):** Any external fine-tune corpus export MUST scrub customer names, part numbers, and program contents that constitute proprietary IP. The LoRA export engine includes an anonymization stage; the operator confirms the scrub before any bundle leaves the local filesystem.

**Non-goals (explicit, scope-fencing):**
- ❌ NOT on-device vision-model weight updates (we don't run our own GPU surface; LoRA is exported for external fine-tune)
- ❌ NOT replacing `BlueprintVisionOCREngine` / `imageocrpipelineengine` / `pdfblueprintdimensionextractorengine` — these are the BASE LAYER the RAG engine wraps
- ❌ NOT auto-correcting extractions without operator review (corrections feed the replay buffer; nothing fires back into a "fixed" extraction without consent)
- ❌ NOT writing to `H:/PRISM/JM DIE/Automated Program_Corrected 5-25.xlsm` (read-only — same rule as TRAINING-LEARNING-MS0/U3)
- ❌ NOT public-distribution of any export (per `[[feedback_no_public_h_drive]]`)

---

## Existing infrastructure inventory (graph-derived — do NOT rebuild)

The system-viz dep oracle pass surfaced this list. Every item below is wired and tested as of graph timestamp 2026-05-12T17:53:57.314Z. The milestone COMPOSES these — every engine cited here is a reuse, not a build.

### Tier-1 engines (wired or shipped — 22 in scope)

| Engine | Layer | Role in this milestone |
|---|---|---|
| `BlueprintVisionOCREngine` | L5 / cad | Base vision-OCR call (wrapped by U-T4-A's RAG engine) |
| `imageocrpipelineengine` | L5 / pdf | Image pipeline OCR layer |
| `pdfblueprintdimensionextractorengine` | L5 / cad | PDF dim extractor (already exists — the SR has wiki + test) |
| `blueprintprogramjoinengine` | L5 / cam | Joins print ↔ program (the ground-truth source) |
| `groundtruthregistryengine` | L5 / cad | **EXTEND** (U-T1-E1) with blueprint-specific entries (not create new) |
| `groundtruthvalidationengine` | L5 / cad | **EXTEND** (U-T1-E2) with blueprint-extraction validation pass |
| `crossprocessvisiontabularfusionengine` | L5 / fusion | Multi-modal vision+tabular fusion (composes well with RAG) |
| `cadembedindex` engine | L5 / cad | Existing embedding index over CAD nodes |
| `gdtstackupengine` | L5 / cad | GD&T stackup math (a downstream consumer of better callout extraction) |
| `gdtcalloutparserengine` | L5 / cad | GD&T callout parser (extension target — see U-T1-E3) |
| `crossprocessconformalpredictionengine` | L5 / adaptive | Conformal bounds on extracted dims |
| `crossprocessconformalclassificationengine` | L5 / adaptive | Conformal bounds on GD&T symbol classification |
| `latheloracontinuallearningengine` | L5 / lathe | Reference impl of continual-LoRA pattern; blueprint engine mirrors it |
| `latheloratrainingmonitorengine` | L5 / lathe | Reference monitor pattern |
| `latheloratrainingscriptengine` | L5 / lathe | Reference training-script pattern |
| `camtrainingextractionaggregatorengine` | L5 / cam | Reference aggregator pattern for training-extraction |
| `trainingcontentindexengine` | L5 / other | Training content indexing |
| `trainingledgerengine` | L5 / other | Training event ledger |
| `MacroLibraryEngine` (U-MACRO-PIPELINE-U1, this session) | L5 / cad | Family classification reuse |
| `LathePartClassifierEngine` | L5 / lathe | Part-family classification (retrieval pivot) |
| `PartFolderOrganizerEngine` | L5 / cad | Part-folder + part.json I/O |
| `PRISMSelfAwarenessEngine` | L5 / knowledge | Capability + tribal + playbook lookup |

### Tier-1 engines (rescue — monolith forks, currently UNWIRED)

| Engine | Status | Action in this milestone |
|---|---|---|
| `prism-enhanced-gdt-engine` | Unwired (monolith-modules.complete-extraction) | **U-T1-R1** rescue + wire to `prism_cad` |
| `prism-gdt-fcf-parser` | Unwired (monolith-modules.complete-extraction) | **U-T1-R1** rescue + wire (same unit) |
| `prism-ocr-engine` | Unwired (monolith-modules.complete-extraction + engines-ai-ml) | **U-T1-R2** rescue + wire to `prism_cad` or `prism_resource_extraction` |

These are existing v8.89-monolith forks sitting in `extracted/` / `extracted_modules/` per `[[reference_monolith_extraction]]`. Rescuing them is **HIGHER leverage** than building new — wiring an existing tested fork costs ~1 day; building equivalent from scratch costs ~1 week. Forge4 atomic-first ordering says: rescue before new-build.

### Tier-2 dispatcher actions (wired — ~80 in scope)

| Cluster | Actions |
|---|---|
| **CAD RAG** | `cad-rag-retrieve`, `cad-rag-augment`, `cad-rag-filter`, `cad-rag-format`, `cad-rag-rank`, `cad-rag-stats` |
| **CAD Embedding** | `cad-embed`, `cad-embed-batch`, `cad-embed-build-index`, `cad-embed-search`, `cad-embed-cache-clear`, `cadembedindex` |
| **CAM RAG** | `cam-rag-build-index`, `cam-rag-retrieve`, `cam-rag-retrieve-for-parameter` |
| **Blueprint extraction (cad)** | `blueprint-to-3d-model`, `blueprint-to-all-cads`, `blueprint-to-all-cads-validate`, `blueprint-to-all-cads-capabilities`, `blueprint-to-cadquery-script`, `cad-blueprint-extract-features`, `cad-blueprint-flag-features`, `cad-blueprint-generate`, `cad-blueprint-infer-class`, `cad-pdf-blueprint-extract`, `cad-translate-blueprint-to-ops` |
| **Blueprint extraction (quality)** | `blueprint-extract`, `blueprint-compare-revisions`, `blueprint-dxf-dimensions`, `blueprint-inspection-plan`, `blueprint-setup-sheet` |
| **Blueprint extraction (business + turning + dev)** | `blueprint-to-quote`, `blueprint-resolve-material`, `turning-blueprint-intake`, `blueprint-ingest-phase8` |
| **Vision fusion** | `xproc-vision-fuse`, `xproc-vision-explain-attention`, `xproc-vision-constants`, `xprocvisionfusion` |
| **Conformal / EWC / Replay** | 18 conformal actions + 9 EWC actions + 30 replay actions (full xproc adaptive surface) |
| **LoRA** | `cam-lora-{predict,apply-delta,check-health,ensemble,list,select,standardize,validate}`, `cam-ml-train-lora`, `cam-ml-predict-lora`, `cam-feedback-lora-training-export`, `continual-lora-{create,list,state,train}`, lathe-lora-master/physics surfaces |
| **Training infrastructure** | `cad-training-start`, `cad-training-status`, `cad-training-corpus-stats`, `cad-trial-{ingest,patterns,recommend,stats,reset}`, `training-snapshot-{create,list,load,stats}`, `training-assemble`, `training-export` |
| **Dimensional extraction** | `cad-dimensional-signature`, `dim-signature-extract`, `dim-signature-extract-text`, `dimension-impute-{build,apply,outliers,stats}`, `box-scan-dimensions` |
| **GD&T** | `cad-gdt-callout-parse`, `cad-gdt-stackup`, `gdt-stackup`, `probe-gdt-interpret`, `gdt-propagate`, `gdt-validate` |
| **Resource extraction** | `ocr`, `ocr-process`, `ocr-stats` (full dispatcher: `resourceExtraction`) |
| **Document learning** | `documentLearning` dispatcher entries (per dispatcher-summary) |

### Tier-1 hooks (wired)

- `blueprint-accuracy-guard` — **EXTEND** (U-T1-H1) with conformal-bound check + replay-buffer notification
- `training-convergence-guard` — already gates LoRA training convergence; reuse for blueprint LoRA exports

### Tier-2 skills (wired)

- `/pdf-learn`, `/video-learn`, `/shop-knowledge`, `/blueprint-read`, `/cad-extract`, `/cad-feature-recognize`, `/cad-from-blueprint`, `/cad-tolerance-check`, `/cmm-parse`, `/print-to-program` — operator-facing front doors. The new `/blueprint-rag-extract` + `/blueprint-corpus-status` + `/blueprint-correction` extend this surface.

### Tier-3 academy course (already published)

- `academy-course-0c-blueprint-reading-blueprint-reading-gd-t` — the course we teach OPERATORS. This milestone's U-T3-C1 produces a parallel system-facing curriculum doc (what the model has learned, by domain).

### Tier-4 frontend (already shipped)

- `BlueprintQuotePage` + `fe-page-blueprintquotepage-1` — operator UI for blueprint-to-quote. Becomes a downstream consumer of better-bounded extractions.

### Test surface (wired)

- `blueprintocrengine` test, `blueprintvisionocrengine-complexparts` test, `blueprintvisionocrengine-partclass` test, `blueprint-ocr-real-data` test, `blueprint-vision-ocr` test, `imageocrpipelineengine` test, `gdtcalloutparserengine` test, `gdtstackupengine` test, `groundtruthregistryengine` test, `groundtruthvalidationengine` test, `groundtruthbatchextractor`, `groundtruthdeterminism`, `groundtruthfeaturetreeextractor` — **the test floor already exists.** New engines extend these test files rather than create parallel ones.

---

## Corpus inventory (training data sources — hard counts)

| Source | Path / URL | Count | Confidence tier | Notes |
|---|---|---|---|---|
| JM Die Docustrata index v2 | `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` | 24,545 production files / 120K+ pages | `produced` → `confirmed` once ERP-matched | The canonical labelled-pair backbone per `[[reference_docustrata_multi_print_pdfs]]` |
| JM Die `_PART LIBRARY/` | `H:/PRISM/JM DIE/_PART LIBRARY/` | 25,028 part folders / 42,407 print pages / 10,678 program files | mixed | Materialized via phase18 |
| MIT engineering corpus (already integrated) | per WEDM-AGI status | 5 MIT courses (2.008 / 2.830 / 2.813 / 18.06 / 6.S191) | `confirmed` (peer-reviewed) | Prior knowledge baseline |
| MIT engineering corpus (to add) | OCW + open access | drafting 2.007 + 2.001 + 2.003 + 2.005 + GD&T modules | `confirmed` | New harvest target |
| CAD/CAM vendor PDFs | local — `Resources/` + harvested | Mastercam handbook / hyperMILL handbook / Sandvik / Kennametal / ISCAR / Walter / Haas catalogs | `confirmed` | Already partially indexed via `/pdf-learn` |
| Machinery's Handbook | local + indexed | 30th ed. + appendix | `confirmed` | Foundational drafting + tolerances reference |
| Online drafting + GD&T sources | URLs (curated whitelist) | drafting-zone.com, gdtbasics.com, engineering.com, Wikipedia GD&T | `inferred` | Harvest via Playwright MCP per `[[feedback_playwright_for_online_sources]]` |
| Academy course material | `academy-course-0c-blueprint-reading-blueprint-reading-gd-t` | published | `confirmed` | Already-curated training material |
| Manufacturer mark/symbol references | catalogs + handbook | ~40 standard GD&T symbols + ~200 surface-finish marks | `confirmed` | Maps to `gdtcalloutparserengine` symbol library |
| Tribal knowledge | `knowledge/tribal/*` | 4,245 tribal tips + 3,700 shop tips | `inferred` (operator-asserted) | Stylistic priors ("this callout means X at JM Die") |

**Corpus volume estimate:** ~200K image regions + ~30K corpus snippets — well within the manageable range for embedding indexing (the existing `cadembedindex` is already running) and external LoRA fine-tune bundling (~50-200 MB export).

---

## Acceptance criteria (omega_floor=1.0 per user's standing preference)

- Every new/extended engine ships with: real tests (reference values from existing prints + cross-validation against `groundtruthregistryengine` — NO `toBeDefined()` stubs), dispatcher wiring (import + call + action enum + schema), round-trip E2E assertion through the dispatcher.
- Coverage floor per engine: happy path + ≥3 failure modes (corrupt PDF, missing corpus entry, conformal-bound violation) + ≥2 adversarial inputs (deliberately-misleading callout, scrambled multi-page PDF).
- Variability floor: each extraction-touching unit exercises ≥3 dim-types (linear / GD&T / threaded-callout) AND ≥3 customer conventions (JM-Die-internal / Alcoa-aerospace / Continental-automotive — pulled from Docustrata).
- The LoRA export bundle is **anonymized + operator-confirmed** before any file is written outside `mcp-server/data/training/` (audit log retained).
- The `blueprint-accuracy-guard` hook **HARD BLOCKS** extraction-touching commits when conformal bounds widen by >20% session-over-session without an accompanying recalibration entry.
- The coverage-audit Stop hook (new — `blueprint-coverage-floor-guard`) blocks Stop if a session changed extraction-path code without re-running the audit. (MINIMAL_ALLOWLIST — non-bypassable.)
- Every external corpus URL is gated by `[[feedback_no_public_h_drive]]` — H: data is NEVER published; outbound is only to managed fine-tune providers with NDA + per-bundle operator approval.

---

## Units (8 — sequenced Phase 2 wire-up BEFORE Phase 4 net-new, per master roadmap YAGNI)

> **Build order is the spec.** Each unit must complete + ship before the next opens. Phase 2 wire-up units front-load the leverage; Phase 4 net-new arrives only on top of the wired floor.

---

### MS1-U1 — Rescue + wire `prism-enhanced-gdt-engine` + `prism-gdt-fcf-parser` (Phase 2, T1)

**What:** Locate the two GD&T monolith forks in `extracted/` / `extracted_modules/` per `[[reference_monolith_extraction]]`. Adapt the API to current `prism_cad` conventions. Wire `cad_gdt_parse_enhanced` + `cad_gdt_fcf_parse` actions. The enhanced parser fills the gap where `gdtcalloutparserengine` returns "unrecognized callout" — Feature Control Frames with stacked tolerances + composite frames + datum reference frames.

**Reuse:** `gdtcalloutparserengine` (the existing parser; the monolith fork extends it, not replaces), `cad_gdt_callout_parse` action.

**Wire to:** `prism_cad`: actions `cad_gdt_parse_enhanced`, `cad_gdt_fcf_parse_enhanced`. Schema + switch + zod.

**Tests:** ≥10 cases over ≥3 GD&T symbol families (positional / profile / runout) including composite FCFs + datum reference frames + stacked tolerances + the 5 cases in `gdtcalloutparserengine.test.ts` that currently return "unrecognized" (the rescue is verified by those flipping to recognized).

**Tier:** T1 — prereq is T1 (`gdtcalloutparserengine`) already wired. PASS.

---

### MS1-U2 — Rescue + wire `prism-ocr-engine` monolith fork (Phase 2, T1)

**What:** Locate the v8.89 OCR engine fork at `extracted/extraction/prism-ocr-engine` + `extracted/engines-ai-ml/prism-ocr-engine`. Compare against current `imageocrpipelineengine` + `BlueprintVisionOCREngine` — identify capability delta (likely: better confidence-stratification, different vendor backend, additional text-pre-processing). Adopt the additive parts into a `prism_ocr_classic` action that the RAG engine (U7) can call as a parallel-corroboration path.

**Reuse:** `imageocrpipelineengine`, `BlueprintVisionOCREngine`, `xproc_ensemble_predict` (for parallel corroboration), `ocr-process` action.

**Wire to:** `prism_cad` AND `prism_resource_extraction`: action `prism_ocr_classic`. Schema + switch + zod.

**Tests:** ≥10 cases including direct comparison against `BlueprintVisionOCREngine` over the `blueprint-ocr-real-data` test fixtures — assert ensemble disagreement is correctly flagged when the two backends disagree by >15% on the same region.

**Tier:** T1 — prereq is T0 (constants exist) + T1 (peer engines wired). PASS.

---

### MS1-U3 — Extend `groundtruthregistryengine` with blueprint-extraction join (Phase 2, T1)

**What:** Add methods to the existing engine — do NOT create a new one (per dedup intercept Rule 9). New methods:
- `registerBlueprintExtraction({pdfPath, page, region, extractionType, value, confidenceTier, sourceProvenance})` — appends a labelled record
- `joinDocustrataToPartLibrary({rootDir, indexPath})` — bulk join over the 24,545 Docustrata files vs. `_PART LIBRARY/<customer>/<pn>/part.json` macro VC vars vs. ERP-confirmed actuals — produces labelled (image, expected_extraction) tuples stratified by confidence
- `enumerateByConfidenceTier({tier})` — return labelled set at given tier
- `flagAmbiguities()` — surface ground-truth pairs where ERP and macro disagree
- `getTrainingPairsByCustomer({customer, limit?})` — operator-scoped retrieval

**Reuse:** `blueprintprogramjoinengine` (the print↔program joiner — composes), `MacroLibraryEngine` (family classification), `PartFolderOrganizerEngine` (part.json I/O), Docustrata index v2 (`jm-die-index-v2.json` — read-only).

**Wire to:** `prism_cad` actions `gt_blueprint_register`, `gt_blueprint_join_docustrata`, `gt_enumerate_by_tier`, `gt_flag_ambiguities`, `gt_training_pairs_by_customer`. Existing `groundtruthregistryengine` action surface gets extended; no new dispatcher.

**Tests:** extend `groundtruthregistryengine.test.ts` — ≥10 NEW cases on top of existing. Reference customers: ALCOA + ITW + CONTINENTAL MIDLAND (≥3 from corpus). Adversarial: corrupt jm-die-index-v2.json, missing `_PART LIBRARY/<customer>` folder, an extraction value that contradicts macro VC var (the flagAmbiguities path).

**HARD RULE:** the engine NEVER writes to `Automated Program_Corrected 5-25.xlsm` or to any `_PART LIBRARY/<customer>/<pn>/CNC PROGRAM/` (read-only). Verified by a test that mocks the FS and asserts no write occurs outside `mcp-server/data/training/`.

**Tier:** T1 (extension) — extension of wired engine. PASS.

---

### MS1-U4 — Extend `groundtruthvalidationengine` with extraction-confidence cross-validation (Phase 2, T1)

**What:** Add methods that consume the labelled pairs from U3 + run them through every available OCR backend (`BlueprintVisionOCREngine` + `imageocrpipelineengine` + `prism_ocr_classic` from U2) + record ensemble agreement / disagreement per region. This is the **evaluation harness** for measuring whether RAG augmentation improves extraction quality. New methods:
- `validateExtractionBackend({backendId, trainingPairSetId})` → `{accuracy, conformal_coverage, per_dim_type_breakdown, disagreement_regions}`
- `compareBackends({backendIds[], trainingPairSetId})` → `{rank, regression_flags}`
- `regressionGate({backendId, baselineSnapshotId})` → `{passed, regressions[]}`

**Reuse:** `xproc_ensemble_predict`, `xproc_conformal_calibrate`, `xproc_conformal_stats`, `crossprocessconformalpredictionengine`, `crossprocessconformalclassificationengine`, `xproc_attention_explain` (for explaining low-confidence extractions).

**Wire to:** `prism_cad` + `prism_ai`: actions `gt_validate_backend`, `gt_compare_backends`, `gt_regression_gate`.

**Tests:** ≥10 cases. Reference: run the BlueprintVisionOCREngine baseline against a known training-pair set, confirm conformal bounds calibrate; deliberately swap a backend's output to be wrong on 20% of regions and confirm `regression_gate` returns `passed: false` with the regressions named.

**Tier:** T1 (extension). PASS.

---

### MS1-U5 — Extend `blueprint-accuracy-guard` hook with conformal-bound + replay-buffer integration (Phase 2, T0/T1)

**What:** The hook already exists at runtime. Extend its logic so when an extraction-touching dispatcher action returns extractions, the hook:
1. Pulls the action's conformal calibration via `xproc_conformal_stats` (per dim-type via `xproc_mondrian_stats`)
2. If the new extraction's confidence-bound widened >20% vs. the rolling window → flag for `xproc_drift_observe`
3. If the extraction matches a known training pair with operator-confirmed ground truth → emit an `xproc_replay_add` event to the replay buffer (with priority = inverse of confidence)
4. If an operator correction event arrives → emit `xproc_outcome_record` + `xproc_predlog_pair` + an `xproc_ewc_consolidate` if accumulated since last consolidation > threshold

Also: register a new sibling hook `blueprint-coverage-floor-guard` (Stop hook, MINIMAL_ALLOWLIST) that blocks Stop if a session changed extraction-path code without re-running U7's coverage audit.

**Reuse:** `blueprint-accuracy-guard` (current hook — extend), `xproc_drift_observe`, `xproc_replay_add`, `xproc_outcome_record`, `xproc_predlog_pair`, `xproc_ewc_consolidate`, `xproc_mondrian_stats`.

**Wire to:** hooks layer — `.claude/hooks/blueprint-accuracy-guard.mjs` (extension) + `.claude/hooks/blueprint-coverage-floor-guard.mjs` (new Stop hook). MINIMAL_ALLOWLIST entry in `H:/.claude/settings.json` for the coverage-floor-guard. **NOTE: cross-worktree firewall applies** — this commit must come from main tree (`H:/prism`), not a forked worktree.

**Tests:** hook test fixtures simulating: low-confidence extraction → replay add; drift event → drift observe; operator correction → outcome record + EWC consolidate; session changed extraction code without audit → coverage-floor-guard blocks Stop; session with audit → Stop clears.

**Tier:** T0/T1 — hook layer + replay-buffer + outcome-recording (all prereqs wired). PASS.

---

### MS1-U6 — Build `BlueprintCorpusHarvestEngine` + cron + harvest scripts (Phase 4, T1 — net-new)

**What:** A new engine that orchestrates the harvest of MIT engineering courses + CAD/CAM vendor PDFs + curated online sources into `knowledge/wiki/training-corpus/{drafting,gdt,callout-conventions,industry-norms}/`. Methods:
- `harvestMIT({courseList[], outputDir})` — iterates the OCW list, downloads + extracts + tags
- `harvestVendorPDFs({path, vendorList})` — over `Resources/` + new vendor PDFs
- `harvestOnline({urlList})` — calls Playwright MCP (per `[[feedback_playwright_for_online_sources]]`) over a curated whitelist
- `enumerateCorpus({domain, tag})` — query the harvested corpus by frontmatter
- `verifyCorpusFresh({source})` — staleness check + re-harvest if needed
- `buildEmbeddingIndex({outputPath})` — runs nomic-embed-text over each corpus entry, writes the `_embeddings.jsonl` (extends the existing 14,343-vector pattern)

**Reuse:** `/pdf-learn`, `/video-learn` (existing skills — wrapped), `WebFetch` / Playwright MCP, `wiki-precheck-inject` infrastructure (the 768-d embedding pattern), `cad-embed-build-index` action.

**Wire to:** `prism_knowledge` + `prism_cad`: actions `corpus_harvest_mit`, `corpus_harvest_vendor`, `corpus_harvest_online`, `corpus_enumerate`, `corpus_verify_fresh`, `corpus_build_index`.

**Tests:** ≥10 cases. Reference: a small fixture MIT course → harvested + tagged correctly; a vendor PDF with known content → correctly tagged; an online URL that's NOT in the whitelist → refused; corpus enumeration by tag returns expected subset. Adversarial: a PDF that fails OCR → graceful failure with named source; a URL that returns 404 → retried 3x then logged.

**Cron:** weekly corpus freshness check (via `CronCreate` skill — recurring). The hook fires `corpus_verify_fresh({source: "MIT"})` + `..."vendor"` + `..."online"` — emits a freshness report to `state/shared/CORPUS_FRESHNESS.md`.

**Tier:** T1 (net-new, but on top of wired T0/T1 floor: pdf-learn + cad-embed). PASS — master roadmap YAGNI honored because Phase 2 wire-up units U1-U5 come first.

---

### MS1-U7 — Build `BlueprintExtractionRAGEngine` (Phase 4, T1 — net-new, the load-bearing centerpiece)

**What:** The composition layer. Wraps `BlueprintVisionOCREngine` (the base vision call) with RAG augmentation. For each extraction request:
1. **Pre-classify the print** — call `cad-blueprint-infer-class` + `MacroLibraryEngine.matchFamily()` + the customer prior (`getJMDieCustomerPath(customer)` for known customers; else generic)
2. **Retrieve corpus context** — top-k via `cad-rag-retrieve` + `cad-embed-search` over the harvested corpus, filtered by `(domain, industry, dim_type_hint)`
3. **Retrieve tribal context** — `searchTribalKnowledge(features)` for shop-floor priors
4. **Retrieve prior similar prints** — `cad-dimensional-signature` near-neighbour over `groundtruthregistryengine` ground-truth pairs
5. **Compose the extraction prompt** — base vision prompt + retrieved context (top-k corpus + top-k tribal + top-k similar prints + the family template's expected feature schema if matched)
6. **Run the vision call** — through `BlueprintVisionOCREngine` (current) + optionally `prism_ocr_classic` (U2) for ensemble corroboration
7. **Fuse + bound** — `xproc_vision_fuse` + `xproc_conformal_set` per dim-type (via `xproc_mondrian_*` for stratification)
8. **Emit candidate** — structured `BlueprintExtraction` with per-region confidence bounds, the retrieved sources cited inline (so operator can verify), and an attention-explain trace (`xproc_attention_explain`)
9. **Record** — `xproc_outcome_record` (the prediction, no actuals yet) + `xproc_predlog_log` for later operator confirmation pairing

Output: `BlueprintExtraction` object — NEVER auto-applied. Operator reviews + confirms or corrects.

**Reuse:** `BlueprintVisionOCREngine`, `imageocrpipelineengine`, `crossprocessvisiontabularfusionengine`, `cad-rag-retrieve`, `cad-rag-rank`, `cad-rag-augment`, `cad-embed-search`, `searchTribalKnowledge`, `cad-dimensional-signature`, `MacroLibraryEngine.matchFamily`, `cad-blueprint-infer-class`, `getJMDieCustomerPath`, `xproc_vision_fuse`, `xproc_conformal_set`, `xproc_mondrian_*`, `xproc_attention_explain`, `xproc_outcome_record`, `xproc_predlog_log`.

**Wire to:** `prism_cad` + `prism_quality`: actions `blueprint_rag_extract`, `blueprint_rag_explain`, `blueprint_rag_compare_to_baseline` (so the operator can see "RAG version says A, base version says B, here's why").

**Tests:** ≥10 cases. Reference customers: 3 minimum (JM-Die-internal + Alcoa + Continental). Reference dim types: 3 minimum (linear + GD&T positional + threaded callout). Reference adversarial: a print with a callout that doesn't appear in any corpus → engine returns extraction with a "no-prior" flag, NOT a hallucination; a print whose retrieved context is internally contradictory → engine surfaces the contradiction with both sources cited.

**HARD RULE in the test file:** `expect(extraction.sources).toBeDefined() && expect(extraction.sources.length).toBeGreaterThan(0)` — every extraction MUST cite at least one retrieved source (corpus / tribal / similar-print). No sourceless extractions; if no context retrievable, return an explicit "low-confidence — no priors" candidate with an empty sources array AND a confidence floor flag, which `blueprint-accuracy-guard` then surfaces as drift.

**Tier:** T1 — Phase 4 net-new, prereqs all in place. PASS.

---

### MS1-U8 — Build `BlueprintLoRABridgeEngine` + `BlueprintCoverageAuditEngine` + close-out (Phase 4, T1 — net-new + audit)

**What — `BlueprintLoRABridgeEngine`:** the LoRA export bundle producer. Methods:
- `prepareTrainingSet({confidenceTier, sizeCap, anonymize: true})` — selects training pairs from `groundtruthregistryengine` at given tier, anonymizes (scrubs customer names + part numbers + program content per `[[feedback_no_public_h_drive]]`), formats per the target fine-tune provider's spec
- `exportBundle({setId, provider: "gemini-finetune" | "openai-finetune" | "modal" | "local-lora", outputPath})` — emits the bundle
- `registerExternalEndpoint({bundleId, endpointURL, providerType})` — once external fine-tune completes + operator approves, registers as a new `AISystemRouterEngine` backend
- `getExportHistory()` + `getActiveBundles()`

**What — `BlueprintCoverageAuditEngine`:** the audit (modelled on `ElectrodeCoverageAuditEngine` from TRAINING-LEARNING-MS0/U3, but for extraction coverage). Methods:
- `auditCoverage({rootDir, indexPath})` — over the 24,545 Docustrata files: which got extracted correctly (per `groundtruthvalidationengine`), which widened conformal bounds, which the operator overrode, which the system has never seen
- `byCustomer({customer})` + `byConvention({convention})` + `byDimType({type})`
- `generateReport({format: "md" | "json", outDir})`
- `flagRetrain({coverageDeltaThreshold})` — if a customer/convention's coverage dropped by >threshold, flags as retrain candidate (feeds U6 corpus refresh + U7 RAG context refresh)

**Reuse:** `groundtruthregistryengine` + `groundtruthvalidationengine` (extended in U3+U4), `cam-feedback-lora-training-export` (the LoRA export pattern), `continual-lora-{create,state,train}` (the continual training pattern), `latheloracontinuallearningengine` (the reference impl), `xproc_calibration_score`, `xproc_calibration_recommend`.

**Wire to:** `prism_ai`: actions `blueprint_lora_export`, `blueprint_lora_register_endpoint`, `blueprint_lora_history`. `prism_cad` + `prism_quality`: actions `blueprint_coverage_audit`, `blueprint_coverage_by_customer`, `blueprint_coverage_flag_retrain`.

**Tests:** ≥10 cases per engine. Reference: a small in-test corpus → LoRA bundle produced + anonymization confirmed (no customer names leak); coverage audit over a fixture → expected gaps surface; retrain flag fires when coverage drops below threshold.

**HARD RULE in `BlueprintLoRABridgeEngine` test:** `expect(bundleContents).not.toMatch(/ALCOA|ITW|CONTINENTAL|OPTIMAS|SFS|HOLO-KROME/)` — assert specific customer names never appear in the export. Operator-confirmation marker file (`_LORA_EXPORT_OPERATOR_APPROVED`) must exist before `exportBundle` writes outside `mcp-server/data/training/lora/staging/`.

**Close-out checklist:**
- `/blueprint-rag-extract` skill (operator-facing front door for U7)
- `/blueprint-corpus-status` skill (operator-facing for U6 + U8 audit)
- `/blueprint-correction` skill (operator records a correction → flows to U5 outcome-record + U3 ground-truth-register)
- Update `state/shared/specs/DOMAIN-STUDIO-NODE-MAP.md` with the new training-OCR nodes
- Update wiki/index.md with 4 new engine entries + 3 new skills + 2 new hooks
- Regenerate `ENGINE_DIGEST.md` / `DISPATCHER_DIGEST.md`
- Update `MACRO-PROGRAM-PIPELINE-MS0.json` envelope to cross-reference (the extraction → fill chain)
- Update `TRAINING-LEARNING-MS0.json` envelope (when created) to cross-reference (templates ↔ retrieval context)
- Run the 3-way scrutiny gate (Codex + Claude-A + Claude-B)
- Regenerate `/system-viz` graph (per forge4 Phase 6K.viz)
- Commit the viz refresh as `[VIZ-REFRESH] post-BLUEPRINT-OCR-TRAINING-MS1: tier coverage [old]→[new]`
- `/handoff` with updated RESUME pointing at next milestone

**Tier:** T1 net-new + T1 audit. PASS.

---

## Phase 4 frontend (deferred to MS2 — explicit non-goal here)

`BlueprintQuotePage` already exists at Tier-4; it becomes a consumer of better-bounded extractions. A new Tier-4 page (e.g. `BlueprintTrainingDashboard` showing coverage audit + corpus freshness + LoRA export history) is **explicitly deferred** to a future MS2 — per master roadmap YAGNI ("don't add Tier-4 pages while Tier-1 engines are unwired"). The audit report at U8 is markdown for now; the dashboard is v2.

---

## Skills / scripts / hooks (the operator surface)

| Asset | Type | Status |
|---|---|---|
| `/blueprint-rag-extract` | skill (new in U8) | wire U7's action |
| `/blueprint-corpus-status` | skill (new in U8) | wire U6 + U8 actions |
| `/blueprint-correction` | skill (new in U8) | wire U5 outcome path |
| `phase20-corpus-harvest.py` | script (new in U6) | bulk MIT + vendor + online harvest |
| `phase20-blueprint-coverage-audit.py` | script (new in U8) | bulk Docustrata audit |
| `blueprint-accuracy-guard` | hook (extended in U5) | existing, extension |
| `blueprint-coverage-floor-guard` | hook (new in U5, Stop, MINIMAL_ALLOWLIST) | new Stop guard |
| `training-convergence-guard` | hook (reuse) | already gates LoRA convergence |

---

## Exit gate (forge4 Phase 5 + 6K compliance)

- All 8 units shipped; every `blueprint_*` + `gt_blueprint_*` + `corpus_*` action wired to `prism_cad` / `prism_quality` / `prism_ai` / `prism_knowledge` and round-tripped in tests.
- 36+ existing blueprint-related test files still pass + new ones added; 0 stub assertions (`toBeDefined()`) accepted.
- 2 monolith forks (`prism-enhanced-gdt-engine` + `prism-gdt-fcf-parser`) rescued + wired (U1) — graph delta: 2 unwired → 2 wired, leverage realized in coverage-by-domain delta.
- 1 monolith fork (`prism-ocr-engine`) rescued + wired (U2) — same.
- `groundtruthregistryengine` + `groundtruthvalidationengine` extended (not duplicated — Rule 9 honored).
- `BlueprintCorpusHarvestEngine` + `BlueprintExtractionRAGEngine` + `BlueprintLoRABridgeEngine` + `BlueprintCoverageAuditEngine` built and wired.
- 2 hooks shipped: `blueprint-accuracy-guard` extension + `blueprint-coverage-floor-guard` Stop hook in MINIMAL_ALLOWLIST.
- 3 skills shipped + 2 phase20 scripts.
- LoRA export anonymization HARD RULE asserted in tests (no customer name in any export).
- Coverage audit report generated against the 24,545 Docustrata files; >70% confidence-tier coverage at MS1 close (raises over time via continual learning).
- ENGINE_DIGEST / DISPATCHER_DIGEST regenerated; DOMAIN-STUDIO-NODE-MAP.md updated; wiki/index.md updated.
- `/system-viz` regenerated (Phase 6K.viz) + committed.
- Cross-envelope links: this envelope references MACRO-PROGRAM-PIPELINE-MS0 (upstream consumer) and TRAINING-LEARNING-MS0 (peer); both their envelopes updated to back-reference this one.
- 3-way scrutiny PASS (Codex + Claude-A + Claude-B).
- Agent 11 (Atomic-First Compliance from forge4 Phase 5) score ≥80.
- `omega_floor: 1.0` met.

---

## Milestone-envelope JSON (to register at `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS1.json`)

```json
{
  "schemaVersion": 4,
  "id": "BLUEPRINT-OCR-TRAINING-MS1",
  "title": "RAG-augmented blueprint OCR + LoRA training + closed-loop continual learning + monolith-fork rescue",
  "track": "TRAINING-LEARNING",
  "priority": "P0",
  "owner": "claude-a7ea87ab (slot BRAVO)",
  "created_at": "2026-05-12T19:30:00.000Z",
  "updated_at": "2026-05-12T19:30:00.000Z",
  "status": "scoped",
  "total_units": 8,
  "completed_units": 0,
  "dependencies": ["TRAINING-LEARNING-MS0", "MACRO-PROGRAM-PIPELINE-MS0"],
  "cross_links": {
    "consumes": ["TRAINING-LEARNING-MS0 (template families inform retrieval context)"],
    "feeds": ["MACRO-PROGRAM-PIPELINE-MS0 (better extraction → better print-to-program candidates)"]
  },
  "atomic_first": {
    "atomic_phase": "2-then-4",
    "tier": 1,
    "prereq_tier": "0+1",
    "tier_floor_passed": true,
    "phase_sequencing": "Phase 2 wire-up units (U1-U5) ship before Phase 4 net-new units (U6-U8)",
    "leverage_score": 125,
    "suggested_dispatchers": ["prism_cad", "prism_quality", "prism_knowledge", "prism_ai"],
    "consumes_node_ids": [
      "vault.wiki.architecture.engines.cad.pdfblueprintdimensionextractorengine",
      "vault.wiki.architecture.engines.cam.blueprintprogramjoinengine",
      "vault.wiki.architecture.engines.cad.groundtruthregistryengine",
      "vault.wiki.architecture.engines.cad.groundtruthvalidationengine",
      "vault.wiki.architecture.engines.fusion.crossprocessvisiontabularfusionengine",
      "vault.wiki.architecture.engines.adaptive.crossprocessconformalpredictionengine",
      "vault.wiki.architecture.engines.adaptive.crossprocessconformalclassificationengine",
      "vault.wiki.architecture.engines.lathe.latheloracontinuallearningengine",
      "vault.wiki.architecture.engines.other.trainingcontentindexengine",
      "vault.wiki.architecture.engines.other.trainingledgerengine",
      "vault.wiki.architecture.engines.cad.gdtcalloutparserengine",
      "vault.wiki.architecture.engines.cad.gdtstackupengine",
      "vault.wiki.architecture.engines.pdf.imageocrpipelineengine"
    ],
    "produces_node_ids": [
      "vault.wiki.architecture.engines.cad.blueprintextractionragengine",
      "vault.wiki.architecture.engines.cad.blueprintcorpusharvestengine",
      "vault.wiki.architecture.engines.ai.blueprintlorabridgeengine",
      "vault.wiki.architecture.engines.cad.blueprintcoverageauditengine"
    ],
    "rescues_node_ids": [
      "vault.wiki.architecture.monolith-modules.complete-extraction.prism-enhanced-gdt-engine",
      "vault.wiki.architecture.monolith-modules.complete-extraction.prism-gdt-fcf-parser",
      "vault.wiki.architecture.monolith-modules.complete-extraction.prism-ocr-engine",
      "vault.wiki.architecture.monolith-modules.engines-ai-ml.prism-ocr-engine"
    ]
  },
  "rationale": "User 2026-05-12: 'use obsidian + tribal knowledge + prism awareness + neural network + /system-viz + skill, scripts and hooks + memories + any other development or backend tool we've built to train our ocr/blueprint reading capabilities' (with MIT engineering courses + CAD/CAM PDFs + online sources). Forge4 dep-oracle pass against system-viz @ 2026-05-12T17:53:57.314Z revealed ~80 already-wired blueprint/OCR/RAG/training engines and actions. Net new work: 3 engines + 2 extensions + 2 hooks + 3 skills + 2 phase20 scripts. Master roadmap YAGNI honored via Phase 2 wire-up (U1-U5) before Phase 4 net-new (U6-U8). 3 monolith forks rescued (higher leverage than rebuild). Operator-in-the-loop unconditional. No on-device vision-weight updates (LoRA export only; external fine-tune; resulting endpoint plugs into AISystemRouterEngine as a new backend). H:-drive content NEVER published per [[feedback_no_public_h_drive]].",
  "knowledge_sources": {
    "engines": [
      "BlueprintVisionOCREngine + imageocrpipelineengine + pdfblueprintdimensionextractorengine (base OCR layer)",
      "blueprintprogramjoinengine (print ↔ program joiner)",
      "groundtruthregistryengine + groundtruthvalidationengine (EXTEND, not duplicate)",
      "crossprocessvisiontabularfusionengine (vision + tabular fusion)",
      "crossprocessconformalpredictionengine + crossprocessconformalclassificationengine (confidence bounds)",
      "latheloracontinuallearningengine (reference continual-LoRA impl)",
      "latheloratrainingmonitorengine + latheloratrainingscriptengine (reference monitor + script patterns)",
      "camtrainingextractionaggregatorengine (reference aggregator)",
      "trainingcontentindexengine + trainingledgerengine (training infrastructure)",
      "gdtcalloutparserengine + gdtstackupengine (GD&T base — extended by U1 rescue)",
      "cadembedindex (existing embedding index)",
      "MacroLibraryEngine + LathePartClassifierEngine (family classification reuse)",
      "PartFolderOrganizerEngine + PRISMSelfAwarenessEngine (corpus I/O + capability lookup)"
    ],
    "monolith_forks_to_rescue": [
      "prism-enhanced-gdt-engine (extracted/extraction/)",
      "prism-gdt-fcf-parser (extracted/extraction/)",
      "prism-ocr-engine (extracted/extraction/ + extracted/engines-ai-ml/)"
    ],
    "tribal_knowledge": "4,245 tribal tips + 3,700 shop tips (RAG retrieval context) + the academy-course-0c-blueprint-reading-blueprint-reading-gd-t course",
    "formulas": [
      "Conformal prediction set construction (xproc_aps / xproc_raps / xproc_mondrian)",
      "Embedding cosine similarity (nomic-embed-text 768-d)",
      "EWC++ regularization loss (xproc_ewc_reg_loss)",
      "MAML inner-loop adaptation (xproc_maml_inner_loop)"
    ],
    "reference": [
      "state/shared/specs/TRAINING-LEARNING-MS0-2026-05-12.md (sibling — this is the v2 RAG layer deferred there)",
      "state/shared/specs/MACRO-PROGRAM-PIPELINE-MS0-2026-05-12.md (upstream consumer)",
      "[[reference_docustrata_multi_print_pdfs]] (96% multi-page; tiered classifier is the right tool)",
      "[[reference_monolith_extraction]] (the 1,469 modules + ~1,350 orphaned .js dumps to mine)",
      "[[feedback_box_programs_amateur]] (historical S/F + dims = DATA, not ground truth)",
      "[[feedback_no_public_h_drive]] (H: data NEVER published; corpus export anonymized + operator-confirmed)",
      "[[feedback_playwright_for_online_sources]] (online harvest uses Playwright MCP)",
      "[[feedback_parallel_scrutiny_per_file]] (per-file scrutiny gate during builds)",
      "[[reference_system_viz]] (the dep oracle this milestone was generated from)"
    ]
  },
  "units": [
    {"id": "MS1-U1", "title": "Rescue + wire prism-enhanced-gdt-engine + prism-gdt-fcf-parser (Phase 2, T1)", "status": "not_started", "atomic_phase": 2, "tier": 1},
    {"id": "MS1-U2", "title": "Rescue + wire prism-ocr-engine monolith fork (Phase 2, T1)", "status": "not_started", "atomic_phase": 2, "tier": 1},
    {"id": "MS1-U3", "title": "Extend groundtruthregistryengine with blueprint-extraction join (Phase 2, T1)", "status": "not_started", "atomic_phase": 2, "tier": 1},
    {"id": "MS1-U4", "title": "Extend groundtruthvalidationengine with extraction-confidence cross-validation (Phase 2, T1)", "status": "not_started", "atomic_phase": 2, "tier": 1},
    {"id": "MS1-U5", "title": "Extend blueprint-accuracy-guard + new blueprint-coverage-floor-guard Stop hook (Phase 2, T0/T1)", "status": "not_started", "atomic_phase": 2, "tier": 1},
    {"id": "MS1-U6", "title": "Build BlueprintCorpusHarvestEngine + harvest scripts + freshness cron (Phase 4, T1)", "status": "not_started", "atomic_phase": 4, "tier": 1},
    {"id": "MS1-U7", "title": "Build BlueprintExtractionRAGEngine — the centerpiece (Phase 4, T1)", "status": "not_started", "atomic_phase": 4, "tier": 1},
    {"id": "MS1-U8", "title": "Build BlueprintLoRABridgeEngine + BlueprintCoverageAuditEngine + close-out (Phase 4, T1)", "status": "not_started", "atomic_phase": 4, "tier": 1}
  ],
  "exit_gate": "All 8 units shipped; 3 monolith forks rescued + wired; 2 engines extended (not duplicated); 4 net-new engines built + wired; 2 hooks shipped (blueprint-coverage-floor-guard in MINIMAL_ALLOWLIST); 3 skills + 2 phase20 scripts; LoRA export anonymization HARD RULE asserted in tests; coverage audit shows >70% confidence-tier coverage at close; envelope cross-links to MACRO-PROGRAM-PIPELINE-MS0 + TRAINING-LEARNING-MS0; ENGINE_DIGEST/DISPATCHER_DIGEST regenerated; /system-viz regenerated + committed (Phase 6K.viz); 3-way scrutiny PASS; Agent 11 atomic-first compliance score >=80; omega_floor 1.0 met.",
  "omega_floor": 1.0,
  "non_goals": [
    "On-device vision-model weight updates (no GPU surface; LoRA export only; fine-tune is external)",
    "Replacing BlueprintVisionOCREngine / imageocrpipelineengine / pdfblueprintdimensionextractorengine (they are the BASE LAYER the RAG engine wraps)",
    "Auto-correcting extractions without operator review",
    "Writing to Automated Program_Corrected 5-25.xlsm (read-only)",
    "Public distribution of any export (H: drive content NEVER published)",
    "Tier-4 BlueprintTrainingDashboard frontend (deferred to MS2 per master roadmap YAGNI)"
  ],
  "resources_utilized": [
    "BlueprintVisionOCREngine",
    "imageocrpipelineengine",
    "pdfblueprintdimensionextractorengine",
    "blueprintprogramjoinengine",
    "groundtruthregistryengine",
    "groundtruthvalidationengine",
    "crossprocessvisiontabularfusionengine",
    "crossprocessconformalpredictionengine",
    "crossprocessconformalclassificationengine",
    "latheloracontinuallearningengine",
    "latheloratrainingmonitorengine",
    "latheloratrainingscriptengine",
    "camtrainingextractionaggregatorengine",
    "trainingcontentindexengine",
    "trainingledgerengine",
    "gdtcalloutparserengine",
    "gdtstackupengine",
    "cadembedindex",
    "MacroLibraryEngine",
    "LathePartClassifierEngine",
    "PartFolderOrganizerEngine",
    "PRISMSelfAwarenessEngine",
    "xproc_conformal_calibrate + xproc_conformal_set + xproc_conformal_stats + xproc_conformal_constants",
    "xproc_conformal_classify_* (5 actions)",
    "xproc_mondrian_* (5 actions, stratified conformal)",
    "xproc_aps_* + xproc_raps_* (adaptive prediction sets)",
    "xproc_ewc_* (7 actions, EWC++ regularization)",
    "xproc_replay_* (30 actions, prioritized + balanced + stratified)",
    "xproc_outcome_* (6 actions, outcome recording)",
    "xproc_predlog_* (10 actions, prediction-pairing log)",
    "xproc_drift_observe / _history / _reset / _constants",
    "xproc_vision_fuse / _explain_attention / _constants",
    "xproc_attention_explain / _ece / _anomaly / _baseline",
    "xproc_ensemble_predict + xproc_ensemble_disagreement",
    "xproc_calibration_score + xproc_calibration_recommend + xproc_calibration_monitor_*",
    "xproc_maml_inner_loop + xproc_maml_meta_train",
    "xproc_proto_compute + xproc_proto_classify + xproc_proto_regress",
    "cam-feedback-lora-training-export + cam-lora-* (8 actions)",
    "continual-lora-create + continual-lora-train + continual-lora-state + continual-lora-list",
    "cad-rag-retrieve + cad-rag-augment + cad-rag-filter + cad-rag-format + cad-rag-rank + cad-rag-stats",
    "cad-embed + cad-embed-build-index + cad-embed-search + cad-embed-batch + cad-embed-cache-clear",
    "cam-rag-build-index + cam-rag-retrieve + cam-rag-retrieve-for-parameter",
    "cad-training-start + cad-training-status + cad-training-corpus-stats",
    "cad-trial-ingest + cad-trial-patterns + cad-trial-recommend + cad-trial-stats",
    "training-snapshot-create + training-snapshot-list + training-snapshot-load + training-snapshot-stats",
    "training-assemble + training-export",
    "cad-dimensional-signature + dim-signature-extract + dim-signature-extract-text",
    "dimension-impute-build + dimension-impute-apply + dimension-impute-outliers + dimension-impute-stats",
    "cad-gdt-callout-parse + cad-gdt-stackup + gdt-stackup + probe-gdt-interpret + gdt-propagate + gdt-validate",
    "cad-blueprint-extract-features + cad-blueprint-flag-features + cad-blueprint-generate + cad-blueprint-infer-class + cad-pdf-blueprint-extract + cad-translate-blueprint-to-ops",
    "blueprint-to-3d-model + blueprint-to-cadquery-script + blueprint-to-all-cads + blueprint-to-quote + blueprint-resolve-material + turning-blueprint-intake + blueprint-ingest-phase8",
    "blueprint-extract + blueprint-compare-revisions + blueprint-dxf-dimensions + blueprint-inspection-plan + blueprint-setup-sheet",
    "ocr + ocr-process + ocr-stats (resourceExtraction dispatcher)",
    "AISystemRouterEngine (registration target for the externally-fine-tuned endpoint)",
    "blueprint-accuracy-guard hook + training-convergence-guard hook",
    "/pdf-learn + /video-learn + /shop-knowledge + /blueprint-read + /cad-extract + /cad-feature-recognize + /cad-from-blueprint",
    "Playwright MCP (online corpus harvest)",
    "phase8-tiered-blueprint-classifier.py (already shipped — multi-page extraction)",
    "Docustrata jm-die-index-v2.json (10.3 MB, the join source)",
    "academy-course-0c-blueprint-reading-blueprint-reading-gd-t (training material reuse)"
  ]
}
```

---

## Bottom line

The user gave a sweeping directive — "use everything we've built to train our OCR/blueprint reading." The forge4 dep-oracle pass revealed that PRISM has **vastly more** of the required infrastructure than the user (or I) initially assumed: a full CAD-RAG surface, full vision-fusion, full conformal/EWC/replay/MAML/prototypical adaptive layer, an active LoRA training pipeline with continual + ensemble + voter + combiner + monitor + script engines (lathe + CAM), 4 OCR engines including one monolith-fork rescue candidate, 30 blueprint actions across 5 dispatchers, the ground-truth registry and validation engines already extant, a blueprint-accuracy hook live, an academy GD&T course published, and a Tier-4 blueprint frontend page already shipped.

What's **net new** is: 4 engines (RAG composer, corpus harvester, LoRA bridge, coverage audit), 2 engine extensions (groundtruth registry + validation), 2 hooks (extend accuracy-guard + new coverage-floor-guard Stop), 3 skills, 2 phase20 scripts. Plus rescuing 3 monolith forks (higher leverage than rebuilding).

The pipeline:
- **Harvest** MIT engineering + CAD/CAM vendor PDFs + curated online (U6) into a structured corpus with 768-d embeddings
- **Ground-truth** the 24,545 Docustrata files by joining to part.json + macro VC vars + ERP actuals (U3+U4) with confidence stratification
- **RAG-extract** every new blueprint with retrieved corpus + tribal + similar-print context, fused + conformally bounded (U7) — operator reviews + confirms
- **LoRA-export** anonymized corpus bundles for managed external fine-tune (U8); the resulting endpoint plugs back as a new `AISystemRouterEngine` backend
- **Continual-learn** via the existing xproc replay + EWC + outcome surface (U5 hook extension)
- **Audit** coverage weekly, flag retrain candidates, refresh corpus (U6 cron + U8 audit)
- **Operator** never bypassed — the loop is closed by them, not by silent overrides

This is the v2 RAG/embedding layer that `TRAINING-LEARNING-MS0` explicitly deferred — now it's spec'd as a peer milestone in the same track, sequenced atomic-first (rescue + wire-up before net-new), forge4 tier-floor-passed, and respecting the master roadmap's YAGNI warning by front-loading Phase 2 work.

**Operator-in-the-loop is unconditional. H:-drive content is NEVER published. No bulk auto-emit.** Same non-negotiables as MACRO-PROGRAM-PIPELINE-MS0 and TRAINING-LEARNING-MS0.

---

## Build order recommendation (per forge4 atomic-first + leverage ranking)

1. **U1** (rescue 2 GD&T forks — highest leverage: unlocks better callout parsing for U7's prompt context)
2. **U2** (rescue OCR fork — ensemble corroboration for U7)
3. **U3** (ground-truth registry extension — the labelled-pair backbone)
4. **U4** (validation extension — the evaluation harness for everything downstream)
5. **U5** (hook extensions — the runtime safety net + drift detection)
6. **U6** (corpus harvest — the retrieval corpus)
7. **U7** (the RAG centerpiece — composes everything)
8. **U8** (LoRA bridge + coverage audit + close-out)

Each unit ships independently with full tests + per-file scrutiny (2 parallel reviewers per file, per `[[feedback_parallel_scrutiny_per_file]]`) + dispatcher round-trip + the leverage-realized graph delta recorded. The end-of-task 3-of-3 gate (Codex + Claude-A + Claude-B) runs at MS1 close.

Each unit may take 1-3 sessions. Total MS1 estimate: 6-12 sessions. Owner: any chat that claims `BLUEPRINT-OCR-TRAINING-MS1` via the file-claim layer; recommend forking to `H:/prism-blueprint-ocr-training` worktree (per `[[feedback_conflict_fork_rule]]`) to avoid contention on the shared main tree.

---

**Method note:** this spec was generated via `/forge4 scope` with `/system-viz` bound as the dependency oracle (Phase 0.6 hard gate). Every existing engine cited was discovered via the graph; every proposed new engine survived the dedup intercept (Rule 9); every wiring target was selected from `node.suggestedDispatchers` (Rule 4); the milestone honors the master roadmap's Phase 4 YAGNI by sequencing Phase 2 wire-up before Phase 4 new-build (forge4 Phase 0.6 tier-floor gate PASS). Agent 11 (Atomic-First Compliance) review applies at MS1 close.
