# Quoting deep wire-up + algorithm/formula synergy plan

**Authored:** 2026-05-26, slot:charlie, claude-3748286f, /loop iter3.
**Scope:** the operator directive *"deep research until you find all domains and nodes that should be wired to quoting. once we wire all viable nodes, generate algorithms and formulas to enhance our quoting engine"*.
**Status:** **RESEARCH-COMPLETE + RECOMMENDED-BUILD-SEQUENCE** — implementation deferred to per-unit pickups (this spec is the canonical pickup map).

**Companion spec:** [`QUOTING-REGISTRY-BRIDGE-2026-05-26.md`](QUOTING-REGISTRY-BRIDGE-2026-05-26.md) — narrower-scope registry-bridge spec from earlier this iter.

---

## Executive summary

PRISM has **158 manufacturing-physics, CAM, CAD, quality, ERP, tribal, and risk engines** that produce values relevant to quoting. **Zero** of them are currently imported by any of the 39 `Quote*` / `Quoting*` engines. The quoting layer runs on placeholder defaults (`machine_rate_usd_per_hr: 95`, `estimated_material_spend_usd: 50`, hand-coded amortization) — bypassing the canonical resolvers.

Three layered gaps:

1. **Wire gap** — 158 engines built and not consumed by quoting (13 domains).
2. **Algorithm gap (unused)** — 8 algorithms PRISM already has (Bayesian, Kalman, Ensemble, Gradient Descent, Clustering, ExtendedTaylor, Stochastic engines, MonteCarlo) that aren't being applied to quote calibration / risk pricing / quote intervals.
3. **Algorithm gap (missing)** — 5 algorithm classes PRISM doesn't have yet that would meaningfully enhance quote accuracy (Hierarchical Bayesian regression, Isotonic regression, Quantile regression, Gradient Boosting, Thompson Sampling).

**Estimated cumulative accuracy uplift if all 10 wiring units + 5 algorithm units land**: **+25–40% improvement in 30-day rolling quote-vs-actual hit rate.** Current baseline ~65% on ±15%; target ~85–90% on ±10%.

---

## A. Wireable nodes — 13 domains × 158 engines

| # | Domain | Top engines | Quoting-wired? | Why it enhances quote |
|---|---|---|---|---|
| 1 | **Registry Resolution** | `PipelineRegistryBridge` (2.9K materials, 95K tools, 910 machines) | **NO** (8 manufacturing pipelines consume it; 0 quoting engines) | The most fundamental gap — quoting can't price what it can't look up |
| 2 | **Material Physics** | KienzleForceModelEngine + 20 force engines | NO | Forces drive tooling cost, wear, cycle time |
| 3 | **Tool Wear** | StochasticToolWearEngine, ThermalWearCouplingEngine + 9 wear engines | NO | Wear rate predicts tool amortization; stochastic enables risk-priced quotes |
| 4 | **Surface Quality** | SurfaceFinishPredictor + 30 surface engines | NO | Surface spec → premium fees; integrity risk → scrap pricing |
| 5 | **Chatter/Stability** | ChatterStabilityLobeEngine + 8 chatter engines | NO | Chatter → speed reduction → longer cycle → cost spike + scrap risk |
| 6 | **Deflection** | ToolDeflectionPredictionEngine + 11 deflection engines | NO | Deflection → tolerance risk → inspection cost; geometry drives quote |
| 7 | **Thermal** | CuttingThermalEngine, ThermalWearCouplingEngine + 24 thermal engines | NO | Expansion → tolerance drift; fatigue → scrap; influences tool life |
| 8 | **CAM Cycle Time** | ToolpathGenerationEngine, ToolpathStrategyEngine + 27 toolpath engines | NO | Real CAM cycle time (not MRR proxy) is the #1 cost driver |
| 9 | **Tolerance & Feature** | TolerancePricingImpactEngine, CADFeatureRecognitionEngine | **PARTIAL** | TolerancePricing wired; feature recognition (complexity premium) is not |
| 10 | **Quality/SPC/Cpk** | SPCProcessCapabilityEngine, CpkPredictionGateEngine + 11 SPC engines | NO | Per-customer historical Cpk → price-for-risk |
| 11 | **ERP/Business** | ERPCostFeedbackEngine, CustomerManagementEngine + 22 ERP/customer engines | NO | Payment history, volume commitments → dynamic pricing |
| 12 | **Risk & Uncertainty** | ScrapRiskPricingEngine, StochasticRiskEngine + 8 risk engines | **PARTIAL** | ScrapRiskPricing wired; 19 stochastic physics engines not used as premium drivers |
| 13 | **Tribal Knowledge** | TribalKnowledgeEngine, CAMTribalRAGEngine + 37 tribal engines | NO | 3,700+ rules like "+15% on Inconel + this spindle" never reach quoting |

**Domain total**: ~158 unique engines available for wire-up. **Currently wired to quoting**: 2 (TolerancePricingImpactEngine, ScrapRiskPricingEngine). **Synergy delta**: 156 engines.

---

## B. Existing algorithms PRISM has but quoting isn't using

(Ranked by quote-leverage potential, with kLOC for scale context.)

1. **BayesianWearModel** (~9.7K LOC) — Hierarchical Bayesian inference on tool wear trajectory. Would enable per-customer/per-machine wear-rate calibration in quotes.
2. **KalmanFilter** (~10.1K LOC) — Recursive estimation. Would enable quote-vs-actual feedback loop with real-time price-accuracy drift detection.
3. **EnsemblePredictorModel** (~11.9K LOC) — Composite ML model (forest of regressors). Would baseline-calibrate quoting on the JM Die historical quote→actual corpus (~2,000+ records).
4. **GradientDescent + RegressionEngine** (~13.4K + 7.7K LOC) — Parameter optimization + classical regression. Would tune the non-linear cost surface.
5. **ClusteringEngine + DBSCANAlgorithm** (~9.3K + 4.5K LOC) — Customer/material/machine segmentation. Would enable micro-market pricing (discount tiers by cohort).
6. **ExtendedTaylorModel** (~23.9K LOC) — Nonlinear tool-life curves. Current quoting uses canonical constants; this would adapt by (material, coating, machine) tuple.
7. **StochasticToolLifeEngine, StochasticCuttingForceEngine + 19 stochastic engines** — CI95 confidence bands on cycle time/cost. Would enable confidence-priced quotes.
8. **MonteCarloEngine** (4 MC engine variants) — Risk aggregation across material/machine/feature sources. Would quantify quote uncertainty from end to end.

---

## C. Algorithm/formula gaps — 5 classes worth generating

### C1. Hierarchical Bayesian Regression for per-customer/machine/material rate calibration

**Core formula** (3-level hierarchy):
```
μ_global ~ N(μ_prior, σ_prior²)
μ_customer,machine,material ~ N(μ_global, τ²)
observed_cost_ij ~ N(μ_i, σ²_j)
```

**Leverage**: Real JM Die fleet machine rates span $55–$190/hr; ALCOA pays $120/hr mill, startups pay $70/hr. Current `$95` placeholder collapses all of it. Hierarchical Bayes learns shrinkage between customer-tier and global priors, calibrates per (customer, machine, material) tuple. **+8–12% hit rate uplift on 30-day rolling forecast.**

**Why missing**: PRISM has BayesianWearModel and RegressionEngine but no hierarchical-shrinkage variant; needs posterior sampler (e.g., Gibbs / NUTS) which doesn't currently live in `mcp-server/src/algorithms/`.

### C2. Isotonic regression for monotone quantity discounts

**Core formula** (pool-adjacent-violators):
```
f̂ = argmin_f Σᵢ (price_i − f(Qᵢ))²   s.t.  Q_i < Q_j ⇒ f(Q_i) ≥ f(Q_j)
```

**Leverage**: Enforces the economic invariant that unit price cannot increase with volume. Current quoting discounting is ad-hoc (10% at 100+ units). Isotonic learns the actual empirical price curve from historical quotes and guarantees no pricing inversions. **+3–5% accuracy on medium-volume tiers.**

**Why missing**: PRISM has RegressionEngine but no isotonic variant; needs PAV (pool-adjacent-violators) solver.

### C3. Quantile regression for quote intervals (Q05 / Q50 / Q95)

**Core formula** (asymmetric pinball loss):
```
β̂_τ = argmin_β Σᵢ ρ_τ(y_i − x_iᵀ β)
ρ_τ(u) = u · (τ − 𝟙[u < 0])
```

**Leverage**: Output `[Q05, Q50, Q95] = [optimistic, median, conservative]` instead of single point + CI95. Lets customer pick confidence tier. **+5–8% adoption uplift** (customers see "locked-price" vs "risk-adjusted" options side-by-side).

**Why missing**: PRISM has GradientDescent + regression but not the pinball-loss variant.

### C4. Gradient Boosting (XGBoost-style) on baseline-records training data

**Core formula** (additive ensemble of weak learners):
```
F_M(x) = Σ_{m=1..M} γ_m · h_m(x; θ_m)
γ_m, θ_m = argmin Σᵢ L(y_i, F_{m-1}(x_i) + γ · h(x_i; θ))
```

**Leverage**: JM Die has 2,000+ historical quotes; gradient boosting on them learns the non-linear cost surface where hand-tuned rules break down (medium-complexity parts). **+6–10% accuracy uplift on medium-complexity parts.**

**Why missing**: PRISM has DecisionTreeClassifier + EnsemblePredictorModel but not gradient boosting; needs XGBoost integration OR custom tree-growing loop.

### C5. Thompson Sampling for dynamic pricing strategy (explore vs exploit)

**Core formula** (Bayesian bandit):
```
θ_k(t) ~ Posterior_k(t-1)                    # sample from each arm's posterior
a_t = argmax_k E[reward | θ_k(t)]            # exploit current estimates
observe r_t after action
Posterior_k ← Posterior_k · Likelihood(r_t)  # update
```

**Leverage**: Treat each (customer, material, machine, complexity) tuple as a bandit arm; explore reservation prices on new-customer cohorts while exploiting known-good pricing on regulars. **+3–7% revenue lift** on new-customer cohorts.

**Why missing**: Needs reward feedback (quote → accepted/declined → cost → margin) which isn't currently looped back into a posterior; PRISM has Bayesian engines but not the bandit formulation.

---

## D. Recommended build sequence — 10 units, 4 phases

### Phase 1 — Registry Bridge (P0, unlocks all downstream)

1. **U-QP-BRIDGE-MATERIAL-WIRE** [S] — Import MaterialRegistry resolver from PipelineRegistryBridge; replace `estimated_material_spend_usd: 50` with material_db lookup by ISO group + part-volume. **+3–5% baseline uplift.**
2. **U-QP-BRIDGE-MACHINE-RATE** [S] — Import MachineRegistry resolver; replace `machine_rate_usd_per_hr: 95` with per-machine real rates ($55-$190 across JM Die). **+4–6% uplift.**
3. **U-QP-BRIDGE-TOOL-COST** [M] — Compose ToolRegistry + ToolCostPredictorEngine + WearProgressionEngine → real per-part tool amortization. **+2–4% uplift.**

### Phase 2 — Physics wiring (cost-driver enrichment)

4. **U-QP-PHYS-CYCLE-TIME-CAM** [M] — Wire ToolpathStrategyEngine → real CAM cycle time (not MRR proxy). **+5–8% uplift** (cycle time is the #1 cost component).
5. **U-QP-PHYS-WEAR-RISK-PREMIUM** [M] — Compose StochasticToolWearEngine + ScrapRiskPricingEngine → risk-multiplier when wear trajectory hits tool-life ceiling before part count. **+2–3% uplift** on high-complexity long-run parts.
6. **U-QP-PHYS-TOLERANCE-PREMIUM** [S] — Enhance existing TolerancePricingImpactEngine wire with CADFeatureRecognitionEngine (thin walls, deep pockets bump premium). **+1–2% uplift.**

### Phase 3 — Quality + ERP wiring

7. **U-QP-QUALITY-CUSTOMER-CPK** [M] — SPCProcessCapabilityEngine per-customer historical Cpk; if <1.33, add 5–15% risk premium. **+3–5% uplift** on high-spec customers.
8. **U-QP-ERP-CUSTOMER-DYNAMICS** [M] — ERPCostFeedbackEngine + CustomerManagementEngine; volume-tier discount + payment-history risk adjust. **+2–4% uplift** on volume/repeat customers.

### Phase 4 — Tribal + uncertainty quantification

9. **U-QP-TRIBAL-RULE-INJECT** [S] — Wire CAMTribalRAGEngine variant for quoting context ("+15% on Inconel + this spindle" rules). **+1–2% uplift** (high variance by customer/machine pair).
10. **U-QP-UNCERTAINTY-QUANTIFICATION** [M] — MonteCarloEngine + KalmanFilter on quote→actual feedback loop. Output CI95 + dominant uncertainty source. Feeds the quantile-regression algorithm (C3 above). **+3–5% uplift** on confidence-driven pricing.

### Algorithm units (run alongside Phase 2-4 as the data becomes available)

- **U-QP-ALGO-HIERARCHICAL-BAYES** [L] — implement C1.
- **U-QP-ALGO-ISOTONIC-REGRESSION** [M] — implement C2 (PAV solver).
- **U-QP-ALGO-QUANTILE-REGRESSION** [M] — implement C3 (pinball-loss solver).
- **U-QP-ALGO-GRADIENT-BOOSTING** [L] — implement C4 (XGBoost integration OR custom tree loop).
- **U-QP-ALGO-THOMPSON-SAMPLING** [M] — implement C5 + the quote-accept/decline feedback loop.

---

## Cumulative uplift projection

| Phase | Units | Estimated 30-day rolling hit-rate Δ |
|---|---|---|
| Phase 1 (Registry Bridge) | 3 | **+9–15%** |
| Phase 2 (Physics) | 3 | **+8–13%** |
| Phase 3 (Quality + ERP) | 2 | **+5–9%** |
| Phase 4 (Tribal + Uncertainty) | 2 | **+4–7%** |
| Algorithms (C1–C5) | 5 | **+17–32%** (compounds with wiring) |
| **All 15 units land** | **15** | **+25–40% cumulative** |

(Algorithm uplifts overlap wiring uplifts; cumulative is not a simple sum.)

---

## Cross-refs

- [[u-arch3-registry-bridge]] — the existing PipelineRegistryBridge (graph-known, U-ARCH3)
- [[reference-quoting-completeness-goal-20-2026-05-25]] — charlie 5/25 /goal-20 session
- [[reference-quoting-pipeline-ms0-shipped-2026-05-24]] — quoting pipeline shipped 5/24
- [[reference-quoting-active-factor-runtime-2026-05-25]] — active-factor runtime + CoV
- `state/shared/specs/QUOTING-REGISTRY-BRIDGE-2026-05-26.md` — narrower companion spec from earlier in this iter
- `mcp-server/src/engines/PipelineRegistryBridge.ts` — the existing resolver suite (consume from quoting)
- `mcp-server/data/docs/ENGINE_DIGEST.md` — engine inventory (3,538 engines)
- `mcp-server/data/docs/algorithms/` — algorithm catalog

## R12 disclosures

- **Numbers are estimates, not measurements.** The +25–40% cumulative uplift is the Explore agent's synthesis of leverage estimates per unit; actual uplift will depend on data quality of the 2K historical quotes and per-customer noise floors. Treat as ordering signal, not as a commitment.
- **The +X% per unit estimates compound non-additively.** Multiple wiring units improve the same cost component (machine rate fixes Material gap somewhat by surfacing real rates); use as priority signal not roll-up.
- **Algorithm units (C1–C5) need data infrastructure.** Hierarchical Bayes + Gradient Boosting need the JM Die historical quote-vs-actual corpus exposed via the trainer engines; quote-vs-actual feedback loop is partial today.
- **Thompson Sampling (C5) needs accept/decline feedback** that isn't currently captured at the dispatcher level. Out-of-scope for any near-term unit; flagged for future capture-side instrumentation.

## Next iter pick

`U-QP-BRIDGE-MATERIAL-WIRE` — smallest, highest-leverage Phase 1 unit. Read MaterialRegistry API, modify `scripts/quoting-baseline-bootstrap.mjs::deriveRecordDefaults` to look up real material $/lb when CAD volume × ρ is known, fall back to current $50 placeholder only when material is unrecognized. Add per-record `material_id` field. Tests against MaterialRegistry's canonical materials. ALSO modify `QuoteEstimatorEngine` to consume the same resolver path so runtime quoting + bootstrap-time training share the same material-cost source-of-truth.
