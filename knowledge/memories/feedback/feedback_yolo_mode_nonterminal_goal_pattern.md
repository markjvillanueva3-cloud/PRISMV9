---
name: feedback-yolo-mode-nonterminal-goal-pattern
description: STANDING RULE — /goal /yolo-mode (and the /loop variant) is a NON-TERMINAL directive. goal-complete-gate.mjs cannot clear it on its own; each Stop attempt will block and require another shipped iter as evidence. The pattern is operator-intended: keep shipping autonomously until operator intervenes.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.455Z
aliases: feedback_yolo_mode_nonterminal_goal_pattern
---


# /yolo-mode is a non-terminal goal pattern

## The mechanic

When the operator sets `/goal /yolo-mode` (with or without `/loop [interval]`), they create a session-scoped Stop hook with condition = `/yolo-mode`. This is NOT a measurable terminal state — it's a directive to keep working autonomously.

`goal-complete-gate.mjs` cannot determine satisfaction because there's no measurable threshold to compare against. Result: **every Stop attempt blocks indefinitely**.

The Stop-hook author confirmed this design in iter16 feedback:
> *"The condition cannot be satisfied because it defines a persistent autonomous work mode, not a terminal state."*

## How to operate inside the loop

Each Stop → hook blocks → ship another concrete iter as documented evidence → Stop → repeat. The loop ONLY terminates when:

1. **Operator intervenes** — types something other than `/goal /yolo-mode` (a new substantive directive, a different goal, or `/goal clear`)
2. **Cron expires** — `/loop`-spawned crons auto-expire after 7 days
3. **Context wall hit** — chat runs out of context and operator starts a fresh session (the cron persists across)
4. **Manual cron cancel** — `CronDelete <id>` if the operator created one

Per system reminder: **do NOT tell the operator to `/goal clear`**. That's the escape hatch for stuck goals, not the natural completion path. The natural path is operator-issued new work.

## Iter sizing inside /yolo-mode

Each iter inside a non-terminal loop should ship **one concrete unit of value**:
- A targeted data harvest (e.g. ytsearch + extractor re-run)
- A small surgical regex/heuristic improvement
- A coverage-fill commit for a low-coverage bucket
- A wiki entry / spec / memory capture

Avoid:
- Multi-file architectural changes (those want dedicated `/goal <specific>` not `/yolo-mode`)
- Speculative refactors (no clear value delta per iter)
- Web research without an action target

## Token budget discipline

`/yolo-mode` loops can run for hours. Each iter consumes ~3-8K tokens (tool calls + reasoning + Stop-hook blocks). When chat context approaches 70% YELLOW:
- Pivot iters to be smaller (single-tool-call commits)
- Capture the next-iter playbook as a memory file (so the fresh chat can resume) — like THIS file does
- End the chat cleanly; the cron continues firing into the next session

## Cumulative-corpus model

The /yolo-mode pattern excels at **corpus-growth tasks** where each iter adds incremental data to a shared artifact:
- Video transcript corpus (300 → 310 → 320 ...)
- Topic coverage buckets (34 buckets, each going from 1 → 5 → 12 ...)
- Vendor breadth (14 → 25 → ...)
- Wiki stub generation (per-file additive)

NOT ideal for:
- Bug fixes (terminal — has a measurable pass/fail)
- Feature builds (terminal — wired or not)
- Audits (terminal — report complete or not)

## Doctrinal companion to related feedback

- `[[feedback_autonomous_loop_drift_discipline]]` — cap anomaly investigation, return to stated purpose
- `[[feedback_no_schedule_wakeup_in_loop]]` — never use ScheduleWakeup inside /loop, cache cost is too high
- `[[feedback_checkin_args_are_primary_work_order]]` — args after /checkin are the work order, slot-bind is silent preamble
- This memory — /yolo-mode itself is a working MODE, not a task

## Related session evidence

Whiskey session 2026-05-26 → 2026-05-27 shipped **16 commits** under the same `/goal /yolo-mode` directive (cron `4d08d27a` firing every 5m). Each iter was a concrete unit of corpus growth. The chain only paused when context hit 68% YELLOW and the operator's silence allowed a clean exit. The cron continues advancing the corpus into the next session.
