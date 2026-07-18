# blueprint-vision galaxy CROSS-SESSION SYNTHESIS (25 of 25 mineable, model gpt-oss:120b, 2026-06-27)

## What this galaxy is building
- End‑to‑end blueprint reading pipeline: PDF/DXF/STEP → OCR + VLM ensemble → dimension/GD&T extraction → cross‑source reconciliation (CAD + OCR + CNC GT) → `BlueprintExtractionContract`.  
- Async job queue with per‑page rasterization, region routing & tiling for dense pages.  
- Multi‑VLM consensus engine (N‑way clustering + noisy‑OR) with tiered label quality (gold/silver/bronze/no_corroboration).  
- Closed‑loop calibration store that emits program‑GT pseudo‑labels for LoRA fine‑tuning.  
- Tool/holder/machine DB generators (Fusion CSV → HyperMILL SQLite & Mastercam JSON) with material‑compatibility gating.  
- Knowledge injection bundle (`blueprint-reading-knowledge.mjs`) delivering ASME Y14.5 + tribal tips to VLM prompts.  
- Slot system (`juliett`, worktrees `kilo`, `holo`) for session continuity and terminal pinning.  
- Wiki leaf index `_leaf-index.jsonl` (≈28 k entries) with IDF relevance scoring; HTML companion pipeline injects source‑hash meta tags.  

## Shipped capabilities
- Router redaction audit (`618237fa34`) + value‑aware grade guard (`9ff067db37`).  
- Opt‑in whole‑plan redaction (`94a8b3fbc8`).  
- DI extraction‑plan executor (`fd46f6cff7`, `/api/v1/drawing/execute`).  
- Real DXF parser with unit propagation (`e036b2d353`).  
- Async OCR enqueue & polling (`ab018ccb85`, `7db54c683c`), multi‑page raster + union (`13557d84`).  
- CAD GT triangulation lib, extraction contract normalizer, fused non‑dim output.  
- Knowledge bundle with 14 libs, 45 ensembles, 121 extract tests.  
- Region routing libs (`region-classify.mjs`, `region-glue-lib.mjs`, `buildRegionRoutedFused`).  
- GD&T & datum‑deficiency normalizers, surface‑finish helper.  
- Tool DB generation (Fusion CSV → HyperMILL SQLite, Mastercam JSON) with shared model `jm-tool-model.ts`.  
- Calibration sample store + program‑GT emission (`U‑XRAY‑PROGRAM‑GT‑CALIB`).  
- LoRA training pipeline (`blueprint_vl_train_lora.py`) via detached runner.  
- A/B vision verdict library, cron loops (5 min) for OCR polling and `/loop`.  
- HTML companion emitting 130 spec HTML twins with source‑hash injection.  
- RTK dedup + guard updates, settings sync (`c-to-h-mirror`).  

## Key decisions & rationale
- Router redaction audits full contract → eliminates false‑negative privacy bugs.  
- Value‑aware grade guard prevents over‑redacting legitimate material grades.  
- Opt‑in whole‑plan redaction keeps internal raw data for debugging while providing anonymity to consumers.  
- Pure DI executor avoids cross‑dispatcher calls, simplifying testing.  
- Async OCR queue removes blocking, enables multi‑page processing and stale‑job pruning.  
- Region routing applied only to dense pages; recall‑first union recovers missed dimensions without over‑merging.  
- Ensemble requires ≥2 models; single‑model runs labeled `no_corroboration`.  
- Calibration store persistence reaches MIN_RELIABLE = 50 without GPU, reducing contention.  
- `PRISM_OCR_NUM_PREDICT` capped at 4096 (higher caps gave no recall lift, increased hallucinations).  
- GD&T & surface‑finish fields added as optional, never mutating original payloads.  
- Shared tool model centralizes physics, avoids duplication across generators.  
- GPU preflight (matmul probe) required before LoRA; fallback to CPU if sm_120 unsupported.  
- Raised `OLLAMA_NUM_PARALLEL` and enabled `keep_alive` to mitigate RTX 6000 cold‑load timeouts.  
- Cron‑only session scheduling for low‑impact tasks; avoid cloud schedules < 60 min.  
- Removed tribal boost from IDF weighting; re‑weighted tokens for better relevance.  

## Standing operator directives
- Auto‑redact all extraction paths where required; enforce full‑contract audit.  
- Apply blueprint reading/OCR/VLM features across all PRISM modules.  
- Bypass domain boundaries when needed; link with domain nodes appropriately.  
- Continue closed‑loop training, prioritize OCR accuracy (region routing, tiling).  
- Run `/loop [10m]` until backend tasks finish, then focus on pipeline enhancements.  
- Use Ollama VLMs (`qwen3‑vl:8b-instruct`, `qwen2.5‑vl:7b`, fallback `llama3.2‑vision:11b`).  
- Keep GPU RAM < 93 %, VRAM < 90 %; pause heavy units if thresholds exceeded.  
- Enable 5‑min cron jobs for session loops and OCR polling.  
- Generate complete Fusion/HyperMILL/Mastercam tool DBs before stopping.  
- Commit to `kilo` worktree, run `/compact` after each commit; enforce pre‑compact guard.  

## What is still to build (open threads)
1. Payload‑adaptation map for `extractionPlanExecutor`.  
2. Front‑end React extraction panel with redacted preview toggle.  
3. Full GPU‑bound recall measurement post‑tiling integration.  
4. Complete region routing pipeline (page classifier → view/VLM → table/parser → title‑block parser).  
5. Grow calibration/trainset to ≥ 50 reliable samples; emit program‑GT with `--emit-calibration`.  
6. Wire LoRA training loop via detached runner, target Brier ≤ 0.15.  
7. Real GPU preflight for sm_120 and install torch ≥ 2.7/cu128.  
8. Exhaustive OCR training loop to completion; monitor GPU load.  
9. Document extraction contract (cross‑domain consumer).  
10. Fix G4 misroute bug in tool DB generator; implement Mastercam export generator.  
11. Integrate GD&T & surface‑finish outputs into downstream pipelines (quote, CNC program generation).  
12. Ingest additional tribal/ASME knowledge sources; regenerate wiki leaf index and embeddings.  
13. Persist cron jobs across restarts (system‑wide scheduling where needed).  
14. Resolve remaining dispatcher‑method drift (~49 instances).  
15. Implement per‑type calibration (volume‑gated > 50 samples) & multi‑part region comparison.  
16. Add countersink normalizer and other geometry normalizers.  
17. Finish `LathePartFamilyTemplateExtractorEngine` and wire into `cadDispatcher`.  
18. Write full unit suite for all lathe families, add dispatcher round‑trip test.  
19. Commit staged HTML/patch files once git lock clears; verify dashboard consumer.  
20. Ensure `md-to-html` meta‑hash injection works for all future root docs.  
21. Implement `ContextCompressionEngine` (≥ 3:1 compression, < 10 % info loss, < 100 ms decompression).  
22. Establish C: drive cleanup policy to prevent ENOSPC recurrence.  

## How to build it (patterns / sequence)
1. **Data‑driven router** – define `CONSUMERS` table; generate routes via `blueprint_extract_route`; add confirm‑gate for commitment consumers.  
2. **Pure DI executor** – inject `callTool` into `/api/v1/drawing/execute`; avoid cross‑dispatcher calls.  
3. **Async OCR queue** – POST → `ExtractionJobStore.enqueue`; poll via `/api/v1/drawing/extract/job/:jobId`; prune stale jobs on enqueue.  
4. **Region routing pipeline** – page classifier (`region-classify.mjs`) → tiled OCR (`extractWithRegionRouting`) → fuse with `buildRegionRoutedFused`.  
5. **Ensemble consensus** – run N VLMs, collect dimensions, compute agreement fraction, calibrate via isotonic regression; assign tiered labels.  
6. **Calibration store** – persistent `calibration-sample-store.mjs`; emit program‑GT (`--emit-calibration`); use reliability flag in validation harness.  
7. **LoRA training loop** – generate trainset → run `blueprint_vl_train_lora.py` via `DetachedLoRARunnerEngine`; evaluate Brier ≤ 0.15 before deployment.  
8. **Tool DB generation** – shared model (`jm-tool-model.ts`) → lookup tables → generators for Fusion CSV/JSON, HyperMILL SQLite, Mastercam JSON; apply material‑compatibility gating.  
9. **Knowledge injection** – merge `blueprint-reading-knowledge.mjs` into VLM prompts via `--inject-knowledge`; update wiki index with `regen-wiki-from-viz.mjs`.  
10. **HTML companion pipeline** – run `emit-all-spec-html.ts` → `md-to-html.mjs` (meta‑hash injection) → guard via `html-companion-guard.mjs`.  
11. **Slot workflow** – `/checkin` → claim slot → maintain heartbeat → run tasks → `/compact` → `precompact-pending-guard` → `per-agent-handoff`.  
12. **Engine addition pattern** – add source under `src/engines/`, export in `index.ts`, update dispatcher mapping, create unit tests, run concurrency suite.  
13. **Context compression** – implement engine under `src/engines/ContextCompressionEngine.ts`; expose via dispatcher; benchmark with performance suite.  

## Tools to use
- **Dispatchers**: `cadDispatcher`, `resourceExtractionDispatcher`, `businessDispatcher`, `qualityDispatcher`, `calcDispatcher`, `productDispatcher`, `knowledgeDispatcher`.  
- **Skills / Commands**: `/build-brief.mjs`, `/loop`, `/goal`, `/checkin-xray`, `/compact`, `CronCreate`, `CronDelete`.  
- **Scripts**: `extractionPlanExecutor.ts`, `run-ocr-benchmark.mjs`, `vision-ensemble-fuse.mjs`, `region-classify.mjs`, `buildRegionRoutedFused.mjs`, `calibration-sample-store.mjs`, `blueprint_vl_train_lora.py`, `lookupCuttingData()`, `regen-wiki-from-viz.mjs`, `emit-all-spec-html.ts`, `md-to-html.mjs`.  
- **Hooks**: `slot-bind-enforce.mjs`, `chat-slots.mjs`, `audit-dispatcher-engine-methods.mjs`, `precompact-pending-guard.mjs`, `stop_on_failing_tests.mjs`, `html-companion-guard.mjs`, `rtk-prefix-reminder.mjs`.  
- **System‑Viz / Knowledge**: `system-viz-on-commit.mjs`, Obsidian feed stamp, Qdrant embedding store for wiki search.  
- **AI Systems**: Ollama VLMs (`qwen3‑vl:8b-instruct`, `qwen2.5‑vl:7b`, fallback `llama3.2‑vision:11b`), LoRA PEFT trainer, RAG engine (`BlueprintLoRABridgeEngine`), engines `PrismEnhancedGDTEngine.ts`, `PrismGDTFCFParserEngine.ts`, `LathePartFamilyTemplateExtractorEngine.ts`, `ContextCompressionEngine`.  

## Recurring findings + bugs
- Over‑redaction of material grades fixed by value‑aware grade guard; under‑redaction of customer names solved with full‑contract audit.  
- Initial OCR route processed only page 0 → added multi‑page rasterization, union, and maxPages/dpi sanitizer.  
- Dense pages yielded 0 dims with full‑page OCR; region routing recovered up to ~28 dims per part.  
- CAD GT triangulation limited recall (5/11 neutral STEP parts); GPU validation deferred.  
- Leading‑dot/plus JSON parsing errors caused dropouts – fixed via `repairLeadingDotDecimals` and `repairTruncatedJson`.  
- Raising `PRISM_OCR_NUM_PREDICT` > 4096 gave no lift, increased hallucinations → cap retained.  
- RTX 6000 Blackwell cold‑load timeouts mitigated by `keep_alive`, higher `OLLAMA_NUM_PARALLEL`, fallback model.  
- Calibration store needed persistence to reach MIN_RELIABLE = 50 without GPU.  
- Dispatcher‑method drift (~49 mismatches) addressed via `audit-dispatcher-engine-methods.mjs`.  
- GD&T normalizer missing in second OCR engine – cloned to TS version.  
- Tool G4 misroute bug still open; Mastercam export generator pending.  
- Cron jobs session‑only disappear on restart → need system‑wide persistence.  
- Peer git contention blocks committing ~93 staged HTML/patch files; require lock‑free commit window or staggered commits.  
- ENOSPC truncated `settings.json`; resolved with C: cleanup and `c-to-h-mirror` sync.  
- Missing import of `GDTCalloutParserEngine` restored from prior commit.  
- Test fixtures mismatched engine contract (array vs record) – corrected data & assertions.  
- `macroLibraryEngine.listMacros()` shape normalized by dispatcher.
