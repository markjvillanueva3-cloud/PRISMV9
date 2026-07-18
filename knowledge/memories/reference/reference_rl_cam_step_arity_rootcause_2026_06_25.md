---
name: reference_rl_cam_step_arity_rootcause_2026_06_25
description: "Root-cause of the month-old ReinforcementLearningCAMFeedbackEngine tsc arity regression (owner lima): MillingReinforcementLearningEngine.step() changed from a scalar reward/rewardOverride contract to a required structured `outcome` param; neither caller has that data. A facade fix would inject WRONG rewards into the RL replay buffer -- do NOT auto-fix; lima design decision."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.146Z
aliases: reference_rl_cam_step_arity_rootcause_2026_06_25
---


# RL-CAM step() arity regression -- ROOT CAUSE (diagnosed 2026-06-25, slot:india; owner = lima)

Extends [[reference_rl_cam_feedback_step_arity_regression_2026_06_24]] (which only FLAGGED it).
Surfaced again because it shows in `tsc --noEmit` (2 errors) on every mcp-server build -- I hit it
twice building the CAD-learning units and root-caused it before deciding NOT to auto-fix.

## The 2 errors (unchanged, pre-existing ~1 month)
`mcp-server/src/engines/ReinforcementLearningCAMFeedbackEngine.ts(302,40)` + `(373,42)`:
`error TS2554: Expected 5 arguments, but got 4` on `millingReinforcementLearningEngine.step(...)`.

## Root cause: a signature change broke the contract, the call-site comments are STALE
`MillingReinforcementLearningEngine.step()` (`MillingReinforcementLearningEngine.ts:181`) now is:
`step(state, action, nextState, outcome: {mrr, tool_life_factor, surface_ra, safety_margin}, done: boolean)`
-- it computes its OWN reward internally via `computeReward(state, nextState, outcome)` and pushes
`reward.total` to the replay buffer. Both `ReinforcementLearningCAMFeedbackEngine` callers still pass
the OLD 4-arg form `(state, action, nextState, done)`. The call-site comments still describe a
`rewardOverride` scalar param that no longer exists ("we pass the empirical reward via the
rewardOverride parameter on .step()") -- the engine's API changed under them.

## Why this is NOT a safe auto-fix (the reason I routed it instead of patching)
Neither caller HAS the structured `outcome` the new signature demands:
- **Site 302 `updatePolicy`**: only a scalar `reward` (its whole purpose -- "callers that already have a
  scalar reward"). No mrr / tool_life_factor / surface_ra / safety_margin.
- **Site 373 `closeFeedbackLoop`**: has `v.actual` = `{cycle_time_min, tool_life_min, surface_ra_um,
  dimensional_accuracy_mm, safety_event?}` -- which does NOT match the milling outcome: `mrr` is absent
  (would have to be DERIVED from state speed*feed*depths), `tool_life_factor != tool_life_min` (needs a
  baseline), `safety_margin != safety_event` (number vs boolean), units differ (`surface_ra_um` vs `surface_ra`).

Every mapping is a DESIGN judgment. A wrong synthesized `outcome` -> milling `computeReward` produces a
WRONG reward -> the replay buffer trains the policy on bad data -> the RL policy degrades. That is
injecting bad training data into a learning loop = a no-facade / correctness-safety violation (R12).
So a speculative arity-only patch is WORSE than the tsc error.

## The CORRECT fix (lima -- RL-CAM domain design decision)
Pick ONE, principled:
- (A) Restore a scalar entry point on `MillingReinforcementLearningEngine`: an optional `rewardOverride?:
  number` (or a `stepWithReward(state, action, nextState, reward, done)` sibling) that overrides
  `reward.total` in the replay push when provided -- so both callers drive the policy with their REAL
  empirical reward (302's scalar; 373's `computeReward(v.actual, v.predicted, v.weights)` at line 366),
  no faked outcome. Also make `outcome` optional with a fallback when `rewardOverride` is given. This
  matches the (now-stale) call-site comments' original intent.
- (B) Define the canonical `ActualOutcome -> MillingOutcome` mapping (incl. a real `mrr` derivation from
  state + a `tool_life_factor` baseline + `safety_event -> safety_margin`) and pass it as `outcome` at 373;
  302 still needs (A) because it has no outcome at all.

(A) is the smaller, lower-risk, contract-restoring fix and covers BOTH sites; (B) is heavier and only
helps 373. Recommend (A). Either way: a behavioral test that asserts the empirical reward actually
reaches the replay buffer (not the engine's internally-recomputed one) must accompany it.

## Decision (slot:india, crossroad auto-decide)
Reversible/internal fork "fix it vs route it" -> I classified the FIX itself as unsafe-to-auto-apply
(would fake RL training data / requires a lima-lane API redesign), so the correct non-idle action was to
diagnose + route, NOT patch. Universal safety rails bind: never facade-fix a learning loop's reward path.
