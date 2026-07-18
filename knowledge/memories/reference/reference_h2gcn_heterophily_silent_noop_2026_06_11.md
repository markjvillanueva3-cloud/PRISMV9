---
name: reference_h2gcn_heterophily_silent_noop_2026_06_11
description: "FINDING (for india): the documented GNN +0.138-AUROC lever PRISM_NN_RETRAIN_HETEROPHILY_HOPS=3 produces a SILENT NO-OP -- the retrain exits 0 with ZERO training output and no graded candidate checkpoint. The hops=0 path trains fine (AUROC 0.40). slot:charlie 2026-06-11."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.602Z
aliases: reference_h2gcn_heterophily_silent_noop_2026_06_11
---


**Finding (slot:charlie 2026-06-11, india's NN/GNN domain):** trying to demonstrate a measurable GNN improvement, I ran the documented heterophily lever (CLAUDE.md NN-GRAPH: `PRISM_NN_RETRAIN_HETEROPHILY_HOPS=3`, claimed "multi-seed-validated +0.138 AUROC lift"). It **silently no-ops**:

- `PRISM_NN_RETRAIN_HETEROPHILY_HOPS=3 node scripts/nn-graph-retrain-lifecycle.mjs --force` → exits 0, **ZERO stdout** (the hops=0 run prints ~19 lines incl AUROC).
- Reproduced with an explicit 16GB heap (`--max-old-space-size=16384` + `PRISM_NN_RETRAIN_LIFECYCLE_HEAP_MB=16384`) to rule out my heap-reexec fix → still exits 0, no output.
- The candidate checkpoint `graphsage-checkpoint.candidate.json` was touched (mtime fresh) but carries **no `auroc` / `heterophilyHops` / `featureDim` meta** → the trainer did NOT write a graded checkpoint. The ledger's last entry is the PRIOR (hops=0) run.

**The env IS wired** (`nn-graph-retrain-lifecycle.mjs:443` reads `PRISM_NN_RETRAIN_HETEROPHILY_HOPS` → `heterophilyHops`; `buildTrainArgs` ~289-300 pushes `--heterophily-hops` + bumps trainer heap ≥12288). So the break is DOWNSTREAM -- almost certainly in `graphsage-train-pipeline.mjs`'s `--heterophily-hops` path (the 4x-feature-dim H2GCN build): it likely throws/OOMs and exits before printing, and the lifecycle mis-reports it as a clean run.

**ROOT CAUSE (isolated 2026-06-11):** it is a **scale/native-OOM**, not a logic bug. `heterophilyAggregateMap` works on synthetic input; the trainer runs CLEAN at `--max-nodes 800` (AUROC 0.27, `H2GCN 3-hop mean egoDim=768->3072`, checkpoint written) but **silently dies exit-0 / no-output / no-checkpoint at the default ~6000-node cap** -- the 768d * 4 = 3072d feature matrix (6000*3072 floats) + the GraphSAGE model native-OOMs, and a NATIVE alloc failure does NOT trigger V8's heap-abort (so no exit 134, no FATAL print). `--max-old-space-size=16384` did not help (it's native, not V8-heap). The lifecycle's `defaultTrain` returned `{ok: r.status===0}` -> treated the exit-0 as SUCCESS.

**FIX SHIPPED (slot:charlie, R12 silent->loud):** pure `classifyTrainResult({status,signal,error,wroteCheckpoint})` in `nn-graph-retrain-lifecycle.mjs` + `defaultTrain` now stamps the candidate-checkpoint mtime before/after the spawn; a clean exit (status 0) with NO fresh checkpoint is now `{ok:false}` with an actionable error ("trainer exited 0 but wrote no fresh candidate checkpoint -- likely a silent native-OOM; lower --max-nodes; H2GCN 4x's the feature dim"). +4 reference tests (61/61). This does NOT make H2GCN run at scale -- it makes its silent failure LOUD so the lifecycle never eval/promotes a stale checkpoint or mislabels the round "trained".

**FAIR MULTI-SEED COMPARISON (2026-06-11, the rigorous disproof):** the earlier "0.27 < 0.40" was apples-to-oranges (hops3@800 vs hops0@6000, different N). Ran the FAIR test -- hops0 vs hops3 at the SAME N=800, 5 seeds each ([[feedback_multiseed_before_auroc_claim]]):
- hops=0: 0.258, 0.257, 0.196, 0.240, 0.264 -> **mean 0.243** (range 0.196-0.264)
- hops=3: 0.273, 0.218, 0.220, 0.230, 0.289 -> **mean 0.246** (range 0.218-0.289)
- **Lift = +0.003 -- statistically NIL** (ranges heavily overlap).

**CONCLUSION (evidence-backed, corrects stale doctrine):** the documented "+0.138 AUROC lift" from H2GCN **does NOT reproduce on the 768d-embedding substrate** -- it adds +0.003 (noise). Almost certainly because the +0.138 ([[reference_h2gcn_hop_sweep_2026_06_09]]) was measured on the OLD 8-dim PROJECTED features; with rich 768d embeddings ALREADY present, H2GCN's ego/neighbour aggregation is largely REDUNDANT (the embeddings already encode neighbourhood semantics). So H2GCN is NOT a viable AUROC-lift lever on the current substrate: it OOMs at the 6000-node cap AND adds nothing measurable at a safe cap. A GNN AUROC lift needs a DIFFERENT lever (reference-pool growth, a sharper pretext, or an architecture that complements -- not duplicates -- the 768d features) -- india's GPU/architecture domain. CLAUDE.md NN-GRAPH should drop/qualify the "+0.138" claim for the 768d era. Related: [[reference_h2gcn_hop_sweep_2026_06_09]], [[feedback_multiseed_before_auroc_claim]], CLAUDE.md NN-GRAPH, [[reference_ai_systems_6unit_complete_2026_06_11]].
