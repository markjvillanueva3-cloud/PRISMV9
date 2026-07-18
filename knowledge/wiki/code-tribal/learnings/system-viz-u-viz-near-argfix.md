# SYSTEM-VIZ/U-VIZ-NEAR-ARGFIX — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR-ARGFIX (slot:sierra): fix P0 bare 'near <id>' never extracted the id (3-of-3 arm B catch)

**Commit:** `4dcc21826782` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T22:07:00-05:00
**Tags:** system-viz, u-viz-near-argfix, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR-ARGFIX (slot:sierra): fix P0 bare 'near <id>' never extracted the id (3-of-3 arm B catch)

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR-ARGFIX (slot:sierra): fix P0 bare 'near <id>' never extracted the id (3-of-3 arm B catch)

The inline predicate `params.find((p,i)=>!p.startsWith('--') && i!==kFlag+1)` excluded
index 0 when --k was absent (kFlag=-1 -> kFlag+1=0), so 'near <id>' and 'near <id> --json'
(the two simplest forms) failed with 'near needs <id>'. Every shipped live test happened to
use --k so it sailed through 12/12 green -- the CLI surface had zero coverage (P1). Fix:
extract pure parseNearArgs(params) (handles bare id, flag before/after, bad/non-positive k
-> default, missing id) + 9-case regression test pinning the index-0 bug + JSDoc usage line (P2).
Verified live (real node binary): bare 'near p.operator' -> 10 neighbors exit 0; '--json' ok;
'--k 3' no regression. 13/13 tests.
```

## Files touched (4)
- scripts/lib/node-near-search.mjs      | 22 ++++++++++++++++++++++
- scripts/lib/node-near-search.test.mjs | 16 +++++++++++++++-
- scripts/system-viz-query.mjs          |  7 +++----
- 3 files changed, 40 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4dcc21826782`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._