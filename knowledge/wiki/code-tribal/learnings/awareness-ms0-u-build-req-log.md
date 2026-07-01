# AWARENESS-MS0/U-BUILD-REQ-LOG — [MAIN] [AWARENESS-MS0]/U-BUILD-REQ-LOG + INJECTION-AWARENESS: persistent build-requests log + injection-system meta-awareness

**Commit:** `322bfe3cf32e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T15:14:46-05:00
**Tags:** awareness-ms0, u-build-req-log, auto-distilled

## Subject
[MAIN] [AWARENESS-MS0]/U-BUILD-REQ-LOG + INJECTION-AWARENESS: persistent build-requests log + injection-system meta-awareness

## Body
```
[MAIN] [AWARENESS-MS0]/U-BUILD-REQ-LOG + INJECTION-AWARENESS: persistent build-requests log + injection-system meta-awareness

Two operator asks (2026-05-17):

1. "keep a log of my requests throughout all our sessions on what I want
   to build" — NEW state/shared/USER-BUILD-REQUESTS-LOG.md: append-only,
   dated, [backend-dev]/[app-feature] tables, each row carries a system-viz
   status (existing-node / ghost-node / needs-creation). Seeded with this
   session's requests + the product vision. Standing append-protocol lives
   in memory feedback_user_build_requests_log. Deliberately NOT a hook —
   the token-savings audit found ~500 dead hooks; this is chat-discipline.
   Upstream of ROADMAP-CONSOLIDATED (intent record, not work inventory).

2. "improve awareness of the system-viz + obsidian + prism-awareness +
   memories + tribal injection system" — extended
   feedback_tribal_obsidian_viz_utilization_protocol.md with a new
   INJECTION SYSTEM section: the 39 SessionStart + 25 UserPromptSubmit +
   1 SubagentStart injectors, each with its CONSUMPTION rule (what to DO
   when it fires) + knobs + injection-layer anti-patterns. The doc
   previously covered the 3 data surfaces but not the injection mechanism.

Core doctrine both reinforce: an injection is a search done FOR you —
consuming it instead of re-deriving is the point. Letting injections
wash past is the writer-without-reader waste the token-savings audit
named, applied to the awareness layer itself.

Memory (Obsidian, gitignored): feedback_user_build_requests_log.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- ...ack_tribal_obsidian_viz_utilization_protocol.md | 47 +++++++++++++++
- state/shared/USER-BUILD-REQUESTS-LOG.md            | 66 ++++++++++++++++++++++
- 2 files changed, 113 insertions(+)

## Lessons surfaced in commit body
- tilization_protocol.md with a new

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 322bfe3cf32e`
- Milestone envelope: `mcp-server/data/milestones/AWARENESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._