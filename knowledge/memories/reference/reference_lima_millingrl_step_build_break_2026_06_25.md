---
name: reference_lima_millingrl_step_build_break_2026_06_25
description: CROSS-LANE FLAG (india->lima) -- ReinforcementLearningCAMFeedbackEngine.ts (lima, fc4cf18ace) calls MillingReinforcementLearningEngine.step() with 4 args, but step() has required a 5th `outcome` object since 2026-05-12. Breaks the full `npm run build` / build:incremental tree-wide (2 TS2554 errors). NOT fixed by india -- lima owns the CAM-RL reward->outcome mapping (a wrong map poisons the milling RL replay buffer).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.644Z
aliases: reference_lima_millingrl_step_build_break_2026_06_25
---


# Cross-lane build-break flag: MillingRL.step() callers in lima's CAM-RL engine

## What is broken (verified 2026-06-25, slot:india)
`npm run build:incremental` (and full `npm run build`) fails tree-wide with TWO tsc errors:
```
src/engines/ReinforcementLearningCAMFeedbackEngine.ts(302,40): error TS2554: Expected 5 arguments, but got 4.
src/engines/ReinforcementLearningCAMFeedbackEngine.ts(373,42): error TS2554: Expected 5 arguments, but got 4.
```
Both are `millingReinforcementLearningEngine.step(state, action, nextState, done)` -- 4 args.

## Root cause (R8-read, not guessed)
`MillingReinforcementLearningEngine.step()` (`src/engines/MillingReinforcementLearningEngine.ts:181`) signature is:
`step(state, action, nextState, outcome: {mrr, tool_life_factor, surface_ra, safety_margin}, done)` -- the
required physical `outcome` object (4th param) has existed since `edd5dcf363` (2026-05-12). step() computes
its OWN reward via `computeReward(state, nextState, outcome)`. Lima's `ReinforcementLearningCAMFeedbackEngine.ts`
(committed `fc4cf18ace`, 2026-05-22, `[CADCAM-DAGI-MS4]/U-CAMAGI13`, slot:lima) calls step() with the OLD
4-arg shape -- a latent tsc error since it landed. It slipped through because the husky pre-commit gate runs
only lint-staged + the cam-phase5 gate, NOT a full tsc; only `npm run build*` catches it.

## Why india did NOT fix it (R7 conflict + india-soul poison rule)
The two call sites have a DIFFERENT reward model than step() now wants:
- `updatePolicy(state, action, nextState, reward: number, done)` (L287) -- has only a SCALAR reward; its whole
  contract is "callers that already have a scalar reward". It fundamentally cannot supply step()'s physical
  `{mrr, tool_life_factor, surface_ra, safety_margin}` outcome. step()'s required-outcome change BROKE this
  contract (an R7 design conflict -- surface, don't average).
- `closeFeedbackLoop` (L353) -- computes its OWN composite reward `{cycle_time, tool_life, surface_finish,
  dimensional, safety_penalty, total}` from `v.actual`/`v.predicted`. Mapping that to step()'s outcome shape
  needs CAM-RL domain knowledge lima owns. Guessing the map would feed WRONG empirical rewards into the
  milling RL `replayBuffer` -- the india soul explicitly refuses (a wrong label POISONS training data).

## What lima should decide (the owner's call)
Either (a) give `MillingReinforcementLearningEngine.step()` a reward-override path so a scalar/composite-reward
caller can drive the policy without fabricating a physical outcome, OR (b) map the CAMFeedback `actual`/composite
reward to the `{mrr, tool_life_factor, surface_ra, safety_margin}` outcome correctly at both call sites. Until
then the shared build stays red. Flagged via chat-bus + handoff; NOT a [SCOPED] india fix.
