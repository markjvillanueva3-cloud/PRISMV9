---
name: reference_loop_auto_advance_2026_06_08
description: "/loop now auto-advances to the next unit via `loop-state.mjs next` (4-tier precedence, roll-cap bounded) — loops no longer idle waiting for a human \"continue\" prompt"
type: reference
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:46.647Z
aliases: reference_loop_auto_advance_2026_06_08
---


# Loop auto-advance (U-LOOP-AUTO-ADVANCE, slot:india, 2026-06-08)

Operator directive: "make it so loops automatically lead to next unit or task."
Before this a `/loop` finished its unit and IDLED waiting for a human "continue"
prompt. Now it auto-rolls onto the next unit.

**`node .claude/helpers/loop-state.mjs next --session <sid> --terminal <sid> --chatId <sid> [--slot <slot>]`**
resolves the next task by precedence (first non-empty wins) and ROLLS the loop:
1. `--resume "<directive>"` (caller-supplied)
2. THIS terminal's OWN handoff `## RESUME` section (own-instance match ONLY)
3. `pick-unit.mjs` own-lane (`--slot`, peer-claim-filtered via `--chatId`)
4. `pick-unit.mjs` fleet-wide fallback (own lane empty → highest-priority
   remaining unit; requires BOTH slot AND chatId, else fail-closed)

Empty from all four → `{exhausted:true}` → loop ends (honest stop). Default
rolls (ends current loop record + starts fresh on the resolved task, preserving
`rolledFrom`+`slot`, resetting `iter`); `--resolve-only` is a pure dry-run.

Wired into `.claude/hooks/loop-iteration-inject.mjs` — every `/loop` turn now
instructs `next` (auto-advance when the unit is DONE = committed + scrutiny
passed) instead of `end`-and-wait; `end` ONLY on `exhausted`.

## BOUNDED (the load-bearing safety property)

Auto-advance is NOT auto-advance-forever. A roll resets per-unit `iter`, so the
`cmdTick` `2×target` guard cannot bound TOTAL units advanced — and the fleet
fallback (~281 queued units) essentially never exhausts. So `next` carries a
session-wide `rollsTotal` that survives the iter reset and refuses to roll past
`PRISM_LOOP_MAX_ROLLS` (default 8) → `exhausted:true, reason:"roll-cap"`, ending
the loop to hand back for a human checkpoint. The operator opted into
"auto-advance," not "work the whole roadmap unattended" (R6/R10).

## Scrutiny caught 4 real defects (FAIL→PASS, all fixed + live-verified)

- **P0 unbounded runaway** — the roll-cap above.
- **P1 cross-session handoff contamination** — `per-agent-handoff.mjs read`
  family-falls-back to a PEER slot's handoff when the terminal has none (live:
  a bogus terminal returned oscar's RESUME). The loop would auto-advance onto
  another slot's claimed work labeled `source:handoff-resume`. Fix: accept ONLY
  own-instance `matchedBy` (`HANDOFF_OWN_MATCH`) + the file basename must name
  the terminal. This is the same schema-read/identity-trust class india tracks.
- **P1 `--resolve-only` mutated state** on exhaustion — gated on `!resolveOnly`.
- **P1 fleet-fallback bypassed the peer-claim filter** — injected command had no
  `--chatId`; fail-closed it (requires slot AND chatId) + injector threads it.

9/9 node:test, including a DETERMINISTIC exhaustion test via the
`PRISM_LOOP_NEXT_NO_PICKUNIT=1` seam (replaced a tautological if/else test that
"passed" on both branches — the R9 anti-pattern).

Commit: U-LOOP-AUTO-ADVANCE. Related: [[reference_model_retired_test_stale_2026_06_08]].
