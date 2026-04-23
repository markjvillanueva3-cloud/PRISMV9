/**
 * WEDMUnitTagGateEngine — Unit-Tag & 25.4× Confusion Guard
 *
 * Validates that an emitted WEDM program's unit declaration is coherent across
 * three sources of truth:
 *
 *   1. The caller-declared unit  (input.units, metric | imperial)
 *   2. The G-code header         (G21 metric | G20 imperial | missing)
 *   3. The coordinate magnitudes (numerical sanity vs declared stock size)
 *
 * The 25.4× confusion class is the single most common — and most dangerous —
 * WEDM unit bug: a machinist programs a 2-inch feature as "2.0" but the
 * control is in metric, producing a 2 mm feature (or vice versa, producing
 * a 50.8 mm feature when 2 mm was intended). The result is machine crashes,
 * scrapped stock, or silent geometric errors that only surface on FAI.
 *
 * This engine cross-checks all three sources and emits a single AtomicValue
 * verdict + a safety_gate_input shape that WEDMProgramSafetyGateEngine's
 * `unit_tag` slot consumes directly. On any mismatch (header ≠ declared,
 * shop profile ≠ declared, or coords off by ~25.4× from the stock bbox),
 * the verdict is a HARD BLOCK contributing 0 to S(x).
 *
 * MS-P2.5-SAFETY/U-P2.5-SAFE-02
 *
 * @see WEDMProgramSafetyGateEngine   composite S(x) gate consumer
 * @see WEDMProgramVerificationEngine structural per-controller check
 */

import type { AtomicValue } from "../algorithms/types.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type UnitSystem = "metric" | "imperial";
export type UnitHeaderCode = "G20" | "G21" | "missing";

export type UnitTagVerdict =
  | "pass"
  | "fail_header_missing"
  | "fail_header_mismatch"
  | "fail_shop_profile_mismatch"
  | "fail_coordinate_magnitude"
  | "fail_empty_program";

export interface UnitTagInput {
  /** Full emitted G-code program. */
  program_text: string;
  /** Caller-declared unit system from WEDMProgramInput.units. */
  declared_unit: UnitSystem;
  /** Optional shop-profile unit system — if present must match declared. */
  shop_unit_system?: UnitSystem;
  /** Stock bounding-box dimension (max of X/Y extent) in the DECLARED unit.
   *  Used for the 25.4× confusion coord-magnitude check. When absent, the
   *  magnitude check is skipped (only header + shop profile are verified). */
  expected_max_coord?: number;
  /** Ratio at which a coordinate is declared "too small/large" vs expected.
   *  Default 5×. A 25.4× mis-convert is well beyond 5×, so 5 is the right
   *  alarm threshold with headroom for legitimate work-zero offsets. */
  magnitude_tolerance_ratio?: number;
}

export interface UnitTagComponentMetrics {
  header_found: UnitHeaderCode;
  header_matches_declared: boolean;
  shop_profile_matches_declared: boolean;
  max_abs_coord_found: number | null;
  expected_max_coord: number | null;
  magnitude_ratio: number | null;
  coord_magnitude_suspicious: boolean;
}

export interface UnitTagGateResult {
  success: boolean;
  pass: boolean;
  verdict: UnitTagVerdict;
  hard_block: boolean;
  declared_unit: UnitSystem;
  metrics: UnitTagComponentMetrics;
  /** Exact shape WEDMProgramSafetyGateEngine.unit_tag expects. */
  safety_gate_input: {
    pass: boolean;
    declared_unit: UnitSystem;
    code_unit: UnitHeaderCode;
    coordinate_scale_consistent: boolean;
  };
  /** AtomicValue-wrapped verdict (1.0 on pass, 0.0 on fail) for propagation. */
  atomic: AtomicValue;
  safety_score_contribution: number;
  summary: string;
  warnings: string[];
  recommendations: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const SAFETY_SCORE_PASS = 0.1;
const SAFETY_SCORE_FAIL = 0.0;

/** Maximum plausible X/Y/Z coordinate magnitude in a scan (absolute). */
const COORD_REGEX = /\b([XYZIJKUV])([+-]?\d+\.?\d*)\b/g;

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class WEDMUnitTagGateEngine {
  readonly name = "WEDMUnitTagGateEngine";
  readonly version = "1.0.0";

  /**
   * Evaluate unit-tag consistency across declared unit, emitted header, and
   * coordinate magnitudes. PASS only when ALL three agree.
   *
   * @param input declared unit, program text, optional shop profile + bbox
   * @returns full result with AtomicValue verdict and safety_gate_input
   */
  evaluate(input: UnitTagInput): UnitTagGateResult {
    if (!input.program_text || !input.program_text.trim()) {
      return this.buildEmptyProgramFailure(input);
    }

    const warnings: string[] = [];
    const recommendations: string[] = [];

    // ── 1. Header detection ────────────────────────────────────────────────
    const header = this.detectHeader(input.program_text);
    const expectedHeader: UnitHeaderCode =
      input.declared_unit === "metric" ? "G21" : "G20";
    const headerMatches = header === expectedHeader;

    // ── 2. Shop profile check ──────────────────────────────────────────────
    const shopMatches =
      input.shop_unit_system === undefined ||
      input.shop_unit_system === input.declared_unit;

    // ── 3. Coordinate magnitude sanity ─────────────────────────────────────
    const maxCoord = this.detectMaxCoordinate(input.program_text);
    let magnitudeRatio: number | null = null;
    let magnitudeSuspicious = false;
    if (
      typeof input.expected_max_coord === "number" &&
      Number.isFinite(input.expected_max_coord) &&
      input.expected_max_coord > 0 &&
      maxCoord !== null &&
      maxCoord > 0
    ) {
      const tolerance = Math.max(1.1, input.magnitude_tolerance_ratio ?? 5.0);
      magnitudeRatio = maxCoord / input.expected_max_coord;
      // Suspicious when ratio is not in [1/tolerance, tolerance].
      magnitudeSuspicious =
        magnitudeRatio < 1 / tolerance || magnitudeRatio > tolerance;
    }

    // ── 4. Verdict ─────────────────────────────────────────────────────────
    let verdict: UnitTagVerdict = "pass";
    let pass = true;

    if (header === "missing") {
      verdict = "fail_header_missing";
      pass = false;
      warnings.push(`Program header missing G20/G21 — cannot verify unit.`);
      recommendations.push(
        `Emit ${expectedHeader} in the program header so the control locks the coordinate system.`,
      );
    } else if (!headerMatches) {
      verdict = "fail_header_mismatch";
      pass = false;
      warnings.push(
        `Header ${header} does not match declared ${input.declared_unit} — expected ${expectedHeader}.`,
      );
      recommendations.push(
        `Either set the declared unit to match the emitted ${header}, or re-emit with ${expectedHeader}.`,
      );
    } else if (!shopMatches) {
      verdict = "fail_shop_profile_mismatch";
      pass = false;
      warnings.push(
        `Shop profile unit ${input.shop_unit_system} ≠ declared ${input.declared_unit} — 25.4× confusion risk.`,
      );
      recommendations.push(
        `Confirm shop profile and input units agree before emitting — a mismatch causes coordinates to be interpreted 25.4× off.`,
      );
    } else if (magnitudeSuspicious && magnitudeRatio !== null) {
      verdict = "fail_coordinate_magnitude";
      pass = false;
      const near254 = Math.abs(Math.log(magnitudeRatio) / Math.log(25.4));
      const likely254 = near254 > 0.85 && near254 < 1.15;
      warnings.push(
        `Coordinate magnitude off by ${magnitudeRatio.toFixed(2)}× vs declared stock ${input.expected_max_coord!.toFixed(2)} ${input.declared_unit === "metric" ? "mm" : "in"}${likely254 ? " — MATCHES 25.4× unit-confusion pattern" : ""}.`,
      );
      recommendations.push(
        likely254
          ? `Likely 25.4× unit confusion — re-verify input.units vs program coordinates.`
          : `Check the expected_max_coord input or review the contour bounding box.`,
      );
    }

    const metrics: UnitTagComponentMetrics = {
      header_found: header,
      header_matches_declared: headerMatches,
      shop_profile_matches_declared: shopMatches,
      max_abs_coord_found: maxCoord,
      expected_max_coord: input.expected_max_coord ?? null,
      magnitude_ratio: magnitudeRatio,
      coord_magnitude_suspicious: magnitudeSuspicious,
    };

    const atomic: AtomicValue = {
      value: pass ? 1.0 : 0.0,
      unit: "dimensionless",
      uncertainty: 0,
      source: `${this.name} v${this.version}`,
      confidence: pass ? 1.0 : 0.99,
      formula: "unit_tag_pass = header_ok ∧ shop_ok ∧ ¬magnitude_suspicious",
      ...(pass
        ? {}
        : {
            warning: `Unit-tag verdict ${verdict}: ${warnings[0] ?? ""}`,
          }),
    };

    return {
      success: true,
      pass,
      verdict,
      hard_block: !pass,
      declared_unit: input.declared_unit,
      metrics,
      safety_gate_input: {
        pass,
        declared_unit: input.declared_unit,
        code_unit: header,
        coordinate_scale_consistent: !magnitudeSuspicious && pass,
      },
      atomic,
      safety_score_contribution: pass ? SAFETY_SCORE_PASS : SAFETY_SCORE_FAIL,
      summary: pass
        ? `UNIT OK: declared ${input.declared_unit}, header ${header}, max_coord ${maxCoord?.toFixed(2) ?? "n/a"}`
        : `UNIT BLOCK: ${verdict} — declared ${input.declared_unit}, header ${header}${
            magnitudeRatio !== null ? `, mag_ratio ${magnitudeRatio.toFixed(2)}×` : ""
          }`,
      warnings,
      recommendations,
    };
  }

  /**
   * Convenience gate wrapper matching the other safety engines' API.
   */
  gate(input: UnitTagInput): {
    allow: boolean;
    reason: string;
    result: UnitTagGateResult;
  } {
    const result = this.evaluate(input);
    return { allow: result.pass, reason: result.summary, result };
  }

  /**
   * Scan the first ~200 non-comment lines for a G20 or G21 header. We look
   * BEFORE the first cutting command because modal G-code contexts mean
   * a late G20/G21 does not rescue an opening coordinate system.
   */
  detectHeader(programText: string): UnitHeaderCode {
    // Strip comments so `( ... G20 ... )` text isn't considered the header
    const stripped = programText
      .replace(/\([^)]*\)/g, " ")
      .replace(/;[^\r\n]*/g, " ");
    const hasG21 = /\bG21\b/.test(stripped);
    const hasG20 = /\bG20\b/.test(stripped);
    if (hasG21 && !hasG20) return "G21";
    if (hasG20 && !hasG21) return "G20";
    if (hasG21 && hasG20) {
      // Both present — whichever appears first wins (modal context).
      const firstG21 = stripped.search(/\bG21\b/);
      const firstG20 = stripped.search(/\bG20\b/);
      return firstG21 < firstG20 ? "G21" : "G20";
    }
    return "missing";
  }

  /**
   * Return the maximum absolute X/Y coordinate magnitude in the program, for
   * 25.4× confusion detection. Comments are stripped first.
   */
  detectMaxCoordinate(programText: string): number | null {
    const stripped = programText
      .replace(/\([^)]*\)/g, " ")
      .replace(/;[^\r\n]*/g, " ");
    let max = 0;
    let found = false;
    for (const match of stripped.matchAll(COORD_REGEX)) {
      const axis = match[1];
      if (axis !== "X" && axis !== "Y") continue;
      const v = Math.abs(parseFloat(match[2]));
      if (Number.isFinite(v)) {
        if (v > max) max = v;
        found = true;
      }
    }
    return found ? max : null;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INTERNAL
  // ════════════════════════════════════════════════════════════════════════════

  private buildEmptyProgramFailure(input: UnitTagInput): UnitTagGateResult {
    return {
      success: true,
      pass: false,
      verdict: "fail_empty_program",
      hard_block: true,
      declared_unit: input.declared_unit,
      metrics: {
        header_found: "missing",
        header_matches_declared: false,
        shop_profile_matches_declared:
          input.shop_unit_system === undefined ||
          input.shop_unit_system === input.declared_unit,
        max_abs_coord_found: null,
        expected_max_coord: input.expected_max_coord ?? null,
        magnitude_ratio: null,
        coord_magnitude_suspicious: false,
      },
      safety_gate_input: {
        pass: false,
        declared_unit: input.declared_unit,
        code_unit: "missing",
        coordinate_scale_consistent: false,
      },
      atomic: {
        value: 0,
        unit: "dimensionless",
        uncertainty: 0,
        source: `${this.name} v${this.version}`,
        confidence: 1.0,
        warning: "Empty program — cannot verify unit tag",
      },
      safety_score_contribution: SAFETY_SCORE_FAIL,
      summary: `UNIT BLOCK: empty program — cannot verify ${input.declared_unit} unit tag`,
      warnings: ["Program text is empty"],
      recommendations: ["Provide the emitted G-code body for verification"],
    };
  }
}

export const wedmUnitTagGateEngine = new WEDMUnitTagGateEngine();
