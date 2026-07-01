# POST-PROCESSOR/U-PP-KIENZLE-EMIT-REGRESSION — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-KIENZLE-EMIT-REGRESSION (slot:echo): lock Stage-1.1 emitted force == canonical kienzleForce of reported kc1.1/mc

**Commit:** `7cf0427bfb20` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T17:46:12-05:00
**Tags:** post-processor, u-pp-kienzle-emit-regression, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-KIENZLE-EMIT-REGRESSION (slot:echo): lock Stage-1.1 emitted force == canonical kienzleForce of reported kc1.1/mc

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-KIENZLE-EMIT-REGRESSION (slot:echo): lock Stage-1.1 emitted force == canonical kienzleForce of reported kc1.1/mc

R9 regression for PostProcessorPipelineEngine: the post-processor emits the F/S a
real machine runs, so an inline-constant divergence here reaches the shop floor --
the post-processor analogue of oscar's 2026-06-23 SFC MATERIAL_HARDNESS divergence
(inline kc/Taylor table diverged from constants.ts; ~4x off while isolated identity
tests stayed green).

8 tests, all reference-value / algebraic-invariant (no stubs, no .skip):
- happy: block.forces.Fc_N == kienzleForce(reported kc1.1, mc, ap, emitted fz) exactly
- verbatim MaterialContext.kc1_1=1850 survives to kc1_1_base (no canonical shadowing)
- per-ISO canonical fallback P/M/K distinct + ordered (catches one-inlined-kc-for-all)
- coating(TiAlN=0.85)+wear(VB0.3->1.5) K-factor composition == base x 0.85 x 1.5
- Kienzle exponent reconstruction (pins 1-mc); monotonic-in-ap
- adversarial: degenerate zero-depth floors to ap=0.1 finite/positive; power == cuttingPower

Contract grounded in source (Stage 1.1 lines 924/980/1219/1232/1250; _resolveContexts
line 4238). Downstream force-mutating stages disabled to isolate the Stage-1.1 emit.
Physical golden NC (Hurco/Okuma/Haas) deferred -- this locks the physics-core emit
invariant, the constant-divergence catch the unit targeted. Per-file 2-arm scrutiny PASS.

File: mcp-server/src/__tests__/PostProcessorPipelineEngine.kienzle-emit.test.ts
```

## Files touched (3)
- mcp-server/src/__tests__/PostProcessorPipelineEngine.kienzle-emit.test.ts | 333 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md                              |  11 +++-
- 2 files changed, 342 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7cf0427bfb20`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._