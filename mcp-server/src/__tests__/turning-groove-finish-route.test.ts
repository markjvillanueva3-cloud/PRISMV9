/**
 * turning-groove-finish-route.test.ts -- slot:whiskey (Lathe Wizard, gap-sweep fills G23)
 * ============================================================================
 * G23 (P1, from LATHE-WIZARD-GAP-INVENTORY-2026-06-29): a tight-tolerance groove feature plans
 * ["groove","groove_finish"] (autoAssignOps), but mapOkumaOpType only matched `s === "groove"` --
 * `groove_finish` fell through to the `od_rough` catch-all, so a groove's FINISH pass emitted a G85
 * LAP ROUGHING cycle instead of a groove. Fixed by routing `groove_finish` -> "groove" (same geometry
 * case + OSP groove emit). The echo-side single-finish-plunge refinement (vs the roughing multi-plunge)
 * is a separate post-side gap.
 *
 * Intent (R9): a groove_finish op now emits the OSP groove cycle and NO G85 roughing block (which is
 * what it emitted before the fix when it routed to od_rough).
 */
import { describe, it, expect } from "vitest";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

// A single groove feature whose ONLY op is the finish pass (forced) -- isolates the groove_finish
// routing so a stray G85 can only come from groove_finish mis-routing to od_rough.
const grooveFinishPart = () => ({
  part_number: "GROOVE-FIN",
  material: { material_name: "1018", iso_group: "P" as const },
  bar_stock_od_mm: 40,
  part_length_mm: 60,
  features: [
    { id: "g1", type: "groove_od" as const, od_mm: 40, length_mm: 5, position_z_mm: -20,
      groove_width_mm: 4, groove_depth_mm: 5, depth_mm: 5,
      required_operations: ["groove_finish" as const],
      x_start_mm: 40, x_end_mm: 30, z_start_mm: -20, z_end_mm: -25 },
  ],
  controller: "okuma",
  machine_model: "Okuma LB3000",
});
const run = (i: unknown) => turningPrintToProgramEngine.runPipeline(i as PipeIn);

describe("G23 -- groove_finish routes to the OSP groove cycle (was od_rough G85 roughing)", () => {
  it("the planner produces a groove_finish op (the gap is reachable)", () => {
    const r = run(grooveFinishPart());
    expect(r.operations.some((o) => o.operation_type === "groove_finish")).toBe(true);
  });

  it("the groove_finish op emits an OSP GROOVE cycle, NOT a G85 LAP roughing block", () => {
    const r = run(grooveFinishPart());
    expect(r.success).toBe(true);
    // groove emit signature (generateGroovingCycle): plunge to groove bottom + G4 dwell
    expect(/PLUNGE TO GROOVE BOTTOM|REDUCED CSS FOR GROOVING/.test(r.program_text)).toBe(true);
    // before the fix groove_finish -> od_rough emitted a G85 LAP block; after the fix there is none
    expect((r.program_text.match(/G85/g) || []).length).toBe(0);
  });
});
