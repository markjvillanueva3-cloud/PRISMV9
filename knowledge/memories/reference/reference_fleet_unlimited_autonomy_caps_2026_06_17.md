---
name: reference_fleet_unlimited_autonomy_caps_2026_06_17
description: "Operator set ALL fleet autonomy caps to unlimited (1e9) on 2026-06-17: CLAUDE_CODE_STOP_HOOK_BLOCK_CAP (new, was harness-default ~9 -> force-ended turns) + PRISM_GOAL_CLEAR_ADVANCE_MAX (new, was default 3 -> slot idled after 3 auto-advances). Joins the already-1e9 PRISM_LOOP_MAX_ROLLS + PRISM_LOOP_DEFAULT_TARGET. The goal-clear->queue->roadmap fallback was ALREADY built+wired (stop-goal-clear-advance.mjs); only the 3-cap limited it. slot:xray 2026-06-17."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-27T20:30:46.578Z
aliases: reference_fleet_unlimited_autonomy_caps_2026_06_17
---


# Fleet autonomy caps -> ALL unlimited (1e9) -- slot:xray 2026-06-17

Two operator directives this session, both -> unlimited, both fleet-wide in the user-global
`C:/Users/wompu/.claude/settings.json` `env` block (auto-mirrored C:->H: by c-to-h-mirror;
the harness injects this env into every session + hook spawn at session start).

## Change 1 -- Stop-hook block cap (NEW)
`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP = "1000000000"`. Harness default force-ended a turn after ~9
consecutive Stop-hook BLOCKS ("A hook blocked the turn from ending 9 consecutive times --
overriding"). In an autonomous-loop fleet the Stop hooks (force-loop-continue, goal-clear-advance,
scrutinize-before-stop) legitimately re-block to keep the loop going; the ~9 cap prematurely
killed long loops. Now effectively unlimited.

## Change 2 -- goal-clear advance cap (NEW)
`PRISM_GOAL_CLEAR_ADVANCE_MAX = "1000000000"` (was unset -> hook default 3).
**The behavior the operator asked for ("on goal-clear, default to task-queue then leftover
roadmap") was ALREADY BUILT + WIRED** -- `.claude/hooks/stop-goal-clear-advance.mjs`, live at
`H:/.claude/settings.json` Stop array (the 2026-06-08 directive, [[reference_goal_clear_advance_stop_hook_2026_06_08]]).
It fires on `iter >= target` (goal cleared) and resolves the next unit via
`loop-state.mjs next --resolve-only`: cascade `--resume -> handoff RESUME -> pick-unit own-lane
-> pick-unit fleet`, then claims + rolls the loop + injects `## RESUME_LOOP` into the handoff so
the next turn auto-continues. `pickUnitTop` (loop-state.mjs:310) = own-lane (`--slot`) first ->
fleet-wide fallback (source `pick-unit-fleet`, spans all remaining roadmap, peer-claim-filtered)
-> empty only when BOTH exhausted ("the honest stop"). So the cascade IS
"task-queue work -> leftover roadmap work -> honest idle." The lone limiter was `MAX_ADVANCE=3`
(idle after 3 advances/session); now 1e9 so a slot keeps draining queue+roadmap until genuinely
exhausted (the `exhausted -> honest idle` guard still stops it -- bounded by REAL work, not a count).

## The full unlimited set (all four now 1e9, fleet-wide)
| env | value | role |
|-----|-------|------|
| `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` | 1e9 | harness won't force-end a turn on repeated Stop blocks |
| `PRISM_GOAL_CLEAR_ADVANCE_MAX`    | 1e9 | goal-clear -> auto-advance to next queued/roadmap unit, no idle-after-3 |
| `PRISM_LOOP_MAX_ROLLS`            | 1e9 | (already set) loop rolls onto next unit unbounded |
| `PRISM_LOOP_DEFAULT_TARGET`       | 1e9 | (already set) per-loop iteration target unbounded |

Coherent set: Stop hooks may keep blocking (cap 1) -> on goal-clear advance to remaining work
(cap 2) -> roll the loop onto it (caps 3+4) -> repeat until queue+roadmap genuinely exhausted.

## R12 honesty
- Verified: both settings valid JSON with all caps = 1e9 (C: + H:); stop-goal-clear-advance test
  suite 8/8; cascade reaches roadmap leftover (loop-state.mjs:304-332 read, not assumed).
- Propagation: env applies to sessions started/restarted AFTER the edit (harness reads settings env
  at session start). Live sessions pick it up on next /compact or restart -- same model as any
  settings env change.
- NOT committed to git: these are user-global runtime settings (C: + H:/.claude), outside the
  H:/prism repo. The repo-tracked H:/prism/.claude/settings.json is separately stale (pre-existing
  drift, per [[reference_goal_clear_advance_stop_hook_2026_06_08]] -- do NOT reconcile here, the
  486-line clobber hazard is documented).

Related: [[reference_loop_unbounded_all_galaxies_2026_06_17]] (loop target/roll 1e9) ·
[[reference_goal_clear_advance_stop_hook_2026_06_08]] (the hook that was already built).
