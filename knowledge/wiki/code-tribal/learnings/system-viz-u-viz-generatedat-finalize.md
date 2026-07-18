# SYSTEM-VIZ/U-VIZ-GENERATEDAT-FINALIZE — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-GENERATEDAT-FINALIZE (slot:sierra): refresh graph generatedAt post-merge (rename refreshGraphTotals -> finalizeGraphMeta)

**Commit:** `481b96a4793b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T08:50:12-05:00
**Tags:** system-viz, u-viz-generatedat-finalize, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-GENERATEDAT-FINALIZE (slot:sierra): refresh graph generatedAt post-merge (rename refreshGraphTotals -> finalizeGraphMeta)

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-GENERATEDAT-FINALIZE (slot:sierra): refresh graph generatedAt post-merge (rename refreshGraphTotals -> finalizeGraphMeta)

Same bug class as U-VIZ-META-TOTALS-FINALIZE (7847424983), surfaced while shipping the cheap headline: the merged graph's top-level generatedAt is written ONCE by generate-system-viz at base-generation and NEVER refreshed by merge-augmentations / the post-merge stages -- so it was frozen at 2026-06-10 while the graph regenerates daily (regen stamp 2026-06-23). The headline + awareness-snapshot displays surface it as a freshness signal, so a 13-day-stale value is misleading.

Fix: renamed refreshGraphTotals -> finalizeGraphMeta (it now stamps BOTH meta.totals AND generatedAt) in seed-ghost-from-unwired.mjs, the LAST regen graph writer. R7 (deliberate, not silent): generatedAt now means "graph last (re)generated at" -- the natural reading for a continuously-regenerated artifact. Verified no consumer keys on it for correctness/cache (the find-cache + node-card + index + adjacency sidecars all track freshness via their own sourceMtimeMs, NOT graph.generatedAt); the only readers are the headline + awareness-snapshot freshness DISPLAYS, where a fresh value is strictly more correct. `now` is injectable for deterministic tests.

meta.totals refresh remains LIVE-VALIDATED (60588->355527 nodes via a real regen in the prior commit). generatedAt refresh runs in that SAME proven finalize path (so it live-refreshes on the next regen) + is unit-tested deterministically. Tests: seed-ghost 43/43 (finalizeGraphMeta: stale-overwrite+generatedAt / idempotent / default-now-valid-ISO / missing-arrays / no-meta-still-stamps / null-input). Clean rename (0 stale refreshGraphTotals call sites).
```

## Files touched (3)
- scripts/seed-ghost-from-unwired.mjs      | 48 ++++++++++++++++++++++++++++++------------------
- scripts/seed-ghost-from-unwired.test.mjs | 40 ++++++++++++++++++++++++++--------------
- 2 files changed, 56 insertions(+), 32 deletions(-)

## Lessons surfaced in commit body
- till-stamps / null-input). Clean rename (0 stale refreshGraphTotals call sites).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 481b96a4793b`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._