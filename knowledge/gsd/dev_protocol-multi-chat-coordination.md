---
source: dev_protocol
section: Multi-Chat Coordination
slug: multi-chat-coordination
indexed_at: 2026-04-28T02:41:58.324Z
---

## Multi-Chat Coordination

```
Per-chat handoff:    state/shared/handoffs/HANDOFF-<id>-<topic>.md
                     Topic enforced by Stop hook enforce-handoff-topic.

File claims:         file-claim-guard (PreToolUse) tags edits with
                     stable session id. 15-minute lease. Other chats
                     warn before editing claimed files.

Commit ownership:    commit-ownership-guard (PreToolUse Bash) checks
                     staged files against ownership ledger. Accepts
                     both `claude-XXX` payload IDs and
                     `host-${hostname()}` fallback as "ours"
                     (HOOK-FIX-5/C).

Chat bus:            state/shared/AGENT_CHAT.md — post via
                     prism_context:chat_post when starting non-trivial
                     edits or when changing direction.

Workboard:           state/shared/AGENT_WORKBOARD.md — claim a unit
                     before starting; release on completion.
```
