---
title: Discovery Coverage Tools — the standing "what is built-but-unwired" scanner family
tags: [discovery, coverage, audit, dispatcher, algorithm, engine, tango]
slot: tango
updated: 2026-06-16
---

# Discovery Coverage Tools

PRISM's standing scanners that answer **"what exists in code but isn't reachable?"** across three
independent layers. Built/curated by slot **tango** (discovery galaxy). Each is pure-node + tested;
run any directly (the prism MCP bridge is not required). **Pick the right layer before building a new
scanner** — these are deliberately distinct, and the soul refuses generating a new audit tool when an
existing one covers the case.

## The three coverage layers (distinct questions)

| Layer | Question | Tool | Live (2026-06-16) |
|-------|----------|------|-------------------|
| **Engine → consumer** | Is this engine wired to ANY dispatcher/route/registry/hook? | `scripts/audit-unwired-engines.mjs` | 21 unwired / 3802 (was a stale "674") |
| **Dispatcher → index.ts** | Is this `registerXDispatcher` actually CALLED in index.ts (tool exposed)? | `scripts/dispatcher-registration-coverage.mjs` (`ee2368d77b`) | 5 dormant / 106, all classified |
| **Algorithm → consumer** | Is this `src/algorithms/*` module imported anywhere? | `scripts/algorithm-dispatcher-coverage.mjs` (`2e86620392`) | 6 orphaned / 121 (7 wire-exempt) |
| **Import → export liveness** | Does each dispatcher's NAMED import actually resolve to a real EXPORT of its target? | `scripts/dispatcher-import-liveness.mjs` (`5eff3be3e4`) | 1 DEAD / 107 dispatchers (algorithmGatewayEngine) |

The 4th layer is the **finest** check and catches a class the others miss: a dispatcher whose target module EXISTS (so the engine-wiring + registration layers pass) and is even registered, but imports a symbol the module does **not export** → the binding is `undefined` and every action calling it throws at runtime. Complements (does NOT duplicate) the `.claude/hooks/dispatcher-import-validator.mjs` hook, which checks only FILE existence, not export-name liveness. False-positive-safe (LIVE/DEAD/INDETERMINATE; tracks `{imported, local}` so aliased imports of real exports classify LIVE).

Plus two related-but-different surfaces (do NOT confuse with the above):

- **`/dispatcher-coverage` skill** — engines-PER-dispatcher heatmap (pivots `ENGINE_WIRING_INDEX.json`).
  ASSUMES the dispatcher is registered; measures fan-out. It cannot see the index.ts registration gap
  that `dispatcher-registration-coverage.mjs` checks.
- **`scripts/hub-blast-radius-rank.mjs`** (`10e6adc27f`) — ranks code hubs by DOWNSTREAM blast radius
  (change-impact), the inverse of consumer fan-in. Importance ranking, not a coverage gap.

## Classification discipline (why a raw "dormant" count is a lie)

A dormant asset is NOT automatically a wiring candidate. Each tool classifies before reporting, because
the wiring owner must not chase phantom or dangerous work:

- **WIRE-EXEMPT** — carries a `// WIRE-EXEMPT` marker (e.g. course-forge algorithms whose primary input
  is a JS closure / expression string — they cannot cross a JSON dispatcher boundary). Intentional.
- **intentionally-skipped / superseded** — index.ts documents a deliberate skip, OR the tool name
  collides with an already-registered dispatcher. Registering it **crashes boot** (e.g. `registerAIDispatcher`
  — `prism_ai` is owned by `registerAIReasoningDispatcher`). Conservative bias: a false "skip" is safe,
  a false "candidate" is dangerous.
- **cross-lane** — domain-owned; surface to the owner (cad/cam → delta/kilo), don't register from tango.
- **safety-sensitive** — machine-control / security tools need operator intent before exposing.
- **candidate / orphaned** — the genuinely-actionable set (verify-on-disk, then wire). Often empty.

## Engineering notes (R12 lessons baked in)

- **Pure-node fs walk, never a shell grep** — a node-spawned grep fails silently on Windows (PATH) and
  returns a false "all dormant". Verify-on-disk in the integration tree (`H:/prism`), not the stale
  slot worktree.
- **Import-CONTEXT matching** — "referenced" means an actual `from/import "...X"`, not a bare comment
  mention. Match `.tool("prism_X"` on ANY receiver (`(server as any).tool(...)` is common).
- **Always classify, name what was dropped** — report `orphaned` separately from `wire-exempt`;
  a count without classification mis-routes the wiring owner.

## Worked example — the algorithmGatewayEngine P0 (what the 4th layer found, 2026-06-16)

`scripts/dispatcher-import-liveness.mjs` flagged exactly one DEAD import on first run:
`algorithmDispatcher.ts` lazy-imports `algorithmGatewayEngine` from `AlgorithmGatewayEngine.js`, but
that module exports the **function** `algorithmGateway` (+ standalone fns) — there is **no**
`algorithmGatewayEngine` object anywhere in the tree. ~40 `prism_algorithm` actions call
`algorithmGatewayEngine.<41 methods>` on an `undefined` binding → runtime throw. Proven by
`src/__tests__/algorithmDispatcher.test.ts` being **13/14 RED** (`TypeError ... reading 'executeFFT'`)
ever since the 2026-04-23 `U-EFF23` Box-restore — undetected ~2 months. **Owner = india / algorithm-dispatcher
(NOT tango/romeo lane).**

**Anti-duplication remediation map** (tango's value-add — do NOT reimplement what `src/algorithms/` already
has). At least 7 of the 41 dead methods map to a verified canonical `Algorithm<I,O>` class that can be wired
via the proven `control_fuzzy` lazy-import pattern (`72273d8f40`), NOT a gateway rebuild:

| Dead `algorithmGatewayEngine.X` | Canonical class (verified on-disk) |
|---|---|
| `executeFFT` / `spectralAnalysis` | `FFTAnalyzer` |
| `kalmanFilter` | `KalmanFilter` |
| `monteCarlo` | `MonteCarlo` |
| `cubicSpline` | `InterpolationEngine` |
| `pidControl` / `zieglerNicholsTune` | `PIDController` |
| `acoSequence` | `AntColonyTSP` |
| `predictChatter` | `STFTChatter` / `StabilityLobeDiagram` |
| `transferFunction` `odeSolve` `gradientDescent` | likely `LinearStateSpaceModel` / `ODEIntegrator` / `GradientDescent` — verify-before-wire |

The remaining ~24 (dijkstra, mst, aStarSearch, bfsDfs, idaStar, rbfs, kdTreeQuery, octreeQuery, eigenvalue,
linalgSolve, computeJacobian, conjugateGradient, bfgs[~`LBFGSBOptimizer`], lpSolve[~`ILPAssignment`],
localSearch, meshRefinement, surfaceCurvature, topologicalSort, evaluateBezier/NURBS, morphSpiral,
trochoidalPath, adaptiveClearing, restMachining, policyGradient, rlOptimize) have **no** drop-in canonical
class — they need new implementation OR live as graph/toolpath primitives elsewhere. `select` maps to the
gateway's own exported `algorithmSelect`. Full map: [[reference_tango_dispatcher_import_liveness_2026_06_16]].

Memories: [[reference_tango_algorithm_coverage_diff_2026_06_15]] · [[reference_tango_dispatcher_registration_coverage_2026_06_15]] · [[reference_tango_unwired_engine_audit_2026_06_16]] · [[reference_tango_hub_blast_radius_rank_2026_06_15]] · [[reference_tango_dispatcher_import_liveness_2026_06_16]].
