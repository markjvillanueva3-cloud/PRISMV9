# F360-FULL Process Planning Coverage Audit
## Date: 2026-04-03

## Engines Inspected
- `GenerativeProcessEngine.ts` — primary process plan generator (feature→setup→op→cost)
- `OperationSequencerEngine.ts` — dependency graph + topological sort + thermal relaxation
- `MachiningPlaybookEngine.ts` — 305 rules (includes surface_treatment, gdt, datum, grinding, edm categories)
- `MultiSetupFeasibilityChainEngine.ts` — Monte Carlo datum chain, branch-and-bound setup ordering
- `AutoProgramOrchestratorEngine.ts` — 10-stage F360 pipeline (S1=model intake → S10=output)
- `HeatTreatmentResponseEngine.ts` — TTT-based property predictor (HRC, distortion risk, recommendations)
- `AnodizeAllowanceEngine.ts` — dimensional compensation per anodize type
- `PlatingAllowanceEngine.ts` — stock allowance for hard chrome, EN, zinc, PVD, etc.
- `SecondaryOpsPipelineEngine.ts` — deburr, probe, engrave, wash (NOT heat treat/grind/plate routing)

---

## SCORES & ANALYSIS

### 1. Process Plan Generation — Score: 62/100 | Gap Severity: HIGH

**What exists:**
- `GenerativeProcessEngine` recognizes 10 feature types and sequences
  rough → semi-finish → finish per feature, assigns tools, estimates cycle time and cost.
- `OperationSequencerEngine` applies topological sort with implicit rules:
  drill→thread, roughing→finishing within same setup, thermal relaxation insertion.
- `MachiningPlaybookEngine` has rules in sequencing, datum, finishing, roughing, hole_making,
  deburring categories that correctly encode face → rough → semi → holes → thread → finish → deburr.
- `AutoProgramOrchestratorEngine` stage S4 ("process_planning") calls the sequencer.

**Critical gaps:**
- `GenerativeProcessEngine.OperationPhase` only has 3 phases: roughing, semi_finishing, finishing.
  There is no "face_op" phase and no explicit first-operation facing step. The engine does not
  guarantee the part is faced flat before any other operation — it infers setup direction but
  never inserts a face milling operation as step 0 automatically.
- `FeatureType` has no "face" feature type that triggers auto face mill selection. It must be
  manually included or inferred from a flat surface, which is not modeled.
- `OperationSequencerEngine.OperationType` does not include "face" as a type — TYPE_PRIORITY
  starts at drill=1, no face operation before it. Face milling should be priority 0.
- No "spot drill" in the sequencer's OperationType — it is implied within drill but not
  enforced as a mandatory precursor for holes in harder materials.
- Deburr phase is correct in the playbook rules but GenerativeProcessEngine does not auto-insert
  a deburr operation unless explicitly called — it is missing from auto-generated op lists.

**Fix Recommendations:**
1. Add `"face"` to `OperationType` in `OperationSequencerEngine` with `TYPE_PRIORITY.face = 0`.
2. Add `"face_op"` to `OperationPhase` in `GenerativeProcessEngine`; auto-insert a face mill
   operation as first planned operation for any part with a flat primary datum surface.
3. Add `"spot_drill"` to `OperationType` and make it an implicit prerequisite for any drill op
   when `tool_diameter > 6mm || material === 'steel'`.
4. Auto-insert a deburr/chamfer operation at the end of each setup in `generatePlan()`.

---

### 2. Setup Minimization — Score: 74/100 | Gap Severity: MEDIUM

**What exists:**
- `MultiSetupFeasibilityChainEngine` groups features by `requires_access_from` direction,
  branch-and-bounds over setup sequences, computes datum chain RSS error (Monte Carlo N=500),
  detects dead-end features (inaccessible given available setups).
- `GenerativeProcessEngine` groups by `access_direction` to form setups, assigns WCS G54-G59,
  and minimizes setups by collapsing features with the same access direction.
- `OperationSequencerEngine` groups by `setup_id` and runs greedy TSP within each group.
- `MachiningPlaybookEngine` has datum category rules including 3-2-1 locating, datum transfer
  via dowel holes, and "establish datums before features" enforced on tolerance < 0.05mm.
- F360-FULL roadmap specifies 5-axis positional (3+2) to collapse multiple setups into one —
  `AutoProgramOrchestratorEngine` models `five_axis_3plus2` and routes features accordingly.

**Gaps:**
- `MultiSetupFeasibilityChainEngine` does not have a "force single-setup" flag that the
  caller can trigger when GD&T positional callouts are tighter than the datum chain error
  budget. The datum chain error is computed and reported but never used to block a multi-setup
  plan or suggest single-setup alternatives.
- No feature accessibility cone analysis — "accessible from top" is a string tag, not a
  geometric computation. If the roadmap adds 3D model ingestion via F360 B-Rep, cone
  analysis should be added here.
- Custom fixture suggestion is advisory only (fixture_type is a string label in Setup,
  not linked to `FixtureDesignEngine` or `ModularFixtureLayoutEngine`).

**Fix Recommendations:**
1. Add `force_single_setup_threshold_mm?: number` to `AnalyzeFeasibilityInput`. When
   `datum_chain_error_mm > threshold`, automatically re-run with a 5-axis single-setup
   configuration and report both options.
2. Wire `MultiSetupFeasibilityChainEngine` result into `AutoProgramOrchestratorEngine`
   stage S4 — currently S4 uses `OperationSequencerEngine` alone; the feasibility chain
   should gate setup count decisions.
3. Add a callback from `GenerativeProcessEngine.planSetups()` to `FixtureDesignEngine`
   to convert the `fixture_type` string into a physical fixture BOM suggestion.

---

### 3. Heat Treatment Integration — Score: 28/100 | Gap Severity: CRITICAL

**What exists:**
- `HeatTreatmentResponseEngine` is a solid isolated engine: predicts HRC, distortion risk,
  retained austenite, grain size change, and gives pre/post recs for 8 process types
  (through_harden, carburize, nitride, induction_harden, etc.).
- `MachiningPlaybookEngine` has a `surface_treatment` category with two relevant rules:
  "Add grinding stock for heat treat distortion" (0.05–0.10mm/side) and
  "Machine stress-relief features before heat treatment."
- `AnodizeAllowanceEngine` and `PlatingAllowanceEngine` correctly compute pre-coating
  dimensional targets.
- `MachiningPlaybookEngine` sequence map includes `heat_treat` as a step between
  `edm_finish` and `surface_treat` in its canonical operation ordering array.

**Critical gaps — this is the biggest process planning gap:**
- `GenerativeProcessEngine`, `OperationSequencerEngine`, and `AutoProgramOrchestratorEngine`
  have NO concept of heat treatment as a routing interruption. The process plan is a single
  linear sequence of CNC operations. There is no mechanism to split the plan into:
  - Phase A: pre-hardening machining with hardening stock left
  - Routing step: "SEND TO HEAT TREAT — target 58-62 HRC, grind stock 0.1mm/side"
  - Phase B: post-hardening machining (hard turning, grinding, EDM)
- `OperationType` in `OperationSequencerEngine` has no `"heat_treat"` type, so the
  sequencer cannot place a heat treat node in the dependency graph.
- `HeatTreatmentResponseEngine` outputs are never consumed by the process planner to
  adjust pre-hardening stock (grind allowance) or select post-hardening operations
  (CBN tools, grinding, EDM rather than carbide milling).
- No "routing step" concept exists anywhere in the process plan data structures. All
  operations assume CNC machine time.

**Fix Recommendations:**
1. Add `"heat_treat" | "stress_relieve" | "normalize" | "send_to_subcontract"` to
   `OperationType` in `OperationSequencerEngine`. These are zero-time placeholder nodes
   in the dependency graph that enforce sequencing but generate no G-code.
2. Add a `RoutingStep` interface to `GenerativeProcessEngine.ProcessPlan`:
   ```typescript
   interface RoutingStep {
     step_type: "machine" | "heat_treat" | "grind" | "plate" | "anodize" | "inspect" | "ship_to_sub";
     description: string;
     vendor?: string;
     lead_time_days?: number;
     dimensional_change_mm?: number; // consumed from HeatTreatmentResponseEngine
     stock_allowance_mm?: number;
   }
   ```
3. When `input.material` is hardenable steel (4140, D2, H13, M2, etc.) AND the part
   has tolerance < 0.025mm or surface finish Ra < 0.4um, auto-insert a heat treat
   routing step between pre-harden and post-harden phases in `generatePlan()`.
4. Call `HeatTreatmentResponseEngine.predict()` during plan generation to:
   - Set `stock_allowance_mm` (distortion compensation per "Add grinding stock" playbook rule)
   - Select post-hardening operation type: if HRC > 45 → switch from end mill to CBN/grinding/EDM
5. The F360-FULL roadmap (setup intelligence + physics analysis per operation) should
   explicitly model this in the AutoProgramOrchestrator S4 stage.

---

### 4. Secondary Operations Planning — Score: 44/100 | Gap Severity: HIGH

**What exists:**
- `SecondaryOpsPipelineEngine` handles deburr, probe, engrave, wash, part flip, ATC tool
  breakage check — all in-machine CNC secondary ops. It generates G-code blocks.
- `AnodizeAllowanceEngine` computes dimensional compensation for Type I/II/III anodize.
- `PlatingAllowanceEngine` computes stock for hard chrome, EN, zinc, cadmium, PVD.
- `GrindingProgramAssemblerEngine` is a full pipeline for cylindrical, surface, and
  centerless grinding (5 types, 6 dialects).
- `EDMProgramAssemblerEngine` is production-ready for wire/sinker/micro EDM.
- `MachiningPlaybookEngine` has `grinding`, `edm`, and `surface_treatment` rule categories.

**Gaps:**
- There is no `RoutingSheet` or `TravelerDocument` concept that chains:
  machine → deburr → inspect → heat treat → grind → plate → final inspect → ship.
  The `ProcessPlan` output from `GenerativeProcessEngine` is machining-only.
- `AnodizeAllowanceEngine` and `PlatingAllowanceEngine` are standalone calculators.
  They are not integrated into `GenerativeProcessEngine` or `AutoProgramOrchestratorEngine`
  so that the pre-plate/pre-anodize machined dimension is automatically back-calculated
  into the process plan.
- `GrindingProgramAssemblerEngine` and `EDMProgramAssemblerEngine` are standalone pipelines —
  no mechanism exists to invoke them as ordered steps within a multi-process routing.
- No vendor routing step (outsource to heat treat shop, plate shop, grinding sub).
- `SecondaryOpsPipelineEngine` scope is limited to in-machine operations; there is no
  "off-machine secondary" pipeline for shot peening, passivation, painting, etc.
  (individual engines exist: `ShotPeeningEngine`, `PassivationEngine` — not wired to routing).

**Fix Recommendations:**
1. Create a `RoutingSheetEngine` (or extend `SetupSheetEngine`) that outputs a full
   traveler document: ordered routing steps with operation type, machine/vendor,
   estimated time, dimensional state at each step.
2. Wire `AnodizeAllowanceEngine` and `PlatingAllowanceEngine` into `GenerativeProcessEngine`:
   when `output.surface_treatment` includes anodize/plate, back-calculate pre-treatment
   dimensions and insert them as machining target overrides.
3. Add a `SecondaryRoutingStep` concept in `ProcessPlan` that references external
   ops: `{ type: "grind", engine: "GrindingProgramAssemblerEngine", params: {...} }`.
4. Wire `ShotPeeningEngine` and `PassivationEngine` into the routing step chain for
   aerospace/medical parts where these are mandatory sequence steps.

---

### 5. Tolerance-Driven Sequencing — Score: 55/100 | Gap Severity: HIGH

**What exists:**
- `MultiSetupFeasibilityChainEngine` computes `datum_chain_error_mm` via Monte Carlo RSS
  and reports it — tight-tolerance features with `tolerance < 0.025mm` score higher risk.
- `MachiningPlaybookEngine` rule "Establish datums before features" fires on
  `tolerance_below: 0.05mm`; rule "Never re-machine a datum surface" is `always`.
- `OperationSequencerEngine` respects explicit `OrderingConstraint` objects from callers,
  and implicit rough→finish, drill→thread ordering.
- `GenerativeProcessEngine` sets `complexity = "complex"` for `tolerance < 0.01mm` and
  flags `requires_special_tooling = true`.

**Gaps:**
- `MultiSetupFeasibilityChainEngine.datum_chain_error_mm` is computed but never fed back
  into `OperationSequencerEngine` to add mandatory single-setup constraints. The two
  engines are computationally independent — no wire between them.
- GD&T callout parsing does not exist. The system accepts `tolerance_mm` as a scalar but
  has no model for: positional tolerance (requires datum A|B|C reference frame),
  parallelism, perpendicularity, concentricity, or runout. These drive fundamentally
  different sequencing decisions (e.g., concentricity → single chucking; runout → turn
  OD and bore in same setup).
- No "true position" budget allocation across setups — the Monte Carlo in
  `MultiSetupFeasibilityChainEngine` does RSS of positioning errors but does not
  allocate the GD&T tolerance budget across contributors (machine accuracy +
  fixture repeatability + datum shift + thermal).
- `GenerativeProcessEngine` does not escalate to 5-axis single-setup for tight-tolerance
  parts automatically — machine_type is a caller-supplied parameter, not auto-selected.

**Fix Recommendations:**
1. Add GD&T callout types to `FeatureInput`:
   ```typescript
   gdt_callouts?: Array<{
     type: "position" | "parallelism" | "perpendicularity" | "concentricity" | "runout" | "flatness";
     tolerance_mm: number;
     datum_refs: string[];  // e.g. ["A", "B", "C"]
   }>;
   ```
2. In `GenerativeProcessEngine.planSetups()`, if any feature has a positional or
   concentricity callout ≤ 0.025mm, force `single_setup = true` for those features
   and emit a warning if the machine datum chain error exceeds the callout value.
3. Wire `MultiSetupFeasibilityChainEngine.datum_chain_error_mm` into
   `OperationSequencerEngine` as an auto-generated `OrderingConstraint`:
   "All features sharing datum A must be machined in setup 1 (datum chain budget exhausted)."
4. Add tolerance budget allocation using RSS: `T_gdt = √(T_machine² + T_fixture² + T_datum_shift²)`.
   If `T_gdt > tolerance_mm`, force single-setup and emit CRITICAL warning.

---

### 6. Time/Cost Estimation per Operation — Score: 58/100 | Gap Severity: MEDIUM

**What exists:**
- `GenerativeProcessEngine` produces:
  - `PlannedOperation.estimated_time_min` per operation (material-adjusted MRR formula)
  - `CostBreakdown`: machine_time_cost, tool_cost, fixture_cost, material_cost, setup_cost
  - Batch cost (total_batch_usd), per-part cost
  - Hard-coded SHOP_RATE = $185/hr, SETUP_TIME_MIN = 20 min (flat for all setups)
- `AutoProgramOrchestratorEngine` stage S10 includes cost estimate in output package.
- `QuoteEstimatorEngine`, `InstantQuoteEngine`, `MultiProcessQuoteEngine` exist as
  standalone quote engines (not wired into process planning flow).

**Gaps:**
- `SETUP_TIME_MIN = 20` is a flat constant regardless of setup complexity.
  A 5-axis fixture setup on a tombstone takes 90–180 min; a simple vise re-setup is 5 min.
  No fixture_type-based setup time model exists.
- Tool cost is `operations.length × $0.50` — this is a placeholder, not a
  real tool life/cost model. `ToolWearProgressionEngine` and `StochasticToolLifeEngine`
  exist but are not called from `GenerativeProcessEngine`.
- No per-operation breakdown that is quote-ready: there is no "operation card" with
  setup_time + run_time + tool_cost + inspection_time for each step separately.
  The cost breakdown is at plan level, not operation level.
- `SHOP_RATE` is hard-coded; `MachineRegistry` has actual machine hourly rates for
  910 machines but `GenerativeProcessEngine` does not look up the machine rate.
- Secondary ops (heat treat, grinding, plating) have no cost line items in the estimate.
  These are often 20–40% of total part cost for hardened precision parts.
- No setup time model for custom fixtures vs. modular fixtures vs. soft jaws.

**Fix Recommendations:**
1. Add `setup_time_min_by_type: Record<fixture_type, number>` lookup:
   vise=10, soft_jaws=20, custom_fixture=60, tombstone=120, 4th_axis=90.
   Replace flat `SETUP_TIME_MIN` constant with a fixture-type-aware lookup.
2. Wire `ToolWearProgressionEngine` (or at minimum Taylor tool life) into per-operation
   tool cost: `tool_cost_per_op = tool_price / (T_taylor × operations_per_edge)`.
3. Add `cost_per_operation: Array<{ op_id, setup_time_usd, run_time_usd, tool_usd }>`
   to `ProcessPlan` output for operation-level quoting.
4. Look up `machine_rate_usd_hr` from `MachineRegistry` based on `machine_type` input
   instead of hard-coding $185/hr.
5. Add secondary ops cost line items to `CostBreakdown`:
   `heat_treat_usd`, `grinding_usd`, `plating_usd`, `inspection_usd`.

---

## Summary Table

| Criterion                         | Score | Severity | Primary Engines              |
|-----------------------------------|-------|----------|------------------------------|
| 1. Process Plan Generation        | 62    | HIGH     | GenerativeProcessEngine, OperationSequencerEngine |
| 2. Setup Minimization             | 74    | MEDIUM   | MultiSetupFeasibilityChainEngine, GenerativeProcessEngine |
| 3. Heat Treatment Integration     | 28    | CRITICAL | HeatTreatmentResponseEngine (isolated, unwired) |
| 4. Secondary Operations Planning  | 44    | HIGH     | SecondaryOpsPipelineEngine (in-machine only) |
| 5. Tolerance-Driven Sequencing    | 55    | HIGH     | MultiSetupFeasibilityChainEngine (unwired to sequencer) |
| 6. Time/Cost Estimation           | 58    | MEDIUM   | GenerativeProcessEngine (flat constants, no op-level) |

## Priority Fix Order (for F360-FULL Roadmap Integration)

1. **CRITICAL — Heat Treatment Routing (Score 28):**
   Add `RoutingStep` to `ProcessPlan`, `"heat_treat"` to `OperationType`, wire
   `HeatTreatmentResponseEngine` into pre/post split logic in `generatePlan()`.

2. **HIGH — Secondary Ops Routing (Score 44):**
   Create `RoutingSheetEngine` or extend `SetupSheetEngine` to chain grinding/EDM/
   plate/anodize as ordered routing steps with dimensional state tracking.

3. **HIGH — Process Plan Completeness (Score 62):**
   Add `"face"` op type at priority 0, auto-insert deburr, enforce spot drill precursor.

4. **HIGH — Tolerance-Driven Sequencing (Score 55):**
   Add GD&T callout types to `FeatureInput`, wire datum chain error budget into
   `OperationSequencerEngine` constraints, auto-escalate to single-setup on tight pos tol.

5. **MEDIUM — Cost Estimation (Score 58):**
   Fixture-type setup time lookup, Taylor tool cost, op-level cost card, MachineRegistry rate lookup.

6. **MEDIUM — Setup Minimization (Score 74):**
   Wire `MultiSetupFeasibilityChainEngine` into S4 of `AutoProgramOrchestratorEngine`,
   add `force_single_setup_threshold_mm`.
