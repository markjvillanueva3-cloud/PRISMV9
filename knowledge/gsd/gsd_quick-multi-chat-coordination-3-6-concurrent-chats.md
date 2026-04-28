---
source: gsd_quick
section: MULTI-CHAT COORDINATION (3-6 concurrent chats)
slug: multi-chat-coordination-3-6-concurrent-chats
indexed_at: 2026-04-28T02:39:36.845Z
---

## MULTI-CHAT COORDINATION (3-6 concurrent chats)

```
Per-chat handoff:    state/shared/handoffs/HANDOFF-<id>-<topic>.md
File claims:         file-claim-guard tags edits with claude-<id>
Chat bus:            state/shared/AGENT_CHAT.md (post via prism_context:chat_post)
Workboard:           state/shared/AGENT_WORKBOARD.md
Conflict warning:    PreToolUse hook flags edits to files claimed by other chats
Session id:          stable-session-id helper, prefer claude-XXX over host-PID
```
