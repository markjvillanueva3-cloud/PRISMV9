# PRISM Fleet Domain Goals (2026-06-03)

The fleet meta-goal is a **PERFECT fleet-wide SVI (psi = 1.0)** — achieved through three disciplines, not one: (1) a **clear north-star goal per domain** so every galaxy knows what "done" means, (2) **per-domain self-improving training** (every galaxy clones india's closed loop and feeds it real shop outcomes), and (3) **synergy-first building** — wire to every natural consumer, route physics through canonical engines, and prefer cross-galaxy edges that lift more than one SVI at once. This document is the operator's clear-goals artifact, produced by a **17-agent parallel assessment workflow** (one agent per galaxy, grounded in live SVI.json / BUILD_STATE / knows-map / engine inventories). Note: `SVI.json` reports a single system-wide `psi_reachability = 1.0` (`svi_display 1.2×10^46`, trend "shrinking" -0.02); `SVI_TARGET_BREAKDOWN.json` reports subsystem psi 0.9766 (bottleneck = Waterjet). No galaxy has its own SVI row yet — the per-pipeline reachability scores below are the honest proxies, and standing up per-galaxy SVI instrumentation is itself a roadmap item.

## North-star one-liners

| Slot | Galaxy | North-star goal (1 line) | Current SVI / target |
|------|--------|--------------------------|----------------------|
| alpha | token-optimization | Make the 26-slot fleet maximally token-efficient — cheapest-correct surface every time; "free" infra that lowers all 33 other galaxies' cost | Fleet psi 1.0 (force-multiplier, no own row); offload 11.2% → ≥30% |
| bravo | hermes-zulu | Live slot-less master conductor — fans 25 workers across 34 galaxies, fail-closed authority, overnight learning | Fleet psi 1.0 but readiness NO-GO (0 slots zuluOptIn) → live |
| charlie | quoting | Any print → margin-correct, physics-grounded, customer-ready quote in one shot; loop closes on quote-vs-actual | QuoteToShip pipeline 0.51 → 1.0; 85% built → 100% |
| delta | cad | PRISM's geometry brain — any input → validated, feature-recognized, DFM-checked solid (STEP AP242, live Fusion) | JM corpus coverage 33% → high; CADCAM-AGI never_started → built |
| echo | post-processor | Single canonical CAM→controller G-code emitter; saleable MasterPost with byte-equivalence proof | EDM post pipeline 0.38 → 1.0; ~40% real coverage → 100% |
| foxtrot | mill | Deepest-volume print→proven-program for JM's 5-VMC fleet, every param defended by physics | PrintToProgram 0.90 / MultiAxis 0.91 / MillTurn 0.92 → 1.0 |
| golf | fleet-hygiene | Keep 26-slot fleet alive, lean, self-healing with zero babysitting; protect the substrate all galaxies depend on | Fleet psi 1.0 but "shrinking"; meta-layer defends reachability |
| hotel | business | Autonomous back-office — accepted quote → costed/scheduled/shipped/invoiced job; per-category cost truth | QuoteToShip 0.51-0.72 → 1.0; orphan tribal engine → wired |
| india | ai-training | Single self-improving learning substrate every domain clones; own GNN/LoRA/RAG/outcome machinery | NN-GRAPH deploy gate DEFERRED (AUROC 0.388 < 0.78) → clears |
| kilo | cam | Universal CAM brain — feature set → validated, collision-checked strategy for any seat; live in-seat add-in button | MillTurn 0.92 / MultiAxis 0.91 strong; EDM 0.38 / Laser 0.37 weak |
| lima | academy | Self-compounding learning factory — auto-build verified, prereq-correct, cited courses + certification paths | No academy SVI row → register Courses subsystem; course loop closed |
| mike | wedm | Deepest fully-closed-loop domain — print→EDM-program with self-improving discharge-physics AI | EDM pipeline 0.38 (worst in fleet) → 0.72 → 1.0 |
| oscar | speed-feed | Ship SFC as a calibrated, vendor-beating saleable product that self-corrects on shop actuals | Engines wiredPct 88 → 100; MS-SFC-CALIBRATE never_started → built |
| romeo | wiring | Drive every built engine/algorithm/formula/tribal-tip to invokable-via-dispatcher; 97% → sustained 100% | 110 engines unwired; 97% coverage → 100% |
| sierra | system-viz | Always-fresh, always-trustworthy fleet brain map — one canonical graph that IS the fleet search substrate | Fleet psi 1.0 (substrate keeps it true); merge OOM → 0 |
| whiskey | lathe | Any turned-part print → crash-safe, controller-ready lathe program for JM's 100%-Okuma fleet | Turning pipeline 0.74-0.78 → 0.92+ → 1.0 |
| xray | blueprint-vision | Universal front-door — any unstructured input → clean, mm-normalized, per-field-confidence structured data | Blueprint 91% wired → 100%; no galaxy SVI row → registered |

## Per-domain goals

## ALPHA — token-optimization galaxy goal
**North-star goal:** Make the entire 26-slot fleet maximally token-efficient — every prompt routes to the cheapest correct surface (MCP action > Grep > Agent; Ollama > Claude for mechanical text), every session stays inside its budget zone, and the Obsidian brain/per-chat memory compounds context so nothing is ever re-derived. The galaxy is "free" infrastructure: it lowers the cost of all 33 other galaxies without owning any manufacturing output.

**Current state:** Doctrine-pointer galaxy (engines still live at `src/engines/Token*.ts`, not relocated) with 10 wired engines (`TokenAwarenessEngine`, `TokenBudgetAllocatorEngine`, `TokenEconomyEngine/Tracker`, `TokenAccountingEngine`, `SessionTokenLedgerEngine`, `DiffTokenEstimatorEngine`, `HookEfficiencyEngine`, `CADTokenRepresentationEngine`, `CostEfficiencyBridgeEngine`) across `prism_context`/`prism_session`/`prism_dev`. Live telemetry (`ollama-offload-stats.json`): **332,176 tokens saved cumulatively, but only 356 offloaded vs 2817 kept = ~11.2% offload rate — well below the ≥30% target.** No per-galaxy SVI exists — `SVI.json` is fleet-global (`svi_log10 46.09`, `psi_reachability 1.0`); this galaxy is a force-multiplier on that number, not a tracked subsystem in it. Owns COMMAND-KERNEL-MS0 (28/29 done; only U-CK11 open = close-out debt).

**PRISM app features (this domain delivers to the product):**
- Built: token-zone state engine (GREEN/YELLOW/RED) + budget gate + session ledger + diff-cost estimator; RTK bash wrapper (60-99% reduction); Ollama offload pipeline (5 hooks); CAG prompt-cache anchoring; `/token-dashboard` `/token-ledger` `/context-budget` `/slim` skills; MASTER-BRAIN-TEMPLATE (alpha is the exemplar galaxy-brain).
- Still needed: an in-product **cost dashboard** surfacing per-job/per-quote token+$ spend (CostEfficiencyBridgeEngine → hotel/business ERP, not yet productized); auto-route enforcement (today route-nudges fire but fleet take-rate is ~0.8% — advisory, not binding); fix the dead `ollama-route-pretooluse` path (4732 fires, 0 offloads).

**Training plan (self-improving AI to perfect):** Clone india's closed-loop template (already wired per `PER-SLOT-CLOSED-LOOP-INTEGRATION`): every routing/offload decision publishes via `xproc_outcome_publish {slot:'alpha'}`, emits features via `xproc_kg_project_features` to india's GNN tier-5, and records actuals via `xproc_calibration_monitor_record`. Corpus = the offload-stats + PSN-savings telemetry + per-hook efficiency profiles. The learnable target is a **route classifier**: given a prompt/tool-call, predict the cheapest-correct surface (Ollama vs Claude vs MCP-action vs Grep) and the expected token delta — calibrated against measured actuals so the drift-canary triggers retrain when offload rate or savings regress. Defer retrain triggers / model rollout to india's surfaces; do not roll our own.

**SVI-to-perfect path (psi -> 1.0):** Fleet psi is already 100% reachable; this galaxy's lever is keeping it there *cheaply* while the fleet grows. Four concrete levers: (1) **lift offload rate 11% → 30%+** by repairing the 0-offload `ollama-route-pretooluse` hook and warming Ollama so `/api/chat` stops silently skipping; (2) **convert advisory route-nudges to binding** for the unambiguous cases (Grep-over-Agent, MCP-action-over-reimpl) so take-rate climbs off 0.8%; (3) **close U-CK11 → ship COMMAND-KERNEL-MS0** (the syscall kernel the brain/OS compose through); (4) **stand up bidirectional Obsidian vault sync** (HERMES-MEMORY-VAULT-MS0 HMEMV04-06 — currently NOT BUILT, the biggest dormant context-retention gap).

**Synergy edges (build-with-synergy):**
- system-viz (sierra) — alpha CONSUMES sierra's 110K-node graph to find token-waste hotspots; pre-Bash/pre-Read graph-context nudges already route reads through the graph instead of re-scanning.
- fleet-hygiene (golf) — alpha CONSUMES reaper telemetry + Ollama rate-limit findings; golf's GPU/Ollama coordinator gates whether offload is even available (contention = silent skip).
- ai-training (india) — alpha FEEDS routing outcomes/features into india's GNN closed loop and clones india's self-improving-AI template (do not fork it).
- business (hotel) — `CostEfficiencyBridgeEngine` must surface token→$ into hotel's ERP so per-quote/per-job cost includes compute spend.
- post-processor (echo) + cad (delta) — `CADTokenRepresentationEngine` / gcode-template audits cut redundant token blocks in CAD/CAM emission.

**Top 3 gaps blocking the goal:**
1. **Offload pipeline underperforming** — 11.2% vs 30% target; the `ollama-route-pretooluse` hook fired 4732× with 0 offloads (dead route), and Ollama `/api/chat` silently skips under GPU contention — savings are leaking.
2. **Route-nudges are advisory, not binding** — fleet take-rate ~0.8% (38/4553); the optimization exists but the fleet ignores it, so realized savings are far below potential.
3. **Context-retention loop has a hole + close-out debt** — bidirectional Obsidian vault sync (HMEMV04-06) is NOT BUILT (memory only flows one way), and COMMAND-KERNEL-MS0 sits stuck on U-CK11 — both block the "compounding brain so nothing is re-derived" north-star.

## BRAVO — hermes-zulu galaxy goal
**North-star goal:** Hermes/Zulu becomes PRISM's live, slot-less master conductor — a self-correcting orchestrator that fans the 25 worker slots out across the 34 galaxies, governs them via fail-closed authority, teaches/learns overnight against the Obsidian brain, and keeps every shipped asset stub-free and wired. The galaxy exists so the *whole fleet* runs autonomously and correctly without a human in the loop.

**Current state:** 9 real engines on disk (5 `Hermes*` fan-out/budget/verdict/self-correction + 4 `Zulu*` governor/auction/dashboard + `MoonshotClientEngine`), all dispatcher-wired as `prism_session` actions (0 orphans remain in the cluster as of `f8be5949ff`/`5fe5ad5198`, 2026-06-02). Runtime liveness was restored 2026-06-03 (`PRISM Zulu Orchestrator` task registered, first sweep clean) but **0 slots have `zuluOptIn`**, so the orchestrator is still effectively a no-op. No per-galaxy SVI exists in `SVI.json` — it reports a single fleet-wide `psi_reachability: 1.0` (100%, `svi_display 1.2×10^46`, trend "shrinking" -0.02); this galaxy is part of the Engines (3610)/Dispatchers (104)/Actions (2700) pipeline subsystems, all `wired_pct: 100`. Readiness verdict on record is **NO-GO** ([[reference_hermes_control_readiness_nogo_2026_06_01]]).

**PRISM app features (this domain delivers to the product):**
- Built — `prism_session:zulu_authority_check` (fail-closed authority gate), `zulu_task_auction` (soul-weighted sealed-bid work orders), `hermes_fanout_plan`/`file_scope_partition`/`budget_estimate`/`verdict_aggregate`/`self_correct` (parallel-agent fan-out), `dream_scan`→`dream_markers_to_proposals`, `model_attribution_*` + `opus_assess_complexity` (model-tier router), the slot-brief consume-once channel (`slot_brief_write`→`slot-brief-inject.mjs`), and the Hermes desktop app wired to PRISM MCP `:3100` exposing all ~103 `prism_*` dispatchers as Hermes tools.
- Still needed — `U-OPUS-EXECUTE-WIRE` (live Anthropic client behind `OpusCapabilityEngine.execute()`); actual enforcement (governor/auction currently record to ledgers, enforcement is the operator-gated loop only); the `zuluOptIn` opt-in path so the orchestrator stops being a no-op; system-viz `ghost.hermes_app` roost (P4, unbuilt).

**Training plan (self-improving AI to perfect):** Clone india's closed-loop per `PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`: every orchestration decision publishes via `xproc_outcome_publish {slot:'bravo', domain:'hermes-zulu'}`, emits features via `xproc_kg_project_features` into india's GraphSAGE tier-5, captures learnings only through `prism_knowledge:tribal_capture slot=bravo`, and records actuals via `xproc_calibration_monitor_record` so drift-canary fires retrain candidacy. The domain-specific corpus is the octopus consensus ledger + weekly Hermes self-reflection sidecars; the learning target is calibrating *which model tier / which slot* wins an auction (the `opus_assess_complexity` heuristic → learned router). Overnight learning runs through the Hermes app — but its memories (`%LOCALAPPDATA%/hermes/`) are currently siloed from the Obsidian-indexed `knowledge/` vault (gap below).

**SVI-to-perfect path (psi -> 1.0):** Global psi already reads 1.0, so the real levers are *correctness/liveness*, not reachability count: (1) close the `zuluOptIn` gap so live orchestration actually moves work — a "wired but dark" runtime depresses true viability even when the reachability metric says 100%; (2) wire `OpusCapabilityEngine.execute()` to a live client so the model-tier router is real, not advisory; (3) promote governor/auction from ledger-record to enforced with operator sign-off; (4) keep the stub-hunter zero-tolerance sweep on every close-out (the `svi_delta -0.02 shrinking` trend means net assets are being lost — verify none are silent regressions).

**Synergy edges (build-with-synergy):**
- **india (ai-training)** — Hermes is the *consumer* of india's retrain/drift surfaces and the *producer* of orchestration outcomes; moonshot/auction signals flow back to india's GNN. Never roll a parallel learning loop — defer to india.
- **golf (fleet-hygiene)** — fleet-reaper coordination; the `PRISM Zulu Orchestrator` task and reaper must not reap each other; `fleet-task-health-watch` now watches the orchestrator as CRASH_CRITICAL.
- **sierra (system-viz)** — every bravo-built engine must appear in the 548MB graph (validate via roost); the pending `ghost.hermes_app` roost closes the last viz blind-spot.
- **Obsidian brain (PSN leg #1)** — Hermes's overnight learning must bridge `%LOCALAPPDATA%/hermes/memories/` → `knowledge/hermes-outputs|memories/` so it surfaces in the indexed vault; currently siloed.
- **tango (discovery) + alpha (token-optimization)** — duplication-guard gates every bravo build; alpha audits moonshot token cost.

**Top 3 gaps blocking the goal:**
1. **Orchestrator is live-but-dark** — `0 slots zuluOptIn`, so the registered `PRISM Zulu Orchestrator` sweep is a no-op; governor/auction enforcement is still operator-gated, not autonomous. This is the central NO-GO.
2. **Hermes↔Obsidian synergy gap** — Hermes's own memories + `state.db` are siloed from the brain vault; no Obsidian-MCP in Hermes `mcp_servers` (it can write flat files but can't query/link the vault graph), and `approvals.cron_mode: deny` blocks autonomous overnight scheduled jobs.
3. **Model-execution + provider gaps** — `OpusCapabilityEngine.execute()` is unwired (deferred to `U-OPUS-EXECUTE-WIRE`), and auxiliary LLM providers (openrouter/nous) are credit-exhausted, so full autonomous reasoning can't run end-to-end yet.

## CHARLIE — quoting galaxy goal
**North-star goal:** Turn any incoming print (or part spec) into a margin-correct, physics-grounded, customer-ready quote in one shot — and close the loop so every quote-vs-actual outcome makes the next quote more accurate, until JM Die quotes faster and more profitably than a senior estimator.

**Current state:** ~78 cost/quote engines flat in `mcp-server/src/engines/` wired through 2 dispatchers (`prism_business` + `prism_quoting`); BUILD_STATE = Quoting 13/11/2 → **85% built**. Global SVI `psi_reachability` = 1.0, but the `QuoteToShip` pipeline (21 stages) sits at **reachability_score 0.51** — the lowest-scoring revenue pipeline alongside EDM. The closed loop is LIVE (`QuotingTrainingLoopEngine`, 47,905-record baseline) but data-blocked at **MAPE ~71.1%** (DocuStrata is INBOUND-only; the synth-baseline is the honest ceiling) and consumes only **2 of 5** present quoting data sources.

**PRISM app features (this domain delivers to the product):**
- BUILT: `InstantQuoteEngine` (qty breaks, lead-time tiers, share-token), `BlueprintToQuoteBridgeEngine` print-to-quote entry, per-process quotes (Additive/Casting/InjectionMold/SheetMetal), `JobCostingEngine` rollup, `fair_market_value` + `inflation_adjust`, `QuoteAnalyticsEngine` conversion/accuracy, drift-alert + cost-alarm surfaces, `OutboundPriceIndexEngine` calibration target wired off real JM sold-orders.
- STILL NEEDED: the **2 unbuilt Quoting units** in BUILD_STATE (resolve to frontend/wiring); the `prism_quoting:training_status` action + frontend consumer for `latest-training-status.json` (called out as NEXT in MEMORY); per-customer margin-floor gate so an advisory FMV becomes a true quote; a customer-facing quote UI that surfaces the full cost stack + confidence band.

**Training plan (self-improving AI to perfect):** Already cloned from india's template — every quoting action publishes via `xproc_outcome_publish {slot:'charlie'}`, emits GNN tier-5 features via `xproc_kg_project_features`, and records actuals via `xproc_calibration_monitor_record` so india's drift-canary fires retrain. Path to mastery: feed the 3 unconsumed sources (`jm-vendor-cost-index.json` $10M AP cost-basis already wired to dispatcher but NOT to training, `jm-tool-purchases.json`, `docustrata-invoices.curated.json`) → close the predicted-FMV-vs-real-ext_price calibration loop at the correct per-line grain → drive MAPE down from 71.1% toward a real-world target with a clean (non-OCR-degenerate) reference distribution.

**SVI-to-perfect path (psi → 1.0):** Galaxy `psi_reachability` already reads 1.0 in the global SVI; the real gap is the **QuoteToShip pipeline reachability 0.51 → 1.0**, closed by: (1) connecting QuoteToShip to the `strategies` registry it currently lacks (it only links materials/tools/machines) and lifting `controller_dialects` past its single dialect; (2) wiring real outbound revenue so the loop calibrates against ground truth instead of a synth ceiling; (3) raising training-data coverage 40% → ~100% (5 of 5 sources); (4) shipping the 2 unbuilt units so 85% → 100% built.

**Synergy edges (build-with-synergy):**
- **cad (delta)** — `BlueprintToQuoteBridgeEngine` CONSUMES cad's `feature_recognize` + DFM output; knows-map confirms cad↔quoting is the strongest live edge. Quotes must start from cad features, never re-parse prints.
- **business/ERP (hotel)** — `QuoteToOrderBridgeEngine` hands accepted quotes to ERP work orders; `ERPCostFeedbackEngine` returns the real actuals that close the calibration loop (the only true source of outbound revenue).
- **ai-training (india)** — defer ALL retrain/rollout/drift logic to india's surfaces; charlie only publishes outcomes + features + calibration records.
- **mill / wedm / cam / speed-feed (foxtrot / mike / kilo / oscar)** — cycle-time + strategy → cost basis routed through physics (`CycleTimeEstimatorEngine`), never inlined rates.
- **lathe (whiskey)** — `LatheActualCostReconciliationEngine` + `LatheAutoQuoteFromPrintEngine` for turned-part quotes.

**Top 3 gaps blocking the goal:**
1. **No real outbound-revenue ground truth.** DocuStrata is INBOUND-only and the synth baseline caps honest MAPE at ~71.1%; without ERP actuals flowing back (via hotel `ERPCostFeedbackEngine`) the loop calibrates against itself, and the real ext_price reference is OCR-degenerate (~$1.005 median spike) until cleaned.
2. **Training consumes only 2 of 5 data sources.** The $10M vendor cost-index is wired to the dispatcher but never fed to training; `jm-tool-purchases.json` and curated DocuStrata invoices are unconsumed — leaving most of the available cost signal on the table.
3. **QuoteToShip pipeline under-connected (0.51) + 2 units unbuilt.** Missing the strategies-registry link and a customer-facing quote frontend with a margin-floor gate, so an advisory FMV is not yet a shippable, profit-guaranteed quote.

## DELTA — cad galaxy goal
**North-star goal:** Be PRISM's geometry brain — turn any print/photo/text/native-CAD input into a validated, feature-recognized, DFM-checked, tolerance-stacked solid model (round-trip STEP AP242, live in Fusion), so every downstream galaxy (cam, quoting, blueprint-vision) consumes trustworthy geometry instead of re-deriving it. End-state: lights-out print → recognized-features → manufacturable model with zero silent geometry corruption.

**Current state:** Large built surface — ~50 `CAD*Engine.ts` (CADKernelEngine, CADFeatureRecognitionEngine, CADAssemblyGraphEngine, CADToSTEPPipelineEngine, CADAccuracyValidatorEngine) + 7 CAD-vendor code generators (Fusion360/Inventor/SolidWorks/FreeCAD/HyperCAD-S/Mastercam/BobCAD) wired through `cadDispatcher` (564 actions) + `cadAutomationDispatcher` (367) + `cadDrawingKnowledgeDispatcher` (11) + `cadRegressionDispatcher` (37). Proven STEP AP242 toolchain (`cad-step-ap242-emitter.mjs`, `emitMultiPrismStep`), 70-file synth fleet round-trip, 38 synth primitives + 10 archetype recipes, live `Fusion360LiveBridgeEngine` (`:18360`, sweep/loft/offset routes shipped U-CADFL-SWEEP-LOFT 2026-06-03). **No cad-specific SVI number exists** — `SVI.json` is a fleet aggregate (psi 1.0 / SVI 1.2×10^46; `SVI_TARGET_BREAKDOWN` psi 0.9766, bottleneck = Waterjet, not cad). Cad coverage proxy is real though: `CAD_COVERAGE_MATRIX.json` = 33% of 16,039 scanned JM files.

**PRISM app features (this domain delivers to the product):**
- Built: feature recognition + op-taxonomy from geometry; assembly-graph extraction; STEP AP242 round-trip (parse/emit/scale); blueprint→CAD, photo→CAD, text→CAD (CadQuery codegen); tolerance check/stack + GD&T interpretation (`CADDrawingKnowledgeEngine`); collision/clearance (`CollisionDetectionEngine`); stock-removal sim; parametric electrode/trilobe/blisk generators; live Fusion 360 drive-and-replay.
- Still needed: ship the two PENDING_MERGE CAD UIs (`cqask/ui` orion-cad NL→CadQuery, `mcp-cadquery/frontend` Three.js viewer) into the web app; raise the 33% JM-corpus coverage toward full; a unified print→model→DFM→quote operator surface (currently engine-level, no single front door).

**Training plan (self-improving AI to perfect):** Clone india's closed-loop template (per `cad/CLAUDE.md` §"Closed-loop integration with india"): every cad action publishes `xproc_outcome_publish {slot:'delta',domain:'cad'}`, emits features via `xproc_kg_project_features` to india's GNN tier-5, captures learnings via `prism_knowledge:tribal_capture slot=delta`, and records actuals via `xproc_calibration_monitor_record` so india's drift-canary triggers retrain candidacy. Corpus is already strong: 129,306-file CAD/print corpus + JM DIE STEP/IPT/DXF (1,154/10,532/1,581) + `cad-tribal-corpus.jsonl` + `cadcam-consolidated-corpus.json` feed CAD-RAG. **Gap:** the deep-AGI milestones that formalize this (CADCAM-AGI-MS0 24u, CADCAM-DAGI-MS1/2/3/5 ~64u) read `never_started` in BUILD_STATE — the LoRA/GNN/RAG calibration loop is wired in doctrine but the training milestones are unbuilt.

**SVI-to-perfect path (psi -> 1.0):** No isolated cad psi to close, so the levers are reachability + coverage:
1. Close the feature-recognition → cam/quoting consumption loop end-to-end (the symmetric PSN edges) so cad output is *reachable*, not dormant.
2. Drive `CAD_COVERAGE_MATRIX` from 33% → high on the 16K JM corpus (eliminates the largest cad dark-data gap).
3. Stand up the india-cloned closed-loop (outcome→calibration→retrain) so accuracy compounds — convert CADCAM-AGI-MS0 from `never_started`.
4. Merge the two CAD frontends so the geometry brain has a product-visible surface.

**Synergy edges (build-with-synergy):**
- cam (kilo) — `feature_recognize` → feature set → `cam_strategy_recommend`; symmetric, cam already declares cad back. This is the load-bearing edge (camDispatcher 2,475 actions consumes delta output).
- quoting (charlie) — geometry + features + DFM → auto-quote-from-print (`feature_recognize` + DFM → quote estimator); verify quoting reciprocates.
- blueprint-vision (xray) — xray's blueprint OCR → `cad_step_parse` / AGI-CAD-generate; symmetric ✓.
- india (ai-training) — CAD-classifier + CAD-RAG features feed the fleet GNN via `xproc_kg_project_features`; symmetric ✓ — defer all retrain/rollout to india.
- academy (lima) — CAD examples → training corpus (verify academy reciprocates).

**Top 3 gaps blocking the goal:**
1. Deep-CAD-AGI training milestones (CADCAM-AGI-MS0 + CADCAM-DAGI-MS1/2/3/5, ~88 units) are `never_started` — the self-improving loop is documented but not built; CADCAM-DAGI-MS4 shows envelope drift (`not_started` but has shipped units).
2. JM corpus coverage stuck at 33% (`CAD_COVERAGE_MATRIX`) — most real-shop geometry is still unfeature-recognized dark data.
3. Both CAD product UIs (`cqask/ui`, `mcp-cadquery/frontend`) are PENDING_MERGE with React-version/App-Router conflicts — no operator-facing front door, so the geometry brain is invisible to the product; plus stale main-tree `cad/CLAUDE.md`+`MEMORY.md` stubs that the slot worktree supersedes but golf hasn't reconciled.

## ECHO — post-processor galaxy goal
**North-star goal:** Be the single canonical CAM→controller G-code emitter for PRISM — every toolpath (mill/lathe/wire-EDM, any of 14 controllers) posts through one physics-and-safety-verified pipeline that ships as the saleable **MasterPost** product with byte-equivalence proof vs the JM golden NC archive.

**Current state:** Rich-but-dark. ~155 post engines on disk (`MasterPostProcessorUnifiedAGIEngine` = 14 controllers/19 CAM/25+ ops, `PostProcessorPipelineEngine` = 7-phase/38-stage, `GCodeSafetyAnalyzerEngine` 67K), camDispatcher ~155 post cases + productDispatcher 24 ppg. But only ~9 engines are genuinely LIVE vs ~14 stub-wired (`engine.method?.()` + "method not callable" fallback = dark-in-practice), per POST-GEN-COVERAGE-AUDIT-2026-05-29 (~40% real coverage). **MS-MASTERPOST = `never_started`, 0/44** (gated on U-LEGAL-13); MS-WIRE-BACKEND 0/60. System SVI psi_reachability is reported at the SYSTEM level only (100% / 1.2×10^46) — there is **no per-galaxy SVI row** for post-processor; the post-relevant subsystem proxies are: Dialects 760-variability/100% wired, Pipelines 450/100%, but pipeline reachability_score is uneven (EDM 0.38, plus a 4-P0-machine-gap list: Haas PRE-NGC, Roku-Roku, EA sinker, FA10S).

**PRISM app features (this domain delivers to the product):**
- BUILT: 7-phase post pipeline (Kienzle/Taylor physics → block force/thermal/wear → CI95 → safety+tribal → emit); G-code safety gate (coolant-before-spindle, rapid limits, retract); cross-controller transpiler; static NC dialect linter (`post-nc-dialect-lint.mjs`, 8 rules) + non-circular reward fn (`post-gen-reward.mjs`); HurcoV11 WinMAX production post (92K, wired `master_post_hurco_v11`); 12 JM `.cps` fleet (Haas/Hurco/Okuma/Fanuc).
- NEEDED: live MasterPost product surface (single canonical emit per CAM with 8-dim scorecard + provenance + byte-equiv CI) — blocked by U-LEGAL-13; wire the 5 WEDM stub dialects (Mitsubishi/Sodick/Makino/Agie/Fanuc) so JM wire-EDM posts exist (currently absent); alarm-aware emit (2,588-alarm DB cross-check into P5 — declared-but-unwired); per-customer post config product surface (`PostLibraryConfiguratorEngine`).

**Training plan (self-improving AI to perfect):** Clone india's closed-loop template (already declared in CLAUDE.md §Closed-loop): every post-gen publishes `xproc_outcome_publish {slot:'echo'}` (auto-tapped), emits features via `xproc_kg_project_features` to india's GNN tier-5, captures dialect gotchas via `prism_knowledge:tribal_capture slot=echo`, and records shipped-NC actuals via `xproc_calibration_monitor_record` so india's drift-canary times retrains. Domain learner = `MasterPostFineTuningEngine` (per-vendor LoRA-class loop) scored against the non-circular `post-gen-reward.mjs` (lint+structure+alarm+golden-Jaccard); corpus = 160,582 NC + 13,790 `.cps` + 52 Mastercam posts + 2,544 materials. Active-learning engines (`LathePostGeneratorActiveLearning`, `JMDiePostProcessorLearning`, `PostProcessorAGIContinuousLearning`) are present but currently single-method/dark — wiring them is the training-loop unblock.

**SVI-to-perfect path (psi → 1.0):** (1) Wire the dark surface — convert the ~14 stub-wired/AGI-tier engines from `method?.()` fallbacks to real executing method calls (highest-leverage; the source of "reachable-on-paper, dark-in-practice"). (2) Close the 4 P0 machine-coverage gaps (Haas PRE-NGC, Roku-Roku, EA sinker, FA10S mis-route) to lift pipeline reachability_score (EDM 0.38, Turning) toward the Dialects-level 1.0. (3) Wire alarm-aware emit (2,588-alarm DB → PostProcessorPipeline P5) so emitted G/M can't trigger known controller alarms. (4) Prove byte-equivalence vs golden NC archive for every shipped post (`MasterPostByteEquivalenceCI`) — turns "structural-only PASS" (50/50) into runtime-verified.

**Synergy edges (build-with-synergy):**
- kilo (cam) — kilo PRODUCES toolpaths (NCI/APT/ToolpathBlock), echo CONSUMES; bridge must carry strategy+tool-list+WCS losslessly into P2 block-by-block.
- oscar (speed-feed) — feed/speed per block injected via `cam_speedfeed_compute` (NEVER inline); echo's NC carries oscar's physics-derived F/S.
- india (ai-training) — echo PUBLISHES post outcomes/features to india's closed loop (GNN tier-5); india owns retrain triggers/rollout.
- mike (wedm) + whiskey (lathe) — shared post dialect surface: echo = dialect-emit half, mike/whiskey own cut-physics; the 5 WEDM stubs are the joint unblock.
- juliett (database-expansion) — DB-indexes echo's 160K-NC/13.8K-cps corpus + serves Machine/Controller/Alarm/Tool DBs that post-gen consumes (824 machines, 2,588 alarms, 41,495 tools).

**Top 3 gaps blocking the goal:**
1. **Dark surface** — ~14 stub-wired/AGI-tier engines (incl `MasterPostProcessor{AGIOrchestration,Genius,UnifiedAGI}`, the 5 WEDM dialects) have code but no real executing dispatcher call; "wired" is dark-in-practice. This is the #1 leverage class and the literal cause of the reachable-vs-real gap.
2. **MS-MASTERPOST is `never_started` 0/44, legally gated on U-LEGAL-13** — the saleable product cannot ship until dialect codes are re-derived from public manuals only (Fanuc B-61395E, Haas 96-0284, Mitsubishi IB-1501279, Siemens 840D, Okuma OSP-P300), not copyrighted sources.
3. **No runtime byte-equivalence proof + 4 P0 machine gaps** — prove-out is structural-only (50/50 PASS, runtime deferred); wire-EDM post is entirely absent; Haas PRE-NGC / Roku-Roku / EA sinker / FA10S are uncovered or mis-routed, holding pipeline reachability (EDM 0.38) far below the Dialects-level 1.0.

## FOXTROT — mill galaxy goal
**North-star goal:** Mill is PRISM's deepest-volume print-to-program domain — a blueprint or CAD body of a milled part goes in, and physics-optimized, S(x)-validated, post-processed G-code for JM Die's 5-VMC Haas/Hurco fleet comes out, with every cutting parameter defended by Kienzle/Taylor/chatter/deflection physics rather than table lookups. End-state = one-click print→proven-program at psi 1.0 across the mill, multi-axis, and mill-turn pipelines.

**Current state:** Mill-name-prefix engines 72/72 built, 71 wired (1 unwired → 99% per BUILD_STATE 2026-06-03); true galaxy working set ~222 engines + HyperMILL sub-galaxy (~17 dedicated + 50+ flat `Hyper*`) per PATHS.md. Dispatcher `prism_mill` = 49 actions; `millActionSchemas.ts` = 49 Zod schemas. SVI has no single "mill" pipeline — mill spans **PrintToProgram reachability 0.90, MultiAxis 0.91, MillTurn 0.92**; overall system psi **0.9766** (bottleneck is Waterjet, not mill). Mill is among the healthiest galaxies.

**PRISM app features (this domain delivers to the product):**
- BUILT: `MillingPrintToProgramEngine` (print→G-code pipeline), `AdvancedMillingStrategiesEngine` (HSM/trochoidal/adaptive/peel/plunge/waterline registry, 197K `ToolpathStrategyRegistry`), `MillingForceEngine` + `MillKinematicsCollisionEngine` (5-axis `detectSingularity` gate), `MillProgramOptimizerEngine`, `MillBlockTimeProfilerEngine` (cycle-time), `HurcoV11MillMasterPostEngine` (~92K) + master-post family for the JM fleet, `MillStrategyNeuralEngine` (self-improving strategy pick), 268 cited milling tribal tips.
- STILL NEEDED: unified mill-archive locator (programs split across CNC MILL HAAS + HURCO — PATHS gap #1); `PRISM_UPGRADED/` mill output pipeline (lathe v2.0.0 run never applied to mill — gap #2); VMC-05 Roku-Roku registered post (gap #5); `hypermill/CLAUDE.md` sub-galaxy sentinel (gap #4); the 1 unwired mill engine closed.

**Training plan (self-improving AI to perfect):** Clone india's closed-loop template (already wired per mill/CLAUDE.md §"Closed-loop integration with india"): every mill action publishes via `xproc_outcome_publish {slot:'foxtrot',domain:'mill'}`, emits GNN features via `xproc_kg_project_features` for india's tier-5 classifier, captures tribal via `prism_knowledge:tribal_capture slot=foxtrot`, and records actuals via `xproc_calibration_monitor_record` so india's drift-canary fires retrain candidacy. Mill owns a per-domain LoRA stack (mill LoRA cadence/drift/deploy engines audited by india per the federation card). Corpus: 50-PDF milling extraction curriculum + 8 vendor manifests (Sandvik/Kennametal/Iscar/Seco…) + Fraisa/LMT/ITC milling-maker cutting-data + JM Die's 469-file Haas + 25 Hurco real programs as ground-truth labels. RAG over `milling-pdf-cited-tips` + JM corpus; GNN for wiring-inference; LoRA for strategy/parameter mastery — all calibrated against real cut outcomes, not synthetic.

**SVI-to-perfect path (psi → 1.0):** Mill already sits at 0.90–0.92 on its three pipelines, so the levers are (1) **close the PrintToProgram 0.90 gap** — wire the last unwired mill engine + the `PRISM_UPGRADED/` output stage so print→program is end-to-end reachable; (2) **lift MultiAxis 0.91** — populate the 5-axis singularity/RTCP coverage and register the missing VMC-05 Roku-Roku post so all 5 VMCs are reachable; (3) **feed real-cut calibration back** through india's loop so reachability is *proven by invocation* (BUILD_STATE "wired" = real dispatcher round-trip, not disk presence); (4) **HyperMILL sub-galaxy closure** — ship `hypermill/CLAUDE.md` + wire the 3 unwired `Hyper*` engines so the CAM-bridge half is fully reachable.

**Synergy edges (build-with-synergy):**
- **speed-feed (oscar)** — every mill cutting engine MUST query SFC via `cam_speedfeed_compute`; mill never inlines Kienzle/Taylor (imports `constants.ts`). Symmetric edge confirmed.
- **cam (kilo)** — mill CONSUMES CAM strategy output (`cam_mill_*`, HyperMILL orchestration); feature-recognition→strategy-select pipeline lives in cam, mill executes it — never redefine it.
- **post-processor (echo)** — every mill toolpath terminates in `MasterPostEngine`/`HurcoV11MillMasterPost`; the 2-vs-4-char coolant-block gotcha is a shared mill↔post memo.
- **lathe (whiskey)** — mill-turn handoffs via `Fusion360MillTurnBridgeEngine` + `cam-fusion-live-ms0`; load both galaxy sentinels on cross work.
- **ai-training (india)** — mill clones the self-improving template + feeds the GNN/LoRA loop (knows-map weight 1.66).
- **quality (golf-owned) + shop-floor** — mill emits predicted Cpk via `SurfaceFinishPredictionEngine` for `prism_quality` gates; `MachineLive*` streams real spindle load back into adaptive engines (knows-map confirms both edges).

**Top 3 gaps blocking the goal:**
1. Print→program is not fully end-to-end reachable: PrintToProgram pipeline at 0.90 + 1 unwired mill engine + no `PRISM_UPGRADED/` mill output stage (lathe v2.0.0 pipeline never run on mill).
2. 5-VMC fleet coverage incomplete: VMC-05 Roku-Roku has no registered post and the HyperMILL sub-galaxy lacks its `CLAUDE.md` sentinel + has 3 unwired `Hyper*` engines, so MultiAxis/CAM-bridge reachability stalls at 0.91.
3. Self-improving loop is wired but unproven at volume: no evidence the india calibration round-trip is firing on real JM cut outcomes (BUILD_STATE "wired" ≠ invoked), so the mill LoRA/GNN cannot yet demonstrate measurable drift-driven mastery.

## GOLF — fleet-hygiene galaxy goal
**North-star goal:** Keep the 26-slot fleet alive, lean, and self-healing with zero operator babysitting — every orphan/zombie process reaped (only when ancestry-confirmed), every crashed slot reclaimed, every scheduled watchdog provably Ready, and the MCP/Docker/Ollama substrate that the *other 33 galaxies* depend on never silently degraded.

**Current state:** Fully built and owned (completed/owned 2026-05-29 by slot:golf). Load-bearing layer = `scripts/fleet-reaper-sweep.mjs` (ancestry-walk PID→slot, confirm-after-2×300s) + durable `PRISM Fleet Reaper` scheduled task + 3 guardian/Stop hooks. Sibling watchdogs shipped: `fleet-memory-monitor.mjs`, `fleet-task-health-watch.mjs`, `critical-memory-compact-nudge.mjs`, `cleanup-orchestrator.mjs`. No dedicated SVI row — system-wide `SVI.json` reports `psi_reachability: 1.0` / `svi_display 1.2×10^46` but `trend: shrinking` (svi_delta −0.02); fleet-hygiene is the meta-layer that *protects* that reachability rather than contributing entities to it.

**PRISM app features (this domain delivers to the product):**
- Built: ancestry-confirmed slot-aware orphan reaper (soft-relief demote/working-set-trim before any kill; MCP-zombie false-positive refusal); per-`claude.exe`-tree RAM attribution → names the ONE chat to `/compact`; watchdog-over-watchdogs auditing all 8+ `PRISM *` scheduled tasks (HRESULT-only failure gate); GPU/Ollama coordinator (`.ollama-routing-hint.json`); generic stale-lock/claim/chat-bus reaper.
- Built: cross-PC host filter (MS2 host presets), enum-cache sidecar, kill switches (`PRISM_FLEET_REAPER_DISABLE`).
- Still needed: an operator-facing fleet-health dashboard surfacing reaper/kills/memory telemetry as one live view; auto-recovery actuator for a wedged MCP :3100 daemon (today restart is manual/advisory); Docker-daemon-wedge auto-*detection-with-alert* (auto-restart stays forbidden by doctrine).

**Training plan (self-improving AI to perfect):** Clone india's domain-self-improving template ([[domain-self-improving-ai-template]]) over the reaper's own decision telemetry. Corpus = `.fleet-reaper-actions.jsonl` + `.fleet-reaper-kills.jsonl` + `.fleet-reaper-candidates.json` (the confirm-window ledger) + `fleet-memory-history.jsonl`. Closed-loop calibration target: drive the false-positive reap rate toward zero by learning, per host, the right `KILL_AFTER`/`AGE_FLOOR`/`MEM_PRESSURE_PCT` and the PID-reuse/wedged-harness/non-claude-parent signatures — so the reaper *predicts* "true orphan vs live MCP server" instead of relying only on static ancestry rules. RAG over golf tribal memories (PID-reuse, cold-load stall, fork-storm) feeds the classifier; outcomes (kept-correctly vs killed-a-live-chat) backprop the threshold tuner.

**SVI-to-perfect path (psi → 1.0):** Global psi is already 1.0 but `shrinking` — fleet-hygiene's lever is *defending* it. Concrete levers: (1) keep the Docker substrate healthy so master-index never degrades to BM25-only fleet-wide (that silent degrade is the largest hidden reachability drop); (2) zero-tolerance on crashed-slot reclaim so dead slots don't pin orphaned subagents that inflate variability without reachability; (3) MCP :3100 uptime SLO — a down daemon makes every `prism_*` dispatcher action unreachable for all 33 other galaxies at once; (4) elevated-install self-heal of the reaper/memory/task-health scheduled tasks so the watchdog layer itself never goes dark (the `svi_delta` trend reverses when watchdogs hold).

**Synergy edges (build-with-synergy):**
- **token-optimization (alpha)** — golf's rate-limit + injection-bloat findings (effortLevel:xhigh → org rate-limit) feed alpha's token-waste hunting; alpha consumes reaper telemetry for hotspots.
- **hermes-zulu (bravo/zulu)** — agent-fleet orchestration; golf detects crashed chats and reaps their orphaned subagent processes so Hermes assignment never targets a dead slot.
- **system-viz (sierra)** — golf queries the system-graph for orphan/utilization classification; reaper telemetry should roost as a `ghost.fleet_orphans` overlay (knows-map confirms the `fleet` edge to sierra, score 2.05).
- **post-processor (echo)** — shares the `fleet` knows-edge (score 4.11) via shared scheduled-task/service lifecycle; golf keeps echo's post-gen daemons watched.

**Top 3 gaps blocking the goal:**
1. **No self-improving AI is wired yet** — the reaper runs on static thresholds/rules; the india-cloned closed-loop threshold-tuner over the existing JSONL ledgers is unbuilt (the single biggest leverage gap for "perfect" hygiene).
2. **MCP :3100 + Docker auto-recovery is manual/advisory** — a wedged daemon silently drops all `prism_*` reachability fleet-wide, but golf can only *detect+advise*, not actuate a safe restart; doctrine forbids Docker auto-restart, so a guarded MCP-only auto-restart path is the missing build.
3. **No unified operator fleet-health dashboard + no per-galaxy SVI attribution** — telemetry is scattered across 6 JSONL/log files and fleet-hygiene has no SVI row, so its contribution to defending psi=1.0 (and the current `shrinking` trend) is invisible and hard to drive to target.

## HOTEL — business galaxy goal
**North-star goal:** Be the shop's autonomous back-office brain — the closed loop that turns an accepted quote into a costed, scheduled, shipped, invoiced job and feeds true estimated-vs-actual variance back into every domain's physics, so PRISM doesn't just make good G-code, it runs a profitable shop. End-state: zero-touch quote→ship→cash with per-category cost truth and credit/compliance gates that never let a bad job through.

**Current state:** Broad and mostly built — ~261-355 business engines (flat-file `Business*/ERP*/Employee*/Customer*/Cost*` regex estimate per PATHS.md), `prism_business` dispatcher at 879 action cases / 16 buckets. Real corpus wired: DocuStrata QuickBooks export (174 vendors, 20,550 bill-lines, 2014-2026, $4.9M AP) → `jm-die-vendor-registry.json` + `jm-die-purchases-summary.json`. No business-specific SVI exists; the galaxy's only SVI footprint is the **QuoteToShip pipeline at reachabilityScore 0.51 (live SVI.json) / 0.72 (breakdown)** — the lowest-reachability output pipeline after the non-cutting ones. System-wide psi is 1.0 (reachability) but that is whole-codebase, not this galaxy.

**PRISM app features (this domain delivers to the product):**
- Built: end-to-end `quote_to_ship_run` orchestrator (21 stages: order→work-order→traveler→invoice); `GeneralLedgerEngine` with debits=credits invariant gate; `AccountingHardeningEngine` (bank-reconcile/WIP/QB sync); 7-vendor ERP round-trip (JobBOSS/Epicor/ProShop/Global Shop/SAP/Oracle/Generic); `ERPCostFeedbackEngine` per-category variance (material/labor/machine-hr/overhead/freight); `EmployeeMachineDomainAcademyEngine` Cpk-floor-gated role promotion; `CustomerPortalEngine`; `BillingEngine` (Stripe); `customer_credit_check` + AR-aging quote gate; `JobProfitabilityWaterfallEngine`.
- Still needed: wire `HotelERPTribalKnowledgeEngine` (UNWIRED ORPHAN — 0 dispatcher refs, 17 tribal cats stranded); extract the 6 constants families still inline in engines (payroll-tax-tables, pto-policies, benefits-plans, customer-terms, vendor-profile, chart-of-accounts) per the §2 extraction-first flag; lift QuoteToShip reachability above 0.72 (only 1 dialect, 3 registries connected); a PII/consent gate on customer-export paths (`customer-consents.json` exists but enforcement is thin).

**Training plan (self-improving AI to perfect):** Clone india's closed-loop template — the contract is already wired in §"Closed-loop integration with india": every business action publishes via `xproc_outcome_publish {slot:'hotel', domain:'business'}`, business assets emit features via `xproc_kg_project_features` into india's GNN tier-5, learnings capture via `prism_knowledge:tribal_capture slot=hotel`, and every shipped recommendation records actuals via `xproc_calibration_monitor_record`. The domain's "physics" is cost truth: the corpus is the DocuStrata 12-yr AP history + per-job actuals; the calibration target is estimated-vs-actual cost variance per category. Drift-canary (india-owned) fires retrain candidacy when quote-vs-actual variance widens. Hotel does NOT roll its own retrain trigger — it feeds the substrate and defers rollout to india.

**SVI-to-perfect path (psi -> 1.0):** (1) Raise the QuoteToShip pipeline reachabilityScore (0.51→1.0) by connecting the 4th registry (strategies) and closing the cost-feedback loop into adaptive engines so every stage is reachable. (2) Wire the orphan `HotelERPTribalKnowledgeEngine` into `prism_business` so its 17 tribal categories count as reachable knowledge nodes (this galaxy's slice of the system-wide "Tribal Tips wiredPct 80%" — the #1 ranked opportunityScore 0.79 dormant capacity). (3) Extract the 6 inline constants families into `src/data/*` catalogs so the financial/HR math is single-sourced and reachable. (4) Add the missing dialect coverage to QuoteToShip (only 1 today vs 6-20 for cutting pipelines).

**Synergy edges (build-with-synergy):**
- **quoting (charlie)** — accepted quotes flow charlie→hotel via `ERPWorkOrderEngine`; quote-vs-actual cost back-flows hotel→charlie via `ERPCostFeedbackEngine`. This is the revenue spine; both halves must round-trip the same `manufacturing_plan` shape.
- **quality (golf-owned brain)** — `ERPQualityEngine` ingests SPC/Cpk outputs into customer + job records; the Cpk floors (operator 1.0 / setup 1.33 / programmer 1.67) that gate role promotion are the same quality numbers, single-sourced not re-inlined.
- **shop-floor** — live machine status drives ERP work-order updates + `EmployeePerMachineSFAdaptiveEngine`; the KNOWS-MAP confirms business↔quality↔shop-floor as the top-3 mutual edges (2.5123 each).
- **mill/lathe/wedm** — `ERPToolInventoryEngine` consumes per-machine tool-life predictions for reorder-point calc; bad tool-life → false reorder pressure (named gotcha §6).
- **academy (lima)** — `EmployeeMachineDomainAcademyEngine` is the meta-bridge: machine-domain expertise drives the 5-tier (trainee→lead) curriculum.

**Top 3 gaps blocking the goal:**
1. **HotelERPTribalKnowledgeEngine is an unwired orphan** (0 `prism_business` handlers; the "wired hotel_tribal_*" claim was aspirational, corrected 2026-05-29) — the galaxy's tribal knowledge is stranded and uncounted in SVI.
2. **Six financial/HR constants families are still inline in engines** (payroll-tax, PTO, benefits, customer-terms, vendor-profile, chart-of-accounts) — an extraction-first backlog item that violates the no-inline-tax-tables HARD RULE and blocks single-sourced reachability.
3. **QuoteToShip is the lowest-reachability output pipeline (0.51-0.72)** — only 1 dialect and 3 registries connected; the closed cost-feedback loop into domain adaptive engines isn't fully reachable, so the india training loop is starved of the per-job actuals it needs to calibrate.

## INDIA — ai-training galaxy goal
**North-star goal:** Be PRISM's single self-improving learning substrate — every domain (mill/lathe/wedm/cam/quoting/sfc) clones india's closed-loop AI, and india owns the GNN/NN, LoRA, RAG, and outcome-feedback machinery that turns shop-floor outcomes into a continuously-mastering model. End-state: the NN-GRAPH deploy gate clears (AUROC ≥ 0.78, macro-F1 ≥ 0.55, Brier ≤ 0.15) and the closed loop runs autonomously fleet-wide.

**Current state:** NN-GRAPH MS0/MS1/MS2 are research-shipped but **deploy-gate DEFERRED** — the latest 768d candidate scores AUROC ~0.388 and leg #10 currently collapses to a constant predictor (AUROC ~0.5), both below the 0.78 gate (root cause per CLAUDE.md: heterophily + insufficient reference pool, poolSize 0). Retrain lifecycle (`scripts/nn-graph-retrain-lifecycle.mjs`, 6h S4U cadence) and the candidate→promote-on-gate discipline are wired. **No per-galaxy SVI row exists** for ai-training — `SVI.json` reports system-wide `psi_reachability = 1.0`; `SVI_TARGET_BREAKDOWN.json` is a subsystem-level psi 0.9766 (bottleneck = Waterjet), with no ai-training breakout. So this galaxy's SVI is tracked only at the system level today.

**PRISM app features (this domain delivers to the product):**
- Built: GraphSAGE GNN tier-5 wiring-inference (`graphsage-trainer/-predictor/-train-pipeline/-checkpoint/-model.mjs`); LoRA stacks for lathe + mill (`LatheLoRA*Engine`, `MillLoRA*Engine`, `LoRAAdapter*Engine`); RAG corpora (blueprint-rag, cad-corpus, tribal-knowledge, mit-curriculum, pdf-corpus); OutcomeFeedbackBus (`xproc_outcome_*` + `state/shared/outcome-bus.jsonl`); `outcome-bus-auto-tap.mjs` PostToolUse hook tapping every Edit/Write/Bash as a labeled training row; `MetaLearningOptimizerEngine`, `EvolutionaryRewardEngine`, `AdaptiveThresholdEngine`, conformal/calibration monitor (`xproc_conformal_*`, `xproc_calibration_monitor_*`).
- Needed: a GNN model that actually clears the deploy gate (currently dormant/research-only); a per-domain LoRA template that the other galaxies can clone turnkey (only lathe+mill stacks exist); a per-galaxy SVI instrument so india's own psi/gap is measurable, not just system-wide.

**Training plan (self-improving AI to perfect):** Closed loop — (1) every fleet action taps into OutcomeFeedbackBus as a labeled row; (2) RAG features (`xproc_rag_features`) + 768d node embeddings feed the GraphSAGE retrain via the node-embedding bridge; (3) `runAssessment` evaluates every candidate against the holdout, promote IFF all three gates clear, never promote a deferred candidate; (4) per-domain LoRA adapters fine-tune on domain outcomes (SFC per-material, mill/lathe/wedm per-domain) with cadence/drift/deployment/monitoring engines; (5) conformal prediction + calibration monitor keep confidence honest. Other galaxies clone this exact loop — learning signal always routes back through india.

**SVI-to-perfect path (psi → 1.0):** (1) Seed ≥2 high-confidence `ghost.unwired-engine` reference ghosts into the live graph so `buildHoldout` produces a real reference pool (current blocker = poolSize 0). (2) Apply the documented model-side lever `graph_heterophily_aggregate` (H2GCN ego/neighbour-sep) + stratified neg-sampling to break the heterophily collapse that pins AUROC near 0.5/0.388. (3) Run a fresh `runAssessment` against the post-seed graph and promote on gate-pass to flip NN-GRAPH from research-only to live. (4) Stand up a per-galaxy SVI emitter for ai-training so the gap to 1.0 is measurable rather than inferred from the system-wide 1.0.

**Synergy edges (build-with-synergy):**
- system-viz (sierra) — NN-GRAPH reads `system-graph.json` as input; sierra's regen sequence + cross-substrate `owned-by-slot`/`embeds` edges directly determine india's eval holdout and embedding source.
- post-processor (echo) — post-emitted G-code is the RL/outcome surface; echo's emissions are india's reward labels.
- mill/lathe/wedm/cam/speed-feed/quoting — each clones india's self-improving AI template; india owns the retrain cadence, drift thresholds, and model rollout — domains optimize per-domain, learning signal flows through india.
- cad (delta) + tribal-knowledge + corpus-aggregation + mit-curriculum — feed the RAG/training corpus (CAD classifier, cited tribal tips, aggregated/ported algorithms).

**Top 3 gaps blocking the goal:**
1. **Reference pool is empty (poolSize 0)** — `nn-graph-eval.buildHoldout` can't score a real holdout, so the deploy gate is permanently DEFERRED; the May-23 seed exists but a fresh post-seed `runAssessment` was never run to clearance.
2. **Heterophily collapse keeps AUROC below gate** (~0.388 on 768d, ~0.5 on the 8-dim classifier) — the H2GCN aggregator lever is wired/available but not yet applied to lift the model above 0.78.
3. **No per-galaxy SVI instrument + only 2 of N domain LoRA stacks built** — india's own psi/gap is invisible (only system-wide 1.0 exists), and the "every domain clones india" mandate is half-met (lathe+mill LoRA only; wedm/cam/quoting/sfc templates still owed).

## KILO — cam galaxy goal
**North-star goal:** Be PRISM's universal CAM brain — turn a recognized CAD feature set into a physics-validated, collision-checked toolpath strategy for ANY seat (Fusion, hyperMILL, Mastercam, NX, PowerMill, SolidCAM) and ship it as a live in-seat "Speed&Feed / Auto-program / Post via PRISM" add-in button. The end-state: an operator clicks one button in their existing CAM seat and PRISM emits a calibrated, gouge-free program.

**Current state:** Built — 71 top-level `CAM*.ts` engines + 68 hyperMILL bridge engines, 3 dispatchers (`prism_cam`, `camFunctionDispatcher`, `prism_toolpath`), `CAMAGIMasterOrchestratorEngine` + `CAMKernelEngine` (DXF/SVG/NL→strategy) + `CAMCrossSystemTranslatorEngine` (cross-vendor), 928 real-data CAM tribal tips, `ToolpathStrategyDB` (586 entries) + `CAMSystemDB` (61). No per-galaxy SVI exists — system SVI is global (`svi_display 1.2×10^46`, `psi_reachability 1.0`); the honest CAM proxies are the pipeline reachability scores: MillTurn 0.92, MultiAxis 0.91, PrintToProgram 0.90 (strong) vs Grinding 0.52 / EDM 0.38 (weak). Galaxy CLAUDE.md/MEMORY.md are still flagged HONEST STUB (no cam-soul slot was formally assigned; kilo runs it de-facto).

**PRISM app features (this domain delivers to the product):**
- Physics-aware strategy pick (`cam_strategy_recommend`), toolpath generation (`toolpath_generate`), mandatory `collision_check_full` clearance gate, 5-axis swarf/contour with singularity check (`cam_multiaxis_recommend`), cross-vendor translation (`cam_cross_translate`)
- Still needed: the MS-CAM-MASTERY add-in buttons — Fusion `U-CAMM-FUS-D1/D2/D3` (Speed&Feed / Auto-program / Post via PRISM, Revenue Day 1) + Mastercam 3-button bridge (`mastercam_addin_generate`); per-seat function-index completeness (Fusion/hyperMILL/Mastercam/Inventor pillars A/B still open)

**Training plan (self-improving AI to perfect):** Clone india's template — `CAMFeedbackLoopEngine` already taps the closed loop: every recommendation publishes `xproc_outcome_publish {slot:'kilo',domain:'cam'}`, emits strategy embeddings via `xproc_kg_project_features` for india's GNN tier-5, and records actuals via `xproc_calibration_monitor_record` so india's drift-canary fires retrain. Corpus = 928 catalog-traced tribal tips + `CAM_TRIBAL_RAG_INDEX.json` (5.3M) + Mastercam/hyperMILL/OPEN MIND PDF corpus + JM Die Fusion/Roku-Roku CAM templates. Per-seat LoRA adapters are scoped (hyperMILL pillar C, Mastercam pillar C). Transfer-domain similarity (cosine over strategy vectors) is the mastery lever: learn one seat's strategy choice, transfer to all.

**SVI-to-perfect path (psi -> 1.0):** (1) Lift the weak CAM-adjacent pipelines — EDM 0.38 / Grinding 0.52 / Laser 0.37 — by wiring their strategy stages into `cam_strategy_recommend` keyed by machine-domain. (2) Close the per-seat function-index gaps so every vendor dialog input maps to a wiki entity (Fusion/hyperMILL/Mastercam pillars A/B). (3) Prove each strategy terminates losslessly into echo's post (strategy+tool-list+WCS) so MultiAxis/MillTurn reachability holds at >0.9 end-to-end. (4) Calibrate the india loop to GREEN drift so recommendations are measured-actual, not modeled.

**Synergy edges (build-with-synergy):**
- cad (delta) — CONSUME recognized features: `feature_recognize` → feature set → `cam_strategy_recommend` (delta declares cam back, symmetric)
- post-processor (echo) — PRODUCE toolpaths echo CONSUMES → vendor G-code; `toolpath_generate`→NCI/APT→post emit must be lossless (echo declares kilo)
- speed-feed (oscar) — CONSUME oscar's calibrated feed/speed per `ToolpathBlock`; the Fusion "Speed&Feed via PRISM" button is literally oscar's SFC surfaced in-seat
- mill/lathe/wedm (foxtrot/whiskey/mike) — PRODUCE per-domain strategies keyed by machine-domain; india (ai-training) — feed strategy embeddings to the GNN closed loop

**Top 3 gaps blocking the goal:**
1. No shipped in-seat add-in button — MS-CAM-MASTERY Fusion D1/D2/D3 + Mastercam D are still pending; this is the Revenue-Day-1 deliverable and it's not built.
2. Galaxy CLAUDE.md/MEMORY.md are HONEST STUBs with no formally-assigned cam-soul slot — governance/ownership gap (kilo runs it de-facto only).
3. Weak CAM-adjacent pipeline reachability (EDM 0.38, Laser 0.37, Grinding 0.52) — strategy stages for non-mill processes aren't wired into the CAM strategy recommender, capping psi below 1.0 system-wide.

## LIMA — academy galaxy goal
**North-star goal:** Be PRISM's self-compounding learning factory — auto-build verified, prereq-correct, dispatcher-cited courses + role/machine-aware certification paths from PRISM's own corpus (JM-Die PDFs, MIT-OCW, tribal tips), so every operator/apprentice ramps to mastery and every learning outcome feeds back into the fleet's training data. The academy should make PRISM teachable, not just usable.

**Current state:** Real galaxy — 27 academy engines present (`CurriculumEngine`, `CourseBuilderEngine`, `LearningPath/Progression/Adaptation/Loop/CascadeEngine`, 6× `MITCourse*` + `MitCourseIndexEngine`, `InstructorDashboardEngine`, `VideoLearning/VideoELearningAIEngine`, `Training*` cluster), 37 courses wired in `CurriculumEngine` vs 29 `course-*.ts` catalog files (drift — catalog < wired suggests some wired courses lack catalog modules or count rot), academy actions across 5 dispatchers (`prism_knowledge` academy_/course_/learn_course_*, `prism_dev` mcfi_/mcdl_, `aiReasoning` video_elearning_, `business` learning_, `operatingSystem` course_). Corpus: pypdf `jm-die-corpus-pages.jsonl` (8,752 pages/73 PDFs); MIT-OCW dir is EMPTY (harvest-on-demand). **No per-galaxy SVI line exists** — `state/shared/SVI.json` is fleet-aggregate only (svi 1.2×10^46, psi_reachability 1.0, "Tests" subsystem 4,406 entries is the closest academy-adjacent dimension); qualitative path below.

**PRISM app features (this domain delivers to the product):**
- Built: course catalog + lesson/quiz rendering (`CurriculumEngine`+`LessonRendererEngine`), auto-course-build from corpus (`CourseBuilderEngine`+`learn_course_from_source`), learning-path/prereq graph, adaptive next-lesson (`LearningAdaptationEngine`), instructor LMS (`InstructorDashboardEngine` classes/grades/export), MIT-OCW query+citation (`mcfi_`/`mcdl_`), web learner surface (`web/src/components/learning/*`, `/learning/academy` route), `/pdf-learn` `/video-learn` `/ship-course-lima` intake skills.
- Still needed: live MIT-OCW harvest (dir is empty — `mit-courses-harvest` never run at scale), course→certification→role-qualification round-trip wired into the shop-floor scheduler (operator can't run a machine until certified), mobile/phone learner surface (`prism-academy-mobile-ms0` wiki exists, build status unverified), AHMAD-LLM 34-project curriculum (dormant per SCOPE-EXPANSION §Q4), and resolution of the 37-wired-vs-29-catalog drift (some courses may render thin).

**Training plan (self-improving AI to perfect):** Clone india's closed-loop template (already wired in academy CLAUDE.md §"Closed-loop integration with india"): every academy action publishes `xproc_outcome_publish {slot:'lima', domain:'academy'}`; academy assets emit features via `xproc_kg_project_features` into india's GNN tier-5; learnings captured via `prism_knowledge:tribal_capture slot=lima` (never raw markdown); recommendation actuals recorded via `xproc_calibration_monitor_record` so india's drift-canary fires retrain candidacy. The self-improving signal is **course efficacy** — quiz-pass-rate + time-to-competency + post-course on-machine outcome quality become the reward; the `Training*` engine cluster (`TrainingDatasetSnapshotEngine`/`TrainingExampleAssemblerEngine`/`TrainingLedgerEngine`/`TrainingTemplateContinuousLearningEngine`) assembles operator-outcome → LoRA/RAG training pairs feeding `lathe-lora`/`mill-lora` fine-tunes. Corpus = pypdf JM-Die 8,752 pages + MIT-OCW (once harvested) + tribal tips, retrieved via RAG, with calibration the closed loop back to india.

**SVI-to-perfect path (psi → 1.0):** No academy SVI subsystem exists today, so lever #1 *is* making academy SVI-visible. (1) **Register academy as an SVI subsystem** — add a "Courses/Curriculum" entry to `SVI.json` so course count × dimensions (prereq-correct, dispatcher-cited, certification-linked) becomes a measured reachability axis instead of invisible. (2) **Close the prereq + citation reachability gaps** — run `audit-academy-prereq-chain.mjs` (6 problem classes) + `audit-course-dispatcher-citations.mjs` to zero; a course citing an action that doesn't exist is the academy analog of an unreachable node. (3) **Wire every course to a real consumer** — course → certification → role-academy injection (`EmployeeRoleAcademyInjectionEngine`) → shop-floor qualification gate; an un-consumed course is dead weight. (4) **Resolve the 37-vs-29 catalog drift + harvest MIT-OCW** so the catalog is complete-by-construction, not partial.

**Synergy edges (build-with-synergy):**
- **mit-curriculum / pdf-corpus / corpus-aggregation** — academy is the CONSUMER: these galaxies ingest raw sources (MIT-OCW, the 8,752-page pypdf JM-Die corpus); academy must never re-OCR, only consume their output via `CourseBuilderEngine`. `galaxy-knows-map who academy` confirms mit-curriculum + pdf-corpus as top edges.
- **ai-training (india)** — academy clones india's self-improving template AND feeds it: course-efficacy outcomes → india's GNN/LoRA retrain loop; defer all retrain-trigger/rollout decisions to india's surfaces.
- **business / HR (hotel)** — `EmployeeMachineDomainAcademyEngine` + `EmployeeRoleAcademyInjectionEngine` bridge role/machine training assignment, certification windows, on-hire/on-promotion course injection.
- **mill / lathe / wedm (foxtrot/whiskey/mike)** — per-machine training tips + qualification matrices flow FROM each machine galaxy INTO academy courses; SFC/speed-feed (oscar) supplies course content too.
- **cad (delta)** — CAD examples → training corpus (`cad ↔ academy` edge in ALL-CARDS).

**Top 3 gaps blocking the goal:**
1. **No per-galaxy SVI signal** — academy progress is invisible in `SVI.json` (fleet-aggregate only); can't measure psi→1.0 without registering a Courses/Curriculum subsystem with reachability dimensions.
2. **MIT-OCW corpus never harvested at scale** (`mcp-server/data/extracted-knowledge/mit-courses/` EMPTY, harvest-on-demand) + 37-wired-vs-29-catalog course drift — the content backbone is partial, so courses risk thinness/uncited actions.
3. **Course → certification → shop-floor qualification loop not closed** — courses exist but aren't gated into role-academy injection + the live scheduler, so the academy doesn't yet change who runs which machine (the feature that makes learning load-bearing for the product).

## MIKE — wedm galaxy goal
**North-star goal:** Make wire-EDM PRISM's deepest, fully-closed-loop domain — print-to-EDM-program (drawing in → physics-validated, vendor-dialect G-code out) for rough+skim+taper+no-core cuts with a self-improving discharge-physics AI that learns from every JM Die cut, so the EDM pipeline reaches reachability 1.0 (today 0.38).

**Current state:** Massive surface, weakest wiring. 146 `WEDM*` + 19 `EDM*` engines on disk, `edmDispatcher.ts` with ~50 actions (396 case/literal markers). EDM pipeline = 8 stages but only 2 registries connected (`materials`, `machines` — no `tools`/wire registry), 6 physics formulas, 6 controller dialects. **EDM reachability 0.38 in live `SVI.json` (lowest of all 9 pipelines; fleet `psi_display` 100% is reachability-normalized and hides this), target 0.72 in `SVI_TARGET_BREAKDOWN.json`.** Both galaxy `CLAUDE.md` and `MEMORY.md` are still alpha-authored **honest stubs** — §5 gotchas and §6 tribal pointers are deliberately empty (no wedm-specialist soul has filled them); MEMORY.md self-flags "STUB / awaiting U-GALAXY-MS1-C1 migration + wedm-soul slot assignment."

**PRISM app features (this domain delivers to the product):**
- Built: print-to-program (`EDMDrawingInterpretationEngine`), feasibility gate (`EDMFeasibilityEngine`), multi-pass rough+skim planning (`EDMMultiPassStrategyEngine`), start-hole setup (`EDMStartHoleSetupEngine`), cut+flush params (`EDMCuttingParamFlushEngine` 71K), quality/recast/HAZ monitoring (`EDMMonitorSurfaceIntegrityEngine`, `EDMQualityOrchestratorEngine` 102K), G-code emission incl. Mitsubishi MV1200R master post (`EDMPostProcessGCodeEngine` 126K, `MitsubishiMV1200RWireEDMMasterPostEngine`), bi-material compensation, taper/corner/slug handling, cost docs.
- Still needed: connect the wire registry into the pipeline (EDM has NO `tools`/wire-electrode registry wired — the single biggest reachability hole); extract canonical `edm-constants.ts` / `edm-wires.ts` / `edm-dielectrics.ts` (CLAUDE.md flags these as "verify likely exists" — unconfirmed, a risk); broaden controller dialects beyond 6 (Sodick/Makino/AgieCharmilles parity with Mitsubishi); a saleable WEDM Master Post product mirroring SFC/Master Post.

**Training plan (self-improving AI to perfect):** The self-improving cluster is already on disk and must be wired to india's loop, not rebuilt: `WEDMNeuralTrainingEngine`, `WEDMContinuousLearningEngine`/`WEDMOnlineLearningEngine`/`WEDMLearningLoopEngine`, `WEDMLoRAAdapterEngine`+`WEDMLoRACadenceEngine`+`WEDMLoRADatasetBuilderEngine`, `WEDMTransferLearningEngine`, `WEDMJobPatternLearnerEngine`, `WEDMTribalTipLearnerEngine`, `WEDMDriftDetectionEngine`, `WEDMNeuralFormulaFusionEngine`, plus reasoning/ledger (`WEDMReasoningTraceLedgerEngine`, `WedmTrainingPairBridgeEngine`). Per `./CLAUDE.md §Closed-loop integration with india`: publish every cut via `xproc_outcome_publish {slot:'mike', domain:'wedm'}`, emit features via `xproc_kg_project_features` for india's GNN tier-5, capture tribal via `prism_knowledge:tribal_capture slot=mike`, record actuals via `xproc_calibration_monitor_record` so india's drift-canary triggers retrain — corpus is the JM Die per-customer EDM programs at `JM DIE/<customer>/programs/`. Defer retrain-trigger/rollout design to india; clone the LoRA cadence pattern, don't roll your own.

**SVI-to-perfect path (psi → 1.0):** (1) Wire the EDM pipeline's missing registries — add the wire/electrode + dielectric registries to the 8-stage pipeline so reachability climbs off 0.38 toward 0.72 then 1.0 (the SVI_TARGET literally lists "wire engines/strategies/tribal into pipeline — massive dormant capacity"). (2) Confirm-or-extract canonical constants files (`edm-constants/edm-wires/edm-dielectrics`) and replace any inlined discharge constants. (3) Close the india feedback loop so calibration actuals flow back and lift the 6 physics formulas to validated, drift-monitored status. (4) Lift dialects 6→parity with Turning's 20 (each new validated controller post raises reachability).

**Synergy edges (build-with-synergy):**
- post-processor (echo) — every wedm toolpath terminates in EDM-flavored G-code through `EDMPostProcessGCodeEngine`; that 126K engine IS the bridge — keep dialect parity with echo's post surface (symmetric edge confirmed in knows-map and `./CLAUDE.md §7`).
- cam (delta/kilo) — EDM toolpaths originate from CAM workflows via `cam_strategy_recommend` (wedm-keyed); knows-map ranks **cam** as a top knower of wedm — wire the CAM→wedm feeder both ways.
- speed-feed (oscar) — SFC declares wedm a consumer; discharge params (wire-tension/flush/power) are the EDM analog of feed/speed — query SFC for baselines instead of re-deriving.
- quality (uniform) + shop-floor — `EDMMonitorSurfaceIntegrityEngine` feeds SPC (discharge-driven Ra gates, not feed-driven); shop-floor streams live discharge status → adaptive; both rank as top wedm-knowers in knows-map.
- ai-training (india) — owns the retrain lifecycle for the WEDM LoRA/GNN cluster above; mike feeds outcomes, india owns promotion gates.

**Top 3 gaps blocking the goal:**
1. **EDM pipeline reachability 0.38 (worst in fleet)** — only `materials`+`machines` registries are wired; the wire/electrode + dielectric registries are dormant, starving the 146-engine surface of live invocation.
2. **No wedm-specialist soul / empty doctrine** — `CLAUDE.md §5` gotchas and `§6` tribal pointers are honest stubs; the deep discharge-physics tribal knowledge (pulse-on/off, recast, taper-deflection, no-core sequencing) is unverified literature hints, not captured first-hand knowledge feeding the AI.
3. **Self-improving cluster present but loop unproven** — `WEDMNeuralTrainingEngine`/LoRA/continuous-learning engines exist on disk but the india closed-loop wiring (outcome publish + calibration record + GNN feature emission) is not verified live, so no cut actually trains the model yet.

## OSCAR — speed-feed galaxy goal
**North-star goal:** Ship the Speed & Feed Calculator as a calibrated, vendor-beating saleable subscription product — print/material/tool/machine in → physics-optimal RPM + feed + DOC/WOC out with cited uncertainty, that self-corrects against real shop actuals and out-predicts G-Wizard/HSMAdvisor across the 41K-tool / 6,509-material space.

**Current state:** Engine layer is deep and BUILT — `UltimateSpeedFeedEngine` (31 models, 401-assertion gauntlet), `SpeedFeedOrchestratorEngine` (2,851 LOC central hub), `SpeedFeedNineAxisOrchestratorEngine` (9-axis + 3 modes), ~25 `*SpeedFeed*` engines, ~50 `sfc_*`/`speed_feed_*` calc actions, tri-vendor parity comparators, and live G-Wizard/HSMAdvisor adapters+exporters (41,209 tools applied to operator's live vendor files). The galaxy `MEMORY.md`/`CLAUDE.md` are still HONEST STUBS (2026-05-27) awaiting `U-GALAXY-MS1-C1` + oscar-soul canonization. **SVI is fleet-wide, not per-galaxy** — `SVI.json` reports psi_reachability = 1.0 (100%) with SFC feeding the aggregate via Tools (95,608, 100% wired), Algorithms (692), Formulas (499), Engines (3,610, 88% wired); the dated `SVI_TARGET_BREAKDOWN.json` shows fleet psi 0.9766 with bottleneck = Waterjet (not SFC) and Engines wiredPct 88. No isolated speed-feed psi number exists.

**PRISM app features (this domain delivers to the product):**
- BUILT: 9-axis SFC recommendation (`prism_calc:sfc_nine_axis_run`), single-cell physics (`sfc_calculate`/`ultimate_speed_feed`), Altintas SLD chatter-stable-RPM gate, tri-vendor parity diff, machine/heat-treat-aware adjustment, CAM S/F vocab bridge (6 systems), G-Wizard/HSMAdvisor library+machine export, lathe CSS/G96 facade family with max-RPM cap
- BUILT: `MS-CAM-MASTERY` Fusion add-in pillar D — "Speed&Feed via PRISM" button → calibrated SFC (tier-gated, ships Revenue Day 1)
- NEEDED: closed-loop calibration product (`MS-SFC-CALIBRATE`, 24 units, **never_started**, revenue-tier) — Stacked Bayesian Model Averaging over a regime-routed ensemble on a physics-prior backbone; this is the moat that turns physics-default into shop-calibrated
- NEEDED: per-vendor S/F extraction backlog — 44 HIGH/not-ingested catalogs → `<vendor>-speed-feed-data.ts` (worklist: `catalog-sfc-extraction-manifest.json`)

**Training plan (self-improving AI to perfect):** Clone india's fleet learning loop (already declared in CLAUDE.md §"Closed-loop integration with india"): every recommendation publishes `xproc_outcome_publish {slot:oscar}`, emits features via `xproc_kg_project_features` (feeds india's GNN tier-5), records actuals via `xproc_calibration_monitor_record` so the drift-canary triggers retrain candidacy. SF-AI L1/L2/L3 engines (`SpeedFeed{AdvancedAI,DeepLearning,UltimateAI}Engine`) host per-material LoRA models; corpus = 41,192 deduped tools + 6,509 materials + hypermill materials catalog (Kienzle/Johnson-Cook) + JM Die NC program S/F mining + tribal cited-tips. Calibration backbone = MS-SFC-CALIBRATE's regime-routed Bayesian ensemble. Defer all retrain-trigger/rollout decisions to india's surfaces — do not roll your own.

**SVI-to-perfect path (psi → 1.0):** Because SFC feeds fleet psi (not its own), the levers are wiring + reachability, not new physics: (1) lift **Engines wiredPct 88 → 100** by wiring the ~25 SFC engines through every natural consumer (the fleet "Engines" subsystem is rank-2 gap at 905 reachable-units); (2) ingest the 44 outstanding vendor catalogs so the Tools/Formulas reachable space grows with real cited S/F data, not defaults; (3) ship `MS-SFC-CALIBRATE` so recommendations carry calibrated (not just physics-prior) confidence — raising the intelligence-category reachability; (4) close oscar↔consumer synergy edges (see below), since the knows-map shows speed-feed's cross-galaxy edges at weight 0.71 (under-declared) vs its own 8.53.

**Synergy edges (build-with-synergy):**
- **post-processor (echo)** — `cam_speed_feed_bridge` injects SFC feed/speed per NC block (`ToolpathBlock` → NC); symmetric edge already declared (echo declares oscar). Keep the S/F-per-block path the canonical one so every emitted program carries calibrated parameters.
- **mill / lathe / wedm (foxtrot / whiskey / mike)** — every cutting engine must query SFC, not re-derive; `SpeedFeedPropagationBridgeEngine` fans out to all three + print_to_program. Lathe shares the CSS/G96 max-RPM-cap facade.
- **ai-training (india)** — LoRA per-material models + GNN tier-5 features + drift-canary retrain; oscar is a producer into india's loop (clone, don't fork).
- **quoting (charlie)** — `SpeedFeedPropagationBridgeEngine` already carries MRR → cycle_min into charlie's quoting (there is no dedicated oscar→quote bridge); cycle-time accuracy is the SFC→revenue link.

**Top 3 gaps blocking the goal:**
1. **`MS-SFC-CALIBRATE` (24 units) never_started** — without the Stacked-Bayesian regime-routed calibration ensemble, the product ships physics-defaults, not shop-calibrated values; this is the saleable differentiator and is wholly unbuilt.
2. **Galaxy brain is still a stub** — `MEMORY.md`/`CLAUDE.md` await `U-GALAXY-MS1-C1` + oscar-soul canonization; the deep engine layer exists but isn't backed by a populated per-domain brain, so cross-session recall and the india closed-loop are declared-but-not-fully-lived.
3. **Vendor S/F extraction backlog + 88% engine wiring** — 44 HIGH-priority catalogs not yet extracted into `<vendor>-speed-feed-data.ts`, and ~12% of fleet Engines remain unwired; both cap the reachable-variability that closes the fleet psi gap and keep coverage on physics-priors instead of cited real data.

## ROMEO — wiring galaxy goal
**North-star goal:** Drive every built engine, algorithm, formula and tribal tip to invokable-via-MCP-dispatcher status so zero capability sits dormant on disk — turning PRISM's `~97%` dispatcher coverage into a sustained `100%`, where the only orphans are intentional, `WIRE-EXEMPT`-tagged singleton wrappers.

**Current state:** 3676 engines wired & ready · **110 engines built-but-UNWIRED** (no dispatcher reference) · **97% dispatcher coverage** (3676 of 3786 domain-tracked). Galaxy itself is freshly scaffolded — MEMORY.md shows "No sessions yet." No standalone "wiring" SVI subsystem exists; fleet psi_reachability reads 1.0 (SVI.json) but SVI_TARGET_BREAKDOWN flags `Engines` at 88% wired (rank-2 opportunity, +0.0009 psi) and `Algorithms`/`Tribal Tips`/`Handbooks` as the real dormant-capacity gaps.

**PRISM app features (this domain delivers to the product):**
- Built: `AutoWiringEngine` (proposes dispatcher-action stubs from engine signatures), `EngineUtilizationAuditEngine` (fire-count after wiring), `DispatcherRoutingEngine` (runtime route table), `AgentSDKVerifierEngine` (post-commit wire-correctness), plus `audit-unwired-engines.mjs` table-driven scanner and `/wire-unwired` `/wiring-batch` `/wiring-potential` `/utilization-dashboard` skills.
- Needed: a closed-loop "ghost-action eliminator" (detect Zod enum actions no engine handles), an impact-ranked auto-wire queue that wires highest-leverage orphans first (callers × test-coverage × domain-leverage), and a self-healing regression watch so a wire that silently no-ops gets re-opened.

**Training plan (self-improving AI to perfect):** Clone india's loop (per CLAUDE.md §Closed-loop integration): every wiring publishes `xproc_outcome_publish {slot:'romeo'}`, emits features via `xproc_kg_project_features` into india's GraphSAGE tier-5 classifier, captures learnings via `prism_knowledge:tribal_capture slot=romeo`, and records actuals via `xproc_calibration_monitor_record`. The GNN learns to *predict the correct target dispatcher* for an unwired engine (the NN-GRAPH tier-5 "UNKNOWN ghost.unwired-engine → dispatcher" classifier is the natural training target) — corpus = the historical wire-commits; RAG over `DISPATCHER_DIGEST.md` + prior wiring patterns; closed-loop calibration on whether wired actions actually fire.

**SVI-to-perfect path (psi -> 1.0):** (1) Wire the 110 unwired engines in batches of ≤5/commit (Other:21, Speed:6, Monolith:5 lead) — closes the rank-2 `Engines` 88%→100% gap. (2) Wire dormant Algorithms (85%→100%, rank-3) and Tribal Tips (80%, rank-1, biggest opportunityScore 0.79) into their consumer dispatchers. (3) Purge ghost actions from Zod enums so coverage isn't inflated by lies. (4) Land round-trip E2E tests so `stop_on_unwired_assets` stays green and the wire can't silently regress.

**Synergy edges (build-with-synergy):**
- discovery (tango) — tango's `audit-unwired-engines.mjs` / `audit-orphan-inventory.mjs` IS romeo's punch list; tango surfaces candidates, romeo closes them.
- bug-hunting (uniform) — romeo wires, uniform verifies the wire isn't a silent no-op; hand-off romeo→uniform on every batch commit.
- backend-helper (papa) — co-design dispatcher signatures with papa so wirings don't break tsc on >5000-line dispatchers.
- system-viz (sierra) — wired-vs-unwired status feeds the L7→L6 graph layer; sierra renders the orphan punch list.
- dormant-data (victor) — victor's "no-consumer" data findings route into romeo's wiring backlog (symmetric PSN edge).
- india (ai-training) — romeo feeds wire outcomes into india's GNN; india returns the tier-5 target-dispatcher predictions romeo wires against.

**Top 3 gaps blocking the goal:**
1. **110 engines still unwired** and the galaxy has zero shipped wiring sessions (MEMORY.md "No sessions yet") — the core mission hasn't started executing.
2. **No standalone wiring SVI metric** — psi_reachability shows a misleading 1.0 while SVI_TARGET_BREAKDOWN shows Engines/Algorithms/Tribal dormant; romeo can't measure its own progress-to-perfect without a wiring-specific reachability score.
3. **Ghost-action / silent-no-op risk uninstrumented** — no built surface yet to detect Zod enum actions with no handler or wires that pass tests by importing the engine directly (the silent-success-on-broken-wire class flagged in MEMORY.md's regression watchlist).

## SIERRA — system-viz galaxy goal
**North-star goal:** Be PRISM's single, always-fresh, always-trustworthy fleet brain map — one canonical 244K-node `system-graph.json` that renders every remaining unit as a ghost roost AND serves as the search substrate every other slot's master-index/awareness/pre-tool hooks resolve against, with zero silent degradation. When sierra's graph is wrong, fleet-wide search is wrong; the goal is that it never is.

**Current state:** Built + owned (slot:sierra, 2026-05-29). Invokable surface: `MasterIndexEngine`, `GraphImportanceEngine` (personalized PageRank), `VizAutoAugmentationEngine`, `GraphTheory`/`GraphAlgorithms`/`SpectralGraph`/`HybridIndex`/`RankedHybridGraphSearch` engines, ~48 `generate-*-features.mjs` ghost-roost generators, `regen-viz.mjs` as the ONE canonical writer (~7 min/run). Global SVI is `psi_reachability = 1.0` (100%, SVI 1.2×10^46) — but that is the *system-wide registry/pipeline* score; there is **no per-galaxy system-viz SVI row** (system-viz is the substrate the SVI renders, not a scored subsystem). `BUILD_STATE`: `SYSTEM-VIZ-BRAIN-MS0 = completed / in_progress_real / claims_completed_but_units_pending`. Live operational gap: recurring merge-augmentations OOM (exit 134) on the 548MB graph.

**PRISM app features (this domain delivers to the product):**
- Built: `/system-viz` 3D 10-layer + 21-roost map, `/master-index` + `/utilization-dashboard` + `/orphan-inventory` + `/deep-search`, `system-viz-query find <noun>` viz-first CLI, pre-bash/grep/read/write graph-inject nav hints, node→repoPath template (`→ Read <repoPath>`).
- Still needed: OOM-proof streaming merge so all 49 roosts splice reliably; a customer-facing/operator dashboard view of the graph (today it's a dev-fleet tool, not a product surface); live diff/delta view between regens; graph-backed "what-changed since" feed.

**Training plan (self-improving AI to perfect):** Clone india's closed-loop template (per `PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`). Sierra **produces** the labeled substrate — `seed-ghost-from-unwired.mjs` ref-pool + `_node-embeddings.jsonl` (768-d) + `xproc_kg_project_features` feature vectors — that **india's GNN tier-5 (GraphSAGE)** consumes for wiring-inference. The self-improving loop: ghost-roost recommendations record actuals via `xproc_calibration_monitor_record`, outcomes auto-publish via `outcome-bus-auto-tap.mjs` (`xproc_outcome_publish slot:sierra`), drift-canary fires retrain candidacy. Tango's `graph_heterophily_aggregate` (H2GCN) is the model-side lever to fix the AUROC heterophily collapse (engine↔dispatcher edges are heterophilous). Tribal learnings via `prism_knowledge:tribal_capture slot=sierra` only.

**SVI-to-perfect path (psi -> 1.0):** Global psi is already 1.0, so sierra's job is to *keep it true and auditable*, not lift it. Concrete levers: (1) kill the exit-134 merge OOM so `pendingCount=0` + `sidecarOk=true` is guaranteed every regen (R-SVIZ-1 verify-after-write) — a stale graph fakes reachability; (2) close the dual-registration gap — 9 of 49 generators are in FAST[] but unspliced → their ghost data is silently dropped (only 2/9 wired, 7 blocked on the OOM); (3) raise india's GNN AUROC off its heterophily collapse via the seed-ghost ref-pool + heterophily aggregator so unwired-engine classification becomes load-bearing; (4) drive fsCoverage/dead-pixel count to zero via `system-viz-dead-pixel-detector` + `type-backfill`.

**Synergy edges (build-with-synergy):**
- **india (ai-training)** — sierra PRODUCES graph + `seed-ghost` ref-pool + 768-d embeddings; india's GNN tier-5 CONSUMES them. This is the keystone bidirectional loop; fixing the OOM directly unblocks india's retrain.
- **golf (fleet-hygiene)** — golf QUERIES the system-graph for orphan/utilization classification and reaps sierra's `.tmp.system-graph.json.<pid>` + `.partial` OOM scratch. Symmetric.
- **tango (discovery)** — discovery RUNS on the system-graph; tango wired `graph_heterophily_aggregate` for sierra's heterophilous topology.
- **alpha (token-optimization)** — alpha audits sierra's call-graph for token-waste hotspots.
- **delta (cad) + echo (post-processor) + all 26 slots** — their ghost nodes flow through merge-augmentations; every slot's master-index/awareness/pre-tool hits resolve against sierra's graph.

**Top 3 gaps blocking the goal:**
1. **Merge-augmentations OOM (exit 134)** on the 548MB graph — the dominant failure: V8 ~512MB string-cap on stringify/parse blocks reliable regen, leaving the canonical writer fragile and 7 ghost roosts unsplice-able. Needs a streaming/chunked merge.
2. **Dual-registration gap** — 9 of 49 `generate-*-features.mjs` are in regen-viz FAST[] without a `merge-augmentations.mjs` splice block, so their data is silently discarded (only quoting+hotel wired; 7 blocked by gap #1).
3. **GNN model-side not yet load-bearing** — india's tier-5 AUROC is collapsed (heterophily, ~0.096–0.388 historical, <0.78 gate) and the deploy gate defers on insufficient reference-pool (poolSize 0); sierra's substrate is ready but the consumer can't yet certify, so the closed learning loop is open. (Plus the non-blocking ENGINE_DIGEST gap: MasterIndex/GraphImportance/VizAutoAugmentation/HybridIndex engines are under-discoverable.)

## WHISKEY — lathe galaxy goal
**North-star goal:** Turn any turned-part print/CAD into a physics-validated, crash-safe, controller-ready lathe program (OD/ID turning, threading, parting/grooving, hard-turn, Swiss + mill-turn) for JM Die's 100%-Okuma-OSP fleet — every emit cleared through chuck/spindle/CSS safety gates and improved by a self-learning AI calibrated on real A/B shop programs.

**Current state:** Large built surface — ~194 `Lathe*.ts` engines + ~57 turning-family (`Turning*`/`Okuma*`/`Swiss*`/`HardTurn*`), `turningDispatcher.ts` = 373 actions + 3 sub-dispatchers (`turningProgram`14/`thread`17/`threadingPipeline`3). SVI: no per-galaxy psi exists; the lathe-relevant **Turning pipeline reachability = 0.74–0.78** (vs MillTurn/PrintToProgram 0.92–0.94) — that is the gap to close. Fleet psi is 0.9766 (target breakdown) / reachability 1.0 (latest SVI.json). `LATHE-MASTER` envelope shows drift (`not_started` but has shipped units). The full 6-file galaxy brain lives only in `H:/prism-slot-whiskey` (unmerged) — shared tree has stale CLAUDE+MEMORY.

**PRISM app features (this domain delivers to the product):**
- Built: print/CAD → lathe program (`LatheAutoQuoteFromPrintEngine` + `turningProgramDispatcher` ISO 286/2768 feature taxonomy); 3 pre-emit safety gates (`lathe_safety_predicate_evaluate`, `lathe_partoff_safety_gate`, `lathe_workholding_select_jaw`); G96/G50 CSS-cap + G76/G92 threading + G75 peck-groove validation; MCP-independent `/lathe-lint` (8 physics/safety gotchas); JM Die program upgrader v2; 14-vendor insert/holder catalogs (Sandvik/Tungaloy/Kennametal/ISCAR/Korloy); hard-turn + Swiss + diamond-turn ops.
- Still needed: merge the 6-file galaxy brain to shared tree; lathe Master Post productization parity with mill/SFC saleable surface; close the Turning-pipeline reachability gap (registries + dialect coverage) toward MillTurn's 0.92.

**Training plan (self-improving AI to perfect):** Lathe owns a self-improving AI cloned from india's template — the `LatheAI*` stack (Orchestration 77K / Reasoning 38K / Ultra 68K / ActiveLearning 76K / Attention 88K / Anomaly 79K / Bayesian 64K + ContinuousLearning + AGISafetyContainment). LoRA-class learners trained on the **14,475 JM Die CNC-LATHE A/B pairs + 31-customer Okuma-native corpus + 432 tribal videos + CNCCookbook lathe tips**; closed-loop per india's `PER-SLOT-CLOSED-LOOP-INTEGRATION`: publish via `xproc_outcome_publish {slot:whiskey}`, emit features for india's GNN tier-5 via `xproc_kg_project_features`, capture tribal via `prism_knowledge:tribal_capture slot=whiskey`, record actuals via `xproc_calibration_monitor_record` so drift-canary fires retrain at the right time. Bayesian-opt over feed/speed/DOC + active-learning uncertainty sampling drive to mastery; defer retrain/rollout decisions to india.

**SVI-to-perfect path (psi → 1.0):**
1. Raise Turning pipeline reachability 0.74 → ~0.92 by connecting the 4th registry (strategies) into the Turning stages, matching MillTurn's registry breadth.
2. Wire the dormant lathe engines/algorithms/strategies into the Turning pipeline (Engines 88% / Algorithms 85% / Strategies 90% wired in the breakdown — the top dormant-capacity levers fleet-wide).
3. Fix `LATHE-MASTER` envelope drift (close-out the shipped units so MILESTONE_PROGRESS reflects reality) and merge the unmerged worktree galaxy brain so discovery is not blind.
4. Lift Turning controller-dialect coverage and expand calibrated outcome volume so the AI's predictions are reachable end-to-end.

**Synergy edges (build-with-synergy):**
- mill (foxtrot) — mill-turn handoff via `Fusion360MillTurnBridgeEngine` / `HyperMillMillTurnBridge`; sub-spindle phase + live-tooling C-axis polar must stay in lockstep (MillTurn pipeline already 0.92).
- speed-feed (oscar) — every lathe cutting engine CONSUMES SFC for CSS/IPR (Kienzle/Taylor shared constants, never forked).
- quoting (charlie) — `LatheAutoQuoteFromPrintEngine` → print-to-quote; `LatheActualCostReconciliationEngine` → quoted-vs-actual loop.
- business/ERP (hotel) — `LatheActualFeedback` → `ERPCostFeedbackEngine` (symmetric, business declares lathe back).
- ai-training (india) — lathe LoRA/GNN feature emission + calibration + retrain governance.
- shop-floor + quality + compliance-safety — live status → adaptive engines; Cpk/SPC post-turn gate; S(x) gate on every emit.
- post-processor (echo) — every toolpath terminates in an Okuma OSP post (shared `JM DIE/POST PROCESSORS` corpus).

**Top 3 gaps blocking the goal:**
1. Turning pipeline reachability stuck at 0.74–0.78 (4th registry + dormant engine/strategy wiring not connected) while MillTurn/PrintToProgram are at 0.92–0.94.
2. Galaxy-brain split-brain: the full 6-file brain + slot lint tooling live only in unmerged `H:/prism-slot-whiskey`, so shared-tree discovery is stale (CLAUDE+MEMORY only) — and `LATHE-MASTER` envelope drift hides shipped units.
3. Self-improving AI not yet at calibrated-mastery: the large `LatheAI*` stack exists but needs the closed-loop calibration volume (real-actuals via `xproc_calibration_monitor_record`) and india-governed retrain to move from built to proven; lathe Master Post not yet at saleable parity with mill/SFC.

## XRAY — blueprint-vision galaxy goal
**North-star goal:** Be PRISM's universal front-door: turn any unstructured manufacturing input (raster blueprint, multi-print PDF container, raster scan, native CAD file) into clean, mm-normalized, per-field-confidence-scored structured data (features, dimensions, GD&T/FCF callouts tied to datum schemas, tolerances, geometry) — at 100% corpus coverage with no silent corruption — so every downstream galaxy (CAD/CAM/quoting/mill/lathe/WEDM) feeds on trustworthy extraction.

**Current state:** Galaxy fully built + asset-verified 2026-05-29 (PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY); BUILD_STATE shows Blueprint 11 total / 10 wired / 1 pending = **91% wired**. ~30 verified engines (`BlueprintVisionOCREngine` 37.9K primary, `BlueprintOCREngine`, `PDFBlueprintDimensionExtractorEngine`, `PDFBlueprintPatternRescueEngine`, `BlueprintExtractionRAGEngine`, `BlueprintProgramJoinEngine` 45.4K, GD&T/tolerance chain, per-format CAD parsers). Primary surface is `cadDispatcher.ts` (~40 actions). No per-galaxy SVI exists — `SVI.json`/`SVI_TARGET_BREAKDOWN.json` are fleet-level (system psi 0.9766, keyed by subsystem not galaxy); the relevant gap-bearing subsystems for this domain are Engines (88% wired) and Handbooks (78%).

**PRISM app features (this domain delivers to the product):**
- Built: multi-print PDF split (8,154 containers → 36,638 prints via `extract-jm-die-corpus-page-by-page.py`), `cad_pdf_blueprint_extract` + `cad_pdf_pattern_rescue_extract`, GD&T callout parse + FCF datum-tie validate (`cad_gdt_callout_parse`/`cad_fcf_validate`), tolerance stackup/IT-grade/fit, per-format native CAD parse (DXF/SVG/STEP/STL/FreeCAD/Fusion), feature recognition, `blueprint_to_quote` + `print_to_program_full` bridges, vision-OCR A/B model gate (`bench-vision-ocr-ab.mjs`, built 2026-06-03)
- Still needed: native readers for SAT, OBJ, FBX, X_T (Parasolid) — standing gap; the empirical vision-OCR A/B benchmark run (pending a quiet fleet — vision cold-load starves under live ollama contention); Polish/Spanish annotation OCR handling (JM Die shop-floor languages); close the last 1 pending Blueprint asset

**Training plan (self-improving AI to perfect):** Clone india's closed-loop template (per `PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`): every action publishes via `xproc_outcome_publish {slot:'xray'}` (auto-tapped by `outcome-bus-auto-tap.mjs`); assets emit features via `xproc_kg_project_features` for india's GNN tier-5 classifier; learnings via `prism_knowledge:tribal_capture slot=xray` (never raw markdown); calibration actuals recorded via `xproc_calibration_monitor_record` to drive india's drift-canary retrain candidacy. Domain-local loop already runs LoRA training-set prep (`BlueprintLoRABridgeEngine`: `blueprint_lora_prepare_set/export`), RAG-assisted extraction (`BlueprintExtractionRAGEngine`), coverage-audit/flag-retrain (`BlueprintCoverageAuditEngine`), and closed-loop OCR calibration (`ocr-closed-loop.mjs`). Corpus is real: JM Die DocuStrata 257,992 files (already indexed — search, never re-OCR per R8) + 406 customer print dirs.

**SVI-to-perfect path (psi → 1.0):** (1) Wire the 1 pending Blueprint asset → 100% domain wiring. (2) Run the vision-OCR A/B benchmark on a quiet fleet and promote the winning model so OCR confidence rises measurably (closes the dormant Blackwell big-VRAM seam). (3) Forge/SDK-bridge the 4 missing native readers (SAT/OBJ/FBX/X_T) so format coverage is complete — eliminating silent-empty-parse failure paths. (4) Push extraction outcomes through india's calibration loop until per-field confidence floors (OCR 0.70, CAD-fidelity 0.85) are met corpus-wide with the coverage-floor guard never tripping.

**Synergy edges (build-with-synergy):**
- ai-training (india) — CONSUMES extraction outcomes for the GNN/LoRA learning loop; `BlueprintLoRABridgeEngine` feeds training sets, calibration records drive retrain candidacy (the self-improving loop owner xray defers to). Top knows-map neighbor (2.51).
- cad (delta) — delta CONSUMES xray's structured features/geometry; delta's per-CAD-system quirks inform xray's format-handling. Second knows-map neighbor (2.51).
- quoting (charlie) — CONSUMES via `blueprint_to_quote` (`BlueprintToQuoteBridgeEngine`); quote-vs-actual outcomes inform xray's confidence thresholds.
- cam (kilo) + mill (foxtrot) + lathe (whiskey) + wedm (mike) — CONSUME extracted features via `print_to_program_*` for in-domain G-code generation (the print-to-program contract).
- database-expansion (juliett) — OWNS the fast-search data layer xray queries (`jm-die-database/` 257,992 files + Docustrata `.index/`); xray SEARCHES, never re-OCRs the paid corpus, and feeds new extractions back to juliett's ingestion. NOTE asymmetric edge: juliett's CLAUDE.md does not yet list xray as a consumer — ping juliett to add it.

**Top 3 gaps blocking the goal:**
1. No native reader for SAT / OBJ / FBX / X_T (Parasolid) — forge or vendor SDK required; until closed, those formats route through lossy intermediates or fail silently (cross-check geometry-volume-vs-file-size is the only current guard).
2. Vision-OCR A/B benchmark + model promotion is unproven empirically — the harness shipped (2026-06-03) but the live run pends a quiet fleet (vision cold-load starves under ollama contention), so the OCR-confidence lift that closes the SVI gap is not yet realized.
3. No per-galaxy SVI signal exists for blueprint-vision — extraction quality is tracked in domain ledgers (`blueprint-accuracy-events.jsonl`, coverage-floor guard) but there is no rolled-up psi for this galaxy, so "progress to 1.0" can only be asserted qualitatively; the india closed-loop calibration plumbing is wired but its corpus-wide drift/coverage numbers are not surfaced as a single galaxy score.

## Cross-galaxy synergy matrix

Each row lists the 2-3 most load-bearing OTHER domains a galaxy must integrate with, and the concrete artifact/data that flows. Reciprocal edges are de-duplicated (stated once, on the producer side where natural).

| Domain | Must-integrate-with | Artifact / data that flows |
|--------|---------------------|----------------------------|
| alpha (token-opt) | india, sierra, hotel | Routing outcomes → india GNN; consumes sierra graph for waste hotspots; `CostEfficiencyBridgeEngine` token→$ into hotel ERP |
| bravo (hermes-zulu) | india, golf, Obsidian-brain | Orchestration outcomes → india; reaper coexistence with golf (CRASH_CRITICAL watch); overnight learning → Obsidian vault |
| charlie (quoting) | cad, hotel, india | Consumes cad `feature_recognize`+DFM; `QuoteToOrderBridge`→hotel work orders, `ERPCostFeedback`←hotel actuals; publishes outcomes→india |
| delta (cad) | cam, quoting, xray | `feature_recognize`→`cam_strategy_recommend`; features+DFM→charlie quote; consumes xray blueprint OCR→`cad_step_parse` |
| echo (post-proc) | cam, oscar, india | Consumes kilo toolpaths (NCI/APT/ToolpathBlock); injects oscar feed/speed per block; emits NC→india reward labels |
| foxtrot (mill) | oscar, cam, echo | Queries oscar `cam_speedfeed_compute`; consumes kilo strategy; terminates in echo `HurcoV11MillMasterPost` |
| golf (fleet-hygiene) | sierra, alpha, bravo | Queries sierra graph for orphan classify; feeds alpha rate-limit/waste findings; reaps bravo's dead-slot subagents |
| hotel (business) | charlie, quality, shop-floor | `ERPWorkOrder`←charlie / `ERPCostFeedback`→charlie; SPC/Cpk←quality; live status←shop-floor |
| india (ai-training) | sierra, echo, ALL domains | Consumes sierra graph+768d embeddings+ref-pool; echo G-code reward labels; every domain clones the loop, publishes outcomes/features |
| kilo (cam) | cad, echo, oscar | Consumes cad features→strategy; produces toolpaths→echo (lossless); consumes oscar feed/speed per `ToolpathBlock` |
| lima (academy) | mit-curriculum/pdf-corpus, india, hotel | Consumes raw corpus (never re-OCR); course-efficacy outcomes→india; `EmployeeMachineDomainAcademy` role training↔hotel |
| mike (wedm) | echo, cam, oscar | `EDMPostProcessGCode`↔echo dialect parity; `cam_strategy_recommend` wedm-keyed; discharge params←oscar SFC baselines |
| oscar (speed-feed) | echo, mill/lathe/wedm, india | `cam_speed_feed_bridge` per-NC-block→echo; `SpeedFeedPropagationBridge` fans to foxtrot/whiskey/mike; LoRA features→india |
| romeo (wiring) | tango (discovery), uniform (bug-hunt), india | Consumes tango's `audit-unwired-engines` punch list; hands wired batch→uniform verify; tier-5 target-dispatcher predictions←india |
| sierra (system-viz) | india, golf, tango | Produces graph+ref-pool+768d embeddings→india GNN; golf queries for orphan classify; tango `graph_heterophily_aggregate` |
| whiskey (lathe) | mill, oscar, charlie/hotel | Mill-turn handoff via `Fusion360MillTurnBridge`; consumes oscar CSS/IPR; `LatheAutoQuoteFromPrint`→charlie, `LatheActualFeedback`→hotel |
| xray (blueprint-vision) | india, cad, juliett (database) | Extraction outcomes→india GNN/LoRA; structured features→delta cad; SEARCHES juliett's indexed corpus (never re-OCR) |

**Strongest fleet-wide synergy spines (de-duplicated):**
1. **SFC ↔ cutting-physics spine** — oscar's `cam_speedfeed_compute` / `SpeedFeedPropagationBridge` feeds mill (foxtrot), lathe (whiskey), wedm (mike), and per-block into echo's post. No cutting engine anywhere inlines Kienzle/Taylor — all route through canonical `constants.ts` + oscar. This single spine touches 5 galaxies.
2. **CAD → CAM → post print-to-program pipeline** — delta `feature_recognize` → kilo `cam_strategy_recommend` → `toolpath_generate` → echo lossless post emit. The end-to-end product backbone; xray feeds the front (OCR→features), oscar injects mid (feed/speed), mill/lathe/wedm execute per-domain.
3. **india training-loop substrate (feeds EVERY domain)** — every galaxy clones india's closed loop (`xproc_outcome_publish` / `xproc_kg_project_features` / `xproc_calibration_monitor_record`); sierra produces the graph+embeddings india's GNN consumes; echo emissions are the reward labels. india is the universal back-edge of the fleet.
4. **system-viz / PSN shared substrate** — sierra's canonical graph IS the search substrate every slot's master-index/awareness/pre-tool hooks resolve against; golf, alpha, tango, india all read it; every galaxy's ghost nodes roost into it.
5. **quoting ↔ business ERP revenue spine** — charlie `QuoteToOrderBridge`→hotel work orders; hotel `ERPCostFeedback`→charlie actuals closes the only true outbound-revenue calibration loop. The lowest-reachability pipelines in the fleet (QuoteToShip 0.51, EDM 0.38) both live on this revenue/quoting axis.

## Fleet SVI-to-perfect roadmap

Dependency-ordered (foundations first). The recurring theme: **india's deploy gate and sierra's graph integrity are the two foundations that gate most other domains' "proven" status** — many galaxies' training loops are wired but unprovable until these clear.

**Tier 0 — Substrate foundations (unblock everyone):**
1. **[sierra]** Kill the merge-augmentations exit-134 OOM (streaming/chunked merge) so the canonical graph is reliably fresh + `pendingCount=0`. A stale graph fakes reachability fleet-wide AND blocks india's eval holdout. *Blocks: india, golf, alpha, every slot's search.*
2. **[golf]** Hold the MCP :3100 / Docker substrate (guarded MCP-only auto-restart) so `prism_*` dispatcher reachability never silently drops for all 33 galaxies at once, and master-index never degrades to BM25-only. *Blocks: every dispatcher-routed goal.*
3. **[india]** Seed ≥2 high-confidence reference ghosts (poolSize 0 → real holdout) + apply `graph_heterophily_aggregate` (H2GCN) + run fresh `runAssessment` → clear the deploy gate (AUROC ≥0.78). *Blocks: the "proven by training" half of EVERY domain's goal — mill/lathe/wedm/cam/quoting/sfc loops are wired but unprovable until this clears.*

**Tier 1 — Wiring + reachability (lift the dormant-capacity gaps the breakdown ranks highest):**
4. **[romeo]** Wire the 110 unwired engines (Engines 88%→100%, rank-2) + dormant Algorithms (85%, rank-3) + Tribal Tips (80%, rank-1 opportunityScore 0.79) into consumer dispatchers; purge ghost Zod actions. *This is the single largest reachable-units lever in `SVI_TARGET_BREAKDOWN`.*
5. **[echo]** Convert the ~14 stub-wired post engines from `method?.()` dark fallbacks to real executing calls — the literal cause of "reachable-on-paper, dark-in-practice." *Blocks: mill/lathe/wedm end-to-end print-to-program (every toolpath terminates in echo).*
6. **[hotel]** Wire the orphan `HotelERPTribalKnowledgeEngine` (17 stranded tribal cats) + extract the 6 inline financial/HR constants families. *Unblocks: charlie's calibration — hotel's `ERPCostFeedback` is charlie's only outbound-revenue ground truth.*

**Tier 2 — Pipeline reachability (close the lowest-scoring pipelines):**
7. **[mike]** Wire the wire/electrode + dielectric registries into the EDM 8-stage pipeline (reachability 0.38, worst in fleet → 0.72). *Gap also caps kilo's CAM-adjacent EDM 0.38 and echo's wire-EDM post (entirely absent today).*
8. **[charlie + hotel]** Connect QuoteToShip to the `strategies` registry + close the cost-feedback loop (0.51 → 1.0); feed charlie's 3 unconsumed data sources to training. *charlie's gap directly blocks india's quoting calibration corpus.*
9. **[whiskey]** Connect the 4th (strategies) registry into Turning (0.74 → 0.92, matching MillTurn) + merge the unmerged slot-whiskey galaxy brain + fix `LATHE-MASTER` envelope drift.
10. **[foxtrot]** Close PrintToProgram 0.90 (last unwired mill engine + `PRISM_UPGRADED/` output stage) + register VMC-05 Roku-Roku post + ship `hypermill/CLAUDE.md` sentinel (MultiAxis 0.91).
11. **[kilo]** Wire EDM/Grinding/Laser strategy stages into `cam_strategy_recommend` keyed by machine-domain (0.37-0.52 weak pipelines).

**Tier 3 — Saleable product surfaces + instrumentation (turn reachable into revenue + measurable):**
12. **[kilo + oscar]** Ship the MS-CAM-MASTERY in-seat add-in buttons (Fusion D1/D2/D3 + Mastercam) — the Revenue-Day-1 surface; oscar's "Speed&Feed via PRISM" button rides the same pillar.
13. **[oscar]** Build `MS-SFC-CALIBRATE` (24u, never_started) — the Stacked-Bayesian calibration ensemble that turns physics-default into shop-calibrated (the saleable moat).
14. **[echo]** Clear U-LEGAL-13 (re-derive dialect codes from public manuals) → ship MS-MASTERPOST (0/44) with byte-equivalence proof.
15. **[delta]** Convert CADCAM-AGI-MS0 from never_started + drive JM corpus coverage 33%→high + merge the two CAD UIs.
16. **[alpha]** Lift offload rate 11%→30% (fix the dead `ollama-route-pretooluse` 0-offload hook) + convert advisory route-nudges to binding for unambiguous cases.
17. **[india + lima + xray + romeo + golf]** Stand up per-galaxy SVI instrumentation (academy Courses subsystem, wiring reachability score, blueprint-vision psi, ai-training psi, fleet-hygiene attribution) — the cross-cutting "make progress measurable" move so every galaxy can drive its own psi→1.0 instead of inferring from the system-wide 1.0.

**Where one domain's gap blocks another's goal (explicit):**
- **india deploy gate (poolSize 0 + heterophily)** blocks the "proven training" half of mill, lathe, wedm, cam, quoting, sfc, cad, xray — all clone india but cannot certify mastery until india clears.
- **sierra merge OOM** blocks india's eval holdout (stale graph = no real holdout) — Tier-0 #1 gates Tier-0 #3.
- **hotel ERP cost-feedback (0.51)** blocks charlie's outbound-revenue calibration — charlie's MAPE is stuck at the synth ceiling (71.1%) until hotel actuals flow.
- **echo dark post surface** blocks mill/lathe/wedm end-to-end print-to-program — every toolpath terminates in echo; dark engines = dark pipeline tails.
- **mike's missing wire registry** blocks kilo's EDM CAM pipeline AND echo's wire-EDM post (absent) — the EDM axis is jointly owned.

## Synergy-first build principle

"Always build with synergy in mind" — concrete rules every slot applies on every build:

- **Wire to EVERY natural consumer, not just one dispatcher** — a new engine wires to all dispatchers that would naturally consume it in the same commit (e.g. a physics engine → `prism_calc` AND `prism_safety`). An un-consumed asset is dead weight that inflates variability without reachability; `stop_on_unwired_assets` hard-blocks the orphan case.
- **Route physics through the canonical engine, never inline** — every cutting parameter goes through oscar's SFC (`cam_speedfeed_compute`) and imports `constants.ts`; no galaxy re-derives Kienzle/Taylor/Johnson-Cook. One source of truth means a calibration improvement in oscar lifts mill, lathe, wedm, and echo simultaneously.
- **Every domain publishes outcomes to india's closed loop** — `xproc_outcome_publish` + `xproc_kg_project_features` + `xproc_calibration_monitor_record` on every recommendation; clone india's template, never fork a parallel learning loop. The fleet learns as one substrate, and india owns all retrain-trigger/rollout decisions.
- **Prefer cross-galaxy edges that lift >1 SVI** — when choosing what to build next, weight moves that unblock a downstream domain (echo's dark-engine fix unblocks mill+lathe+wedm tails; mike's wire registry unblocks kilo+echo; india's gate unblocks 8 galaxies' "proven" status). A move that lifts only its own psi ranks below one that lifts a spine.
- **Keep the producer→consumer contract lossless and symmetric** — the CAD→CAM→post pipeline must carry strategy+tool-list+WCS without loss; reciprocal edges must be declared on both sides (xray flags juliett's asymmetric edge for exactly this reason). Build the verifiable producer before its consumer (R13 logical order) — never a consumer atop an unproven dependency.
