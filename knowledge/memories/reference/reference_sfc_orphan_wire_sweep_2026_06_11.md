---
name: reference_sfc_orphan_wire_sweep_2026_06_11
description: SFC orphan-wire sweep -- 8 disp=0 engines assessed; false WIRE-EXEMPT markers found; durable queue persisted; 2 lessons
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.186Z
aliases: reference_sfc_orphan_wire_sweep_2026_06_11
---


**SFC orphan-wire sweep (bravo cross-galaxy, 2026-06-11, "help oscar with any/all sfc work").** Audited all SpeedFeed*/SFC* engines: **8 are disp=0** (after my SpeedFeedOutcomeFeedbackBridge wire `e436c2fc3f`). Ran an 8-agent ultracode Workflow (`wf_a8ef8a75`) to classify each. Durable queue: `state/shared/specs/SFC-ORPHAN-WIRE-QUEUE-2026-06-11.md`.

**FINDING (actionable for oscar) -- FALSE `// WIRE-EXEMPT` markers:** several disp=0 SFC engines carry a line-1 `// WIRE-EXEMPT: ...` comment whose claim is FALSE -- the alleged consumers are PHANTOM (a code COMMENT, a `surfaces_into` metadata STRING, or a reverse-direction reference), NOT real imports/calls. CLAUDE.md ENGINE-WIRING requires a WIRE-EXEMPT tag to NAME the wrapper singleton; these don't. So they're genuinely dark, not exempt. Confirmed for SFCMultiHypothesisRankerEngine (grep shows ZERO real callers despite the marker) + SFCParameterRefinementEngine (only its own test references it). **A false WIRE-EXEMPT marker hides a real orphan from the unwired-engine audit** -- worth a fleet sweep for `// WIRE-EXEMPT` markers that name no wrapper.

**CONFIRMED TRUE_ORPHANs (R8-verified APIs, ready to wire next iteration):**
- `SFCMultiHypothesisRankerEngine` -- methods are **static** (`SFCMultiHypothesisRankerEngine.rank(input)` / `.isReady()` / `.getSelfAwareness()`); export `sfcMultiHypothesisRankerEngine = SFCMultiHypothesisRankerEngine` (the CLASS, so static calls are valid). rank() is SELF-CONTAINED (candidates passed inline, no bus) -> cleanest first wire. Input type is zod-inferred -- clone a valid `candidates` input from `mcp-server/src/__tests__/engines/sfcMultiHypothesisRankerEngine.test.ts`. Proposed: `sfc_rank_hypotheses` + `sfc_ranker_stats`.
- `SFCParameterRefinementEngine` -- clean instance singleton `new SFCParameterRefinementEngine()`; `computeRefinement(input)` reads the OutcomeCaptureBus (needs bus-seeded test like the OutcomeFeedbackBridge); `applyToRecommendation()`. Proposed: `sfc_parameter_refinement_compute`.
- Remaining 6 (re-verify before wiring; the *WireEngine middleware may be genuinely exempt): SFCRAGWarmStart, SpeedFeedPSNDecisionPrior, SpeedFeedPropagationBridge, SFCInferenceGateWire, SFCOutcomeCaptureWire, SFCProvenanceWire.

**LESSON 1 (confirms [[feedback_ultracode_fanout_local_gpu_not_claude]]):** the 8-agent assessment burned **887K subagent tokens** -- a mechanical read+classify fan-out that SHOULD have routed to the local GPU via `scripts/lib/ollama-fanout.mjs`, NOT 8 concurrent Claude subagents. Next SFC-orphan batch: ollama-fanout for the read/classify, Claude only for the wire judgment.
**LESSON 2 (R8):** workflow-agent specs are UNVERIFIED -- the Ranker's "singleton" turned out to be the class (static methods), the input types are zod-inferred not plain interfaces. ALWAYS grep the real export + method signatures before wiring an agent-proposed action.

Wire pattern (proven `e436c2fc3f`): clone `speedfeed_dl_stats` dynamic-import-in-case in calcDispatcher; z.enum + case; R12-safe DATA only; round-trip test via registerCalcDispatcher mock-server; `[MAIN][BOOTSTRAP-SLOT-ENFORCE]`. Coordinate with oscar (chat-bus posted). Related: [[reference_sfc_outcome_foldback_wire_2026_06_11]].

**PROGRESS (2026-06-11, slot:bravo /loop):**
- **#1 SFCMultiHypothesisRankerEngine -- SHIPPED `9aa9ce20f2`** (sfc_rank_hypotheses + sfc_ranker_stats, 8/8).
- **#2 SFCParameterRefinementEngine -- SHIPPED `ae756dcfc8`** (sfc_parameter_refinement_compute, 9/9 round-trip, 2-agent PASS). Singleton, computeRefinement reads OutcomeCaptureBus. Single action (applyToRecommendation left caller-direct -- in-process orchestrator helper). SECURITY: dispatcher forwards only validated tuning fields, NEVER params.bus/clock (proven by an injection-hole adversarial test). Round-trip test monkeypatches the SINGLETON `outcomeCaptureBusEngine.query` (CADExecutionOutcomeBusEngine.test pattern), restores in finally -> ZERO disk pollution (the bus is disk-backed; seeding the real shard would inject synthetic learning data).
- **R8 LESSON (3rd confirmation):** the blanket singleton-name grep is SHALLOW -- it reported "0 refs" for engines whose real consumers use the CLASS name (static methods). Re-grep BOTH `XEngine` + `xEngine`.
- **Reachability re-verified:** #3 SFCRAGWarmStart is LIKELY EXEMPT (the now-wired Ranker calls `SFCRAGWarmStartEngine.retrieve()`); #5 SpeedFeedPropagationBridge CANDIDATE EXEMPT (consumed by dispatcher-reachable NineAxisOrchestrator); **#6 SFCInferenceGateWire = DISCREPANCY** -- [[reference_sfc_inference_gate_wire_la1_2026_06_01]] claims it's wired via `ultimate_speed_feed` but the current cad-fusion-live-ms0 calcDispatcher has ZERO such ref (india-branch unmerged OR stale memory -- confirm, do NOT assume dark). #4/#7/#8 need deep class+singleton grep. Full state: `state/shared/specs/SFC-ORPHAN-WIRE-QUEUE-2026-06-11.md`.
