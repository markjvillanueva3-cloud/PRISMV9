/**
 * R9 tests for the helix-awareness advisory in UltimateSpeedFeedEngine.
 * The core Fr/Fa force ratios are a fixed ~30deg-helix simplification; this advisory
 * makes the recommendation auto-flag helix effects -- high-helix axial pull-out
 * (Fa = Fc*tan(helix)), straight/low-helix radial impact, and the variable-helix
 * chatter-suppression benefit -- WITHOUT touching the safety-bearing force clamps.
 * Verifies the advisory fires by helix value and stays silent when no helix is given.
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const BASE = { iso_group: "P" as const, tool_diameter_mm: 10, flutes: 4, operation: "milling" as const };

describe("UltimateSpeedFeedEngine -- helix-awareness advisory", () => {
  it("flags high axial pull-out AND the variable-helix chatter benefit for a 45deg variable-helix mill", () => {
    const r = ultimateSpeedFeedEngine.calculate({ ...BASE, helix_angle_deg: 45, variable_helix: true });
    const w = r.warnings.join(" | ");
    expect(w).toMatch(/High helix/i);
    expect(w).toMatch(/axial pull-out/i);
    expect(w).toMatch(/Variable-helix/i);
    expect(w).toMatch(/stable depth of cut/i);
  });

  it("flags straight/low-helix radial impact for a 2deg flute", () => {
    const r = ultimateSpeedFeedEngine.calculate({ ...BASE, helix_angle_deg: 2 });
    expect(r.warnings.join(" | ")).toMatch(/Straight\/low-helix/i);
  });

  it("does NOT flag a standard 30deg helix as either high or low (mid band is silent)", () => {
    const r = ultimateSpeedFeedEngine.calculate({ ...BASE, helix_angle_deg: 30 });
    const w = r.warnings.join(" | ");
    expect(w).not.toMatch(/High helix/i);
    expect(w).not.toMatch(/Straight\/low-helix/i);
  });

  it("emits NO helix advisory when neither helix_angle_deg nor variable_helix is given (non-regressing)", () => {
    const r = ultimateSpeedFeedEngine.calculate({ ...BASE });
    const w = r.warnings.join(" | ");
    expect(w).not.toMatch(/helix/i);
  });
});
