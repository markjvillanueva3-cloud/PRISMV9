---
title: The poison-guard was blind to a SECOND contamination vocabulary (U-CLT-BASELINE-GUARD-DEAD)
date: 2026-07-02
slot: hotel
tags: [lesson, closed-loop-training, quoting, baseline-guard, silent-bug, R12, provenance]
commits: [be9829c5a9, 71063d73c7, 9b694c6d7f]
---

# A 241%-MAPE calibration factor went live from n=30 because the guard only knew the OLD poisoning's vocabulary

## Symptom
CLT-4's live training run reported `n=30 / MAPE 241% / active_factor_written:true` with
`baseline_fallback: null` -- while June cycles trained on the 47,905-record corpus. The
contaminated factor was live for ~8 minutes before the fixed rerun replaced it.

## Root cause (two layers had to fail together)
1. The June-12 regenerated `baseline-records.json` carries fixture seeds as customers:
   "MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION" (15/75), "CLAUDE - 3D MODELS" (4/75),
   "CLAUDE - PDF PRINTS" (1/75) = 27%. Zero CNC-builder tokens -> `isMachineNameCustomer`
   counted 0 -> `validateBaseline` said ok:true -> the resolver admitted the configured file.
   The guard's own header had warned "the poisoning recurs whenever the source is dirty".
2. The TS-layer per-record sanitizer (`QuotingTrainingLoopEngine.isContaminatedBaselineRecord`)
   DID skip the 45 fixture rows -- which is exactly why n=30: **a per-record skip cannot refuse
   a tiny clean remainder**. Whole-baseline refusal and per-record sanitizing are DIFFERENT
   defenses; only the first prevents training on a degenerate residue.

## Fix (9b694c6d7f)
`isFixtureNameCustomer` in `scripts/lib/quoting-baseline-guard.mjs` -- conservative DOUBLE-token
gates (machine+models, learning+engine, simulation+fixture-token, claude+artifact-token) so a
real company name can never trip it ("Claude Fasteners Inc", "Machine Shop LLC", "XYZ Simulation
Inc" proven safe). New `fixture_name_customers` refuse flag in the existing share-threshold
framework (>20% -> whole-baseline refusal, never a per-record drop). Teeth mutation-proven
(each guard drop kills specific tests). Live rerun: configured REFUSED loudly, fallback ->
corpus-with-real, factor replaced with n=47,905 / MAPE 71.09%.

## Standing rules
1. A name-filter's vocabulary is a SNAPSHOT -- when a source regenerates, re-verify the guard
   fires on the NEW content (run it against the live file, not the fixture that motivated it).
2. Per-record sanitizers and whole-baseline refusal guards must BOTH exist; surviving a
   sanitizer is not admission.
3. The `.ts` sanitizer and `.mjs` guard hold independent vocabularies -- extend BOTH on the
   next new contamination class (arm-C P2).
4. Scrutinize your own live run's numbers (n, MAPE, baseline_source) before calling it done --
   the "fresh training run" task is what SURFACED this.
5. Sibling-test claims must name the runner: "41/41 vitest" said nothing about the red
   node--test scripts suites (the CLT-2 r1 FAIL).

Related: [[scan-planner-canon-path-2026-07-02]] (same campaign), provenance gate
`detectSyntheticProvenance` in quoting-cost-source-consumers.mjs (synthetic-as-real refusal,
coverage honestly 5/6 until real invoice extraction).
