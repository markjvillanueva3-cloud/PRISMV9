---
name: feedback-atcs
description: ATCS ≡ Autonomous Task Completion System — file-system state machine for multi-session execution with quality gates. `prism_atcs` dispatcher (12 actions: task_init, task_resume, task_status, queue_next, unit_complete, batch_validate, checkpoint, replan, assemble, stub_scan, delegate_to_manus, poll_delegated). The substrate behind `/loop`, `/autopilot-full`, `/yolo`, autonomous /checkin step 12.
aliases: [ATCS, Autonomous Task Completion, prism_atcs, autonomous-loop-substrate]
metadata:
  type: feedback
---

# ATCS — Autonomous Task Completion System

**ATCS ≡ Autonomous Task Completion System** — a file-system state machine that lets a chat (or chain of chats across `/compact` boundaries) execute multi-step build tasks without the operator at every gate. Exposed via the `prism_atcs` MCP dispatcher (~12 actions). Same orphan-pattern fix as PSN/PSK/[[feedback_prism_os|PRISM-OS]]: heavily referenced (every `/loop`, every `/autopilot-full`, every yolo-mode session) but no dedicated doctrine entry.

## The 12 actions (`prism_atcs` dispatcher)

| Action | Purpose |
|---|---|
| `task_init` | start a new ATCS task; lay down state file + queue + checkpoint anchor |
| `task_resume` | resume a previously-init'd task after `/compact` or session restart |
| `task_status` | inspect current state (which unit, which step, which quality gate) |
| `queue_next` | pull the next unit from the queue under peer-claim filtering |
| `unit_complete` | mark a unit done, run batch_validate, advance the state machine |
| `batch_validate` | run the per-unit quality gates (tests, scrutiny, dispatcher coverage) |
| `checkpoint` | snapshot ATCS state for safe `/compact` resume |
| `replan` | replan the queue when a unit's preconditions change |
| `assemble` | compose multi-file build outputs (engine + test + dispatcher + wiki) |
| `stub_scan` | refuse to mark complete if stub patterns detected in shipped code |
| `delegate_to_manus` | offload a sub-task to a Manus agent (per-task pre-search [[reference_subagent_per_task_presearch_2026_05_15]]) |
| `poll_delegated` | check status of a delegated Manus sub-task |

## Why ATCS is OS-shaped (not just a dispatcher)

Three properties:

1. **Stateful across `/compact`.** ATCS state lives in `state/shared/atcs/<task-id>.json`, survives compaction, and `task_resume` re-anchors a post-compact chat to the exact step. Same pattern as PSK ([[feedback_psk_kernel]]) at the syscall layer.
2. **Quality-gated.** Every `unit_complete` triggers `batch_validate` which runs the per-file [[project_scrutiny_gate|scrutiny gate]] ([[feedback_parallel_scrutiny_per_file]]) and the Stop-hook 3-of-3 ledger. A failed gate doesn't auto-advance.
3. **Peer-claim-aware.** `queue_next` filters units claimed by other slots — ATCS in slot `echo` will never race-pick a unit slot `alpha` is building. Backed by [[reference_per_slot_claim_ms0_2026_05_16]].

## What ATCS replaces

Before ATCS, autonomous loops were:
- Ad-hoc state in conversation memory (lost on compact)
- No quality gates between steps (compound errors propagated)
- No peer awareness (two slots could pick the same unit)
- No replan path (a blocked unit froze the loop)

ATCS makes the autonomous loop *durable* across sessions and slots. Same robustness pattern as the [[reference_session_continuity_stack_2026_05_15]] but at the task-execution layer instead of the session-state layer.

## How `/checkin /loop` and `/autopilot-full` compose ATCS

The autonomous `/checkin-<nato> /loop <task>` flow ([[checkin-loop-fullstack-2026-05-16]]):

1. `task_init` lays down the ATCS state file with the queue from `pick-unit` + Ψ-ranked backlog.
2. Per iteration: `queue_next` → build (per-file scrutiny) → `unit_complete` → `batch_validate` → `checkpoint` → tick `loop-state.mjs`.
3. On `/compact`: `checkpoint` writes ATCS state; precompact handoff RESUME points to `task_resume <task-id>`.
4. On post-compact session start: `task_resume` re-anchors and the loop continues.
5. If a unit blocks: `replan` re-orders the queue around the blocker (instead of freezing).
6. For oversized sub-tasks: `delegate_to_manus` + `poll_delegated` offloads to a subagent with its own per-task pre-search.

## Standing rule

- **For any multi-iteration task** (`/loop`, `/autopilot`, autonomous campaign), use `task_init` instead of conversation-memory state — survives compact, survives kill.
- **Never bypass `batch_validate`** to "ship fast" — the per-file scrutiny + 3-of-3 ledger are the only thing preventing compound-error propagation in autonomous loops. R12 fail-loud ([[feedback_r5_thru_r12_doctrine]]) — silent skip is forbidden.
- **`stub_scan` is mandatory at every `unit_complete`** — stub engines + placeholder tests are the dominant failure mode in autonomous flows.
- **A `delegate_to_manus` call must include the per-task search-hits block** — subagents start cold, the pre-search is what gives them PSN context.

## Why this memory exists

ATCS is referenced as `prism_atcs:*` in CLAUDE.md, in every `/checkin /loop` flow, in [[reference_session_continuity_stack_2026_05_15]] §4 (the auto-precompact ties to `checkpoint`), in `/autopilot-full` skill body — but no dedicated doctrine entry. Auto-injectors surface graph hits like `[L10/built] task-init` but never the *composition picture* of how `/loop` USES ATCS. Same orphan-pattern fix as the rest of this batch.

## Cross-refs

- [[feedback_psn_definition]] — ATCS is the autonomous-execution substrate composing PSK + [[reference_system_viz|System-Viz]] + Memories + Engines + AI legs
- [[feedback_psk_kernel]] — sibling syscall layer (PSK is per-call; ATCS is multi-call state machine)
- [[checkin-loop-fullstack-2026-05-16]] — the canonical `/checkin /loop` flow that composes ATCS
- [[feedback_parallel_scrutiny_per_file]] — the `batch_validate` quality gate
- [[reference_session_continuity_stack_2026_05_15]] — `/compact` survival via `checkpoint` + `task_resume`
- [[reference_per_slot_claim_ms0_2026_05_16]] — peer-claim filtering on `queue_next`
