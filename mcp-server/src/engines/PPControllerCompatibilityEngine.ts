/**
 * PPControllerCompatibilityEngine — Validate G-code against target controller capabilities
 *
 * Given a G-code program and a target controller family (Fanuc, Haas NGC,
 * Okuma OSP, Heidenhain, Siemens 840D, Mitsubishi Meldas, Mazak Matrix,
 * Hurco WinMax), reports codes that would not be accepted on that controller,
 * with severity and optional workaround suggestions.
 *
 * Scope — supplements but does NOT replace:
 *   - ControllerDialectEngine (large dialect knowledge base)
 *   - ControllerFeatureMatrixEngine (feature capability matrix)
 *   - PPDialectTransferEngine (cross-controller translation)
 *
 * This engine is a focused code-level checker: walk the program, for each
 * G-word / M-word / syntax feature, classify against the target controller.
 *
 * Supported controllers:
 *   - fanuc            — Fanuc 0i / 30i / 31i (baseline, largest G/M set)
 *   - haas_ngc         — Haas Next Generation (accepts most Fanuc; omits a few)
 *   - okuma_osp        — Okuma OSP-P300 (Fanuc-compat mode but has own cycles)
 *   - heidenhain_tnc   — Heidenhain TNC 640 (different dialect, CYCL DEF)
 *   - siemens_840d     — Siemens Sinumerik 840D (different, CYCLE8x)
 *   - mitsubishi_m800  — Mitsubishi M800 Meldas (near Fanuc)
 *   - mazak_matrix     — Mazak Matrix2 (EIA/ISO mode mostly Fanuc)
 *   - hurco_winmax     — Hurco WinMax (accepts G-code + Hurco conversational)
 *
 * @module PPControllerCompatibilityEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type ControllerTarget =
  | "fanuc"
  | "haas_ngc"
  | "okuma_osp"
  | "heidenhain_tnc"
  | "siemens_840d"
  | "mitsubishi_m800"
  | "mazak_matrix"
  | "hurco_winmax";

export type CompatSeverity = "error" | "warning" | "info";

export interface CompatIssue {
  line_number: number;           // 1-indexed
  code: string;                  // e.g., "G71", "M198", "#100"
  kind: "g_code" | "m_code" | "macro_variable" | "flow_control" | "syntax";
  severity: CompatSeverity;
  message: string;
  workaround?: string;
}

export interface CompatResult {
  target: ControllerTarget;
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: CompatIssue[];
  summary: {
    compatible: boolean;           // true if zero errors
    unsupported_codes: string[];   // distinct codes that triggered errors
  };
}

// ── Controller capability tables ─────────────────────────────────────
//
// For each controller, we list codes that are UNSUPPORTED (negative list)
// along with the severity and optional workaround. Anything not listed is
// assumed to be supported (Fanuc baseline). This keeps tables small and
// explicit — we track the differences, not the whole spec.

interface ControllerProfile {
  unsupported_g: Map<number, { severity: CompatSeverity; message: string; workaround?: string }>;
  unsupported_m: Map<number, { severity: CompatSeverity; message: string; workaround?: string }>;
  allows_macro: boolean;              // #variables, IF/WHILE
  allows_decimal_point_shortcut: boolean; // "X10" as "X10.000" (Fanuc yes, Haas yes, Heidenhain no)
  subprogram_call_word: string;       // "M98" (Fanuc-family) or "CALL" (Siemens)
  notes: string[];
}

const PROFILES: Record<ControllerTarget, ControllerProfile> = {
  fanuc: {
    unsupported_g: new Map(),   // Fanuc is baseline — everything supported
    unsupported_m: new Map(),
    allows_macro: true,
    allows_decimal_point_shortcut: true,
    subprogram_call_word: "M98",
    notes: ["Baseline controller — widest compatibility"],
  },
  haas_ngc: {
    unsupported_g: new Map([
      // Haas NGC does support G71/G72 cycles as of newer firmware; but a few
      // Fanuc cycles lack direct equivalents.
      [10.6, { severity: "warning", message: "G10.6 probe cycles (Fanuc macro-B extension) not on Haas" }],
      [140, { severity: "warning", message: "G140 retrace not supported on Haas" }],
      [141, { severity: "warning", message: "G141 3D cutter comp not on Haas NGC" }],
    ]),
    unsupported_m: new Map([
      [198, { severity: "error", message: "M198 external subprogram call is Fanuc — Haas uses M98 (internal) or FNC-DNC", workaround: "Use M98 P#### for internal subprograms" }],
    ]),
    allows_macro: true,
    allows_decimal_point_shortcut: true,
    subprogram_call_word: "M98",
    notes: ["Haas NGC accepts most Fanuc syntax", "Local subprograms: M97 P<line>"],
  },
  okuma_osp: {
    unsupported_g: new Map([
      // Okuma in Fanuc-compat mode accepts most; native OSP has its own cycles (LAP)
      [83, { severity: "warning", message: "G83 peck drill — Okuma prefers G83 cycle but arg semantics differ slightly" }],
    ]),
    unsupported_m: new Map([
      [198, { severity: "error", message: "M198 not standard on Okuma — use MAIN/SUB structure", workaround: "Use subprogram via main program subroutine block or external O-number" }],
    ]),
    allows_macro: true,
    allows_decimal_point_shortcut: true,
    subprogram_call_word: "CALL",
    notes: [
      "Okuma OSP native supports LAP/REP lathe cycles",
      "Fanuc-compat mode toggled by controller parameter",
      "Twin-spindle: $1/$2 channel markers required",
    ],
  },
  heidenhain_tnc: {
    unsupported_g: new Map([
      // Heidenhain ISO mode accepts G-code but most programs use Klartext (CYCL DEF)
      [81, { severity: "error", message: "G81 drill cycle — Heidenhain uses CYCL DEF 200", workaround: "Translate to CYCL DEF 200 DRILLING" }],
      [82, { severity: "error", message: "G82 dwell drill — Heidenhain uses CYCL DEF 203" }],
      [83, { severity: "error", message: "G83 peck drill — Heidenhain uses CYCL DEF 203 PECKING" }],
      [84, { severity: "error", message: "G84 tap — Heidenhain uses CYCL DEF 207/209" }],
      [85, { severity: "error", message: "G85 bore — Heidenhain uses CYCL DEF 202 BORING" }],
      [86, { severity: "error", message: "G86 bore + stop — Heidenhain uses CYCL DEF 202" }],
      [89, { severity: "error", message: "G89 bore + dwell — Heidenhain uses CYCL DEF 202" }],
      [98, { severity: "warning", message: "G98 (Fanuc feedrate per min) — Heidenhain uses M94/M95" }],
    ]),
    unsupported_m: new Map([
      [98, { severity: "error", message: "M98 Fanuc subprogram call — Heidenhain uses CALL PGM or CALL LBL", workaround: "Convert to CALL PGM <filename> or CALL LBL <n>" }],
      [198, { severity: "error", message: "M198 external subprogram — use CALL PGM on Heidenhain" }],
    ]),
    allows_macro: false,  // Heidenhain uses Q-parameters, not #vars
    allows_decimal_point_shortcut: false,  // Heidenhain requires explicit decimals
    subprogram_call_word: "CALL PGM",
    notes: [
      "Primary language: Klartext conversational",
      "ISO mode available but most shops use Klartext",
      "Use Q-parameters (Q1, Q2, ...) instead of #1, #2",
    ],
  },
  siemens_840d: {
    unsupported_g: new Map([
      [81, { severity: "error", message: "G81 drill — Siemens uses CYCLE81", workaround: "Translate to CYCLE81(RTP, RFP, SDIS, DP, DPR)" }],
      [82, { severity: "error", message: "G82 dwell drill — Siemens uses CYCLE82" }],
      [83, { severity: "error", message: "G83 peck drill — Siemens uses CYCLE83 / CYCLE84" }],
      [84, { severity: "error", message: "G84 tap — Siemens uses CYCLE84" }],
      [85, { severity: "error", message: "G85 bore — Siemens uses CYCLE85/86" }],
      [98, { severity: "warning", message: "Fanuc G98 feed/min — Siemens uses FNORM/FLIN" }],
    ]),
    unsupported_m: new Map([
      [98, { severity: "error", message: "M98 Fanuc — Siemens uses L<name> or CALL", workaround: "Use EXTCALL or subprogram call syntax" }],
    ]),
    allows_macro: true,  // Siemens has R-parameters and its own macro syntax
    allows_decimal_point_shortcut: false,
    subprogram_call_word: "CALL",
    notes: [
      "Primary dialect: Siemens Sinumerik",
      "Use R-parameters (R1, R2, ...) for arithmetic",
      "CYCLE cycles instead of G8x canned cycles",
    ],
  },
  mitsubishi_m800: {
    unsupported_g: new Map([
      // Mitsubishi M800 is nearly Fanuc-compatible
      [10.6, { severity: "warning", message: "G10.6 probe cycles not standard on Meldas" }],
    ]),
    unsupported_m: new Map([
      // Most M-codes overlap with Fanuc
    ]),
    allows_macro: true,
    allows_decimal_point_shortcut: true,
    subprogram_call_word: "M98",
    notes: ["Near-Fanuc compatible", "Wire EDM machines use MX-line dialect (M6/M7/M8)"],
  },
  mazak_matrix: {
    unsupported_g: new Map([
      // Mazak Matrix2 in EIA/ISO mode is mostly Fanuc-compat
    ]),
    unsupported_m: new Map([]),
    allows_macro: true,
    allows_decimal_point_shortcut: true,
    subprogram_call_word: "M98",
    notes: [
      "Mazatrol conversational is the primary interface",
      "EIA/ISO G-code mode is Fanuc-compat",
    ],
  },
  hurco_winmax: {
    unsupported_g: new Map([
      [10.6, { severity: "warning", message: "G10.6 not on Hurco WinMax G-code side" }],
    ]),
    unsupported_m: new Map([
      [198, { severity: "warning", message: "M198 external sub — Hurco prefers conversational", workaround: "Use M98 P#### internal subprogram" }],
    ]),
    allows_macro: true,
    allows_decimal_point_shortcut: true,
    subprogram_call_word: "M98",
    notes: [
      "Hurco WinMax accepts G-code AND Hurco conversational",
      "G-code mode is Fanuc-compat",
    ],
  },
};

// ── Engine ─────────────────────────────────────────────────────────────

export class PPControllerCompatibilityEngine {
  /**
   * Check a G-code program against a target controller.
   */
  check(gcode: string, target: ControllerTarget): CompatResult {
    const profile = PROFILES[target];
    if (!profile) {
      throw new Error(`Unknown controller target: ${target}`);
    }

    const issues: CompatIssue[] = [];
    const rawLines = gcode.split(/\r?\n/);

    for (let idx = 0; idx < rawLines.length; idx++) {
      const raw = rawLines[idx];
      const line = idx + 1;
      const code = this.stripComments(raw).toUpperCase();

      if (code.length === 0) continue;

      // G and M codes
      const tokens = [...code.matchAll(/([GM])(-?\d+\.?\d*)/g)];
      for (const t of tokens) {
        const letter = t[1] as "G" | "M";
        const value = parseFloat(t[2]);
        if (Number.isNaN(value)) continue;

        if (letter === "G") {
          const entry = profile.unsupported_g.get(value);
          if (entry) {
            issues.push({
              line_number: line,
              code: `G${this.formatCode(value)}`,
              kind: "g_code",
              severity: entry.severity,
              message: entry.message,
              workaround: entry.workaround,
            });
          }
        } else {
          const entry = profile.unsupported_m.get(value);
          if (entry) {
            issues.push({
              line_number: line,
              code: `M${this.formatCode(value)}`,
              kind: "m_code",
              severity: entry.severity,
              message: entry.message,
              workaround: entry.workaround,
            });
          }
        }
      }

      // Macro variables #NN
      if (/#\d+/.test(code) && !profile.allows_macro) {
        issues.push({
          line_number: line,
          code: "#var",
          kind: "macro_variable",
          severity: "error",
          message: `Target ${target} does not support # macro variables (uses ${target === "heidenhain_tnc" ? "Q-parameters" : "R-parameters"} instead)`,
          workaround: target === "heidenhain_tnc" ? "Translate #1..#n to Q1..Qn" : "Translate #1..#n to R1..Rn",
        });
      }

      // Flow control keywords that require macro support
      if (/\b(IF|WHILE|GOTO|DO|END)\b/.test(code) && !profile.allows_macro) {
        issues.push({
          line_number: line,
          code: "flow",
          kind: "flow_control",
          severity: "error",
          message: `IF/WHILE/GOTO requires macro support — not available on ${target}`,
        });
      }

      // Decimal-point omission (e.g., "X10" interpreted as X10. vs X0.0010)
      // Only flag if profile disallows the shortcut AND we see an integer word
      // without a decimal point AND without a trailing decimal-point separator.
      if (!profile.allows_decimal_point_shortcut) {
        // Look for axis words with integer-only values (no decimal point)
        const axisRegex = /\b([XYZABCUVWIJK])(-?\d+)\b(?!\.)/g;
        const axisMatches = [...code.matchAll(axisRegex)];
        if (axisMatches.length > 0) {
          issues.push({
            line_number: line,
            code: axisMatches[0][0],
            kind: "syntax",
            severity: "warning",
            message: `${target} requires explicit decimal points on axis words (integer shortcut not allowed)`,
            workaround: `Rewrite e.g. "X10" as "X10." or "X10.0"`,
          });
        }
      }
    }

    // Aggregate
    const errors = issues.filter(i => i.severity === "error").length;
    const warnings = issues.filter(i => i.severity === "warning").length;
    const info = issues.filter(i => i.severity === "info").length;
    const unsupported = [...new Set(
      issues.filter(i => i.severity === "error").map(i => i.code),
    )];

    return {
      target,
      total_issues: issues.length,
      errors,
      warnings,
      info,
      issues,
      summary: {
        compatible: errors === 0,
        unsupported_codes: unsupported,
      },
    };
  }

  /**
   * List supported controller targets with their descriptive notes.
   */
  listControllers(): Array<{ target: ControllerTarget; notes: string[] }> {
    return (Object.keys(PROFILES) as ControllerTarget[]).map(target => ({
      target,
      notes: PROFILES[target].notes,
    }));
  }

  /**
   * Quick compatibility check — returns only a pass/fail + error count.
   */
  quickCheck(gcode: string, target: ControllerTarget): { compatible: boolean; errors: number; warnings: number } {
    const r = this.check(gcode, target);
    return {
      compatible: r.summary.compatible,
      errors: r.errors,
      warnings: r.warnings,
    };
  }

  /**
   * Check the same program against multiple controllers and report
   * best/worst fit.
   */
  rankControllers(gcode: string, targets?: ControllerTarget[]): Array<{
    target: ControllerTarget;
    errors: number;
    warnings: number;
    compatible: boolean;
  }> {
    const list = targets ?? (Object.keys(PROFILES) as ControllerTarget[]);
    const results = list.map(t => {
      const r = this.check(gcode, t);
      return {
        target: t,
        errors: r.errors,
        warnings: r.warnings,
        compatible: r.summary.compatible,
      };
    });
    // Sort: compatible first, then by fewest errors, then fewest warnings
    return results.sort((a, b) => {
      if (a.compatible !== b.compatible) return a.compatible ? -1 : 1;
      if (a.errors !== b.errors) return a.errors - b.errors;
      return a.warnings - b.warnings;
    });
  }

  // ── Private helpers ──────────────────────────────────────────────

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r.trim();
  }

  private formatCode(value: number): string {
    if (Number.isInteger(value)) return value.toString();
    return value.toString();
  }
}

export const ppControllerCompatibilityEngine = new PPControllerCompatibilityEngine();
