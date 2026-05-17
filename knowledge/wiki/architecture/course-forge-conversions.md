---
title: Course-forge conversions — first 3 composable algorithm nodes
slug: course-forge-conversions
kind: architecture
status: shipped
date: 2026-05-17
milestone: KNOWLEDGE-CONVERSION-MS0
unit: U-COURSE-FORGE-P1 + U-COURSE-FORGE-P6 + U-COURSE-FORGE-P7
author: claude-41db1b82 (slot india)
related: [[course-forge-stubs-emitter]] [[knowledge-conversion-ms0]]
---

# Course-Forge Conversions — first usable nodes

The proof that the Lane C pipeline produces real, usable PRISM assets — not
just advisory proposals. Three MIT-OCW FORGE-QUEUE candidates converted to
tested, mutually-composable algorithm nodes.

## The three nodes

| Unit | Source | File | Tests |
|------|--------|------|-------|
| P1 | MIT-OCW 10.34 (Numerical Methods) | `mcp-server/src/algorithms/OperatorSplittingMethod.ts` | 28 |
| P7 | MIT-OCW 2.003j (Dynamics & Control I) | `mcp-server/src/algorithms/ODEIntegrator.ts` | 28 |
| P6 | MIT-OCW 2.003 (Modeling Dynamics & Control I) | `mcp-server/src/algorithms/LinearStateSpaceModel.ts` | 22 |
| FDM | MIT-OCW 2.086 (Numerical Computation) | `mcp-server/src/algorithms/FiniteDifferenceMethod.ts` | 18 |
| GD | MIT-OCW 18.02 (Multivariable Calculus) | `mcp-server/src/algorithms/GradientDescent.ts` | 17 |
| FEM | MIT-OCW 1.050/3.22/1.105 (Solid Mechanics) | `mcp-server/src/algorithms/FiniteElementMethod1D.ts` | 17 |
| LAG | MIT-OCW 16.07/2.032 (Dynamics) | `mcp-server/src/algorithms/LagrangianMechanics.ts` | 18 |

Commits: `1323fa4ee7` (P1) · `b38a9f2285` (P7) · `a547223bbf` (P6) · `7cbbe511d7` (FDM) · `271351e7ec` (GD) · `937bc66e76` (FEM) · `56243befc9` (LAG). 148/148 tests, tsc clean.

**LAG `LagrangianMechanics`** derives generalized accelerations `q̈` from a caller-supplied Lagrangian `L(q,q̇,t)` via the numerical Euler-Lagrange equation `M·q̈ = ∂L/∂q + Q − (∂²L/∂q̇∂q)·q̇` — mass matrix `Mᵢⱼ=∂²L/∂q̇ᵢ∂q̇ⱼ` by central FD, Gaussian-elimination solve, singular-Lagrangian fail-loud (NaN q̈ + flag). `makeEOMDerivative` turns it into a state-space `DerivativeFn` → **composes into ODEIntegrator**: model a mechanism's physics as a Lagrangian, integrate numerically (verified — simple-pendulum small-angle period `≈2π√(ℓ/g)`, harmonic-oscillator energy conservation over 20 s).

The first four (P1/P7/P6/FDM) compose into a PDE solver. **GD is complementary, not composable** — it's the first-order LOCAL optimizer regime (smooth differentiable objectives, fast local convergence) alongside PRISM's existing derivative-FREE global optimizers (`BayesianOptimizer`, `GeneticOptimizer`). vanilla / heavy-ball momentum / Adam, analytic or central-FD gradient, fail-loud divergence guard.

**FEM `FiniteElementMethod1D`** is the **weak-form sibling of FDM** (strong-form). Galerkin P1 (linear hat) solver for the model BVP `−(a·u′)′ + c·u = f` on `[0,L]`: exact element stiffness/mass matrices, consistent trapezoidal load, symmetric tridiagonal assembly, Dirichlet (lift+eliminate) + Neumann (natural flux) BCs, O(n) Thomas solve. Verified by 1D-P1 nodal exactness (`−u″=1 → u=x(1−x)/2` exact at every node, mesh-independent) and O(h²) convergence on `−u″=π²sin(πx)`. Together FDM + FEM are the two canonical PDE discretizations taught across the MIT-OCW numerical courses.

## P1 — OperatorSplittingMethod

Solves `dy/dt = A(y) + B(y)` by alternating sub-integrations:
- **Lie-Trotter** (first-order): `Φ_B^dt ∘ Φ_A^dt`
- **Strang** (second-order symmetric): `Φ_A^{dt/2} ∘ Φ_B^dt ∘ Φ_A^{dt/2}`

Operator-agnostic — caller injects pure `SubstepIntegrator` closures for A
and B. Overflow guard (1e15), R12 fail-loud on bad substep returns. Strang
1968 SIAM DOI cited.

## P7 — ODEIntegrator

Fixed-step `dy/dt = f(t,y)` integration: explicit Euler (global O(dt)) +
classical RK4 (global O(dt⁴)). The `makeSubstepIntegrator(fAutonomous, method)`
adapter wraps an autonomous derivative as a `SubstepIntegrator` — **this is
the composition seam**: an ODEIntegrator step becomes a valid substep for
OperatorSplittingMethod.

## P6 — LinearStateSpaceModel

LTI `ẋ=Ax+Bu, y=Cx+Du`. Four operations:
- `transfer_function` — SISO `G(s)=C(sI−A)⁻¹B+D` via Faddeev–LeVerrier
  char-poly + adjugate M-matrices → `{num, den}` coefficients
- `frequency_response` — Bode `|G(jω)|` + phase via complex Horner eval
- `simulate` — time response, **delegates to ODEIntegrator/RK4**
- `ranks` — Kalman controllability `[B AB …]` + observability `[C;CA;…]`

`pendulumCartExample({M,m,l,g})` assembles the textbook inverted-pendulum
A/B/C/D from caller-supplied physics (the file owns only matrix algebra).
Generalizes the inline SDOF `G(jω)` that `StabilityLobeDiagram` computes for
chatter — that engine's transfer function is one special case of this primitive.

## FDM — FiniteDifferenceMethod (the PDE keystone)

1D uniform-grid spatial discretization: first derivative (fwd/bwd O(dx),
central O(dx²)), second derivative (`[1,−2,1]/dx²` Laplacian), Dirichlet/
Neumann/periodic BCs. `makeMethodOfLinesRHS({dx,D,v,bc})` returns a
`DerivativeFn` whose state vector IS the field samples → discretizes a PDE
into an ODE system that ODEIntegrator marches. The discrete diffusion and
advection operators are exactly the additively-decomposed A/B that
OperatorSplittingMethod splits. This is the keystone that makes the suite a
PDE solver. Verified: heat-equation Fourier mode `sin(x)` decays at
`exp(−D·k²·t)` through `makeMethodOfLinesRHS → ODEIntegrator/RK4`.

## The composition chain

```
FiniteDifferenceMethod.makeMethodOfLinesRHS({dx,D,v,bc})
        │  (∂u/∂t = D·u_xx − v·u_x  as a DerivativeFn)
        ▼
ODEIntegrator.calculate({method:"rk4"})  ◄─ also: LinearStateSpace.simulate
        ▲                                     builds f(t,x)=Ax+Bu, delegates here
        │  makeSubstepIntegrator(fAutonomous,"rk4")
        │
OperatorSplittingMethod.calculate({applyA, applyB})
```

A PDE is discretized (FDM), the resulting ODE system optionally
operator-split (OperatorSplitting), each operator integrated (ODEIntegrator),
and a full LTI system simulated/analyzed (LinearStateSpace) — all four nodes
interlock. Tests verify the composition with real values
(e.g. Strang split of `−y−0.5y` → `exp(−1.5)` to 5 digits through the
makeSubstepIntegrator adapter).

## Doctrine pins

- **No inline physics constants.** All three are numerical/algebraic
  primitives; physics (decay rates, M/m/l/g, cutting coefficients) is
  always caller-supplied. This is why P6's `transfer-functions` candidate
  landed as `algorithm`, NOT the physics-reviewer/`constants.ts` path —
  transfer-function algebra has no physical constants.
- **R12 fix-code-not-test.** Two bugs caught mid-build, both fixed at the
  source: (1) a convergence test whose "non-commuting" operators secretly
  commuted (component-wise decay = scaled identity, commutes with rotation)
  → masked all splitting error as roundoff; replaced with genuinely
  non-commuting `rotate∘decay-x-only`. (2) Faddeev–LeVerrier emitted
  negative-zero coefficients (`-trace/k` when trace==0); `Object.is(-0,0)`
  is false → breaks downstream equality/serialization; fixed with `+ 0`
  normalization at the coefficient source.
- **WIRE-EXEMPT, shared deferred dispatcher unit.** All three tagged
  `U-COURSE-FORGE-P1-DISPATCHER` (`prism_calc:{operator_split,ode_integrate,
  lti_analyze}`) — deferred to a less peer-saturated calcDispatcher window.
  Fully usable via direct import today.

## See also

- [[course-forge-stubs-emitter]] — the proposal layer that surfaced P1/P6/P7
- [[knowledge-conversion-ms0]] — parent milestone
- `state/shared/specs/COURSE-FORGE-PROPOSALS.md` — P1-P10 hand-curated source
- `mcp-server/src/algorithms/StabilityLobeDiagram.ts` — the SDOF special case P6 generalizes
- `mcp-server/src/algorithms/types.ts` — the Algorithm<I,O> contract all 3 implement
