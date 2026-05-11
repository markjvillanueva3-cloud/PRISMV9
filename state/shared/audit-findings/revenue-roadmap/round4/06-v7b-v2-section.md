# v7.B v2 — Revised Combinatoric Algorithm Surface (Round-4 Spec Revision)

> **Status:** REPLACES original v7.B in `REVENUE-ROADMAP-2026-05-10.md`. Round-3 forensic deep-dive (`round3/05-v7b-physics-replacements.json`) identified 23 net-new engines, 27 existing engines reused, and 4 rows reframed as RULES/DATA-SURFACES (not equations). Findings F-r3-a5-A through F-r3-a5-E codified below.
> **Authority chain:** Round-2 F-r2-a8-A (combinatoric ≠ orthogonal) → Round-3/05 (forensic physics) → Round-4/06 (THIS DOC). Source equations cross-checked against Stephenson & Agapiou *Metal Cutting Theory & Practice*, Altintas *Manufacturing Automation*, Shaw *Metal Cutting Principles*, Tlusty *Manufacturing Processes & Equipment*.
> **Constants:** All Kienzle kc1.1, Taylor n, J-C coefficients sourced from `mcp-server/src/physics/constants.ts` (canonical single source).
> **Doctrine:** Every NEW engine listed passes `duplicationGuardEngine.mustCheckBeforeCreating()` before build. Every engine wires to `prism_calc` / `prism_safety` / `prism_cam` / `prism_ai` per MCP dispatcher surface.

---

## The 50-Row Table (revised equations + engines + axes + claims)

| # | Pair | Verified equation | Engine to call | Variability axis | Customer claim |
|---|------|-------------------|----------------|------------------|-----------------|
| 1 | Kienzle × Taylor → economic speed | Gilbert: `V* = C / [((1-n)/n)·(t_ct + C_t/C_m)]^n` with Kienzle Fc-power validation | EXISTING TaylorEngine + KienzleEngine; **NEW GilbertEconomicSpeedEngine** | machine-rate / tool-cost ratio (shop-economic) | Cut at min-cost or min-time speed validated by Kienzle power check (Stephenson-Agapiou §11.3) |
| 2 | BeamDeflection × Kienzle → max ap | Iterative fixed-point: guess ap → Fc = kc1.1·b·h^(1-mc) → δ = FcL³/(3EI) → update ap | EXISTING DeflectionOverlayEngine (E0127) via `prism_calc:max_ap_deflection_limited` | tool L/D stickout ratio | Maximum depth your stickout holds to ±0.0005 in deflection; converges 3–5 iters |
| 3 | ChatterStability × Kienzle → SLD | Altintas: `ap_lim(ω) = −1/(2·Kf·Re[Φ_oriented(jω)])`, Kf = kc1.1 (N/mm² per mm width), N = 60ω/(N_z·(2πk+ε)) | EXISTING ChatterStabilityEngine + KienzleEngine via `prism_cam:sld_altintas` | modal FRF (machine-specific tap test) | Stable depths at every spindle speed from YOUR tap test |
| 4 | ToolWear-VB × Taylor → RUL | Bridge: T_total from Taylor V·T^n=C; f=VB_now/VB_lim; RUL=T_total·(1−f). Usui dVB/dt=A·V^a·f^b·exp(−B/T) for off-nominal | EXISTING TaylorEngine + **NEW UsuiWearRateEngine** | observed VB (tool-condition) | Replace-now or run-N-more decision with measured VB |
| 5 | ChipThickness × Kienzle → chip-thinning | Sandvik avg: `h_m = (180/π·a_e/D)·f_z·sin(κ)` for a_e<D/2; kc(h_m)=kc1.1·h_m^(−mc) | EXISTING KienzleEngine + ChipThicknessEngine | radial engagement a_e/D | Chip-thinned feed up to 2.5× for HSM low-a_e paths |
| 6 | Johnson-Cook × Thermal → HSM force | (1) `σ̄ = [A+B·ε̄^n][1+C·ln(ε̄̇/ε̄̇₀)][1−((T−T_r)/(T_m−T_r))^m]`; (2) Merchant `Fc = σ̄·b·h·cos(β−α)/[sin(φ)cos(φ+β−α)]`, φ=π/4−(β−α)/2 | **NEW JohnsonCookEngine + NEW MerchantForceEngine** + EXISTING ThermalEngine via `prism_calc:fc_temperature_corrected` | strain-rate / temperature regime (HSM Ti/Inco) | Force prediction valid for HSM where Kienzle under-predicts 15–40% |
| 7 | Surface roughness × feed/nose → Ra | Brammertz: `Ra_total = Ra_geo + Ra_min`; Ra_geo = f²/(32·r_ε); Ra_min = h_min/2·(1+r_ε/(2·h_min)), h_min ≈ 0.3·r_β | **NEW BrammertzRoughnessEngine** via `prism_calc:ra_predict` | edge-radius regime (sharp vs honed) | Ra within ±15% even at low fz where geometric formula fails |
| 8 | MRR × power → power-limited feed | `F = (η·P_spindle·60·1000)/(kc·ap·ae)`, kc = kc1.1·h_m^(−mc), η = 0.75–0.90 | EXISTING MRREngine + SpindlePowerEngine + KienzleEngine via `prism_calc:feed_power_limited` | spindle-torque curve regime (CT vs CP) | Max feed without spindle-overload alarm |
| 9 | CycleTime polynomial × constraints | **Non-convex MINLP** — Simulated Annealing (Metropolis, β=0.95) OR NSGA-II GA; report best-found ± stderr over 30 restarts | **NEW SimulatedAnnealingEngine + NEW GeneticAlgorithmEngine** via `prism_ai:cycle_optimize` | objective weighting (cost/time/quality) | 10–25% cycle reduction vs baseline (honest non-optimality) |
| 10 | Conformal × residuals → PI | **Split-Conformal Quantile Regression (CQR, Romano 2019)**: fit q̂_lo, q̂_hi; E_i = max(q̂_lo−y, y−q̂_hi); PI asymmetric, locally adaptive, 1−α coverage | EXISTING ConformalCalibrationEngine (CQR variant from NN-CONFORMAL03 merge) | heteroscedasticity regime | Tight intervals where confident, wide where uncertain — 30–60% narrower than fixed ±10% |
| 11 | Z3 × ToleranceStack → constraints | Two-tier: (i) Z3 symbolic feasibility, (ii) MIP (CBC/Gurobi) numeric cost-minimization. WC = arithmetic sum; RSS = root-sum-square | EXISTING Z3Engine + **NEW MIPSolverEngine** | stack-up method (WC / RSS / MC) | Loosen tolerances where math proves safe — 10–30% inspection reduction |
| 12 | FEA-mesh × J-C → residual stress | Capello reduced-order: `σ_res = α·E·ΔT − β·σ_y` from Loewen-Shaw ΔT; full FEA bridge for thermomechanical coupling | **NEW ResidualStressEngine** + EXISTING ThermalEngine | process- vs design-induced stress | Predict warp/distortion on thin-wall before cutting |
| 13 | Vibration FRF × Chatter → tap-test SLD | Multi-mode modal extraction: identify peaks → fit (f_n, ζ, k_modal) per mode → H(jω) = Σ 1/(k_i(1−r_i²+2jζ_i·r_i)) | EXISTING ChatterStabilityEngine + ModalAnalysisEngine | modal density (# of SLD lobes) | SLD lobes from YOUR machine's tap test, not generic library |
| 14 | MRR × heat-balance → thermal load | Loewen-Shaw partition: `R_chip ≈ 0.85–0.95`, R_tool ≈ 0.02–0.10, R_wp = 1−R_chip−R_tool; T_chip = T_amb + R_chip·kc/(ρ·c) | EXISTING ThermalEngine (verify Loewen-Shaw partition) | heat partition fraction (k-dependent) | Coolant on/MQL/dry decision with quantified ΔT |
| 15 | Tool-life Weibull × Taylor → RUL | R(T) = exp(−(T/η)^β), η ≈ Taylor-T, β shape; E[RUL\|T>t] = η·Γ(1+1/β)·(1−F(t))/R(t); Bayesian β update | EXISTING TaylorEngine + **NEW WeibullReliabilityEngine** via `prism_calc:rul_weibull` | sister-tool population variance | Probabilistic life: 90% chance N more parts (not deterministic) |
| 16 | Edge geometry × J-C → micro-force | Slip-line: `Fc = σ̄·b·h_eff`, h_eff = max(h, h_min), h_min = r_β·(1−sin(α_eff)), α_eff = α − arcsin(r_β/(r_β+h)) | **NEW MicroGeometryForceEngine** | edge-honing regime (<5μm vs 20–60μm) | Predict force in finishing where h/r_β<1 |
| 17 | BUE-onset × thermal → speed-feed window | Trent diagram: BUE when T_chip ∈ [T_BUE_lo, T_BUE_hi] (~200–600°C steel); T_chip = T_amb + R_chip·kc/(ρ·c) | **NEW BUEAvoidanceEngine** + EXISTING ThermalEngine | material BUE-T window (lookup) | Pick V to dodge BUE zone — finish guarantee |
| 18 | Coolant-pressure × evacuation → drill depth | Mass balance: `V_coolant·A_flute > MRR·ρ_chip/ρ_coolant`; d_peck = min(3D, V_coolant·t_dwell/MRR); HPC≥70bar enables full-depth | **NEW CoolantEvacuationEngine** | coolant-pressure tier (flood/TC/HPC) | Peck-cycle elimination above threshold — 30–50% deep-hole reduction |
| 19 | Workholding × Chatter → fixture-SLD | Compliance sum: `1/k_total(ω) = 1/k_spindle + 1/k_tool + 1/k_part + 1/k_fixture`; weakest link dominates | EXISTING ChatterStabilityEngine + WorkholdingEngine | weakest-compliance contributor | Identify whether tool/part/fixture is chatter limiter |
| 20 | 5ax kinematics × MRR → effective MRR | `MRR_eff(t) = a_e(t)·a_p(t)·v_f_proj(t)`, v_f_proj = ‖(v_x,v_y,v_z) − ω×r‖; FK Jacobian J(q)·q̇ | EXISTING Multi5AxisKinematicsEngine + MRREngine | 5ax config (TT/HH/mixed) + tool length | True MRR with rotary-axis — eliminates "feed mystery" on 5ax |
| 21 | Setup-error × ToleranceStack → first-part P(in-spec) | Cpk = min((USL−μ)/3σ, (μ−LSL)/3σ); σ_total = √(σ_setup² + σ_process²) | EXISTING CpkEngine + ToleranceStackEngine + SetupErrorEngine | first-part vs steady-state (warm-up) | P(first part in-spec) quantified scrap-risk |
| 22 | Insert-grade × material → cutting-data | **RULE not EQUATION**: catalog lookup → physics validation gate (Kienzle Fc<Fc_max, Taylor T>T_min) | EXISTING ToolCatalogEngine + KienzleEngine + TaylorEngine via `prism_calc:validate_recommended_data` | catalog vs physics-allowed | Catalog values verified against YOUR stickout/spindle/HP |
| 23 | Probing × ToleranceStack → measurement-U | GUM (ISO/IEC Guide 98): `u_combined = √(σ_probe² + σ_calib² + σ_thermal²)`; compare to tol/4 | EXISTING ProbingEngine + **NEW MeasurementUncertaintyEngine** | metrology-U regime (probe A/B/C) | Trust probe or re-measure — quantified U_95 |
| 24 | Spindle-thermal × ToleranceStack → drift comp | `ΔL = α·L·ΔT`; spindle: `ΔZ(t) = ΔZ_∞·(1−exp(−t/τ))`, τ≈30–90 min | EXISTING ThermalEngine + **NEW SpindleGrowthEngine** | warm-up τ (machine-specific) | Auto-probe-and-comp when drift exceeds spec |
| 25 | Material-DB × Kienzle → kc1.1/mc | **DATA SURFACE not EQUATION**: ISO P/M/K/N/S/H → kc1.1 {1800,2100,1100,700,2800,3200} MPa, mc {0.25,0.25,0.22,0.20,0.30,0.30} from `constants.ts` | EXISTING MaterialDatabaseEngine + KienzleEngine | ISO-group bucket (deterministic) | Constants from canonical PRISM table — zero magic numbers |
| 26 | WEDM-feasibility × physics → go/no-go | **RULE not EQUATION**: decision tree — conductivity>0.1 S/m, t/d_wire<200, kerf_R≥wire_r+0.02mm, taper≤15°; output GO/CONDITIONAL/NO-GO + binding constraint | EXISTING WEDMFeasibilityEngine (reframe outputs as rule-fired audit-trail) | binding-constraint regime | Why-it-fails answer in 4 dimensions, not yes/no |
| 27 | WEDM-flushing × spark → cut speed | `MRR_WEDM = α·U·I·t_on·η_flush`, η_flush ∈ [0.5,1.0] gates on Q_flow≥Q_c = k·MRR/h; v_cut = MRR/(h·kerf) (Kuriachen-Mathew) | EXISTING WEDMFlushingEngine + WEDMSparkEnergyEngine via `prism_calc:wedm_cut_speed` | flushing-pressure regime | Cut-speed vs flushing trade — find sweet spot |
| 28 | WEDM-tension × deflection → corner accuracy | Catenary: `δ = (F_lat·L²)/(8·T_wire)`; corner overcut Δr = δ_wire; compensate via trim-cycles or v-reduce | EXISTING WEDMWireDeflectionEngine (E0554) | tension setting (40–80% break load) | Corner-accuracy improvement quantified Δr |
| 29 | Lathe-CSS × Diameter → RPM ramp | `N = 1000·V/(π·D)` clamped at N_max; D_clamp = 1000·V/(π·N_max); below D_clamp, V drops | EXISTING TurningEngine (verify clamp behavior) | spindle regime (CSS-active vs N_max-clamp) | Honest V at small D where machine can't maintain CSS |
| 30 | Lathe-thread × passes → multi-pass | Constant-load (k=0.5): `Δd_n = d_total·(√n − √(n−1))/√N`; constant-depth: Δd_n = d_total/N; modified flank for unilateral chip | EXISTING LatheThreadingEngine | thread-class + material | Thread-form to spec — Class 3A holds, Class 2A optimizes cycle |
| 31 | Drill-cycle × force/torque → peck | `M = kc·D²/8·f_per_rev·sin(point/2)`, Fz = kc·D·f/2; peck if M>M_max OR row-18 violation OR L/D>5 | EXISTING DrillCycleEngine + KienzleEngine | L/D regime (shallow/deep/extreme) | Peck-cycle elimination where physics allows |
| 32 | Rigid-tap × spindle-sync → fault-free | `v_z = N·pitch`; safe `N_max_tap = √(α_max·z_safe/(2π))` from spindle-accel limit | EXISTING TappingEngine (expose accel-limited N_max) | rigid vs floating-holder | Max tap RPM before sync-loss alarm |
| 33 | Mill-engagement × Chatter → lobe shift | Engagement-dependent directional factor: φ_st→φ_ex average shifts down-milling lobes ~10% vs full-immersion; Altintas time-domain or zeroth-order freq method | EXISTING ChatterStabilityEngine (verify engagement-aware mode) | radial engagement (HSM vs conv) | Different stable-RPM zones for HSM vs conventional — both leveraged |
| 34 | Adaptive-feed × spindle-load → constant load | PI: `f_new = f_nom + Kp·(P_tgt−P_act) + Ki·∫(P_tgt−P_act)dt`; saturate at f_max/f_min | EXISTING AdaptiveControlEngine + SpindlePowerEngine | load-variation (cast/forged vs uniform) | Constant-load = consistent finish + 15–25% cycle reduction on variable stock |
| 35 | Tool-deflection × surface → wall-straightness | Walled-cut: `δ(z) = Fc(z)·z²·(3L−z)/(6EI)`; finish: Fc≈const, δ_max at tip; pre-bias toolpath | EXISTING DeflectionOverlayEngine (E0127) — wall-profile output | tool L/D + wall-height | Wall-straightness with toolpath pre-bias = first-part-in-spec |
| 36 | ML-feedforward × empirical → kc-residual | Residual: `kc_actual = kc_Kienzle·(1+δ(V,f,coolant,grade))` with conformal-uncertainty on δ; reject OOD | EXISTING MLPipelineEngine + ConformalCalibrationEngine + KienzleEngine | in-dist vs OOD regime | Personalized kc for YOUR shop — beats generic Kienzle 10–20% |
| 37 | Coolant-MQL × thermal → selector | `T_chip_steady = T_amb + Q_cut/(h_conv·A·η_coolant)`; MQL η≈0.3, flood η≈0.7; dry if T_chip_dry<T_BUE_hi | EXISTING ThermalEngine + **NEW CoolantSelectorEngine** | thermal regime (cool/hot cut) | Quantified MQL/flood ROI vs dry per material |
| 38 | Cycle-drift × SPC → shift detect | **CUSUM**: `S_h_n = max(0, S_h_{n-1} + (x_n − μ₀ − k))`, alarm S_h>h; k=δ/2, h=4; ARL₁<10 on 1σ shift. EWMA: z_n = λx_n + (1−λ)z_{n-1} for smooth filter | EXISTING SPCEngine + **NEW CUSUMEngine** variant (verify if SPCEngine already supports CUSUM/EWMA) | shift-magnitude (small drift vs step) | Detect 1σ drift in 8 parts vs 50 with Shewhart |
| 39 | RUL × maintenance-cost → replace-trigger | `E[cost_continue] = P(fail\|t)·(cost_scrap+cost_unplanned) + (1−P(fail\|t))·cost_normal` vs cost_planned; replace at α-quantile of T | EXISTING ToolWearEngine + WeibullReliabilityEngine | risk-tolerance regime (prod pressure vs scrap cost) | Optimal replace-vs-run under YOUR cost structure |
| 40 | Setup-time × Markov-shop → throughput | M/G/1: `ρ=λ/μ`, `W_q = ρ·E[S²]/(2(1−ρ))`; E[S]=t_setup_mean+t_run_mean; multi-machine = Jackson network | **NEW QueueingShopEngine** + SchedulerEngine | shop-load (ρ<0.7 / >0.85 / overload) | Realistic throughput w/ queue waiting — not best-case sum |
| 41 | EOQ × demand-variability → reorder | **(s, S) policy** for stochastic D: reorder<s, order-up-to S; `s = E[D_LT] + z_α·σ_LT`, S = s + EOQ; Croston's for lumpy | **NEW InventoryPolicyEngine** via `prism_calc:reorder_point` | demand-variability (smooth/intermittent/lumpy) | Service-level met without overstock — quantified stockout P |
| 42 | Energy-cost × kc → $/part | `E_part = (kc·MRR·t_cut)/η_machine + P_idle·t_total`; η_machine ≈ 0.6–0.8; idle ~40% total | EXISTING EnergyEngine + KienzleEngine (verify P_idle included) | idle-power regime (lights-out vs staffed) | True energy $/part incl idle — lights-out opportunity |
| 43 | Pareto × cost/time/quality → frontier | NSGA-II (Deb 2002): population evolution under non-dominated sort + crowding; 50–200 generations; 3D scatter visualization | EXISTING GeneticAlgorithmEngine (multi-objective mode) OR **NEW NSGA2Engine** | objective-weighting (customer preference) | All reasonable trade-offs shown — customer picks operating point |
| 44 | Probabilistic-tolerance × MC → yield | Monte Carlo N=10⁴: sample N(μ_i, σ_i²) per contribution, check all SL; quasi-MC (Sobol) for 10–100× variance reduction | EXISTING MonteCarloEngine + ToleranceStackEngine | tolerance-correlation (indep vs corr) | Realistic yield % incl all feature interactions |
| 45 | GD&T-callout × inspection → CMM-routine | **RULE not EQUATION**: position→4 datum-targets+N pts (Hopp); profile→7+ pts/feature; runout→360° scan min 6 stations; `n* = (z·σ/Δ)²` | EXISTING ProbingEngine + **NEW InspectionPlanEngine** | GD&T-feature-type | CMM-routine auto-generated from print, stat-valid |
| 46 | First-article × Cpk → ramp | Cpk>1.33 gate + Bayesian PI lower-bound: `P(true Cpk≥1.33 \| observed) > 95%` before ramp; need n≥30 for tight estimate | EXISTING CpkEngine (Bayesian-CI mode) | sample-size confidence | Statistical confidence in Cpk before ramp — not just point estimate |
| 47 | Setup-sheet × kinematics → safe G-code | FK envelope check: per block compute tool+holder+spindle pos, intersect machine envelope polytope; collision vs fixture mesh | EXISTING KinematicsEngine + CollisionDetectionEngine | machine-envelope (machine-specific) | Pre-flight G-code check — catch travel/collision before crash |
| 48 | Operator-skill × variance → human factor | Wright learning curve: `t_n = t_1·n^(log₂(LR))`, LR ∈ [0.7, 0.95]; asymptote t_∞ ≈ t_predicted·(1+δ_machine); per-operator LR from history | **NEW OperatorLearningCurveEngine** | operator-experience regime | Realistic cycle for THIS operator, not theoretical robot |
| 49 | Energy-monitoring × baseline → anomaly | Isolation Forest or One-Class SVM on (V, f, ap, material); alarm when observed P falls in <1st percentile of predicted distribution | **NEW AnomalyDetectionEngine** | anomaly type (over-current/under-cut/wrong-mat) | Catch subtle process drift before scrap |
| 50 | Full-pipeline × all-models → end-to-end U | GUM: `u_y² = Σ(∂f/∂x_i)²·u(x_i)² + 2ΣΣ(∂f/∂x_i)(∂f/∂x_j)·u(x_i,x_j)`; nonlinear → MC (10⁴); coverage k=2 for 95%; identify dominant contributor | **NEW UncertaintyPropagationEngine** (orchestrates all upstream) | U-source (machine/material/model/measurement) | End-to-end U with dominant-source attribution — actionable target |

---

## 23 Net-New Engines (build list with dependencies)

| # | Engine | Rows | Dependencies | Build priority |
|---|--------|------|--------------|----------------|
| 1 | **GilbertEconomicSpeedEngine** | 1 | TaylorEngine, KienzleEngine | **P0 (top-3 row 1)** |
| 2 | **JohnsonCookEngine** | 6, 12, 16 | (none — constitutive primitive) | **P0 (top-3 row 6)** |
| 3 | **MerchantForceEngine** | 6 | JohnsonCookEngine | **P0 (top-3 row 6)** |
| 4 | **UsuiWearRateEngine** | 4 | TaylorEngine, ThermalEngine | P1 |
| 5 | **BrammertzRoughnessEngine** | 7 | (none) | P1 |
| 6 | **SimulatedAnnealingEngine** | 9 | (none — generic optimizer) | P1 |
| 7 | **GeneticAlgorithmEngine** | 9, 43 | (none — generic optimizer) | P1 |
| 8 | **MIPSolverEngine** | 11 | Z3Engine | P2 |
| 9 | **ResidualStressEngine** | 12 | ThermalEngine | P2 |
| 10 | **WeibullReliabilityEngine** | 15, 39 | TaylorEngine | P1 |
| 11 | **MicroGeometryForceEngine** | 16 | JohnsonCookEngine | P2 |
| 12 | **BUEAvoidanceEngine** | 17 | ThermalEngine | P2 |
| 13 | **CoolantEvacuationEngine** | 18 | (none) | P1 |
| 14 | **MeasurementUncertaintyEngine** | 23 | ProbingEngine | P2 |
| 15 | **SpindleGrowthEngine** | 24 | ThermalEngine | P2 |
| 16 | **CoolantSelectorEngine** | 37 | ThermalEngine | P2 |
| 17 | **CUSUMEngine** | 38 | SPCEngine (or extend SPCEngine if mode-capable — VERIFY first) | P1 |
| 18 | **QueueingShopEngine** | 40 | (none) | P2 |
| 19 | **InventoryPolicyEngine** | 41 | (none) | P1 |
| 20 | **InspectionPlanEngine** | 45 | ProbingEngine | P2 |
| 21 | **OperatorLearningCurveEngine** | 48 | (none) | P2 |
| 22 | **AnomalyDetectionEngine** | 49 | (none — ships sklearn-equivalent IF/OC-SVM) | P2 |
| 23 | **UncertaintyPropagationEngine** | 50 | MonteCarloEngine + all upstream | P2 (orchestrator — build last) |

**Build dependency order (topological):**
1. **Tier-0 (no deps):** JohnsonCookEngine, BrammertzRoughnessEngine, SimulatedAnnealingEngine, GeneticAlgorithmEngine, CoolantEvacuationEngine, QueueingShopEngine, InventoryPolicyEngine, OperatorLearningCurveEngine, AnomalyDetectionEngine
2. **Tier-1 (deps on Tier-0 + existing):** GilbertEconomicSpeedEngine, MerchantForceEngine, UsuiWearRateEngine, MIPSolverEngine, ResidualStressEngine, WeibullReliabilityEngine, MicroGeometryForceEngine, BUEAvoidanceEngine, MeasurementUncertaintyEngine, SpindleGrowthEngine, CoolantSelectorEngine, CUSUMEngine, InspectionPlanEngine
3. **Tier-2 (orchestrator):** UncertaintyPropagationEngine

---

## Top-3 Highest-Value Rows (unlock ~60% of v7.B value)

### Row 1 — Gilbert Economic Cutting Speed (P0)
**Why:** Every customer asks "what speed should I run?" — Gilbert is the textbook answer combining tool life (Taylor) with shop economics (machine rate, tool cost, changeover time). Replaces the *dimensionally broken* `V* = (C/Kc^0.5)^(1/n)` claim in original v7.B. Stephenson-Agapiou §11.3 canonical.
**Engine:** NEW GilbertEconomicSpeedEngine = thin composer over EXISTING TaylorEngine + KienzleEngine.
**Build cost:** ~1 day (just composition + Kienzle-power validation gate).
**Customer claim:** "Min-cost or min-time speed validated by power check — defensible because Gilbert is the textbook canonical."

### Row 2 — Iterative Max-Depth Under Deflection (P0, ZERO new engines)
**Why:** Every long-tool job hits deflection limit; iterating ap to δ_target is universally needed. ALREADY IMPLEMENTED in EXISTING DeflectionOverlayEngine (E0127); just needs `prism_calc:max_ap_deflection_limited` wire-up.
**Engine:** EXISTING DeflectionOverlayEngine (E0127) — wire only.
**Build cost:** ~0.5 day (dispatcher action wire + tests).
**Customer claim:** "Maximum depth your specific stickout holds to ±0.0005 in deflection — converges in 3–5 iterations" (validated by Round-2 F-r2-a8-B).

### Row 6 — Johnson-Cook + Merchant for HSM Force (P0)
**Why:** Original v7.B claim `Fc = JC_flow_stress · b · h` is a **category error** (J-C yields σ_flow in Pa, not Fc in N). Real path is J-C → σ̄ → Merchant geometry → Fc. Unlocks Ti/Inconel/HSM regime where Kienzle under-predicts 15–40%. This is the highest *technical credibility* fix — without it, the v7.B HSM claims are physics-incoherent.
**Engines:** NEW JohnsonCookEngine + NEW MerchantForceEngine + EXISTING ThermalEngine.
**Build cost:** ~3 days (J-C constants table per material from `constants.ts` extension; Merchant geometry calc; thermal coupling).
**Customer claim:** "Force prediction valid for HSM/Ti/Inconel where empirical Kienzle under-predicts 15–40% — replaces 'good for steel only' caveat with physics-grounded high-strain-rate model."

---

## Rewrite Summary

- **Rows rewritten:** 50 / 50 (all)
- **Engines newly built:** 23
- **Engines reused (existing):** 27
- **Rows reframed as RULES/DATA-SURFACES:** 4 (rows 22, 25, 26, 45)
- **Findings codified:** F-r3-a5-A (BLOCKER), F-r3-a5-B/C/D (MAJOR), F-r3-a5-E (MINOR)
- **Customer-claim integrity:** No row claims "physics-derived" for what is actually a rule/lookup. Non-convex problems disclose "best-found ± stderr over 30 restarts", not "optimal".
- **Doctrine compliance:** Every new engine flows through `duplicationGuardEngine.mustCheckBeforeCreating()`; every action wires to `prism_calc` / `prism_safety` / `prism_cam` / `prism_ai` per MCP dispatcher surface; constants sourced from `mcp-server/src/physics/constants.ts` only.

**One-line:** v7.B reborn — Gilbert replaces broken V*-from-Kc; iterate ap via existing DeflectionOverlay; J-C+Merchant replaces flow-stress=force category error; 23 new engines, 27 existing reused, 4 reframed as rules.
