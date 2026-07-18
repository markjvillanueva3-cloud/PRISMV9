# CAD-LEARNING-AI/U-BPA-LORA-PAIRS-WIRE — wire the orphaned ledger→LoRA-pair builder onto blueprint_lora_prepare_set (close predictions→outcomes→RETRAIN)

**Commit:** `55cf3dd18d` (slot:india, 2026-06-24) · **galaxy:** ai-training / blueprint-vision
**Tags:** lora, blueprint, closed-loop, r15-orphan, r12-fail-loud, clone-dont-fork, scrutiny-3of3
**Related:** [[reference_lora_pairs_wire_and_scouted_done_2026_06_24]] · [[reference_cad_learning_loop_closures_2026_06_24]] · sibling [[reference_recordoutcome_mjs_ts_seam_2026_06_24]]

## What
`buildLoRAPairsFromLedger` (`scripts/lib/blueprint-lora-pair-builder.mjs`, U-BPA-LORA-PAIRS) existed
+ was tested but was imported **nowhere** — an R15 orphan. `blueprint_lora_prepare_set` hard-required
caller-supplied `precomputedPairs[]`. This unit wired the builder in via a new pure
`resolveLoRATrainingPairs({precomputedPairs,tier}) → {pairs,source,empty}`: `precomputedPairs[]` is now
OPTIONAL (caller-supplied non-empty wins, mirroring the RAG `retrieveTribal` caller-wins convention);
otherwise training data DEFAULTS from the closed-loop ledger (`state/shared/blueprint-accuracy-events.jsonl`).
This is the missing **third arrow**: predictions (`blueprint_rag_extract`) → outcomes (operator_correction
recorded to the ledger) → **RETRAIN** (LoRA set built FROM those confirmed outcomes).

## Lessons (the WHY)

1. **A built+tested lib imported nowhere is an R15 orphan — wiring it to its natural consumer IS the unit.**
   The builder's docstring stated the intent ("so blueprint_lora_prepare_set can default…") but nothing
   imported it. `grep -rln <symbol> | grep -v '\.test\.'` returning only the module itself = orphan. The
   highest-value "next unit" was not a new build — it was closing the wiring gap on an existing, proven asset.

2. **Per-file scrutiny arms only see the files you touched; an action registered in N dispatchers needs the
   3-of-3 analyst arm to catch the un-updated mirror (R15 clone-don't-fork).** `blueprint_lora_prepare_set`
   lives in BOTH `cadDispatcher` (prism_cad) AND `aiReasoningDispatcher` (prism_ai) on the same engine
   singleton. Arms A+B (scoped to my diff) PASSed; arm C (whole-repo regression weighting) found the prism_ai
   copy still on the OLD contract — a real P1 integration-drift. **When you rewire an action, grep every
   dispatcher for the action name and clone the change to each, same commit.**

3. **A 0-pair ledger default must surface a LOUD empty signal (R12) — never a silent empty-success.**
   With `precomputedPairs[]` now optional, a tier with no confirmed ground truth (e.g. `ensemble_consensus`/
   `single_backend` today — `eventToPair` only emits `operator_verified`) returns `success` with `pairs:[]`.
   A caller could then export a 0-pair LoRA bundle believing it trained on real data. Fix: `resolveLoRATrainingPairs`
   returns `empty = (source==="ledger" && pairs.length===0)`; both dispatchers surface `empty:true` + a
   "do NOT export as a real bundle" note. Caller-supplied sets are never flagged empty (the caller chose them).
   The empty `pairs:[]` array is `slimResponse`-dropped, so the explicit `empty`/`note` flags ARE the signal.

4. **Verify the body, not the title (existence ≠ content).** The two "scouted next-units" in the work order
   (hook eventshape + rag recordOutcome) were ALREADY shipped by sibling cron fires after the scoping memory
   was written. Reading `appendEvent` / cadDispatcher:3443 confirmed it; re-doing them was avoided.

## Verify
`git -C H:/prism show 55cf3dd18d` · builder 18/18 (`node scripts/lib/blueprint-lora-pair-builder.test.mjs`)
· wire 12/12 (`npx vitest run src/__tests__/aiReasoningDispatcher.lora-bridge-wire.test.ts`) · engine 22/22
no-regression · tsc clean. NB: `aiReasoningDispatcher.ts` was absorbed into peer commit `de14b13f81` (papa)
by a shared-tree `-a` race — code is intact + coherent in HEAD, attribution split.
