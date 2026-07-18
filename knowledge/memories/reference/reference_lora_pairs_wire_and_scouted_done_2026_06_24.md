---
name: reference_lora_pairs_wire_and_scouted_done_2026_06_24
description: India fire 2026-06-24 -- shipped U-BPA-LORA-PAIRS-WIRE (de-orphaned ledger->LoRA-pair builder onto BOTH dispatchers, closing predictions->outcomes->RETRAIN); the 2 scouted units were already done; RL tsc error flagged-not-guessed; peer absorbed one of my files.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.648Z
aliases: reference_lora_pairs_wire_and_scouted_done_2026_06_24
---


# CAD/print learning-AI -- india fire 2026-06-24 (slot:india)

Continues [[reference_cad_learning_loop_closures_2026_06_24]] + [[reference_cad_print_learning_ai_goal_scope_2026_06_24]].

## The 2 scouted next-units were ALREADY DONE (existence != content -- READ the body)
The work order named two "scouted next-units (cross-domain xray)":
1. align `blueprint-accuracy-guard.mjs` hook event shape (kind->type + payload) to the
   consumer-lib contract -- **ALREADY SHIPPED** as `U-BPA-GUARD-EVENTSHAPE` (+`-IDEMP`,
   commits `cc27bd974d` + `ee2d1a739a`). The hook's `appendEvent` (~L449) already maps
   `{kind,...rest}` -> `{type: type??kind, ts, payload: rest}`, idempotent on a pre-typed row.
2. wire `blueprint_rag_extract` recordOutcome IO at cadDispatcher ~3394 to the canonical
   shared ledger -- **ALREADY SHIPPED** as `U-BPA-RAG-RECORDOUTCOME` (cadDispatcher.ts:3443-3451
   calls `recordExtractionOutcome(extraction)` from the canonical writer-lib via the repo-root
   anchor, NOT a raw append).
Both were closed by sibling cron fires (durable `adc3b7c2`, every 10 min) AFTER the scoped
memory was written. LESSON: a flagged-next-unit can be closed between fires -- READ the actual
code before re-doing it. Verified via git log + reading the bodies, not the titles.

## SHIPPED: U-BPA-LORA-PAIRS-WIRE (commit 55cf3dd18d, [CAD-LEARNING-AI], slot:india)
The genuine remaining gap (NEVER-IDLE descent): `buildLoRAPairsFromLedger`
(`scripts/lib/blueprint-lora-pair-builder.mjs`, U-BPA-LORA-PAIRS) existed + was tested but was an
**R15 ORPHAN** -- imported NOWHERE. `blueprint_lora_prepare_set` hard-required caller-supplied
`precomputedPairs[]`. This was the missing THIRD arrow of predictions->outcomes->**RETRAIN**:
the ledger captures rag_extractions + operator_corrections, but nothing projected them into the
LoRA training set.

Fix: new pure `resolveLoRATrainingPairs({precomputedPairs,tier}) -> {pairs,source,empty}`
(caller-supplied NON-EMPTY array wins, mirroring the RAG `retrieveTribal` caller-wins convention;
else default from the ledger at the tier). `precomputedPairs[]` is now OPTIONAL on
`blueprint_lora_prepare_set`.

**WIRE (R15 clone-don't-fork):** the action lives in TWO dispatchers on the SAME engine singleton --
`cadDispatcher` (prism_cad) AND `aiReasoningDispatcher` (prism_ai, ~L4215). BOTH rewired identically
via the same repo-root-anchored `.mjs` import. (Arm C of the 3-of-3 CAUGHT that I'd only done
cadDispatcher on pass 1 -- a real P1 integration-drift the per-file arms A/B missed because they
only saw my touched files.)

**R12 loud signal:** a 0-pair LEDGER default (no confirmed ground truth at a tier yet, e.g.
`ensemble_consensus`/`single_backend` today -- `eventToPair` only emits `operator_verified`)
surfaces `empty:true` + a "do NOT export as a real bundle" note. Caller-supplied sets never
flagged empty. This closed arm C's 2nd P1 (silent empty-set footgun -> a caller could export a
0-pair bundle thinking it trained on real data).

TEST: builder lib 18/18 (resolve happy + 3 failure + 2 adversarial + 3 empty-signal);
`aiReasoningDispatcher.lora-bridge-wire` 12/12 (old reject-on-missing-pairs assertion REPLACED with
the optional-pairs contract + backward-compat caller path + deterministic empty-tier signal at the
slimmed `r.data.data.*` depth); engine 22/22 no-regression; tsc clean on all 5 files. 3-of-3 PASS
(arm C FAIL on pass 1 -> 2 P1s fixed -> re-verified PASS).

## SHARED-TREE ABSORPTION (R12 honest note)
I committed by-pathspec (5 files), but my commit `55cf3dd18d` landed only 4 -- a peer's `-a`/`-A`
commit `de14b13f81` (slot:papa) ABSORBED my uncommitted `aiReasoningDispatcher.ts` edit before my
own commit ran (the documented shared-tree absorption hazard; attribution split, code intact in
HEAD: `git show HEAD:...aiReasoningDispatcher.ts | grep -c U-BPA-LORA-PAIRS-WIRE` = 1). The full unit
is COHERENT in HEAD (working tree clean, all tests pass). Mitigation is the slot-worktree model;
on the shared tree this race is unavoidable without committing instantly.

## FLAGGED next-unit (NOT guess-fixed -- R12/honesty)
**Pre-existing tsc error (2 sites): `ReinforcementLearningCAMFeedbackEngine.ts:302` + `:373`** call
`millingReinforcementLearningEngine.step(state, action, nextState, done)` with 4 args, but the
signature is now `step(state, action, nextState, outcome:{mrr,tool_life_factor,surface_ra,
safety_margin}, done)` -- 5 params. The call OMITS the `outcome` object (passing `done` in its slot).
The stale comments reference a non-existent `rewardOverride`; `updatePolicy` has only a scalar
`reward` and `closeFeedbackLoop`'s `v.actual` is a DIFFERENT shape (`tool_life_min`/`surface_ra_um`).
**NOT a safe auto-fix:** fabricating an `outcome` to make tsc green would inject GARBAGE reward
signal into an RL training loop (the dangerous direction). Committed by lima (`fc4cf18ace`,
CADCAM-DAGI-MS4/U-CAMAGI13), no claim. Needs a real outcome-mapping DESIGN decision -> route to lima
or a dedicated unit. The handoff memory-seed already lists this `TS2554` as a known signal.

## Next india-in-lane queue (unchanged, deeper builds)
- text->CAD Ollama loop learning feedback (`scripts/cad-text-to-cadquery.mjs`).
- `per_app_incad_infer` REAL InferenceRuntime backend (needs-design, coordinate delta).
- `cad_learning_*` subsystem audit (cadAutomationDispatcher).
