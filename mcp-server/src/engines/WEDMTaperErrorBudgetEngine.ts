/**
 * WEDMTaperErrorBudgetEngine — Wire EDM Taper Programming Error Budget
 * P2P-FULLSTACK-MS0 / U-P2PFS42
 *
 * Purpose
 * -------
 * For a programmed taper angle θ on a part of height h, compute the
 * UV-axis travel, the per-error-source contributors to wall straightness
 * at the mid-plane, and the RSS-combined error budget. Predicts the
 * achievable ISO 286 IT tolerance class and flags when the requested taper
 * exceeds the machine's guide geometry.
 *
 * Physics
 * -------
 *   UV travel:
 *     UV = h × tan(θ)
 *
 *   Error contributors (all µm, per-side from wire centerline):
 *     guide       — RSS of upper & lower guide positional tolerances
 *     uv_encoder  — UV encoder resolution × small per-mm UV travel factor
 *     wire_bow    — linear in taper angle (scaled from deflection engine)
 *     calibration — small residual if auto-calibration disabled
 *
 *   Total error (RSS):
 *     ε_total = sqrt(ε_guide² + ε_uv² + ε_bow² + ε_cal²)
 *
 *   IT tolerance class (ISO 286-1) assigned as the first IT band that
 *   contains ε_total. If ε_total > IT12 → "out_of_spec".
 *
 * Sources
 *   • Mitsubishi MV-series Programming Manual §5 (taper tables)
 *   • Sodick VL400Q Maintenance Guide §2.4 (guide tolerances)
 *   • Agiecharmilles CUT series tech spec (H-head geometry)
 *   • ISO 286-1:2010 tolerance tables
 */

import { WEDM_TAPER_SPEC } from "../physics/wedm-constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface TaperErrorBudgetInput {
  /** Programmed taper angle [deg]. Positive = outward-opening. */
  taper_angle_deg: number;
  /** Part height (cut thickness) [mm]. */
  part_height_mm: number;
  /** Upper-to-lower guide span [mm]. Defaults to WEDM_TAPER_SPEC.default_guide_span_mm. */
  guide_span_mm?: number;
  /** Upper guide per-side positional tolerance [µm]. Defaults to 3 µm. */
  upper_guide_tolerance_um?: number;
  /** Lower guide per-side positional tolerance [µm]. Defaults to 3 µm. */
  lower_guide_tolerance_um?: number;
  /** Whether auto-calibration is active (halves residual calibration error). */
  auto_calibration?: boolean;
  /** Guide style — determines max programmable taper angle. */
  guide_style?: "standard" | "extended";
}

export type TaperTolerance =
  | "IT6"
  | "IT7"
  | "IT8"
  | "IT9"
  | "IT10"
  | "IT11"
  | "IT12"
  | "out_of_spec";

export interface TaperErrorSource {
  name: string;
  contribution_um: number;
  description: string;
}

export interface TaperErrorBudgetResult {
  /** UV-axis travel required for the programmed taper [mm]. */
  uv_travel_mm: number;
  /** RSS-combined wall-straightness error at mid-plane [µm]. */
  total_error_um: number;
  /** Per-source contribution. */
  error_sources: TaperErrorSource[];
  /** First IT band containing total_error_um, or "out_of_spec". */
  achievable_tolerance_class: TaperTolerance;
  /** Max programmable taper for the selected guide style [deg]. */
  max_practical_taper_deg: number;
  /** Whether the requested taper exceeds guide geometry limits. */
  exceeds_guide_limit: boolean;
  warnings: string[];
  recommendations: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMTaperErrorBudgetEngine {
  /**
   * Compute the taper programming error budget + UV travel.
   * Throws on non-finite or out-of-range angles, negative part height,
   * non-positive guide span, or negative guide tolerances.
   */
  calculate(input: TaperErrorBudgetInput): TaperErrorBudgetResult {
    this.validate(input);

    const spec = WEDM_TAPER_SPEC;
    const {
      taper_angle_deg,
      part_height_mm,
      guide_span_mm = spec.default_guide_span_mm,
      upper_guide_tolerance_um = spec.default_guide_tolerance_um,
      lower_guide_tolerance_um = spec.default_guide_tolerance_um,
      auto_calibration = true,
      guide_style = "standard",
    } = input;

    const absAngle = Math.abs(taper_angle_deg);
    const angleRad = (absAngle * Math.PI) / 180;
    const uv_travel_mm = round3(part_height_mm * Math.tan(angleRad));

    // Per-source error [µm]:
    //   guide:       RSS of upper+lower tolerances, averaged to mid-plane.
    //     At the mid-plane (h/2 from lower guide), the wire position error
    //     interpolates linearly between upper & lower guide errors. The
    //     worst-case mid-plane error is the average of the two, but RSS
    //     is appropriate when guide errors are independent random vars.
    const guide_um = Math.sqrt(
      Math.pow(upper_guide_tolerance_um / 2, 2) +
        Math.pow(lower_guide_tolerance_um / 2, 2),
    );

    //   uv_encoder:  resolution scaled by UV travel (each mm of travel
    //                carries ~1 encoder count of uncertainty).
    const uv_um = spec.uv_encoder_resolution_um * Math.max(1, uv_travel_mm);

    //   wire_bow:    linear in taper angle, zero when not tapering.
    const bow_um = spec.wire_bow_per_deg_taper_um * absAngle;

    //   calibration: 0.5 µm residual if AT, 2 µm if manual calibration.
    const cal_um = auto_calibration ? 0.5 : 2.0;

    const total_error_um = round1(
      Math.sqrt(
        Math.pow(guide_um, 2) +
          Math.pow(uv_um, 2) +
          Math.pow(bow_um, 2) +
          Math.pow(cal_um, 2),
      ),
    );

    const error_sources: TaperErrorSource[] = [
      {
        name: "Guide tolerance",
        contribution_um: round1(guide_um),
        description: `RSS of upper (${upper_guide_tolerance_um} µm) and lower (${lower_guide_tolerance_um} µm) guide tolerances at mid-plane`,
      },
      {
        name: "UV encoder resolution",
        contribution_um: round1(uv_um),
        description: `${spec.uv_encoder_resolution_um} µm per mm over ${uv_travel_mm.toFixed(2)} mm UV travel`,
      },
      {
        name: "Wire bow at taper",
        contribution_um: round1(bow_um),
        description: `${spec.wire_bow_per_deg_taper_um} µm/° scaled by ${absAngle.toFixed(1)}°`,
      },
      {
        name: "Calibration residual",
        contribution_um: round1(cal_um),
        description: auto_calibration
          ? "Auto-calibration active — typical 0.5 µm residual"
          : "Manual calibration — typical 2 µm residual",
      },
    ];

    const achievable_tolerance_class = this.classifyIT(total_error_um);
    const max_practical_taper_deg =
      guide_style === "extended" ? spec.extended_max_taper_deg : spec.standard_max_taper_deg;
    const exceeds_guide_limit = absAngle > max_practical_taper_deg;

    const warnings = this.buildWarnings(
      absAngle,
      exceeds_guide_limit,
      achievable_tolerance_class,
      part_height_mm,
      guide_span_mm,
    );
    const recommendations = this.buildRecommendations(
      achievable_tolerance_class,
      auto_calibration,
      exceeds_guide_limit,
      guide_style,
    );

    return {
      uv_travel_mm,
      total_error_um,
      error_sources,
      achievable_tolerance_class,
      max_practical_taper_deg,
      exceeds_guide_limit,
      warnings,
      recommendations,
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────────

  private validate(input: TaperErrorBudgetInput): void {
    const {
      taper_angle_deg,
      part_height_mm,
      guide_span_mm,
      upper_guide_tolerance_um,
      lower_guide_tolerance_um,
    } = input;

    if (!Number.isFinite(taper_angle_deg)) {
      throw new Error(`Invalid taper_angle_deg: ${taper_angle_deg} — must be a finite number`);
    }
    if (Math.abs(taper_angle_deg) >= 90) {
      throw new Error(
        `Invalid taper_angle_deg: ${taper_angle_deg} — must be in (-90, 90) degrees`,
      );
    }
    if (!(part_height_mm > 0)) {
      throw new Error(`Invalid part_height_mm: ${part_height_mm} — must be > 0`);
    }
    if (guide_span_mm != null && !(guide_span_mm > 0)) {
      throw new Error(`Invalid guide_span_mm: ${guide_span_mm} — must be > 0`);
    }
    if (upper_guide_tolerance_um != null && !(upper_guide_tolerance_um >= 0)) {
      throw new Error(
        `Invalid upper_guide_tolerance_um: ${upper_guide_tolerance_um} — must be >= 0`,
      );
    }
    if (lower_guide_tolerance_um != null && !(lower_guide_tolerance_um >= 0)) {
      throw new Error(
        `Invalid lower_guide_tolerance_um: ${lower_guide_tolerance_um} — must be >= 0`,
      );
    }
  }

  private classifyIT(total_um: number): TaperTolerance {
    const it = WEDM_TAPER_SPEC.it_tolerance_um;
    if (total_um <= it.IT6) return "IT6";
    if (total_um <= it.IT7) return "IT7";
    if (total_um <= it.IT8) return "IT8";
    if (total_um <= it.IT9) return "IT9";
    if (total_um <= it.IT10) return "IT10";
    if (total_um <= it.IT11) return "IT11";
    if (total_um <= it.IT12) return "IT12";
    return "out_of_spec";
  }

  private buildWarnings(
    angle: number,
    exceeds: boolean,
    it: TaperTolerance,
    height: number,
    span: number,
  ): string[] {
    const w: string[] = [];
    if (exceeds) {
      w.push(
        `Taper ${angle.toFixed(1)}° exceeds guide geometry limit — install extended (H-head) guides or reduce taper angle.`,
      );
    }
    if (it === "out_of_spec") {
      w.push(
        "Combined error exceeds IT12 — this taper cannot meet any standard IT tolerance class.",
      );
    }
    if (height > span * 0.75) {
      w.push(
        `Part height ${height.toFixed(0)} mm is close to guide span ${span.toFixed(0)} mm — expect increased wire bow and reduced taper accuracy.`,
      );
    }
    return w;
  }

  private buildRecommendations(
    it: TaperTolerance,
    auto: boolean,
    exceeds: boolean,
    guide_style: "standard" | "extended",
  ): string[] {
    const r: string[] = [];
    if (it === "IT6" || it === "IT7") {
      r.push(`Achievable tolerance: ${it} — suitable for precision gauge and die work.`);
    } else if (it === "IT8" || it === "IT9") {
      r.push(`Achievable tolerance: ${it} — suitable for general precision WEDM.`);
    } else if (it === "IT10" || it === "IT11" || it === "IT12") {
      r.push(`Achievable tolerance: ${it} — suitable for coarse production only.`);
    }
    if (!auto) {
      r.push("Enable auto-calibration to reduce calibration residual from 2 µm to 0.5 µm.");
    }
    if (exceeds && guide_style === "standard") {
      r.push("Switch to extended (H-head) guides for tapers > 30°.");
    }
    return r;
  }
}

// Helpers
function round1(x: number): number {
  return Number.isFinite(x) ? Math.round(x * 10) / 10 : x;
}
function round3(x: number): number {
  return Number.isFinite(x) ? Math.round(x * 1000) / 1000 : x;
}

export const wedmTaperErrorBudgetEngine = new WEDMTaperErrorBudgetEngine();
