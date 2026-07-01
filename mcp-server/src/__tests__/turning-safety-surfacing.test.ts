/**
 * turning-safety-surfacing.test.ts -- slot:whiskey (Lathe Wizard, gap-sweep fills G18/G31/G40)
 * ============================================================================
 * From the 54-gap lathe-wizard inventory (LATHE-WIZARD-GAP-INVENTORY-2026-06-29):
 *   G18 (P0 fail-open): collision `critical_errors` (a channel SEPARATE from `.checks`) were only
 *       log.warn'd, never pushed -> a critical collision could auto-certify. Now pushed as
 *       severity:"critical" so emission is blocked (fail-CLOSED, same class as U-LW-02).
 *   G31 (P1 silent gate): the chuck-jaw / boring-bar / chatter / workpiece-deflection safety checks
 *       swallowed exceptions with log.debug only -> the operator never learned a SAFETY gate was
 *       skipped. Each catch now pushes a warning (fail-LOUD).
 *   G40 (P2 metadata): cannedCycleFor reported Fanuc "G76" for a single-point thread on the
 *       Okuma-dialect result metadata -> now "G71" (the OSP cycle the program actually emits).
 *
 * Intent (R9): a critical collision BLOCKS emission; a thrown safety check SURFACES a warning instead
 * of silently passing; the canned-cycle metadata matches the emitted Okuma dialect.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";
import { latheCollisionZoneEngine } from "../engines/LatheCollisionZoneEngine.js";
import { chuckJawForceEngine } from "../engines/ChuckJawForceEngine.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

const part = () => ({
  part_number: "SAFETY-SURF",
  material: { material_name: "1018", iso_group: "P" as const },
  bar_stock_od_mm: 40,
  part_length_mm: 80,
  features: [
    { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 60, position_z_mm: 0,
      x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 },
  ],
  controller: "okuma",
  machine_model: "Okuma LB3000",
});
const threadPart = () => ({
  part_number: "THREAD-META",
  material: { material_name: "1018", iso_group: "P" as const },
  bar_stock_od_mm: 30,
  part_length_mm: 60,
  features: [
    { id: "f1", type: "od_straight" as const, od_mm: 24, length_mm: 20, position_z_mm: 0,
      x_start_mm: 30, x_end_mm: 24, z_start_mm: 0, z_end_mm: -20 },
    { id: "t1", type: "thread_od" as const, od_mm: 24, length_mm: 20, position_z_mm: -20,
      thread_pitch_mm: 1.5, x_start_mm: 24, x_end_mm: 24, z_start_mm: -20, z_end_mm: -40 },
  ],
  controller: "okuma",
  machine_model: "Okuma LB3000",
});
const run = (i: unknown) => turningPrintToProgramEngine.runPipeline(i as PipeIn);

describe("G18 -- collision critical_errors block emission (fail-CLOSED)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("a collision critical_error BLOCKS emission with a critical warning (was only log.warn)", () => {
    vi.spyOn(latheCollisionZoneEngine, "checkAll").mockReturnValue({
      checks: [],
      critical_errors: ["SIM-COLLISION: turret fouls chuck"],
      safe_retract_x_mm: 5,
      safe_retract_z_mm: 5,
      safe: false,
    } as unknown as ReturnType<typeof latheCollisionZoneEngine.checkAll>);
    const r = run(part());
    const crit = r.warnings.find((w) => w.stage === "collision" && w.severity === "critical");
    expect(crit).toBeTruthy();
    expect(crit!.message).toMatch(/SIM-COLLISION/);
    expect(r.success).toBe(false);     // emission suppressed by the critical warning
    expect(r.program_text).toBe("");
  });

  it("HAPPY PATH: a normal part with no collision critical_errors still emits", () => {
    const r = run(part());
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
  });
});

describe("G31 -- silent safety-check catches now surface a warning (fail-LOUD)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("a THROWN chuck-jaw centrifugal check SURFACES a safety warning (was silent log.debug)", () => {
    vi.spyOn(chuckJawForceEngine, "calculate").mockImplementation(() => { throw new Error("boom-chuckjaw"); });
    const r = run(part());
    const w = r.warnings.find((x) => x.stage === "safety" && /[Cc]huck-jaw centrifugal.*SKIPPED/.test(x.message));
    expect(w).toBeTruthy();
    expect(w!.message).toMatch(/boom-chuckjaw/);
    // The skipped check is advisory -- the program still emits (it is not a hard collision block)
    expect(r.success).toBe(true);
  });
});

describe("G40 -- cannedCycleFor reports the Okuma dialect (G71, not Fanuc G76)", () => {
  it("a single-point thread op's canned_cycle metadata is G71 (matches the emitted OSP cycle)", () => {
    const r = run(threadPart());
    const threadOp = r.operations.find((o) => String(o.operation_type).includes("thread"));
    expect(threadOp).toBeTruthy();
    expect((threadOp as { canned_cycle?: string }).canned_cycle).toBe("G71");
  });
});
