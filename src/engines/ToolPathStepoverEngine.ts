/**
 * ToolPathStepoverEngine — Optimal Step-Over by Strategy
 *
 * Calculates optimal step-over/step-down for toolpath strategies:
 * - Parallel/zigzag finishing step-over
 * - Contour-parallel step-over
 * - 3D surface step-over for target scallop
 * - Roughing step-down optimization
 * - Adaptive clearing engagement
 *
 * Key physics: Step-over determines both surface finish
 * (via scallop/cusp geometry) and machining time. Optimal
 * step-over balances finish quality against cycle time.
 * For flat-end mills: Ra ∝ ae²/(8×D). For ball-end:
 * scallop = R - √(R² - (ae/2)²). Step-down affects
 * chip load, deflection, and tool engagement.
 *
 * Reference: Sandvik toolpath planning guide,
 *            Altintas "Manufacturing Automation" Ch.2,
 *            Mastercam dynamic motion technology guide
 *
 * Actions: stepover_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type ToolType = "flat" | "ball" | "bull_nose" | "toroid";
export type Strategy = "parallel" | "contour" | "adaptive"
  | "pencil" | "scallop_const";

export interface StepoverInput {
  tool_diameter_mm: number;
  tool_type?: ToolType;
  corner_radius_mm?: number; // for bull_nose/toroid
  target_ra_um?: number;
  target_scallop_um?: number;
  strategy?: Strategy;
  is_roughing?: boolean;
  axial_depth_mm?: number;
}

export interface StepoverResult {
  step_over: AtomicValue;
  step_over_pct: AtomicValue;
  predicted_scallop: AtomicValue;
  predicted_ra: AtomicValue;
  step_down: AtomicValue;
  engagement_angle: AtomicValue;
  overlap_distance: AtomicValue;
  time_factor: AtomicValue;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class ToolPathStepoverEngine {
  /**
   * Calculate optimal step-over and step-down.
   */
  calculate(input: StepoverInput): StepoverResult {
    const warnings: string[] = [];
    const D = input.tool_diameter_mm;
    const R = D / 2;
    const toolType = input.tool_type ?? "flat";
    const cr = input.corner_radius_mm ?? 0;
    const strategy = input.strategy ?? "parallel";
    const isRoughing = input.is_roughing ?? false;

    let ae: number;
    let scallop: number;
    let ra: number;
    let ap: number;

    if (isRoughing) {
      // Roughing step-over: 40-70% of D
      ae = strategy === "adaptive"
        ? D * 0.10  // adaptive: low radial, full axial
        : D * 0.60;

      // Roughing step-down
      ap = input.axial_depth_mm ?? (
        strategy === "adaptive" ? D * 1.5 : D * 0.5
      );

      scallop = 0; // not relevant for roughing
      ra = 0;

    } else {
      // Finishing: calculate from target
      const effectiveR = toolType === "ball"
        ? R
        : toolType === "bull_nose" || toolType === "toroid"
          ? cr
          : D * 100; // flat end mill: huge effective R

      if (input.target_scallop_um) {
        const h = input.target_scallop_um / 1000;
        ae = effectiveR < D * 50
          ? 2 * Math.sqrt(Math.max(2 * effectiveR * h - h * h, 0))
          : D * 0.3;
        ae = Math.max(ae, 0.05);
      } else if (input.target_ra_um) {
        // Ra ≈ scallop × 0.25 → scallop = Ra / 0.25
        const targetScallop = input.target_ra_um / 0.25 / 1000;
        ae = effectiveR < D * 50
          ? 2 * Math.sqrt(
            Math.max(2 * effectiveR * targetScallop
              - targetScallop * targetScallop, 0)
          )
          : D * 0.1;
        ae = Math.max(ae, 0.05);
      } else {
        // Default finishing step-over by tool type
        ae = toolType === "ball" ? D * 0.05
          : toolType === "bull_nose" ? D * 0.15
          : D * 0.65; // flat: can use wider step-over
      }

      // Calculate resulting scallop
      if (toolType === "ball") {
        const halfAe = ae / 2;
        scallop = halfAe < R
          ? (R - Math.sqrt(R * R - halfAe * halfAe)) * 1000
          : R * 1000;
      } else if (toolType === "bull_nose"
        || toolType === "toroid") {
        const halfAe = ae / 2;
        scallop = halfAe < cr
          ? (cr - Math.sqrt(cr * cr - halfAe * halfAe)) * 1000
          : cr * 1000;
      } else {
        // Flat end mill: scallop from cutter marks
        scallop = (ae * ae / (8 * R)) * 1000;
      }

      ra = scallop * 0.25; // µm

      // Finishing step-down
      ap = input.axial_depth_mm ?? (
        toolType === "ball" ? D * 0.05
        : D * 0.3
      );
    }

    // Step-over percentage
    const aePct = (ae / D) * 100;

    // Engagement angle
    const engAngle = Math.acos(
      Math.max(-1, Math.min(1, 1 - (2 * ae / D)))
    ) * (180 / Math.PI);

    // Overlap distance (how much tool passes overlap)
    const overlap = D - ae;

    // Time factor (relative to 50% step-over baseline)
    const timeFactor = ae > 0
      ? (D * 0.5) / ae
      : 1;

    // Warnings
    if (!isRoughing && aePct > 50 && toolType === "ball") {
      warnings.push(
        "Step-over > 50% of ball end mill — " +
        "excessive scallop height"
      );
    }
    if (isRoughing && strategy === "adaptive" && ae > D * 0.15) {
      warnings.push(
        "Adaptive clearing: step-over should be 5-12% " +
        "of tool diameter"
      );
    }
    if (!isRoughing && ra > 3.2 && toolType !== "flat") {
      warnings.push(
        `Predicted Ra ${r1(ra)}µm > 3.2µm — ` +
        "reduce step-over for better finish"
      );
    }
    if (timeFactor > 5) {
      warnings.push(
        `Very fine step-over — cycle time ${r1(timeFactor)}× ` +
        "baseline, verify necessity"
      );
    }

    return {
      step_over: av(r3(ae), "mm", 0.05,
        isRoughing
          ? "Roughing step-over"
          : "From target finish/scallop"),
      step_over_pct: av(r1(aePct), "%", 0.05,
        "ae / D × 100"),
      predicted_scallop: av(r2(scallop), "µm", 0.1,
        toolType === "flat"
          ? "ae²/(8R) × 1000"
          : "R - √(R²-(ae/2)²) × 1000"),
      predicted_ra: av(r2(ra), "µm", 0.2,
        "scallop × 0.25"),
      step_down: av(r2(ap), "mm", 0.1,
        isRoughing
          ? "Roughing step-down"
          : "Finishing step-down"),
      engagement_angle: av(r1(engAngle), "deg", 0.05,
        "acos(1 - 2ae/D)"),
      overlap_distance: av(r2(overlap), "mm", 0,
        "D - ae"),
      time_factor: av(r2(timeFactor), "ratio", 0.1,
        "Relative to 50% step-over"),
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

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const toolPathStepoverEngine =
  new ToolPathStepoverEngine();
