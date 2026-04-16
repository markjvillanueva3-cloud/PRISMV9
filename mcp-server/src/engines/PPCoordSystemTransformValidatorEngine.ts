/**
 * PPCoordSystemTransformValidatorEngine — Validate coordinate transforms
 *
 * Transform codes remap the programmed coordinate frame before the
 * motion executes. When they are left on or wrongly paired, parts
 * come out mirrored, rotated, or the wrong size, and nobody notices
 * until QC rejects the batch.
 *
 *   G68 / G68.1 / G68.2 — coordinate rotation (2D / 3D)
 *   G69               — rotation cancel
 *   G50               — scaling cancel (also work-offset zero on Haas
 *                       — context-dependent; we use Fanuc semantics)
 *   G51               — scaling on (uniform or per-axis)
 *   M70-M72 / G50.1 / G51.1 — mirror on/off (varies by control family)
 *
 * Failure modes this validator catches:
 *   - g68_without_g69 (warning): G68 activated but no G69 before M30.
 *     Next program inherits rotation; batch runs at wrong angle.
 *   - g51_without_g50 (warning): G51 scaling left on at program end.
 *     Extremely rare legitimate case; almost always a bug.
 *   - mirror_without_cancel (warning): M70/M71/M72/G51.1 left on at
 *     program end.
 *   - nested_g68 (error): G68 inside G68 without intervening G69.
 *     Some controls stack, others overwrite silently; behavior
 *     non-portable.
 *   - rotation_in_cutter_comp (error): G68 activated while G41/G42
 *     cutter comp is on. Undefined behavior per Fanuc spec.
 *   - scaling_on_threading (error): G51 active during threading (G32/
 *     G33/G76/G92). Pitch scales with the scaling factor — scrapped
 *     threads.
 *
 * Scope — distinct from:
 *   - PPWorkOffsetValidatorEngine: G54-G59 work offsets, not transforms.
 *   - PPCutterCompValidatorEngine: G40/G41/G42. This engine consumes the
 *     cutter-comp state but doesn't own it.
 *   - PPThreadCycleValidatorEngine: threading cycles. This engine
 *     cross-flags scaling-while-threading.
 *
 * @module PPCoordSystemTransformValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type TransformSeverity = "error" | "warning" | "info";

export interface TransformIssue {
  line_number: number;
  kind:
    | "g68_without_g69"
    | "g51_without_g50"
    | "mirror_without_cancel"
    | "nested_g68"
    | "rotation_in_cutter_comp"
    | "scaling_on_threading";
  severity: TransformSeverity;
  message: string;
  details?: {
    active_code?: "G68" | "G51" | "M70" | "M71" | "M72" | "G51.1";
    cutter_comp?: "G41" | "G42";
    thread_code?: "G32" | "G33" | "G76" | "G92";
  };
}

export interface TransformResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: TransformIssue[];
  summary: {
    valid: boolean;
    g68_count: number;
    g69_count: number;
    g51_count: number;
    g50_count: number;
    mirror_on_count: number;
    mirror_off_count: number;
    rotation_active_at_end: boolean;
    scaling_active_at_end: boolean;
    mirror_active_at_end: boolean;
  };
}

export interface TransformOptions {
  check_g68_cancel?: boolean;          // default true
  check_g51_cancel?: boolean;          // default true
  check_mirror_cancel?: boolean;       // default true
  check_nested_g68?: boolean;          // default true
  check_rotation_in_comp?: boolean;    // default true
  check_scaling_threading?: boolean;   // default true
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPCoordSystemTransformValidatorEngine {
  /**
   * Validate coordinate-transform usage.
   */
  validate(gcode: string, options?: TransformOptions): TransformResult {
    const opts = {
      check_g68_cancel: options?.check_g68_cancel ?? true,
      check_g51_cancel: options?.check_g51_cancel ?? true,
      check_mirror_cancel: options?.check_mirror_cancel ?? true,
      check_nested_g68: options?.check_nested_g68 ?? true,
      check_rotation_in_comp: options?.check_rotation_in_comp ?? true,
      check_scaling_threading: options?.check_scaling_threading ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: TransformIssue[] = [];

    let g68Count = 0;
    let g69Count = 0;
    let g51Count = 0;
    let g50Count = 0;
    let mirrorOn = 0;
    let mirrorOff = 0;

    // Modal state
    let rotationActive = false;
    let scalingActive = false;
    let mirrorActive = false;
    let cutterComp: "G41" | "G42" | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      // Cutter comp modal tracking
      if (/\bG0*41\b/.test(code)) cutterComp = "G41";
      if (/\bG0*42\b/.test(code)) cutterComp = "G42";
      if (/\bG0*40\b/.test(code)) cutterComp = null;

      const hasG68 = /\bG0*68(?:\.[12])?\b/.test(code);
      const hasG69 = /\bG0*69\b/.test(code);
      // G50 (scaling cancel) is tricky: G50.1 is mirror-off, G50 alone is scaling cancel.
      const hasG50Scaling = /\bG0*50(?!\.\d)(?!\d)/.test(code);
      const hasG51Scaling = /\bG0*51(?!\.\d)(?!\d)/.test(code);
      const hasG511 = /\bG0*51\.1\b/.test(code); // Fanuc mirror-on
      const hasG501 = /\bG0*50\.1\b/.test(code); // Fanuc mirror-off
      const hasM70 = /\bM0*70\b/.test(code);
      const hasM71 = /\bM0*71\b/.test(code);
      const hasM72 = /\bM0*72\b/.test(code);

      // Threading codes
      const hasG32 = /\bG0*32(?!\d)/.test(code);
      const hasG33 = /\bG0*33(?!\d)/.test(code);
      const hasG76 = /\bG0*76(?!\d)/.test(code);
      const hasG92Thread = /(?<!\d)G0*92(?!\d)/.test(code);
      const threadCode: "G32" | "G33" | "G76" | "G92" | null =
        hasG76 ? "G76" :
        hasG92Thread ? "G92" :
        hasG33 ? "G33" :
        hasG32 ? "G32" : null;

      // G68 activation
      if (hasG68) {
        g68Count++;
        if (opts.check_nested_g68 && rotationActive) {
          issues.push({
            line_number: lineNum,
            kind: "nested_g68",
            severity: "error",
            message: `G68 activated while rotation already active — nested rotations non-portable`,
            details: { active_code: "G68" },
          });
        }
        if (opts.check_rotation_in_comp && cutterComp !== null) {
          issues.push({
            line_number: lineNum,
            kind: "rotation_in_cutter_comp",
            severity: "error",
            message: `G68 rotation activated while ${cutterComp} cutter comp on — undefined per Fanuc spec`,
            details: { active_code: "G68", cutter_comp: cutterComp },
          });
        }
        rotationActive = true;
      }

      // G69 cancel rotation
      if (hasG69) {
        g69Count++;
        rotationActive = false;
      }

      // G51 scaling on
      if (hasG51Scaling && !hasG511) {
        g51Count++;
        scalingActive = true;
      }

      // G50 scaling off
      if (hasG50Scaling && !hasG501) {
        g50Count++;
        scalingActive = false;
      }

      // Mirror on: M70/M71/M72 or G51.1
      if (hasM70 || hasM71 || hasM72 || hasG511) {
        mirrorOn++;
        mirrorActive = true;
      }

      // Mirror off: G50.1 (some controls use M80/M81)
      if (hasG501) {
        mirrorOff++;
        mirrorActive = false;
      }

      // scaling_on_threading
      if (opts.check_scaling_threading && scalingActive && threadCode !== null) {
        issues.push({
          line_number: lineNum,
          kind: "scaling_on_threading",
          severity: "error",
          message: `${threadCode} threading with G51 scaling active — pitch scales with factor; threads scrapped`,
          details: { thread_code: threadCode, active_code: "G51" },
        });
      }
    }

    // End-of-program checks
    if (opts.check_g68_cancel && rotationActive) {
      issues.push({
        line_number: lines.length,
        kind: "g68_without_g69",
        severity: "warning",
        message: `Program ended with G68 rotation still active — next program inherits rotation`,
        details: { active_code: "G68" },
      });
    }

    if (opts.check_g51_cancel && scalingActive) {
      issues.push({
        line_number: lines.length,
        kind: "g51_without_g50",
        severity: "warning",
        message: `Program ended with G51 scaling still active — next program runs scaled`,
        details: { active_code: "G51" },
      });
    }

    if (opts.check_mirror_cancel && mirrorActive) {
      issues.push({
        line_number: lines.length,
        kind: "mirror_without_cancel",
        severity: "warning",
        message: `Program ended with mirror still active — next program runs mirrored`,
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
        g68_count: g68Count,
        g69_count: g69Count,
        g51_count: g51Count,
        g50_count: g50Count,
        mirror_on_count: mirrorOn,
        mirror_off_count: mirrorOff,
        rotation_active_at_end: rotationActive,
        scaling_active_at_end: scalingActive,
        mirror_active_at_end: mirrorActive,
      },
    };
  }

  /**
   * Quick pass/fail check.
   */
  quickCheck(
    gcode: string,
    options?: TransformOptions,
  ): {
    valid: boolean;
    errors: number;
    rotation_active_at_end: boolean;
    scaling_active_at_end: boolean;
    mirror_active_at_end: boolean;
  } {
    const r = this.validate(gcode, options);
    return {
      valid: r.summary.valid,
      errors: r.errors,
      rotation_active_at_end: r.summary.rotation_active_at_end,
      scaling_active_at_end: r.summary.scaling_active_at_end,
      mirror_active_at_end: r.summary.mirror_active_at_end,
    };
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<TransformOptions> {
    return {
      check_g68_cancel: true,
      check_g51_cancel: true,
      check_mirror_cancel: true,
      check_nested_g68: true,
      check_rotation_in_comp: true,
      check_scaling_threading: true,
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

export const ppCoordSystemTransformValidatorEngine =
  new PPCoordSystemTransformValidatorEngine();
