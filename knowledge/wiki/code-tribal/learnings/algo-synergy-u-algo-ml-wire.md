# ALGO-SYNERGY/U-ALGO-ML-WIRE — [MAIN] [ALGO-SYNERGY]/U-ALGO-ML-WIRE: expose 5 built-but-unwired ML algorithms via prism_algorithm ml_* group (slot:tango)

**Commit:** `8c750a2acae2` · **By:** markjvillanueva3-cloud · **At:** 2026-05-29T10:27:53-05:00
**Tags:** algo-synergy, u-algo-ml-wire, auto-distilled

## Subject
[MAIN] [ALGO-SYNERGY]/U-ALGO-ML-WIRE: expose 5 built-but-unwired ML algorithms via prism_algorithm ml_* group (slot:tango)

## Body
```
[MAIN] [ALGO-SYNERGY]/U-ALGO-ML-WIRE: expose 5 built-but-unwired ML algorithms via prism_algorithm ml_* group (slot:tango)

Algorithm-gen goal iter 2 (priority #1 ai-systems, highest-ROI coverage win — no new code). 5 Algorithm<I,O> ML classes on disk but unreachable via any dispatcher: NeuralInference, RegressionEngine, DecisionTreeClassifier, ClusteringEngine, EnsemblePredictorModel. Added ml_{neural_infer,regression,decision_tree,clustering,ensemble_predict} + 5 uniform validate-then-calculate cases. 9/9 synergy tests PASS incl. z.enum membership (closes MS1 mock-bypass) + reachability. Pre-existing dispatcher tsc errors are HEAD-level, not mine.
```

## Files touched (3)
- mcp-server/src/tools/dispatchers/algorithmDispatcher.synergy.test.ts | 40 +++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/algorithmDispatcher.ts              | 66 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 105 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8c750a2acae2`
- Milestone envelope: `mcp-server/data/milestones/ALGO-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._