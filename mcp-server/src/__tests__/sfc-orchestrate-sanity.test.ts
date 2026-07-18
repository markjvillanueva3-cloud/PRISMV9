/**
 * sfc-orchestrate-sanity.test.ts (slot:oscar, 2026-06-22)
 *
 * Regression guard CLOSING Bug 4 from reference_sfc_speed_feed_bugs_2026_05_31: sf_orchestrate
 * (SpeedFeedOrchestratorEngine.compute, the production web-UI SFC engine via prism_calc:sf_orchestrate)
 * was reported (2026-05-31) to (a) crash `input.machine_name.toLowerCase is not a function` on certain
 * machine inputs and (b) emit physically-absurd output (Vc ~20 m/min for steel, ap 50mm for a face mill,
 * tool_life maxed at 9999). The existing route-contract test only asserts the result is `defined` (weak),
 * so it would not catch an absurd-but-present Vc. This pins physically-sane output for a normal steel
 * milling request with a STRING machine_name -- so a regression to either failure mode fails loudly.
 *
 * Reference: carbide end mill in 1045 steel (~200 HB), roughing -> Vc in the ~80-220 m/min window
 * (Sandvik/Machinery's Handbook general carbide milling). The orchestrator's default is conservative
 * (~80 m/min) but well inside the sane band; the guard bounds are deliberately wide (40-400) so a
 * legitimate physics re-tune does not break it, while the Bug-4 failure (Vc ~20, or a throw) does.
 */
import { describe, it, expect } from "vitest";
import { speedFeedOrchestratorEngine as ORCH } from "../engines/SpeedFeedOrchestratorEngine.js";

const STEEL_MILL = {
  material: "1045",
  iso_group: "P",
  hardness_hb: 200,
  tool_diameter_mm: 12,
  flutes: 4,
  tool_material: "carbide",
  operation: "milling",
  cut_type: "roughing",
  axial_depth_mm: 3,
  radial_depth_mm: 6,
  machine_name: "Haas VF-2", // STRING -- Bug 4 crashed on .toLowerCase of a non-string
  machine_power_kw: 22.4,
  machine_max_rpm: 8100,
} as const;

describe("sf_orchestrate sanity (Bug 4 regression guard)", () => {
  it("a proper steel milling request with a STRING machine_name does not throw", () => {
    expect(() => ORCH.compute({ ...STEEL_MILL } as never)).not.toThrow();
  });

  it("returns physically-sane Vc / rpm / feed / power for carbide-in-steel (not the Bug-4 absurd Vc~20)", () => {
    const r = ORCH.compute({ ...STEEL_MILL } as never).value;
    expect(r.cutting_speed_mpm).toBeGreaterThan(40);  // Bug 4 emitted ~20 m/min (66 SFM) -- absurdly slow
    expect(r.cutting_speed_mpm).toBeLessThan(400);
    expect(r.spindle_rpm).toBeGreaterThan(0);
    expect(Number.isFinite(r.feed_rate_mmmin)).toBe(true);
    expect(r.feed_rate_mmmin).toBeGreaterThan(0);
    expect(r.power_kw).toBeGreaterThan(0);
    expect(r.mrr_cm3min).toBeGreaterThan(0);
  });

  it("is material-aware: aluminum (ISO N) runs a higher Vc than steel (ISO P)", () => {
    const steel = ORCH.compute({ ...STEEL_MILL } as never).value;
    const alu = ORCH.compute({ ...STEEL_MILL, material: "6061", iso_group: "N", hardness_hb: 95 } as never).value;
    expect(alu.cutting_speed_mpm).toBeGreaterThan(steel.cutting_speed_mpm);
  });
});
