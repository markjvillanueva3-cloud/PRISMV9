/**
 * CounterboreSinkEngine — Counterbore & Countersink Calculations
 *
 * Calculates parameters for counterbore and countersink operations:
 * - Counterbore depth/diameter for socket head cap screws
 * - Countersink diameter/depth for flat head screws
 * - Speed/feed for counterbore and countersink tools
 * - Standard hole dimensions per fastener size
 *
 * Reference: Machinery's Handbook Ch.24 "Counterbores/Countersinks",
 *            ANSI B18.3 (socket head cap screws),
 *            ANSI B18.6.7M (flat head screws),
 *            DIN 974 (counterbore dimensions)
 *
 * Actions: counterbore_calc, countersink_calc, fastener_hole
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CounterboreInput {
  fastener_size_mm?: number;
  fastener_type?: "shcs" | "bhcs" | "fhcs" | "custom";
  counterbore_diameter_mm?: number;
  counterbore_depth_mm?: number;
  through_hole_diameter_mm?: number;
  tool_diameter_mm?: number;
  num_flutes?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
}

export interface CounterboreResult {
  counterbore_diameter: AtomicValue;
  counterbore_depth: AtomicValue;
  through_hole_diameter: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  cycle_time: AtomicValue;
  fastener_info: string;
  warnings: string[];
}

export interface CountersinkInput {
  hole_diameter_mm: number;
  countersink_angle_deg?: number;  // default 82 (flat head) or 90
  head_diameter_mm?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  tool_diameter_mm?: number;
}

export interface CountersinkResult {
  countersink_diameter: AtomicValue;
  countersink_depth: AtomicValue;
  countersink_angle: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/**
 * SHCS counterbore dimensions: [through_hole, cbore_dia, cbore_depth]
 * per ANSI B18.3 / DIN 912
 */
const SHCS_DIMENSIONS: Record<number, [number, number, number]> = {
  3:  [3.4,  5.5,  3.0],
  4:  [4.5,  7.0,  4.0],
  5:  [5.5,  8.5,  5.0],
  6:  [6.6,  10.0, 6.0],
  8:  [9.0,  13.0, 8.0],
  10: [11.0, 16.0, 10.0],
  12: [13.5, 18.0, 12.0],
  14: [15.5, 21.0, 14.0],
  16: [17.5, 24.0, 16.0],
  20: [22.0, 30.0, 20.0],
  24: [26.0, 36.0, 24.0],
};

/**
 * BHCS (button head) counterbore dimensions
 */
const BHCS_DIMENSIONS: Record<number, [number, number, number]> = {
  3:  [3.4,  5.7,  1.65],
  4:  [4.5,  7.6,  2.2],
  5:  [5.5,  9.5,  2.75],
  6:  [6.6,  10.5, 3.3],
  8:  [9.0,  14.0, 4.4],
  10: [11.0, 17.5, 5.5],
  12: [13.5, 21.0, 6.6],
};

/**
 * FHCS (flat head) countersink: [through_hole, head_dia, angle]
 */
const FHCS_DIMENSIONS: Record<number, [number, number, number]> = {
  3:  [3.4,  6.72,  90],
  4:  [4.5,  8.96,  90],
  5:  [5.5,  11.2,  90],
  6:  [6.6,  13.44, 90],
  8:  [9.0,  17.92, 90],
  10: [11.0, 22.4,  90],
  12: [13.5, 26.88, 90],
};

/** Cutting speed for counterbore tools (m/min) */
const CBORE_SPEEDS: Record<string, number> = {
  P: 25, M: 18, K: 35, N: 60, S: 10, H: 12,
};

/** Feed per rev for counterbore tools (mm/rev) */
const CBORE_FEEDS: Record<string, number> = {
  P: 0.10, M: 0.08, K: 0.12, N: 0.15, S: 0.05, H: 0.05,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CounterboreSinkEngine {
  /**
   * Calculate counterbore dimensions and cutting parameters.
   */
  counterbore(input: CounterboreInput): CounterboreResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const type = input.fastener_type ?? "shcs";

    let cboreDia: number;
    let cboreDepth: number;
    let throughHole: number;
    let fastenerInfo: string;

    if (type === "custom") {
      cboreDia = input.counterbore_diameter_mm ?? 10;
      cboreDepth = input.counterbore_depth_mm ?? 5;
      throughHole = input.through_hole_diameter_mm ?? 6;
      fastenerInfo = "Custom counterbore";
    } else {
      const size = input.fastener_size_mm ?? 6;
      const table = type === "bhcs"
        ? BHCS_DIMENSIONS : SHCS_DIMENSIONS;
      const dims = table[size];

      if (!dims) {
        warnings.push(
          `M${size} not in ${type.toUpperCase()} table — ` +
          "using estimated dimensions"
        );
        throughHole = size * 1.1;
        cboreDia = size * 1.7;
        cboreDepth = size;
      } else {
        [throughHole, cboreDia, cboreDepth] = dims;
      }

      // Allow overrides
      cboreDia = input.counterbore_diameter_mm ?? cboreDia;
      cboreDepth = input.counterbore_depth_mm ?? cboreDepth;
      throughHole = input.through_hole_diameter_mm ?? throughHole;
      fastenerInfo = `M${size} ${type.toUpperCase()} per ANSI B18.3`;
    }

    // Tool diameter (counterbore tool = exact bore diameter)
    const toolDia = input.tool_diameter_mm ?? cboreDia;
    const z = input.num_flutes ?? 4;

    // Speed/feed
    const vc = CBORE_SPEEDS[iso] ?? 25;
    const rpm = (vc * 1000) / (Math.PI * toolDia);
    const fpr = CBORE_FEEDS[iso] ?? 0.10;
    const feedRate = fpr * rpm;

    // Cycle time
    const cycleTime = cboreDepth / (fpr * rpm) +
      0.1; // approach + retract

    if (cboreDia < throughHole) {
      warnings.push(
        "Counterbore diameter < through hole — invalid"
      );
    }
    if (cboreDepth > cboreDia) {
      warnings.push(
        "Counterbore depth > diameter — " +
        "consider step boring for rigidity"
      );
    }

    return {
      counterbore_diameter: av(r2(cboreDia), "mm", 0.02,
        fastenerInfo),
      counterbore_depth: av(r2(cboreDepth), "mm", 0.05,
        "Head height + 0.5mm clearance"),
      through_hole_diameter: av(r2(throughHole), "mm", 0.02,
        "Close-fit clearance hole"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_tool)"),
      feed_rate: av(Math.round(feedRate), "mm/min", 0.1,
        "fpr × RPM"),
      cycle_time: av(r2(cycleTime), "min", 0.15,
        "depth / feed + approach"),
      fastener_info: fastenerInfo,
      warnings,
    };
  }

  /**
   * Calculate countersink dimensions and parameters.
   */
  countersink(input: CountersinkInput): CountersinkResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const holeDia = input.hole_diameter_mm;
    const angle = input.countersink_angle_deg ?? 82;

    // Head diameter: from FHCS table or estimate
    let headDia: number;
    const fhcsDims = FHCS_DIMENSIONS[holeDia];
    if (input.head_diameter_mm) {
      headDia = input.head_diameter_mm;
    } else if (fhcsDims) {
      headDia = fhcsDims[1];
    } else {
      // Estimate: head ≈ 2× nominal for flat head
      headDia = holeDia * 2;
    }

    // Countersink depth
    const halfAngle = (angle / 2) * Math.PI / 180;
    const csDepth = (headDia - holeDia) / (2 * Math.tan(halfAngle));

    // Tool diameter (must be >= head diameter)
    const toolDia = input.tool_diameter_mm ??
      Math.max(headDia * 1.2, 10);

    // Speed/feed (reduced vs counterbore — single point geometry)
    const vc = (CBORE_SPEEDS[iso] ?? 25) * 0.7;
    const rpm = (vc * 1000) / (Math.PI * toolDia);
    const fpr = (CBORE_FEEDS[iso] ?? 0.10) * 0.5;
    const feedRate = fpr * rpm;

    if (toolDia < headDia) {
      warnings.push(
        "Countersink tool smaller than head diameter"
      );
    }
    if (angle < 60 || angle > 120) {
      warnings.push(
        `Non-standard countersink angle ${angle}° — ` +
        "verify tool availability"
      );
    }

    return {
      countersink_diameter: av(r2(headDia), "mm", 0.05,
        "Fastener head diameter"),
      countersink_depth: av(r3(csDepth), "mm", 0.05,
        "(D_head - D_hole) / (2 × tan(θ/2))"),
      countersink_angle: av(angle, "deg", 0,
        "Standard 82° or 90° countersink"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_tool)"),
      feed_rate: av(Math.round(feedRate), "mm/min", 0.1,
        "fpr × RPM (reduced 50%)"),
      warnings,
    };
  }

  /**
   * Get complete hole spec for a fastener size.
   */
  fastenerHole(input: {
    fastener_size_mm: number;
    fastener_type: "shcs" | "bhcs" | "fhcs";
  }): {
    through_hole: AtomicValue;
    counterbore_or_countersink: AtomicValue;
    depth_or_angle: AtomicValue;
    standard: string;
  } {
    const size = input.fastener_size_mm;
    const type = input.fastener_type;

    if (type === "fhcs") {
      const dims = FHCS_DIMENSIONS[size];
      const th = dims ? dims[0] : size * 1.1;
      const hd = dims ? dims[1] : size * 2;
      const ang = dims ? dims[2] : 90;
      return {
        through_hole: av(th, "mm", 0.02, "ANSI B18.6.7M"),
        counterbore_or_countersink: av(hd, "mm", 0.05,
          "Head diameter"),
        depth_or_angle: av(ang, "deg", 0, "Countersink angle"),
        standard: "ANSI B18.6.7M",
      };
    }

    const table = type === "bhcs"
      ? BHCS_DIMENSIONS : SHCS_DIMENSIONS;
    const dims = table[size];
    const th = dims ? dims[0] : size * 1.1;
    const cd = dims ? dims[1] : size * 1.7;
    const dp = dims ? dims[2] : size;

    return {
      through_hole: av(th, "mm", 0.02, "ANSI B18.3"),
      counterbore_or_countersink: av(cd, "mm", 0.02,
        "Counterbore diameter"),
      depth_or_angle: av(dp, "mm", 0.05,
        "Counterbore depth"),
      standard: "ANSI B18.3 / DIN 912",
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

export const counterboreSinkEngine = new CounterboreSinkEngine();
