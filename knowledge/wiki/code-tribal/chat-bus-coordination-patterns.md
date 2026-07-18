---
name: chat-bus-coordination-patterns
category: code-tribal
domain: backend-dev
tags: [chat-bus, coordination, agent-chat, multi-chat, prism-development, ai-development]
last_updated: 2026-05-18
---

# Chat-Bus Coordination Patterns — async message channel across chats

PRISM's AGENT_CHAT.jsonl is the async coordination surface. With 26 concurrent chats, you cannot rely on file-claim alone — peer chats need to know WHAT you're doing, not just WHICH files you've locked. Five canonical patterns make the bus useful.

## Pattern 1 — Claim-announce before non-trivial edit

Before editing a contended area (CLAUDE.md, MEMORY.md, settings.json, system-graph.json), post:

prism_context:chat_post --message "claiming SCOPE-MS#/U-XXX for slot lima, ETA 2h, touching <file paths>"

Peer chats reading the bus on their next session will see the claim and skip the area. The 2026-05-15 feedback_chat_bus_post_before_edits codifies this as a standing rule.

## Pattern 2 — Decision broadcast (the why)

When picking between two viable approaches, post the decision + rationale:

prism_context:chat_post --message "chose Option A (X) over Option B (Y) for U-XXX; reason: Z. Other chats can override if they have new info."

Lets peers raise objections async; prevents the "two chats land conflicting designs" failure mode.

## Pattern 3 — Bug-found alert

When you discover a latent bug a peer chat introduced (not maliciously — usually schema drift):

prism_context:chat_post --message "BUG: <file>:<line> — <one-line description>. Owner appears to be claude-XXXX. Filing fix in U-YYY."

The owner sees it on their next session start. The fix typically lands in your unit if you have context; otherwise the bug-found alert is the handoff.

## Pattern 4 — Crash / abandonment notice

When a slot's chat crashed mid-unit and you're taking over:

prism_context:chat_post --message "slot lima crashed mid-U-XXX; taking over from commit <sha>; resuming at <next file>"

Prevents the new chat from rediscovering the abandoned state via file-claim conflicts.

## Pattern 5 — Milestone-complete announcement

When you close out a milestone:

prism_context:chat_post --message "MILESTONE-ID COMPLETE — X units shipped, Y deferred, evidence at <commit-sha>. Roadmap-index updated."

Triggers /close-out-audit refresh for peer chats; surfaces drift if peer's MILESTONE_PROGRESS is stale.

## Bus reading discipline

Read the bus at session start AND before any non-trivial change to a peer-touched area:

prism_context:chat_read --since "2026-05-18T10:00:00Z"

The default --since is the last bus-read timestamp for this chat (per-chat cursor). Override when investigating historical context.

## The "post is cheap, miss is expensive" rule

A 1-line bus post costs ~50 tokens. A coordination miss costs:
- A merge conflict (10-30 min to resolve)
- A wasted re-implementation (1-2 hours)
- A regression introduced because the peer's invariant wasn't visible (open-ended cost)

Post liberally. Spamming the bus is rare; the actual failure mode is silence.

## JSONL format

state/shared/AGENT_CHAT.jsonl entries:

{ts: "2026-05-18T19:30:00Z", chatId: "claude-396bc735", slot: "lima", message: "...", meta: {topic?, severity?}}

Append-only. Never overwrite. Peer chats may add structured fields; tolerate unknowns.

## Bus telemetry

Hook fire counts at mcp-server/data/state/hook-fire-counts.jsonl include chat-bus subscribe/post events. Use this to audit "did chat X read the bus before editing?"

## Anti-patterns

- Posting after the edit instead of before: defeats the purpose; the bus is for coordination, not narration.
- Vague posts: "working on stuff" — peer has no actionable signal.
- High-frequency status posts: 1/min spam dilutes signal; rate-limit to meaningful events.

## Related

- [[multi-chat-coordination]] — the 5 mechanisms total
- [[slot-worktree-playbook]] — slot worktree isolation pairs with bus posts
- [[memory-curation-discipline]] — handoffs vs bus (handoffs are per-chat private; bus is shared)
- CLAUDE.md "Lane discipline + conflict-fork rule"
- feedback_chat_bus_post_before_edits.md — the canonical doctrine
