import { describe, it, expect } from "vitest";
import { classifyProvenVcDeviation } from "../engines/SpeedFeedOrchestratorEngine.js";

/**
 * U-OSC-PROVEN-SFM-DIAGNOSTIC -- the proven-blend decision is now a pure, tested helper. The blend band
 * [0.7, 1.3] is unchanged (an SFM-as-m/min value at ~3.28x physics is still rejected, so it can NEVER
 * inflate a recommendation), and a ~3.28x ratio is additionally FLAGGED as a units mismatch so the silent
 * data-utility waste (Task #12) is visible. See reference_oscar_proven_css_sfm_mitigated_not_dangerous_2026_06_25.
 */
describe("classifyProvenVcDeviation (U-OSC-PROVEN-SFM-DIAGNOSTIC)", () => {
  it("proven within +-30% of physics -> blends (withinBlendBand), not a units artifact", () => {
    const d = classifyProvenVcDeviation(180, 200); // ratio 0.9
    expect(d.withinBlendBand).toBe(true);
    expect(d.sfmUnitsArtifact).toBe(false);
    expect(d.ratio).toBeCloseTo(0.9, 5);
  });

  it("proven ~3.28x physics (SFM stored as m/min) -> rejected by the band AND flagged a units artifact", () => {
    const physicsVc = 200;
    const provenVc = physicsVc * 3.281; // the 1/0.3048 SFM->m/min signature
    const d = classifyProvenVcDeviation(provenVc, physicsVc);
    expect(d.withinBlendBand).toBe(false); // outside [0.7,1.3] -> never inflates the recommendation
    expect(d.sfmUnitsArtifact).toBe(true);
    expect(d.ratio).toBeCloseTo(3.281, 3);
  });

  it("a merely aggressive proven program (1.5x) is rejected but NOT mislabeled a units artifact", () => {
    const d = classifyProvenVcDeviation(300, 200); // ratio 1.5
    expect(d.withinBlendBand).toBe(false);
    expect(d.sfmUnitsArtifact).toBe(false); // 1.5 < 2.8 -> plain "differs", not a units flag
  });

  it("blend band is inclusive at the [0.7, 1.3] boundaries (band preserved exactly)", () => {
    expect(classifyProvenVcDeviation(70, 100).withinBlendBand).toBe(true); // 0.7
    expect(classifyProvenVcDeviation(130, 100).withinBlendBand).toBe(true); // 1.3
    expect(classifyProvenVcDeviation(69, 100).withinBlendBand).toBe(false); // 0.69
    expect(classifyProvenVcDeviation(131, 100).withinBlendBand).toBe(false); // 1.31
  });

  it("non-finite / non-positive physics -> NaN ratio, neither blend nor artifact (no divide-by-zero)", () => {
    const z = classifyProvenVcDeviation(200, 0);
    expect(Number.isNaN(z.ratio)).toBe(true);
    expect(z.withinBlendBand).toBe(false);
    expect(z.sfmUnitsArtifact).toBe(false);
    const n = classifyProvenVcDeviation(NaN, 200);
    expect(Number.isNaN(n.ratio)).toBe(true);
    expect(n.sfmUnitsArtifact).toBe(false);
  });

  it("the SFM-artifact band [2.8, 3.6] brackets 1/0.3048 but excludes a 2x or 4x outlier", () => {
    expect(classifyProvenVcDeviation(560, 200).sfmUnitsArtifact).toBe(true); // 2.8 boundary
    expect(classifyProvenVcDeviation(720, 200).sfmUnitsArtifact).toBe(true); // 3.6 boundary
    expect(classifyProvenVcDeviation(400, 200).sfmUnitsArtifact).toBe(false); // 2.0
    expect(classifyProvenVcDeviation(800, 200).sfmUnitsArtifact).toBe(false); // 4.0
  });
});
