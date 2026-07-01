---
name: reference_sierra_heavy_graph_levers_nongaps_2026_06_24
description: "Sierra 2026-06-24 deep-verified that the 'heavy graph levers' (FAST[] register the 3 unwired generators / fold cross-substrate edges / sidecar shard) are NON-GAPS or deliberately-avoided. Prevents a future sierra loop from re-chasing them or forcing a risky regen. The ONE genuine graph augmentation (sfc-variability 45MB) needs SHARDING before it can be safely folded."
type: reference
slot: sierra
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.192Z
aliases: reference_sierra_heavy_graph_levers_nongaps_2026_06_24
---


# Sierra: the "heavy graph levers" are non-gaps (deep-verified 2026-06-24)

After the operator chose "do the heavy graph levers", I verified each candidate end-to-end
(static audit + on-disk inspection, NO risky regen). Evidence:

- **FAST[] dual-registration: 0 gaps.** `node scripts/audit-viz-dual-registration.mjs --json`
  → crashRisks 0 / silentDiscards 0 / orphans 0 / dangling 0. No generator is half-registered.
- **The 3 generators my 06-23 note flagged as "unregistered" are NOT graph gaps:**
  - `generate-psn-health-features.mjs` → `staging/psn-health.json` (1.6KB) is a **DASHBOARD FEEDER**
    (`{schema_version, legs:[{id,name,status,signal}], summary}`, polled every 5s), NOT a graph
    augmentation (`{nodes,edges}`). Different consumer; not a silent-discard.
  - `generate-galaxy-features.mjs` → `staging/galaxy-roosts/*.json` (71KB, 22 files) are
    **galaxy-doctrine STATUS snapshots** (`{galaxy, soul, pillars, pillarsGreen/Yellow/Red, crossRefs}`),
    NOT graph nodes. Also a dashboard/status feeder.
  - `generate-sfc-variability-features.mjs` → `augmentations/sfc-variability.json` IS a genuine
    ghost-node augmentation BUT it is **45,080,856 bytes (≈225K nodes), stale (May 18)**. Folding it
    into the 834MB / ~355K-node merged graph would ~double it and is the documented merge OOM /
    V8 string-cap class. It was left unwired **on purpose** (size). merge-augmentations has **no
    subdir scanner**, so nothing in `staging/`/`augmentations/` auto-folds.
- **Cross-substrate typed-edge spine: already wired** (NOT a gap) — `generate-cross-substrate-edges.mjs`
  in regen FAST[] (line 197, U-XSUB-FAST-REGISTER 2026-06-03) + merge `loadOptional("cross-substrate-edges-augmentation.json")`
  (line 275) + `G.meta.crossSubstrateEdges` fold (line 1071). Augmentation 18MB on disk, folds every regen.
- **Master-index sidecar shard:** per [[reference_sierra_octopus_localonly_and_synergy_state_2026_06_23]]
  this is a DELIBERATE tradeoff (the 384MB hook-heap cap is load-bearing; raising it reintroduces the
  Windows commit-reservation MCP outage — [[windows-commit-reservation-hook-heap]]). Sharding is a
  high-cost load-bearing rewrite for modest advisory value. NOT a high-ROI loop unit.

## Net: no clean/safe heavy-graph unit is available in a loop session right now
A regen-viz IS the sanctioned ~7min writer (ran fine 1.5h ago, 24GB heap, not the reckless thing) —
but with nothing new to fold, a regen now reproduces the same graph for zero gain. The ONE genuine
augmentation (sfc-variability) needs its GENERATOR redesigned to emit a BOUNDED roost (a summary +
sampled machine nodes, not all ~225K config nodes) before it can be safely folded — that is a
dedicated design unit (touches oscar's SFC generator + a sierra fold block), NOT a loop iteration.
Do NOT force a 45MB fold into the fleet-critical graph to manufacture "heavy lever" activity.

Related: [[reference_sierra_resolver_memory_safe_2026_06_24]] ·
[[reference_sierra_octopus_localonly_and_synergy_state_2026_06_23]] ·
[[reference_sierra_deep_sweep_exhausted_2026_06_12]] · [[windows-commit-reservation-hook-heap]]
