/**
 * ToolOverhangEngine — Tool Stickout Optimization Calculator
 *
 * Calculates optimal tool overhang and deflection:
 * - Minimum stickout for feature depth + clearance
 * - Deflection at tip from cutting forces
 * - Surface finish degradation from deflection
 * - Holder gauge length recommendations
 * - Shrink-fit vs collet vs ER holder stiffness comparison
 *
 * Key physics: Tool deflection δ = F×L³/(3×E×I) for
 * cantilever. Shorter overhang dramatically reduces
 * deflection (cubic relationship). Every mm of unnecessary
 * stickout costs exponentially in stiffness. Tapered
 * holders and shrink-fit provide better rigidity than
 * collet chucks.
 *
 * Reference: Sandvik Tool Holding Guide,
 *            Haimer Shrink-Fit Application Notes,
 *            Machinery's Handbook Ch.28 (Tool Holding)
 *
 * Actions: tool_overhang_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ToolOverhangInput {
  tool_diameter_mm: number;
  feature_depth_mm: number;
  clearance_mm?: number;
  flutes?: number;
  tool_material?: "carbide" | "hss" | "cobalt";
  holder_type?: "shrink_fit" | "collet" | "er"
    | "hydraulic" | "milling_chuck";
  cutting_force_n?: number;
  work_material?: "steel" | "aluminum" | "titanium"
    | "stainless";
}

export interface ToolOverhangResult {
  minimum_stickout: AtomicValue;
  recommended_stickout: AtomicValue;
  ld_ratio: AtomicValue;
  tip_deflection: AtomicValue;
  deflection_at_surface: AtomicValue;
  stiffness: AtomicValue;
  holder_stiffness_factor: AtomicValue;
  ra_degradation: AtomicValue;
  recommended_holder: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Young's modulus (GPa) */
const TOOL_E: Record<string, number> = {
  carbide: 600, // QA-MS3 FIX: canonical CANONICAL_TOOL_MODULUS (was 580)
  hss: 210,
  cobalt: 220,
};

/** Holder stiffness multiplier (relative to collet=1.0) */
const HOLDER_STIFFNESS: Record<string, number> = {
  shrink_fit: 1.5,
  hydraulic: 1.3,
  milling_chuck: 1.2,
  collet: 1.0,
  er: 0.9,
};

/** Estimated cutting force (N) per mm² engagement */
const KC: Record<string, number> = {
  steel: 2000,
  aluminum: 800,
  titanium: 1600,
  stainless: 2200,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ToolOverhangEngine {
  calculate(input: ToolOverhangInput): ToolOverhangResult {
    const warnings: string[] = [];
    const d = input.tool_diameter_mm;
    const depth = input.feature_depth_mm;
    const clearance = input.clearance_mm ?? 5;
    const toolMat = input.tool_material ?? "carbide";
    const holderType = input.holder_type ?? "collet";
    const workMat = input.work_material ?? "steel";

    // Minimum stickout = feature depth + clearance
    const minStickout = depth + clearance;

    // Recommended: round up to nearest 5mm for standard gauge lengths
    const recStickout = Math.ceil(minStickout / 5) * 5;

    const LD = recStickout / d;

    // Cutting force estimate if not provided
    const Kc = KC[workMat] ?? 2000;
    const fz = 0.05; // typical finishing feed
    const ap = 1.0;  // typical DOC
    const F = input.cutting_force_n ?? Kc * fz * ap;

    // Moment of inertia: I = π × d⁴ / 64
    const I = (Math.PI * Math.pow(d, 4)) / 64;
    const E = (TOOL_E[toolMat] ?? 580) * 1000; // MPa

    // Holder stiffness factor
    const holderFactor = HOLDER_STIFFNESS[holderType] ?? 1.0;

    // Tip deflection: δ = F × L³ / (3 × E × I × holder_factor)
    const L = recStickout;
    const deflection = (F * Math.pow(L, 3))
      / (3 * E * I * holderFactor);

    // Surface deflection (diameter change)
    const surfDeflection = deflection * 2;

    // Stiffness: k = 3EI × holder / L³
    const stiffness = (3 * E * I * holderFactor) / Math.pow(L, 3);

    // Ra degradation from deflection (μm)
    const raDeg = deflection * 50; // rough estimate

    // Recommended holder based on L/D
    let recHolder: string;
    if (LD <= 3) recHolder = "collet";
    else if (LD <= 4) recHolder = "hydraulic";
    else if (LD <= 5) recHolder = "shrink_fit";
    else recHolder = "shrink_fit + dampened";

    // Warnings
    if (LD > 5) {
      warnings.push(
        `L/D=${r1(LD)} > 5 — high deflection risk, ` +
        "use shortest possible stickout"
      );
    } else if (LD > 4) {
      warnings.push(
        `L/D=${r1(LD)} > 4 — upgrade to shrink-fit holder`
      );
    }
    if (deflection > 0.02) {
      warnings.push(
        `Tip deflection ${r4(deflection)}mm may affect tolerance`
      );
    }
    if (toolMat === "hss" && LD > 3) {
      warnings.push(
        "HSS at high L/D — switch to carbide for 2.8× more stiffness"
      );
    }
    if (holderType === "er" && LD > 3) {
      warnings.push(
        "ER collet at high L/D — upgrade to shrink-fit or hydraulic"
      );
    }

    return {
      minimum_stickout: av(r1(minStickout), "mm", 1,
        `Depth ${depth} + clearance ${clearance}`),
      recommended_stickout: av(recStickout, "mm", 0,
        "Rounded to nearest 5mm gauge length"),
      ld_ratio: av(r1(LD), "ratio", 0.1,
        `${recStickout}mm / ${d}mm`),
      tip_deflection: av(r4(deflection), "mm", 0.002,
        `F=${r0(F)}N, L=${L}mm, E=${TOOL_E[toolMat]}GPa`),
      deflection_at_surface: av(r4(surfDeflection), "mm", 0.004,
        "2× tip deflection (diameter)"),
      stiffness: av(r0(stiffness), "N/mm", 10,
        `3EI/${holderType}/L³`),
      holder_stiffness_factor: av(holderFactor, "×", 0,
        `${holderType} vs collet baseline`),
      ra_degradation: av(r3(raDeg), "μm", 0.1,
        "Estimated finish impact"),
      recommended_holder: av(
        holderFactor, recHolder, 0,
        `Based on L/D=${r1(LD)}`),
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const toolOverhangEngine = new ToolOverhangEngine();
