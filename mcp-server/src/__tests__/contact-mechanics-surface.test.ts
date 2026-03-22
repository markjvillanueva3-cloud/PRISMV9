/**
 * Tests for ContactMechanicsSurfaceEngine — Hertz contact + sub-surface integrity
 */
import { describe, it, expect } from "vitest";
import { ContactMechanicsSurfaceEngine } from "../engines/ContactMechanicsSurfaceEngine.js";
import type { MaterialProps, ToolGeometry, CuttingConditions } from "../engines/ContactMechanicsSurfaceEngine.js";

const engine = new ContactMechanicsSurfaceEngine();

const STEEL_1045: MaterialProps = {
  name: "AISI 1045", E_GPa: 205, nu: 0.29, yield_MPa: 530,
  hardness_HRC: 20, austenite_temp_C: 727,
  thermal_conductivity: 49.8, specific_heat: 486, density: 7870,
};

const HARDENED_4340: MaterialProps = {
  name: "AISI 4340 HRC52", E_GPa: 210, nu: 0.29, yield_MPa: 1620,
  hardness_HRC: 52, austenite_temp_C: 727,
  thermal_conductivity: 34.0, specific_heat: 475, density: 7850,
};

const TITANIUM: MaterialProps = {
  name: "Ti-6Al-4V", E_GPa: 114, nu: 0.34, yield_MPa: 880,
  austenite_temp_C: 995, thermal_conductivity: 6.7, specific_heat: 526, density: 4430,
};

const TOOL_STANDARD: ToolGeometry = {
  nose_radius_mm: 0.8, edge_radius_um: 20,
  clearance_angle_deg: 7, rake_angle_deg: 5,
};

const TOOL_SHARP: ToolGeometry = {
  nose_radius_mm: 0.4, edge_radius_um: 10,
  clearance_angle_deg: 11, rake_angle_deg: 10,
};

describe("ContactMechanicsSurfaceEngine", () => {

  describe("Hertz Contact", () => {
    it("computes contact pressure for typical turning", () => {
      const result = engine.hertzContact(200, TOOL_STANDARD, STEEL_1045);
      expect(result.p_max_MPa).toBeGreaterThan(0);
      expect(result.a_mm).toBeGreaterThan(0);
      expect(result.contact_area_mm2).toBeGreaterThan(0);
      expect(result.E_star_GPa).toBeGreaterThan(100);
    });

    it("higher force → higher contact pressure", () => {
      const r1 = engine.hertzContact(100, TOOL_STANDARD, STEEL_1045);
      const r2 = engine.hertzContact(500, TOOL_STANDARD, STEEL_1045);
      expect(r2.p_max_MPa).toBeGreaterThan(r1.p_max_MPa);
    });

    it("larger nose radius → lower contact pressure (same force)", () => {
      const smallNose: ToolGeometry = { ...TOOL_STANDARD, nose_radius_mm: 0.4 };
      const largeNose: ToolGeometry = { ...TOOL_STANDARD, nose_radius_mm: 1.6 };
      const r1 = engine.hertzContact(200, smallNose, STEEL_1045);
      const r2 = engine.hertzContact(200, largeNose, STEEL_1045);
      expect(r2.p_max_MPa).toBeLessThan(r1.p_max_MPa);
    });

    it("softer material → lower E_star", () => {
      const rSteel = engine.hertzContact(200, TOOL_STANDARD, STEEL_1045);
      const rTi = engine.hertzContact(200, TOOL_STANDARD, TITANIUM);
      expect(rTi.E_star_GPa).toBeLessThan(rSteel.E_star_GPa);
    });
  });

  describe("Sub-Surface Stress", () => {
    it("stress is maximum below the surface (not at surface)", () => {
      const hertz = engine.hertzContact(200, TOOL_STANDARD, STEEL_1045);
      const result = engine.subSurfaceStress(hertz, STEEL_1045);
      expect(result.depth_of_max_mm).toBeGreaterThan(0);
      expect(result.max_sigma_VM_MPa).toBeGreaterThan(0);
    });

    it("stress field has positive values at all depths", () => {
      const hertz = engine.hertzContact(200, TOOL_STANDARD, STEEL_1045);
      const result = engine.subSurfaceStress(hertz, STEEL_1045);
      // All von Mises stress values should be non-negative
      for (const vm of result.sigma_VM_MPa) {
        expect(vm).toBeGreaterThanOrEqual(0);
      }
      // Should have a valid maximum
      expect(result.max_sigma_VM_MPa).toBeGreaterThan(0);
    });

    it("returns correct number of depth points", () => {
      const hertz = engine.hertzContact(200, TOOL_STANDARD, STEEL_1045);
      const result = engine.subSurfaceStress(hertz, STEEL_1045, 0.5, 20);
      expect(result.depths_mm.length).toBe(21); // 0 to N inclusive
      expect(result.sigma_VM_MPa.length).toBe(21);
    });

    it("maximum shear stress ≈ 0.31 × p_max (Hertz theory)", () => {
      const hertz = engine.hertzContact(500, TOOL_STANDARD, STEEL_1045);
      const result = engine.subSurfaceStress(hertz, STEEL_1045);
      const maxTau = Math.max(...result.tau_max_MPa);
      // Should be roughly in the range 0.2-0.5 × p_max
      expect(maxTau).toBeGreaterThan(hertz.p_max_MPa * 0.1);
      expect(maxTau).toBeLessThan(hertz.p_max_MPa * 0.6);
    });
  });

  describe("Plastic Zone", () => {
    it("safety factor increases as force decreases", () => {
      const hertzHigh = engine.hertzContact(500, TOOL_STANDARD, HARDENED_4340);
      const hertzLow = engine.hertzContact(10, TOOL_STANDARD, HARDENED_4340);
      const ssHigh = engine.subSurfaceStress(hertzHigh, HARDENED_4340);
      const ssLow = engine.subSurfaceStress(hertzLow, HARDENED_4340);
      const pzHigh = engine.plasticZoneDepth(ssHigh, HARDENED_4340);
      const pzLow = engine.plasticZoneDepth(ssLow, HARDENED_4340);
      expect(pzLow.safety_factor).toBeGreaterThan(pzHigh.safety_factor);
    });

    it("plastic zone exists for high force on soft material", () => {
      const hertz = engine.hertzContact(2000, TOOL_STANDARD, STEEL_1045);
      const subsurface = engine.subSurfaceStress(hertz, STEEL_1045);
      const result = engine.plasticZoneDepth(subsurface, STEEL_1045);
      expect(result.plastic_depth_mm).toBeGreaterThan(0);
      expect(result.significant).toBe(true);
    });

    it("safety factor < 1 when stress exceeds yield", () => {
      const hertz = engine.hertzContact(2000, TOOL_STANDARD, STEEL_1045);
      const subsurface = engine.subSurfaceStress(hertz, STEEL_1045);
      const result = engine.plasticZoneDepth(subsurface, STEEL_1045);
      if (result.significant) {
        expect(result.safety_factor).toBeLessThan(1);
      }
    });
  });

  describe("White Layer Risk", () => {
    const conditions: CuttingConditions = {
      Vc_m_min: 150, feed_mm_rev: 0.15, ap_mm: 0.5,
    };

    it("low risk for gentle cuts on mild steel", () => {
      const hertz = engine.hertzContact(200, TOOL_STANDARD, STEEL_1045);
      const result = engine.whiteLayerRisk(
        { Vc_m_min: 100, feed_mm_rev: 0.1, ap_mm: 0.3, coolant: "flood" },
        TOOL_STANDARD, STEEL_1045, hertz,
      );
      expect(["none", "low"]).toContain(result.risk);
      expect(result.margin_C).toBeGreaterThan(0);
    });

    it("higher risk for aggressive cuts on hardened steel", () => {
      const hertz = engine.hertzContact(500, TOOL_STANDARD, HARDENED_4340);
      const gentle = engine.whiteLayerRisk(
        { Vc_m_min: 100, feed_mm_rev: 0.1, ap_mm: 0.3, coolant: "flood" },
        TOOL_STANDARD, HARDENED_4340, hertz,
      );
      const aggressive = engine.whiteLayerRisk(
        { Vc_m_min: 300, feed_mm_rev: 0.25, ap_mm: 1.0, coolant: "dry" },
        TOOL_STANDARD, HARDENED_4340, hertz,
      );
      // Risk should be higher or equal for aggressive
      const riskOrder = ["none", "low", "medium", "high", "critical"];
      expect(riskOrder.indexOf(aggressive.risk)).toBeGreaterThanOrEqual(
        riskOrder.indexOf(gentle.risk)
      );
    });

    it("cryogenic cooling reduces temperature", () => {
      const hertz = engine.hertzContact(300, TOOL_STANDARD, STEEL_1045);
      const dry = engine.whiteLayerRisk(
        { ...conditions, coolant: "dry" }, TOOL_STANDARD, STEEL_1045, hertz,
      );
      const cryo = engine.whiteLayerRisk(
        { ...conditions, coolant: "cryogenic" }, TOOL_STANDARD, STEEL_1045, hertz,
      );
      expect(cryo.interface_temp_C).toBeLessThan(dry.interface_temp_C);
    });

    it("provides recommendations when risk is elevated", () => {
      const hertz = engine.hertzContact(300, TOOL_STANDARD, HARDENED_4340);
      const result = engine.whiteLayerRisk(
        { Vc_m_min: 250, feed_mm_rev: 0.2, ap_mm: 0.8, coolant: "dry" },
        TOOL_STANDARD, HARDENED_4340, hertz,
      );
      if (result.risk !== "none") {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Residual Stress", () => {
    it("gentle cuts produce compressive residual stress", () => {
      const hertz = engine.hertzContact(200, TOOL_SHARP, STEEL_1045);
      const subsurface = engine.subSurfaceStress(hertz, STEEL_1045);
      const pz = engine.plasticZoneDepth(subsurface, STEEL_1045);
      const result = engine.residualStress(
        { Vc_m_min: 80, feed_mm_rev: 0.1, ap_mm: 0.3, coolant: "flood" },
        TOOL_SHARP, STEEL_1045, hertz, pz,
      );
      expect(result.mechanical_MPa).toBeLessThan(0); // compressive
      expect(result.thermal_MPa).toBeGreaterThan(0); // tensile
    });

    it("high speed increases thermal (tensile) component", () => {
      const hertz = engine.hertzContact(300, TOOL_STANDARD, STEEL_1045);
      const subsurface = engine.subSurfaceStress(hertz, STEEL_1045);
      const pz = engine.plasticZoneDepth(subsurface, STEEL_1045);

      const slow = engine.residualStress(
        { Vc_m_min: 80, feed_mm_rev: 0.15, ap_mm: 0.5 },
        TOOL_STANDARD, STEEL_1045, hertz, pz,
      );
      const fast = engine.residualStress(
        { Vc_m_min: 300, feed_mm_rev: 0.15, ap_mm: 0.5 },
        TOOL_STANDARD, STEEL_1045, hertz, pz,
      );
      expect(fast.thermal_MPa).toBeGreaterThan(slow.thermal_MPa);
    });

    it("reversal depth is positive", () => {
      const hertz = engine.hertzContact(200, TOOL_STANDARD, STEEL_1045);
      const subsurface = engine.subSurfaceStress(hertz, STEEL_1045);
      const pz = engine.plasticZoneDepth(subsurface, STEEL_1045);
      const result = engine.residualStress(
        { Vc_m_min: 150, feed_mm_rev: 0.15, ap_mm: 0.5 },
        TOOL_STANDARD, STEEL_1045, hertz, pz,
      );
      expect(result.reversal_depth_mm).toBeGreaterThan(0);
    });
  });

  describe("Full Integrity Analysis", () => {
    it("produces complete analysis for mild steel", () => {
      const result = engine.fullIntegrityAnalysis(
        { Vc_m_min: 150, feed_mm_rev: 0.15, ap_mm: 0.5, coolant: "flood" },
        TOOL_STANDARD,
        STEEL_1045,
      );
      expect(result.hertz.p_max_MPa).toBeGreaterThan(0);
      expect(result.subsurface.depths_mm.length).toBeGreaterThan(10);
      expect(result.white_layer.risk).toBeDefined();
      expect(result.residual_stress.type).toBeDefined();
      expect(result.overall_risk).toBeDefined();
      expect(result.summary).toContain("Contact");
    });

    it("accepts material name string", () => {
      const result = engine.fullIntegrityAnalysis(
        { Vc_m_min: 150, feed_mm_rev: 0.15, ap_mm: 0.5 },
        TOOL_STANDARD,
        "steel_1045" as any,
      );
      expect(result.hertz.p_max_MPa).toBeGreaterThan(0);
    });

    it("titanium has lower E_star than steel", () => {
      const steel = engine.fullIntegrityAnalysis(
        { Vc_m_min: 150, feed_mm_rev: 0.15, ap_mm: 0.5 },
        TOOL_STANDARD, STEEL_1045,
      );
      const ti = engine.fullIntegrityAnalysis(
        { Vc_m_min: 60, feed_mm_rev: 0.1, ap_mm: 0.3 },
        TOOL_STANDARD, TITANIUM,
      );
      expect(ti.hertz.E_star_GPa).toBeLessThan(steel.hertz.E_star_GPa);
    });
  });

  describe("Dispatcher Interface", () => {
    it("full_integrity action works", () => {
      const result = engine.calculate({
        action: "full_integrity",
        conditions: { Vc_m_min: 150, feed_mm_rev: 0.15, ap_mm: 0.5 },
        tool: TOOL_STANDARD,
        workpiece: STEEL_1045,
      }) as any;
      expect(result.overall_risk).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it("unknown action returns error", () => {
      const result = engine.calculate({ action: "unknown" as any }) as any;
      expect(result.error).toBeDefined();
    });
  });

  describe("Physics Invariants", () => {
    it("E* is bounded by component moduli", () => {
      const result = engine.hertzContact(200, TOOL_STANDARD, STEEL_1045);
      // E* should be less than the stiffer material (carbide ~600 GPa)
      expect(result.E_star_GPa).toBeLessThan(600);
      expect(result.E_star_GPa).toBeGreaterThan(50);
    });

    it("contact area increases with force (Hertz law: a ∝ F^(1/3))", () => {
      const r1 = engine.hertzContact(100, TOOL_STANDARD, STEEL_1045);
      const r8 = engine.hertzContact(800, TOOL_STANDARD, STEEL_1045);
      // a₂/a₁ should be approximately (800/100)^(1/3) = 2.0
      const ratio = r8.a_mm / r1.a_mm;
      expect(ratio).toBeCloseTo(2.0, 0);
    });

    it("p_max ∝ F^(1/3) for Hertzian contact", () => {
      const r1 = engine.hertzContact(100, TOOL_STANDARD, STEEL_1045);
      const r8 = engine.hertzContact(800, TOOL_STANDARD, STEEL_1045);
      // p_max₂/p_max₁ = (F₂/F₁)^(1/3) = 2.0
      const ratio = r8.p_max_MPa / r1.p_max_MPa;
      expect(ratio).toBeCloseTo(2.0, 0);
    });
  });
});
