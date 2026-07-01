---
name: reference_goal_clear_advance_stop_hook_2026_06_08
description: "Goal-clear → fall-back-to-next-queued-unit Stop hook (stop-goal-clear-advance.mjs). On iter>=target a slot auto-advances to its next queued unit (own-domain-first→fleet) instead of idling. Complements india's prompt-time cascade."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.594Z
aliases: reference_goal_clear_advance_stop_hook_2026_06_08
---


**Operator directive (2026-06-08, slot:alpha): "fix it so that all galaxies and chat slots fall back to remaining tasks and units in their task queue when they reach their current goal clear."** Commit `632335cec6` `[FLEET-LOOP-AUTOMATION]/U-GOAL-CLEAR-ADVANCE-STOP-HOOK`.

## What shipped
- **`.claude/hooks/stop-goal-clear-advance.mjs`** — NEW Stop hook, the **inverse-sibling** of `stop-force-loop-continue.mjs`:
  - force-loop-continue fires `iter < target` (loop fell off mid-target → re-inject "resume SAME unit")
  - **goal-clear-advance fires `iter >= target`** (goal CLEARED → advance to NEXT queued unit). The `iter === target` boundary is owned solely by the new hook (sibling uses `>=` to bail). Mutually exclusive — never both fire.
  - On goal-clear: dry-run `loop-state.mjs next --resolve-only` (own-domain-first → fleet fallback); `exhausted`→honest no-op idle; else claim (STRUCTURED source only: pick-unit/pick-unit-fleet) + roll loop + inject `## RESUME_LOOP` directive into the handoff so the chat auto-continues.
  - Bounded `MAX_ADVANCE`/session (default 3, NaN-guarded) + india's `PRISM_LOOP_MAX_ROLLS` cap. Advisory — always `{continue:true}`, never blocks Stop. Knobs: `PRISM_GOAL_CLEAR_ADVANCE_{DISABLE,MAX,VERBOSE,SLOTS_JSON}`.
- **`.claude/helpers/loop-state.mjs` `pickUnitTop`** — own-lane-first → fleet-fallback (`source: pick-unit` vs `pick-unit-fleet`), fail-closed `if (slot && chatId)`. NOTE: this converged with peer **india's `ee26028a48`** (same operator directive, parallel build) — india's commit absorbed the loop-state change; alpha's commit is the additive Stop-seam piece india didn't build (R7 reconciliation).
- Wired in `.claude/settings.json` Stop array after `scrutinize-before-stop` (fleet-wide, all 26 slots).
- Tests: `stop-goal-clear-advance.test.mjs` (8) + `loop-state-fleet-fallback.test.mjs` (3).

## Bugs caught + fixed (3-of-3 scrutiny, R12/R9)
1. **`process.execPath` not bare `"node"`** — the sibling uses bare `"node"` which ENOENTs when node isn't on PATH (the PRISM portable-node env). Fixed all 4 child-spawn sites. Strictly more correct than the sibling.
2. **parseUnitKey false-claim** — claim was unconditional; a freeform handoff-resume prose fragment like `QUOTING-MS0 / U-X` could be parsed + falsely claim a peer's unit. Fixed: claim gated on STRUCTURED source only.
3. **RESUME_LOOP strip regex broken (BOTH variants)** — empirically: no-`m` regex `test()===false` on real content (never strips); `m`-flag `$`=end-of-line strips only the marker line, orphaning the body → duplicate blocks accumulate. Replaced with a **line-scanner** (drop from each marker line until the next non-RESUME_LOOP `## ` heading or EOF). The SIBLING still has this m-regex bug — flagged for follow-up.
4. **Tautological test** — test #7 counted `## RESUME_LOOP` markers (stays 1 even when body orphans). Strengthened to assert BODY-sentinel count (`GOAL CLEARED → auto-advance` ==1); proven to fail-correctly on the bug (markers:1, bodies:2).
5. **Settings clobber averted** — `git add` of the on-disk `H:/prism/.claude/settings.json` (drifted far from HEAD) nearly committed 486 lines of other slots' env config incl `PRISM_OBSIDIAN_API_KEY`. Reset to HEAD~1 + re-applied ONLY my 1 entry (R7 — don't blend). The tracked `H:/prism/.claude/settings.json` is STALE vs runtime `H:/.claude/settings.json` (36 vs 64 Stop hooks) — pre-existing fleet drift, separate concern.

## Live-validated (R15)
Wired portable-node invocation, bound alpha slot + cleared loop → resolved+claimed `AI-MAX-MS0::U-AIMAX09`, injected directive, `{continue:true}`. 11/11 tests, 3-of-3 PASS.

Related: india's `ee26028a48` (loop-iteration-inject prompt-time cascade) · [[feedback_conflict_fork_rule]] · sibling `stop-force-loop-continue.mjs` (has unfixed m-regex).
