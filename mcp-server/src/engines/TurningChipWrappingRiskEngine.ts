/**
 * TurningChipWrappingRiskEngine
 * =============================
 *
 * Chip-wrapping risk assessment for CSS (G96 constant surface speed) and
 * high-RPM turning programs (U-LPC04, MS7). As the tool approaches small
 * diameters under G96, the controller raises RPM; when a long continuous
 * chip comes off a finishing pass at high RPM the chip can wrap the
 * workpiece, snap the tool, and scrap the part.
 *
 * ── Risk score (0..100) ────────────────────────────────────────
 *   Four additive factors:
 *     1. RPM factor       — high RPM → thinner, more coiled chips (0..30).
 *     2. Chip-form factor — continuous/stringy > segmented > broken   (0..30).
 *     3. Material factor  — ductile (stainless/Ti) > steel > CI/AL    (0..20).
 *     4. Geometry factor  — small diameter + long stroke              (0..20).
 *
 *   Total 100 → extreme risk; < 25 → low; 25-60 → medium; > 60 → high.
 *
 * ── Mitigations returned ───────────────────────────────────────
 *   For scores ≥ 25 the engine emits mitigation recommendations:
 *     - Oscillating feed (sinusoidal Δf around nominal) to vary chip load.
 *     - Forced peck (retract every N seconds) to break the chip.
 *     - Speed cap (reduce max RPM below controller's CSS max).
 *     - Chipbreaker upgrade (switch to a geometry with narrower feed window).
 *     - High-pressure coolant (70 bar+) to mechanically break the chip.
 *
 * The engine reads the existing `ChipBreakingEngine` chip-form prediction
 * as input rather than re-implementing the chip-form model — pass the
 * chip_form from that engine as `predicted_chip_form`.
 *
 * References:
 *   - Sandvik CoroPlus "Chip control at high RPM" application note
 *   - Kennametal chip evacuation guide §4.2
 *   - Citizen Cincom Swiss programming for chip wrapping
 *
 * @module engines/TurningChipWrappingRiskEngine
 * @milestone LATHE-PRO-MS7 / U-LPC04
 */

export type ChipForm =
  | "broken"
  | "segmented"
  | "continuous"
  | "stringy"
  | "snarled";

export type MaterialClass =
  | "aluminum"
  | "cast_iron"
  | "steel"
  | "stainless"
  | "titanium"
  | "superalloy";

export interface ChipWrappingInput {
  /** Peak spindle RPM during the operation (CSS maximum). */
  peak_rpm: number;
  /** Nominal feed (mm/rev). */
  feed_mm_rev: number;
  /** Depth of cut (mm). */
  ap_mm: number;
  /** Minimum X diameter reached during G96 (mm). Small diameters drive RPM. */
  min_diameter_mm: number;
  /** Length of continuous cut before retract (mm). */
  cut_stroke_mm: number;
  /** Chip form predicted by ChipBreakingEngine. */
  predicted_chip_form: ChipForm;
  /** Material class. */
  material: MaterialClass;
  /** Whether G96 (constant surface speed) is active. */
  css_active: boolean;
  /** Coolant pressure (bar). Used to boost mitigation set. */
  coolant_pressure_bar?: number;
}

export type RiskLevel = "low" | "medium" | "high" | "extreme";

export interface ChipWrappingMitigation {
  strategy:
    | "oscillating_feed"
    | "forced_peck"
    | "speed_cap"
    | "chipbreaker_upgrade"
    | "high_pressure_coolant";
  detail: string;
  priority: "recommended" | "required";
}

export interface ChipWrappingResult {
  risk_score: number;
  risk_level: RiskLevel;
  factors: {
    rpm_factor: number;
    chip_form_factor: number;
    material_factor: number;
    geometry_factor: number;
  };
  mitigations: ChipWrappingMitigation[];
  reasoning: string[];
}

function chipFormWeight(form: ChipForm): number {
  switch (form) {
    case "broken":     return 0;
    case "segmented":  return 8;
    case "continuous": return 20;
    case "stringy":    return 26;
    case "snarled":    return 30;
  }
}

function materialWeight(m: MaterialClass): number {
  switch (m) {
    case "aluminum":   return 4;
    case "cast_iron":  return 2;
    case "steel":      return 10;
    case "stainless":  return 18;
    case "titanium":   return 20;
    case "superalloy": return 20;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class TurningChipWrappingRiskEngine {
  /**
   * Score chip-wrapping risk and emit mitigations.
   */
  assess(input: ChipWrappingInput): ChipWrappingResult {
    const reasoning: string[] = [];

    // Factor 1: RPM — clamp to [0, 30]. Saturates around 8000 RPM.
    const rpmFactor = Math.min(30, Math.max(0, (input.peak_rpm / 8000) * 30));
    if (input.peak_rpm > 6000) reasoning.push(`High peak RPM ${input.peak_rpm}.`);

    // Factor 2: Chip form.
    const chipFactor = chipFormWeight(input.predicted_chip_form);
    if (chipFactor >= 20) {
      reasoning.push(`Chip form '${input.predicted_chip_form}' prone to wrapping.`);
    }

    // Factor 3: Material.
    const matFactor = materialWeight(input.material);
    if (matFactor >= 18) {
      reasoning.push(`Material '${input.material}' is ductile — wraps easily.`);
    }

    // Factor 4: Geometry — small diameter + long stroke.
    const smallDia = input.min_diameter_mm < 15 ? (15 - input.min_diameter_mm) * 0.8 : 0; // up to 12 pts
    const longStroke = input.cut_stroke_mm > 50 ? Math.min(8, (input.cut_stroke_mm - 50) / 12.5) : 0;
    const geomFactor = Math.min(20, smallDia + longStroke);
    if (geomFactor > 10) {
      reasoning.push(`Geometry: dia ${input.min_diameter_mm}mm × stroke ${input.cut_stroke_mm}mm.`);
    }

    if (!input.css_active) {
      reasoning.push("CSS off — G97 mode limits RPM excursion.");
    }

    const score = round2(rpmFactor + chipFactor + matFactor + geomFactor);
    const level: RiskLevel =
      score >= 75 ? "extreme" : score >= 60 ? "high" : score >= 25 ? "medium" : "low";

    const mitigations: ChipWrappingMitigation[] = [];
    if (score >= 25) {
      mitigations.push({
        strategy: "oscillating_feed",
        detail: "Apply sinusoidal ±10–15% feed modulation to vary chip thickness and break long chips.",
        priority: level === "extreme" || level === "high" ? "required" : "recommended",
      });
    }
    if (score >= 40) {
      mitigations.push({
        strategy: "forced_peck",
        detail: "Insert G00 retract every 2–3 s of continuous cut to mechanically interrupt the chip.",
        priority: "recommended",
      });
    }
    if (score >= 50 && input.css_active) {
      mitigations.push({
        strategy: "speed_cap",
        detail: `Cap CSS max RPM at ~${Math.floor(input.peak_rpm * 0.7)} to keep chip load up.`,
        priority: level === "extreme" ? "required" : "recommended",
      });
    }
    if (score >= 35 && chipFactor >= 20) {
      mitigations.push({
        strategy: "chipbreaker_upgrade",
        detail: "Switch to a chipbreaker geometry with a narrower feed window (more aggressive chip curl).",
        priority: "recommended",
      });
    }
    if (score >= 45 && (input.coolant_pressure_bar ?? 0) < 40) {
      mitigations.push({
        strategy: "high_pressure_coolant",
        detail:
          "Enable through-tool high-pressure coolant ≥ 70 bar to mechanically break chips at the cutting edge.",
        priority: level === "extreme" ? "required" : "recommended",
      });
    }

    return {
      risk_score: score,
      risk_level: level,
      factors: {
        rpm_factor: round2(rpmFactor),
        chip_form_factor: round2(chipFactor),
        material_factor: round2(matFactor),
        geometry_factor: round2(geomFactor),
      },
      mitigations,
      reasoning,
    };
  }
}

/** Singleton instance. */
export const turningChipWrappingRiskEngine = new TurningChipWrappingRiskEngine();
