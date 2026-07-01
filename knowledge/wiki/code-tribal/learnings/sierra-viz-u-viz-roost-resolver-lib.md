# SIERRA-VIZ/U-VIZ-ROOST-RESOLVER-LIB — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-ROOST-RESOLVER-LIB (slot:sierra): extract class-name->node-id resolver to a shared tested lib + DRY-wire into foldRoostAug

**Commit:** `e630e9a8ff41` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T08:57:10-05:00
**Tags:** sierra-viz, u-viz-roost-resolver-lib, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-ROOST-RESOLVER-LIB (slot:sierra): extract class-name->node-id resolver to a shared tested lib + DRY-wire into foldRoostAug

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-ROOST-RESOLVER-LIB (slot:sierra): extract class-name->node-id resolver to a shared tested lib + DRY-wire into foldRoostAug

The verifiable CORE of U-VIZ-ROOST-BRIDGE-RESOLVE (R13 build-core-before-integration):
scripts/lib/class-name-node-resolver.mjs maps a bare engine CLASS NAME ("MasterPostProcessorEngine")
to its live node-id ("eng.cam.masterpostprocessorengine") via the node-card OFFSET ORACLE (cheap
~351K ids, never the 575MB graph). buildClassNameIndex (prefer eng.*, deterministic lexicographic
tiebreak) + makeClassNameResolver(indexIds)->resolve(ref,validIds) + makeOracleResolver for generators.

Wired into merge-augmentations foldRoostAug (replaces the inline iter1/iter2 copy -- DRY, non-orphan).
Behavior PRESERVED: lib-backed fold recovers 185/210 echo-roost edges, IDENTICAL to the inline version.
Next step (separate unit): the 3 echo generators call makeOracleResolver to resolve bridge edges at
GENERATION time (the full U-VIZ-ROOST-BRIDGE-RESOLVE).

Tests: class-name-node-resolver.test.mjs 10/10 (incl. live-oracle integration); auditor 12/12; merge parses.
```

## Files touched (4)
- scripts/lib/class-name-node-resolver.mjs      | 70 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/class-name-node-resolver.test.mjs | 75 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/merge-augmentations.mjs               | 42 +++++++++++-------------------------------
- 3 files changed, 156 insertions(+), 31 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e630e9a8ff41`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._