> **✅ ALREADY-DONE (triage `wq31b7vsz`, 2026-06-02).** Both registrations live in regen-viz.mjs (L116) + merge-augmentations.mjs (L165/L265/L2056+), byte-matching the patch; header self-declares APPLIED 2026-06-01 (U-GCF-VIZ-ROOST-WIRE). CLOSED — no action.

# PATCH-SIBLING — wire the federation roost into /system-viz (U-GCF-VIZ-ROOST)

> ✅ **APPLIED DIRECTLY 2026-06-01 (U-GCF-VIZ-ROOST-WIRE, slot:alpha).** The peer-dirty target files committed their
> in-flight work and went clean, so alpha applied both registrations directly (no clobber). This file is retained as
> the record/spec; **sierra action is no longer required.** Fold verified (6 nodes/5 edges).

**From:** slot alpha (GALAXY-CONTEXT-FEDERATION-MS0) · **For:** sierra (system-viz domain owner) · **Date:** 2026-06-01

## Why this is a patch-sibling, not a direct edit
The two target files (`scripts/regen-viz.mjs`, `scripts/merge-augmentations.mjs`) had **uncommitted peer work** (` M` in the shared tree — bravo's 2026-06-01 octopus-consensus, same day) when alpha built the roost. A pathspec commit from alpha would have swept the peer's uncommitted changes into alpha's commit (the multi-writer-clobber / attribution-loss class), and `git add -p` is unavailable in the harness. So the **generator + its augmentation output ship now** (self-contained, alpha's lane); the **2-line registration into the contended canonical files is deferred here** for whoever next touches them clean.

## What already shipped (alpha, committed)
- `scripts/generate-galaxy-federation-roost-features.mjs` — pure `generate()` + fail-soft main; reads the federation sidecars under `state/shared/galaxy-cards/` (INDEX/MASTER-DIGEST/KNOWS-MAP/DEDUP-REPORT/SAVINGS-REPORT), writes `state/shared/system-viz/galaxy-federation-roost-augmentation.json` (`{schemaVersion,generatedAt,source,newNodes[],newEdges[]}`). Live: 1 meta-roost `ghost.galaxy_federation` (L7, parent `ghost.planned_features`) + 5 child roosts `ghost.gcf_{cards,digest,knows_map,dedup,savings}` (L8), 5 `aggregates` edges. Node/edge shape mirrors `generate-substrate-meta-roost-features.mjs` exactly.
- `scripts/generate-galaxy-federation-roost-features.test.mjs` — 11/11 node:test pass.

## The 2 registrations to apply (both additive — mirror the `substrate-meta-roost` / `octopus-consensus` precedents)

### 1. `scripts/regen-viz.mjs` — add to the ordered generator list (near line 115, beside `generate-substrate-meta-roost-features.mjs`)
```js
  "generate-galaxy-federation-roost-features.mjs",  // GALAXY-CONTEXT-FEDERATION-MS0/U-GCF-VIZ-ROOST (slot:alpha 2026-06-01) — ghost.galaxy_federation roost (cards/digest/knows-map/dedup/savings child roosts); merge loadOptional's galaxy-federation-roost-augmentation.json.
```

### 2. `scripts/merge-augmentations.mjs` — three additive lines, mirroring `substrateMetaRoost` exactly

(a) loader, near line 164 beside the other `loadOptional`s:
```js
const galaxyFederationRoost = loadOptional("galaxy-federation-roost-augmentation.json");  // U-GCF-VIZ-ROOST (slot:alpha 2026-06-01)
```

(b) splice block, near line 2025 beside the `substrateMetaRoost` block (same addNodeIndexed/edge-push shape):
```js
let galaxyFederationRoostNodes = 0, galaxyFederationRoostEdges = 0;
if (galaxyFederationRoost?.newNodes) {
  for (const node of galaxyFederationRoost.newNodes) {
    if (!byId.has(node.id)) { addNodeIndexed(node); galaxyFederationRoostNodes++; }
  }
  for (const edge of (galaxyFederationRoost.newEdges || [])) {
    G.edges.push(edge); galaxyFederationRoostEdges++;
  }
  G.meta.galaxyFederationRoost = { generatedAt: galaxyFederationRoost.generatedAt, stats: galaxyFederationRoost.stats, nodesAdded: galaxyFederationRoostNodes, edgesAdded: galaxyFederationRoostEdges };
}
```
> Match the EXACT addNodeIndexed/edge-push idiom of the adjacent `substrateMetaRoost` block at the point of insertion — the snippet above is the shape as of this writing; if that block's idiom has since changed, copy the current one and swap the variable names.

(c) versions line, near line 263:
```js
if (galaxyFederationRoost) versions.galaxyFederationRoost = galaxyFederationRoost.generatedAt ?? "present";
```

## Verify after applying
```bash
node scripts/generate-galaxy-federation-roost-features.mjs   # regenerates the augmentation (6 nodes / 5 edges)
node scripts/regen-viz.mjs                                    # full graph rebuild (runs the generator + merge)
# then in /system-viz: ghost.galaxy_federation appears under ghost.planned_features with 5 child roosts.
```

## Honest status
Roost generator: **BUILT + tested + produces a correct augmentation**. In `/system-viz`: **NOT visible until these 2 registrations are applied** (deferred to avoid clobbering peer-uncommitted work). The augmentation file is harmless if unregistered — it just sits unconsumed.
