/**
 * PPFeedRateReasonabilityValidatorEngine — Validate F-word value sanity
 *
 * Post-processors occasionally emit F-words with values that the
 * controller technically accepts but which are bugs:
 *   - F0 from a CAM post where the feed calc chose a variable that
 *     was never initialised. First G1 alarms PS0011.
 *   - F-500 from a signed-math bug in the post. Some older controls
 *     take absolute value, newer ones alarm.
 *   - F90000 from a unit-conversion typo (in/min as mm/min).
 *   - F on a G0 rapid block. Controller ignores it but the programmer
 *     may think the feed is being respected.
 *   - Integer F (F100) on a machine whose integer interpretation is
 *     wrong for the current units — some Fanucs interpret F100 in
 *     inches as 0.0100 in/min (wants F100.).
 *
 * This engine validates VALUE reasonableness. Modal-state checks
 * (G93/G94/G95 transitions) stay in PPFeedModeValidatorEngine.
 *
 * Checks:
 *   - f_zero_value (error): F0 on any line. Always a bug; controller
 *     rejects on first cutting motion.
 *   - f_negative (error): F with negative sign. Rare but catastrophic
 *     where controller takes absolute value silently.
 *   - f_with_rapid (info): F-word on G0-only block. Controller
 *     ignores, operator may not realize.
 *   - f_above_max (info): F > max_feed (default 20000 mm/min) —
 *     unit-conversion typo symptom.
 *   - f_below_min_cutting (info): F < min_cutting_feed (default
 *     0.5 mm/min) on G1/G2/G3 block — usually an inches/metric mix
 *     or a zero-diameter division-by.
 *   - f_integer_in_decimal_machine (info, opt-in): integer F like
 *     F100 (not F100.) — on Fanucs with calculator-format parameters
 *     disabled, interpreted as 0.0100.
 *   - f_changed_mid_cut (info): F changes within a sequence of
 *     non-rapid cutting moves more than max_f_changes_per_section
 *     times (default 5) — signals choppy CAM feed logic.
 *
 * Scope — distinct from:
 *   - PPFeedModeValidatorEngine: G93/G94/G95 modal transitions.
 *   - PPFeedOverrideValidatorEngine: feed override percent bounds.
 *   - PPFeedSpeedScalerEngine: intentional scaling transforms,
 *     not value-sanity validation.
 *
 * @module PPFeedRateReasonabilityValidatorEngine
 */

export type FeedSeverity = "error" | "warning" | "info";

export type FeedIssueKind =
  | "f_zero_value"
  | "f_negative"
  | "f_with_rapid"
  | "f_above_max"
  | "f_below_min_cutting"
  | "f_integer_in_decimal_machine"
  | "f_changed_mid_cut";

export interface FeedIssue {
  kind: FeedIssueKind;
  severity: FeedSeverity;
  line: number;
  f_value?: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface FeedValidationOptions {
  check_zero?: boolean;
  check_negative?: boolean;
  check_f_with_rapid?: boolean;
  check_above_max?: boolean;
  check_below_min?: boolean;
  check_integer_format?: boolean;
  check_frequent_changes?: boolean;
  max_feed?: number;
  min_cutting_feed?: number;
  max_f_changes_per_section?: number;
}

export interface FeedValidationResult {
  summary: {
    valid: boolean;
    total_issues: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    f_values_seen: number;
    min_f: number | null;
    max_f: number | null;
  };
  issues: FeedIssue[];
  total_issues: number;
}

const DEFAULT_OPTIONS: Required<FeedValidationOptions> = {
  check_zero: true,
  check_negative: true,
  check_f_with_rapid: true,
  check_above_max: true,
  check_below_min: true,
  check_integer_format: false,
  check_frequent_changes: false,
  max_feed: 20000,
  min_cutting_feed: 0.5,
  max_f_changes_per_section: 5,
};

export class PPFeedRateReasonabilityValidatorEngine {
  validate(
    code: string,
    opts: FeedValidationOptions = {},
  ): FeedValidationResult {
    const options: Required<FeedValidationOptions> = {
      ...DEFAULT_OPTIONS,
      ...opts,
    } as Required<FeedValidationOptions>;
    const issues: FeedIssue[] = [];
    const lines = code.split(/\r?\n/);

    const fValues: number[] = [];
    let activeMotionG: number | null = null;
    let cuttingSectionFChanges = 0;
    let lastCuttingF: number | null = null;
    let inCuttingSection = false;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const cleaned = this.stripComments(raw).trim();
      if (cleaned === "") continue;
      if (cleaned === "%") continue;

      // Extract G-motion in this block (updates active)
      const gMatch = cleaned.match(/\bG0*([0-3])(?!\d)/);
      if (gMatch) {
        activeMotionG = parseInt(gMatch[1], 10);
      }

      // Reset cutting section on G0 rapid even when no F-word present
      if (activeMotionG === 0) {
        inCuttingSection = false;
        cuttingSectionFChanges = 0;
        lastCuttingF = null;
      }

      // Extract F-word: allow trailing decimal (F100.) and embedded (F100.5)
      const fMatch = cleaned.match(/\bF(-?(?:\d+\.?\d*|\.\d+))/);
      if (!fMatch) {
        continue;
      }

      const fRaw = fMatch[1];
      const fVal = parseFloat(fRaw);
      const hasDecimal = fRaw.includes(".");
      fValues.push(fVal);

      if (options.check_zero && fVal === 0) {
        issues.push({
          kind: "f_zero_value",
          severity: "error",
          line: i + 1,
          f_value: 0,
          message: `F0 is not a legal cutting feed — controller will alarm on first G1`,
        });
      }

      if (options.check_negative && fVal < 0) {
        issues.push({
          kind: "f_negative",
          severity: "error",
          line: i + 1,
          f_value: fVal,
          message: `Negative feed rate F${fVal} — controller behavior undefined`,
        });
      }

      if (options.check_f_with_rapid && activeMotionG === 0) {
        issues.push({
          kind: "f_with_rapid",
          severity: "info",
          line: i + 1,
          f_value: fVal,
          message: `F${fVal} on G0 rapid block — ignored by controller`,
        });
      }

      if (options.check_above_max && fVal > options.max_feed) {
        issues.push({
          kind: "f_above_max",
          severity: "info",
          line: i + 1,
          f_value: fVal,
          message: `F${fVal} exceeds reasonable max feed ${options.max_feed} — unit-conversion typo?`,
          details: { max_feed: options.max_feed },
        });
      }

      if (
        options.check_below_min &&
        fVal > 0 &&
        fVal < options.min_cutting_feed &&
        activeMotionG !== null &&
        activeMotionG >= 1 &&
        activeMotionG <= 3
      ) {
        issues.push({
          kind: "f_below_min_cutting",
          severity: "info",
          line: i + 1,
          f_value: fVal,
          message: `F${fVal} below min cutting feed ${options.min_cutting_feed} on G${activeMotionG}`,
          details: { min_cutting_feed: options.min_cutting_feed },
        });
      }

      if (
        options.check_integer_format &&
        !hasDecimal &&
        fVal !== 0 &&
        Number.isInteger(fVal)
      ) {
        issues.push({
          kind: "f_integer_in_decimal_machine",
          severity: "info",
          line: i + 1,
          f_value: fVal,
          message: `F${fRaw} lacks decimal point — older Fanucs may interpret as F${(fVal / 10000).toFixed(4)}`,
        });
      }

      // Frequent-change tracking (only in cutting sections)
      if (activeMotionG !== null && activeMotionG >= 1 && activeMotionG <= 3) {
        if (!inCuttingSection) {
          inCuttingSection = true;
          cuttingSectionFChanges = 0;
          lastCuttingF = fVal;
        } else if (lastCuttingF !== null && fVal !== lastCuttingF) {
          cuttingSectionFChanges++;
          lastCuttingF = fVal;
          if (
            options.check_frequent_changes &&
            cuttingSectionFChanges > options.max_f_changes_per_section
          ) {
            issues.push({
              kind: "f_changed_mid_cut",
              severity: "info",
              line: i + 1,
              f_value: fVal,
              message: `Feed changed ${cuttingSectionFChanges} times in this cutting section (threshold ${options.max_f_changes_per_section})`,
              details: { change_count: cuttingSectionFChanges },
            });
          }
        }
      }
    }

    const error_count = issues.filter((i) => i.severity === "error").length;
    const warning_count = issues.filter((i) => i.severity === "warning").length;
    const info_count = issues.filter((i) => i.severity === "info").length;

    return {
      summary: {
        valid: error_count === 0,
        total_issues: issues.length,
        error_count,
        warning_count,
        info_count,
        f_values_seen: fValues.length,
        min_f: fValues.length > 0 ? Math.min(...fValues) : null,
        max_f: fValues.length > 0 ? Math.max(...fValues) : null,
      },
      issues,
      total_issues: issues.length,
    };
  }

  quickCheck(code: string): {
    valid: boolean;
    f_count: number;
    min_f: number | null;
    max_f: number | null;
  } {
    const r = this.validate(code);
    return {
      valid: r.summary.valid,
      f_count: r.summary.f_values_seen,
      min_f: r.summary.min_f,
      max_f: r.summary.max_f,
    };
  }

  defaultOptions(): Required<FeedValidationOptions> {
    return { ...DEFAULT_OPTIONS };
  }

  private stripComments(line: string): string {
    return line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "");
  }
}

export const ppFeedRateReasonabilityValidatorEngine =
  new PPFeedRateReasonabilityValidatorEngine();
