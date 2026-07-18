/**
 * turning-secondary-machining.test.ts -- slot:whiskey (Lathe Wizard, U-LW-MT-01)
 * ============================================================================
 * Operator directive 2026-06-29: cover ALL lathe capabilities incl. mill-turn and Swiss processes.
 * A pure-turning program is INCOMPLETE for a part that needs live tooling (cross-holes/flats/keyway/
 * hex), a sub-spindle (back-side / dual-spindle cutoff), or a Swiss sliding-headstock (long slender
 * small-OD work). `detectSecondaryMachiningRequirements` makes the wizard AWARE of + HONEST about
 * that (R12): it surfaces each required secondary capability, whether the resolved machine advertises
 * it, and the live-tool emit-fidelity limit -- as WARNING-severity advisories that never block emit.
 *
 * Intent these tests encode (R9):
 *   - a pure-turning part needs NO secondary capability (no false positive);
 *   - every live-tool feature type AND every live-tool signal field trips live_tooling + c_axis;
 *   - a sub-spindle / dual-spindle part trips sub_spindle, and a Multus profile advertises it;
 *   - slender small-OD geometry trips the Swiss recommendation with the correct L/D;
 *   - an unknown machine reports support "unknown", never a fabricated "no";
 *   - END-TO-END, a live-tool part pushes a secondary_machining WARNING (never critical -> never
 *     suppresses the program) and attaches the assessment; a pure-turning part does neither.
 */
import { describe, it, expect } from "vitest";
import {
  turningPrintToProgramEngine,
  detectSecondaryMachiningRequirements,
} from "../engines/TurningPrintToProgramEngine.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

describe("detectSecondaryMachiningRequirements -- pure capability detection", () => {
  it("PURE TURNING: an OD/face part needs no secondary capability (no false positive)", () => {
    const a = detectSecondaryMachiningRequirements({
      features: [
        { id: "f1", type: "od_straight" },
        { id: "f2", type: "face" },
      ],
      bar_stock_od_mm: 40,
      part_length_mm: 60,
      machine_model: "Okuma LB3000",
    });
    expect(a.needs_secondary).toBe(false);
    expect(a.required).toEqual([]);
    expect(a.swiss_recommended).toBe(false);
    expect(a.advisories).toEqual([]);
  });

  it("LIVE TOOL by feature TYPE: cross_drill requires live_tooling + c_axis with a driver row", () => {
    const a = detectSecondaryMachiningRequirements({
      features: [
        { id: "f1", type: "od_straight" },
        { id: "x1", type: "cross_drill", cross_hole_diameter_mm: 6 },
      ],
      bar_stock_od_mm: 40,
      part_length_mm: 60,
      machine_model: "Okuma LB3000",
    });
    expect(a.required).toContain("live_tooling");
    expect(a.required).toContain("c_axis");
    expect(a.needs_secondary).toBe(true);
    expect(a.drivers.some((d) => d.feature_id === "x1" && d.capability === "live_tooling")).toBe(true);
    // The fidelity advisory is always surfaced when live tooling is needed (R12 honesty).
    expect(a.advisories.some((m) => /generic OSP C-axis cycle/.test(m))).toBe(true);
  });

  it("every live-tool feature TYPE is detected (whistle_notch/keyway/flat_mill/hex_mill/cross_tap/od_pocket_mill)", () => {
    for (const t of ["whistle_notch", "od_pocket_mill", "cross_drill", "cross_tap", "keyway", "flat_mill", "hex_mill"]) {
      const a = detectSecondaryMachiningRequirements({
        features: [{ id: "f", type: t }],
        bar_stock_od_mm: 40, part_length_mm: 60, machine_model: "Okuma LB3000",
      });
      expect(a.required, `type ${t} should require live_tooling`).toContain("live_tooling");
    }
  });

  it("ADVERSARIAL signal-only: a feature with ONLY c_axis_position_deg (no live type) still trips live tooling", () => {
    const byAngle = detectSecondaryMachiningRequirements({
      features: [{ id: "f", type: "od_straight", c_axis_position_deg: 90 }],
      bar_stock_od_mm: 40, part_length_mm: 60, machine_model: "Okuma LB3000",
    });
    expect(byAngle.required).toContain("live_tooling");
    const byTool = detectSecondaryMachiningRequirements({
      features: [{ id: "f", type: "od_straight", live_tool_diameter_mm: 8 }],
      bar_stock_od_mm: 40, part_length_mm: 60, machine_model: "Okuma LB3000",
    });
    expect(byTool.required).toContain("live_tooling");
  });

  it("SUB-SPINDLE: dual-spindle cutoff trips sub_spindle, and the Multus profile advertises it", () => {
    const multus = detectSecondaryMachiningRequirements({
      features: [{ id: "f1", type: "od_straight" }],
      bar_stock_od_mm: 40, part_length_mm: 60,
      sub_spindle: true, machine_model: "Okuma Multus B250",
    });
    expect(multus.required).toContain("sub_spindle");
    expect(multus.machine_supports.sub_spindle).toBe(true); // Multus advancedFeatures lists sub-spindle
    expect(multus.advisories.some((m) => /no-drop transfer/.test(m))).toBe(true);

    const dual = detectSecondaryMachiningRequirements({
      features: [{ id: "f1", type: "od_straight" }],
      bar_stock_od_mm: 40, part_length_mm: 60,
      dual_spindle_cutoff: true, machine_model: "Okuma LB3000",
    });
    expect(dual.required).toContain("sub_spindle");
  });

  it("SWISS: a slender small-OD part (OD20 x L240, L/D=12) recommends Swiss with the correct L/D", () => {
    const a = detectSecondaryMachiningRequirements({
      features: [{ id: "f1", type: "od_straight" }],
      bar_stock_od_mm: 20, part_length_mm: 240, machine_model: "Okuma LB3000",
    });
    expect(a.swiss_recommended).toBe(true);
    expect(a.length_to_diameter).toBe(12);
    expect(a.required).toContain("swiss_guide_bushing");
    expect(a.machine_supports.swiss_guide_bushing).toBe(false); // no JM Okuma fleet machine is Swiss-type
    expect(a.advisories.some((m) => /Swiss \/ sliding-headstock class/.test(m))).toBe(true);
  });

  it("NO false Swiss: a stout part (OD60 x L24, L/D=0.4) and a large-OD long part are NOT Swiss", () => {
    const stout = detectSecondaryMachiningRequirements({
      features: [{ id: "f1", type: "od_straight" }],
      bar_stock_od_mm: 60, part_length_mm: 24, machine_model: "Okuma LB3000",
    });
    expect(stout.swiss_recommended).toBe(false);
    // Long but large OD (L/D=12 but OD 60 > Swiss bar class) -> not Swiss (steady-rest territory only).
    const bigBar = detectSecondaryMachiningRequirements({
      features: [{ id: "f1", type: "od_straight" }],
      bar_stock_od_mm: 60, part_length_mm: 720, machine_model: "Okuma LB3000",
    });
    expect(bigBar.swiss_recommended).toBe(false);
  });

  it("UNKNOWN machine: support is reported as \"unknown\", never a fabricated \"no\"", () => {
    const a = detectSecondaryMachiningRequirements({
      features: [{ id: "x1", type: "cross_drill" }],
      bar_stock_od_mm: 40, part_length_mm: 60, machine_model: "Acme FooLathe 9000",
    });
    expect(a.required).toContain("live_tooling");
    expect(a.machine_supports.live_tooling).toBe("unknown");
  });

  it("DEGENERATE: empty features + zero geometry -> no throw, no requirement, L/D 0", () => {
    const a = detectSecondaryMachiningRequirements({ features: [], bar_stock_od_mm: 0, part_length_mm: 0 });
    expect(a.needs_secondary).toBe(false);
    expect(a.length_to_diameter).toBe(0);
    expect(a.swiss_recommended).toBe(false);
    // missing features array entirely
    const b = detectSecondaryMachiningRequirements({});
    expect(b.needs_secondary).toBe(false);
  });
});

describe("secondary machining -- END-TO-END through runPipeline (advisory, never blocks)", () => {
  const liveTurnPart = () => ({
    part_number: "MT-TEST",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [
      { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 60, position_z_mm: 0,
        x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 },
      { id: "x1", type: "cross_drill" as const, length_mm: 10, position_z_mm: -20,
        c_axis_position_deg: 90, live_tool_diameter_mm: 6, cross_hole_diameter_mm: 6 },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  });
  const pureTurnPart = () => ({
    part_number: "TURN-ONLY",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 60,
    features: [
      { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 50, position_z_mm: 0,
        x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -50 },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  });
  const run = (i: unknown) => turningPrintToProgramEngine.runPipeline(i as PipeIn);

  it("a live-tool part pushes a secondary_machining WARNING and attaches the assessment", () => {
    const r = run(liveTurnPart());
    const w = r.warnings.find((x) => x.stage === "secondary_machining");
    expect(w).toBeTruthy();
    expect(w!.severity).toBe("warning"); // NEVER critical -> never suppresses the program
    expect(r.secondary_machining?.needs_secondary).toBe(true);
    expect(r.secondary_machining?.required).toContain("live_tooling");
  });

  it("the secondary_machining advisory does NOT block emission (program still emits)", () => {
    const r = run(liveTurnPart());
    expect(r.program_text.length).toBeGreaterThan(0);
    // no secondary_machining warning was escalated to critical
    expect(r.warnings.some((x) => x.stage === "secondary_machining" && x.severity === "critical")).toBe(false);
  });

  it("a pure-turning part has NO secondary_machining warning and no assessment attached", () => {
    const r = run(pureTurnPart());
    expect(r.warnings.some((x) => x.stage === "secondary_machining")).toBe(false);
    expect(r.secondary_machining).toBeUndefined();
  });
});
