# /loop bc83bbdb — Coursework→Nodes Session Summary (slot india, 2026-05-17)

**Chat:** `claude-41db1b82`
**Slot:** `india`
**Cron:** `*/20 * * * *` (session-only, recurring=true, ID `bc83bbdb`)
**Operator directive:** `/loop [20m] continue with college coursework extration and conversion to usable nodes`
**Status:** **8 primitives shipped + tooling + docs.** ~24 commits. Pipeline proven end-to-end and at depth.
**Advisory:** `advisoryOnly: true` — meta-record, not the deliverables themselves.

## What this loop did

Took KNOWLEDGE-CONVERSION-MS0's 69-item Lane-C FORGE-QUEUE (MIT-OCW courseware
routed but not yet built) and drove it end-to-end: built an operator-action
tooling layer, then converted seven MIT-OCW course candidates into real,
tested, mutually-composable PRISM algorithm nodes, then built the security-
reviewed keystone that unblocks their MCP dispatcher wiring.

## Deliverables

### Phase 1 — operator-action tooling (3 commits)

| Commit | Artifact |
|--------|----------|
| `dea7274d23` | `COURSE-FORGE-PROPOSALS.md` — hand-curated P1-P10 stubs (proposed_path, dispatcher_action, dedup_preflight, physics_gate, reject/consolidate guidance) |
| `5d5c363f0e` | `course-data-router.mjs --emit forge-stubs` bulk emitter + `COURSE-FORGE-STUBS.md` (62-stub bundle) |
| `6ae5399608` | `course-data-router.cli.test.mjs` — 13-case hermetic CLI test suite |

### Phase 2 — seven course→node conversions (7 build commits, 148 tests)

| Node | Source course | Commit | Composition role | Tests |
|------|---------------|--------|------------------|-------|
| `OperatorSplittingMethod` | MIT-OCW 10.34 | `1323fa4ee7` | Lie/Strang operator splitting | 28 |
| `ODEIntegrator` | MIT-OCW 2.003j | `b38a9f2285` | explicit Euler + classical RK4 | 28 |
| `LinearStateSpaceModel` | MIT-OCW 2.003 | `a547223bbf` | LTI analysis (TF, Bode, Kalman ranks) + simulate | 22 |
| `FiniteDifferenceMethod` | MIT-OCW 2.086 | `7cbbe511d7` | strong-form PDE discretization | 18 |
| `GradientDescent` | MIT-OCW 18.02 | `271351e7ec` | first-order optimizer (vanilla/momentum/Adam) | 17 |
| `FiniteElementMethod1D` | MIT-OCW 1.050/3.22/1.105 | `937bc66e76` | weak-form PDE discretization (Galerkin P1) | 17 |
| `LagrangianMechanics` | MIT-OCW 16.07/2.032 | `56243befc9` | numerical Euler-Lagrange EOM | 18 |

All `mcp-server/src/algorithms/*.ts`, each implementing the `Algorithm<I,O>`
interface. **No inline physics constants** — every one is a numerical/algebraic
primitive; masses, lengths, gravity, cutting coefficients are caller-supplied.

### Phase 3 — dispatcher-wiring keystone (1 spec + 1 build commit)

| Commit | Artifact |
|--------|----------|
| `e0fbe51..` → `47e93d03fa` chain | `U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.md` — the 3-option decision record |
| `47e93d03fa` | `SafeExpressionEvaluator.ts` — sandboxed `compileExpression` (tokenizer→recursive-descent→AST walk, NO eval/Function, P0-hardened), 60 tests |

### Doc-reflection (5 commits)

`592cc28260`, `0b237f435b`, `6aee8f6060`, `5033850759`, `17c36fae47`, plus the
expr-evaluator doc-reflection — CLAUDE.md §KNOWLEDGE-CONVERSION-MS0, the wiki
entry `course-forge-conversions.md`, and the Obsidian memory all kept in sync.

## The composition graph

The seven nodes are not isolated — they interlock:

```
LagrangianMechanics.makeEOMDerivative  ─┐
FiniteDifferenceMethod.makeMethodOfLinesRHS ─┤
LinearStateSpaceModel.simulate ─────────────┤→ ODEIntegrator (Euler/RK4)
                                             │      │
                                             │      └→ makeSubstepIntegrator
                                             │             │
                                             └─────────────┴→ OperatorSplittingMethod
```

- A mechanism's **Lagrangian** → EOM → integrate (verified: pendulum period ≈2π√(ℓ/g)).
- A **PDE** → discretize strong-form (FDM) **or** weak-form (FEM) → method-of-lines
  → integrate (verified: heat-equation Fourier decay vs analytic `exp(−D·k²·t)`).
- An **LTI system** → transfer function / Bode / Kalman ranks / time simulation.
- FDM ↔ FEM are the strong/weak discretization pair; GD complements the existing
  derivative-free `BayesianOptimizer`/`GeneticOptimizer`.

## Bugs caught + fixed mid-build (R12 — fix the wrong thing, never silence)

| # | Bug | Class | Fix |
|---|-----|-------|-----|
| 1 | Test fixture used OUTPUT decisions[] shape not INPUT candidateAssets[] | test | rewrote fixture (9/13→13/13) |
| 2 | Convergence-test operators secretly commuted (scaled-identity ⊥ rotation) | test | genuinely non-commuting rotate∘decay-x pair |
| 3 | Faddeev-LeVerrier emitted `-0` coefficients (breaks `Object.is`) | **code** | `+ 0` normalization at source |
| 4 | "defaults to rk4" asserted `exp(-1)` not the RK4 one-step value 0.375 | test | pinned to 0.375 (also proves rk4-not-euler) |
| 5 | Momentum-beats-vanilla premise wrong on isotropic bowl | test | ill-conditioned objective where momentum truly helps |
| 6 | Two safety-threshold expectations assumed too-low scores | test | corrected + added load-bearing flag assertions |

One code bug, five test-side. None silenced — every one diagnosed to root cause.

## Open follow-up (operator-gated, NOT autonomous /loop)

**`U-COURSE-FORGE-P1-DISPATCHER`** — wire the 7 nodes to the MCP surface.
Blocked by design: 5 of 7 take JS closures as primary input, which cannot
cross a JSON dispatcher boundary. The decision record
`U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.md` lays out 3 options; **Option A's
keystone (`SafeExpressionEvaluator`) is now built** — a future unit can wire
the closure-input nodes by passing expression strings. The wiring itself
touches the heavily-peer-claimed `algorithmDispatcher.ts` (or needs a new tool
surface), so it is a deliberate operator-reviewed step, not a /loop iteration.

## Lessons surfaced

| Class | Lesson |
|-------|--------|
| **Schema-read-first** | Test fixture bug #1 — assume nothing about a JSON shape; read the actual file. Same class as the 2026-05-16 META-tool bugs. |
| **R12 fix-the-wrong-thing** | 6 bugs, every one diagnosed to decide test-vs-code. The `-0` was the only real code bug; weakening the other 5 assertions would have hidden correct behavior. |
| **WIRE-EXEMPT is a real verdict** | Not every primitive is dispatcher-shaped. Closure-input numerical primitives are library-internal until an expression-bridge exists. The tag + a decision record is honest; a forced unsafe `eval` wire is not. |
| **Doctrine honesty under cron pressure** | The comprehensive-build hook pushes "wire everything"; the honest answer was to build the keystone and hand the wiring decision to the operator rather than force a collision-prone dispatcher edit. |

## Stop conditions

None reached — the cron continues every 20 min. Session-only storage: the job
dies on session exit. Operator stops it with `CronDelete bc83bbdb`.

## See also

- [[course-forge-conversions]] (wiki) — the 7 nodes + composition graph
- [[course-forge-stubs-emitter]] (wiki) — the operator-action tooling layer
- [[knowledge-conversion-ms0]] (wiki) — parent milestone
- `state/shared/specs/COURSE-FORGE-PROPOSALS.md` — P1-P10 hand-curated
- `state/shared/specs/COURSE-FORGE-STUBS.md` — 62-stub auto-bundle
- `state/shared/specs/U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.md` — wiring decision record
- `mcp-server/src/algorithms/{OperatorSplittingMethod,ODEIntegrator,LinearStateSpaceModel,FiniteDifferenceMethod,GradientDescent,FiniteElementMethod1D,LagrangianMechanics,SafeExpressionEvaluator}.ts`
