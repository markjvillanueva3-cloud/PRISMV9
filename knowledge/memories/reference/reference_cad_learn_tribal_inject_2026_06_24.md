---
name: reference_cad_learn_tribal_inject_2026_06_24
description: "U-CAD-LEARN-TRIBAL-INJECT (slot:india 2026-06-24) -- wired the CAD trial-error learning loop to CONSUME the operator-curated CAD tribal corpus; the consumer side of zulu's tribal-knowledge growth."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.495Z
aliases: reference_cad_learn_tribal_inject_2026_06_24
---


# U-CAD-LEARN-TRIBAL-INJECT -- CAD learning loop consumes tribal knowledge (2026-06-24, slot:india)

Operator /goal: "improve the learning and ai systems for cad drawing... **ensure you're adding
tribal knowledge injections** (zulu is adding more tribal knowledge)." This unit is the direct
architectural answer: it wires the CONSUMER side so zulu's PRODUCER additions flow through to
real recommendations.

## What shipped (commit on cad-fusion-live-ms0, [MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEARN-TRIBAL-INJECT)
`CADTrialErrorLearningEngine.recommendAdjustments(candidate, {tribalProvider})` +
`recordRecommendation(...,{tribalProvider})` now take an injected PURE `TribalTipProvider`
(`(ctx:{categories,candidate,limit}) => TribalAdvice[]`). Engine stays I/O-pure; the dispatcher
(`cadAutomationDispatcher.buildCadTribalProvider`) wires the REAL `CADTribalDrawInjectionEngine` +
the tracked `CAD_DRAW_TRIBAL_TIPS` corpus (SAME source as `cad_tribal_draw_query` -- reused, not
forked). `collectTribalTips` dedupes by id / sorts by relevance / caps at MAX_TRIBAL_TIPS=5;
provider failure is non-fatal (advisory). `RecommendationRecord.tribalTipCount` persisted (future
knowledge-arm efficacy split). Knobs: `disable_tribal`, `tribal_corpus`.

So a topology-risk candidate now surfaces delta-tribal-004 "topology before tolerance"; a STEP-emit
candidate surfaces the inch-unit lesson; etc. As zulu grows CAD_DRAW_TRIBAL_TIPS, recommendations
auto-improve with zero further wiring.

## Verification (R15)
- WIRE: cad_learning_recommend + cad_learning_record_recommendation (cadAutomationDispatcher).
- TEST: 63 pass -- 59 engine (incl REAL-CADTribalDrawInjectionEngine integration, fail-soft,
  dedup/cap, malformed-filter, tribalTipCount-survives-reload) + 4 dispatcher round-trip.
- VALIDATE: 4 touched files tsc-clean; additive/backward-compatible (tribalTips:[] default;
  cadDispatcher:2014 other caller gets harmless []). 3-of-3 scrutiny PASS (A+B+C, no P0/P1).
- responseSlimmer gotcha: prunes empty arrays -> over the wire tribalTips is ABSENT when empty;
  assert `r.tribalTips ?? []` at the dispatcher layer (engine returns []).

## Honest notes (R12)
1. **Commit bundled prior-session work.** `git add` of the engine/test files swept in session
   06e3b710's UNCOMMITTED closed-loop attribution feature (recordRecommendation/getLoopEfficacy/
   linkOutcome/attributeOutcome + recommendation ledger + cad_learning_efficacy) -- ~250 lines that
   were dangling in the working tree. Net-positive rescue (preserved + now 3-of-3 reviewed + tested),
   but the commit subject under-states it (2 reviewers flagged as P2 hygiene).
2. **Found, NOT fixed:** pre-existing month-old tsc regression in ReinforcementLearningCAMFeedbackEngine
   step() arity (2 errors). Flagged for owner lima -> [[reference_rl_cam_feedback_step_arity_regression_2026_06_24]].
   (Full `tsc --noEmit` is evidently NOT in the blocking Stop gate -- this stayed red a month.)

## Deferred P2s (this unit -- next session / R16 follow-up)
- cad_learning_record_recommendation (WRITES live singleton ledger) + cad_learning_efficacy lack a
  dispatcher round-trip test; engine methods are exhaustively unit-tested. A clean E2E needs ledger-
  path injection the dispatcher doesn't expose (cad_learning_efficacy is read-only -> a safe round-
  trip IS addable cheaply). Pre-existing actions (authored by 06e3b710), not new this unit.
- empty-string tip ("") passes the id+tip validity filter (cosmetic; add `tip.length>0` guard).

## Queue (continues [[reference_cad_print_learning_ai_goal_scope_2026_06_24]])
Next india-in-lane: (2) text->CAD Ollama loop learning feedback (`cad-text-to-cadquery.mjs`);
(3) blueprint LoRA/RAG train/eval-loop audit (`blueprint_lora_*`/`blueprint_rag_*`). The tribal-
injection PATTERN here should be replicated to those CAD-AI recommendation surfaces (operator wants
tribal injections fleet-wide). [[cad-learning-tribal-injection]] (wiki).
