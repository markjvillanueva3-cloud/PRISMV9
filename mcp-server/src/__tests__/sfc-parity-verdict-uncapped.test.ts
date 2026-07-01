import { describe, it, expect } from "vitest";
import { speedFeedTriComparatorEngine } from "../engines/SpeedFeedTriComparatorEngine.js";

/**
 * U-OSC-PARITY-VERDICT-UNCAPPED -- the prism_vs_consensus + pairwise agreement metrics feed calibration
 * ("a large PRISM-vs-consensus gap is where calibration would learn"). External vendors are UNCAPPED, so
 * comparing PRISM's machine/holder-RPM-capped achievable Vc against them injects a FALSE gap that
 * calibration would chase (the exact false-bug U-OSC-VC-CAP-NOT-A-BUG diagnosed). The verdict must use
 * PRISM's UNCAPPED recommendation; axes.vc_mpm (capped) stays the operator-facing value.
 *
 * R9 intent: for a capped aluminum cell, the verdict's PRISM Vc must be ~460 (uncapped, real -41% gap vs
 * the 775 vendor median) NOT ~226 (the -71% cap artifact). Fails if the verdict reverts to axes.vc_mpm.
 */
describe("SFC parity verdict uses uncapped Vc (U-OSC-PARITY-VERDICT-UNCAPPED)", () => {
  it("capped cell: prism_vs_consensus compares the UNCAPPED Vc (real modeling gap), not the cap artifact", () => {
    const res = speedFeedTriComparatorEngine.run({
      material: { iso_group: "N", name: "6061 aluminum" },
      tooling: { tool_diameter_mm: 6, flutes: 3, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "finishing" },
      include_baseline: true, // offline literature DB -> consensus present
      include_hsmadvisor: false,
      include_gwizard: false,
    });

    const prism = res.systems.find((s) => s.system === "prism")!;
    expect(prism.rpm_capped).toBe(true); // sanity: this 6mm aluminum cell IS RPM-capped
    expect(res.prism_vs_consensus).not.toBeNull();

    const vcAxis = res.prism_vs_consensus!.per_axis.find((a) => a.axis === "vc")!;
    // The verdict's PRISM Vc must be the UNCAPPED recommendation (~460), not the capped achievable (~226).
    expect(vcAxis.prism).toBeGreaterThan(440);
    expect(vcAxis.prism).toBeLessThan(480);
    // ...and must be well above the capped operator value still reported in axes.vc_mpm.
    expect(vcAxis.prism).toBeGreaterThan(prism.axes!.vc_mpm + 50);
    // The real residual gap (uncapped 460 vs ~775 vendor median) is far smaller than the cap artifact (-71%).
    expect(Math.abs(vcAxis.delta_pct)).toBeLessThan(0.6);
  });

  it("uncapped cell: parity verdict uses axes.vc_mpm unchanged (no behavior change off the capped path)", () => {
    const res = speedFeedTriComparatorEngine.run({
      material: { iso_group: "N", name: "6061 aluminum" },
      tooling: { tool_diameter_mm: 25, flutes: 3, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "finishing" },
      include_baseline: true,
      include_hsmadvisor: false,
      include_gwizard: false,
    });

    const prism = res.systems.find((s) => s.system === "prism")!;
    expect(prism.rpm_capped).toBe(false);
    const vcAxis = res.prism_vs_consensus!.per_axis.find((a) => a.axis === "vc")!;
    // Not capped -> the parity axes are the (unchanged) capped===achievable axes.
    expect(vcAxis.prism).toBe(prism.axes!.vc_mpm);
  });
});
