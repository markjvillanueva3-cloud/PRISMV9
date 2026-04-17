/**
 * WEDMControllerDialectVerifierEngine — Controller-Specific Code Validation
 *
 * Validates G/M/E/C-codes against controller dialect specifications.
 * Each wire EDM controller has unique code requirements:
 * - Mitsubishi: E-codes for tech tables, M6/M7 wire threading
 * - Sodick: C-codes for conditions, different M-codes
 * - Makino: Unique offset syntax
 * - Agie: G70/G71 units, M17 end
 * - Fanuc: Standard Fanuc dialect
 *
 * HARD BLOCK if invalid codes detected for target controller.
 *
 * @module WEDMControllerDialectVerifierEngine
 * MS-P2.5-SAFETY/U-P2.5-SAFE-06
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

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

export interface DialectInput {
  gcode: string;
  expected_controller: WEDMController;
}

export interface CodeViolation {
  line_number: number;
  code: string;
  issue: "invalid_code" | "wrong_controller" | "missing_required" | "deprecated";
  severity: "critical" | "warning";
  message: string;
  suggestion?: string;
}

export interface DialectGateResult {
  success: boolean;
  pass: boolean;
  expected_controller: WEDMController;
  detected_codes: {
    g_codes: string[];
    m_codes: string[];
    e_codes: number[];
    c_codes: number[];
  };
  violations: CodeViolation[];
  required_codes_present: string[];
  required_codes_missing: string[];
  hard_block: boolean;
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROLLER DIALECT SPECIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

interface ControllerDialect {
  name: string;
  manufacturer: string;
  valid_g_codes: string[];
  valid_m_codes: string[];
  e_code_range?: [number, number]; // [min, max] for E-codes
  c_code_range?: [number, number]; // [min, max] for C-codes
  required_codes: string[];
  program_end_codes: string[];
  unit_codes: { metric: string; imperial: string };
  wire_threading: { start: string; end: string };
  deprecated_codes?: string[];
  notes: string;
}

const CONTROLLER_DIALECTS: Record<WEDMController, ControllerDialect> = {
  mitsubishi_fa: {
    name: "Mitsubishi FA Series",
    manufacturer: "Mitsubishi Electric",
    valid_g_codes: ["G00", "G01", "G02", "G03", "G04", "G20", "G21", "G40", "G41", "G42", "G90", "G91", "G92", "G94"],
    valid_m_codes: ["M00", "M01", "M02", "M06", "M07", "M08", "M09", "M17", "M18", "M30", "M50", "M51", "M60", "M61", "M80", "M81", "M98", "M99"],
    e_code_range: [1, 64],
    required_codes: ["G21", "M30"],
    program_end_codes: ["M02", "M30"],
    unit_codes: { metric: "G21", imperial: "G20" },
    wire_threading: { start: "M06", end: "M07" },
    notes: "E-codes select tech tables (E1-E64), M6/M7 for threading",
  },
  mitsubishi_mv: {
    name: "Mitsubishi MV Series",
    manufacturer: "Mitsubishi Electric",
    valid_g_codes: ["G00", "G01", "G02", "G03", "G04", "G20", "G21", "G40", "G41", "G42", "G90", "G91", "G92", "G94"],
    valid_m_codes: ["M00", "M01", "M02", "M06", "M07", "M08", "M09", "M17", "M18", "M30", "M50", "M51", "M60", "M61", "M80", "M81", "M98", "M99"],
    e_code_range: [1, 99],
    required_codes: ["G21", "M30"],
    program_end_codes: ["M02", "M30"],
    unit_codes: { metric: "G21", imperial: "G20" },
    wire_threading: { start: "M06", end: "M07" },
    notes: "MV series has extended E-code range",
  },
  sodick_aq: {
    name: "Sodick AQ Series",
    manufacturer: "Sodick",
    valid_g_codes: ["G00", "G01", "G02", "G03", "G04", "G20", "G21", "G40", "G41", "G42", "G90", "G91", "G92"],
    valid_m_codes: ["M00", "M01", "M02", "M08", "M09", "M10", "M11", "M30", "M70", "M71", "M98", "M99"],
    c_code_range: [1, 200],
    required_codes: ["G21", "M30"],
    program_end_codes: ["M02", "M30"],
    unit_codes: { metric: "G21", imperial: "G20" },
    wire_threading: { start: "M10", end: "M11" },
    notes: "C-codes for conditions, M10/M11 for threading",
  },
  sodick_al: {
    name: "Sodick AL Series",
    manufacturer: "Sodick",
    valid_g_codes: ["G00", "G01", "G02", "G03", "G04", "G20", "G21", "G40", "G41", "G42", "G90", "G91", "G92"],
    valid_m_codes: ["M00", "M01", "M02", "M08", "M09", "M10", "M11", "M30", "M70", "M71", "M98", "M99"],
    c_code_range: [1, 150],
    required_codes: ["G21", "M30"],
    program_end_codes: ["M02", "M30"],
    unit_codes: { metric: "G21", imperial: "G20" },
    wire_threading: { start: "M10", end: "M11" },
    notes: "AL series - linear motors",
  },
  makino_u: {
    name: "Makino U Series",
    manufacturer: "Makino",
    valid_g_codes: ["G00", "G01", "G02", "G03", "G04", "G20", "G21", "G40", "G41", "G42", "G50", "G51", "G90", "G91", "G92"],
    valid_m_codes: ["M00", "M01", "M02", "M06", "M07", "M08", "M09", "M30", "M98", "M99"],
    e_code_range: [1, 50],
    required_codes: ["G21", "M30"],
    program_end_codes: ["M02", "M30"],
    unit_codes: { metric: "G21", imperial: "G20" },
    wire_threading: { start: "M06", end: "M07" },
    notes: "Makino U series - unique offset syntax",
  },
  makino_eu: {
    name: "Makino EU Series",
    manufacturer: "Makino",
    valid_g_codes: ["G00", "G01", "G02", "G03", "G04", "G20", "G21", "G40", "G41", "G42", "G50", "G51", "G90", "G91", "G92"],
    valid_m_codes: ["M00", "M01", "M02", "M06", "M07", "M08", "M09", "M30", "M98", "M99"],
    e_code_range: [1, 80],
    required_codes: ["G21", "M30"],
    program_end_codes: ["M02", "M30"],
    unit_codes: { metric: "G21", imperial: "G20" },
    wire_threading: { start: "M06", end: "M07" },
    notes: "Makino EU series - extended E-codes",
  },
  agie_cut: {
    name: "GF AgieCharmilles CUT",
    manufacturer: "GF Machining Solutions",
    valid_g_codes: ["G00", "G01", "G02", "G03", "G04", "G70", "G71", "G40", "G41", "G42", "G90", "G91", "G92"],
    valid_m_codes: ["M00", "M01", "M17", "M08", "M09", "M20", "M21", "M98", "M99"],
    required_codes: ["G71", "M17"],
    program_end_codes: ["M17"],
    unit_codes: { metric: "G71", imperial: "G70" },
    wire_threading: { start: "M20", end: "M21" },
    notes: "Agie uses G70/G71 for units, M17 for program end",
  },
  agie_charm: {
    name: "GF AgieCharmilles CHARM",
    manufacturer: "GF Machining Solutions",
    valid_g_codes: ["G00", "G01", "G02", "G03", "G04", "G70", "G71", "G40", "G41", "G42", "G90", "G91", "G92"],
    valid_m_codes: ["M00", "M01", "M17", "M08", "M09", "M20", "M21", "M98", "M99"],
    required_codes: ["G71", "M17"],
    program_end_codes: ["M17"],
    unit_codes: { metric: "G71", imperial: "G70" },
    wire_threading: { start: "M20", end: "M21" },
    notes: "Charmilles ROBOFIL variant",
  },
  fanuc_robocut: {
    name: "Fanuc Robocut",
    manufacturer: "Fanuc",
    valid_g_codes: ["G00", "G01", "G02", "G03", "G04", "G20", "G21", "G40", "G41", "G42", "G90", "G91", "G92", "G94"],
    valid_m_codes: ["M00", "M01", "M02", "M06", "M07", "M08", "M09", "M30", "M98", "M99"],
    e_code_range: [1, 32],
    required_codes: ["G21", "M30"],
    program_end_codes: ["M02", "M30"],
    unit_codes: { metric: "G21", imperial: "G20" },
    wire_threading: { start: "M06", end: "M07" },
    notes: "Standard Fanuc EDM dialect",
  },
  generic: {
    name: "Generic Wire EDM",
    manufacturer: "Generic",
    valid_g_codes: ["G00", "G01", "G02", "G03", "G04", "G20", "G21", "G40", "G41", "G42", "G70", "G71", "G90", "G91", "G92"],
    valid_m_codes: ["M00", "M01", "M02", "M06", "M07", "M08", "M09", "M17", "M30", "M98", "M99"],
    required_codes: [],
    program_end_codes: ["M02", "M17", "M30"],
    unit_codes: { metric: "G21", imperial: "G20" },
    wire_threading: { start: "M06", end: "M07" },
    notes: "Generic validation - accepts most codes",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class WEDMControllerDialectVerifierEngine {
  /**
   * Verify G-code against controller dialect
   */
  verify(input: DialectInput): DialectGateResult {
    const dialect = CONTROLLER_DIALECTS[input.expected_controller];
    const lines = input.gcode.split(/\r?\n/);
    const violations: CodeViolation[] = [];

    // Extract all codes from the program
    const detected = this.extractCodes(lines);

    // Validate G-codes
    for (const gc of detected.g_codes) {
      const lineNum = this.findCodeLine(lines, gc);
      if (!this.isValidGCode(gc, dialect)) {
        violations.push({
          line_number: lineNum,
          code: gc,
          issue: "invalid_code",
          severity: "critical",
          message: `G-code ${gc} not valid for ${dialect.name}`,
          suggestion: this.suggestAlternative(gc, dialect),
        });
      }
    }

    // Validate M-codes
    for (const mc of detected.m_codes) {
      const lineNum = this.findCodeLine(lines, mc);
      if (!this.isValidMCode(mc, dialect)) {
        violations.push({
          line_number: lineNum,
          code: mc,
          issue: "invalid_code",
          severity: "critical",
          message: `M-code ${mc} not valid for ${dialect.name}`,
          suggestion: this.suggestAlternative(mc, dialect),
        });
      }
    }

    // Validate E-codes
    if (dialect.e_code_range && detected.e_codes.length > 0) {
      for (const ec of detected.e_codes) {
        if (ec < dialect.e_code_range[0] || ec > dialect.e_code_range[1]) {
          violations.push({
            line_number: this.findCodeLine(lines, `E${ec}`),
            code: `E${ec}`,
            issue: "invalid_code",
            severity: "critical",
            message: `E-code E${ec} outside valid range (E${dialect.e_code_range[0]}-E${dialect.e_code_range[1]}) for ${dialect.name}`,
          });
        }
      }
    } else if (!dialect.e_code_range && detected.e_codes.length > 0) {
      // Controller doesn't support E-codes
      for (const ec of detected.e_codes) {
        violations.push({
          line_number: this.findCodeLine(lines, `E${ec}`),
          code: `E${ec}`,
          issue: "wrong_controller",
          severity: "critical",
          message: `E-codes not supported on ${dialect.name}`,
          suggestion: dialect.c_code_range ? "Use C-codes instead" : undefined,
        });
      }
    }

    // Validate C-codes
    if (dialect.c_code_range && detected.c_codes.length > 0) {
      for (const cc of detected.c_codes) {
        if (cc < dialect.c_code_range[0] || cc > dialect.c_code_range[1]) {
          violations.push({
            line_number: this.findCodeLine(lines, `C${cc}`),
            code: `C${cc}`,
            issue: "invalid_code",
            severity: "critical",
            message: `C-code C${cc} outside valid range (C${dialect.c_code_range[0]}-C${dialect.c_code_range[1]}) for ${dialect.name}`,
          });
        }
      }
    } else if (!dialect.c_code_range && detected.c_codes.length > 0) {
      // Controller doesn't support C-codes
      for (const cc of detected.c_codes) {
        violations.push({
          line_number: this.findCodeLine(lines, `C${cc}`),
          code: `C${cc}`,
          issue: "wrong_controller",
          severity: "critical",
          message: `C-codes not supported on ${dialect.name}`,
          suggestion: dialect.e_code_range ? "Use E-codes instead" : undefined,
        });
      }
    }

    // Check for required codes
    const allCodes = [...detected.g_codes, ...detected.m_codes];
    const required_codes_present: string[] = [];
    const required_codes_missing: string[] = [];

    for (const req of dialect.required_codes) {
      if (allCodes.includes(req)) {
        required_codes_present.push(req);
      } else {
        required_codes_missing.push(req);
        violations.push({
          line_number: 1,
          code: req,
          issue: "missing_required",
          severity: "warning",
          message: `Required code ${req} not found for ${dialect.name}`,
        });
      }
    }

    // Check for program end code
    const hasEndCode = dialect.program_end_codes.some(ec => detected.m_codes.includes(ec));
    if (!hasEndCode) {
      violations.push({
        line_number: lines.length,
        code: dialect.program_end_codes[0],
        issue: "missing_required",
        severity: "warning",
        message: `No program end code found. Expected one of: ${dialect.program_end_codes.join(", ")}`,
      });
    }

    // Determine pass/fail
    const criticalViolations = violations.filter(v => v.severity === "critical");
    const pass = criticalViolations.length === 0;

    return {
      success: true,
      pass,
      expected_controller: input.expected_controller,
      detected_codes: detected,
      violations,
      required_codes_present,
      required_codes_missing,
      hard_block: !pass,
      summary: this.buildSummary(pass, input.expected_controller, violations),
    };
  }

  /**
   * Quick check for S(x) integration
   */
  quickCheckForSx(
    gcode: string,
    expected_controller: WEDMController
  ): {
    pass: boolean;
    expected_controller: WEDMController;
  } {
    const result = this.verify({ gcode, expected_controller });
    return {
      pass: result.pass,
      expected_controller: result.expected_controller,
    };
  }

  /**
   * Get dialect specification for a controller
   */
  getDialect(controller: WEDMController): ControllerDialect {
    return CONTROLLER_DIALECTS[controller];
  }

  /**
   * List all supported controllers
   */
  listControllers(): WEDMController[] {
    return Object.keys(CONTROLLER_DIALECTS) as WEDMController[];
  }

  /**
   * Detect likely controller from G-code content
   */
  detectController(gcode: string): { controller: WEDMController; confidence: number; reasons: string[] } {
    const codes = this.extractCodes(gcode.split(/\r?\n/));
    const reasons: string[] = [];
    let bestMatch: WEDMController = "generic";
    let bestScore = 0;

    // Check for Agie-specific codes
    if (codes.g_codes.includes("G71") || codes.g_codes.includes("G70")) {
      reasons.push("G70/G71 unit codes indicate Agie");
      return { controller: "agie_cut", confidence: 0.9, reasons };
    }

    if (codes.m_codes.includes("M17") && !codes.m_codes.includes("M30")) {
      reasons.push("M17 program end without M30 indicates Agie");
      return { controller: "agie_cut", confidence: 0.85, reasons };
    }

    // Check for Sodick C-codes
    if (codes.c_codes.length > 0) {
      reasons.push("C-codes indicate Sodick");
      return { controller: "sodick_aq", confidence: 0.85, reasons };
    }

    // Check for Mitsubishi patterns
    if (codes.e_codes.length > 0 && codes.m_codes.includes("M06") && codes.m_codes.includes("M07")) {
      reasons.push("E-codes with M06/M07 threading indicate Mitsubishi");
      if (codes.e_codes.some(e => e > 64)) {
        return { controller: "mitsubishi_mv", confidence: 0.8, reasons };
      }
      return { controller: "mitsubishi_fa", confidence: 0.8, reasons };
    }

    // Check for Fanuc patterns
    if (codes.e_codes.length > 0 && codes.e_codes.every(e => e <= 32)) {
      reasons.push("Low E-code range suggests Fanuc");
      return { controller: "fanuc_robocut", confidence: 0.6, reasons };
    }

    reasons.push("No specific controller features detected");
    return { controller: "generic", confidence: 0.3, reasons };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private extractCodes(lines: string[]): {
    g_codes: string[];
    m_codes: string[];
    e_codes: number[];
    c_codes: number[];
  } {
    const g_codes = new Set<string>();
    const m_codes = new Set<string>();
    const e_codes = new Set<number>();
    const c_codes = new Set<number>();

    const gRegex = /\b(G\d{1,2})\b/gi;
    const mRegex = /\b(M\d{1,2})\b/gi;
    const eRegex = /\bE(\d{1,3})\b/gi;
    const cRegex = /\bC(\d{1,3})\b/gi;

    for (const line of lines) {
      // Skip comments
      if (line.trim().startsWith("(") || line.trim().startsWith(";")) continue;

      let match;
      while ((match = gRegex.exec(line)) !== null) {
        g_codes.add(match[1].toUpperCase());
      }
      while ((match = mRegex.exec(line)) !== null) {
        m_codes.add(match[1].toUpperCase());
      }
      while ((match = eRegex.exec(line)) !== null) {
        e_codes.add(parseInt(match[1], 10));
      }
      while ((match = cRegex.exec(line)) !== null) {
        // Filter out C for arcs (I, J, K, R context)
        if (!/[IJKR]/i.test(line)) {
          c_codes.add(parseInt(match[1], 10));
        }
      }
    }

    return {
      g_codes: Array.from(g_codes).sort(),
      m_codes: Array.from(m_codes).sort(),
      e_codes: Array.from(e_codes).sort((a, b) => a - b),
      c_codes: Array.from(c_codes).sort((a, b) => a - b),
    };
  }

  private isValidGCode(code: string, dialect: ControllerDialect): boolean {
    const normalized = code.toUpperCase();
    // Also check G0, G1 variants of G00, G01
    const withLeadingZero = normalized.length === 2 ? `G0${normalized[1]}` : normalized;
    return dialect.valid_g_codes.includes(normalized) ||
           dialect.valid_g_codes.includes(withLeadingZero);
  }

  private isValidMCode(code: string, dialect: ControllerDialect): boolean {
    const normalized = code.toUpperCase();
    const withLeadingZero = normalized.length === 2 ? `M0${normalized[1]}` : normalized;
    return dialect.valid_m_codes.includes(normalized) ||
           dialect.valid_m_codes.includes(withLeadingZero);
  }

  private findCodeLine(lines: string[], code: string): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toUpperCase().includes(code.toUpperCase())) {
        return i + 1;
      }
    }
    return 1;
  }

  private suggestAlternative(code: string, dialect: ControllerDialect): string | undefined {
    // Common substitutions
    const substitutions: Record<string, string> = {
      "M30": dialect.program_end_codes[0],
      "M02": dialect.program_end_codes[0],
      "G21": dialect.unit_codes.metric,
      "G20": dialect.unit_codes.imperial,
    };
    return substitutions[code.toUpperCase()];
  }

  private buildSummary(
    pass: boolean,
    controller: WEDMController,
    violations: CodeViolation[]
  ): string {
    const dialect = CONTROLLER_DIALECTS[controller];
    const criticalCount = violations.filter(v => v.severity === "critical").length;
    const warningCount = violations.filter(v => v.severity === "warning").length;

    if (pass) {
      const warningNote = warningCount > 0 ? ` (${warningCount} warning(s))` : "";
      return `PASS: G-code valid for ${dialect.name}${warningNote}`;
    }

    return `HARD BLOCK: ${criticalCount} invalid code(s) for ${dialect.name}. ${violations[0]?.message ?? ""}`;
  }
}

export const wedmControllerDialectVerifierEngine = new WEDMControllerDialectVerifierEngine();
