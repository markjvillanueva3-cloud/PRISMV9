/**
 * PPCannedCycleValidatorEngine — Validate G81-G89 canned cycles
 *
 * Canned cycles (drilling, tapping, boring) are compressed programs where
 * one wrong word produces a broken tap or a crashed tool. Controllers
 * accept them without complaint; the machine finds out later.
 *
 * Cycles validated:
 *   G80 — cycle cancel
 *   G81 — simple drill (no dwell)
 *   G82 — drill with dwell (counterbore/spot face)
 *   G83 — peck drill (deep hole)
 *   G84 — tapping (right-hand)
 *   G85 — boring (rapid out)
 *   G86 — boring with spindle stop
 *   G87 — back boring
 *   G88 — boring with manual return
 *   G89 — boring with dwell
 *
 * Checks:
 *   - missing_r_plane (error): canned cycle without R-word. R = retract
 *     plane; omitting it crashes through the part.
 *   - z_above_r_plane (error): Z >= R. Means the tool "drills" upward —
 *     programmer mixed up signs or incremental/absolute mode.
 *   - missing_peck_q (error): G83 without Q-word (peck depth). G83 with
 *     no Q degrades to G81 on some controls, but most just error.
 *   - peck_exceeds_depth (warning): Q-value >= |Z - R|, meaning peck is
 *     larger than hole — same as one plunge, Q is meaningless.
 *   - tap_without_rigid_mode (warning): G84 without M29 (rigid tap) or
 *     G84.2 (rigid tap direct). Floating taps can strip threads.
 *   - missing_g80_before_rapid (warning): rapid move (G0) while a canned
 *     cycle is still active — modal execution issues the cycle at the
 *     new XY, which is almost always unintended.
 *   - missing_dwell_g82_g89 (warning): G82 or G89 without P-word (dwell
 *     time). Cycle runs but skips the intended hold.
 *   - feed_not_set (error): canned cycle without F-word and no prior F
 *     in modal state.
 *
 * Scope — distinct from:
 *   - PPModalStateTrackerEngine: tracks cycle modes but doesn't validate
 *     the R/Z/Q/P word combinations.
 *   - ThreadEngine: computes tap drill sizes, not G-code sequences.
 *
 * @module PPCannedCycleValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type CycleSeverity = "error" | "warning" | "info";

export type CannedCycleCode =
  | "G80" | "G81" | "G82" | "G83" | "G84" | "G85" | "G86" | "G87" | "G88" | "G89";

export interface CannedCycleIssue {
  line_number: number;
  kind:
    | "missing_r_plane"
    | "z_above_r_plane"
    | "missing_peck_q"
    | "peck_exceeds_depth"
    | "tap_without_rigid_mode"
    | "missing_g80_before_rapid"
    | "missing_dwell_g82_g89"
    | "feed_not_set";
  severity: CycleSeverity;
  message: string;
  details?: {
    cycle?: CannedCycleCode;
    z?: number;
    r?: number;
    q?: number;
    p?: number;
  };
}

export interface CannedCycleResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: CannedCycleIssue[];
  summary: {
    valid: boolean;
    cycles_seen: CannedCycleCode[];
    g83_count: number;
    g84_count: number;
    g80_count: number;
    g81_count: number;
    g82_count: number;
  };
}

export interface CannedCycleOptions {
  require_rigid_tap?: boolean;   // default true (warn if G84 without M29/G84.2)
  warn_peck_exceeds_depth?: boolean; // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPCannedCycleValidatorEngine {
  /**
   * Validate canned cycles in a G-code program.
   */
  validate(
    gcode: string,
    options?: CannedCycleOptions,
  ): CannedCycleResult {
    const opts = {
      require_rigid_tap: options?.require_rigid_tap ?? true,
      warn_peck_exceeds_depth: options?.warn_peck_exceeds_depth ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: CannedCycleIssue[] = [];
    const cyclesSeen = new Set<CannedCycleCode>();

    let activeCycle: CannedCycleCode | null = null;
    let modalFeed: number | null = null;
    let rigidTapArmed = false; // M29 issued, valid for next G84
    let g83Count = 0;
    let g84Count = 0;
    let g80Count = 0;
    let g81Count = 0;
    let g82Count = 0;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Detect M29 rigid tap arm
      if (/\bM0*29\b/.test(code)) {
        rigidTapArmed = true;
      }

      // Update modal feed
      const fWord = this.readWord(code, "F");
      if (fWord !== undefined) modalFeed = fWord;

      // Detect cycle code
      let cycleOnLine: CannedCycleCode | null = null;
      const cycleMatch = code.match(/\bG0*(8[0-9])\b/);
      if (cycleMatch) {
        cycleOnLine = ("G" + cycleMatch[1]) as CannedCycleCode;
        cyclesSeen.add(cycleOnLine);
        if (cycleOnLine === "G80") g80Count++;
        if (cycleOnLine === "G81") g81Count++;
        if (cycleOnLine === "G82") g82Count++;
        if (cycleOnLine === "G83") g83Count++;
        if (cycleOnLine === "G84") g84Count++;
      }
      // Handle G84.2 rigid-tap-direct
      if (/\bG0*84\.2\b/.test(code)) {
        cycleOnLine = "G84";
        cyclesSeen.add("G84");
        g84Count++;
        rigidTapArmed = true; // G84.2 implies rigid
      }

      // If starting a cycle (not G80), validate R/Z/Q/P/F
      if (cycleOnLine && cycleOnLine !== "G80") {
        activeCycle = cycleOnLine;

        const zVal = this.readWord(code, "Z");
        const rVal = this.readWord(code, "R");
        const qVal = this.readWord(code, "Q");
        const pVal = this.readWord(code, "P");

        // missing_r_plane
        if (rVal === undefined) {
          issues.push({
            line_number: lineNum,
            kind: "missing_r_plane",
            severity: "error",
            message: `${cycleOnLine} without R-plane — retract reference required`,
            details: { cycle: cycleOnLine, z: zVal },
          });
        }

        // z_above_r_plane — Z should be below R (drilling downward)
        if (zVal !== undefined && rVal !== undefined && zVal >= rVal) {
          issues.push({
            line_number: lineNum,
            kind: "z_above_r_plane",
            severity: "error",
            message: `${cycleOnLine} Z${zVal} >= R${rVal} — tool would move upward, not drill`,
            details: { cycle: cycleOnLine, z: zVal, r: rVal },
          });
        }

        // missing_peck_q for G83
        if (cycleOnLine === "G83" && qVal === undefined) {
          issues.push({
            line_number: lineNum,
            kind: "missing_peck_q",
            severity: "error",
            message: `G83 without Q (peck depth) — peck drill requires Q-word`,
            details: { cycle: cycleOnLine, z: zVal, r: rVal },
          });
        }

        // peck_exceeds_depth
        if (
          opts.warn_peck_exceeds_depth &&
          cycleOnLine === "G83" &&
          qVal !== undefined &&
          zVal !== undefined &&
          rVal !== undefined
        ) {
          const holeDepth = Math.abs(rVal - zVal);
          if (qVal >= holeDepth && holeDepth > 0) {
            issues.push({
              line_number: lineNum,
              kind: "peck_exceeds_depth",
              severity: "warning",
              message: `G83 Q${qVal} >= hole depth ${holeDepth.toFixed(3)} — peck larger than hole`,
              details: { cycle: cycleOnLine, z: zVal, r: rVal, q: qVal },
            });
          }
        }

        // tap_without_rigid_mode
        if (cycleOnLine === "G84" && opts.require_rigid_tap && !rigidTapArmed) {
          issues.push({
            line_number: lineNum,
            kind: "tap_without_rigid_mode",
            severity: "warning",
            message: `G84 without M29 rigid-tap arm — floating-tap mode can strip threads`,
            details: { cycle: cycleOnLine },
          });
        }
        // Rigid-tap arm consumed by one G84 cycle start
        if (cycleOnLine === "G84") rigidTapArmed = false;

        // missing_dwell_g82_g89
        if ((cycleOnLine === "G82" || cycleOnLine === "G89") && pVal === undefined) {
          issues.push({
            line_number: lineNum,
            kind: "missing_dwell_g82_g89",
            severity: "warning",
            message: `${cycleOnLine} without P (dwell time) — dwell skipped`,
            details: { cycle: cycleOnLine },
          });
        }

        // feed_not_set
        if (modalFeed === null) {
          issues.push({
            line_number: lineNum,
            kind: "feed_not_set",
            severity: "error",
            message: `${cycleOnLine} started without F-word (feed rate) and no modal feed`,
            details: { cycle: cycleOnLine },
          });
        }
      }

      // Cycle cancel
      if (cycleOnLine === "G80") {
        activeCycle = null;
      }

      // missing_g80_before_rapid
      if (activeCycle !== null && cycleOnLine === null) {
        const hasRapid = /\bG0*0\b/.test(code);
        if (hasRapid && /[XY]-?\d/.test(code)) {
          issues.push({
            line_number: lineNum,
            kind: "missing_g80_before_rapid",
            severity: "warning",
            message: `G0 XY rapid with ${activeCycle} still active — cycle will execute at new XY (usually unintended)`,
            details: { cycle: activeCycle },
          });
        }
      }
    }

    const errors = issues.filter(i => i.severity === "error").length;
    const warnings = issues.filter(i => i.severity === "warning").length;
    const info = issues.filter(i => i.severity === "info").length;

    return {
      total_issues: issues.length,
      errors,
      warnings,
      info,
      issues,
      summary: {
        valid: errors === 0,
        cycles_seen: Array.from(cyclesSeen).sort() as CannedCycleCode[],
        g83_count: g83Count,
        g84_count: g84Count,
        g80_count: g80Count,
        g81_count: g81Count,
        g82_count: g82Count,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: CannedCycleOptions,
  ): { valid: boolean; errors: number; warnings: number; cycles: CannedCycleCode[] } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      warnings: r.warnings,
      cycles: r.summary.cycles_seen,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<CannedCycleOptions> {
    return {
      require_rigid_tap: true,
      warn_peck_exceeds_depth: true,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private readWord(code: string, letter: string): number | undefined {
    const regex = new RegExp(`\\b${letter}(-?\\d+\\.?\\d*)\\b`);
    const m = code.match(regex);
    if (!m) return undefined;
    const v = parseFloat(m[1]);
    return Number.isNaN(v) ? undefined : v;
  }

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppCannedCycleValidatorEngine = new PPCannedCycleValidatorEngine();
