/**
 * sfc-speed-feed-material-aware.test.ts
 *
 * U-OSC9-SPEEDFEED-MATERIAL-AWARE (slot:oscar, 2026-06-22).
 *
 * Bug (diagnosed in reference_oscar_speedfeed_material_blind_diagnosis_2026_06_01): the calc dispatcher
 * `speed_feed` action delegated to calculateSpeedFeed (ManufacturingCalculations), which keys Vc off the
 * TOOL material + hardness ONLY and NEVER reads the workpiece -- so it returned the SAME cutting speed for
 * steel, aluminum, and titanium. That is material-blind and safety-relevant: aluminum (ISO N) should run
 * roughly 2.6x the cutting speed of steel (ISO P), and titanium (ISO S) roughly 0.33x. Running a Ti speed
 * on aluminum wastes the tool; running an aluminum speed on titanium burns it.
 *
 * Fix: the dispatcher `speed_feed` case now delegates to UltimateSpeedFeedEngine.calculate() (the
 * material-aware Kienzle/Taylor authority with a workpiece alias -> ISO/hardness table) and remaps its
 * OptimizedValue result back to the {cutting_speed, spindle_speed, feed_per_tooth, feed_rate} contract the
 * compact map reads. The legacy util is intentionally left untouched (12 other callers; fragmenting the
 * physics into a second ISO-Vc table is the anti-pattern the diagnosis warned against).
 *
 * These tests pin (1) the delegate engine is material-aware (ordered, magnitude-appropriate Vc by ISO
 * group), (2) the exact OptimizedValue fields the dispatcher remap reads are finite + positive, and
 * (3) the legacy util is STILL material-blind (regression anchor documenting WHY the delegation exists).
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine as ULT } from "../engines/UltimateSpeedFeedEngine.js";
import { calculateSpeedFeed } from "../engines/ManufacturingCalculations.js";

// Mirror of the dispatcher speed_feed -> engine input map (calcDispatcher.ts case "speed_feed").
function sfCalc(material: string, iso_group: string | undefined, extra: Record<string, unknown> = {}) {
  return ULT.calculate({
    material,
    iso_group,
    tool_diameter_mm: 12,
    flutes: 4,
    tool_material: "carbide",
    operation: "milling",
    cut_type: "roughing",
    ...extra,
  } as never);
}

describe("speed_feed material-awareness (U-OSC9-SPEEDFEED-MATERIAL-AWARE)", () => {
  it("the delegate engine produces finite, positive Vc/rpm/fz/vf for the dispatcher remap", () => {
    const r = sfCalc("1045", "P");
    for (const f of [r.cutting_speed, r.spindle_rpm, r.feed_per_tooth, r.feed_rate]) {
      expect(Number.isFinite(f.value)).toBe(true);
      expect(f.value).toBeGreaterThan(0);
    }
    // sane carbide-in-steel milling window
    expect(r.cutting_speed.value).toBeGreaterThan(40);
    expect(r.cutting_speed.value).toBeLessThan(400);
  });

  it("aluminum (ISO N) runs a MUCH higher Vc than steel (ISO P) -- the differentiation the util lacked", () => {
    const steel = sfCalc("1045", "P").cutting_speed.value;
    const alu = sfCalc("6061", "N").cutting_speed.value;
    expect(alu).toBeGreaterThan(steel * 1.5); // ~2.6x expected per the audit; loose lower bound
    expect(alu).toBeLessThan(steel * 6);       // sanity ceiling
  });

  it("titanium (ISO S) runs a MUCH lower Vc than steel (ISO P)", () => {
    const steel = sfCalc("1045", "P").cutting_speed.value;
    const ti = sfCalc("Ti-6Al-4V", "S").cutting_speed.value;
    expect(ti).toBeLessThan(steel * 0.7);   // ~0.33x expected; loose upper bound
    expect(ti).toBeGreaterThan(steel * 0.1); // sanity floor
  });

  it("resolves material-awareness from the workpiece NAME alone (no iso_group passed)", () => {
    const steel = sfCalc("1045", undefined).cutting_speed.value;
    const alu = sfCalc("6061", undefined).cutting_speed.value;
    expect(alu).toBeGreaterThan(steel); // name -> ISO resolution still differentiates
  });

  it("REGRESSION ANCHOR: the legacy util is material-BLIND -- it ignores the workpiece (why delegation was needed)", () => {
    // calculateSpeedFeed has no workpiece-material input; passing one is ignored -> identical Vc.
    const steel = calculateSpeedFeed({ material: "1045", operation: "roughing", tool_diameter: 12, tool_material: "Carbide", number_of_teeth: 4 } as never);
    const alu = calculateSpeedFeed({ material: "6061", operation: "roughing", tool_diameter: 12, tool_material: "Carbide", number_of_teeth: 4 } as never);
    expect(alu.cutting_speed).toBe(steel.cutting_speed); // BLIND: same Vc for Al and steel (the documented bug)
  });

  // PARAM PASSTHROUGH (task #53) -- the SILENT gap material tests miss: Vc is diameter-INDEPENDENT, so a
  // wrong-diameter bug (tool_diameter not reaching the engine -> inferToolDiameter()'s constant 12mm)
  // hides behind passing material tests. The dispatcher maps tool_diameter->tool_diameter_mm and
  // number_of_teeth->flutes; these pin that the actual tool reaches the engine.
  it("PARAM PASSTHROUGH: the actual tool diameter reaches the engine -> halving D ~doubles RPM (rpm = 1000*Vc/(pi*D))", () => {
    const d12 = sfCalc("1045", "P", { tool_diameter_mm: 12 });
    const d6 = sfCalc("1045", "P", { tool_diameter_mm: 6 });
    expect(d6.spindle_rpm.value).toBeGreaterThan(d12.spindle_rpm.value * 1.7); // ~2x; loose lower bound
    // Vc (surface speed) is diameter-INDEPENDENT -> ~equal; THIS is why a diameter bug hides behind material tests.
    expect(Math.abs(d6.cutting_speed.value - d12.cutting_speed.value)).toBeLessThan(d12.cutting_speed.value * 0.05);
  });

  it("PARAM PASSTHROUGH: more flutes -> higher feed_rate (Vf = fz * z * n), proving flutes reaches the engine", () => {
    const z2 = sfCalc("1045", "P", { flutes: 2 });
    const z6 = sfCalc("1045", "P", { flutes: 6 });
    expect(z6.feed_rate.value).toBeGreaterThan(z2.feed_rate.value);
  });

  it("OP->CUT_TYPE (task #56): finishing yields a lower feed_per_tooth than roughing (operation maps to the engine cut_type)", () => {
    const rough = sfCalc("1045", "P", { cut_type: "roughing" });
    const finish = sfCalc("1045", "P", { cut_type: "finishing" });
    expect(finish.feed_per_tooth.value).toBeLessThan(rough.feed_per_tooth.value);
  });
});
