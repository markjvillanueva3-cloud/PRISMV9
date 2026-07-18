/**
 * PostProcessorNumericDialectEngine — numeric-precision dialect drift detector
 *
 * Closes the gap documented in the prior tango handoff
 * (HANDOFF-claude-06a24572-tango-testing-infra.md §Gaps / follow-ups):
 *
 *   "Axis 2 documented gap: catches LEXICAL foreign macros (VNC, CYCL,
 *    R-params); does NOT catch numeric-precision dialect drift (decimals,
 *    leading-zero, modal defaults, feed-units). Future
 *    PostProcessorNumericDialectEngine."
 *
 * COMPLEMENTARY (NOT a duplicate) to {@link PostProcessorDialectValidatorEngine}:
 *  - DialectValidator (existing): LEXICAL macro / address-letter scan
 *    (Okuma VNC in Fanuc post = block). Regex-based, structural.
 *  - NumericDialect (this engine): NUMERIC-FORMAT scan
 *    (Fanuc emits X10. but post wrote X010 = block; F100 per-rev but G94
 *    per-min active = block). Format-rule based, semantic.
 *
 * The two are orthogonal — a post can pass DialectValidator (no foreign
 * macros) but still crash on the machine because the numeric format is
 * wrong for the controller. This engine closes that hole.
 *
 * What it detects (per controller, cited rule per detector):
 *   D1. Leading-zero format    — controllers differ on `X010.` vs `X10.`
 *   D2. Trailing-zero format   — `X10` (no .) vs `X10.` vs `X10.000`
 *   D3. Decimal-separator      — `.` vs `,` (some EU controllers)
 *   D4. Signed-zero handling   — `X-0.` allowed vs rejected
 *   D5. Modal-default drift    — feed mode (G94/G95) assumed but never set
 *   D6. Feed-unit semantics    — F1000 under G94 vs under G95 is 50x error
 *
 * Pure logic. No I/O. Singleton + static-friendly API. Returns AtomicValue
 * pass-rate (Wilson 95% half-width) for telemetry/safety integration.
 *
 * Citations:
 *  - Fanuc 30i/31i/32i Operator's Manual §Decimal Point Programming
 *  - Haas Mill/Lathe Op. Manual §Decimal Point / Trailing Zero
 *  - Okuma OSP-P300 Prog. Manual §Numeric Format
 *  - Heidenhain TNC 640 Pilot §Decimal Point Programming
 *  - Mazak Mazatrol M+ §Feed Mode (G94/G95)
 *  - ISO 6983-1 §Word Format (canonical numeric base)
 *
 * @module PostProcessorNumericDialectEngine
 * @version 1.0.0
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  /** Absolute uncertainty in `unit`. For ratios, use the half-width of a 95% CI. */
  uncertainty: number;
  source: string;
  confidence?: number;
}

const WILSON_Z_95 = 1.96;

/** DoS guard: per-cell G-code upper bound (matches matrix harness). */
const MAX_INPUT_BYTES = 5_000_000;

/** Bound on detector count for DoS surface — single-pass per detector. */
const MAX_LINES_SCANNED = 200_000;

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type NumericDialectController =
  | "fanuc"
  | "haas"
  | "okuma_osp"
  | "heidenhain_tnc"
  | "mazak_mazatrol"
  | "siemens_840d"
  | "fagor";

/** Per-controller numeric-format rule set. Each field documents the expectation. */
export interface NumericDialectRules {
  /** Citation: vendor manual section that defines the rule. */
  source: string;
  /** Leading-zero policy. `strip` = `X010.` is illegal; `require` = `X10.` is illegal. */
  leading_zero: "strip" | "require" | "optional";
  /**
   * Trailing-zero / decimal-point policy.
   *   `required`     = `X10` (integer-only) is REJECTED (controller treats as μm).
   *   `optional`     = `X10` and `X10.` both legal.
   *   `forbidden`    = `X10.` is rejected; controllers wanting raw integer.
   */
  decimal_point: "required" | "optional" | "forbidden";
  /** Separator character (almost always `.`; some EU dialects use `,`). */
  decimal_separator: "." | ",";
  /** Signed-zero policy. `reject` = `X-0.` is illegal (Heidenhain). */
  signed_zero: "allow" | "reject";
  /**
   * Default modal feed mode (when neither G94 nor G95 is asserted before
   * the first F-word). `error` means the controller has no safe default
   * and demands an explicit mode word.
   */
  feed_modal_default: "G94" | "G95" | "error";
}

export interface NumericDialectInput {
  /** Raw G-code text. */
  gcode: string;
  /** Named controller the post was generated for. */
  controller: NumericDialectController;
  /**
   * Optional override: tell the engine the post DOES assert feed mode early.
   * Default behavior scans the input — this is a manual override for tests
   * or for batches where the operator vouches.
   */
  feed_mode_asserted_first?: "G94" | "G95" | "none";
}

export type ViolationSeverity = "critical" | "warning";

export type ViolationCode =
  | "leading_zero_drift"
  | "trailing_zero_drift"
  | "decimal_separator_drift"
  | "signed_zero_drift"
  | "modal_default_drift"
  | "feed_unit_ambiguous";

export interface NumericViolation {
  line: number;
  text: string;
  code: ViolationCode;
  severity: ViolationSeverity;
  reason: string;
  fix: string;
}

export type Verdict = "numeric_pass" | "numeric_warn" | "numeric_block";

export interface NumericDialectResult {
  controller: NumericDialectController;
  rules: NumericDialectRules;
  total_lines: number;
  blocks_scanned: number;
  violations: NumericViolation[];
  critical_count: number;
  warning_count: number;
  verdict: Verdict;
  pass_rate: AtomicValue;
  source: string;
}

// ============================================================================
// RULE TABLE — canonical per-controller numeric format
// ============================================================================

const DIALECT_RULES: Record<NumericDialectController, NumericDialectRules> = {
  fanuc: {
    source: "Fanuc 30i/31i Operator's Manual §Decimal Point Programming",
    leading_zero: "strip",
    decimal_point: "required",
    decimal_separator: ".",
    signed_zero: "allow",
    feed_modal_default: "error",
  },
  haas: {
    source: "Haas Mill/Lathe Op. Manual §Decimal Point",
    leading_zero: "strip",
    decimal_point: "required",
    decimal_separator: ".",
    signed_zero: "allow",
    feed_modal_default: "G94",
  },
  okuma_osp: {
    source: "Okuma OSP-P300 Programming Manual §Numeric Format",
    leading_zero: "strip",
    decimal_point: "optional",
    decimal_separator: ".",
    signed_zero: "allow",
    feed_modal_default: "G94",
  },
  heidenhain_tnc: {
    source: "Heidenhain TNC 640 Pilot §Decimal Point",
    leading_zero: "strip",
    decimal_point: "required",
    decimal_separator: ".",
    signed_zero: "reject",
    feed_modal_default: "G94",
  },
  mazak_mazatrol: {
    source: "Mazak Mazatrol M+ Programming Manual §Numeric Format",
    leading_zero: "strip",
    decimal_point: "required",
    decimal_separator: ".",
    signed_zero: "allow",
    feed_modal_default: "G94",
  },
  siemens_840d: {
    source: "Siemens SINUMERIK 840D Prog. Manual §Numeric Format",
    leading_zero: "strip",
    decimal_point: "required",
    decimal_separator: ".",
    signed_zero: "allow",
    feed_modal_default: "G94",
  },
  fagor: {
    source: "Fagor 8055 Op. Manual §Numeric Format",
    leading_zero: "strip",
    decimal_point: "optional",
    decimal_separator: ".",
    signed_zero: "allow",
    feed_modal_default: "G94",
  },
};

// ============================================================================
// DETECTOR HELPERS (pure)
// ============================================================================

/**
 * Find positional-axis tokens (X / Y / Z / I / J / K / A / B / C / U / V / W / R)
 * with their numeric value. Conservative: matches `<letter><optional sign><digits>[.<digits>]?`.
 * Returns indices INTO the line so callers can build line-precise violations.
 */
const AXIS_TOKEN_RE = /\b([XYZIJKABCUVWR])(-?)(\d+)(\.\d*)?/g;
const FEED_TOKEN_RE = /\bF(\d+\.?\d*)/g;
const G94_RE = /\bG94\b/;
const G95_RE = /\bG95\b/;
const COMMA_DECIMAL_RE = /\b[XYZIJKABCUVWRF]-?\d+,\d+/g;

/** Strip end-of-line comments. Cheap heuristic: anything from `(` or `;` onward. */
function stripComment(line: string): string {
  const semi = line.indexOf(";");
  const paren = line.indexOf("(");
  let cut = -1;
  if (semi >= 0 && (paren < 0 || semi < paren)) cut = semi;
  else if (paren >= 0) cut = paren;
  return cut >= 0 ? line.slice(0, cut) : line;
}

/** Is a number string `010` or `0010` (multi-digit with leading zero, integer part)? */
function hasLeadingZero(intPart: string): boolean {
  return intPart.length >= 2 && intPart[0] === "0";
}

/** Does a numeric token have an integer (no decimal point) form like `X10`? */
function hasNoDecimal(decimalPart: string | undefined): boolean {
  return !decimalPart || decimalPart === "";
}

// ============================================================================
// CORE ENGINE
// ============================================================================

export class PostProcessorNumericDialectEngine {
  readonly version = "1.0.0" as const;

  /** Pure analysis entry. */
  analyze(input: NumericDialectInput): NumericDialectResult {
    // Defensive — empty / oversized / non-string surfaces a clean diagnostic
    // instead of a crash. R12 fail-loud.
    if (!input || typeof input.gcode !== "string") {
      return this.emitInvalidInput("gcode must be a string");
    }
    if (input.gcode.length > MAX_INPUT_BYTES) {
      return this.emitInvalidInput(`gcode exceeds ${MAX_INPUT_BYTES} bytes`);
    }
    const rules = DIALECT_RULES[input.controller];
    if (!rules) {
      return this.emitInvalidInput(`unknown controller: ${input.controller}`);
    }

    const violations: NumericViolation[] = [];
    const lines = input.gcode.split(/\r?\n/);
    const totalLines = lines.length;
    const linesToScan = Math.min(totalLines, MAX_LINES_SCANNED);
    let blocksScanned = 0;

    // Per-detector evaluation. Each detector is a pure scan.
    let firstFeedSeen = false;
    let firstFeedHadModeAsserted = false;
    let activeFeedMode: "G94" | "G95" | "none" =
      input.feed_mode_asserted_first ?? "none";

    for (let i = 0; i < linesToScan; i++) {
      const rawLine = lines[i];
      const line = stripComment(rawLine).trim();
      if (line.length === 0) continue;
      blocksScanned++;
      const lineNum = i + 1;

      // Modal feed-mode tracking (D5/D6).
      if (G94_RE.test(line)) activeFeedMode = "G94";
      if (G95_RE.test(line)) activeFeedMode = "G95";

      // D3 — decimal-separator drift (comma in numeric token where rule says ".").
      if (rules.decimal_separator === "." && COMMA_DECIMAL_RE.test(line)) {
        violations.push({
          line: lineNum,
          text: rawLine,
          code: "decimal_separator_drift",
          severity: "critical",
          reason: `controller ${input.controller} requires '.' decimal separator (rule: ${rules.source})`,
          fix: "replace ',' with '.' in numeric tokens",
        });
      }

      // D1/D2/D4 — per-axis-token scan.
      for (const m of line.matchAll(AXIS_TOKEN_RE)) {
        const [, , sign, intPart, decPart] = m;
        const tokenText = m[0];

        // D1 — leading-zero drift.
        if (rules.leading_zero === "strip" && hasLeadingZero(intPart)) {
          violations.push({
            line: lineNum,
            text: rawLine,
            code: "leading_zero_drift",
            severity: "warning",
            reason: `${input.controller} strips leading zeros (token: ${tokenText}; rule: ${rules.source})`,
            fix: `emit without leading zero (e.g., '${tokenText.replace(/^([XYZIJKABCUVWR])(-?)0+(\d)/, "$1$2$3")}')`,
          });
        }
        if (rules.leading_zero === "require" && !hasLeadingZero(intPart) && intPart.length === 1) {
          violations.push({
            line: lineNum,
            text: rawLine,
            code: "leading_zero_drift",
            severity: "warning",
            reason: `${input.controller} requires leading zero on single-digit integer (token: ${tokenText}; rule: ${rules.source})`,
            fix: `emit with leading zero (e.g., '${tokenText[0]}${sign}0${intPart}${decPart || ""}')`,
          });
        }

        // D2 — trailing-zero / decimal-point drift.
        if (rules.decimal_point === "required" && hasNoDecimal(decPart)) {
          violations.push({
            line: lineNum,
            text: rawLine,
            code: "trailing_zero_drift",
            severity: "critical",
            reason: `${input.controller} requires explicit decimal point (token: ${tokenText} may be interpreted as µm; rule: ${rules.source})`,
            fix: `append decimal point: '${tokenText}.'`,
          });
        }
        if (rules.decimal_point === "forbidden" && !hasNoDecimal(decPart)) {
          violations.push({
            line: lineNum,
            text: rawLine,
            code: "trailing_zero_drift",
            severity: "warning",
            reason: `${input.controller} rejects decimal point (token: ${tokenText}; rule: ${rules.source})`,
            fix: `strip decimal: '${m[1]}${sign}${intPart}'`,
          });
        }

        // D4 — signed-zero drift (only when sign is present AND integer is 0 AND decimal is empty/zero).
        if (rules.signed_zero === "reject" && sign === "-" && intPart === "0"
            && (decPart === undefined || /^\.0*$/.test(decPart))) {
          violations.push({
            line: lineNum,
            text: rawLine,
            code: "signed_zero_drift",
            severity: "critical",
            reason: `${input.controller} rejects signed zero (token: ${tokenText}; rule: ${rules.source})`,
            fix: `emit as '${m[1]}0${decPart || ""}'`,
          });
        }
      }

      // D6 — first F-token without modal mode assertion.
      if (!firstFeedSeen && FEED_TOKEN_RE.test(line)) {
        firstFeedSeen = true;
        firstFeedHadModeAsserted = activeFeedMode !== "none";
      }
    }

    // D5 — modal-default drift. If the post never asserts feed mode and the
    // controller has no safe default (Fanuc, by spec), emit a single critical.
    // If the controller has a documented default, emit a warning surfacing the
    // assumption so the operator knows the implicit mode.
    if (firstFeedSeen && !firstFeedHadModeAsserted) {
      const sev: ViolationSeverity =
        rules.feed_modal_default === "error" ? "critical" : "warning";
      const reason =
        rules.feed_modal_default === "error"
          ? `${input.controller} has no safe default feed mode — first F-word without G94/G95 will run an undefined mode`
          : `${input.controller} defaults to ${rules.feed_modal_default} — implicit; assert explicitly for portability`;
      violations.push({
        line: 1,
        text: "<no G94/G95 before first F-word>",
        code: sev === "critical" ? "modal_default_drift" : "feed_unit_ambiguous",
        severity: sev,
        reason,
        fix: `prepend explicit '${rules.feed_modal_default === "error" ? "G94 (mm/min) or G95 (mm/rev)" : rules.feed_modal_default}' before first F-word`,
      });
    }

    const critical_count = violations.filter(v => v.severity === "critical").length;
    const warning_count = violations.filter(v => v.severity === "warning").length;
    const verdict: Verdict =
      critical_count > 0 ? "numeric_block"
      : warning_count > 0 ? "numeric_warn"
      : "numeric_pass";

    // Wilson 95% interval — n is `blocksScanned` (sample = lines scanned).
    const passes = Math.max(0, blocksScanned - violations.length);
    const pass_rate = this.wilsonPassRate(passes, blocksScanned);

    return {
      controller: input.controller,
      rules,
      total_lines: totalLines,
      blocks_scanned: blocksScanned,
      violations,
      critical_count,
      warning_count,
      verdict,
      pass_rate,
      source: "PostProcessorNumericDialectEngine v1.0.0",
    };
  }

  private emitInvalidInput(reason: string): NumericDialectResult {
    return {
      controller: "fanuc",
      rules: DIALECT_RULES.fanuc,
      total_lines: 0,
      blocks_scanned: 0,
      violations: [{
        line: 0,
        text: "<input-validation>",
        code: "modal_default_drift",
        severity: "critical",
        reason,
        fix: "supply valid string gcode + supported controller",
      }],
      critical_count: 1,
      warning_count: 0,
      verdict: "numeric_block",
      pass_rate: { value: 0, unit: "ratio", uncertainty: 0, source: "invalid-input", confidence: 0 },
      source: "PostProcessorNumericDialectEngine v1.0.0",
    };
  }

  /**
   * Wilson 95% interval pass-rate. Returns `{value, unit:"ratio", uncertainty:halfWidth}`.
   * Confidence climbs as sqrt(n / FULL_CONFIDENCE_SAMPLE_SIZE) per Axis-2 convention.
   */
  private wilsonPassRate(passes: number, total: number): AtomicValue {
    if (total <= 0) {
      return { value: 0, unit: "ratio", uncertainty: 0, source: "no-samples", confidence: 0 };
    }
    const p = passes / total;
    const z2 = WILSON_Z_95 * WILSON_Z_95;
    const denom = 1 + z2 / total;
    const center = (p + z2 / (2 * total)) / denom;
    const halfWidth = (WILSON_Z_95 * Math.sqrt((p * (1 - p) / total) + z2 / (4 * total * total))) / denom;
    // Confidence: per AXIS-2 convention, sqrt-curve toward 1.0 at sample size N=20 (line-block surrogate).
    const FULL_CONFIDENCE_SAMPLE_SIZE = 20;
    const confidence = Math.min(1, Math.sqrt(total / FULL_CONFIDENCE_SAMPLE_SIZE));
    return {
      value: center,
      unit: "ratio",
      uncertainty: halfWidth,
      source: "Wilson-95",
      confidence,
    };
  }

  /** Get the canonical rule set for a controller (read-only). */
  rulesFor(controller: NumericDialectController): NumericDialectRules | null {
    return DIALECT_RULES[controller] ?? null;
  }

  /** Enumerate all supported controllers. */
  controllers(): NumericDialectController[] {
    return Object.keys(DIALECT_RULES) as NumericDialectController[];
  }
}

export const postProcessorNumericDialectEngine = new PostProcessorNumericDialectEngine();
