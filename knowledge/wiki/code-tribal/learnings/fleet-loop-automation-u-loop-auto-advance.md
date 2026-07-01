# FLEET-LOOP-AUTOMATION/U-LOOP-AUTO-ADVANCE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LOOP-AUTOMATION]/U-LOOP-AUTO-ADVANCE (slot:india): loops auto-advance to the next unit (operator directive)

**Commit:** `ee26028a4880` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T15:29:46-05:00
**Tags:** fleet-loop-automation, u-loop-auto-advance, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LOOP-AUTOMATION]/U-LOOP-AUTO-ADVANCE (slot:india): loops auto-advance to the next unit (operator directive)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LOOP-AUTOMATION]/U-LOOP-AUTO-ADVANCE (slot:india): loops auto-advance to the next unit (operator directive)

Operator: 'make it so loops automatically lead to next unit or task.' Before this, a /loop ended its unit and IDLED waiting for a human 'continue' prompt (observed repeatedly this session). Now the loop auto-rolls onto the next unit.

loop-state.mjs gains :
- resolveNextTask 4-tier precedence: (1) --resume flag, (2) THIS terminal's own handoff ## RESUME, (3) pick-unit own-lane, (4) pick-unit fleet-fallback. Empty from all → exhausted (honest stop).
- cmdNext default ROLLS (ends current loop record + starts fresh on the resolved task in one call, preserving rolledFrom + slot, resetting iter); --resolve-only is a pure dry-run.
- Wired into loop-iteration-inject.mjs: every /loop turn instructs  (auto-advance when the unit is DONE=committed+scrutiny) instead of end-and-wait; end ONLY on exhausted.

SCRUTINY FAIL->PASS (2-reviewer per-file gate caught real defects; all fixed + re-verified):
- P0 RUNAWAY: a roll resets per-unit iter, so the cmdTick 2xtarget guard could not bound TOTAL units advanced; fleet-fallback (~281 units) never exhausts → unbounded autonomy (R6/R10 violation). FIX: rollsTotal carried through cmdNext (survives the iter reset), refuse to roll past PRISM_LOOP_MAX_ROLLS (default 8) → exhausted+reason:roll-cap, hand back for a human checkpoint.
- P1 CROSS-SESSION HANDOFF CONTAMINATION (live-verified): per-agent-handoff  family-falls-back to a PEER slot's handoff when the terminal has none → loop would auto-advance onto another slot's claimed work labeled source:handoff-resume. FIX: handoffResume accepts ONLY own-instance matches (HANDOFF_OWN_MATCH) + requires the file basename to name the terminal; else ''.
- P1 RESOLVE-ONLY MUTATION: the exhausted-ends-loop write fired even under --resolve-only. FIX: gated on !resolveOnly (true dry-run; also idempotent via status===running guard).
- P1 FLEET-FALLBACK BYPASSED PEER-CLAIM FILTER: injected command had no --chatId → fleet pick unfiltered → auto-roll onto peer work. FIX: pickUnitTop fleet-fallback requires slot AND chatId (fail-closed); injector threads --chatId.

Tests (9/9 green, node:test): precedence/roll/target-carry/resolve-only-no-mutate/fail-loud + NEW deterministic exhaustion (PRISM_LOOP_NEXT_NO_PICKUNIT=1 seam, replaces a tautological if/else test) + roll-cap + handoff-contamination-failsoft + resolve-only-exhausted-no-mutation. 2-reviewer PASS round 2 (0 P0/P1; 2 P3 pre-existing fleet-identity notes deferred).
```

## Files touched (4)
- .claude/helpers/loop-state-next.test.mjs | 190 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/helpers/loop-state.mjs           | 194 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- .claude/hooks/loop-iteration-inject.mjs  |  14 +++++++
- 3 files changed, 397 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ee26028a4880`
- Milestone envelope: `mcp-server/data/milestones/FLEET-LOOP-AUTOMATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._