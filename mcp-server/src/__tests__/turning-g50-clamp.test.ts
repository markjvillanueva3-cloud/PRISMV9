/**
 * turning-g50-clamp.test.ts -- slot:whiskey (Lathe Wizard, U-LW-01)
 * ============================================================================
 * G50 max-RPM clamp from REAL centrifugal physics (PHASE 0 safety, fail-CLOSED). The pipeline already
 * ran ChuckJawForceEngine as an ADVISORY (it warned if rpm > max_safe_rpm); this CLOSES the loop --
 * the emitted Okuma G50 spindle cap is now clamped to the centrifugal-safe RPM (the speed where
 * centrifugal grip-loss drops chuck grip to the cutting force), so the program can never command a
 * speed that ejects the part. Invariants: the cap NEVER exceeds the machine max (monotonic, fail-safe),
 * the clamp surfaces an operator note, and a light part is left at the machine max.
 */
import { describe, it, expect } from "vitest";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

function part(od: number, len: number, maxRpm: number) {
  return {
    part_number: "G50-TEST",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: od,
    part_length_mm: len,
    max_spindle_rpm: maxRpm,
    features: [
      { id: "f1", type: "od_turn" as const, od_mm: od - 4, length_mm: len * 0.8, position_z_mm: 0,
        x_start_mm: od, x_end_mm: od - 4, z_start_mm: 0, z_end_mm: -(len * 0.8) },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  };
}
const run = (i: ReturnType<typeof part>) => turningPrintToProgramEngine.runPipeline(i as unknown as PipeIn);
const g50 = (r: ReturnType<typeof run>): number | undefined => {
  const m = r.program_text.match(/G50\s+S(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
};
const clampNote = (r: ReturnType<typeof run>) => r.warnings.some((w) => /G50 spindle clamp set to centrifugal-safe/.test(w.message));

describe("U-LW-01 -- G50 centrifugal-safe RPM clamp", () => {
  it("SAFETY INVARIANT: the emitted G50 cap never exceeds the machine max RPM", () => {
    const v = g50(run(part(50, 100, 8000)));
    expect(v).toBeGreaterThan(0);
    expect(v!).toBeLessThanOrEqual(8000);
  });

  it("CLOSE-THE-LOOP: with an absurd machine max, the physics-bounded safe RPM binds -> G50 < max + surfaced", () => {
    const r = run(part(50, 100, 50000)); // 50000 rpm machine max -> centrifugal-safe RPM is the binding cap
    const v = g50(r);
    expect(v).toBeGreaterThan(0);
    expect(v!).toBeLessThan(50000);     // clamped by the centrifugal physics, not the machine max
    expect(clampNote(r)).toBe(true);    // operator told the cap was tightened + why
  });

  it("MONOTONIC: lowering the machine max can only lower-or-hold the G50 cap (never raises it)", () => {
    const hi = g50(run(part(50, 100, 50000)))!;
    const lo = g50(run(part(50, 100, 1000)))!;
    expect(lo).toBeLessThanOrEqual(hi); // min(1000, safe) <= min(50000, safe)
  });

  it("NO false clamp: a part whose safe RPM exceeds a modest machine max stays at the machine max, no note", () => {
    const r = run(part(50, 100, 1000)); // light-ish part, 1000 rpm max -> safe RPM almost certainly > 1000
    expect(g50(r)).toBe(1000);          // cap = machine max (clamp inactive)
    expect(clampNote(r)).toBe(false);
  });
});
