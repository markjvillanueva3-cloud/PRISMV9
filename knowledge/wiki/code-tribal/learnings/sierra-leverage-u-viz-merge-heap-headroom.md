# SIERRA-LEVERAGE/U-VIZ-MERGE-HEAP-HEADROOM — [MAIN] [SIERRA-LEVERAGE]/U-VIZ-MERGE-HEAP-HEADROOM (slot:sierra): bump regen heap 16GB->24GB — fixes intermittent merge exit-134 OOM

**Commit:** `f87b3810cee1` · **By:** markjvillanueva3-cloud · **At:** 2026-05-29T19:51:55-05:00
**Tags:** sierra-leverage, u-viz-merge-heap-headroom, auto-distilled

## Subject
[MAIN] [SIERRA-LEVERAGE]/U-VIZ-MERGE-HEAP-HEADROOM (slot:sierra): bump regen heap 16GB->24GB — fixes intermittent merge exit-134 OOM

## Body
```
[MAIN] [SIERRA-LEVERAGE]/U-VIZ-MERGE-HEAP-HEADROOM (slot:sierra): bump regen heap 16GB->24GB — fixes intermittent merge exit-134 OOM

The merge stage OOM'd intermittently (.last-regen-failure.json 2026-05-29T01:47
exit 134 'Reached heap limit') at regen-viz's 16GB on the grown 576MB/~244K-node
graph — needs ~12GB resident minimum, so 16GB headroom became too thin. This is the
KEYSTONE blocker: a failed merge blocks the whole regen pipeline AND (transitively)
W1's 7 generators + N2 (both need a completing merge). NOT a missing-reader problem
(readGraphStreaming already used) — purely heap ceiling.

Fix: NODE_ARGS 16384->24576 + merge HEAP_MB_REQUIRED 12288->24576 (matched). Host
has 136GB total / 71GB free; 24GB verified allocatable (25.8GB limit honored); stages
run sequentially so peak is one 24GB proc. Reversible. Merge-guard still fail-louds if
24GB ever insufficient (no stale-graph write). Next regen exercises it; bump to 32768
if it recurs as the graph grows.
```

## Files touched (3)
- scripts/merge-augmentations.mjs | 7 ++++++-
- scripts/regen-viz.mjs           | 9 ++++++++-
- 2 files changed, 14 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till fail-louds if

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f87b3810cee1`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-LEVERAGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._