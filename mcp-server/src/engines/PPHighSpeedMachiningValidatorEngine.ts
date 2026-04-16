/**
 * PPHighSpeedMachiningValidatorEngine — Validate HSM lookahead mode
 *
 * Modern mills provide three corner-control modes that trade surface
 * quality for cycle time. The wrong mode on the wrong toolpath costs
 * 2-3× cycle time or prints visible facets at every direction change:
 *
 *   G61       — Exact stop mode. Controller decelerates to zero at
 *               every block boundary. Finishes corners perfectly but
 *               useless for 3D surfacing (shudders, hours of cycle).
 *   G64       — Cutting mode (default). Controller blends between
 *               blocks using vector tolerance. OK for most work.
 *   G05.1 Q1  — AICC / AI Contour Control / lookahead. Fanuc 30i+ .
 *               Pre-reads N blocks, solves motion plan for continuous
 *               velocity. REQUIRED for 3D surfacing, 5-axis, HSM.
 *               Must be cancelled with G05.1 Q0 before rigid tapping,
 *               probing, or threading.
 *   G05 P10000 — Haas/Siemens equivalent high-speed mode.
 *
 * Failure modes this validator catches:
 *   - hsm_off_during_3d_surfacing (warning): long sequence of G1/G2/G3
 *     blocks with varying Z (surfacing) and no G05.1 Q1 active. Cycle
 *     time runs 2-3× expected and surface shows facets.
 *   - hsm_on_during_threading (error): G05.1 Q1 active during G32/G33/
 *     G76/G92. Lookahead can mis-synchronize pitch.
 *   - hsm_on_during_rigid_tap (error): G05.1 Q1 active during M29/G84.
 *     Lookahead breaks feed-spindle synchronization.
 *   - hsm_on_during_probing (error): G05.1 Q1 active during G65 P981x.
 *     Lookahead batches probe moves past skip signal.
 *   - g61_during_surfacing (warning): G61 exact-stop active during
 *     obvious 3D surfacing sequence. Cycle time disaster.
 *   - hsm_not_cancelled_at_end (info): G05.1 Q1 left on at M30. Most
 *     controls auto-cancel but portability flag.
 *
 * Scope — distinct from:
 *   - PPThreadCycleValidatorEngine: threading cycles. We cross-flag
 *     HSM-during-threading from the HSM side.
 *   - PPProbeCycleValidatorEngine: probing. Same cross-flag pattern.
 *   - PPCannedCycleValidatorEngine: canned cycles including G84 rigid
 *     tapping. Same cross-flag pattern.
 *
 * @module PPHighSpeedMachiningValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type HSMSeverity = "error" | "warning" | "info";

export interface HSMIssue {
  line_number: number;
  kind:
    | "hsm_off_during_3d_surfacing"
    | "hsm_on_during_threading"
    | "hsm_on_during_rigid_tap"
    | "hsm_on_during_probing"
    | "g61_during_surfacing"
    | "hsm_not_cancelled_at_end";
  severity: HSMSeverity;
  message: string;
  details?: {
    corner_mode?: "G61" | "G64" | "AICC" | null;
    conflicting_code?: string;
    surfacing_block_count?: number;
  };
}

export interface HSMResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: HSMIssue[];
  summary: {
    valid: boolean;
    g05_1_on_count: number;       // G05.1 Q1 activations
    g05_1_off_count: number;      // G05.1 Q0 cancellations
    g61_count: number;            // exact stop
    g64_count: number;            // cutting
    surfacing_blocks: number;     // 3D-varying Z cutting blocks
    aicc_active_at_end: boolean;
  };
}

export interface HSMOptions {
  check_surfacing_without_hsm?: boolean;   // default true
  check_hsm_threading?: boolean;           // default true
  check_hsm_rigid_tap?: boolean;           // default true
  check_hsm_probing?: boolean;             // default true
  check_g61_surfacing?: boolean;           // default true
  check_cancel_at_end?: boolean;           // default false (info only)
  surfacing_threshold?: number;            // blocks needed to call "surfacing" (default 20)
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPHighSpeedMachiningValidatorEngine {
  /**
   * Validate HSM/lookahead mode usage.
   */
  validate(gcode: string, options?: HSMOptions): HSMResult {
    const opts = {
      check_surfacing_without_hsm: options?.check_surfacing_without_hsm ?? true,
      check_hsm_threading: options?.check_hsm_threading ?? true,
      check_hsm_rigid_tap: options?.check_hsm_rigid_tap ?? true,
      check_hsm_probing: options?.check_hsm_probing ?? true,
      check_g61_surfacing: options?.check_g61_surfacing ?? true,
      check_cancel_at_end: options?.check_cancel_at_end ?? false,
      surfacing_threshold: options?.surfacing_threshold ?? 20,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: HSMIssue[] = [];

    let g051OnCount = 0;
    let g051OffCount = 0;
    let g61Count = 0;
    let g64Count = 0;
    let surfacingBlocks = 0;

    // Modal state
    let aiccActive = false;
    let cornerMode: "G61" | "G64" | null = null;
    let prevZ: number | null = null;
    let surfacingRun = 0; // consecutive 3D cutting blocks
    let surfacingStartLine = -1;
    let firstSurfacingFlagged = false;
    // Per-run aggregates (sampled on each cut block)
    let runHsmAlwaysActive = true; // false if ANY cut block had HSM off
    let runG61Active = false;      // true if ANY cut block had G61
    let runCornerMode: "G61" | "G64" | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // AICC state
      const hsmOn = /\bG0*5\.1\s+Q0*1\b/.test(code) || /\bG0*5\s+P1000/.test(code);
      const hsmOff = /\bG0*5\.1\s+Q0*0\b/.test(code) || /\bG0*5\s+P0+\b/.test(code);
      if (hsmOn) {
        g051OnCount++;
        aiccActive = true;
      }
      if (hsmOff) {
        g051OffCount++;
        aiccActive = false;
      }

      // Corner-mode state
      if (/\bG0*61\b/.test(code)) {
        g61Count++;
        cornerMode = "G61";
      }
      if (/\bG0*64\b/.test(code)) {
        g64Count++;
        cornerMode = "G64";
      }

      // Threading cross-flag
      const hasThread =
        /\bG0*32(?!\d)/.test(code) ||
        /\bG0*33(?!\d)/.test(code) ||
        /\bG0*76(?!\d)/.test(code) ||
        /(?<!\d)G0*92(?!\d)/.test(code);
      if (opts.check_hsm_threading && aiccActive && hasThread) {
        issues.push({
          line_number: lineNum,
          kind: "hsm_on_during_threading",
          severity: "error",
          message: `G05.1 Q1 lookahead active during threading — can mis-synchronize pitch; cancel with G05.1 Q0 first`,
          details: { corner_mode: "AICC", conflicting_code: "threading" },
        });
      }

      // Rigid tap cross-flag (G84 or M29)
      const hasRigidTap = /\bM0*29\b/.test(code) || /\bG0*84(?!\d)/.test(code);
      if (opts.check_hsm_rigid_tap && aiccActive && hasRigidTap) {
        issues.push({
          line_number: lineNum,
          kind: "hsm_on_during_rigid_tap",
          severity: "error",
          message: `G05.1 Q1 lookahead active during rigid tap — breaks feed-spindle sync`,
          details: { corner_mode: "AICC", conflicting_code: "rigid_tap" },
        });
      }

      // Probing cross-flag
      const hasProbe = /\bG65\s+.*?\bP981\d\b/.test(code) || /\bG0*31\b/.test(code);
      if (opts.check_hsm_probing && aiccActive && hasProbe) {
        issues.push({
          line_number: lineNum,
          kind: "hsm_on_during_probing",
          severity: "error",
          message: `G05.1 Q1 lookahead active during probing — batches moves past skip signal`,
          details: { corner_mode: "AICC", conflicting_code: "probing" },
        });
      }

      // 3D surfacing detection: G1/G2/G3 with Z changing block-to-block
      const cutMatch = code.match(/\bG0*([123])\b/);
      const zMatch = code.match(/\bZ(-?\d+(?:\.\d+)?)/);
      const isCut = cutMatch && cutMatch[1] !== "0";

      if (isCut) {
        if (zMatch) {
          const z = parseFloat(zMatch[1]);
          if (prevZ !== null && Math.abs(z - prevZ) > 1e-6) {
            surfacingRun++;
            if (surfacingRun === 1) {
              surfacingStartLine = lineNum;
              runHsmAlwaysActive = true;
              runG61Active = false;
              runCornerMode = cornerMode;
            }
            // Sample HSM/corner state for THIS cut block
            if (!aiccActive) runHsmAlwaysActive = false;
            if (cornerMode === "G61") runG61Active = true;
          }
          prevZ = z;
        }
      } else {
        // Non-cut breaks surfacing run
        if (surfacingRun >= opts.surfacing_threshold) {
          surfacingBlocks += surfacingRun;

          if (
            opts.check_surfacing_without_hsm &&
            !runHsmAlwaysActive &&
            !firstSurfacingFlagged
          ) {
            issues.push({
              line_number: surfacingStartLine,
              kind: "hsm_off_during_3d_surfacing",
              severity: "warning",
              message: `Detected ${surfacingRun} blocks of 3D surfacing without G05.1 Q1 lookahead — cycle time 2-3× optimal, surface may show facets`,
              details: { surfacing_block_count: surfacingRun, corner_mode: runCornerMode },
            });
            firstSurfacingFlagged = true;
          }

          if (opts.check_g61_surfacing && runG61Active) {
            issues.push({
              line_number: surfacingStartLine,
              kind: "g61_during_surfacing",
              severity: "warning",
              message: `G61 exact-stop mode active during ${surfacingRun}-block surfacing run — each block decels to zero; cycle time disaster`,
              details: { surfacing_block_count: surfacingRun, corner_mode: "G61" },
            });
          }
        }
        surfacingRun = 0;
      }
    }

    // Flush trailing surfacing run
    if (surfacingRun >= opts.surfacing_threshold) {
      surfacingBlocks += surfacingRun;
      if (
        opts.check_surfacing_without_hsm &&
        !runHsmAlwaysActive &&
        !firstSurfacingFlagged
      ) {
        issues.push({
          line_number: surfacingStartLine,
          kind: "hsm_off_during_3d_surfacing",
          severity: "warning",
          message: `Detected ${surfacingRun} blocks of 3D surfacing without G05.1 Q1 lookahead — cycle time 2-3× optimal, surface may show facets`,
          details: { surfacing_block_count: surfacingRun, corner_mode: runCornerMode },
        });
      }
      if (opts.check_g61_surfacing && runG61Active) {
        issues.push({
          line_number: surfacingStartLine,
          kind: "g61_during_surfacing",
          severity: "warning",
          message: `G61 exact-stop mode active during ${surfacingRun}-block surfacing run — each block decels to zero; cycle time disaster`,
          details: { surfacing_block_count: surfacingRun, corner_mode: "G61" },
        });
      }
    }

    // End-of-program AICC check
    if (opts.check_cancel_at_end && aiccActive) {
      issues.push({
        line_number: lines.length,
        kind: "hsm_not_cancelled_at_end",
        severity: "info",
        message: `G05.1 Q1 lookahead left on at program end — most controls auto-cancel but portability flag`,
        details: { corner_mode: "AICC" },
      });
    }

    const errors = issues.filter((i) => i.severity === "error").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;
    const info = issues.filter((i) => i.severity === "info").length;

    return {
      total_issues: issues.length,
      errors,
      warnings,
      info,
      issues,
      summary: {
        valid: errors === 0,
        g05_1_on_count: g051OnCount,
        g05_1_off_count: g051OffCount,
        g61_count: g61Count,
        g64_count: g64Count,
        surfacing_blocks: surfacingBlocks,
        aicc_active_at_end: aiccActive,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: HSMOptions,
  ): { valid: boolean; errors: number; surfacing_blocks: number; aicc_active_at_end: boolean } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      surfacing_blocks: r.summary.surfacing_blocks,
      aicc_active_at_end: r.summary.aicc_active_at_end,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<HSMOptions> {
    return {
      check_surfacing_without_hsm: true,
      check_hsm_threading: true,
      check_hsm_rigid_tap: true,
      check_hsm_probing: true,
      check_g61_surfacing: true,
      check_cancel_at_end: false,
      surfacing_threshold: 20,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppHighSpeedMachiningValidatorEngine =
  new PPHighSpeedMachiningValidatorEngine();
