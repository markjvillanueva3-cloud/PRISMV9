# AUTONOMOUS-FLEET/U-STOP-FORCE-HANDOFF-PEERLEAK — [MAIN-FORCE] [AUTONOMOUS-FLEET]/U-STOP-FORCE-HANDOFF-PEERLEAK (slot:papa): fix full-UUID-vs-short-chatId peer-leak -- the Stop hook got session_id as the FULL harness UUID but chat-slots/handoffs are keyed by short claude-<8hex>, so slot resolved to '?' + the real handoff was missed -> it SYNTHESIZED a resume from git-log-1 on the SHARED branch (a PEER's commit) and force-continued the chat onto foreign work (papa->sierra auto-route). Fix: canonicalChatId(full-uuid->claude-short) + slot-scoped synthesis source (lastOwnCommitInfo greps (slot:<slot>, never shared-branch HEAD) + __isMain guard for testability. 19/19 tests incl canonicalChatId regression matrix. fleet-wide Stop hook

**Commit:** `66a0154e7356` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T20:46:43-05:00
**Tags:** autonomous-fleet, u-stop-force-handoff-peerleak, auto-distilled

## Subject
[MAIN-FORCE] [AUTONOMOUS-FLEET]/U-STOP-FORCE-HANDOFF-PEERLEAK (slot:papa): fix full-UUID-vs-short-chatId peer-leak -- the Stop hook got session_id as the FULL harness UUID but chat-slots/handoffs are keyed by short claude-<8hex>, so slot resolved to '?' + the real handoff was missed -> it SYNTHESIZED a resume from git-log-1 on the SHARED branch (a PEER's commit) and force-continued the chat onto foreign work (papa->sierra auto-route). Fix: canonicalChatId(full-uuid->claude-short) + slot-scoped synthesis source (lastOwnCommitInfo greps (slot:<slot>, never shared-branch HEAD) + __isMain guard for testability. 19/19 tests incl canonicalChatId regression matrix. fleet-wide Stop hook

## Body
```
[MAIN-FORCE] [AUTONOMOUS-FLEET]/U-STOP-FORCE-HANDOFF-PEERLEAK (slot:papa): fix full-UUID-vs-short-chatId peer-leak -- the Stop hook got session_id as the FULL harness UUID but chat-slots/handoffs are keyed by short claude-<8hex>, so slot resolved to '?' + the real handoff was missed -> it SYNTHESIZED a resume from git-log-1 on the SHARED branch (a PEER's commit) and force-continued the chat onto foreign work (papa->sierra auto-route). Fix: canonicalChatId(full-uuid->claude-short) + slot-scoped synthesis source (lastOwnCommitInfo greps (slot:<slot>, never shared-branch HEAD) + __isMain guard for testability. 19/19 tests incl canonicalChatId regression matrix. fleet-wide Stop hook
```

## Files touched (3)
- .claude/hooks/__tests__/stop-force-handoff.test.mjs | Bin 5417 -> 7083 bytes
- .claude/hooks/stop-force-handoff.mjs                |  86 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---------------
- 2 files changed, 71 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 66a0154e7356`
- Milestone envelope: `mcp-server/data/milestones/AUTONOMOUS-FLEET.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._