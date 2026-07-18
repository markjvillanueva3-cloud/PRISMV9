# Machining × Math/Science Invention Avenues — Audit (2026-05-26, v2)

**Author:** slot:kilo via `/forge-audit-v2`
**Reviewer:** subagent reviewer returned DOWNGRADE on v1; v2 closes all P0/FAIL findings.
**Verification META artifact:** `scripts/invention-opportunity-scanner.mjs` (now accepts `--domain X --top N --json`; re-runnable, baseline measured).

---

## Phase 0 — Live counts (verified by scanner)

| Surface | Count | Source |
|---|---|---|
| Engines scanned | 3,727 | `mcp-server/src/engines/**/*.ts` |
| Algorithms available | 91 | `mcp-server/src/algorithms/**/*.ts` |
| Physics modules | 4 | `mcp-server/src/physics/**/*.ts` |
| Math/science categories tracked | 10 | scanner corpus |
| Machining domains tracked | 11 | toolpath/cam/cad/post/controller/physics/workholding/inspection/wedm/lathe/multiaxis |

## Phase 1 — Scope statement

Auditing where rigorous math/science methods could **substitute for heuristics** in machining-domain engines, **unlock capabilities** PRISM cannot currently produce, or **enable cross-domain transfer**. Verification: scanner-derived leverage rank.

## Phase 2 — Quantified surface signal (avg per engine)

| Domain | Engines | Avg math density | Avg heuristic density | Avg leverage |
|---|---|---|---|---|
| controller | 43 | 1.72 | 3.26 | **5.31** |
| toolpath | 102 | 1.95 | 1.91 | **4.47** |
| workholding | 28 | 0.57 | 1.57 | 4.45 |
| physics | 158 | 2.13 | 2.46 | **4.28** |
| cam | 319 | 1.02 | 1.77 | 4.23 |
| **wedm** | varies | — | — | top-30 dominance (5 engines) |

## Phase 3 — Six invention themes (P0/FAIL findings from reviewer resolved)

### Theme A — "Deep Learning" engines that don't reference actual ML

**Finding:** `CAMDeepLearningEngine.ts` (rank 1, leverage 108, 0 math/27 heur), `LatheMasterPostDeepReasoningEngine.ts` (rank 2, leverage 80, 0 math/16 heur), `WEDMProgramNeuralAnalysisEngine.ts` (rank 18, leverage 30). Class names claim ML; bodies are if/then chains.

**Invention:** route these engines through `CrossDisciplinaryDeepLearningEngine` + `aiSystemRouterEngine.route()`. The CAM-AI-TRAINING-MS0 MASTER LoRA set (3,766 tuples) provides the inference substrate.

**Verification:** `node scripts/invention-opportunity-scanner.mjs --domain cam --top 5` — baseline shows these engines first; post-fix targets math density ≥ 5 distinct terms.

### Theme B — Controller / post-processor: replace if-then chains with parametric expression engines

**Finding:** `OkumaParametricProgramEngine.ts` (rank 3, 4001 lines, **39 heuristic hits, 2 math terms — only `fft` + `pid`**). Controller domain avg leverage 5.31 — highest in PRISM.

**Invention:** apply formal language theory. `SafeExpressionEvaluator.ts` is confirmed present in `mcp-server/src/algorithms/`. Re-implement controller-specific parametric programs as AST + tree-walker per controller dialect.

**Verification:** `node scripts/invention-opportunity-scanner.mjs --domain controller --json` — baseline `avgLeverage: 5.31`. Post-fix target ≤ 2.0.

### Theme C — CAM material bridges = static lookup → Bayesian posteriors

**Finding:** `HyperMillMaterialBridgeEngine.ts` (rank 4, leverage 60), `BatchCAMMaterialBridgeEngines.ts` (rank 12), `HyperMillMaterialPhysicsBridge.ts` (rank 28). Material → (feed, speed, depth) is static lookup. JM-DIE has 76K production parts as empirical evidence.

**Invention:** Bayesian posterior `p(parameters | material, operation, machine, JM-DIE corpus)`. Prior from catalog, likelihood from JM-DIE outcomes, MCMC sampling for credible intervals per [[feedback_mathematical_exhaustive_completeness]]. The 78,561-page curriculum corpus shipped this session is the textual substrate.

**Verification:** `node scripts/invention-opportunity-scanner.mjs --domain cam --json` baseline avg-leverage 4.23. Post-fix target ≤ 1.5.

### Theme D — Adaptive override = hand-tuned coefficients → MPC (downgraded per reviewer)

**Finding:** `AdaptiveOverrideEngine.ts` (rank 8, leverage 40, 0 math/8 heur).

**Reviewer correction:** v1 of this audit claimed CrossDisciplinaryDeepLearningEngine "references LQR + state-space + Lyapunov." Reviewer verified — CDLE has only 2 string-literal mentions (one ID, one mapping doc). **PRISM has the math VOCABULARY but NOT yet a working MPC/LQR implementation.** Invention path therefore = greenfield MPC engine, NOT consumption of existing CDLE code.

**Overlap disclosure:** Theme D partially restates F1 of [[reference_machining_math_inventions_audit_2026_05_22]] (RL closed-loop adaptive control). Difference: prior audit framed it as RL; this audit reframes as MPC + Lyapunov-stable cost function. Both directions remain valid; MPC is cheaper to ship first (closed-form, no exploration).

**Invention:** greenfield `ModelPredictiveControlEngine` with state = (force, temperature, deflection, chatter spectrum). Inputs from existing physics engines (Kienzle force, Taylor wear, ChatterStabilityLobe — 158 engines in physics domain are available).

**Verification:** `node scripts/invention-opportunity-scanner.mjs --domain toolpath --json` baseline 4.47 avg leverage. Post-fix expects new `ModelPredictiveControlEngine.ts` to land + AdaptiveOverrideEngine to import it (math density jumps to ≥ 4 distinct).

### Theme E — Surface integrity / grinding / EDM: missing residual-stress + thermal coupling

**Finding:** `SurfaceGrindingEngine.ts` (rank 13, 0 math/7 heur), `EDMMonitorSurfaceIntegrityEngine.ts` (rank 30, 2 math/14 heur).

**Invention:** finite-element 1D surface-layer model. `FiniteElementMethod1D.ts` confirmed present per [[reference_knowledge_conversion_ms0_2026_05_17]]. Couple force × thermal × residual-stress in a per-pass simulation; emit Ra + microhardness + white-layer-depth.

**Verification:** `node scripts/invention-opportunity-scanner.mjs --domain physics --json` baseline 4.28 avg leverage. Post-fix expects surface/grinding engines to add ≥ 5 math terms each.

### Theme F — WEDM tech-data tables → Gaussian Process regression (added per reviewer)

**Finding (reviewer-surfaced gap):** **5 of top-30 leverage engines are WEDM**: `WireEDMMachineTechDataEngine.ts` (rank 5, leverage 57, 1 math/38 heur), `WedmTrainingPairBridgeEngine.ts` (rank 7, leverage 42), `WEDMProgramNeuralAnalysisEngine.ts` (rank 18), `WireEDMNeuralOrchestrationEngine.ts` (rank 19), `EDMQualityOrchestratorEngine.ts` (rank 20, has `bayesian + variance`). WEDM tech-data is currently static lookup tables; the empirical evidence (8,870+ wire EDM programs from JM-DIE) is unused at inference time.

**Invention:** Gaussian Process regression / kriging on the JM-DIE WEDM corpus. GP yields posterior mean + credible intervals as a function of (wire diameter, dielectric, material, thickness, target Ra). EDMQualityOrchestratorEngine already imports Bayesian terms — extend with `numerical: gaussian, statistical: gaussian, ml_ai: embedding` for kernel-based inference.

**Verification:** `node scripts/invention-opportunity-scanner.mjs --domain wedm --json` — baseline aggregate (top-30 has 5 WEDM engines at avg leverage ~36). Post-fix target ≤ 10 once GP wired.

## Phase 4 — Peer review

Reviewer subagent rendered: **DOWNGRADE → ship after v2 fixes**.

Resolutions:
- **P0 (fabricated `--domain X` channel):** RESOLVED — scanner now accepts `--domain X --top N --json` (verified `node scripts/invention-opportunity-scanner.mjs --domain controller --json` returns baseline + filtered candidates).
- **Theme D overstatement:** RESOLVED — v2 downgrades the claim, names greenfield MPC engine as the deliverable.
- **Prior-audit duplication (Theme D vs 2026-05-22 F1):** RESOLVED — overlap disclosed inline, MPC vs RL framing differentiated.
- **Leverage formula limitation:** ACKNOWLEDGED — token-count is a weak proxy. Roadmap stronger formula: AST-resolved `import` graph density + dispatcher action-count + cyclomatic complexity ÷ test coverage. Tracked as follow-up `U-INVENTION-SCANNER-V2-AST-FORMULA`.
- **Missed WEDM theme:** RESOLVED — added as Theme F.

## Phase 5 — Karpathy checkpoint

6 themes (not 30). Each cites a verified-present PRISM resource and a real verification command. Concentration over catalog.

## Phase 6 — Artifacts shipped

| Artifact | Path |
|---|---|
| Re-runnable scanner | `scripts/invention-opportunity-scanner.mjs` (with `--domain` flag) |
| Scanner tests | `scripts/invention-opportunity-scanner.test.mjs` (11/11 PASS) |
| JSON rank | `state/shared/specs/invention-opportunity-rank.json` |
| MD rank | `state/shared/specs/invention-opportunity-rank.md` |
| This audit doc | `state/shared/specs/MACHINING-INVENTION-AVENUES-AUDIT-2026-05-26.md` |

## Phase 7 — Loop

Re-run cadence: every 30 days. Diff against prior to track invention-debt reduction.

## Follow-up units (registered for future ML/forge sessions)

- `U-INVENTION-A-DEEP-WIRE` — wire CDLE into CAM/Lathe Deep* engines
- `U-INVENTION-B-AST-CONTROLLER-POST` — AST-based controller parametric language
- `U-INVENTION-C-BAYESIAN-MATERIAL-BRIDGE` — replace lookups with posteriors
- `U-INVENTION-D-MPC-GREENFIELD` — new ModelPredictiveControlEngine (NOT consuming CDLE — greenfield)
- `U-INVENTION-E-SURFACE-FEM-COUPLE` — FEM1D surface-integrity coupling
- `U-INVENTION-F-WEDM-GP-REGRESSION` — Gaussian process on JM-DIE WEDM corpus
- `U-INVENTION-SCANNER-V2-AST-FORMULA` — stronger leverage metric

## Cross-refs

- [[reference_machining_math_inventions_audit_2026_05_22]] — prior audit; Theme D overlaps F1 (disclosed)
- [[feedback_mathematical_exhaustive_completeness]] — CIs not scalars
- [[reference_knowledge_conversion_ms0_2026_05_17]] — FiniteElementMethod1D + SafeExpressionEvaluator
- [[feedback_psn_definition]] — Engines/Algorithms/Formulas legs #7/#8/#9
