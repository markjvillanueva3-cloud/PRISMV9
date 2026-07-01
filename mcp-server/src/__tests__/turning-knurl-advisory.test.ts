/**
 * turning-knurl-advisory.test.ts -- slot:whiskey (Lathe Wizard, U-LW-KNURL-ADVISORY)
 * ============================================================================
 * 'knurl' is now a TurningFeatureType. The head (generateProgram) surfaces knurl_advisory -- for every knurl
 * feature it runs KnurlingEngine.knurl (DIN-82 pitch, form-knurl blank diameter, radial force, speed/feed).
 * The turning spine does not natively emit a knurl cycle, so a knurl feature ALSO raises a loud spine
 * [knurl] warning (it must not silently fall back to od_rough).
 *
 * Intent (R9): the advisory is mapped from REAL KnurlingEngine physics and activates only for a knurl feature
 * carrying a real diameter + length (skip = no fabrication); it NEVER changes program_text; it is fail-soft;
 * and adding 'knurl' to the union does NOT create a silent od_rough path (the spine warns loudly).
 *
 * Hermeticity: spy-based tests spy the knurl SINGLETON; the final tests run the REAL engine.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { latheAIOrchestrationEngine } from "../engines/LatheAIOrchestrationEngine.js";
import { latheOrchestrationEngine } from "../engines/LatheOrchestrationEngine.js";
import { knurlingEngine } from "../engines/KnurlingEngine.js";

const odTurn = () =>
  ({ id: "f1", type: "od_turn", od_mm: 30, length_mm: 60, position_z_mm: 0,
    x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 });

const partWith = (feat: Record<string, unknown>) =>
  ({
    part_number: "KNURL", material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40, part_length_mm: 80,
    features: [odTurn(), { id: "f2", position_z_mm: -20, z_start_mm: -20, z_end_mm: -40, ...feat }],
    controller: "okuma", machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

const plainPart = () =>
  ({
    part_number: "PLAIN", material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40, part_length_mm: 80, features: [odTurn()],
    controller: "okuma", machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

const av = (value: number, unit: string) => ({ value, unit, uncertainty: 0, source: "test" });
const fakeKnurl = () =>
  ({
    pitch: av(0.8, "mm"), blank_diameter: av(29.6, "mm"), finished_od: av(30, "mm"),
    tooth_depth: av(0.4, "mm"), cutting_speed: av(20, "m/min"), spindle_rpm: av(212, "rpm"),
    feed_rate: av(0.15, "mm/rev"), radial_force: av(1200, "N"), num_revolutions: av(50, "rev"),
    cycle_time: av(4, "s"), pattern: "diamond", method: "form",
    warnings: ["Form-knurl radial force may deflect slender part"],
  }) as unknown as ReturnType<typeof knurlingEngine.knurl>;

describe("U-LW-KNURL-ADVISORY -- knurling physics wired into the head + spine knurl warning", () => {
  afterEach(() => vi.restoreAllMocks());

  it("generateProgram surfaces knurl_advisory mapped from KnurlingEngine for a knurl feature", () => {
    vi.spyOn(knurlingEngine, "knurl").mockReturnValue(fakeKnurl());
    const r = latheAIOrchestrationEngine.generateProgram(partWith({ type: "knurl", od_mm: 30, length_mm: 20 }));
    expect(r.knurl_advisory.length).toBe(1);
    const e = r.knurl_advisory[0];
    expect(e).toMatchObject({ feature_id: "f2", workpiece_diameter_mm: 30, pattern: "diamond", method: "form" });
    expect(e.pitch_mm).toBe(0.8);
    expect(e.blank_diameter_mm).toBe(29.6);
    expect(e.radial_force_N).toBe(1200);
    expect(e.spindle_rpm).toBe(212);
    expect(e.feed_rate_mm_rev).toBe(0.15);
    expect(e.warnings.some((w) => /deflect/.test(w))).toBe(true);
  });

  it("NO FABRICATION: passes the REAL feature diameter + length to KnurlingEngine.knurl", () => {
    let captured: { workpiece_diameter_mm?: number; knurl_length_mm?: number } | undefined;
    vi.spyOn(knurlingEngine, "knurl").mockImplementation((inp) => {
      captured = inp;
      return fakeKnurl();
    });
    latheAIOrchestrationEngine.assessKnurl(partWith({ type: "knurl", od_mm: 25, length_mm: 15 }));
    expect(captured?.workpiece_diameter_mm).toBe(25); // real feature OD
    expect(captured!.knurl_length_mm).toBe(15); // real feature length
  });

  it("NO FABRICATION: a knurl feature MISSING a length is SKIPPED (engine never called)", () => {
    const spy = vi.spyOn(knurlingEngine, "knurl").mockReturnValue(fakeKnurl());
    const r = latheAIOrchestrationEngine.assessKnurl(partWith({ type: "knurl", od_mm: 30 })); // no length_mm
    expect(r).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("a plain OD-turn part yields NO knurl_advisory and never calls the knurl engine", () => {
    const spy = vi.spyOn(knurlingEngine, "knurl").mockReturnValue(fakeKnurl());
    const r = latheAIOrchestrationEngine.generateProgram(plainPart());
    expect(r.knurl_advisory).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("ADVISORY-ONLY: knurl_advisory NEVER alters the emitted program_text (operator-safety invariant)", () => {
    const stripTs = (s: string) =>
      s.replace(/\(GENERATED:[^)]*\)/g, "(GENERATED)").replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, "<TS>").trim();
    vi.spyOn(knurlingEngine, "knurl").mockReturnValue(fakeKnurl());
    const input = partWith({ type: "knurl", od_mm: 30, length_mm: 20 });
    const spine = latheOrchestrationEngine.calculate("x", input);
    const head = latheAIOrchestrationEngine.generateProgram(input);
    expect(head.knurl_advisory.length).toBe(1);
    expect(stripTs(head.program_text)).toBe(stripTs(spine.program_text)); // G-code byte-identical
  });

  it("FAIL-SOFT: a knurl-calc failure skips the feature and NEVER aborts generation", () => {
    vi.spyOn(knurlingEngine, "knurl").mockImplementation(() => {
      throw new Error("knurl calc unavailable");
    });
    const r = latheAIOrchestrationEngine.generateProgram(partWith({ type: "knurl", od_mm: 30, length_mm: 20 }));
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(50);
    expect(r.knurl_advisory).toEqual([]);
  });

  it("skip_knurl_advisory:true is a perf opt-out -- [] WITHOUT calling the engine", () => {
    const spy = vi.spyOn(knurlingEngine, "knurl").mockReturnValue(fakeKnurl());
    const input = { ...(partWith({ type: "knurl", od_mm: 30, length_mm: 20 }) as object), skip_knurl_advisory: true } as unknown as Parameters<
      typeof latheOrchestrationEngine.calculate
    >[1];
    const r = latheAIOrchestrationEngine.generateProgram(input);
    expect(r.knurl_advisory).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("SPINE WARNING: a knurl feature raises a loud [knurl] warning (NOT a silent od_rough fallback)", () => {
    const r = latheOrchestrationEngine.calculate("x", partWith({ type: "knurl", od_mm: 30, length_mm: 20 }));
    const w = r.warnings.find((x) => /\[knurl\]/.test(x.message));
    expect(w).toBeTruthy();
    expect(w!.message).toMatch(/does not natively emit a knurl cycle/);
    expect(w!.message).toMatch(/radial force/);
  });

  it("REAL ENGINE (no spy): a knurl feature yields a real advisory entry with finite physics", () => {
    const a = latheAIOrchestrationEngine.assessKnurl(partWith({ type: "knurl", od_mm: 30, length_mm: 20 }));
    expect(a.length).toBe(1);
    expect(Number.isFinite(a[0].pitch_mm)).toBe(true);
    expect(a[0].pitch_mm).toBeGreaterThan(0);
    expect(a[0].radial_force_N).toBeGreaterThan(0); // form-knurl radial force is real + large
    expect(a[0].spindle_rpm).toBeGreaterThan(0);
  });
});
