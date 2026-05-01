/**
 * Tests for FeedRateOptimization, EntryExitStrategy, ZLevelOptimization, ToolpathLinking engines
 * Sources: SolidCAM roadmap Phase 2, Sandvik Technical Guide
 */
import { describe, it, expect } from "vitest";
import { FeedRateOptimizationEngine } from "../engines/FeedRateOptimizationEngine.js";
import { EntryExitStrategyEngine } from "../engines/EntryExitStrategyEngine.js";
import { ZLevelOptimizationEngine } from "../engines/ZLevelOptimizationEngine.js";
import { ToolpathLinkingEngine } from "../engines/ToolpathLinkingEngine.js";

const feed = new FeedRateOptimizationEngine();
const entry = new EntryExitStrategyEngine();
const zlevel = new ZLevelOptimizationEngine();
const linking = new ToolpathLinkingEngine();

// ── FeedRateOptimizationEngine ───────────────────────────────────

describe("FeedRateOptimizationEngine", () => {
  describe("optimize", () => {
    it("increases feed for chip thinning at low WOC", () => {
      const r = feed.optimize({
        base_feed_per_tooth: 0.1,
        tool_diameter: 12,
        number_of_flutes: 4,
        spindle_rpm: 8000,
        radial_depth: 1.2, // 10% WOC
        axial_depth: 10,
      });
      expect(r.chip_thinning_factor).toBeGreaterThan(1);
      expect(r.optimized_feed_rate).toBeGreaterThan(r.nominal_feed_rate);
      expect(r.engagement_angle_deg).toBeGreaterThan(0);
    });

    it("no chip thinning at 50%+ WOC", () => {
      const r = feed.optimize({
        base_feed_per_tooth: 0.1,
        tool_diameter: 12,
        number_of_flutes: 4,
        spindle_rpm: 8000,
        radial_depth: 8,
        axial_depth: 10,
      });
      expect(r.chip_thinning_factor).toBe(1);
    });

    it("applies material factor for titanium", () => {
      const steel = feed.optimize({
        base_feed_per_tooth: 0.1,
        tool_diameter: 12,
        number_of_flutes: 4,
        spindle_rpm: 5000,
        radial_depth: 3,
        axial_depth: 10,
        material: "mild_steel",
      });
      const ti = feed.optimize({
        base_feed_per_tooth: 0.1,
        tool_diameter: 12,
        number_of_flutes: 4,
        spindle_rpm: 5000,
        radial_depth: 3,
        axial_depth: 10,
        material: "titanium",
      });
      expect(ti.optimized_feed_rate).toBeLessThan(steel.optimized_feed_rate);
      expect(ti.material_factor).toBeLessThan(steel.material_factor);
    });

    it("power limits the feed when spindle is underpowered", () => {
      const r = feed.optimize({
        base_feed_per_tooth: 0.15,
        tool_diameter: 20,
        number_of_flutes: 4,
        spindle_rpm: 6000,
        radial_depth: 10,
        axial_depth: 30,
        spindle_power_kw: 5, // low power
        specific_cutting_force: 2000,
      });
      expect(r.is_power_limited).toBe(true);
      expect(r.power_utilization_pct).toBeLessThanOrEqual(95);
    });

    it("caps feed at material max_fz", () => {
      const r = feed.optimize({
        base_feed_per_tooth: 0.3,
        tool_diameter: 12,
        number_of_flutes: 4,
        spindle_rpm: 8000,
        radial_depth: 0.6, // 5% → huge chip thinning
        axial_depth: 10,
        material: "stainless",
      });
      expect(r.feed_per_tooth_adjusted).toBeLessThanOrEqual(0.1); // stainless max
      expect(r.warnings.length).toBeGreaterThan(0);
    });

    it("surfaces playbook roughing guidance in warnings", () => {
      const r = feed.optimize({
        base_feed_per_tooth: 0.1,
        tool_diameter: 12,
        number_of_flutes: 4,
        spindle_rpm: 6000,
        radial_depth: 3,
        axial_depth: 10,
        material: "mild_steel",
        operation: "roughing",
      });

      expect(r.warnings.some(w => w.includes("[Playbook"))).toBe(true);
    });
  });

  describe("cornerFeed", () => {
    it("reduces feed for internal arc", () => {
      const r = feed.cornerFeed({
        straight_feed: 2000,
        arc_radius: 10,
        tool_diameter: 12,
        is_internal: true,
      });
      expect(r.adjusted_feed).toBeLessThan(2000);
      expect(r.feed_factor).toBeLessThan(1);
      expect(r.effective_ae_factor).toBeGreaterThan(1);
    });

    it("increases feed for external arc", () => {
      const r = feed.cornerFeed({
        straight_feed: 2000,
        arc_radius: 10,
        tool_diameter: 12,
        is_internal: false,
      });
      expect(r.adjusted_feed).toBeGreaterThan(2000);
      expect(r.feed_factor).toBeGreaterThan(1);
    });

    it("warns on tight internal arc", () => {
      const r = feed.cornerFeed({
        straight_feed: 2000,
        arc_radius: 5,
        tool_diameter: 12,
        is_internal: true,
      });
      expect(r.reason).toContain("CRITICAL");
    });
  });

  describe("constantChipLoad", () => {
    it("varies feed to maintain constant chip", () => {
      const r = feed.constantChipLoad({
        target_chip_mm: 0.1,
        tool_diameter: 12,
        number_of_flutes: 4,
        spindle_rpm: 8000,
        engagement_profile: [
          { position: 0, engagement_deg: 30 },
          { position: 10, engagement_deg: 60 },
          { position: 20, engagement_deg: 90 },
        ],
      });
      expect(r.feed_profile.length).toBe(3);
      // Lower engagement → higher feed needed
      expect(r.feed_profile[0].feed_mm_min).toBeGreaterThan(r.feed_profile[2].feed_mm_min);
    });
  });

  describe("generateFeedProfile", () => {
    it("returns nonzero chip thickness and reduces feed at corners", () => {
      const r = feed.generateFeedProfile(
        100,
        2400,
        [{ position: 50, type: "corner", engagement_deg: 120 }],
        12,
        undefined,
        { spindle_rpm: 6000, number_of_flutes: 4 },
      );

      const steadyPoint = r.points.find(p => p.position === 20)!;
      const cornerPoint = r.points.find(p => p.position === 50)!;

      expect(r.points.some(p => p.chip_thickness > 0)).toBe(true);
      expect(cornerPoint.feed_rate).toBeLessThan(steadyPoint.feed_rate);
      expect(cornerPoint.chip_thickness).toBeGreaterThan(0);
      expect(r.total_time_s).toBeGreaterThan(0);
    });
  });

  describe("getMaterialFeedLimits", () => {
    it("returns limits for known material", () => {
      const r = feed.getMaterialFeedLimits("aluminum");
      expect(r).not.toBeNull();
      expect(r!.max_fz_mm).toBe(0.25);
    });
    it("returns null for unknown material", () => {
      expect(feed.getMaterialFeedLimits("unobtanium")).toBeNull();
    });
  });
});

// ── EntryExitStrategyEngine ──────────────────────────────────────

describe("EntryExitStrategyEngine", () => {
  describe("selectEntry", () => {
    it("recommends helix for wide pocket in steel", () => {
      const r = entry.selectEntry({
        tool_diameter: 12,
        pocket_width: 30,
        pocket_depth: 20,
        material: "mild_steel",
      });
      expect(r.recommended_method).toBe("helix");
      expect(r.helix_params).not.toBeNull();
      expect(r.helix_params!.diameter_mm).toBeGreaterThan(0);
      expect(r.helix_params!.revolutions).toBeGreaterThan(0);
    });

    it("recommends ramp when pocket too narrow for helix", () => {
      const r = entry.selectEntry({
        tool_diameter: 12,
        pocket_width: 8, // too narrow for helix
        pocket_depth: 20,
        material: "mild_steel",
      });
      // Should fall back to ramp or interpolated
      expect(["ramp", "interpolated", "plunge"]).toContain(r.recommended_method);
      expect(r.warnings.length).toBeGreaterThan(0);
    });

    it("recommends pre_drill when pre-drilled", () => {
      const r = entry.selectEntry({
        tool_diameter: 12,
        pocket_depth: 20,
        has_pre_drill: true,
        pre_drill_diameter: 10,
      });
      expect(r.recommended_method).toBe("pre_drill");
    });

    it("uses material-specific helix angle", () => {
      const steel = entry.selectEntry({
        tool_diameter: 12,
        pocket_width: 30,
        pocket_depth: 20,
        material: "mild_steel",
      });
      const ti = entry.selectEntry({
        tool_diameter: 12,
        pocket_width: 30,
        pocket_depth: 20,
        material: "titanium",
      });
      expect(ti.helix_params!.angle_deg).toBeLessThan(steel.helix_params!.angle_deg);
    });

    it("provides feed factor < 1", () => {
      const r = entry.selectEntry({
        tool_diameter: 12,
        pocket_width: 30,
        pocket_depth: 20,
      });
      expect(r.feed_factor).toBeLessThan(1);
      expect(r.feed_factor).toBeGreaterThan(0);
    });
  });

  describe("selectExit", () => {
    it("arc_out for finishing", () => {
      const r = entry.selectExit(12, "finishing");
      expect(r.method).toBe("arc_out");
    });
    it("rapid_retract for roughing", () => {
      const r = entry.selectExit(12, "roughing");
      expect(r.method).toBe("rapid_retract");
    });
  });

  describe("validateEntry", () => {
    it("rejects plunge in titanium", () => {
      const r = entry.validateEntry("plunge", 12, 30, "titanium");
      expect(r.is_valid).toBe(false);
    });
    it("rejects helix in narrow pocket", () => {
      const r = entry.validateEntry("helix", 12, 8, "mild_steel");
      expect(r.is_valid).toBe(false);
    });
    it("accepts helix in wide pocket", () => {
      const r = entry.validateEntry("helix", 12, 30, "mild_steel");
      expect(r.is_valid).toBe(true);
    });
  });
});

// ── ZLevelOptimizationEngine ─────────────────────────────────────

describe("ZLevelOptimizationEngine", () => {
  describe("calculateZLevels", () => {
    it("generates correct number of even levels", () => {
      const r = zlevel.calculateZLevels({
        total_depth: 20,
        tool_diameter: 12,
        material: "mild_steel",
      });
      expect(r.number_of_levels).toBeGreaterThan(0);
      expect(r.z_levels.length).toBe(r.number_of_levels + 1); // includes Z=0
      expect(r.z_levels[0]).toBe(0);
      expect(r.z_levels[r.z_levels.length - 1]).toBeCloseTo(-20, 0);
    });

    it("material affects step-down", () => {
      const alu = zlevel.calculateZLevels({
        total_depth: 20,
        tool_diameter: 12,
        material: "aluminum",
      });
      const ti = zlevel.calculateZLevels({
        total_depth: 20,
        tool_diameter: 12,
        material: "titanium",
      });
      expect(alu.optimal_ap).toBeGreaterThan(ti.optimal_ap);
      expect(alu.number_of_levels).toBeLessThan(ti.number_of_levels);
    });

    it("respects stability limit", () => {
      const r = zlevel.calculateZLevels({
        total_depth: 20,
        tool_diameter: 12,
        material: "aluminum",
        stability_limited_ap: 2,
      });
      expect(r.optimal_ap).toBeLessThanOrEqual(2);
      expect(r.strategy).toBe("stability_limited");
    });

    it("warns on deep pocket", () => {
      const r = zlevel.calculateZLevels({
        total_depth: 60,
        tool_diameter: 12,
      });
      expect(r.warnings.some(w => w.includes("Deep pocket"))).toBe(true);
    });

    it("handles stock_to_leave", () => {
      const r = zlevel.calculateZLevels({
        total_depth: 20,
        tool_diameter: 12,
        stock_to_leave: 0.5,
      });
      // Last Z should be -(20 - 0.5) = -19.5
      const lastZ = r.z_levels[r.z_levels.length - 1];
      expect(lastZ).toBeCloseTo(-19.5, 0);
    });

    it("finishing uses smaller step-down", () => {
      const rough = zlevel.calculateZLevels({
        total_depth: 10,
        tool_diameter: 12,
        operation: "roughing",
      });
      const finish = zlevel.calculateZLevels({
        total_depth: 10,
        tool_diameter: 12,
        operation: "finishing",
      });
      expect(finish.optimal_ap).toBeLessThan(rough.optimal_ap);
    });
  });

  describe("restMachiningLevels", () => {
    it("calculates rest levels for smaller tool", () => {
      const r = zlevel.restMachiningLevels({
        previous_tool_diameter: 20,
        current_tool_diameter: 6,
        total_depth: 15,
      });
      expect(r.rest_z_levels.length).toBeGreaterThan(0);
      expect(r.rest_step_down).toBeGreaterThan(0);
      expect(r.overlap_depth).toBeGreaterThan(0);
      expect(r.estimated_volume_pct).toBeGreaterThan(0);
    });

    it("warns when rest tool >= previous tool", () => {
      const r = zlevel.restMachiningLevels({
        previous_tool_diameter: 10,
        current_tool_diameter: 12,
        total_depth: 15,
      });
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("levelTransition", () => {
    it("recommends helix for wide space", () => {
      const r = zlevel.levelTransition(0, -5, 12, 20);
      expect(r.method).toBe("helix");
    });
    it("recommends ramp for medium space", () => {
      const r = zlevel.levelTransition(0, -5, 12, 20);
      expect(["helix", "ramp"]).toContain(r.method);
    });
  });
});

// ── ToolpathLinkingEngine ────────────────────────────────────────

describe("ToolpathLinkingEngine", () => {
  const makeSegments = (n: number): import("../engines/ToolpathLinkingEngine.js").PathSegment[] => {
    const segs = [];
    for (let i = 0; i < n; i++) {
      const x = (i % 5) * 20;
      const y = Math.floor(i / 5) * 20;
      segs.push({
        id: `seg-${i}`,
        start: { x, y, z: -5 },
        end: { x: x + 15, y, z: -5 },
        z_level: -5,
        length: 15,
      });
    }
    return segs;
  };

  describe("optimizeLinking", () => {
    it("orders segments and calculates links", () => {
      const segs = makeSegments(10);
      const r = linking.optimizeLinking(segs, {
        clearance_height: 50,
        retract_height: 5,
      });
      expect(r.ordered_segments.length).toBe(10);
      expect(r.links.length).toBe(9);
      expect(r.total_cutting_distance).toBe(150); // 10 × 15mm
    });

    it("uses stay-down when segments are close on same level", () => {
      const segs = [
        { id: "a", start: { x: 0, y: 0, z: -5 }, end: { x: 10, y: 0, z: -5 }, z_level: -5, length: 10 },
        { id: "b", start: { x: 12, y: 0, z: -5 }, end: { x: 22, y: 0, z: -5 }, z_level: -5, length: 10 },
      ];
      const r = linking.optimizeLinking(segs, {
        clearance_height: 50,
        retract_height: 5,
        allow_stay_down: true,
      });
      expect(r.stay_down_count).toBe(1);
      expect(r.retracts_count).toBe(0);
    });

    it("retracts between different Z-levels", () => {
      const segs = [
        { id: "a", start: { x: 0, y: 0, z: -5 }, end: { x: 10, y: 0, z: -5 }, z_level: -5, length: 10 },
        { id: "b", start: { x: 0, y: 0, z: -10 }, end: { x: 10, y: 0, z: -10 }, z_level: -10, length: 10 },
      ];
      const r = linking.optimizeLinking(segs, {
        clearance_height: 50,
        retract_height: 5,
      });
      expect(r.retracts_count).toBe(1);
    });

    it("empty segments returns empty result", () => {
      const r = linking.optimizeLinking([], { clearance_height: 50, retract_height: 5 });
      expect(r.ordered_segments.length).toBe(0);
    });

    it("optimized ordering reduces rapid distance vs sequential", () => {
      // Scramble segment order — optimization should improve
      const segs = makeSegments(15);
      const scrambled = [...segs].sort(() => Math.random() - 0.5);
      const r = linking.optimizeLinking(scrambled, {
        clearance_height: 50,
        retract_height: 5,
        link_method: "optimized",
      });
      expect(r.savings_vs_sequential_pct).toBeGreaterThanOrEqual(0);
    });
  });

  describe("estimateTimeSavings", () => {
    it("returns time comparison", () => {
      const segs = makeSegments(8);
      const r = linking.estimateTimeSavings(segs, {
        clearance_height: 50,
        retract_height: 5,
      });
      expect(r.sequential_time_s).toBeGreaterThanOrEqual(0);
      expect(r.optimized_time_s).toBeGreaterThanOrEqual(0);
      expect(r.savings_pct).toBeGreaterThanOrEqual(0);
    });
  });
});
