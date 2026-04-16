/**
 * SetupTransitionEngine — MF-MS3: Setup Transition + Predictive Failure + Force Capability
 *
 * Three sub-engines in a single file:
 *
 * 1. Setup Transition Analysis (analyzeSetupTransition):
 *    - Datum chain tolerance stack (RSS: σ_total = √Σtol_i²)
 *    - Flip/re-fixture feasibility (orientation stability, support area)
 *    - Pallet layout collision (envelope vs station clearance)
 *
 * 2. Predictive Failure Analysis (predictFailureProbability):
 *    - Monte Carlo N=500 trials with Box-Muller normal sampling
 *    - Kienzle force perturbation (Fc = kc1.1 × h^(1-mc) × ap × f)
 *    - Sensitivity analysis via variance decomposition
 *    - Per-operation failure risk map
 *
 * 3. Force Capability Analysis (analyzeForceCapability):
 *    - Power check: P = Fc × Vc / 60000 vs machine max
 *    - Torque check: T = Fc × D / 2000 vs torque curve
 *    - Thermal growth: δ_thermal = α × ΔT × L
 *    - Wear force increase: Fc_worn = Fc × (1 + 0.5 × VB/VB_max)
 *
 * References:
 *   - Kienzle (1952): Cutting force model
 *   - Box & Muller (1958): Normal variate generation
 *   - ISO 230-1: Machine tool accuracy
 *   - Montgomery (2019): SPC, 8th Ed — RSS tolerance stacking
 *
 * Actions: setup_transition_analyze, predictive_failure_mc, force_capability_analyze (calcDispatcher)
 *
 * @module SetupTransitionEngine
 */

// ─── Types: Setup Transition ────────────────────────────────────────────

export interface SetupConfig {
  fixture_type: string;             // "vise" | "chuck" | "plate" | "pallet" | "custom"
  datum: { x: number; y: number; z: number };
  part_orientation: "top" | "bottom" | "left" | "right" | "front" | "back";
  clamping_force_N?: number;
  support_area_mm2?: number;
  positioning_error_mm?: number;    // ±mm per datum transfer
  fixture_envelope?: { x: number; y: number; z: number }; // bounding box
}

export interface OperationBetween {
  id: string;
  type: string;
  tolerance_mm: number;
  datum_refs?: string[];            // which datum features this op references
  requires_flip?: boolean;
}

export interface SetupTransitionInput {
  current_setup: SetupConfig;
  next_setup: SetupConfig;
  operations_between: OperationBetween[];
  part_dimensions?: { x: number; y: number; z: number };
  pallet_station_clearance_mm?: number;  // available clearance in pallet station
  material_density_kg_m3?: number;       // for stability check
}

export interface SetupTransitionResult {
  feasible: boolean;
  datum_chain_error_mm: number;
  tolerance_stack_contribution: {
    operation_id: string;
    contribution_mm: number;
    pct_of_total: number;
  }[];
  collision_clearance_mm: number;
  flip_stability: {
    stable: boolean;
    support_ratio: number;          // support_area / footprint_area
    center_of_gravity_in_support: boolean;
  };
  warnings: string[];
  recommendations: string[];
}

// ─── Types: Predictive Failure ──────────────────────────────────────────

export interface PredictiveOperation {
  id: string;
  type: string;
  feasibility_score: number;        // 0-1 baseline
  cutting_force_N?: number;
  feed_mm_rev?: number;
  depth_mm?: number;
  speed_m_min?: number;
  tool_diameter_mm?: number;
  kc1_1?: number;                   // Kienzle specific cutting force
  mc?: number;                      // Kienzle exponent
}

export interface PredictiveFailureInput {
  operation_sequence: PredictiveOperation[];
  material_variability_pct?: number;  // default ±10%
  tool_wear_factor?: number;          // 0-1, current wear state
  force_variability_pct?: number;     // default ±15%
  wear_variability_pct?: number;      // default ±20%
  num_trials?: number;                // default 500
}

export interface FailureMode {
  operation_id: string;
  failure_type: string;
  frequency: number;                 // count of failures across trials
  probability: number;               // frequency / num_trials
  description: string;
}

export interface SensitivityFactor {
  parameter: string;
  variance_contribution_pct: number;
  rank: number;
}

export interface PredictiveFailureResult {
  success_probability: number;
  failure_modes_ranked: FailureMode[];
  sensitivity_analysis: SensitivityFactor[];
  risk_map: {
    operation_id: string;
    failure_probability: number;
    dominant_mode: string;
  }[];
  trials_run: number;
  mean_force_variation_pct: number;
  warnings: string[];
}

// ─── Types: Force Capability ────────────────────────────────────────────

export interface ForceCapabilityOperation {
  type: string;                      // "milling" | "turning" | "drilling"
  cutting_force_N: number;
  cutting_speed_m_min: number;
  feed_mm_rev?: number;
  depth_mm?: number;
  tool_diameter_mm: number;
  spindle_rpm?: number;
  kc1_1?: number;
  mc?: number;
}

export interface MachineCapability {
  max_power_kw: number;
  max_torque_nm: number;
  spindle_speed_range: [number, number]; // [min_rpm, max_rpm]
  torque_curve?: { rpm: number; torque_nm: number }[];  // torque vs RPM points
  max_feed_force_N?: number;
  rigidity_N_um?: number;            // machine stiffness
}

export interface AccumulatedState {
  thermal_growth_mm?: number;        // current thermal drift
  tool_wear_vb?: number;             // flank wear in mm
  vb_max?: number;                   // max allowable flank wear (default 0.3mm)
  thermal_coefficient?: number;      // α (default 11.7e-6 for steel)
  temperature_rise_C?: number;       // ΔT
  characteristic_length_mm?: number; // L for thermal expansion
}

export interface ForceCapabilityInput {
  operation: ForceCapabilityOperation;
  machine: MachineCapability;
  accumulated_state?: AccumulatedState;
}

export interface ForceCapabilityResult {
  feasible: boolean;
  power_required_kw: number;
  power_available_kw: number;
  power_utilization_pct: number;
  torque_required_nm: number;
  torque_available_nm: number;
  torque_utilization_pct: number;
  thermal_error_mm: number;
  force_increase_from_wear_pct: number;
  effective_cutting_force_N: number;
  limiting_factor: string;
  margin_of_safety: number;
  warnings: string[];
}

// ─── Box-Muller Normal Sampling ─────────────────────────────────────────

/**
 * Generate a standard normal variate using Box-Muller transform.
 * Uses the polar form for efficiency.
 */
function boxMullerNormal(mean: number = 0, stddev: number = 1): number {
  let u: number, v: number, s: number;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  const mul = Math.sqrt(-2.0 * Math.log(s) / s);
  return mean + stddev * u * mul;
}

/**
 * Seeded Box-Muller for deterministic testing.
 */
function seededBoxMuller(seed: number, mean: number = 0, stddev: number = 1): { value: number; nextSeed: number } {
  // Linear congruential generator
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  let s1 = ((a * seed + c) % m + m) % m;
  let s2 = ((a * s1 + c) % m + m) % m;

  // Convert to uniform [0,1)
  const u1 = s1 / m;
  const u2 = s2 / m;

  // Avoid log(0)
  const safe_u1 = Math.max(u1, 1e-10);

  // Box-Muller transform
  const z = Math.sqrt(-2 * Math.log(safe_u1)) * Math.cos(2 * Math.PI * u2);
  return { value: mean + stddev * z, nextSeed: s2 };
}

// ─── Kienzle Force Model ────────────────────────────────────────────────

/**
 * Kienzle cutting force: Fc = kc1.1 × h^(1-mc) × ap × f
 * Where h = chip thickness ≈ f × sin(κ), simplified to f for straight turning/milling.
 */
function kienzleForce(kc1_1: number, mc: number, feed_mm: number, depth_mm: number): number {
  const h = Math.max(feed_mm, 0.001); // chip thickness
  const kc = kc1_1 * Math.pow(h, -mc);  // specific cutting force
  return kc * h * depth_mm; // Fc = kc × b × h = kc × ap × f
}

// ─── Engine Class ───────────────────────────────────────────────────────

export class SetupTransitionEngine {
  // ─── 1. Setup Transition Analysis ───────────────────────────────────

  /**
   * Analyze feasibility of transitioning between two setups.
   * Checks datum chain tolerance stack (RSS), flip stability, and pallet collision.
   */
  analyzeSetupTransition(input: SetupTransitionInput): SetupTransitionResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // ── Datum Chain Tolerance Stack (RSS) ──
    // Each datum transfer adds positioning error; operations add their own tolerances
    const current_pos_err = input.current_setup.positioning_error_mm ?? 0.005;
    const next_pos_err = input.next_setup.positioning_error_mm ?? 0.005;

    // RSS: σ_total = sqrt(Σ tol_i²)
    const datum_transfer_error_sq = current_pos_err ** 2 + next_pos_err ** 2;

    const op_contributions: { operation_id: string; contribution_mm: number; pct_of_total: number }[] = [];
    let total_tol_sq = datum_transfer_error_sq;

    for (const op of input.operations_between) {
      const tol = op.tolerance_mm;
      // Each operation between setups contributes to the chain
      // Datum reference count amplifies error (more refs = more chain links)
      const datum_refs_count = op.datum_refs?.length ?? 1;
      const contribution = tol * Math.sqrt(datum_refs_count); // amplified by datum chain length
      total_tol_sq += contribution ** 2;
      op_contributions.push({
        operation_id: op.id,
        contribution_mm: contribution,
        pct_of_total: 0, // filled after total is known
      });
    }

    const datum_chain_error_mm = Math.sqrt(total_tol_sq);

    // Fill percentage contributions
    for (const c of op_contributions) {
      c.pct_of_total = total_tol_sq > 0
        ? ((c.contribution_mm ** 2) / total_tol_sq) * 100
        : 0;
    }

    // ── Flip Stability Check ──
    const part_dims = input.part_dimensions ?? { x: 100, y: 80, z: 50 };
    const support_area = input.next_setup.support_area_mm2 ??
      computeSupportArea(part_dims, input.next_setup.part_orientation);

    const footprint_area = computeFootprintArea(part_dims, input.next_setup.part_orientation);
    const support_ratio = footprint_area > 0 ? support_area / footprint_area : 0;

    // Check if center of gravity is within support polygon
    // Simplified: CG is at geometric center; stable if support_ratio > 0.3
    const cg_in_support = support_ratio >= 0.3;
    const flip_stable = support_ratio >= 0.25 && cg_in_support;

    if (!flip_stable) {
      warnings.push(`Flip stability insufficient: support ratio ${support_ratio.toFixed(2)} < 0.25 minimum`);
      recommendations.push("Consider adding soft jaws or custom fixture for better support");
    }

    if (support_ratio < 0.5 && support_ratio >= 0.25) {
      warnings.push(`Marginal support ratio ${support_ratio.toFixed(2)}. Risk of vibration during cutting`);
    }

    // ── Pallet/Fixture Collision Check ──
    const fixture_env = input.next_setup.fixture_envelope ?? { x: 150, y: 120, z: 80 };
    const station_clearance = input.pallet_station_clearance_mm ?? 25;

    // Collision clearance = station allowance - (fixture + part envelope)
    const part_envelope_max = Math.max(part_dims.x, part_dims.y, part_dims.z);
    const fixture_envelope_max = Math.max(fixture_env.x, fixture_env.y, fixture_env.z);
    const total_envelope = part_envelope_max + fixture_envelope_max;
    const collision_clearance_mm = station_clearance; // simplified; real check would use 3D AABB

    // If fixture+part are very large relative to station, warn
    if (total_envelope > 400) {
      warnings.push(`Large combined envelope (${total_envelope.toFixed(0)}mm). Verify pallet station clearance`);
    }

    if (collision_clearance_mm < 5) {
      warnings.push(`Collision clearance only ${collision_clearance_mm.toFixed(1)}mm — risk of interference`);
      recommendations.push("Increase pallet station spacing or reduce fixture height");
    }

    // ── Datum chain warning thresholds ──
    if (datum_chain_error_mm > 0.05) {
      warnings.push(`Datum chain error ${datum_chain_error_mm.toFixed(4)}mm exceeds 50µm threshold`);
      recommendations.push("Minimize datum transfers; use common datum where possible");
    }

    // ── Orientation change feasibility ──
    const orientation_change = input.current_setup.part_orientation !== input.next_setup.part_orientation;
    if (orientation_change) {
      const requires_flip = input.operations_between.some(op => op.requires_flip);
      if (!requires_flip) {
        warnings.push("Orientation changes without explicit flip requirement — verify intermediate datum integrity");
      }
    }

    // ── Fixture type compatibility ──
    if (input.current_setup.fixture_type !== input.next_setup.fixture_type) {
      recommendations.push(
        `Fixture change: ${input.current_setup.fixture_type} → ${input.next_setup.fixture_type}. ` +
        `Budget additional setup time`
      );
    }

    const feasible = flip_stable && collision_clearance_mm >= 2 && datum_chain_error_mm < 0.1;

    return {
      feasible,
      datum_chain_error_mm,
      tolerance_stack_contribution: op_contributions,
      collision_clearance_mm,
      flip_stability: {
        stable: flip_stable,
        support_ratio,
        center_of_gravity_in_support: cg_in_support,
      },
      warnings,
      recommendations,
    };
  }

  // ─── 2. Predictive Failure Analysis (Monte Carlo) ───────────────────

  /**
   * Monte Carlo simulation to predict probability of sequence success.
   * Perturbs force (±15%), material (±10%), tool wear (±20%) across N=500 trials.
   * Uses Box-Muller normal sampling and Kienzle force propagation.
   */
  predictFailureProbability(input: PredictiveFailureInput): PredictiveFailureResult {
    const warnings: string[] = [];
    const N = input.num_trials ?? 500;
    const force_var = (input.force_variability_pct ?? 15) / 100;
    const mat_var = (input.material_variability_pct ?? 10) / 100;
    const wear_var = (input.wear_variability_pct ?? 20) / 100;
    const base_wear = input.tool_wear_factor ?? 0.0;

    const ops = input.operation_sequence;
    if (ops.length === 0) {
      return {
        success_probability: 1,
        failure_modes_ranked: [],
        sensitivity_analysis: [],
        risk_map: [],
        trials_run: 0,
        mean_force_variation_pct: 0,
        warnings: ["Empty operation sequence"],
      };
    }

    // Track failures per operation and per mode
    const op_failures: Map<string, number> = new Map();
    const mode_tracker: Map<string, { count: number; op_id: string; type: string; desc: string }> = new Map();
    let total_successes = 0;

    // For sensitivity: run separate sweeps per parameter
    const force_only_failures: number[] = [];
    const mat_only_failures: number[] = [];
    const wear_only_failures: number[] = [];

    let total_force_deltas = 0;
    let force_delta_count = 0;

    for (let trial = 0; trial < N; trial++) {
      let all_pass = true;

      // Sample perturbations for this trial
      const force_perturbation = boxMullerNormal(1.0, force_var / 3); // 3σ = ±force_var
      const mat_perturbation = boxMullerNormal(1.0, mat_var / 3);
      const wear_perturbation = boxMullerNormal(base_wear, wear_var / 3 * Math.max(base_wear, 0.1));

      total_force_deltas += Math.abs(force_perturbation - 1.0);
      force_delta_count++;

      for (const op of ops) {
        // Compute perturbed force using Kienzle if params available
        let perturbed_force: number;
        if (op.kc1_1 && op.mc && op.feed_mm_rev && op.depth_mm) {
          const perturbed_kc = op.kc1_1 * mat_perturbation;
          const perturbed_feed = (op.feed_mm_rev ?? 0.1) * force_perturbation;
          perturbed_force = kienzleForce(perturbed_kc, op.mc, perturbed_feed, op.depth_mm);
        } else {
          // Fallback: scale base cutting force
          const base_force = op.cutting_force_N ?? 500;
          perturbed_force = base_force * force_perturbation * mat_perturbation;
        }

        // Wear effect: increase force by wear factor
        const wear_factor = 1 + 0.5 * Math.max(wear_perturbation, 0);
        perturbed_force *= wear_factor;

        // Check feasibility: op passes if perturbed score stays above threshold
        const base_score = op.feasibility_score;
        // Force increase degrades feasibility: score_perturbed = base_score / force_ratio
        const nominal_force = op.cutting_force_N ?? 500;
        const force_ratio = nominal_force > 0 ? perturbed_force / nominal_force : 1;
        const perturbed_score = base_score / Math.max(force_ratio, 0.1);

        const threshold = 0.5; // minimum feasibility score to pass
        if (perturbed_score < threshold) {
          all_pass = false;
          op_failures.set(op.id, (op_failures.get(op.id) ?? 0) + 1);

          // Classify failure mode
          let mode_type = "force_exceeded";
          let desc = `Force ratio ${force_ratio.toFixed(2)}x degraded feasibility below threshold`;
          if (wear_perturbation > 0.5) {
            mode_type = "tool_wear_critical";
            desc = `Tool wear VB=${wear_perturbation.toFixed(3)} caused excessive force increase`;
          } else if (mat_perturbation > 1.15) {
            mode_type = "material_hard_spot";
            desc = `Material variation (+${((mat_perturbation - 1) * 100).toFixed(0)}%) increased cutting force`;
          }

          const key = `${op.id}:${mode_type}`;
          const existing = mode_tracker.get(key);
          if (existing) {
            existing.count++;
          } else {
            mode_tracker.set(key, { count: 1, op_id: op.id, type: mode_type, desc });
          }
        }
      }

      if (all_pass) total_successes++;
    }

    // ── Build results ──

    const success_probability = total_successes / N;

    // Failure modes ranked by frequency
    const failure_modes_ranked: FailureMode[] = Array.from(mode_tracker.entries())
      .map(([, v]) => ({
        operation_id: v.op_id,
        failure_type: v.type,
        frequency: v.count,
        probability: v.count / N,
        description: v.desc,
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // Risk map: per-op failure probability
    const risk_map = ops.map(op => {
      const failures = op_failures.get(op.id) ?? 0;
      const op_modes = failure_modes_ranked.filter(m => m.operation_id === op.id);
      return {
        operation_id: op.id,
        failure_probability: failures / N,
        dominant_mode: op_modes.length > 0 ? op_modes[0].failure_type : "none",
      };
    });

    // ── Sensitivity Analysis (variance-based) ──
    // Run 3 separate sweeps: perturb only one parameter at a time
    const sensitivity_failures = {
      force: 0,
      material: 0,
      wear: 0,
    };

    const SENS_TRIALS = Math.min(N, 200);
    for (let t = 0; t < SENS_TRIALS; t++) {
      // Force-only
      const fp = boxMullerNormal(1.0, force_var / 3);
      let force_fail = false;
      let mat_fail = false;
      let wear_fail = false;

      for (const op of ops) {
        const nominal = op.cutting_force_N ?? 500;
        // Force only
        const f1 = nominal * fp;
        if (op.feasibility_score / Math.max(f1 / nominal, 0.1) < 0.5) force_fail = true;

        // Material only
        const mp = boxMullerNormal(1.0, mat_var / 3);
        const f2 = nominal * mp;
        if (op.feasibility_score / Math.max(f2 / nominal, 0.1) < 0.5) mat_fail = true;

        // Wear only
        const wp = boxMullerNormal(base_wear, wear_var / 3 * Math.max(base_wear, 0.1));
        const wf = 1 + 0.5 * Math.max(wp, 0);
        const f3 = nominal * wf;
        if (op.feasibility_score / Math.max(f3 / nominal, 0.1) < 0.5) wear_fail = true;
      }

      if (force_fail) sensitivity_failures.force++;
      if (mat_fail) sensitivity_failures.material++;
      if (wear_fail) sensitivity_failures.wear++;
    }

    const total_sens = sensitivity_failures.force + sensitivity_failures.material + sensitivity_failures.wear;
    const sensitivity_analysis: SensitivityFactor[] = [
      { parameter: "cutting_force", variance_contribution_pct: total_sens > 0 ? (sensitivity_failures.force / total_sens) * 100 : 33.3, rank: 0 },
      {
        parameter: "material_properties",
        variance_contribution_pct: total_sens > 0
          ? (sensitivity_failures.material / total_sens) * 100 : 33.3,
        rank: 0,
      },
      { parameter: "tool_wear", variance_contribution_pct: total_sens > 0 ? (sensitivity_failures.wear / total_sens) * 100 : 33.3, rank: 0 },
    ].sort((a, b) => b.variance_contribution_pct - a.variance_contribution_pct);

    sensitivity_analysis.forEach((s, i) => { s.rank = i + 1; });

    // ── Warnings ──
    if (success_probability < 0.9) {
      warnings.push(`Low success probability ${(success_probability * 100).toFixed(1)}% — consider reducing aggressiveness`);
    }
    if (success_probability < 0.5) {
      warnings.push("CRITICAL: More than 50% of trials fail. Process redesign recommended");
    }

    const highest_risk = risk_map.reduce((max, r) => r.failure_probability > max.failure_probability ? r : max, risk_map[0]);
    if (highest_risk && highest_risk.failure_probability > 0.2) {
      warnings.push(`Operation '${highest_risk.operation_id}' has ${(highest_risk.failure_probability * 100).toFixed(0)}% failure risk`);
    }

    return {
      success_probability,
      failure_modes_ranked,
      sensitivity_analysis,
      risk_map,
      trials_run: N,
      mean_force_variation_pct: force_delta_count > 0 ? (total_force_deltas / force_delta_count) * 100 : 0,
      warnings,
    };
  }

  // ─── 3. Force Capability Analysis ───────────────────────────────────

  /**
   * Check if machine has sufficient power/torque for the operation,
   * accounting for thermal growth and tool wear force increase.
   */
  analyzeForceCapability(input: ForceCapabilityInput): ForceCapabilityResult {
    const { operation, machine, accumulated_state } = input;
    const warnings: string[] = [];

    const state = accumulated_state ?? {};
    const vb = state.tool_wear_vb ?? 0;
    const vb_max = state.vb_max ?? 0.3;
    const alpha = state.thermal_coefficient ?? 11.7e-6; // steel CTE
    const delta_T = state.temperature_rise_C ?? 0;
    const char_length = state.characteristic_length_mm ?? 300;

    // ── Thermal Growth ──
    // δ_thermal = α × ΔT × L
    const thermal_error_mm = alpha * delta_T * char_length;

    // ── Tool Wear Force Increase ──
    // Fc_worn = Fc × (1 + 0.5 × VB / VB_max)
    const wear_factor = vb_max > 0 ? 1 + 0.5 * (vb / vb_max) : 1;
    const force_increase_from_wear_pct = (wear_factor - 1) * 100;
    const effective_force_N = operation.cutting_force_N * wear_factor;

    // ── Kienzle recalculation if params available ──
    let computed_force = effective_force_N;
    if (operation.kc1_1 && operation.mc && operation.feed_mm_rev && operation.depth_mm) {
      const base_kienzle = kienzleForce(operation.kc1_1, operation.mc, operation.feed_mm_rev, operation.depth_mm);
      computed_force = base_kienzle * wear_factor;
    }

    // ── Power Check ──
    // P = Fc × Vc / 60000 (kW)
    const Vc = operation.cutting_speed_m_min;
    const power_required_kw = (computed_force * Vc) / 60000;
    const power_available_kw = machine.max_power_kw;
    const power_utilization_pct = power_available_kw > 0 ? (power_required_kw / power_available_kw) * 100 : 100;

    // ── Torque Check ──
    // T = Fc × D / 2000 (Nm)
    const D = operation.tool_diameter_mm;
    const torque_required_nm = (computed_force * D) / 2000;

    // Get available torque at current RPM from torque curve
    const rpm = operation.spindle_rpm ??
      (Vc > 0 && D > 0 ? (Vc * 1000) / (Math.PI * D) : 1000);

    let torque_available_nm = machine.max_torque_nm;
    if (machine.torque_curve && machine.torque_curve.length >= 2) {
      torque_available_nm = interpolateTorqueCurve(machine.torque_curve, rpm);
    }

    const torque_utilization_pct = torque_available_nm > 0 ? (torque_required_nm / torque_available_nm) * 100 : 100;

    // ── Feed Force Check ──
    if (machine.max_feed_force_N && computed_force * 0.4 > machine.max_feed_force_N) {
      warnings.push(`Feed force ~${(computed_force * 0.4).toFixed(0)}N may exceed machine limit ${machine.max_feed_force_N}N`);
    }

    // ── RPM Range Check ──
    if (rpm < machine.spindle_speed_range[0]) {
      warnings.push(`Required RPM ${rpm.toFixed(0)} below machine minimum ${machine.spindle_speed_range[0]}`);
    }
    if (rpm > machine.spindle_speed_range[1]) {
      warnings.push(`Required RPM ${rpm.toFixed(0)} exceeds machine maximum ${machine.spindle_speed_range[1]}`);
    }

    // ── Thermal warnings ──
    if (thermal_error_mm > 0.01) {
      warnings.push(`Thermal growth ${(thermal_error_mm * 1000).toFixed(1)}µm may affect tight tolerances`);
    }
    if (thermal_error_mm > 0.05) {
      warnings.push(`CRITICAL thermal growth ${(thermal_error_mm * 1000).toFixed(1)}µm — implement thermal compensation`);
    }

    // ── Wear warnings ──
    if (vb > vb_max * 0.8) {
      warnings.push(`Tool wear VB=${vb.toFixed(3)}mm approaching limit ${vb_max}mm (${((vb / vb_max) * 100).toFixed(0)}%)`);
    }
    if (vb >= vb_max) {
      warnings.push("Tool wear at maximum — tool change required before this operation");
    }

    // ── Determine limiting factor ──
    let limiting_factor = "none";
    const utilizations = [
      { name: "power", pct: power_utilization_pct },
      { name: "torque", pct: torque_utilization_pct },
    ];

    if (thermal_error_mm > 0.01) {
      utilizations.push({ name: "thermal_growth", pct: thermal_error_mm * 10000 }); // scale for comparison
    }
    if (vb >= vb_max) {
      utilizations.push({ name: "tool_wear", pct: 150 }); // always critical
    }

    const worst = utilizations.reduce((max, u) => u.pct > max.pct ? u : max, utilizations[0]);
    limiting_factor = worst.pct > 80 ? worst.name : "none";

    const feasible = power_utilization_pct <= 100 &&
      torque_utilization_pct <= 100 &&
      vb < vb_max &&
      rpm >= machine.spindle_speed_range[0] &&
      rpm <= machine.spindle_speed_range[1];

    // Margin of safety: how much headroom (lowest utilization inverse)
    const max_util = Math.max(power_utilization_pct, torque_utilization_pct);
    const margin_of_safety = max_util > 0 ? (100 - max_util) / max_util : 1;

    return {
      feasible,
      power_required_kw,
      power_available_kw,
      power_utilization_pct,
      torque_required_nm,
      torque_available_nm,
      torque_utilization_pct,
      thermal_error_mm,
      force_increase_from_wear_pct,
      effective_cutting_force_N: computed_force,
      limiting_factor,
      margin_of_safety,
      warnings,
    };
  }

  // ─── Unified calculate() dispatcher ─────────────────────────────────

  calculate(action: string, params: Record<string, any>): any {
    switch (action) {
      case "setup_transition_analyze":
        return this.analyzeSetupTransition(params as SetupTransitionInput);
      case "predictive_failure_mc":
        return this.predictFailureProbability(params as PredictiveFailureInput);
      case "force_capability_analyze":
        return this.analyzeForceCapability(params as ForceCapabilityInput);
      default:
        throw new Error(`SetupTransitionEngine: unknown action '${action}'`);
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Compute support area for a given orientation (simplified rectangular projection).
 */
function computeSupportArea(dims: { x: number; y: number; z: number }, orientation: string): number {
  switch (orientation) {
    case "top":
    case "bottom":
      return dims.x * dims.y;
    case "left":
    case "right":
      return dims.y * dims.z;
    case "front":
    case "back":
      return dims.x * dims.z;
    default:
      return dims.x * dims.y;
  }
}

/**
 * Compute footprint area (area touching the fixture surface).
 */
function computeFootprintArea(dims: { x: number; y: number; z: number }, orientation: string): number {
  // Same as support area for rectangular stock — in reality fixture jaws reduce this
  return computeSupportArea(dims, orientation);
}

/**
 * Linear interpolation of torque curve at given RPM.
 */
function interpolateTorqueCurve(curve: { rpm: number; torque_nm: number }[], rpm: number): number {
  if (curve.length === 0) return 0;
  if (rpm <= curve[0].rpm) return curve[0].torque_nm;
  if (rpm >= curve[curve.length - 1].rpm) return curve[curve.length - 1].torque_nm;

  for (let i = 0; i < curve.length - 1; i++) {
    if (rpm >= curve[i].rpm && rpm <= curve[i + 1].rpm) {
      const t = (rpm - curve[i].rpm) / (curve[i + 1].rpm - curve[i].rpm);
      return curve[i].torque_nm +
        t * (curve[i + 1].torque_nm - curve[i].torque_nm);
    }
  }
  return curve[curve.length - 1].torque_nm;
}

// ─── Singleton Export ───────────────────────────────────────────────────

export const setupTransitionEngine = new SetupTransitionEngine();
