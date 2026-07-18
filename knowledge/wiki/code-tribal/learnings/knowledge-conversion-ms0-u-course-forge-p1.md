# KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-P1 — [MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-P1: OperatorSplittingMethod algorithm (first course->node conversion)

**Commit:** `1323fa4ee7a5` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T12:12:14-05:00
**Tags:** knowledge-conversion-ms0, u-course-forge-p1, auto-distilled

## Subject
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-P1: OperatorSplittingMethod algorithm (first course->node conversion)

## Body
```
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-P1: OperatorSplittingMethod algorithm (first course->node conversion)

First Lane C FORGE-QUEUE candidate converted to a usable PRISM node.
P1 from COURSE-FORGE-PROPOSALS.md: algorithm:operator-splitting,
MIT-OCW 10.34 'Numerical Methods Applied to Chemical Engineering',
mfg_relevance 0.80, dedup-preflight CLEAR (grep confirmed no
OperatorSplit/operator_split anywhere in mcp-server/src).

mcp-server/src/algorithms/OperatorSplittingMethod.ts (Algorithm<I,O>):
- Lie-Trotter (first-order) + Strang (second-order symmetric) schemes
- operator-agnostic: caller injects pure SubstepIntegrator applyA/applyB
- NO physics constants imported (numerical primitive — caller owns physics)
- overflow guard (1e15 threshold), non-finite detection via absMax
- substep-return validation (array / length / number-type, R12 fail-loud)
- defensive state copies — trajectory snapshots immutable from final_state
- Strang 1968 SIAM DOI 10.1137/0705041 cited in AlgorithmMeta

mcp-server/src/algorithms/OperatorSplittingMethod.test.ts — 28 vitest:
- analytical references (commuting decay → exact y*exp(-1.5) to 1e-10)
- convergence order (genuinely non-commuting rotate∘decayX: Strang >3x
  more accurate than Lie at dt=0.1; monotone convergence both schemes)
- trajectory capture + immutability (no aliasing into final_state)
- 9 validation failure modes (empty/NaN/Inf state, bad time/steps/method)
- 4 adversarial substep returns (non-array, wrong-length, overflow, NaN)
- metadata + safety + defaults

28/28 PASS. tsc --noEmit --skipLibCheck clean.

Test-design bug caught + fixed mid-build: first convergence test used
component-wise decay which is a SCALED IDENTITY (commutes with rotation)
→ zero splitting error → roundoff-noise comparison. Replaced with
genuinely non-commuting rotate∘decay-x-only pair.

WIRE-EXEMPT tagged: dispatcher action prism_calc:operator_split deferred
to U-COURSE-FORGE-P1-DISPATCHER (per-file scrutiny gate needs a less
peer-saturated calcDispatcher tree; algorithm fully usable via import).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../src/algorithms/OperatorSplittingMethod.test.ts | 396 +++++++++++++++++++++
- .../src/algorithms/OperatorSplittingMethod.ts      | 333 +++++++++++++++++
- 2 files changed, 729 insertions(+)

## Lessons surfaced in commit body
- wrong-length, overflow, NaN)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1323fa4ee7a5`
- Milestone envelope: `mcp-server/data/milestones/KNOWLEDGE-CONVERSION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._