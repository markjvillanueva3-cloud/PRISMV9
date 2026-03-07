/**
 * CuttingForceEngine — Cutting Force Estimation Calculator
 *
 * Estimates cutting forces in 3 components:
 * - Tangential (main cutting force, Fc)
 * - Radial (thrust force, Fp)
 * - Axial (feed force, Ff)
 * - Resultant force and torque
 * - Power consumption
 *
 * Key physics: Fc = Kc × b × h where Kc is specific cutting
 * force, b = DOC, h = chip thickness (≈ feed × sin(κr)).
 * Kc depends on material, chip thickness (Kienzle model:
 * Kc = Kc1.1 × h^(-mc)). Radial and axial forces are
 * fractions of tangential based on tool geometry.
 *
 * Reference: Kienzle cutting force model,
 *            Machinery's Handbook Ch.28,
 *            Sandvik Metal Cutting Technology Ch.5
 *
 * Actions: cutting_force_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CuttingForceInput {
  operation?: "turning" | "milling" | "drilling";
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron" | "brass";
  depth_of_cut_mm: number;
  feed_mm: number;
  cutting_speed_mpm?: number;
  lead_angle_deg?: number;
  rake_angle_deg?: number;
  tool_diameter_mm?: number;
  flutes?: number;
  radial_engagement_mm?: number;
}

export interface CuttingForceResult {
  tangential_force: AtomicValue;
  radial_force: AtomicValue;
  axial_force: AtomicValue;
  resultant_force: AtomicValue;
  specific_cutting_force: AtomicValue;
  torque: AtomicValue;
  power: AtomicValue;
  specific_power: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Kienzle constants: Kc1.1 (N/mm²) and mc (exponent) */
const KIENZLE: Record<string, { kc11: number; mc: number }> = {
  steel: { kc11: 1800, mc: 0.26 },
  aluminum: { kc11: 700, mc: 0.23 },
  titanium: { kc11: 1400, mc: 0.22 },
  stainless: { kc11: 2100, mc: 0.27 },
  cast_iron: { kc11: 1100, mc: 0.28 },
  brass: { kc11: 780, mc: 0.18 },
};

/** Force ratios: radial/tangential, axial/tangential */
const FORCE_RATIOS: Record<string, { radial: number; axial: number }> = {
  turning: { radial: 0.4, axial: 0.25 },
  milling: { radial: 0.3, axial: 0.2 },
  drilling: { radial: 0.0, axial: 0.5 },
};

// ── Engine ─────────────────────────────────────────────────────────

export class CuttingForceEngine {
  calculate(input: CuttingForceInput): CuttingForceResult {
    const warnings: string[] = [];
    const op = input.operation ?? "turning";
    const mat = input.material_type ?? "steel";
    const ap = input.depth_of_cut_mm;
    const f = input.feed_mm;
    const Vc = input.cutting_speed_mpm ?? 120;
    const leadAngle = input.lead_angle_deg ?? 90;
    const rakeAngle = input.rake_angle_deg ?? 6;

    const kienzle = KIENZLE[mat] ?? KIENZLE.steel;

    // Chip thickness: h = f × sin(κr) for turning
    const leadRad = (leadAngle * Math.PI) / 180;
    const h = f * Math.sin(leadRad);

    // Specific cutting force: Kc = Kc1.1 × h^(-mc)
    const Kc = kienzle.kc11 * Math.pow(
      Math.max(h, 0.01), -kienzle.mc
    );

    // Rake angle correction: +1% per degree from reference (6°)
    const rakeCorrection = 1 - (rakeAngle - 6) * 0.01;

    // Chip width: b = ap / sin(κr)
    const b = ap / Math.sin(leadRad);

    // Tangential force: Fc = Kc × b × h × rake_correction
    let Fc: number;
    if (op === "milling") {
      // For milling: average force per tooth
      const ae = input.radial_engagement_mm
        ?? (input.tool_diameter_mm
          ? input.tool_diameter_mm * 0.3
          : ap);
      const Dt = input.tool_diameter_mm ?? 10;
      const engagementAngle = Math.acos(1 - (2 * ae / Dt));
      const avgChipThickness = f * Math.sin(engagementAngle / 2);
      const KcMill = kienzle.kc11 * Math.pow(
        Math.max(avgChipThickness, 0.01), -kienzle.mc
      );
      Fc = KcMill * ap * avgChipThickness * rakeCorrection;
    } else {
      Fc = Kc * b * h * rakeCorrection;
    }

    // Force ratios
    const ratios = FORCE_RATIOS[op] ?? FORCE_RATIOS.turning;
    const Fp = Fc * ratios.radial;
    const Ff = Fc * ratios.axial;

    // Resultant
    const Fr = Math.sqrt(Fc * Fc + Fp * Fp + Ff * Ff);

    // Torque (N·m)
    let torque: number;
    if (op === "turning") {
      // T = Fc × d/2 (workpiece radius)
      const dWork = input.tool_diameter_mm ?? 50;
      torque = (Fc * dWork / 2) / 1000;
    } else if (op === "milling") {
      const Dt = input.tool_diameter_mm ?? 10;
      torque = (Fc * Dt / 2) / 1000;
    } else {
      const Dd = input.tool_diameter_mm ?? 10;
      torque = (Fc * Dd / 2) / 1000;
    }

    // Power (kW): P = Fc × Vc / (60 × 1000)
    const power = (Fc * Vc) / 60000;

    // Specific power (kW per cm³/min)
    const mrr = ap * f * Vc * 1000 / 60000; // cm³/min approx
    const specificPower = mrr > 0 ? power / mrr : 0;

    // Warnings
    if (Fc > 5000) {
      warnings.push(
        `High cutting force ${r0(Fc)}N — verify machine rigidity`
      );
    }
    if (power > 10) {
      warnings.push(
        `Power ${r2(power)}kW — check spindle capacity`
      );
    }
    if (h < 0.02) {
      warnings.push(
        "Very thin chip — rubbing may occur instead of cutting"
      );
    }
    if (h > 0.5) {
      warnings.push(
        "Very thick chip — high tool stress, reduce feed"
      );
    }

    return {
      tangential_force: av(r1(Fc), "N", 10,
        `Kc=${r0(Kc)}×b=${r2(b)}×h=${r3(h)}`),
      radial_force: av(r1(Fp), "N", 5,
        `${ratios.radial}× tangential`),
      axial_force: av(r1(Ff), "N", 5,
        `${ratios.axial}× tangential`),
      resultant_force: av(r1(Fr), "N", 15,
        "√(Fc²+Fp²+Ff²)"),
      specific_cutting_force: av(r0(Kc), "N/mm²", 50,
        `Kc1.1=${kienzle.kc11}, mc=${kienzle.mc}, h=${r3(h)}`),
      torque: av(r2(torque), "N·m", 0.5,
        `Fc × radius / 1000`),
      power: av(r3(power), "kW", 0.1,
        `Fc×Vc/(60×1000)`),
      specific_power: av(r2(specificPower), "kW/(cm³/min)",
        0.1, "Power / MRR"),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const cuttingForceEngine = new CuttingForceEngine();
