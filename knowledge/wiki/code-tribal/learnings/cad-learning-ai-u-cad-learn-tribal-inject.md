# CAD-LEARNING-AI/U-CAD-LEARN-TRIBAL-INJECT — [MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEARN-TRIBAL-INJECT (slot:india): inject CAD tribal knowledge into the trial-error learning recommendation loop

**Commit:** `5a97bc06bfe3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T07:53:55-05:00
**Tags:** cad-learning-ai, u-cad-learn-tribal-inject, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEARN-TRIBAL-INJECT (slot:india): inject CAD tribal knowledge into the trial-error learning recommendation loop

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEARN-TRIBAL-INJECT (slot:india): inject CAD tribal knowledge into the trial-error learning recommendation loop

CADTrialErrorLearningEngine learned only from its OWN failure ledger; it never
consulted the operator-curated CAD tribal corpus (the lessons zulu/delta grow).
Added an injected pure TribalTipProvider to recommendAdjustments/recordRecommendation
(engine stays I/O-pure -- dispatcher wires the real CADTribalDrawInjectionEngine +
tracked CAD_DRAW_TRIBAL_TIPS) so risk recommendations now surface the relevant
shop-floor doctrine (topology-before-tolerance, STEP-inch-units, spark-gap, etc.).
tribalTipCount persisted on the recommendation record (future knowledge-arm efficacy
split signal). Tips deduped by id / ranked by relevance / capped at 5; a provider
failure is non-fatal (advisory). disable_tribal + tribal_corpus override knobs.

WIRE: cad_learning_recommend + cad_learning_record_recommendation (cadAutomationDispatcher).
TEST: 63 pass -- 59 engine (incl real-CADTribalDrawInjectionEngine integration + fail-soft
+ dedup/cap + malformed-filter + persistence-survives-reload) + 4 dispatcher round-trip.
VALIDATE: touched files tsc-clean; additive/backward-compatible (tribalTips:[] default).

Found (NOT fixed -- flagged for owner lima): pre-existing tsc regression in
ReinforcementLearningCAMFeedbackEngine step() arity (2 errors, month-old, unrelated).
See reference_rl_cam_feedback_step_arity_regression_2026_06_24.
```

## Files touched (5)
- mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts                | 280 +++++++++++++++++++++++++++++++
- .../__tests__/cadAutomationDispatcher.cad-learning-tribal-inject.test.ts    |  99 +++++++++++
- mcp-server/src/engines/CADTrialErrorLearningEngine.ts                       | 326 +++++++++++++++++++++++++++++++++++-
- mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts                 |  90 +++++++++-
- 4 files changed, 793 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- lessons zulu/delta grow).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5a97bc06bfe3`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._