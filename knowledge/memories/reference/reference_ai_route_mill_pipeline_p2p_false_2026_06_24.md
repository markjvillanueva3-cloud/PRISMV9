---
name: reference_ai_route_mill_pipeline_p2p_false_2026_06_24
description: "Pre-existing failing test -- ai_route_mill_pipeline P2P returns success:false from MillMasterOrchestratorFacadeEngine.orchestrate; foxtrot/mill domain, root cause NOT yet investigated."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.463Z
aliases: reference_ai_route_mill_pipeline_p2p_false_2026_06_24
---


**Pre-existing failing test surfaced 2026-06-24 (slot:papa, while working an unrelated AI-dispatcher unit). ROOT CAUSE NOT INVESTIGATED -- foxtrot/mill domain.**

`mcp-server/src/__tests__/aiReasoningDispatcher.test.ts > ai_route_mill_pipeline > "should route P2P pipeline with aluminum parameters"` FAILS: asserts `data.success === true` but gets `false` (`expected false to be true`, test line ~106).

Mechanism (verified by reading the code, NOT root-caused): the dispatcher case `ai_route_mill_pipeline` (`aiReasoningDispatcher.ts:1497`) calls `getMillFacade().orchestrate({ request_type: "print_to_program", material:"6061-T6", iso_group:"N", tool:{diameter_mm:12,flutes:4}, params:{rpm:12000,feed_mmpm:2400,doc_mm:3} })` and returns the response directly. The facade is `MillMasterOrchestratorFacadeEngine` (`getMillFacade` at `aiReasoningDispatcher.ts:1214-1220`). It returns `{success:false,...}` WITHOUT throwing `NotWiredError` (a NotWiredError would be caught at :1518 and converted to `success:true, wired:false`). So the facade's print_to_program orchestration SOFT-FAILS for these aluminum params -- the failure is INSIDE `MillMasterOrchestratorFacadeEngine.orchestrate`'s P2P chain, not the dispatcher wiring.

**NOT a papa regression:** papa's 2026-06-24 session (getDomainCorpus + ai_domain_corpus_pointers + the domain reclassifier) is purely additive to a DIFFERENT action and never touches the mill facade. This test was already failing before (zulu's handoff MEMORY_SEED also showed test-fail signals).

**Owner:** foxtrot (mill galaxy). **Next step:** trace `MillMasterOrchestratorFacadeEngine.orchestrate` print_to_program path -- find why it returns success:false for a valid aluminum P2P request (vs the steel/minimal sibling tests which are skipped only because the first `it` in the block failed). Decide test-vs-code: either the facade soft-fails a request it should handle (fix the facade), or the test expectation `data.success===true` is stale vs an intentionally-degraded P2P facade (then fix the test to assert the real degraded contract -- NEVER weaken to pass).
