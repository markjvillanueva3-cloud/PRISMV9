/**
 * ToolpathCalculations — Unit Tests
 *
 * Tests for engagement angles, trochoidal, HSM, scallop height, stepover,
 * cycle time, arc fitting, chip thinning, multi-pass, coolant strategy, G-code.
 *
 * Includes FORGE-DEBUG regression tests for fixes in commit 4cc0ee8a:
 *   - Conventional milling entry/exit angles (entry < exit, both positive)
 *   - Average chip thickness integral formula (fz × ae / (R × φ_rad))
 *
 * @milestone SYS-MS2-U04
 */

import { describe, it, expect } from "vitest";
import {
  calculateEngagementAngle,
  calculateTrochoidalParams,
  calculateHSMParams,
  calculateScallopHeight,
  calculateOptimalStepover,
  estimateCycleTime,
  calculateArcFitting,
  calculateChipThinning,
  calculateMultiPassStrategy,
  recommendCoolantStrategy,
  generateGCodeSnippet,
} from "../engines/ToolpathCalculations.js";

// ============================================================================
// 1. calculateEngagementAngle
// ============================================================================

describe("calculateEngagementAngle", () => {
  describe("happy path — climb milling", () => {
    it("returns all required fields", () => {
      const result = calculateEngagementAngle(20, 5, 0.15, true, 200);
      expect(result.arc_of_engagement).toBeDefined();
      expect(result.entry_angle).toBeDefined();
      expect(result.exit_angle).toBeDefined();
      expect(result.max_chip_thickness).toBeDefined();
      expect(result.average_chip_thickness).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it("arc of engagement is positive and <= 180°", () => {
      const result = calculateEngagementAngle(20, 5, 0.15, true, 200);
      expect(result.arc_of_engagement).toBeGreaterThan(0);
      expect(result.arc_of_engagement).toBeLessThanOrEqual(180);
    });

    it("full slot (ae = D) gives ~180° engagement", () => {
      const result = calculateEngagementAngle(20, 20, 0.15, true, 200);
      expect(result.arc_of_engagement).toBeCloseTo(180, 0);
    });

    it("half-diameter radial depth (ae = R, 50% immersion) gives 90 deg engagement", () => {
      // ae = D/2 = R -> cos(phi) = 1 - 2ae/D = 0 -> phi = acos(0) = 90 deg (the FULL arc).
      // Previously asserted 180 deg, which ENCODED the doubling bug -- corrected 2026-06-23.
      const result = calculateEngagementAngle(20, 10, 0.15, true, 200);
      expect(result.arc_of_engagement).toBeCloseTo(90, 0);
    });

    it("max chip thickness < feed per tooth", () => {
      const result = calculateEngagementAngle(20, 5, 0.15, true, 200);
      expect(result.max_chip_thickness).toBeGreaterThan(0);
      expect(result.max_chip_thickness).toBeLessThanOrEqual(0.15);
    });

    it("average chip thickness < max chip thickness", () => {
      const result = calculateEngagementAngle(20, 5, 0.15, true, 200);
      expect(result.average_chip_thickness).toBeGreaterThan(0);
      expect(result.average_chip_thickness).toBeLessThanOrEqual(result.max_chip_thickness);
    });
  });

  describe("FORGE-DEBUG regression: conventional milling angles", () => {
    it("conventional: entry_angle < exit_angle", () => {
      const result = calculateEngagementAngle(20, 5, 0.15, false, 200);
      expect(result.entry_angle).toBeLessThan(result.exit_angle);
    });

    it("conventional: both angles are positive", () => {
      const result = calculateEngagementAngle(20, 5, 0.15, false, 200);
      expect(result.entry_angle).toBeGreaterThanOrEqual(0);
      expect(result.exit_angle).toBeGreaterThan(0);
    });

    it("climb vs conventional produce consistent arc_of_engagement", () => {
      const climb = calculateEngagementAngle(20, 5, 0.15, true, 200);
      const conv = calculateEngagementAngle(20, 5, 0.15, false, 200);
      expect(climb.arc_of_engagement).toBeCloseTo(conv.arc_of_engagement, 1);
    });

    it("conventional exit - entry ≈ arc_of_engagement", () => {
      const result = calculateEngagementAngle(20, 5, 0.15, false, 200);
      const span = result.exit_angle - result.entry_angle;
      expect(span).toBeCloseTo(result.arc_of_engagement, 0);
    });
  });

  describe("FORGE-DEBUG regression: avg chip thickness integral formula", () => {
    it("avg chip = fz * ae / (R * phi) for partial engagement (25% immersion)", () => {
      // D=20, ae=5, fz=0.15, R=10. cos(phi) = 1 - 2ae/D = 0.5 -> phi = acos(0.5) = 60 deg
      // = 1.047 rad (the FULL engagement arc; the prior oracle DOUBLED it to 120 -> halved h_avg).
      // h_avg = 0.15 * 5 / (10 * 1.047) = 0.0716 mm.
      const result = calculateEngagementAngle(20, 5, 0.15, true, 200);
      const expected = 0.15 * 5 / (10 * (60 * Math.PI / 180));
      expect(result.average_chip_thickness).toBeCloseTo(expected, 3);
    });
  });

  describe("chip thinning compensation", () => {
    it("light engagement increases effective cutting speed", () => {
      const result = calculateEngagementAngle(20, 3, 0.15, true, 200);
      expect(result.effective_cutting_speed).toBeGreaterThan(200);
    });

    it("heavy engagement (>50%) does not increase speed", () => {
      const result = calculateEngagementAngle(20, 15, 0.15, true, 200);
      expect(result.effective_cutting_speed).toBe(200);
    });
  });

  describe("edge cases", () => {
    it("very light engagement produces thin-chip warning", () => {
      // ae=0.05 -> phi ~5.7 deg -> avg chip ~0.0075mm < 0.01 threshold -> rubbing warning.
      // (ae=0.1 now yields avg ~0.0106 > 0.01 after the avg-chip doubling fix, so use a lighter cut.)
      const result = calculateEngagementAngle(20, 0.05, 0.15, true, 200);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("no NaN in outputs", () => {
      const result = calculateEngagementAngle(20, 5, 0.15, true, 200);
      expect(Number.isNaN(result.arc_of_engagement)).toBe(false);
      expect(Number.isNaN(result.entry_angle)).toBe(false);
      expect(Number.isNaN(result.exit_angle)).toBe(false);
      expect(Number.isNaN(result.max_chip_thickness)).toBe(false);
      expect(Number.isNaN(result.average_chip_thickness)).toBe(false);
    });
  });

  // Reference-value lock for the 2026-06-23 engagement-arc doubling fix (physics-reviewer
  // adjudicated; Altintas "Manufacturing Automation" 2e Sec 2.4 + Eq 2.21). D=12, fz=0.10,
  // climb. cos(phi) = 1 - 2ae/D -> phi = 60/90/120/180 deg at 25/50/75/100% immersion.
  // These FAIL LOUDLY if anyone reintroduces a 2*phi factor (arc, entry/exit span, or avg).
  describe("engagement-arc reference values (R9 anti-doubling lock)", () => {
    const D = 12, FZ = 0.10;
    const CASES = [
      { ae: 3,  imm: 25,  arc: 60,  maxc: 0.0866, avg: 0.0477 },
      { ae: 6,  imm: 50,  arc: 90,  maxc: 0.1000, avg: 0.0637 },
      { ae: 9,  imm: 75,  arc: 120, maxc: 0.1000, avg: 0.0716 },
      { ae: 12, imm: 100, arc: 180, maxc: 0.1000, avg: 0.0637 },
    ];
    for (const c of CASES) {
      it(`${c.imm}% immersion: arc ${c.arc} deg + chip thickness match Altintas`, () => {
        const r = calculateEngagementAngle(D, c.ae, FZ, true, 150);
        expect(r.arc_of_engagement, `${c.imm}% arc must be ${c.arc} (not 2x)`).toBeCloseTo(c.arc, 0);
        expect(r.max_chip_thickness, `${c.imm}% max_chip`).toBeCloseTo(c.maxc, 3);
        expect(r.average_chip_thickness, `${c.imm}% avg_chip`).toBeCloseTo(c.avg, 3);
        // the mean uncut chip can never exceed the peak.
        expect(r.average_chip_thickness).toBeLessThanOrEqual(r.max_chip_thickness);
      });
    }

    it("avg chip peaks at 75% immersion; avg(50%) == avg(100%) (band symmetry)", () => {
      const a50 = calculateEngagementAngle(D, 6, FZ, true, 150).average_chip_thickness;
      const a75 = calculateEngagementAngle(D, 9, FZ, true, 150).average_chip_thickness;
      const a100 = calculateEngagementAngle(D, 12, FZ, true, 150).average_chip_thickness;
      expect(a75).toBeGreaterThan(a50);
      expect(a75).toBeGreaterThan(a100);
      expect(a50).toBeCloseTo(a100, 3); // both = 0.2/pi
    });

    it("climb enters deep (entry > exit); conventional enters at the wall (entry < exit)", () => {
      const climb = calculateEngagementAngle(D, 6, FZ, true, 150);
      const conv = calculateEngagementAngle(D, 6, FZ, false, 150);
      expect(climb.arc_of_engagement).toBeCloseTo(conv.arc_of_engagement, 3);
      expect(climb.entry_angle).toBeGreaterThan(climb.exit_angle);
      expect(conv.entry_angle).toBeLessThan(conv.exit_angle);
    });
  });
});

// ============================================================================
// 2. calculateTrochoidalParams
// ============================================================================

describe("calculateTrochoidalParams", () => {
  it("returns all required fields", () => {
    const result = calculateTrochoidalParams(20, 30, 15, 150, 0.08, 4);
    expect(result.trochoidal_width).toBeDefined();
    expect(result.engagement_percent).toBeDefined();
    expect(result.trochoidal_pitch).toBeDefined();
    expect(result.optimal_feed_rate).toBeDefined();
    expect(result.arc_radius).toBeDefined();
    expect(result.mrr).toBeDefined();
  });

  it("engagement is low (trochoidal advantage)", () => {
    const result = calculateTrochoidalParams(20, 30, 15, 150, 0.08, 4);
    expect(result.engagement_percent).toBeLessThan(25);
  });

  it("trochoidal pitch is positive", () => {
    const result = calculateTrochoidalParams(20, 30, 15, 150, 0.08, 4);
    expect(result.trochoidal_pitch).toBeGreaterThan(0);
  });

  it("produces finite values", () => {
    const result = calculateTrochoidalParams(20, 30, 15, 150, 0.08, 4);
    expect(Number.isFinite(result.trochoidal_width)).toBe(true);
    expect(Number.isFinite(result.engagement_percent)).toBe(true);
    expect(Number.isFinite(result.trochoidal_pitch)).toBe(true);
    expect(Number.isFinite(result.mrr)).toBe(true);
  });
});

// ============================================================================
// 3. calculateHSMParams
// ============================================================================

describe("calculateHSMParams", () => {
  // Actual signature: (tool_diameter, programmed_feedrate, machine_max_accel?, tolerance?)
  it("returns all required fields", () => {
    const result = calculateHSMParams(20, 5000);
    expect(result.corner_radius).toBeDefined();
    expect(result.max_direction_change).toBeDefined();
    expect(result.smoothing_tolerance).toBeDefined();
    expect(result.arc_fitting_tolerance).toBeDefined();
    expect(result.feed_rate_reduction).toBeDefined();
    expect(result.recommended_lead_in).toBeDefined();
    expect(result.chip_thinning_factor).toBeDefined();
    expect(result.warnings).toBeDefined();
  });

  it("higher feedrate requires larger corner radius", () => {
    const slow = calculateHSMParams(20, 2000);
    const fast = calculateHSMParams(20, 8000);
    expect(fast.corner_radius).toBeGreaterThan(slow.corner_radius);
  });

  it("max direction change is positive and finite", () => {
    const result = calculateHSMParams(20, 5000);
    expect(result.max_direction_change).toBeGreaterThan(0);
    expect(Number.isFinite(result.max_direction_change)).toBe(true);
  });

  it("produces finite values", () => {
    const result = calculateHSMParams(20, 5000);
    expect(Number.isFinite(result.corner_radius)).toBe(true);
    expect(Number.isFinite(result.smoothing_tolerance)).toBe(true);
    expect(Number.isFinite(result.arc_fitting_tolerance)).toBe(true);
  });
});

// ============================================================================
// 4. calculateScallopHeight
// ============================================================================

describe("calculateScallopHeight", () => {
  it("returns positive scallop height", () => {
    const result = calculateScallopHeight(5, 1.0, 100, 500, true);
    expect(result.scallop_height).toBeGreaterThan(0);
    expect(Number.isFinite(result.scallop_height)).toBe(true);
  });

  it("larger stepover increases scallop height", () => {
    const small = calculateScallopHeight(5, 0.5, 100, 500, true);
    const large = calculateScallopHeight(5, 2.0, 100, 500, true);
    expect(large.scallop_height).toBeGreaterThan(small.scallop_height);
  });

  it("larger tool radius decreases scallop height", () => {
    const smallR = calculateScallopHeight(3, 1.0, 100, 500, true);
    const largeR = calculateScallopHeight(10, 1.0, 100, 500, true);
    expect(largeR.scallop_height).toBeLessThan(smallR.scallop_height);
  });
});

// ============================================================================
// 5. calculateOptimalStepover
// ============================================================================

describe("calculateOptimalStepover", () => {
  it("returns positive stepover", () => {
    const result = calculateOptimalStepover(20, 5, 0.01, "finishing");
    expect(result.optimal_stepover).toBeGreaterThan(0);
    expect(Number.isFinite(result.optimal_stepover)).toBe(true);
  });

  it("tighter tolerance produces smaller stepover", () => {
    const tight = calculateOptimalStepover(20, 5, 0.001, "finishing");
    const loose = calculateOptimalStepover(20, 5, 0.05, "finishing");
    expect(tight.optimal_stepover).toBeLessThan(loose.optimal_stepover);
  });

  it("roughing stepover > finishing stepover", () => {
    const rough = calculateOptimalStepover(20, 5, 0.01, "roughing");
    const finish = calculateOptimalStepover(20, 5, 0.01, "finishing");
    expect(rough.optimal_stepover).toBeGreaterThanOrEqual(finish.optimal_stepover);
  });
});

// ============================================================================
// 6. estimateCycleTime
// ============================================================================

describe("estimateCycleTime", () => {
  it("returns all time components", () => {
    const result = estimateCycleTime(5000, 500, 3000, 3, 0.5, 30000);
    expect(result.cutting_time).toBeGreaterThan(0);
    expect(result.rapid_time).toBeGreaterThan(0);
    expect(result.tool_change_time).toBeGreaterThanOrEqual(0);
    expect(result.total_time).toBeGreaterThan(0);
    expect(result.utilization_percent).toBeGreaterThan(0);
  });

  it("total = cutting + rapid + tool_change", () => {
    const result = estimateCycleTime(5000, 500, 3000, 3, 0.5, 30000);
    const sum = result.cutting_time + result.rapid_time + result.tool_change_time;
    expect(result.total_time).toBeCloseTo(sum, 2);
  });

  it("single tool means zero tool_change_time", () => {
    const result = estimateCycleTime(5000, 500, 2000, 1, 10);
    expect(result.tool_change_time).toBe(0);
  });

  it("zero feedrate produces cutting_time = 0 (not Infinity)", () => {
    const result = estimateCycleTime(5000, 0, 2000);
    expect(result.cutting_time).toBe(0);
    expect(Number.isFinite(result.total_time)).toBe(true);
  });
});

// ============================================================================
// 7. calculateChipThinning
// ============================================================================

describe("calculateChipThinning", () => {
  it("light engagement needs compensation", () => {
    const result = calculateChipThinning(20, 5, 0.15, 4, 200);
    expect(result.chip_thinning.needs_compensation).toBe(true);
    expect(result.chip_thinning.compensation_factor).toBeGreaterThan(1);
  });

  it("heavy engagement (>= 50%) does not need compensation", () => {
    const result = calculateChipThinning(20, 12, 0.15, 4, 200);
    expect(result.chip_thinning.needs_compensation).toBe(false);
  });

  it("compensated feedrate > original when compensation needed", () => {
    const result = calculateChipThinning(20, 5, 0.15, 4, 200);
    expect(result.feed_rates.vf_compensated).toBeGreaterThan(result.feed_rates.vf_original);
  });

  it("full slot (ae = D) produces finite values", () => {
    const result = calculateChipThinning(20, 20, 0.15, 4, 200);
    expect(Number.isFinite(result.chip_thinning.fz_compensated)).toBe(true);
    expect(Number.isFinite(result.feed_rates.vf_compensated)).toBe(true);
  });
});

// ============================================================================
// 8. calculateMultiPassStrategy
// ============================================================================

describe("calculateMultiPassStrategy", () => {
  it("returns 3 phases: roughing, semi-finishing, finishing", () => {
    const result = calculateMultiPassStrategy(10, 20, 1800, 22, 200, 250, 0.15, 0.08);
    expect(result.strategy.phases).toHaveLength(3);
    expect(result.strategy.phases[0].phase).toBe("roughing");
    expect(result.strategy.phases[1].phase).toBe("semi-finishing");
    expect(result.strategy.phases[2].phase).toBe("finishing");
  });

  it("roughing has higher MRR than finishing", () => {
    const result = calculateMultiPassStrategy(10, 20, 1800, 22, 200, 250, 0.15, 0.08);
    expect(result.strategy.phases[0].mrr_cm3_min).toBeGreaterThan(result.strategy.phases[2].mrr_cm3_min);
  });

  it("total_stock_mm matches input", () => {
    const result = calculateMultiPassStrategy(10, 20, 1800, 22, 200, 250, 0.15, 0.08);
    expect(result.strategy.total_stock_mm).toBe(10);
  });

  it("all RPMs are positive and finite", () => {
    const result = calculateMultiPassStrategy(10, 20, 1800, 22, 200, 250, 0.15, 0.08);
    for (const phase of result.strategy.phases) {
      expect(phase.rpm).toBeGreaterThan(0);
      expect(Number.isFinite(phase.rpm)).toBe(true);
    }
  });
});

// ============================================================================
// 9. recommendCoolantStrategy
// ============================================================================

describe("recommendCoolantStrategy", () => {
  it("recommends dry for cast iron (K group)", () => {
    const result = recommendCoolantStrategy("K", "milling", 200, false);
    expect(result.recommendation.strategy).toBe("dry");
  });

  it("recommends flood or TSC for titanium (S group)", () => {
    const result = recommendCoolantStrategy("S", "milling", 60, true, 6.7, true, "titanium");
    expect(["through_spindle_coolant", "high_pressure", "flood"]).toContain(result.recommendation.strategy);
  });

  it("provides alternatives array", () => {
    const result = recommendCoolantStrategy("P", "milling", 200, false);
    expect(Array.isArray(result.alternatives)).toBe(true);
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it("provides reasoning", () => {
    const result = recommendCoolantStrategy("K", "milling", 200, false);
    expect(Array.isArray(result.reasoning)).toBe(true);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 10. generateGCodeSnippet
// ============================================================================

describe("generateGCodeSnippet", () => {
  it("generates valid Fanuc G-code", () => {
    const result = generateGCodeSnippet("fanuc", "face_milling", {
      rpm: 3000, feed_rate: 1200, tool_number: 3, depth_of_cut: 2,
    });
    expect(result.gcode).toContain("G90");
    expect(result.gcode).toContain("S3000");
    expect(result.gcode).toContain("T3 M6");
    expect(result.controller).toBe("fanuc");
  });

  it("generates Siemens G-code with D1 offset", () => {
    const result = generateGCodeSnippet("siemens", "face_milling", {
      rpm: 4000, feed_rate: 1500, tool_number: 2,
    });
    expect(result.gcode).toContain("D1");
    expect(result.gcode).toContain("S4000");
  });

  it("returns unsupported message for unknown controller", () => {
    const result = generateGCodeSnippet("mitsubishi", "milling", { rpm: 3000, feed_rate: 1000 });
    expect(result.gcode).toContain("Unsupported");
  });

  it("defaults tool_number to 1", () => {
    const result = generateGCodeSnippet("fanuc", "milling", { rpm: 3000, feed_rate: 1000 });
    expect(result.gcode).toContain("T1 M6");
  });
});

// ============================================================================
// CROSS-CUTTING: No NaN/Infinity
// ============================================================================

describe("cross-cutting: no NaN/Infinity", () => {
  it("engagement angle outputs are finite", () => {
    const r = calculateEngagementAngle(20, 5, 0.15, true, 200);
    expect(Number.isFinite(r.arc_of_engagement)).toBe(true);
    expect(Number.isFinite(r.max_chip_thickness)).toBe(true);
    expect(Number.isFinite(r.average_chip_thickness)).toBe(true);
  });

  it("scallop height is finite", () => {
    const r = calculateScallopHeight(5, 1.0, 100, 500, true);
    expect(Number.isFinite(r.scallop_height)).toBe(true);
  });

  it("cycle time is finite", () => {
    const r = estimateCycleTime(5000, 500, 3000, 3, 0.5);
    expect(Number.isFinite(r.total_time)).toBe(true);
    expect(Number.isFinite(r.utilization_percent)).toBe(true);
  });
});
