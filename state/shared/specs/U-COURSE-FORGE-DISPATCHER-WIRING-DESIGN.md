# U-COURSE-FORGE-P1-DISPATCHER — wiring design decision

**Generated:** 2026-05-17 by claude-41db1b82 (slot india, /loop bc83bbdb)
**Status:** advisory · mustHumanVerify · operator decision required
**Subject:** how (and whether) to wire the 7 course-forge algorithm nodes to an MCP dispatcher

## The 7 nodes (all currently WIRE-EXEMPT)

| Node | File | Primary inputs |
|------|------|----------------|
| OperatorSplittingMethod | `algorithms/OperatorSplittingMethod.ts` | **2 closures** (`applyA`, `applyB` SubstepIntegrator) |
| ODEIntegrator | `algorithms/ODEIntegrator.ts` | **1 closure** (`f` DerivativeFn) |
| LinearStateSpaceModel | `algorithms/LinearStateSpaceModel.ts` | matrices A/B/C/D (JSON) — except `simulate` op needs a `u(t)` closure |
| FiniteDifferenceMethod | `algorithms/FiniteDifferenceMethod.ts` | field array + dx (JSON) — except `method_of_lines_rhs` is consumed as a closure factory |
| GradientDescent | `algorithms/GradientDescent.ts` | **1-2 closures** (`f` objective, optional `gradF`) |
| FiniteElementMethod1D | `algorithms/FiniteElementMethod1D.ts` | **1 closure** (`source: (x)=>number`) |
| LagrangianMechanics | `algorithms/LagrangianMechanics.ts` | **1-2 closures** (`lagrangian`, optional `generalizedForce`) |

## The blocker

MCP dispatcher actions receive **JSON params only**. Five of the seven nodes take
JavaScript **closures** as their primary, load-bearing input (the objective
function, the derivative, the Lagrangian, the substep integrators). A closure
cannot cross a JSON boundary. Therefore a naive `prism_algorithm`-style
`{action, params}` wiring is **structurally impossible** for those five without
an intermediate layer.

This is why the 7 commits (`1323fa4ee7`, `b38a9f2285`, `a547223bbf`,
`7cbbe511d7`, `271351e7ec`, `937bc66e76`, `56243befc9`) all carry a
`// WIRE-EXEMPT:` tag — the deferral is a genuine engineering constraint,
not skipped work.

### Precedent in the existing dispatcher

`algorithmDispatcher.ts` already faces this: `opt_gradient_descent` takes
`objective: string` and `num_ode_solve` takes `ode: string`. The
`algorithmGatewayEngine` evidently **parses/evaluates an expression string**
into a function internally. So PRISM has *already chosen* the expression-string
model for closure-input algorithms — but that evaluator is inside the gateway
engine, not reusable by my 7 nodes as-is.

## Three options for the operator

### Option A — Expression-bridge unit (recommended for full wiring)

Build `scripts/lib/expression-evaluator.ts` (or reuse the gateway engine's
internal one if it can be extracted): a **safe, sandboxed** arithmetic
expression parser that compiles a string like `"-1.0*y[0] - 0.5*y[1]"` into a
`(vars) => number` closure. Then each of the 7 nodes gets a dispatcher action
whose params carry expression strings instead of closures.

- **Pro:** full wiring; all 7 nodes invokable via MCP; consistent with the
  existing `opt_gradient_descent` / `num_ode_solve` precedent.
- **Con:** an expression evaluator is **security-sensitive** — must NOT use
  `eval`/`Function`; needs a real tokenizer + AST + a whitelisted op set
  (no property access, no globals). This is a unit in its own right (~300 LOC
  + heavy adversarial tests). Estimated: 1 focused session.
- **Safety gate:** the evaluator is a P0 security surface — it must reject
  `constructor`, `__proto__`, `process`, `require`, function calls outside a
  math whitelist, and unbounded-length input. 3-of-3 scrutiny mandatory.

### Option B — JSON-native partial wiring (safe, smaller, ships now)

Wire **only** the operations whose inputs are already JSON-native — no closures,
no evaluator:

- `LinearStateSpaceModel`: `transfer_function`, `frequency_response`, `ranks`
  (all take matrices A/B/C/D — pure JSON). `simulate` stays exempt.
- `FiniteDifferenceMethod`: `first_derivative`, `second_derivative` (take a
  numeric field array — pure JSON). `method_of_lines_rhs` stays exempt.

Two new `prism_algorithm` actions (`num_lti_analyze`, `num_fdm_derivative`)
direct-import the two singletons. ~80 LOC + tests through the dispatcher.

- **Pro:** safe, no evaluator, ships in one commit; covers the genuinely
  JSON-shaped capability.
- **Con:** partial — 5 nodes + 2 operations remain import-only. The
  composition adapters (`makeSubstepIntegrator`, `makeMethodOfLinesRHS`,
  `makeEOMDerivative`) are inherently code-level and never dispatcher-facing.

### Option C — Leave WIRE-EXEMPT permanently (status quo)

Accept that these are **code-level numerical primitives** — like a math library.
They are consumed by *other engines* via direct import, and those consuming
engines are what gets dispatcher-wired. A library `sin()` isn't an MCP action;
arguably neither is `OperatorSplittingMethod`.

- **Pro:** zero risk; honest about what these assets are (composable building
  blocks, not end-user actions).
- **Con:** the `comprehensive-build-enforce` doctrine prefers explicit wiring;
  leaving 7 nodes exempt should be a deliberate, recorded operator decision.

## Recommendation

**Option B now + Option A as a follow-up unit.** Option B captures the real
JSON-shaped value safely and immediately. Option A is the complete answer but
gates on a security-reviewed expression evaluator that deserves its own unit
and 3-of-3 scrutiny — it should not be rushed inside a /loop iteration.

Option C is the honest fallback if the operator decides these primitives are
library-internal: in that case, convert the `// WIRE-EXEMPT:` tags' reason
text to cite this doc as the recorded decision.

## Why this is not shipped as code in this iteration

Per CLAUDE.md R12 (fail loud) and the per-file scrutiny doctrine: wiring a
dispatcher action is a contract change on a heavily peer-claimed file
(`algorithmDispatcher.ts` / `calcDispatcher.ts`) and — for the closure-input
nodes — needs the security-sensitive evaluator first. Forcing a wire now would
either ship an unsafe `eval` or a half-working dispatcher. The honest
deliverable is this decision record; the operator picks A / B / C.

## See also

- `state/shared/specs/COURSE-FORGE-PROPOSALS.md` — the proposal layer
- `knowledge/wiki/architecture/course-forge-conversions.md` — the 7 nodes
- `mcp-server/src/tools/dispatchers/algorithmDispatcher.ts` — wiring target (35 actions, gateway-routed)
- `mcp-server/src/engines/AlgorithmGatewayEngine.ts` — holds the existing expression model
