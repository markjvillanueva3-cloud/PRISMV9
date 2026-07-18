# ai-training session 9dabbdcc (2026-06-24, 25.1MB, spine 236KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U-BPA-OPCORRECTION‑ALIAS` (8664edcce8): alias for `operator_correction`; 40/40 tests, live ledger now processes 1 dropped event.  
- `U-CAD-TEXT‑LEARN‑LOOP` (6732f5387e): wired text→CAD Ollama bridge (`scripts/cad-text-to-cadquery.mjs`) to ingest evaluated generations into CAD learning ledger and load tribal tips via `CADTribalDrawInjectionEngine`; 13/13 tests, loads 5 real tribal tips.  
- `U-CAD‑LEDGER‑PATH‑ABS`: anchored default ledger path of `CADTrialErrorLearningEngine` to repo‑relative location; 61/61 tests passed.  
- Canonical blueprint‑accuracy event writer (`scripts/lib/blueprint‑accuracy‑event‑writer.mjs`) committed (6606d0c8bf); consolidated inline appenders, updated 5 producer call sites.  
- Per‑user scheduled task “PRISM Resources Tribal Drain” registered with `node.exe` direct; verified to produce tips (3450→3501).  
- Wiki entry “canonical‑ledger‑writer‑pattern”.  
- `U-BPA-RAG-RECORDOUTCOME` (e2fa23c46f): wired `recordOutcome` to canonical `blueprint‑accuracy-events.jsonl` via `recordExtractionOutcome`.  
- `U-BPA-GUARD-EVENTSHAPE` (cc27bd974d, ee2d1a739a): aligned guard `appendEvent` shape `{type:kind, ts, payload}`, added `predlog_pair` to consumer‑lib.  
- `U-BPA-RAG-TRIBAL-DEFAULT` (466f47d769, 6cfc375799): default tribal source injection for `blueprint_rag_extract`; fail‑soft loader, topK fallback handling.  
- Restored durable 10‑min cron (`adc3b7c2`) after `/compact`; removed stale session‑only cron (`87e3a5b3`).  

**DECISIONS**  
- Wire tribal tips into CAD learning loop via `CADTribalDrawInjectionEngine`.  
- Defer wiring of `recordOutcome` for `blueprint_rag_extract` until cross‑domain coordination.  
- Adopt single‑source canonical writer; avoid TS duplicate drift.  
- Keep duplicate failing drain task as is, surface for owner consolidation.  
- Use per‑user scheduled task instead of SYSTEM to avoid elevation issues.  
- Apply chunk cap to prevent stalls on large PDF catalogs.  
- Map guard `kind → type` and nest payload to satisfy consumer contract; register `predlog_pair`.  
- Inject `state/shared/blueprint‑vision‑tribal‑corpus.jsonl` as default tribal source; forward `opts.topK` from dispatcher.  
- Defer LoRA pair builder build due to RED token zone and imminent session limit.  

**OPERATOR DIRECTIVES**  
- `/goal improve learning & AI systems for CAD drawing, print generation… ensure tribal knowledge injections.`  
- `/loop 10m` (durable cron).  
- Run Hermes `/learn` pipeline on all CAD/engineering sources in `H:\PRISM\resources`, MIT courses, and JM DIE corpus.  
- Continue improving CAD/print AI systems; pick next unit from handoff queue.  
- Checkpoint at YELLOW, trigger auto‑compact before spiral.  
- `/checkin-india`: force‑take india slot (`--force true --confirmRecent true`), bind handoff to `india-work`.  
- When session limit approaches, run `node scripts/capture-claude-credentials.mjs account-N` and `node scripts/arm-account-switch.mjs --auto` (operator gated).  

**FINDINGS/BUGS**  
- `operator_correction` events dropped due to unknown type; fixed with alias to `outcome_record`.  
- Ledger path divergence between script & dispatcher caused silent split of learning data; resolved by anchoring path.  
- Vitest suite runnable; earlier “fleet‑unrunnable” claim was bad reporter flag misdiagnosis.  
- Stale cron (`87e3a5b3`) session‑only; restored durable cron.  
- Duplicate draining task “PRISM Tribal Resources Drain” failing (4294967295); separated from healthy task.  
- Orphaned batch process held run lock; cleaned up.  
- Chunk cap required for large PDF catalogs to produce tips.  
- TS/JS seam: dispatcher cannot import repo‑root writer directly; need dynamic import or server injection.  
- Guard event shape mismatch caused silent drop to unknown; corrected.  
- Default tribal injection broke `recordOutcome` test; regression isolated & fixed.  
- Loader topK cap at 7 records removed; forwarding `opts.topK` implemented.  
- Data archaeology: rows with `accurate:false` are failure telemetry (extraction null) and not usable for training.  

**DOMAIN SPECIFICS**  
Engines: `CADTrialErrorLearningEngine`, `CADTribalDrawInjectionEngine`, `BlueprintExtractionRAGEngine`, `BlueprintAccuracyEventWriter`, `BlueprintTribalsSourceLoader`, `LoRATrainingPairBuilder`.  
Dispatchers: `cad_learning_*` dispatcher, `blueprint_rag_extract` handler, `blueprint-accuracy-consumer-lib.mjs`, `cadDispatcher.js`.  
Metrics: closed‑loop efficacy (lift + calibration + Brier), tribal tip count, AUROC/Brier/F1 gates.  
Paths:  
- `mcp-server/data/state/cad-failure-ledger.jsonl`  
- `mcp-server/dist/data/cadDrawTribalTips.js`  
- `state/shared/blueprint-accuracy-events.jsonl`  
- `state/shared/pdf-tribal-tips/tips.jsonl`  
- `state/shared/blueprint‑vision‑tribal‑corpus.jsonl`  

**TOOLS USED**  
PRISM helpers: `chat-slots.mjs`, `CronCreate`, `scrutiny‑3way.mjs`; Testing: `node:test`, Vitest; Scripts: `scripts/cad-text-to-cadquery.mjs`, `blueprint_lora_*.mjs`, `blueprint_rag_*.mjs`, `blueprint-accuracy-event-writer.mjs`, `blueprint-tribal-source-loader.mjs`, `blueprint-lora-pair-builder.mjs`, `drain-resources-tribal.mjs`; Node.js for scheduled task creation; Wiki & memory update scripts.  

**OPEN THREADS**  
- Wire `recordOutcome` into `blueprint_rag_extract` dispatcher (shared‑ledger coordination).  
- Resolve kind vs type mismatch in blueprint accuracy guard/consumer if hook becomes sole writer.  
- Consolidate duplicate failing drain task to its owner.  
- Final alignment of blueprint‑accuracy‑guard event shape with consumer‑lib contract.  
- Build `blueprint-lora-pair-builder` in next cron fire; requires fresh context & data verification.  
- Session‑limit arming (`capture-claude-credentials + arm-account-switch`) pending operator action.  
- Coordinate with xray for tribal corpus usage in LoRA builder.
