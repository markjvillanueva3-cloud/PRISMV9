---
title: Shared Agent Bridges & Coordination Directives Index
slug: shared-directives-index
category: coordination
status: canonical
owner: CLEANUP-MS0/U-CLEANUP-D3
created_at: 2026-05-13
schema_version: 1
freshness_rule: "Directives >7 days stale must be refreshed before relying on them."
---

# Shared Agent Bridges (Claude ↔ Codex parity)

Long-term operating directives for the multi-agent PRISM fleet. Originally inlined in
`H:/prism/CLAUDE.md` (§ SHARED AGENT BRIDGES); extracted here by U-CLEANUP-D3 to slim
the top-level CLAUDE.md while keeping the catalog navigable.

## Directives — read when coordination rules matter

| Path | Purpose | Owned by |
|------|---------|----------|
| [`state/shared/CLAUDE-CODEX-MCP-DIRECTIVE.md`](../../../state/shared/CLAUDE-CODEX-MCP-DIRECTIVE.md) | MCP dev rules — what tools to wire, where dispatchers live, action-naming convention | shared (Claude + Codex) |
| [`state/shared/CLAUDE-CODEX-COORDINATION-DIRECTIVE.md`](../../../state/shared/CLAUDE-CODEX-COORDINATION-DIRECTIVE.md) | Concurrent-work discipline — file claims, lane discipline, conflict-fork rule | shared |
| [`state/shared/CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md`](../../../state/shared/CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md) | Finish-first gate, SVI trigger thresholds | shared |
| [`state/shared/CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md`](../../../state/shared/CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md) | Task claims + heartbeat protocol — how a chat says "I own this unit" | shared |
| [`state/shared/CLAUDE-CODEX-SVI-DIRECTIVE.md`](../../../state/shared/CLAUDE-CODEX-SVI-DIRECTIVE.md) | System Variability Index behavior — when to escalate uncertainty | shared |
| [`state/shared/CLAUDE-CODEX-SEARCH-TOKEN-DIRECTIVE.md`](../../../state/shared/CLAUDE-CODEX-SEARCH-TOKEN-DIRECTIVE.md) | Index-first search, token economy — when to Grep vs. master_index_query | shared |

## Live state files — read each session for the current fleet picture

| Path | Purpose |
|------|---------|
| [`state/shared/AGENT_WORKBOARD.md`](../../../state/shared/AGENT_WORKBOARD.md) | Per-agent work-in-progress board (multi-MB; tail it, don't read whole) |
| [`state/shared/AGENT_CHAT.md`](../../../state/shared/AGENT_CHAT.md) | Append-only chat bus between concurrent chats (Claude + Codex) |
| [`state/shared/AGENT_COORDINATION_STATUS.md`](../../../state/shared/AGENT_COORDINATION_STATUS.md) | Live status snapshot (regenerated each session start) |
| [`state/shared/ROADMAP_COLLABORATION_STATE.md`](../../../state/shared/ROADMAP_COLLABORATION_STATE.md) | Roadmap convergence state — which milestones are in progress + who owns them |

## Freshness rule

A directive >7 days stale **must** be re-read end-to-end and re-validated against current
code before relying on it. The rule is enforced by chat hygiene, not by a hard hook —
operators are responsible for keeping the freshness gate honest. To check at a glance:

```bash
node -e "['CLAUDE-CODEX-MCP-DIRECTIVE.md','CLAUDE-CODEX-COORDINATION-DIRECTIVE.md','CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md','CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md','CLAUDE-CODEX-SVI-DIRECTIVE.md','CLAUDE-CODEX-SEARCH-TOKEN-DIRECTIVE.md'].forEach(f=>{const s=require('fs').statSync('H:/prism/state/shared/'+f); const days=Math.floor((Date.now()-s.mtimeMs)/86400000); console.log(f,'age='+days+'d',days>7?'⚠ STALE':'✓');});"
```

## How this list is maintained

- Adding a new directive: drop the file under `state/shared/CLAUDE-CODEX-*-DIRECTIVE.md`,
  add the row to BOTH tables above (path + 1-line purpose), and add the file to the
  freshness-check one-liner.
- Deprecating a directive: keep the file (per [[feedback_never_delete_only_disable]]),
  add a `deprecated: <date>` line at the top, remove from the active table, move to a
  new "Deprecated" subsection if non-empty.
- CLAUDE.md (project) holds only a 2-line pointer to this file + the freshness rule.
  Edits to the catalog land here, not in the top-level CLAUDE.md, to keep the main
  doctrine doc small.

## Cross-links

- [[per-chat-handoff]] — handoff naming + slot binding
- [[golf-slot]] — hygiene slot (CLEANUP-MS0)
- [[scrutiny-gate]] — 3-of-3 universal Stop gate
- Project doctrine: `H:/prism/CLAUDE.md` § SHARED AGENT BRIDGES (now 2-line pointer)
