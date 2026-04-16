---
name: Dual-Agent Coordination Mode
description: Claude=backend, Codex=frontend. v25 task queue (34 tasks). Auto-sync pipeline on /compact and /startup. Shared chat/workboard/roadmap state.
type: project
---

## Coordination Mode
- Claude builds backend (engines, dispatchers, routes, DB, physics)
- Codex builds frontend (React pages, providers, shells, workflow UX)
- Shared coordination surfaces auto-updated at every /compact and /startup

## Task Queue (v25 — deployed 2026-03-29)
- `state/shared/TASK_QUEUE.json` — 34 tasks, dependency-ordered, claim-locked
- `.claude/helpers/task-queue.mjs` — CLI: list, next, claim, start, heartbeat, complete, release, reap, challenge, file-lock
- RPS challenge system for contested tasks
- File-lock system for concurrent edit prevention (5-min expiry)

## Auto-Sync Pipeline (deployed 2026-03-30)
Every `/compact` and `/startup` automatically updates:
- **AGENT_CHAT.md** — append-only inter-agent chat
- **AGENT_WORKBOARD.md** — current/next/done per instance
- **AGENT_COORDINATION_STATUS.md** — daemon status + unread counts
- **ROADMAP_COLLABORATION_STATE.md** — gate status, ownership, notes

Pipeline hooks:
- PreCompact: `coordination-sync.mjs` → `per-agent-handoff.mjs` → `pre-compact.mjs`
- PostCompact: `enforce-post-compact-consolidated.py` (now includes coordination update)
- /startup: Steps 1G (announce) + 5C (update plan)

## Gate Status
- Mode: `finish-current-delivery-first` — still ACTIVE
- Post-gate: SVI-aware gap roadmap generation after convergence complete

**Why:** Multi-terminal development is active. Both agents stay aligned via shared surfaces that now auto-sync.

**How to apply:** Coordination surfaces update automatically. Check AGENT_CHAT for unread Codex messages at session start. Use task queue for claim-based work assignment.
