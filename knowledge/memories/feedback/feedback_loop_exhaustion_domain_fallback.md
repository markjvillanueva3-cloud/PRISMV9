---
name: feedback_loop_exhaustion_domain_fallback
description: FLEET RULE -- when a loop+goal is exhausted/done, a chat AUTO-ADVANCES to the next DOMAIN unit from its slot queue; it NEVER idle-stops. Idle is valid only when the domain queue is empty AND budget is RED. Plus the stop_hook_active guard for Stop hooks.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.433Z
aliases: feedback_loop_exhaustion_domain_fallback
---



# FLEET RULE: loop+goal exhaustion -> auto-fall-back to DOMAIN units (never idle-stop)

**Why:** operator 2026-06-11, observing a chat answer "Idle" repeatedly after its loop task was done.
A chat given a loop+goal must KEEP PROGRESSING on its slot's domain work, not stop/idle, until the
domain queue is genuinely empty AND budget is RED.

**Re-affirmed + broadened 2026-06-17 (operator, after alpha idled post-ROUTING-GRAPH-COMPLETENESS):**
*"if you complete a goal, always revert back to tasks left over from previous sessions in your chat slot
or tasks and units in your queue or backlogged roadmaps and plans."* So the fallback order is explicitly:
(1) leftover/deferred tasks from THIS + previous sessions in the slot (incl. deferred P2s, the slot's
DELTA/MASTER-CONTEXT ledger open-threads), (2) the slot-task queue / priority-queue, (3) backlogged
roadmaps + plans (`PRISM-UNIFIED-ROADMAP`, per-slot specs), THEN (4) fleet-fallback. Never answer "Idle"
while any of 1-3 is non-empty and budget is not RED.

**How to apply (every slot, every loop):**
1. When a `/loop` reaches iter>=target OR its `/goal` task is complete/exhausted, do NOT go idle.
   Auto-advance: `node H:/prism/.claude/helpers/loop-state.mjs next --session <sid> ...` -- it resolves
   the next unit (resume-flag -> own handoff RESUME -> own-lane -> fleet-fallback).
2. EXTEND the fallback to the slot's DOMAIN queue FIRST: `slot-queue.mjs` / `priority-queue.mjs --pick
   --slot <slot>` (domain-partitioned per `state/shared/CHAT-SLOT-DOMAINS.md` -- alpha=token-optimization,
   foxtrot=mill, kilo=cam, ...). Only after the domain queue is empty does the generic fleet-fallback apply.
3. Existing mechanism: `stop-goal-clear-advance.mjs` ([[reference_goal_clear_advance_stop_hook_2026_06_08]])
   already auto-advances on iter>=target. This rule CANONIZES it fleet-wide + adds the domain-queue
   priority. Build spec: `state/shared/specs/STOP-HOOK-PROGRESS-MS0-SPEC-2026-06-11.md`.
4. Idle ("nothing to do") is valid ONLY when: domain queue empty AND fleet-fallback empty AND budget RED.
   Otherwise, PICK THE NEXT DOMAIN UNIT AND BUILD.

## Companion: Stop hooks MUST honor stop_hook_active (the 9x-block fix)
Claude Code re-fires Stop hooks after a block with `stop_hook_active:true` in stdin. A blocking Stop hook
that does NOT short-circuit to approve while that flag is set re-blocks until the harness override
(CLAUDE_CODE_STOP_HOOK_BLOCK_CAP, "blocked 9 times"). EVERY blocking Stop hook needs, at the top of main:
`if (input?.stop_hook_active === true) { emit({continue:true}); return; }`. 10 PRISM Stop hooks currently
lack it (list in the STOP-HOOK-PROGRESS-MS0 spec). Pairs with [[feedback_close_background_tasks_at_stop]].
