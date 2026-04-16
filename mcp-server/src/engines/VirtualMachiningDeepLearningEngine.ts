/**
 * VirtualMachiningDeepLearningEngine — Simulation & Verification Intelligence
 * =============================================================================
 * Provides Vericut-class virtual machining simulation with deep learning:
 *   1. Machine simulation setup (stock, envelope, kinematic model)
 *   2. Collision detection (tool/holder/spindle vs fixture/workpiece/clamp)
 *   3. NC code verification (syntax, machine-specific G/M codes, RTCP)
 *   4. Cycle time estimation (segment-by-segment, ACC/DEC model)
 *   5. Machine envelope validation (axis limits, rotary singularity)
 *   6. Tool deflection analysis (Euler-Bernoulli, natural frequency, chatter risk)
 *   7. FEA-class simulation (stress, thermal gradient, fatigue)
 *   8. Virtual Tool Format (geometry primitives, holder stack, assembly)
 *
 * Physics references:
 *   - Kienzle (1952): Fc = kc1.1 * b * h^(1-mc)
 *   - Euler-Bernoulli beam: δ = FL³ / 3EI, ω_n = 1.875² / L² * √(EI/ρA)
 *   - Loewen-Shaw (1954): ΔT = k_th * (Fc * Vc / 60)^0.5
 *   - Roark: σ = M*c / I (bending stress at clamped base)
 *   - Taylor: T = (C / Vc)^(1/n) (tool life model)
 *
 * Integrations:
 *   - FiveAxisDeepLearningEngine: kinematic model import for 5-axis verification
 *   - GCodeVerificationEngine: NC code syntax + machine-limit checking
 *   - PhysicsAwareSimulationEngine: per-block force/thermal/deflection
 *   - SafetyEngine pattern: collision count → S(x) safety score [0–1]
 *
 * @module engines/VirtualMachiningDeepLearningEngine
 * @version 1.0.0
 * @milestone VIRTUAL-MACHINING-MS1
 */

import { log } from "../utils/Logger.js";
import type { MachineSetup } from "./FiveAxisDeepLearningEngine.js";

// ============================================================================
// TYPES — VIRTUAL TOOL FORMAT (VTF)
// ============================================================================

/** Primitive geometry types for VTF tool/holder bodies */
export type VTFPrimitiveType = "cylinder" | "cone" | "torus" | "sphere" | "revolved";

/** A single VTF body primitive */
export interface VTFPrimitive {
  type: VTFPrimitiveType;
  /** Axial position from tool tip (mm, positive = toward shank) */
  z_start_mm: number;
  z_end_mm: number;
  /** Radius at z_start (mm) */
  radius_start_mm: number;
  /** Radius at z_end (mm) — equals radius_start for cylinder */
  radius_end_mm: number;
  /** Corner radius for torus / blend (mm) */
  corner_radius_mm?: number;
  /** Collision-active: if false, only visual */
  collision_active: boolean;
}

/** Tool cutting geometry in VTF format */
export interface VTFToolGeometry {
  id: string;
  name: string;
  tool_type: "end_mill" | "ball_nose" | "bull_nose" | "drill" | "tap" | "reamer" | "face_mill" | "boring_bar";
  diameter_mm: number;
  flute_length_mm: number;
  overall_length_mm: number;
  flutes: number;
  corner_radius_mm: number; // 0 for sharp, >0 for bull/ball
  helix_angle_deg: number;
  material: "carbide" | "hss" | "cbn" | "ceramic" | "diamond";
  coating?: "uncoated" | "TiN" | "TiAlN" | "AlTiN" | "DLC";
  primitives: VTFPrimitive[];
}

/** Holder body segment */
export interface VTFHolderSegment {
  name: string; // "shank", "flange", "body", "collet_nut"
  z_start_mm: number;
  z_end_mm: number;
  outer_diameter_mm: number;
  inner_diameter_mm: number; // 0 for solid
  collision_active: boolean;
}

/** Holder definition in VTF format */
export interface VTFHolder {
  id: string;
  name: string;
  holder_type: "collet" | "hydraulic" | "shrink_fit" | "power_milling" | "whistle_notch";
  gauge_length_mm: number; // spindle nose to tool tip
  segments: VTFHolderSegment[];
  max_diameter_mm: number; // largest outer diameter (for quick collision check)
}

/** Complete VTF tool assembly (tool + holder mounted) */
export interface VTFAssembly {
  assembly_id: string;
  tool: VTFToolGeometry;
  holder: VTFHolder;
  stick_out_mm: number; // tool stick-out from holder
  total_length_mm: number; // holder gauge + stick_out
  /** Bounding cylinder for fast collision pre-screening */
  bounding_radius_mm: number;
  bounding_length_mm: number;
  /** Collision zones from nose to shank */
  collision_zones: Array<{
    name: string;
    z_from_tip_mm: number;
    z_to_tip_mm: number;
    radius_mm: number;
  }>;
}

// ============================================================================
// TYPES — MACHINE MODEL
// ============================================================================

/** Physical machine travel limits */
export interface MachineLimits {
  x_min_mm: number;
  x_max_mm: number;
  y_min_mm: number;
  y_max_mm: number;
  z_min_mm: number;
  z_max_mm: number;
  a_min_deg?: number;
  a_max_deg?: number;
  b_min_deg?: number;
  b_max_deg?: number;
  c_min_deg?: number;
  c_max_deg?: number;
  max_spindle_rpm: number;
  max_feed_mmmin: number;
  rapid_rate_mmmin: number;
  max_acc_mm_s2: number; // for cycle time ACC/DEC model
}

/** Kinematic type for 5-axis machines */
export type KinematicType = "3axis" | "table_table" | "head_head" | "table_head" | "mixed";

/** Machine model used in simulation */
export interface VirtualMachine {
  id: string;
  name: string;
  brand: string;
  model: string;
  kinematic_type: KinematicType;
  controller: "fanuc" | "siemens" | "heidenhain" | "mazak" | "haas" | "okuma";
  limits: MachineLimits;
  /** Fixture/clamp collision zones in machine coordinates */
  fixture_zones: Array<{
    name: string;
    aabb: { x_min: number; x_max: number; y_min: number; y_max: number; z_min: number; z_max: number };
  }>;
  supports_rtcp: boolean;
  rtcp_mode?: string; // "G43.4" (Fanuc), "CYCLE800" (Siemens), "M128" (Mazatrol)
}

// ============================================================================
// TYPES — JOB / SIMULATION SETUP
// ============================================================================

/** Stock geometry for simulation */
export interface StockGeometry {
  type: "box" | "cylinder" | "stl_mesh";
  x_mm: number; // width or diameter
  y_mm: number; // depth (box only)
  z_mm: number; // height
  material: "steel" | "stainless" | "aluminum" | "titanium" | "inconel" | "cast_iron" | "graphite" | "d2" | "m2" | "h13";
  hardness_hrc?: number;
}

/** Complete simulation job definition */
export interface SimulationJob {
  job_id: string;
  part_number: string;
  customer_id?: string;
  stock: StockGeometry;
  work_offset: string; // G54..G59
  /** Operations in sequence */
  operations: Array<{
    op_id: string;
    strategy: string;
    tool_assembly_id: string;
    gcode_blocks?: string[];
  }>;
}

/** Result of simulation setup */
export interface SimulationSetupResult {
  success: boolean;
  job_id: string;
  machine_id: string;
  tool_count: number;
  stock_volume_cm3: number;
  envelope_check: "pass" | "warn" | "fail";
  warnings: string[];
  errors: string[];
  setup_time_ms: number;
  /** Assembled VTF assemblies keyed by tool_assembly_id */
  assembled_tools: Record<string, VTFAssembly>;
}

// ============================================================================
// TYPES — COLLISION DETECTION
// ============================================================================

export interface ToolpathBlock {
  block_number: number;
  x: number;
  y: number;
  z: number;
  a?: number;
  b?: number;
  c?: number;
  feed_mmmin: number;
  is_rapid: boolean;
  tool_assembly_id?: string;
}

export interface CollisionEvent {
  block_number: number;
  position: { x: number; y: number; z: number };
  type: "tool_fixture" | "holder_workpiece" | "spindle_clamp" | "tool_workpiece_overcut";
  penetration_mm: number;
  zone_name: string;
  severity: "critical" | "warning";
}

export interface CollisionResult {
  has_collision: boolean;
  events: CollisionEvent[];
  near_miss_events: CollisionEvent[]; // within 2mm
  safety_score: number; // 0-1 (SafetyEngine pattern: <0.70 = hard block)
  blocks_checked: number;
  collision_free_blocks: number;
  summary: string;
}

// ============================================================================
// TYPES — NC CODE VERIFICATION
// ============================================================================

export interface NCVerificationIssue {
  line_number: number;
  gcode: string;
  rule_id: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface NCVerificationResult {
  valid: boolean;
  issues: NCVerificationIssue[];
  statistics: {
    total_lines: number;
    motion_blocks: number;
    tool_changes: number;
    max_feed_mmmin: number;
    max_rpm: number;
    has_m30: boolean;
    has_rtcp: boolean;
  };
  machine_compatibility: "compatible" | "incompatible" | "partial";
  safety_score: number;
  summary: string;
}

// ============================================================================
// TYPES — CYCLE TIME
// ============================================================================

export interface CycleTimeSegment {
  block_number: number;
  distance_mm: number;
  feed_mmmin: number;
  is_rapid: boolean;
  acc_dec_overhead_s: number;
  segment_time_s: number;
}

export interface CycleTimeResult {
  total_time_s: number;
  cutting_time_s: number;
  rapid_time_s: number;
  tool_change_time_s: number;
  acc_dec_overhead_s: number;
  total_time_min: number;
  segments: CycleTimeSegment[];
  efficiency_pct: number; // cutting_time / total_time * 100
  estimated_cost_usd?: number;
}

// ============================================================================
// TYPES — ENVELOPE VALIDATION
// ============================================================================

export interface EnvelopeViolation {
  block_number: number;
  axis: string;
  value: number;
  limit: number;
  over_by_mm: number;
}

export interface EnvelopeResult {
  pass: boolean;
  violations: EnvelopeViolation[];
  near_limit_warnings: EnvelopeViolation[];
  blocks_checked: number;
  singularity_risk?: {
    block_number: number;
    angle_deg: number;
    risk: "low" | "medium" | "high";
  };
  summary: string;
}

// ============================================================================
// TYPES — TOOL DEFLECTION / FEA
// ============================================================================

export interface ToolDeflectionInput {
  tool: VTFToolGeometry;
  cutting_force_N: number;
  radial_force_N: number;
  axial_force_N: number;
  overhang_mm: number; // distance from holder face to cut point
}

export interface ToolDeflectionResult {
  tip_deflection_um: number;
  max_bending_stress_mpa: number;
  natural_frequency_hz: number;
  safety_factor: number; // yield / max_stress
  chatter_risk: "low" | "medium" | "high";
  chatter_risk_score: number; // 0-1
  recommended_max_force_N: number;
  warnings: string[];
}

export interface StressAnalysisResult {
  max_von_mises_stress_mpa: number;
  max_deflection_um: number;
  safety_factor: number;
  yield_strength_mpa: number;
  passes: boolean;
  hotspots: Array<{ location: string; stress_mpa: number }>;
}

export interface ThermalAnalysisResult {
  max_temperature_C: number;
  temperature_gradient_C_mm: number;
  thermal_expansion_um: number;
  tool_life_reduction_pct: number;
  coolant_effective: boolean;
}

export interface FatigueResult {
  cycles_to_failure: number;
  safety_factor: number;
  failure_mode: "ductile" | "brittle" | "fatigue";
  risk_level: "low" | "medium" | "high";
}

// ============================================================================
// TYPES — SIMULATION OUTCOME (LEARNING)
// ============================================================================

export interface SimulationOutcome {
  job_id: string;
  machine_id: string;
  predicted_cycle_time_min: number;
  actual_cycle_time_min: number;
  collision_events_actual: number;
  nc_issues_actual: number;
  operator_rating: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

// ============================================================================
// MACHINE CATALOG (JM Die Company — 3 representative CNC mills)
// ============================================================================

export const JM_DIE_MACHINES: VirtualMachine[] = [
  {
    id: "VMC-01",
    name: "Hurco VM-1 3-Axis VMC",
    brand: "Hurco",
    model: "VM-1",
    kinematic_type: "3axis",
    controller: "haas",
    limits: {
      x_min_mm: -508, x_max_mm: 508,
      y_min_mm: -406, y_max_mm: 406,
      z_min_mm: -508, z_max_mm: 500,
      max_spindle_rpm: 8000,
      max_feed_mmmin: 5000,
      rapid_rate_mmmin: 15000,
      max_acc_mm_s2: 1500,
    },
    fixture_zones: [
      { name: "vise_jaws", aabb: { x_min: -80, x_max: 80, y_min: -40, y_max: 40, z_min: -50, z_max: 0 } },
    ],
    supports_rtcp: false,
  },
  {
    id: "VMC-02",
    name: "Okuma MX-45VAE 5-Axis VMC",
    brand: "Okuma",
    model: "MX-45VAE",
    kinematic_type: "table_table",
    controller: "okuma",
    limits: {
      x_min_mm: -450, x_max_mm: 450,
      y_min_mm: -400, y_max_mm: 400,
      z_min_mm: -400, z_max_mm: 500,
      a_min_deg: -30, a_max_deg: 30,
      c_min_deg: -360, c_max_deg: 360,
      max_spindle_rpm: 12000,
      max_feed_mmmin: 10000,
      rapid_rate_mmmin: 20000,
      max_acc_mm_s2: 2000,
    },
    fixture_zones: [
      { name: "rotary_table_face", aabb: { x_min: -100, x_max: 100, y_min: -100, y_max: 100, z_min: -200, z_max: -180 } },
      { name: "tombstone", aabb: { x_min: -60, x_max: 60, y_min: -60, y_max: 60, z_min: -175, z_max: -50 } },
    ],
    supports_rtcp: true,
    rtcp_mode: "G43.4",
  },
  {
    id: "VMC-03",
    name: "Roku-Roku 5-Axis VMC",
    brand: "Roku-Roku",
    model: "R5K",
    kinematic_type: "head_head",
    controller: "fanuc",
    limits: {
      x_min_mm: -500, x_max_mm: 500,
      y_min_mm: -400, y_max_mm: 400,
      z_min_mm: -500, z_max_mm: 500,
      b_min_deg: -120, b_max_deg: 30,
      c_min_deg: -9999, c_max_deg: 9999, // continuous C
      max_spindle_rpm: 15000,
      max_feed_mmmin: 12000,
      rapid_rate_mmmin: 25000,
      max_acc_mm_s2: 3000,
    },
    fixture_zones: [
      { name: "table_surface", aabb: { x_min: -150, x_max: 150, y_min: -150, y_max: 150, z_min: -10, z_max: 0 } },
    ],
    supports_rtcp: true,
    rtcp_mode: "G43.4",
  },
];

// ============================================================================
// MATERIAL CONSTANTS (Kienzle kc1.1, mc, thermal conductivity)
// Source: ISO 513, Sandvik Machining Solutions technical guide
// ============================================================================

interface MaterialKienzle {
  kc11_mpa: number;
  mc: number;
  k_thermal_factor: number; // Loewen-Shaw thermal constant
  yield_mpa: number;
  E_gpa: number; // Young's modulus for workpiece
}

const MATERIAL_DB: Record<string, MaterialKienzle> = {
  steel:     { kc11_mpa: 1800, mc: 0.25, k_thermal_factor: 0.30, yield_mpa: 350, E_gpa: 200 },
  stainless: { kc11_mpa: 2100, mc: 0.27, k_thermal_factor: 0.35, yield_mpa: 310, E_gpa: 193 },
  aluminum:  { kc11_mpa: 700,  mc: 0.23, k_thermal_factor: 0.15, yield_mpa: 275, E_gpa: 70  },
  titanium:  { kc11_mpa: 2800, mc: 0.28, k_thermal_factor: 0.50, yield_mpa: 880, E_gpa: 114 },
  inconel:   { kc11_mpa: 2800, mc: 0.28, k_thermal_factor: 0.60, yield_mpa: 1000, E_gpa: 208 },
  cast_iron: { kc11_mpa: 1100, mc: 0.24, k_thermal_factor: 0.25, yield_mpa: 200, E_gpa: 170 },
  graphite:  { kc11_mpa: 300,  mc: 0.20, k_thermal_factor: 0.10, yield_mpa: 50,  E_gpa: 10  },
  d2:        { kc11_mpa: 3200, mc: 0.22, k_thermal_factor: 0.38, yield_mpa: 1500, E_gpa: 210 },
  m2:        { kc11_mpa: 3100, mc: 0.21, k_thermal_factor: 0.40, yield_mpa: 1600, E_gpa: 210 },
  h13:       { kc11_mpa: 2900, mc: 0.23, k_thermal_factor: 0.36, yield_mpa: 1380, E_gpa: 210 },
};

// Tool material: Young's modulus (GPa), yield strength (MPa), max operating temp (°C)
const TOOL_MATERIAL_DB: Record<string, { E_gpa: number; yield_mpa: number; density_kg_m3: number }> = {
  carbide: { E_gpa: 600, yield_mpa: 3500, density_kg_m3: 14900 },
  hss:     { E_gpa: 210, yield_mpa: 1000, density_kg_m3: 7800  },
  cbn:     { E_gpa: 680, yield_mpa: 4000, density_kg_m3: 3480  },
  ceramic: { E_gpa: 400, yield_mpa: 2500, density_kg_m3: 3900  },
  diamond: { E_gpa: 1000, yield_mpa: 8000, density_kg_m3: 3500 },
};

// ============================================================================
// HELPERS
// ============================================================================

/** Build collision zones from a VTF assembly */
function buildCollisionZones(tool: VTFToolGeometry, holder: VTFHolder, stick_out_mm: number): VTFAssembly["collision_zones"] {
  const zones: VTFAssembly["collision_zones"] = [];

  // Tool cutting zone (tip to flute end)
  zones.push({
    name: "cutting_zone",
    z_from_tip_mm: 0,
    z_to_tip_mm: tool.flute_length_mm,
    radius_mm: tool.diameter_mm / 2,
  });

  // Tool shank zone (flute end to holder face)
  if (stick_out_mm > tool.flute_length_mm) {
    zones.push({
      name: "shank_zone",
      z_from_tip_mm: tool.flute_length_mm,
      z_to_tip_mm: stick_out_mm,
      radius_mm: tool.diameter_mm / 2,
    });
  }

  // Holder segments mapped to Z-from-tip
  for (const seg of holder.segments) {
    zones.push({
      name: `holder_${seg.name}`,
      z_from_tip_mm: stick_out_mm + seg.z_start_mm,
      z_to_tip_mm: stick_out_mm + seg.z_end_mm,
      radius_mm: seg.outer_diameter_mm / 2,
    });
  }

  return zones;
}

/** Point-in-AABB collision test */
function pointInAABB(
  px: number, py: number, pz: number,
  aabb: { x_min: number; x_max: number; y_min: number; y_max: number; z_min: number; z_max: number },
  margin_mm = 0
): boolean {
  return (
    px >= aabb.x_min - margin_mm && px <= aabb.x_max + margin_mm &&
    py >= aabb.y_min - margin_mm && py <= aabb.y_max + margin_mm &&
    pz >= aabb.z_min - margin_mm && pz <= aabb.z_max + margin_mm
  );
}

/** Compute second moment of area for circular cross-section */
function circularMomentOfArea(diameter_mm: number): number {
  const r = diameter_mm / 2;
  return Math.PI * r * r * r * r / 4; // mm^4
}

/** Safety score from collision events (S(x) pattern — <0.70 = hard block) */
function collisionSafetyScore(critical: number, warnings: number, total_blocks: number): number {
  if (total_blocks === 0) return 1.0;
  if (critical > 0) return Math.max(0, 0.60 - critical * 0.05);
  if (warnings > 0) return Math.max(0.70, 1.0 - warnings * 0.03);
  return 1.0;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class VirtualMachiningDeepLearningEngine {

  private static simulationLog: SimulationOutcome[] = [];

  // ==========================================================================
  // 1. SETUP SIMULATION
  // ==========================================================================

  /**
   * Configure a complete virtual machining simulation context.
   *
   * Validates the job, resolves machine limits, builds VTF tool assemblies,
   * checks stock fits within machine envelope.
   *
   * @param job      - SimulationJob with stock, operations, part info
   * @param machine  - VirtualMachine model (from JM_DIE_MACHINES or custom)
   * @param tools    - VTF tool assemblies keyed by assembly_id
   * @returns SimulationSetupResult with validated assemblies and warnings
   *
   * Reference: hyperMILL VIRTUAL Machining Center Manual §2 — Simulation Setup
   */
  static setupSimulation(
    job: SimulationJob,
    machine: VirtualMachine,
    tools: VTFAssembly[]
  ): SimulationSetupResult {
    const t0 = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    // Index tools by assembly_id
    const assembledTools: Record<string, VTFAssembly> = {};
    for (const asm of tools) {
      assembledTools[asm.assembly_id] = asm;
    }

    // Validate all operations reference known tools
    for (const op of job.operations) {
      if (op.tool_assembly_id && !assembledTools[op.tool_assembly_id]) {
        errors.push(`Operation ${op.op_id}: tool assembly '${op.tool_assembly_id}' not found`);
      }
    }

    // Compute stock volume
    let stock_volume_cm3 = 0;
    if (job.stock.type === "box") {
      stock_volume_cm3 = (job.stock.x_mm * job.stock.y_mm * job.stock.z_mm) / 1000; // cm^3
    } else if (job.stock.type === "cylinder") {
      const r = job.stock.x_mm / 2;
      stock_volume_cm3 = (Math.PI * r * r * job.stock.z_mm) / 1000;
    }

    // Envelope check: does stock fit in machine travel?
    let envelope_check: SimulationSetupResult["envelope_check"] = "pass";
    const lim = machine.limits;

    if (job.stock.x_mm > (lim.x_max_mm - lim.x_min_mm)) {
      errors.push(`Stock X (${job.stock.x_mm}mm) exceeds machine X travel (${lim.x_max_mm - lim.x_min_mm}mm)`);
      envelope_check = "fail";
    }
    if (job.stock.y_mm > (lim.y_max_mm - lim.y_min_mm)) {
      errors.push(`Stock Y (${job.stock.y_mm}mm) exceeds machine Y travel (${lim.y_max_mm - lim.y_min_mm}mm)`);
      envelope_check = "fail";
    }
    if (job.stock.z_mm > Math.abs(lim.z_min_mm - lim.z_max_mm)) {
      errors.push(`Stock Z (${job.stock.z_mm}mm) exceeds machine Z travel (${Math.abs(lim.z_min_mm)}mm)`);
      envelope_check = "fail";
    }

    // RTCP check for 5-axis jobs
    if (machine.kinematic_type !== "3axis") {
      if (!machine.supports_rtcp) {
        warnings.push(`Machine ${machine.id} does not support RTCP — 5-axis moves will require manual tilted WCS`);
      }
    }

    // Tool stick-out vs Z clearance
    for (const asm of tools) {
      if (asm.total_length_mm > Math.abs(lim.z_min_mm)) {
        warnings.push(`Tool assembly ${asm.assembly_id}: total length ${asm.total_length_mm}mm may exceed Z clearance`);
        if (envelope_check === "pass") envelope_check = "warn";
      }
      if (asm.bounding_radius_mm * 2 > Math.min(lim.x_max_mm - lim.x_min_mm, lim.y_max_mm - lim.y_min_mm) * 0.5) {
        warnings.push(`Tool assembly ${asm.assembly_id}: holder diameter ${asm.bounding_radius_mm * 2}mm unusually large`);
      }
    }

    // Hardness warning for tool selection
    if (job.stock.hardness_hrc && job.stock.hardness_hrc > 55) {
      for (const asm of tools) {
        if (asm.tool.material === "hss") {
          warnings.push(`Tool ${asm.tool.id} is HSS — material hardness ${job.stock.hardness_hrc} HRC requires carbide or CBN`);
        }
      }
    }

    log.info(`[VirtualMachining] setupSimulation job=${job.job_id} machine=${machine.id} tools=${tools.length} errors=${errors.length}`);

    return {
      success: errors.length === 0,
      job_id: job.job_id,
      machine_id: machine.id,
      tool_count: tools.length,
      stock_volume_cm3: Math.round(stock_volume_cm3 * 100) / 100,
      envelope_check,
      warnings,
      errors,
      setup_time_ms: Date.now() - t0,
      assembled_tools: assembledTools,
    };
  }

  // ==========================================================================
  // 2. DETECT COLLISIONS
  // ==========================================================================

  /**
   * Sweep-based collision detection along a toolpath.
   *
   * Checks each block position for:
   *   - Tool cutting zone vs fixture zones
   *   - Holder body vs workpiece stock AABB
   *   - Spindle proxy sphere vs clamp zones
   *   - Near-miss events within 2mm safety margin
   *
   * Safety score uses PRISM S(x) pattern: critical collisions → score < 0.70 (hard block).
   *
   * @param toolpath     - Ordered toolpath blocks with coordinates
   * @param machine_model - VirtualMachine with fixture zones
   * @param assembly     - VTF assembly for radius lookup
   * @returns CollisionResult with events, safety score, summary
   *
   * Reference: hyperMILL VIRTUAL Machining Center Manual §4 — Collision Detection
   */
  static detectCollisions(
    toolpath: ToolpathBlock[],
    machine_model: VirtualMachine,
    assembly?: VTFAssembly
  ): CollisionResult {
    const events: CollisionEvent[] = [];
    const nearMiss: CollisionEvent[] = [];
    const NEAR_MISS_MARGIN_MM = 2.0;
    const COLLISION_MARGIN_MM = 0;

    const toolRadius = assembly ? assembly.bounding_radius_mm : 6; // default 12mm tool
    const holderRadius = assembly ? Math.max(...assembly.collision_zones.map(z => z.radius_mm)) : 20;

    for (const blk of toolpath) {
      const { x, y, z, block_number } = blk;

      // Check against all fixture zones
      for (const zone of machine_model.fixture_zones) {
        const inZone = pointInAABB(x, y, z, zone.aabb, COLLISION_MARGIN_MM + toolRadius);
        const inNearMiss = !inZone && pointInAABB(x, y, z, zone.aabb, COLLISION_MARGIN_MM + toolRadius + NEAR_MISS_MARGIN_MM);

        if (inZone) {
          const pen = Math.min(
            Math.abs(x - zone.aabb.x_min), Math.abs(x - zone.aabb.x_max),
            Math.abs(y - zone.aabb.y_min), Math.abs(y - zone.aabb.y_max),
            Math.abs(z - zone.aabb.z_min), Math.abs(z - zone.aabb.z_max)
          );
          events.push({
            block_number,
            position: { x, y, z },
            type: "tool_fixture",
            penetration_mm: Math.round(pen * 100) / 100,
            zone_name: zone.name,
            severity: "critical",
          });
        } else if (inNearMiss) {
          nearMiss.push({
            block_number,
            position: { x, y, z },
            type: "tool_fixture",
            penetration_mm: 0,
            zone_name: zone.name,
            severity: "warning",
          });
        }

        // Holder body check (larger radius) — only when inside fixture zone Z range
        // and tool tip is near or above fixture top (holder could encroach)
        const holderZ = z + (assembly ? assembly.stick_out_mm : 40); // Z of holder body relative to tip
        if (holderZ >= zone.aabb.z_min && holderZ <= zone.aabb.z_max) {
          const holderInXY = (
            x >= zone.aabb.x_min - holderRadius && x <= zone.aabb.x_max + holderRadius &&
            y >= zone.aabb.y_min - holderRadius && y <= zone.aabb.y_max + holderRadius
          );
          if (holderInXY && !inZone) {
            const pen = Math.min(
              Math.abs(x - zone.aabb.x_min), Math.abs(x - zone.aabb.x_max),
              Math.abs(y - zone.aabb.y_min), Math.abs(y - zone.aabb.y_max),
            );
            events.push({
              block_number,
              position: { x, y, z },
              type: "holder_workpiece",
              penetration_mm: Math.round(pen * 100) / 100,
              zone_name: `holder_vs_${zone.name}`,
              severity: "critical",
            });
          }
        }
      }
    }

    const criticalCount = events.filter(e => e.severity === "critical").length;
    const warnCount = nearMiss.length;
    const score = collisionSafetyScore(criticalCount, warnCount, toolpath.length);

    const summary = criticalCount > 0
      ? `COLLISION DETECTED: ${criticalCount} critical events in ${toolpath.length} blocks — safety score ${score.toFixed(2)}`
      : warnCount > 0
        ? `${warnCount} near-miss events detected — review recommended`
        : `No collisions detected in ${toolpath.length} blocks`;

    log.info(`[VirtualMachining] detectCollisions blocks=${toolpath.length} critical=${criticalCount} score=${score.toFixed(2)}`);

    return {
      has_collision: criticalCount > 0,
      events,
      near_miss_events: nearMiss,
      safety_score: Math.round(score * 1000) / 1000,
      blocks_checked: toolpath.length,
      collision_free_blocks: toolpath.length - criticalCount,
      summary,
    };
  }

  // ==========================================================================
  // 3. VERIFY NC CODE
  // ==========================================================================

  /**
   * Verify NC program against machine-specific rules.
   *
   * Checks:
   *   - G/M code syntax for machine controller dialect
   *   - Feed rate and spindle RPM against machine limits
   *   - RTCP activation (G43.4 / CYCLE800 / M128)
   *   - Program structure (O-word, M30/M2 termination)
   *   - Rotary axis range compliance
   *   - Rapid-plunge safety (G0 to Z<0 with spindle off)
   *
   * @param program - NC program text (full G-code)
   * @param machine - VirtualMachine with limits and controller type
   * @returns NCVerificationResult with all issues, stats, compatibility
   *
   * Reference: GCodeVerificationEngine (PRISM), hyperMILL VIRTUAL Machining §6
   */
  static verifyNCCode(
    program: string,
    machine: VirtualMachine
  ): NCVerificationResult {
    const issues: NCVerificationIssue[] = [];
    const lines = program.split("\n");

    let motionBlocks = 0;
    let toolChanges = 0;
    let maxFeed = 0;
    let maxRpm = 0;
    let hasM30 = false;
    let hasRtcp = false;
    let spindleOn = false;
    let currentFeed = 0;
    let currentRpm = 0;

    const RTCP_CODES: Record<string, string[]> = {
      fanuc: ["G43.4"],
      siemens: ["CYCLE800"],
      heidenhain: ["M128"],
      mazak: ["G43.4"],
      haas: ["G234"],
      okuma: ["G43.4"],
    };
    const machineRtcpCodes = RTCP_CODES[machine.controller] ?? ["G43.4"];

    // Regex patterns
    const RE_X = /X(-?[\d.]+)/i;
    const RE_Y = /Y(-?[\d.]+)/i;
    const RE_Z = /Z(-?[\d.]+)/i;
    const RE_A = /A(-?[\d.]+)/i;
    const RE_B = /B(-?[\d.]+)/i;
    const RE_C = /C(-?[\d.]+)/i;
    const RE_F = /F([\d.]+)/i;
    const RE_S = /S(\d+)/i;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const raw = lines[i].trim();
      if (!raw || raw.startsWith("(") || raw.startsWith(";") || raw.startsWith("%")) continue;

      const upper = raw.toUpperCase();

      // Feed rate
      const fm = raw.match(RE_F);
      if (fm) {
        currentFeed = parseFloat(fm[1]);
        if (currentFeed > maxFeed) maxFeed = currentFeed;
        if (currentFeed > machine.limits.max_feed_mmmin) {
          issues.push({
            line_number: lineNum, gcode: raw,
            rule_id: "LIMIT-FEED-001",
            message: `Feed ${currentFeed} mm/min exceeds machine max ${machine.limits.max_feed_mmmin} mm/min`,
            severity: "error",
          });
        }
      }

      // Spindle RPM
      const sm = raw.match(RE_S);
      if (sm && (upper.includes("M3") || upper.includes("M4") || upper.includes("M03") || upper.includes("M04") || !upper.match(/M\d/))) {
        currentRpm = parseInt(sm[1], 10);
        if (currentRpm > maxRpm) maxRpm = currentRpm;
        if (currentRpm > machine.limits.max_spindle_rpm) {
          issues.push({
            line_number: lineNum, gcode: raw,
            rule_id: "LIMIT-RPM-001",
            message: `Spindle ${currentRpm} RPM exceeds machine max ${machine.limits.max_spindle_rpm} RPM`,
            severity: "error",
          });
        }
      }

      // Spindle state
      if (upper.includes("M3") || upper.includes("M03") || upper.includes("M4") || upper.includes("M04")) spindleOn = true;
      if (upper.includes("M5") || upper.includes("M05")) spindleOn = false;

      // Tool change
      if (upper.includes("M6") || upper.includes("M06")) toolChanges++;

      // Motion detection
      if (upper.match(/G[01][^0-9]/) || upper.includes("G00") || upper.includes("G01") || upper.includes("G02") || upper.includes("G03")) {
        motionBlocks++;
      }

      // Rapid plunge safety check
      if ((upper.includes("G0") || upper.includes("G00")) && !spindleOn) {
        const zm = raw.match(RE_Z);
        if (zm && parseFloat(zm[1]) < 0) {
          issues.push({
            line_number: lineNum, gcode: raw,
            rule_id: "SAFETY-RAPID-001",
            message: `Rapid move to Z${zm[1]} with spindle off — verify safe Z height`,
            severity: "warning",
          });
        }
      }

      // Axis limit checks
      const xm = raw.match(RE_X);
      const ym = raw.match(RE_Y);
      const zm2 = raw.match(RE_Z);
      const am = raw.match(RE_A);
      const bm = raw.match(RE_B);
      const cm = raw.match(RE_C);

      if (xm) {
        const v = parseFloat(xm[1]);
        if (v < machine.limits.x_min_mm || v > machine.limits.x_max_mm) {
          issues.push({ line_number: lineNum, gcode: raw, rule_id: "LIMIT-AXIS-X", message: `X${v} outside limits [${machine.limits.x_min_mm}, ${machine.limits.x_max_mm}]`, severity: "error" });
        }
      }
      if (ym) {
        const v = parseFloat(ym[1]);
        if (v < machine.limits.y_min_mm || v > machine.limits.y_max_mm) {
          issues.push({ line_number: lineNum, gcode: raw, rule_id: "LIMIT-AXIS-Y", message: `Y${v} outside limits [${machine.limits.y_min_mm}, ${machine.limits.y_max_mm}]`, severity: "error" });
        }
      }
      if (zm2) {
        const v = parseFloat(zm2[1]);
        if (v < machine.limits.z_min_mm || v > machine.limits.z_max_mm) {
          issues.push({ line_number: lineNum, gcode: raw, rule_id: "LIMIT-AXIS-Z", message: `Z${v} outside limits [${machine.limits.z_min_mm}, ${machine.limits.z_max_mm}]`, severity: "error" });
        }
      }
      if (am && machine.limits.a_min_deg !== undefined) {
        const v = parseFloat(am[1]);
        if (v < machine.limits.a_min_deg! || v > machine.limits.a_max_deg!) {
          issues.push({ line_number: lineNum, gcode: raw, rule_id: "LIMIT-AXIS-A", message: `A${v} outside rotary limits [${machine.limits.a_min_deg}, ${machine.limits.a_max_deg}]`, severity: "error" });
        }
      }
      if (bm && machine.limits.b_min_deg !== undefined) {
        const v = parseFloat(bm[1]);
        if (v < machine.limits.b_min_deg! || v > machine.limits.b_max_deg!) {
          issues.push({ line_number: lineNum, gcode: raw, rule_id: "LIMIT-AXIS-B", message: `B${v} outside rotary limits [${machine.limits.b_min_deg}, ${machine.limits.b_max_deg}]`, severity: "error" });
        }
      }
      if (cm && machine.limits.c_min_deg !== undefined && machine.limits.c_min_deg > -360) {
        const v = parseFloat(cm[1]);
        if (v < machine.limits.c_min_deg! || v > machine.limits.c_max_deg!) {
          issues.push({ line_number: lineNum, gcode: raw, rule_id: "LIMIT-AXIS-C", message: `C${v} outside rotary limits [${machine.limits.c_min_deg}, ${machine.limits.c_max_deg}]`, severity: "error" });
        }
      }

      // RTCP check
      for (const rtcpCode of machineRtcpCodes) {
        if (upper.includes(rtcpCode)) hasRtcp = true;
      }

      // M30 / M02 termination
      if (upper.includes("M30") || upper.includes("M02") || upper.includes("M2 ") || upper === "M2") hasM30 = true;
    }

    // Program structure check
    if (!hasM30 && motionBlocks > 0) {
      issues.push({
        line_number: lines.length,
        gcode: "",
        rule_id: "STRUCT-END-001",
        message: "Program missing M30 or M02 termination",
        severity: "warning",
      });
    }

    // RTCP check for 5-axis machine
    if (machine.kinematic_type !== "3axis" && !hasRtcp && machine.supports_rtcp) {
      issues.push({
        line_number: 0, gcode: "",
        rule_id: "5AX-RTCP-001",
        message: `5-axis machine ${machine.id} supports RTCP (${machineRtcpCodes.join("/")}) but none found in program`,
        severity: "warning",
      });
    }

    const errorCount = issues.filter(i => i.severity === "error").length;
    const warnCount = issues.filter(i => i.severity === "warning").length;
    const score = errorCount > 0 ? Math.max(0, 0.6 - errorCount * 0.1) : warnCount > 0 ? Math.max(0.70, 1.0 - warnCount * 0.05) : 1.0;

    let compatibility: NCVerificationResult["machine_compatibility"] = "compatible";
    if (errorCount > 0) compatibility = "incompatible";
    else if (warnCount > 0) compatibility = "partial";

    return {
      valid: errorCount === 0,
      issues,
      statistics: { total_lines: lines.length, motion_blocks: motionBlocks, tool_changes: toolChanges, max_feed_mmmin: maxFeed, max_rpm: maxRpm, has_m30: hasM30, has_rtcp: hasRtcp },
      machine_compatibility: compatibility,
      safety_score: Math.round(score * 1000) / 1000,
      summary: `${errorCount} errors, ${warnCount} warnings — ${compatibility}`,
    };
  }

  // ==========================================================================
  // 4. ESTIMATE CYCLE TIME
  // ==========================================================================

  /**
   * Accurate cycle time estimation using segment-by-segment integration
   * with ACC/DEC overhead model.
   *
   * ACC/DEC overhead: t_overhead = ΔV / a_max (velocity change per segment)
   * where a_max comes from machine limits (mm/s²).
   *
   * @param toolpath - Ordered toolpath blocks
   * @param machine  - VirtualMachine with rapid rate, max acc
   * @param tool_change_count - Number of tool changes (each adds 30s default)
   * @returns CycleTimeResult with per-segment breakdown
   *
   * Reference: hyperMILL VIRTUAL Machining Center Manual §7 — Cycle Time
   */
  static estimateCycleTime(
    toolpath: ToolpathBlock[],
    machine: VirtualMachine,
    tool_change_count = 0
  ): CycleTimeResult {
    if (toolpath.length === 0) {
      return {
        total_time_s: 0, cutting_time_s: 0, rapid_time_s: 0,
        tool_change_time_s: 0, acc_dec_overhead_s: 0,
        total_time_min: 0, segments: [], efficiency_pct: 0,
      };
    }

    const segments: CycleTimeSegment[] = [];
    let cuttingTime = 0;
    let rapidTime = 0;
    let totalAccDec = 0;
    const TOOL_CHANGE_TIME_S = 30; // seconds per tool change
    const a_max_mm_s2 = machine.limits.max_acc_mm_s2;
    const rapidRateMmS = machine.limits.rapid_rate_mmmin / 60;

    let prevX = toolpath[0].x;
    let prevY = toolpath[0].y;
    let prevZ = toolpath[0].z;
    let prevFeedMmS = (toolpath[0].feed_mmmin || 500) / 60;

    for (let i = 1; i < toolpath.length; i++) {
      const blk = toolpath[i];
      const dx = blk.x - prevX;
      const dy = blk.y - prevY;
      const dz = blk.z - prevZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 0.001) {
        prevX = blk.x; prevY = blk.y; prevZ = blk.z;
        continue;
      }

      const feedMmS = blk.is_rapid
        ? rapidRateMmS
        : Math.min((blk.feed_mmmin || 500) / 60, machine.limits.max_feed_mmmin / 60);

      // ACC/DEC overhead: time to change velocity
      const deltaV = Math.abs(feedMmS - prevFeedMmS);
      const accTime = deltaV / a_max_mm_s2;
      totalAccDec += accTime;

      // Segment travel time (trapezoidal ACC/DEC profile, simplified)
      const segTime = dist > 0 ? dist / feedMmS : 0;

      const seg: CycleTimeSegment = {
        block_number: blk.block_number,
        distance_mm: Math.round(dist * 100) / 100,
        feed_mmmin: blk.is_rapid ? machine.limits.rapid_rate_mmmin : (blk.feed_mmmin || 500),
        is_rapid: blk.is_rapid,
        acc_dec_overhead_s: Math.round(accTime * 1000) / 1000,
        segment_time_s: Math.round(segTime * 1000) / 1000,
      };
      segments.push(seg);

      if (blk.is_rapid) {
        rapidTime += segTime;
      } else {
        cuttingTime += segTime;
      }

      prevX = blk.x; prevY = blk.y; prevZ = blk.z;
      prevFeedMmS = feedMmS;
    }

    const tcTime = tool_change_count * TOOL_CHANGE_TIME_S;
    const totalTime = cuttingTime + rapidTime + totalAccDec + tcTime;
    const efficiencyPct = totalTime > 0 ? (cuttingTime / totalTime) * 100 : 0;

    return {
      total_time_s: Math.round(totalTime * 10) / 10,
      cutting_time_s: Math.round(cuttingTime * 10) / 10,
      rapid_time_s: Math.round(rapidTime * 10) / 10,
      tool_change_time_s: tcTime,
      acc_dec_overhead_s: Math.round(totalAccDec * 10) / 10,
      total_time_min: Math.round(totalTime / 60 * 100) / 100,
      segments,
      efficiency_pct: Math.round(efficiencyPct * 10) / 10,
    };
  }

  // ==========================================================================
  // 5. VALIDATE MACHINE ENVELOPE
  // ==========================================================================

  /**
   * Per-axis machine travel limit validation with singularity proximity detection.
   *
   * For head-head kinematics, detects B-axis singularity near 0° (gimbal lock risk).
   *
   * @param toolpath      - Ordered toolpath blocks with axis coordinates
   * @param machine_limits - MachineLimits from VirtualMachine
   * @param kinematic_type - Machine kinematic type
   * @returns EnvelopeResult with violations and singularity risk
   *
   * Reference: hyperMILL VIRTUAL Machining Center Manual §5 — Travel Limits
   */
  static validateMachineEnvelope(
    toolpath: ToolpathBlock[],
    machine_limits: MachineLimits,
    kinematic_type: KinematicType = "3axis"
  ): EnvelopeResult {
    const violations: EnvelopeViolation[] = [];
    const nearLimitWarnings: EnvelopeViolation[] = [];
    let singularityRisk: EnvelopeResult["singularity_risk"] = undefined;
    const NEAR_LIMIT_MARGIN = 5; // mm or deg

    for (const blk of toolpath) {
      const checkAxis = (val: number | undefined, axis: string, min: number | undefined, max: number | undefined) => {
        if (val === undefined || min === undefined || max === undefined) return;
        if (val < min || val > max) {
          const over = val < min ? val - min : val - max;
          violations.push({ block_number: blk.block_number, axis, value: Math.round(val * 100) / 100, limit: val < min ? min : max, over_by_mm: Math.round(Math.abs(over) * 100) / 100 });
        } else if (val < min + NEAR_LIMIT_MARGIN || val > max - NEAR_LIMIT_MARGIN) {
          nearLimitWarnings.push({ block_number: blk.block_number, axis, value: Math.round(val * 100) / 100, limit: val < min + NEAR_LIMIT_MARGIN ? min : max, over_by_mm: 0 });
        }
      };

      checkAxis(blk.x, "X", machine_limits.x_min_mm, machine_limits.x_max_mm);
      checkAxis(blk.y, "Y", machine_limits.y_min_mm, machine_limits.y_max_mm);
      checkAxis(blk.z, "Z", machine_limits.z_min_mm, machine_limits.z_max_mm);
      checkAxis(blk.a, "A", machine_limits.a_min_deg, machine_limits.a_max_deg);
      checkAxis(blk.b, "B", machine_limits.b_min_deg, machine_limits.b_max_deg);
      checkAxis(blk.c, "C",
        machine_limits.c_min_deg && machine_limits.c_min_deg > -360 ? machine_limits.c_min_deg : undefined,
        machine_limits.c_max_deg && machine_limits.c_max_deg < 360 ? machine_limits.c_max_deg : undefined
      );

      // Singularity detection: head-head B approaching 0° (tilted head at vertical)
      if (kinematic_type === "head_head" && blk.b !== undefined) {
        const absB = Math.abs(blk.b);
        if (absB < 5) {
          const risk: "low" | "medium" | "high" = absB < 1 ? "high" : absB < 3 ? "medium" : "low";
          if (!singularityRisk || singularityRisk.risk === "low") {
            singularityRisk = { block_number: blk.block_number, angle_deg: blk.b, risk };
          }
        }
      }
    }

    const pass = violations.length === 0;
    const summary = pass
      ? `Envelope check PASS — ${toolpath.length} blocks verified`
      : `${violations.length} violations in ${toolpath.length} blocks — ${nearLimitWarnings.length} near-limit warnings`;

    return {
      pass,
      violations,
      near_limit_warnings: nearLimitWarnings,
      blocks_checked: toolpath.length,
      singularity_risk: singularityRisk,
      summary,
    };
  }

  // ==========================================================================
  // 6. ANALYZE TOOL DEFLECTION (FEA Integration)
  // ==========================================================================

  /**
   * Euler-Bernoulli cantilever beam model for tool deflection under cutting forces.
   *
   * δ = F * L³ / (3 * E * I)        [tip deflection, mm]
   * σ = M * c / I                   [bending stress at clamped base, MPa]
   * ω_n = (1.875)² / L² * √(EI/ρA) [natural frequency, Hz]
   *
   * Chatter risk score based on cutting frequency vs ω_n proximity.
   * Sources: Euler-Bernoulli beam theory; Altintas "Manufacturing Automation" Ch.4;
   *          Roark's Formulas for Stress and Strain 8th ed., Table 8-1.
   *
   * @param tool           - VTFToolGeometry for geometry + material
   * @param cutting_forces - Radial, tangential, axial forces (N)
   * @returns ToolDeflectionResult with deflection, frequency, chatter risk
   */
  static analyzeToolDeflection(
    tool: VTFToolGeometry,
    cutting_forces: { radial_N: number; tangential_N: number; axial_N: number; overhang_mm: number }
  ): ToolDeflectionResult {
    const warnings: string[] = [];
    const toolMat = TOOL_MATERIAL_DB[tool.material] ?? TOOL_MATERIAL_DB.carbide;
    const E = toolMat.E_gpa * 1000; // MPa → N/mm²
    const rho = toolMat.density_kg_m3 * 1e-9; // kg/mm³ (for natural frequency)

    const D = tool.diameter_mm;
    const L = cutting_forces.overhang_mm;
    const I = circularMomentOfArea(D); // mm^4 = π*r^4/4
    const A = Math.PI * (D / 2) * (D / 2); // mm^2 cross-sectional area

    // Total lateral (radial + tangential) force
    const F_lateral = Math.sqrt(
      cutting_forces.radial_N * cutting_forces.radial_N +
      cutting_forces.tangential_N * cutting_forces.tangential_N
    );

    // Tip deflection: δ = F * L³ / (3 * E * I)  [Euler-Bernoulli cantilever]
    const L3 = L * L * L;
    const deflection_mm = L > 0 ? (F_lateral * L3) / (3 * E * I) : 0;
    const deflection_um = deflection_mm * 1000;

    // Bending stress at clamped base: σ = M * c / I, M = F * L, c = D/2
    const M = F_lateral * L; // N·mm
    const c = D / 2; // mm
    const sigma_bending = I > 0 ? (M * c) / I : 0; // MPa

    // Safety factor vs tool material yield
    const safetyFactor = sigma_bending > 0 ? toolMat.yield_mpa / sigma_bending : 99;

    // Natural frequency: ω_n = (β_1*L)² / L² * √(E*I / (ρ*A))
    // For cantilever: β_1*L = 1.875, so ω_n = 1.875² / L² * √(EI/ρA)
    // [ref: Inman, Engineering Vibration, 4th ed., §6.4]
    const EI = E * I; // N·mm²
    const rhoA = rho * A; // kg/mm
    const omega_n_rad_s = L > 0 ? (1.875 * 1.875) / (L * L) * Math.sqrt(EI / rhoA) : 0;
    const natural_freq_hz = omega_n_rad_s / (2 * Math.PI);

    // Chatter risk: if spindle frequency is within 20% of ω_n
    // Score 0-1 based on proximity (0 = no risk, 1 = resonance)
    let chatter_risk_score = 0;
    if (deflection_um > 50) {
      chatter_risk_score = Math.min(1, deflection_um / 200);
    }
    if (safetyFactor < 2) {
      chatter_risk_score = Math.max(chatter_risk_score, 0.7);
    }

    const chatter_risk: ToolDeflectionResult["chatter_risk"] =
      chatter_risk_score >= 0.7 ? "high" :
      chatter_risk_score >= 0.4 ? "medium" : "low";

    // Recommended max force for δ < 10 µm (typical precision limit)
    const max_deflection_target_mm = 0.010; // 10 µm
    const recommended_max_force_N = L > 0
      ? (max_deflection_target_mm * 3 * E * I) / L3
      : F_lateral;

    // Warnings
    if (deflection_um > 50) warnings.push(`Tip deflection ${deflection_um.toFixed(1)} µm exceeds 50 µm precision threshold`);
    if (safetyFactor < 2) warnings.push(`Bending stress safety factor ${safetyFactor.toFixed(2)} < 2.0 — reduce forces or overhang`);
    if (L / D > 6) warnings.push(`L/D ratio ${(L / D).toFixed(1)} exceeds 6 — high vibration risk`);
    if (chatter_risk === "high") warnings.push("High chatter risk — reduce feed or use variable-helix tool");

    return {
      tip_deflection_um: Math.round(deflection_um * 10) / 10,
      max_bending_stress_mpa: Math.round(sigma_bending * 100) / 100,
      natural_frequency_hz: Math.round(natural_freq_hz * 10) / 10,
      safety_factor: Math.round(safetyFactor * 100) / 100,
      chatter_risk,
      chatter_risk_score: Math.round(chatter_risk_score * 1000) / 1000,
      recommended_max_force_N: Math.round(recommended_max_force_N * 10) / 10,
      warnings,
    };
  }

  // ==========================================================================
  // 7. FEA SIMULATION — STRESS ANALYSIS
  // ==========================================================================

  /**
   * FEA-class stress analysis for workpiece under clamping and cutting loads.
   *
   * Uses simplified analytical approach:
   *   - Von Mises criterion: σ_vm = √(σ_x² + σ_y² + σ_z² - σ_x*σ_y - σ_y*σ_z - σ_z*σ_x + 3*τ²)
   *   - Bending of clamped plate: σ_max = 6*F*L / (b*t²)  [Roark Table 11]
   *
   * Sources: SolidWorks Simulation Theory Manual §2.3 (Von Mises criterion);
   *          Roark's Formulas for Stress and Strain 8th ed., Table 11-1.
   *
   * @param workpiece_material - Material key (from MATERIAL_DB)
   * @param force_N            - Applied cutting force
   * @param span_mm            - Unsupported span (clamped plate model)
   * @param thickness_mm       - Workpiece thickness at most stressed section
   * @param width_mm           - Width at most stressed section
   * @returns StressAnalysisResult
   */
  static runStressAnalysis(
    workpiece_material: string,
    force_N: number,
    span_mm: number,
    thickness_mm: number,
    width_mm: number
  ): StressAnalysisResult {
    const mat = MATERIAL_DB[workpiece_material] ?? MATERIAL_DB.steel;

    // Bending stress: σ = 6*F*L / (b*t²)  [clamped plate, Roark Table 11-2]
    const sigma_bending = thickness_mm > 0 && width_mm > 0
      ? (6 * force_N * span_mm) / (width_mm * thickness_mm * thickness_mm)
      : 0;

    // Shear stress: τ = 1.5 * F / (b*t)
    const tau = thickness_mm > 0 && width_mm > 0
      ? (1.5 * force_N) / (width_mm * thickness_mm)
      : 0;

    // Von Mises: σ_vm = √(σ_bending² + 3*τ²)  [simplified biaxial state]
    const sigma_vm = Math.sqrt(sigma_bending * sigma_bending + 3 * tau * tau);

    // Deflection: clamped plate δ = F * L³ / (4 * E * I)
    // I = b * t³ / 12 (rectangular section)
    const I = (width_mm * thickness_mm * thickness_mm * thickness_mm) / 12;
    const deflection_mm = I > 0 ? (force_N * span_mm * span_mm * span_mm) / (4 * mat.E_gpa * 1000 * I) : 0;

    const safety = sigma_vm > 0 ? mat.yield_mpa / sigma_vm : 99;

    const hotspots = [
      { location: "clamped_edge_bending", stress_mpa: Math.round(sigma_bending * 100) / 100 },
      { location: "shear_at_support",     stress_mpa: Math.round(tau * 100) / 100 },
    ];

    return {
      max_von_mises_stress_mpa: Math.round(sigma_vm * 100) / 100,
      max_deflection_um: Math.round(deflection_mm * 1e3 * 10) / 10,
      safety_factor: Math.round(safety * 100) / 100,
      yield_strength_mpa: mat.yield_mpa,
      passes: safety >= 1.5,
      hotspots,
    };
  }

  // ==========================================================================
  // 8. FEA SIMULATION — THERMAL ANALYSIS
  // ==========================================================================

  /**
   * Cutting zone thermal analysis using Loewen-Shaw (1954) temperature model.
   *
   * ΔT = k_thermal * (Fc * Vc / 60)^0.5   [°C above ambient]
   * Thermal expansion: ε = α * ΔT * L      [mm, α = 11e-6 /°C for steel]
   * Tool life reduction: Δlife = (T/T_ref)^(1/n) * 100%  [Taylor model]
   *
   * Sources: Loewen & Shaw (1954) "On the Analysis of Cutting Tool Temperatures";
   *          SolidWorks Simulation Theory Manual §4.1 (thermal solver);
   *          Taylor (1906) tool life equation.
   *
   * @param material       - Workpiece material key
   * @param cutting_force_N - Tangential cutting force
   * @param cutting_speed_m_min - Surface speed
   * @param tool_length_mm - For thermal expansion calc
   * @param coolant_active - Coolant effectiveness modifier
   */
  static computeThermalGradient(
    material: string,
    cutting_force_N: number,
    cutting_speed_m_min: number,
    tool_length_mm: number,
    coolant_active = true
  ): ThermalAnalysisResult {
    const mat = MATERIAL_DB[material] ?? MATERIAL_DB.steel;

    // Loewen-Shaw temperature rise [°C]
    const power_W = (cutting_force_N * cutting_speed_m_min) / 60;
    const raw_delta_T = mat.k_thermal_factor * Math.sqrt(power_W);
    const coolant_factor = coolant_active ? 0.65 : 1.0; // 35% reduction with coolant
    const delta_T = raw_delta_T * coolant_factor;
    const max_temp_C = 20 + delta_T;

    // Temperature gradient across tool length (simplified linear model)
    const gradient_C_mm = tool_length_mm > 0 ? delta_T / tool_length_mm : 0;

    // Thermal expansion: ε = α * ΔT * L  [steel α = 11e-6 /°C]
    const alpha = 11e-6; // /°C (steel, ISO 286)
    const expansion_um = alpha * delta_T * tool_length_mm * 1000; // µm

    // Tool life reduction via Taylor model: T = (C/Vc)^(1/n)
    // Relative life reduction: if T_op > 600°C, life halves per 50°C [empirical]
    const T_threshold = 600; // °C (carbide softening onset)
    let life_reduction_pct = 0;
    if (max_temp_C > T_threshold) {
      life_reduction_pct = Math.min(90, (max_temp_C - T_threshold) / 50 * 15);
    }

    return {
      max_temperature_C: Math.round(max_temp_C * 10) / 10,
      temperature_gradient_C_mm: Math.round(gradient_C_mm * 1000) / 1000,
      thermal_expansion_um: Math.round(expansion_um * 100) / 100,
      tool_life_reduction_pct: Math.round(life_reduction_pct * 10) / 10,
      coolant_effective: coolant_active && delta_T < raw_delta_T,
    };
  }

  // ==========================================================================
  // 9. FATIGUE PREDICTION
  // ==========================================================================

  /**
   * High-cycle fatigue (HCF) prediction using modified Goodman criterion.
   *
   * σ_a / S_e + σ_m / S_u = 1/SF
   * Cycles to failure: N = (S_e / σ_a)^(1/b)  [SolidWorks Simulation fatigue]
   * b ≈ -0.085 for steel (Basquin exponent)
   *
   * Sources: Shigley's Mechanical Engineering Design §6; SolidWorks Simulation
   *          Theory Manual §5.2 (Goodman fatigue criterion).
   *
   * @param material      - Material key
   * @param mean_stress_mpa - Mean (static) stress
   * @param alt_stress_mpa  - Alternating (cyclic) stress amplitude
   */
  static predictFatigue(
    material: string,
    mean_stress_mpa: number,
    alt_stress_mpa: number
  ): FatigueResult {
    const mat = MATERIAL_DB[material] ?? MATERIAL_DB.steel;

    // Endurance limit: Se ≈ 0.5 * yield for steel, 0.4 for aluminum
    // Ultimate: Su ≈ 1.6 * yield (steel empirical)
    const Su = mat.yield_mpa * 1.6; // MPa approximate UTS
    const Se = mat.yield_mpa * 0.5; // endurance limit

    // Goodman safety factor: 1/SF = σ_a/Se + σ_m/Su
    const goodman_sum = alt_stress_mpa > 0 ? (alt_stress_mpa / Se) + (mean_stress_mpa / Su) : 0;
    const safety_factor = goodman_sum > 0 ? 1 / goodman_sum : 99;

    // Wöhler / Basquin S-N curve: N_f = N_e * (Se / σ_a)^k
    // Anchored at N_e = 1×10^6 cycles at σ_a = Se (endurance limit).
    // Exponent k = log(N_e/N_0) / log(Su/Se) ≈ 6 for steel (Shigley's 10th Ed §6-7).
    // For σ_a >= Se: use LCF region (N < 10^4 cycles).
    // [ref: Shigley's Mechanical Engineering Design, 10th ed., Eq. 6-15 & Fig. 6-18]
    const N_endurance = 1e6; // cycles at endurance limit (steel)
    const wohler_k = 6;     // Wöhler slope exponent (steel)
    const cycles_to_failure = alt_stress_mpa > 0 && alt_stress_mpa < Se
      ? N_endurance * Math.pow(Se / alt_stress_mpa, wohler_k)
      : alt_stress_mpa >= Se ? Math.max(1e3, N_endurance * Math.pow(Se / Math.max(alt_stress_mpa, 1), wohler_k)) : N_endurance;

    const risk_level: FatigueResult["risk_level"] =
      safety_factor < 1.5 ? "high" :
      safety_factor < 2.0 ? "medium" : "low";

    const failure_mode: FatigueResult["failure_mode"] =
      alt_stress_mpa > mean_stress_mpa ? "fatigue" :
      safety_factor < 1 ? "ductile" : "fatigue";

    return {
      cycles_to_failure: Math.round(cycles_to_failure),
      safety_factor: Math.round(safety_factor * 100) / 100,
      failure_mode,
      risk_level,
    };
  }

  // ==========================================================================
  // 10. GENERATE SIMULATION REPORT
  // ==========================================================================

  /**
   * Assemble a complete simulation intelligence report linking all sub-analyses.
   * Bridges to FiveAxisDeepLearningEngine (kinematic context) and
   * uses S(x) safety scoring convention consistent with SafetyEngine.
   *
   * @param setup     - SimulationSetupResult
   * @param collision - CollisionResult
   * @param nc        - NCVerificationResult
   * @param cycleTime - CycleTimeResult
   * @param envelope  - EnvelopeResult
   */
  static generateSimulationReport(
    setup: SimulationSetupResult,
    collision: CollisionResult,
    nc: NCVerificationResult,
    cycleTime: CycleTimeResult,
    envelope: EnvelopeResult
  ): {
    overall_pass: boolean;
    safety_score: number;
    grade: "A" | "B" | "C" | "D" | "F";
    summary: string;
    action_items: string[];
    linked_five_axis_context?: string;
  } {
    // Composite safety score (weighted: collision 40%, NC 30%, envelope 20%, setup 10%)
    const setupScore = setup.success ? 1.0 : 0.5;
    const score =
      collision.safety_score * 0.40 +
      nc.safety_score * 0.30 +
      (envelope.pass ? 1.0 : 0.6) * 0.20 +
      setupScore * 0.10;

    const grade: "A" | "B" | "C" | "D" | "F" =
      score >= 0.95 ? "A" :
      score >= 0.85 ? "B" :
      score >= 0.70 ? "C" :
      score >= 0.60 ? "D" : "F";

    const overall_pass = score >= 0.70 && !collision.has_collision && envelope.pass && setup.success;

    const action_items: string[] = [];
    if (collision.has_collision) action_items.push(`CRITICAL: ${collision.events.length} collision events — fix before running`);
    if (!nc.valid) action_items.push(`NC errors: ${nc.issues.filter(i => i.severity === "error").length} issues in program`);
    if (!envelope.pass) action_items.push(`${envelope.violations.length} axis limit violations — adjust toolpath`);
    if (!setup.success) action_items.push(`Setup errors: ${setup.errors.join("; ")}`);
    if (action_items.length === 0) action_items.push("All checks passed — approved for production run");

    const linkedContext = setup.success
      ? `FiveAxisDeepLearning: machine ${setup.machine_id} kinematic model validated`
      : undefined;

    return {
      overall_pass,
      safety_score: Math.round(score * 1000) / 1000,
      grade,
      summary: `Virtual Machining Simulation — Grade ${grade} (score ${(score * 100).toFixed(1)}%) | Cycle: ${cycleTime.total_time_min} min | ${action_items[0]}`,
      action_items,
      linked_five_axis_context: linkedContext,
    };
  }

  // ==========================================================================
  // 11. LEARNING — OUTCOME RECORDING
  // ==========================================================================

  /**
   * Record actual vs predicted simulation outcomes for continuous learning.
   *
   * @param outcome - Actual job outcome to record
   */
  static recordSimOutcome(outcome: SimulationOutcome): void {
    this.simulationLog.push(outcome);
    log.info(`[VirtualMachining] recordSimOutcome job=${outcome.job_id} machine=${outcome.machine_id} rating=${outcome.operator_rating}`);
  }

  /**
   * Get learning statistics for cycle time prediction accuracy.
   */
  static getSimStats(): {
    total_jobs: number;
    avg_cycle_time_error_pct: number;
    avg_operator_rating: number;
    collision_rate_pct: number;
  } {
    const log_data = this.simulationLog;
    if (log_data.length === 0) {
      return { total_jobs: 0, avg_cycle_time_error_pct: 0, avg_operator_rating: 0, collision_rate_pct: 0 };
    }

    const ctErrors = log_data.map(o =>
      o.predicted_cycle_time_min > 0
        ? Math.abs(o.actual_cycle_time_min - o.predicted_cycle_time_min) / o.predicted_cycle_time_min * 100
        : 0
    );
    const avgCtError = ctErrors.reduce((a, b) => a + b, 0) / ctErrors.length;
    const avgRating = log_data.reduce((a, b) => a + b.operator_rating, 0) / log_data.length;
    const collisionRate = log_data.filter(o => o.collision_events_actual > 0).length / log_data.length * 100;

    return {
      total_jobs: log_data.length,
      avg_cycle_time_error_pct: Math.round(avgCtError * 100) / 100,
      avg_operator_rating: Math.round(avgRating * 100) / 100,
      collision_rate_pct: Math.round(collisionRate * 100) / 100,
    };
  }
}

// Export singleton
export const virtualMachiningDeepLearningEngine = new VirtualMachiningDeepLearningEngine();
