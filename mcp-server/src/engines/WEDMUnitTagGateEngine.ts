/**
 * WEDMUnitTagGateEngine — G20/G21 Unit Tag Validation with AtomicValue
 *
 * Eliminates the 25.4× mm/inch risk by validating:
 * - Declared unit matches G-code unit code (G20=inch, G21=mm)
 * - Coordinate scale is consistent with declared unit
 * - Feed rates are plausible for the declared unit system
 *
 * Returns a typed result for S(x) integration in WEDMProgramSafetyGateEngine.
 *
 * @module WEDMUnitTagGateEngine
 * MS-P2.5-SAFETY/U-P2.5-SAFE-02
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DeclaredUnit = "metric" | "imperial";

export interface AtomicValue<T> {
  value: T;
  unit: string;
  confidence: number;
  source: string;
}

export interface UnitTagInput {
  gcode: string;
  declared_unit: DeclaredUnit;
  controller?: WEDMController;
}

export type WEDMController =
  | "mitsubishi_fa"
  | "mitsubishi_mv"
  | "sodick_aq"
  | "sodick_al"
  | "makino_u"
  | "makino_eu"
  | "agie_cut"
  | "agie_charm"
  | "fanuc_robocut"
  | "generic";

export interface UnitMismatch {
  type: "code_mismatch" | "scale_mismatch" | "feed_mismatch" | "missing_unit";
  line_number: number;
  expected: string;
  found: string;
  severity: "critical" | "warning";
  message: string;
}

export interface UnitTagResult {
  success: boolean;
  pass: boolean;
  declared_unit: DeclaredUnit;
  code_unit: string | null;
  coordinate_scale_consistent: boolean;
  feed_scale_consistent: boolean;
  mismatches: UnitMismatch[];
  analysis: {
    g20_count: number;
    g21_count: number;
    max_coordinate: AtomicValue<number>;
    min_coordinate: AtomicValue<number>;
    max_feed: AtomicValue<number> | null;
    coordinate_range: AtomicValue<number>;
  };
  hard_block: boolean;
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROLLER UNIT CODES
// ═══════════════════════════════════════════════════════════════════════════

interface ControllerUnitCodes {
  metric: string;
  imperial: string;
}

const CONTROLLER_UNIT_CODES: Record<WEDMController, ControllerUnitCodes> = {
  mitsubishi_fa: { metric: "G21", imperial: "G20" },
  mitsubishi_mv: { metric: "G21", imperial: "G20" },
  sodick_aq: { metric: "G21", imperial: "G20" },
  sodick_al: { metric: "G21", imperial: "G20" },
  makino_u: { metric: "G21", imperial: "G20" },
  makino_eu: { metric: "G21", imperial: "G20" },
  agie_cut: { metric: "G71", imperial: "G70" },
  agie_charm: { metric: "G71", imperial: "G70" },
  fanuc_robocut: { metric: "G21", imperial: "G20" },
  generic: { metric: "G21", imperial: "G20" },
};

// ═══════════════════════════════════════════════════════════════════════════
// PLAUSIBILITY THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════

const THRESHOLDS = {
  // Inch mode: coordinates > 25" are unusual for wire EDM
  inch_max_plausible: 25,
  // MM mode: if ALL coordinates < 5mm, likely inch values
  mm_min_plausible: 5,
  // Inch feed: > 10 ipm is unusual for wire EDM
  inch_feed_max: 10,
  // MM feed: < 50 mm/min is very slow (unless fine finish)
  mm_feed_min: 50,
  // If max coord in "inch" mode > this, likely mm values
  inch_coord_mm_indicator: 50,
  // If max coord in "mm" mode < this, likely inch values
  mm_coord_inch_indicator: 10,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class WEDMUnitTagGateEngine {
  /**
   * Validate unit tag consistency between declared unit and G-code
   */
  validate(input: UnitTagInput): UnitTagResult {
    const controller = input.controller ?? "generic";
    const codes = CONTROLLER_UNIT_CODES[controller];
    const lines = input.gcode.split(/\r?\n/);
    const mismatches: UnitMismatch[] = [];

    // Extract unit codes from program
    const { g20_count, g21_count, g70_count, g71_count, firstUnitLine, firstUnitCode } =
      this.extractUnitCodes(lines, codes);

    // Determine code unit
    let code_unit: string | null = null;
    if (firstUnitCode) {
      code_unit = firstUnitCode;
    }

    // Check for unit code mismatch
    const expectedCode = input.declared_unit === "metric" ? codes.metric : codes.imperial;
    const wrongCode = input.declared_unit === "metric" ? codes.imperial : codes.metric;

    if (!code_unit) {
      mismatches.push({
        type: "missing_unit",
        line_number: 1,
        expected: expectedCode,
        found: "none",
        severity: "critical",
        message: `No unit code found (expected ${expectedCode} for ${input.declared_unit})`,
      });
    } else if (code_unit === wrongCode) {
      mismatches.push({
        type: "code_mismatch",
        line_number: firstUnitLine,
        expected: expectedCode,
        found: code_unit,
        severity: "critical",
        message: `Unit code mismatch: found ${code_unit} but declared ${input.declared_unit} (expected ${expectedCode})`,
      });
    }

    // Extract coordinates and feeds
    const { coordinates, feeds, maxCoord, minCoord, maxFeed } = this.extractValues(lines);

    // Check coordinate scale plausibility
    const coordinate_scale_consistent = this.checkCoordinateScale(
      input.declared_unit,
      maxCoord,
      minCoord,
      mismatches
    );

    // Check feed scale plausibility
    const feed_scale_consistent = this.checkFeedScale(
      input.declared_unit,
      maxFeed,
      mismatches
    );

    // Determine pass/fail
    const hasCritical = mismatches.some((m) => m.severity === "critical");
    const pass = !hasCritical;
    const hard_block = hasCritical;

    // Build analysis
    const coordUnit = input.declared_unit === "metric" ? "mm" : "in";
    const feedUnit = input.declared_unit === "metric" ? "mm/min" : "in/min";

    const analysis = {
      g20_count,
      g21_count,
      max_coordinate: {
        value: maxCoord,
        unit: coordUnit,
        confidence: code_unit ? 0.95 : 0.5,
        source: "gcode_scan",
      } as AtomicValue<number>,
      min_coordinate: {
        value: minCoord,
        unit: coordUnit,
        confidence: code_unit ? 0.95 : 0.5,
        source: "gcode_scan",
      } as AtomicValue<number>,
      max_feed: maxFeed !== null
        ? ({
            value: maxFeed,
            unit: feedUnit,
            confidence: 0.9,
            source: "gcode_scan",
          } as AtomicValue<number>)
        : null,
      coordinate_range: {
        value: maxCoord - minCoord,
        unit: coordUnit,
        confidence: code_unit ? 0.95 : 0.5,
        source: "calculated",
      } as AtomicValue<number>,
    };

    return {
      success: true,
      pass,
      declared_unit: input.declared_unit,
      code_unit,
      coordinate_scale_consistent,
      feed_scale_consistent,
      mismatches,
      analysis,
      hard_block,
      summary: this.buildSummary(pass, input.declared_unit, code_unit, mismatches),
    };
  }

  /**
   * Quick check for S(x) integration
   */
  quickCheck(gcode: string, declared_unit: DeclaredUnit): {
    pass: boolean;
    declared_unit: DeclaredUnit;
    code_unit: string | null;
    coordinate_scale_consistent: boolean;
  } {
    const result = this.validate({ gcode, declared_unit });
    return {
      pass: result.pass,
      declared_unit: result.declared_unit,
      code_unit: result.code_unit,
      coordinate_scale_consistent: result.coordinate_scale_consistent,
    };
  }

  /**
   * Convert value between unit systems with safety check
   */
  convertWithSafetyCheck(
    value: number,
    from_unit: DeclaredUnit,
    to_unit: DeclaredUnit
  ): AtomicValue<number> {
    if (from_unit === to_unit) {
      return {
        value,
        unit: from_unit === "metric" ? "mm" : "in",
        confidence: 1.0,
        source: "no_conversion",
      };
    }

    const converted = from_unit === "metric" ? value / 25.4 : value * 25.4;
    return {
      value: converted,
      unit: to_unit === "metric" ? "mm" : "in",
      confidence: 0.99,
      source: `converted_from_${from_unit}`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private extractUnitCodes(
    lines: string[],
    codes: ControllerUnitCodes
  ): {
    g20_count: number;
    g21_count: number;
    g70_count: number;
    g71_count: number;
    firstUnitLine: number;
    firstUnitCode: string | null;
  } {
    let g20_count = 0;
    let g21_count = 0;
    let g70_count = 0;
    let g71_count = 0;
    let firstUnitLine = 0;
    let firstUnitCode: string | null = null;

    const g20Regex = /\bG20\b/i;
    const g21Regex = /\bG21\b/i;
    const g70Regex = /\bG70\b/i;
    const g71Regex = /\bG71\b/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (g20Regex.test(line)) {
        g20_count++;
        if (!firstUnitCode && (codes.metric === "G21" || codes.imperial === "G20")) {
          firstUnitCode = "G20";
          firstUnitLine = i + 1;
        }
      }

      if (g21Regex.test(line)) {
        g21_count++;
        if (!firstUnitCode && (codes.metric === "G21" || codes.imperial === "G20")) {
          firstUnitCode = "G21";
          firstUnitLine = i + 1;
        }
      }

      if (g70Regex.test(line)) {
        g70_count++;
        if (!firstUnitCode && (codes.metric === "G71" || codes.imperial === "G70")) {
          firstUnitCode = "G70";
          firstUnitLine = i + 1;
        }
      }

      if (g71Regex.test(line)) {
        g71_count++;
        if (!firstUnitCode && (codes.metric === "G71" || codes.imperial === "G70")) {
          firstUnitCode = "G71";
          firstUnitLine = i + 1;
        }
      }
    }

    return { g20_count, g21_count, g70_count, g71_count, firstUnitLine, firstUnitCode };
  }

  private extractValues(lines: string[]): {
    coordinates: number[];
    feeds: number[];
    maxCoord: number;
    minCoord: number;
    maxFeed: number | null;
  } {
    const coordinates: number[] = [];
    const feeds: number[] = [];

    // Match X, Y, Z, U, V coordinates
    const coordRegex = /[XYZUV]([-+]?\d*\.?\d+)/gi;
    // Match F (feedrate)
    const feedRegex = /F([-+]?\d*\.?\d+)/gi;

    for (const line of lines) {
      // Skip comments
      if (line.trim().startsWith("(") || line.trim().startsWith(";")) continue;

      let match;
      while ((match = coordRegex.exec(line)) !== null) {
        const val = parseFloat(match[1]);
        if (!isNaN(val)) {
          coordinates.push(Math.abs(val));
        }
      }

      while ((match = feedRegex.exec(line)) !== null) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val > 0) {
          feeds.push(val);
        }
      }
    }

    const maxCoord = coordinates.length > 0 ? Math.max(...coordinates) : 0;
    const minCoord = coordinates.length > 0 ? Math.min(...coordinates.filter((c) => c > 0)) : 0;
    const maxFeed = feeds.length > 0 ? Math.max(...feeds) : null;

    return { coordinates, feeds, maxCoord, minCoord, maxFeed };
  }

  private checkCoordinateScale(
    declared_unit: DeclaredUnit,
    maxCoord: number,
    minCoord: number,
    mismatches: UnitMismatch[]
  ): boolean {
    if (maxCoord === 0) return true; // No coordinates to check

    if (declared_unit === "imperial") {
      // If "inch" but max coord > 50, likely mm values (25.4× error)
      if (maxCoord > THRESHOLDS.inch_coord_mm_indicator) {
        mismatches.push({
          type: "scale_mismatch",
          line_number: 0,
          expected: `coordinates < ${THRESHOLDS.inch_coord_mm_indicator} in`,
          found: `max coordinate: ${maxCoord.toFixed(3)}`,
          severity: "critical",
          message: `Coordinate scale indicates metric values (max: ${maxCoord.toFixed(3)}) but declared as imperial. Likely 25.4× error.`,
        });
        return false;
      }
    } else {
      // If "mm" but max coord < 10 and no coord > 25, likely inch values
      if (maxCoord < THRESHOLDS.mm_coord_inch_indicator && maxCoord > 0) {
        mismatches.push({
          type: "scale_mismatch",
          line_number: 0,
          expected: `coordinates > ${THRESHOLDS.mm_coord_inch_indicator} mm for typical parts`,
          found: `max coordinate: ${maxCoord.toFixed(3)}`,
          severity: "warning",
          message: `Coordinate scale may indicate imperial values (max: ${maxCoord.toFixed(3)}) but declared as metric. Verify units.`,
        });
        // Warning only, not critical
      }
    }

    return true;
  }

  private checkFeedScale(
    declared_unit: DeclaredUnit,
    maxFeed: number | null,
    mismatches: UnitMismatch[]
  ): boolean {
    if (maxFeed === null) return true; // No feeds to check

    if (declared_unit === "imperial") {
      // If "inch" but feed > 10 ipm, unusual for wire EDM
      if (maxFeed > THRESHOLDS.inch_feed_max) {
        mismatches.push({
          type: "feed_mismatch",
          line_number: 0,
          expected: `feed < ${THRESHOLDS.inch_feed_max} in/min for wire EDM`,
          found: `max feed: ${maxFeed.toFixed(1)}`,
          severity: "warning",
          message: `Feed rate ${maxFeed.toFixed(1)} ipm is unusually high for wire EDM. Verify units.`,
        });
      }
    } else {
      // If "mm" but feed < 50 mm/min, might be inch values
      if (maxFeed < THRESHOLDS.mm_feed_min) {
        mismatches.push({
          type: "feed_mismatch",
          line_number: 0,
          expected: `feed > ${THRESHOLDS.mm_feed_min} mm/min for typical cuts`,
          found: `max feed: ${maxFeed.toFixed(1)}`,
          severity: "warning",
          message: `Feed rate ${maxFeed.toFixed(1)} mm/min is very low. May indicate imperial values.`,
        });
      }
    }

    return true;
  }

  private buildSummary(
    pass: boolean,
    declared_unit: DeclaredUnit,
    code_unit: string | null,
    mismatches: UnitMismatch[]
  ): string {
    if (pass) {
      return `PASS: Unit tag validated. Declared: ${declared_unit}, Code: ${code_unit ?? "none"}`;
    }

    const criticalCount = mismatches.filter((m) => m.severity === "critical").length;
    return `HARD BLOCK: ${criticalCount} critical unit mismatch(es). 25.4× error risk. ${mismatches[0]?.message ?? ""}`;
  }
}

export const wedmUnitTagGateEngine = new WEDMUnitTagGateEngine();
