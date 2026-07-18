# india session 9dabbdcc (2026-06-24, 25.1MB, spine 236KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- U-CAD-LEARN-TRIBAL-INJECT – wired CAD trial‑error loop to `CADTribalDrawInjectionEngine`; 63 unit tests passed.  
- U-CAD-TEXT-LEARN-LOOP – closed text→CAD Ollama bridge by ingesting evaluated generations into shared ledger; 13/13 tests passed.  
- U-BPA-OPCORRECTION-ALIAS – aliased `type:"operator_correction"` to `outcome_record`; 40/40 tests, live ledger: 145 rows processed, aliasedCount = 1.  
- U-CAD-LEDGER-PATH-ABS – anchored `CADTrialErrorLearningEngine` ledger to `mcp-server/data/state/cad-failure-ledger.jsonl`; 61/61 tests passed.  
- Durable cron `adc3b7c2` (`3,13,23,33,43,53 * * * *`) triggers `/checkin-india /loop /goal` every 10 min.  
- U-BPA-EVENT-WRITER-LIB (commit 6606d0c8bf) – canonical writer for blueprint extraction events.  
- U-BPA-WRITER-CONSOLIDATE-ALL (+FIX) (commits 88303250ac & 23ce35bd4d) – merged three appenders into single writer.  
- Wiki entry `e0e524055e` – ledger writer/reader symmetry pattern.  
- Drain‑task installer (commit 0810d3995b) and fix (454cf4127d); wiki 7a5505e044.  
- U-BPA-RAG-RECORDOUTCOME (commit e2fa23c46f) – added `recordOutcome` via `scripts/lib/blueprint-accuracy-event-writer.mjs`; round‑trip tests passed.  
- U-BPA-GUARD-EVENTSHAPE (commits cc27bd974d & ee2d1a739a) – emit `{type,ts,payload}`; idempotency test passed.  
- U-BPA-RAG-TRIBAL-DEFAULT (commits 466f47d769 & 6cfc375799) – default tribal corpus `state/shared/blueprint-vision-tribal-corpus.jsonl` wired into `retrieveTribal`; top‑K cliff fixed.

**DECISIONS**  
- Adopt tribal‑injection pattern for all learning loops; use existing `CADTribalDrawInjectionEngine`.  
- Alias `operator_correction` to `outcome_record` instead of rewriting guard logic.  
- Refresh fleet‑freshness gate once; accept eventual clearance.  
- Re‑arm missing cron (`adc3b7c2`) with 7‑day auto‑expire.  
- Flag high‑risk cross‑domain wiring of `recordOutcome` in `blueprint_rag_extract` for future xray.  
- Align `blueprint‑accuracy‑guard.mjs` event shape to consumer contract (kind→type + payload).  
- Wire `recordOutcome` via server‑injected canonical writer (option B) into `cadDispatcher` (~3394).  
- Inject default blueprint‑extraction tribal corpus; ensure CWD‑independent import.  
- Add `predlog_pair` to consumer’s known event types; lock idempotency branch.  
- Resolve top‑K cliff by forwarding dispatcher `opts.topK`.  
- Exclude `accurate:false` telemetry rows from LoRA training set; use only `operator_correction` rows.

**OPERATOR DIRECTIVES**  
- `/goal`: improve CAD/print AI learning; add tribal knowledge injections.  
- `/loop`: run continuous loops every 10 min (durable cron satisfied).  
- Pick next queue unit, ship 1–3 units per fire, 3‑of‑3 scrutiny, commit `[MAIN-FORCE]`.  
- Checkpoint at YELLOW and auto‑compact before spiral.  
- Include JM DIE corpus in `/learn` pipeline; run Hermes `/learn` on all CAD/engineering sources (`H:\PRISM\resources` + MIT courses).  
- `/checkin-india`: force‑take “india” slot, bind handoff to `india-work`, then run full `/checkin` pipeline.

**FINDINGS/BUGS**  
- Stale cron `87e3a5b3` replaced by durable `adc3b7c2`.  
- Ledger path divergence fixed; repo‑anchored `mcp-server/data/state/cad-failure-ledger.jsonl`.  
- `operator_correction` events dropped due to consumer expectation; resolved via alias.  
- Vitest suite misdiagnosed as “fleet‑unrunnable”; actually 25/25 pass.  
- RL CAM `step()` arity regression flagged (owner lima); pending fix.  
- `blueprint_rag_extract` handler lacked `recordOutcome` (gap R12).  
- Dispatcher cannot import `.mjs` writer directly; requires dynamic import or server injection.  
- Duplicate failing drain task “PRISM Tribal Resources Drain” triggers fleet‑health warning; orphaned drain process holds run‑lock.  
- Scheduled task path quoting issue fixed by direct `node.exe` exec.  
- RecordOutcome test regression due to default tribal injection; fixed by adjusting test and adding source.  
- Silent top‑K cliff when corpus > 7 records closed with loader fix.  
- Live ledger contains 144 `accurate:false` telemetry rows + 1 `operator_correction`; training set must exclude failure rows.

**AI‑SYSTEM SPECIFICS**

| Engine | Actions / API | Tests / Metrics | Deployment Notes |
|--------|---------------|-----------------|------------------|
| CADTrialErrorLearningEngine | recordRecommendation, linkOutcome, getLoopEfficacy, ingest() (text→CAD) | 63 unit tests; 61 ledger‑path tests; Brier/accuracy verified | Appends to `mcp-server/data/state/cad-failure-ledger.jsonl` |
| CADTribalDrawInjectionEngine | recommend(context, corpus) | 13 tests | Pure, no I/O |
| BlueprintExtractionRAGEngine | extract() (optional io.recordOutcome) | 0 new tests; pending recordOutcome wiring | Requires shared ledger `blueprint-accuracy-events.jsonl` |
| BlueprintLoRABridgeEngine | LoRA training & inference | No new tests | Uses same shared state as RAG engine |
| cadDispatcher | ingest, recordOutcome via canonical writer | Round‑trip tests passed (U-BPA-RAG-RECORDOUTCOME) | Server‑injected `.mjs` writer at runtime |
| blueprint_tribal_source_loader | load default tribal corpus | 3/3 round‑trip tests | Path: `state/shared/blueprint-vision-tribal-corpus.jsonl` |
| blueprint_lora_pair_builder | ledger→LoRA training pairs (pending build) | – | – |

**OPEN THREADS**  
- Wire `io.recordOutcome` into `blueprint_rag_extract` dispatcher handler (high‑risk cross‑domain).  
- Resolve kind vs type mismatch in `blueprint-accuracy-guard.mjs` vs consumer; monitor.  
- RL CAM step arity regression (owner lima) pending fix.  
- Monitor test‑freshness gate under continuous TS churn.  
- Implement option B wiring of `recordOutcome` in `cadDispatcher` (server‑side injection).  
- Consolidate remaining inline appenders across repo.  
- Resolve duplicate drain task; ensure single healthy scheduled task remains.  
- Verify server can import root `.mjs` writer at runtime.  
- Continue `/learn` pipeline to finish all 4,338 PDFs and monitor progress.  
- Pending build of `blueprint-lora-pair-builder.mjs` (ledger→LoRA training pairs).  
- Session‑limit arming (`capture-claude-credentials → arm-account-switch`) operator‑gated; not yet executed.
