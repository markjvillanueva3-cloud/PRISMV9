# GRAPH-AUTOUSE/U-INLINE-CARD-PARITY — [MAIN-FORCE] [GRAPH-AUTOUSE]/U-INLINE-CARD-PARITY (slot:alpha): bring pre-grep names-block truncation into ASCII/1500 parity with the 3 siblings

**Commit:** `5f606e42d809` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T13:06:20-05:00
**Tags:** graph-autouse, u-inline-card-parity, auto-distilled

## Subject
[MAIN-FORCE] [GRAPH-AUTOUSE]/U-INLINE-CARD-PARITY (slot:alpha): bring pre-grep names-block truncation into ASCII/1500 parity with the 3 siblings

## Body
```
[MAIN-FORCE] [GRAPH-AUTOUSE]/U-INLINE-CARD-PARITY (slot:alpha): bring pre-grep names-block truncation into ASCII/1500 parity with the 3 siblings

Cosmetic consistency cleanup flagged by 3 prior scrutiny passes: pre-grep's multi-hit truncation was the lone straggler (unicode ellipsis at cap+1=1501); the other 3 BM25 hooks reserve 3 bytes for an ASCII ... marker (exact 1500). Byte-identical to the thrice-2-arm-scrutinized sibling pattern. 2 test assertions tightened. pre-grep 25/25 pass; all 4 hooks now grep-confirmed identical truncation. GRAPH-AUTOUSE GAP-A arc COMPLETE: all 4 PreToolUse BM25 hooks inject node-card CONTENT.
```

## Files touched (3)
- .claude/hooks/pre-grep-graph-inject.mjs      | 3 ++-
- .claude/hooks/pre-grep-graph-inject.test.mjs | 7 ++++---
- 2 files changed, 6 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5f606e42d809`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-AUTOUSE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._