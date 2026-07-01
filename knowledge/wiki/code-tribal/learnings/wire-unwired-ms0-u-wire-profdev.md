# WIRE-UNWIRED-MS0/U-WIRE-PROFDEV — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PROFDEV: wire ProfileDeviationAnalyzerEngine into prism_turning (2 actions)

**Commit:** `c10aa322dd7f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T22:32:40-05:00
**Tags:** wire-unwired-ms0, u-wire-profdev, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PROFDEV: wire ProfileDeviationAnalyzerEngine into prism_turning (2 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PROFDEV: wire ProfileDeviationAnalyzerEngine into prism_turning (2 actions)

ProfileDeviationAnalyzerEngine (LATHE-PRO-MS8) is a pure-compute CMM-style
profile deviation analyzer (ASME Y14.5 bilateral / unilateral_outside /
unilateral_inside zones). 0 dispatcher refs before this, 12/12 engine-direct
tests green. Both wired actions are pure compute — no state mutation, so the
full public surface is wired (not the read-only-first split safety rule).

2 actions wired:
  - lathe_profile_deviation_analyze → analyze(input)
  - lathe_profile_deviation_stats   → getStats()

Surfaces:
  - turningDispatcher.ts: +2 ACTIONS enum entries + 1 paired case block
    (matches sibling LatheMultiOpPlanner / VendorTurningCatalog convention)
  - turningActionSchemas.ts: +2 Zod schemas — full ProfileAnalysisInput
    contract (basis ≥2, measured ≥2, tolerance > 0, zone_type enum, best_fit)
  - dispatcher.profileDeviation.test.ts: 14 cases (6 schema + 8 round-trip)
    - ROUTING PROOF via known +0.1mm offset → max_positive_deviation_mm=0.1
    - best_fit subtracts mean offset → pass=true (verified flip)
    - Field-by-field cross-check with engine-direct (slimResponse strips
      empty `warnings:[]`, so JSON deep-equal would fail — compares each
      load-bearing field individually)
    - unilateral_outside zone behavior verified (negative dev → fail)

Test result: 26/26 PASS (14 round-trip + 12 engine-direct).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/dispatcher.profileDeviation.test.ts  | 266 +++++++++++++++++++++
- mcp-server/src/schemas/turningActionSchemas.ts     |  20 ++
- .../src/tools/dispatchers/turningDispatcher.ts     |  21 ++
- 3 files changed, 307 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c10aa322dd7f`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._