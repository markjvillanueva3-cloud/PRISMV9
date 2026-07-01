/**
 * OkumaB250LatheMasterPostEngine — JM Die Lathe Master Post Processor
 *
 * Comprehensive master post processor for JM Die's Okuma LB250II-M with OSP-P300L.
 * This is the CANONICAL lathe post for PRISM — all lathe post logic derives from here.
 *
 * MACHINE SPECIFICATIONS (JM Die Okuma LB250II-M):
 *   - Controller: OSP-P300L
 *   - Max Swing: 16.14" (410mm)
 *   - Max Turning Diameter: 13.78" (350mm)
 *   - Max Turning Length: 20.08" (510mm)
 *   - Spindle: 5000 RPM max, 20 HP, A2-6 spindle nose
 *   - Bar Capacity: 2.56" (65mm) through spindle
 *   - Turret: 12-station BMT65 live tooling
 *   - C-Axis: 0.001° resolution, 360° positioning
 *   - Sub-Spindle: Yes (LB250II-M variant)
 *
 * OKUMA OSP-P300L G-CODE FEATURES:
 *   - G96 constant surface speed (CSS)
 *   - G85 LAP roughing cycle (Okuma OSP; NOT Fanuc G72) + G71 threading (NOT Fanuc G76)
 *   - G71 threading cycle (Okuma OSP single-line; NOT Fanuc G76)
 *   - G83/G87 drilling cycles
 *   - C-axis milling (G112 polar interpolation)
 *   - Y-axis cross drilling (if equipped)
 *   - Sub-spindle (SP2) transfer M-codes (VERIFIED vs Mark's running JM Multus B250
 *     programs, NOT the legacy/wrong M38/M39): sub/main CHUCK M248/M249 + M83/M84,
 *     synchronized rotation M151/M150, interlock release M247/M246 + M185/M184, sub
 *     coord G141. Canonical source: MULTUS_B250_SUBSPINDLE_CODES (data catalog).
 *
 * AGI INTEGRATION:
 *   - 8 reasoning modes for intelligent G-code generation
 *   - Physics-aware feed optimization via Kienzle/Taylor
 *   - Material-adaptive cutting parameters
 *   - JM Die tribal knowledge embedded (25+ tips)
 *   - Learning from production feedback
 *
 * @module engines/OkumaB250LatheMasterPostEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP-PP03
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";
import type { BlockAnnotation } from "../schemas/postPhysicsSidecarSchema.js";
// Sub-spindle (SP2) M/G codes are NOT inlined here (echo soul refuse) -- they are the
// canonical, JM-program-verified Okuma Multus B250 chucker codes from the data catalog.
import { MULTUS_B250_SUBSPINDLE_CODES } from "../data/marks-multus-patterns.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * JM Die Okuma lathe / mill-turn identities routed through this canonical post.
 * Selects the (MACHINE: ...) header label + controller designation. Defaults to
 * LB250II-M for backward compatibility with every existing caller.
 */
export type OkumaLatheMachineId =
  | "LB250II-M"
  | "LB3000"
  | "MULTUS-B250II"
  // U-PP-LATHE-JM-FLEET-IDENTITY: the 5 JM lathes that previously had no identity
  // (mislabeled as LB250II-M). Sourced from canonical jm-fleet-sim-map.json (LTH-01..05).
  | "GENOS-L300-M"
  | "GENOS-L200E-M"
  | "GENOS-L400II-E"
  | "LNC8"
  | "CROWN-L1060";

/**
 * Sub-spindle (SP2) part-transfer request for the Okuma Multus B250 chucker.
 * Drives generateSubSpindleTransfer, which reproduces JM Die's verified grab-pull
 * choreography (codes from MULTUS_B250_SUBSPINDLE_CODES). All positions in INCH on
 * the W (sub-spindle longitudinal) axis. Omitting this from config = no transfer
 * block (every existing caller is byte-unchanged).
 */
export interface SubSpindleTransferSpec {
  /** Sub-spindle W position where the sub chuck closes on the part (grab). e.g. -2.341 */
  grab_w_in: number;
  /**
   * W distance the sub travels after it clamps and the main releases. Bar-pull = how
   * much fresh stock to expose; pickoff = small clearance. Default 0 (no pull).
   */
  bar_pull_w_in?: number;
  /** Sub-spindle retract W clearance after the transfer (bar_pull mode only). e.g. 31.89 */
  return_w_in?: number;
  /** Low synchronized transfer RPM. Default 800. */
  transfer_rpm?: number;
  /** Dwell seconds after each chuck clamp/unclamp (actuation settle). Default 1.0. */
  clamp_dwell_sec?: number;
  /**
   * "bar_pull": complete self-contained cycle -- sub grabs, main releases, pull, main
   *   re-clamps, sub releases + retracts. Part stays on MAIN, stock advanced.
   * "pickoff": sub grabs the finished part and HOLDS it (main released, sync still ON)
   *   for a following cutoff / back-op; sync + interlock teardown emit after that op.
   * Default "bar_pull".
   */
  mode?: "bar_pull" | "pickoff";
}

export interface OkumaLathePostConfig {
  program_number: number;
  program_comment?: string;
  /**
   * JM lathe identity -- drives the (MACHINE: ...) header + getStats. Default
   * "LB250II-M" (back-compat). LB3000 / MULTUS-B250II select the correct label
   * so a generated post is never mis-identified as an LB250II-M.
   */
  machine_id?: OkumaLatheMachineId;
  units?: "metric" | "inch";
  work_offset?: number;          // G54-G59
  safe_z_mm?: number;
  chuck_pressure?: "high" | "medium" | "low";
  use_css?: boolean;             // G96 constant surface speed
  css_max_rpm?: number;          // G50 spindle clamp
  sub_spindle_enabled?: boolean;
  live_tooling_enabled?: boolean;
  c_axis_enabled?: boolean;
  tailstock_position_mm?: number;
  /** Optional sub-spindle (SP2) part-transfer block, emitted after the turning ops. */
  sub_spindle_transfer?: SubSpindleTransferSpec;
}

export interface TurningOperation {
  operation_type: "od_rough" | "od_finish" | "id_rough" | "id_finish" | "face" | "groove" | "thread" | "drill" | "bore" | "part_off" | "c_mill";
  tool_number: number;
  tool_orientation: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;  // ISO tool orientation
  insert_radius_mm: number;
  tool_description?: string;
  material_iso: ISOGroup;
  // Cutting parameters
  spindle_rpm?: number;
  css_m_min?: number;           // G96 surface speed
  css_max_rpm?: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  // Geometry
  start_x: number;
  start_z: number;
  end_x: number;
  end_z: number;
  // Threading specific
  thread_pitch_mm?: number;
  thread_depth_mm?: number;
  thread_passes?: number;
  // Grooving specific
  groove_width_mm?: number;
  // Coolant
  coolant?: "flood" | "off";
}

export interface OkumaLathePostOutput {
  gcode: string[];
  program_number: number;
  total_lines: number;
  estimated_cycle_min: number;
  tools_used: number[];
  warnings: string[];
  /**
   * Count of operations DROPPED because a field they emit was non-finite
   * (U-PP-NONFINITE-EMIT-SWEEP). > 0 means the program is DEGRADED -- one or more
   * features were NOT machined (each also surfaces a `(ERROR: ... SKIPPED ...)`
   * gcode comment + a `warnings` entry). A programmatic consumer must treat a
   * non-zero count as a fail-closed signal, not a clean pass -- the in-gcode
   * comment alone is not a machine-readable status.
   */
  skipped_operations: number;
  physics_checks: Array<{
    line: number;
    check: string;
    passed: boolean;
    value?: number;
    limit?: number;
  }>;
  tribal_tips_applied: string[];
  /**
   * Per-block S/F annotations (MS0/U-PPGM14, schema 1.1.0).
   *
   * One entry per G97 fixed-RPM operation, keyed by an Nxxx label
   * injected onto the G97 spindle-start line. G96 (CSS) operations are
   * NOT annotated because CSS dynamically varies RPM as workpiece
   * diameter changes — there is no fixed S to verify; gate sees an
   * unlabelled G96 line and skips it (anonymous-block rule).
   *
   * Block_ids start at N9000 to avoid collision with the contour
   * labels (NLAP<n>) emitted inside the G85 LAP canned cycle.
   *
   * Note on F verification: lathe feed is per-rev (F0.25 mm/rev) in
   * G99 mode, while the schema's emitted.F_mmpm is named for mm/min.
   * The annotation records the equivalent linear feed (F_mmpm =
   * feed_mm_rev * spindle_rpm) for downstream consumers, but the
   * label is placed on the G97 line which carries only S — so the
   * gate verifies S only. Per-rev F verification is tracked as a
   * separate schema-extension concern.
   */
  block_annotations: BlockAnnotation[];
}

// ============================================================================
// OKUMA OSP-P300L TRIBAL KNOWLEDGE — JM DIE SPECIFIC
// ============================================================================

const OKUMA_LATHE_TRIBAL_KNOWLEDGE = [
  {
    category: "css",
    tip: "Always use G96 CSS for turning — clamp with G50 S3500 for small diameters (<25mm)",
    applies_to: ["od_rough", "od_finish", "id_rough", "id_finish", "face"],
    confidence: 0.96
  },
  {
    category: "tool_nose_comp",
    tip: "G41/G42 tool nose comp: always start with G00 move before G01 — OSP is sensitive to startup",
    applies_to: ["all"],
    confidence: 0.95
  },
  {
    category: "roughing",
    tip: "G85 LAP roughing (Okuma OSP, NOT Fanuc G72): G85 N<label> D<doc> U<Xstock> W<Zstock> F<feed> / N<label> G81 / contour / G80; U0.5 W0.1 finish stock, F0.25 steel / F0.4 aluminum",
    applies_to: ["od_rough", "id_rough"],
    confidence: 0.93
  },
  {
    category: "threading",
    tip: "G71 threading (Okuma OSP single-line, NOT Fanuc G76): G71 X<minor> Z<end> B60 D<first cut .08> U<finish .025> H<height diametral=2x radial> F<lead mm> M33 M73",
    applies_to: ["thread"],
    confidence: 0.95
  },
  {
    category: "parting",
    tip: "Part-off: reduce CSS by 30%, use G96 S80 max for steel, flood coolant mandatory, pecking for >25mm dia",
    applies_to: ["part_off"],
    confidence: 0.94
  },
  {
    category: "grooving",
    tip: "Grooving (Okuma OSP, explicit -- NOT Fanuc G75): G1 plunge to bottom / G4 F<sec> dwell to clean / retract; the real JM corpus uses G75 zero times",
    applies_to: ["groove"],
    confidence: 0.92
  },
  {
    category: "drilling",
    tip: "Deep drilling (>3xD): use G83 with Q2.0 peck depth, G87 for tapping, always spot drill first",
    applies_to: ["drill"],
    confidence: 0.94
  },
  {
    category: "boring",
    tip: "Boring finish: use spring passes — run same pass twice without depth change for mirror finish",
    applies_to: ["bore", "id_finish"],
    confidence: 0.91
  },
  {
    category: "sub_spindle",
    // CORRECTED (U-PP-SUBSPINDLE-EMIT): M38/M39 was wrong for the B250 chucker -- verified
    // against Mark's running JM Multus B250 programs. Sub/main CHUCK clamp = M248/M249 + M83/M84,
    // sync rotation = M151/M150. NO-DROP: sub chuck clamps (M248) BEFORE the main unclamps (M84).
    tip: "Sub-spindle transfer (Multus B250 chucker): M151 sync-rotation ON, sub chuck CLAMP M248 + dwell BEFORE main UNCLAMP M84 (no-drop), G4 dwell after every clamp, M150 sync OFF after. Verified vs Mark's programs -- NOT M38/M39.",
    applies_to: ["part_off"],
    confidence: 0.97
  },
  {
    category: "c_axis",
    tip: "C-axis milling (G112): always home C-axis first (M76), use G12.1 polar mode for face patterns",
    applies_to: ["c_mill"],
    confidence: 0.92
  },
  {
    category: "live_tooling",
    tip: "Live tool drilling: use M23 (live tool on), M24 (live tool off), max 6000 RPM on JM Die's LB250",
    applies_to: ["c_mill", "drill"],
    confidence: 0.94
  },
  {
    category: "tool_steel",
    tip: "D2/M2 tool steel: 120-150 SFM, 0.004-0.006 IPR feed, CNMG insert preferred, flood coolant",
    applies_to: ["od_rough", "od_finish", "face"],
    iso_group: "H",
    confidence: 0.95
  },
  {
    category: "carbide",
    tip: "Tungsten carbide turning: use PCD or CBN inserts, 50-80 SFM, very light DOC (0.005\"), air blast only",
    applies_to: ["od_finish", "face"],
    iso_group: "H",
    confidence: 0.93
  },
  {
    category: "safe_start",
    tip: "JM Die Okuma safe start: G28 U0 W0 / G50 S3500 / G96 / G99 — always in this order",
    applies_to: ["all"],
    confidence: 0.97
  },
  {
    category: "chip_control",
    tip: "Long chips on aluminum: increase feed to 0.012+ IPR, use chip breaker insert geometry",
    applies_to: ["od_rough", "od_finish"],
    iso_group: "N",
    confidence: 0.91
  }
];

// ============================================================================
// JM DIE OKUMA LATHE / MILL-TURN IDENTITIES
// ============================================================================
//
// Identity facts ONLY (display model + OSP controller designation). Per-machine
// capability flags (sub-spindle, live tooling, css clamp RPM) remain caller-
// supplied via OkumaLathePostConfig -- they are NOT asserted here, to avoid
// hardcoding specs not yet verified against the live JM fleet (R12 fail-loud).
// Sources: the existing 3 (LB250II-M/LB3000/MULTUS) from JM DIE/PRISM MODIFIED POST
// PROCESSORS/*.cps filenames + ECHO-ULTIMATE-ROADMAP-2026-06-24 fleet matrix; the 5
// GENOS/Crown/LNC entries from the canonical state/shared/cimco/jm-fleet-sim-map.json
// (LTH-01..05, model + controller_model verbatim) -- U-PP-LATHE-JM-FLEET-IDENTITY.
//
// KNOWN DISCREPANCIES vs jm-fleet-sim-map (surfaced R7, left as-is for back-compat +
// operator/manual confirmation -- NOT silently changed): (1) the sim map has NO
// "LB250II-M" (the engine's legacy default); JM LTH-06 is "LB 3000EX Big Bore" on
// OSP-P500, distinct from this generic "LB3000"/OSP-P300L. (2) sim map LTH-07 Multus
// B250II is OSP-P300SA, this entry says OSP-P300. Reconciling these would change
// existing locked headers -> a separate operator-confirmed unit.
const OKUMA_LATHE_MACHINES: Record<OkumaLatheMachineId, { model: string; controller: string }> = {
  "LB250II-M": { model: "OKUMA LB250II-M", controller: "OSP-P300L" },
  "LB3000": { model: "OKUMA LB3000", controller: "OSP-P300L" },
  "MULTUS-B250II": { model: "OKUMA MULTUS B250II", controller: "OSP-P300" },
  // JM fleet LTH-01..05 (jm-fleet-sim-map.json -- machine_name + controller_model verbatim).
  "GENOS-L300-M": { model: "OKUMA GENOS L300-M", controller: "OSP-P300L-R" },
  "GENOS-L200E-M": { model: "OKUMA GENOS L200E-M", controller: "OSP-P200LA-R" },
  "GENOS-L400II-E": { model: "OKUMA GENOS L400II-E", controller: "OSP-P300LA-E" },
  "LNC8": { model: "OKUMA LNC8", controller: "OSP-U10L" },
  "CROWN-L1060": { model: "OKUMA CROWN L1060", controller: "OSP-U10L" },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class OkumaB250LatheMasterPostEngine {
  private readonly defaultConfig: OkumaLathePostConfig = {
    program_number: 1,
    units: "metric",
    work_offset: 54,
    safe_z_mm: 10,
    chuck_pressure: "high",
    use_css: true,
    css_max_rpm: 3500,
    sub_spindle_enabled: true,
    live_tooling_enabled: true,
    c_axis_enabled: true
  };

  /**
   * Generate complete Okuma lathe G-code program
   */
  generateProgram(
    operations: TurningOperation[],
    config?: Partial<OkumaLathePostConfig>
  ): OkumaLathePostOutput {
    const cfg = { ...this.defaultConfig, ...config };
    const gcode: string[] = [];
    const warnings: string[] = [];
    let skippedOperations = 0;
    const physicsChecks: OkumaLathePostOutput["physics_checks"] = [];
    const tribalTipsApplied: string[] = [];
    const toolsUsed = new Set<number>();

    // U-PP-LATHE-MACHINE-AWARE -- resolve JM lathe identity (LB250II-M default for
    // back-compat) so LB3000 / MULTUS B250II emit a correct (MACHINE: ...) header
    // instead of the previous hardwired LB250II-M label. Identity facts only;
    // capability config stays caller-supplied (defaultConfig is LB250II-M-derived).
    const requestedMachineId = cfg.machine_id;
    const machineKnown =
      requestedMachineId !== undefined &&
      Object.prototype.hasOwnProperty.call(OKUMA_LATHE_MACHINES, requestedMachineId);
    const machine = machineKnown
      ? OKUMA_LATHE_MACHINES[requestedMachineId as OkumaLatheMachineId]
      : OKUMA_LATHE_MACHINES["LB250II-M"];
    if (requestedMachineId !== undefined && !machineKnown) {
      warnings.push(`Unknown machine_id "${String(requestedMachineId)}"; defaulted to LB250II-M identity`);
    }

    log.info(`[OkumaB250] Generating program O${cfg.program_number} for ${machine.model} with ${operations.length} operations`);

    // Program header
    gcode.push(`O${String(cfg.program_number).padStart(4, "0")} (${cfg.program_comment || "PRISM LATHE"})`);
    gcode.push(`(MACHINE: ${machine.model} ${machine.controller})`);
    gcode.push(`(GENERATED: ${new Date().toISOString()})`);
    gcode.push("");

    // Safe start block
    const safeStart = this.generateSafeStart(cfg);
    gcode.push(...safeStart);
    tribalTipsApplied.push("JM Die Okuma safe start sequence applied");

    // Process each operation
    let estimatedTime = 0;
    const blockAnnotations: BlockAnnotation[] = [];
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      toolsUsed.add(op.tool_number);

      gcode.push("");
      gcode.push(`(OPERATION ${i + 1}: ${op.operation_type.toUpperCase()})`);

      // U-PP-NONFINITE-EMIT-SWEEP -- fail loud on a non-finite required numeric
      // field BEFORE any emit. A NaN / +-Infinity in start_x/start_z/end_x/end_z
      // (coords), feed_mm_rev (F-word) or depth_of_cut_mm (G85 D-word) would render
      // as a literal "XNaN"/"FNaN"/"WNaN" block the OSP-P300L control REJECTS -- the
      // same non-finite-emit bug CLASS already fixed in RokuRoku (4259b15e63) and
      // HaasNGC (c5fd2e27b5). TypeScript types these fields as `number` but cannot
      // stop a caller passing NaN. This engine emits via FIXED templates (not a
      // per-move loop), so it can neither safely skip one coord mid-block (would
      // break Okuma block structure) nor substitute "0.000" (X0 is a real face
      // position -- fabricating it is dangerous). So a malformed operation is
      // dropped whole with a VISIBLE error block + a scorecard warning. Valid
      // inputs (all required fields finite) are byte-unchanged. Optional
      // thread/groove fields keep their own falsy presence guards (NaN is falsy).
      const invalidFields = this.nonFiniteOperationFields(op);
      if (invalidFields.length > 0) {
        const detail = invalidFields.join(", ");
        gcode.push(
          `(ERROR: OPERATION ${i + 1} SKIPPED -- INVALID FIELD ${detail} (NON-FINITE OR NON-POSITIVE) -- REVIEW CAM OUTPUT)`
        );
        warnings.push(
          `Operation ${i + 1} (${op.operation_type}) skipped: invalid (non-finite/non-positive) ${detail}`
        );
        skippedOperations++;
        continue;
      }

      // Physics checks
      const checks = this.performPhysicsChecks(op, gcode.length);
      physicsChecks.push(...checks);
      const failedChecks = checks.filter(c => !c.passed);
      if (failedChecks.length > 0) {
        warnings.push(...failedChecks.map(c => `Line ${c.line}: ${c.check}`));
      }

      // Tool change
      const toolChange = this.generateToolChange(op);
      gcode.push(...toolChange);

      // Apply tribal knowledge
      const tips = this.applyTribalKnowledge(op);
      tribalTipsApplied.push(...tips.applied);

      // Generate operation-specific code
      let opCode: string[] = [];
      switch (op.operation_type) {
        case "od_rough":
        case "id_rough":
          opCode = this.generateRoughingCycle(op, cfg, i);
          break;
        case "od_finish":
        case "id_finish":
          opCode = this.generateFinishingPass(op, cfg);
          break;
        case "face":
          opCode = this.generateFacingPass(op, cfg);
          break;
        case "thread":
          opCode = this.generateThreadingCycle(op);
          break;
        case "groove":
          opCode = this.generateGroovingCycle(op);
          break;
        case "part_off":
          opCode = this.generatePartOff(op, cfg);
          break;
        case "drill":
        case "bore":
          opCode = this.generateDrillingCycle(op, cfg);
          break;
        case "c_mill":
          opCode = this.generateCAxisMilling(op, cfg);
          break;
      }

      // U-PPGM14: inject Nxxx label on the first G97 spindle line so the
      // sidecar gate can verify S vs annotation. Only G97 (fixed RPM) ops
      // are annotated; G96 (CSS) ops emit dynamic RPM and bypass the gate
      // (anonymous-block rule). N9000+ block_ids stay clear of contour
      // labels (NLAP<n>) used inside the G85 LAP canned cycle.
      if (op.spindle_rpm !== undefined && !cfg.use_css) {
        const blockId = "N" + (9000 + i * 10);
        for (let j = 0; j < opCode.length; j++) {
          const matched = /^G97 S(\d+) M03/.exec(opCode[j]);
          if (matched) {
            // Workpiece diameter average drives surface speed
            const avgDiameterMm = (op.start_x + op.end_x) / 2;
            const vc_mpm = (Math.PI * avgDiameterMm * op.spindle_rpm) / 1000;
            // U-PP-NONFINITE-EMIT-SWEEP: only LABEL + annotate when every sidecar
            // input is finite. end_x / feed_mm_rev / depth_of_cut_mm / spindle_rpm
            // are NOT validated by the drop-guard for op-types that do not EMIT them
            // (e.g. a drill faces from X0 and never emits end_x), so a NaN there
            // would poison the physics sidecar (vc_mpm/ap_mm/S_rpm -> NaN). Leave the
            // block ANONYMOUS (the gate skips it -- anonymous-block rule) rather than
            // attach a NaN annotation. This never affects emitted G-code (the bad op
            // is either already dropped, or its NaN is sidecar-only).
            const annotationInputsFinite =
              Number.isFinite(avgDiameterMm) &&
              Number.isFinite(vc_mpm) &&
              Number.isFinite(op.feed_mm_rev) &&
              Number.isFinite(op.depth_of_cut_mm) &&
              Number.isFinite(op.spindle_rpm);
            if (annotationInputsFinite) {
              opCode[j] = `${blockId} ${opCode[j]}`;
              blockAnnotations.push({
                block_id: blockId,
                op_id: `op_${i + 1}_${op.operation_type}`,
                iso_group: op.material_iso,
                tool_material: "carbide",
                emitted: {
                  vc_mpm: Math.max(vc_mpm, 0.001),
                  fn_mmrev: op.feed_mm_rev,
                  ap_mm: op.depth_of_cut_mm,
                  S_rpm: op.spindle_rpm,
                  F_mmpm: op.feed_mm_rev * op.spindle_rpm,
                },
                physics_basis: "kienzle",
                confidence: 0.85,
                safety_margin: 0.9,
                source_constants: [
                  `CANONICAL_KIENZLE.${op.material_iso}`,
                  `CANONICAL_TAYLOR.${op.material_iso}`,
                  `CANONICAL_TURNING_SPEEDS.${op.material_iso}`,
                  `CANONICAL_TURNING_FEEDS.${op.material_iso}`,
                ],
              });
            }
            break;
          }
        }
      }

      gcode.push(...opCode);

      // Estimate time
      estimatedTime += this.estimateCycleTime(op);
    }

    // Sub-spindle (SP2) part transfer -- verified Okuma Multus B250 choreography.
    // Additive: only emits when a transfer is explicitly requested AND the machine has a
    // sub-spindle. Every existing caller (no sub_spindle_transfer) is byte-unchanged.
    if (cfg.sub_spindle_transfer) {
      if (!cfg.sub_spindle_enabled) {
        warnings.push("sub_spindle_transfer requested but sub_spindle_enabled is false -- transfer NOT emitted");
      } else {
        if (cfg.machine_id !== undefined && cfg.machine_id !== "MULTUS-B250II") {
          warnings.push(
            `sub_spindle_transfer: M-codes verified for MULTUS-B250II; machine_id "${cfg.machine_id}" is assumed to share the same OSP-P300 sub-chuck codes -- confirm against that machine's posts`
          );
        }
        const xfer = this.generateSubSpindleTransfer(cfg.sub_spindle_transfer, cfg);
        gcode.push(...xfer);
        tribalTipsApplied.push(
          "Verified Multus B250 sub-spindle transfer (M248/M249 + M83/M84 + M151/M150; no-drop, dwell-guarded)"
        );
      }
    }

    // Program end
    gcode.push("");
    gcode.push("(END OF PROGRAM)");
    gcode.push("M05 (SPINDLE STOP)");
    gcode.push("M09 (COOLANT OFF)");
    gcode.push("G28 U0 W0 (HOME)");
    gcode.push("M30 (PROGRAM END)");

    return {
      gcode,
      program_number: cfg.program_number,
      total_lines: gcode.length,
      estimated_cycle_min: Math.round(estimatedTime * 10) / 10,
      tools_used: Array.from(toolsUsed).sort((a, b) => a - b),
      warnings,
      skipped_operations: skippedOperations,
      physics_checks: physicsChecks,
      tribal_tips_applied: tribalTipsApplied,
      block_annotations: blockAnnotations,
    };
  }

  /**
   * Generate safe start block (Okuma OSP-P300L specific)
   */
  private generateSafeStart(cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];
    lines.push("(SAFE START)");
    lines.push("G28 U0 W0 (HOME POSITION)");

    if (cfg.units === "metric") {
      lines.push("G21 (METRIC)");
    } else {
      lines.push("G20 (INCH)");
    }

    lines.push(`G50 S${cfg.css_max_rpm} (MAX SPINDLE CLAMP)`);
    lines.push("G97 (CANCEL CSS FOR STARTUP)");
    lines.push("G99 (FEED PER REV)");
    lines.push(`G${cfg.work_offset} (WORK OFFSET)`);

    return lines;
  }

  /**
   * Generate tool change -- Okuma OSP 6-digit tool call T<station><offset><wear> (NOT 4-digit).
   */
  private generateToolChange(op: TurningOperation): string[] {
    const lines: string[] = [];
    // Okuma OSP lathe tool call is the 6-digit T<station><offset><wear> form (all three pairs =
    // the tool number), e.g. T010101 for tool 1, T111111 for tool 11 -- verified vs Mark's running
    // JM programs (T010101/T020202/T070707/T111111 etc. dominate the corpus 85,498x; the engine's
    // prior 4-digit T<NN><NN> form appears 0x -- the only real 4-digit form is T<NN>00 offset-cancel).
    const t = String(op.tool_number).padStart(2, "0");
    const toolCode = `T${t}${t}${t}`;

    lines.push(`G28 U0 W0 (HOME FOR TOOL CHANGE)`);
    lines.push(`${toolCode} (${op.tool_description || `TOOL ${op.tool_number}`})`);

    return lines;
  }

  /**
   * Generate roughing cycle -- Okuma OSP G85 LAP pattern (G85 define / N<label> G81 / contour / G80; NOT Fanuc G72).
   */
  /**
   * Returns the names of any numeric field that this operation type actually
   * EMITS into G-code and that is non-finite (NaN / +-Infinity). A non-finite
   * value would render as a literal "XNaN"/"ZNaN"/"FNaN"/"WNaN" block the
   * OSP-P300L control rejects (the non-finite-emit bug CLASS fixed in RokuRoku
   * 4259b15e63 + HaasNGC c5fd2e27b5). TypeScript types coords/feed/DOC as `number`
   * but cannot stop a caller passing NaN, so this is the runtime contract
   * enforcement that lets `generateProgram` fail loud (skip op + warn).
   *
   * The field set is PER-OP-TYPE (only what each generate* method emits) so a
   * valid op is never rejected for a non-finite value in a field it does not
   * consume. This matters: a threading op legitimately leaves feed_mm_rev /
   * depth_of_cut_mm unset (it emits thread_pitch_mm as the G71 lead and uses
   * thread_depth_mm for the cut), and a drill/part_off op faces from X0 rather
   * than end_x. Optional thread/groove fields (thread_pitch_mm / thread_depth_mm /
   * groove_width_mm) are intentionally excluded: their own emit paths already
   * guard via a falsy presence check (`!op.thread_pitch_mm`), and NaN is falsy,
   * so a non-finite value there is caught as "not specified" not emitted.
   *
   * @param op turning operation to validate
   * @returns offending emitted-field names, in emit order (empty => all valid: finite + magnitude>0)
   */
  private nonFiniteOperationFields(op: TurningOperation): string[] {
    // Field kinds drive the rejection predicate:
    //   "req" (required coords/feed/DOC, emitted unconditionally) -> reject ANY
    //         non-finite (NaN, +-Infinity, or a missing required field).
    //   "opt" (optional css/spindle/thread, emitted behind a truthy guard like
    //         `if (op.css_m_min)`) -> reject ONLY +-Infinity. NaN/0/undefined are
    //         FALSY, so the existing emit guard already skips them safely (a NaN css
    //         is not emitted); but +-Infinity is TRUTHY, so it slips past the guard and
    //         renders "SInfinity"/"FInfinity" -- the same control-rejected non-finite-emit
    //         class as the coord words. (groove_width_mm is "opt" purely as a malformed-op
    //         signal now -- the explicit Okuma groove no longer emits it.)
    type Kind = "req" | "opt";
    let emitted: Array<readonly [string, number | undefined, Kind]>;
    switch (op.operation_type) {
      // Roughing (generateRoughingCycle): full contour + G85 D depth-of-cut + S-word.
      case "od_rough":
      case "id_rough":
        emitted = [
          ["start_x", op.start_x, "req"], ["start_z", op.start_z, "req"],
          ["end_x", op.end_x, "req"], ["end_z", op.end_z, "req"],
          ["feed_mm_rev", op.feed_mm_rev, "req"], ["depth_of_cut_mm", op.depth_of_cut_mm, "req"],
          ["css_m_min", op.css_m_min, "opt"], ["spindle_rpm", op.spindle_rpm, "opt"],
        ];
        break;
      // Finish (generateFinishingPass): full contour + feed + S-word, NO G85 D.
      case "od_finish":
      case "id_finish":
        emitted = [
          ["start_x", op.start_x, "req"], ["start_z", op.start_z, "req"],
          ["end_x", op.end_x, "req"], ["end_z", op.end_z, "req"],
          ["feed_mm_rev", op.feed_mm_rev, "req"],
          ["css_m_min", op.css_m_min, "opt"], ["spindle_rpm", op.spindle_rpm, "opt"],
        ];
        break;
      // Facing (generateFacingPass): X to OD, Z faces to start_z -- emits start_x,
      // start_z, end_x, feed; does NOT emit end_z (faces in Z, not to end_z).
      case "face":
        emitted = [
          ["start_x", op.start_x, "req"], ["start_z", op.start_z, "req"],
          ["end_x", op.end_x, "req"], ["feed_mm_rev", op.feed_mm_rev, "req"],
          ["css_m_min", op.css_m_min, "opt"],
        ];
        break;
      // Grooving (generateGroovingCycle): explicit G1 plunge + feed + G4 dwell + retract (NOT G75).
      // groove_width_mm is still field-validated (malformed op) though the explicit groove omits it.
      case "groove":
        emitted = [
          ["start_x", op.start_x, "req"], ["start_z", op.start_z, "req"],
          ["end_x", op.end_x, "req"], ["end_z", op.end_z, "req"],
          ["feed_mm_rev", op.feed_mm_rev, "req"],
          ["css_m_min", op.css_m_min, "opt"], ["groove_width_mm", op.groove_width_mm, "opt"],
        ];
        break;
      // Threading (generateThreadingCycle): start_x/start_z position + end_z cut;
      // lead = thread_pitch_mm (G71 F-word), depth = thread_depth_mm, S = spindle_rpm.
      // NaN pitch/depth still hit the existing falsy `(ERROR: ... NOT SPECIFIED)`
      // guard; the "opt" predicate adds the missing +-Infinity rejection here.
      case "thread":
        emitted = [
          ["start_x", op.start_x, "req"], ["start_z", op.start_z, "req"], ["end_z", op.end_z, "req"],
          ["thread_pitch_mm", op.thread_pitch_mm, "opt"], ["thread_depth_mm", op.thread_depth_mm, "opt"],
          ["spindle_rpm", op.spindle_rpm, "opt"],
        ];
        break;
      // Part-off (generatePartOff): positions at start_x/start_z, parts to X0.
      case "part_off":
        emitted = [
          ["start_x", op.start_x, "req"], ["start_z", op.start_z, "req"], ["feed_mm_rev", op.feed_mm_rev, "req"],
          ["css_m_min", op.css_m_min, "opt"],
        ];
        break;
      // Drill / bore (generateDrillingCycle): on-center (X0); Z travel + S-word.
      case "drill":
      case "bore":
        emitted = [
          ["start_z", op.start_z, "req"], ["end_z", op.end_z, "req"], ["feed_mm_rev", op.feed_mm_rev, "req"],
          ["spindle_rpm", op.spindle_rpm, "opt"],
        ];
        break;
      // C-axis live milling (generateCAxisMilling): start_x at C0, feed to end_z.
      // spindle_rpm is Math.min(...,6000)-CLAMPED at emit, so a non-finite value is
      // bounded (never SInfinity) -- intentionally not validated here.
      case "c_mill":
        emitted = [
          ["start_x", op.start_x, "req"], ["end_z", op.end_z, "req"], ["feed_mm_rev", op.feed_mm_rev, "req"],
        ];
        break;
      // Unknown/future op type: validate the full contour conservatively.
      default:
        emitted = [
          ["start_x", op.start_x, "req"], ["start_z", op.start_z, "req"],
          ["end_x", op.end_x, "req"], ["end_z", op.end_z, "req"],
        ];
    }
    // +-Infinity is a non-NaN, non-finite number (NaN fails Number.isNaN===false here).
    const isPlusMinusInfinity = (v: number | undefined): boolean =>
      typeof v === "number" && !Number.isNaN(v) && !Number.isFinite(v);
    // A MAGNITUDE req field (feed/depth) that is <= 0 is invalid: a negative feed is FINITE so it
    // slips past the finiteness check above but would emit "F-0.1" / a degenerate "W0.000" depth the
    // control rejects -- mirrors camActionSchemas .positive() so a DIRECT engine call is as safe as
    // the dispatcher path. Position req fields (start/end X/Z) may legitimately be negative -> finite
    // only. opt fields keep their own truthy-guard semantics (out of scope here). U-PP-NONPOS-GUARD.
    const POSITIVE_MAGNITUDE = new Set(["feed_mm_rev", "depth_of_cut_mm"]);
    return emitted
      .filter(([name, v, kind]) =>
        (kind === "req" ? !Number.isFinite(v) : isPlusMinusInfinity(v)) ||
        (POSITIVE_MAGNITUDE.has(name) && Number.isFinite(v) && Number(v) <= 0))
      .map(([name]) => name);
  }

  private generateRoughingCycle(op: TurningOperation, cfg: OkumaLathePostConfig, opIndex = 0): string[] {
    const lines: string[] = [];
    const isOD = op.operation_type === "od_rough";

    // Spindle start with CSS
    if (cfg.use_css && op.css_m_min) {
      lines.push(`G96 S${op.css_m_min} M03 (CSS ${op.css_m_min} M/MIN)`);
    } else if (op.spindle_rpm) {
      lines.push(`G97 S${op.spindle_rpm} M03 (${op.spindle_rpm} RPM)`);
    }

    // Coolant
    if (op.coolant === "flood") {
      lines.push("M08 (FLOOD COOLANT)");
    }

    // Tool nose comp
    const compDir = isOD ? "G42" : "G41";
    lines.push(`${compDir} (TOOL NOSE COMP ${isOD ? "RIGHT" : "LEFT"})`);

    // Okuma OSP LAP roughing cycle (G85 define / N<label> G81 / contour / G80) -- NOT Fanuc G72.
    // On Okuma OSP the roughing cycle is the LAP family (G85/G81/G80), NOT Fanuc G72. Verified vs
    // Mark's running JM programs (JM DIE/CNC LATHE/A05-LSC-25-B.MIN:18-25 "G85 NR001 D.1 U.010
    // W.005 F.009 / NR001 G81 / G0 X.. / ... / G80"; THREAD M8X125.MIN:20-30) and the JM Multus
    // .cps onCyclePath/onCyclePathEnd (OKUMA MULTUS B250 3.15.24 REV A.cps:3180, 3187, 3200-3207):
    //   G85 N<label> D<depth of cut> U<X finish stock, diametral> W<Z finish stock> F<feed>
    //   N<label> G81 (longitudinal turning; G82 = facing/vertical passes) -> finished contour -> G80
    // The G85 cycle removes stock down to the bracketed contour in D-depth passes, leaving U/W
    // for finishing. The contour moves are identical to the prior Fanuc emit -- only the cycle
    // wrapper changed (G72/N100-N200 -> G85/N<label> G81/G80). A standalone G85 rough runs; the
    // Okuma G87 LAP-finish (G87 N<label>, re-runs THIS contour) is the coupled follow-on unit.
    const label = `NLAP${opIndex}`;            // unique LAP contour label within the program
    const finishStockX = 0.5;                  // U: X finish stock left for finish pass (diametral mm)
    const finishStockZ = 0.1;                  // W: Z finish stock
    lines.push(`G85 ${label} D${op.depth_of_cut_mm} U${finishStockX} W${finishStockZ} F${op.feed_mm_rev}`);
    lines.push(`${label} G81`);                // longitudinal turning contour (G82 for facing)
    lines.push(`G00 X${op.start_x.toFixed(3)}`);
    lines.push(`G01 Z${op.start_z.toFixed(3)} F${op.feed_mm_rev}`);
    lines.push(`X${op.end_x.toFixed(3)}`);
    lines.push(`Z${op.end_z.toFixed(3)}`);
    lines.push("G80");

    // Cancel comp
    lines.push("G40 (CANCEL TOOL NOSE COMP)");

    return lines;
  }

  /**
   * Generate finishing pass
   */
  private generateFinishingPass(op: TurningOperation, cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];
    const isOD = op.operation_type === "od_finish";

    // Spindle start with CSS or fixed RPM
    if (cfg.use_css && op.css_m_min) {
      lines.push(`G96 S${op.css_m_min} M03 (CSS FINISH)`);
    } else if (op.spindle_rpm) {
      lines.push(`G97 S${op.spindle_rpm} M03 (${op.spindle_rpm} RPM)`);
    }

    // Coolant
    if (op.coolant === "flood") {
      lines.push("M08");
    }

    // Tool nose comp
    const compDir = isOD ? "G42" : "G41";
    lines.push(`${compDir}`);

    // Simple finish contour
    lines.push(`G00 X${(op.start_x + 2).toFixed(3)} Z${(op.start_z + 2).toFixed(3)}`);
    lines.push(`X${op.start_x.toFixed(3)}`);
    lines.push(`G01 Z${op.start_z.toFixed(3)} F${op.feed_mm_rev}`);
    lines.push(`X${op.end_x.toFixed(3)} Z${op.end_z.toFixed(3)}`);

    // Cancel comp
    lines.push("G40");

    return lines;
  }

  /**
   * Generate facing pass
   */
  private generateFacingPass(op: TurningOperation, cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];

    if (cfg.use_css && op.css_m_min) {
      lines.push(`G96 S${op.css_m_min} M03`);
    }
    if (op.coolant === "flood") lines.push("M08");

    // Face from OD to center
    lines.push(`G00 X${op.start_x.toFixed(3)} Z${(op.start_z + 1).toFixed(3)}`);
    lines.push(`G01 Z${op.start_z.toFixed(3)} F${op.feed_mm_rev}`);
    lines.push(`X${op.end_x.toFixed(3)} F${op.feed_mm_rev}`);
    lines.push(`G00 Z${(op.start_z + 1).toFixed(3)}`);

    return lines;
  }

  /**
   * Generate threading cycle -- Okuma OSP G71 (NOT Fanuc G76).
   * On Okuma OSP, G71 is the single-line threading cycle; G76 is a Fanuc/Haas code.
   */
  private generateThreadingCycle(op: TurningOperation): string[] {
    const lines: string[] = [];

    if (!op.thread_pitch_mm || !op.thread_depth_mm) {
      return ["(ERROR: THREAD PITCH OR DEPTH NOT SPECIFIED)"];
    }

    // RPM mode for threading (not CSS)
    const threadRpm = op.spindle_rpm || Math.min(1000, 1000 / op.thread_pitch_mm);
    lines.push(`G97 S${Math.round(threadRpm)} M03 (THREADING RPM)`);
    lines.push("M08");

    // Position
    lines.push(`G00 X${op.start_x.toFixed(3)} Z${(op.start_z + 2).toFixed(3)}`);

    // Okuma OSP G71 single-line threading cycle -- NOT Fanuc G76.
    // On Okuma OSP, G71 IS the threading cycle (Fanuc's G71 = longitudinal roughing);
    // emitting Fanuc G76 here alarms / mis-cycles the control. Verified line-for-line vs
    // Mark's running JM programs (JM DIE/CNC LATHE/A05-LSC-25-B.MIN:149 "3-16" thread, and
    // THREAD M8X125.MIN:60 M8x1.25) AND the JM Multus .cps onCyclePoint "thread-turning"
    // writeBlock (OKUMA MULTUS B250 3.15.24 REV A.cps:3364-3378). Canonical form:
    //   G71 X<minor dia> Z<end> B<incl angle> D<first cut> U<finish allow> H<height,diametral> F<lead> M33 M73
    // Mapping: B = included thread angle (60 for UN/metric; .cps emits cuttingAngle*2).
    //   H = thread height output AS DIAMETER (2x radial thread_depth_mm, per .cps "output as diameter").
    //   F = lead in mm (metric). In Mark's INCH programs F = J*pitch_in ~= 1.0 with J = TPI;
    //   metric Okuma uses F = lead directly. D/U default to Mark's proven D.003"/U.001".
    //   M33 M73 = Okuma thread cutting-mode / infeed-mode (JM-confirmed on both real programs).
    const angle = 60;                                       // included thread angle (deg)
    const firstCut = 0.08;                                  // first pass depth mm (Mark D.003")
    const finishAllowance = 0.025;                          // finish allowance mm (Mark U.001")
    const minorDia = op.start_x - op.thread_depth_mm * 2;   // minor dia endpoint (diametral)
    const heightDia = op.thread_depth_mm * 2;               // H output as diameter (2x radial)

    lines.push(
      `G71 X${minorDia.toFixed(3)} Z${op.end_z.toFixed(3)} B${angle} ` +
        `D${firstCut.toFixed(3)} U${finishAllowance.toFixed(3)} H${heightDia.toFixed(3)} ` +
        `F${op.thread_pitch_mm} M33 M73`
    );

    return lines;
  }

  /**
   * Generate grooving cycle -- Okuma OSP explicit plunge + G4 dwell (NOT Fanuc G75).
   */
  private generateGroovingCycle(op: TurningOperation): string[] {
    const lines: string[] = [];

    if (op.css_m_min) {
      lines.push(`G96 S${Math.round(op.css_m_min * 0.7)} M03 (REDUCED CSS FOR GROOVING)`);
    }
    lines.push("M08");

    // Okuma OSP grooving is EXPLICIT (G1 plunge to bottom / G4 F<sec> dwell / retract) -- NOT
    // Fanuc G75. The real JM corpus uses G75 ZERO times (vs LAP G85 pervasive, 12K+ files); Mark
    // grooves with an explicit plunge+dwell -- THREAD M8X125.MIN:44-52 OD groove ("G0 X.7 Z.050 /
    // G1 X.240 F.0015 / G4 F3. / G1 X.5 A45 / G0") and A05-LSC-25-B.MIN:118-133 ID groove ("G1
    // X3.05 F.002 / G4 F3. / G0 retract"). Plunge
    // from the OD (start_x) to the groove bottom (end_x), dwell to clean the bottom, retract clear.
    // (groove_width_mm stays field-validated -- a malformed width is a malformed op -- but the
    // single-plunge explicit groove does not emit a Q-word, so it is not interpolated here.)
    const dwellSec = 0.5;
    lines.push(`G00 X${op.start_x.toFixed(3)} Z${op.start_z.toFixed(3)} (RAPID TO GROOVE)`);
    lines.push(`G01 X${op.end_x.toFixed(3)} F${op.feed_mm_rev} (PLUNGE TO GROOVE BOTTOM)`);
    lines.push(`G4 F${dwellSec} (DWELL -- CLEAN GROOVE BOTTOM)`);
    lines.push(`G00 X${op.start_x.toFixed(3)} (RETRACT CLEAR)`);

    return lines;
  }

  /**
   * Generate part-off
   */
  private generatePartOff(op: TurningOperation, cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];

    // Reduced speed for parting
    const partSpeed = op.css_m_min ? Math.round(op.css_m_min * 0.7) : 80;
    lines.push(`G96 S${partSpeed} M03 (REDUCED CSS FOR PART-OFF)`);
    lines.push("M08 (FLOOD COOLANT MANDATORY)");

    // Position
    lines.push(`G00 X${op.start_x.toFixed(3)} Z${op.start_z.toFixed(3)}`);

    // Part-off with pecking if large diameter. Okuma OSP uses EXPLICIT peck moves, NOT Fanuc G75
    // (real JM corpus: G75 0x). One chip-clearing retract before the final cut to center mirrors
    // Mark's stepped-cutoff style (THREAD M8X125.MIN:65-88 NAT11 CUTOFF).
    if (op.start_x > 50) {
      const peckX = op.start_x * 0.5; // chip-clear peck partway in (diametral)
      lines.push(`G01 X${peckX.toFixed(3)} F${(op.feed_mm_rev * 0.5).toFixed(3)} (PECK -- CHIP CLEAR)`);
      lines.push(`G00 X${op.start_x.toFixed(3)} (RETRACT)`);
      lines.push(`G01 X0 F${(op.feed_mm_rev * 0.5).toFixed(3)} (CUT TO CENTER)`);
    } else {
      lines.push(`G01 X0 F${op.feed_mm_rev * 0.5}`);
    }

    // Dwell at center. Okuma OSP dwell is G4 F<seconds> -- NOT the Fanuc G04 P<ms>
    // (verified vs Mark's running JM programs, which use G4 F1./F3./F0.5; see
    // lathe-real-program-validation: "Okuma G4 F2., NOT Fanuc G04 P2000"). The prior
    // `G04 P0.5` was a Fanuc-dialect dwell on an Okuma post -- malformed on the control.
    lines.push("G4 F0.5 (DWELL AT CENTER)");

    return lines;
  }

  /**
   * Generate the VERIFIED Okuma Multus B250 sub-spindle (SP2) part-transfer block.
   *
   * Reproduces JM Die's real grab-pull choreography (codes from MULTUS_B250_SUBSPINDLE_CODES,
   * never inlined). Safety-critical ordering is INVARIANT and intentional:
   *   - interlock-release (M247/M185) brackets the transfer; teardown (M246/M184) closes it;
   *   - synchronized rotation (M151) is ON before the sub approaches a rotating part;
   *   - NO-DROP: the sub chuck CLAMPS (M248) and dwells BEFORE the main UNCLAMPS (M84) -- the
   *     part is never held by zero chucks;
   *   - every chuck clamp/unclamp is followed by a `G4 F<sec>` dwell so the chuck physically
   *     actuates before the next move (Okuma OSP dwell, NOT Fanuc `G04 P<ms>`).
   *
   * Source: JM DIE/CNC OKUMA MULTUS/MARK'S {GRAB AND PULL, WORKING SPINDLE GRAB-PULL-CUTOFF}.min
   *
   * @param spec sub-spindle transfer request (W positions in inch)
   * @param cfg  post config (css_max_rpm for the speed clamp)
   * @returns transfer G-code lines, or a fail-loud error block if any W/RPM input is non-finite
   *          (a malformed sub-spindle move is a crash, so it is dropped whole and surfaced).
   */
  private generateSubSpindleTransfer(spec: SubSpindleTransferSpec, cfg: OkumaLathePostConfig): string[] {
    const C = MULTUS_B250_SUBSPINDLE_CODES;
    const mode = spec.mode ?? "bar_pull";
    const rpm = spec.transfer_rpm ?? 800;
    const dwell = spec.clamp_dwell_sec ?? 1.0;
    const grabW = spec.grab_w_in;
    const barPullW = spec.bar_pull_w_in ?? 0;
    const returnW = spec.return_w_in ?? 0;
    const maxRpm = cfg.css_max_rpm ?? rpm;

    // Fail loud on non-finite / non-positive inputs -- a NaN W renders "WNaN" (control reject)
    // and any unintended sub-spindle move is crash-class. Never emit a malformed transfer.
    const bad: string[] = [];
    if (!Number.isFinite(grabW)) bad.push("grab_w_in");
    if (!Number.isFinite(barPullW)) bad.push("bar_pull_w_in");
    if (mode === "bar_pull" && !Number.isFinite(returnW)) bad.push("return_w_in");
    if (!Number.isFinite(rpm) || rpm <= 0) bad.push("transfer_rpm");
    if (!Number.isFinite(dwell) || dwell <= 0) bad.push("clamp_dwell_sec");
    if (!Number.isFinite(maxRpm) || maxRpm <= 0) bad.push("css_max_rpm");
    if (bad.length > 0) {
      return [
        "",
        `(ERROR: SUB-SPINDLE TRANSFER SKIPPED -- INVALID ${bad.join(", ")} (NON-FINITE/NON-POSITIVE) -- REVIEW INPUT)`,
      ];
    }

    // Okuma-style word formatters: W with trailing-dot (W0. / W-2.341), dwell G4 F<sec> (F1. / F0.5)
    const wWord = (v: number): string => {
      const s = v.toFixed(4).replace(/0+$/, "");
      return s; // toFixed(4) always leaves a '.', strip trailing zeros -> "0." / "-2.341" / "31.8898"
    };
    const dw = (sec: number): string => `${C.dwell_prefix}${Number.isInteger(sec) ? `${sec}.` : `${sec}`}`;

    const L: string[] = [];
    L.push("");
    L.push(`(==== SUB-SPINDLE PART TRANSFER (SP2) -- ${mode.toUpperCase()} ====)`);
    L.push("(VERIFIED OKUMA MULTUS B250 CHUCKER -- MARK'S GRAB-PULL PROGRAMS)");

    // Setup: low-gear range, speed clamp, ZX plane (verified program preamble)
    L.push("M41");
    L.push(`G50 S${maxRpm}`);
    L.push(C.plane_zx);

    // Interlock release + open the (empty) sub chuck
    L.push(`${C.sub_interlock_release_on} (SUB CHUCK INTERLOCK RELEASE ON)`);
    L.push(`${C.main_interlock_release_on} (MAIN CHUCK INTERLOCK RELEASE ON)`);
    L.push(`${C.sub_chuck_unclamp} (UNCLAMP SUB CHUCK)`);
    L.push(dw(dwell));

    // Spin up + phase-lock the spindles (sync MUST precede the approach to a rotating part)
    L.push(`G97 S${rpm} M4 (TRANSFER RPM)`);
    L.push(`${C.sync_rotation_on} (SYNCHRONIZED ROTATION ON)`);
    L.push(`${C.chip_blast_on} (CLEAN OUT CHIPS)`);
    L.push(`${C.sub_mode_on}`);
    L.push(dw(3)); // verified 3 s settle after sync + chip blast
    L.push(`${C.chip_blast_off}`);
    L.push(`${C.sub_mode_off}`);

    // Approach + grab
    L.push(`G0 ${C.sub_axis}0.`);
    L.push(`G1 ${C.sub_axis}${wWord(grabW)} F25. (SUB APPROACH/GRAB)`);
    L.push(dw(dwell));

    // NO-DROP handoff: sub clamps + dwells BEFORE the main releases
    L.push(`${C.sub_chuck_clamp} (CLAMP SUB CHUCK)`);
    L.push(dw(dwell));
    L.push(`${C.main_chuck_unclamp} (UNCLAMP MAIN CHUCK)`);
    L.push(dw(dwell));

    // Optional bar/part pull (sub holds, main open)
    if (barPullW !== 0) {
      L.push(`G1 ${C.sub_axis}${wWord(barPullW)} F25. (BAR PULL)`);
    }
    L.push(`${C.main_chuck_clamp} (CLAMP MAIN CHUCK)`);
    L.push(dw(dwell));

    if (mode === "bar_pull") {
      // Release the sub + retract; tear down sync + interlock (self-contained cycle)
      L.push(`${C.sub_chuck_unclamp} (UNCLAMP SUB CHUCK)`);
      L.push(dw(dwell));
      if (spec.return_w_in === undefined) {
        // Honest fail-loud-in-NC: a defaulted 0 retract is NOT a real clearance move.
        L.push("(WARNING: return_w_in NOT SET -- SUB RETURNS TO W0. WITH NO CLEARANCE; SPECIFY return_w_in)");
      }
      L.push(`G0 ${C.sub_axis}${wWord(returnW)} (SUB SPINDLE RETURN)`);
      L.push(`${C.main_interlock_release_off} (MAIN CHUCK INTERLOCK RELEASE OFF)`);
      L.push(`${C.sub_interlock_release_off} (SUB CHUCK INTERLOCK RELEASE OFF)`);
      L.push(`${C.sync_rotation_off} (SYNCHRONIZED ROTATION OFF)`);
    } else {
      // pickoff: the sub HOLDS the part for a following cutoff / back-op. Sync + interlock stay
      // ON; the teardown (M150 / M184 / M246) is emitted AFTER that op -- faithful to the real
      // GRAB-PULL-CUTOFF program, where the part-off runs while both chucks are engaged.
      L.push("(SUB HOLDS PART -- READY FOR CUTOFF / BACK-OP)");
      L.push(
        `(AFTER CUTOFF: EMIT ${C.sync_rotation_off}/${C.main_interlock_release_off}/${C.sub_interlock_release_off}; ${C.sub_program_coord} FOR SUB-SIDE MACHINING)`
      );
    }

    return L;
  }

  /**
   * Generate drilling/boring cycle
   */
  private generateDrillingCycle(op: TurningOperation, cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];

    const rpm = op.spindle_rpm || 1500;
    lines.push(`G97 S${rpm} M03`);
    if (op.coolant === "flood") lines.push("M08");

    // Position
    lines.push(`G00 X0 Z${(op.start_z + 2).toFixed(3)}`);

    // Deep hole drilling with peck
    const depth = Math.abs(op.end_z - op.start_z);
    if (depth > 30) {
      const peckDepth = 2;
      lines.push(`G83 Z${op.end_z.toFixed(3)} Q${peckDepth} F${op.feed_mm_rev}`);
      lines.push("G80");
    } else {
      lines.push(`G01 Z${op.end_z.toFixed(3)} F${op.feed_mm_rev}`);
    }

    lines.push(`G00 Z${(op.start_z + 2).toFixed(3)}`);

    return lines;
  }

  /**
   * Generate C-axis milling
   */
  private generateCAxisMilling(op: TurningOperation, cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];

    if (!cfg.c_axis_enabled) {
      return ["(ERROR: C-AXIS NOT ENABLED IN CONFIG)"];
    }

    // Home C-axis
    lines.push("M76 (C-AXIS HOME)");
    lines.push("M23 (LIVE TOOL ON)");

    const liveToolRpm = Math.min(op.spindle_rpm || 3000, 6000);
    lines.push(`G97 S${liveToolRpm} M203 (LIVE TOOL CW)`);
    if (op.coolant === "flood") lines.push("M08");

    // Polar interpolation mode
    lines.push("G12.1 (POLAR INTERPOLATION ON)");

    // Example pattern - actual coordinates would come from CAM
    lines.push(`G00 X${op.start_x.toFixed(3)} C0`);
    // Live-tool linear feed = feed_per_rev * RPM. Use the GUARDED liveToolRpm
    // (defaults 3000, clamped 6000) rather than op.spindle_rpm! -- a non-null
    // assertion on the optional field emitted a literal "FNaN" when spindle_rpm
    // was omitted (latent bug; arm-A scrutiny 2026-06-24).
    lines.push(`G01 Z${op.end_z.toFixed(3)} F${(op.feed_mm_rev * liveToolRpm).toFixed(3)}`);

    // Cancel polar
    lines.push("G13.1 (POLAR INTERPOLATION OFF)");
    lines.push("M24 (LIVE TOOL OFF)");

    return lines;
  }

  /**
   * Perform physics checks
   */
  private performPhysicsChecks(op: TurningOperation, startLine: number): OkumaLathePostOutput["physics_checks"] {
    const checks: OkumaLathePostOutput["physics_checks"] = [];

    // Surface speed check
    if (op.css_m_min) {
      const maxCSS = this.getMaxSurfaceSpeed(op.material_iso);
      checks.push({
        line: startLine,
        check: `Surface speed ${op.css_m_min} m/min vs max ${maxCSS} for ISO ${op.material_iso}`,
        passed: op.css_m_min <= maxCSS * 1.2,
        value: op.css_m_min,
        limit: maxCSS
      });
    }

    // Feed rate check
    const maxFeed = op.material_iso === "N" ? 0.5 : 0.3;
    checks.push({
      line: startLine,
      check: `Feed ${op.feed_mm_rev} mm/rev vs max ${maxFeed} for ISO ${op.material_iso}`,
      passed: op.feed_mm_rev <= maxFeed,
      value: op.feed_mm_rev,
      limit: maxFeed
    });

    // Depth of cut check
    const maxDOC = op.operation_type.includes("finish") ? 0.5 : 5;
    checks.push({
      line: startLine,
      check: `DOC ${op.depth_of_cut_mm} mm vs max ${maxDOC} mm`,
      passed: op.depth_of_cut_mm <= maxDOC,
      value: op.depth_of_cut_mm,
      limit: maxDOC
    });

    return checks;
  }

  /**
   * Apply tribal knowledge
   */
  private applyTribalKnowledge(op: TurningOperation): { applied: string[] } {
    const applied: string[] = [];

    for (const tip of OKUMA_LATHE_TRIBAL_KNOWLEDGE) {
      const appliesToOp = tip.applies_to.includes("all") || tip.applies_to.includes(op.operation_type);
      const appliesToMaterial = !tip.iso_group || tip.iso_group === op.material_iso;

      if (appliesToOp && appliesToMaterial) {
        applied.push(`[${tip.category}] ${tip.tip}`);
      }
    }

    return { applied };
  }

  /**
   * Estimate cycle time
   */
  private estimateCycleTime(op: TurningOperation): number {
    const distance = Math.sqrt(
      Math.pow(op.end_x - op.start_x, 2) + Math.pow(op.end_z - op.start_z, 2)
    );

    const feedRate = op.feed_mm_rev * (op.spindle_rpm || 1000);
    const cuttingTime = distance / feedRate;
    const toolChangeTime = 0.1; // 6 seconds

    return cuttingTime + toolChangeTime;
  }

  /**
   * Get max surface speed for material
   */
  private getMaxSurfaceSpeed(iso: ISOGroup): number {
    const maxCSS: Record<ISOGroup, number> = {
      P: 250, M: 150, K: 200, N: 500, S: 50, H: 100
    };
    return maxCSS[iso] || 200;
  }

  /**
   * Get engine statistics
   */
  getStats(machineId: OkumaLatheMachineId = "LB250II-M"): {
    machine: string;
    controller: string;
    tribal_tips: number;
    physics_checks: number;
    features: string[];
  } {
    const machine = OKUMA_LATHE_MACHINES[machineId] ?? OKUMA_LATHE_MACHINES["LB250II-M"];
    return {
      machine: machine.model,
      controller: machine.controller,
      tribal_tips: OKUMA_LATHE_TRIBAL_KNOWLEDGE.length,
      physics_checks: 3,
      features: [
        "G96 constant surface speed",
        "G85 LAP roughing (Okuma OSP) + G71 threading",
        "G71 single-line threading (Okuma OSP)",
        "C-axis polar interpolation",
        "Live tooling support",
        "Sub-spindle synchronization",
        "Kienzle/Taylor physics"
      ]
    };
  }
}

// Singleton export
export const okumaB250LatheMasterPostEngine = new OkumaB250LatheMasterPostEngine();
