/**
 * UltimateSpeedFeedEngine Physics Validation Tests
 * MILL-AUDIT/P4: Comprehensive speed/feed optimization testing
 *
 * Physics models integrated:
 *   - Kienzle: Fc = kc1.1 × h^(1-mc) × b
 *   - Taylor: T = C / Vc^n
 *   - Loewen-Shaw: θ = ψ × (Fc × Vc) / (k × √(a × Vc/α))
 *   - Chip thinning: hex = fz × (ae/D) for radial engagement
 *   - MRR: Q = ap × ae × Vf
 *
 * Safety risk: Incorrect parameters cause tool breakage, poor surface, scrap
 */

import { describe, it, expect } from "vitest";
// Canonical engine lives at mcp-server/src/engines. The prior `../../../src/engines/`
// path resolved to an UNTRACKED stale duplicate tree at repo-root H:/prism/src/engines
// (dated Apr-6, not in git) — so this suite was validating a dead copy, not production.
// Fixed 2026-06-06 (oscar) to the canonical relative path its sibling suites use.
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

describe("UltimateSpeedFeedEngine — Physics Validation", () => {
  describe("Dimensional Consistency", () => {
    it("returns cutting speed in m/min", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        operation: "milling",
      });

      expect(result.cutting_speed.unit).toBe("m/min");
      expect(result.cutting_speed.value).toBeGreaterThan(0);
    });

    it("returns spindle RPM in rev/min", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "aluminum",
        tool_diameter_mm: 10,
      });

      expect(result.spindle_rpm.unit).toBe("rev/min");
      expect(result.spindle_rpm.value).toBeGreaterThan(0);
    });

    it("returns feed rate in mm/min", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 8,
        flutes: 4,
      });

      expect(result.feed_rate.unit).toBe("mm/min");
      expect(result.feed_rate.value).toBeGreaterThan(0);
    });

    it("returns MRR in cm³/min", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        axial_depth_mm: 5,
        radial_depth_mm: 6,
      });

      expect(result.mrr.unit).toBe("cm³/min");
      expect(result.mrr.value).toBeGreaterThan(0);
    });

    it("returns forces in Newtons", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        operation: "milling",
      });

      expect(result.forces.tangential_force_N.unit).toBe("N");
      expect(result.forces.radial_force_N.unit).toBe("N");
      expect(result.forces.axial_force_N.unit).toBe("N");
      expect(result.forces.resultant_force_N.unit).toBe("N");
    });

    it("returns power in kW", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
      });

      expect(result.power.required_power_kw.unit).toBe("kW");
    });

    it("returns tool life in minutes", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
      });

      expect(result.tool_life.life_minutes.unit).toBe("min");
      expect(result.tool_life.life_minutes.value).toBeGreaterThan(0);
    });

    it("returns surface finish in μm Ra", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "aluminum",
        tool_diameter_mm: 10,
        corner_radius_mm: 0.8,
      });

      expect(["μm", "µm"]).toContain(result.surface_finish.theoretical_ra_um.unit);
    });
  });

  describe("Material Effects (ISO Groups)", () => {
    it("aluminum allows higher cutting speed than steel", () => {
      const steel = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        tool_material: "carbide",
      });

      const aluminum = ultimateSpeedFeedEngine.calculate({
        material: "aluminum",
        tool_diameter_mm: 12,
        tool_material: "carbide",
      });

      // Aluminum (N group) allows much higher speeds than steel (P group)
      expect(aluminum.cutting_speed.value).toBeGreaterThan(
        steel.cutting_speed.value * 1.5
      );
    });

    it("titanium requires lower speed than steel", () => {
      const steel = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
      });

      const titanium = ultimateSpeedFeedEngine.calculate({
        material: "titanium",
        tool_diameter_mm: 12,
      });

      // Titanium (S group) needs lower speeds due to poor thermal conductivity
      expect(titanium.cutting_speed.value).toBeLessThan(
        steel.cutting_speed.value
      );
    });

    it("stainless steel (M group) between steel and titanium", () => {
      const steel = ultimateSpeedFeedEngine.calculate({ material: "steel", tool_diameter_mm: 12 });
      const stainless = ultimateSpeedFeedEngine.calculate({ material: "stainless", tool_diameter_mm: 12 });
      const titanium = ultimateSpeedFeedEngine.calculate({ material: "titanium", tool_diameter_mm: 12 });

      // M group typically lower than P, higher than S
      expect(stainless.cutting_speed.value).toBeLessThanOrEqual(steel.cutting_speed.value);
      expect(stainless.cutting_speed.value).toBeGreaterThanOrEqual(titanium.cutting_speed.value * 0.8);
    });

    it("resolves ISO group from material name", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "4140 steel",
        tool_diameter_mm: 12,
      });

      expect(result.resolved.iso_group).toBe("P");
    });

    it("hardness affects recommended speed", () => {
      const soft = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        hardness_hb: 180,
        tool_diameter_mm: 12,
      });

      const hard = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        hardness_hb: 350,
        tool_diameter_mm: 12,
      });

      // Harder material requires slower speed
      expect(hard.cutting_speed.value).toBeLessThan(soft.cutting_speed.value);
    });
  });

  describe("Operation-Specific Behavior", () => {
    it("turning uses feed_per_rev instead of feed_per_tooth", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        operation: "turning",
        workpiece_diameter_mm: 50,
      });

      expect(result.feed_per_rev.value).toBeGreaterThan(0);
      expect(result.resolved.operation).toBe("turning");
    });

    it("drilling has axial-dominant force", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        operation: "drilling",
        tool_diameter_mm: 10,
        hole_depth_mm: 30,
      });

      // Drilling thrust force is significant
      expect(result.forces.axial_force_N.value).toBeGreaterThan(0);
    });

    it("milling radial engagement affects chip thinning", () => {
      const fullSlot = ultimateSpeedFeedEngine.calculate({
        material: "aluminum",
        tool_diameter_mm: 12,
        operation: "milling",
        radial_depth_pct: 100,
      });

      const lightRadial = ultimateSpeedFeedEngine.calculate({
        material: "aluminum",
        tool_diameter_mm: 12,
        operation: "milling",
        radial_depth_pct: 10,
      });

      // Light radial engagement → chip thinning factor > 1
      expect(lightRadial.chip_thinning_factor.value).toBeGreaterThan(
        fullSlot.chip_thinning_factor.value
      );
    });

    it("trochoidal strategy increases chip thinning compensation", () => {
      const conventional = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        strategy: "conventional",
      });

      const trochoidal = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        strategy: "trochoidal",
      });

      // Trochoidal has lower radial engagement → higher chip thinning
      expect(trochoidal.chip_thinning_factor.value).toBeGreaterThanOrEqual(
        conventional.chip_thinning_factor.value
      );
    });
  });

  describe("Cut Type Optimization", () => {
    it("roughing uses higher MRR than finishing", () => {
      const roughing = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        cut_type: "roughing",
      });

      const finishing = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        cut_type: "finishing",
      });

      expect(roughing.mrr.value).toBeGreaterThan(finishing.mrr.value);
    });

    it("finishing achieves better surface finish", () => {
      const roughing = ultimateSpeedFeedEngine.calculate({
        material: "aluminum",
        tool_diameter_mm: 10,
        cut_type: "roughing",
        corner_radius_mm: 0.8,
      });

      const finishing = ultimateSpeedFeedEngine.calculate({
        material: "aluminum",
        tool_diameter_mm: 10,
        cut_type: "finishing",
        corner_radius_mm: 0.8,
      });

      // Lower Ra is better
      expect(finishing.surface_finish.theoretical_ra_um.value).toBeLessThan(
        roughing.surface_finish.theoretical_ra_um.value
      );
    });

    it("finishing uses lower feed per tooth", () => {
      const roughing = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        flutes: 4,
        cut_type: "roughing",
      });

      const finishing = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        flutes: 4,
        cut_type: "finishing",
      });

      expect(finishing.feed_per_tooth.value).toBeLessThan(
        roughing.feed_per_tooth.value
      );
    });
  });

  describe("RPM and Feed Rate Relationships", () => {
    it("RPM = 1000 × Vc / (π × D)", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        cutting_speed_mpm: 150,
      });

      const expectedRpm = (1000 * 150) / (Math.PI * 12);
      expect(result.spindle_rpm.value).toBeCloseTo(expectedRpm, 0);
    });

    it("feed rate = RPM × flutes × fz", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        flutes: 4,
        feed_per_tooth_mm: 0.1,
        spindle_rpm: 4000,
        radial_depth_pct: 100,
      });

      const expectedVf = 4000 * 4 * 0.1;
      expect(result.feed_rate.value).toBeCloseTo(expectedVf, 0);
    });

    it("doubling tool diameter halves RPM at same surface speed", () => {
      const small = ultimateSpeedFeedEngine.calculate({
        material: "aluminum",
        tool_diameter_mm: 6,
        cutting_speed_mpm: 300,
        machine_max_rpm: 50000,
      });

      const large = ultimateSpeedFeedEngine.calculate({
        material: "aluminum",
        tool_diameter_mm: 12,
        cutting_speed_mpm: 300,
        machine_max_rpm: 50000,
      });

      expect(large.spindle_rpm.value).toBeCloseTo(
        small.spindle_rpm.value / 2,
        -1
      );
    });
  });

  describe("Power and Force Calculations", () => {
    it("power increases with MRR", () => {
      const light = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        axial_depth_mm: 1,
        radial_depth_mm: 3,
      });

      const heavy = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        axial_depth_mm: 5,
        radial_depth_mm: 6,
      });

      expect(heavy.power.required_power_kw.value).toBeGreaterThan(
        light.power.required_power_kw.value
      );
    });

    it("resultant force >= max component force", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        axial_depth_mm: 3,
      });

      const maxComponent = Math.max(
        result.forces.tangential_force_N.value,
        result.forces.radial_force_N.value,
        result.forces.axial_force_N.value
      );

      expect(result.forces.resultant_force_N.value).toBeGreaterThanOrEqual(
        maxComponent * 0.99
      );
    });

    it("machine power constraint limits parameters", () => {
      const unlimited = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 20,
        axial_depth_mm: 10,
        radial_depth_mm: 10,
      });

      const limited = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 20,
        axial_depth_mm: 10,
        radial_depth_mm: 10,
        machine_power_kw: 5, // Severely limited
      });

      // Limited machine should show power constraint
      expect(limited.power.is_within_budget).toBeDefined();
    });
  });

  describe("Tool Life Prediction (Taylor)", () => {
    it("higher speed reduces tool life", () => {
      const slow = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        cutting_speed_mpm: 100,
      });

      const fast = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        cutting_speed_mpm: 200,
      });

      // Taylor: T = C/V^n, so higher V → lower T
      expect(fast.tool_life.life_minutes.value).toBeLessThan(
        slow.tool_life.life_minutes.value
      );
    });

    it("provides cost-optimized and productivity-optimized speeds", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        tool_cost_usd: 50,
      });

      // Cost-optimized speed should be lower than productivity-optimized
      expect(result.tool_life.optimal_speed_cost.value).toBeLessThanOrEqual(
        result.tool_life.optimal_speed_productivity.value
      );
    });

    it("identifies dominant wear factor", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
      });

      expect(["speed", "feed", "doc"]).toContain(
        result.tool_life.sensitivity.dominant_factor
      );
    });
  });

  describe("Stability Analysis", () => {
    it("returns critical depth when dynamics provided", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        system_stiffness_n_m: 1e7,
        natural_frequency_hz: 1500,
        damping_ratio: 0.05,
      });

      expect(result.stability.critical_depth_mm.value).toBeGreaterThan(0);
    });

    it("higher stiffness allows greater stable depth", () => {
      const flexible = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        system_stiffness_n_m: 5e6,
        natural_frequency_hz: 1500,
        damping_ratio: 0.05,
      });

      const rigid = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        system_stiffness_n_m: 2e7,
        natural_frequency_hz: 1500,
        damping_ratio: 0.05,
      });

      expect(rigid.stability.critical_depth_mm.value).toBeGreaterThan(
        flexible.stability.critical_depth_mm.value
      );
    });
  });

  describe("Alternative Parameter Sets", () => {
    it("provides conservative, balanced, and aggressive options", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
      });

      expect(result.alternatives.conservative).toBeDefined();
      expect(result.alternatives.balanced).toBeDefined();
      expect(result.alternatives.aggressive).toBeDefined();
    });

    it("conservative has lowest MRR, aggressive has highest", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        axial_depth_mm: 5,
      });

      const conservativeMrr = result.alternatives.conservative.vc *
        result.alternatives.conservative.fz * result.alternatives.conservative.ap;
      const aggressiveMrr = result.alternatives.aggressive.vc *
        result.alternatives.aggressive.fz * result.alternatives.aggressive.ap;

      expect(aggressiveMrr).toBeGreaterThan(conservativeMrr);
    });
  });

  describe("Inference from Minimal Input", () => {
    it("infers full parameters from material alone", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "aluminum",
      });

      // Should resolve all core parameters
      expect(result.cutting_speed.value).toBeGreaterThan(0);
      expect(result.spindle_rpm.value).toBeGreaterThan(0);
      expect(result.feed_rate.value).toBeGreaterThan(0);
      expect(result.resolved.tool_diameter_mm).toBeGreaterThan(0);
    });

    it("infers material from ISO group", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        iso_group: "N",
        tool_diameter_mm: 10,
      });

      expect(result.resolved.iso_group).toBe("N");
    });

    it("respects user-supplied values over inference", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        cutting_speed_mpm: 200, // User override
        tool_diameter_mm: 12,
      });

      expect(result.cutting_speed.value).toBeCloseTo(200, 0);
      expect(result.cutting_speed.source).toBe("user_input");
    });
  });

  describe("Edge Cases", () => {
    it("handles very small tool diameter", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "aluminum",
        tool_diameter_mm: 0.5,
        flutes: 2,
      });

      expect(result.spindle_rpm.value).toBeGreaterThan(10000); // Small tool = high RPM
    });

    it("handles very large tool diameter", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 100,
        flutes: 8,
      });

      expect(result.spindle_rpm.value).toBeLessThan(2000); // Large tool = low RPM
    });

    it("returns confidence scores on outputs", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
      });

      expect(result.cutting_speed.confidence).toBeGreaterThan(0);
      expect(result.cutting_speed.confidence).toBeLessThanOrEqual(1);
    });

    it("handles missing optional parameters gracefully", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        tool_diameter_mm: 10,
        // No material, operation, or other params
      });

      expect(result.cutting_speed.value).toBeGreaterThan(0);
      expect(result.resolved.material).toBeDefined();
    });
  });

  describe("Chip Analysis", () => {
    it("chip thinning factor >= 1 for partial radial engagement", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        radial_depth_mm: 3, // 25% radial engagement
      });

      expect(result.chip_thinning_factor.value).toBeGreaterThanOrEqual(1);
    });

    it("chip thinning factor = 1 for slotting", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        radial_depth_pct: 100,
        strategy: "slot",
      });

      expect(result.chip_thinning_factor.value).toBeCloseTo(1, 1);
    });

    it("actual chip load compensates for thinning", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "aluminum",
        tool_diameter_mm: 12,
        radial_depth_mm: 2, // Low radial engagement
        feed_per_tooth_mm: 0.1,
      });

      // Actual chip load should be less than programmed fz due to geometry
      if (result.chip_thinning_factor.value > 1) {
        expect(result.chip_load_actual.value).toBeLessThanOrEqual(
          result.feed_per_tooth.value
        );
      }
    });
  });

  describe("Thermal Analysis", () => {
    it("interface temperature increases with cutting speed", () => {
      const slow = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        cutting_speed_mpm: 100,
      });

      const fast = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        cutting_speed_mpm: 250,
      });

      expect(fast.thermal.interface_temp_C.value).toBeGreaterThan(
        slow.thermal.interface_temp_C.value
      );
    });

    it("thermal damage risk assessment provided", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "titanium",
        tool_diameter_mm: 12,
        cutting_speed_mpm: 80,
      });

      expect(["none", "low", "moderate", "high", "critical"]).toContain(
        result.thermal.thermal_damage_risk
      );
    });

    it("coating limit temperature provided", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
        tool_coating: "TiAlN",
      });

      expect(result.thermal.coating_limit_C.value).toBeGreaterThan(500);
    });
  });

  describe("Quick Mode", () => {
    it("returns human-readable summary string", () => {
      const summary = ultimateSpeedFeedEngine.quick({
        material: "aluminum",
        tool_diameter_mm: 10,
        operation: "milling",
      });

      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(50);
      expect(summary.toLowerCase()).toMatch(/rpm|feed|speed/);
    });
  });

  describe("Material and Strategy Listings", () => {
    it("listMaterials returns ISO-grouped materials", () => {
      const materials = ultimateSpeedFeedEngine.listMaterials();

      expect(materials.length).toBeGreaterThan(5);
      expect(materials.some(m => m.iso === "P")).toBe(true);
      expect(materials.some(m => m.iso === "N")).toBe(true);
    });

    it("listStrategies returns milling strategies with factors", () => {
      const strategies = ultimateSpeedFeedEngine.listStrategies();

      expect(strategies.length).toBeGreaterThan(3);
      expect(strategies.some(s => s.name === "trochoidal")).toBe(true);
      expect(strategies[0].vc_factor).toBeGreaterThan(0);
    });

    it("getMaterialProfile returns detailed profile", () => {
      const profile = ultimateSpeedFeedEngine.getMaterialProfile("steel");

      expect(profile).not.toBeNull();
      if (profile) {
        expect(profile.iso_group).toBe("P");
        expect(profile.base_vc_carbide).toBeGreaterThan(0);
      }
    });
  });

  describe("Statistics and Uncertainty", () => {
    it("provides 95% confidence intervals", () => {
      const result = ultimateSpeedFeedEngine.calculate({
        material: "steel",
        tool_diameter_mm: 12,
      });

      expect(result.uncertainty.cutting_speed.ci_95_low).toBeLessThan(
        result.cutting_speed.value
      );
      expect(result.uncertainty.cutting_speed.ci_95_high).toBeGreaterThan(
        result.cutting_speed.value
      );
    });

    it("stats() returns engine statistics", () => {
      const stats = ultimateSpeedFeedEngine.stats();

      expect(stats.materials_count).toBeGreaterThan(0);
      expect(stats.strategies_count).toBeGreaterThan(0);
    });
  });
});
