#!/usr/bin/env -S npx tsx
/**
 * lathe-roundtrip-accuracy-harness.ts — slot:whiskey (Lathe Wizard)  [Rung B]
 * ===========================================================================
 * Closed-loop print -> lathe-program ROUNDTRIP accuracy measurement.
 *
 * WHY THIS EXISTS (honest framing, R12):
 *   Rung A (scripts/lathe-jmdie-param-accuracy-harness.mjs) mined the 16,558
 *   real JM Okuma .MIN programs into an empirical ground-truth parameter cloud
 *   (SFM/IPR bands per operation, G50-cap safety compliance).  That is the
 *   "real-world results" reference.  But it measures the *corpus*, not PRISM.
 *
 *   The lathe generator adapter (PipelineHarnessAdaptersEngine.makeLatheAdapter,
 *   wired 2026-06-03) closed the "domain 'lathe' adapter not yet bound" gap, so
 *   a TRUE headless print->program->post roundtrip is now runnable via
 *   turningPrintToProgramEngine.runPipeline().  The adapter author flagged the
 *   remaining work explicitly:
 *       "a `pass` from the harness ... is NOT a parameter-accuracy claim vs the
 *        JM .MIN corpus -- that is a SEPARATE measurement (the roundtrip diff
 *        harness) that scores regenerated params against the empirical
 *        ground-truth cloud."
 *   THIS file is that roundtrip diff harness.
 *
 * WHAT IT MEASURES:
 *   For a JM-representative input grid (the real material x feature spread of a
 *   fastener/die shop), it runs the live PRISM lathe generator, extracts the
 *   posted G-code parameters, and scores them against the empirical JM cloud
 *   using the SAME coarse classifier Rung A used (so the comparison is
 *   apples-to-apples):
 *     - per-op envelope agreement: does PRISM's generated IPR & SFM land inside
 *       the empirical JM p05..p95 band for that operation bucket?
 *     - safety correctness: does every posted program carry the G50 max-RPM cap,
 *       a CSS spindle mode, canned cycles, a thread cycle when threading, and a
 *       program-end (M30/M02)?  These are exactly the best-practices the real
 *       corpus is MISSING (Rung A: only 32% canned cycles, 56% missing G50,
 *       92% missing M30) -- so this is where PRISM should OUTPERFORM the corpus.
 *
 * HONEST SCOPE (R12) -- read before quoting any % from this harness:
 *   This is PARAMETER-ENVELOPE AGREEMENT on a controlled, representative input
 *   grid.  It is NOT a blind print-OCR byte-match roundtrip: the "read the
 *   print" stage (blueprint/CAD feature extraction) is an UPSTREAM pipeline
 *   leg, separately gated.  A 100%-in-band score here means "PRISM's physics +
 *   data reproduce JM master-programmer cutting parameters", which is the
 *   correct, provable interpretation of "prove accuracy / ensure data optimized"
 *   given today's wiring.  Byte-for-byte equality with a specific legacy .MIN is
 *   neither achievable nor desirable (PRISM intentionally adds the G50 cap, M30,
 *   and canned cycles the legacy programs omit).
 *
 * Usage:
 *   npx tsx mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts
 *   npx tsx mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts --json
 *
 * Output:
 *   state/shared/dashboards/lathe-roundtrip-accuracy.json   machine-readable
 *   state/shared/dashboards/lathe-roundtrip-accuracy.md     operator summary
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// @ts-ignore -- pure JS scoring lib (no .d.ts); shape inferred at runtime under tsx. U-W2D applied
// to Rung B (R15 -- safety/efficiency scoring on the LIVE regenerated programs, not just Rung C).
import { scoreSafetyEfficiency } from "../../scripts/lib/lathe-safety-efficiency-score.mjs";
import {
  turningPrintToProgramEngine,
  type TurningInput,
  type TurningFeature,
  type TurningProgramResult,
  type TurningPlannedOp,
} from "../src/engines/TurningPrintToProgramEngine.js";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const DASH = join(REPO, "state", "shared", "dashboards");
const EMPIRICAL = join(DASH, "lathe-jmdie-param-accuracy.json");

// ── unit conversions (engine is metric: mm/rev + m/min; cloud is IPR + SFM) ──
const MM_PER_IN = 25.4;
const MMIN_TO_SFM = 3.280839895; // m/min -> ft/min
const iprOf = (feed_mm_rev: number) => feed_mm_rev / MM_PER_IN;
const sfmOf = (vc_m_min: number) => vc_m_min * MMIN_TO_SFM;

// ── empirical-classifier PARITY (must match Rung A classifyOp exactly) ──
// Rung A buckets: thread | drill | rough(IPR>=0.006) | finish(0<IPR<0.006) | other
function classifyBucket(op: TurningPlannedOp): string {
  const t = op.operation_type;
  if (t.includes("thread")) return "thread";
  if (t.includes("drill") || t === "center_drill") return "drill";
  const ipr = iprOf(op.cutting_params.feed_mm_rev);
  if (!isFinite(ipr) || ipr <= 0) return "other";
  if (ipr >= 0.006) return "rough";
  return "finish";
}

// JM-representative input grid -- grounded in JM's ACTUAL stock-purchase record.
// Source: mcp-server/data/jm-die-database/jm-die-stock-material-catalog.json (juliett,
// from JM's QuickBooks purchases 2014-2026). JM is a TOOL-AND-DIE shop, so its stock is
// tool-steel-DOMINANT by volume (H13 38%, M2 17%, D2 12%, S7 11%, M4/A2 ~5% each) -- NOT
// the free-machining/medium-carbon mix a general job shop runs (the prior premise here was
// empirically wrong: H13/M2/D2/S7 were entirely ABSENT). Machining STATE: the Rung-A cloud
// is G96-literal SFM p50=200 [100-550] ft/min = carbide-on-ANNEALED-steel, NOT CBN
// hard-turning -- JM turns these tool steels annealed, then hardens+grinds OFF the lathe,
// so ISO P models the turning op the .MIN programs actually cut; the hard-turning minority
// is the A2 @ 58 HRC -> H row. CROSS-GALAXY FLAG (R7): oscar's sfc-jm-stock-prior.mjs maps
// these grades -> ISO H (hardened SERVICE state) -- right for an SFC unknown-material
// default, wrong for the TURNING op. See memory reference_whiskey_jm_stock_turning_state_2026_06_26.
interface GridMaterial { name: string; iso: TurningInput["material"]["iso_group"]; hrc?: number; }
const MATERIALS: GridMaterial[] = [
  // Tool steels -- JM's real high-volume stock, turned ANNEALED on the lathe (ISO P).
  { name: "H13 Tool Steel (annealed)", iso: "P" },
  { name: "M2 HSS (annealed)", iso: "P" },
  { name: "D2 Tool Steel (annealed)", iso: "P" },
  { name: "S7 Tool Steel (annealed)", iso: "P" },
  // Hard-turning minority -- CBN finish on hardened die work (ISO H).
  { name: "A2 Tool Steel (hard-turn, 58 HRC)", iso: "H", hrc: 58 },
  // Carbon / alloy / free-machining -- real but lower-volume JM stock.
  { name: "4140 Steel", iso: "P" },
  { name: "12L14 Free-Machining Steel", iso: "P" },
  { name: "1018 Steel", iso: "P" },
  // Stainless -- 17-4 PH is JM's real stainless stock (JM buys no 304).
  { name: "17-4 PH Stainless", iso: "M" },
  // Non-ferrous -- JM stocks no aluminum; kept for ISO-N group span.
  { name: "6061-T6 Aluminum", iso: "N" },
];
// NOTE: held to 10 materials (= the proven 60-program scale). The harness material
// loader re-reads + fails every H:/PRISM/data/materials/P_STEELS/*.json per iteration
// ("FileSystemError during parse" -- the files parse fine standalone, so it's a loader
// read-path bug, not corrupt data) and accumulates heap -> OOM past ~60 programs at the
// default 4GB. Growing this grid requires fixing that loader (shared/oscar lane) first.
// See memory reference_whiskey_jm_stock_turning_state_2026_06_26.

// Feature archetypes spanning the op buckets the empirical cloud reports.
interface Archetype { label: string; build: () => TurningFeature[]; }
const ARCHETYPES: Archetype[] = [
  {
    label: "od_turn (rough+finish)",
    build: () => [
      { id: "F1", type: "od_straight", od_mm: 25.4, length_mm: 50, tolerance_mm: 0.05, surface_finish_Ra_um: 1.6 },
    ],
  },
  {
    label: "od_thread UNC",
    build: () => [
      { id: "F1", type: "od_straight", od_mm: 12.7, length_mm: 30, tolerance_mm: 0.1, surface_finish_Ra_um: 3.2 },
      { id: "F2", type: "thread_od", od_mm: 12.7, length_mm: 20, thread_pitch_mm: 1.5875, thread_class: "2A", position_z_mm: -5 },
    ],
  },
  {
    label: "id_bore",
    build: () => [
      { id: "F1", type: "id_bore", id_mm: 15, length_mm: 30, tolerance_mm: 0.03, surface_finish_Ra_um: 1.6 },
    ],
  },
  {
    label: "drill_center",
    build: () => [
      { id: "F1", type: "drill_center", length_mm: 12, diameter_mm: 8 },
      { id: "F2", type: "id_bore", id_mm: 10, length_mm: 25, tolerance_mm: 0.05, surface_finish_Ra_um: 3.2 },
    ],
  },
  {
    label: "groove_od",
    build: () => [
      { id: "F1", type: "od_straight", od_mm: 25.4, length_mm: 40, tolerance_mm: 0.1, surface_finish_Ra_um: 3.2 },
      { id: "F2", type: "groove_od", od_mm: 25.4, groove_width_mm: 3, groove_depth_mm: 2, position_z_mm: -20 },
    ],
  },
  {
    label: "part_off",
    build: () => [
      { id: "F1", type: "od_straight", od_mm: 19.05, length_mm: 30, tolerance_mm: 0.1, surface_finish_Ra_um: 3.2 },
      { id: "F2", type: "part_off", od_mm: 19.05, length_mm: 5, width_mm: 3, position_z_mm: -28 },
    ],
  },
];

// ── Live-tooling / C-axis archetypes (U-W3, GAP-3) ───────────────────────────
// These exercise the C/Y-axis milling feature types TYPED in the
// TurningFeatureType union (whistle_notch | od_pocket_mill | cross_drill |
// cross_tap | keyway | flat_mill | hex_mill) but NEVER exercised by the Rung B
// grid above. Each pairs an OD turn (you turn the bar first) with the live
// feature, exactly as a real C-axis lathe job is programmed.
//
// HONEST SCOPE (R12): live-tooling ops have NO empirical JM band -- the .MIN
// corpus is single-point TURNING, not live milling -- so they are scored for
// COVERAGE + live-tool G-code correctness (main-spindle stop, C-axis index,
// live-tool M133/M135), NOT folded into the turning envelope-agreement pool
// (which would conflate live-mill params with the turning ground-truth cloud and
// silently corrupt the headline %). 4 of the 7 feature types emit real toolpath
// (whistle_notch, od_pocket, cross_drill, and cross_tap via its drill leg); the
// other 3 (keyway, flat_mill, hex_mill) currently emit a CAM-recommended STUB
// block -- that gap is surfaced explicitly below, never claimed as working.
const LIVE_ARCHETYPES: Archetype[] = [
  {
    label: "live_whistle_notch",
    build: () => [
      { id: "F1", type: "od_straight", od_mm: 19.05, length_mm: 50, tolerance_mm: 0.1, surface_finish_Ra_um: 3.2 },
      { id: "F2", type: "whistle_notch", od_mm: 19.05, length_mm: 12,
        notch_angle_deg: 10, notch_depth_mm: 3.175, notch_width_mm: 10,
        position_z_mm: 20, c_axis_position_deg: 0, live_tool_diameter_mm: 12.7 },
    ],
  },
  {
    label: "live_od_pocket",
    build: () => [
      { id: "F1", type: "od_straight", od_mm: 31.75, length_mm: 60, tolerance_mm: 0.1, surface_finish_Ra_um: 3.2 },
      { id: "F2", type: "od_pocket_mill", od_mm: 31.75, length_mm: 20,
        pocket_width_mm: 20, pocket_depth_mm: 3.175, pocket_length_mm: 15,
        position_z_mm: 25, c_axis_position_deg: 90, live_tool_diameter_mm: 12.7 },
    ],
  },
  {
    label: "live_cross_drill",
    build: () => [
      { id: "F1", type: "od_straight", od_mm: 25.4, length_mm: 50, tolerance_mm: 0.1, surface_finish_Ra_um: 3.2 },
      { id: "F2", type: "cross_drill", od_mm: 25.4, length_mm: 8,
        cross_hole_diameter_mm: 6.35, position_z_mm: 20, c_axis_position_deg: 0 },
    ],
  },
  {
    label: "live_cross_tap",
    build: () => [
      { id: "F1", type: "od_straight", od_mm: 25.4, length_mm: 50, tolerance_mm: 0.1, surface_finish_Ra_um: 3.2 },
      { id: "F2", type: "cross_tap", od_mm: 25.4, length_mm: 8,
        cross_hole_diameter_mm: 5.0, thread_pitch_mm: 0.8, position_z_mm: 25, c_axis_position_deg: 180 },
    ],
  },
  {
    label: "live_keyway",
    build: () => [
      { id: "F1", type: "od_straight", od_mm: 20, length_mm: 50, tolerance_mm: 0.05, surface_finish_Ra_um: 1.6 },
      { id: "F2", type: "keyway", od_mm: 20, length_mm: 25, width_mm: 5, depth_mm: 3,
        position_z_mm: 15, c_axis_position_deg: 0, live_tool_diameter_mm: 5 },
    ],
  },
  {
    label: "live_flat_mill",
    build: () => [
      { id: "F1", type: "od_straight", od_mm: 25.4, length_mm: 40, tolerance_mm: 0.1, surface_finish_Ra_um: 3.2 },
      { id: "F2", type: "flat_mill", od_mm: 25.4, length_mm: 20, depth_mm: 2,
        position_z_mm: 10, c_axis_position_deg: 0, live_tool_diameter_mm: 16 },
    ],
  },
  {
    label: "live_hex_mill",
    build: () => [
      { id: "F1", type: "od_straight", od_mm: 19.05, length_mm: 40, tolerance_mm: 0.1, surface_finish_Ra_um: 3.2 },
      { id: "F2", type: "hex_mill", od_mm: 19.05, length_mm: 15, depth_mm: 1.5,
        position_z_mm: 12, c_axis_position_deg: 0, live_tool_diameter_mm: 16 },
    ],
  },
];

// Representative material span for live tooling (one each P/M/N -- the ISO groups
// JM runs C-axis work on). Live milling is largely material-light in this
// coverage check, so a 3-group span satisfies the variability floor (>=3 spanning)
// without inflating the headline program count.
const LIVE_MATERIALS: GridMaterial[] = (["P", "M", "N"] as const)
  .map((iso) => MATERIALS.find((m) => m.iso === iso))
  .filter((m): m is GridMaterial => !!m);

// Live-tool G-code correctness signals (distinct from the turning safety codes).
function liveSafetyOf(programText: string) {
  const has = (re: RegExp) => re.test(programText);
  return {
    main_spindle_stop: has(/\bM05\b/i),       // main spindle stopped before live op
    spindle_orient: has(/\bM19\b/i),          // orient / C-axis lock
    caxis_index: has(/\bG00\s*C-?\d/i),       // C-axis angular index move
    live_tool_on: has(/\bM133\b/i),           // live/rotary tool spindle ON (real cut)
    live_tool_off: has(/\bM135\b/i),          // live tool OFF
    stub_only: has(/CAM-generated toolpath/i),// placeholder, no real toolpath emitted
  };
}

function makeInput(mat: GridMaterial, arch: Archetype): TurningInput {
  return {
    part_number: `RUNDTRIP-${mat.iso}-${arch.label.replace(/\W+/g, "_")}`,
    material: { material_name: mat.name, iso_group: mat.iso, ...(mat.hrc ? { hardness_hrc: mat.hrc } : {}) },
    bar_stock_od_mm: 31.75, // 1.25in bar — common JM lathe stock
    part_length_mm: 60,
    max_spindle_rpm: 4000,
    controller: "okuma", // JM fleet is 100% Okuma OSP
    machine_brand: "Okuma",
    features: arch.build(),
    optimization_target: "balanced",
  };
}

// ── empirical band lookup ──
type Band = { p05: number | null; p50: number | null; p95: number | null; n: number };
interface OpRef { feed_ipr: Band; sfm: Band; }
function loadEmpirical(): { opRef: Record<string, OpRef>; g96LiteralSfm: Band; generatedAt: string } {
  const raw = JSON.parse(readFileSync(EMPIRICAL, "utf8"));
  return {
    opRef: raw.op_parameter_reference ?? {},
    g96LiteralSfm: raw.aggregate?.sfm_g96_literal ?? { p05: null, p50: null, p95: null, n: 0 },
    generatedAt: raw.generated_at ?? "unknown",
  };
}

const inBand = (v: number, b: Band): boolean | null =>
  b.p05 == null || b.p95 == null ? null : v >= b.p05 && v <= b.p95;

// ── safety extraction from posted G-code ──
function safetyOf(programText: string, isThreading: boolean) {
  const has = (re: RegExp) => re.test(programText);
  return {
    g50_cap: has(/\bG50\s*S\d/i),
    css_mode: has(/\bG96\s*S/i),
    canned_cycle: has(/\bG7[0146]\b/i),
    thread_cycle: isThreading ? has(/\bG76\b/i) : null,
    program_end: has(/\bM30\b|\bM0?2\b/i),
  };
}

// ── stats ──
const pctRound = (num: number, den: number) => (den ? Math.round((num / den) * 1000) / 10 : null);

interface OpScore {
  part: string; material: string; iso: string; archetype: string;
  op_type: string; bucket: string;
  gen_ipr: number; gen_sfm: number;
  feed_in_band: boolean | null; sfm_in_band: boolean | null;
  band_feed_p50: number | null; band_sfm_p50: number | null;
}

export function runRoundtripHarness(opts: { quiet?: boolean } = {}) {
  const t0 = Date.now();
  const { opRef, g96LiteralSfm, generatedAt } = loadEmpirical();

  const opScores: OpScore[] = [];
  // U-W2D safety/efficiency verdicts per successfully-generated program (R15 -- apply to Rung B too).
  const seVerdicts: Array<ReturnType<typeof scoreSafetyEfficiency>> = [];
  // U-W2M: which collision check_types actually fail across the grid (pins the residual collision fails).
  const collisionFailTypes: Record<string, number> = {};
  const programs: Array<{
    part: string; material: string; archetype: string; ops: number;
    confidence: number; safety: ReturnType<typeof safetyOf>; error?: string;
  }> = [];
  let genErrors = 0;

  for (const mat of MATERIALS) {
    for (const arch of ARCHETYPES) {
      const input = makeInput(mat, arch);
      const isThreading = arch.label.includes("thread");
      let result: TurningProgramResult;
      try {
        result = turningPrintToProgramEngine.runPipeline(input);
      } catch (e) {
        genErrors++;
        programs.push({
          part: input.part_number!, material: mat.name, archetype: arch.label,
          ops: 0, confidence: 0,
          safety: { g50_cap: false, css_mode: false, canned_cycle: false, thread_cycle: isThreading ? false : null, program_end: false },
          error: e instanceof Error ? e.message : String(e),
        });
        continue;
      }

      const safety = safetyOf(result.program_text || "", isThreading);
      programs.push({
        part: result.part_number, material: mat.name, archetype: arch.label,
        ops: result.operations.length, confidence: result.confidence_score, safety,
      });
      // Structured-result safety/efficiency (collision/overspeed/overpower/cycle-time/MRR). Scored vs
      // REPRESENTATIVE test-grid machine limits: max_spindle_rpm from the input (4000), max_power_kW=15
      // (a typical Okuma spindle; the grid input sets no power limit, so this checks the generated
      // program against a representative machine envelope without altering pipeline behavior).
      const seV = scoreSafetyEfficiency(result, { max_spindle_rpm: input.max_spindle_rpm, max_power_kW: 15 });
      // Tag with config identity so the aggregate can roll UNSAFE up by archetype (which configs fail).
      seVerdicts.push(Object.assign(seV, { _material: mat.name, _archetype: arch.label }));
      // U-W2M: tally the actual failing collision check_types (per arm-C: any passed:false is a veto).
      for (const c of result.collision_checks ?? []) {
        if (c.passed === false) collisionFailTypes[`${arch.label}:${c.check_type}`] = (collisionFailTypes[`${arch.label}:${c.check_type}`] || 0) + 1;
      }

      for (const op of result.operations) {
        const bucket = classifyBucket(op);
        const gen_ipr = iprOf(op.cutting_params.feed_mm_rev);
        const gen_sfm = sfmOf(op.cutting_params.cutting_speed_m_min);
        const ref = opRef[bucket];
        const feedBand = ref?.feed_ipr ?? { p05: null, p50: null, p95: null, n: 0 };
        // For SFM, prefer the per-op band; cross-reference the artifact-free
        // G96-literal cloud only when the per-op band is absent.
        const sfmBand = ref?.sfm && ref.sfm.n > 0 ? ref.sfm : g96LiteralSfm;
        opScores.push({
          part: result.part_number, material: mat.name, iso: mat.iso, archetype: arch.label,
          op_type: op.operation_type, bucket,
          gen_ipr: Math.round(gen_ipr * 1e6) / 1e6, gen_sfm: Math.round(gen_sfm * 10) / 10,
          feed_in_band: inBand(gen_ipr, feedBand), sfm_in_band: inBand(gen_sfm, sfmBand),
          band_feed_p50: feedBand.p50, band_sfm_p50: sfmBand.p50,
        });
      }
    }
  }

  // ── U-W3: live-tooling / C-axis coverage (SEPARATE from the band-scored turning
  // grid above -- live ops have no empirical JM band, so folding them into the
  // envelope-agreement pool would silently corrupt the headline %). This loop
  // only proves the live-tooling feature types GENERATE valid live-tool G-code. ──
  interface LiveRun {
    material: string; archetype: string; live_ops: number; live_op_types: string[];
    live_safety: ReturnType<typeof liveSafetyOf>; se_verdict: string; confidence: number; error?: string;
  }
  const liveRuns: LiveRun[] = [];
  let liveProgramsGen = 0, liveGenErrors = 0, liveOpsTotal = 0;
  for (const mat of LIVE_MATERIALS) {
    for (const arch of LIVE_ARCHETYPES) {
      const input = makeInput(mat, arch);
      let result: TurningProgramResult;
      try {
        result = turningPrintToProgramEngine.runPipeline(input);
      } catch (e) {
        liveGenErrors++;
        liveRuns.push({ material: mat.name, archetype: arch.label, live_ops: 0, live_op_types: [],
          live_safety: liveSafetyOf(""), se_verdict: "ERROR", confidence: 0,
          error: e instanceof Error ? e.message : String(e) });
        continue;
      }
      liveProgramsGen++;
      const liveOps = result.operations.filter((o) => o.operation_type.startsWith("live_"));
      liveOpsTotal += liveOps.length;
      const seV = scoreSafetyEfficiency(result, { max_spindle_rpm: input.max_spindle_rpm, max_power_kW: 15 });
      liveRuns.push({
        material: mat.name, archetype: arch.label,
        live_ops: liveOps.length,
        live_op_types: [...new Set(liveOps.map((o) => o.operation_type))],
        live_safety: liveSafetyOf(result.program_text || ""),
        se_verdict: seV.verdict, confidence: result.confidence_score,
      });
    }
  }
  // Roll up per archetype: a "real" archetype emits an M133 live-cut on every run;
  // a "stub" archetype only emits the CAM-recommended placeholder block.
  const liveByArchetype: Record<string, {
    runs: number; errors: number; live_ops: number; live_op_types: string[];
    emits_real_toolpath: boolean; stub_only: boolean;
    all_main_spindle_stop: boolean; all_caxis_index: boolean;
    se_verdicts: Record<string, number>; flagged_no_empirical_band: boolean;
  }> = {};
  for (const label of LIVE_ARCHETYPES.map((a) => a.label)) {
    const runs = liveRuns.filter((r) => r.archetype === label);
    const ok = runs.filter((r) => !r.error);
    liveByArchetype[label] = {
      runs: runs.length,
      errors: runs.length - ok.length,
      live_ops: runs.reduce((s, r) => s + r.live_ops, 0),
      live_op_types: [...new Set(runs.flatMap((r) => r.live_op_types))],
      emits_real_toolpath: ok.length > 0 && ok.every((r) => r.live_safety.live_tool_on),
      stub_only: ok.length > 0 && ok.every((r) => r.live_safety.stub_only && !r.live_safety.live_tool_on),
      all_main_spindle_stop: ok.length > 0 && ok.every((r) => r.live_safety.main_spindle_stop),
      all_caxis_index: ok.length > 0 && ok.every((r) => r.live_safety.caxis_index),
      se_verdicts: runs.reduce((m: Record<string, number>, r) => { m[r.se_verdict] = (m[r.se_verdict] || 0) + 1; return m; }, {}),
      flagged_no_empirical_band: true, // honest: live milling absent from the JM turning .MIN cloud
    };
  }
  const liveRealOps = liveRuns.filter((r) => r.live_safety.live_tool_on).reduce((s, r) => s + r.live_ops, 0);
  const liveToolingCoverage = {
    archetypes_run: LIVE_ARCHETYPES.length,
    materials: LIVE_MATERIALS.map((m) => m.name),
    programs_generated: liveProgramsGen,
    generation_errors: liveGenErrors,
    total_live_ops: liveOpsTotal,
    real_toolpath_live_ops: liveRealOps,
    real_toolpath_archetypes: Object.entries(liveByArchetype).filter(([, v]) => v.emits_real_toolpath).map(([k]) => k),
    stub_only_archetypes: Object.entries(liveByArchetype).filter(([, v]) => v.stub_only).map(([k]) => k),
    by_archetype: liveByArchetype,
    note:
      "Live-tooling ops have NO empirical JM band (the .MIN corpus is single-point turning, not C/Y-axis " +
      "milling), so they are coverage-verified + live-tool-G-code-checked, NOT band-scored (kept out of the " +
      "envelope_agreement pool). real_toolpath_archetypes emit M133 live cuts; stub_only_archetypes emit a " +
      "CAM-recommended placeholder (real toolpath generation is a queued follow-up, not claimed working here).",
  };

  // ── aggregate envelope agreement ──
  const buckets = [...new Set(opScores.map((o) => o.bucket))].sort();
  const perBucket: Record<string, { n: number; feed_in: number; feed_checked: number; sfm_in: number; sfm_checked: number; feed_pct: number | null; sfm_pct: number | null }> = {};
  for (const b of buckets) {
    const rows = opScores.filter((o) => o.bucket === b);
    const feed_checked = rows.filter((o) => o.feed_in_band !== null).length;
    const feed_in = rows.filter((o) => o.feed_in_band === true).length;
    const sfm_checked = rows.filter((o) => o.sfm_in_band !== null).length;
    const sfm_in = rows.filter((o) => o.sfm_in_band === true).length;
    perBucket[b] = { n: rows.length, feed_in, feed_checked, sfm_in, sfm_checked, feed_pct: pctRound(feed_in, feed_checked), sfm_pct: pctRound(sfm_in, sfm_checked) };
  }
  const feedChecked = opScores.filter((o) => o.feed_in_band !== null).length;
  const feedIn = opScores.filter((o) => o.feed_in_band === true).length;
  const sfmChecked = opScores.filter((o) => o.sfm_in_band !== null).length;
  const sfmIn = opScores.filter((o) => o.sfm_in_band === true).length;

  // ── safety correctness (programs with all applicable codes present) ──
  const safetyRows = programs.filter((p) => !p.error);
  const safeAll = safetyRows.filter((p) =>
    p.safety.g50_cap && p.safety.css_mode && p.safety.canned_cycle && p.safety.program_end &&
    (p.safety.thread_cycle === null || p.safety.thread_cycle === true)).length;
  const safetyByCode = {
    g50_cap: pctRound(safetyRows.filter((p) => p.safety.g50_cap).length, safetyRows.length),
    css_mode: pctRound(safetyRows.filter((p) => p.safety.css_mode).length, safetyRows.length),
    canned_cycle: pctRound(safetyRows.filter((p) => p.safety.canned_cycle).length, safetyRows.length),
    thread_cycle: pctRound(safetyRows.filter((p) => p.safety.thread_cycle === true).length, safetyRows.filter((p) => p.safety.thread_cycle !== null).length),
    program_end: pctRound(safetyRows.filter((p) => p.safety.program_end).length, safetyRows.length),
  };

  // ── data-optimization punch list: buckets where agreement < 80% ──
  const punchList: Array<{ bucket: string; metric: string; agreement_pct: number | null; gen_p50: number | null; jm_p50: number | null; direction: string }> = [];
  for (const b of buckets) {
    const pb = perBucket[b];
    const sample = opScores.filter((o) => o.bucket === b);
    const genFeedP50 = median(sample.map((o) => o.gen_ipr));
    const genSfmP50 = median(sample.map((o) => o.gen_sfm));
    const jmFeed = sample[0]?.band_feed_p50 ?? null;
    const jmSfm = sample[0]?.band_sfm_p50 ?? null;
    if (pb.feed_pct != null && pb.feed_pct < 80) {
      punchList.push({ bucket: b, metric: "feed_ipr", agreement_pct: pb.feed_pct, gen_p50: genFeedP50, jm_p50: jmFeed, direction: dir(genFeedP50, jmFeed) });
    }
    if (pb.sfm_pct != null && pb.sfm_pct < 80) {
      punchList.push({ bucket: b, metric: "sfm", agreement_pct: pb.sfm_pct, gen_p50: genSfmP50, jm_p50: jmSfm, direction: dir(genSfmP50, jmSfm) });
    }
  }

  const meanConfidence = safetyRows.length
    ? Math.round((safetyRows.reduce((a, p) => a + p.confidence, 0) / safetyRows.length) * 100) / 100
    : 0;

  // ── safety + efficiency aggregate (U-W2D scorer over the structured results) ──
  const seAvg = (xs: Array<number | null>) => {
    const v = xs.filter((x): x is number => typeof x === "number");
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };
  const sumAxis = (sel: (v: ReturnType<typeof scoreSafetyEfficiency>) => number | null | undefined) =>
    seVerdicts.reduce((s, v) => s + (sel(v) || 0), 0);
  const safetyEfficiency = {
    safe: seVerdicts.filter((v) => v.verdict === "SAFE").length,
    unsafe: seVerdicts.filter((v) => v.verdict === "UNSAFE").length,
    partial: seVerdicts.filter((v) => v.verdict === "PARTIAL").length,
    scored_programs: seVerdicts.length,
    total_safety_violations: seVerdicts.reduce((s, v) => s + (v.safety_violations || 0), 0),
    // Which axis drives the violations -- makes the UNSAFE count actionable (R12): is it overspeed
    // past G50 (a real PRISM defect), overpower vs the 15kW representative limit (maybe just a low
    // assumption for heavy roughing), or a collision/boring/critical-warning?
    violations_by_axis: {
      overspeed_ops: sumAxis((v) => v.breakdown.overspeed_ops),
      overpower_ops: sumAxis((v) => v.breakdown.overpower_ops),
      collision_veto_fails: sumAxis((v) => v.breakdown.collision_veto_fails),
      critical_warnings: sumAxis((v) => v.breakdown.critical_warnings),
      boring_bar_out_of_tolerance: sumAxis((v) => v.breakdown.boring_bar_out_of_tolerance),
    },
    // Which CONFIGS fail (so the generator fix targets the right archetypes, not a blind sweep):
    unsafe_by_archetype: seVerdicts.filter((v) => v.verdict === "UNSAFE").reduce((m: Record<string, number>, v) => {
      const k = (v as { _archetype?: string })._archetype ?? "unknown"; m[k] = (m[k] || 0) + 1; return m;
    }, {}),
    boring_fail_by_archetype: seVerdicts.filter((v) => (v.breakdown.boring_bar_out_of_tolerance || 0) > 0).reduce((m: Record<string, number>, v) => {
      const k = (v as { _archetype?: string })._archetype ?? "unknown"; m[k] = (m[k] || 0) + 1; return m;
    }, {}),
    collision_fail_types: collisionFailTypes, // U-W2M: archetype:check_type -> count (pins the residual collision fails)
    avg_cycle_time_sec: seAvg(seVerdicts.map((v) => v.efficiency.cycle_time_sec)),
    avg_mrr_mm3_min: seAvg(seVerdicts.map((v) => v.efficiency.avg_mrr_mm3_min)),
    representative_limits: { max_spindle_rpm: 4000, max_power_kW: 15 },
    note: "verdict scored vs representative test-grid limits (power=15kW typical Okuma); PARTIAL when an axis is unknown. Complements the text-based safety_correctness (G-code presence).",
  };

  const report = {
    schemaVersion: "1.0.0",
    rung: "B — roundtrip param-envelope agreement (PRISM generator vs JM empirical cloud)",
    generated_at: new Date(t0).toISOString(),
    empirical_source: { file: EMPIRICAL, generated_at: generatedAt },
    honest_scope:
      "Parameter-envelope agreement on a JM-representative controlled input grid via the LIVE turningPrintToProgramEngine. " +
      "NOT a blind print-OCR byte-match: the feature-extraction (read-print) stage is upstream and separately gated. " +
      "Safety codes PRISM adds (G50 cap, M30, canned cycles) are intentional improvements over the legacy corpus, not divergences.",
    grid: { materials: MATERIALS.length, archetypes: ARCHETYPES.length, programs_generated: programs.length, generation_errors: genErrors },
    runtime_ms: Date.now() - t0,
    envelope_agreement: {
      overall_feed_pct: pctRound(feedIn, feedChecked),
      overall_sfm_pct: pctRound(sfmIn, sfmChecked),
      feed_checked: feedChecked, feed_in_band: feedIn,
      sfm_checked: sfmChecked, sfm_in_band: sfmIn,
      per_bucket: perBucket,
    },
    safety_correctness: {
      all_codes_present_pct: pctRound(safeAll, safetyRows.length),
      programs_all_safe: safeAll, programs_total: safetyRows.length,
      by_code_pct: safetyByCode,
    },
    safety_efficiency: safetyEfficiency,
    live_tooling_coverage: liveToolingCoverage,
    mean_confidence: meanConfidence,
    data_optimization_punch_list: punchList,
    program_errors: programs.filter((p) => p.error).map((p) => ({ part: p.part, material: p.material, archetype: p.archetype, error: p.error })),
    op_scores_sample: opScores.slice(0, 120),
  };

  mkdirSync(DASH, { recursive: true });
  writeFileSync(join(DASH, "lathe-roundtrip-accuracy.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(DASH, "lathe-roundtrip-accuracy.md"), renderMd(report));

  const summary = {
    ok: genErrors === 0,
    programs_generated: programs.length, generation_errors: genErrors,
    envelope_feed_pct: report.envelope_agreement.overall_feed_pct,
    envelope_sfm_pct: report.envelope_agreement.overall_sfm_pct,
    safety_all_codes_pct: report.safety_correctness.all_codes_present_pct,
    se_safe: safetyEfficiency.safe, se_unsafe: safetyEfficiency.unsafe, se_partial: safetyEfficiency.partial,
    se_total_violations: safetyEfficiency.total_safety_violations,
    live_archetypes: liveToolingCoverage.archetypes_run,
    live_programs: liveToolingCoverage.programs_generated,
    live_gen_errors: liveToolingCoverage.generation_errors,
    live_ops_total: liveToolingCoverage.total_live_ops,
    live_real_toolpath_ops: liveToolingCoverage.real_toolpath_live_ops,
    live_stub_only_archetypes: liveToolingCoverage.stub_only_archetypes.length,
    mean_confidence: meanConfidence,
    punch_list_items: punchList.length,
    json: join(DASH, "lathe-roundtrip-accuracy.json"),
  };
  if (!opts.quiet) console.log(JSON.stringify(summary, null, 2));
  return { report, summary };
}

// Direct-run entry (tsx/node). Under a vitest/library import this no-ops.
const invokedDirectly = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) runRoundtripHarness();

function median(arr: number[]): number | null {
  const s = arr.filter((x) => isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return Math.round((s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) * 1e6) / 1e6;
}
function dir(gen: number | null, jm: number | null): string {
  if (gen == null || jm == null) return "—";
  if (gen > jm * 1.05) return "PRISM higher than JM p50";
  if (gen < jm * 0.95) return "PRISM lower than JM p50";
  return "within ±5% of JM p50";
}

function d(x: unknown): string { return x == null ? "—" : String(x); }
function renderMd(r: ReturnType<typeof buildReportType>): string {
  const e = r.envelope_agreement, s = r.safety_correctness;
  let md = `# JM Die Lathe — Print→Program ROUNDTRIP Accuracy (Rung B)\n\n`;
  md += `_Generated ${r.generated_at} · ${r.grid.programs_generated} programs generated (${r.grid.generation_errors} errors) · ${r.runtime_ms} ms · live turningPrintToProgramEngine_\n\n`;
  md += `> ${r.honest_scope}\n\n`;
  md += `## Headline\n\n`;
  md += `- **Envelope agreement (feed IPR in JM band):** ${d(e.overall_feed_pct)}%  (${e.feed_in_band}/${e.feed_checked} ops)\n`;
  md += `- **Envelope agreement (SFM in JM band):** ${d(e.overall_sfm_pct)}%  (${e.sfm_in_band}/${e.sfm_checked} ops)\n`;
  md += `- **Safety correctness (all codes present):** ${d(s.all_codes_present_pct)}%  (${s.programs_all_safe}/${s.programs_total} programs)\n`;
  md += `- **Mean generator confidence:** ${r.mean_confidence}\n\n`;
  md += `## Envelope agreement by operation bucket\n\n| bucket | ops | feed in-band | SFM in-band |\n|----|----|----|----|\n`;
  for (const [b, v] of Object.entries(e.per_bucket)) {
    md += `| ${b} | ${v.n} | ${d(v.feed_pct)}% (${v.feed_in}/${v.feed_checked}) | ${d(v.sfm_pct)}% (${v.sfm_in}/${v.sfm_checked}) |\n`;
  }
  md += `\n## Safety correctness by code (PRISM's intentional improvements over legacy corpus)\n\n`;
  md += `- G50 max-RPM cap: **${d(s.by_code_pct.g50_cap)}%** (corpus: 44% had it)\n`;
  md += `- CSS spindle mode: ${d(s.by_code_pct.css_mode)}%\n`;
  md += `- Canned cycles (G70-G76): **${d(s.by_code_pct.canned_cycle)}%** (corpus: 32%)\n`;
  md += `- Thread cycle (G76 when threading): ${d(s.by_code_pct.thread_cycle)}%\n`;
  md += `- Program end (M30/M02): **${d(s.by_code_pct.program_end)}%** (corpus: 7.5%)\n\n`;
  md += `## Data-optimization punch list (buckets <80% agreement)\n\n`;
  if (!r.data_optimization_punch_list.length) {
    md += `_None — every operation bucket reproduces JM master-programmer parameters within the empirical band._\n`;
  } else {
    md += `| bucket | metric | agreement | PRISM p50 | JM p50 | direction |\n|----|----|----|----|----|----|\n`;
    for (const p of r.data_optimization_punch_list) {
      md += `| ${p.bucket} | ${p.metric} | ${d(p.agreement_pct)}% | ${d(p.gen_p50)} | ${d(p.jm_p50)} | ${p.direction} |\n`;
    }
  }
  const lt = r.live_tooling_coverage;
  if (lt) {
    md += `\n## Live-tooling / C-axis coverage (U-W3)\n\n`;
    md += `_${lt.note}_\n\n`;
    md += `- **Archetypes exercised:** ${lt.archetypes_run} (${lt.programs_generated} programs, ${lt.generation_errors} errors) over ${lt.materials.length} ISO groups\n`;
    md += `- **Live ops generated:** ${lt.total_live_ops} (${lt.real_toolpath_live_ops} with real toolpath)\n`;
    md += `- **Real-toolpath archetypes:** ${lt.real_toolpath_archetypes.join(", ") || "none"}\n`;
    md += `- **Stub-only (queued for real toolpath):** ${lt.stub_only_archetypes.join(", ") || "none"}\n\n`;
    md += `| archetype | live ops | op types | real toolpath | M05 stop | C index |\n|----|----|----|----|----|----|\n`;
    for (const [label, v] of Object.entries(lt.by_archetype)) {
      md += `| ${label} | ${v.live_ops} | ${v.live_op_types.join(", ")} | ${v.emits_real_toolpath ? "yes" : v.stub_only ? "STUB" : "partial"} | ${v.all_main_spindle_stop ? "yes" : "no"} | ${v.all_caxis_index ? "yes" : "no"} |\n`;
    }
    md += `\n`;
  }
  md += `\n_Full data: \`state/shared/dashboards/lathe-roundtrip-accuracy.json\`. Empirical source: Rung A \`lathe-jmdie-param-accuracy.json\` (${r.empirical_source.generated_at})._\n`;
  return md;
}
// type-only helper so renderMd's param is inferred from the real report shape
declare function buildReportType(): {
  generated_at: string; runtime_ms: number; mean_confidence: number; honest_scope: string;
  grid: { programs_generated: number; generation_errors: number };
  empirical_source: { generated_at: string };
  envelope_agreement: {
    overall_feed_pct: number | null; overall_sfm_pct: number | null;
    feed_in_band: number; feed_checked: number; sfm_in_band: number; sfm_checked: number;
    per_bucket: Record<string, { n: number; feed_in: number; feed_checked: number; sfm_in: number; sfm_checked: number; feed_pct: number | null; sfm_pct: number | null }>;
  };
  safety_correctness: {
    all_codes_present_pct: number | null; programs_all_safe: number; programs_total: number;
    by_code_pct: { g50_cap: number | null; css_mode: number | null; canned_cycle: number | null; thread_cycle: number | null; program_end: number | null };
  };
  data_optimization_punch_list: Array<{ bucket: string; metric: string; agreement_pct: number | null; gen_p50: number | null; jm_p50: number | null; direction: string }>;
  live_tooling_coverage?: {
    archetypes_run: number; materials: string[]; programs_generated: number; generation_errors: number;
    total_live_ops: number; real_toolpath_live_ops: number;
    real_toolpath_archetypes: string[]; stub_only_archetypes: string[]; note: string;
    by_archetype: Record<string, {
      runs: number; errors: number; live_ops: number; live_op_types: string[];
      emits_real_toolpath: boolean; stub_only: boolean;
      all_main_spindle_stop: boolean; all_caxis_index: boolean;
      se_verdicts: Record<string, number>; flagged_no_empirical_band: boolean;
    }>;
  };
};
