/**
 * ChamferMillingEngine — Chamfer Milling Calculations
 *
 * Calculates parameters for chamfer milling operations:
 * - Single-flute and multi-flute chamfer mills
 * - Back chamfer (lollipop) tools
 * - Variable-angle chamfers
 * - Chamfer width/depth from angle and edge spec
 * - Speed/feed adjusted for effective cutting diameter
 *
 * Key physics: The effective cutting diameter of a chamfer mill
 * varies with depth of cut. Feed rate must be compensated for
 * the actual engagement diameter, not the nominal tool diameter.
 *
 * Reference: Machinery's Handbook Ch.30 "Milling",
 *            Harvey Tool chamfer mill application guide,
 *            ANSI Y14.5 chamfer dimensioning
 *
 * Actions: chamfer_calc, chamfer_feed_comp, back_chamfer
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ChamferInput {
  chamfer_width_mm?: number;
  chamfer_depth_mm?: number;
  chamfer_angle_deg?: number;      // default 45
  tool_diameter_mm: number;
  tool_angle_deg?: number;         // tool included angle (default 90)
  num_flutes: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  is_back_chamfer?: boolean;
}

export interface ChamferResult {
  chamfer_width: AtomicValue;
  chamfer_depth: AtomicValue;
  effective_diameter: AtomicValue;
  spindle_rpm: AtomicValue;
  programmed_feed: AtomicValue;
  chip_load: AtomicValue;
  axial_offset: AtomicValue;
  warnings: string[];
}

export interface ChamferGeometryInput {
  edge_spec: string;           // e.g. "0.5x45°", "1.0x30°", "C0.5"
}

export interface ChamferGeometryResult {
  width: AtomicValue;
  depth: AtomicValue;
  angle: AtomicValue;
  leg_a: AtomicValue;
  leg_b: AtomicValue;
}

// ── Reference Data ────────────────────────────────────────────────

/** Cutting speed for chamfer milling (m/min) by ISO group */
const CHAMFER_SPEEDS: Record<string, number> = {
  P: 80, M: 50, K: 100, N: 200, S: 25, H: 40,
};

/** Chip load for chamfer mills (mm/tooth) by ISO group */
const CHAMFER_CHIP_LOADS: Record<string, number> = {
  P: 0.04, M: 0.03, K: 0.05, N: 0.06, S: 0.02, H: 0.02,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ChamferMillingEngine {
  /**
   * Calculate chamfer milling parameters.
   */
  calculate(input: ChamferInput): ChamferResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const z = input.num_flutes;
    const toolDia = input.tool_diameter_mm;
    const toolAngle = input.tool_angle_deg ?? 90;
    const chamferAngle = input.chamfer_angle_deg ?? 45;
    const isBack = input.is_back_chamfer ?? false;

    // Resolve chamfer width and depth
    // For a chamfer: width = depth × tan(angle) or depth = width / tan(angle)
    const angleRad = chamferAngle * Math.PI / 180;
    let width: number;
    let depth: number;

    if (input.chamfer_width_mm !== undefined) {
      width = input.chamfer_width_mm;
      depth = input.chamfer_depth_mm ?? width / Math.tan(angleRad);
    } else if (input.chamfer_depth_mm !== undefined) {
      depth = input.chamfer_depth_mm;
      width = depth * Math.tan(angleRad);
    } else {
      // Default 0.5mm chamfer
      width = 0.5;
      depth = width / Math.tan(angleRad);
    }

    // Effective cutting diameter
    // On a chamfer mill, the cutting happens at a diameter that depends
    // on the axial depth of engagement
    const toolHalfAngle = (toolAngle / 2) * Math.PI / 180;
    const effectiveDia = isBack
      ? toolDia - 2 * depth * Math.tan(toolHalfAngle)
      : toolDia - 2 * (toolDia / 2 -
          depth * Math.tan(toolHalfAngle));

    // Clamp effective diameter to a reasonable range
    const effDia = Math.max(
      effectiveDia,
      toolDia * 0.3
    );

    // Speed/feed based on effective diameter
    const vc = CHAMFER_SPEEDS[iso] ?? 80;
    const rpm = (vc * 1000) / (Math.PI * effDia);
    const fz = CHAMFER_CHIP_LOADS[iso] ?? 0.04;
    const feedProg = fz * z * rpm;

    // Axial offset (Z positioning)
    // Tool tip to chamfer start point
    const axialOffset = isBack
      ? -(depth + 0.1)  // back chamfer: plunge below
      : depth;

    // Warnings
    if (width > toolDia * 0.4) {
      warnings.push(
        "Chamfer width > 40% of tool diameter — " +
        "multiple passes recommended"
      );
    }
    if (chamferAngle !== 45 && toolAngle === 90) {
      warnings.push(
        `Chamfer angle ${chamferAngle}° requires ` +
        `${chamferAngle * 2}° included-angle tool, ` +
        `not standard 90° chamfer mill`
      );
    }
    if (isBack && toolDia < width * 3) {
      warnings.push(
        "Back chamfer tool diameter should be ≥3× " +
        "chamfer width for rigidity"
      );
    }
    if (depth > 3) {
      warnings.push(
        "Deep chamfer (>3mm) — reduce feed, " +
        "consider multiple passes"
      );
    }

    return {
      chamfer_width: av(r2(width), "mm", 0.05,
        "Specified or depth × tan(angle)"),
      chamfer_depth: av(r3(depth), "mm", 0.05,
        "Specified or width / tan(angle)"),
      effective_diameter: av(r2(effDia), "mm", 0.1,
        "Actual engagement diameter on tool"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_eff)"),
      programmed_feed: av(Math.round(feedProg), "mm/min", 0.1,
        "fz × z × RPM"),
      chip_load: av(r3(fz), "mm/tooth", 0.1,
        "Chamfer mill chip load tables"),
      axial_offset: av(r2(Math.abs(axialOffset)), "mm", 0.05,
        isBack
          ? "Plunge depth below edge"
          : "Z offset to chamfer start"),
      warnings,
    };
  }

  /**
   * Parse a chamfer edge specification and return geometry.
   */
  parseSpec(input: ChamferGeometryInput): ChamferGeometryResult {
    const spec = input.edge_spec.trim();

    let width: number;
    let angle: number;

    // Parse "C0.5" format (equal-leg 45° chamfer)
    const cMatch = spec.match(/^[Cc](\d+\.?\d*)$/);
    if (cMatch) {
      width = parseFloat(cMatch[1]);
      angle = 45;
    } else {
      // Parse "0.5x45°" or "0.5×45" format
      const xMatch = spec.match(
        /(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)°?/
      );
      if (xMatch) {
        width = parseFloat(xMatch[1]);
        angle = parseFloat(xMatch[2]);
      } else {
        width = 0.5;
        angle = 45;
      }
    }

    const angleRad = angle * Math.PI / 180;
    const depth = width / Math.tan(angleRad);
    const legA = width;
    const legB = depth;

    return {
      width: av(r3(width), "mm", 0, "Parsed from spec"),
      depth: av(r3(depth), "mm", 0.05, "width / tan(angle)"),
      angle: av(angle, "deg", 0, "Parsed from spec"),
      leg_a: av(r3(legA), "mm", 0, "Horizontal leg"),
      leg_b: av(r3(legB), "mm", 0.05, "Vertical leg"),
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

export const chamferMillingEngine = new ChamferMillingEngine();
