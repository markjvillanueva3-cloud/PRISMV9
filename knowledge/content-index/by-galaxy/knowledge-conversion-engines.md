---
name: knowledge-conversion-engines
description: Strategic engine digest for the knowledge-conversion galaxy -- MIT-OCW + monolith into PRISM via a 3-lane router (direct-wire / port-verify / forge-queue), the Knowledge Injection Pipeline (KIP), and 7 ported numerical algorithms + SafeExpressionEvaluator. Honest membership -- NOT the 126-keyword-match PATHS.md noise list.
type: reference
galaxy: knowledge-conversion
node_type: memory
---

# knowledge-conversion galaxy -- engine digest

## Overview

The knowledge-conversion galaxy converts external knowledge corpora -- MIT-OpenCourseWare courseware + the v8.89 monolith extraction (and future `/pdf-learn` / `/video-learn` / shop-floor sources) -- into PRISM-consumable nodes spanning six node-types: `knowledge`, `algorithm`, `formula`, `engine`, `skill`, `pipeline`. Shipped as KNOWLEDGE-CONVERSION-MS0 (2026-05-17, slot india). Doctrine ground: `mcp-server/src/engines/knowledge-conversion/{CLAUDE,MEMORY,PATHS}.md`; canonical wiki `knowledge/wiki/architecture/knowledge-conversion-ms0.md`.

A three-lane router matches autonomy posture to artifact safety:
- **Lane A -- direct-wire** (autonomous): 259 tribal tips flow course -> `TribalKnowledgeEngine` via `prism_knowledge:tribal_capture`.
- **Lane B -- port-verify** (semi-autonomous): formulas/algorithms require physics-reviewer sign-off before the algorithm DB. A formula without sign-off is a scrap-part risk (units mismatch, NaN acceleration).
- **Lane C -- forge-queue** (human-in-loop): the 6-node-type forge queue for new engines/skills/pipelines; the router emits an ADVISORY ledger only (`advisoryOnly:true` + `mustHumanVerify:true`), NEVER engine source.

Pipeline contract: SCAN -> CLASSIFY (Lane A/B/C) -> {TRIBAL-SHIP | PORT-VERIFY | FORGE-QUEUE} -> VALIDATE (roundtrip + real-data E2E) -> SERVE (`prism_knowledge` / `prism_dev`). Router ledger states: TRIBAL-SHIPPED / FORGE-QUEUE / DUPLICATE / DISCARD.

**7 ported numerical algorithms** (Lane-C forge output, all `mcp-server/src/algorithms/*.ts`, 148/148 tests, WIRE-EXEMPT numerical primitives -- caller owns physics, no inlined constants): OperatorSplittingMethod, ODEIntegrator, LinearStateSpaceModel, FiniteDifferenceMethod, FiniteElementMethod1D, GradientDescent, LagrangianMechanics. Plus the keystone **SafeExpressionEvaluator** (60 tests) -- the Lane-C expression sandbox.

### Honest membership note (R12)

This galaxy is deliberately code-thin: its `engines/knowledge-conversion/` dir holds ONLY doctrine sentinels (no local `.ts` engines). The shipped code lives across `scripts/`, `src/algorithms/`, and exactly ONE cross-cutting flat engine (KIP). The `PATHS.md` keyword-match list (126 "knowledge/conversion/router" hits) is explicitly flagged advisory noise by `CLAUDE.md` S6 -- it sweeps in CAD routers, SFC engines, per-domain KnowledgeGraph engines, Monolith* catalog manifests, Tribal* stores, and Report/Import/Export engines that are OWNED BY OTHER GALAXIES (cad / cam / lathe / post-processor / tribal-knowledge / business / mill / wedm). Those are NOT counted here. Verified galaxy-owned engine count: **1** (`KnowledgeInjectionPipelineEngine`). Verified galaxy-owned algorithm count: **8** (7 ported + SafeExpressionEvaluator). The operational lane routers are `.mjs` scripts, not `.ts` engines, and are listed as the pipeline substrate.

## Strategic categories

1. **Lane router (Lane-C core)** -- classifies extracted knowledge into 6 node-types across 3 lanes; pure-core `.mjs` script (`course-data-router-lib.mjs`), CamelCase-aware dedup, R12 fail-loud, advisory-only output.
2. **Node emitter / injection** -- the KIP flat engine routes each classified asset to its consuming surface, binds it to three systems (PRISM OS / Obsidian / PRISM AI), and closes the feedback loop (help-rate by lane).
3. **Tribal direct-wire (Lane A)** -- `.mjs` emitters turn course + monolith content into `KnowledgeTip[]` for `TribalKnowledgeEngine` (tribal storage itself lives in the tribal-knowledge galaxy).
4. **Algorithm ports (Lane-C numerical primitives)** -- 7 MIT-OCW-derived numerical algorithms (ODE / PDE / optimization / mechanics), each caller-owns-physics, no inlined constants.
5. **Safe-eval sandbox** -- SafeExpressionEvaluator: the ONLY safe expression path (no `eval` / no `Function`), the keystone that lets JSON dispatcher params drive the closure-input algorithms.
6. **Audit / ledger** -- monolith-port-state audit + the append-only injection + outcome ledgers backing the closed-loop metric.

## Key engines (detailed)

### KnowledgeInjectionPipelineEngine.ts
The single cross-cutting flat engine this galaxy owns (KNOWLEDGE-CONVERSION-MS0/U-KIP01, slot india). Closes the open loop that extraction+routing left: it INJECTS each classified asset to its consuming surface (append-only ledger), CONSUMER-BINDs the knowledge to three systems so a node can actually find and use it (PRISM OS wiki, Obsidian brain memory, an AI-discoverable registry read by `prismSelfAwarenessEngine.recommendAIFeatures`), and records a FEEDBACK outcome ledger whose `feedbackSummary()` join yields help-rate by lane. Explicitly NOT a duplicate of `CAMTribalKnowledgeInjectionEngine`; no physics constants (pure knowledge-flow orchestrator); `plan()` + join math are pure/hermetic while all IO takes an injectable `roots` object for the mandatory real-data E2E test.
Path: `mcp-server/src/engines/KnowledgeInjectionPipelineEngine.ts` (+ `.test.ts`; CLI `mcp-server/scripts/knowledge-injection-pipeline.ts`).
Notable exports: `RoutedAsset` interface; `plan()`, `executeInjection()`, `recordInjection()`, `recordOutcome()`, `feedbackSummary()`.

### SafeExpressionEvaluator.ts
The Lane-C keystone (KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-EXPR). Compiles an arithmetic expression STRING into a pure `(scope) => number` closure with NO `eval` / `Function` / `with` -- tokenizer -> recursive-descent parser -> hand-walked AST. Every identifier must resolve to an allowed variable / whitelisted constant / whitelisted math function or it throws at COMPILE time; reserved names (`constructor`, `__proto__`, `process`, `require`, `eval`, `Function`, `globalThis`, `import`) are hard-rejected even if listed as allowed; source-length + recursion-depth DoS caps; only numeric `[index]` member access exists in the grammar. It is the bridge (design Option A) that lets JSON dispatcher params drive the closure-input algorithms (GradientDescent objective, ODEIntegrator derivative, LagrangianMechanics Lagrangian).
Path: `mcp-server/src/algorithms/SafeExpressionEvaluator.ts` (60 tests).

### OperatorSplittingMethod.ts
Lie-Trotter (O(dt)) and Strang symmetric (O(dt^2)) splitting for additively-decomposed ODEs dy/dt = A(y) + B(y). The foundational scheme for multi-physics PRISM solvers (convection+diffusion thermal fields, spindle-dynamics+cutting-force chatter). Operator-agnostic: caller injects pure substep integrators `applyA` / `applyB`; no physics constants. Ported from MIT-OCW 10.34.
Path: `mcp-server/src/algorithms/OperatorSplittingMethod.ts`.

### ODEIntegrator.ts
Explicit Euler (global O(dt)) and classical RK4 (global O(dt^4)) fixed-step integration of dy/dt = f(t,y). Sibling primitive to OperatorSplittingMethod (an ODEIntegrator single-step closure is itself a valid substep integrator); caller supplies `f`, PRISM physics live in the caller's `f`. Ported from MIT-OCW 2.003.
Path: `mcp-server/src/algorithms/ODEIntegrator.ts`.

### FiniteDifferenceMethod.ts
1D spatial discretization + method-of-lines: builds forward/backward/central derivative stencils and the discrete Laplacian, assembling a semi-discrete RHS that plugs into ODEIntegrator (and produces the advection/diffusion operators OperatorSplittingMethod splits). The keystone that turns the numerical suite into a PDE solver. Dirichlet/Neumann/periodic BCs; diffusivity + advection velocity are caller-supplied.
Path: `mcp-server/src/algorithms/FiniteDifferenceMethod.ts`.

### FiniteElementMethod1D.ts
Galerkin weak-form BVP solver -(a*u')' + c*u = f(x) on a uniform mesh with continuous piecewise-linear P1 hat functions -- the weak-form counterpart to FiniteDifferenceMethod's strong form. Exact per-element stiffness/mass/load matrices assembled into a symmetric tridiagonal system, Dirichlet rows lifted, solved by the Thomas algorithm O(n). No physics constants.
Path: `mcp-server/src/algorithms/FiniteElementMethod1D.ts`.

### LinearStateSpaceModel.ts
LTI state-space (x' = A*x + B*u, y = C*x + D*u) analysis: time-response simulate (delegates to ODEIntegrator RK4), SISO transfer function via Faddeev-LeVerrier char-poly, frequency response (Bode |G(jw)| + phase), and Kalman controllability/observability rank tests. Generalizes the inline SDOF G(jw) that StabilityLobeDiagram computes for chatter.
Path: `mcp-server/src/algorithms/LinearStateSpaceModel.ts`.

### GradientDescent.ts
First-order LOCAL optimizer (vanilla / heavy-ball momentum / Adam) minimizing a smooth scalar objective -- complements PRISM's derivative-free global optimizers (Bayesian/Genetic) for least-squares calibration + speed/feed parameter fitting. Gradient caller-supplied or estimated by central finite differences. No physics constants.
Path: `mcp-server/src/algorithms/GradientDescent.ts`.

### LagrangianMechanics.ts
Numerical Euler-Lagrange EOM: given a caller-supplied Lagrangian L(q,q',t), derives generalized accelerations q'' by M*q'' = dL/dq + Q - (d2L/dq'dq)*q' - d2L/dq'dt (generalized mass matrix via central finite differences, solved by Gaussian elimination with partial pivoting). `makeEOMDerivative` yields a first-order DerivativeFn so ODEIntegrator can march a Lagrangian system directly. GOTCHA (CLAUDE.md S5): a singular Lagrangian -> NaN q'' -- requires valid multi-DOF input; flag DISCARD with audit rationale, never silent-drop.
Path: `mcp-server/src/algorithms/LagrangianMechanics.ts`.

## Full engine index

Membership is the honest doctrine-verified set (1 flat engine + 8 algorithms). The `.mjs` script substrate that operates the lanes is listed below the engine rows because it is the pipeline's real execution surface even though it is not a `.ts` engine.

| Engine | Category | One-line |
|--------|----------|----------|
| KnowledgeInjectionPipelineEngine.ts | node-emitter / injection | Route classified asset -> inject -> bind-3-systems -> feedback ledger; the only flat engine this galaxy owns (KIP). |
| SafeExpressionEvaluator.ts | safe-eval sandbox | Compile expression string -> pure closure, no eval/Function; the Lane-C keystone (60 tests). |
| OperatorSplittingMethod.ts | algorithm-port | Lie/Strang operator splitting for additively-decomposed multi-physics ODEs. |
| ODEIntegrator.ts | algorithm-port | Explicit Euler + classical RK4 fixed-step ODE integration. |
| FiniteDifferenceMethod.ts | algorithm-port | 1D FDM stencils + method-of-lines RHS (strong-form PDE discretization). |
| FiniteElementMethod1D.ts | algorithm-port | Galerkin weak-form 1D BVP solver, P1 hats, Thomas algorithm. |
| LinearStateSpaceModel.ts | algorithm-port | LTI state-space: simulate / transfer-function / Bode / Kalman rank tests. |
| GradientDescent.ts | algorithm-port | First-order local optimizer (vanilla / momentum / Adam). |
| LagrangianMechanics.ts | algorithm-port | Numerical Euler-Lagrange EOM -> ODEIntegrator-ready DerivativeFn. |

### Pipeline substrate (`.mjs` scripts + doctrine sentinels -- not `.ts` engines)

| Asset | Category | One-line |
|-------|----------|----------|
| scripts/lib/course-data-router-lib.mjs | lane-router | Pure-core Lane-C classifier (14 exports, 30 tests); CamelCase dedup; advisory-only ledger. |
| scripts/course-data-router.mjs | lane-router | CLI over the router lib; regenerates COURSE-DATA-ROUTING-LEDGER.json. |
| scripts/course-to-tribal-tips.mjs | tribal-direct-wire | Lane-A emitter: course -> KnowledgeTip[] for TribalKnowledgeEngine. |
| scripts/monolith-to-tribal-tips.mjs | tribal-direct-wire | Lane-A emitter: v8.89 monolith extraction -> KnowledgeTip[]. |
| scripts/audit-monolith-port-state.mjs | audit / ledger | Advisory monolith-port-state ledger audit. |
| mcp-server/src/__tests__/knowledge-conversion-roundtrip.test.ts | audit / ledger | Mandatory real-data E2E round-trip (guards against schema-seam bugs). |

## Dispatcher surface

- `prism_knowledge` (knowledgeDispatcher) -- Lane A round-trips through `tribal_capture` / `tribal_search` / `tribal_suggest` / `tribal_stats`.
- `prism_dev` -- MIT-OCW actions `mcfi_*` (curriculum index) + `mcdl_*` (course download/list). RULE: these live in prism_dev, NOT prism_ai.
- `prism_calc` -- downstream when Lane-C algorithms need physics validation (Lane B).
- Open wiring debt (CLAUDE.md S12): KIP is unregistered in the AI-dispatcher surface; algorithm dispatcher wiring (`prism_calc`) is deferred (U-COURSE-FORGE-P1-DISPATCHER); the 8 algorithm nodes are WIRE-EXEMPT.

## Uncertain / open (R12)

- **0 formula ports**: `U-KC-C1-FORMULA-PORT-VERIFICATION.md` lists 12 formulas, 0 ported (Lane-B active debt).
- **Router ledger** (per MEMORY.md): 65 candidates -> 126 routed = 31 TRIBAL-SHIPPED / 69 FORGE-QUEUE / 10 DUPLICATE / 16 DISCARD -- advisory, mustHumanVerify, never auto-emitted.
- Every "Knowledge/Router/Monolith/Ingest/Convert" flat engine in the PATHS.md keyword list was EXCLUDED as another galaxy's asset; if any is later re-attributed to this galaxy it must be added with a verified owner citation, not a name match.
