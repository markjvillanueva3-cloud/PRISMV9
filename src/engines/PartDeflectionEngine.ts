/**
 * PartDeflectionEngine — Thin Wall & Part Deflection Calculator
 *
 * Calculates workpiece deflection under cutting loads:
 * - Thin wall deflection (cantilever/simply-supported)
 * - Floor deflection for pocket bottoms
 * - Maximum allowable cutting force for tolerance
 * - Suggested DOC and feed limits
 * - Support strategies (backing, rest pads)
 *
 * Key physics: Cantilever wall δ = F·H³/(3·E·I) where
 * I = L·t³/12 for rectangular section. Simply-supported:
 * δ = F·L³/(48·E·I). Floor deflection modeled as clamped
 * plate: δ = α·F·a²/(E·t³) with α depending on aspect ratio.
 *
 * Reference: Roark's Formulas for Stress and Strain,
 *            Sandvik thin-wall machining guide,
 *            Machinery's Handbook deflection tables
 *
 * Actions: part_deflection_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PartDeflectionInput {
  wall_height_mm?: number;
  wall_thickness_mm: number;
  wall_length_mm?: number;
  support_type?: "cantilever" | "simply_supported" | "clamped";
  cutting_force_n?: number;
  material_e_gpa?: number;
  material?: "steel" | "aluminum" | "titanium" | "plastic";
  tolerance_mm?: number;
  floor_mode?: boolean;
  floor_span_mm?: number;
}

export interface PartDeflectionResult {
  max_deflection: AtomicValue;
  deflection_to_tolerance: AtomicValue;
  max_allowable_force: AtomicValue;
  suggested_max_doc: AtomicValue;
  spring_passes_needed: AtomicValue;
  natural_frequency: AtomicValue;
  support_recommended: AtomicValue;
  wall_stiffness: AtomicValue;
  stress_at_base: AtomicValue;
  passes_ok: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Young's modulus (GPa) */
const E_VALUES: Record<string, number> = {
  steel: 200,
  aluminum: 70,
  titanium: 114,
  plastic: 3,
};

/** Yield strength (MPa) for stress check */
const YIELD: Record<string, number> = {
  steel: 350,
  aluminum: 275,
  titanium: 880,
  plastic: 50,
};

// ── Engine ─────────────────────────────────────────────────────────

export class PartDeflectionEngine {
  calculate(input: PartDeflectionInput): PartDeflectionResult {
    const warnings: string[] = [];
    const t = input.wall_thickness_mm;
    const H = input.wall_height_mm ?? 50;
    const L = input.wall_length_mm ?? 100;
    const support = input.support_type ?? "cantilever";
    const F = input.cutting_force_n ?? 200;
    const mat = input.material ?? "steel";
    const E_gpa = input.material_e_gpa ?? E_VALUES[mat] ?? 200;
    const tol = input.tolerance_mm ?? 0.05;
    const floorMode = input.floor_mode ?? false;
    const floorSpan = input.floor_span_mm ?? L;

    const E = E_gpa * 1000; // GPa → MPa

    let deflection: number;
    let I: number;
    let stiffness: number;

    if (floorMode) {
      // Clamped plate: δ ≈ 0.0138 × F × a⁴ / (E × t³ × a²)
      // Simplified: δ = 0.014 × F × a² / (E × t³)
      // where a = span
      const a = floorSpan;
      deflection = 0.014 * F * a * a / (E * t * t * t);
      I = L * t * t * t / 12;
      stiffness = E * t * t * t / (0.014 * a * a);
    } else {
      // Wall section: I = L × t³ / 12
      I = L * t * t * t / 12;

      if (support === "cantilever") {
        // δ = F·H³/(3·E·I)
        deflection = (F * H * H * H) / (3 * E * I);
        stiffness = 3 * E * I / (H * H * H);
      } else if (support === "simply_supported") {
        // δ = F·H³/(48·E·I)
        deflection = (F * H * H * H) / (48 * E * I);
        stiffness = 48 * E * I / (H * H * H);
      } else {
        // Clamped both ends: δ = F·H³/(192·E·I)
        deflection = (F * H * H * H) / (192 * E * I);
        stiffness = 192 * E * I / (H * H * H);
      }
    }

    // Deflection to tolerance ratio
    const defToTol = tol > 0 ? (deflection / tol) * 100 : 100;

    // Max allowable force (for given tolerance)
    const maxForce = deflection > 0
      ? F * (tol / deflection) : F * 10;

    // Suggested max DOC (rough: force proportional to DOC)
    // If current force gives too much deflection, reduce DOC
    const docFactor = Math.min(tol / Math.max(deflection, 0.0001), 1);
    const suggestedDoc = docFactor * 2; // assume 2mm nominal DOC

    // Spring passes needed
    let springPasses: number;
    if (deflection < tol * 0.5) springPasses = 0;
    else if (deflection < tol) springPasses = 1;
    else if (deflection < tol * 3) springPasses = 2;
    else springPasses = 3;

    // Natural frequency (Hz) — cantilever fundamental
    // f = (1.875²/(2π)) × √(E·I/(ρ·A·L⁴))
    const rhoKg = mat === "aluminum" ? 2700
      : mat === "titanium" ? 4500
      : mat === "plastic" ? 1200
      : 7800;
    const A_m2 = (t / 1000) * (L / 1000);
    const I_m4 = I * 1e-12;
    const H_m = H / 1000;
    const natFreq = H_m > 0
      ? (1.875 * 1.875 / (2 * Math.PI)) *
        Math.sqrt((E * 1e6 * I_m4) / (rhoKg * A_m2 * Math.pow(H_m, 4)))
      : 0;

    // Stress at base (cantilever: σ = F·H / (I/c) where c = t/2)
    const c = t / 2;
    const sectionMod = I / c;
    const stress = sectionMod > 0 ? (F * H) / sectionMod : 0;
    const yieldStr = YIELD[mat] ?? 350;

    // Support recommended?
    const supportRec = deflection > tol;

    // Passes OK?
    const passesOk = deflection <= tol;

    // Warnings
    if (deflection > tol) {
      warnings.push(
        `Deflection ${r4(deflection)}mm exceeds tolerance ` +
        `${tol}mm — reduce force or add support`
      );
    }
    if (deflection > tol * 3) {
      warnings.push(
        "Deflection >3× tolerance — " +
        "spring passes alone may be insufficient"
      );
    }
    if (t < 1.0 && mat !== "plastic") {
      warnings.push(
        `Wall thickness ${t}mm is very thin — ` +
        "consider vacuum or wax fixturing"
      );
    }
    if (H / t > 15) {
      warnings.push(
        `Height/thickness ratio ${r1(H / t)} is extreme — ` +
        "high chatter risk"
      );
    }
    if (stress > yieldStr * 0.6) {
      warnings.push(
        `Stress ${r0(stress)} MPa approaches yield ${yieldStr} MPa — ` +
        "risk of permanent deformation"
      );
    }
    if (mat === "aluminum" && t < 2) {
      warnings.push(
        "Thin aluminum wall — use high speed, low force strategy"
      );
    }

    return {
      max_deflection: av(r4(deflection), "mm", 0.002,
        `F·H³/(k·E·I), ${support}`),
      deflection_to_tolerance: av(r1(defToTol), "%", 2,
        `${r4(deflection)} / ${tol} × 100`),
      max_allowable_force: av(r0(maxForce), "N", 5,
        `Force for ${tol}mm deflection`),
      suggested_max_doc: av(r2(suggestedDoc), "mm", 0.1,
        "DOC scaled to meet tolerance"),
      spring_passes_needed: av(springPasses, "passes", 0,
        "Based on deflection/tolerance ratio"),
      natural_frequency: av(r0(natFreq), "Hz", 10,
        "1st mode cantilever beam"),
      support_recommended: av(supportRec ? 1 : 0,
        supportRec ? "YES" : "NO", 0,
        `Deflection ${supportRec ? ">" : "≤"} tolerance`),
      wall_stiffness: av(r1(stiffness), "N/mm", 1,
        `k·E·I/H³`),
      stress_at_base: av(r0(stress), "MPa", 5,
        `F·H / (I/c)`),
      passes_ok: av(passesOk ? 1 : 0,
        passesOk ? "OK" : "NEEDS_SUPPORT", 0,
        "Single pass within tolerance?"),
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
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const partDeflectionEngine = new PartDeflectionEngine();
