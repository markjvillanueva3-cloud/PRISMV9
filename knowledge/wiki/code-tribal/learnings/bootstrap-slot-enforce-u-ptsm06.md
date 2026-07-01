# BOOTSTRAP-SLOT-ENFORCE/U-PTSM06 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] U-PTSM06+U-MRS-TTL+U-PMDS01 (slot:alpha): drain pending — bash-node detector + MRS-DOCTRINE TTL 30m→24h + route-suggest mcp-down guard

**Commit:** `b14f2f915b03` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T12:53:52-05:00
**Tags:** bootstrap-slot-enforce, u-ptsm06, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] U-PTSM06+U-MRS-TTL+U-PMDS01 (slot:alpha): drain pending — bash-node detector + MRS-DOCTRINE TTL 30m→24h + route-suggest mcp-down guard

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] U-PTSM06+U-MRS-TTL+U-PMDS01 (slot:alpha): drain pending — bash-node detector + MRS-DOCTRINE TTL 30m→24h + route-suggest mcp-down guard

GOAL-CLEAR drain — closes the three "staged on disk pending peer lock" items
flagged in claude-95e7030e's 2026-05-25 02:25 CDT handoff. 50/50 tests PASS.

1. U-PTSM06 (.claude/hooks/pre-tool-savings-multi.mjs + test):
   classifyBashNode() — detects bare `node <script>` invocations and nudges
   `rtk node` (or `command node` to bypass). RTK session telemetry shows
   `node` is the top uncaptured token spend (~9.6k tokens/session). Skips
   already-wrapped (rtk node / command node), cheap version probes
   (--version/-v), and non-script-run REPL invocations. Wired into the main
   switch so git classifier wins when both match — node-via-rtk is not a git
   command anyway.

2. U-MRS-TTL (.claude/hooks/mcp-route-suggest.mjs):
   _DOCTRINE_RATE_WINDOW_MS bumped 30min → 24h. Per U-HOOK-INJECT-ROI audit,
   45 fires/9.6K despite the 30min rate-limit because per-(session, file) key
   gets re-tripped on long /loop sessions. The doctrine block is identical
   every fire; 24h ≈ per-session for the same doctrine target. Companion to
   slot-soul / comp-build / MRI TTL bumps.

3. U-PMDS01 (.claude/hooks/mcp-route-suggest.mjs):
   Suppress route-suggest noise when MCP daemon is unreachable. Every
   dispatcher nudge points at prism_* actions that would fail if the daemon
   is down. Honest fail-safe: stale state → don't suppress. Knob
   PRISM_ROUTE_SUGGEST_HONOR_MCP_DOWN=0 disables this gate.

Why only these 3 files: the shared tree has ~5100 modified files of fleet-wide
drift accumulated across sessions. Per feedback_commit_to_slot_worktree.md +
feedback_no_git_stash_shared_tree.md, bulk-committing shared-tree drift would
absorb peer work-in-progress. Per-file last-committer audit isolated the
alpha-owned subset (3 files); the rest (psn-leg-state-inject=bravo,
stop-session-spend-summary=charlie, glob-narrow-path=sierra-pending-merge,
HOOK-SYNERGY-MS0 + auto-generated state files) are left for owners.
```

## Files touched (4)
- .../__tests__/pre-tool-savings-multi.test.mjs      | 44 ++++++++++++++++++++-
- .claude/hooks/mcp-route-suggest.mjs                | 20 +++++++++-
- .claude/hooks/pre-tool-savings-multi.mjs           | 45 +++++++++++++++++++++-
- 3 files changed, 105 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b14f2f915b03`
- Milestone envelope: `mcp-server/data/milestones/BOOTSTRAP-SLOT-ENFORCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._