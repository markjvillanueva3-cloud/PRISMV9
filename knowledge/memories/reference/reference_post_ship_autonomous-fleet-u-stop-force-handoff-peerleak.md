---
name: reference_post_ship_autonomous-fleet-u-stop-force-handoff-peerleak
description: Auto-distilled learnings from shipping AUTONOMOUS-FLEET/U-STOP-FORCE-HANDOFF-PEERLEAK (commit 66a0154e7). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.753Z
aliases: reference_post_ship_autonomous-fleet-u-stop-force-handoff-peerleak
---


# AUTONOMOUS-FLEET/U-STOP-FORCE-HANDOFF-PEERLEAK

[MAIN-FORCE] [AUTONOMOUS-FLEET]/U-STOP-FORCE-HANDOFF-PEERLEAK (slot:papa): fix full-UUID-vs-short-chatId peer-leak -- the Stop hook got session_id as the FULL harness UUID but chat-slots/handoffs are keyed by short claude-<8hex>, so slot resolved to '?' + the real handoff was missed -> it SYNTHESIZED a resume from git-log-1 on the SHARED branch (a PEER's commit) and force-continued the chat onto foreign work (papa->sierra auto-route). Fix: canonicalChatId(full-uuid->claude-short) + slot-scoped synthesis source (lastOwnCommitInfo greps (slot:<slot>, never shared-branch HEAD) + __isMain guard for testability. 19/19 tests incl canonicalChatId regression matrix. fleet-wide Stop hook

**Shipped:** 2026-06-24T20:46:43-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[autonomous-fleet-u-stop-force-handoff-peerleak]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._