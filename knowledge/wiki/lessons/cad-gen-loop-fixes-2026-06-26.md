---
title: CAD text-to-CAD gen loop — fixes + overnight machinery
slug: cad-gen-loop-fixes-2026-06-26
section: lessons
slot: delta
date: 2026-06-26
tags: [cad, text-to-cad, cadquery, ollama, overnight-loop, gen-test, bug-finding]
---

# CAD text→CAD gen loop — fixes + overnight machinery (slot:delta, 2026-06-26)

Built the autonomous overnight delta CAD-completion machinery and fixed the text→CAD gen loop that was producing **0 validated STEP**. Memory: [[reference_delta_cad_gen_loop_fixes_2026_06_26]]. Roadmap: `state/shared/specs/CAD-COMPLETION-ROADMAP-2026-06-26.md`.

## Bug 1 — versioned-library export API (the keystone)
`scripts/cad-text-to-cadquery.mjs` generated valid CadQuery but the LLM used **`result.exportStep(path)`** — which **does not exist on a cadquery 2.8 `Workplane`** (`AttributeError`). Every gen staged code but executed to 0 STEP.
- **Fix (`d2bd9bb717`):** pin the EXACT current-version export API in the codegen prompt — cadquery `from cadquery import exporters; exporters.export(result, OUTPUT_STEP)`; build123d `export_step(...)`. → `executed:true` + real `model.step`.
- **Lesson (general):** when an LLM generates code against a versioned library, the codegen PROMPT must pin the exact current-version method for IO/export calls — a plausible-but-wrong method name **silently produces no artifact**. cadquery 2.8.0 is installed in `H:/Tools/python` (build123d is not); Python 3.14 may refuse a fresh `pip install cadquery` (wheel lag).

## Bug 2 — Ollama GPU contention (the throughput limit)
Batched gens hit exit-4 "ollama call failed" (~17/24) — qwen2.5-coder:32b had **no `keep_alive`** → fell back to Ollama's 5-min idle default → evicted by the fleet's other resident models → cold-reload → timeout.
- **Fix (`903a1ba142`):** `keep_alive:'15m'` (env `PRISM_OLLAMA_GEN_KEEP_ALIVE`) — the OCR runner's proven approach. **Lesson:** any batched Ollama caller on a contended multi-model GPU must set `keep_alive` or pay cold-reload timeouts. Pair with retry: transient errors RETRY next run (`shouldCursor`), never permanently cursored.

## Bug 3 — reaper-killed background drain
A bare `run_in_background` node drain FAILED exit 255 = fleet-reaper kill (transient-shell ancestry → classified orphan).
- **Fix (`721f695758`):** `run-cad-gen-loop-overnight.ps1` + scheduled task `PRISM CAD Gen Loop` (Task Scheduler ancestry → never reaped; the OCR-runner pattern). **Lesson:** overnight $0 loops must run via Task Scheduler, NOT a detached/background process.

## Result (R15 VALIDATE on live data)
Trunk-side STEP validator `cad-gen-validate.mjs` (cadquery re-import → manifold-solid check; complements, does not dup, the slot-only deep `cad-analyze-step.mjs`; wired into the overnight runner): **36/36 staged STEPs VALID (rate 1.0)** with sensible geometry → the export-fixed gen produces 100%-geometrically-valid CAD on trunk. Deeper dim-by-dim-vs-spec accuracy (T2 full / T3 print-regen) lands with `U-MERGE-SLOT-DELTA`.

## Bug 4 — closed-loop learning signal was 100% FALSE-fail (`cad-analyze-step.mjs` never built)
The text->CAD learning signal recorded `"fail"` for EVERY generation -- including the 63/63
canonically-valid STEPs. `cad-text-to-cadquery.mjs:344` (executeStaged) spawns
`node scripts/cad-analyze-step.mjs <step>` and uses its EXIT CODE as the pass/fail outcome
(`classifyGenerationOutcome`: `analysisExit===0 -> "pass"`, else `"fail"`). But `cad-analyze-step.mjs`
was **referenced everywhere** (that spawn, the `delta-cad-awareness-inject` hook, TOOLBELT.md, PATHS.md,
and even line 28 above) yet **NEVER BUILT** -- so the spawn hit MODULE_NOT_FOUND -> exit 1, empty stdout
-> uniform false-`"fail"` into the CADTrialErrorLearningEngine ledger. The closed-loop feedback the CAD
model trains on was 100% poisoned, hidden behind a green `cad-gen-validate.mjs` (which uses a DIFFERENT,
working validator).
- **Fix (`ee9cbb03de`):** built the real `cad-analyze-step.mjs` -- validity verdict delegates to the
  WORKING `cad-gen-validate-check.py` (cadquery re-import; one definition of "valid" everywhere, killing
  the two-validator divergence) + pure STEP-text inspection (schema/unit/entities/coords/radii/manifold).
  Exit 0=valid manifold / 1=invalid|parse-fail / 2=usage. LIVE: a valid v-block STEP -> exit 0 ->
  signal flips false-fail -> correct-pass. 13/13 hermetic tests; 2-arm scrutiny PASS.
- **Lesson:** a referenced-but-never-built helper that a pipeline spawns by literal path fails SILENTLY
  in the safe-looking direction (missing analyzer + exit-code gate -> everything "fail", not "crash"),
  so a 100%-broken training signal hides behind a green corpus validator. A uniform closed-loop outcome
  (all-fail / all-pass) -> suspect the SIGNAL SOURCE, not the data; confirm a spawned target EXISTS +
  returns the right code on a known-good input before trusting exit-code-as-signal.
  Memory: [[reference_delta_cad_gen_false_fail_learning_signal_2026_06_26]].

## Bug 5 — worklist drained (corpus-growth bottleneck)
The 75-spec worklist fully drained (62/62 valid pairs); worklist SIZE -- not the loop -- bottlenecked
corpus growth.
- **Fix (`aaad682198` + `2091a01882`):** +10 proven-feature archetypes (v-block, chamfered-block,
  slotted-plate, counterbore-plate, stepped-shaft, frustum, grooved-shaft, counterbored-boss,
  square-tube, shouldered-disc) built ONLY from features in the valid corpus (no union/boolean of free
  bodies) -> worklist 75->108; square-tube live-validated, corpus 63/63 valid. Also fixed the
  pre-existing `block-pocket` archetype (pocket depth >= block thickness = contradictory training data).
  **Lesson:** a parametric training-data generator must enforce per-tuple geometric-ordering invariants
  (depth < thickness, counterbore > hole, frustum top < base) -- a contradictory prompt still yields a
  "valid" STEP (the validator checks solidity, not prompt fidelity), so the defect is silent.
  Memory: [[reference_delta_cad_gen_worklist_expand_wave2_2026_06_26]].

## Machinery
Scheduled task `PRISM CAD Gen Loop` (gen+validate, every 30m, reaper-immune) · continuation cron `4d82ef66` · reconcile cron `4efdf85a` · fanout-gate `strict`→`warn`. Related: [[cad-text-to-cad-landscape]] · [[reference_cad_text_learn_loop_2026_06_24]].
