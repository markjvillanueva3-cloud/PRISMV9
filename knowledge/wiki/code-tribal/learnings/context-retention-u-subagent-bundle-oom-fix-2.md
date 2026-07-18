# CONTEXT-RETENTION/U-SUBAGENT-BUNDLE-OOM-FIX-2 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-SUBAGENT-BUNDLE-OOM-FIX-2 (slot:alpha): real systemViz counts in the bounded head-read (close reviewer note)

**Commit:** `d92b9f52f48c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T02:06:31-05:00
**Tags:** context-retention, u-subagent-bundle-oom-fix-2, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-SUBAGENT-BUNDLE-OOM-FIX-2 (slot:alpha): real systemViz counts in the bounded head-read (close reviewer note)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-SUBAGENT-BUNDLE-OOM-FIX-2 (slot:alpha): real systemViz counts in the bounded head-read (close reviewer note)

The OOM-fix's first readGraphHeadMeta brace-matched the whole meta object — but
meta is ~933KB (> the 256KB head) AND has brace-in-string values, so it degraded
to {} → summarizeSystemViz rendered '? nodes / ? edges ... built ?' (reviewer-
caught; my 'systemViz restored' claim was only half-true). Fix per the reviewer's
recommendation: targeted regex on the FLAT sub-objects — meta.counts +
meta.headline + meta.totals (each , brace-free, in the first ~430
bytes, string-brace-safe). Also fixed a PRE-EXISTING summarizeSystemViz mapping
bug: nodes/edges/layers live in meta.totals, not meta.counts (so they were '?'
even before this work). Validated LIVE (real numbers, not the label):
'System-viz: 20702 nodes / 77622 edges across 11 layers — built 2543 / unwired
729, 175 drift'. Bundle still emits MAIN at default heap.
```

## Files touched (2)
- scripts/agents/spawned-agent-context-lib.mjs | 38 +++++++++++++++++++++-----------------
- 1 file changed, 21 insertions(+), 17 deletions(-)

## Lessons surfaced in commit body
- till emits MAIN at default heap.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d92b9f52f48c`
- Milestone envelope: `mcp-server/data/milestones/CONTEXT-RETENTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._