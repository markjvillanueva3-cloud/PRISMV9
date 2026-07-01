# SIERRA-VIZ-HARDEN/U-VIZ-HEAP-DEDUP-NODEOPTS — [MAIN-FORCE] [SIERRA-VIZ-HARDEN]/U-VIZ-HEAP-DEDUP-NODEOPTS (slot:sierra): consolidate the 3 inlined heap-respawn blocks into one tested respawnWithHeap + make planHeapRespawn NODE_OPTIONS-aware (the 384 cap)

**Commit:** `baaf3c78592c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T08:59:58-05:00
**Tags:** sierra-viz-harden, u-viz-heap-dedup-nodeopts, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ-HARDEN]/U-VIZ-HEAP-DEDUP-NODEOPTS (slot:sierra): consolidate the 3 inlined heap-respawn blocks into one tested respawnWithHeap + make planHeapRespawn NODE_OPTIONS-aware (the 384 cap)

## Body
```
[MAIN-FORCE] [SIERRA-VIZ-HARDEN]/U-VIZ-HEAP-DEDUP-NODEOPTS (slot:sierra): consolidate the 3 inlined heap-respawn blocks into one tested respawnWithHeap + make planHeapRespawn NODE_OPTIONS-aware (the 384 cap)

Build-once completion (R15) of the heap-respawn pattern + a key root-cause finding.

DEDUP: the spawn block was inlined 3x (system-viz-query subgraph + main guard,
system-viz-node-dispatch isCli). Extracted respawnWithHeap({scriptUrl,argv,...,spawn})
into scripts/lib/viz-query-heap-reexec.mjs -- injectable `spawn` so it is unit-testable
without launching a real child. All 3 sites now call it; dropped the now-unused spawnSync
imports.

ROOT CAUSE of the "432MB fleet-wide cap": the harness sets
NODE_OPTIONS=--max-old-space-size=384 in the node environment (verified:
process.env.NODE_OPTIONS="--max-old-space-size=384", heap_size_limit=432MB). That is the
literal hard cap on utilization on this 136GB box -- NOT a node default.

NODE_OPTIONS-AWARE planHeapRespawn + maxOldSpaceMb(): a NODE_OPTIONS heap suppresses the
self-respawn ONLY when it is >= the heap we want (defaultMb). A SMALLER NODE_OPTIONS heap
(like the 384 cap) must NOT suppress -- the respawn's own --max-old-space-size CLI flag
overrides NODE_OPTIONS in the child. An explicit execArgv flag stays always-respected.

REGRESSION CAUGHT + FIXED PRE-COMMIT: my first cut treated ANY NODE_OPTIONS heap as
"handled", so on this box (NODE_OPTIONS=384) every graph CLI stopped respawning and ran on
384MB -- live validation showed thrash + empty output + 3 node-dispatch E2E failures. The
>=defaultMb gate fixes it. (The prior commits f5a64533de/c93d0179c2 were never affected --
they didn't check NODE_OPTIONS.)

VALIDATED: helper 20/20 (incl. the NODE_OPTIONS=384-must-respawn regression test +
maxOldSpaceMb parser), node-dispatch 50/50; live node-dispatch -> 0 thrash + correct JSON,
coverage-by-domain -> exit 0 "Coverage by domain (874/3798 = 23% wired)".

NEXT (this session): lift the NODE_OPTIONS=384 cap at its source (the real global fix).
Lesson: an env var that LOOKS like a fix (NODE_OPTIONS heap) can be the PROBLEM -- compare
its value to what you need, never treat its mere presence as adequate.
```

## Files touched (5)
- scripts/lib/viz-query-heap-reexec.mjs      | 78 ++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- scripts/lib/viz-query-heap-reexec.test.mjs | 90 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/system-viz-node-dispatch.mjs       | 18 +++++---------
- scripts/system-viz-query.mjs               | 48 +++++++++++------------------------
- 4 files changed, 186 insertions(+), 48 deletions(-)

## Lessons surfaced in commit body
- tilization on this 136GB box -- NOT a node default.
- Lesson: an env var that LOOKS like a fix (NODE_OPTIONS heap) can be the PROBLEM -- compare

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show baaf3c78592c`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ-HARDEN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._