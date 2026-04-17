/**
 * PPRedundantModalValidatorEngine — Detect redundant modal re-issuance
 *
 * Modal commands in G-code stay active until changed. Re-issuing the same
 * modal value across successive blocks is harmless on Fanuc/Haas but signals
 * a CAM post that isn't tracking state — and on some Mitsubishi/Siemens
 * controllers, spurious re-issuance throws alarm PS 010 or resets modal
 * group tracking in confusing ways. More importantly, for operators reading
 * a program, redundant re-issuance obscures the actual state changes.
 *
 * Common offenders:
 *   - `G90` ... `G90` with no intervening `G91` — distance mode stuck true
 *   - `G17` ... `G17` — plane select never left XY
 *   - `G54` ... `G54` — WCS not changed between ops
 *   - `F100.` ... `F100.` — same feed re-issued line after line
 *   - `S1000` ... `S1000` — same spindle speed re-asserted
 *   - `T1 ... T1` (no M6 between) — tool-preselect redundant
 *   - `M3` ... `M3` — spindle state re-commanded while already on
 *
 * Distinguish from legitimate re-issuance:
 *   - Reset block (safe-start): `G17 G20 G40 G49 G54 G80 G90` is a
 *     defensive init — always pass, never flag even if preceding block
 *     already had G90. Check via `check_safe_start_skip` (default true).
 *   - Post-M6 refresh: after tool change, some posts re-assert
 *     G54 / G90 / plane. Allow within `safe_start_window` blocks after M6.
 *
 * Checks:
 *   - redundant_modal_reissue (info): G/plane/distance/feed-mode/units
 *     modal repeated without being cancelled.
 *   - redundant_feed_same_value (info): F-word same as current modal feed.
 *   - redundant_spindle_speed (info): S-word same as current modal S.
 *   - redundant_tool_number (warning): T-word repeated with no M6 between.
 *   - redundant_m_code (info): M3/M4/M5/M7/M8/M9 same as current modal M.
 *
 * Scope — distinct from:
 *   - PPModalGroupConflictValidator: within-block conflicts (G0+G1).
 *   - PPDuplicateWordValidator: duplicate letter in ONE block (X5. X5.).
 *   - PPGCodeMinimizer: rewrites to remove redundancy (we only flag).
 *   - PPBlockCompositionValidator: structural per-block layout.
 *
 * @module PPRedundantModalValidatorEngine
 */

export type RMSeverity = "error" | "warning" | "info";

export type RMIssueKind =
  | "redundant_modal_reissue"
  | "redundant_feed_same_value"
  | "redundant_spindle_speed"
  | "redundant_tool_number"
  | "redundant_m_code";

export interface RMIssue {
  kind: RMIssueKind;
  severity: RMSeverity;
  line: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface RMOptions {
  check_gcode_modal?: boolean;
  check_feed?: boolean;
  check_spindle_speed?: boolean;
  check_tool_number?: boolean;
  check_mcode_modal?: boolean;
  check_safe_start_skip?: boolean;
  safe_start_window?: number; // blocks after M6 to allow re-assert
  min_repeats_to_report?: number; // flag on ≥ N consecutive same value (default 1)
}

export interface RMResult {
  summary: {
    valid: boolean;
    total_issues: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    gcode_reissues: number;
    feed_reissues: number;
    spindle_reissues: number;
    tool_reissues: number;
    mcode_reissues: number;
  };
  issues: RMIssue[];
  total_issues: number;
}

const DEFAULT_OPTIONS: Required<RMOptions> = {
  check_gcode_modal: true,
  check_feed: true,
  check_spindle_speed: true,
  check_tool_number: true,
  check_mcode_modal: true,
  check_safe_start_skip: true,
  safe_start_window: 2,
  min_repeats_to_report: 1,
};

// Modal groups we track (Fanuc convention)
// Plane: G17,G18,G19 | Distance: G90,G91 | Feed mode: G93,G94,G95
// Units: G20,G21 | Cutter comp: G40,G41,G42 | TLC: G43,G44,G49 | WCS: G54-59
//
// NOTE: motion group G0-G3 is deliberately NOT tracked. CAM posts almost
// universally re-write the motion word on every motion block — that's
// conventional, not redundant. Flagging it would produce 95% false
// positives and drown out the real signals.
const MODAL_GROUPS: Record<string, number[]> = {
  plane: [17, 18, 19],
  distance: [90, 91],
  feed_mode: [93, 94, 95],
  units: [20, 21],
  cutter_comp: [40, 41, 42],
  tlc: [43, 44, 49],
  wcs: [54, 55, 56, 57, 58, 59],
};

// M-code modal groups (only tracks ON/OFF state commands, not one-shot)
// Spindle: M3,M4,M5 | Coolant: M7,M8,M9 | Override: M48,M49
const MCODE_MODAL_GROUPS: Record<string, number[]> = {
  spindle: [3, 4, 5],
  coolant: [7, 8, 9],
  override: [48, 49],
};

export class PPRedundantModalValidatorEngine {
  validate(code: string, opts: RMOptions = {}): RMResult {
    const options: Required<RMOptions> = { ...DEFAULT_OPTIONS, ...opts };
    const issues: RMIssue[] = [];
    const lines = code.split(/\r?\n/);

    // Track current modal state
    const gModalState: Record<string, number | null> = {};
    for (const g of Object.keys(MODAL_GROUPS)) gModalState[g] = null;

    const mModalState: Record<string, number | null> = {};
    for (const g of Object.keys(MCODE_MODAL_GROUPS)) mModalState[g] = null;

    let modalFeed: number | null = null;
    let modalSpindleSpeed: number | null = null;
    let modalTool: number | null = null;
    let toolPendingChange = false;

    let blocksSinceM6 = 999; // pretend pre-program is way past the window

    let gcodeReissues = 0;
    let feedReissues = 0;
    let spindleReissues = 0;
    let toolReissues = 0;
    let mcodeReissues = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const stripped = this.stripComments(raw).trim();
      if (stripped === "" || stripped === "%") continue;

      blocksSinceM6++;

      // Detect safe-start reset block: has ≥3 distinct modal groups in one block
      const isSafeStart =
        options.check_safe_start_skip && this.isSafeStartBlock(stripped);
      const inWindow = blocksSinceM6 <= options.safe_start_window;

      // Gather all G-word values in block
      const gWords = Array.from(stripped.matchAll(/\bG(\d+(?:\.\d+)?)/g)).map(
        (m) => parseFloat(m[1]),
      );

      // Process each G modal group
      for (const [groupName, values] of Object.entries(MODAL_GROUPS)) {
        for (const gWord of gWords) {
          if (!values.includes(gWord)) continue;
          const prev = gModalState[groupName];
          if (prev === gWord && !isSafeStart && !inWindow) {
            if (options.check_gcode_modal) {
              issues.push({
                kind: "redundant_modal_reissue",
                severity: "info",
                line: i + 1,
                code: `G${gWord}`,
                message: `G${gWord} re-issued in '${groupName}' group — already active`,
                details: { group: groupName, value: gWord },
              });
              gcodeReissues++;
            }
          }
          gModalState[groupName] = gWord;
        }
      }

      // Feed word (F100. or F100)
      const fMatch = stripped.match(/\bF(\d+(?:\.\d+)?)/);
      if (fMatch) {
        const fVal = parseFloat(fMatch[1]);
        if (modalFeed !== null && fVal === modalFeed && !isSafeStart && !inWindow) {
          if (options.check_feed) {
            issues.push({
              kind: "redundant_feed_same_value",
              severity: "info",
              line: i + 1,
              code: `F${fVal}`,
              message: `F${fVal} re-issued — same as current modal feed`,
              details: { value: fVal },
            });
            feedReissues++;
          }
        }
        modalFeed = fVal;
      }

      // Spindle speed (S1000)
      const sMatch = stripped.match(/\bS(\d+(?:\.\d+)?)/);
      if (sMatch) {
        const sVal = parseFloat(sMatch[1]);
        if (
          modalSpindleSpeed !== null &&
          sVal === modalSpindleSpeed &&
          !isSafeStart &&
          !inWindow
        ) {
          if (options.check_spindle_speed) {
            issues.push({
              kind: "redundant_spindle_speed",
              severity: "info",
              line: i + 1,
              code: `S${sVal}`,
              message: `S${sVal} re-issued — same as current modal spindle speed`,
              details: { value: sVal },
            });
            spindleReissues++;
          }
        }
        modalSpindleSpeed = sVal;
      }

      // Tool number (T1) — flag re-issue when no M6 happened between
      const tMatch = stripped.match(/\bT(\d+)/);
      const hasM6 = /\bM0*6(?!\d)/.test(stripped);

      if (tMatch) {
        const tVal = parseInt(tMatch[1], 10);
        // Flag when same T-word repeated AND previous T never consumed by M6.
        // If M6 happened since last T, a re-preselect of the same T is fine.
        if (modalTool === tVal && toolPendingChange && !isSafeStart) {
          if (options.check_tool_number) {
            issues.push({
              kind: "redundant_tool_number",
              severity: "warning",
              line: i + 1,
              code: `T${tVal}`,
              message: `T${tVal} re-issued without intervening tool change (M6)`,
              details: { value: tVal },
            });
            toolReissues++;
          }
        }
        modalTool = tVal;
        toolPendingChange = !hasM6;
      }

      if (hasM6) {
        toolPendingChange = false;
        blocksSinceM6 = 0; // reset window on tool change
      }

      // M-code modal tracking
      const mWords = Array.from(stripped.matchAll(/\bM(\d+)/g)).map((m) =>
        parseInt(m[1], 10),
      );
      for (const [groupName, values] of Object.entries(MCODE_MODAL_GROUPS)) {
        for (const mWord of mWords) {
          if (!values.includes(mWord)) continue;
          const prev = mModalState[groupName];
          if (prev === mWord && !isSafeStart && !inWindow) {
            if (options.check_mcode_modal) {
              issues.push({
                kind: "redundant_m_code",
                severity: "info",
                line: i + 1,
                code: `M${mWord}`,
                message: `M${mWord} re-issued in '${groupName}' group — already active`,
                details: { group: groupName, value: mWord },
              });
              mcodeReissues++;
            }
          }
          mModalState[groupName] = mWord;
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
        gcode_reissues: gcodeReissues,
        feed_reissues: feedReissues,
        spindle_reissues: spindleReissues,
        tool_reissues: toolReissues,
        mcode_reissues: mcodeReissues,
      },
      issues,
      total_issues: issues.length,
    };
  }

  quickCheck(code: string): {
    valid: boolean;
    total_reissues: number;
    tool_reissues: number;
  } {
    const r = this.validate(code);
    return {
      valid: r.summary.valid,
      total_reissues:
        r.summary.gcode_reissues +
        r.summary.feed_reissues +
        r.summary.spindle_reissues +
        r.summary.tool_reissues +
        r.summary.mcode_reissues,
      tool_reissues: r.summary.tool_reissues,
    };
  }

  defaultOptions(): Required<RMOptions> {
    return { ...DEFAULT_OPTIONS };
  }

  /**
   * A "safe-start" reset block contains three or more distinct modal group
   * commands in one line — e.g., `G17 G20 G40 G49 G54 G80 G90`. These are
   * defensive program initializers and should never be flagged.
   */
  private isSafeStartBlock(line: string): boolean {
    const gWords = Array.from(line.matchAll(/\bG(\d+(?:\.\d+)?)/g)).map((m) =>
      parseFloat(m[1]),
    );
    if (gWords.length < 3) return false;
    const groupsTouched = new Set<string>();
    for (const g of gWords) {
      for (const [name, values] of Object.entries(MODAL_GROUPS)) {
        if (values.includes(g)) groupsTouched.add(name);
      }
    }
    return groupsTouched.size >= 3;
  }

  private stripComments(line: string): string {
    return line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "");
  }
}

export const ppRedundantModalValidatorEngine =
  new PPRedundantModalValidatorEngine();
