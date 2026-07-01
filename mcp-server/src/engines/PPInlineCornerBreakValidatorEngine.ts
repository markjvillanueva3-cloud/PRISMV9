/**
 * PPInlineCornerBreakValidatorEngine — Validate Fanuc inline ,C / ,R syntax
 *
 * Fanuc and compatible controls accept an inline chamfer or corner-round
 * directive on a G1 linear-motion block by appending ",C<size>" (chamfer)
 * or ",R<size>" (rounded corner) after the axis words:
 *
 *   G1 X50. Y20. ,C5. F100.     ← 5 mm chamfer at this corner
 *   G1 X80. Y20.                  (control auto-inserts the 45° blend)
 *
 * The control synthesizes the transition to the NEXT G1 block.
 * Everything about this is failure-prone.
 *
 * Failure modes we catch:
 *   - chamfer_round_on_non_g1 (error): ,C/,R appears on G0/G2/G3 — Fanuc
 *     PS 0222 alarm on most controls; silent ignore on Haas.
 *   - chamfer_round_at_program_end (error): ,C/,R on the last motion
 *     before M30 with no following G1. There's no "next block" to blend
 *     into — the chamfer geometry is undefined.
 *   - both_c_and_r_on_same_block (error): chamfer AND round requested
 *     on the same block. Non-portable; Fanuc picks one, Haas PS 0223.
 *   - chamfer_size_too_large (warning, opt-in): ,C or ,R value exceeds
 *     half of the shorter of the two segments. Physically impossible
 *     fit — blend runs past the corner vertex.
 *   - negative_chamfer_size (error): ,C-5. or ,R-3. — negative values
 *     are rejected by every control I've seen.
 *   - chamfer_on_rapid_approach (warning, opt-in): ,C on the first G1
 *     immediately after a G0 rapid. The rapid doesn't count as a
 *     machining segment for the blend; result is a zero-length leg
 *     and the chamfer runs through air.
 *
 * Summary metrics: counts chamfers_seen, rounds_seen — useful for
 * quote-side feature counting and per-program complexity scoring.
 *
 * Scope — distinct from:
 *   - ChamferEngine (CAM-side): calculates chamfer tool parameters from
 *     feature spec, runs BEFORE post-processing.
 *   - ChamferMillingEngine (CAM-side): chamfer mill cycle-time modelling.
 *   - PPLinearInterpolationValidator: pure G1 syntax, doesn't inspect ,C/,R.
 *
 * This engine lives AFTER post-processing and checks ,C/,R syntax in
 * the emitted G-code. It is a syntax/safety validator, not a parameter
 * calculator.
 *
 * @module PPInlineCornerBreakValidatorEngine
 */

export type CornerBreakSeverity = "error" | "warning" | "info";

export type CornerBreakIssueKind =
  | "chamfer_round_on_non_g1"
  | "chamfer_round_at_program_end"
  | "both_c_and_r_on_same_block"
  | "chamfer_size_too_large"
  | "negative_chamfer_size"
  | "chamfer_on_rapid_approach";

export interface CornerBreakIssue {
  kind: CornerBreakIssueKind;
  severity: CornerBreakSeverity;
  line: number;
  block: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface CornerBreakOptions {
  check_non_g1?: boolean;
  check_program_end?: boolean;
  check_both_c_r?: boolean;
  check_negative_size?: boolean;
  check_size_vs_segment?: boolean;
  check_rapid_approach?: boolean;
  next_motion_window?: number;
}

export interface CornerBreakResult {
  summary: {
    valid: boolean;
    total_issues: number;
    error_count: number;
    warning_count: number;
    info_count: number;
    chamfers_seen: number;
    rounds_seen: number;
  };
  issues: CornerBreakIssue[];
  total_issues: number;
}

const DEFAULT_OPTIONS: Required<CornerBreakOptions> = {
  check_non_g1: true,
  check_program_end: true,
  check_both_c_r: true,
  check_negative_size: true,
  check_size_vs_segment: false,
  check_rapid_approach: false,
  next_motion_window: 5,
};

interface MotionBlock {
  line: number;
  block: string;
  gCode: number | null;
  hasComma: boolean;
  chamfer: number | null;
  round: number | null;
  x: number | null;
  y: number | null;
  z: number | null;
}

export class PPInlineCornerBreakValidatorEngine {
  validate(
    code: string,
    opts: CornerBreakOptions = {},
  ): CornerBreakResult {
    const options: Required<CornerBreakOptions> = { ...DEFAULT_OPTIONS, ...opts };
    const issues: CornerBreakIssue[] = [];
    const lines = code.split(/\r?\n/);

    let chamfersSeen = 0;
    let roundsSeen = 0;

    const motions: MotionBlock[] = [];
    let lastMotionX: number | null = null;
    let lastMotionY: number | null = null;
    let lastMotionZ: number | null = null;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const stripped = this.stripComments(raw).trim();
      if (stripped === "" || stripped === "%") continue;

      const lineNo = i + 1;
      const gCode = this.extractMotionG(stripped);

      const chamfer = this.extractCornerValue(stripped, "C");
      const round = this.extractCornerValue(stripped, "R");
      const hasComma = chamfer !== null || round !== null;

      if (chamfer !== null) chamfersSeen++;
      if (round !== null) roundsSeen++;

      if (hasComma) {
        // 1. chamfer_round_on_non_g1
        if (
          options.check_non_g1 &&
          gCode !== null &&
          gCode !== 1
        ) {
          issues.push({
            kind: "chamfer_round_on_non_g1",
            severity: "error",
            line: lineNo,
            block: stripped,
            message: `,${chamfer !== null ? "C" : "R"} used on G${gCode} — only valid on G1 linear moves`,
            details: { g_code: gCode },
          });
        }

        // 2. both_c_and_r_on_same_block
        if (
          options.check_both_c_r &&
          chamfer !== null &&
          round !== null
        ) {
          issues.push({
            kind: "both_c_and_r_on_same_block",
            severity: "error",
            line: lineNo,
            block: stripped,
            message: "Both ,C chamfer and ,R corner-round on same block — non-portable (control picks one or alarms)",
          });
        }

        // 3. negative_chamfer_size
        if (options.check_negative_size) {
          if (chamfer !== null && chamfer < 0) {
            issues.push({
              kind: "negative_chamfer_size",
              severity: "error",
              line: lineNo,
              block: stripped,
              message: `Negative chamfer size ,C${chamfer} — rejected by control`,
              details: { size: chamfer },
            });
          }
          if (round !== null && round < 0) {
            issues.push({
              kind: "negative_chamfer_size",
              severity: "error",
              line: lineNo,
              block: stripped,
              message: `Negative corner-round size ,R${round} — rejected by control`,
              details: { size: round },
            });
          }
        }
      }

      // Track motion for size-vs-segment and rapid-approach checks
      if (gCode !== null && (gCode === 0 || gCode === 1)) {
        const x = this.extractAxis(stripped, "X");
        const y = this.extractAxis(stripped, "Y");
        const z = this.extractAxis(stripped, "Z");
        const newX: number | null = x !== null ? x : lastMotionX;
        const newY: number | null = y !== null ? y : lastMotionY;
        const newZ: number | null = z !== null ? z : lastMotionZ;

        motions.push({
          line: lineNo,
          block: stripped,
          gCode,
          hasComma,
          chamfer,
          round,
          x: newX,
          y: newY,
          z: newZ,
        });

        lastMotionX = newX;
        lastMotionY = newY;
        lastMotionZ = newZ;
      } else if (gCode !== null && hasComma) {
        // Non-G1 motion (e.g. G2/G3) with ,C/,R — still track for end-detection
        motions.push({
          line: lineNo,
          block: stripped,
          gCode,
          hasComma,
          chamfer,
          round,
          x: lastMotionX,
          y: lastMotionY,
          z: lastMotionZ,
        });
      }
    }

    // 4. chamfer_round_at_program_end — last motion has ,C/,R with no follow-up G1
    if (options.check_program_end) {
      for (let mi = 0; mi < motions.length; mi++) {
        const m = motions[mi];
        if (!m.hasComma) continue;
        if (m.gCode !== 1) continue;

        // Look ahead for a subsequent G1 motion
        let foundNext = false;
        for (let mj = mi + 1; mj < motions.length; mj++) {
          if (motions[mj].gCode === 1) {
            foundNext = true;
            break;
          }
        }
        if (!foundNext) {
          issues.push({
            kind: "chamfer_round_at_program_end",
            severity: "error",
            line: m.line,
            block: m.block,
            message: ",C or ,R on last G1 before program end — no next motion to blend into",
          });
        }
      }
    }

    // 5. chamfer_size_too_large — size exceeds half the shorter segment.
    // Segment A = tool position entering this motion → this motion's endpoint.
    // Segment B = this motion's endpoint → next G1 motion's endpoint.
    // If there is no prior motion, Segment A uses (0,0,0) as the start.
    if (options.check_size_vs_segment) {
      for (let mi = 0; mi < motions.length; mi++) {
        const m = motions[mi];
        if (!m.hasComma) continue;
        if (m.gCode !== 1) continue;
        const size = m.chamfer !== null ? m.chamfer : m.round;
        if (size === null || size <= 0) continue;

        let next: MotionBlock | null = null;
        for (let mj = mi + 1; mj < motions.length; mj++) {
          if (motions[mj].gCode === 1) {
            next = motions[mj];
            break;
          }
        }
        if (!next) continue;
        if (m.x === null || m.y === null) continue;
        if (next.x === null || next.y === null) continue;

        const prevX = mi > 0 && motions[mi - 1].x !== null ? motions[mi - 1].x! : 0;
        const prevY = mi > 0 && motions[mi - 1].y !== null ? motions[mi - 1].y! : 0;
        const prevZ = mi > 0 && motions[mi - 1].z !== null ? motions[mi - 1].z! : 0;
        const curZ = m.z ?? 0;
        const nextZ = next.z ?? 0;

        const legA = Math.sqrt(
          (m.x - prevX) ** 2 + (m.y - prevY) ** 2 + (curZ - prevZ) ** 2,
        );
        const legB = Math.sqrt(
          (next.x - m.x) ** 2 + (next.y - m.y) ** 2 + (nextZ - curZ) ** 2,
        );
        const shorter = Math.min(legA, legB);
        if (size > shorter / 2) {
          issues.push({
            kind: "chamfer_size_too_large",
            severity: "warning",
            line: m.line,
            block: m.block,
            message: `Corner-break size ${size} exceeds half of shorter segment (${shorter.toFixed(3)}/2)`,
            details: { size, segment_a: legA, segment_b: legB },
          });
        }
      }
    }

    // 6. chamfer_on_rapid_approach — ,C on first G1 immediately after G0
    if (options.check_rapid_approach) {
      for (let mi = 0; mi < motions.length; mi++) {
        const m = motions[mi];
        if (!m.hasComma) continue;
        if (m.gCode !== 1) continue;
        if (mi === 0) continue;
        const prev = motions[mi - 1];
        if (prev.gCode === 0) {
          issues.push({
            kind: "chamfer_on_rapid_approach",
            severity: "warning",
            line: m.line,
            block: m.block,
            message: ",C/,R on G1 immediately following G0 rapid — blend segment is undefined",
          });
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
        chamfers_seen: chamfersSeen,
        rounds_seen: roundsSeen,
      },
      issues,
      total_issues: issues.length,
    };
  }

  quickCheck(code: string): {
    valid: boolean;
    chamfers: number;
    rounds: number;
  } {
    const r = this.validate(code);
    return {
      valid: r.summary.valid,
      chamfers: r.summary.chamfers_seen,
      rounds: r.summary.rounds_seen,
    };
  }

  defaultOptions(): Required<CornerBreakOptions> {
    return { ...DEFAULT_OPTIONS };
  }

  private stripComments(line: string): string {
    return line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "");
  }

  private extractMotionG(block: string): number | null {
    const m = block.match(/\bG0?([0-3])\b/);
    return m ? parseInt(m[1], 10) : null;
  }

  private extractCornerValue(block: string, letter: "C" | "R"): number | null {
    // Match ",<letter><value>" — the ,R must NOT be confused with arc R word.
    // Comma-prefix is required.
    const re = new RegExp(`,\\s*${letter}(-?\\d+(?:\\.\\d+)?)`);
    const m = block.match(re);
    return m ? parseFloat(m[1]) : null;
  }

  private extractAxis(block: string, letter: string): number | null {
    const re = new RegExp(`\\b${letter}(-?\\d+(?:\\.\\d+)?)`);
    const m = block.match(re);
    return m ? parseFloat(m[1]) : null;
  }

  private segLen(a: MotionBlock, b: MotionBlock): number | null {
    if (a.x === null || b.x === null) return null;
    if (a.y === null || b.y === null) return null;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z !== null && a.z !== null ? b.z - a.z : 0;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

export const ppInlineCornerBreakValidatorEngine =
  new PPInlineCornerBreakValidatorEngine();
