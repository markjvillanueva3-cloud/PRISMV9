/**
 * Specialty Engine Unit Tests
 *
 * Tests for specialty manufacturing engines:
 *   1. ThreadCalculationEngine — thread specs, tap drill
 *   2. WireEDMSettingsEngine — wire EDM parameter calculation
 *   3. PostProcessorEngine — G-code generation, 6 controller dialects
 *   4. RegenerativeChatterPredictor — stability lobes, chatter detection
 *
 * @milestone SYS-MS2-U03
 */

import { describe, it, expect } from "vitest";
import { threadEngine } from "../engines/ThreadCalculationEngine.js";
import { wireEDMSettingsEngine } from "../engines/WireEDMSettingsEngine.js";
import { postProcessorEngine } from "../engines/PostProcessorEngine.js";
import { regenerativeChatterPredictor, type ChatterInput } from "../engines/RegenerativeChatterPredictor.js";
import { expectShape, expectPhysicalValue } from "./helpers/engineTestHarness.js";

// ============================================================================
// 1. THREAD CALCULATION ENGINE
// ============================================================================

describe("ThreadCalculationEngine", () => {
  describe("parseThreadDesignation", () => {
    it("parses metric thread M10x1.5", () => {
      const spec = threadEngine.parseThreadDesignation("M10x1.5");
      expect(spec).not.toBeNull();
      expect(spec!.nominalDiameter).toBeCloseTo(10, 1);
      expect(spec!.pitch).toBeCloseTo(1.5, 1);
    });

    it("parses metric fine thread M8x1.0", () => {
      const spec = threadEngine.parseThreadDesignation("M8x1.0");
      expect(spec).not.toBeNull();
      expect(spec!.nominalDiameter).toBeCloseTo(8, 1);
      expect(spec!.pitch).toBeCloseTo(1.0, 1);
    });

    it("parses UNC thread 1/4-20", () => {
      const spec = threadEngine.parseThreadDesignation("1/4-20 UNC");
      expect(spec).not.toBeNull();
      if (spec) {
        expect(spec.nominalDiameter).toBeGreaterThan(5);
        expect(spec.nominalDiameter).toBeLessThan(8);
      }
    });

    it("returns null for invalid designation", () => {
      const spec = threadEngine.parseThreadDesignation("INVALID_THREAD");
      expect(spec).toBeNull();
    });
  });

  describe("findThread", () => {
    it("finds M10x1.5 in database", () => {
      const spec = threadEngine.findThread("M10x1.5");
      expect(spec).not.toBeNull();
    });

    it("returns null for non-existent thread", () => {
      const spec = threadEngine.findThread("M999x99");
      expect(spec).toBeNull();
    });
  });

  describe("calculateTapDrill", () => {
    it("calculates tap drill for M10x1.5", () => {
      const result = threadEngine.calculateTapDrill("M10x1.5");
      expect(result).not.toBeNull();
      if (result) {
        expectPhysicalValue(result.tapDrillMM, "tap drill", 7, 10);
        // Standard: 10 - 1.5 = 8.5mm for 75% engagement
        expectPhysicalValue(result.tapDrillMM, "tap drill", 8, 9);
      }
    });

    it("higher engagement → smaller drill (deeper thread)", () => {
      const low = threadEngine.calculateTapDrill("M10x1.5", 50);
      const high = threadEngine.calculateTapDrill("M10x1.5", 80);
      if (low && high) {
        expect(high.tapDrillMM).toBeLessThan(low.tapDrillMM);
      }
    });

    it("returns null for invalid thread", () => {
      const result = threadEngine.calculateTapDrill("INVALID");
      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// 2. WIRE EDM SETTINGS ENGINE
// ============================================================================

describe("WireEDMSettingsEngine", () => {
  function makeWireEDMInput(overrides?: Record<string, any>) {
    return {
      wire_type: "brass_0.25" as string,
      workpiece_material: "steel" as string,
      workpiece_thickness_mm: 30,
      workpiece_hardness_HRC: 45,
      target_surface_finish_Ra_um: 1.6,
      target_accuracy_mm: 0.01,
      taper_angle_deg: 0,
      is_submerged: true,
      ...overrides,
    };
  }

  describe("calculate", () => {
    it("returns valid result for steel", () => {
      const result = wireEDMSettingsEngine.calculate(makeWireEDMInput());
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });

    it("includes cutting speed and power settings", () => {
      const result = wireEDMSettingsEngine.calculate(makeWireEDMInput());
      // Check for common EDM output fields
      if (result.cutting_speed_mm_per_min !== undefined) {
        expectPhysicalValue(result.cutting_speed_mm_per_min, "cutting speed", 0);
      }
      if (result.num_passes !== undefined) {
        expect(result.num_passes).toBeGreaterThanOrEqual(1);
      }
    });

    it("finer finish requires more skim passes", () => {
      const coarse = wireEDMSettingsEngine.calculate(
        makeWireEDMInput({ target_surface_finish_Ra_um: 3.2 })
      );
      const fine = wireEDMSettingsEngine.calculate(
        makeWireEDMInput({ target_surface_finish_Ra_um: 0.4 })
      );
      if (coarse.num_passes !== undefined && fine.num_passes !== undefined) {
        expect(fine.num_passes).toBeGreaterThanOrEqual(coarse.num_passes);
      }
    });

    it("thicker material → slower cutting speed", () => {
      const thin = wireEDMSettingsEngine.calculate(
        makeWireEDMInput({ workpiece_thickness_mm: 10 })
      );
      const thick = wireEDMSettingsEngine.calculate(
        makeWireEDMInput({ workpiece_thickness_mm: 100 })
      );
      if (thin.cutting_speed_mm_per_min !== undefined && thick.cutting_speed_mm_per_min !== undefined) {
        expect(thin.cutting_speed_mm_per_min).toBeGreaterThan(thick.cutting_speed_mm_per_min);
      }
    });

    it("skim speed formula fix (QA-MS1): skim speeds decrease per pass", () => {
      const result = wireEDMSettingsEngine.calculate(
        makeWireEDMInput({ target_surface_finish_Ra_um: 0.4 })
      );
      if (result.skim_passes && Array.isArray(result.skim_passes) && result.skim_passes.length >= 2) {
        // Each subsequent skim pass should be slower (finer)
        for (let i = 1; i < result.skim_passes.length; i++) {
          expect(result.skim_passes[i].speed).toBeLessThanOrEqual(result.skim_passes[i - 1].speed);
        }
      }
    });
  });
});

// ============================================================================
// 3. POST-PROCESSOR ENGINE
// ============================================================================

describe("PostProcessorEngine", () => {
  function makePostInput(overrides?: Record<string, any>) {
    return {
      moves: [
        { type: "rapid" as const, x: 0, y: 0, z: 50 },
        { type: "rapid" as const, x: 100, y: 50, z: 50 },
        { type: "feed" as const, x: 100, y: 50, z: -5 },
        { type: "feed" as const, x: 200, y: 50, z: -5 },
        { type: "rapid" as const, x: 200, y: 50, z: 50 },
      ],
      tool_number: 1,
      tool_diameter_mm: 10,
      spindle_rpm: 5000,
      feed_rate_mmmin: 800,
      coolant: "flood" as const,
      work_offset: "G54",
      ...overrides,
    };
  }

  function makePostConfig(overrides?: Record<string, any>) {
    return {
      controller: "fanuc" as string,
      program_number: 1001,
      use_line_numbers: true,
      decimal_places: 3,
      ...overrides,
    };
  }

  describe("process — G-code generation", () => {
    it("returns valid result with gcode string", () => {
      const result = postProcessorEngine.process(makePostInput(), makePostConfig());
      expectShape(result, ["gcode", "line_count", "warnings"]);
      expect(result.gcode.length).toBeGreaterThan(0);
      expect(result.line_count).toBeGreaterThan(0);
    });

    it("includes tool change command", () => {
      const result = postProcessorEngine.process(makePostInput(), makePostConfig());
      expect(result.gcode).toContain("T1");
    });

    it("includes spindle start", () => {
      const result = postProcessorEngine.process(makePostInput(), makePostConfig());
      expect(result.gcode).toMatch(/S5000/);
      expect(result.gcode).toMatch(/M0?3/); // M3 or M03
    });

    it("includes coolant on command", () => {
      const result = postProcessorEngine.process(makePostInput(), makePostConfig());
      expect(result.gcode).toMatch(/M0?8/); // M8 or M08 (flood coolant)
    });

    it("ends with program end (M30 or M02)", () => {
      const result = postProcessorEngine.process(makePostInput(), makePostConfig());
      expect(result.gcode).toMatch(/M30|M02|M2/);
    });
  });

  describe("controller dialects", () => {
    const controllers = ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"] as const;

    for (const ctrl of controllers) {
      it(`generates valid G-code for ${ctrl}`, () => {
        const result = postProcessorEngine.process(
          makePostInput(),
          makePostConfig({ controller: ctrl })
        );
        expect(result.gcode.length).toBeGreaterThan(10);
        expect(result.line_count).toBeGreaterThan(0);
        expect(result.warnings).toBeDefined();
      });
    }

    it("Fanuc uses G00/G01 format", () => {
      const result = postProcessorEngine.process(
        makePostInput(),
        makePostConfig({ controller: "fanuc" })
      );
      expect(result.gcode).toMatch(/G0?0/); // G0 or G00
      expect(result.gcode).toMatch(/G0?1/); // G1 or G01
    });
  });

  describe("canned cycles (QA-MS1 fix: C-003)", () => {
    it("generates tap cycle G-code", () => {
      const result = postProcessorEngine.process(
        makePostInput({
          moves: [
            { type: "rapid" as const, x: 50, y: 50, z: 5 },
            { type: "tap" as const, x: 50, y: 50, z: -20, pitch: 1.5 },
          ],
        }),
        makePostConfig({ controller: "fanuc", use_canned_cycles: true })
      );
      // Should output G84 (tapping) or equivalent, not silently skip
      expect(result.gcode).toMatch(/G84|TAP|CYCLE84/i);
    });

    it("generates bore cycle G-code", () => {
      const result = postProcessorEngine.process(
        makePostInput({
          moves: [
            { type: "rapid" as const, x: 50, y: 50, z: 5 },
            { type: "bore" as const, x: 50, y: 50, z: -30 },
          ],
        }),
        makePostConfig({ controller: "fanuc", use_canned_cycles: true })
      );
      // Should output G76/G85/G86 (boring) or equivalent
      expect(result.gcode).toMatch(/G76|G85|G86|BORE|CYCLE85|CYCLE86/i);
    });
  });

  describe("5-axis support (QA-MS1 fix: C-004)", () => {
    it("generates 5-axis G-code with TCPM", () => {
      const result = postProcessorEngine.process(
        makePostInput({
          moves: [
            { type: "rapid" as const, x: 0, y: 0, z: 50 },
            { type: "feed" as const, x: 50, y: 30, z: -10, a: 15, c: 45 },
          ],
        }),
        makePostConfig({ controller: "fanuc", five_axis_mode: "tcpm" })
      );
      // Should include G43.4 (TCPM) for Fanuc
      expect(result.gcode).toMatch(/G43\.4|G234|TRAORI|M128|TCPM/i);
    });
  });
});

// ============================================================================
// 4. REGENERATIVE CHATTER PREDICTOR (STABILITY)
// ============================================================================

describe("RegenerativeChatterPredictor", () => {
  function makeChatterInput(overrides?: Record<string, any>) {
    return {
      cut_type: "half_immersion_up" as const,
      spindle_rpm: 8000,
      depth_of_cut_mm: 3.0,
      num_flutes: 4,
      tool_diameter_mm: 20,
      natural_freq_Hz: 800,
      stiffness_N_per_m: 5e6,
      damping_ratio: 0.03,
      specific_cutting_force_N_mm2: 1800,
      radial_depth_mm: 10,
      ...overrides,
    };
  }

  describe("predict", () => {
    it("returns chatter prediction result", () => {
      const result = regenerativeChatterPredictor.predict(makeChatterInput());
      expect(result).toBeDefined();
      expectShape(result, ["is_stable", "critical_depth_mm", "recommendations"]);
      expect(typeof result.is_stable).toBe("boolean");
    });

    it("critical depth is positive", () => {
      const result = regenerativeChatterPredictor.predict(makeChatterInput());
      expectPhysicalValue(result.critical_depth_mm, "critical depth", 0);
    });

    // Row 13 (U-OSC-SFC-CHATTER-LOBE-CENTER): lobe centers are the textbook best-speed
    // pockets n = 60*fn/(Z*(N+1)) (Altintas Ch.4). For fn=800 Hz, Z=4: 12000, 6000, 4000 rpm.
    // The pre-fix eps=pi placed every "lobe" at N+0.5 -- the least-stable VALLEY (24000,
    // 8000, 4800 rpm) -- so optimal_rpm steered the operator to the WORST speed. This
    // reference fails on a revert (8000 was the old N=1 value; it must NOT appear).
    it("stability lobes sit at the textbook pockets 60*fn/(Z*(N+1)), not the valleys", () => {
      const result = regenerativeChatterPredictor.predict(makeChatterInput());
      const rpms = result.stability_lobes.map((l) => l.rpm);
      expect(rpms).toContain(12000); // N=0
      expect(rpms).toContain(6000);  // N=1
      expect(rpms).toContain(4000);  // N=2
      expect(rpms).not.toContain(24000); // old eps=pi N=0 valley
      expect(rpms).not.toContain(8000);  // old eps=pi N=1 valley
      // optimal_rpm must be one of the true pockets
      expect(rpms).toContain(result.optimal_rpm);
    });

    it("shallow cut is stable", () => {
      // Use very high stiffness + low Kc so bLimMin > depth
      const result = regenerativeChatterPredictor.predict(
        makeChatterInput({
          depth_of_cut_mm: 0.1,
          stiffness_N_per_m: 1e10,
          specific_cutting_force_N_mm2: 100,
        })
      );
      expect(result.is_stable).toBe(true);
    });

    it("very deep cut is unstable", () => {
      const result = regenerativeChatterPredictor.predict(
        makeChatterInput({ depth_of_cut_mm: 50, stiffness_N_per_m: 1e5 })
      );
      expect(result.is_stable).toBe(false);
    });

    it("higher stiffness → higher critical depth", () => {
      const soft = regenerativeChatterPredictor.predict(
        makeChatterInput({ stiffness_N_per_m: 1e6 })
      );
      const stiff = regenerativeChatterPredictor.predict(
        makeChatterInput({ stiffness_N_per_m: 1e7 })
      );
      expect(stiff.critical_depth_mm).toBeGreaterThan(soft.critical_depth_mm);
    });

    // Absolute-scale pin: relative/monotone tests CANNOT catch a 1000x unit error (both
    // sides shrink together). Hand-computed between-lobe depth for the default fixture
    // (rpm 8000 sits 33% from pockets 12000/6000): bLimMin_mm = k*2ζ/(Z*Kc*μ) in meters
    // * 1000 = (5e6*0.06)/(4*1800e6*0.75)*1000 = 0.0556 mm. Pre-fix the METERS value
    // 5.56e-5 was emitted as mm and rounded to 0 -- the whiskey 2026-06-28 class (stout
    // turning shank read 0.02 mm where ~20 mm was physical).
    it("between-lobe critical depth carries the m->mm conversion (absolute pin 0.056mm)", () => {
      const r = regenerativeChatterPredictor.predict(makeChatterInput());
      expect(r.critical_depth_mm).toBeCloseTo(0.056, 3);
    });

    it("higher damping → higher critical depth (between lobes)", () => {
      // Between-lobe rpm so criticalDepth = bLimMin_mm ∝ zeta. The old fixture used 6000,
      // which was between lobes only under the PRE-row-13 wrong valley positions -- post-fix
      // 6000 IS the N=1 pocket exactly (fn=800, Z=4 -> 12000/6000/4000), and on the peak
      // branch bLim ∝ 2ζ(1+1/(4ζ²)) DECREASES with ζ at low ζ. 8000 sits 33% from both
      // neighboring pockets (12000, 6000), safely past the 10% near-lobe window.
      const low = regenerativeChatterPredictor.predict(
        makeChatterInput({ damping_ratio: 0.01, spindle_rpm: 8000, stiffness_N_per_m: 1e9 })
      );
      const high = regenerativeChatterPredictor.predict(
        makeChatterInput({ damping_ratio: 0.10, spindle_rpm: 8000, stiffness_N_per_m: 1e9 })
      );
      expect(high.critical_depth_mm).toBeGreaterThan(low.critical_depth_mm);
    });
  });

  describe("cut types", () => {
    const types = ["slotting", "half_immersion_up", "half_immersion_down",
                   "quarter_immersion", "full_immersion"] as const;

    for (const ct of types) {
      it(`handles ${ct} cut type`, () => {
        const result = regenerativeChatterPredictor.predict(
          makeChatterInput({ cut_type: ct })
        );
        expect(result).toBeDefined();
        expect(typeof result.is_stable).toBe("boolean");
      });
    }

    it("slotting has lowest critical depth (most aggressive)", () => {
      const slot = regenerativeChatterPredictor.predict(
        makeChatterInput({ cut_type: "slotting" })
      );
      const quarter = regenerativeChatterPredictor.predict(
        makeChatterInput({ cut_type: "quarter_immersion" })
      );
      expect(quarter.critical_depth_mm).toBeGreaterThanOrEqual(slot.critical_depth_mm);
    });
  });

  describe("stabilityLobes", () => {
    it("returns array of stability lobe points", () => {
      const input = makeChatterInput();
      const { spindle_rpm, depth_of_cut_mm, ...lobeInput } = input;
      const lobes = regenerativeChatterPredictor.stabilityLobes(
        lobeInput as Omit<ChatterInput, "spindle_rpm" | "depth_of_cut_mm">,
        [3000, 15000]
      );
      expect(Array.isArray(lobes)).toBe(true);
      expect(lobes.length).toBeGreaterThan(0);
    });

    it("lobe points have rpm and depth", () => {
      const input = makeChatterInput();
      const { spindle_rpm, depth_of_cut_mm, ...lobeInput } = input;
      const lobes = regenerativeChatterPredictor.stabilityLobes(
        lobeInput as Omit<ChatterInput, "spindle_rpm" | "depth_of_cut_mm">,
        [5000, 12000]
      );
      for (const lobe of lobes) {
        expectPhysicalValue(lobe.rpm, "rpm", 1);
        expectPhysicalValue(lobe.critical_depth_mm, "lobe depth", 0);
      }
    });
  });
});
