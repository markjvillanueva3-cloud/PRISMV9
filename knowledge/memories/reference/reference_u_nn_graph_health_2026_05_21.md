---
name: reference_u_nn_graph_health_2026_05_21
description: 2026-05-21 echo /loop iter 18. NN-GRAPH GraphSAGE tier-5 health SessionStart consumer — closes the neural-network/gnn substrate of the /goal loop. Surfaces the dormant GNN (AUROC 0.096 vs 0.78 gate). Commit 000aa532c2.
aliases: reference_u_nn_graph_health_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.006Z
---


# U-GOAL-SYNERGY-NN-GRAPH-HEALTH — neural-network/gnn substrate consumer (iter 18)

**Commit:** `000aa532c2` (clean, my banner)
**Loop state:** iter 18/20 status=ok

## What shipped

`.claude/hooks/nn-graph-health-inject.mjs` (~155 LOC) + test (19/19 PASS incl real-data E2E). A SessionStart consumer that surfaces the GraphSAGE GNN tier-5 wiring-inference health from `state/shared/nn-graph/NN-EVAL.json`.

This closes the **"neural network / gnn"** substrate of the /goal synergize loop — one of the 8 named substrates. The GraphSAGE GNN is the 5th tier of the wiring-inference cascade, but it is **DORMANT** (AUROC 0.096 vs the 0.78 NN-GRAPH-MS2 promotion gate, reference poolSize 0) — and that dormancy was **silent**. No chat saw it. Now every session start shows it.

## Live smoke

```
## 🧠 NN-GRAPH (GraphSAGE tier-5) health (4d old)
   ⚠ GNN wiring-inference tier DORMANT — reason: insufficient-reference-pool (reference poolSize 0). Tier-5 cascade defers to tiers 1-4.
   AUROC 0.096 (promotion gate ≥0.78) · Brier 0.249 (gate ≤0.15).
   _Full: state/shared/nn-graph/NN-EVAL.json. Disable: PRISM_NN_GRAPH_INJECT=0._
```

## Design

- **classifyGnn()** — pure: `dormant` = `deferred:true` OR no checkpoint; `healthy` = live AND AUROC≥0.78 AND Brier≤0.15. Fail-closed: an unmeasurable tier (missing auroc) is NOT certified healthy.
- **Silent only when healthy+deployed.** The operator-relevant states — dormant, or live-but-below-gate — always surface. This is the inverse of the other substrate consumers (which gate on a drift threshold); here the "interesting" state IS the default state, so the gate is "stay silent only when there's good news."
- Promotion-gate constants (`PROMOTE_AUROC_MIN=0.78`, `PROMOTE_BRIER_MAX=0.15`) are NN-GRAPH-MS2 doctrine (CLAUDE.md §NN-GRAPH), named + sourced in the hook header. NOT physics constants — display thresholds for a digest; a hook can't import from `mcp-server/src/physics` anyway.

## Consumer-only + lane safety

Producer-only would be wrong here — the producer (the `nn-graph-eval` pipeline) **already exists** and writes `NN-EVAL.json`. iter 18 is consumer-only: a read-only SessionStart digest. It does NOT touch any NN/GNN engine or the NN/GNN↔AI consumer code — that lane is `claude-dbba2d72`'s (standing constraint: avoid collision). **Verified dbba2d72 is not holding a slot** via `chat-slots.mjs list` before building — the lane was inactive, and a read-only digest of eval output is not a collision regardless.

## Loop status

iter 18/20. The /goal's 8 substrates now have observability surfaces:
- link-audit (iters 4-6 triplet), wiki-tribal (7-9 triplet), prism-ai-memo (13-16 triplet), meta-roost compounding all 3 (12+17), **nn/gnn (iter 18 consumer)**, swarm-launcher (iter 15 spec).

## Next-iter pickup

- **Iter 19** — handoff hygiene cross-check (memory ⇄ wiki backlink completeness; inverse of iter-7's wiki→tribal direction). No lane dependency.
- **Iter 20** — roll-up close-out + integration sweep: verify all 8 substrate surfaces are wired, regen `/system-viz`, final loop close.
- **SWARM-LAUNCHER-MS0** — U-SWARM-01..06 pickable once roadmap-registered.
