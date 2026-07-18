---
name: reference_reblock_storm_breaker_2026_06_18
description: "Fixed the endless-tick storm (operator: 'fix the loop, cron iter setting so if there's a decision I need to make, chat slots don't endlessly keep ticking'). Root cause: a Stop hook blocks without honoring stop_hook_active, so after CLAUDE_CODE_STOP_HOOK_BLOCK_CAP=1e9 there was no valve for an UNPRODUCTIVE re-block storm. Fix: stop-reblock-storm-breaker.mjs wired FIRST -- {continue:false} halts after N text-only re-blocks with no active loop. Productive loops stay unbounded. commit 1bc709c145. slot:xray 2026-06-18."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-27T20:30:47.144Z
aliases: reference_reblock_storm_breaker_2026_06_18
---


# Re-block storm breaker -- the endless-tick fix -- slot:xray 2026-06-18

## The bug (operator-hit live)
After I set `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP=1e9` + `PRISM_GOAL_CLEAR_ADVANCE_MAX=1e9`
([[reference_fleet_unlimited_autonomy_caps_2026_06_17]]) for unbounded PRODUCTIVE loops, I
asked the operator a decision question. The chat then "ticked" for HUNDREDS of turns (me
emitting text-only "No action needed" while the Stop chain re-blocked) instead of pausing for
the operator. Sibling of the prior [[feedback_unbreakable_loop_break]] ("you do it 9 times").

## Root cause (verified, not assumed)
- `loop-state.mjs read` for this session = `{ok:false,"no state"}` -> NO active loop. So
  `stop-force-loop-continue` + `stop-goal-clear-advance` both APPROVE (not the blocker).
- `session-consolidate-graph.mjs` returns `{continue:true}` -- NOT a blocker (just adds the
  visible "consolidate-graph: counter=N" additionalContext that rode along).
- The harness itself named it: "a hook blocked the turn 9 consecutive times ... check
  `stop_hook_active` and return success while it's true." So a DIFFERENT wired Stop hook blocks
  without honoring `stop_hook_active`; with the cap at 1e9 there is no harness force-end valve.
  `compact-interval-warning.mjs:102` is the correct pattern (`if stop_hook_active===true return ok`).

## The fix (commit 1bc709c145) -- keep productive loops unbounded, halt unproductive storms
`.claude/hooks/stop-reblock-storm-breaker.mjs`, wired FIRST in the Stop array (both settings.json,
mirrored). Distinguishes a storm from a real loop by the ONE reliable signal: **productive turns
make TOOL CALLS; storms are TEXT-ONLY.** Decision core `decideBreak`:
- `stop_hook_active !== true` -> approve + reset (fresh stop).
- active RUNNING /loop (iter<target) -> approve + reset (force-loop-continue owns it).
- last assistant turn had a `tool_use` block -> approve + reset (productive).
- else (text-only, no loop): increment per-session counter; at `>= threshold` (default 3)
  return **`{continue:false}`** -> HALTS. `continue:false` overrides any later `decision:block`,
  so wired first it is bulletproof against whichever hook is the rogue blocker. The operator's
  next message = fresh stop -> counter resets -> normal.
- Fail-soft: any error -> `{continue:true}` (never wedge a chat shut by accident). Per-session
  counter (`state/shared/.reblock-storm-stamps/<sid>.count`) so 26 slots never interfere.
- Knobs: `PRISM_REBLOCK_STORM_{DISABLE,THRESHOLD,VERBOSE}`.

## Proof (R12)
16/16 `node:test` (decideBreak full truth table + `lastAssistantHadToolUse` tail-parse incl.
malformed-partial-line + adversarial NaN priorCount + NaN/0/neg threshold->default + storm E2E).
Live single-hook smoke: 3 synthetic storm fires -> fire 1,2 `continue:true`, fire 3
`continue:false` with the halt reason; fresh-stop resets.

## Honest scope (propagation)
- Hook CHAINS + env load at SESSION START. So this takes effect for sessions started / restarted
  / `/compact`-ed AFTER the commit -- the SAME propagation model as the cap env changes. A live
  pre-existing session keeps its old (breaker-less) chain until it next restarts/compacts.
- Multi-hook precedence: I rely on the documented Claude Code rule that `{continue:false}`
  halts even when another hook returns `decision:block`. Unit + single-hook smoke are proven;
  the full-chain precedence is documented behavior, not yet observed in a live multi-hook storm.
- I did NOT lower the unlimited caps -- the operator wanted those for productive loops; the
  breaker handles the unproductive case orthogonally.

Related: [[reference_fleet_unlimited_autonomy_caps_2026_06_17]] (the caps this complements) ·
[[feedback_unbreakable_loop_break]] (the operator's standing complaint this closes) ·
[[reference_charlie_bgtask_hook_falsepositive_fix_2026_06_14]] (sibling Stop-hook false-positive class).
