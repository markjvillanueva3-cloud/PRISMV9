---
name: reference-nn-graph-ms2-u1-2026-05-17
description: NN-GRAPH-MS2 U1 — wired existing seed-ghost-from-unwired.mjs as a regen-viz post-merge stage to fix poolSize:0 GNN-dormancy. Dedup win; necessary-but-not-sufficient for NN autonomy. Shipped 2026-05-17 slot alpha.
aliases: reference_nn_graph_ms2_u1_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.664Z
---


# NN-GRAPH-MS2 / U1-REFERENCE-POOL-SEED-STAGE (2026-05-17, slot alpha)

Commit this session. Closes the **data-side** dormancy gate that kept the
GNN tier-5 inert.

## Root cause (a wiring gap, NOT a build gap)
`scripts/seed-ghost-from-unwired.mjs` ALREADY existed: emits high-confidence
(0.80–0.85) `ghost.unwired-engine` nodes with `proposed_wiring` + `label` +
`confidence`, has an idempotent `--apply` that atomic-writes
`system-graph.json`. But it was **not a regen-viz stage** — so every
`regen-viz` rebuilt `system-graph.json` with **0 ghost nodes** →
`nn-graph-eval.buildHoldout` poolSize:0 → `assessHoldout` returns
`insufficient-reference-pool` → the GNN tier-5 cascade step
(`seed-ghost-gnn-classify.mjs`) was a permanent no-op **by data, not by code**.

**Lesson (high value): when a milestone says "build a reference-pool builder",
first check if the builder already exists and is merely unwired.** `/system-viz
find ghost.unwired` returned 0 nodes + grep showed the generator existed +
unwired → the entire unit collapsed from "build NN-GRAPH-MS2 builder +
lifecycle" to "register one existing script as a regen stage." Karpathy
simplify: the biggest win was *not building*.

## The fix
One explicit **post-merge** `spawnSync` stage in `scripts/regen-viz.mjs` after
`add-parent-contains-edges`, running `seed-ghost-from-unwired.mjs --apply`,
fail-loud (`failed++`, non-fatal, mirrors the 4 sibling post-merge stages).
Post-merge is mandatory — the script writes `system-graph.json` *directly*, so
a pre-merge/FAST pass would be wiped by the merge rebuild; FAST[] is also
invoked **arg-less** so it cannot pass `--apply` (a FAST[] entry would silently
run in dry-run = never seed). Placed past the merge-abort gate (per
[[reference_u_regen_viz_merge_faillod_2026_05_17]]) so it never runs against a
stale/SIGKILLed-merge graph. 4 `node:test` structural fail-on-revert guards
(arg-pair literal / post-merge ordering / fail-loud / precedes downstream
readers) — the correct oracle class for an orchestrator-wiring unit.

## SCOPE HONESTY — necessary but NOT sufficient (R12)
Reviewer B's load-bearing finding: this clears ONLY the **data-side** gate. The
seed output verifiably passes all 4 `buildHoldout` filters at confidence ≥0.8
(traced predicate-by-predicate), so `poolSize ≥ 2` and the eval harness can
finally **run and produce a real grade** instead of deferring. But the
**model-side** gate is untouched: no checkpoint clears
AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15 (current 0.096 heterophily
anti-correlation). Full NN autonomy still needs: (a) the **operator**
out-of-session stratified retrain on the full 372k graph
(`graphsage-train-pipeline.mjs --node-type-field layer --neg-p-hard 0.7`), and
(b) **NN-GRAPH-MS2 U2** — the self-retrain lifecycle scheduled task (queued:
pool-rebuild → drift-detect → retrain → eval → auto-promote ONLY on gate-pass,
reusing the [[reference_fleet_reaper|fleet-reaper]] S4U scheduled-task pattern). Do NOT read U1 as "NN is
autonomous."

## P2 follow-ups (deferred, not this unit)
- Cross-process graph-write lock: every regen-viz post-merge stage does
  unguarded read-modify-write on `system-graph.json`; atomic-rename prevents
  truncation but concurrent fleet regens can lost-update. Pre-existing class.
- Real-data E2E: the 4 guards are source-greps; a `seed --apply` +
  `nn-graph-eval --no-write` poolSize≥2 smoke would close the last silent-break
  path (per [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]] real-data-E2E rule).

Related: [[reference_u_nng_pipeline_stratified_wire_2026_05_17]] (MS1 stratified
wire — the model-side fix this unblocks measurement for) ·
[[reference_nn_graph_ms0_2026_05_16]] (the heterophily root-cause) ·
[[reference_fleet_reaper_tier1_2026_05_17]] (the S4U scheduled-task pattern U2
will reuse).
