# STOP-HOOK-PROGRESS-MS0 -- spec (2026-06-11, slot:alpha)

> Operator (2026-06-11): "A hook blocked the turn from ending 9 consecutive times -- overriding.
> For Stop/SubagentStop hooks, check stop_hook_active in the input and return success while it's
> true. [AND] instead of stopping when given a loop+goal, chats should automatically fall back on
> domain tasks/units -- make this a FLEET-WIDE rule."

Two fleet-wide fixes, both about chats getting STUCK STOPPING instead of progressing.

## FIX A -- stop_hook_active guard on every blocking Stop hook (the 9x-block fix)

Claude Code re-fires Stop hooks after a block; the 2nd+ invocation carries `stop_hook_active: true`
in stdin. A well-behaved Stop hook MUST short-circuit to approve while that flag is set, else it
re-blocks until the harness CLAUDE_CODE_STOP_HOOK_BLOCK_CAP override (the "blocked 9 times" event).

**Canonical guard (add at the TOP of every Stop hook's main, right after stdin parse):**
```js
if (input?.stop_hook_active === true) { process.stdout.write(JSON.stringify({ continue: true })); return; }
// (or for decision-style hooks: emit {} / {decision:undefined} = approve)
```

**CULPRITS (verified via grep -- emit decision:block, do NOT read stop_hook_active):**
stop_on_unwired_assets, stop_on_c_drive_write, stop-regression-backflow, scrutinize-before-stop,
cost-ceiling-stop, stop-system-viz-drift, stop-bug-finding-wiki-gate, stop-slot-task-claims-advisory,
stop-task-boundary-compact-nudge, stop-playbook-corpus-drift-advisory.
(ALREADY honor it: stop-close-own-bg-tasks, subagent-stop-verifier, stop-hook-aggregator.)

**Higher-leverage option:** if these route through `stop-hook-aggregator.mjs` (which already honors
the flag), the gap is the ones wired DIRECTLY in settings.json -> add the guard to those, OR add a
single shared early-guard helper (`scripts/lib/stop-hook-active-guard.mjs`) imported by all 10.
Verify the aggregator's dispatch path FIRST (1 read) before editing 10 files.

**Test:** each patched hook, fed `{stop_hook_active:true,...}`, returns approve (no block) even when
its block condition is otherwise met. Subprocess oracle per hook.

## FIX B -- loop+goal exhaustion -> auto-fall-back to DOMAIN units (fleet rule)

The mechanism ALREADY EXISTS: `stop-goal-clear-advance.mjs` (memory
[[reference_goal_clear_advance_stop_hook_2026_06_08]]: "on iter>=target a slot auto-advances to the
next queued unit") + `loop-state.mjs next` (resume-flag -> own handoff RESUME -> own-lane ->
fleet-fallback). The GAP is it is not a CANONICAL, always-on FLEET rule. Make it so:
1. VERIFY stop-goal-clear-advance is wired Stop fleet-wide + fires on loop-exhaustion (not just /goal-clear).
2. EXTEND the fallback source to the slot's DOMAIN queue: `slot-queue.mjs` / `priority-queue.mjs --pick
   --slot <slot>` (domain-partitioned units per CHAT-SLOT-DOMAINS) BEFORE the generic fleet-fallback,
   so e.g. an exhausted alpha loop picks the next token-optimization unit, foxtrot picks a mill unit, etc.
3. CANONIZE in CLAUDE.md (loop discipline): "loop+goal exhausted -> auto-advance to next DOMAIN unit;
   NEVER idle-stop. Idle is only valid when the domain queue is genuinely empty AND budget is RED."
4. The idle-loop this very session (alpha answering 'Idle' repeatedly) is the anti-pattern this kills.

## ACCEPTANCE
- A: feed each of the 10 hooks `stop_hook_active:true` -> all approve; 9x-block cannot recur.
- B: a loop reaching iter>=target with a non-empty domain queue auto-advances (loop-state next returns
  a domain unit, not {exhausted:true}); only an empty domain queue + RED budget yields a clean stop.
- Fleet-wide: applies to all 26 slots; knob-gated; no per-slot code.
