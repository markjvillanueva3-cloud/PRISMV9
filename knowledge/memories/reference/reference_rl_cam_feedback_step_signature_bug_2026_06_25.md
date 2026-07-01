---
name: reference_rl_cam_feedback_step_signature_bug_2026_06_25
description: "Open fleet build defect (FLAG for kilo/CAM): ReinforcementLearningCAMFeedbackEngine.ts calls millingReinforcementLearningEngine.step() with 4 args at lines 302 + 340, but the signature requires 5 -- it omits the required `outcome` object. 2 tsc errors (TS2554) keep `npm run build` from a clean type-check fleet-wide. Needs a CAM-RL design decision, NOT a mechanical fix -- do not guess."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.146Z
aliases: reference_rl_cam_feedback_step_signature_bug_2026_06_25
---


**Surfaced 2026-06-25 (slot:oscar) while running `tsc --noEmit` on the mcp-server during the SFC accuracy work.** The only 2 tsc errors fleet-wide are both here; flagging for the CAM domain owner (kilo) because the correct fix needs RL-reward domain knowledge.

**The defect (verified by reading both contracts):**
- `MillingReinforcementLearningEngine.step` (`mcp-server/src/engines/MillingReinforcementLearningEngine.ts:181`) signature is **5 params**: `step(state, action, nextState, outcome: {mrr, tool_life_factor, surface_ra, safety_margin}, done: boolean)`.
- `ReinforcementLearningCAMFeedbackEngine.ts:302` (and `:340`) calls `millingReinforcementLearningEngine.step(state, action, nextState, done)` -- **4 args**, passing `done` in the `outcome` position and omitting `done`. -> `error TS2554: Expected 5 arguments, but got 4` (x2).
- The caller's comment (`:297-301`) is STALE: it describes passing the empirical reward "via the rewardOverride parameter on .step()" -- but `step` has NO `rewardOverride` param. It has `outcome` (the raw metrics step needs to compute its OWN reward).

**Why this is NOT a mechanical fix (do not guess):** the caller `updatePolicy` holds only a SCALAR empirical `reward` (finite-validated at `:294`), but `step` needs the raw `outcome` object {mrr, tool_life_factor, surface_ra, safety_margin} to compute its reward. There is no clean way to reconstruct `outcome` from a scalar. The right fix is a DESIGN decision owned by CAM/kilo: either (a) add a real `rewardOverride` path to MillingRL.step (matching the caller's stale comment's intent) so an empirical scalar reward can drive the policy directly, or (b) thread the raw outcome metrics through `updatePolicy` so it can build a proper `outcome`. Guessing outcome values would corrupt the RL reward signal -> a silent training defect, worse than the build error.

**Impact:** `npm run build` (full `tsc`) does not cleanly type-check fleet-wide (these 2 errors). `build:fast` (esbuild, no type-check) is unaffected, which is why it went unnoticed. Both call sites have the same bug, so the whole engine was written against a wrong/old `step` signature.

**Action:** kilo (CAM domain) to make the design call + fix both call sites + correct the stale `rewardOverride` comment + add a regression test that the CAM-feedback loop drives MillingRL with a valid outcome/reward. Flagged on the chat bus 2026-06-25.

**DEDUP NOTE (R8):** this was ALREADY flagged -- the canonical actionable tracking spec is [[reference_cam_tsc_errors_for_kilo_2026_06_24]] (xray, 2026-06-24: mcp-server tsc 19 -> 3 -> 2 remaining, these 2 RL-CAM errors confirmed as owner-judgment). This 2026-06-25 entry is an INDEPENDENT oscar re-confirmation of the same diagnosis (corroborating evidence the signature mismatch is real + needs a design decision, not a guess) -- treat the 2026-06-24 spec as canonical; do not open a third tracker. Net: the RL-CAM build debt has stood ~1 day awaiting kilo.
