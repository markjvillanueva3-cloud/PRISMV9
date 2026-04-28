---
source: gsd_micro
section: Multi-Chat Coordination
slug: multi-chat-coordination
indexed_at: 2026-04-28T02:39:36.883Z
---

## Multi-Chat Coordination

```
Stable session id: helpers/stable-session-id.mjs → claude-<8-char-id>
                   Fallback: host-${hostname()} (NOT host-PID)

Per-chat handoff:  state/shared/handoffs/HANDOFF-<id>-<topic>.md
                   Topic derived in order: commit's [SCOPE-MS#] →
                   CURRENT_POSITION.md milestone → branch slug.
                   Stop hook enforce-handoff-topic.mjs renames
                   topicless files automatically.

File claims:       file-claim-guard tags edits as ${session}.
                   commit-ownership-guard accepts both `claude-XXX`
                   payload IDs and `host-${hostname()}` fallback as
                   "ours" (HOOK-FIX-5/C).

Chat bus:          state/shared/AGENT_CHAT.md
                   Post via prism_context:chat_post
                   PreToolUse warns on edits to files claimed by
                   other chats (within 15-minute lease).

Workboard:         state/shared/AGENT_WORKBOARD.md
Conflict ledger:   state/shared/AGENT_COORDINATION_STATUS.md
```
