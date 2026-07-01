# MCP-RESILIENCE/U-MCP-BROADCAST-LAND-MAIN — [MAIN] [MCP-RESILIENCE]/U-MCP-BROADCAST-LAND-MAIN (slot:golf iter45): land /mcp-broadcast trio in main tree + wire UserPromptSubmit hook + fire fleet signal

**Commit:** `847ea41519a5` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T00:48:52-05:00
**Tags:** mcp-resilience, u-mcp-broadcast-land-main, auto-distilled

## Subject
[MAIN] [MCP-RESILIENCE]/U-MCP-BROADCAST-LAND-MAIN (slot:golf iter45): land /mcp-broadcast trio in main tree + wire UserPromptSubmit hook + fire fleet signal

## Body
```
[MAIN] [MCP-RESILIENCE]/U-MCP-BROADCAST-LAND-MAIN (slot:golf iter45): land /mcp-broadcast trio in main tree + wire UserPromptSubmit hook + fire fleet signal

The 3 files lived only in slot/golf since iter43+44, but the
UserPromptSubmit hook entry added to settings.json this session points at
the main-tree path (H:/prism/.claude/hooks/...) - so every chat would
silently fail the hook lookup until the trio landed in main. This commit
closes that.

Files (copied verbatim from H:/prism-slot-golf, no edits):
  scripts/mcp-broadcast-reconnect.mjs       - CLI fires the signal
  .claude/hooks/mcp-broadcast-reconnect-inject.mjs  - UPS hook surfaces nudge
  .claude/commands/mcp-broadcast.md         - /mcp-broadcast skill
  state/shared/mcp-reconnect-signal.json    - first live signal (2h TTL)

Wiring landed THIS session in C:/Users/wompu/.claude/settings.json
UserPromptSubmit[0] pos 42 + mirrored to H:/.claude/settings.json. The
inject hook is now in the chain in BOTH copies.

First signal fired 2026-05-25T05:47:20Z, TTL 7200s (expires 07:47:20Z).
Every chat that types a prompt within the window will see the
/mcp reconnect nudge in its UserPromptSubmit additionalContext.

This is part of the MCP permfix synthesis - see
knowledge/wiki/architecture/mcp-permfix-2026-05-25.md (lives on slot/golf
commit 4adb916929; not yet promoted to main).
```

## Files touched (4)
- .claude/hooks/mcp-broadcast-reconnect-inject.mjs | 104 +++++++++++++++++++++++
- scripts/mcp-broadcast-reconnect.mjs              |  62 ++++++++++++++
- state/shared/mcp-reconnect-signal.json           |   9 ++
- 3 files changed, 175 insertions(+)

## Lessons surfaced in commit body
- til the trio landed in main. This commit

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 847ea41519a5`
- Milestone envelope: `mcp-server/data/milestones/MCP-RESILIENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._