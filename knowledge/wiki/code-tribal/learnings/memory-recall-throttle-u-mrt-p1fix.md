# MEMORY-RECALL-THROTTLE/U-MRT-P1FIX — [MAIN] [MEMORY-RECALL-THROTTLE]/U-MRT-P1FIX (slot:golf): close 2 scrutiny P1s — throttle-file leak + embeddings resume-eviction gap

**Commit:** `07748c3c3c69` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T09:40:56-05:00
**Tags:** memory-recall-throttle, u-mrt-p1fix, auto-distilled

## Subject
[MAIN] [MEMORY-RECALL-THROTTLE]/U-MRT-P1FIX (slot:golf): close 2 scrutiny P1s — throttle-file leak + embeddings resume-eviction gap

## Body
```
[MAIN] [MEMORY-RECALL-THROTTLE]/U-MRT-P1FIX (slot:golf): close 2 scrutiny P1s — throttle-file leak + embeddings resume-eviction gap

Both raised by the independent reviewer on the U-MRS/U-MRDB/U-MRT body of work; both are
durability/hygiene defects (never wrong recall) but flagged per R12 + this repo's leak-discipline.

P1-1 (throttle per-session file leak): inject-throttle wrote a permanent
state/inject-throttle/<sid>.json per session with NO pruning — unbounded growth across
the 26-slot fleet (the named tmp-orphan leak class). FIX: pruneStaleSessions() GCs files
untouched >24h (DEFAULT_PRUNE_MS), called on the write path (frequency already throttle-
bounded; keeps the dir small so each scan is cheap); fail-soft; injected fs. Plus a
dir-local .gitignore so the transient files are never git-tracked (avoids touching the
peer-dirty shared .gitignore). +4 tests.

P1-2 (embeddings --resume retains stale vectors): U-MRS-EXCLUDE drops superseded records
from the BM25 sidecar, but build-memory-embeddings-sidecar --resume never evicted keys
absent from the source, so the dense sidecar diverged (couldn't resurface — the byKey
hydration guard is sound — but grew unbounded). FIX: in resume mode, intersect prior
results against the FULL inSc.records key set (not the --limit-truncated source);
surface evicted count.

VERIFIED: 16 throttle tests (incl. prune) + 54+46+8 across the suite = 124 green. Embeddings parse OK.
```

## Files touched (5)
- mcp-server/data/state/inject-throttle/.gitignore |  5 +++++
- scripts/build-memory-embeddings-sidecar.mjs      | 16 +++++++++++++---
- scripts/lib/inject-throttle.mjs                  | 33 +++++++++++++++++++++++++++++++--
- scripts/lib/inject-throttle.test.mjs             | 43 ++++++++++++++++++++++++++++++++++++++++++-
- 4 files changed, 91 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- wrong recall) but flagged per R12 + this repo's leak-discipline.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 07748c3c3c69`
- Milestone envelope: `mcp-server/data/milestones/MEMORY-RECALL-THROTTLE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._