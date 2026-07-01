# CHEAP-NODE-ACCESS-MS0/U-VAULT-REVERSE-EDGE-STALE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VAULT-REVERSE-EDGE-STALE (slot:sierra): reader staleness flag — close the silent-drift gap both 3-of-3 reviewers flagged

**Commit:** `d856173b86d8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T22:38:51-05:00
**Tags:** cheap-node-access-ms0, u-vault-reverse-edge-stale, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VAULT-REVERSE-EDGE-STALE (slot:sierra): reader staleness flag — close the silent-drift gap both 3-of-3 reviewers flagged

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VAULT-REVERSE-EDGE-STALE (slot:sierra): reader staleness flag — close the silent-drift gap both 3-of-3 reviewers flagged

3-of-3 scrutiny on 96ed5222e2 PASSED but reviewers B+C converged on one real
gap: the reverse index can silently drift from the node-cards.jsonl it inverts
(as the forward edge regenerates), and the reader returned confident-but-possibly-
stale node ids with NO staleness flag — unlike node-card-read which surfaces it.
A stale index that says "stale" is safe; one that lies is the hazard (R12).

FIX: computeStaleness() in vault-backlink-read.mjs compares the index's
builtFromMtimeMs against the live source mtime (fail-soft — any stat error →
not-stale, never cry-wolf, never block a read). loadIndex + backlinksFor now carry
{stale, staleReason}; the doc-nodes CLI prints `⚠STALE (...)`. Mirrors
node-card-read's existing staleness convention (R11).

+3 tests (stamped-after→fresh, no-stamp→not-stale, source-newer→STALE+propagates
to backlinksFor) — all exercise the REAL mtime-comparison branch via a ROOT-relative
source (not the file-not-found fallback). 35/35 tests. Live: fresh index shows no
tag, cap honest (feedback_psn_definition → 164 nodes, showing 50 capped).

Remaining follow-up (reviewer C P2, tracked): wire build-vault-backlink-index.mjs
into the build-graph-index regen tail (same site as node-card-offset-index) so the
reverse index auto-refreshes instead of relying on a manual rebuild. The staleness
flag makes the drift LOUD until then.
```

## Files touched (4)
- scripts/lib/vault-backlink-read.mjs      | 54 +++++++++++++++++++++++++++++++++++++++++++-----------
- scripts/lib/vault-backlink-read.test.mjs | 54 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/system-viz-query.mjs             |  3 ++-
- 3 files changed, 99 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- til then.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d856173b86d8`
- Milestone envelope: `mcp-server/data/milestones/CHEAP-NODE-ACCESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._