/**
 * CenterDrillEngine — Center Drilling & Spot Drilling Calculations
 *
 * Calculates parameters for center drilling and spot drilling operations:
 * - Spot drill angle and depth for drill centering
 * - Center drill sizing (combined drill + countersink)
 * - Chamfer diameter at given depth
 * - Speed/feed for spot and center drills
 * - Minimum spot depth for subsequent drill diameter
 *
 * Key physics: Spot drill must create a chamfer diameter >= the
 * chisel edge of the subsequent drill to prevent walking.
 * Center drills have a specific pilot-to-body ratio.
 *
 * Reference: Machinery's Handbook Ch.28 "Drilling",
 *            Dormer spot drill application guide,
 *            ANSI B94.11M center drill standards
 *
 * Actions: center_drill_calc, spot_drill_calc, spot_depth
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type CenterDrillSize =
  | "00" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

export interface SpotDrillInput {
  subsequent_drill_diameter_mm: number;
  spot_drill_angle_deg?: number;     // default 90
  spot_drill_diameter_mm?: number;   // auto-select if omitted
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  depth_mm?: number;                 // auto-calc if omitted
}

export interface SpotDrillResult {
  spot_diameter: AtomicValue;
  spot_depth: AtomicValue;
  chamfer_at_depth: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  spot_angle: AtomicValue;
  chisel_edge_clearance: AtomicValue;
  warnings: string[];
}

export interface CenterDrillInput {
  subsequent_drill_diameter_mm: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  center_drill_size?: CenterDrillSize;
}

export interface CenterDrillResult {
  recommended_size: CenterDrillSize;
  pilot_diameter: AtomicValue;
  body_diameter: AtomicValue;
  drill_point_angle: AtomicValue;
  countersink_angle: AtomicValue;
  recommended_depth: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** ANSI center drill sizes: [pilot_dia_mm, body_dia_mm] */
const CENTER_DRILL_SIZES: Record<CenterDrillSize, [number, number]> = {
  "00": [0.5,  1.57],
  "0":  [0.79, 2.08],
  "1":  [1.0,  3.15],
  "2":  [1.6,  4.37],
  "3":  [2.0,  5.56],
  "4":  [2.5,  6.35],
  "5":  [3.15, 7.94],
  "6":  [4.0,  9.52],
  "7":  [5.0,  11.91],
  "8":  [6.3,  15.88],
};

/** Cutting speed (m/min) for spot/center drilling by ISO group */
const SPOT_SPEEDS: Record<string, number> = {
  P: 30, M: 20, K: 40, N: 80, S: 12, H: 15,
};

/** Feed per rev (mm/rev) for spot/center drilling by ISO group */
const SPOT_FEEDS: Record<string, number> = {
  P: 0.08, M: 0.06, K: 0.10, N: 0.12, S: 0.04, H: 0.04,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CenterDrillEngine {
  /**
   * Calculate spot drill parameters for centering before drilling.
   */
  spotDrill(input: SpotDrillInput): SpotDrillResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const drillDia = input.subsequent_drill_diameter_mm;
    const spotAngle = input.spot_drill_angle_deg ?? 90;

    // Chisel edge ≈ 15-20% of drill diameter
    const chiselEdge = drillDia * 0.18;

    // Spot drill diameter: should be >= drill diameter
    // (or at minimum > chisel edge)
    const spotDia = input.spot_drill_diameter_mm ??
      Math.max(drillDia * 1.2, 6);

    if (spotDia < drillDia) {
      warnings.push(
        "Spot drill smaller than subsequent drill — " +
        "may not fully center"
      );
    }

    // Depth calculation: create chamfer >= chisel edge
    // At angle θ/2, depth = (diameter/2) / tan(θ/2)
    const halfAngleRad = (spotAngle / 2) * Math.PI / 180;

    // Minimum depth to clear chisel edge
    const minDepth = (chiselEdge / 2) / Math.tan(halfAngleRad);

    // Recommended depth: chamfer to ~50% of drill diameter
    const targetChamferDia = drillDia * 0.5;
    const recommendedDepth = input.depth_mm ??
      (targetChamferDia / 2) / Math.tan(halfAngleRad);

    // Chamfer diameter at the specified depth
    const actualDepth = input.depth_mm ?? recommendedDepth;
    const chamferDia = 2 * actualDepth * Math.tan(halfAngleRad);

    // Speed/feed
    const vc = SPOT_SPEEDS[iso] ?? 30;
    const rpm = (vc * 1000) / (Math.PI * spotDia);
    const fpr = SPOT_FEEDS[iso] ?? 0.08;
    const feedRate = fpr * rpm;

    // Clearance ratio
    const clearanceRatio = chamferDia / chiselEdge;

    if (spotAngle < 60) {
      warnings.push("Spot angle < 60° — fragile point, consider 90° or 120°");
    }
    if (spotAngle > 140) {
      warnings.push("Spot angle > 140° — shallow spot, may not center effectively");
    }
    if (actualDepth > spotDia * 0.5) {
      warnings.push("Spot depth exceeds 50% of spot drill diameter");
    }

    return {
      spot_diameter: av(r2(spotDia), "mm", 0.05,
        "≥1.2× subsequent drill dia"),
      spot_depth: av(r3(actualDepth), "mm", 0.05,
        "chamfer_dia / (2 × tan(θ/2))"),
      chamfer_at_depth: av(r2(chamferDia), "mm", 0.05,
        "2 × depth × tan(θ/2)"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_spot)"),
      feed_rate: av(Math.round(feedRate), "mm/min", 0.1,
        "fpr × RPM"),
      spot_angle: av(spotAngle, "deg", 0,
        "User-specified or default 90°"),
      chisel_edge_clearance: av(r2(clearanceRatio), "ratio", 0.1,
        "chamfer_dia / chisel_edge (>1.0 = OK)"),
      warnings,
    };
  }

  /**
   * Select and calculate center drill parameters.
   */
  centerDrill(input: CenterDrillInput): CenterDrillResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const drillDia = input.subsequent_drill_diameter_mm;

    // Select center drill size: pilot should be ~25-50% of drill dia
    const targetPilot = drillDia * 0.35;
    let selectedSize: CenterDrillSize = "1";

    if (input.center_drill_size) {
      selectedSize = input.center_drill_size;
    } else {
      // Find best fit
      let bestDiff = Infinity;
      for (const [size, [pilot]] of Object.entries(CENTER_DRILL_SIZES)) {
        const diff = Math.abs(pilot - targetPilot);
        if (diff < bestDiff && pilot <= drillDia * 0.6) {
          bestDiff = diff;
          selectedSize = size as CenterDrillSize;
        }
      }
    }

    const [pilotDia, bodyDia] = CENTER_DRILL_SIZES[selectedSize];

    // Standard center drill: 60° point, 60° countersink
    const pointAngle = 60;
    const countersinkAngle = 60;

    // Recommended depth: drill to just past the pilot section
    // Pilot length ≈ pilot_dia × 1.5 (approximate)
    const pilotLength = pilotDia * 1.5;
    const recommendedDepth = pilotLength;

    // Speed/feed based on pilot diameter
    const vc = (SPOT_SPEEDS[iso] ?? 30) * 0.8; // reduce for center drill
    const rpm = (vc * 1000) / (Math.PI * pilotDia);
    const fpr = (SPOT_FEEDS[iso] ?? 0.08) * 0.7; // lighter feed
    const feedRate = fpr * rpm;

    if (pilotDia > drillDia * 0.6) {
      warnings.push(
        `Pilot diameter ${pilotDia}mm > 60% of drill diameter — ` +
        "select smaller center drill"
      );
    }
    if (pilotDia < drillDia * 0.15) {
      warnings.push(
        `Pilot diameter ${pilotDia}mm < 15% of drill diameter — ` +
        "may be too small to guide effectively"
      );
    }
    if (drillDia < 1.5) {
      warnings.push("Very small drill — consider spot drill instead of center drill");
    }

    return {
      recommended_size: selectedSize,
      pilot_diameter: av(pilotDia, "mm", 0,
        `ANSI center drill #${selectedSize}`),
      body_diameter: av(bodyDia, "mm", 0,
        `ANSI center drill #${selectedSize}`),
      drill_point_angle: av(pointAngle, "deg", 0,
        "Standard 60° center drill"),
      countersink_angle: av(countersinkAngle, "deg", 0,
        "Standard 60° countersink"),
      recommended_depth: av(r2(recommendedDepth), "mm", 0.1,
        "Pilot length ≈ D_pilot × 1.5"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_pilot) × 0.8"),
      feed_rate: av(Math.round(feedRate), "mm/min", 0.1,
        "fpr × RPM (reduced 30%)"),
      warnings,
    };
  }

  /**
   * Calculate the required spot depth for a given chamfer diameter.
   */
  spotDepth(input: {
    target_chamfer_diameter_mm: number;
    spot_angle_deg: number;
  }): { depth: AtomicValue } {
    const halfAngle = (input.spot_angle_deg / 2) * Math.PI / 180;
    const depth = (input.target_chamfer_diameter_mm / 2) /
      Math.tan(halfAngle);
    return {
      depth: av(r3(depth), "mm", 0.05,
        "D_chamfer / (2 × tan(θ/2))"),
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

function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const centerDrillEngine = new CenterDrillEngine();
