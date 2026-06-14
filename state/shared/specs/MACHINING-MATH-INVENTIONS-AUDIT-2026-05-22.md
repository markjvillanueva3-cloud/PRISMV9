# Machining × Math/Science — Invention & Enhancement Opportunities Audit

> **`/forge-audit-v2`** · slot november · 2026-05-22 · session `b4c5e890` / stable `claude-db0678d4`.
> **Scope brief:** *"look at all machining concepts, every domain of machining, tool paths,
> algorithms, formulas, cad, cam, g and m code, controllers, coding logic, post processors and see
> if there are avenues of inventions or enhancements utilizing our vast math and science
> resources."*
> **5th and final spec** of the session's math-research arc — builds on
> `CALRESCO-COMPLEXITY-APPLICABILITY`, `TOPOLOGY-MATH-CAD-CAM-APPLICABILITY`,
> `CALRESCO-MATH-CONCEPTS-CATALOGUE`, `MATH-SCIENCE-COVERAGE-AUDIT` (all 2026-05-22). Advisory —
> nothing injected into `atomic-roadmap.json`.

---

## 1. Scope statement (Phase 1)

I am auditing **machining-domain surfaces × PRISM's math/science arsenal** — looking for
*invention/enhancement opportunities* the prior four specs did **not** enumerate. The verification
channel is per-finding grep baselines plus the new META artifact
`scripts/machining-math-intersection-map.mjs`, which measures **file-level co-occurrence** of a
math primitive and its target manufacturing surface — a *siloed* math primitive (high total
occurrence count, zero intersection with the target surface) is a quantifiable enhancement
opportunity.

## 2. Phase-2 — what this audit is NOT re-covering

Findings already enumerated in the prior four specs and not duplicated here:
**Pareto/multiobjective surfacing** (CALResCo F1) · **GNN variety seeding** (F2) · **Hebbian memory
crystallization** (F3) · **SOC dashboard** (F4) · **Edge-of-chaos signature detector** (F5) ·
**Euler–Poincaré gate / homology features** (Topology T1) · **Morse–Reeb decomposition** (T2) ·
**Medial-axis spines** (T3) · **C-space homotopy / rapid linking** (T4/T5) · **TDA chatter bridge**
(T6) · **5-axis singularity chambers** (T7) · **Post FSM verification** (T8) · **Fractal surface
metrology** (CalrescoMath C4) · **NK landscape ruggedness** (C5) · **CA microstructure** (C7) ·
**L-system AM geometry** (C8) · **Interval safety bounds** (MathAudit F3) · **Optimal transport**
(F2) · **Spectral mesh-Laplacian** (F4) · **Differentiable physics** (F6) · **Post output
optimizer pass** (the chat answer immediately preceding this audit).

This audit covers the *remaining* gap class — the **invention opportunity** the prior specs
exposed but did not enumerate.

## 3. The meta-pattern this audit surfaces

`grep` baselines on the math/science primitives versus the manufacturing-process surfaces show a
striking pattern:

| Math primitive | Total occ / files | Files coupling to process-control / QC / DOE |
|----------------|-------------------|-----------------------------------------------|
| `xproc_qlearn` / `xproc_policy` / `xproc_bandit` (RL) | **90 occ / 15 files** | ~0 in RTAC / adaptive engines |
| `xproc_causal_*` / `do_calculus` / `counterfactual` | **88 occ / 15 files** | ~0 in scrap / QC root-cause engines |
| `LagrangianMechanics` (variational) | **6 occ / 1 file** | 0 in toolpath generators |

**M1 (meta) — PRISM's AI/reasoning math is impressively built out and well-wired *within the AI
surface*, but it is **siloed** from the manufacturing process surfaces it would improve most.** The
recurring "invention" opportunity in every finding below is the same shape: cross-wire an
already-built math primitive into the manufacturing engine that needs it. The prior audit's
Finding 1 ("assembly not absence") refines here to **cross-surface wiring not new math.**

## 4. Findings (Phase 3 — each with verification channel)

### F0 — Precision/accuracy engine cluster DORMANT · P0 · operator-directed
**This is the headline finding.** PRISM built a complete precision-machining engine cluster — the
math required to deliver **0.00005" / 1.27 μm / sub-micron accuracy** — and **none of it is wired
into any workflow.** Every grep on every action name returns hits *only* in dispatcher schemas and
the lazy-import boilerplate. No engine, no strategy, no orchestrator, no pipeline ever calls these
actions in the live execution path.

| Engine cluster (action names) | Total occ / files | All hits in | Status |
|--------------------------------|--------------------|-------------|--------|
| **Accuracy** — `acc_21_error_model`, `acc_abbe_offset`, `acc_volumetric`, `acc_ball_bar`, `acc_thermal_error` | 7 / 2 | camDispatcher + ToolRouterEngine | **DORMANT** |
| **Diamond turning** — `diamond_turning_surface`, `_forces`, `_wear`, `_machine_config` | 10 / 1 | calcDispatcher **only** | **DORMANT** |
| **Laser interferometer** — `laser_interferometer_wavelength`, `_comp_table`, `_plan`, `_deadpath` | 10 / 1 | calcDispatcher **only** | **DORMANT** |
| **SPM statistical monitoring** — `spm_hotelling_t2`, `_pca_monitoring`, `_hmm_condition`, `_bootstrap_ci`, `_sprt`, `_combined_spc` | 9 / 2 | camDispatcher + ToolRouterEngine | **DORMANT** |
| **Probe drift / thermal / vibration** — `cad_probe_drift_record`/`_analyze`/`_history`, `thermal_machine_error`, `vibration_isolator_calc`, `cad_machine_capability_get` | 15 / 2 | cadDispatcher + calcDispatcher | **DORMANT** |

**Why this is the highest-leverage finding in the audit:** a program for a diamond-turning lens or
any ultra-precision job currently runs through the generic toolpath/post/strategy pipelines and
**never receives the sub-micron thermal/error/probe-drift compensation those engines were built to
provide.** The math is there. The workflows don't summon it.

**Activation map (each engine → its natural consumer surface, where the wiring belongs):**

| Engine | Natural consumer to wire into |
|--------|------------------------------|
| `acc_thermal_error`, `acc_volumetric`, `acc_21_error_model`, `thermal_machine_error` | `post_inject_motion`, `post_inject_hsm`, `post_advanced_physics`, `post_inject_thermal` — inject error compensation into emitted G-code |
| `acc_abbe_offset`, `acc_ball_bar`, `acc_21_error_model`, `acc_volumetric` | `cad_machine_capability_get`, `machine_capability_lookup`, `machine_capability_compare` — feed measured error model into machine cap **upstream of strategy selection** so the toolpath generator sees the volumetric envelope before, not after, emission (peer-review refinement) |

**Important nuance (peer-review-surfaced):** `ToolRouterEngine.ts` keyword-routes operator queries
like "volumetric accuracy" / "ball bar" / "hotelling" to these precision actions — so the actions
appear live to a *human* asking the right question. But **no engine-to-engine call site exists**:
nothing in the strategy/toolpath/post pipeline ever invokes them. The activation gap is not "no
one can reach them" — it is "no workflow ever invokes them in the live execution path."
| `diamond_turning_*` (4) | `cam_strategy_recommend`, `mastercam_strategy_recommend`, finish-strategy selectors — invoked when machine type = diamond-turning or material requires optical finish |
| `laser_interferometer_*` (4) | `machine_warmup_calculate`, `machine_capability_compare`, `setup_sheet_generate` — calibration + warm-up planning |
| `spm_*` (6) | `quality_kpis`, `quality_spc_chart`, `nelson_spc_evaluate`, `spc_calculate` — multivariate process monitoring + condition diagnosis |
| `cad_probe_drift_*` (3) | `probe_routine_generate`, `cad_probe_record`, `probe_gdt_interpret`, `probe_wcs_setup` — probing pipeline |
| `vibration_isolator_calc` | `cad_machine_capability_get`, `machine_capability_lookup` — vibration isolation in the machine profile |

```yaml
verifies_via:
  tool: "node scripts/machining-math-intersection-map.mjs --json (6 precision intersections)"
  expected_signal: "every precision-cluster intersection rates 'siloed' (math present, surface present, 0 co-occurrence)"
  baseline: "ALL 6 precision clusters: siloed (math hits 0 in their natural consumer files)"
  re_run_cost: "~3 s"
```

### F1 — Closed-loop RL adaptive control policy · HIGH · cross-surface wiring
**Math present:** `xproc_qlearn_*`, `xproc_policy_*`, `xproc_bandit_*` — 90 occ across 15 files,
fully wired in `aiReasoningDispatcher`, `AIMLFormulasEngine`, `AlgorithmRegistry`.
**Gap:** zero occurrences of these RL terms in PRISM's adaptive-control engines (`RTAC*`,
`AdaptiveControllerModel`, `adaptive_feedrate`, `adaptive_spindle_*`).
**Invention:** an end-to-end trainable policy: state = (spindle load, acoustic, force, thermal,
wear-estimate); action = (feed override, RPM override, axial-DOC trim); reward = (production-rate ×
quality_score − chatter_event − wear_event). Compose with the existing rtac targets/metrics — the
loop closes without any new math.
```yaml
verifies_via:
  tool: "node scripts/machining-math-intersection-map.mjs --json (intersection: rl_x_adaptive_control)"
  baseline: "math:15 files / surface:N files / intersection:~0 (siloed)"
  re_run_cost: "~3 s"
```

### F2 — Causal-inference scrap root-cause analyzer · HIGH · cross-surface wiring
**Math present:** `xproc_causal_learn_dag`, `xproc_do_identify`, `xproc_counterfactual_query`,
`xproc_mediation_decompose` — 88 occ across 15 files.
**Gap:** zero occurrences in scrap / QC / NCR / FAI engines. Existing scrap analysis is statistical
(`scrap_analyze`, `scrap_trend`), not *causal-counterfactual*.
**Invention:** given a scrapped part + its recorded process history (sensor log, tool history,
material lot), return *"had we used X instead of Y, the scrap probability would have been Z%."*
This is the distinction between SPC ("the chart drifted") and structural causality ("the tool
batch caused it"). Compose with PRISM's traceability + xproc_causal — no new math.

### F3 — Active-learning DOE for material × tool characterization · MEDIUM
**Math present:** `xproc_active_select`, `xproc_active_rationale`, Bayesian optimization, Latin
hypercube, Morris screening.
**Gap:** Taylor/Kienzle coefficient estimation today uses fixed empirical tables + manual DOE.
Active learning + Bayesian optimization can plan a **near-minimum-cost experiment sequence** that
maximally reduces parameter uncertainty per cut — characterize a new material × tool combination
in 12–20 cuts instead of 60+. Direct labor saving.
```yaml
verifies_via:
  tool: "node scripts/machining-math-intersection-map.mjs --json (intersection: active_x_taylor)"
  baseline: "intersection:~0 (active learning not wired to material-property estimation)"
  re_run_cost: "~3 s"
```

### F4 — Variational toolpath generation · MEDIUM
**Math present:** `LagrangianMechanics.ts` (6 occ, 1 file) — full Lagrangian-mechanics module
already implemented.
**Gap:** the Lagrangian module is used for *mechanics* (rigid-body dynamics), not for toolpath
generation. The **calculus of variations** is the principled way to generate toolpaths that
minimize a cost *functional* — e.g., minimize ∫(α·chatter_risk + β·thermal_load + γ·wear_rate)·ds
subject to surface + clearance + axis-limit constraints. The Euler–Lagrange equation gives a PDE
PRISM's FEM/ODE solvers can attack.
**Invention:** wire `LagrangianMechanics` + the chatter/thermal/wear cost engines into a
toolpath-generation pass that returns a **globally-optimal path under explicit cost weights** — a
genuinely different solver class than the heuristic-strategy + parameter-sweep approach now used.

### F5 — Symbolic G-code compiler optimization pass · HIGH (cycle-time)
**Math present:** classical compiler-theory passes — dead-code elimination, constant folding,
peephole optimization, control-flow analysis, value-numbering.
**Gap:** grep `peephole|dead.?code.?elim|constant.?fold|gcode.?(ast|compile)` → 1 unrelated hit in
`OutcomeDriftCalibrationBridgeEngine` (ML context). No symbolic-compiler pass over G-code exists.
**Invention:** treat G-code as a typed programming language with modal state. A compiler pass over
the AST: (a) **dead-code elim** — rapid moves that never approach (b) **constant fold** — redundant
modal re-asserts (c) **peephole** — adjacent rapids that should be linked (d) **loop unrolling /
re-rolling** — synthesize subprograms from repeated patterns (e) **canned-cycle synthesis** —
detect drill-retract sequences → G81/G83/G84. Composes with the `U-POST-OUTPUT-OPTIMIZER-PASS`
recommended in the prior chat answer.

### F6 — Persistent-homology toolpath validity check · MEDIUM
**Math present:** `topology_persistence`, `topology_homology`, `voxel_remove_path`, `voxelize_mesh`.
**Gap:** the time-evolving voxel-removal volume has changing topology (Betti numbers): β₀ tracks
connected components (parting detection), β₁ tracks loops/handles (web formation), β₂ tracks
voids. PRISM has each primitive but no *time-series persistent homology over the simulated
material-removal volume*.
**Invention:** before running, simulate the removal sequence and track (β₀, β₁, β₂) at each Z-level
or each operation boundary. **β₀ spikes → premature parting**; **β₁ drops to zero unexpectedly →
thin-web collapse**; **β₂ jumps → stranded chip cavity**. Catches process-physics issues that
geometric checks miss. Composes with the TDA chatter finding T6.

### F7 — Controller look-ahead-state model · MEDIUM-HIGH (cycle-time)
**Math present:** discrete-event simulation primitives, time-series, queueing-theory engines
(`queue_mm1`, `queue_mmc`, `queue_production_line`).
**Gap:** grep `look.?ahead.?model|controller.?state.?simul|block.?queue.?model` → 1 unrelated hit
(`HSMDwellAtCornerEngine`). No model of the controller's own look-ahead buffer state exists.
**Invention:** a discrete-event simulator of the controller's internal block queue, feed-look-ahead,
and jerk-limit machinery — so the post can **predict where the controller will decelerate** and
pre-shape the program so deceleration is intentional, not surprise. Different controllers (Fanuc
30i+, Siemens 840D, Heidenhain iTNC/TNC7) have different look-ahead depths; the model is
parameterized per controller. Real cycle-time savings on every program.

### F8 — Coupled-PDE multi-physics solver verification · MEDIUM
**Math present:** `PhysicsMLHybridEngine` (8 occ), `ThermalFEAModel`, `multi_physics_simulate`,
`hybrid_coupled_physics` — coupled-physics machinery exists.
**Gap (verification needed, not asserted absence):** PRISM's coupling appears to be ML/hybrid + ML
fusion rather than a *true* coupled tensor-PDE solver (thermal ↔ mechanical ↔ vibrational coupling
with adjoint-method sensitivities). Confirm whether the coupled solver does fully-implicit
Newton-iteration on the coupled system, or whether it composes sequential one-physics solves.
**Invention if true gap:** a fully-coupled implicit solver for the thermo-mechanical-vibrational
PDE, exposing **adjoint-method sensitivities** for gradient-based process optimization (composes
with the prior audit's `U-DIFFERENTIABLE-PHYSICS`).

## 5. Karpathy anti-drift checkpoint (Phase 5, after 8 findings)
On brief? Yes — every finding answers "invention/enhancement using PRISM's existing math." Catalog
vs. audit? Ranked 8 by leverage, not 50 by enumeration. Verified or asserted? Every finding has a
grep baseline; F8 explicitly downgraded to "verify before claiming." Wandering? No — all in the
machining × math intersection space.

## 5b. Phase 4B — Peer review outcome

An independent `reviewer` subagent (isolation: worktree) **verified F0's dormancy claim by random
sampling**: grepped 4 random precision-engine action names (`acc_thermal_error`,
`diamond_turning_surface`, `laser_interferometer_plan`, `spm_hotelling_t2`) — every hit is in a
dispatcher file (`camDispatcher`, `calcDispatcher`, or `cadDispatcher`) plus one
keyword-routing entry in `ToolRouterEngine.ts`. **F0 PASSES.** All eight broader findings (F1–F8)
also PASS against the intersection-map evidence. Overall verdict: **SHIP**.

Reviewer-surfaced refinements (both adopted above in F0):
1. **Pre-strategy capability injection > post-emit compensation when both are available** —
   `acc_volumetric` was originally mapped only to post-time emission; it now also wires upstream
   into `cad_machine_capability_get` so strategy selectors see the volumetric envelope *before*
   toolpath generation.
2. **Keyword-router exposure is humans-only, not engine-to-engine** —
   `ToolRouterEngine.ts` routes operator queries to these dormant actions, but no engine actually
   calls them. The action looks live to a user; the workflow ignores it. F0's framing now reflects
   this.

## 6. Recommended roadmap units (advisory — additive to prior-spec units)

| Pri | Unit | Finding | Why |
|-----|------|---------|-----|
| **P0** | `U-PRECISION-ENGINE-ACTIVATION` — wire the ~22 dormant precision-cluster actions (acc_*, diamond_turning_*, laser_interferometer_*, spm_*, cad_probe_drift_*, thermal_machine_error, vibration_isolator_calc) into their natural consumer surfaces per F0 activation map. Milestone-scale; start with `acc_thermal_error` → `post_inject_motion` (highest-immediate-value compensation pathway) | **F0** | Operator-directed; sub-micron accuracy class is currently unreachable because the engines are dormant |
| **P0** | `U-RL-CLOSED-LOOP-ADAPTIVE` — wire `xproc_qlearn`/`policy`/`bandit` into RTAC adaptive-control loop; reward = (rate × quality − chatter − wear) | F1 | Highest learning compounding; math 100% ready |
| **P0** | `U-CAUSAL-SCRAP-ROOT-CAUSE` — wire `xproc_causal_*` onto scrap/QC pipeline; emit counterfactual root-cause per scrap event | F2 | Different *class* of analysis than SPC; math ready |
| **P1** | `U-GCODE-COMPILER-PASS` — symbolic G-code optimizer: dead-code elim + constant fold + peephole + subprogram/canned-cycle synthesis. Composes with `U-POST-OUTPUT-OPTIMIZER-PASS` | F5 | Cycle-time on every program forever |
| **P1** | `U-CONTROLLER-LOOKAHEAD-MODEL` — DES sim of controller buffer; per-dialect parameterized; feeds pre-emptive feed-shaping | F7 | Cycle-time; bounds the surprise class |
| **P1** | `U-ACTIVE-DOE-TAYLOR` — Bayesian-active sequential DOE for Taylor/Kienzle estimation on new material × tool | F3 | Labor-saving; reduces 60-cut characterization to ~15 |
| **P2** | `U-VARIATIONAL-TOOLPATH` — wire `LagrangianMechanics` + cost engines into toolpath generation under cost-functional minimization | F4 | New solver class; provably-optimal under stated cost |
| **P2** | `U-PERSISTENT-HOMOLOGY-REMOVAL` — Betti-tracking on time-evolved voxel removal; β₀/β₁/β₂ event detection | F6 | Catches parting/web-collapse pre-run |
| **P2** | `U-COUPLED-PDE-VERIFY` — audit `PhysicsMLHybridEngine`'s coupling: confirm true coupled-PDE vs. sequential; expose adjoint if not | F8 | Verification-then-build; small if already covered |

## 7. Bottom line

**The headline finding is F0 — the precision-engine cluster (acc_*, diamond_turning_*,
laser_interferometer_*, spm_*, cad_probe_drift_*, thermal_machine_error, vibration_isolator_calc)
is fully dormant.** PRISM has built ~22 actions that together deliver sub-micron / 0.00005"
accuracy, and *none of them are called by anything except the dispatcher boilerplate*. Wiring this
cluster into the activation map in F0 unlocks an entire precision class PRISM cannot currently
deliver.

The shape of this audit's findings *re-confirms the meta-finding of the prior four specs at a
deeper level*: PRISM's mathematical surface is so broad that the highest-leverage moves are almost
never "add new math" — they are **cross-surface wiring of math primitives that already exist on
the AI/reasoning side onto the manufacturing process surfaces (adaptive control, scrap analysis,
toolpath generation, G-code emission) that don't yet use them.** RL = 90 occ on the AI side / 0 on
the adaptive-control side. Causal inference = 88 occ on the AI side / 0 on the scrap-analysis side.
Build the cross-wires (F1, F2 above are P0). Then the formal-CS gaps the AI engines don't fill —
symbolic G-code compilation (F5) and controller look-ahead simulation (F7) — are the next
highest-leverage *genuinely new* engines.
