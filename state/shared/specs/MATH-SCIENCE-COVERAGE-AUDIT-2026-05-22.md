# Math & Science Coverage Audit — PRISM

> **`/forge-audit-v2`** · slot `november` · 2026-05-22 · session `b4c5e890` / stable `claude-74df9529`.
> **Scope brief:** *"check all mathematical and scientific concepts we currently have, then deep-
> research other advanced math/science we can apply to PRISM engines."*
> **Capstone** of this session's math-research arc — consolidates
> `CALRESCO-COMPLEXITY-APPLICABILITY`, `TOPOLOGY-MATH-CAD-CAM-APPLICABILITY`, and
> `CALRESCO-MATH-CONCEPTS-CATALOGUE` (all 2026-05-22). Advisory — nothing injected into
> `atomic-roadmap.json`.

---

## Phase 1 — Scope statement

I am auditing **PRISM's mathematical & scientific coverage** — looking for (a) what is already
present, by domain, and (b) genuinely-absent or thin advanced math/science with real
engine-improvement leverage. The **verification channel** is the re-runnable META artifact
`scripts/math-science-coverage-map.mjs` (§Phase 6) plus per-finding `grep` baselines — every gap
claim below is a measured hit-count, not an opinion.

## Phase 0 — Preflight (counts live, 2026-05-22T19:24 inventory scan)

3332 engines · 97 dispatchers · **8542 actions** · **61 algorithms** · **499 formulas** · 4031
tests. Inventory fresh (<1 h) — Phase-0 staleness gate PASS.

## Phase 2 — What PRISM already has (exhaustive, by domain)

PRISM's mathematical surface is **very large**. Sixteen domains, with representative coverage and a
rating (✅ covered · ◑ primitives-only/thin · ❌ absent):

| # | Domain | Representative PRISM coverage | Rating |
|---|--------|------------------------------|--------|
| 1 | Numerical methods (ODE/PDE/FEM) | `ode_rk45_solve`, `ode_second_order`, `FiniteDifferenceMethod`, `FiniteElementMethod1D`, `fem_thermal_solve`, `OperatorSplittingMethod`, `heat_conduction_1d` | ✅ |
| 2 | Linear algebra | `svd_decompose`, `qr_factorize`, `cholesky_factor`, `eigen_solve`, `sparse_solve`, `iterative_solve`, `LinearStateSpaceModel` | ✅ |
| 3 | Continuous optimization | `lp_solve`, `interior_point_qp`, `convex_qp_solve`, `sqp_minimize`, `trust_region_minimize`, `bfgs_optimize`, `GradientDescent`, `DPMultiPass`, `dp_knapsack` | ✅ |
| 4 | Evolutionary / metaheuristic | `GeneticOptimizer`, `de_optimize`, `ParticleSwarm`, `SimulatedAnnealing`, `AntColonyTSP`, `cmaes_optimize` | ✅ |
| 5 | Multiobjective | `moo_nsga2`, `pareto_optimize`, `moo_non_dominated_sort` | ✅ |
| 6 | Probability / statistics / stochastic | `MonteCarlo`, `mcmc_sample`, `bayesian_inference_calc`, `markov_*`, `weibull_fit`, `survival_kaplan_meier`, `spc_*`, `nelson_spc_*`, `TimeSeriesPredictor`, `garch_fit` | ✅ |
| 7 | Uncertainty quantification | `pce_compute` (polynomial chaos), `lhs_sample`, `sobol_sequence`, `morris_screening`, variance-reduction | ✅ |
| 8 | Signal processing | `FFTAnalyzer`, `wavelet_dwt`, `STFTChatter`, `KalmanFilter`, `design_fir_filter`, `spectrogram`, `emd_decompose` | ✅ |
| 9 | Control theory | `PIDController`, `LinearStateSpaceModel`, `discretize_tf`, `ziegler_nichols`, `optimal_control` (Pontryagin/LQR/HJB), `AdaptiveControllerModel` | ✅ |
| 10 | Computational geometry | `voronoi_*`, `delaunay`, `convex_hull`, `nurbs_*`, `bspline_*`, `bvh_*`, `kdtree_*`, `MinkowskiSum`, `geodesic_*`, `parametric_surface_*` | ✅ |
| 11 | **Topology** | `topology_homology`, `topology_persistence`, `topology_validate_features` | ◑ **primitives only** |
| 12 | Graph theory | `graph_mst_kruskal`, `graph_bellman_ford`, `graph_scc`, `graph_cpm`, `network_flow_calc`, `spectral_partition`, PageRank (`pr_*`) | ✅ |
| 13 | Machine learning / AI math | `NeuralInference`, GraphSAGE GNN, clustering, `xproc_conformal_*` (APS/RAPS/Mondrian), `xproc_qlearn/bandit/policy`, `xproc_maml/proto`, `xproc_fed_*`, `xproc_ewc_*`, `xproc_causal_*`, `xai_shap/lime` | ✅ (very deep) |
| 14 | Manufacturing physics | `KienzleForceModel`, Merchant, Oxley, `ExtendedTaylorModel`, `JohnsonCookModel`, `UsuiWearModel`, `JaegerTempField`, `StabilityLobeDiagram`, `RCSA`, Miner/Paris/Coffin-Manson, Norton/Larson-Miller | ✅ (very deep) |
| 15 | Information theory | `information_entropy` (Shannon, mutual info, KL, transfer entropy) | ✅ |
| 16 | Fuzzy logic | `fuzzy_neural` (ANFIS, fuzzy Taguchi, fuzzy AHP), `FuzzyController` | ✅ |

**Phase-2 conclusion:** 15 of 16 core mathematical domains are genuinely covered; only **topology**
is primitives-only. PRISM is one of the most mathematically complete manufacturing systems
conceivable. *This reframes the user's question* — see Finding 1.

> **Measurement note.** The META tool `math-science-coverage-map.mjs` registers raw keyword density
> and rates all 16 domains "covered" by file count — topology included (179 files), because the
> `topology_homology` / `topology_persistence` primitives are widely *referenced*. The ◑ rating
> above is the **functional** judgment: those primitives are not *assembled* into methods
> (Finding 5). Raw density ≠ assembled capability — the two measurements answer different
> questions, and the audit reports both deliberately.

## Phase 3 — Findings (ranked by leverage; each with a verification channel)

### Finding 1 — PRISM is math-rich; the dominant gap is ASSEMBLY, not absence · META
PRISM has 61 algorithms + 8542 actions spanning 15 of 16 mathematical domains. The recurring gap —
seen across this session's three prior specs (topology T-series; CALResCo F1) — is **low-level
primitives present, high-level methods not assembled**. "What other math can we apply" is therefore
mostly answered by "assemble what we already own." The genuine *new-math* gaps are Findings 2–6.
```yaml
verifies_via:
  tool: "node scripts/math-science-coverage-map.mjs --json"
  expected_signal: "covered-domain count"
  baseline: "15 of 16 domains covered; topology = primitives-only"
  re_run_cost: "~3 s"
```

### Finding 2 — Optimal Transport: genuinely absent · HIGH
`grep -ri "wasserstein|sinkhorn|optimal.transport|monge"` over `mcp-server/src` → **0 hits.**
Optimal Transport (Wasserstein distance, Sinkhorn algorithm) is missing entirely. Applications:
(a) **toolpath/program morphing** between part-family members — reuse a proven program by
transporting it to a similar part; (b) the **rigorous distribution-drift metric** — `xproc_drift_*`
currently uses simpler statistics; Wasserstein is the correct drift distance; (c) **point-cloud
registration** for CMM-scan ↔ CAD alignment; (d) microstructure-distribution comparison. Sinkhorn
is fast, differentiable, ~150 LOC.
```yaml
verifies_via:
  tool: "grep -ri 'wasserstein|sinkhorn|optimal.transport' mcp-server/src"
  expected_signal: "occurrence count"
  baseline: "0 — absent"
  re_run_cost: "~2 s"
```

### Finding 3 — Interval / certified arithmetic not wired to safety-critical paths · HIGH (safety)
META `interval_arithmetic` probe → **20 occurrences across 5 files** — the interval-arithmetic
*logic* lives in `ReliabilityOptimizationEngine` (6 occ); the rest is that engine's dispatcher
wiring (`index.ts`, `calcDispatcher`, `EventBus`) + tests. PRISM's shop-floor safety tier demands S(x) ≥ 0.98,
yet its uncertainty is **Monte-Carlo (sampling)** — which *estimates*, never *proves*, a bound.
**Interval arithmetic gives guaranteed enclosures**: a collision check or a cutting-force/spindle-
torque calc done in interval arithmetic *proves* "no collision" / "force within limit" rather than
sampling it. For a safety-critical system this is the highest-value certified-computation gap. The
math already exists in `ReliabilityOptimizationEngine` — the gap is **wiring it to
`collision_check_full`, `check_spindle_torque`, `predict_tool_breakage`**.
```yaml
verifies_via:
  tool: "grep -rl 'interval.arithmetic' mcp-server/src/engines | grep -iE 'collision|safety|force'"
  expected_signal: "files coupling interval arithmetic to safety engines"
  baseline: "0 — interval arithmetic isolated in ReliabilityOptimizationEngine"
  re_run_cost: "~2 s"
```

### Finding 4 — Spectral geometry (Laplace–Beltrami) is thin · MEDIUM
`grep -ri "laplace.beltrami|cotangent.laplacian|heat.kernel|spectral.geometr"` → **2 hits, both in
`CurvatureAnalysisEngine`.** PRISM has `eigen_solve` (linear algebra) but no **mesh-Laplacian
operator**. Applications: **intrinsic mesh segmentation** — decompose a part into machinable
regions by spectral clustering of the cotangent-Laplacian (more robust than the geometric
heuristics behind `feature_recognize`); **heat-kernel signatures** for feature/part matching;
**intrinsic symmetry detection** for fixturing & setup planning.
```yaml
verifies_via:
  tool: "grep -ri 'laplace.beltrami|cotangent.laplacian' mcp-server/src"
  expected_signal: "occurrence count"
  baseline: "2 — thin, CurvatureAnalysisEngine only"
  re_run_cost: "~2 s"
```

### Finding 5 — Topological method assembly absent (Morse–Reeb / homotopy / C-space) · HIGH
META `topology_methods` probe → **incidental only: 2 occurrences in 2 files** — bare mentions, no
implementation. PRISM has the `topology_homology` / `topology_persistence` primitives but **no
assembled topological methods**. Fully specified in `TOPOLOGY-MATH-CAD-CAM-APPLICABILITY-2026-05-22.md` (T2 Morse–Reeb
toolpath decomposition, T4/T5 C-space homotopy path planning, T6 persistent-homology chatter
bridge). This audit confirms the gap quantitatively and cross-references that spec for the build.
```yaml
verifies_via:
  tool: "node scripts/math-science-coverage-map.mjs --json (gap: topology_methods)"
  expected_signal: "occurrence count for reeb/morse/homotopy/C-space"
  baseline: "2 occ — incidental, no assembled methods"
  re_run_cost: "~3 s"
```

### Finding 6 — Differentiable physics simulation absent (autodiff is ML-only) · MEDIUM
META `differentiable_physics` probe → **incidental: 4 occurrences, all ML/LoRA context**
(`GradientDescent`, `WEDMLoRAAdapterEngine`, `WEDMRLControllerEngine`); a broader `differentiable`
grep adds more, also all ML. **No physics simulator is differentiable.** PRISM's *physics*
simulators (thermal FEA, chatter/`StabilityLobeDiagram`, material-removal voxel sim) are
**forward-only**. A **differentiable-simulation** layer — autodiff (or the adjoint method) through
the physics — enables **gradient-based process optimization**: optimize cutting parameters by
back-propagating through the physics model instead of black-box evolutionary search. Faster, exact
sensitivities, and it composes with PRISM's existing `GradientDescent`.
```yaml
verifies_via:
  tool: "grep -rl 'autodiff|differentiable' mcp-server/src/engines | grep -iE 'thermal|chatter|fea|simul'"
  expected_signal: "physics simulators with autodiff"
  baseline: "0 — autodiff exists only in ML/LoRA engines"
  re_run_cost: "~2 s"
```

### Verification-gate note (Hard Rule #1 working as designed)
A seventh candidate finding — *"quaternion / Lie-group kinematics missing for 5-axis"* — was
**dropped**: `grep -ri "quaternion|slerp|lie.group"` returned **66 hits across `CollisionEngine`
(26), `CADKernelEngine` (13), `FiveAxisToolpathIntegrationEngine` (7)**. PRISM already uses
quaternion math heavily. The verification gate caught a false finding before it shipped — exactly
its purpose.

## Phase 5 — Karpathy anti-drift checkpoint (after 6 findings)
On brief? Yes — every finding answers "what math do we have / what can we add." Actionable? Yes —
each maps to one engine build with a measured baseline. Assumed unverified synergy edges? No — all
six gap claims are `grep`-measured, and one candidate was dropped on failing verification.

## Recommended roadmap units (advisory — new units only; prior-spec units not repeated)

| Pri | Unit | Finding | Effort | Why |
|-----|------|---------|--------|-----|
| P1 | `U-INTERVAL-SAFETY-BOUNDS` — wire interval/affine arithmetic into `collision_check_full`, `check_spindle_torque`, `predict_tool_breakage` for *certified* safety bounds | F3 | M | Highest leverage — turns sampled safety into proved safety at the S(x)≥0.98 tier |
| P1 | `U-OPTIMAL-TRANSPORT-CORE` — Sinkhorn/Wasserstein engine; wire to `xproc_drift_*` (rigorous drift) + part-family program morphing | F2 | M | Genuinely-absent capability, four distinct applications |
| P2 | `U-SPECTRAL-MESH-LAPLACIAN` — cotangent-Laplacian operator + spectral mesh segmentation + heat-kernel signatures | F4 | M | Intrinsic region decomposition beats geometric heuristics |
| P2 | `U-DIFFERENTIABLE-PHYSICS` — autodiff/adjoint layer through the thermal/chatter/material-removal simulators → gradient-based process optimization | F6 | M–L | Exact sensitivities; composes with existing GradientDescent |
| — | Topology assembly (Morse–Reeb, C-space homotopy) — see `TOPOLOGY-MATH-CAD-CAM-APPLICABILITY-2026-05-22.md` units `U-MORSE-REEB-DECOMP`, `U-TOPO-RAPID-LINK` | F5 | — | Already specified — do not double-track |

## Phase 4B — Peer review outcome

An independent `reviewer` subagent (isolation: worktree) re-ran the META tool, **independently
reproduced all six baselines** (OT=0, interval=20/5, spectral=2/1, topology_methods=2/2,
diff-physics=4/3), and returned **SHIP — all six findings PASS**. Minor notes (none blocking):
F3's "S(x)≥0.98 demands certified bounds" is partly editorial — the sampling-vs-proving math is
sound; F4 says "thin" where the META gap-classifier says "incidental" (same fact, different word).

The reviewer proposed one extra finding — *GD&T tolerance stack-up / datum-reference-frame algebra
absent*. **That proposal was verification-tested and does not survive:** PRISM already ships
`gdt_stackup`, `cad_gdt_stackup`, `cad_tolerance_stackup`, `monte_carlo_tolerance`, ISO-286 fit
actions, and datum-reference-frame engines (`cad_datum_reference_frame_assign`,
`feasibility_datums`, `cad_gdt_callout_parse`, `cad_fcf_validate`). A staff-level reviewer's best
guess at a gap turning out already-covered **reinforces Finding 1** — PRISM's mathematical breadth
is genuinely hard to out-enumerate.

## Bottom line

PRISM already has **15 of 16 core mathematical domains** genuinely covered — it is exceptionally
math-complete. The honest answer to "what other math can we apply" is: **mostly assemble what you
own** (topology primitives → methods). The four genuinely-new, measured, buildable gaps are
**interval/certified arithmetic for proved safety** (F3 — start here), **optimal transport** (F2),
**spectral geometry** (F4), and **differentiable physics simulation** (F6). Combined with the
prior three specs, this session has produced a complete math-improvement roadmap for PRISM's
engines.
