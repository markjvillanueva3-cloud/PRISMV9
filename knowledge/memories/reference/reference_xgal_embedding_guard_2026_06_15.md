---
name: reference_xgal_embedding_guard_2026_06_15
description: U-XGAL-EMBEDDING-GUARD -- wired the unwired EmbeddingGuardEngine to prism_guard; the key lesson is that "unwired engine" != "mechanically dispatcher-wireable" (5 of 6 from the audit are owned-elsewhere integration tasks)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.268Z
aliases: reference_xgal_embedding_guard_2026_06_15
---


**XGAL-WIRE/U-XGAL-EMBEDDING-GUARD** (slot:sierra, cross-galaxy authorized, 2026-06-15, commit `bb9cc7d639` on cad-fusion-live-ms0).

Operator: "continue cross galaxy work." The discovery surfaced 6 verified-unwired engines. **Only 1 (EmbeddingGuardEngine) was a genuine mechanical dispatcher wire** -- the enumeration (R13 enumerate-before-build) revealed the other 5 are NOT:

| Engine | Why NOT a dispatcher wire |
|---|---|
| BayesianAcquisitionRefiner | `refine()` input is a **function** (`acquisitionFn: (x)=>number`) -- can't cross the JSON dispatcher boundary. In-process composition helper for BayesianOptimizer; "wiring" = modify the CONSUMER engine (tango/india). |
| cycleSchedulingBridge | An **EventBus bridge** (CycleTime->Capacity->Scheduling) -- wired by EventBus registration, not a dispatcher action. |
| GrokCLIClientEngine / DeepSeekClientEngine | Octopus consensus voices needing external **creds/binaries** (grok CLI / DeepSeek API key) -- wiring = octopus pipeline (india/ai) + fail-soft verification. |
| SemanticAssetIndexEngine | Needs **Qdrant** (may be down). |

**Reusable lesson:** "unwired engine" (zero dispatcher refs) does NOT mean "mechanically dispatcher-wireable." Before wiring, categorize: (a) stateless pure capability -> clean dispatcher action; (b) in-process composition helper (function/object input) -> wire to its consumer, not a dispatcher; (c) EventBus bridge -> register with the bus; (d) external-dep client -> needs creds/service + fail-soft. Force-wiring (b)/(c)/(d) as dispatcher actions produces wrong/broken wires. The owning galaxy (india/juliett/hotel/tango) has the integration design intent.

**What shipped (the 1 clean wire):** EmbeddingGuardEngine (tiered cosine dup guard: green<0.70 / yellow 0.70-0.85 / red>0.85; exact-name fast-path -> red; embedder-offline -> yellow) was UNWIRED + had NO test. Wired to `prism_guard:embedding_guard_evaluate` beside its TF-IDF sibling `sem_sim_guard_compute`. `localEmbeddingEngine` injects directly -- its `EmbedResult {ok,vector,error}` structurally satisfies the `GuardEmbedder` interface (tsc-enforced at the `new EmbeddingGuardEngine(localEmbeddingEngine,...)` call). references pass a precomputed vector OR are embedded server-side.

**Scrutiny caught a real P1 (2-agent gate working):** the dispatcher embedded references with a SPACE-join while the engine embeds the candidate with a NEWLINE-join (`${name}\n${description}`) -> embedding-space mismatch -> biased cosine on the non-precomputed path. Fixed to `\n` + added a `vi.mock` cosine-path regression test (a space-join regression -> unmapped key -> ref skipped -> test fails). Plus fixed a stale "(8 actions)" descriptor -> `${ACTIONS.length}`.

**Verification:** 22 tests (16 engine band-logic via deterministic fake embedder + 6 dispatcher round-trip-through-the-handler incl 2 regression guards). 0-new tsc. 2-agent scrutiny PASS (re-verified after the P1 fixes). Engine test also closes the engine's prior zero-coverage gap.

Related: [[reference_sierra_do_everything_2026_06_15]] (the discovery session this continues). Pattern sibling: [[reference_post_ship_embedding-filter-wire-u-embedding-filter-wire]] (bravo wired EmbeddingFilterEngine to memoryDispatcher with an injected embedder adapter -- same fleet pattern).
