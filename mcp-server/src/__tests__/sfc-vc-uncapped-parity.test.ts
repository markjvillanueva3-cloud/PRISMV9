import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";
import { speedFeedTriComparatorEngine } from "../engines/SpeedFeedTriComparatorEngine.js";

/**
 * U-OSC-VC-UNCAPPED-PARITY -- the achievable cutting_speed is reduced by the machine/holder max-RPM cap,
 * but vendor cribs publish UNCAPPED surface speeds. These tests pin the additive cutting_speed_uncapped +
 * rpm_capped fields so a holder-balance-capped Vc (the 6mm aluminum 460->226 @ G6.3 12k case that was
 * misread as a "3.5x aluminum under-prediction") is reported as a machine constraint, NOT a physics bug.
 *
 * R9 intent: the assertions encode the algebraic invariant cap_Vc = pi*D*maxRPM/1000, so they fail if the
 * uncapped field is made to merely alias cutting_speed, or if the cap flag is hardcoded.
 */
describe("SFC uncapped-Vc parity (U-OSC-VC-UNCAPPED-PARITY)", () => {
  it("6mm aluminum finishing: uncapped ~460, achievable capped to the 12k-RPM surface speed, rpm_capped=true", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      iso_group: "N",
      material: "6061 aluminum",
      tool_diameter_mm: 6,
      flutes: 3,
      tool_material: "carbide",
      operation: "milling",
      cut_type: "finishing",
      machine_max_rpm: 12000,
    });

    expect(r.rpm_capped).toBe(true);
    // Uncapped = the material-aware ISO-N balanced base (~460 m/min) -- NOT a material-blind 226.
    // Reading `.value` throws if the field is absent, so the range check also proves it is present.
    expect(r.cutting_speed_uncapped!.value).toBeGreaterThan(440);
    expect(r.cutting_speed_uncapped!.value).toBeLessThan(480);
    // Achievable (post-cap) Vc must be STRICTLY below the uncapped recommendation -- the cap actually bit.
    expect(r.cutting_speed.value).toBeLessThan(r.cutting_speed_uncapped!.value);
    // Algebraic invariant: a capped Vc equals pi * D * maxRPM / 1000 at the cap RPM (12000).
    expect(r.spindle_rpm.value).toBe(12000);
    const expectedCappedVc = (Math.PI * 6 * 12000) / 1000; // ~226.19
    expect(r.cutting_speed.value).toBeCloseTo(expectedCappedVc, 0);
  });

  it("25mm aluminum finishing: same surface speed needs only ~5.9k RPM -> no cap -> uncapped === achievable", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      iso_group: "N",
      material: "6061 aluminum",
      tool_diameter_mm: 25,
      flutes: 3,
      tool_material: "carbide",
      operation: "milling",
      cut_type: "finishing",
      // no machine_max_rpm -> default 15000; 460 m/min at 25mm = ~5857 RPM, well under the cap.
    });

    expect(r.rpm_capped).toBe(false);
    // When no cap fires the uncapped surface speed is byte-identical to the achievable cutting_speed.
    expect(r.cutting_speed_uncapped!.value).toBe(r.cutting_speed.value);
    expect(r.spindle_rpm.value).toBeLessThan(15000);
  });

  it("tri-comparator surfaces vc_uncapped_mpm + rpm_capped on the PRISM opinion and warns when capped", () => {
    const res = speedFeedTriComparatorEngine.run({
      material: { iso_group: "N", name: "6061 aluminum" },
      tooling: { tool_diameter_mm: 6, flutes: 3, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "finishing" },
      // externals off: deterministic + no env-dependent vendor-file reads; PRISM opinion is always built.
      include_baseline: false,
      include_hsmadvisor: false,
      include_gwizard: false,
    });

    const prism = res.systems.find((s) => s.system === "prism")!;
    expect(prism.rpm_capped).toBe(true);
    expect(prism.vc_uncapped_mpm!).toBeGreaterThan(440);
    expect(prism.vc_uncapped_mpm!).toBeLessThan(480);
    // The reported achievable Vc is the post-cap value, strictly below the uncapped recommendation.
    expect(prism.axes!.vc_mpm).toBeLessThan(prism.vc_uncapped_mpm!);
    // The report must EXPLAIN the gap so the cap is never read as an under-prediction.
    expect(res.warnings.some((w) => /RPM-CAPPED/.test(w))).toBe(true);
  });

  it("tri-comparator: an uncapped cell carries rpm_capped=false, vc_uncapped===vc_mpm, and no cap warning", () => {
    const res = speedFeedTriComparatorEngine.run({
      material: { iso_group: "N", name: "6061 aluminum" },
      tooling: { tool_diameter_mm: 25, flutes: 3, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "finishing" },
      include_baseline: false,
      include_hsmadvisor: false,
      include_gwizard: false,
    });

    const prism = res.systems.find((s) => s.system === "prism")!;
    expect(prism.rpm_capped).toBe(false);
    expect(prism.vc_uncapped_mpm).toBe(prism.axes!.vc_mpm);
    expect(res.warnings.some((w) => /RPM-CAPPED/.test(w))).toBe(false);
  });
});
