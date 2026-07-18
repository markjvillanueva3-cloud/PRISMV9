/**
 * BallEndMillEngine — Ball End Mill 3D Surface Calculations
 *
 * Calculates parameters for ball end mill operations:
 * - Effective cutting diameter at depth of cut
 * - Scallop height from step-over
 * - Optimal step-over for target surface finish
 * - Effective cutting speed correction
 * - Chip thinning at low engagement
 *
 * Key physics: A ball end mill's effective diameter depends
 * on the axial depth of cut. At shallow cuts, the effective
 * diameter is much smaller than the nominal tool diameter,
 * causing lower surface speed and different chip geometry.
 * Scallop height is a geometric function of step-over and
 * tool radius.
 *
 * Reference: Sandvik ball nose guide (C-2920:25),
 *            Machinery's Handbook Ch.24 (Milling),
 *            Altintas "Manufacturing Automation" Ch.2
 *
 * Actions: ball_endmill_calc, scallop_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface BallEndMillInput {
  tool_diameter_mm: number;
  axial_depth_mm: number;
  step_over_mm?: number;
  target_scallop_um?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  surface_angle_deg?: number; // 0=flat, 90=wall
  is_finishing?: boolean;
}

export interface BallEndMillResult {
  effective_diameter: AtomicValue;
  effective_speed: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_per_tooth: AtomicValue;
  table_feed: AtomicValue;
  step_over: AtomicValue;
  scallop_height: AtomicValue;
  predicted_ra: AtomicValue;
  mrr: AtomicValue;
  chip_thinning_factor: AtomicValue;
  warnings: string[];
}

export interface ScallopInput {
  tool_diameter_mm: number;
  step_over_mm: number;
  surface_angle_deg?: number;
}

export interface ScallopResult {
  scallop_height: AtomicValue;
  cusp_width: AtomicValue;
  predicted_ra: AtomicValue;
  step_over_for_target: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Ball end mill finishing speeds (m/min) by ISO group */
const BALL_SPEEDS: Record<string, number> = {
  P: 180, M: 100, K: 220, N: 450, S: 35, H: 70,
};

/** Ball end mill feed per tooth (mm/tooth) by ISO group */
const BALL_FZ: Record<string, number> = {
  P: 0.10, M: 0.08, K: 0.12, N: 0.08, S: 0.05, H: 0.05,
};

// ── Engine ─────────────────────────────────────────────────────────

export class BallEndMillEngine {
  /**
   * Calculate ball end mill parameters with effective diameter
   * correction and scallop height.
   */
  calculate(input: BallEndMillInput): BallEndMillResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const D = input.tool_diameter_mm;
    const R = D / 2;
    const ap = input.axial_depth_mm;
    const surfAngle = input.surface_angle_deg ?? 0;
    const finishing = input.is_finishing ?? true;

    // Effective cutting diameter
    // Deff = 2 × sqrt(ap × (D - ap)) for flat surfaces
    // Adjusted for surface inclination
    const apEff = Math.min(ap, R);
    const dEffFlat = 2 * Math.sqrt(apEff * (D - apEff));
    // On inclined surface, effective diameter changes
    const angleRad = (surfAngle * Math.PI) / 180;
    const dEff = Math.max(
      dEffFlat * Math.cos(angleRad) + D * Math.sin(angleRad),
      0.5
    );

    // Cutting speed at effective diameter
    const vcNominal = BALL_SPEEDS[iso] ?? 180;
    const vc = finishing ? vcNominal : vcNominal * 0.7;

    // RPM based on effective diameter
    const rpm = (vc * 1000) / (Math.PI * dEff);

    // Feed per tooth
    const fzBase = BALL_FZ[iso] ?? 0.10;
    const fz = finishing ? fzBase * 0.7 : fzBase;
    const numFlutes = 2; // typical ball end mill
    const tableFeed = fz * numFlutes * rpm;

    // Step-over calculation
    let ae: number;
    if (input.step_over_mm) {
      ae = input.step_over_mm;
    } else if (input.target_scallop_um) {
      // ae = 2 × sqrt(2Rh - h²) where h = target scallop
      const h = input.target_scallop_um / 1000; // um to mm
      ae = 2 * Math.sqrt(Math.max(2 * R * h - h * h, 0));
      ae = Math.max(ae, 0.05);
    } else {
      // Default: finishing = 5% of D, roughing = 30% of D
      ae = finishing ? D * 0.05 : D * 0.30;
    }

    // Scallop height: h = R - sqrt(R² - (ae/2)²)
    const halfAe = ae / 2;
    const scallopH = halfAe < R
      ? R - Math.sqrt(R * R - halfAe * halfAe)
      : R;

    // Predicted Ra ≈ scallop_height × 0.25 (empirical)
    const raUm = scallopH * 1000 * 0.25;

    // MRR (cm³/min)
    const mrrMm3 = ae * ap * tableFeed;
    const mrrCm3 = mrrMm3 / 1000;

    // Chip thinning factor
    // hex = fz × (ae/Deff) for ball end mills
    const chipThinFactor = dEff > 0
      ? Math.sqrt(ae / dEff)
      : 1;

    // Warnings
    if (ap > R) {
      warnings.push(
        "Axial depth exceeds tool radius — " +
        "effective diameter calculation limited"
      );
    }
    if (dEff < D * 0.1) {
      warnings.push(
        "Very low effective diameter — " +
        "surface speed may be too low for chip formation"
      );
    }
    if (scallopH * 1000 > 50) {
      warnings.push(
        `Scallop height ${r1(scallopH * 1000)}µm — ` +
        "reduce step-over for better finish"
      );
    }
    if (rpm > 30000) {
      warnings.push(
        "Very high RPM required — verify spindle capability"
      );
    }

    return {
      effective_diameter: av(r3(dEff), "mm", 0.05,
        "2√(ap(D-ap)) adjusted for surface angle"),
      effective_speed: av(r1(vc), "m/min", 0.1,
        "Ball end mill speed tables"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.1,
        "Vc × 1000 / (π × Deff)"),
      feed_per_tooth: av(r3(fz), "mm/tooth", 0.1,
        "Ball end mill fz tables"),
      table_feed: av(Math.round(tableFeed), "mm/min", 0.1,
        "fz × z × RPM"),
      step_over: av(r3(ae), "mm", 0.05,
        input.target_scallop_um
          ? "Calculated from target scallop"
          : "Default step-over"),
      scallop_height: av(r2(scallopH * 1000), "µm", 0.1,
        "R - √(R² - (ae/2)²)"),
      predicted_ra: av(r2(raUm), "µm", 0.2,
        "scallop_height × 0.25"),
      mrr: av(r3(mrrCm3), "cm³/min", 0.15,
        "ae × ap × table_feed / 1000"),
      chip_thinning_factor: av(r3(chipThinFactor), "ratio", 0.1,
        "√(ae / Deff)"),
      warnings,
    };
  }

  /**
   * Calculate scallop geometry for a given step-over.
   */
  scallop(input: ScallopInput): ScallopResult {
    const warnings: string[] = [];
    const D = input.tool_diameter_mm;
    const R = D / 2;
    const ae = input.step_over_mm;

    // Scallop height
    const halfAe = ae / 2;
    const scallopH = halfAe < R
      ? R - Math.sqrt(R * R - halfAe * halfAe)
      : R;

    // Cusp width = step-over
    const cuspWidth = ae;

    // Ra estimate
    const raUm = scallopH * 1000 * 0.25;

    // Step-over for a target Ra of 1.6µm
    const targetH = 1.6 / 1000 / 0.25; // mm
    const targetAe = 2 * Math.sqrt(
      Math.max(2 * R * targetH - targetH * targetH, 0)
    );

    if (ae > D * 0.5) {
      warnings.push(
        "Step-over > 50% of tool diameter — " +
        "excessive scallop, reduce step-over"
      );
    }

    return {
      scallop_height: av(r2(scallopH * 1000), "µm", 0.1,
        "R - √(R² - (ae/2)²)"),
      cusp_width: av(r3(ae), "mm", 0,
        "Equal to step-over"),
      predicted_ra: av(r2(raUm), "µm", 0.2,
        "scallop × 0.25"),
      step_over_for_target: av(r3(targetAe), "mm", 0.1,
        "For Ra 1.6µm target"),
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

export const ballEndMillEngine = new BallEndMillEngine();
