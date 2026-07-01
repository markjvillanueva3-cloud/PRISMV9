---
name: feedback-task-freshness-pre-build
description: R13 doctrine + TASK-FRESHNESS-GATE-MS0 — check a task's generation date vs fleet activity BEFORE building; enforced as a hard PreToolUse gate at slot-task-claim
aliases: feedback_task_freshness_pre_build
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.447Z
---


**Rule (CLAUDE.md R13): reconcile task age before building.** A task
generated/surfaced/scheduled before recent fleet activity may already be
shipped, rescoped, or invalidated. Before committing to build a unit, check
(a) the timestamp of the task source, (b) commits + envelope flips + peer ships
since then, (c) reconcile.

**Why:** user directive 2026-05-17 — *"make a clause that you check the date of
when tasks where generated so you compare to whats new to see if we need to
make adjustments to build"*. The fleet ships ~85 commits/day across 12 chats;
units picked from day-old `pending` envelopes are routinely already-shipped
(silent close-out debt) or rescoped. The strongest stale signal is the unit's
own envelope `status:completed` row — a direct "this is already done" check,
no commit math needed.

**How to apply:** enforced automatically — `.claude/hooks/task-freshness-gate.mjs`
(wired in `bash-bundle.mjs`) intercepts `slot-task-claim.mjs claim --unit X`
and BLOCKS a stale claim with a structured re-check protocol. You normally do
nothing; if blocked: run the re-check (git log --since gen, /master-index the
unit, slot-task-claim list), then re-issue the claim with the `--ack-stale`
token (writes a 30-min stamp) or one-shot `PRISM_TASK_FRESHNESS_BYPASS=1`
(audited). Full kill switch `PRISM_TASK_FRESHNESS_GATE_DISABLE=1`. Own active
claims (mid-/loop heartbeat) are NOT re-gated. The gate is fail-open by design
— its own failure never blocks a real claim. See
[[reference_task_freshness_gate_ms0_2026_05_18]] for build/scrutiny detail and
the bundled-sub-hook-must-exit-0 lesson.

Sister doctrine: [[feedback_roadmap_close_out]] (the inverse — close shipped
units), [[feedback_verify_actual_contract_not_proxy]] (verify via stdin file
fixtures, the actual contract).
