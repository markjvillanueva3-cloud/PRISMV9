---
title: PRISM command — /checkin
slug: checkin
kind: command
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK04-extension
author: claude-41db1b82 (slot india)
mirrors_skill: .claude/commands/checkin.md
triggers: [/checkin, slot-claim, pickup, /loop, /pick-unit, drift, awareness, /goal]
dispatcher_actions: [prism_session:master_index_query, prism_context:chat_post]
composes_with: [/handoff, /precompact, /pick-unit, /scrutinize, /close-out]
---

# `/checkin` — One-Stop Dev Pipeline Entry

The canonical entry surface for the 13-chat PRISM fleet. Claims a slot,
binds the per-chat handoff, reaps stale slots, runs the drift / commit-
hygiene / roadmap-slice / BUILD_STATE / Obsidian-recent / system-viz /
local-compute health / fleet-activity pre-flight, then **emits the full
dev pipeline for the task in args**.

## Architecture role

`/checkin` is the **operator-facing wrapper** over the kernel's
[[checkin]] syscall + a per-/checkin pipeline of 12+ awareness-injection
phases. The skill (`.claude/commands/checkin.md`) is the executable spec;
this wiki entry is the architecture record.

## Signature

```
/checkin                          → §Report-only mode (slot+handoff bind, no task)
/checkin <task description>       → §Report + execute task
/checkin /loop <task>             → autonomous /loop on task (keyword-gated)
/checkin /goal complete           → close-out gate; Stop hook fires goal-complete-gate.mjs
/checkin --preferSlot <nato>      → force-claim a specific slot
/checkin-<nato> <args>            → NATO-phonetic shortcut (13 of them, one per slot)
```

## Pipeline phases (12-step canonical body)

| # | Phase | Surface | Skip-condition |
|---|-------|---------|----------------|
| 1 | Slot reclaim | `chat-slots.mjs reclaim` | never |
| 2 | Slot claim | `chat-slots.mjs claim --preferSlot <auto-or-named>` | never |
| 3 | Handoff bind | `per-agent-handoff.mjs read --terminal <stableId>` | never |
| 4 | Chat-bus read | `state/shared/AGENT_CHAT.jsonl` tail | never |
| 5 | Drift check | `scripts/audit-roadmap-drift.mjs` | none |
| 6a | Commit hygiene | `git status` / `ahead-behind` / worktree | none |
| 6b | Roadmap slice | priority-queue per-slot filter | none |
| 6c | BUILD_STATE | `state/shared/BUILD_STATE.{json,md}` | none |
| 6d | Obsidian recent | most-recent memory entries (top-K) | none |
| 6e | system-viz ping | port 8765 health | when port down → skip |
| 6f | CLAUDE.md staleness | doctrine pointer freshness | none |
| 6g | Local-compute health | Ollama / Docker / Qdrant / Postgres probe | none |
| 6h | Fleet activity | per-slot pickup candidates | none |
| 7 | §Report emit | text section | never |
| 8-14 | Dev pipeline | conditional on task directive in args | when args lack `/loop`, `/goal`, `/pick-unit`, `unit`, `task`, `build`, or filepath |

## NATO-phonetic shortcuts (13)

Each shortcut is a thin wrapper that force-claims the named slot with
`--force true --confirmRecent true` then delegates to the canonical
pipeline body. The 13:

```
/checkin-alpha    /checkin-bravo   /checkin-charlie /checkin-delta
/checkin-echo     /checkin-foxtrot /checkin-golf    /checkin-hotel
/checkin-india    /checkin-juliett /checkin-kilo    /checkin-lima
/checkin-mike
```

- `golf` historically owned the fleet-reaper (doctrine shift
  2026-05-16 moved that to alpha; reverted to golf in
  `GOLF-OWNS-REAPER` doctrine 2026-05-17). Both states have lived in
  this session's chat-bus.
- Slots are SIBLINGS — no hierarchy; any slot can run any task.

## Composition

```
/checkin <task>
├─ kernel syscalls
│  ├─ checkin (claim)
│  ├─ whoami (identity)
│  └─ position (build/svi/drift snapshot)
├─ awareness-inject hooks (auto on UserPromptSubmit)
│  ├─ master-index-precheck-inject
│  ├─ wiki-precheck-inject
│  ├─ memory-relevance-inject
│  ├─ tribal-by-domain-inject
│  └─ build-state-inject
├─ §Report emit (text)
└─ dev pipeline (when task directive present)
   ├─ per-file scrutiny gate (2 reviewers / file)
   ├─ 3-of-3 Stop scrutiny gate
   ├─ close-out audit
   ├─ commit (slot-routed via worktree-commit-route.mjs)
   ├─ precompact hook → handoff write
   └─ terminal-pin SessionStart for auto-resume across /compact
```

## Triggers (auto-suggest)

When the user types a prompt containing `slot-claim`, `pickup`, `drift`,
`awareness`, `/loop`, `/goal`, `/pick-unit`, the `skill-auto-trigger`
hook surfaces `/checkin` as the top-1 suggestion (BM25 score ~0.85 on
this corpus).

## Doctrine pins

- **Args ARE the work order** — per `feedback_checkin_args_are_primary_work_order`,
  the trailing text after `/checkin-<slot>` is the PRIMARY deliverable.
  Slot-bind is minimal silent preamble; §Report is compressed; the
  pipeline MUST act on the task.
- **Loop-keyword engages autonomous /loop** — `/loop`, `autopilot`,
  `continuous`, `until complete`, `keep going` trigger the
  zero-questions /loop-state.mjs-bookended autonomous mode.
- **Loop resumes across /compact** — the Step 2b loop-resume detection
  (an active `running` loop-state resumes regardless of args — the
  post-compact auto-fired `/checkin` carries no keyword).

## Related

- [[checkin]] (syscall) — kernel primitive
- [[slot-lifecycle]] (process) — what /checkin participates in
- [[whoami]] (syscall) — identity resolution
- [[handoff]] (syscall) — phase-3 output
- [[knowledge-vault-schema]] — 5-namespace doctrine
- [[_command-schema]] — frontmatter contract this entry follows

## See also

- `.claude/commands/checkin.md` — operator-facing skill (executable spec)
- `.claude/commands/checkin-{alpha..mike,golf}.md` — 13 NATO shortcuts
- `.claude/hooks/session-start-terminal-pin.mjs` — auto-resume backbone
- `.claude/hooks/precompact-handoff.mjs` — phase-3 auto-write
- `state/shared/SLOT-WORKTREE-ARCHITECTURE.md` — per-slot worktree model
