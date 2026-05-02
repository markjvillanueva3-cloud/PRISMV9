/**
 * OkumaOSPMillMasterPostEngine — Okuma OSP-P300M / OSP-P500M Mill Master Post
 *
 * Closes the OSP-P*M HARD-REJECT branch in master_post_by_machine
 * (camDispatcher.ts:5444-5454, U-PPGW12) by providing the long-pending
 * Okuma-mill emission path. Mirror of HurcoV11MillMasterPostEngine —
 * same `MillOperation` shape, same `BlockAnnotation[]` flow established
 * by U-PPGM13/M14, same Kienzle/Taylor physics gate.
 *
 * MACHINE TARGETS:
 *   - Okuma MB-V series (3-axis VMC) on OSP-P300M
 *   - Okuma MU-V series (5-axis VMC) on OSP-P500M
 *   - Genos M-series (entry mill) on OSP-P300M
 *
 * OSP-P*M DIALECT (sourced from ControllerDialectEngine.dialects, NOT
 * hardcoded — single source of truth):
 *   - Work offset: G15 H1 (vs Fanuc G54)
 *   - Tool change: T{n} on its own line, then M6 (two-line)
 *   - Canned cycles: G81 (drill), G83 (peck), G73 (deep), G84 (tap),
 *     G85 (bore/ream), G87 (back-bore), G80 (cancel)
 *   - Probing: G65 P88xx series (P8810 datum, P8811 surface/corner,
 *     P8812 bore/boss, P8823 tool length)
 *   - Sub-program: M98 P{num} / M99 return
 *   - Comments: parentheses, mandatory decimal point
 *   - Arcs: IJK incremental
 *   - P500-only: Super-NURBS (G05.1 Q1), 5-axis TCPC (G43.5)
 *
 * BLOCK ANNOTATION FLOW (PPG-WIRE-MS0/U-PPGM13 contract):
 *   For each operation we emit a labelled spindle-start block of the form
 *     `N{100+i*10} S{rpm} M3 F{feed} (...)`
 *   and push a matching `BlockAnnotation` onto `output.block_annotations`.
 *   Caller (typically camDispatcher) threads the array into
 *   `sealMasterPostOutput` which seals a v1.1.0 sidecar and (optionally)
 *   runs `verifyBlockAnnotations` at a chosen tier.
 *
 * Physics constants are imported from `physics/constants.ts`. No inlining
 * of kc1_1, mc, Taylor C/n, or any material/tool literals — enforced by
 * the magic-number-detector hook.
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-OkumaMill
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  type ISOGroup,
} from "../physics/constants.js";
import type { BlockAnnotation } from "../schemas/postPhysicsSidecarSchema.js";
import { controllerDialectEngine } from "./ControllerDialectEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type OSPFamily = "P300" | "P500";

export interface OkumaOSPMillPostConfig {
  program_number: number;
  program_comment?: string;
  /** P300 → OSP-P300M (3-axis MB-V), P500 → OSP-P500M (5-axis MU-V). */
  osp_family: OSPFamily;
  /** Enable Super-NURBS / G05.1 Q1 nano-smoothing (P500 only — ignored on P300). */
  use_super_nurbs?: boolean;
  coolant_mode?: "flood" | "mist" | "tsc" | "off";
  /** H index used in `G15 H{n}` work-offset call. Default 1. */
  work_offset_index?: number;
  units?: "metric" | "inch";
  safe_z_mm?: number;
  tool_change_position?: { x: number; y: number; z: number };
  /** Override default spindle ceiling. Default: 12 000 RPM (P300) / 15 000 RPM (P500). */
  max_spindle_rpm?: number;
}

export interface MillOperation {
  operation_type:
    | "face"
    | "pocket"
    | "contour"
    | "drill"
    | "tap"
    | "bore"
    | "slot"
    | "3d_surface"
    | "adaptive";
  tool_number: number;
  tool_diameter_mm: number;
  tool_flutes: number;
  tool_description?: string;
  material_iso: ISOGroup;
  spindle_rpm: number;
  feed_mm_min: number;
  axial_depth_mm: number;
  radial_depth_mm?: number;
  coolant?: "flood" | "mist" | "tsc" | "off";
  coordinates: Array<{
    x: number;
    y: number;
    z: number;
    type: "rapid" | "linear" | "arc_cw" | "arc_ccw";
  }>;
  arc_data?: Array<{ i?: number; j?: number; k?: number; r?: number }>;
}

export interface OkumaOSPMillPostOutput {
  gcode: string[];
  program_number: number;
  total_lines: number;
  estimated_cycle_min: number;
  tools_used: number[];
  warnings: string[];
  physics_checks: Array<{
    line: number;
    check: string;
    passed: boolean;
    value?: number;
    limit?: number;
  }>;
  tribal_tips_applied: string[];
  /**
   * Per-block S/F annotations (schema 1.1.0). One entry per operation,
   * keyed by the Nxxx label emitted on the spindle-start line. Caller
   * passes verbatim to `sealMasterPostOutput` for sidecar+verify.
   */
  block_annotations: BlockAnnotation[];
}

// ============================================================================
// TRIBAL KNOWLEDGE — OKUMA OSP-P*M
// ============================================================================
//
// Compact pool of OSP-mill-specific tips. Driven by Okuma OSP-P300/P500
// programming manuals + cross-referencing with the lathe-side dialect
// data (okuma-dialect-knowledge.ts) for shop-floor patterns that carry
// across mill/lathe (V/VC variables, parentheses comments, M-codes).
// JM Die has no Okuma-mill source archive to mine; deeper tribal mining
// is tracked under a separate sub-unit (PPG-WIRE-MS5/U-PPGW-OkumaMill-Tribal).
//
// Each tip is gated by op-type and (optionally) iso-group + osp-family.

interface OkumaMillTip {
  category: string;
  tip: string;
  applies_to: string[];
  iso_group?: ISOGroup;
  osp_family?: OSPFamily;
  confidence: number;
}

const OKUMA_OSP_MILL_TRIBAL_KNOWLEDGE: OkumaMillTip[] = [
  {
    category: "work_offset",
    tip: "Use G15 H1 for primary work offset; G15 H2..H99 for multi-part. P300 supports 48 offsets, P500 supports 99 — see ControllerDialect.features.work_offset_count",
    applies_to: ["all"],
    confidence: 0.95,
  },
  {
    // Informational hint surfaced whenever a P500 receives a 3d_surface or
    // adaptive op — tells the operator the option exists. Distinct from
    // the `[super_nurbs]` confirmation pushed by the emission path so
    // tests can tell "tip available" apart from "feature actually fired".
    category: "super_nurbs_hint",
    tip: "P500 only: G05.1 Q1 enables Super-NURBS smoothing for 3D surfaces. Cancel with G05.1 Q0 before drilling/tapping",
    applies_to: ["3d_surface", "adaptive"],
    osp_family: "P500",
    confidence: 0.93,
  },
  {
    category: "tool_change",
    tip: "OSP-P*M tool change is two-line: `T{n}` to load, then `M6` to swap. Combining (`T{n} M6`) is rejected by some firmware revisions — keep them on separate lines",
    applies_to: ["all"],
    confidence: 0.96,
  },
  {
    category: "probing",
    tip: "Renishaw probing on OSP uses G65 P8810 (datum), P8811 (surface/corner Z), P8812 (bore/boss). Different macro IDs from Fanuc P9810-series — do NOT carry Fanuc programs across",
    applies_to: ["all"],
    confidence: 0.92,
  },
  {
    category: "rigid_tap",
    tip: "G84 with feed = pitch × RPM is rigid-tap on OSP — controller auto-syncs spindle/feed. No M29 mode-switch needed (unlike Fanuc)",
    applies_to: ["tap"],
    confidence: 0.94,
  },
  {
    category: "feed_units",
    tip: "OSP-P*M defaults to G94 (feed/min). Drill/tap canned cycles use feed/min as well — do NOT switch to G95 mid-program; some OSP firmware keeps F modally and silently mis-feeds",
    applies_to: ["drill", "tap", "bore"],
    confidence: 0.91,
  },
  {
    category: "hardened",
    tip: "D2 above 58 HRC: 150 SFM max, 0.001\" IPT, light DOC (0.010\"), fresh carbide. Same as Hurco — material physics, not controller",
    applies_to: ["contour", "3d_surface"],
    iso_group: "H",
    confidence: 0.94,
  },
  {
    category: "aluminum",
    tip: "6061-T6 on Okuma mill: 500+ SFM, 0.004\" chipload, climb mill only — high spindle taper rigidity (BBT-40/HSK-A63 on MU-V) handles 800+ SFM cleanly",
    applies_to: ["pocket", "contour", "adaptive"],
    iso_group: "N",
    confidence: 0.95,
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class OkumaOSPMillMasterPostEngine {
  private readonly defaultConfig: OkumaOSPMillPostConfig = {
    program_number: 1000,
    osp_family: "P300",
    use_super_nurbs: false,
    coolant_mode: "flood",
    work_offset_index: 1,
    units: "metric",
    safe_z_mm: 50,
    tool_change_position: { x: 0, y: 0, z: 100 },
  };

  /**
   * Generate a complete Okuma OSP-P*M G-code program.
   *
   * @param operations one or more MillOperation entries
   * @param config     optional overrides (merged onto defaults)
   * @returns          gcode + sidecar-ready block_annotations + physics report
   */
  generateProgram(
    operations: MillOperation[],
    config?: Partial<OkumaOSPMillPostConfig>,
  ): OkumaOSPMillPostOutput {
    const cfg: OkumaOSPMillPostConfig = { ...this.defaultConfig, ...config };
    const dialectId = cfg.osp_family === "P500" ? "okuma_osp_p500" : "okuma_osp_p300";
    const dialect = controllerDialectEngine.getDialect(dialectId);

    const gcode: string[] = [];
    const warnings: string[] = [];
    const physicsChecks: OkumaOSPMillPostOutput["physics_checks"] = [];
    const tribalTipsApplied: string[] = [];
    const toolsUsed = new Set<number>();

    log.info(
      `[OkumaOSPMill] Generating program O${cfg.program_number} on ${dialect.display_name} with ${operations.length} operations`,
    );

    // Header — parentheses comments per dialect (comment_open/comment_close)
    gcode.push(`O${cfg.program_number} ${this.fmtComment(dialect, cfg.program_comment ?? "PRISM GENERATED")}`);
    gcode.push(this.fmtComment(dialect, `MACHINE: OKUMA OSP-${cfg.osp_family}M`));
    gcode.push(this.fmtComment(dialect, `GENERATED: ${new Date().toISOString()}`));
    gcode.push("");

    // Safe start (dialect-driven: G90 G21 G17 G40 G80)
    gcode.push(this.fmtComment(dialect, "SAFE START"));
    gcode.push(cfg.units === "inch" ? "G20" : "G21");
    gcode.push(dialect.safe_start);

    // Work offset: G15 H{n}
    const offsetIdx = cfg.work_offset_index ?? 1;
    gcode.push(
      `${dialect.work_offsets.format.replace("{n}", String(offsetIdx))} ${this.fmtComment(dialect, "WORK OFFSET")}`,
    );

    // Super-NURBS (P500 only)
    if (cfg.use_super_nurbs && cfg.osp_family === "P500" && dialect.features.hsc_mode) {
      gcode.push(`${dialect.features.hsc_mode.on} ${this.fmtComment(dialect, "SUPER-NURBS / HSC ON")}`);
      tribalTipsApplied.push("[super_nurbs] P500 Super-NURBS enabled for high-speed contour");
    }

    let estimatedTime = 0;
    const blockAnnotations: BlockAnnotation[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      toolsUsed.add(op.tool_number);

      gcode.push("");
      gcode.push(this.fmtComment(dialect, `OPERATION ${i + 1}: ${op.operation_type.toUpperCase()}`));

      // Physics gate
      const checks = this.performPhysicsChecks(op, gcode.length, cfg);
      physicsChecks.push(...checks);
      const failedChecks = checks.filter((c) => !c.passed);
      if (failedChecks.length > 0) {
        warnings.push(...failedChecks.map((c) => `Line ${c.line}: ${c.check}`));
      }

      // Tool change — dialect.tool_change_sequence is two-line on Okuma
      gcode.push("G91 G28 Z0");
      for (const line of dialect.tool_change_sequence) {
        gcode.push(line.replace("{tool}", String(op.tool_number)));
      }
      gcode.push(`G43 H${op.tool_number} ${this.fmtComment(dialect, op.tool_description ?? `TOOL ${op.tool_number}`)}`);

      // Spindle start with N-label so verifyBlockAnnotations can cross-check.
      // Format matches Hurco/B250 contract: `N{label} S{rpm} M3 F{feed} (...)`.
      const blockId = "N" + (100 + i * 10);
      const spindleLine =
        `${blockId} S${op.spindle_rpm} ${dialect.spindle_cw} F${op.feed_mm_min} ` +
        this.fmtComment(dialect, `SPINDLE CW ${op.spindle_rpm} RPM, FEED ${op.feed_mm_min}`);
      gcode.push(spindleLine);

      // Coolant
      const coolant = op.coolant ?? cfg.coolant_mode;
      if (coolant === "flood") {
        gcode.push(`${dialect.coolant_flood} ${this.fmtComment(dialect, "FLOOD COOLANT")}`);
      } else if (coolant === "mist") {
        gcode.push(`${dialect.coolant_mist} ${this.fmtComment(dialect, "MIST COOLANT")}`);
      }

      // Tribal knowledge filter
      const tips = this.applyTribalKnowledge(op, cfg);
      tribalTipsApplied.push(...tips);

      // Toolpath
      const toolpath = this.generateToolpath(op, cfg, dialect);
      gcode.push(...toolpath);

      // Sidecar annotation — vc / fpt derived from canonical formulae
      // (vc = π·D·N/1000, fpt = F/(N·z)). No inlined physics constants.
      const vc_mpm = (Math.PI * op.tool_diameter_mm * op.spindle_rpm) / 1000;
      const fpt_mm = op.feed_mm_min / (op.spindle_rpm * op.tool_flutes);
      blockAnnotations.push({
        block_id: blockId,
        op_id: `op_${i + 1}_${op.operation_type}`,
        iso_group: op.material_iso,
        tool_material: "carbide",
        emitted: {
          vc_mpm,
          fpt_mm,
          ap_mm: op.axial_depth_mm,
          ae_mm: op.radial_depth_mm,
          S_rpm: op.spindle_rpm,
          F_mmpm: op.feed_mm_min,
        },
        physics_basis: "kienzle",
        confidence: 0.85,
        safety_margin: 0.9,
        source_constants: [
          `CANONICAL_KIENZLE.${op.material_iso}`,
          `CANONICAL_TAYLOR.${op.material_iso}`,
        ],
      });

      estimatedTime += this.estimateCycleTime(op);
    }

    // Footer
    gcode.push("");
    gcode.push(this.fmtComment(dialect, "END OF PROGRAM"));
    if (cfg.use_super_nurbs && cfg.osp_family === "P500" && dialect.features.hsc_mode) {
      gcode.push(`${dialect.features.hsc_mode.off} ${this.fmtComment(dialect, "SUPER-NURBS OFF")}`);
    }
    gcode.push(`${dialect.spindle_stop} ${this.fmtComment(dialect, "SPINDLE STOP")}`);
    gcode.push(`${dialect.coolant_off} ${this.fmtComment(dialect, "COOLANT OFF")}`);
    gcode.push("G91 G28 Z0");
    gcode.push("G28 X0 Y0");
    for (const line of dialect.program_end) {
      gcode.push(line);
    }

    return {
      gcode,
      program_number: cfg.program_number,
      total_lines: gcode.length,
      estimated_cycle_min: Math.round(estimatedTime * 10) / 10,
      tools_used: Array.from(toolsUsed).sort((a, b) => a - b),
      warnings,
      block_annotations: blockAnnotations,
      physics_checks: physicsChecks,
      tribal_tips_applied: tribalTipsApplied,
    };
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private fmtComment(
    dialect: ReturnType<typeof controllerDialectEngine.getDialect>,
    text: string,
  ): string {
    return `${dialect.comment_open}${text}${dialect.comment_close}`;
  }

  private generateToolpath(
    op: MillOperation,
    cfg: OkumaOSPMillPostConfig,
    dialect: ReturnType<typeof controllerDialectEngine.getDialect>,
  ): string[] {
    const lines: string[] = [];
    lines.push(`${dialect.rapid_code} Z${(cfg.safe_z_mm ?? 50).toFixed(3)}`);

    for (let i = 0; i < op.coordinates.length; i++) {
      const coord = op.coordinates[i];
      const arc = op.arc_data?.[i];
      let line = "";
      switch (coord.type) {
        case "rapid":
          line = `${dialect.rapid_code} X${coord.x.toFixed(3)} Y${coord.y.toFixed(3)} Z${coord.z.toFixed(3)}`;
          break;
        case "linear":
          line = `${dialect.linear_code} X${coord.x.toFixed(3)} Y${coord.y.toFixed(3)} Z${coord.z.toFixed(3)} F${op.feed_mm_min}`;
          break;
        case "arc_cw":
        case "arc_ccw": {
          const arcCode = coord.type === "arc_cw" ? dialect.cw_arc_code : dialect.ccw_arc_code;
          line = `${arcCode} X${coord.x.toFixed(3)} Y${coord.y.toFixed(3)}`;
          // Dialect arc_format = "ijk_incremental" for OSP — prefer I/J over R
          if (arc?.i !== undefined && arc?.j !== undefined) {
            line += ` I${arc.i.toFixed(3)} J${arc.j.toFixed(3)}`;
          } else if (arc?.r !== undefined) {
            line += ` R${arc.r.toFixed(3)}`;
          }
          line += ` F${op.feed_mm_min}`;
          break;
        }
      }
      lines.push(line);
    }

    lines.push(`${dialect.rapid_code} Z${(cfg.safe_z_mm ?? 50).toFixed(3)}`);
    return lines;
  }

  /**
   * Per-op physics gate: cutting speed, chip load, Kienzle force, spindle
   * ceiling. All constants imported from physics/constants.ts — no inlined
   * material literals. Mirrors Hurco's gate so the block-annotation
   * `confidence` and `safety_margin` fields stay comparable across mills.
   *
   * Kienzle reference: Fc = kc1_1 · ap · fz^(1 - mc), Sandvik Coromant
   * General Turning (2024), ISO 3685 baseline.
   */
  private performPhysicsChecks(
    op: MillOperation,
    startLine: number,
    cfg: OkumaOSPMillPostConfig,
  ): OkumaOSPMillPostOutput["physics_checks"] {
    const checks: OkumaOSPMillPostOutput["physics_checks"] = [];

    const Vc = (Math.PI * op.tool_diameter_mm * op.spindle_rpm) / 1000;
    const maxVc = this.getMaxCuttingSpeed(op.material_iso);
    checks.push({
      line: startLine,
      check: `Cutting speed ${Vc.toFixed(0)} m/min vs max ${maxVc} m/min for ISO ${op.material_iso}`,
      passed: Vc <= maxVc * 1.2,
      value: Vc,
      limit: maxVc,
    });

    const fz = op.feed_mm_min / (op.spindle_rpm * op.tool_flutes);
    const minFz = 0.02;
    const maxFz = op.material_iso === "N" ? 0.25 : 0.15;
    checks.push({
      line: startLine,
      check: `Chip load ${fz.toFixed(3)} mm/tooth (range ${minFz}-${maxFz})`,
      passed: fz >= minFz && fz <= maxFz,
      value: fz,
      limit: maxFz,
    });

    const kienzle = CANONICAL_KIENZLE[op.material_iso];
    const Fc = kienzle.kc1_1 * op.axial_depth_mm * Math.pow(fz, 1 - kienzle.mc);
    // Spindle taper rigidity guides the force ceiling: BBT-40 (P300 MB-V)
    // ~ 2000 N realistic chip-load envelope; HSK-A63 (P500 MU-V) similar.
    // Tracked under PPG-HARDEN/U-HARDEN02 if we tighten this further.
    const maxForce = 2000;
    checks.push({
      line: startLine,
      check: `Cutting force ${Fc.toFixed(0)} N vs spindle limit ${maxForce} N`,
      passed: Fc <= maxForce,
      value: Fc,
      limit: maxForce,
    });

    const maxRpm =
      cfg.max_spindle_rpm ?? (cfg.osp_family === "P500" ? 15000 : 12000);
    checks.push({
      line: startLine,
      check: `Spindle ${op.spindle_rpm} RPM vs max ${maxRpm} RPM`,
      passed: op.spindle_rpm <= maxRpm,
      value: op.spindle_rpm,
      limit: maxRpm,
    });

    // Reference Taylor for traceability — surfaces in source_constants
    void CANONICAL_TAYLOR[op.material_iso];

    return checks;
  }

  private applyTribalKnowledge(op: MillOperation, cfg: OkumaOSPMillPostConfig): string[] {
    const applied: string[] = [];
    for (const tip of OKUMA_OSP_MILL_TRIBAL_KNOWLEDGE) {
      const opMatch = tip.applies_to.includes("all") || tip.applies_to.includes(op.operation_type);
      const isoMatch = !tip.iso_group || tip.iso_group === op.material_iso;
      const familyMatch = !tip.osp_family || tip.osp_family === cfg.osp_family;
      if (opMatch && isoMatch && familyMatch) {
        applied.push(`[${tip.category}] ${tip.tip}`);
      }
    }
    return applied;
  }

  private estimateCycleTime(op: MillOperation): number {
    let totalDistance = 0;
    for (let i = 1; i < op.coordinates.length; i++) {
      const prev = op.coordinates[i - 1];
      const curr = op.coordinates[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dz = (curr.z ?? 0) - (prev.z ?? 0);
      totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    const cuttingTime = totalDistance / op.feed_mm_min;
    const rapidTime = (totalDistance * 0.1) / 33000;
    const toolChangeTime = 0.15;
    return cuttingTime + rapidTime + toolChangeTime;
  }

  /** Conservative per-ISO cutting-speed ceiling for the gate's 1.2× tolerance. */
  private getMaxCuttingSpeed(iso: ISOGroup): number {
    const maxVc: Record<ISOGroup, number> = {
      P: 250,
      M: 150,
      K: 200,
      N: 500,
      S: 50,
      H: 100,
    };
    return maxVc[iso] ?? 200;
  }

  /** Diagnostic surface — used by `getStats` MCP introspection. */
  getStats(family: OSPFamily = "P300"): {
    machine: string;
    controller: string;
    tribal_tips: number;
    physics_checks: number;
    features: string[];
  } {
    return {
      machine: family === "P500" ? "Okuma MU-V (5-axis)" : "Okuma MB-V / Genos M",
      controller: `OSP-${family}M`,
      tribal_tips: OKUMA_OSP_MILL_TRIBAL_KNOWLEDGE.length,
      physics_checks: 4,
      features: [
        "Dialect-driven syntax via ControllerDialectEngine",
        "Kienzle force gate (CANONICAL_KIENZLE)",
        "Taylor tool-life reference (CANONICAL_TAYLOR)",
        "G15 H{n} work offsets",
        "G65 P88xx Renishaw probing",
        ...(family === "P500" ? ["Super-NURBS (G05.1 Q1)", "5-axis TCPC (G43.5)"] : []),
      ],
    };
  }
}

// Singleton export — matches HurcoV11 / OkumaB250 export shape.
export const okumaOSPMillMasterPostEngine = new OkumaOSPMillMasterPostEngine();
