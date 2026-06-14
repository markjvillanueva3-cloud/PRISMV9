# Blueprint-Vision Galaxy MEMORY.md — per-domain working brain (XRAY slot)

> Append-only. Pointer-style. ≤200 lines · ≤140 chars/entry. Older entries archive to MEMORY-ARCHIVE.md.

## Master-brain link
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
  — recall: `prism_memory:semantic_search query="blueprint ocr pdf cad-extract gdt tolerance" topK=20`
- **DOWN (push to master):** write `<type>_xray_<topic>.md` →
  `C:/Users/wompu/.claude/projects/H--prism/memory/` → fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs` at Stop
- **MASTER-INDEX edge:** master `MEMORY.md` carries `[galaxy:blueprint-vision]` back-pointer (verify it exists — added 2026-05-29)
- **Last master-sync:** 2026-06-10   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/blueprint-vision_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Primary Dispatcher Surface**: `cadDispatcher` serves as the primary action surface for blueprint-vision with approximately 40 actions [reference_xray_cad_dispatcher_primary_surface].
- **CAD/CAM File Search Directive**: For any CAD/CAM file search, prioritize searching in `H:\PRISM\JM DIE` first, as it is the canonical shop archive and CAM's primary directive is CAD [feedback/feedback_jm_folder_top_of_cad_cam_search].
- **Concurrent OCR Execution**: Blueprint-vision OCR now runs concurrently with the chat fleet using a smaller model (qwen3-vl:8b-instruct) rather than requiring an idle host [reference_xray_ocr_gpu_concurrency_2026_05_31].
- **Blueprint-vision OCR Pipeline**: The OCR pipeline has been iteratively developed and tested, with key milestones including resolving pre-test blockers and achieving readiness for unattended overnight runs [reference_xray_ocr_pipeline_overnight_ready_2026_05_30].
- **CAD File Format Handling**: Blueprint-vision supports multiple CAD file formats natively (DXF, SVG, STEP, STL, F3D/F3Z, FCStd) but lacks native readers for SAT, OBJ, FBX, X_T (Parasolid) [reference_xray_no_native_reader_gaps].
- **GPU-OCR Dependency**: The training corpus is blocked on GPU-OCR, requiring OCR processing of 12,321 prints to become text-ready [reference_xray_training_corpus_state_2026_05_29].

## Indexed memories
- **Domain corpus (live counts):** 29 curated memory file(s) · 202 wiki entr(y/ies) · 54 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 80 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="blueprint-vision" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/reference_blueprint_ocr_training_ms1_collision.md` · `knowledge/memories/_legacy-root/reference_u_ms1_u2_pdf_blueprint_pattern_rescue.md` · `knowledge/memories/_legacy-root/reference_u_ms1_u5_blueprint_coverage_floor_guard.md` · `knowledge/memories/reference/reference_blueprint_100pct_bypass_2026_05_24.md` · `knowledge/memories/reference/reference_blueprint_ocr_cad_reading_atlas_2026_05_27.md`
- **Sample wiki:** `knowledge/wiki/training/extracted/solidworks-eng-graphics-drawing.md` · `knowledge/wiki/os/commands/cad-from-blueprint.md` · `knowledge/wiki/lessons/cad-blueprint-revolve-2475-037.md` · `knowledge/wiki/lessons/ocr-closed-loop-training-ensemble-distillation.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/blueprint-dim-diameter.md` · `knowledge/wiki/code-tribal/blueprint-dim-gdt-positional.md` · `knowledge/wiki/code-tribal/blueprint-dim-gdt-profile.md`

## Cross-galaxy bridges
- [[../cad/MEMORY.md]] — delta CONSUMES xray features; delta's per-CAD-system quirks inform xray format-handling.
- [[../cam/MEMORY.md]] — kilo CONSUMES via print_to_program_*; tells xray what downstream needs.
- [[../quoting/MEMORY.md]] — charlie CONSUMES via blueprint_to_quote; quote outcomes inform confidence thresholds.
- [[../ai-training/MEMORY.md]] — india CONSUMES extraction outcomes for GNN/LoRA learning loop.
- [[../dormant-data/MEMORY.md]] — victor's `extracted/` findings overlap xray's domain.

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Native Reader for Specific Formats**: Blueprint-vision lacks native readers for SAT, OBJ, FBX, X_T (Parasolid). This is a standing gap that needs to be addressed [reference_xray_no_native_reader_gaps].
- **Training Corpus Completion**: The blueprint/OCR/CAD-extraction corpus requires OCR processing of 12,321 prints to become text-ready. This remains a blocking issue for training readiness [reference_xray_training_corpus_state_2026_05_29].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Available algorithm primitives (papa 2026-06-09, per [[feedback_wire_algos_into_galaxies]])

Invokable via `prism_algorithm` for blueprint/OCR vision-extraction work (PSN leg #8 → this brain). Vision is the classic home of robust-fit + nearest-neighbour primitives. Mapped from the ALGO-SYNERGY batch ([[reference_tango_algo_synergy_batch_2026_05_29]] · wiki [[architecture/algo-synergy-ml-batch]]):
- `spatial_ransac_fit` (RANSACHyperplane) — robust line / circle / planar-edge fit from OCR-detected feature points that REJECTS speckle / annotation-text outliers; the canonical CV primitive for recovering a dimension line or hole-circle from a noisy raster (pairs with the per-field confidence gate — a low-inlier-ratio fit IS a low-confidence dimension).
- `ml_knn` / `ml_gmm` — cluster / retrieve dimension-callout regimes (linear vs diameter vs GD&T-FCF) for nearest-neighbour callout classification; complements the `blueprint-dim-*` tribal callout tips.
- Note: the ensemble/consensus path is xray's domain octopus (see `## Synergy — VLM-ensemble IS xray's octopus` in CLAUDE.md) — route low-confidence/safety-relevant extractions through ≥2 VLM families, NOT a single signal filter.

## High-ROI memories (PULL target — top master hits for this domain)
- [[reference_blueprint_ocr_cad_reading_atlas_2026_05_27]] — **anchor asset** (21KB): 14 blueprint+OCR engines, 15 CAD readers, 12 bridges, format→engine map, gaps.
- [[feedback_use_lima_pypdf_page_extractor]] — canonical: all chats use the lima pypdf page-by-page extractor (76× deeper than pdf-parse).
- [[reference_lima_pypdf_extraction_canonical_2026_05_26]] — the pypdf extractor is domain-tagged + notability-scored; canonical for corpus extraction.
- [[reference_docustrata_pipeline_2026_05_16]] — 7-stage cost-cascade PDF pipeline; phase21 split 8,154 containers → 36,638 prints (0 errors).
- [[reference_psn_docu_ocr_wiring_2026_05_23]] — DocuStrata + OCR wired into the PSN synergy network.
- [[reference_u_ms1_u2_pdf_blueprint_pattern_rescue]] — PDF/blueprint pattern-recognition rescue when OCR confidence drops.
- [[reference_u_ms1_u5_blueprint_coverage_floor_guard]] — coverage-floor guard (anti-regression on extraction %).
- [[reference_blueprint_ocr_training_ms1_collision]] — blueprint-OCR training MS1 collision/dedup fix.
- [[reference_pdf_extract_solidworks_tolerance_2026_05_25]] — SolidWorks tolerance PDF extraction (GD&T/tolerance corpus).
- [[project_jm_die_shop_floor_languages]] — JM Die operators are Polish/Spanish-primary; print annotations may carry foreign-language text.

## Standing patterns (load-bearing across all extraction sessions)
- **Multi-print containers are common, split first** — phase21 split 8,154 container PDFs → 36,638 single prints. One OCR result per print, never one object spanning N prints. (Nuance: the "96%" figure is real but means **multi-PAGE** prevalence per BLUEPRINT-OCR-TRAINING-MS1 — distinct from the container-split counts; the seed conflated the two. See Known failure modes.)
- **Lima's pypdf page-by-page extractor is canonical** — `scripts/extract-jm-die-corpus-page-by-page.py` (NOT a phantom `lima-pypdf-page-extract.mjs`). Per [[feedback_use_lima_pypdf_page_extractor]].
- **Per-field confidence is mandatory** — every OCR field emits `confidence: 0..1`. Verified shipped floor: OCR per-field **0.70** → operator-confirm; CAD-fidelity flag <0.85; safety S(x)≥0.98; drift guard blocks >20% conformal-bound widening. Seed's 0.85/0.95/0.99 per-field tiers are uncorroborated defaults — [[reference_xray_confidence_thresholds_reconciled]] + `GSD_BLUEPRINT_VISION.md`.
- **mm is the internal unit** — imperial input allowed; imperial in the PRISM graph forbidden. Normalize at the extraction boundary.
- **Source-SHA dedup** — register SHA + result in `state/shared/blueprint-extraction-*-<date>.jsonl` / `blueprint-accuracy-events.jsonl` before re-running.
- **GD&T callouts tie to datum schema** — an FCF without a datum-3-2-1 reference is meaningless; validate the tie at parse time.
- **CAD-format parsers are per-format, no conflation** — STEP ≠ IGES unit defaults; SolidWorks ≠ Inventor feature tree. Per-format test required.
- **Verify engine names on disk before referencing** — the alpha seed named 21 non-existent engines (corrected 2026-05-29). `Glob`/`Grep` first.

## Initial state (2026-05-29 baseline — asset-verified by 3 parallel agents)

**Real engine inventory** (verified `[ -f ]` under `mcp-server/src/engines/`):
- OCR: `BlueprintVisionOCREngine` (primary, 37.9K), `BlueprintOCREngine` (35.7K), `BlueprintOCRAdapter`, `CADLiveBlueprintOcrAdapter`, `ImageOCRPipelineEngine`, `OCRResultEngine`, `TesseractOCRBridgeEngine`, `MachineServiceTagOCREngine`.
- PDF-blueprint: `PDFBlueprintDimensionExtractorEngine`, `PDFBlueprintPatternRescueEngine`, `BlueprintExtractionRAGEngine`.
- GD&T/tol: `GDTCalloutParserEngine`, `PrismEnhancedGDTEngine`, `FCFSyntaxValidatorEngine`, `ToleranceEngine`, `ToleranceAwareGenerationEngine`.
- Orchestration/corpus: `BlueprintToCADGenerationEngine`, `BlueprintToAllCADsOrchestratorEngine`, `BlueprintProgramJoinEngine` (45.4K), `BlueprintCorpusHarvestEngine`, `BlueprintCoverageAuditEngine`, `BlueprintLoRABridgeEngine`, `BlueprintToQuoteBridgeEngine`.
- Feature-recog: `CADFeatureRecognitionEngine`, `CADFeatureClassifierEngine`, `FeatureRecognitionEngine`, `LatheTurningFeatureRecognizerEngine`.

**Real format → backing-engine map** (corrected — the seed's `CAD*ParseEngine` names were phantom):
| Format | Real backing engine | Action |
|--------|--------------------|--------|
| DXF | `DXFGeometryParserEngine` / `DXFParserEngine` | `cad_dxf_geom_parse`, `cad_dxf_parse_polygons`, `cad_dxf_geom_validate_wedm` |
| SVG | `DXFParserEngine` | `cad_svg_parse_polygons` |
| STEP/IGES | (action-only — engine name unconfirmed) | `cad_step_parse_file`/`string`, `cad_step_evidence_for_kinds` |
| STL | `STLToVoxelGridEngine` | `cad_stl_analyze` |
| F3D/F3Z | `F3DSQLiteParserEngine` | `cad_f3d_parse`, `cad_f3d_parse_f3z`, `cad_f3d_timeline` |
| FCStd | `FCStdNativeParserEngine` | `cad_fcstd_parse`, `cad_fcstd_parse_buffer` |
| SLDPRT/IPT/3DM/HMC | live `cad/` bridges (verify before use) | — |

**Standing gaps** (xray TODO): no native reader for SAT, OBJ, FBX, X_T (Parasolid) — forge or vendor SDK required. Mixed-unit handling in some legacy parsers.

## Indexed memories — domain pointers (xray's own per-file memories, 2026-05-29)
- [[reference_xray_engine_inventory_verified_2026_05_29]] — verified real engine + dispatcher names (the seed-hallucination correction).
- [[reference_xray_docustrata_96pct_unverified]] — the "96% containers" figure is unsupported; use 8,154→36,638 counts.
- [[reference_xray_jm_die_print_corpus_paths]] — real JM Die print/CAD corpus locations (no PRINTS/ dir).
- [[reference_xray_blueprint_extraction_ledgers]] — date-suffixed ledgers, not a single extraction-log.jsonl.
- [[reference_xray_cad_dispatcher_primary_surface]] — cadDispatcher is the ~40-action primary surface.
- [[feedback_xray_verify_engine_name_before_reference]] — standing rule: Glob/Grep an engine name before enshrining it.
- [[feedback_xray_multi_print_split_before_ocr]] — split containers before OCR; one result per print.
- [[feedback_xray_per_field_confidence_mandatory]] — emit confidence 0..1 per field; downstream gates.
- [[reference_xray_pypdf_canonical_extractor_path]] — `scripts/extract-jm-die-corpus-page-by-page.py` is the real extractor.
- [[reference_xray_no_native_reader_gaps]] — SAT/OBJ/FBX/X_T unreadable natively (standing gap).

## Cross-galaxy bridges (PSN edges OUT)
- [[../cad/MEMORY.md]] — delta CONSUMES xray features; delta's per-CAD-system quirks inform xray format-handling.
- [[../cam/MEMORY.md]] — kilo CONSUMES via print_to_program_*; tells xray what downstream needs.
- [[../quoting/MEMORY.md]] — charlie CONSUMES via blueprint_to_quote; quote outcomes inform confidence thresholds.
- [[../ai-training/MEMORY.md]] — india CONSUMES extraction outcomes for GNN/LoRA learning loop.
- [[../dormant-data/MEMORY.md]] — victor's `extracted/` findings overlap xray's domain.

## Known failure modes (regression watchlist)
- **Alpha-seed asset hallucination** — 21 engine names in the seed CLAUDE.md did not exist (fixed 2026-05-29). Class: enshrining unverified names. Mitigation: Glob/Grep first.
- **The "96% are multi-print containers" framing** — the seed conflated two real-but-distinct figures: "96%" = multi-**PAGE** prevalence (BLUEPRINT-OCR-TRAINING-MS1; single PDFs hold 5–10 prints on pages 2+), while the container split is 8,154 containers → 36,638 prints (docustrata pipeline). Cite the specific figure for the specific claim; don't conflate multi-page with multi-print-container.
- **Phantom paths in seed** — no `JM DIE/PRINTS/`, no `lima-pypdf-page-extract.mjs`, no `blueprint-extraction-log.jsonl`. See PATHS.md for the real atlas.
- (Seed scans for first real session): PDFs historically "extracted as one print" (corruption class); OCR runs with no confidence scores (re-extract); FCF parsed without datum-schema tie.

## JM Die customer print quirks (operator-domain wisdom)
- Polish + Spanish are the shop floor's first languages (per [[project_jm_die_shop_floor_languages]]) — print annotations may include foreign-language text the OCR encounters; do not assume English.
- (Empty until xray sessions document per-customer patterns — 406 customer dirs under `H:/PRISM/JM DIE/Prism JM Die/`.)

## Extraction sessions
> Append: `## YYYY-MM-DD — claude-<id> — <N> prints extracted from <source>`
- 2026-05-29 — claude-e9b75754 — galaxy fully built + asset-verified (no prints extracted; inventory + correction pass).
- 2026-06-10 — claude-d00dc7c4 — context-regain + domain-retention pass: mapped OCR-corpus yield mechanics, found 3rd-model ROI lever, flagged polluted synthesis; ran 3-model calibration experiment (see yield-mechanics section above).

— Scaffolded 2026-05-28 by slot:alpha; fully built + master-brain-connected 2026-05-29 by slot:xray.

## OCR corpus training — live state + yield mechanics (2026-06-10, xray d00dc7c4)
> Regained from BLACKWELL-OCR-ENSEMBLE-MS0 (5 commits, 2026-06-08) + live state. THIS is the authoritative current picture. ⚠ The auto `knowledge/memories/patterns/blueprint-vision_synthesis.md` is POLLUTED (its open-threads are post-processor/holder/Fusion content, NOT this domain — the A6/A3 recall query is generic galaxy vocab → BM25 pulled fleet-dominant off-domain memories). Trust THIS file, not the synthesis. Fix belongs to the synthesis tool owner (sierra/india) — see [[reference_xray_synthesis_pollution_2026_06_10]].
- **Closed-loop OCR trainset pipeline** — `scripts/blueprint-ocr-training-loop.mjs` (runner) + `scripts/lib/ocr-training-loop-lib.mjs` (pure tiering core, exhaustively documented). 3 phases: CALIBRATE (synthetic-GT → isotonic P(correct | agreement fraction f)) → WEAK-LABEL (ensemble over real prints → gold/silver = trainable, bronze/reject → active-learning queue, NEVER silently trained) → EMIT `trainset.jsonl` for india's LoRA. Resumable per-print cursor (reaper-survivable; re-OCR=0 on resume).
- **Production task** — `scripts/run-ocr-training-loop-overnight.ps1` → scheduled `PRISM OCR Training Loop` (Ready/idle, last ran 2026-06-09). Worklist `corpus-worklist-drawing.txt` (~7794 drawing prints, business excluded). Multi-page: OCRs ALL pages (96% JM drawings are multi-page; page-0-only dropped ~76% of dim-bearing pages, cap 12pp).
- **Yield mechanics — the "0 trainable dims" cause is CORRECT conservative behavior, NOT a bug**: tier floors gold≥0.85 / silver≥0.65 / bronze≥0.45; trainable = gold|silver. With **2 models** agreement fraction f∈{0.5,1.0}; live calibration maps f=0.5→~0.57 (bronze → NOT trainable), f=1.0→~0.90 (gold). So ONLY dims BOTH VLMs independently agree on become trainable — noisy real scans rarely hit f=1.0 → low per-print yield. R9/R12-sound (refuses untrustworthy labels). Calibration is UNDER-POWERED (<50 samples, n≈24 → `reliable:false`).
- **3rd-model hypothesis REFUTED (A/B 2026-06-10).** Tested adding `llama3.2-vision:11b` (in `VISION_FAMILY_LEADERS`) for an f=0.67 bucket. It returns **"empty response" 100%** (0/32 prints survived) → ensemble never reaches 3 voices. The production 2-model pin (`run-ocr-training-loop-overnight.ps1:31`) is EMPIRICALLY CORRECT (comment "other families fail dense dims" validated). Do NOT add it.
- **REAL TOP ROI LEVER (validated, NOT yet built) — fix qwen2.5vl:7b runaway-JSON dropout.** The experiment found the actual bottleneck: even the 2 qwen-VL models drop to 1-survivor ~30-37% of prints (→ print fully excluded). `qwen3-vl:8b-instruct` is the reliable anchor; **`qwen2.5vl:7b` occasionally free-generates a runaway repetitive blob** (480 lines / 73s) that hits `num_predict:4096` mid-structure → malformed JSON → parse-fail dropout. The extraction call (`ollama-vision-extract-lib.mjs:408`) has temperature:0.1 + num_predict:4096 but **NO `format` constraint**. FIX = add Ollama constrained JSON decoding (`format:"json"`) → recovers ~30% dropped prints + cuts latency. Plumb format through ollama-vision-extract-lib → run-ollama-vision-extract → vision-ensemble-fuse; A/B vs anchor (no regression); test + 3-of-3 (shared OCR = safety-relevant). Full record: [[reference_xray_ocr_yield_mechanics_2026_06_10]].

## Vision-OCR benchmarks (xray)
- **A/B model gate** — `scripts/bench-vision-ocr-ab.mjs` + `scripts/lib/vision-ab-compare.mjs` (44 tests): paired synthetic A/B → upgrade/stay verdict feeding `scripts/lib/vision-model-select.mjs` (Blackwell big-VRAM seam). Built 2026-06-03; empirical run pends a quiet fleet (vision cold-load starves under live ollama contention). [[vision-ocr-ab-benchmark]] · [[reference_xray_vision_ab_benchmark_2026_06_03]]
- **Single-model loops** — `scripts/ocr-closed-loop.mjs` (synthetic dim-recovery) · `scripts/run-ocr-benchmark.mjs` (U-TDP04 real-corpus gate).

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for blueprint-vision (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (19 sources: T1=6/T2=0/T3=13). Top primary:
- [ISO 1101:2017(en) (online browsing platform, free read):](https://www.iso.org/obp/ui/#iso:std:iso:1101:ed-4:v1:en)
- [ISO 1101:2017 standard page:](https://www.iso.org/standard/66777.html)
- [NIST — "Testing the Digital Thread in Support of Model-Based Manufacturing and Inspection" (pub_id 919497):](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=919497)
Deep cited domain research (UNVERIFIED -- xray verifies vs source before any live engine/doctrine use): `knowledge/wiki/blueprint-vision/_staging/deep-domain-research-2026-06-09.md`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.
VERIFIED (papa-workflow 2026-06-09, WebFetch-confirmed): `knowledge/wiki/blueprint-vision/blueprint-vision-foundations.md` -- ASME Y14.5/FCF/5-families + MMC/LMC/RFS + 1st/3rd-angle cone-symbol + NIST digital-thread/STEP-AP242/QIF promoted; ISO 1101 (iso.org 403) + all numeric tolerance examples stay owner-gated for xray in `_staging`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
