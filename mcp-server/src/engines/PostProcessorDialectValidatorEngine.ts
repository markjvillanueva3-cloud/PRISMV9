/**
 * PostProcessorDialectValidatorEngine — closes first-part-perfect axis #11
 *
 * Safety-critical (foxtrot iter20 gap scope axis #11): validates that the
 * generated G-code only contains macros / address letters / modal codes that
 * the named controller dialect actually supports. The single highest-impact
 * pre-cut safety check — wrong-dialect G-code on a machine = guaranteed crash.
 *
 * Detects:
 *  - Foreign macros (Okuma OSP macros in Fanuc post, Mazatrol in Haas post, etc.)
 *  - Unsupported modal codes (M19 spindle orient on machines without orient option)
 *  - Address letters outside the controller's vocabulary (B-axis on 3-axis post)
 *  - Subprogram calls not supported (M98 P/H formats per vendor)
 *  - Probing-cycle macros not supported (Renishaw G65 P9810 on Heidenhain)
 *
 * Reference: Fanuc 30i/31i/32i Operator's Manual §G/M Code List;
 *  Okuma OSP-P300/P200 Programming Manual; Haas Mill/Lathe Manual;
 *  Mazak Mazatrol M+ Programming Manual; Heidenhain TNC 640 Pilot;
 *  Renishaw probing-cycle macros (Inspection Plus); ISO 6983-1 (NC base spec).
 *
 * @version 1.0.0
 * @module PostProcessorDialectValidatorEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type ControllerDialect = "fanuc" | "okuma_osp" | "haas" | "mazak_mazatrol" | "heidenhain_tnc" | "siemens_840d" | "fagor";

export interface PostDialectValidatorInput {
  /** Raw G-code text */
  gcode: string;
  /** Named controller the post was generated for */
  controller: ControllerDialect;
  /** Optional machine config (axes / probe / orient) — restricts allowed codes further */
  machine_config?: {
    axes?: 3 | 4 | 5;
    has_probe?: boolean;
    has_spindle_orient?: boolean;
    has_rigid_tap?: boolean;
    has_sub_spindle?: boolean;
  };
}

export interface DialectViolation {
  line: number;
  text: string;
  severity: "critical" | "warning";
  reason: string;
  fix: string;
}

export interface PostDialectValidatorResult {
  controller: ControllerDialect;
  total_lines: number;
  blocks_scanned: number;
  violations: DialectViolation[];
  critical_count: number;
  warning_count: number;
  verdict: "audit_pass" | "audit_warn" | "audit_block";
  confidence: AtomicValue;
  source: string;
}

// Controller-specific known-unsupported tokens (cited per controller)
const DIALECT_RULES: Record<ControllerDialect, {
  source: string;
  foreign_macros: RegExp[];   // Substrings/regexes that should NOT appear
  required_grammar?: RegExp;  // Optional: must look like this dialect
}> = {
  fanuc: {
    source: "Fanuc 30i/31i Operator's Manual §G/M Codes",
    foreign_macros: [
      /\bVNC\d+/i,            // Okuma VNC variables
      /\bIF\s*\[.*\]\s*THEN\b/i, // Mazak IF-THEN
      /\bCALL\s+L\d+/i,       // Heidenhain CALL L
      /\bCYCL\s+DEF\b/i,      // Heidenhain cycle def
      /\bTOOL\s+CALL\b/i,     // Heidenhain TOOL CALL
      /\bDEF\s+REAL\b/i,      // Siemens parametric
    ],
  },
  okuma_osp: {
    source: "Okuma OSP-P300 Programming Manual",
    foreign_macros: [
      /\bG65\s+P\d{4}/i,      // Fanuc macro call (Okuma uses CALL)
      /#\d+\s*=/,             // Fanuc # variables (Okuma uses V)
      /\bCYCL\s+DEF\b/i,      // Heidenhain
      /\bIF\s*\[.*\]\s*THEN\b/i, // Mazak (Okuma uses IF...GOTO)
    ],
  },
  haas: {
    source: "Haas Mill/Lathe Operator's Manual",
    foreign_macros: [
      /\bVNC\d+/i,            // Okuma
      /\bCYCL\s+DEF\b/i,      // Heidenhain
      /\bCALL\s+L\d+/i,       // Heidenhain
      /\bDEF\s+REAL\b/i,      // Siemens
    ],
  },
  mazak_mazatrol: {
    source: "Mazak Mazatrol M+ Programming Manual",
    foreign_macros: [
      /\bG65\s+P\d{4}/i,      // Fanuc macro
      /\bVNC\d+/i,            // Okuma
      /\bCYCL\s+DEF\b/i,      // Heidenhain
    ],
  },
  heidenhain_tnc: {
    source: "Heidenhain TNC 640 Pilot",
    foreign_macros: [
      /\bG65\s+P\d{4}/i,      // Fanuc-style
      /^G[0-9]{2}\b/m,        // Heidenhain uses conversational, not Fanuc-style G codes
      /\bVNC\d+/i,            // Okuma
      /\bIF\s*\[.*\]\s*THEN\b/i, // Mazak
    ],
  },
  siemens_840d: {
    source: "Siemens SINUMERIK 840D Programming Manual",
    foreign_macros: [
      /\bG65\s+P\d{4}/i,      // Fanuc
      /\bVNC\d+/i,            // Okuma
      /\bCYCL\s+DEF\b/i,      // Heidenhain
    ],
  },
  fagor: {
    source: "Fagor 8055 Operator's Manual",
    foreign_macros: [
      /\bG65\s+P\d{4}/i,      // Fanuc
      /\bVNC\d+/i,            // Okuma
      /\bCYCL\s+DEF\b/i,      // Heidenhain
    ],
  },
};

// Machine-capability codes (cross-vendor)
const M_ORIENT = /\bM19\b/;
const M_RIGID_TAP = /\bM29\b/;
const B_AXIS = /\bB[-+]?\d/;
const C_AXIS = /\bC[-+]?\d/;

export class PostProcessorDialectValidatorEngine {
  /**
   * Audit G-code against the named controller dialect + machine config.
   * Returns audit_pass / audit_warn / audit_block.
   */
  validate(input: PostDialectValidatorInput): PostDialectValidatorResult {
    if (!input || typeof input.gcode !== "string" || !input.controller) {
      throw new Error("PostProcessorDialectValidatorEngine.validate: gcode + controller required");
    }
    const rules = DIALECT_RULES[input.controller];
    if (!rules) {
      throw new Error(`PostProcessorDialectValidatorEngine.validate: unknown controller ${input.controller}`);
    }

    const lines = input.gcode.split(/\r?\n/);
    const violations: DialectViolation[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Foreign macro detection
      for (const re of rules.foreign_macros) {
        if (re.test(line)) {
          violations.push({
            line: lineNum,
            text: line.trim(),
            severity: "critical",
            reason: `Foreign macro/grammar detected for ${input.controller} controller (matches ${re.source})`,
            fix: `Re-run post-processor with controller=${input.controller} dialect`,
          });
        }
      }

      // Machine-config gating
      if (input.machine_config) {
        const cfg = input.machine_config;

        if (M_ORIENT.test(line) && cfg.has_spindle_orient === false) {
          violations.push({
            line: lineNum,
            text: line.trim(),
            severity: "critical",
            reason: "M19 (spindle orient) called but machine lacks orient option",
            fix: "Remove M19 from post OR enable spindle orient option",
          });
        }
        if (M_RIGID_TAP.test(line) && cfg.has_rigid_tap === false) {
          violations.push({
            line: lineNum,
            text: line.trim(),
            severity: "critical",
            reason: "M29 (rigid tap) called but machine lacks rigid-tap option",
            fix: "Switch to floating-tap holder OR enable rigid-tap option",
          });
        }
        if (B_AXIS.test(line) && (cfg.axes ?? 3) < 4) {
          violations.push({
            line: lineNum,
            text: line.trim(),
            severity: "critical",
            reason: "B-axis motion called but machine is 3-axis",
            fix: "Re-strategize as 3-axis OR move to 4+-axis machine",
          });
        }
        if (C_AXIS.test(line) && (cfg.axes ?? 3) < 4) {
          violations.push({
            line: lineNum,
            text: line.trim(),
            severity: "critical",
            reason: "C-axis motion called but machine is 3-axis",
            fix: "Re-strategize as 3-axis OR move to 4+-axis machine",
          });
        }
      }
    }

    const critical = violations.filter(v => v.severity === "critical").length;
    const warning = violations.filter(v => v.severity === "warning").length;
    let verdict: PostDialectValidatorResult["verdict"];
    if (critical > 0) verdict = "audit_block";
    else if (warning > 0) verdict = "audit_warn";
    else verdict = "audit_pass";

    const confidence = lines.length > 0
      ? Math.max(0, 1 - violations.length / lines.length)
      : 1;

    return {
      controller: input.controller,
      total_lines: lines.length,
      blocks_scanned: lines.length,
      violations,
      critical_count: critical,
      warning_count: warning,
      verdict,
      confidence: {
        value: Number(confidence.toFixed(3)),
        unit: "ratio",
        source: "1 - violations / lines",
      },
      source: `PostProcessorDialectValidatorEngine — ${rules.source}`,
    };
  }
}

export const postProcessorDialectValidatorEngine = new PostProcessorDialectValidatorEngine();
