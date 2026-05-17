---
title: PRISM pipeline — /loop autonomous iteration
slug: loop
kind: pipeline
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK04-extension
author: claude-41db1b82 (slot india)
trigger: cron
composed_of: [/checkin, /pick-unit, scrutinize, close-out, /handoff]
---

# `/loop` — Autonomous Iteration Pipeline

`/loop` is PRISM's autonomous-iteration pipeline — either **cron-triggered**
(fixed interval like `*/10 * * * *`) or **self-paced** (dynamic-mode
ScheduleWakeup with adaptive delay). Each fire re-enters the canonical
loop body, picks a unit, ships it, commits, ticks loop-state, and ends
the turn. The /yolo zero-questions doctrine + no-unit-cap behavior is
keyword-gated.

## Two execution modes

### Mode A — Fixed-interval (cron)

```
User: /loop 10m all units /goal finish all units
       └─→ CronCreate: "*/10 * * * *", prompt=verbatim, recurring:true
       └─→ Returns job ID (e.g. 32fcf842)
       └─→ Runs the prompt immediately (don't wait for first cron fire)
```

Every 10 minutes thereafter, the cron re-fires the same prompt as a new
UserPromptSubmit → /checkin-<nato> wrapper → canonical body. Session-only
storage (no disk persistence); auto-expires after 7 days.

### Mode B — Dynamic (self-paced)

```
User: /loop check the deploy
       └─→ No interval parsed → dynamic mode
       └─→ Run task NOW
       └─→ ScheduleWakeup with self-chosen delay (cache-aware)
       └─→ Next fire re-enters /loop
```

The model picks delay per cache-hit / event-driven semantics. Below
5 minutes keeps cache warm; above 5 minutes pays the cache miss and
should amortize it (idle ticks default to 1200-1800s).

## Loop body — what happens each iter

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SLOT REBIND                                                   │
│    chat-slots.mjs claim --preferSlot india --force --confirmRecent│
│                                                                  │
│ 2. PICKUP                                                        │
│    priority-queue.mjs --pick --slot india --top N                │
│    OR domain-specific (e.g. close-out audit, drift verify)       │
│                                                                  │
│ 3. ACT                                                           │
│    - close-out triage (envelope drift verified-on-disk)          │
│    - real build (1 unit / iter, per-file scrutiny)               │
│    - audit/spec authorship                                       │
│                                                                  │
│ 4. COMMIT                                                        │
│    [MAIN] [<MILESTONE>]/<U-ID>: <one-line subject>               │
│    (slot-routed via worktree-commit-route hook)                  │
│                                                                  │
│ 5. TICK                                                          │
│    loop-state.mjs tick --session <id> --note "iter N: <summary>" │
│                                                                  │
│ 6. END TURN                                                      │
│    Next 10m cron fire (Mode A) OR ScheduleWakeup (Mode B)        │
└─────────────────────────────────────────────────────────────────┘
```

## Cross-/compact survival

The autonomous /loop persists across `/compact`. Mechanism (per
[[reference_checkin_autonomous_loop_2026_05_16]] / U-CAL01):

1. `loop-state.mjs` writes `state/shared/loop-state/loop-<sid>.json`
   with `status: running`.
2. `/compact` fires PreCompact hooks (handoff write, slot release).
3. Post-compact SessionStart re-fires `session-start-auto-resume.mjs`
   which detects the `running` loop-state (Step 2b loop-resume
   detection in `checkin.md`) and re-injects the `/checkin` prompt
   with the original args.
4. The next cron fire (Mode A) OR ScheduleWakeup (Mode B) carries the
   loop forward.

This is why `stop-force-loop-continue.mjs` was found to be dead code
(per the 2026-05-16 regression entry in CLAUDE.md): the
`session-start-auto-resume` + `checkin.md` Step 2b path handles the
continuation without that Stop hook firing.

## Stop conditions

| Condition | Effect |
|-----------|--------|
| User runs `CronDelete <jobId>` | Removes the cron job; current iter completes then loop ends. |
| Session exits | All session-only crons die; durable cron survives if `durable:true` was used. |
| `loop-state.mjs end` called explicitly | Marks `status: ended`; future fires skip work. |
| 7-day auto-expire | Recurring crons fire one final time then auto-delete. |
| `loop-state` `status: stale` (>4h no tick) | `reap-zombies` skill / `chat-slots.mjs reclaim` can sweep. |

## Iter-budget discipline

- **1 substantive deliverable per iter** is the rate goal — close-out
  triage, real build, audit, or doc-reflection. Multi-deliverable
  iters work but increase commit-race risk.
- **Karpathy R10 checkpoint** — every iter must restate done / verified
  / left in the tick `--note`. Never continue from a state you can't
  describe.
- **R12 fail-loud** — if the iter's commit was blocked by the index
  race (peer chat collision), surface it in the tick note rather
  than retrying silently. The next cron fire can retry under lower
  pressure.

## Common failure modes + recovery

| Failure | Recovery |
|---------|----------|
| commit-ownership-guard auto-unstages peer files + drops mine | Re-stage explicit pathspec; commit with `--only -- <path>`. Disk appends survive guard sweep; retries cheap. |
| Fork-storm (xmalloc) under fleet load | Reduce parallel tool calls; `node-process-janitor --full` to reap orphan procs; route operations through Glob/Grep tools rather than bash. |
| Priority queue surfaces already-shipped units | Run content cross-ref (`grep -l` against named deliverables); triage as `closed-in-disk-verify` in CLOSE-OUT-DEFERRED. |
| CLOSE-OUT-CANDIDATES goes 2h+ stale | `/goal complete` Stop hook will block; refresh via `node scripts/audit-close-out-candidates.mjs`. |

## Cron jitter — pick off-minute intervals

Per the `CronCreate` tool description: every chat asking for "every
10m" gets `*/10 * * * *` and stacks at :00 / :10 / :20 across the
fleet. Operator-discretion: pick `*/10` only when the user explicitly
says "10 minutes" exactly; otherwise consider `7,17,27,37,47,57` for
near-prime-ish dispersion.

## Doctrine pins

- **Cloud-offer threshold** — intervals ≥60min OR daily phrasing
  trigger an `AskUserQuestion` offering cloud-schedule instead.
  Session-only crons die when the session ends.
- **Loop-keyword set** — `/loop`, `autopilot`, `continuous`,
  `until complete`, `keep going` engage the autonomous /loop on
  `/checkin`. A bare `/checkin` does NOT loop.
- **`--no-loop` off-switch** — explicit kill from inside `/checkin`.

## Related

- [[checkin]] (command) — the canonical entry surface /loop wraps
- [[pick]] (syscall) — kernel pickup primitive
- [[slot-lifecycle]] (process) — what /loop's slot-claim phase touches
- [[handoff]] (syscall) — phase-3a output across each /compact

## See also

- `.claude/commands/loop.md` — operator-facing skill spec
- `.claude/helpers/loop-state.mjs` — start/tick/end/list/reap CLI
- `.claude/hooks/loop-iteration-inject.mjs` — UserPromptSubmit T2
  surfaces this session's loop state + sibling fleet loops
- `state/shared/loop-state/loop-*.json` — persistent loop-state files
