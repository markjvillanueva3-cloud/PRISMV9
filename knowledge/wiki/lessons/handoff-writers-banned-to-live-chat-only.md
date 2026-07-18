---
title: "Handoff writers banned to live chat only"
name: handoff-writers-banned-to-live-chat-only
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_handoff_writers.md
promoted_at: 2026-06-06T04:55:47.113Z
source_refs: 7
---

# Handoff writers banned to live chat only

Only the live Claude chat session writes per-agent handoffs. Hooks
(PreCompact auto-writer, PostCompact, any auto-trigger) and subagents
(Agent-spawned) are BANNED from writing handoffs.

**Why:** Auto-generated handoffs were producing generic stubs like
`"Pre-compact snapshot (RESUME generated)"` and overwriting the meaningful
RESUME directives that the live chat had crafted. After /compact, /startup
would read these stubs and have no idea what the chat was actually doing.
The user has been hitting this repeatedly across sessions — "we always have
issues with per agent handoffs being generics and stubs" (2026-05-06).

**How to apply:**
1. `per-agent-handoff.mjs cmdWrite` requires `--source live-chat` — rejects
   anything else (hook, subagent, automation) with `error: "writer_banned"`.
2. `precompact-handoff.mjs` (the PreCompact hook helper) NO LONGER writes
   handoffs. It emits a systemMessage telling the live chat to run
   `/precompact` BEFORE `/compact`.
3. `/precompact` and `/handoff` skills pass `--source live-chat` explicitly
   when invoking the writer.
4. When spawning subagents via Agent(), do NOT instruct them to write
   handoffs. Only the conversation-level Claude writes.

**If you ever see `error: "writer_banned"`**: you're trying to write a
handoff from the wrong context. Run /precompact or /handoff in the live
chat instead — that's the single source of truth for RESUME directives.

## Source

Promoted from memory [[feedback_handoff_writers]] (referenced 7x across the vault). The memory remains the editable source of truth.
