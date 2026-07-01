/**
 * turning-thread-route.test.ts -- slot:whiskey (Lathe Wizard, U-LW-THREAD-ROUTE)
 * ============================================================================
 * CONFIRMED SEVERE bug (found by the U-LW-THREAD-DEPTH 3-of-3 analyst arm, verified empirically):
 * a thread feature emitted a G85 LAP ROUGHING pass, never a thread -- because mapOkumaOpType had no
 * case for the thread op types the planner produces (thread_od -> thread_single_point), so they fell
 * through to the od_rough default. The OSP post's verified generateThreadingCycle (G71) was therefore
 * unreachable. Fix: route the EXTERNAL single-point thread op types to "thread"; GUARD internal
 * threads (thread_id, also planned as thread_single_point) -- the G71 cycle is external geometry
 * (minorDia = start_x - depth*2), so an internal thread is re-routed to a finish bore + flagged, never
 * emitted as a wrong/crash external thread.
 *
 * Intent (R9): (1) an external thread now EMITS a real G71 cycle (not roughing); (2) the per-feature
 * thread_depth_mm override now FLOWS into the cut (closing the U-LW-THREAD-DEPTH dormant override);
 * (3) an internal thread does NOT emit a (wrong) G71 and raises a loud warning; (4) non-thread ops are
 * unaffected.
 */
import { describe, it, expect } from "vitest";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

// OkumaB250 stamps a wall-clock (GENERATED: <ISO>) line -- strip it before any equality (the false
// proof the U-LW-THREAD-DEPTH analyst arm caught).
const stripTimestamp = (g: string) => g.replace(/\(GENERATED:[^)]*\)/g, "(GENERATED)");

const externalThreadPart = (threadDepth?: number) => ({
  part_number: "EXT-THREAD",
  material: { material_name: "1018", iso_group: "P" as const },
  bar_stock_od_mm: 30,
  part_length_mm: 60,
  features: [
    { id: "f1", type: "od_straight" as const, od_mm: 24, length_mm: 20, position_z_mm: 0,
      x_start_mm: 30, x_end_mm: 24, z_start_mm: 0, z_end_mm: -20 },
    { id: "t1", type: "thread_od" as const, od_mm: 24, length_mm: 20, position_z_mm: -20,
      thread_pitch_mm: 1.5, thread_depth_mm: threadDepth,
      x_start_mm: 24, x_end_mm: 24, z_start_mm: -20, z_end_mm: -40 },
  ],
  controller: "okuma",
  machine_model: "Okuma LB3000",
});

const internalThreadPart = () => ({
  part_number: "INT-THREAD",
  material: { material_name: "1018", iso_group: "P" as const },
  bar_stock_od_mm: 40,
  part_length_mm: 40,
  features: [
    { id: "f1", type: "od_straight" as const, od_mm: 36, length_mm: 30, position_z_mm: 0,
      x_start_mm: 40, x_end_mm: 36, z_start_mm: 0, z_end_mm: -30 },
    { id: "t1", type: "thread_id" as const, id_mm: 12, length_mm: 20, position_z_mm: 0,
      thread_pitch_mm: 1.75, x_start_mm: 12, x_end_mm: 12, z_start_mm: 0, z_end_mm: -20 },
  ],
  controller: "okuma",
  machine_model: "Okuma LB3000",
});

const run = (i: unknown) => turningPrintToProgramEngine.runPipeline(i as PipeIn);
const g71Line = (g: string) => g.split(/\r?\n/).find((l) => /\bG71\b/.test(l));

describe("U-LW-THREAD-ROUTE -- external threads emit a real G71 cycle (was G85 roughing)", () => {
  it("an external thread feature now EMITS a G71 threading cycle (bug: it used to emit only roughing)", () => {
    const r = run(externalThreadPart(undefined));
    expect(r.success).toBe(true);
    expect(/\bG71\b/.test(r.program_text)).toBe(true); // the thread is actually cut now
    const line = g71Line(r.program_text)!;
    // OSP G71 single-line form: X<minor> Z<end> B60 D U H<height> F<lead> M33 M73
    expect(line).toMatch(/G71 X[\d.]+ Z[-\d.]+ B60 .* F1\.5 M33 M73/);
  });

  it("default thread depth (no override) ~ 0.61*pitch: minor dia = major - 2*0.915 ~ 22.17 for M ?x1.5 on 24mm", () => {
    const line = g71Line(run(externalThreadPart(undefined)).program_text)!;
    const minor = parseFloat(line.match(/X([\d.]+)/)![1]);
    // major 24, depth 1.5*0.61=0.915 -> minor = 24 - 1.83 = 22.17
    expect(minor).toBeCloseTo(22.17, 1);
  });

  it("OVERRIDE FLOWS (closes U-LW-THREAD-DEPTH): a shallow vs deep thread_depth_mm changes the G71 minor dia", () => {
    const shallow = run(externalThreadPart(0.5)).program_text;
    const deep = run(externalThreadPart(1.3)).program_text;
    // timestamp-stripped, the programs DIFFER now -- the override reaches the emitted thread cycle
    expect(stripTimestamp(shallow)).not.toBe(stripTimestamp(deep));
    const minorShallow = parseFloat(g71Line(shallow)!.match(/X([\d.]+)/)![1]);
    const minorDeep = parseFloat(g71Line(deep)!.match(/X([\d.]+)/)![1]);
    expect(minorShallow).toBeCloseTo(24 - 2 * 0.5, 1); // 23.0
    expect(minorDeep).toBeCloseTo(24 - 2 * 1.3, 1);    // 21.4
    expect(minorDeep).toBeLessThan(minorShallow);      // deeper thread -> smaller minor dia
  });
});

describe("U-LW-THREAD-ROUTE -- internal threads are GUARDED (no wrong/crash external G71)", () => {
  it("an internal thread (thread_id) does NOT emit a G71 thread cycle (external geometry would be wrong)", () => {
    const r = run(internalThreadPart());
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
    expect(/\bG71\b/.test(r.program_text)).toBe(false); // no external thread emitted for an internal feature
  });

  it("an internal thread raises a loud 'internal threading not auto-emitted' warning (never silent)", () => {
    const r = run(internalThreadPart());
    expect(r.warnings.some((w) => w.stage === "threading" && /[Ii]nternal/.test(w.message))).toBe(true);
  });
});

describe("U-LW-THREAD-ROUTE -- non-thread ops unaffected (no regression)", () => {
  it("a plain OD turn still emits the G85 LAP roughing cycle (routing change is thread-only)", () => {
    const r = run({
      part_number: "PLAIN-OD",
      material: { material_name: "1018", iso_group: "P" as const },
      bar_stock_od_mm: 30, part_length_mm: 50,
      features: [
        { id: "f1", type: "od_straight" as const, od_mm: 24, length_mm: 40, position_z_mm: 0,
          x_start_mm: 30, x_end_mm: 24, z_start_mm: 0, z_end_mm: -40 },
      ],
      controller: "okuma", machine_model: "Okuma LB3000",
    } as unknown as PipeIn);
    expect(r.success).toBe(true);
    expect(/\bG85\b/.test(r.program_text)).toBe(true); // roughing path intact
    expect(/\bG71\b/.test(r.program_text)).toBe(false); // no spurious thread cycle
  });
});
