/**
 * turning-livetool-faillout.test.ts -- slot:whiskey (Lathe Wizard, U-LW-LIVETOOL-FAILLOUD)
 * ============================================================================
 * The 7 live-tooling TurningFeatureTypes (whistle_notch / od_pocket_mill / cross_drill / cross_tap /
 * keyway / flat_mill / hex_mill) are valid feature types but have NO `inferOperations` case in the
 * turning spine -- they silently fell to `default: return ["od_rough"]`, so a keyway / cross-drilled
 * part produced a silent (wrong-op) clamping analysis with no warning that the turning spine doesn't
 * natively program live-tooling. This surfaces a LOUD warning instead.
 *
 * Intent (R9): a live-tool feature ALWAYS raises a clamping-stage warning naming the feature type and
 * pointing at mill-turn programming; a plain turning part raises NO such warning and still generates.
 * Warning-only -- emitted program_text is unchanged (the od_rough fallback is kept).
 */
import { describe, it, expect } from "vitest";
import { latheOrchestrationEngine } from "../engines/LatheOrchestrationEngine.js";

const LIVE_TOOL_TYPES = [
  "whistle_notch", "od_pocket_mill", "cross_drill", "cross_tap", "keyway", "flat_mill", "hex_mill",
] as const;

const odTurnFeature = () => ({
  id: "f1", type: "od_turn", od_mm: 30, length_mm: 60, position_z_mm: 0,
  x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60,
});

// a part with a normal OD-turn feature (so the program generates) PLUS one live-tool feature
const partWithLiveTool = (liveToolType: string) =>
  ({
    part_number: "LIVETOOL-" + liveToolType,
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [
      odTurnFeature(),
      { id: "f2", type: liveToolType, od_mm: 30, length_mm: 10, depth_mm: 3, position_z_mm: -20,
        x_start_mm: 30, x_end_mm: 27, z_start_mm: -20, z_end_mm: -30 },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

const plainTurningPart = () =>
  ({
    part_number: "PLAIN-OD",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [odTurnFeature()],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

const hasLiveToolWarning = (r: { warnings: Array<{ message: string }> }, type: string) =>
  r.warnings.some((w) => /\[live-tooling\]/.test(w.message) && w.message.includes(type));

describe("U-LW-LIVETOOL-FAILLOUD -- live-tool feature types raise a loud warning (not silent od_rough)", () => {
  it.each(LIVE_TOOL_TYPES)("warns loudly for a '%s' feature (turning spine does not natively plan it)", (type) => {
    const r = latheOrchestrationEngine.calculate("x", partWithLiveTool(type));
    expect(hasLiveToolWarning(r, type)).toBe(true);
    // the warning points the operator at mill-turn programming -- it is not silently swallowed
    const w = r.warnings.find((x) => /\[live-tooling\]/.test(x.message) && x.message.includes(type));
    expect(w?.message).toMatch(/mill-turn/);
  });

  it("a plain OD-turn part raises NO live-tooling warning and still generates a program", () => {
    const r = latheOrchestrationEngine.calculate("x", plainTurningPart());
    expect(r.warnings.some((w) => /\[live-tooling\]/.test(w.message))).toBe(false);
    expect(r.operations.length).toBeGreaterThan(0); // generation unaffected
  });

  it("WARNING-ONLY: a live-tool feature does not abort generation of the turning ops on the same part", () => {
    // the od_turn feature still yields turning operations; the live-tool feature only adds a warning
    const r = latheOrchestrationEngine.calculate("x", partWithLiveTool("keyway"));
    expect(hasLiveToolWarning(r, "keyway")).toBe(true);
    expect(r.operations.length).toBeGreaterThan(0); // the od_turn feature still produced ops
  });
});
