/**
 * turning-spine-result-surface.test.ts -- slot:whiskey (Lathe Wizard, U-LW-SPINE-RESULT-SURFACE)
 * ============================================================================
 * Sequel to U-LW-AIHEAD-SPINE. After the spine (LatheOrchestrationEngine.calculate) was wired to emit
 * real G-code via runPipeline, its RESULT METADATA was still stub: operations/cycle-time came from the
 * spine's own stub reporting stages and collision_checks was HARDCODED to []. This surfaces runPipeline's
 * already-computed result (stored on state.pipeline_result) through the spine's result -- so a consumer
 * (the AI head, /system-viz, the dispatcher) sees the REAL operations, cycle-time, tool-changes, and
 * collision-checks. Strictly ADDITIVE: program_text (the emitted G-code) is unchanged; only metadata.
 *
 * Intent (R9): the spine's metadata fields EQUAL what runPipeline computed (faithful surfacing); the
 * emitted program is byte-identical (additive, no G-code change). A revert to the hardcoded [] / stub
 * operations breaks the equality.
 */
import { describe, it, expect } from "vitest";
import { latheOrchestrationEngine } from "../engines/LatheOrchestrationEngine.js";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";

const part = () =>
  ({
    part_number: "SPINE-SURFACE",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [
      { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 60, position_z_mm: 0,
        x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

describe("U-LW-SPINE-RESULT-SURFACE -- spine surfaces runPipeline's real metadata", () => {
  it("operations / total_operations / total_tool_changes / cycle-time EQUAL runPipeline's (was stub)", () => {
    const direct = turningPrintToProgramEngine.runPipeline(part() as never);
    const spine = latheOrchestrationEngine.calculate("generate", part());
    // runPipeline produced real operations -- proves there is non-trivial data to surface
    expect(direct.operations.length).toBeGreaterThan(0);
    expect(spine.operations.length).toBe(direct.operations.length);
    expect(spine.total_operations).toBe(direct.total_operations);
    expect(spine.total_tool_changes).toBe(direct.total_tool_changes);
    expect(spine.estimated_cycle_time_sec).toBeCloseTo(direct.estimated_cycle_time_sec, 3);
  });

  it("collision_checks come from runPipeline (was hardcoded [] in the spine result)", () => {
    const direct = turningPrintToProgramEngine.runPipeline(part() as never);
    const spine = latheOrchestrationEngine.calculate("generate", part());
    // faithful surfacing: the spine's collision_checks deep-equal runPipeline's (whatever it computed),
    // never the old hardcoded [] when runPipeline has data.
    expect(spine.collision_checks ?? []).toEqual(direct.collision_checks ?? []);
  });

  it("ADDITIVE: the emitted program_text is unchanged (metadata surfaced, G-code untouched)", () => {
    const stripTs = (s: string) =>
      s.replace(/\(GENERATED:[^)]*\)/g, "(GENERATED)").replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, "<TS>").trim();
    const direct = turningPrintToProgramEngine.runPipeline(part() as never);
    const spine = latheOrchestrationEngine.calculate("generate", part());
    expect(stripTs(spine.program_text)).toBe(stripTs(direct.program_text));
  });
});
