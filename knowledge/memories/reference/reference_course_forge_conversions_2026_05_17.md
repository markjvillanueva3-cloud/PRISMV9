---
name: reference-course-forge-conversions-2026-05-17
description: "7 course→node conversions from MIT-OCW: P1 OperatorSplitting + P7 ODEIntegrator + P6 LinearStateSpace + FDM FiniteDifference + GD GradientDescent + FEM FiniteElementMethod1D + LAG LagrangianMechanics. KNOWLEDGE-CONVERSION-MS0 Lane C proven end-to-end. 148 tests, all mcp-server/src/algorithms/."
aliases: reference_course_forge_conversions_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.072Z
---


**Course-forge conversions** — shipped 2026-05-17 by slot india (claude-41db1b82).
Commits `1323fa4ee7` (P1) + `b38a9f2285` (P7) + `a547223bbf` (P6) + `7cbbe511d7` (FDM) + `271351e7ec` (GD) + `937bc66e76` (FEM) + `56243befc9` (LAG). 148/148 tests, tsc clean.
LAG (LagrangianMechanics, MIT-OCW 16.07/2.032) — numerical Euler-Lagrange EOM (M·q̈=∂L/∂q+Q−…); `makeEOMDerivative` composes into ODEIntegrator (model physics as a Lagrangian, integrate numerically). Singular Lagrangian → NaN q̈ + flag (R12).

Dispatcher wiring: all 7 nodes WIRE-EXEMPT (5 take JS closures — cannot cross JSON dispatcher boundary). Decision record `state/shared/specs/U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.md` (3 options). Option-A keystone BUILT: `SafeExpressionEvaluator` (commit `47e93d03fa`, 60 tests) — sandboxed `compileExpression(src,vars)→(scope)=>number`, tokenizer→recursive-descent→AST walk, NO eval/Function, P0-hardened (forbidden names, DoS caps, no member access). Unblocks a future U-COURSE-FORGE-P1-DISPATCHER.
FEM (FiniteElementMethod1D, MIT-OCW 1.050/3.22/1.105) is the weak-form Galerkin P1 sibling of FDM (strong-form). Verified by 1D-P1 nodal exactness (−u″=1 → u=x(1−x)/2 exact at nodes) + O(h²) convergence.
FDM (FiniteDifferenceMethod, MIT-OCW 2.086) is the PDE keystone: `makeMethodOfLinesRHS` discretizes a PDE into an ODE system the others evolve. Heat-eq Fourier-decay verified through the FDM→ODEIntegrator composition.
GD (GradientDescent, MIT-OCW 18.02) is COMPLEMENTARY not composable — first-order LOCAL optimizer (vanilla/momentum/Adam) alongside the derivative-free BayesianOptimizer/GeneticOptimizer. 4 bugs caught mid-build (R12), all test-side except Faddeev-LeVerrier −0 (code).

First proof the Lane C pipeline produces real usable PRISM nodes, not just advisory proposals:
- **P1 OperatorSplittingMethod** (MIT-OCW 10.34): Lie-Trotter + Strang split of dy/dt=A(y)+B(y); operator-agnostic; 28 tests.
- **P7 ODEIntegrator** (MIT-OCW 2.003j): explicit Euler + classical RK4; `makeSubstepIntegrator` adapter; 28 tests.
- **P6 LinearStateSpaceModel** (MIT-OCW 2.003): LTI ẋ=Ax+Bu; SISO TF via Faddeev-LeVerrier; Bode; Kalman ranks; `pendulumCartExample`; 22 tests.

**Composition chain (verified by real-value tests):** LinearStateSpace.simulate → ODEIntegrator/RK4; ODEIntegrator.makeSubstepIntegrator → OperatorSplitting. Multi-physics ODE: split → integrate → simulate, all 3 interlock.

**Doctrine:** NO inline physics constants (numerical/algebraic primitives; caller owns physics — that's why P6 transfer-functions landed as `algorithm` not the physics-reviewer/constants.ts path). All `mcp-server/src/algorithms/*.ts`. WIRE-EXEMPT, shared deferred U-COURSE-FORGE-P1-DISPATCHER (prism_calc:{operator_split,ode_integrate,lti_analyze}).

**2 bugs caught+fixed mid-build (R12 fix-code-not-test):** (1) convergence-test operators secretly commuted (component-wise decay = scaled identity ⊥ rotation) → all splitting error was roundoff; replaced with genuinely non-commuting rotate∘decay-x-only. (2) Faddeev-LeVerrier emitted -0 coefficients (Object.is(-0,0)=false breaks downstream eq/serialization); fixed `+ 0` at source.

**Wiki:** [[course-forge-conversions]] · **CLAUDE.md:** §[[reference_knowledge_conversion_ms0_2026_05_17|KNOWLEDGE-CONVERSION-MS0]] (Lane C para 3). Sister: [[reference_course_forge_stubs_emitter_2026_05_17]] (proposal layer) · [[reference_knowledge_conversion_ms0_2026_05_17]] (milestone).
