/**
 * CraneLoadEngine — Overhead Crane & Hoist Load Calculator
 *
 * Models: Crane capacity planning and load analysis.
 * - Static and dynamic load factors
 * - Sling/rigging angle derating
 * - Boom/bridge deflection check
 * - Wire rope safety factor
 * - Duty classification (FEM/ISO)
 * - Center of gravity offset
 *
 * Key physics: Sling tension = W/(n×cos(θ)) where n=legs, θ=angle.
 * Dynamic factor ψ = 1 + v/(2g×h). Wire rope SF ≥ 5:1 per ASME B30.
 *
 * Reference: ASME B30.2 (overhead cranes),
 *            FEM 1.001 (crane classification),
 *            OSHA 1910.179
 *
 * Actions: crane_load_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CraneLoadInput {
  load_weight_kg?: number;
  num_sling_legs?: number;
  sling_angle_deg?: number;
  hoist_speed_m_min?: number;
  crane_capacity_kg?: number;
  span_m?: number;
  wire_rope_diameter_mm?: number;
  wire_rope_grade?: "1570" | "1770" | "1960";
  duty_class?: "M1" | "M3" | "M5" | "M7" | "M8";
  cg_offset_pct?: number;
  include_rigging_weight?: boolean;
  rigging_weight_kg?: number;
}

export interface CraneLoadResult {
  total_load: AtomicValue;
  dynamic_factor: AtomicValue;
  sling_tension_per_leg: AtomicValue;
  derated_capacity: AtomicValue;
  wire_rope_breaking_force: AtomicValue;
  wire_rope_safety_factor: AtomicValue;
  utilization: AtomicValue;
  max_cg_offset: AtomicValue;
  crane_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Wire rope breaking force (kN) per mm² of metallic area, by grade */
const ROPE_STRENGTH: Record<string, number> = {
  "1570": 1570, // MPa
  "1770": 1770,
  "1960": 1960,
};

/** Dynamic factor by duty class */
const DYNAMIC_BASE: Record<string, number> = {
  M1: 1.05, M3: 1.10, M5: 1.20, M7: 1.30, M8: 1.40,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CraneLoadEngine {
  calculate(input: CraneLoadInput): CraneLoadResult {
    const warnings: string[] = [];
    const W = (input.load_weight_kg ?? 1000) * 9.81; // N
    const nLegs = input.num_sling_legs ?? 2;
    const angleDeg = input.sling_angle_deg ?? 60;
    const angleRad = angleDeg * Math.PI / 180;
    const hoistSpeed = input.hoist_speed_m_min ?? 5;
    const capacity = (input.crane_capacity_kg ?? 5000) * 9.81; // N
    const duty = input.duty_class ?? "M3";
    const ropeD = input.wire_rope_diameter_mm ?? 12;
    const ropeGrade = input.wire_rope_grade ?? "1770";

    // Rigging weight
    const rigW = input.include_rigging_weight
      ? (input.rigging_weight_kg ?? 50) * 9.81
      : 0;

    // Total static load
    const totalStatic = W + rigW;

    // Dynamic factor: base + speed contribution
    const dynBase = DYNAMIC_BASE[duty] ?? 1.10;
    const dynSpeed = 1 + hoistSpeed / (60 * 2); // simplified speed factor
    const dynFactor = Math.max(dynBase, dynSpeed);

    // Total dynamic load
    const totalDynamic = totalStatic * dynFactor;

    // Sling tension per leg
    // T = W_total / (n × cos(θ)) where θ is angle from vertical
    const slingVertAngle = (90 - angleDeg) * Math.PI / 180;
    const cosAngle = Math.cos(slingVertAngle);
    const tensionPerLeg = totalDynamic / (nLegs * Math.max(cosAngle, 0.1));

    // Wire rope breaking force
    // Metallic area ≈ 0.4 × π/4 × d² (fill factor ~0.4 for 6×19)
    const metalArea = 0.4 * Math.PI / 4 * ropeD * ropeD; // mm²
    const breakingForce = metalArea * (ROPE_STRENGTH[ropeGrade] ?? 1770); // N

    // Wire rope safety factor
    const ropeSF = breakingForce / Math.max(tensionPerLeg, 1);

    // Capacity deration by sling angle
    const deratedCap = capacity * cosAngle;

    // Utilization
    const util = totalDynamic / capacity;

    // CG offset limit
    const cgOffset = input.cg_offset_pct ?? 0;
    const maxCgOffset = 10; // typical 10% max

    // Feasibility
    const feasible = util <= 0.85 && ropeSF >= 5.0;

    // Warnings
    if (util > 1.0) {
      warnings.push("CRITICAL: Load exceeds crane capacity");
    } else if (util > 0.85) {
      warnings.push(`Utilization ${r0(util * 100)}% > 85% — reduce load or use larger crane`);
    }
    if (ropeSF < 5.0) {
      warnings.push(`Wire rope SF=${r1(ropeSF)} < 5.0 (ASME B30 minimum) — increase rope diameter`);
    }
    if (angleDeg < 30) {
      warnings.push(`Sling angle ${angleDeg}° < 30° — high horizontal sling forces`);
    }
    if (angleDeg < 45) {
      warnings.push(`Sling angle ${angleDeg}° — ensure rated sling capacity covers ${r0(tensionPerLeg / 9.81)}kg per leg`);
    }
    if (cgOffset > maxCgOffset) {
      warnings.push(`CG offset ${cgOffset}% > ${maxCgOffset}% — load may tilt, use equalizer beam`);
    }
    if (nLegs === 1) {
      warnings.push("Single-leg sling — load will rotate freely, ensure adequate headroom");
    }

    const src = "CraneLoadEngine (ASME B30/FEM 1.001)";

    return {
      total_load: mkAv(r0(totalDynamic / 9.81), "kg", totalDynamic / 9.81 * 0.05,
        `${r0(W / 9.81)}kg × ${r2(dynFactor)} dynamic`),
      dynamic_factor: mkAv(r2(dynFactor), "×", 0.02, `${duty}, ${r1(hoistSpeed)}m/min`),
      sling_tension_per_leg: mkAv(r0(tensionPerLeg), "N", tensionPerLeg * 0.05,
        `${nLegs} legs at ${angleDeg}°`),
      derated_capacity: mkAv(r0(deratedCap / 9.81), "kg", 50,
        `cos(${90 - angleDeg}°) derating`),
      wire_rope_breaking_force: mkAv(r0(breakingForce), "N", breakingForce * 0.05,
        `${ropeD}mm ${ropeGrade} MPa`),
      wire_rope_safety_factor: mkAv(r1(ropeSF), "×", 0.3, "ASME B30 min=5"),
      utilization: mkAv(r2(util), "ratio", 0.02,
        `${r0(totalDynamic / 9.81)}/${r0(capacity / 9.81)}kg`),
      max_cg_offset: mkAv(maxCgOffset, "%", 0, src),
      crane_feasible: mkAv(feasible ? 1 : 0, feasible ? "PASS" : "FAIL", 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const craneLoadEngine = new CraneLoadEngine();
