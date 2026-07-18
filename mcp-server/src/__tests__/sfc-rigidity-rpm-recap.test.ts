import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

/**
 * U-OSC-RIGIDITY-CAP-REAPPLY -- machine_rigidity scales the TARGET Vc AFTER the primary machine/holder
 * max-RPM cap, then recomputed rpm. The machine max-RPM is a HARD physical limit, so the cap must be
 * RE-APPLIED after rigidity scaling; otherwise high rigidity (1.1) commands rpm ABOVE the machine max
 * (e.g. a 6mm 6061 cut already capped at 12000 RPM was pushed to ~13197 -- an over-speed spindle command).
 *
 * R9 intent: the safety invariant spindle_rpm <= machine_max_rpm must hold for EVERY rigidity tier. The
 * 6mm/high-rigidity case yields ~13197 RPM WITHOUT the re-cap -- this test fails on a revert.
 */
describe("SFC rigidity RPM re-cap (U-OSC-RIGIDITY-CAP-REAPPLY)", () => {
  const base = {
    iso_group: "N" as const,
    material: "6061 aluminum",
    flutes: 3,
    tool_material: "carbide",
    operation: "milling" as const,
    cut_type: "finishing" as const,
  };

  it("high rigidity on an already-capped 6mm cut: rpm stays at the machine max (not pushed above it)", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      ...base,
      tool_diameter_mm: 6,
      machine_max_rpm: 12000,
      machine_rigidity: "high", // 1.1x -- without the re-cap this pushes rpm to ~13197 (> 12000)
    });

    // THE fix: rigidity must never command rpm above the machine's hard max.
    expect(r.spindle_rpm.value).toBe(12000);
    expect(r.rpm_capped).toBe(true);
    // Achievable Vc re-capped to the 12k-RPM surface speed (rigidity cannot beat an RPM limit).
    const cappedVc = (Math.PI * 6 * 12000) / 1000; // ~226.19
    expect(r.cutting_speed.value).toBeCloseTo(cappedVc, 0);
    // The uncapped recommendation reflects the rigidity-scaled target (460 * 1.1 ~= 506), strictly above achievable.
    expect(r.cutting_speed_uncapped!.value).toBeGreaterThan(490);
    expect(r.cutting_speed_uncapped!.value).toBeLessThan(525);
    expect(r.cutting_speed.value).toBeLessThan(r.cutting_speed_uncapped!.value);
  });

  it("high rigidity on an uncapped 25mm cut: Vc scales up ~1.1x, no cap fires", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      ...base,
      tool_diameter_mm: 25,
      machine_rigidity: "high", // default max-RPM 15000; 506 m/min at 25mm = ~6443 RPM, under the cap
    });

    expect(r.rpm_capped).toBe(false);
    expect(r.spindle_rpm.value).toBeLessThan(15000);
    // base 460 * 1.1 ~= 506 -- the rigidity scaling is preserved when no cap intervenes.
    expect(r.cutting_speed.value).toBeGreaterThan(490);
    expect(r.cutting_speed.value).toBeLessThan(525);
    // No cap -> uncapped is byte-identical to the achievable cutting_speed.
    expect(r.cutting_speed_uncapped!.value).toBe(r.cutting_speed.value);
  });

  it("safety invariant: spindle_rpm <= machine_max_rpm for EVERY rigidity tier (6mm, 12k cap)", () => {
    for (const machine_rigidity of ["low", "medium", "high"] as const) {
      const r = ultimateSpeedFeedEngine.calculate({
        ...base,
        tool_diameter_mm: 6,
        machine_max_rpm: 12000,
        machine_rigidity,
      });
      expect(r.spindle_rpm.value).toBeLessThanOrEqual(12000);
    }
  });
});
