---
name: reference_goal_formalizer_ms0_2026_05_29
description: "GOAL-FORMALIZER v1 — prism_ai:formalize_goal turns a manufacturing-physics ask into a dimensionally-checked optimization problem + advisory solver plan (slot india, 2026-05-29)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.131Z
aliases: reference_goal_formalizer_ms0_2026_05_29
---


**GOAL-FORMALIZER (v1)** — shipped 2026-05-29, slot india (claude-05ceb444 → 0f3a0c22), branch `slot/india`. Commits `cd4195d40a` (spec) + U1–U4c (`5b2cfd423a`, `bd4657e873`, `42b514ba9d`, `fdca6a8b7a`, `5139a95ffb`, +U4c).

**What it is:** a manufacturing-physics ASK ("maximize MRR", "minimize cost/part", "allocate tolerance stack", "max feed for Ra target") → a FORMAL optimization problem (decision vars / objective / constraints / units, dimensionally checked) + an advisory **SolverPlan** naming the EXISTING PRISM solver engine. **Advisory only** — formalizes + routes, does NOT execute a solver, and NEVER invents an objective for an off-domain ask (Goodhart guard → honest `NotFormalizable`).

**Why this design (not a universal symbolic solver):** operator asked to "use math for all problem solving / auto-devise a formula for any goal". Free-text→objective optimizes a fabricated metric. The safe answer is **template-catalog formalizer + dimensional acceptance gate + router over the bench PRISM already has** (InteriorPoint, GradientOptimization, BayesianOptimization, GeneticAlgorithm, ParticleSwarm, FormulaRegistry). AskUserQuestion locked: scope=manufacturing-physics, mode=advisory, entry=dispatcher-action+skill, approach=template-catalog (A) + dimensional-verifier gate (C).

**4 units (pure/deterministic, hermetic tests):**
- `DimensionalVerifier.ts` — D={L,M,T}; `parseUnit` + `exprDimension` recursive-descent; `verifyExpr`/`verifyComparison` gate. rev/rad/deg dimensionless. 23 tests.
- `ProblemTemplateCatalog.ts` — 4 vetted templates (speeds-feeds-max-mrr/nonlinear, turning-cost-economics/closed_form, tolerance-stack-allocation/convex_lp, surface-finish-feed/closed_form). Constants via `constantRef` strings, never inlined. `empirical:true` → gate SKIPS (Taylor `vc·Tⁿ=C`, `$/part`). 14 tests.
- `GoalFormalizerEngine.ts` — `formalize() → FormalProblem | NotFormalizable`; `needParams[]` = inputs to SOLVE not formalize. 8 tests.
- `SolverRouter.ts` + `prism_ai:formalize_goal` + `/formalize` skill — `SolverClass → existing engine` table; `routeHint` = PREFERRED domain solver. 4 + 7 (dispatcher round-trip) tests.

**Entry:** `prism_ai action="formalize_goal" params={task, params?}` → `{success, data:{formalization, solverPlan}}`. `NotFormalizable` is `success:true` (honest refusal = valid advisory answer). Schema is structurally mandatory (`ACTION_AI_REASONING_SCHEMAS` is `Record<AIReasoningAction>` — exhaustive), so the integration test's "rejects missing/empty task" is a real wiring proof.

**3-of-3 PASS** (session claude-0f3a0c22, arms A/B/C). Caught + fixed 3 P2s in U4c: SolverRouter named non-existent `GeneticOptimizer` + 5 wrong solver method names (arm A said GeneticOptimizer exists, arm B said no — **B was right**, verified vs tree per AI-T8); `DimensionalVerifier.power()` let `1e400` overflow to a non-finite Dimension (added `isFinite` guard). Lesson: solver-name/method advisory strings must be AI-T8-verified against the tree, not trusted from one reviewer. See [[feedback_verify_actual_contract_not_proxy]].

Wiki: `knowledge/wiki/architecture/goal-formalizer-ms0.md`. Spec: `docs/superpowers/specs/2026-05-29-goal-formalizer-solver-router-design.md`. Galaxy brain: ai-training (india). NOT yet reflected into shared `H:/prism/CLAUDE.md` §AI (slot-worktree pre-merge — golf/merge follow-up). Related: [[reference_juliett_12chat_allocation_2026_05_17]] (india=ai-training soul).
