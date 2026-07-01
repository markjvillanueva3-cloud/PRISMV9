# KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-P6 — [MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-P6: LinearStateSpaceModel — third course->node conversion, completes composition chain

**Commit:** `a547223bbf43` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T12:52:18-05:00
**Tags:** knowledge-conversion-ms0, u-course-forge-p6, auto-distilled

## Subject
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-P6: LinearStateSpaceModel — third course->node conversion, completes composition chain

## Body
```
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-P6: LinearStateSpaceModel — third course->node conversion, completes composition chain

P6 from COURSE-FORGE-PROPOSALS.md: algorithm:pendulum-cart-modeling +
formula:transfer-functions, MIT-OCW 2.003 (Modeling Dynamics and
Control I), mfg_relevance 0.80, dedup CLEAR (no StateSpace/Transfer
Function/RK in algorithms/; controllers exist but are not LTI
state-space primitives).

P6 proposal note honored: transfer-functions is ALGEBRAIC (no physical
constants) so it lands as algorithm, NOT the physics-reviewer/constants.ts
path. The physics (M,m,l,g) stays caller-supplied in pendulumCartExample.

mcp-server/src/algorithms/LinearStateSpaceModel.ts (Algorithm<I,O>):
- LTI: ẋ=Ax+Bu, y=Cx+Du; 4 operations (transfer_function /
  frequency_response / simulate / ranks)
- SISO transfer function via Faddeev-LeVerrier char-poly + adjugate
  M-matrices: G(s) = C(sI-A)^-1 B + D as {num,den} coeffs
- Bode frequency_response (|G(jω)|, phase) via complex Horner eval
- Kalman controllability [B AB...] + observability [C;CA;...] rank
- simulate() DELEGATES to ODEIntegrator/RK4 → composition chain:
  LinearStateSpace.simulate → ODEIntegrator → (makeSubstepIntegrator)
  → OperatorSplittingMethod. All 3 P1/P6/P7 nodes compose.
- pendulumCartExample factory: caller supplies M,m,l,g; file owns only
  the matrix algebra (NO inline physics constants)
- self-contained pure linear algebra (matMul, Faddeev-LeVerrier,
  Gaussian-elim rank) — no external matrix dep
- generalizes StabilityLobeDiagram's inline SDOF G(jω)

mcp-server/src/algorithms/LinearStateSpaceModel.test.ts — 22 vitest:
- char-poly vs hand-computed (λ²+3λ+2; diag→λ²+5λ+4)
- SISO TF: integrator 1/s, 2nd-order 1/(s²+3s+2), feedthrough
  (2s+3)/(s+1)
- freq response: 1/(s+1) DC=1, -3dB at ω=1, -45° phase; resonant peak
- Kalman ranks: controllable companion (full) + uncontrollable diag
- simulate vs analytical: undamped oscillator one-period; first-order
  step response x(5)≈1-e⁻⁵ (proves ODEIntegrator composition)
- pendulum-cart eigenstructure: λ²(λ²-21.582) → unstable inverted pole
- 7 validation/adversarial: non-square, jagged, dim-mismatch, NaN,
  MIMO-rejected, simulate-missing-args

78/78 PASS across all 3 composable suites. tsc clean.

Numerical-hygiene bug caught + fixed in CODE (not test, per R12):
Faddeev-LeVerrier emitted negative-zero coefficients (-trace/k when
trace==0). Object.is(-0,0)===false breaks downstream equality/
serialization. Fixed with  normalization at the coefficient
source — clean polynomial output for all consumers.

WIRE-EXEMPT: shares deferred U-COURSE-FORGE-P1-DISPATCHER
(prism_calc:lti_analyze). Usable via import; composes P1+P6+P7.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../src/algorithms/LinearStateSpaceModel.test.ts   | 294 +++++++++++++
- mcp-server/src/algorithms/LinearStateSpaceModel.ts | 483 +++++++++++++++++++++
- 2 files changed, 777 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a547223bbf43`
- Milestone envelope: `mcp-server/data/milestones/KNOWLEDGE-CONVERSION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._