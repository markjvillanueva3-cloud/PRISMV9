# AI-SYSTEMS-NEURAL/U-5AX-DEEPLEARN-WIRE — [MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-5AX-DEEPLEARN-WIRE (slot:india): fix DARK five_axis_deep_learn + close its learning loop

**Commit:** `50143ece3c81` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T18:47:25-05:00
**Tags:** ai-systems-neural, u-5ax-deeplearn-wire, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-5AX-DEEPLEARN-WIRE (slot:india): fix DARK five_axis_deep_learn + close its learning loop

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-5AX-DEEPLEARN-WIRE (slot:india): fix DARK five_axis_deep_learn + close its learning loop

fiveAxisDispatcher's `five_axis_deep_learn` was a bulk-sweep FACADE: wired to
`eng.predict?()??analyze?()??run?()??{note:"method not callable"}` -- but
FiveAxisDeepLearningEngine has none of those (real method = STATIC deepReason),
so the 5-axis deep-reasoning AI was SILENTLY DARK, always returning "method not
callable". Its learning loop (recordOutcome) + stats (getLearningStats) were
unwired too -- predictions could never feed back.

- rewire five_axis_deep_learn -> FiveAxisDeepLearningEngine.deepReason (STATIC,
  on the class -- the methods are static, not on the singleton instance).
- add five_axis_deep_learn_feedback -> recordOutcome (returns refreshed stats)
  and five_axis_deep_learn_stats -> getLearningStats. Closes the calibration loop.
- ACTIONS enum +2; ACTION_FIVEAXIS_SCHEMAS +3 (was UNVALIDATED -> a malformed
  call would have crashed the engine once wired).
- 3 strict schemas. deepReason's call-tree (generateChainOfThought + getMaterialScale)
  dereferences part_features[0], material.iso_group, material.kc11_mpa, machine.{machine_id,
  kinematic_type,rtcp_enabled,primary_axis,secondary_axis}, constraints.operator_skill --
  all REQUIRED so a bad call is rejected at the boundary, never crashing the engine
  or emitting NaN cutting params (kc11_mpa is a getMaterialScale denominator).
- new mock-server handler-capture test (11 cases): real deepReason round-trip
  (confidence in [0.7,0.95], named strategy, populated chain, finite cutting params,
  H-group risk-warning branch); closed-loop feedback->stats increment + 10% error;
  6 boundary rejections (empty part_features / missing iso_group / missing kc11_mpa /
  missing machine / operator_skill out-of-range / non-positive predicted / missing ids).

Per-file 2-arm scrutiny (PASS): the REAL-PATH test caught a P0-class crash my first
schema missed (machine required by generateChainOfThought); arm A then caught a P2
(material.kc11_mpa div-by-NaN on the template-scaling path) -- both fixed + locked
by tests in this commit. tsc --noEmit 0 errors my files (16GB heap); 11/11 new +
86/86 engine 5AXIS-DEEP tests (no regression). Core 5 safety actions + 4 sibling
facade actions untouched (queued as verify-then-fix follow-ups).
```

## Files touched (4)
- mcp-server/src/__tests__/fiveAxisDispatcher.deep-learn-wire.test.ts | 158 ++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/fiveAxisActionSchemas.ts                     |  78 ++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/fiveAxisDispatcher.ts              |  28 +++++++-
- 3 files changed, 261 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 50143ece3c81`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-NEURAL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._