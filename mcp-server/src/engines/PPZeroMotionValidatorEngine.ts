/**
 * PPZeroMotionValidatorEngine — Detect no-op / zero-length motion blocks
 *
 * CAM posts occasionally emit motion blocks that resolve to zero movement.
 * The controller accepts them (no alarm) but they waste cycle time, bloat
 * the program, and sometimes mask a post-processor bug that's swallowing
 * a real coordinate delta.
 *
 * Classic failure modes:
 *   - G1 X10. F100. followed by another G1 X10. F100. — post flushed
 *     modal state twice. Controller dwells briefly on each block.
 *   - G0 X0. Y0. Z0. after a G0 X0. Y0. Z0. — retract block duplicated.
 *   - G1 F100. on its own line — feed-only block, no motion. Legal but
 *     most programmers do `G1 X... F100.` combined.
 *   - G2 X10. Y5. I0. J0. — arc with I=J=0 and the endpoint matches the
 *     start position: that's a full-circle request with zero radius.
 *
 * Checks:
 *   - zero_length_linear (info): G1 whose axis words match the modal
 *     position exactly. Harmless but wastes a block.
 *   - redundant_rapid (info): G0 block whose axis words match the modal
 *     position. Same issue as above, often from duplicate retracts.
 *   - motion_without_axis (warning): G0/G1/G2/G3 block with no X/Y/Z/
 *     A/B/C/U/V/W/I/J/K/R word at all (feed-only or mode-only block).
 *     Legal on most Fanucs but usually indicates post logic gone wrong.
 *   - duplicate_coord_sequence (info): N consecutive blocks emit the
 *     exact same axis-word set (default N = 3).
 *   - zero_length_arc_ijk (warning): G2/G3 whose X/Y endpoint equals
 *     the current position AND I/J/K are all zero — commands an
 *     infinite-radius or undefined arc. Most controls alarm PS0023
 *     but some older Fanucs accept it and the spindle hangs.
 *
 * Scope — distinct from:
 *   - PPArcValidatorEngine: catches start==end with no I/J/K or R,
 *     BUT not start==end with I=J=K=0 (which is zero-radius, not
 *     "no center"). We catch the I=J=K=0 variant explicitly.
 *   - PPModalStateTrackerEngine: tracks modal position but does not
 *     judge whether motion blocks are redundant.
 *   - PPBlockCompositionValidatorEngine: empty-block detection (no
 *     words at all) is different — we flag blocks WITH a G-word but
 *     without axis motion.
 *
 * @module PPZeroMotionValidatorEngine
 */

export type ZMVSeverity = "error" | "warning" | "info";

export type ZMVIssueKind =
  | "zero_length_linear"
  | "redundant_rapid"
  | "motion_without_axis"
  | "duplicate_coord_sequence"
  | "zero_length_arc_ijk";

export interface ZMVIssue {
  kind: ZMVIssueKind;
  severity: ZMVSeverity;
  line: number;
  g_code?: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface ZMVOptions {
  check_zero_length_linear?: boolean;
  check_redundant_rapid?: boolean;
  check_motion_without_axis?: boolean;
  check_duplicate_coord_sequence?: boolean;
  check_zero_length_arc_ijk?: boolean;
  duplicate_run_threshold?: number;
  position_tolerance?: number;
}

export interface ZMVResult {
  summary: {
    valid: boolean;
    total_issues: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    motion_block_count: number;
    zero_length_count: number;
  };
  issues: ZMVIssue[];
  total_issues: number;
}

const DEFAULT_OPTIONS: Required<ZMVOptions> = {
  check_zero_length_linear: true,
  check_redundant_rapid: true,
  check_motion_without_axis: true,
  check_duplicate_coord_sequence: true,
  check_zero_length_arc_ijk: true,
  duplicate_run_threshold: 3,
  position_tolerance: 1e-6,
};

const AXIS_LETTERS = new Set(["X", "Y", "Z", "A", "B", "C", "U", "V", "W"]);
const ARC_LETTERS = new Set(["I", "J", "K", "R"]);

export class PPZeroMotionValidatorEngine {
  validate(code: string, opts: ZMVOptions = {}): ZMVResult {
    const options: Required<ZMVOptions> = { ...DEFAULT_OPTIONS, ...opts };
    const issues: ZMVIssue[] = [];
    const lines = code.split(/\r?\n/);

    const modalPos: Record<string, number> = {};
    let activeG: number | null = null;
    let motionBlocks = 0;
    let zeroLengthCount = 0;

    let lastCoordKey: string | null = null;
    let dupRunCount = 0;
    let dupRunStartLine = 0;
    let dupReported = false;

    for (let i = 0; i < lines.length; i++) {
      const cleaned = this.stripComments(lines[i]).trim();
      if (cleaned === "" || cleaned === "%") continue;

      const gMatch = cleaned.match(/\bG0*([0-3])(?!\d)/);
      if (gMatch) {
        activeG = parseInt(gMatch[1], 10);
      }

      const axisWords = this.extractAxisWords(cleaned, AXIS_LETTERS);
      const arcWords = this.extractAxisWords(cleaned, ARC_LETTERS);
      const hasAxis = Object.keys(axisWords).length > 0;
      const hasArc = Object.keys(arcWords).length > 0;

      const blockHasMotion =
        activeG !== null && activeG >= 0 && activeG <= 3 && gMatch !== null;
      const blockIsMotion = activeG !== null && activeG >= 0 && activeG <= 3;

      // A block counts as a "motion block" only if it has motion-related
      // content: axis words, arc words, or a new G0-G3 command. Pure state
      // blocks (M30, M3 S1000) don't count even when modal G is set.
      if (!blockIsMotion || (!hasAxis && !hasArc && !gMatch)) {
        lastCoordKey = null;
        dupRunCount = 0;
        dupReported = false;
        continue;
      }

      motionBlocks++;

      // motion_without_axis
      if (
        options.check_motion_without_axis &&
        blockHasMotion &&
        !hasAxis &&
        !hasArc
      ) {
        issues.push({
          kind: "motion_without_axis",
          severity: "warning",
          line: i + 1,
          g_code: activeG ?? undefined,
          message: `G${activeG} block has no axis words (motion-only or mode-only block)`,
        });
      }

      // Compare axis words to modal position
      if (hasAxis) {
        const allMatch = Object.entries(axisWords).every(([axis, v]) => {
          const modal = modalPos[axis];
          if (modal === undefined) return false;
          return Math.abs(v - modal) <= options.position_tolerance;
        });
        const allKnown = Object.keys(axisWords).every(
          (a) => modalPos[a] !== undefined,
        );

        if (allMatch && allKnown) {
          zeroLengthCount++;

          if (activeG === 1 && options.check_zero_length_linear) {
            issues.push({
              kind: "zero_length_linear",
              severity: "info",
              line: i + 1,
              g_code: 1,
              message: `G1 block resolves to zero motion — all axis words match current modal position`,
              details: { axis_words: axisWords },
            });
          } else if (activeG === 0 && options.check_redundant_rapid) {
            issues.push({
              kind: "redundant_rapid",
              severity: "info",
              line: i + 1,
              g_code: 0,
              message: `G0 rapid to current modal position — duplicate retract?`,
              details: { axis_words: axisWords },
            });
          } else if (
            (activeG === 2 || activeG === 3) &&
            options.check_zero_length_arc_ijk &&
            hasArc
          ) {
            const iv = arcWords.I ?? 0;
            const jv = arcWords.J ?? 0;
            const kv = arcWords.K ?? 0;
            if (
              Math.abs(iv) <= options.position_tolerance &&
              Math.abs(jv) <= options.position_tolerance &&
              Math.abs(kv) <= options.position_tolerance
            ) {
              issues.push({
                kind: "zero_length_arc_ijk",
                severity: "warning",
                line: i + 1,
                g_code: activeG,
                message: `G${activeG} arc with start==end AND I=J=K=0 — undefined arc, controller may alarm`,
              });
            }
          }
        }

        // Duplicate coord sequence detection
        if (options.check_duplicate_coord_sequence) {
          const coordKey =
            (activeG ?? "?") +
            "|" +
            Object.entries(axisWords)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([a, v]) => `${a}${v}`)
              .join(",");
          if (coordKey === lastCoordKey) {
            dupRunCount++;
            if (
              dupRunCount >= options.duplicate_run_threshold - 1 &&
              !dupReported
            ) {
              issues.push({
                kind: "duplicate_coord_sequence",
                severity: "info",
                line: i + 1,
                g_code: activeG ?? undefined,
                message: `${dupRunCount + 1} consecutive identical motion blocks starting at line ${dupRunStartLine}`,
                details: { run_length: dupRunCount + 1 },
              });
              dupReported = true;
            }
          } else {
            dupRunCount = 0;
            dupRunStartLine = i + 1;
            dupReported = false;
            lastCoordKey = coordKey;
          }
        }

        // Update modal position
        for (const [axis, v] of Object.entries(axisWords)) {
          modalPos[axis] = v;
        }
      } else {
        // No axis words — break duplicate run
        lastCoordKey = null;
        dupRunCount = 0;
        dupReported = false;
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
        motion_block_count: motionBlocks,
        zero_length_count: zeroLengthCount,
      },
      issues,
      total_issues: issues.length,
    };
  }

  quickCheck(code: string): {
    valid: boolean;
    motion_blocks: number;
    zero_length_moves: number;
  } {
    const r = this.validate(code);
    return {
      valid: r.summary.valid,
      motion_blocks: r.summary.motion_block_count,
      zero_length_moves: r.summary.zero_length_count,
    };
  }

  defaultOptions(): Required<ZMVOptions> {
    return { ...DEFAULT_OPTIONS };
  }

  private extractAxisWords(
    line: string,
    allowed: Set<string>,
  ): Record<string, number> {
    const out: Record<string, number> = {};
    const re = /([A-Z])(-?\d+\.?\d*|-?\.\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const letter = m[1];
      if (!allowed.has(letter)) continue;
      // Skip if preceded by a G/M/O/N/F/S/T/H/D/P/L/Q context letter already matched
      const val = parseFloat(m[2]);
      if (!Number.isNaN(val)) out[letter] = val;
    }
    return out;
  }

  private stripComments(line: string): string {
    return line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "");
  }
}

export const ppZeroMotionValidatorEngine =
  new PPZeroMotionValidatorEngine();
