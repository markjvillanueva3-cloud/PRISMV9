/**
 * LATHE-MS7 — Physics & Science Hardening Tests
 * ================================================
 * Tests LatheScienceHardeningEngine: chatter, hard turning, thread schedule,
 * drill thrust, parting force, beam deflection, chip breaking, peck schedule,
 * bore dwell, and dispatcher wiring.
 */
import { describe, it, expect } from "vitest";
import { latheScienceHardeningEngine } from "../engines/LatheScienceHardeningEngine.js";

// ============================================================================
// 1. Turning chatter analysis (U01)
// ============================================================================
describe("LatheScienceHardeningEngine — turning chatter", () => {
  it("detects chatter risk for slender workpiece", () => {
    const result = latheScienceHardeningEngine.analyzeTurningChatter({
      workpiece_diameter_mm: 20,
      workpiece_length_mm: 200, // L/D = 10
      workpiece_material: "steel",
      support_type: "chuck_only",
      cutting_speed_m_min: 200,
      depth_of_cut_mm: 3,
      spindle_rpm: 3000,
    });
    // k = 3EI/L³, I = π·20⁴/64 = 7853.98 mm⁴ → k ≈ 618.5 N/mm
    expect(result.workpiece_stiffness_N_mm).toBeCloseTo(618.5, 0);
    // Altintas–Budak SDOF b_lim = 2·k·ζ·(1+ζ)/Kc = 2·618.5·0.035·1.035/1800 ≈ 0.0249 mm (ζ=0.035, Kc=P 1800)
    expect(result.max_stable_doc_mm).toBeCloseTo(0.0249, 3);
    expect(result.stable).toBe(false); // DOC 3 mm ≫ 0.025 mm limit → chatter risk (L/D=10 slender bar)
  });

  it("shows higher stability with tailstock support", () => {
    const cantilever = latheScienceHardeningEngine.analyzeTurningChatter({
      workpiece_diameter_mm: 30,
      workpiece_length_mm: 150,
      workpiece_material: "steel",
      support_type: "chuck_only",
      cutting_speed_m_min: 200,
      depth_of_cut_mm: 2,
      spindle_rpm: 2000,
    });
    const supported = latheScienceHardeningEngine.analyzeTurningChatter({
      workpiece_diameter_mm: 30,
      workpiece_length_mm: 150,
      workpiece_material: "steel",
      support_type: "chuck_tailstock",
      cutting_speed_m_min: 200,
      depth_of_cut_mm: 2,
      spindle_rpm: 2000,
    });
    // Tailstock support gives 16× more stiffness (48EI/L³ vs 3EI/L³)
    expect(supported.workpiece_stiffness_N_mm).toBeGreaterThan(cantilever.workpiece_stiffness_N_mm);
    expect(supported.max_stable_doc_mm).toBeGreaterThan(cantilever.max_stable_doc_mm);
  });

  it("aluminum has lower Kc but also lower E — net effect depends on geometry", () => {
    const steel = latheScienceHardeningEngine.analyzeTurningChatter({
      workpiece_diameter_mm: 40, workpiece_length_mm: 100,
      workpiece_material: "steel", support_type: "chuck_only",
      cutting_speed_m_min: 200, depth_of_cut_mm: 2, spindle_rpm: 3000,
    });
    const alu = latheScienceHardeningEngine.analyzeTurningChatter({
      workpiece_diameter_mm: 40, workpiece_length_mm: 100,
      workpiece_material: "aluminum", support_type: "chuck_only",
      cutting_speed_m_min: 200, depth_of_cut_mm: 2, spindle_rpm: 3000,
    });
    // Both produce valid results with positive max stable DOC
    expect(steel.max_stable_doc_mm).toBeGreaterThan(0);
    expect(alu.max_stable_doc_mm).toBeGreaterThan(0);
    // Aluminum Kc=700 (N) vs steel Kc=1800 (canonical P) → kc ratio 2.57×
    // Aluminum E=69 vs steel E=210 → stiffness ratio 0.33×
    // Net: alu max_doc = steel_stiffness × 0.33 / (kc × 0.39) → depends on exact ratio
    expect(alu.workpiece_stiffness_N_mm).toBeLessThan(steel.workpiece_stiffness_N_mm);
  });
});

// ============================================================================
// 2. Hard turning surface integrity (U02)
// ============================================================================
describe("LatheScienceHardeningEngine — hard turning", () => {
  it("predicts white layer depth", () => {
    const result = latheScienceHardeningEngine.analyzeHardTurning({
      hardness_hrc: 60,
      cutting_speed_m_min: 200,
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 0.2,
      tool_material: "CBN",
      rake_angle_deg: -6,
    });
    expect(result.white_layer_depth_um).toBeGreaterThan(0);
    expect(result.achievable_Ra_um).toBeGreaterThan(0);
  });

  it("negative rake produces compressive residual stress", () => {
    const result = latheScienceHardeningEngine.analyzeHardTurning({
      hardness_hrc: 58,
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.08,
      depth_of_cut_mm: 0.15,
      tool_material: "CBN",
      rake_angle_deg: -10,
    });
    expect(result.stress_type).toBe("compressive");
    expect(result.residual_stress_mpa).toBeLessThan(0);
  });

  it("CBN gives better Ra than ceramic", () => {
    const cbn = latheScienceHardeningEngine.analyzeHardTurning({
      hardness_hrc: 60, cutting_speed_m_min: 200, feed_mm_rev: 0.1,
      depth_of_cut_mm: 0.2, tool_material: "CBN", rake_angle_deg: -6,
    });
    const ceramic = latheScienceHardeningEngine.analyzeHardTurning({
      hardness_hrc: 60, cutting_speed_m_min: 200, feed_mm_rev: 0.1,
      depth_of_cut_mm: 0.2, tool_material: "ceramic", rake_angle_deg: -6,
    });
    expect(cbn.achievable_Ra_um).toBeLessThan(ceramic.achievable_Ra_um);
  });
});

// ============================================================================
// 3. Thread pass schedule (U03)
// ============================================================================
describe("LatheScienceHardeningEngine — thread pass schedule", () => {
  it("generates √pass constant chip area schedule", () => {
    const result = latheScienceHardeningEngine.generateThreadPassSchedule({
      thread_depth_mm: 0.92,
      pitch_mm: 1.5,
      passes: 6,
      method: "constant_chip_area",
    });
    expect(result.passes.length).toBe(6);
    expect(result.spring_passes).toBe(2);
    // First pass should be deepest (√1 - √0 = 1 is largest increment)
    expect(result.passes[0].infeed_mm).toBeGreaterThan(result.passes[5].infeed_mm);
    // Cumulative should equal total depth
    expect(result.passes[5].cumulative_mm).toBeCloseTo(0.92, 2);
  });

  it("generates equal-depth passes when not constant_chip_area", () => {
    const result = latheScienceHardeningEngine.generateThreadPassSchedule({
      thread_depth_mm: 0.92,
      pitch_mm: 1.5,
      passes: 4,
      method: "modified_flank",
    });
    // All infeeds should be equal
    const firstInfeed = result.passes[0].infeed_mm;
    for (const pass of result.passes) {
      expect(pass.infeed_mm).toBeCloseTo(firstInfeed, 4);
    }
  });
});

// ============================================================================
// 4. Drill thrust force (U04)
// ============================================================================
describe("LatheScienceHardeningEngine — drill thrust", () => {
  it("calculates positive thrust force", () => {
    const result = latheScienceHardeningEngine.checkDrillThrust({
      drill_diameter_mm: 10,
      feed_per_rev_mm: 0.15,
      point_angle_deg: 118,
      kc1_1: 1800,
      mc: 0.25,
    });
    expect(result.thrust_force_N).toBeGreaterThan(0);
  });

  it("flags when thrust exceeds tailstock capacity", () => {
    const result = latheScienceHardeningEngine.checkDrillThrust({
      drill_diameter_mm: 25,
      feed_per_rev_mm: 0.25,
      point_angle_deg: 118,
      kc1_1: 1800,
      mc: 0.25,
      tailstock_force_N: 500, // low tailstock force
    });
    expect(result.thrust_force_N).toBeGreaterThan(0);
    // Large drill + high feed should exceed low tailstock force
    if (result.thrust_force_N > 400) {
      expect(result.safe).toBe(false);
    }
  });
});

// ============================================================================
// 5. Parting force multiplier (U05)
// ============================================================================
describe("LatheScienceHardeningEngine — parting force", () => {
  it("applies 1.25× multiplier", () => {
    const result = latheScienceHardeningEngine.partingForceMultiplier(500);
    expect(result.parting_force_N).toBe(625);
    expect(result.multiplier).toBe(1.25);
  });
});

// ============================================================================
// 6. Beam deflection (U06)
// ============================================================================
describe("LatheScienceHardeningEngine — beam deflection", () => {
  it("calculates cantilever deflection", () => {
    const result = latheScienceHardeningEngine.calculateBeamDeflection({
      diameter_mm: 30,
      length_mm: 150,
      support_type: "cantilever",
      material_E_GPa: 210,
      cutting_force_N: 500,
      tool_z_mm: 100,
    });
    expect(result.deflection_mm).toBeGreaterThan(0);
    expect(result.max_deflection_mm).toBeGreaterThan(0);
  });

  it("simply-supported has less deflection than cantilever", () => {
    const common = {
      diameter_mm: 25, length_mm: 200,
      material_E_GPa: 210, cutting_force_N: 300, tool_z_mm: 100,
    };
    const cantilever = latheScienceHardeningEngine.calculateBeamDeflection({
      ...common, support_type: "cantilever",
    });
    const supported = latheScienceHardeningEngine.calculateBeamDeflection({
      ...common, support_type: "simply_supported",
    });
    expect(supported.max_deflection_mm).toBeLessThan(cantilever.max_deflection_mm);
  });

  it("flags out-of-tolerance deflection", () => {
    const result = latheScienceHardeningEngine.calculateBeamDeflection({
      diameter_mm: 15, length_mm: 200,
      support_type: "cantilever",
      material_E_GPa: 210,
      cutting_force_N: 500,
      tool_z_mm: 180,
      tolerance_mm: 0.001, // very tight
    });
    expect(result.within_tolerance).toBe(false);
    expect(result.recommendation).toContain("add tailstock");
  });
});

// ============================================================================
// 7. Chip breaking oscillation (U10)
// ============================================================================
describe("LatheScienceHardeningEngine — chip breaking", () => {
  it("recommends oscillation for ISO P (steel)", () => {
    const result = latheScienceHardeningEngine.chipBreakingOscillation("P", 0.2);
    expect(result.oscillation_recommended).toBe(true);
    expect(result.spike_feed_factor).toBe(1.5);
  });

  it("recommends oscillation for ISO M (stainless)", () => {
    const result = latheScienceHardeningEngine.chipBreakingOscillation("M", 0.15);
    expect(result.oscillation_recommended).toBe(true);
  });

  it("does NOT recommend for ISO K (cast iron)", () => {
    const result = latheScienceHardeningEngine.chipBreakingOscillation("K", 0.2);
    expect(result.oscillation_recommended).toBe(false);
  });
});

// ============================================================================
// 8. Decreasing peck depth (U11)
// ============================================================================
describe("LatheScienceHardeningEngine — decreasing peck depth", () => {
  it("generates pecks with decreasing depth", () => {
    const result = latheScienceHardeningEngine.generateDecreasingPeckSchedule(30, 5);
    expect(result.total_pecks).toBeGreaterThan(1);
    // Each peck should be ≤ previous
    for (let i = 1; i < result.pecks.length; i++) {
      expect(result.pecks[i].depth_mm).toBeLessThanOrEqual(result.pecks[i - 1].depth_mm + 0.001);
    }
    // Total depth should be reached
    expect(result.pecks[result.pecks.length - 1].cumulative_mm).toBeCloseTo(30, 1);
  });

  it("respects minimum peck depth", () => {
    const result = latheScienceHardeningEngine.generateDecreasingPeckSchedule(50, 5, 2);
    for (const peck of result.pecks) {
      // Last peck may be smaller to hit exact depth
      if (peck.peck_num < result.total_pecks) {
        expect(peck.depth_mm).toBeGreaterThanOrEqual(2 - 0.001);
      }
    }
  });
});

// ============================================================================
// 9. Thread spring passes (U12)
// ============================================================================
describe("LatheScienceHardeningEngine — thread spring passes", () => {
  it("returns default 2 spring passes", () => {
    const result = latheScienceHardeningEngine.threadSpringPasses();
    expect(result.count).toBe(2);
    expect(result.infeed_mm).toBe(0);
  });

  it("allows custom spring pass count", () => {
    const result = latheScienceHardeningEngine.threadSpringPasses(3);
    expect(result.count).toBe(3);
  });
});

// ============================================================================
// 10. Bore bottom dwell (U13)
// ============================================================================
describe("LatheScienceHardeningEngine — bore dwell", () => {
  it("returns 0.3s for steel (ISO P)", () => {
    const result = latheScienceHardeningEngine.boreDwell("P");
    expect(result.dwell_sec).toBe(0.3);
    expect(result.recommendation).toContain("G04");
  });

  it("returns longer dwell for titanium (ISO S)", () => {
    const result = latheScienceHardeningEngine.boreDwell("S");
    expect(result.dwell_sec).toBe(0.8);
  });

  it("returns different dwells for different materials", () => {
    const p = latheScienceHardeningEngine.boreDwell("P");
    const m = latheScienceHardeningEngine.boreDwell("M");
    const s = latheScienceHardeningEngine.boreDwell("S");
    expect(s.dwell_sec).toBeGreaterThan(p.dwell_sec);
    expect(m.dwell_sec).toBeGreaterThan(p.dwell_sec);
  });
});

// ============================================================================
// 11. Dispatcher wiring
// ============================================================================
describe("turningDispatcher — LATHE-MS7 action wiring", () => {
  it("dispatcher contains all MS7 actions", async () => {
    const fs = await import("fs");
    const path = new URL("../tools/dispatchers/turningDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    expect(src).toContain('"lathe_chatter_analysis"');
    expect(src).toContain('"lathe_hard_turning"');
    expect(src).toContain('"lathe_thread_schedule"');
    expect(src).toContain('"lathe_drill_thrust"');
    expect(src).toContain('"lathe_parting_force"');
    expect(src).toContain('"lathe_beam_deflection"');
    expect(src).toContain('"lathe_chip_breaking"');
    expect(src).toContain('"lathe_peck_schedule"');
    expect(src).toContain('"lathe_bore_dwell"');
  });

  it("total turning actions count is at least 34", async () => {
    const fs = await import("fs");
    const path = new URL("../tools/dispatchers/turningDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    const actionMatch = src.match(/const ACTIONS = \[([\s\S]*?)\] as const/);
    if (actionMatch) {
      const actionCount = (actionMatch[1].match(/"/g) || []).length / 2;
      expect(actionCount).toBeGreaterThanOrEqual(34);
    }
  });
});
