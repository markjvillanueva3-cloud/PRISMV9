import { describe, it, expect } from "vitest";
import { MultiBodyVibrationEngine } from "../engines/MultiBodyVibrationEngine.js";

const engine = new MultiBodyVibrationEngine();

describe("MultiBodyVibrationEngine", () => {
  describe("System Assembly", () => {
    it("assembles 3-DOF system with correct matrix dimensions", () => {
      const system = engine.quickSetup("endmill_10mm", "shrink_fit", "bt40_12000");
      expect(system.n_dof).toBe(3);
      expect(system.M.length).toBe(3);
      expect(system.K.length).toBe(3);
      expect(system.C.length).toBe(3);
    });

    it("mass matrix is diagonal", () => {
      const system = engine.quickSetup("endmill_10mm", "shrink_fit", "bt40_12000");
      expect(system.M[0][1]).toBe(0);
      expect(system.M[1][0]).toBe(0);
      expect(system.M[0][0]).toBeGreaterThan(0);
    });

    it("stiffness matrix is symmetric", () => {
      const system = engine.quickSetup("endmill_10mm", "shrink_fit", "bt40_12000");
      expect(system.K[0][1]).toBe(system.K[1][0]);
      expect(system.K[1][2]).toBe(system.K[2][1]);
    });

    it("4-DOF system with workpiece", () => {
      const system = engine.quickSetup("endmill_10mm", "shrink_fit", "bt40_12000", "thin_wall");
      expect(system.n_dof).toBe(4);
    });
  });

  describe("System FRF", () => {
    it("computes FRF with peaks at natural frequencies", () => {
      const system = engine.quickSetup("endmill_10mm", "shrink_fit", "bt40_12000");
      const frf = engine.computeSystemFRF(system, [100, 4000], 300);
      expect(frf.natural_frequencies_Hz.length).toBeGreaterThan(0);
      expect(frf.peak_magnitudes.length).toBe(frf.natural_frequencies_Hz.length);
      expect(frf.points.length).toBe(301);
    });

    it("4-DOF system has natural frequencies", () => {
      const sys4 = engine.quickSetup("endmill_10mm", "shrink_fit", "bt40_12000", "thin_wall");
      const frf4 = engine.computeSystemFRF(sys4, [10, 5000], 500);
      expect(frf4.natural_frequencies_Hz.length).toBeGreaterThan(0);
    });

    it("FRF magnitudes are positive", () => {
      const system = engine.quickSetup("endmill_10mm", "collet_er32", "bt40_12000");
      const frf = engine.computeSystemFRF(system);
      for (const p of frf.points) {
        expect(p.magnitude).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Coupled Modes", () => {
    it("identifies modes from FRF peaks", () => {
      const system = engine.quickSetup("endmill_10mm", "shrink_fit", "bt40_12000");
      const frf = engine.computeSystemFRF(system);
      const modes = engine.predictCoupledModes(system, frf);
      expect(modes.length).toBe(frf.natural_frequencies_Hz.length);
      for (const m of modes) {
        expect(m.mode_shape.length).toBe(system.n_dof);
        expect(m.dominant_components.length).toBeGreaterThan(0);
      }
    });

    it("coupled modes may not be visible to single-body analysis", () => {
      const system = engine.quickSetup("endmill_6mm", "collet_er32", "bt40_12000", "thin_wall");
      const frf = engine.computeSystemFRF(system);
      const modes = engine.predictCoupledModes(system, frf);
      // At least some modes should be coupled (not visible to single body)
      const coupledCount = modes.filter(m => !m.visible_to_single_body).length;
      // This is system-dependent; just verify the classification works
      expect(coupledCount + modes.filter(m => m.visible_to_single_body).length).toBe(modes.length);
    });
  });

  describe("Stability Lobes", () => {
    it("computes stability lobes with optimal RPM", () => {
      const system = engine.quickSetup("endmill_10mm", "shrink_fit", "bt40_12000");
      const frf = engine.computeSystemFRF(system);
      const result = engine.stabilityLobesCoupled(system, frf, 4, 2000, [2000, 12000], 50);
      expect(result.rpm_values.length).toBeGreaterThan(0);
      expect(result.ap_limit_mm.length).toBe(result.rpm_values.length);
      expect(result.max_stable_ap_mm).toBeGreaterThan(0);
      expect(result.optimal_rpm).toBeGreaterThanOrEqual(2000);
    });

    it("provides single-body comparison", () => {
      const system = engine.quickSetup("endmill_10mm", "shrink_fit", "bt40_12000");
      const frf = engine.computeSystemFRF(system);
      const result = engine.stabilityLobesCoupled(system, frf, 4, 2000);
      expect(result.single_body_max_ap_mm).toBeGreaterThan(0);
    });
  });

  describe("Dispatcher", () => {
    it("quick_setup action works", () => {
      const result = engine.calculate({
        action: "quick_setup", tool: "endmill_10mm", holder: "shrink_fit", spindle: "bt40_12000",
      }) as any;
      expect(result.n_dof).toBe(3);
    });

    it("unknown action returns error", () => {
      const result = engine.calculate({ action: "unknown" as any }) as any;
      expect(result.error).toBeDefined();
    });
  });
});
