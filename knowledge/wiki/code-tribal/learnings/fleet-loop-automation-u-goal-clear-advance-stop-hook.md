# FLEET-LOOP-AUTOMATION/U-GOAL-CLEAR-ADVANCE-STOP-HOOK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LOOP-AUTOMATION]/U-GOAL-CLEAR-ADVANCE-STOP-HOOK (slot:alpha): Stop-seam auto-advance — slots fall back to next queued unit on goal-clear

**Commit:** `632335cec6b4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T20:50:06-05:00
**Tags:** fleet-loop-automation, u-goal-clear-advance-stop-hook, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LOOP-AUTOMATION]/U-GOAL-CLEAR-ADVANCE-STOP-HOOK (slot:alpha): Stop-seam auto-advance — slots fall back to next queued unit on goal-clear

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LOOP-AUTOMATION]/U-GOAL-CLEAR-ADVANCE-STOP-HOOK (slot:alpha): Stop-seam auto-advance — slots fall back to next queued unit on goal-clear

Operator: 'fix it so that all galaxies and chat slots fall back to remaining tasks and units in their task queue when they reach their current goal clear.' India's ee26028a48 (U-LOOP-AUTO-ADVANCE) wired the next-unit cascade into loop-iteration-inject (UserPromptSubmit/prompt-time). This adds the COMPLEMENTARY Stop-seam piece india did not build: a Stop hook that fires on goal-clear (iter>=target) and advances instead of idling — the exact case that produced the repeated idle-Stop loop observed this session.

R7 reconciliation: alpha + india converged on the same loop-state.mjs fleet-fallback in parallel; india's commit absorbed it (pick-unit-fleet source present at loop-state.mjs:219). This commit is ADDITIVE — only the Stop hook + its tests + the fleet-fallback test + wiring. loop-state.mjs is NOT re-touched (india owns it now).

Files:
- stop-goal-clear-advance.mjs — inverse-sibling of stop-force-loop-continue.mjs (which handles iter<target). On goal-clear: dry-run resolve next via loop-state next --resolve-only (own-domain-first → fleet); exhausted→honest no-op idle; else claim (STRUCTURED source only) + roll loop + inject ## RESUME_LOOP directive. Bounded MAX_ADVANCE/session, advisory never-blocks, knobs DISABLE/MAX/VERBOSE + test-only SLOTS_JSON override.
- stop-goal-clear-advance.test.mjs (8/8) + loop-state-fleet-fallback.test.mjs (3/3).
- settings.json: wired after stop-force-loop-continue (fleet-wide, all 26 slots).

Per-file 2-reviewer gate: PASS round 2 (round 1 caught + fixed 2 P1 [parseUnitKey-prose-claim, RESUME_LOOP regex m-flag corruption] + 2 P2 [MAX NaN guard, unbound-slot no-op]). Uses process.execPath not bare 'node' (sibling's latent bug). Live E2E: bound alpha slot + cleared loop → resolved+claimed AI-MAX-MS0::U-AIMAX09, injected directive, {continue:true}.
```

## Files touched (5)
- .claude/helpers/loop-state-fleet-fallback.test.mjs       |  91 ++++++++++++++++++++++++++++++++++++
- .claude/hooks/__tests__/stop-goal-clear-advance.test.mjs | 215 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/stop-goal-clear-advance.mjs                | 310 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/settings.json                                    |   5 ++
- 4 files changed, 621 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 632335cec6b4`
- Milestone envelope: `mcp-server/data/milestones/FLEET-LOOP-AUTOMATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._