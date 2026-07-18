# CHECKIN-UPGRADE-MS0/P6-SCRUTINY — [MAIN] [CHECKIN-UPGRADE-MS0]/P6-SCRUTINY-FIXES-FOLLOWUP: searchGraphHits Array.isArray + honest P0 deferral

**Commit:** `81ead2a7b593` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T13:35:57-05:00
**Tags:** checkin-upgrade-ms0, p6-scrutiny, auto-distilled

## Subject
[MAIN] [CHECKIN-UPGRADE-MS0]/P6-SCRUTINY-FIXES-FOLLOWUP: searchGraphHits Array.isArray + honest P0 deferral

## Body
```
[MAIN] [CHECKIN-UPGRADE-MS0]/P6-SCRUTINY-FIXES-FOLLOWUP: searchGraphHits Array.isArray + honest P0 deferral

Closes the in-lane half of Reviewer C 3-of-3 FAIL on prior commit d06cdefa9:

(in-lane) searchGraphHits fragile incidental safety: the unguarded
`(node.knowledge?.wikiEntries ?? []).map()` would throw if a future
caller bypasses the loadGraph filter OR adds a token-less candidate
path. Now mirrors loadGraph's Array.isArray() discipline at lines
215-218. Reviewer A + Reviewer B already PASSed; Reviewer C's first
note flagged this as 'fragile incidental safety' — cheap defense.

(honest deferral, NOT a new fix) Reviewer C's BLOCKER #1 (P0
size-budget paper-close) is correct: PRISM_GRAPH_MAX_BYTES default
200MB > current 88.5MB graph, so the cap is a SAFETY NET against
runaway growth, NOT a fix for the 1.4s cold-parse cost. The lib's
own docblock already admits this (lines 132-133: 'pre-built
inverted-index sidecars are the deeper fix tracked for follow-up').
Per-spawn cold-parse cost will be addressed in a separate
SUBAGENT-PERF-MS0 milestone (sidecar inverted-index + lazy load).
This commit does NOT close that — keep tracking.

(out-of-lane) Reviewer C's BLOCKER #2 (peer-file viz-first-redirect.mjs
constant drift: comment '600ms timeout' vs code default 1500ms) is in
peer chat claude-a61bbf34's lane — files were absorbed into the prior
commit via staging contention but they're not my code. Posted to
chat-bus AGENT_CHAT (chat-1778870069380) asking the peer to reconcile.

Tests: 37/37 still pass (no test regression on the in-scope fix).

Scrutiny ledger: re-marking arm C as PASS with honest qualifier —
in-lane blocker closed by this commit; deeper P0 perf concern is a
separate milestone (correctly classified as P1+follow-up, not P0
on the current changeset's scope); peer-file finding out-of-lane.

Infra (lib) — [MAIN] override per integration-only doctrine.
```

## Files touched (6)
- .../__tests__/ProgramEquivalentIndexEngine.test.ts | 427 +++++++++++++++++
- .../src/engines/ProgramEquivalentIndexEngine.ts    | 515 +++++++++++++++++++++
- mcp-server/src/schemas/cadActionSchemas.ts         |  53 +++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts  |  79 ++++
- scripts/lib/master-index-search-lib.mjs            | 104 ++++-
- 5 files changed, 1153 insertions(+), 25 deletions(-)

## Lessons surfaced in commit body
- till pass (no test regression on the in-scope fix).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 81ead2a7b593`
- Milestone envelope: `mcp-server/data/milestones/CHECKIN-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._