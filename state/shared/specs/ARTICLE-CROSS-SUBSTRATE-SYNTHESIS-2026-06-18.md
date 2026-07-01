# Article-Driven Cross-Substrate Synthesis (2026-06-18, slot:alpha)

> Operator directive: *"make improvements across all substrates utilizing all the articles I've ever submitted. use playwright or hermes to read them."* All articles read via the Playwright MCP (X requires an authenticated browser; Grok cannot browse X live; WebFetch 402s on X).
> **Headline finding:** the corpus largely **VALIDATES** PRISM's architecture (loops>prompts, agent-swarm, memory-as-context, the 12-layer agent model are all already built). The genuinely NEW actionable gaps are concentrated in **measurement/telemetry** (alpha's token-economy + Obsidian-governance domain) and a **unifying "reviewable self-improvement" frame** (bravo/sierra). Coverage claims below are marked VERIFIED (this session / CLAUDE.md) vs APPARENT (assess before building).

## Corpus (14 articles, 1-line thesis)

| # | Source | Thesis | PRISM domain |
|---|--------|--------|--------------|
| A1 | DataChaz/2038896226297684227 | 10 token hacks (rewrite-not-followup, new chats, merge prompts, Projects-cache, User Memory, route-to-Haiku, 5h-limit, off-peak) | token-econ (alpha) |
| A2 | DataChaz/2055929071733743693 | 10 token tools (RTK, Code-Review-Graph 49x, Context-Mode SQLite-sandbox 98%, Token-Optimizer-MCP). **Reply: measure savings per completed TASK, not per prompt** | token-econ (alpha) |
| A3 | KSimback/2058262328496554021 | Hermes Agent Memory Guidebook — memory as first-class compounding infra; base-layer + pluggable providers | memory (alpha/bravo) |
| A4 | Voxyz_ai/2058222816474919343 | 12-layer agent model (surface/contract/model/runtime/interop/execution/memory/knowledge/workflow/evals/observability/governance) | architecture (all) |
| A5 | _avichawla/2049037299334472015 | RL agents 2026: RLHF->RULER, system-prompt-as-reward (Karpathy SPL) | AI-training (india) |
| A6 | cyrilXBT/2059817560988676179 | Obsidian 2nd-brain (Karpathy): thinking-partner not filing-cabinet; **value is what comes OUT; design from the output end; context quality > model > prompt** | memory (alpha) |
| A7 | humzaakhalid/2064996712910041409 | "Stop prompting, design LOOPS that prompt agents" (Steinberger/Osmani/Anthropic + Thariq Dynamic Workflows) | orchestration (zulu) |
| A8 | kirillk_web3/2057497197638242362 | Kimi 300-agent swarm: decompose->parallel->coordinator-synthesize; when massive-parallel beats small-team | orchestration (zulu) |
| A9 | mr_r0b0t/2059026191646945515 | MS Webwright: Playwright-for-agents, sessions->reusable workflows, NL E2E | frontend/E2E (quebec) |
| A10 | tonysimons_/2059119768662065523 | **Hermes Dreaming: reviewable self-improvement — "staged change beats silent mutation"; the problem is TRUST not intelligence; a receipt layer (scan->stage->artifact->diff/validate/apply/discard + provenance + backup)** | self-improve (bravo/sierra) |
| A11 | trq212/2052811606032269638 | "HTML is the new markdown" — generate HTML not MD for AI docs | docs (low ROI; md-to-html exists) |
| (prior) | TheAhmadOsman/2058745340895870985 | (read last session) | - |
| (prior) | 0xCodez/2062127385923776831 | (read last session) | - |
| (prior) | jakobnielsenphd 2026-predictions | gatekeeper principle (informs improvement B) | intake-defense |

## PRISM coverage per theme

- **Loops > prompts (A7) / dynamic workflows:** VERIFIED COVERED — ATCS, /loop, harnessed-loops, the Workflow tool, BUILD_COMPLETE_GATE (loop-until-zero), feature-routing-graph `loopCron` axis. PRISM is a textbook implementation. No gap.
- **Agent swarm / parallel decompose-synthesize (A8):** VERIFIED COVERED — Workflow (pipeline/parallel, 16-concurrent cap), 26-slot fleet, zulu orchestrator, the brainstorm-path-forward fan-out->synthesis pattern. Bounded-concurrency is a deliberate PRISM choice (429-storm avoidance). No gap.
- **12-layer agent model (A4):** VERIFIED COVERED across all 12 (surface=CLI/quebec; contract=slot-souls+galaxy-CLAUDE.md; model=model-routing-policy; runtime=ATCS; interop=MCP+chat-bus; execution=tools/dispatchers; memory=Obsidian+MEMORY; knowledge=wiki/tribal/master-index/RAG; workflow=Workflow/ATCS; evals=3-of-3+GNN-gate; observability=token-telemetry/ledgers/system-viz; governance=hooks/gates). **Use as a periodic coverage-audit scaffold.**
- **Token hacks/tools (A1/A2):** MOSTLY COVERED — RTK (have), CAG prompt-cache (=Projects-cache), model-routing Ollama->Sonnet->Opus (=route-to-Haiku), 5h-limit-tracker (have), memory (have). **GAP: see Improvement #1.**
- **Memory-as-context / output-end (A3/A6):** PARTIAL — Obsidian brain + auto-feed + CAG cold-anchor + galaxy synthesis + weekly-synthesis exist. CAG hit-rate headline already measures recall. **GAP: see Improvement #2.**
- **Reviewable self-improvement (A10):** PARTIAL — dream-cycle (hermes-dream-cycle-synth.mjs), 3-of-3 scrutiny, cross-substrate ADD-only edge provenance, consensus ledger all exist as pieces. **GAP: see Improvement #3 (unify into a named receipt layer).**
- **RL / system-prompt-as-reward (A5):** PARTIAL — india has GNN tier-5 + LoRA + failure->fix feeder + outcome ledger. RULER/SPL framing could sharpen the reward signal. india's call.
- **Intake gatekeeper (Jakob Nielsen, prior):** REAL GAP — improvement B (already designed: `state/shared/specs/INTAKE-DEFENSE-WIRING-PLAN.md`).

## Ranked improvement backlog (NEW, article-driven; dedup-checked)

1. **[alpha, HIGH] Per-completed-task token accounting** (A2 reply: "measure savings per task, not per prompt"). PRISM's `ollama-offload-stats` + `psn-savings-aggregate` count saved tokens per-hook/per-prompt, NOT per task-success. A gate that cuts 80% context but makes the agent miss a file is a NET LOSS the current telemetry can't see. Add a task-success-correlated savings metric (tie savings to whether the task's tests/scrutiny passed). DEDUP: extends TokenEconomyTrackerEngine/TokenAccountingEngine (alpha's engines), not a new engine. Buildable.
2. **[alpha, MED] Obsidian "output-end" measurement** (A6: value is what comes OUT). CAG hit-rate already measures recall; extend to: synthesis-produced-per-capture ratio + "filing-cabinet detector" (memos never recalled/never linked). Surfaces whether the brain compounds or just accumulates. DEDUP: extends the CAG-stats + galaxy-synthesis surface. Buildable.
3. **[bravo/sierra, MED] Unified "reviewable self-improvement / receipt layer"** (A10: staged change beats silent mutation). PRISM has the pieces (dream-cycle, ADD-only edge provenance, consensus ledger, scrutiny) but no single "staged artifact -> diff/validate/apply/discard with provenance+backup" frame for autonomous mutations of live state (memory brain, GNN ref-pool, the 548MB graph). Assess whether the dream-cycle already stages-vs-auto-applies; if auto, add the receipt layer. Owner: bravo (Hermes) / sierra (system-viz).
4. **[B — designed, AWAITING GREEN-LIGHT] Intake PII/sanitization wiring** — `INTAKE-DEFENSE-WIRING-PLAN.md` (fail-closed on live intake; operator decision).
5. **[C — queued] Review-class cheap audit-digest** (Review Paradox) — for the `review` task class.
6. **[india] RULER/SPL reward sharpening** (A5) — sharpen the closed-loop outcome->reward signal using system-prompt-as-reward framing.
7. **[low ROI] HTML-doc generation (A11), Webwright reusable browser workflows (A9)** — tooling awareness; md-to-html already exists; revisit only if a concrete need arises.

## Improvement #1 — BUILD-READY DESIGN (corrected; enumeration done 2026-06-18)

> Per-completed-TASK token accounting + false-economy flag. Extension target VERIFIED: **`TokenEconomyTrackerEngine`** (already records per-session `TokenSpend` {sessionId, operation, tool, file, savingsSource, wasteFlags} + per-session efficiency {wasteTokens, savingsTokens}; persistent state `mcp-server/data/state/token-economy.json` schemaVersion 2.0.0). NO new engine.

**LOAD-BEARING CORRECTION (the Explore brief got this wrong — do NOT repeat):** the Explore design keyed "task" by **`programId`** via `OutcomeTrackingEngine` (`data/outcomes/outcomes.jsonl`, good/scrap/adjusted/aborted). That is the **MANUFACTURING** outcome (a machined part was scrapped) — the WRONG join for this improvement. The A2 article insight ("a context-cut that makes the agent miss a file is a net loss") is about the **DEV/coding task**, whose success signal is **scrutiny verdict / commit / tests-passed**, NOT a scrapped part. Use the DEV-task interpretation.

**Correct join (keyed by `sessionId`):**
- Token side: `TokenEconomyTrackerEngine` per-session efficiency (savingsTokens / wasteTokens), keyed by `sessionId`.
- Dev-task-success side: `mcp-server/data/state/SCRUTINY_LEDGER.json` (keyed by `sessionId`; `{opusReviewed, claudeReviewed, codexReviewed}` -> isCleared = task PASS). Secondary signals: commit presence, tests-passed.
- **FIRST BUILD STEP (verify before coding):** confirm `TokenEconomyTrackerEngine`'s per-session `sessionId` is the SAME id space as `SCRUTINY_LEDGER.json` keys (both should be the stable session id). If they differ, the join needs a session-id bridge — resolve that first or the correlation is empty.
- **[VERIFIED 2026-06-18 — THE JOIN IS EMPTY IN PRACTICE]:** `state/token-economy.json` has 100 sessions but ALL are synthetic `bulk-session-N` fixtures (ZERO real session ids); `SCRUTINY_LEDGER.json` has 435 real entries under `.entries` keyed by real sessionIds. Intersection = **0**.
- **[DEEPER FINDING 2026-06-18 — THE ENGINE IS NOT LIVE-FED AT ALL]:** grep of `recordSpend` / `token_economy_record_spending` / `tokenEconomyTrackerEngine` across the LIVE tree shows the ONLY callers are the dispatcher actions that EXPOSE it (`devDispatcher`/`businessDispatcher`/`contextDispatcher`) + the engines + tests. **No hook, no script, no PostToolUse/Stop handler calls `recordSpend` automatically** — so `TokenEconomyTrackerEngine` is populated ONLY by explicit/test dispatcher calls (hence the all-synthetic `bulk-session-N` state). The ACTUAL live savings telemetry lives in `mcp-server/data/state/ollama-offload-stats.json` (byHook) + `state/shared/dashboards/psn-savings-aggregate.json` (per-detector) — NOT in TokenEconomyTrackerEngine, and NOT per-session.
- **RE-SCOPED #1 (honest effort, R12):** #1 is therefore NOT a `MED` extension — it is a larger instrumentation build: (precursor-1) a PostToolUse/Stop hook that records per-session token usage (real stable sessionId + the turn's input/output tokens + savings attribution) into a live store; (precursor-2) THEN join that store with `SCRUTINY_LEDGER` verdicts for the false-economy metric. OR: build the correlation on the EXISTING live ledgers (ollama-offload-stats + psn-savings) — but those are per-hook aggregates, so per-TASK correlation needs the new per-session instrumentation regardless. Net: #1's article-insight ("measure savings per task") is sound but the substrate to support it does not yet exist live. Recommend operator decision before this larger build (it touches the live per-turn hot path).

**Minimal additive surface:**
- New pure method on `TokenEconomyTrackerEngine`: `tokenRoiByOutcome(period?)` -> joins each session's {savingsTokens, wasteTokens} with its scrutiny verdict -> `{passed:{count, avgSavings, avgWaste}, failed:{...}, falseEconomyFlag}`. `falseEconomyFlag = avgSavingsOnFailed > avgSavingsOnPassed` (aggressive cutting correlates with failure).
- Optional `falseEconomyFindings()` -> sessions with high savings + FAIL/no-clearance verdict.
- READ-ONLY analysis (no behavior mutation) — lower risk than B; no operator gate needed.
- Wire to a dispatcher action (verify where TokenEconomyTrackerEngine is currently exposed — likely `prism_dev` or `prism_session`; grep before adding `prism_telemetry`).
- Tests (R9, real values): passed-session-high-savings (not flagged) · failed-session-high-savings (FALSE ECONOMY flagged) · mixed aggregation (avg correctness) · empty/no-scrutiny-entry session (graceful) · schemaVersion migration. Round-trip through the dispatcher.

**DEDUP confirmed (Explore):** task-outcome tracking exists (manufacturing), per-prompt spend exists, AI-decision↔outcome correlation exists (CAMConfidenceCalibration/CAMFeedbackLoop), per-hook savings exists (ollama-offload-stats). The MISSING piece = token-spend ↔ DEV-task-outcome correlation + false-economy flag. Genuinely new, narrow, non-dup.

## Notes
- Articles confirm PRISM is AHEAD on the orchestration/loop/swarm/architecture axes — the leverage is in MEASUREMENT (improvements #1/#2) and a unifying self-improvement frame (#3), all of which compound.
- Build order suggestion (R13 logical order): #1 (alpha, self-contained telemetry) -> #2 (alpha, builds on #1's task-success signal) -> then operator-gated B/C/#3.
- #1 is design-complete + corrected + dedup-checked, BUT the empirical join verification (2026-06-18) found `token-economy.json` carries only synthetic `bulk-session-N` data (zero real session ids) so the token<->scrutiny correlation is EMPTY today. #1 now needs a PRECURSOR (real-sessionId wiring into the token-spend recorder) before the analysis method has data. Re-scoped above. Good that this was verified, not built blind.
- **APPLIED to the graph instead (this session, 2026-06-18 follow-up):** the LangChain Write/Select/Compress/Isolate context-engineering lens (sairahul1 + 0xCodez + zeuuss_01 articles) -> `CONTEXT_STRATEGIES` in `scripts/lib/feature-routing-graph.mjs` (every one of the 20 substrates bucketed exactly once; generator fail-loud-asserts no drift) + spec section 2b + JSON `contextStrategies`. 46/46 lib tests. This was the cleanest, dedup-clean, buildable application of the 3 newest articles to the routing graph.
