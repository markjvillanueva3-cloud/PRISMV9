# SFC Orphan-Wire Queue (bravo, 2026-06-11, wf_a8ef8a75)

8 disp=0 SFC engines assessed by an 8-agent ultracode Workflow (887K tok -- NOTE: should
have used ollama-fanout per [[feedback_ultracode_fanout_local_gpu_not_claude]]; lesson logged).
Most carried a FALSE `// WIRE-EXEMPT` marker -- the agents verified the alleged consumers are
phantom (comments / metadata strings / reverse-direction refs), not real callers.

## CONFIRMED TRUE_ORPHAN_WIRE_IT (full specs from workflow)
> **#1 SFCMultiHypothesisRankerEngine -- SHIPPED 9aa9ce20f2 (8/8 tests, sfc_rank_hypotheses + sfc_ranker_stats).**
1. **SFCMultiHypothesisRankerEngine** (711L, singleton sfcMultiHypothesisRankerEngine, roi 3, R12-safe)
   - `sfc_rank_hypotheses` -> rank(input): Bayesian arbiter ranks competing speed/feed candidates (physics+RAG+adapter sources) into one calibrated safety-shielded recommendation. Deterministic (likelihood=reward.weighted_total, no NN). Its own getSelfAwareness already declares this action.
   - `sfc_ranker_stats` -> getSelfAwareness() + isReady()
   - Phantom consumers: MultiModelConsensusEngine.ts:192 (comment), SFCRAGWarmStartEngine.ts:363 (surfaces_into metadata, reverse dir).
> **#2 SFCParameterRefinementEngine -- SHIPPED ae756dcfc8 (9/9 round-trip, 2-agent PASS). Single action sfc_parameter_refinement_compute. applyToRecommendation left caller-direct (in-process orchestrator helper, not a natural MCP surface).**
2. **SFCParameterRefinementEngine** (657L, singleton sfcParameterRefinementEngine, roi 3, R12-safe)
   - `sfc_parameter_refinement_compute` -> computeRefinement(input): median+IQR correction factors from shop-floor actuals (OutcomeCaptureBus), hard safety clamp [0.25,4.0], fail-loud on insufficient evidence.
   - ALSO has applyToRecommendation() -- candidate 2nd action.
   - Zero real consumers (fully dark). False WIRE-EXEMPT marker.

## REMAINING 6 -- re-assess directly before wiring (workflow verdicts not cleanly recoverable from temp file; classification tokens showed mostly TRUE_ORPHAN + >=1 WIRE_EXEMPT)
3. SFCRAGWarmStartEngine (377L, consumers=2) -- RAG prior retrieval; consumed by the Ranker (#1) -> may be reachable once Ranker is wired (assess).
4. SpeedFeedPSNDecisionPriorEngine (368L, consumers=2)
5. SpeedFeedPropagationBridgeEngine (537L, consumers=3)
6. SFCInferenceGateWireEngine (280L, consumers=1) -- "Wire" middleware; india wired into inference belt -> likely WIRE_EXEMPT (verify).
7. SFCOutcomeCaptureWireEngine (274L, consumers=3) -- emit-side bus writer; likely the producer for #2's bus -> verify reachability.
8. SFCProvenanceWireEngine (454L, consumers=4) -- "Wire" middleware; likely WIRE_EXEMPT (verify).

## VERIFIED REACHABILITY (2026-06-11 post-#2, R8 class+singleton grep) -- supersedes the consumer-count guesses above
> **R8 LESSON re-confirmed:** the first pass grepped only the lowercase SINGLETON name and reported "0 refs" for engines
> whose real consumers use the CLASS name (static methods). ALWAYS grep BOTH `XEngine` (class) and `xEngine` (singleton).
- **#3 SFCRAGWarmStartEngine -> LIKELY WIRE-EXEMPT (reachable).** The now-wired Ranker (#1) imports the CLASS and calls
  `SFCRAGWarmStartEngine.retrieve()` (SFCMultiHypothesisRankerEngine.ts:243) + `.isIndexReady()` (:671) on the default
  `use_rag_priors` path. Since `sfc_rank_hypotheses` is dispatcher-reachable, #3 is reachable through that wrapper. Mark
  WIRE-EXEMPT citing the Ranker, OR add a thin `sfc_rag_warmstart_*` introspection action if oscar wants direct visibility.
- **#5 SpeedFeedPropagationBridgeEngine -> CANDIDATE WIRE-EXEMPT.** Consumed by SpeedFeedNineAxisOrchestratorEngine (which
  IS dispatcher-reachable via calcDispatcher) + SpeedFeedDownstreamSubscriberEngine. Verify the orchestrator's invocation
  path is actually reached at runtime before tagging exempt.
- **#6 SFCInferenceGateWireEngine -> UNVERIFIED / DISCREPANCY.** Memory [[reference_sfc_inference_gate_wire_la1_2026_06_01]]
  claims india wired `sfcInferenceGateWireEngine.applyToSFCResult` into `prism_calc:ultimate_speed_feed` (calcDispatcher
  ~4913, commit 3d470ac75f on slot/india). A grep of the CURRENT calcDispatcher on cad-fusion-live-ms0 for
  `InferenceGateWire|applyToSFCResult|inferenceGate` returns ZERO. Either the india wire is on slot/india and unmerged to
  this branch, or the memory is stale. **Confirm with india/oscar before classifying** -- do NOT assume dark.
- **#7 SFCOutcomeCaptureWireEngine -> WIRE-EXEMPT (verified).** Consumed by SpeedFeedOrchestratorEngine (dispatcher-
  reachable) -- it's the emit-side bus writer; the orchestrator drives it. Tag `// WIRE-EXEMPT: emit-side middleware,
  driven by SpeedFeedOrchestratorEngine`.
- **#8 SFCProvenanceWireEngine -> WIRE-EXEMPT (verified).** Consumed by the now-wired Ranker (#1) + SFCRAGWarmStart +
  SFCInferenceGateWire -- provenance middleware on the SFC belt. Reachable through the Ranker's dispatcher action.
- **#4 SpeedFeedPSNDecisionPriorEngine -> transitively reachable / low-value standalone.** Consumed by
  SpeedFeedPDFCorpusBridgeEngine (one more hop -- verify that bridge's dispatcher reachability). Only remaining *possible*
  clean standalone wire, but low ROI (a decision-prior already consumed by a bridge). Wire only if oscar wants direct
  introspection; otherwise mark exempt once the PDFCorpusBridge hop is confirmed dispatcher-reachable.

## SWEEP OUTCOME (2026-06-11, bravo): of 8 alleged "dark orphans", only TWO were genuinely orphaned -- **#1 Ranker
## (9aa9ce20f2) + #2 ParamRefine (ae756dcfc8), both now WIRED**. #3/#5/#7/#8 are reachable/exempt (false-dark, the first
## shallow grep couldn't see class-name consumers). #6 is a memory-vs-code discrepancy (confirm with india). #4 is
## transitively reachable + low-value. NET: the SFC self-learning fold-back + arbitration + calibration surfaces are now
## all dispatcher-reachable. The remaining work is (a) india/oscar confirm #6, (b) optional exempt-marker corrections on
## #3/#5/#7/#8 (their `// WIRE-EXEMPT` lines should NAME the real wrapper per CLAUDE.md ENGINE-WIRING, not phantom refs).

## Wire pattern (proven, SpeedFeedOutcomeFeedbackBridge e436c2fc3f / Ranker 9aa9ce20f2 / ParamRefine ae756dcfc8): clone the dynamic-import-in-case in calcDispatcher; z.enum entry + case handler; R12-safe DATA only; SECURITY = forward only validated fields, never bus/clock; round-trip test via registerCalcDispatcher mock-server (monkeypatch the singleton bus, restore in finally = zero disk pollution); commit [MAIN][BOOTSTRAP-SLOT-ENFORCE] via `-F msgfile`.
## Coordinate: oscar owns SFC engine/test hardening (chat-bus posted). Do NOT collide.
