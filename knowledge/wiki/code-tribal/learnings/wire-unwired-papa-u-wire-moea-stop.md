# WIRE-UNWIRED-PAPA/U-WIRE-MOEA-STOP — [MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-MOEA-STOP (slot:papa->tango): wire MOEAStoppingCriterion -> prism_calc

**Commit:** `e70bffb7af0d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T11:30:38-05:00
**Tags:** wire-unwired-papa, u-wire-moea-stop, auto-distilled

## Subject
[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-MOEA-STOP (slot:papa->tango): wire MOEAStoppingCriterion -> prism_calc

## Body
```
[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-MOEA-STOP (slot:papa->tango): wire MOEAStoppingCriterion -> prism_calc

Wire MOEAStoppingCriterion (ALGO-SYNERGY-MS0, slot:tango) into prism_calc:
moea_stopping_evaluate. The engine is a STATEFUL class (HV-saturation stopping for
MO solvers, no singleton); the action takes the WHOLE sequence of per-generation
Pareto fronts + config, builds a FRESH instance per call (no cross-call state
leak), runs evaluate() until shouldStop, returns {decision, stopped,
stoppedAtGeneration, trajectory, generationsEvaluated}.

- TYPE-SAFE (no `as any` despite the surrounding calc cases using it): config via
  ConstructorParameters<typeof MOEAStoppingCriterion>[0], decision via
  ReturnType<typeof criterion.evaluate>.
- fail-soft: empty front -> no_data; ragged/dim-mismatch front -> HypervolumeIndicator
  throws -> dispatcherError ok:false (tested).
- schema mirrors StoppingConfig (tolerance/stableWindow/lookback positive; reference
  number[]; maxGenerations int positive); fronts = number[][][] min(1).
- 12-test suite: hand-derived saturation arithmetic (identical fronts saturate at
  gen 3; improving fronts stay running; maxGenerations cap at gen 2; empty->no_data;
  trajectory+reset), faithful round-trip (early-break trajectory length 3,
  stopped true/false both correctly asserted -- slim keeps booleans), 3 schema
  rejections + 1 engine-throw fail-loud. tsc 0 new from moea symbols (total 638 =
  pre-existing baseline; pre-existing SafetyAssessment cast error at ~8235 is NOT
  this changeset). vitest 12/12 PASS.
- 2 per-file scrutiny agents: both VERDICT PASS, 0 P0/P1; B's 2 P2s (wrong
  slimResponse comments) + 1 P3 (ragged-front fail-loud) applied inline.
- diff-verified: only my hunks staged (no peer-change sweep per
  reference_git_add_sweeps_pretracked_changes).

dup-checked all branches: tango built it (2805f8b70f), no peer wired it. galaxy:tango
-> prism_calc; shared-tree fallback per feedback_papa_cross_galaxy_work_commit_to_their_worktrees.
```

## Files touched (4)
- mcp-server/src/__tests__/calcDispatcher.uwireMoeaStop.test.ts | 180 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/calcActionSchemas.ts                   |  11 ++++++++
- mcp-server/src/tools/dispatchers/calcDispatcher.ts            |  24 ++++++++++++++++
- 3 files changed, 215 insertions(+)

## Lessons surfaced in commit body
- til shouldStop, returns {decision, stopped,

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e70bffb7af0d`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._