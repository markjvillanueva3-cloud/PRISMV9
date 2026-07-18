# GRAPH-AUTOUSE/U-RELEVANCE-GATE — [MAIN-FORCE] [GRAPH-AUTOUSE]/U-RELEVANCE-GATE (slot:alpha): trim sub-15pct-of-top graph-inject hits so chats auto-use the graph on trust, not noise

**Commit:** `c2a470ac11a6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T11:33:59-05:00
**Tags:** graph-autouse, u-relevance-gate, auto-distilled

## Subject
[MAIN-FORCE] [GRAPH-AUTOUSE]/U-RELEVANCE-GATE (slot:alpha): trim sub-15pct-of-top graph-inject hits so chats auto-use the graph on trust, not noise

## Body
```
[MAIN-FORCE] [GRAPH-AUTOUSE]/U-RELEVANCE-GATE (slot:alpha): trim sub-15pct-of-top graph-inject hits so chats auto-use the graph on trust, not noise

Operator: find enhancements for the graph so chats auto-use it effectively. An 11-surface audit ranked relevance-thresholding as the highest leverage-per-line: searchGraphHits (the BM25-lite search behind master-index-precheck + pre-read/grep/write/bash-graph-inject -- ALL 5 graph-inject surfaces) injected ANY hit with score>0, padding blocks with low-confidence noise that trains the model to ignore the graph.

FIX: new pure exported applyRelevanceGate(ranked, minRatio) drops trailing hits below minRatio of THIS query's TOP score (ranked is sorted desc). ONE shared-lib change improves every graph-inject surface at once. Default 0.15, env-overridable PRISM_MASTER_INDEX_MIN_SCORE_RATIO (<=0 disables = instant rollback). SAFE-BY-CONSTRUCTION: the top hit's ratio is 1.0 so it always passes -- never drops the top, never empties a non-empty result (the hits[0] exact-match-collapse paths are unaffected). Calibrated vs the live query-log score distribution (min 1.5 / p50 13.5 / max 30): drops weak-field-only noise (info-only 1.5 / vault-only 1.0) while keeping label-matches (>=3.0) for typical queries.

VALIDATED: 68/68 tests (+8 reference-value: safe-by-construction, disable path, cluster-no-false-trim, end-to-end through searchGraphHits). Live: on real strong queries the gate dropped 0 hits (non-destructive). Per-file 2-arm scrutiny PASS (reviewer + code-analyzer), 0 P0/P1; one P2 (negative env should also disable) fixed inline.

HIGH-VALUE FOLLOW-UP (audit GAP #1, flagged for sierra/next): production master-index searches the 20K-node architecture-graph FALLBACK, not the 110K full graph -- the 257MB sidecar exceeds the heap parse ceiling. That is the bigger effective-auto-use lever. Operational note: the long-lived master-index daemon freezes the ratio at launch -- restart it for an env rollback to fully apply.
```

## Files touched (3)
- scripts/lib/master-index-search-lib.mjs      | 42 ++++++++++++++++++++++++++++++-
- scripts/lib/master-index-search-lib.test.mjs | 67 ++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 108 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- note: the long-lived master-index daemon freezes the ratio at launch -- restart it for an env rollback to fully apply.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c2a470ac11a6`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-AUTOUSE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._