---
name: reference_force_loop_continue_stuck_picker_livelock_2026_06_21
description: "FLEET-WIDE BUG (observed first-hand, NOT yet fixed -- needs careful design): force-loop-continue's progressGate wedge-detector keys on loop-state `iter`, which RESETS to 0 on every picker roll. A stuck-picker loop (picker re-rolling the same unstartable unit, e.g. a roadmap top-unit in a peer's lane) makes iter oscillate 0->1->0->1, which progressGate reads as intermittent progress -> noProgress never hits STUCK_LIMIT -> the Stop hook nags FOREVER with no productive path, escapable only by manual `loop-state end`. The robust fix is non-trivial (rollsTotal climbs on EVERY roll incl. productive multi-unit loops, so a rollsTotal threshold false-releases; the only sound stuck-signal is same-nextTask-repeated, needing new task-repetition tracking). Shared session machinery -- treat carefully / owner-coordinate."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.579Z
aliases: reference_force_loop_continue_stuck_picker_livelock_2026_06_21
---


# force-loop-continue nag-livelock on a stuck picker (observed + FIXED 2026-06-21, slot:alpha)

> **STATUS: FIXED** in `46d33ef8de` (+ P2 coupling note `965b9da540`). `progressGate` now tracks a per-task iter HIGH-WATER + task id (the design proposed below, implemented): a same-task iter not exceeding the high-water (incl. a picker-roll reset) is a STALL -> the wedge-detector trips at STUCK_LIMIT and RELEASES; a task CHANGE (healthy multi-unit loop) resets the high-water = genuine progress, so productive loops are never false-released. 21/21 enforce + 15/15 sibling tests (4 new bug-oracles); 3-of-3 PASS. Wiki lesson: [[wedge-detector-must-key-on-monotonic-signal]].

**Symptom (first-hand this session):** the `/loop` was bound to `U-NN-TIER05` (the roadmap top unit, in india's live GNN lane -- correctly NOT taken). `stop-force-loop-continue.mjs` blocked Stop repeatedly with "iter 1/20 (19 remaining)" no matter how many times I ticked -- an unbreakable nag with no productive path. Escaped only via `loop-state.mjs end`.

**Root cause (verified by reading the code):**
- `loop-state.mjs` `next` (the picker roll) creates a fresh state with `iter: 0` on every roll (line ~495); `rollsTotal` is the session-wide counter that "survives the iter reset" (line ~480, intended).
- `stop-force-loop-continue.mjs` `progressGate(sid, iter)` (line 242-251) declares the loop wedged + RELEASES only when `noProgress >= STUCK_LIMIT`, where `noProgress` increments only while `iter <= lastIter`. Because a rolling loop's `iter` keeps resetting to 0 then ticking to 1, `progressGate` sees `1 > 0` = "progress" intermittently -> `noProgress` oscillates 0/1 and NEVER accumulates to STUCK_LIMIT.
- Net: the wedge-detector is DEFEATED by the iter-reset-on-roll for any loop whose picker keeps rolling without completing a unit (stuck-picker). The hook's other release paths (status=="spiral", near-context-limit, iter>=target) don't fire either, so it nags until manual `end`.

**Why the fix is non-trivial (R8 -- do NOT build hastily on partial understanding):**
- A `rollsTotal >= N` release is UNSAFE: `next` bumps `rollsTotal` on EVERY roll (line ~503), including a healthy multi-unit /loop completing N distinct units -> a rollsTotal threshold would false-release productive loops.
- The only sound stuck-signal is "the picker returned the SAME `nextTask` across K consecutive rolls" -- which `progressGate` cannot see today (it gets only `iter`). The real fix needs the hook (or loop-state) to track task-identity repetition across rolls and release/advise-`end` when the picker is stuck on one unstartable unit.
- This is shared "all-slots-via-universal-rails" session machinery (peer-touched by zulu/bravo per commit comments). Treat carefully; ideally design + own-coordinate before changing the wedge-detector.

**Proposed fix (for careful implementation):** pass `loop.task` (or a stable task id) + `loop.rollsTotal` to a `progressGate` that records `{lastTask, sameTaskRolls}`; release with an "end-or-steer" message when `sameTaskRolls >= STUCK_PICKER_LIMIT` (picker stuck on one unit), preserving the existing iter-based wedge release for the no-roll single-task case. Add R9 tests: (a) productive multi-unit loop (distinct tasks each roll) must NOT release; (b) stuck-picker (same task K rolls) MUST release; (c) single-task no-roll wedge still releases on iter-stall.

Sibling session lessons: [[reference_token_economy_surface_optimized_2026_06_21]] (don't fabricate fixes) · this is the autonomous-loop substrate, /goal "session handoff/loop stack" axis.
