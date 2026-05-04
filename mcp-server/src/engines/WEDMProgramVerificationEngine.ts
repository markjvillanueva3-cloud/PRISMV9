/**
 * WEDMProgramVerificationEngine — Emitted program structural verification
 *
 * Validates complete Wire EDM G-code programs for structural correctness before
 * release to the machine. Catches common programming errors that would cause
 * runtime failures or unsafe operation.
 *
 * Verification checks:
 *   - G41/G42 cutter compensation pairing (must have matching G40 cancel)
 *   - Program termination (M02, M30, or controller-specific end code)
 *   - Unit consistency (G20/G21 matches input specification)
 *   - E-code validation (all referenced E-codes defined in tech tables)
 *   - Coordinate range (within machine travel limits)
 *   - Wire threading sequences (M6 before cut, M7 after cut on Mitsubishi)
 *   - Submerge commands (M28/M29 pairing for submerged cutting)
 *
 * S(x) contribution: pass → +0.10, fail → HARD BLOCK
 *
 * MS-P1.5-ONESHOT/U-P1.5-OS-06
 *
 * @see WEDMWirePathCollisionEngine — runtime collision detection
 * @see WEDMPostDialectRouterEngine — program generation
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type WEDMControllerType =
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

export interface VerificationInput {
  gcode: string;
  controller: WEDMControllerType;
  expected_units: "metric" | "imperial";
  /** Valid E-codes for this controller/material combo */
  valid_e_codes?: number[];
  /** Machine travel limits (mm) */
  travel_limits?: {
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    u_min?: number;
    u_max?: number;
    v_min?: number;
    v_max?: number;
  };
  /** Skip specific checks */
  skip_checks?: VerificationCheckType[];
}

export type VerificationCheckType =
  | "offset_pairing"
  | "program_end"
  | "unit_consistency"
  | "e_code_validity"
  | "coordinate_range"
  | "wire_threading"
  | "submerge_pairing"
  | "taper_pairing"
  | "line_numbering";

export type IssueSeverity = "error" | "warning" | "info";

export interface VerificationIssue {
  check: VerificationCheckType;
  severity: IssueSeverity;
  line_number: number;
  line_content: string;
  message: string;
  suggestion?: string;
}

export interface VerificationResult {
  success: boolean;
  pass: boolean;
  issues: VerificationIssue[];
  error_count: number;
  warning_count: number;
  info_count: number;
  safety_score_contribution: number;
  hard_block: boolean;
  checks_performed: VerificationCheckType[];
  lines_analyzed: number;
  summary: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTROLLER-SPECIFIC CODES
// ══════════════════════════════════════════════════════════════════════════════

interface ControllerCodes {
  program_end: string[];
  wire_thread: string[];
  wire_cut: string[];
  submerge_on: string[];
  submerge_off: string[];
  taper_on: string[];
  taper_off: string[];
  offset_left: string;
  offset_right: string;
  offset_cancel: string;
  unit_metric: string;
  unit_imperial: string;
}

const CONTROLLER_CODES: Record<WEDMControllerType, ControllerCodes> = {
  mitsubishi_fa: {
    program_end: ["M02", "M2", "M30"],
    wire_thread: ["M6"],
    wire_cut: ["M7"],
    submerge_on: ["M28"],
    submerge_off: ["M29"],
    taper_on: ["G51"],
    taper_off: ["G50"],
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    unit_metric: "G21",
    unit_imperial: "G20",
  },
  mitsubishi_mv: {
    program_end: ["M02", "M2", "M30"],
    wire_thread: ["M6"],
    wire_cut: ["M7"],
    submerge_on: ["M28"],
    submerge_off: ["M29"],
    taper_on: ["G51"],
    taper_off: ["G50"],
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    unit_metric: "G21",
    unit_imperial: "G20",
  },
  sodick_aq: {
    program_end: ["M30", "M02", "M2"],
    wire_thread: ["M50"],
    wire_cut: ["M51"],
    submerge_on: ["M78"],
    submerge_off: ["M79"],
    taper_on: ["G51"],
    taper_off: ["G50"],
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    unit_metric: "G21",
    unit_imperial: "G20",
  },
  sodick_al: {
    program_end: ["M30", "M02", "M2"],
    wire_thread: ["M50"],
    wire_cut: ["M51"],
    submerge_on: ["M78"],
    submerge_off: ["M79"],
    taper_on: ["G51"],
    taper_off: ["G50"],
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    unit_metric: "G21",
    unit_imperial: "G20",
  },
  makino_u: {
    program_end: ["M30", "M02", "M2"],
    wire_thread: ["M06", "M6"],
    wire_cut: ["M07", "M7"],
    submerge_on: ["M21"],
    submerge_off: ["M22"],
    taper_on: ["G51"],
    taper_off: ["G50"],
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    unit_metric: "G21",
    unit_imperial: "G20",
  },
  makino_eu: {
    program_end: ["M30", "M02", "M2"],
    wire_thread: ["M06", "M6"],
    wire_cut: ["M07", "M7"],
    submerge_on: ["M21"],
    submerge_off: ["M22"],
    taper_on: ["G51"],
    taper_off: ["G50"],
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    unit_metric: "G21",
    unit_imperial: "G20",
  },
  agie_cut: {
    program_end: ["M17"],
    wire_thread: ["M20"],
    wire_cut: ["M21"],
    submerge_on: ["M24"],
    submerge_off: ["M25"],
    taper_on: ["G51"],
    taper_off: ["G50"],
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    unit_metric: "G71",
    unit_imperial: "G70",
  },
  agie_charm: {
    program_end: ["M17"],
    wire_thread: ["M20"],
    wire_cut: ["M21"],
    submerge_on: ["M24"],
    submerge_off: ["M25"],
    taper_on: ["G51"],
    taper_off: ["G50"],
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    unit_metric: "G71",
    unit_imperial: "G70",
  },
  fanuc_robocut: {
    program_end: ["M30", "M02", "M2"],
    wire_thread: ["M60"],
    wire_cut: ["M61"],
    submerge_on: ["M50"],
    submerge_off: ["M51"],
    taper_on: ["G51.1"],
    taper_off: ["G50.1"],
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    unit_metric: "G21",
    unit_imperial: "G20",
  },
  generic: {
    program_end: ["M02", "M2", "M30"],
    wire_thread: ["M6"],
    wire_cut: ["M7"],
    submerge_on: ["M28"],
    submerge_off: ["M29"],
    taper_on: ["G51"],
    taper_off: ["G50"],
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    unit_metric: "G21",
    unit_imperial: "G20",
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class WEDMProgramVerificationEngine {
  readonly name = "WEDMProgramVerificationEngine";
  readonly version = "1.0.0";

  private readonly SAFETY_SCORE_PASS = 0.1;
  private readonly SAFETY_SCORE_FAIL = 0.0;

  /**
   * Verify a WEDM G-code program for structural correctness
   */
  verify(input: VerificationInput): VerificationResult {
    const issues: VerificationIssue[] = [];
    const lines = input.gcode.split(/\r?\n/);
    const codes = CONTROLLER_CODES[input.controller] || CONTROLLER_CODES.generic;
    const skipChecks = new Set(input.skip_checks || []);
    const checksPerformed: VerificationCheckType[] = [];

    // Offset pairing check (G41/G42 must have G40)
    if (!skipChecks.has("offset_pairing")) {
      checksPerformed.push("offset_pairing");
      this.checkOffsetPairing(lines, codes, issues);
    }

    // Program end check
    if (!skipChecks.has("program_end")) {
      checksPerformed.push("program_end");
      this.checkProgramEnd(lines, codes, issues);
    }

    // Unit consistency check
    if (!skipChecks.has("unit_consistency")) {
      checksPerformed.push("unit_consistency");
      this.checkUnitConsistency(lines, codes, input.expected_units, issues);
    }

    // E-code validity check
    if (!skipChecks.has("e_code_validity") && input.valid_e_codes) {
      checksPerformed.push("e_code_validity");
      this.checkECodeValidity(lines, input.valid_e_codes, issues);
    }

    // Coordinate range check
    if (!skipChecks.has("coordinate_range") && input.travel_limits) {
      checksPerformed.push("coordinate_range");
      this.checkCoordinateRange(lines, input.travel_limits, issues);
    }

    // Wire threading sequence check
    if (!skipChecks.has("wire_threading")) {
      checksPerformed.push("wire_threading");
      this.checkWireThreading(lines, codes, issues);
    }

    // Submerge pairing check
    if (!skipChecks.has("submerge_pairing")) {
      checksPerformed.push("submerge_pairing");
      this.checkSubmergePairing(lines, codes, issues);
    }

    // Taper pairing check
    if (!skipChecks.has("taper_pairing")) {
      checksPerformed.push("taper_pairing");
      this.checkTaperPairing(lines, codes, issues);
    }

    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    const infoCount = issues.filter((i) => i.severity === "info").length;
    const pass = errorCount === 0;

    return {
      success: true,
      pass,
      issues,
      error_count: errorCount,
      warning_count: warningCount,
      info_count: infoCount,
      safety_score_contribution: pass ? this.SAFETY_SCORE_PASS : this.SAFETY_SCORE_FAIL,
      hard_block: !pass,
      checks_performed: checksPerformed,
      lines_analyzed: lines.length,
      summary: pass
        ? `Program verified: ${lines.length} lines, ${checksPerformed.length} checks passed. S(x) +${this.SAFETY_SCORE_PASS}`
        : `VERIFICATION FAILED: ${errorCount} errors, ${warningCount} warnings. HARD BLOCK — program cannot release.`,
    };
  }

  /**
   * Gate function — returns true only if program passes verification
   */
  gate(input: VerificationInput): { allow: boolean; reason: string; result: VerificationResult } {
    const result = this.verify(input);
    return {
      allow: result.pass,
      reason: result.summary,
      result,
    };
  }

  /**
   * Quick verify with minimal inputs (uses generic controller)
   */
  quickVerify(gcode: string, expectedUnits: "metric" | "imperial" = "metric"): VerificationResult {
    return this.verify({
      gcode,
      controller: "generic",
      expected_units: expectedUnits,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INDIVIDUAL CHECKS
  // ════════════════════════════════════════════════════════════════════════════

  private checkOffsetPairing(
    lines: string[],
    codes: ControllerCodes,
    issues: VerificationIssue[]
  ): void {
    let offsetActive = false;
    let offsetStartLine = -1;
    let offsetStartContent = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      const lineNum = i + 1;

      if (line.includes(codes.offset_left) || line.includes(codes.offset_right)) {
        if (offsetActive) {
          issues.push({
            check: "offset_pairing",
            severity: "error",
            line_number: lineNum,
            line_content: lines[i],
            message: `Nested cutter compensation: ${codes.offset_left}/${codes.offset_right} without prior ${codes.offset_cancel}`,
            suggestion: `Add ${codes.offset_cancel} before line ${lineNum} to cancel previous offset`,
          });
        }
        offsetActive = true;
        offsetStartLine = lineNum;
        offsetStartContent = lines[i];
      }

      if (line.includes(codes.offset_cancel)) {
        if (!offsetActive) {
          issues.push({
            check: "offset_pairing",
            severity: "warning",
            line_number: lineNum,
            line_content: lines[i],
            message: `${codes.offset_cancel} without prior ${codes.offset_left}/${codes.offset_right}`,
          });
        }
        offsetActive = false;
      }
    }

    if (offsetActive) {
      issues.push({
        check: "offset_pairing",
        severity: "error",
        line_number: offsetStartLine,
        line_content: offsetStartContent,
        message: `Unclosed cutter compensation: ${codes.offset_left}/${codes.offset_right} at line ${offsetStartLine} never canceled`,
        suggestion: `Add ${codes.offset_cancel} before program end`,
      });
    }
  }

  private checkProgramEnd(
    lines: string[],
    codes: ControllerCodes,
    issues: VerificationIssue[]
  ): void {
    let hasEnd = false;
    let endLineNum = -1;

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].toUpperCase().trim();
      if (!line || line.startsWith("(") || line.startsWith(";") || line === "%") {
        continue;
      }

      for (const endCode of codes.program_end) {
        if (line.includes(endCode.toUpperCase())) {
          hasEnd = true;
          endLineNum = i + 1;
          break;
        }
      }
      if (hasEnd) break;

      // Check if we found a non-comment, non-end line before finding end
      if (!hasEnd && endLineNum === -1) {
        endLineNum = i + 1;
      }
    }

    if (!hasEnd) {
      issues.push({
        check: "program_end",
        severity: "error",
        line_number: lines.length,
        line_content: lines[lines.length - 1] || "",
        message: `Missing program end code (expected one of: ${codes.program_end.join(", ")})`,
        suggestion: `Add ${codes.program_end[0]} at end of program`,
      });
    }
  }

  private checkUnitConsistency(
    lines: string[],
    codes: ControllerCodes,
    expectedUnits: "metric" | "imperial",
    issues: VerificationIssue[]
  ): void {
    const expectedCode = expectedUnits === "metric" ? codes.unit_metric : codes.unit_imperial;
    const wrongCode = expectedUnits === "metric" ? codes.unit_imperial : codes.unit_metric;
    let foundExpected = false;
    let foundWrong = false;
    let wrongLineNum = -1;
    let wrongLineContent = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();

      if (line.includes(expectedCode)) {
        foundExpected = true;
      }
      if (line.includes(wrongCode)) {
        foundWrong = true;
        wrongLineNum = i + 1;
        wrongLineContent = lines[i];
      }
    }

    if (foundWrong) {
      issues.push({
        check: "unit_consistency",
        severity: "error",
        line_number: wrongLineNum,
        line_content: wrongLineContent,
        message: `Unit mismatch: found ${wrongCode} but expected ${expectedCode} (${expectedUnits})`,
        suggestion: `Change ${wrongCode} to ${expectedCode}`,
      });
    }

    if (!foundExpected && !foundWrong) {
      issues.push({
        check: "unit_consistency",
        severity: "warning",
        line_number: 1,
        line_content: lines[0] || "",
        message: `No unit code found (expected ${expectedCode} for ${expectedUnits})`,
        suggestion: `Add ${expectedCode} at program start`,
      });
    }
  }

  private checkECodeValidity(
    lines: string[],
    validECodes: number[],
    issues: VerificationIssue[]
  ): void {
    const eCodePattern = /E(\d+)/gi;
    const validSet = new Set(validECodes);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;

      while ((match = eCodePattern.exec(line)) !== null) {
        const eCode = parseInt(match[1], 10);
        if (!validSet.has(eCode)) {
          issues.push({
            check: "e_code_validity",
            severity: "error",
            line_number: i + 1,
            line_content: line,
            message: `Undefined E-code: E${eCode} not in valid tech table`,
            suggestion: `Use one of: ${validECodes.slice(0, 5).map((e) => `E${e}`).join(", ")}...`,
          });
        }
      }
    }
  }

  private checkCoordinateRange(
    lines: string[],
    limits: NonNullable<VerificationInput["travel_limits"]>,
    issues: VerificationIssue[]
  ): void {
    const coordPattern = /([XYUV])(-?\d+\.?\d*)/gi;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith("(") || line.trim().startsWith(";")) continue;

      let match;
      while ((match = coordPattern.exec(line)) !== null) {
        const axis = match[1].toUpperCase();
        const value = parseFloat(match[2]);

        let min: number | undefined;
        let max: number | undefined;

        switch (axis) {
          case "X":
            min = limits.x_min;
            max = limits.x_max;
            break;
          case "Y":
            min = limits.y_min;
            max = limits.y_max;
            break;
          case "U":
            min = limits.u_min;
            max = limits.u_max;
            break;
          case "V":
            min = limits.v_min;
            max = limits.v_max;
            break;
        }

        if (min !== undefined && value < min) {
          issues.push({
            check: "coordinate_range",
            severity: "error",
            line_number: i + 1,
            line_content: line,
            message: `${axis}${value} below minimum travel limit (${min})`,
            suggestion: `Adjust coordinate or check work offset`,
          });
        }

        if (max !== undefined && value > max) {
          issues.push({
            check: "coordinate_range",
            severity: "error",
            line_number: i + 1,
            line_content: line,
            message: `${axis}${value} exceeds maximum travel limit (${max})`,
            suggestion: `Adjust coordinate or check work offset`,
          });
        }
      }
    }
  }

  private checkWireThreading(
    lines: string[],
    codes: ControllerCodes,
    issues: VerificationIssue[]
  ): void {
    let hasThread = false;
    let hasCut = false;
    let threadBeforeCut = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();

      for (const threadCode of codes.wire_thread) {
        if (line.includes(threadCode.toUpperCase())) {
          hasThread = true;
          if (hasCut && !hasThread) {
            threadBeforeCut = false;
          }
        }
      }

      for (const cutCode of codes.wire_cut) {
        if (line.includes(cutCode.toUpperCase())) {
          if (!hasThread) {
            issues.push({
              check: "wire_threading",
              severity: "warning",
              line_number: i + 1,
              line_content: lines[i],
              message: `Wire cut command (${cutCode}) without prior thread command`,
              suggestion: `Ensure wire is threaded before cutting`,
            });
          }
          hasCut = true;
        }
      }
    }
  }

  private checkSubmergePairing(
    lines: string[],
    codes: ControllerCodes,
    issues: VerificationIssue[]
  ): void {
    let submergeActive = false;
    let submergeStartLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      const lineNum = i + 1;

      for (const onCode of codes.submerge_on) {
        if (line.includes(onCode.toUpperCase())) {
          submergeActive = true;
          submergeStartLine = lineNum;
        }
      }

      for (const offCode of codes.submerge_off) {
        if (line.includes(offCode.toUpperCase())) {
          submergeActive = false;
        }
      }
    }

    // It's okay to end with submerge still on (machine will drain)
    // Only warn, don't error
    if (submergeActive) {
      issues.push({
        check: "submerge_pairing",
        severity: "info",
        line_number: submergeStartLine,
        line_content: lines[submergeStartLine - 1] || "",
        message: `Submerge mode still active at program end`,
        suggestion: `Consider adding ${codes.submerge_off[0]} before program end for explicit tank drain`,
      });
    }
  }

  private checkTaperPairing(
    lines: string[],
    codes: ControllerCodes,
    issues: VerificationIssue[]
  ): void {
    let taperActive = false;
    let taperStartLine = -1;
    let taperStartContent = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      const lineNum = i + 1;

      for (const onCode of codes.taper_on) {
        if (line.includes(onCode.toUpperCase())) {
          if (taperActive) {
            issues.push({
              check: "taper_pairing",
              severity: "warning",
              line_number: lineNum,
              line_content: lines[i],
              message: `Nested taper mode: ${onCode} without prior cancel`,
            });
          }
          taperActive = true;
          taperStartLine = lineNum;
          taperStartContent = lines[i];
        }
      }

      for (const offCode of codes.taper_off) {
        if (line.includes(offCode.toUpperCase())) {
          taperActive = false;
        }
      }
    }

    if (taperActive) {
      issues.push({
        check: "taper_pairing",
        severity: "error",
        line_number: taperStartLine,
        line_content: taperStartContent,
        message: `Unclosed taper mode at line ${taperStartLine}`,
        suggestion: `Add ${codes.taper_off[0]} before program end`,
      });
    }
  }

  /**
   * Get controller-specific codes for external use
   */
  getControllerCodes(controller: WEDMControllerType): ControllerCodes {
    return CONTROLLER_CODES[controller] || CONTROLLER_CODES.generic;
  }

  /**
   * List all supported controllers
   */
  getSupportedControllers(): WEDMControllerType[] {
    return Object.keys(CONTROLLER_CODES) as WEDMControllerType[];
  }

  /**
   * Get S(x) safety score contribution
   */
  getSafetyScoreContribution(result: VerificationResult): number {
    return result.safety_score_contribution;
  }
}

export const wedmProgramVerificationEngine = new WEDMProgramVerificationEngine();
