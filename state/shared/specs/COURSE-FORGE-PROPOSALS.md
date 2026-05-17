# COURSE-FORGE-PROPOSALS — operator-actionable /forge stubs for top FORGE-QUEUE candidates

**Generated:** 2026-05-17 by claude-41db1b82 (slot india, /loop bc83bbdb)
**Source:** `state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json` (69 FORGE-QUEUE items, 65 courses)
**Status:** advisory · mustHumanVerify · NOT auto-build
**Doctrine:** Lane C (per `COURSE-DATA-ROUTING-PIPELINE.md`) — every entry below requires operator review + duplicationGuardEngine check before /forge-triple invocation. Course-derived intent has no production-validated authority.

---

## How to read this file

Each proposal is a **stub** — the smallest actionable description an operator (or `/forge-triple` skill) needs to ship the asset:

| Field | Meaning |
|-------|---------|
| **proposed_path** | The PRISM file the asset would land at. Follows existing convention (`src/algorithms/<Name>.ts`, `src/engines/<Name>Engine.ts`). |
| **dispatcher_action** | `<dispatcher>:<action>` to add. Existing dispatchers preferred; new ones require their own audit. |
| **physics_gate** | `required` for formulas — physics-reviewer agent must verify equation + dimensional consistency before constants port to `src/physics/constants.ts`. |
| **dedup_preflight** | Notes from grep against `mcp-server/src/**`. **DUP-RISK** flags must be resolved by operator before forge. |
| **deliverables** | The artifact set the operator should expect when /forge-triple completes. |
| **mfg_relevance** | Score from router (0.0-1.0). Top tier ≥ 0.8 surfaced here. |

**Hard gates that DO NOT auto-clear:**
- `duplicationGuardEngine.mustCheckBeforeCreating()` THROWS on dup — every entry here MUST pass that check at /forge time.
- Formula entries: `physics-reviewer` agent verdict PASS required.
- Tier-1 CAM bridge engines (Mastercam, hyperMILL, etc.) NOT eligible — those are first-party and shipped; course-derived re-build would be regression.

---

## Top-12 candidates (mfg_relevance = 0.80, sorted by domain leverage)

### P1: algorithm:operator-splitting (10.34 / "Numerical Methods Applied to Chemical Engineering")
- **proposed_path:** `mcp-server/src/algorithms/OperatorSplittingMethod.ts`
- **dispatcher_action:** `prism_calc:operator_split`
- **dedup_preflight:** No hits for `OperatorSplitting`, `operator.splitting`, `operator_split` in `mcp-server/src`. **CLEAR**.
- **domains:** cam · thermal
- **deliverables:**
  - Engine class `OperatorSplittingMethod` with `step(state, dt, operators[])` API
  - 30+ vitest cases (real-value: heat-equation Strang split convergence test, multi-physics CFL stability)
  - Dispatcher wire in `calcDispatcher.ts` with z.enum action
  - Wiki entry `knowledge/wiki/algorithms/operator-splitting-method.md`
- **physics_gate:** not required (algorithm, not formula); but cite Strang 1968 splitting + reference convergence proof in JSDoc
- **rationale:** Strong fit for PRISM thermal solvers + CFD-adjacent CAM (coolant simulation, milling thermal field decomposition). Direct leverage for `ThermalDeflectionEngine` family.

### P2: algorithm:transition-equations-solver (2.854 / "Introduction to Manufacturing Systems")
- **proposed_path:** `mcp-server/src/algorithms/MfgTransitionEquationsSolver.ts`
- **dispatcher_action:** `prism_intelligence:transition_solve` OR new `prism_scheduling:transition_solve`
- **dedup_preflight:** Grep `TransitionEquations|transition.solver` → no engine-level hits; review `SchedulingEngine.ts` family before forge. **REVIEW**.
- **domains:** cad · cam · scheduling
- **deliverables:**
  - Engine `MfgTransitionEquationsSolver` modeling state transitions in manufacturing line balance
  - Tests covering: Markov-chain steady-state, Buzacott-Shanthikumar bottleneck verification
  - Wiki entry + cross-link to `LineBalancingEngine` if exists
- **physics_gate:** n/a
- **rationale:** Directly applies to JM Die shop-floor scheduling — multi-machine routing, WIP queue dynamics.

### P3: algorithm:bernoullis-equation-solver (1.060 / "Engineering Mechanics II") + formula:moody-diagram-analysis (same course)
- **proposed_path (algorithm):** `mcp-server/src/algorithms/BernoulliEquationSolver.ts`
- **proposed_path (formula constants):** ADD to `mcp-server/src/physics/constants.ts` (NEVER inline)
- **dispatcher_action:** `prism_calc:bernoulli_flow` + `prism_calc:moody_friction_factor`
- **dedup_preflight:** Bernoulli appears in `__tests__/dispatcher.orificeFlowMeter.test.ts` + `ChatterStabilityLobeEngine.ts` (mentioned in JSDoc, NOT implemented as standalone solver). **DUP-RISK low** but operator must verify `orificeFlowMeter` action isn't already the Bernoulli surface.
- **domains:** cam · metrology
- **deliverables:**
  - Bernoulli solver with `solve(p1, p2, ρ, v1, z1, z2)` signature
  - Moody-diagram formula in canonical-form (Colebrook-White equation; iterative friction-factor) with all constants in `physics/constants.ts`
  - **physics_gate required for Moody** — dimensional consistency: Re (dimensionless), ε/D (dimensionless), f (dimensionless)
  - Tests: laminar regime f=64/Re, fully-rough plateau, transition zone Colebrook iteration convergence
  - Wire to `prism_calc` + cross-ref from `OrificeFlowMeter` action
- **rationale:** Coolant flow modeling, swarf-flush pressure analysis, hydraulic-clamp force calculation. Multi-engine consumer surface.

### P4: engine:lean-manufacturing-engine (16.885j / "Aircraft Systems Engineering")
- **proposed_path:** `mcp-server/src/engines/LeanManufacturingEngine.ts`
- **dispatcher_action:** `prism_intelligence:lean_assess` (extend) OR `prism_orchestrate:lean_pipeline`
- **dedup_preflight:** No hits for `LeanManufacturing`, `LeanEnterprise`, `LESAT`. **CLEAR**.
- **domains:** cam · scheduling · thermal
- **deliverables:**
  - Engine implementing 7-waste classification, value-stream-map graph operations, takt-time computation
  - Integration tests against `JM-DIE/` shop archive (real-data E2E per RGS-TOOL-MS1 lesson — pure-core + injected reader)
  - LESAT (Lean Enterprise Self-Assessment Tool) scoring sub-API
- **physics_gate:** n/a
- **rationale:** Direct JM Die test-shop fit — operator's stated business goal includes operator-in-the-loop closed-loop learning from shop floor.

### P5: engine:lean-enterprise-engine + algorithm:lesat-algorithm (16.852j / "Integrating the Lean Enterprise")
- **CONSOLIDATION RECOMMENDATION:** P4 + P5 should be ONE engine with LESAT as an inner algorithm. Operator: do not /forge both separately — duplicationGuardEngine WILL throw.
- **proposed_path:** Same as P4 (`LeanManufacturingEngine`) with `algorithms/LESATScorer.ts` as composed sub-asset
- **rationale:** 16.852j and 16.885j are sibling courses; combining avoids parallel-implementation rot.

### P6: algorithm:pendulum-cart-modeling + formula:transfer-functions (2.003 / "Modeling Dynamics and Control I")
- **proposed_path (algorithm):** `mcp-server/src/algorithms/PendulumCartStateSpace.ts`
- **proposed_path (formula):** `mcp-server/src/algorithms/TransferFunctionBuilder.ts` (NOT a formula in the inline-constant sense; it's an algebraic algorithm)
- **dispatcher_action:** `prism_calc:state_space_model` + `prism_calc:transfer_function_build`
- **dedup_preflight:** `transfer.function` only appears in `TribalKnowledgeEngine.ts` as a string mention (knowledge tip, not implementation). Transfer-function algebra not implemented. **CLEAR**.
- **domains:** control · thermal · vibration
- **deliverables:**
  - State-space matrices (A, B, C, D) for inverted-pendulum-on-cart canonical example
  - Laplace-domain transfer-function builder (numerator/denominator polynomials from state-space)
  - Bode plot data emit (magnitude/phase vs ω)
  - Tests: known closed-form pendulum poles, controllability/observability matrix rank
  - **physics_gate not required** (algebraic, no physical constants); but cite Ogata "Modern Control Engineering" Ch.5 in JSDoc
- **rationale:** Spindle chatter prediction, servo-loop tuning, vibration-damping analysis. Direct consumer: `ChatterStabilityLobeEngine` upgrade path.

### P7: algorithm:euler-method (2.003j / "Dynamics and Control I")
- **proposed_path:** `mcp-server/src/algorithms/EulerIntegrator.ts`
- **dispatcher_action:** `prism_calc:ode_integrate` (variant flag: method=euler|rk4)
- **dedup_preflight:** No hits for `EulerMethod`, `euler_integrator`, `euler.ode`. **CLEAR**.
- **domains:** cad · cam · control
- **deliverables:**
  - Pure-function Euler step + composed `integrate(f, y0, [t0,tf], dt)` API
  - Sister RK4 implementation (same file or sibling — operator decides) for accuracy comparison
  - Tests: linear-decay exact-solution comparison, stiff-equation divergence detection
- **physics_gate:** n/a
- **rationale:** Foundation for any ODE-based PRISM solver (thermal transient, motion-profile, control simulation).

### P8: algorithm:cam-path-optimization (2.007 / "Design and Manufacturing I")
- **DUP-RISK HIGH:** CAM toolpath optimization is core PRISM territory. Existing engines: `PPGreedyToolpathOptimizerEngine`, `MachiningPlaybookEngine`, multiple CAM-vendor bridges.
- **action:** REJECT auto-forge. Operator: convert this to a /scrutinize task — does 2.007 OCW material provide ANY content not in PRISM's existing CAM family? If yes, port as algorithm-internal helper; if no, reclassify as TRIBAL-SHIPPED (knowledge tip only).
- **rationale:** Course-derived intent is generic; PRISM's CAM stack is already production-grade.

### P9: engine:solidworks (2.007 / "Design and Manufacturing I")
- **DUP-RISK HIGH:** SolidWorks is one of the 6 tier-1 CAM bridges per CLAUDE-BRIEF. Course-derived re-build = regression.
- **action:** REJECT. Reclassify as TRIBAL-SHIPPED.
- **rationale:** First-party bridge already exists.

### P10: algorithm:response-surface-modeling (2.830j / "Control of Manufacturing Processes")
- **proposed_path:** `mcp-server/src/algorithms/ResponseSurfaceMethodology.ts`
- **dispatcher_action:** `prism_intelligence:rsm_fit` OR extend `prism_calc:doe_analyze`
- **dedup_preflight:** `ResponseSurface` mentioned in `TurningCpkSurrogateEngine.ts` + `camDispatcher.ts` + `WireEDMResearchAIEngine.ts` — may be partially implemented as inline surrogate. **REVIEW REQUIRED**.
- **domains:** cam · metrology
- **deliverables:**
  - RSM polynomial-fit (1st + 2nd order) with optimization (steepest ascent, gradient projection)
  - Central composite design (CCD) + Box-Behnken design (BBD) sample generators
  - Tests: known quadratic surface recovery, design-orthogonality check
- **physics_gate:** n/a
- **rationale:** Direct fit for speed/feed optimization (PRISM saleable product SFC).

---

## Lower-tier (mfg_relevance 0.6-0.79, not auto-surfaced)

The remaining ~57 FORGE-QUEUE items in `COURSE-DATA-ROUTING-LEDGER.json` have lower confidence and should be operator-reviewed in bulk via:

```
node H:/prism/scripts/course-data-router.mjs --filter mfg_relevance>=0.6 --emit forge-stubs
```

(That flag is NOT yet implemented — adding it is the next /forge unit if the operator wants bulk-stub emission for the long tail.)

---

## Recommended operator workflow

1. **Review P1-P10 above.** Reject DUP-RISK entries (P8, P9). Approve or modify P1-P7, P10.
2. **For each approved entry:**
   - `node H:/prism/.claude/helpers/duplication-guard-precheck.mjs --kind <algorithm|engine|formula> --name <name>` — surfaces conflicts the router missed.
   - For formulas (P3 Moody, anything in physics_gate=required): spawn `physics-reviewer` agent first, await PASS, then proceed.
   - `/forge-triple <kind>:<name>` — produces engine + skill + hook in one shot. Per-file scrutiny gate fires after each generated file.
3. **Consolidate P4+P5** (Lean) into a single engine before /forge.
4. **Decline P8 + P9** — already covered by first-party CAM stack.
5. **After /forge completes for any entry**, /close-out-audit + envelope update + chat-bus post.

---

## Anti-patterns (do NOT do these)

- ❌ Auto-/forge any entry above without operator review.
- ❌ Inline Moody-diagram constants or any physics-gate=required formula constant into engine source. Constants go to `src/physics/constants.ts`.
- ❌ Create `LeanEnterpriseEngine` AND `LeanManufacturingEngine` as separate assets — duplicationGuardEngine WILL throw, and rightfully so.
- ❌ Treat course-derived intent as production-validated. The course is the IDEA source; PRISM convention + JM Die test-data is the VALIDATION source.

---

## Related

- `state/shared/specs/COURSE-DATA-ROUTING-LEDGER.{json,md}` — full 69-item FORGE-QUEUE inventory
- `state/shared/specs/COURSE-DATA-ROUTING-PIPELINE.md` — 3-lane policy doctrine
- `scripts/course-data-router.mjs` + `scripts/lib/course-data-router-lib.mjs` — the routing engine itself
- `mcp-server/src/engines/DuplicationGuardEngine.ts` — pre-create gate (THROWS on dup)
- `.claude/commands/forge-triple.md` — the operator-facing forge skill
- [[knowledge-conversion-ms0]] (wiki, milestone parent for course→node work)
- `mcp-server/src/physics/constants.ts` — canonical constants surface for any formula
