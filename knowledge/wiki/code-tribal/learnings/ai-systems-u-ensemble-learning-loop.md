# AI-SYSTEMS/U-ENSEMBLE-LEARNING-LOOP — [AI-SYSTEMS]/U-ENSEMBLE-LEARNING-LOOP (slot:india): close EnsembleModelSelectorEngine open loop

**Commit:** `87e676f14e49` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T10:23:54-05:00
**Tags:** ai-systems, u-ensemble-learning-loop, auto-distilled

## Subject
[AI-SYSTEMS]/U-ENSEMBLE-LEARNING-LOOP (slot:india): close EnsembleModelSelectorEngine open loop

## Body
```
[AI-SYSTEMS]/U-ENSEMBLE-LEARNING-LOOP (slot:india): close EnsembleModelSelectorEngine open loop

Found by the open-learning-loops re-scan (the Mill pattern applied to india-core ML). The
ensemble model selector had ensemble_register_member + ensemble_predict wired in
aiReasoningDispatcher, but updateWeights() (EnsembleModelSelectorEngine.ts:174) -- the
ACTUALS-feedback side -- was NOT wired: the ensemble emitted weighted predictions forever
on FROZEN member weights; observed per-member errors could never re-weight the members
(the open-loop pattern). getWeights() was likewise unexposed.

Closure (additive; wires existing tested methods, no engine change):
- 2 actions in prism_ai / aiReasoningDispatcher:
  - ensemble_update_weights -> updateWeights(memberErrors, actual): re-weights members on
    observed error (hedge: w*exp(-lr*err)); returns updated_weights + best/worst member.
  - ensemble_get_weights -> getWeights(): observe the re-weighting.
- enum + Zod schemas (aiReasoningActionSchemas.ts) + validated cases (reject missing
  member_errors / non-finite error / non-finite actual). Map returns converted via
  Object.fromEntries (Maps do not JSON-serialize).
- test dispatcher.ensembleLearningLoop.test.ts 6/6: key intent test proves the loop LEARNS
  (feed mA low-error + mB high-error -> mA re-weighted strictly above mB, best=mA worst=mB),
  compounding across rounds, + 3 adversarial rejections. Round-tripped through the real
  dispatcher against the live singleton.

2-arm per-file scrutiny PASS (0 P0/P1): enum<->schema<->case parity, Map serialization,
fall-through placement confirmed in the explicit-break region (NOT the xproc bare-fallthrough
cluster of reference_xproc_fallthrough_severed_2026_06_20), R9 intent test sound (frozen no-op
would fail it). tsc clean.
```

## Files touched (4)
- mcp-server/src/__tests__/dispatcher.ensembleLearningLoop.test.ts | 110 +++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/aiReasoningActionSchemas.ts               |   7 +++
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts        |  31 +++++++++++++
- 3 files changed, 148 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 87e676f14e49`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._