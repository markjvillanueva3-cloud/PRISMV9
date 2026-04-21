/**
 * SwissGuideBushDecisionEngine
 * ============================
 *
 * Decides between **guide-bush mode** and **non-guide-bush mode** on Swiss-type
 * lathes, with the physical model for each case (U-LPS21, MS6b).
 *
 * Guide-bush mode (GB):
 *   - Bar runs through a close-tolerance stationary bushing.
 *   - Effective deflection length L = distance from BUSHING FACE (short).
 *   - Requires h6 ground bar stock (+0/−0.013 mm for 10–18 mm dia).
 *   - Much stiffer cutting → tighter tolerances achievable, finer Ra.
 *   - Requires more setup / swap overhead when changing bar diameter.
 *
 * Non-guide-bush mode (non-GB):
 *   - Bar clamped only by main collet; front overhang unsupported.
 *   - Effective deflection length L = distance from MAIN COLLET FACE (long).
 *   - Accepts h9 cold-drawn stock (+0/−0.052 mm for 10–18 mm dia).
 *   - Simpler setup, lower bar-cost requirement, but more deflection.
 *
 * Decision rule (composite):
 *   Use GB when ANY hold:
 *     - target tolerance < 0.02 mm (20 µm)
 *     - L/D of projected cut > 4
 *     - target Ra < 0.8 µm
 *     - target Ra < 0.4 µm (HARD — GB required for mirror finish Swiss work)
 *   Otherwise non-GB is acceptable and saves bar cost.
 *
 * Physics formulas (cantilever deflection of a bar stub under radial force F):
 *   δ = F · L³ / (3 · E · I)        with I = π · D⁴ / 64
 *   L_GB   = projection from bushing face (typical 3–8 mm)
 *   L_noGB = projection from main collet face (typical 20–80 mm)
 *
 * Collet pressure (clamping contact pressure, MPa):
 *   P = F_clamp / (π · D · L_contact · μ)
 *   μ ≈ 0.12 (smooth jaws) | 0.25 (serrated jaws)
 *   Used to flag thin-wall parts at risk of deformation.
 *
 * References:
 *   - Citizen GB/non-GB technical notes §4
 *   - Star CNC Guide Bush Setup Manual §2
 *   - EN 10278 bar tolerance classes (h6/h9)
 *   - Altintas Y. "Manufacturing Automation" (2012) §4.5 cantilever deflection
 *
 * @module engines/SwissGuideBushDecisionEngine
 * @milestone LATHE-PRO-MS6b / U-LPS21
 */

export type BarToleranceClass = "h6" | "h9" | "h8" | "h11" | "unknown";

export interface GuideBushInput {
  /** Bar diameter (mm). */
  bar_diameter_mm: number;
  /** Bar tolerance class. Determines GB eligibility. */
  bar_tolerance_class: BarToleranceClass;
  /** Projection (mm) from bushing face OR main collet face to cutting zone. */
  projection_mm: number;
  /** Target dimensional tolerance (mm). Drives GB recommendation. */
  target_tolerance_mm: number;
  /** Target surface finish Ra (µm). */
  target_ra_um: number;
  /** Bushing overhang (mm) when GB mode is chosen. */
  bushing_overhang_mm?: number;
  /** Main collet overhang (mm) when non-GB mode is chosen. */
  collet_overhang_mm?: number;
  /** Radial cutting force (N). Used for deflection calc. */
  radial_force_n: number;
  /** Material Young's modulus (GPa). Default 210 (steel). */
  youngs_modulus_gpa?: number;
  /** Clamping force (N) — used for thin-wall pressure check. */
  clamping_force_n?: number;
  /** Collet contact length (mm). Default 15. */
  collet_contact_length_mm?: number;
  /** Collet jaw friction coefficient. Default 0.15. */
  collet_mu?: number;
  /** Wall thickness (mm) — flags thin-wall deformation when small. */
  wall_thickness_mm?: number;
}

export type GuideBushMode = "guide_bush" | "non_guide_bush" | "either";

export interface GuideBushResult {
  recommended_mode: GuideBushMode;
  reasoning: string[];
  /** Deflection under GB mode (mm). May be undefined when L_bush not supplied. */
  deflection_gb_mm?: number;
  /** Deflection under non-GB mode (mm). May be undefined when L_collet not supplied. */
  deflection_nongb_mm?: number;
  /** Collet pressure (MPa). */
  collet_pressure_mpa?: number;
  /** True when bar tolerance supports the recommended mode. */
  bar_tolerance_ok: boolean;
  warnings: string[];
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Bar tolerance check — GB mode strictly requires h6, non-GB accepts h9 or tighter. */
function toleranceOK(klass: BarToleranceClass, mode: GuideBushMode): boolean {
  if (mode === "guide_bush") return klass === "h6";
  if (mode === "non_guide_bush") return klass === "h6" || klass === "h8" || klass === "h9";
  return true;
}

export class SwissGuideBushDecisionEngine {
  /**
   * Recommend GB vs non-GB mode and compute both deflections.
   */
  decide(input: GuideBushInput): GuideBushResult {
    const reasoning: string[] = [];
    const warnings: string[] = [];
    const E_Pa = (input.youngs_modulus_gpa ?? 210) * 1e9;
    const D_m = input.bar_diameter_mm / 1000;
    const I_m4 = (Math.PI * Math.pow(D_m, 4)) / 64;
    const F = input.radial_force_n;

    // Deflection in GB mode uses bushing overhang.
    let deflGb: number | undefined;
    if (input.bushing_overhang_mm != null) {
      const L_m = input.bushing_overhang_mm / 1000;
      deflGb = round4(((F * Math.pow(L_m, 3)) / (3 * E_Pa * I_m4)) * 1000); // mm
    }
    // Deflection in non-GB mode uses main-collet overhang.
    let deflNonGb: number | undefined;
    if (input.collet_overhang_mm != null) {
      const L_m = input.collet_overhang_mm / 1000;
      deflNonGb = round4(((F * Math.pow(L_m, 3)) / (3 * E_Pa * I_m4)) * 1000); // mm
    }

    // Composite decision.
    const reasons: string[] = [];
    let needsGb = false;
    if (input.target_tolerance_mm < 0.02) {
      reasons.push(`tolerance ${input.target_tolerance_mm}mm < 0.02mm → GB`);
      needsGb = true;
    }
    if (input.target_ra_um < 0.8) {
      reasons.push(`Ra ${input.target_ra_um}µm < 0.8µm → GB`);
      needsGb = true;
    }
    if (input.target_ra_um < 0.4) {
      reasons.push(`Ra ${input.target_ra_um}µm < 0.4µm REQUIRES GB (mirror-class)`);
      needsGb = true;
    }
    if (input.bar_diameter_mm > 0) {
      const L = input.projection_mm;
      const LD = L / input.bar_diameter_mm;
      if (LD > 4) {
        reasons.push(`L/D=${round4(LD)} > 4 → GB for stiffness`);
        needsGb = true;
      }
    }

    let mode: GuideBushMode = needsGb ? "guide_bush" : "non_guide_bush";
    if (reasons.length === 0) {
      mode = "either";
      reasoning.push("No hard GB criterion triggered — either mode acceptable.");
    } else {
      reasoning.push(...reasons);
    }

    // Verify bar tolerance supports the recommended mode.
    const tolOK = toleranceOK(input.bar_tolerance_class, mode);
    if (!tolOK && mode === "guide_bush") {
      warnings.push(
        `GB mode recommended but bar is ${input.bar_tolerance_class} — GB requires h6 ground stock. ` +
          `Either source h6 bar OR switch to non-GB mode and accept reduced stiffness.`,
      );
    }

    // Collet-pressure thin-wall check.
    let pressure: number | undefined;
    if (input.clamping_force_n != null) {
      const L_contact = input.collet_contact_length_mm ?? 15;
      const mu = input.collet_mu ?? 0.15;
      // P = F / (π · D · L · μ), result in N/mm² = MPa.
      const pressurePa =
        input.clamping_force_n / (Math.PI * input.bar_diameter_mm * L_contact * mu);
      pressure = round4(pressurePa); // already MPa since F in N and lengths in mm
      if (input.wall_thickness_mm != null && input.wall_thickness_mm < 1.5) {
        if (pressure > 30) {
          warnings.push(
            `Thin-wall part (${input.wall_thickness_mm}mm) with collet pressure ${pressure}MPa — ` +
              `risk of ovality. Reduce clamp force or use soft jaws.`,
          );
        }
      }
    }

    return {
      recommended_mode: mode,
      reasoning,
      deflection_gb_mm: deflGb,
      deflection_nongb_mm: deflNonGb,
      collet_pressure_mpa: pressure,
      bar_tolerance_ok: tolOK,
      warnings,
    };
  }
}

/** Singleton instance. */
export const swissGuideBushDecisionEngine = new SwissGuideBushDecisionEngine();
