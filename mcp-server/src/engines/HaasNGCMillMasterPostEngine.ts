/**
 * HaasNGCMillMasterPostEngine — full PRISM master post for Haas mill controls
 * (Next-Gen-Control + classic). slot:echo, POST-TRAIN-MS0/U-PT-HAAS-ENGINE (2026-06-01).
 *
 * WHY: closes condition-2's full-post-coverage GAP for Haas. JM Die VMC-03/04 (Haas mills)
 * had CHEAP `.cps` coverage only (proven 15/15 dialect-clean via cheap-cps-validate) and NO
 * PRISM full post — `master_post_by_machine` HARD-REJECTED Haas. This is the full-post sibling
 * of HurcoV11MillMasterPostEngine / OkumaOSPMillMasterPostEngine, routed by the same dispatcher.
 *
 * GROUND TRUTH: structure mirrors a REAL JM Die Haas mill program
 * (`JM DIE/CNC MILL HAAS/ALL STAR/ALL STAR.NC`, Mastercam-posted), not invented:
 *   %  /  O<num>  /  (comments)  /  (tool list)  /  N# G20|G21  /  N# G0 G17 G40 G49 G80 G90
 *   per op: T# M6 | G0 G90 G54 X.. Y.. S.. M3 | G43 H# Z.. | [M8] | moves | M5 | G91 G28 Z0. [M9] | M01
 *   footer: M5 | G91 G28 Z0. | G28 X0. Y0. | M30 | %
 *
 * HAAS DIALECT FACTS (the load-bearing differences from Hurco/Okuma):
 *   - `()` paren comments (Fanuc family) — NOT Okuma `[]`.
 *   - N-numbered blocks step-2 (N1, N3, N5…) — real JM Haas programs DO use them (unlike Hurco).
 *   - G187 P{1|2|3} high-speed smoothing is CORRECT for Haas NGC (the OPPOSITE of Hurco, where
 *     G187 is wrong → G05.3). Real older JM programs emit NO G187, so it is OFF by default and
 *     opt-in via config.use_g187 (NGC machines only). Emission dialect stays Haas regardless.
 *   - M08 flood coolant per-tool AFTER the spindle/G43 (mill ordering), M09 off at tool end.
 *   - UNITS FIRST: G20 (inch — JM Haas convention) / G21 (mm) from config.units. A units mismatch
 *     is a 25.4× scale error — never assumed.
 *
 * Physics constants (Kienzle/Taylor) imported from canonical `physics/constants.ts` — NEVER inlined.
 * Feed/speed are taken as supplied (SFC owns optimization upstream — see post-training-harness --from-sfc).
 */
import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";

/**
 * Drilling canned cycle (Fanuc/Haas family). When an op carries one, the post emits a modal canned
 * cycle (G81/G82/G83/G73/G84/G85 with a G98/G99 retract mode and a closing G80) using the op's
 * `coordinates[]` as the hole XY positions, INSTEAD of the long-hand G0/G1 move list. These are the
 * universal ISO/Fanuc canned-cycle G-codes Haas NGC uses natively — not vendor-proprietary.
 * Geometry (depth/retract/peck) is in mm like the rest of the engine; `fmt` scales it to output units.
 */
export interface HaasDrillCycle {
  /** drill→G81 · dwell/spot→G82 · peck→G83 (full retract) · chip_break→G73 (high-speed peck) · tap→G84 (bare — Haas is always rigid, NO M29) · bore→G85.
   *  For `tap`, the caller MUST set feed_mm_min = pitch × rpm (echo routes feed through oscar; this engine emits it verbatim). */
  type: "drill" | "dwell" | "peck" | "chip_break" | "tap" | "bore";
  /** Final hole depth — absolute Z in mm (negative below the part top). */
  depth_mm: number;
  /** R-plane clearance above the part top, mm (positive). */
  retract_mm: number;
  /** Q peck increment (mm) — REQUIRED for peck/chip_break; a missing/≤0 value downgrades to G81 + warns. */
  peck_mm?: number;
  /** P dwell at hole bottom, in SECONDS — REQUIRED for dwell; a missing/≤0 value downgrades to G81 + warns. */
  dwell_s?: number;
  /** G98 retract-to-initial-plane (default) | G99 retract-to-R-plane (faster between close holes). */
  retract_mode?: "initial" | "rplane";
}

/** One mill operation (structural match to the shared corpus MillOperation contract). */
export interface HaasMillOperation {
  operation_type: string;
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
  coordinates: Array<{ x: number; y: number; z?: number; type: string }>;
  arc_data?: Array<{ i?: number; j?: number; k?: number; r?: number }>;
  /** Optional drilling canned cycle. Present → emit a canned cycle from coordinates[] (additive; absent → move list). */
  cycle?: HaasDrillCycle;
}

export interface HaasPostConfig {
  program_number: number;
  program_comment: string;
  /** Output units. JM Haas convention is INCH; corpus jobs pass metric. UNITS FIRST. */
  units: "inch" | "metric";
  /** Work offset 54..59 → G54..G59. */
  work_offset: number;
  /** Safe Z retract plane (in the program's units). */
  safe_z: number;
  /** Default coolant when an op does not specify one. */
  coolant_mode: "flood" | "mist" | "tsc" | "off";
  /** Emit N-numbered blocks (step 2). Real JM Haas programs use them; default true. */
  emit_block_numbers: boolean;
  /** Emit G187 P# high-speed smoothing (NGC only). Default false — matches older JM baseline. */
  use_g187: boolean;
  /** Emit M01 optional-stops between operations (real JM Haas programs do). Default true. */
  optional_stops: boolean;
  /** Emit a setup-sheet object in the output. Default true. */
  emit_setup_sheet: boolean;
}

export interface HaasPhysicsCheck {
  op: number;
  check: string;
  passed: boolean;
  value: number;
  limit: number;
}

export interface HaasSetupSheet {
  program_number: number;
  units: "inch" | "metric";
  tools: Array<{ tool_number: number; description: string; diameter_mm: number }>;
  operations: Array<{ index: number; operation_type: string; tool_number: number }>;
}

export interface HaasPostOutput {
  success: boolean;
  gcode: string[];
  warnings: string[];
  physics_checks: HaasPhysicsCheck[];
  tools_used: number[];
  tribal_tips_applied: string[];
  estimated_time_min: number;
  controller: "haas";
  dialect: "haas";
  setup_sheet?: HaasSetupSheet;
  error?: string;
}

/** Map a work-offset index (54..59) to the G-code. Falls back to G54 for anything out of range. */
function workOffsetCode(index: number): string {
  const n = Number.isFinite(index) ? Math.trunc(index) : 54;
  return n >= 54 && n <= 59 ? `G${n}` : "G54";
}

/** Haas high-speed smoothing P-level by operation family (NGC G187). Finish = tightest. */
function smoothingP(operationType: string): number {
  const t = operationType.toLowerCase();
  if (/finish|contour|chamfer/.test(t)) return 3; // smoothest / most accurate
  if (/rough|pocket|adaptive|face/.test(t)) return 1; // fastest
  return 2; // default
}

export class HaasNGCMillMasterPostEngine {
  // Haas VF-2 machine envelope (JM VMC-03/04 class). Machine LIMITS, not material physics —
  // the canonical Kienzle/Taylor constants are imported; these are spindle/guideline bounds.
  private static readonly MAX_RPM = 8100;        // Haas VF-2 datasheet max spindle RPM (8.1k standard spindle)
  // Conservative ADVISORY de-rate, NOT a datasheet spindle-force max — a failed force check only WARNS,
  // it never blocks emission. A real VF-2 can pull more in a heavy steel cut; this flags review, not a hard stop.
  private static readonly MAX_FORCE_N = 2200;
  private static readonly FZ_MIN = 0.02;         // chip-load guideline floor (mm/tooth)
  private static readonly TAYLOR_TARGET_LIFE_MIN = 15;

  private readonly defaultConfig: HaasPostConfig = {
    program_number: 1,
    program_comment: "PRISM GENERATED",
    units: "inch",
    work_offset: 54,
    safe_z: 2.5,
    coolant_mode: "flood",
    emit_block_numbers: true,
    use_g187: false,
    optional_stops: true,
    emit_setup_sheet: true,
  };

  /**
   * Generate a complete Haas NGC mill program from an ordered operation list.
   * Returns a structured HaasPostOutput. On a fatal input error returns
   * `{success:false, error, gcode:[]}` (engines surface structured errors, never throw on bad input
   * per engines/CLAUDE.md edge rule) — EXCEPT a material/ISO mismatch, which is a programmer error
   * that must fail loud (R12).
   */
  generateProgram(operations: HaasMillOperation[], config?: Partial<HaasPostConfig>): HaasPostOutput {
    const cfg = { ...this.defaultConfig, ...config };
    const warnings: string[] = [];
    const physicsChecks: HaasPhysicsCheck[] = [];
    const tribalTipsApplied: string[] = [];
    const toolsUsed = new Set<number>();
    let estimatedTime = 0;

    if (!Array.isArray(operations) || operations.length === 0) {
      return {
        success: false, gcode: [], warnings: ["no operations supplied"], physics_checks: [],
        tools_used: [], tribal_tips_applied: [], estimated_time_min: 0, controller: "haas", dialect: "haas",
        error: "Haas NGC post: operations[] is empty — nothing to emit",
      };
    }

    const unitsCode = cfg.units === "metric" ? "G21" : "G20";
    const woCode = workOffsetCode(cfg.work_offset);
    // UNITS-FIRST (load-bearing safety): the engine is mm-native (corpus contract: feed_mm_min,
    // tool_diameter_mm, coordinates in mm). In INCH output (G20) EVERY geometry value + feed MUST be
    // scaled mm→inch — otherwise the control reads mm magnitudes as inches: a 25.4× scale error (scrap/crash).
    // fmt() scales+formats geometry; fmtFeed() scales feed AND guards non-finite/invalid feed (no "FInfinity").
    const scale = cfg.units === "inch" ? 1 / 25.4 : 1;
    const geoDp = cfg.units === "inch" ? 4 : 3;
    const fmt = (v: number) => (v * scale).toFixed(geoDp);
    const fmtFeed = (f: number): string | null =>
      Number.isFinite(f) && f > 0 ? (f * scale).toFixed(cfg.units === "inch" ? 2 : 0) : null;

    log.info(`[HaasNGC] Generating O${cfg.program_number} — ${operations.length} ops, ${cfg.units}, ${woCode}`);

    // ── Block emitter: command lines get an N-number (step 2); comments are raw. ──
    const gcode: string[] = [];
    let nseq = 1;
    const cmt = (s: string) => gcode.push(s);
    const cmd = (s: string) => {
      gcode.push(cfg.emit_block_numbers ? `N${nseq} ${s}` : s);
      nseq += 2;
    };

    // ── Header (ground truth: ALL STAR.NC) ──
    cmt("%");
    cmt(`O${cfg.program_number}`);
    cmt(`(${cfg.program_comment})`);
    cmt("(MACHINE: HAAS VF-2)");
    cmt(`(MATERIAL - ISO ${operations[0].material_iso})`);
    // Tool-list comments (dedup, sorted ascending) — operator reads these at setup.
    const toolList = new Map<number, HaasMillOperation>();
    for (const op of operations) if (!toolList.has(op.tool_number)) toolList.set(op.tool_number, op);
    for (const tn of [...toolList.keys()].sort((a, b) => a - b)) {
      const op = toolList.get(tn)!;
      const desc = op.tool_description ?? `${op.operation_type.toUpperCase()} TOOL`;
      const diaIn = cfg.units === "metric" ? op.tool_diameter_mm : op.tool_diameter_mm / 25.4;
      cmt(`(T${tn}|${desc}|H${tn}|D${tn}|TOOL DIA. - ${diaIn.toFixed(4)})`);
    }

    // ── Safe start (ground truth) ──
    cmd(unitsCode);
    cmd("G0 G17 G40 G49 G80 G90");

    // ── Per operation ──
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      toolsUsed.add(op.tool_number);

      // Optional stop BETWEEN ops (never before the first) — real JM Haas pattern.
      if (cfg.optional_stops && i > 0) cmd("M01");

      cmt(`(OPERATION ${i + 1}: ${op.operation_type.toUpperCase()})`);

      // Physics checks (canonical Kienzle/Taylor — imported).
      const checks = this.physicsChecks(op, i + 1);
      physicsChecks.push(...checks);
      for (const c of checks) if (!c.passed) warnings.push(`Op ${i + 1}: ${c.check}`);

      // Tool change.
      const desc = op.tool_description ?? `${op.operation_type.toUpperCase()} TOOL`;
      cmd(`T${op.tool_number} M6 (${desc})`);

      // First XY of the op (rapid target) + work offset + spindle on — combined block (Haas style).
      const first = op.coordinates.find((c) => c.type === "rapid") ?? op.coordinates[0];
      // Number.isFinite (not `=== undefined`) — a NaN x/y must NOT leak as a literal `XNaN` (Haas alarms);
      // for a canned-cycle op the bare cycle line drills wherever this approach leaves the tool.
      if (!Number.isFinite(first?.x) || !Number.isFinite(first?.y)) {
        warnings.push(`Op ${i + 1}: first move missing/non-finite XY — defaulted to 0,0 (verify no rapid through the part/fixture)`);
      }
      const firstX = Number.isFinite(first?.x) ? (first as { x: number }).x : 0;
      const firstY = Number.isFinite(first?.y) ? (first as { y: number }).y : 0;
      cmd(`G0 G90 ${woCode} X${fmt(firstX)} Y${fmt(firstY)} S${op.spindle_rpm} M3`);

      // NGC high-speed smoothing (opt-in) — AFTER spindle, before G43, Haas NGC ordering.
      if (cfg.use_g187) cmd(`G187 P${smoothingP(op.operation_type)} (HIGH-SPEED SMOOTHING)`);

      // Tool length comp + approach to safe Z.
      cmd(`G43 H${op.tool_number} Z${fmt(cfg.safe_z)}`);

      // Coolant (after spindle/G43, per-tool).
      const coolant = op.coolant ?? cfg.coolant_mode;
      const coolantOn = coolant === "flood" || coolant === "mist" || coolant === "tsc";
      if (coolant === "flood") cmd("M8");
      else if (coolant === "mist") cmd("M7");
      else if (coolant === "tsc") cmd("M88");

      // Tribal/playbook nudge surfaced to the output (advisory; not emitted as G-code).
      if (op.axial_depth_mm > op.tool_diameter_mm * 0.5) {
        tribalTipsApplied.push(`Op ${i + 1}: heavy axial cut (ap>${(op.tool_diameter_mm * 0.5).toFixed(2)}mm) — verify rigidity/coolant`);
      }

      // Toolpath: a drilling op may carry a canned cycle (G81/G83/G84…) — emit the modal cycle from
      // coordinates[] hole XYs. Otherwise (the default) emit literal G0/G1/G2/G3 from coordinates[]
      // (the corpus move-list contract, same as the proven Hurco/Okuma engines).
      const opWarn = (m: string) => warnings.push(`Op ${i + 1}: ${m}`);
      if (op.cycle) this.emitCannedCycle(op, cmd, fmt, fmtFeed, opWarn);
      else this.emitToolpath(op, cmd, fmt, fmtFeed, opWarn);

      // Tool end.
      cmd("M5");
      if (coolantOn) cmd("G91 G28 Z0. M9");
      else cmd("G91 G28 Z0.");

      estimatedTime += this.estimateCycleTime(op);
    }

    // ── Footer (ground truth) ──
    cmt("(END OF PROGRAM)");
    cmd("M5");
    cmd("G91 G28 Z0.");
    cmd("G28 X0. Y0.");
    cmd("M30");
    cmt("%");

    let setupSheet: HaasSetupSheet | undefined;
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
      controller: "haas",
      dialect: "haas",
      setup_sheet: setupSheet,
    };
  }

  /**
   * Emit the coordinate moves (G0 rapid / G1 linear / G2 cw / G3 ccw). Mirrors the proven engines.
   * `fmt` scales+formats geometry to output units; `fmtFeed` scales feed (or returns null for a
   * non-finite/invalid feed — emitted as a loudly-flagged token, never "FInfinity", and `warn`-ed).
   * Arc I/J are INCREMENTAL offsets from the current point to the arc centre (Fanuc/Haas convention);
   * an arc with neither R nor an I/J pair would Haas-alarm, so it is emitted flagged + warned (R12).
   */
  private emitToolpath(
    op: HaasMillOperation,
    cmd: (s: string) => void,
    fmt: (v: number) => string,
    fmtFeed: (f: number) => string | null,
    warn: (m: string) => void,
  ): void {
    const fStr = fmtFeed(op.feed_mm_min);
    if (fStr === null) warn(`non-finite/invalid feed_mm_min=${op.feed_mm_min} — emitted a flagged F token for operator review`);
    const feedTok = fStr !== null ? ` F${fStr}` : " F1 (INVALID FEED - REVIEW)";
    for (let i = 0; i < op.coordinates.length; i++) {
      const c = op.coordinates[i];
      // Guard non-finite X/Y -- a NaN/Infinity target would emit a literal "XNaN" the control
      // rejects. Skip + flag rather than emit a bad move (R12). U-PP-HAASNGC-NONFINITE-GUARD --
      // sibling of the RokuRoku fix; the per-op approach block guards only the FIRST move's XY.
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
          else { warn(`arc move ${i} has no R or I/J centre — Haas will alarm; emitted flagged`); line += " (NO I/J/R - REVIEW)"; }
          line += feedTok;
          cmd(line);
          break;
        }
        default:
          // Unknown move type — emit a linear move (fail-soft) but flag in a comment so it is visible.
          cmd(`G1 X${fmt(c.x)} Y${fmt(c.y)}${z}${feedTok} (UNKNOWN MOVE TYPE '${c.type}')`);
      }
    }
  }

  /** Canned-cycle type → Fanuc/Haas G-code (universal ISO codes Haas NGC uses natively). */
  private static readonly CYCLE_GCODE: Record<HaasDrillCycle["type"], string> = {
    drill: "G81", dwell: "G82", peck: "G83", chip_break: "G73", tap: "G84", bore: "G85",
  };

  /**
   * Emit a modal drilling canned cycle from op.cycle + the coordinates[] hole XYs:
   *   {G98|G99} G8x X.. Y.. Z{depth} R{retract} [Q{peck}] [P{dwell}] F{feed}   ← first hole (full def)
   *   X.. Y..                                                                   ← each subsequent hole
   *   G80                                                                       ← cancel
   * Ground truth: REAL JM Haas `.NC` (e.g. ALL STAR.NC) `N31 G99 G83 Z-.4375 R.1 Q.1 F1.8` — BARE
   * (no XY on the cycle line; XY positioned by the preceding G0 approach), and 100% G99 (never G98).
   * Fail-loud (R12): 0 holes → warn + emit nothing; missing depth/retract → warn + fall back to the
   * long-hand move list; a peck/dwell cycle missing its Q/P → warn + downgrade to G81; bad feed → flagged
   * F token (never "FInfinity"). Tap (G84) is a BARE cycle — Haas is always rigid, NO M29 (which on
   * Haas means "set output relay + M-FIN" and would hang); byte-verified vs ALL STAR.NC.
   * `fmt` scales geometry mm→output-units (so inch jobs get the 25.4× scale, never raw mm).
   */
  private emitCannedCycle(
    op: HaasMillOperation,
    cmd: (s: string) => void,
    fmt: (v: number) => string,
    fmtFeed: (f: number) => string | null,
    warn: (m: string) => void,
  ): void {
    const cyc = op.cycle!;
    const holes = op.coordinates.filter((c) => Number.isFinite(c.x) && Number.isFinite(c.y));
    if (holes.length === 0) { warn(`canned cycle (${cyc.type}) has no valid hole XY positions — emitted nothing`); return; }
    if (!Number.isFinite(cyc.depth_mm) || !Number.isFinite(cyc.retract_mm)) {
      warn(`canned cycle (${cyc.type}) has non-finite depth_mm/retract_mm — fell back to the long-hand move list`);
      this.emitToolpath(op, cmd, fmt, fmtFeed, warn);
      return;
    }
    // Geometry sanity (R12 advisory — still emit, but flag): the hole bottom (depth, negative below the
    // part top) must sit BELOW the R-plane (retract, positive above it). depth_mm >= retract_mm is an
    // inverted/no-cut cycle; a non-positive R-plane is unusual and likely a sign-convention mistake.
    if (cyc.depth_mm >= cyc.retract_mm) warn(`canned cycle depth_mm (${cyc.depth_mm}) is not below retract_mm (${cyc.retract_mm}) — inverted/no-cut geometry, verify the Z/R signs`);
    if (cyc.retract_mm <= 0) warn(`canned cycle retract_mm (${cyc.retract_mm}) is not a positive R-plane above the part top — verify the clearance`);

    // First-hole coupling guard (R12): the BARE cycle line drills hole #1 wherever the per-op approach
    // block left the tool — and the approach uses a rapid-preferring first point. If that diverges from
    // holes[0] (a leading non-rapid coord, or a NaN-filtered coordinates[0]), the first hole would drill
    // at the WRONG XY (or a hole would be dropped). fmt() both sides so the compare is format-exact.
    const approachFirst = op.coordinates.find((c) => c.type === "rapid") ?? op.coordinates[0];
    if (approachFirst && (fmt(approachFirst.x) !== fmt(holes[0].x) || fmt(approachFirst.y) !== fmt(holes[0].y))) {
      warn(`canned cycle: the approach positions to (${approachFirst.x},${approachFirst.y}) but the first hole is (${holes[0].x},${holes[0].y}) — leading rapid/non-finite coord; order the holes drilling-first (no leading rapid) so the bare cycle drills the right point`);
    }

    // Resolve the effective cycle type, downgrading when a required parameter is absent (R12 — never
    // emit a Q-less G83 / P-less G82, which Haas would alarm on).
    let type: HaasDrillCycle["type"] = cyc.type;
    const hasPeck = Number.isFinite(cyc.peck_mm) && (cyc.peck_mm as number) > 0;
    const hasDwell = Number.isFinite(cyc.dwell_s) && (cyc.dwell_s as number) > 0;
    if ((type === "peck" || type === "chip_break") && !hasPeck) {
      warn(`${type} cycle needs a positive peck_mm (Q) — downgraded to G81 simple drill`); type = "drill";
    } else if (type === "dwell" && !hasDwell) {
      warn(`dwell cycle needs a positive dwell_s (P) — downgraded to G81 simple drill`); type = "drill";
    }
    let g = HaasNGCMillMasterPostEngine.CYCLE_GCODE[type];
    if (!g) { warn(`unknown cycle type '${cyc.type}' — using G81 simple drill`); g = "G81"; }

    // Default retract is G99 (retract to the R-plane between holes) — the JM Haas golden archive is
    // 100% G99 (0 of 17 sampled drilling lines use G98). Caller sets retract_mode:"initial" → G98 (full
    // retract to the initial plane) ONLY when fixturing/features sit above the R-plane between holes
    // (G99 would rapid through them). Byte-verified vs `JM DIE/CNC MILL HAAS/**/*.NC`.
    const retractG = cyc.retract_mode === "initial" ? "G98" : "G99";
    const fStr = fmtFeed(op.feed_mm_min);
    if (fStr === null) warn(`canned cycle has non-finite/invalid feed_mm_min=${op.feed_mm_min} — emitted a flagged F token for operator review`);
    const feedTok = fStr !== null ? `F${fStr}` : "F1 (INVALID FEED - REVIEW)";

    // NOTE: Haas taps with a BARE G84 — it is ALWAYS in rigid-tap mode (rigid-tap option), so it needs
    // NO M-code prefix. (M29 is the FANUC rigid-tap activator; on Haas M29 = "set output relay + wait
    // for M-FIN", which would HANG the control mid-tap.) Byte-verified vs the golden archive:
    // `JM DIE/CNC MILL HAAS/ALL STAR/ALL STAR.NC` taps with `G99 G84 Z-.625 R.1 F18.9` — no M29.
    // The tap feed is the CALLER's responsibility (echo routes feed/speed through oscar): for a rigid
    // tap feed_mm_min MUST equal pitch × rpm — this engine emits it verbatim, it does not compute it.

    // First hole: BARE cycle line — NO X/Y. The per-op approach block already rapided to the first
    // hole's XY (coordinates[0] == holes[0] for finite input); the golden JM archive NEVER repeats XY
    // on the cycle line (0 of 17 sampled drilling lines carry X/Y — they read `G99 G83 Z.. R.. Q.. F..`).
    let first = `${retractG} ${g} Z${fmt(cyc.depth_mm)} R${fmt(cyc.retract_mm)}`;
    if (type === "peck" || type === "chip_break") first += ` Q${fmt(cyc.peck_mm as number)}`;
    if (type === "dwell") first += ` P${(cyc.dwell_s as number).toFixed(2)}`;
    first += ` ${feedTok}`;
    cmd(first);

    // Subsequent holes: modal X Y — positions each, the active cycle repeats the drill at that point.
    for (let i = 1; i < holes.length; i++) cmd(`X${fmt(holes[i].x)} Y${fmt(holes[i].y)}`);

    cmd("G80");
  }

  /**
   * Physics safety checks (canonical Kienzle Fc + Taylor life + machine RPM + chip-load).
   * A material.iso mismatch is impossible here (single material_iso field), so no throw path;
   * out-of-envelope values surface as failed checks → warnings, never silently passed (R12).
   */
  private physicsChecks(op: HaasMillOperation, opIndex: number): HaasPhysicsCheck[] {
    const checks: HaasPhysicsCheck[] = [];
    const k = CANONICAL_KIENZLE[op.material_iso];
    const taylor = CANONICAL_TAYLOR[op.material_iso];

    // Chip load fz = F / (n × Z)
    const fz = op.feed_mm_min / Math.max(op.spindle_rpm * op.tool_flutes, 1e-6);
    const fzMax = op.material_iso === "N" ? 0.25 : 0.15;
    checks.push({ op: opIndex, check: `chip load ${fz.toFixed(3)} mm/tooth (range ${HaasNGCMillMasterPostEngine.FZ_MIN}-${fzMax})`,
      passed: fz >= HaasNGCMillMasterPostEngine.FZ_MIN && fz <= fzMax, value: fz, limit: fzMax });

    // Kienzle cutting force Fc = kc1_1 · ap · fz^(1-mc)
    const Fc = k ? k.kc1_1 * op.axial_depth_mm * Math.pow(Math.max(fz, 1e-6), 1 - k.mc) : 0;
    checks.push({ op: opIndex, check: `cutting force ${Fc.toFixed(0)} N vs VF-2 limit ${HaasNGCMillMasterPostEngine.MAX_FORCE_N} N (kc1_1=${k?.kc1_1}, mc=${k?.mc})`,
      passed: Fc <= HaasNGCMillMasterPostEngine.MAX_FORCE_N, value: Fc, limit: HaasNGCMillMasterPostEngine.MAX_FORCE_N });

    // Spindle RPM vs VF-2 max
    checks.push({ op: opIndex, check: `spindle ${op.spindle_rpm} RPM vs VF-2 max ${HaasNGCMillMasterPostEngine.MAX_RPM} RPM`,
      passed: op.spindle_rpm <= HaasNGCMillMasterPostEngine.MAX_RPM, value: op.spindle_rpm, limit: HaasNGCMillMasterPostEngine.MAX_RPM });

    // Taylor tool life T = (C/Vc)^(1/n)
    const Vc = (Math.PI * op.tool_diameter_mm * op.spindle_rpm) / 1000;
    const T = taylor ? Math.pow(taylor.C / Math.max(Vc, 1e-6), 1 / taylor.n) : Infinity;
    checks.push({ op: opIndex, check: `Taylor tool life ${T.toFixed(1)} min vs target ${HaasNGCMillMasterPostEngine.TAYLOR_TARGET_LIFE_MIN} min (C=${taylor?.C}, n=${taylor?.n})`,
      passed: T >= HaasNGCMillMasterPostEngine.TAYLOR_TARGET_LIFE_MIN, value: T, limit: HaasNGCMillMasterPostEngine.TAYLOR_TARGET_LIFE_MIN });

    return checks;
  }

  /** Crude cycle-time estimate (min) from the toolpath length / feed. Advisory only. */
  private estimateCycleTime(op: HaasMillOperation): number {
    let dist = 0;
    for (let i = 1; i < op.coordinates.length; i++) {
      const a = op.coordinates[i - 1], b = op.coordinates[i];
      dist += Math.hypot((b.x ?? 0) - (a.x ?? 0), (b.y ?? 0) - (a.y ?? 0), (b.z ?? 0) - (a.z ?? 0));
    }
    return op.feed_mm_min > 0 ? dist / op.feed_mm_min : 0;
  }
}

export const haasNGCMillMasterPostEngine = new HaasNGCMillMasterPostEngine();
