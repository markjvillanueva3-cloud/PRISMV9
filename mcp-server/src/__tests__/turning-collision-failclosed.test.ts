/**
 * turning-collision-failclosed.test.ts -- slot:whiskey (Lathe Wizard, U-LW-02)
 * ============================================================================
 * PHASE 0 safety. The collision-verification block in runPipeline was wrapped in a SILENT try/catch
 * (log.debug only) -- so if the collision engine CRASHED, the program emitted collision-UNVERIFIED
 * with no operator signal (fail-OPEN, a real-machine crash hazard). This proves the loop now fails
 * CLOSED: a thrown collision check pushes a CRITICAL warning that suppresses emission, while a normal
 * part with a working check still emits (no false block). Intent (R9): you cannot ship an unverified
 * shop-floor program, and you cannot block a verified one.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";
import { latheCollisionZoneEngine } from "../engines/LatheCollisionZoneEngine.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

const part = () => ({
  part_number: "COLL-TEST",
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
const run = () => turningPrintToProgramEngine.runPipeline(part() as unknown as PipeIn);

describe("U-LW-02 -- collision check fails CLOSED (no silent fail-open)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("HAPPY PATH: a normal part with a working collision check emits (no false block)", () => {
    const r = run();
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
    expect(Array.isArray(r.collision_checks)).toBe(true);
  });

  it("FAIL-CLOSED: when the collision check THROWS, emission is BLOCKED with a critical warning", () => {
    vi.spyOn(latheCollisionZoneEngine, "checkAll").mockImplementation(() => { throw new Error("boom-collision-engine"); });
    const r = run();
    expect(r.success).toBe(false);     // emit suppressed
    expect(r.program_text).toBe("");   // no program emitted
    const crit = r.warnings.find((w) => w.stage === "collision" && w.severity === "critical");
    expect(crit?.message).toMatch(/Collision verification FAILED to run/);
    expect(crit?.message).toMatch(/emission blocked/);
  });

  it("the fail-closed message names the underlying error so the operator can diagnose", () => {
    vi.spyOn(latheCollisionZoneEngine, "checkAll").mockImplementation(() => { throw new Error("boom-collision-engine"); });
    const r = run();
    expect(r.warnings.some((w) => /boom-collision-engine/.test(w.message))).toBe(true);
  });
});
