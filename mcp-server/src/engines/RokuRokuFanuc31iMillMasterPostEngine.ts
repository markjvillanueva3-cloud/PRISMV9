/**
 * RokuRokuFanuc31iMillMasterPostEngine -- full PRISM master post for the JM Die
 * Roku-Roku HC 658-II high-speed mill (FANUC 31i-B5 control). slot:echo,
 * U-PP-ROKUROKU-ENGINE (2026-06-25).
 *
 * WHY: VMC-05 (Roku-Roku HC 658-II) was the ONLY JM machine with NEITHER track --
 * `master_post_by_machine` else-REJECTED it (no engine, no route). This is the
 * full-post sibling of HurcoV11/OkumaOSP/HaasNGC, routed by the same dispatcher.
 *
 * RELATION TO HaasNGCMillMasterPostEngine (the template, R8/R13): ~90% of a Haas-NGC
 * mill program is UNIVERSAL ISO/Fanuc and transfers verbatim (safe-start
 * `G0 G17 G40 G49 G80 G90`, tool-change `T# M6`, `G43 H# Z`, G0/G1/G2/G3 with the
 * Fanuc I/J/R arc convention, canned cycles G81/G82/G83/G73/G84/G85, `G91 G28 Z0.`
 * retract, M5/G28/M30 footer). This engine is a faithful clone of that PROVEN,
 * ground-truth-verified emit, with FIVE deliberate FANUC-31i deltas:
 *   1. Header identity -- (MACHINE: ROKU-ROKU HC 658-II) + (CONTROL: FANUC 31i-B5).
 *   2. High-speed smoothing -- Fanuc `G05.1 Q1` AICC-II / nano look-ahead (opt-in via
 *      config.use_lookahead), with `G05.1 Q0` cancel before M30 -- NOT Haas G187.
 *      Default OFF (mirrors HaasNGC's conservative use_g187 default; the golden /
 *      operator enables it). Source: knowledge/wiki/post-processor/post-processor-foundations.md
 *      ("Fanuc G05.1 Q1 look-ahead method") -- a verified public-domain method, not a manual.
 *   3. Dialect tag -- controller:"fanuc", dialect:"fanuc-31i".
 *   4. Machine envelope -- the HC 658-II is a high-speed graphite/hard-mill; its spindle
 *      datasheet max RPM / force are NOT fabricated (R12). The RPM/force advisory checks
 *      run ONLY when the caller supplies max_rpm / max_force_n; absent => the check is
 *      skipped (no invented limit). Chip-load + Taylor life use the canonical, machine-
 *      independent material constants.
 *   5. Through-spindle coolant -- the Roku-Roku TSC M-code is not verified, so coolant:"tsc"
 *      falls back to M8 (flood) + warns rather than emit an unverified M-code (R12).
 *
 * Comment delimiter is `()` (Fanuc family), N-numbered blocks step-2, UNITS-FIRST
 * (G20 inch -- JM convention / G21 mm), Kienzle/Taylor constants IMPORTED from
 * canonical physics/constants.ts (never inlined). Feed/speed taken as supplied
 * (oscar SFC owns optimization upstream).
 */
import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";
// Reuse the shared mill-operation + drill-cycle CONTRACT (structural corpus shape,
// not Haas-specific -- see the HaasNGC interface comment "shared corpus MillOperation").
import type { HaasMillOperation, HaasDrillCycle } from "./HaasNGCMillMasterPostEngine.js";

export type FanucMillOperation = HaasMillOperation;
export type FanucDrillCycle = HaasDrillCycle;

export interface RokuRokuPostConfig {
  program_number: number;
  program_comment: string;
  /** Output units. JM convention is INCH; corpus jobs may pass metric. UNITS FIRST. */
  units: "inch" | "metric";
  /** Work offset 54..59 -> G54..G59. */
  work_offset: number;
  /** Safe Z retract plane (in the program's units). */
  safe_z: number;
  /** Default coolant when an op does not specify one. */
  coolant_mode: "flood" | "mist" | "tsc" | "off";
  /** Emit N-numbered blocks (step 2). Default true. */
  emit_block_numbers: boolean;
  /** Emit Fanuc G05.1 Q1 AICC-II / nano look-ahead (high-speed). Default false -- opt-in. */
  use_lookahead: boolean;
  /** Emit M01 optional-stops between operations. Default true. */
  optional_stops: boolean;
  /** Emit a setup-sheet object in the output. Default true. */
  emit_setup_sheet: boolean;
  /** Advisory spindle-RPM ceiling for the RPM check. Omit => the RPM check is skipped (no fabricated limit). */
  max_rpm?: number;
  /** Advisory cutting-force ceiling (N) for the force check. Omit => the force check is skipped. */
  max_force_n?: number;
}

export interface RokuRokuPhysicsCheck {
  op: number;
  check: string;
  passed: boolean;
  value: number;
  limit: number | null;
}

export interface RokuRokuSetupSheet {
  program_number: number;
  units: "inch" | "metric";
  tools: Array<{ tool_number: number; description: string; diameter_mm: number }>;
  operations: Array<{ index: number; operation_type: string; tool_number: number }>;
}

export interface RokuRokuPostOutput {
  success: boolean;
  gcode: string[];
  warnings: string[];
  physics_checks: RokuRokuPhysicsCheck[];
  tools_used: number[];
  tribal_tips_applied: string[];
  estimated_time_min: number;
  controller: "fanuc";
  dialect: "fanuc-31i";
  setup_sheet?: RokuRokuSetupSheet;
  error?: string;
}

/** Work-offset number (54..59) -> Gxx code; clamps out-of-range to G54 with no throw. */
function workOffsetCode(n: number): string {
  const wo = Number.isInteger(n) && n >= 54 && n <= 59 ? n : 54;
  return `G${wo}`;
}

export class RokuRokuFanuc31iMillMasterPostEngine {
  /** Chip-load guideline floor (mm/tooth) -- machine-independent guideline, not a datasheet value. */
  private static readonly FZ_MIN = 0.02;
  /** Taylor target tool life (min) -- advisory guideline. */
  private static readonly TAYLOR_TARGET_LIFE_MIN = 15;

  private readonly defaultConfig: RokuRokuPostConfig = {
    program_number: 1,
    program_comment: "PRISM GENERATED",
    units: "inch",
    work_offset: 54,
    safe_z: 2.5,
    coolant_mode: "flood",
    emit_block_numbers: true,
    use_lookahead: false,
    optional_stops: true,
    emit_setup_sheet: true,
  };

  /** Canned-cycle type -> universal ISO/Fanuc G-code (Roku-Roku Fanuc 31i uses these natively). */
  private static readonly CYCLE_GCODE: Record<FanucDrillCycle["type"], string> = {
    drill: "G81", dwell: "G82", peck: "G83", chip_break: "G73", tap: "G84", bore: "G85",
  };

  /**
   * Generate a complete Roku-Roku Fanuc-31i mill program from an ordered operation list.
   * Returns a structured RokuRokuPostOutput. On a fatal input error returns
   * `{success:false, error, gcode:[]}` (structured errors, never throw on bad input).
   */
  generateProgram(operations: FanucMillOperation[], config?: Partial<RokuRokuPostConfig>): RokuRokuPostOutput {
    const cfg = { ...this.defaultConfig, ...config };
    const warnings: string[] = [];
    const physicsChecks: RokuRokuPhysicsCheck[] = [];
    const tribalTipsApplied: string[] = [];
    const toolsUsed = new Set<number>();
    let estimatedTime = 0;

    if (!Array.isArray(operations) || operations.length === 0) {
      return {
        success: false, gcode: [], warnings: ["no operations supplied"], physics_checks: [],
        tools_used: [], tribal_tips_applied: [], estimated_time_min: 0, controller: "fanuc", dialect: "fanuc-31i",
        error: "Roku-Roku Fanuc-31i post: operations[] is empty -- nothing to emit",
      };
    }

    const unitsCode = cfg.units === "metric" ? "G21" : "G20";
    const woCode = workOffsetCode(cfg.work_offset);
    // UNITS-FIRST (load-bearing): the engine is mm-native (corpus contract). In INCH output (G20)
    // EVERY geometry value + feed MUST be scaled mm->inch, else the control reads mm magnitudes as
    // inches: a 25.4x scale error (scrap/crash).
    const scale = cfg.units === "inch" ? 1 / 25.4 : 1;
    const geoDp = cfg.units === "inch" ? 4 : 3;
    const fmt = (v: number) => (v * scale).toFixed(geoDp);
    const fmtFeed = (f: number): string | null =>
      Number.isFinite(f) && f > 0 ? (f * scale).toFixed(cfg.units === "inch" ? 2 : 0) : null;

    log.info(`[RokuRoku] Generating O${cfg.program_number} -- ${operations.length} ops, ${cfg.units}, ${woCode}`);

    // -- Block emitter: command lines get an N-number (step 2); comments are raw. --
    const gcode: string[] = [];
    let nseq = 1;
    const cmt = (s: string) => gcode.push(s);
    const cmd = (s: string) => {
      gcode.push(cfg.emit_block_numbers ? `N${nseq} ${s}` : s);
      nseq += 2;
    };

    // -- Header (Fanuc-family () comments) -- DELTA 1: Roku-Roku identity --
    cmt("%");
    cmt(`O${cfg.program_number}`);
    cmt(`(${cfg.program_comment})`);
    cmt("(MACHINE: ROKU-ROKU HC 658-II)");
    cmt("(CONTROL: FANUC 31i-B5)");
    cmt(`(MATERIAL - ISO ${operations[0].material_iso})`);
    const toolList = new Map<number, FanucMillOperation>();
    for (const op of operations) if (!toolList.has(op.tool_number)) toolList.set(op.tool_number, op);
    for (const tn of [...toolList.keys()].sort((a, b) => a - b)) {
      const op = toolList.get(tn)!;
      const desc = op.tool_description ?? `${op.operation_type.toUpperCase()} TOOL`;
      const diaIn = cfg.units === "metric" ? op.tool_diameter_mm : op.tool_diameter_mm / 25.4;
      cmt(`(T${tn}|${desc}|H${tn}|D${tn}|TOOL DIA. - ${diaIn.toFixed(4)})`);
    }

    // -- Safe start (universal ISO) --
    cmd(unitsCode);
    cmd("G0 G17 G40 G49 G80 G90");

    // -- Per operation --
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      toolsUsed.add(op.tool_number);

      if (cfg.optional_stops && i > 0) cmd("M01");
      cmt(`(OPERATION ${i + 1}: ${op.operation_type.toUpperCase()})`);

      const checks = this.physicsChecks(op, i + 1, cfg);
      physicsChecks.push(...checks);
      for (const c of checks) if (!c.passed) warnings.push(`Op ${i + 1}: ${c.check}`);

      const desc = op.tool_description ?? `${op.operation_type.toUpperCase()} TOOL`;
      cmd(`T${op.tool_number} M6 (${desc})`);

      // First XY (rapid-preferring) + work offset + spindle on (combined block).
      const first = op.coordinates.find((c) => c.type === "rapid") ?? op.coordinates[0];
      if (!Number.isFinite(first?.x) || !Number.isFinite(first?.y)) {
        warnings.push(`Op ${i + 1}: first move missing/non-finite XY -- defaulted to 0,0 (verify no rapid through the part/fixture)`);
      }
      const firstX = Number.isFinite(first?.x) ? (first as { x: number }).x : 0;
      const firstY = Number.isFinite(first?.y) ? (first as { y: number }).y : 0;
      cmd(`G0 G90 ${woCode} X${fmt(firstX)} Y${fmt(firstY)} S${op.spindle_rpm} M3`);

      // DELTA 2: Fanuc G05.1 Q1 AICC-II / nano look-ahead (opt-in) -- after spindle, before G43.
      if (cfg.use_lookahead) cmd("G05.1 Q1 (AICC II LOOK-AHEAD)");

      cmd(`G43 H${op.tool_number} Z${fmt(cfg.safe_z)}`);

      // Coolant (after spindle/G43, per-tool). DELTA 5: TSC unverified -> fall back to flood.
      let coolant = op.coolant ?? cfg.coolant_mode;
      if (coolant === "tsc") {
        warnings.push(`Op ${i + 1}: through-spindle-coolant (TSC) M-code is not verified for the Roku-Roku -- emitted M8 (flood); confirm the TSC M-code before use`);
        coolant = "flood";
      }
      const coolantOn = coolant === "flood" || coolant === "mist";
      if (coolant === "flood") cmd("M8");
      else if (coolant === "mist") cmd("M7");

      if (op.axial_depth_mm > op.tool_diameter_mm * 0.5) {
        tribalTipsApplied.push(`Op ${i + 1}: heavy axial cut (ap>${(op.tool_diameter_mm * 0.5).toFixed(2)}mm) -- verify rigidity/coolant`);
      }

      const opWarn = (m: string) => warnings.push(`Op ${i + 1}: ${m}`);
      if (op.cycle) this.emitCannedCycle(op, cmd, fmt, fmtFeed, opWarn);
      else this.emitToolpath(op, cmd, fmt, fmtFeed, opWarn);

      cmd("M5");
      if (coolantOn) cmd("G91 G28 Z0. M9");
      else cmd("G91 G28 Z0.");

      estimatedTime += this.estimateCycleTime(op);
    }

    // -- Footer -- DELTA 2 cont.: cancel look-ahead before program end --
    cmt("(END OF PROGRAM)");
    if (cfg.use_lookahead) cmd("G05.1 Q0 (LOOK-AHEAD CANCEL)");
    cmd("M5");
    cmd("G91 G28 Z0.");
    cmd("G28 X0. Y0.");
    cmd("M30");
    cmt("%");

    let setupSheet: RokuRokuSetupSheet | undefined;
    if (cfg.emit_setup_sheet) {
      setupSheet = {
        program_number: cfg.program_number,
        units: cfg.units,
        tools: [...toolList.keys()].sort((a, b) => a - b).map((tn) => {
          const op = toolList.get(tn)!;
          return { tool_number: tn, description: op.tool_description ?? `${op.operation_type.toUpperCase()} TOOL`, diameter_mm: op.tool_diameter_mm };
        }),
        operations: operations.map((op, i) => ({ index: i + 1, operation_type: op.operation_type, tool_number: op.tool_number })),
      };
    }

    return {
      success: true,
      gcode,
      warnings,
      physics_checks: physicsChecks,
      tools_used: [...toolsUsed].sort((a, b) => a - b),
      tribal_tips_applied: tribalTipsApplied,
      estimated_time_min: Math.round(estimatedTime * 100) / 100,
      controller: "fanuc",
      dialect: "fanuc-31i",
      setup_sheet: setupSheet,
    };
  }

  /**
   * Emit coordinate moves (G0 rapid / G1 linear / G2 cw / G3 ccw). Arc I/J are INCREMENTAL
   * offsets from the current point to the arc centre (Fanuc convention -- native to the 31i).
   * A non-finite feed is emitted as a loudly-flagged token (never "FInfinity") and warned (R12).
   */
  private emitToolpath(
    op: FanucMillOperation,
    cmd: (s: string) => void,
    fmt: (v: number) => string,
    fmtFeed: (f: number) => string | null,
    warn: (m: string) => void,
  ): void {
    const fStr = fmtFeed(op.feed_mm_min);
    if (fStr === null) warn(`non-finite/invalid feed_mm_min=${op.feed_mm_min} -- emitted a flagged F token for operator review`);
    const feedTok = fStr !== null ? ` F${fStr}` : " F1 (INVALID FEED - REVIEW)";
    for (let i = 0; i < op.coordinates.length; i++) {
      const c = op.coordinates[i];
      // Guard non-finite X/Y -- a NaN/Infinity target would emit a literal "XNaN" the control rejects.
      // Skip + flag rather than emit a bad move or silently rapid to a wrong default (R12).
      if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) {
        warn(`move ${i} has non-finite XY (${c.x},${c.y}) -- skipped to avoid a literal XNaN/YNaN the control would reject`);
        continue;
      }
      const arc = op.arc_data?.[i];
      const z = c.z !== undefined && Number.isFinite(c.z) ? ` Z${fmt(c.z)}` : "";
      switch (c.type) {
        case "rapid":
          cmd(`G0 X${fmt(c.x)} Y${fmt(c.y)}${z}`);
          break;
        case "linear":
          cmd(`G1 X${fmt(c.x)} Y${fmt(c.y)}${z}${feedTok}`);
          break;
        case "arc_cw":
        case "arc_ccw": {
          const g = c.type === "arc_cw" ? "G2" : "G3";
          let line = `${g} X${fmt(c.x)} Y${fmt(c.y)}`;
          if (arc?.r !== undefined) line += ` R${fmt(arc.r)}`;
          else if (arc?.i !== undefined && arc?.j !== undefined) line += ` I${fmt(arc.i)} J${fmt(arc.j)}`;
          else { warn(`arc move ${i} has no R or I/J centre -- the control will alarm; emitted flagged`); line += " (NO I/J/R - REVIEW)"; }
          line += feedTok;
          cmd(line);
          break;
        }
        default:
          cmd(`G1 X${fmt(c.x)} Y${fmt(c.y)}${z}${feedTok} (UNKNOWN MOVE TYPE '${c.type}')`);
      }
    }
  }

  /**
   * Emit a modal drilling canned cycle from op.cycle + coordinates[] hole XYs:
   *   {G98|G99} G8x Z{depth} R{retract} [Q{peck}] [P{dwell}] F{feed}   <- first hole (bare; XY by approach)
   *   X.. Y..                                                          <- each subsequent hole
   *   G80                                                              <- cancel
   * Fail-loud (R12): 0 holes -> warn + nothing; missing depth/retract -> warn + long-hand move list;
   * peck/dwell missing Q/P -> warn + downgrade to G81; bad feed -> flagged F token.
   * NOTE Fanuc rigid tapping: a Fanuc-31i G84 rigid tap is activated by M29 S<rpm> BEFORE the cycle.
   * This engine emits a BARE G84 (matching the JM corpus convention) and WARNS that the caller must
   * supply rigid-tap activation if the machine is not in a persistent rigid-tap mode -- it does NOT
   * fabricate an M29 line whose semantics differ per control setup (R12).
   */
  private emitCannedCycle(
    op: FanucMillOperation,
    cmd: (s: string) => void,
    fmt: (v: number) => string,
    fmtFeed: (f: number) => string | null,
    warn: (m: string) => void,
  ): void {
    const cyc = op.cycle!;
    const holes = op.coordinates.filter((c) => Number.isFinite(c.x) && Number.isFinite(c.y));
    if (holes.length === 0) { warn(`canned cycle (${cyc.type}) has no valid hole XY positions -- emitted nothing`); return; }
    if (!Number.isFinite(cyc.depth_mm) || !Number.isFinite(cyc.retract_mm)) {
      warn(`canned cycle (${cyc.type}) has non-finite depth_mm/retract_mm -- fell back to the long-hand move list`);
      this.emitToolpath(op, cmd, fmt, fmtFeed, warn);
      return;
    }
    if (cyc.depth_mm >= cyc.retract_mm) warn(`canned cycle depth_mm (${cyc.depth_mm}) is not below retract_mm (${cyc.retract_mm}) -- inverted/no-cut geometry, verify the Z/R signs`);
    if (cyc.retract_mm <= 0) warn(`canned cycle retract_mm (${cyc.retract_mm}) is not a positive R-plane above the part top -- verify the clearance`);

    const approachFirst = op.coordinates.find((c) => c.type === "rapid") ?? op.coordinates[0];
    if (approachFirst && (fmt(approachFirst.x) !== fmt(holes[0].x) || fmt(approachFirst.y) !== fmt(holes[0].y))) {
      warn(`canned cycle: the approach positions to (${approachFirst.x},${approachFirst.y}) but the first hole is (${holes[0].x},${holes[0].y}) -- order the holes drilling-first (no leading rapid) so the bare cycle drills the right point`);
    }

    let type: FanucDrillCycle["type"] = cyc.type;
    const hasPeck = Number.isFinite(cyc.peck_mm) && (cyc.peck_mm as number) > 0;
    const hasDwell = Number.isFinite(cyc.dwell_s) && (cyc.dwell_s as number) > 0;
    if ((type === "peck" || type === "chip_break") && !hasPeck) {
      warn(`${type} cycle needs a positive peck_mm (Q) -- downgraded to G81 simple drill`); type = "drill";
    } else if (type === "dwell" && !hasDwell) {
      warn(`dwell cycle needs a positive dwell_s (P) -- downgraded to G81 simple drill`); type = "drill";
    }
    let g = RokuRokuFanuc31iMillMasterPostEngine.CYCLE_GCODE[type];
    if (!g) { warn(`unknown cycle type '${cyc.type}' -- using G81 simple drill`); g = "G81"; }

    if (type === "tap") {
      warn("tap (G84): emitted a BARE cycle -- a Fanuc 31i rigid tap needs M29 S<rpm> activation if not in a persistent rigid-tap mode; the caller owns rigid-tap activation + the pitch*rpm feed");
    }

    const retractG = cyc.retract_mode === "initial" ? "G98" : "G99";
    const fStr = fmtFeed(op.feed_mm_min);
    if (fStr === null) warn(`canned cycle has non-finite/invalid feed_mm_min=${op.feed_mm_min} -- emitted a flagged F token for operator review`);
    const feedTok = fStr !== null ? `F${fStr}` : "F1 (INVALID FEED - REVIEW)";

    let firstLine = `${retractG} ${g} Z${fmt(cyc.depth_mm)} R${fmt(cyc.retract_mm)}`;
    if (type === "peck" || type === "chip_break") firstLine += ` Q${fmt(cyc.peck_mm as number)}`;
    if (type === "dwell") firstLine += ` P${(cyc.dwell_s as number).toFixed(2)}`;
    firstLine += ` ${feedTok}`;
    cmd(firstLine);

    for (let i = 1; i < holes.length; i++) cmd(`X${fmt(holes[i].x)} Y${fmt(holes[i].y)}`);
    cmd("G80");
  }

  /**
   * Physics safety checks (canonical Kienzle Fc + Taylor life + chip-load; RPM/force only when the
   * caller supplies an envelope limit -- no fabricated Roku-Roku datasheet value, R12). Out-of-envelope
   * values surface as failed checks -> warnings, never silently passed.
   */
  private physicsChecks(op: FanucMillOperation, opIndex: number, cfg: RokuRokuPostConfig): RokuRokuPhysicsCheck[] {
    const checks: RokuRokuPhysicsCheck[] = [];
    const k = CANONICAL_KIENZLE[op.material_iso];
    const taylor = CANONICAL_TAYLOR[op.material_iso];

    const fz = op.feed_mm_min / Math.max(op.spindle_rpm * op.tool_flutes, 1e-6);
    const fzMax = op.material_iso === "N" ? 0.25 : 0.15;
    checks.push({ op: opIndex, check: `chip load ${fz.toFixed(3)} mm/tooth (range ${RokuRokuFanuc31iMillMasterPostEngine.FZ_MIN}-${fzMax})`,
      passed: fz >= RokuRokuFanuc31iMillMasterPostEngine.FZ_MIN && fz <= fzMax, value: fz, limit: fzMax });

    const Fc = k ? k.kc1_1 * op.axial_depth_mm * Math.pow(Math.max(fz, 1e-6), 1 - k.mc) : 0;
    if (cfg.max_force_n !== undefined) {
      checks.push({ op: opIndex, check: `cutting force ${Fc.toFixed(0)} N vs supplied limit ${cfg.max_force_n} N (kc1_1=${k?.kc1_1}, mc=${k?.mc})`,
        passed: Fc <= cfg.max_force_n, value: Fc, limit: cfg.max_force_n });
    }

    if (cfg.max_rpm !== undefined) {
      checks.push({ op: opIndex, check: `spindle ${op.spindle_rpm} RPM vs supplied limit ${cfg.max_rpm} RPM`,
        passed: op.spindle_rpm <= cfg.max_rpm, value: op.spindle_rpm, limit: cfg.max_rpm });
    }

    const Vc = (Math.PI * op.tool_diameter_mm * op.spindle_rpm) / 1000;
    const T = taylor ? Math.pow(taylor.C / Math.max(Vc, 1e-6), 1 / taylor.n) : Infinity;
    checks.push({ op: opIndex, check: `Taylor tool life ${T.toFixed(1)} min vs target ${RokuRokuFanuc31iMillMasterPostEngine.TAYLOR_TARGET_LIFE_MIN} min (C=${taylor?.C}, n=${taylor?.n})`,
      passed: T >= RokuRokuFanuc31iMillMasterPostEngine.TAYLOR_TARGET_LIFE_MIN, value: T, limit: RokuRokuFanuc31iMillMasterPostEngine.TAYLOR_TARGET_LIFE_MIN });

    return checks;
  }

  /** Crude cycle-time estimate (min) from toolpath length / feed. Advisory only. */
  private estimateCycleTime(op: FanucMillOperation): number {
    let dist = 0;
    for (let i = 1; i < op.coordinates.length; i++) {
      const a = op.coordinates[i - 1], b = op.coordinates[i];
      dist += Math.hypot((b.x ?? 0) - (a.x ?? 0), (b.y ?? 0) - (a.y ?? 0), (b.z ?? 0) - (a.z ?? 0));
    }
    return op.feed_mm_min > 0 ? dist / op.feed_mm_min : 0;
  }
}

export const rokuRokuFanuc31iMillMasterPostEngine = new RokuRokuFanuc31iMillMasterPostEngine();
