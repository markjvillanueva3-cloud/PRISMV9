/**
 * orchestrator-input-adapter -- SFC CONVERGENCE P1 (slot:oscar, operator-approved 2026-06-21).
 *
 * Pure adapter `OrchestratorInput -> UltimateSpeedFeedInput`. The operator-approved convergence
 * (reference_oscar_sfc_convergence_plan_2026_06_21) makes SpeedFeedOrchestratorEngine.compute()
 * delegate its CORE PHYSICS to UltimateSpeedFeedEngine.calculate(); this is the input-translation
 * layer (P1). Built + tested in ISOLATION first (R13 -- verifiable core before integration); P2
 * wires it into compute() after the orchestrator resolves its machine/tool/material context.
 *
 * Scope: maps the PHYSICS-RELEVANT fields the engine consumes. Orchestrator-only fields
 * (machine_name/guideway/type, spindle_taper, tool_grade/series/catalog_id, holder_*, cam_*,
 * workholding_*, coolant_pressure/concentration, calibration_overrides, output_detail) are
 * intentionally DROPPED -- they are resolved by the orchestrator into the scalar engine inputs
 * (machine_power_kw / max_rpm / max_torque / rigidity, resolved coolant, etc.) or are
 * orchestrator-only concerns (calibration, CAM strategy) applied OUTSIDE the engine's core physics.
 *
 * Two enum/name transforms: `coolant_type` -> `coolant` (lower-case normalize; the engine's
 * CoolantType keys are lower-case) and `optimize_for: "cost"` -> `"balanced"` (the engine has no
 * "cost" objective; balanced is the closest physics objective -- cost optimization is an
 * orchestrator-only post-physics concern).
 */
import type { UltimateSpeedFeedInput } from "../UltimateSpeedFeedEngine.js";
import type { OrchestratorInput } from "../SpeedFeedOrchestratorEngine.js";

/** orchestrator coolant_type (may be upper-case e.g. "MQL") -> engine CoolantType (lower-case). */
export function mapCoolant(c?: string): UltimateSpeedFeedInput["coolant"] {
  if (!c) return undefined;
  const allowed = new Set(["dry", "flood", "mist", "mql", "cryogenic", "through_tool", "air_blast"]);
  const k = c.toLowerCase();
  return (allowed.has(k) ? k : undefined) as UltimateSpeedFeedInput["coolant"];
}

/** orchestrator optimize_for (incl. "cost") -> engine optimize_for (no "cost"; -> "balanced"). */
export function mapOptimizeFor(o?: string): UltimateSpeedFeedInput["optimize_for"] {
  if (!o) return undefined;
  if (o === "cost") return "balanced";
  return o as UltimateSpeedFeedInput["optimize_for"];
}

/**
 * Translate an OrchestratorInput into the UltimateSpeedFeedInput the engine's core physics consumes.
 * Pure, side-effect-free; undefined fields stay undefined (the engine infers them). The orchestrator
 * should pass its RESOLVED machine/tool scalars (machine_power_kw etc.) through these same fields in P2.
 */
export function orchestratorToUltimateInput(i: OrchestratorInput): UltimateSpeedFeedInput {
  return {
    // material
    material: i.material,
    iso_group: i.iso_group,
    hardness_hb: i.hardness_hb,
    hardness_hrc: i.hardness_hrc,
    // tool geometry
    tool_diameter_mm: i.tool_diameter_mm,
    flutes: i.flutes,
    tool_material: i.tool_material,
    tool_coating: i.tool_coating,
    helix_angle_deg: i.helix_angle_deg,
    corner_radius_mm: i.corner_radius_mm,
    flute_length_mm: i.flute_length_mm,
    overall_length_mm: i.overall_length_mm,
    tool_stickout_mm: i.tool_stickout_mm,
    edge_radius_mm: i.edge_radius_mm,
    // operation
    operation: i.operation,
    cut_type: i.cut_type as UltimateSpeedFeedInput["cut_type"],
    strategy: i.strategy,
    axial_depth_mm: i.axial_depth_mm,
    radial_depth_mm: i.radial_depth_mm,
    radial_depth_pct: i.radial_depth_pct,
    // machine envelope (orchestrator resolves machine_name -> these scalars in P2)
    machine_power_kw: i.machine_power_kw,
    machine_max_rpm: i.machine_max_rpm,
    machine_max_torque_nm: i.machine_max_torque_nm,
    machine_rigidity: i.machine_rigidity,
    // geometry / dynamics / economics
    workpiece_diameter_mm: i.workpiece_diameter_mm,
    workpiece_length_mm: i.workpiece_length_mm,
    feature_tolerance_mm: i.feature_tolerance_mm,
    system_stiffness_n_m: i.system_stiffness_n_m,
    natural_frequency_hz: i.natural_frequency_hz,
    damping_ratio: i.damping_ratio,
    tool_cost_usd: i.tool_cost_usd,
    machine_cost_per_min: i.machine_cost_per_min,
    tool_change_time_min: i.tool_change_time_min,
    optimize_for: mapOptimizeFor(i.optimize_for),
    // coolant (name + case transform)
    coolant: mapCoolant(i.coolant_type),
  };
}
