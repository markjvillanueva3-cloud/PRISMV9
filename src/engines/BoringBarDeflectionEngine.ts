/**
 * BoringBarDeflectionEngine — Boring Bar Deflection & Selection
 *
 * Calculates boring bar deflection and recommends bars:
 * - Static deflection from cutting force and overhang
 * - L/D ratio limits for steel, carbide, dampened bars
 * - Surface finish impact from deflection
 * - Bar material recommendation (steel vs carbide vs dampened)
 * - Minimum bar diameter for given overhang
 *
 * Key physics: Boring bar acts as a cantilever beam.
 * Deflection δ = F×L³/(3×E×I) where I = π×d⁴/64.
 * Steel bars limited to L/D ≤ 4, carbide to 6, dampened
 * to 10. Deflection causes taper on bore wall and poor
 * surface finish. Dynamic stiffness (dampened) bars use
 * a tuned mass damper to suppress chatter.
 *
 * Reference: Sandvik Boring Bar Application Guide,
 *            Machinery's Handbook Ch.29 (Boring),
 *            Kennametal Silent Tools Guide
 *
 * Actions: boring_bar_deflection_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface BoringBarDeflectionInput {
  bar_diameter_mm: number;
  overhang_mm: number;
  bore_diameter_mm?: number;
  depth_of_cut_mm?: number;
  feed_per_rev_mm?: number;
  bar_material?: "steel" | "carbide" | "dampened"
    | "heavy_metal";
  work_material?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron";
  tolerance_mm?: number;
}

export interface BoringBarDeflectionResult {
  ld_ratio: AtomicValue;
  cutting_force: AtomicValue;
  static_deflection: AtomicValue;
  deflection_at_surface: AtomicValue;
  max_recommended_ld: AtomicValue;
  recommended_bar_type: AtomicValue;
  min_bar_diameter: AtomicValue;
  surface_finish_impact: AtomicValue;
  bore_taper_from_deflection: AtomicValue;
  stiffness: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Young's modulus in GPa */
const BAR_E: Record<string, number> = {
  steel: 210,
  carbide: 600, // QA-MS3 FIX: canonical CANONICAL_TOOL_MODULUS (was 580)
  dampened: 210, // body is steel, but dampened
  heavy_metal: 345,
};

/** Max L/D before chatter */
const MAX_LD: Record<string, number> = {
  steel: 4,
  carbide: 6,
  dampened: 10,
  heavy_metal: 5,
};

/** Specific cutting force Kc (N/mm²) */
const KC: Record<string, number> = {
  steel: 2000,
  aluminum: 800,
  titanium: 1600,
  stainless: 2200,
  cast_iron: 1200,
};

// ── Engine ─────────────────────────────────────────────────────────

export class BoringBarDeflectionEngine {
  calculate(input: BoringBarDeflectionInput): BoringBarDeflectionResult {
    const warnings: string[] = [];
    const d = input.bar_diameter_mm;
    const L = input.overhang_mm;
    const barMat = input.bar_material ?? "steel";
    const workMat = input.work_material ?? "steel";
    const doc = input.depth_of_cut_mm ?? 0.5;
    const fr = input.feed_per_rev_mm ?? 0.15;
    const tol = input.tolerance_mm ?? 0.02;

    const LD = L / d;

    // Cutting force: F = Kc × ap × f
    const Kc = KC[workMat] ?? 2000;
    const cuttingForce = Kc * doc * fr;

    // Moment of inertia: I = π × d⁴ / 64
    const I = (Math.PI * Math.pow(d, 4)) / 64;

    // Young's modulus
    const E = (BAR_E[barMat] ?? 210) * 1000; // Convert GPa to MPa

    // Static deflection: δ = F × L³ / (3 × E × I)
    const deflection = (cuttingForce * Math.pow(L, 3))
      / (3 * E * I);

    // Deflection at surface (diameter change = 2× deflection)
    const surfaceDeflection = deflection * 2;

    // Dampening factor reduces effective deflection
    const dampFactor = barMat === "dampened" ? 0.3 : 1.0;
    const effectiveDeflection = deflection * dampFactor;

    // Max recommended L/D
    const maxLD = MAX_LD[barMat] ?? 4;

    // Recommended bar type based on L/D
    let recType: string;
    if (LD <= 4) recType = "steel";
    else if (LD <= 6) recType = "carbide";
    else if (LD <= 10) recType = "dampened";
    else recType = "dampened (extended)";

    // Minimum bar diameter for this overhang (at max L/D for type)
    const minDia = L / maxLD;

    // Stiffness: k = 3EI/L³
    const stiffness = (3 * E * I) / Math.pow(L, 3);

    // Surface finish impact (Ra increase from deflection)
    // Rough estimate: vibration adds ~0.5μm per 0.01mm deflection
    const raIncrease = effectiveDeflection * 50; // μm

    // Bore taper: deflection varies along bore length
    const boreTaper = effectiveDeflection * 2; // total taper

    // Warnings
    if (LD > maxLD) {
      warnings.push(
        `L/D=${r1(LD)} exceeds ${barMat} limit of ${maxLD} — ` +
        "expect chatter"
      );
    }
    if (effectiveDeflection > tol) {
      warnings.push(
        `Deflection ${r4(effectiveDeflection)}mm > ` +
        `tolerance ${tol}mm — reduce DOC or use stiffer bar`
      );
    }
    if (LD > 4 && barMat === "steel") {
      warnings.push(
        "Steel bar at L/D > 4 — upgrade to carbide or dampened"
      );
    }
    if (LD > 6 && barMat === "carbide") {
      warnings.push(
        "Carbide bar at L/D > 6 — upgrade to dampened bar"
      );
    }
    if (doc > d * 0.1) {
      warnings.push(
        "DOC > 10% of bar diameter — high deflection risk"
      );
    }

    return {
      ld_ratio: av(r1(LD), "ratio", 0.1,
        `${L}mm / ${d}mm`),
      cutting_force: av(r1(cuttingForce), "N", 5,
        `Kc=${Kc} × ap=${doc} × f=${fr}`),
      static_deflection: av(r4(deflection), "mm", 0.001,
        `F×L³/(3EI), E=${BAR_E[barMat]}GPa`),
      deflection_at_surface: av(r4(surfaceDeflection), "mm", 0.002,
        "2× static deflection (diameter)"),
      max_recommended_ld: av(maxLD, "ratio", 0,
        `${barMat} bar limit`),
      recommended_bar_type: av(
        recType === "steel" ? 0
          : recType === "carbide" ? 1
          : 2,
        recType, 0,
        `Based on L/D=${r1(LD)}`),
      min_bar_diameter: av(r1(minDia), "mm", 0.5,
        `${L}mm / ${maxLD} (max L/D for ${barMat})`),
      surface_finish_impact: av(r2(raIncrease), "μm Ra", 0.1,
        "Estimated Ra increase from vibration"),
      bore_taper_from_deflection: av(r4(boreTaper), "mm", 0.002,
        "2× deflection along bore"),
      stiffness: av(r0(stiffness), "N/mm", 10,
        "3EI/L³"),
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

export const boringBarDeflectionEngine = new BoringBarDeflectionEngine();
