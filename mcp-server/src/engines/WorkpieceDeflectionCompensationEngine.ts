/**
 * WorkpieceDeflectionCompensationEngine — Cantilevered Bar Deflection & Auto-Compensation
 *
 * Computes workpiece deflection δ(z) along the length of cantilevered bar stock
 * under side milling loads (live tooling on CNC lathes). Outputs a compensation
 * curve that adjusts X-depth per Z-position per flat to eliminate taper error.
 *
 * Physics models:
 *   - Point load cantilever:     δ(z) = F·z³ / (3·E·I)
 *     Ref: Euler-Bernoulli beam theory, Roark's "Formulas for Stress and Strain"
 *   - Distributed load (UDL):    δ(z) = F·z²·(3L - z) / (6·E·I)
 *     Ref: Roark's §8, Table 8.1 case 1a
 *   - Round solid bar:           I = π·D⁴ / 64
 *   - Round hollow bar:          I = π·(D⁴ - d⁴) / 64
 *   - Hexagonal cross-section:   I = 5√3·s⁴ / 16  (where s = side length)
 *     Ref: Machinery's Handbook, section properties
 *
 * Use case: User makes hex pins on a live-tooling lathe. Currently manually compensates
 *   0.001-0.003" taper per flat. This engine replaces that tribal knowledge with physics.
 *
 * @module engines/WorkpieceDeflectionCompensationEngine
 * @milestone LATHE-PRO-MS0.5, Session 13 (U-LPDEFL01)
 */

import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ── Types ──────────────────────────────────────────────────────────

export interface DeflectionCompensationInput {
  /** Stock diameter (mm) */
  stock_diameter_mm: number;
  /** Inner diameter for hollow stock (mm), 0 for solid */
  inner_diameter_mm?: number;
  /** Stickout from spindle face / chuck face (mm) */
  stickout_mm: number;
  /** Material Young's modulus (GPa). Default: 200 (steel) */
  E_GPa?: number;
  /** Material name for E lookup if E_GPa not provided */
  material?: string;
  /** ISO material group for force calculation */
  iso_group?: string;
  /** Side milling cutting force (N). If not provided, computed from Kienzle */
  cutting_force_N?: number;
  /** Width of cut for side milling (mm) — typically flat width */
  width_of_cut_mm?: number;
  /** Depth of cut for side milling (mm) */
  depth_of_cut_mm?: number;
  /** Feed per tooth (mm) for force calc */
  feed_per_tooth_mm?: number;
  /** Number of points along stickout for curve resolution */
  num_points?: number;
  /** Load model: point (force at tip) or distributed (uniform along cut) */
  load_model?: "point" | "distributed";
  /** Tolerance for the feature (mm). Default: 0.025 (0.001") */
  tolerance_mm?: number;
  /** Number of flats (e.g., 6 for hex) — affects I after flats are cut */
  num_flats?: number;
  /** Across-flat dimension after milling (mm) — for hex I calculation */
  across_flat_mm?: number;
}

export interface DeflectionPoint {
  /** Position along bar from chuck face (mm) */
  z_mm: number;
  /** Deflection at this position (mm) — positive = away from tool */
  deflection_mm: number;
  /** Compensation offset to apply (mm) — negative of deflection */
  compensation_mm: number;
}

export interface DeflectionCompensationResult {
  /** Deflection curve along the bar */
  deflection_curve: DeflectionPoint[];
  /** Compensation curve (what to program into X offsets) */
  compensation_curve: DeflectionPoint[];
  /** Maximum deflection at the tip (mm) */
  max_deflection_mm: number;
  /** Total taper across the stickout length (thou / 0.001") */
  total_taper_thou: number;
  /** Total taper (mm) */
  total_taper_mm: number;
  /** Whether deflection is within the specified tolerance */
  within_tolerance: boolean;
  /** Moment of inertia used (mm⁴) — round bar before flats */
  I_round_mm4: number;
  /** Moment of inertia after flats cut (mm⁴) — hex section */
  I_hex_mm4: number | null;
  /** Cutting force used in calculation (N) */
  cutting_force_N: number;
  /** Recommended maximum stickout for this tolerance (mm) */
  recommended_max_stickout_mm: number;
  /** Number of spring passes recommended (0 = none needed) */
  spring_passes_recommended: number;
  /** Support recommendation */
  support_recommendation: string;
  /** Warnings */
  warnings: string[];
}

// ── Material E lookup ──────────────────────────────────────────────

const E_LOOKUP: Record<string, number> = {
  steel: 200, "carbon steel": 200, "alloy steel": 210, "4140": 210, "d2": 210,
  "tool steel": 210, "stainless": 193, "304": 193, "316": 193,
  aluminum: 70, "6061": 69, "7075": 72, "2024": 73,
  titanium: 114, "ti-6al-4v": 114, "ti6al4v": 114,
  brass: 100, copper: 117, bronze: 110,
  "cast iron": 110, "grey iron": 100, "ductile iron": 170,
  inconel: 205, "inconel 718": 205,
  plastic: 3, delrin: 3.1, nylon: 2.8,
};

function resolveE(material?: string, E_GPa?: number): number {
  if (E_GPa && E_GPa > 0) return E_GPa;
  if (!material) return 200; // default steel
  const key = material.toLowerCase().trim();
  return E_LOOKUP[key] ?? 200;
}

// ── Engine ─────────────────────────────────────────────────────────

export class WorkpieceDeflectionCompensationEngine {

  /**
   * Compute deflection curve and compensation offsets for cantilevered bar stock
   * under side milling loads.
   */
  calculate(
    _action: string,
    input: DeflectionCompensationInput,
  ): DeflectionCompensationResult {
    const D = input.stock_diameter_mm;
    const d = input.inner_diameter_mm ?? 0;
    const L = input.stickout_mm;
    const E_GPa = resolveE(input.material, input.E_GPa);
    const E_MPa = E_GPa * 1000; // Convert GPa to MPa (N/mm²)
    const numPoints = input.num_points ?? 20;
    const loadModel = input.load_model ?? "point";
    const tolerance = input.tolerance_mm ?? 0.025; // 0.001"
    const warnings: string[] = [];

    // ── Moment of inertia ──
    // Round solid: I = π·D⁴/64
    // Round hollow: I = π·(D⁴ - d⁴)/64
    // Ref: Roark's, Table A.1
    const I_round = (Math.PI / 64) * (Math.pow(D, 4) - Math.pow(d, 4));

    // Hex cross-section I (after flats are cut)
    // Regular hexagon: I = 5√3·s⁴/16 where s = side length = across_flat / √3
    // Ref: Machinery's Handbook, section properties of regular polygons
    let I_hex: number | null = null;
    if (input.num_flats && input.across_flat_mm) {
      const af = input.across_flat_mm;
      if (input.num_flats === 6) {
        // Regular hexagon: side = across_flat / √3
        const s = af / Math.sqrt(3);
        I_hex = (5 * Math.sqrt(3) / 16) * Math.pow(s, 4);
      } else if (input.num_flats === 4) {
        // Square: I = s⁴/12 where s = across_flat
        I_hex = Math.pow(af, 4) / 12;
      } else {
        // General polygon approximation: use inscribed circle
        const r = af / 2;
        I_hex = (Math.PI / 4) * Math.pow(r, 4) * (1 - 1 / (2 * input.num_flats));
      }
    }

    // Use the WEAKER section (after flats are cut) if available
    const I_effective = I_hex !== null ? Math.min(I_round, I_hex) : I_round;

    // ── Cutting force ──
    let F = input.cutting_force_N ?? 0;
    if (F <= 0) {
      // Estimate from Kienzle: Fc = kc1.1 × ap × f^(1-mc)
      // Ref: Kienzle (1952), "Die Bestimmung von Kräften und Leistungen..."
      const isoGroup = (input.iso_group ?? "P") as keyof typeof CANONICAL_KIENZLE;
      const kienzle = CANONICAL_KIENZLE[isoGroup] ?? CANONICAL_KIENZLE.P;
      const ap = input.width_of_cut_mm ?? (D * 0.3); // default: 30% of stock diameter
      const fz = input.feed_per_tooth_mm ?? 0.08;
      const doc = input.depth_of_cut_mm ?? 1.0;
      // For side milling: Fc = kc1.1 × doc × fz^(1-mc) × (ap/fz correction)
      const h = fz; // undeformed chip thickness ≈ fz for full slot
      F = kienzle.kc1_1 * doc * Math.pow(h, 1 - kienzle.mc);
    }

    if (F <= 0) {
      warnings.push("Cutting force is zero or negative — using 500 N default");
      F = 500;
    }

    // ── Deflection curve ──
    const deflection_curve: DeflectionPoint[] = [];
    const compensation_curve: DeflectionPoint[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const z = (i / numPoints) * L;
      let delta: number;

      if (loadModel === "distributed") {
        // UDL cantilever: δ(z) = (w·z²/(24·E·I)) × (6·L² - 4·L·z + z²)
        // where w = F/L (force per unit length)
        // Simplified: δ(z) = F·z²·(3L - z) / (6·E·I)
        // Ref: Roark's §8, Table 8.1 case 1a
        delta = (F * z * z * (3 * L - z)) / (6 * E_MPa * I_effective);
      } else {
        // Point load at tip: δ(z) = F·z³ / (3·E·I)
        // Ref: Euler-Bernoulli, Roark's §8, Table 8.1 case 1b
        // But for force applied AT position z (not tip), this is:
        // δ(z) = F·z² · (3L - z) / (6·E·I) for load at L
        // For simplicity and worst-case: assume load at current z position
        delta = (F * Math.pow(z, 3)) / (3 * E_MPa * I_effective);
      }

      deflection_curve.push({
        z_mm: Math.round(z * 1000) / 1000,
        deflection_mm: Math.round(delta * 10000) / 10000,
        compensation_mm: Math.round(-delta * 10000) / 10000,
      });

      compensation_curve.push({
        z_mm: Math.round(z * 1000) / 1000,
        deflection_mm: Math.round(delta * 10000) / 10000,
        compensation_mm: Math.round(-delta * 10000) / 10000,
      });
    }

    // ── Max deflection at tip ──
    const maxDeflection = loadModel === "distributed"
      ? (F * L * L * L) / (8 * E_MPa * I_effective)  // UDL: δ_max = wL⁴/8EI = FL³/8EI
      : (F * L * L * L) / (3 * E_MPa * I_effective);  // Point: δ_max = FL³/3EI

    // Total taper = max deflection (at tip) minus deflection at chuck (0)
    const totalTaper_mm = maxDeflection;
    const totalTaper_thou = totalTaper_mm / 0.0254; // mm to thou (0.001")

    const withinTolerance = totalTaper_mm <= tolerance;

    // ── Recommended max stickout for this tolerance ──
    // Solve: tolerance = F·L³/(3EI) → L = (3EI·tolerance/F)^(1/3)
    const maxStickout = Math.pow(
      (3 * E_MPa * I_effective * tolerance) / Math.max(F, 1),
      1 / 3,
    );

    // ── Spring passes ──
    // If deflection > tolerance, recommend spring passes
    let springPasses = 0;
    if (!withinTolerance) {
      // Each spring pass reduces remaining deflection by ~50-70%
      let remaining = totalTaper_mm;
      while (remaining > tolerance && springPasses < 5) {
        remaining *= 0.4; // assume 60% reduction per pass
        springPasses++;
      }
    }

    // ── Support recommendation ──
    let supportRec = "No support needed — deflection within tolerance";
    const ldRatio = L / D;
    if (ldRatio > 6) {
      supportRec = "CRITICAL: L/D > 6 — tailstock or steady rest required";
      warnings.push(`L/D ratio ${ldRatio.toFixed(1)} exceeds 6 — deflection will be excessive without support`);
    } else if (ldRatio > 4) {
      supportRec = "Tailstock support recommended for L/D > 4";
      warnings.push(`L/D ratio ${ldRatio.toFixed(1)} — consider tailstock support`);
    } else if (!withinTolerance) {
      supportRec = `Deflection ${(totalTaper_thou).toFixed(3)} thou exceeds tolerance — use ${springPasses} spring pass(es) or reduce stickout to ${maxStickout.toFixed(1)} mm`;
    }

    // ── L/D warnings ──
    if (D < 10 && L > 30) {
      warnings.push("Small diameter stock with significant stickout — high deflection risk");
    }

    return {
      deflection_curve,
      compensation_curve,
      max_deflection_mm: Math.round(maxDeflection * 10000) / 10000,
      total_taper_thou: Math.round(totalTaper_thou * 1000) / 1000,
      total_taper_mm: Math.round(totalTaper_mm * 10000) / 10000,
      within_tolerance: withinTolerance,
      I_round_mm4: Math.round(I_round * 100) / 100,
      I_hex_mm4: I_hex !== null ? Math.round(I_hex * 100) / 100 : null,
      cutting_force_N: Math.round(F * 10) / 10,
      recommended_max_stickout_mm: Math.round(maxStickout * 10) / 10,
      spring_passes_recommended: springPasses,
      support_recommendation: supportRec,
      warnings,
    };
  }
}

// ── Singleton Export ────────────────────────────────────────────────

export const workpieceDeflectionCompensationEngine = new WorkpieceDeflectionCompensationEngine();
