---
title: A progress/wedge detector must key on a MONOTONIC signal, never a counter that resets
layer: lessons
tags: [hooks, loops, wedge-detector, progress-tracking, livelock, alpha, session-loop]
created: 2026-06-21
related:
  - module-cache-useless-for-per-invocation-hooks
  - unbreakable-loop-break
---

# A progress/wedge detector must key on a MONOTONIC signal, never a counter that resets

**Principle:** Any "no-progress → release / escalate" detector (a wedge-detector, a stall
guard, a stuck-loop breaker) must measure progress against a **monotonic** signal. If it
keys on a counter that can **reset** during normal operation, a reset masquerades as
fresh progress, the detector never trips, and you get an **unbreakable livelock**.

## The case (force-loop-continue, fixed 2026-06-21, `46d33ef8de`)

`stop-force-loop-continue.mjs` BLOCKS Stop to force a `/loop` onward, and `progressGate`
RELEASES the block once the loop is wedged (no progress for `STUCK_LIMIT` consecutive
blocks) — the safety valve that prevents an infinite Stop-block.

The detector keyed on the loop's `iter`, treating **any increase** as progress. But
`loop-state` `next` **resets `iter` to 0 on every picker roll** (without the unit
completing). So a **stuck-picker** loop — the picker re-rolling the same unstartable unit
(e.g. a roadmap top-unit in a peer's live lane) — made `iter` oscillate 0→1→0→1, read as
intermittent "progress" → `noProgress` never reached the limit → the hook **nagged forever**
("iter 1/20" every Stop), escapable only by manual `loop-state end`. This is the
operator-reported "unbreakable loop, you do it 9 times before you stop" class
([[unbreakable-loop-break]]).

## The fix

Track a **per-task iter high-water mark** + the **task id**:
- A same-task `iter` that does NOT exceed the high-water (including a roll-reset) is a **STALL**.
- A **task change** (a healthy multi-unit loop completing DISTINCT units) resets the
  high-water = **genuine progress** — so productive multi-unit loops are never false-released.

`rollsTotal` is NOT a usable progress signal here: it climbs on *every* roll, including a
healthy multi-unit loop — so a `rollsTotal` threshold would false-release productive work.
The only sound signals are "iter beyond its per-task high-water" OR "the task changed."

## Reusable takeaways

1. Before trusting a progress counter, ask: **can it reset during normal operation?** If
   yes (per-roll/per-phase/per-retry resets), it will give phantom progress — key on a
   high-water mark or a genuinely monotonic event (a *completion*, not an *increment*).
2. A safety valve's failure direction matters: ensure a bug errs toward **release**
   (fail-soft), never toward a tighter infinite block.
3. **Scrutinize an audit's proposed FIX as hard as its bug claim** — a sibling token-audit
   the same session proposed a fix that pattern-matched a working structure but was
   ineffective ([[module-cache-useless-for-per-invocation-hooks]]).

Memory: [[reference_force_loop_continue_stuck_picker_livelock_2026_06_21]].
