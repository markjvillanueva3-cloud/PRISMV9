---
name: reference_rl_cam_feedback_step_arity_buildblocker_2026_06_25
description: "FLEET BUILD-BLOCKER (owner india/kilo) — ReinforcementLearningCAMFeedbackEngine.ts calls millingReinforcementLearningEngine.step() with 4 args, missing the outcome object (5th param). 2 tsc errors block a clean tsc --noEmit. Found 2026-06-25 by slot:zulu."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.146Z
aliases: reference_rl_cam_feedback_step_arity_buildblocker_2026_06_25
---


**FLEET BUILD-BLOCKER (2 tsc errors, owner: india / kilo — CAM-RL domain). Found 2026-06-25, slot:zulu (during octopus hardening; surfaced by `npx tsc --noEmit`).**

`mcp-server/src/engines/MillingReinforcementLearningEngine.ts:181` `step(state, action, nextState, outcome, done)` takes **5** args — `outcome: { mrr, tool_life_factor, surface_ra, safety_margin }` is the 4th, `done` the 5th. But `ReinforcementLearningCAMFeedbackEngine.ts` calls it with **4** args, OMITTING `outcome`:
- **:302** (`updatePolicy`): `millingReinforcementLearningEngine.step(state, action, nextState, done)` — `done` lands in the `outcome` slot. `updatePolicy` only has a SCALAR `reward`, not the outcome breakdown, so there is no `outcome` to pass. The code comment (≈:297-301) says the author intended a `rewardOverride` param on `step()` that does not exist (signature drift). **Real bug: the RL policy never receives the empirical outcome → step() recomputes its own internal reward → the empirical reward is silently discarded.**
- **:373** (`closeFeedbackLoop`): `millingReinforcementLearningEngine.step(v.state, v.action, v.next_state, v.done ?? false)` — here `v.actual` likely HAS the outcome metrics, so this site CAN be fixed by passing `v.actual` (shaped to `{mrr, tool_life_factor, surface_ra, safety_margin}`) as the 4th arg.

**Why NOT auto-fixed (R8/R12):** :302 cannot be fixed without india's RL contract decision — either add an optional `rewardOverride` to `MillingReinforcementLearningEngine.step()` (so a scalar empirical reward bypasses the internal reward recompute) or restructure `updatePolicy`. Passing a fabricated/neutral `outcome` would CORRUPT the CAM training loop (a safety-relevant learning path) — so a wrong "make tsc green" hack is worse than the build error. `npm run build:fast` (esbuild) is unaffected; only the `tsc --noEmit` gate is red.

**Fix path (india/kilo):** (1) add `rewardOverride?: number` to `step()`; when present, skip the internal `computeReward` and use it; (2) `updatePolicy` passes `{rewardOverride: reward}` (and a real-or-omitted outcome); (3) `closeFeedbackLoop` passes `v.actual` as the outcome; (4) add an R9 test that fails on the arity/contract drift. Verify: `cd H:/prism/mcp-server && npx tsc --noEmit` → 0 errors.
