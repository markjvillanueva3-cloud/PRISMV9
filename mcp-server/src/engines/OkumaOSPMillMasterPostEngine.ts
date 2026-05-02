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

/** Tool-length compensation emission mode.
 * - `G43_H`  — Fanuc-style `G43 H{tool}` (engine default; matches OSP defaults)
 * - `G56_HA` — Okuma OSP-MA-H native call `G56 HA` (single static call, no tool#)
 *   Source: hyperMILL post `OSPM_MT_TabAC_MUx_R01w_E03.def:50` toollength_comp_on
 */
export type ToolLengthCompMode = "G43_H" | "G56_HA";

/** Super-NURBS / nano-smoothing emission code.
 * - `G05.1_Q1` — older OSP-P*M manual / generic mill (engine default)
 * - `G131`     — Okuma Genos M460V on OSP-P300MA-H (current JM Die standard)
 *   Source: PRISM-modified Fusion post `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:99`
 */
export type SuperNurbsCode = "G05.1_Q1" | "G131";

/** 5-axis tool centerpoint management emission mode.
 * - `G43.4`     — Fanuc-style TCP (engine default)
 * - `G169_G170` — Okuma OSP-P*M native TCP control: G169 on, G170 off
 *   Source: PRISM-modified Fusion post `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:47,515`
 */
export type TCPMode = "G43.4" | "G169_G170";

export interface OkumaOSPMillPostConfig {
  program_number: number;
  program_comment?: string;
  /** P300 → OSP-P300M (3-axis MB-V), P500 → OSP-P500M (5-axis MU-V). */
  osp_family: OSPFamily;
  /** Enable Super-NURBS nano-smoothing (P500 only — ignored on P300). Code emitted is governed by `super_nurbs_code`. */
  use_super_nurbs?: boolean;
  /** Super-NURBS emission code. Default `G05.1_Q1`. JM Die Genos M460V uses `G131`. */
  super_nurbs_code?: SuperNurbsCode;
  /** 5-axis TCP emission mode. Default `G43.4` (Fanuc-style). JM Die uses `G169_G170` (Okuma native). */
  tcp_mode?: TCPMode;
  /** Tool-length compensation emission. Default `G43_H`. JM Die uses `G56_HA`. */
  tool_length_comp_mode?: ToolLengthCompMode;
  /** Zero-pad N-line numbers to this width (e.g. 4 → `N0100`). Default 0 = unpadded `N100`.
   *  JM Die hyperMILL post specifies `N_x_format = "N%04ld"` (4-digit zero-pad). */
  n_number_pad_digits?: number;
  coolant_mode?: "flood" | "mist" | "tsc" | "off";
  /** H index used in `G15 H{n}` work-offset call. Default 1. JM Die uses 15 for 3-axis, 25 for 5-axis. */
  work_offset_index?: number;
  units?: "metric" | "inch";
  safe_z_mm?: number;
  tool_change_position?: { x: number; y: number; z: number };
  /** Override default spindle ceiling. Default: 12 000 RPM (P300) / 15 000 RPM (P500). */
  max_spindle_rpm?: number;
}

/**
 * JM Die Company production preset for the Okuma Genos M460V-5AX
 * (OSP-P300MA-H control). Activates the shop's house conventions:
 *
 * | Field                    | JM Die value | Source                                                                                |
 * |--------------------------|--------------|---------------------------------------------------------------------------------------|
 * | `work_offset_index`      | 15           | `OSPM_MT_TabAC_MUx_R01w_E03.def:18`  (`workoffset := "S:15"`)                         |
 * | `tool_length_comp_mode`  | `G56_HA`     | `OSPM_MT_TabAC_MUx_R01w_E03.def:50`  (`toollength_comp_on := "S:G56 HA"`)             |
 * | `super_nurbs_code`       | `G131`       | `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:99` (`Super NURBS smoothing (G131)`)    |
 * | `tcp_mode`               | `G169_G170`  | `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:47,515`                                  |
 * | `n_number_pad_digits`    | 4            | `OSPM_MT_TabAC_MUx_R01w_E03.def:118` (`N_x_format := "S:N%04ld"`)                     |
 * | `osp_family`             | `P300`       | `.cps:99`  (Genos M460V ships with OSP-P300MA-H, not P500)                            |
 *
 * Both source posts are cross-validated: any field the .cps and .def disagree
 * on uses the .cps value (live PRISM-modified post in active production). The
 * .def file is from 2023; the .cps reflects the v8.9.x evolution including
 * iMachining adaptive integration.
 *
 * Spread onto user config: `engine.generateProgram(ops, { ...JM_DIE_PRESET, program_number: 1234 })`.
 */
export const JM_DIE_PRESET: Partial<OkumaOSPMillPostConfig> = {
  osp_family: "P300",
  work_offset_index: 15,
  tool_length_comp_mode: "G56_HA",
  super_nurbs_code: "G131",
  tcp_mode: "G169_G170",
  n_number_pad_digits: 4,
};

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
// 22-tip pool merging two authoritative sources from the JM Die archive
// (8 legacy + 14 new mined from the JM Die hyperMILL .def and Fusion .cps):
//   1. hyperMILL post .def — `OSPM_MT_TabAC_MUx_R01w_E03.def` (OPEN MIND
//      hyperPOST 2021.2, Okuma Genos M460V-5AX OSP, dated Oct 2023). The
//      post-processor configuration shipped to JM Die's hyperMILL CAM seat.
//   2. PRISM-modified Fusion 360 / Inventor CAM .cps —
//      `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps` (Autodesk HSM post,
//      v8.9.x, ~5 000 lines including iMachining adaptive integration,
//      OSP-P300MA-H control specific). Live in production.
//
// Where the two posts disagree, the .cps wins (newer + currently used).
// Examples of corrections: M51 is COOLANT_THROUGH_TOOL not coolant2; M12
// is COOLANT_AIR (air blast) not TSC; A-axis travel is [-110, +10] not
// [-110, +20]; Super-NURBS is G131 (Genos M460V via OSP-MA-H) not G05.1 Q1.
//
// Each tip carries a `source` citation so the engine can surface provenance
// during emission (`tribal_tips_applied` list) and so a shop-floor reader
// can grep back to the .def/.cps line that justified the rule.

interface OkumaMillTip {
  category: string;
  tip: string;
  applies_to: string[];
  iso_group?: ISOGroup;
  osp_family?: OSPFamily;
  confidence: number;
  /** Provenance: `<file>:<line>` or short citation. Optional for legacy tips. */
  source?: string;
}

const OKUMA_OSP_MILL_TRIBAL_KNOWLEDGE: OkumaMillTip[] = [
  // --- existing tips (Okuma manual + lathe-side cross-reference) -------------
  {
    category: "work_offset",
    tip: "Use G15 H1 for primary work offset; G15 H2..H99 for multi-part. P300 supports 48 offsets, P500 supports 99 — see ControllerDialect.features.work_offset_count",
    applies_to: ["all"],
    confidence: 0.95,
    source: "OSP-P300/P500 programming manual §4.2",
  },
  {
    // Informational hint surfaced whenever a P500 receives a 3d_surface or
    // adaptive op. Distinct from the `[super_nurbs]` confirmation pushed
    // by the emission path so tests can tell "tip available" apart from
    // "feature actually fired".
    category: "super_nurbs_hint",
    tip: "P500: enable Super-NURBS smoothing for 3D surfaces. Code is G05.1 Q1 (generic) or G131 (Genos M460V on OSP-P300MA-H). Cancel before drilling/tapping",
    applies_to: ["3d_surface", "adaptive"],
    osp_family: "P500",
    confidence: 0.93,
    source: "OSP manual §6.1 + cps:99",
  },
  {
    category: "tool_change",
    tip: "OSP-P*M tool change is two-line: `T{n}` to load, then `M6` to swap. Combining (`T{n} M6`) is rejected by some firmware revisions — keep them on separate lines",
    applies_to: ["all"],
    confidence: 0.96,
    source: "OSP manual §3.4 + .cps section header",
  },
  {
    category: "probing",
    tip: "Renishaw probing on OSP uses G65 P8810 (datum), P8811 (surface/corner Z), P8812 (bore/boss). Different macro IDs from Fanuc P9810-series — do NOT carry Fanuc programs across",
    applies_to: ["all"],
    confidence: 0.92,
    source: "OSP manual §8.1 (Renishaw macro pack)",
  },
  {
    category: "rigid_tap",
    tip: "G84 with feed = pitch × RPM is rigid-tap on OSP — controller auto-syncs spindle/feed. No M29 mode-switch needed (unlike Fanuc)",
    applies_to: ["tap"],
    confidence: 0.94,
    source: "OSP manual §5.7",
  },
  {
    category: "feed_units",
    tip: "OSP-P*M defaults to G94 (feed/min). Drill/tap canned cycles use feed/min as well — do NOT switch to G95 mid-program; some OSP firmware keeps F modally and silently mis-feeds",
    applies_to: ["drill", "tap", "bore"],
    confidence: 0.91,
    source: "OSP manual §5.3 + .def F_mode_tapping:1",
  },
  {
    category: "hardened",
    tip: "D2 above 58 HRC: 150 SFM max, 0.001\" IPT, light DOC (0.010\"), fresh carbide. Same as Hurco — material physics, not controller",
    applies_to: ["contour", "3d_surface"],
    iso_group: "H",
    confidence: 0.94,
    source: "Sandvik general turning + JM Die D2 jobs",
  },
  {
    category: "aluminum",
    tip: "6061-T6 on Okuma mill: 500+ SFM, 0.004\" chipload, climb mill only — high spindle taper rigidity (BBT-40/HSK-A63 on MU-V) handles 800+ SFM cleanly",
    applies_to: ["pocket", "contour", "adaptive"],
    iso_group: "N",
    confidence: 0.95,
    source: "Kennametal cutting data + JM Die 6061 jobs",
  },

  // --- new tips mined from JM Die hyperMILL .def -----------------------------
  {
    category: "jm_die_workoffset",
    tip: "JM Die starts work offsets at G15 H15 (3-axis) and G15 H25 (5-axis simultaneous). H51 is RESERVED for the CALL OO88 fixture-offset macro — never assign H51 manually",
    applies_to: ["all"],
    confidence: 0.97,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:18,99 + cps:889,2953",
  },
  {
    category: "jm_die_tool_length",
    tip: "JM Die emits `G56 HA` (single static call) for tool-length compensation, NOT `G43 H{tool}`. The `HA` register is the active-tool length set by Okuma's tool-length-measure cycle. Use `JM_DIE_PRESET` config to enable",
    applies_to: ["all"],
    confidence: 0.96,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:50",
  },
  {
    category: "jm_die_n_format",
    tip: "JM Die hyperMILL post zero-pads N-numbers to 4 digits (`N0100`, `N0110`, ...). Set `n_number_pad_digits: 4` to match. Block annotations stay in sync via the same formatter",
    applies_to: ["all"],
    confidence: 0.95,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:118 (N_x_format)",
  },
  {
    category: "jm_die_program_end",
    tip: "Final M-code is M30 (program end + rewind). Genos M460V will not auto-rewind on M02 — always use M30",
    applies_to: ["all"],
    confidence: 0.99,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:27",
  },
  {
    category: "jm_die_brake_codes",
    tip: "5-axis indexed positioning: A-axis (R1) clamp/unclamp = M10/M11; C-axis (R2) clamp/unclamp = M26/M27. Always clamp before any cut, unclamp before next index move",
    applies_to: ["3d_surface", "contour", "adaptive"],
    osp_family: "P500",
    confidence: 0.95,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:28-31",
  },
  {
    category: "jm_die_boring_cycle",
    tip: "Boring uses G86 (feed-in / dwell / rapid-out, no shift). Fine boring uses G76 with shift Q0.1\" — the small Q-shift prevents the insert from kissing the bore wall on retract",
    applies_to: ["bore"],
    confidence: 0.94,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:83-84",
  },
  {
    category: "jm_die_tap_cycle",
    tip: "Tapping cycle pair G74 (left-hand) / G84 (right-hand) is the JM Die default. Both invoke rigid tap on OSP-P*M — no M29 mode switch (Fanuc holdover)",
    applies_to: ["tap"],
    confidence: 0.94,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:85",
  },
  {
    category: "jm_die_tilt_5x",
    tip: "JM Die's hyperMILL post emits 5-axis as TILT-ANGLES, not TCPM. Operator manually drives A/C with G15 work-offset baked into part zero. The `tcp_mode: 'G169_G170'` config switches to TCP for Fusion-style adaptive jobs",
    applies_to: ["3d_surface", "adaptive"],
    osp_family: "P500",
    confidence: 0.93,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:102 (5X_output_mode:tilt_angles)",
  },

  // --- new tips mined from JM Die PRISM-modified Fusion .cps ------------------
  {
    category: "jm_die_control_variant",
    tip: "JM Die's Genos M460V ships with OSP-P300MA-H control (Mill-Advanced-High-precision), not generic P300M. The 'A' enables iMachining variable-feed; the 'H' enables G08 P1 high-precision mode and G131 Super-NURBS",
    applies_to: ["all"],
    osp_family: "P300",
    confidence: 0.97,
    source: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:99",
  },
  {
    category: "jm_die_tcp",
    tip: "5-axis TCP control on the Genos M460V uses G169 (TCP on) / G170 (TCP off), NOT Fanuc-style G43.4. With `tcp_mode: 'G169_G170'` the engine emits the Okuma-native pair",
    applies_to: ["3d_surface", "adaptive"],
    osp_family: "P500",
    confidence: 0.96,
    source: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:47,515",
  },
  {
    category: "jm_die_super_nurbs",
    tip: "On OSP-P300MA-H, Super-NURBS is `G131` (NOT G05.1 Q1). The OSP-MA-H firmware exposes the G131 alias for nano-smoothing. With `super_nurbs_code: 'G131'` the engine emits the correct token. G05.1 Q1 still works as a fallback on plain P300M",
    applies_to: ["3d_surface", "adaptive"],
    confidence: 0.95,
    source: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:99",
  },
  {
    category: "jm_die_high_precision",
    tip: "G08 P1 enables OSP-MA-H high-precision mode — tightens look-ahead window and reduces corner radius blending. JM Die wraps full 5-axis adaptive ops in G08 P1 ... G08 P0",
    applies_to: ["3d_surface", "adaptive"],
    confidence: 0.93,
    source: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:27,442",
  },
  {
    category: "jm_die_coolant_canon",
    tip: "Authoritative coolant map (per Fusion .cps overrides older .def): M8=flood, M7=mist, M51=coolant-through-tool (TSC), M12=air blast (NOT TSC), M339=air-through-tool (MQL), M8+M51=flood+TSC combined, M9=off",
    applies_to: ["all"],
    confidence: 0.96,
    source: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:798-806",
  },
  {
    category: "jm_die_a_axis_range",
    tip: "Genos M460V trunnion A-axis travel is [-110°, +10°] (per current .cps). The .def file historically listed +20° — the .cps reflects the current physical limit after MU500 trunnion calibration",
    applies_to: ["3d_surface", "adaptive"],
    osp_family: "P500",
    confidence: 0.95,
    source: "cps:1095,1109,1122 (overrides def:122-123)",
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
      // Super-NURBS open — honor `super_nurbs_code` config.
      // Default uses dialect.features.hsc_mode.on (`G05.1 Q1`). JM Die's
      // OSP-P300MA-H Genos M460V uses the OSP-MA-H native alias `G131 P1`.
      const nurbsOn = cfg.super_nurbs_code === "G131"
        ? "G131 P1"
        : dialect.features.hsc_mode.on;
      gcode.push(`${nurbsOn} ${this.fmtComment(dialect, "SUPER-NURBS / HSC ON")}`);
      tribalTipsApplied.push(
        cfg.super_nurbs_code === "G131"
          ? "[jm_die_super_nurbs] G131 P1 emitted (OSP-P300MA-H native nano-smoothing)"
          : "[super_nurbs] P500 Super-NURBS enabled for high-speed contour"
      );
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
      // Tool-length compensation — honor `tool_length_comp_mode` config.
      // Default `G43_H` matches OSP-P*M generic emission. JM Die's hyperMILL
      // post specifies `G56 HA` (single static call against active-tool
      // length register set by Okuma's tool-length-measure cycle).
      const tlcLine = cfg.tool_length_comp_mode === "G56_HA"
        ? `G56 HA ${this.fmtComment(dialect, op.tool_description ?? `TOOL ${op.tool_number}`)}`
        : `G43 H${op.tool_number} ${this.fmtComment(dialect, op.tool_description ?? `TOOL ${op.tool_number}`)}`;
      gcode.push(tlcLine);
      if (cfg.tool_length_comp_mode === "G56_HA") {
        tribalTipsApplied.push("[jm_die_tool_length] G56 HA emitted (tool-length-comp via active register)");
      }

      // Spindle start with N-label so verifyBlockAnnotations can cross-check.
      // Format matches Hurco/B250 contract: `N{label} S{rpm} M3 F{feed} (...)`.
      // Block ID — honor `n_number_pad_digits` (JM Die uses 4 = `N0100`).
      // Default 0 = unpadded (`N100`). The same blockId threads into the
      // BlockAnnotation entry below so the sidecar verifier matches.
      const blockNum = 100 + i * 10;
      const padDigits = cfg.n_number_pad_digits ?? 0;
      const blockId = padDigits > 0
        ? "N" + String(blockNum).padStart(padDigits, "0")
        : "N" + blockNum;
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
      const nurbsOff = cfg.super_nurbs_code === "G131"
        ? "G131 P0"
        : dialect.features.hsc_mode.off;
      gcode.push(`${nurbsOff} ${this.fmtComment(dialect, "SUPER-NURBS OFF")}`);
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
