# SFC-ACCURACY-MS1 — Full-Envelope Backend Variability + Auto-Adjust + PRISM Enhanced

**Status:** DRAFT — pending operator approval before build kicks off
**Scope owner:** slot india (claude-24e5b0b2), 2026-05-18
**Predecessor:** SFC-ACCURACY-MS0/U-SFC-MATRIX01 (frontend data-layer matrix, 24/24 PASS, shipped HEAD `f00a1e6de7`)
**Mandate:** user directive 2026-05-18 — "run all statistically viable, variable input results for every mill, spindle type, controller, type of chip clearing, material, part feature or machining tool path, tool holder, tooling selected, tool stick out and extrusion of tool holder body, spindle strength, table and spindle kinematics, build type, quality type of machine, insert chosen if indexable tooling picked, fixture and work holding, tool path selected … auto adjustments as parameters are changed … PRISM Enhanced … save results in nodes on system-viz so they can be used for training the model further and to have for quicker calculations … per machine type with database attachments."

---

## 1. Backend entry point (single canonical seam)

`prism_calc:sf_orchestrate` → `speedFeedOrchestratorEngine.compute(input)` at
`mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts` (3,575 LOC).

Accepts **any subset** of the 70+ `OrchestratorInput` fields, resolves the rest from
catalogs + canonical physics constants (no field is required). The simple `speed_feed`
case in `calcDispatcher.ts:1414` is intentionally NOT used — it bypasses 90% of the
physics envelope the user named.

Auxiliary entry points for dimension-specific resolution: `sf_resolve_machine`,
`sf_resolve_tool`, `sf_resolve_material`, `sf_stochastic`, `sf_compare`, `sf_optimize`.

---

## 2. Dimension catalogue (mapping user's 18 dimensions → 70+ backend fields)

| # | User dimension                              | OrchestratorInput field(s)                                                        | Sampling band                                                       |
|---|---------------------------------------------|----------------------------------------------------------------------------------|---------------------------------------------------------------------|
| 1 | Mill build/quality                          | `machine_type`, `machine_rigidity`, `machine_guideway`, `machine_age_years`      | 4 types × 3 rigidity × 3 guideway × 3 age = 108 envelopes           |
| 2 | Spindle type / taper / preload              | `spindle_taper`, `spindle_bearing_preload`, `machine_max_rpm`, `machine_power_kw`, `machine_max_torque_nm`, `machine_axis_accel_m_s2`, `machine_axis_jerk_m_s3` | 8 tapers × 3 preload × {8k/15k/20k/30k RPM} × {15/22/30 kW}         |
| 3 | Controller                                  | (advisory in `cam_system`; not in input — resolved via post-processor mapping)   | 6 controllers: Fanuc, Siemens, Heidenhain, Haas NGC, Okuma OSP, Mazak SmoothX |
| 4 | Chip clearing (coolant)                     | `coolant_type`, `coolant_pressure_bar`, `coolant_concentration_pct`              | 6 types × {1/5/20/70/300 bar} × {5/10/15 %}                         |
| 5 | Material                                    | `material`, `iso_group`, `hardness_hb`, `hardness_hrc`, `sigma_y_MPa`            | 28 catalog materials × 3 condition bands (annealed/hard/PH)         |
| 6 | Part feature / toolpath strategy            | `operation`, `cut_type`, `strategy`                                              | 7 ops × 3 cut types × 7 strategies = 147 combos (filtered by op)    |
| 7 | Tool holder                                 | `holder_type`, `holder_gauge_length_mm`, `holder_tir_mm`, `holder_balanced_g`    | 5 types × {short/standard/long gauge} × {2/5/10 µm TIR} × G2.5/G6.3 |
| 8 | Tooling selected                            | `tool_diameter_mm`, `flutes`, `tool_material`, `tool_coating`, `helix_angle_deg`, `corner_radius_mm`, `tool_series` | endmill / face mill / drill / thread mill — each in 3 diameter bands |
| 9 | Tool stickout                               | `tool_stickout_mm`, `flute_length_mm`, `overall_length_mm`                       | L/D ∈ {2, 3, 4, 5, 6, 8} — deflection envelope from 0.5× to 8× tool diameter |
| 10 | Holder extension (body protrusion)         | `holder_gauge_length_mm` + derived envelope                                      | {short/std/extended} → collision-zone envelope                       |
| 11 | Spindle strength (curves)                  | `machine_power_kw`, `machine_max_torque_nm` + `getTorqueCurve()` lookup          | 4 archetype curves: constant-torque, constant-power, peaked, flat   |
| 12 | Table / spindle kinematics                  | `machine_axis_accel_m_s2`, `machine_axis_jerk_m_s3`, `machine_type`              | 3 accel × 3 jerk × axis-count {3/4/5}                               |
| 13 | Build type                                 | `machine_rigidity`, `machine_guideway`                                            | covered by #1                                                       |
| 14 | Machine quality class                       | `machine_age_years`, `machine_rigidity`                                          | new / midlife / aging                                               |
| 15 | Insert (if indexable)                       | `insert_grade`, `tool_grade`, `tool_series`, `corner_radius_mm`, `edge_radius_mm` | 8 ISO insert shapes × 6 grades × 4 nose radii                       |
| 16 | Fixture & workholding                       | `workholding_type`, `workholding_stiffness`, `clamping_force_kN`                 | 7 types × 3 stiffness × {1/5/20/50 kN}                              |
| 17 | Toolpath selected                           | covered by #6 (`strategy`)                                                       | —                                                                   |
| 18 | Geometry / part-feature dimensions          | `workpiece_*`, `wall_thickness_mm`, `overhang_ratio`, `feature_tolerance_mm`     | thin-wall, deep-pocket, thin-floor, freeform envelopes              |

Plus output-axis controls: `optimize_for` ∈ {tool_life, productivity, surface_finish, balanced, cost}.

---

## 3. Sampling strategy — full compatibility-filtered enumeration (REVISED 2026-05-18)

**Operator directive 2026-05-18:** "there should be hundreds of millions of
combinations we need to check the calculations of". Stratified sampling (the
prior ~5,300-cell tier-A/B/C/D/E approach) is RETIRED — full enumeration of the
compatibility-filtered envelope is the canonical strategy going forward.

**Cardinality estimate** (after applying real compatibility filters from
catalogs + ISO 513 rules + spindle-taper/holder compatibility + machine-table
size vs workpiece size + tool-diameter vs spindle-taper compatibility + coating
× ISO group + workholding × workpiece geometry):

| Dimension group                                    | Levels after filters | Subtotal     |
|---------------------------------------------------|----------------------|--------------|
| Machine archetype × rigidity × guideway × age     | 10 × 3 × 3 × 3 = 270 | 270          |
| Spindle (taper × preload × RPM band × power band) | 8 × 3 × 4 × 3 = 288  | ~78K (× above)|
| Controller                                        | 6                    | ~470K        |
| Coolant (type × pressure × concentration)         | 6 × 5 × 3 = 90       | ~42M         |
| Material × condition                              | 28 × 3 = 84          | ~3.5B unfiltered → ~140M after ISO compat |
| Operation × cut_type × strategy                   | 7 × 3 × 7 = 147 → 60 after filter | ~8.4B → ~300M |
| Holder                                            | 5 × 3 × 3 × 2 = 90 → 35 after taper compat | ~10B → ~700M |
| Tool (family × diameter × flutes × material × coating × helix × corner) | filtered ~2K | varies |
| Stickout L/D                                      | 6                    | ×           |
| Insert (if indexable)                             | 8 × 6 × 4 = 192 → 50 after material compat | ×    |
| Fixture/workholding                               | 7 × 3 × 4 = 84 → 30 after part-geom compat | ×     |

**Compatibility-filtered estimate: ~200M to ~500M valid combinations.**
Raw Cartesian is ~10^15; filters cut 99.999%.

**Execution architecture** (cannot run in vitest):

| Stage | Script                                       | Output                                          | Wall-clock target  |
|-------|---------------------------------------------|------------------------------------------------|--------------------|
| 1     | `scripts/sfc-variability-enumerate.mjs`     | chunked JSONL of valid OrchestratorInputs       | ~5 min (CPU-bound)|
| 2     | `scripts/sfc-variability-batch-run.mjs`     | chunked JSONL of OrchestratorResults            | ~12-48 h (parallel workers, 6 ms/cell × 200M cells / 16 cores)|
| 3     | `scripts/sfc-variability-validate.mjs`      | per-cell accuracy assertions + drift report      | ~10 min (streaming)|
| 4     | `scripts/generate-sfc-variability-features.mjs` | system-viz ghost.sfc-cached-result.* nodes  | ~15 min            |
| 5     | (auto) regen-viz pickup → GNN training pool | NN-GRAPH-MS2 deploy gate clears                  | next cron          |

**Resumability**: every script writes per-chunk progress to
`state/shared/sfc-progress.jsonl`. Restart picks up at the last unfinished chunk.
Per-cell idempotent — same OrchestratorInput hash deduplicates.

**Vitest gate**: a small ~5,000-cell smoke test still runs in CI to catch
regressions on the canonical-reference subset (every named material × every
operation × representative machine). The full 200M+ run is a batch job, not
a unit test.

**Validation per cell:**
1. Output finite + non-NaN on every primary scalar
2. `cutting_speed_mpm` inside per-material canonical envelope (Sandvik CoroKey ±50%)
3. `feed_per_tooth_mm` inside operation-typical band (0.005–0.5 mm/tooth)
4. `power_kw` ≤ `machine_power_kw` (or limiting_factor surfaced)
5. `deflection_um` within tool-stickout L^3 envelope (Timoshenko beam ref)
6. `tool_life_min` inside Taylor envelope (1 min ≤ T ≤ 9999 min)
7. `safety_checks[]` all-pass OR limiting_factors[] surfaces the violation
8. `stability_assessment.zone` matches predicted SLD lobe given chatter inputs
9. `overall_confidence` ≥ 0.30 (low-confidence cells flagged for catalog enrichment)
10. Calibration applied when overrides present

---

## 4. System-viz graph emit — per machine-type node + DB attachments

Generator: `scripts/generate-sfc-variability-features.mjs` (new). Registered in
`scripts/regen-viz.mjs` FAST[] and `scripts/merge-augmentations.mjs` splice block
(mirroring the existing priority-queue / domain-pipeline / misc-tasks pattern).

**Node schema:**

```
ghost.sfc-machine-types  (L8 roost)
├── sfc.machine.vmc-3axis-standard
├── sfc.machine.vmc-3axis-high-rigidity
├── sfc.machine.hmc-4axis
├── sfc.machine.5axis-trunnion
├── sfc.machine.5axis-swivel-head
├── sfc.machine.bridge-mill
├── sfc.machine.gantry
├── sfc.machine.mill-turn
├── sfc.machine.swiss
└── sfc.machine.router

per machine-type node carries properties:
  - spindle_max_rpm_band      (e.g. {min: 8000, typical: 12000, max: 20000})
  - spindle_power_kw_band
  - spindle_torque_curve_archetype
  - rigidity_class
  - guideway_type
  - typical_taper
  - axis_accel_m_s2_band
  - cached_sfc_results[]      (top-50 most-queried cell results, RPM/feed/power/life)
  - canonical_vc_envelope_by_iso  (P:[…], M:[…], K:[…], N:[…], S:[…], H:[…])
  - gnn_node_embedding (768-d, lazy)

edges out:
  → ghost.sfc-compatible-materials[machineId]    (one edge per supported ISO group)
  → ghost.sfc-compatible-tools[machineId]        (filtered by spindle taper + max diameter)
  → ghost.sfc-compatible-holders[machineId]      (taper compat)
  → ghost.sfc-compatible-fixtures[machineId]     (table size compat)
  → ghost.sfc-compatible-coolants[machineId]     (machine TSC capability)
  → ghost.sfc-typical-toolpaths[machineId]       (machine kinematics + controller)

edges in:
  ← ghost.unwired-engine.sfc.SpeedFeedOrchestratorEngine  (canonical computation owner)
  ← ghost.priority_queue.U-SFC-ACCURACY-MS1               (this milestone)
```

**Database attachments:**
- material catalog: `mcp-server/src/data/jm-die-profile.ts` + canonical material DB
- tool catalog: `web/src/data/tools.ts` + `mcp-server/src/data/tool-catalog/*`
- holder catalog: `mcp-server/src/data/holder-catalog/*`
- fixture catalog: `mcp-server/src/data/fixture-catalog/*`
- machine torque curves: `mcp-server/src/data/machine-torque-curves.ts`

Each attachment is an edge from the machine-type node to the catalog-source node
with a `relation: "consults"` property.

---

## 5. Cached results → GNN training feed

The 5,300 cells produced in §3 are **labeled training samples** for the GraphSAGE
GNN (NN-GRAPH-MS2 / U-NNG-PIPELINE-STRATIFIED-WIRE, already in tree).

Each cell becomes an edge in the augmentation graph with properties:
- input fingerprint (sha256 of normalized OrchestratorInput)
- output cell (RPM, feed, power, tool_life, Ra, confidence)
- timestamp
- safety_status (PASS / WARN / FAIL)

`scripts/seed-ghost-from-unwired.mjs` already maintains the reference-ghost pool
(681 ghosts today). This adds a parallel pool: `ghost.sfc-cached-result.*` with
≥5,300 entries — easily clears the GNN's `poolSize ≥ 2` deploy gate that has
kept the model dormant (`NN-EVAL.json` shows `deferred:true, poolSize:0`).

---

## 6. Runtime cache lookup → SFC calculator UI

When `SfcCalculatorPage` calls `sfcApi.calculate`, the backend first hits the
system-viz cache:

```
input → fingerprint → nearest-cached-cell within L2(normalized_dim_vec) < 5%
   ├─ HIT  → return cached result + delta-recompute only for fields that drifted
   └─ MISS → full orchestrator compute + emit new cache entry on success
```

Cache lookup happens at `prism_calc:sf_orchestrate` entry (calcDispatcher.ts:6489)
before the orchestrator's `compute()` runs. Saves ~95% of orchestrator latency on
repeat queries, and ensures GNN-trained recommendations propagate to the UI
without rebuilding the engine.

---

## 7. AutoAdjustCascadeEngine — parameter dependency DAG

When the operator changes one input, this engine computes which dependent
parameters need re-tuning, runs the orchestrator with the cascade, and returns
a diff showing the suggested adjustments.

**Dependency DAG (forward edges = "changes propagate to"):**

```
material         → all (refresh material baseline)
machine_type     → spindle_*, max_rpm, axis_accel/jerk, rigidity
spindle_taper    → holder_type compatibility
tool_diameter    → optimal RPM band, max DoC, holder gauge
tool_stickout    → max DoC (deflection ceiling), max feed (chatter ceiling)
holder_type      → TIR envelope, stickout limit, balance grade
operation        → cut_type, strategy, typical engagement
strategy         → fz adjustment (trochoidal scales fz down; HSM scales up)
coolant_type     → Vc multiplier (cryogenic ×1.4, dry ×0.6), tool_life multiplier
workholding     → max clamping force → max cutting force → max ap/ae
optimize_for     → re-run orchestrator with new objective
```

Implementation: `mcp-server/src/engines/AutoAdjustCascadeEngine.ts` (new). Pure
function over the OrchestratorInput type — given (oldInput, changedField, newValue),
returns (newInput, suggestedAdjustments[]). Wires as
`prism_calc:sf_auto_adjust` dispatcher action.

---

## 8. PrismEnhancedRecommenderEngine — cost-aware selection

Given the user's **available resources** (subset of machines, tools, holders,
fixtures, materials in stock) plus part requirements (geometry, tolerance,
surface finish, quantity, deadline), return the pareto-optimal selection across:

- **cost** (machine $/min × cycle time + tool cost / tool life cycles + setup amortized)
- **cycle time**
- **tool life remaining cycles**
- **surface quality risk** (probability Ra exceeds spec)
- **safety/chatter risk** (probability stability_assessment.zone ≠ stable)

Algorithm: NSGA-II over the catalog subset (existing `mcp-server/src/algorithms/MOO.ts`
already provides nsga2). Returns top-3 alternatives labeled (cheapest, fastest,
balanced) — same shape as `OrchestratorResult.alternatives[]` but selecting from
the available-resources subset, not the full catalog.

Implementation: `mcp-server/src/engines/PrismEnhancedRecommenderEngine.ts` (new).
Wires as `prism_calc:prism_enhanced_recommend` dispatcher action.

---

## 9. Execution plan (sliced for incremental delivery)

| Iteration | Deliverable                                                                                   | Token budget |
|-----------|----------------------------------------------------------------------------------------------|--------------|
| 1 (this)  | Design spec (this file) + check-in                                                            | small        |
| 2         | Backend variability matrix test (~5,300 cells via `mcp-server/src/__tests__/...test.ts`)     | medium       |
| 3         | `generate-sfc-variability-features.mjs` + regen-viz integration + 5,300 cached nodes emitted | medium       |
| 4         | `AutoAdjustCascadeEngine` + `sf_auto_adjust` dispatcher action + 30+ tests                   | medium       |
| 5         | `PrismEnhancedRecommenderEngine` + `prism_enhanced_recommend` action + 30+ tests             | medium       |
| 6         | Runtime cache lookup wiring + UI integration                                                  | small        |
| 7         | GNN training-feed verification + `NN-EVAL.json` re-grade (deploy gate)                       | small        |

Each iteration is its own `[SFC-ACCURACY-MS1]/U-*` commit. Per-file scrutiny gate
runs per iteration. End-of-task 3-of-3 gate runs at MS1 close.

---

## 10. Open questions for operator (check-in)

1. **Sampling density**: 5,300 cells is the proposed default. Acceptable, or go larger (e.g.
   10,000 for finer GNN training) / smaller (e.g. 2,500 for faster iteration)?
2. **Machine-type list**: Proposed 10 archetypes (VMC-3axis-std, VMC-3axis-high-rigidity,
   HMC-4axis, 5axis-trunnion, 5axis-swivel-head, bridge-mill, gantry, mill-turn, swiss, router).
   Add anything specific to JM Die's actual mix?
3. **Cache TTL**: Should cached cells expire (e.g. 90 days) when source physics constants
   change, or live forever as historical training samples?
4. **PRISM Enhanced billing**: Premium feature or always-on? (Affects whether
   `prism_enhanced_recommend` gates on a billing entitlement check.)
5. **AutoAdjust verbosity**: Each parameter change → suggest only top-3 most-impactful
   downstream adjustments, or surface the full cascade?
6. **Approve iteration 2 build kick-off**, or scope down further first?
