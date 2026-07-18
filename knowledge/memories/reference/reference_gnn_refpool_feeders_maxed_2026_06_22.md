---
name: reference_gnn_refpool_feeders_maxed_2026_06_22
description: "EMPIRICAL: both GNN reference-pool feeders are FULLY APPLIED / idempotent no-op as of 2026-06-22 (slot:india). vault-to-gnn-refpool.mjs --apply -> 'UP-TO-DATE, all 14 vault refs already present' ; ghost-wire-outcomes-to-refpool.mjs --apply -> 'UP-TO-DATE, all 139 outcome refs already present' ; graph nodes=351265. So 153 confirmed-wiring reference ghosts (0.85 conf, 0 conflicts) are ALL already in system-graph.json. CONSEQUENCE: the standing 'NN/GNN full-coverage pending ref-pool growth' framing (CLAUDE.md + several memories) is STALE for the FEEDER lever -- re-running the feeders grows nothing. Reference-pool growth now requires NEW confirmed-wiring memories/outcomes accumulating over time (not a runnable action). The near-term tractable lever for GNN full-coverage is SHARPER FEATURES (H2GCN / GPU retrain), per [[gnn-selective-deploy]] + [[gnn-edges-lever]] (edges-lever CLOSED 2026-06-22, [[reference_gnn_ghost_holdout_headtohead_2026_06_22]]). Do NOT re-run the feeders expecting growth."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.593Z
aliases: reference_gnn_refpool_feeders_maxed_2026_06_22
---


# GNN reference-pool feeders are MAXED (idempotent no-op)

**Verified (slot:india /loop 2026-06-22):** ran both confirmed-wiring reference feeders
with `--apply` (heap-guarded, on the live 351,265-node `system-graph.json`):

| feeder | dry-run count | --apply result |
|---|---|---|
| `vault-to-gnn-refpool.mjs` | 14 (0.85 conf, 0 conflicts) | **UP-TO-DATE** -- all 14 already present, no write |
| `ghost-wire-outcomes-to-refpool.mjs` | 139 (0.85 conf, 0 conflicts) | **UP-TO-DATE** -- all 139 already present, no write |

So **153 confirmed-wiring reference ghosts are already in the graph** (by-dispatcher:
outcome side prism_turning:50, cam:28, calc:17, dev:14, ai:14, 5axis:4, safety:3,
orchestrate:5, session:2, cad:2; vault side business:4, quoting:4, edm:2, ...).

## Why this matters (R12 -- corrects stale guidance)

CLAUDE.md (NN-GRAPH section) + multiple memories frame the NN/GNN leg as
"**full-coverage pending ref-pool growth**." That is **stale for the runnable FEEDER
lever**: both feeders are idempotent no-ops, so re-running them grows the reference pool
by zero. Reference-pool growth from here is NOT a runnable action -- it requires NEW
confirmed-wiring memories (vault) + NEW outcome-ledger wirings to accumulate over time,
which the feeders will then pick up.

## The actual remaining lever

With the edges-lever **closed** (does not transfer to deployed ghosts,
[[reference_gnn_ghost_holdout_headtohead_2026_06_22]]) and the reference feeders **maxed**,
the only near-term tractable lever for GNN tier-5 full-coverage (AUROC>=0.78 at full
coverage; currently selective-deploy @tau=0.7, [[gnn-selective-deploy]]) is **sharper node
features** -- H2GCN heterophily hops (shipped default-off) and/or a GPU retrain with the
768d features on the Blackwell box ([[feedback_build_for_blackwell_hardware]]). That is a
heavy, GPU-bound, separate effort -- scope it as its own unit, not a quick loop iteration.

**Do NOT** re-run the feeders expecting pool growth (this memory exists to prevent that
rework). Re-verify only after a long interval (new confirmed wirings may have accrued).
