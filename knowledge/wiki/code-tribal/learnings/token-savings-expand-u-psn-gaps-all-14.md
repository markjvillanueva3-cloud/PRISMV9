# TOKEN-SAVINGS-EXPAND/U-PSN-GAPS-ALL-14 — [MAIN] [TOKEN-SAVINGS-EXPAND]/U-PSN-GAPS-ALL-14 (slot:alpha): bulk-ship 14 remaining high-ROI token-saving gaps. A1+A2+A4+A6 via pretool-session-dedup (cross-tool signature cache, 30min TTL). A3 via pretool-edit-batching-nudge (3+ Edits in 60s on same file → MultiEdit hint). A7+C2 via userprompt-skill-and-subagent-nudges (skill match + subagent reuse hint). B2+B3+B4+B6 via posttool-threshold-nudges (slow Bash / many-hits Grep / oversized Edit / oversized Task return). D2+D3+E1+E2 via scripts/lib/token-savings-misc.mjs (stable cache + wiki cache + cost aggregator + top-N report). All knob-gated: PRISM_SESSION_DEDUP_DISABLE, PRISM_POSTTOOL_THRESHOLD_DISABLE, PRISM_EDIT_BATCH_NUDGE_DISABLE, PRISM_SKILL_SUBAGENT_NUDGE_DISABLE. Closes the 14-item enumeration; all PSN high-roi tool-call surfaces covered.

**Commit:** `44f8c217e946` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T19:55:58-05:00
**Tags:** token-savings-expand, u-psn-gaps-all-14, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-EXPAND]/U-PSN-GAPS-ALL-14 (slot:alpha): bulk-ship 14 remaining high-ROI token-saving gaps. A1+A2+A4+A6 via pretool-session-dedup (cross-tool signature cache, 30min TTL). A3 via pretool-edit-batching-nudge (3+ Edits in 60s on same file → MultiEdit hint). A7+C2 via userprompt-skill-and-subagent-nudges (skill match + subagent reuse hint). B2+B3+B4+B6 via posttool-threshold-nudges (slow Bash / many-hits Grep / oversized Edit / oversized Task return). D2+D3+E1+E2 via scripts/lib/token-savings-misc.mjs (stable cache + wiki cache + cost aggregator + top-N report). All knob-gated: PRISM_SESSION_DEDUP_DISABLE, PRISM_POSTTOOL_THRESHOLD_DISABLE, PRISM_EDIT_BATCH_NUDGE_DISABLE, PRISM_SKILL_SUBAGENT_NUDGE_DISABLE. Closes the 14-item enumeration; all PSN high-roi tool-call surfaces covered.

## Body
```
[MAIN] [TOKEN-SAVINGS-EXPAND]/U-PSN-GAPS-ALL-14 (slot:alpha): bulk-ship 14 remaining high-ROI token-saving gaps. A1+A2+A4+A6 via pretool-session-dedup (cross-tool signature cache, 30min TTL). A3 via pretool-edit-batching-nudge (3+ Edits in 60s on same file → MultiEdit hint). A7+C2 via userprompt-skill-and-subagent-nudges (skill match + subagent reuse hint). B2+B3+B4+B6 via posttool-threshold-nudges (slow Bash / many-hits Grep / oversized Edit / oversized Task return). D2+D3+E1+E2 via scripts/lib/token-savings-misc.mjs (stable cache + wiki cache + cost aggregator + top-N report). All knob-gated: PRISM_SESSION_DEDUP_DISABLE, PRISM_POSTTOOL_THRESHOLD_DISABLE, PRISM_EDIT_BATCH_NUDGE_DISABLE, PRISM_SKILL_SUBAGENT_NUDGE_DISABLE. Closes the 14-item enumeration; all PSN high-roi tool-call surfaces covered.
```

## Files touched (9)
- .../__tests__/posttool-threshold-nudges.test.mjs   |  43 +++++++++
- .../hooks/__tests__/pretool-session-dedup.test.mjs |  39 ++++++++
- .claude/hooks/posttool-threshold-nudges.mjs        |  68 ++++++++++++++
- .claude/hooks/pretool-edit-batching-nudge.mjs      |  59 ++++++++++++
- .claude/hooks/pretool-session-dedup.mjs            |  82 +++++++++++++++++
- .../hooks/userprompt-skill-and-subagent-nudges.mjs |  63 +++++++++++++
- scripts/__tests__/token-savings-misc.test.mjs      |  60 ++++++++++++
- scripts/lib/token-savings-misc.mjs                 | 102 +++++++++++++++++++++
- 8 files changed, 516 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 44f8c217e946`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-EXPAND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._