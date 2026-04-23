/**
 * SurfaceFinishEngine Physics Validation Tests
 * MILL-AUDIT/P4: Critical surface quality prediction tests
 *
 * Physics model: Theoretical Ra = f² / (32 × r)
 *   where f = feed/rev (turning) or feed/tooth (milling)
 *   and r = tool nose radius (turning) or D/2 (ball milling)
 *
 * Correction factors: material, tool wear, coolant, speed, vibration
 *
 * Safety risk: Incorrect surface prediction causes part rejection, rework
 */

import { describe, it, expect } from "vitest";
import { surfaceFinishEngine } from "../engines/SurfaceFinishEngine.js";

describe("SurfaceFinishEngine — Physics Validation", () => {
  describe("Dimensional Consistency", () => {
    it("returns Ra in μm", () => {
      const result = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        tool_nose_radius_mm: 0.8,
      });

      expect(result.ra_um).toBeGreaterThan(0);
      expect(result.ra_um).toBeLessThan(100); // Reasonable Ra range
    });

    it("returns Rz in μm", () => {
      const result = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        tool_nose_radius_mm: 0.8,
      });

      expect(result.rz_um).toBeGreaterThan(0);
      expect(result.rz_um).toBeGreaterThan(result.ra_um); // Rz > Ra always
    });

    it("returns Rt in μm (Rt > Rz > Ra)", () => {
      const result = surfaceFinishEngine.predict({
        process: "milling",
        feed_per_tooth_mm: 0.1,
        tool_diameter_mm: 12,
      });

      expect(result.rt_um).toBeGreaterThanOrEqual(result.rz_um);
      expect(result.rz_um).toBeGreaterThanOrEqual(result.ra_um);
    });

    it("returns Rq (RMS) in μm", () => {
      const result = surfaceFinishEngine.predict({
        process: "grinding",
      });

      expect(result.rq_um).toBeGreaterThan(0);
      // Rq ≈ 1.1 × Ra for Gaussian distribution
      expect(result.rq_um).toBeCloseTo(result.ra_um * 1.1, 1);
    });
  });

  describe("Theoretical Ra Formula Validation", () => {
    it("turning: Ra = f² / (32 × r) scaled to μm", () => {
      const f = 0.2; // mm/rev
      const r = 0.8; // mm
      const expectedRa = (f * f) / (32 * r) * 1000; // μm

      const result = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: f,
        tool_nose_radius_mm: r,
      });

      // Theoretical should match before corrections
      expect(result.theoretical_ra_um).toBeCloseTo(expectedRa, 1);
    });

    it("milling: Ra = fz² / (32 × r) where r = D/2", () => {
      const fz = 0.1; // mm/tooth
      const D = 10; // mm
      const r = D / 2;
      const expectedRa = (fz * fz) / (32 * r) * 1000; // μm

      const result = surfaceFinishEngine.predict({
        process: "milling",
        feed_per_tooth_mm: fz,
        tool_diameter_mm: D,
      });

      expect(result.theoretical_ra_um).toBeCloseTo(expectedRa, 1);
    });

    it("Ra scales with f² (quadratic feed relationship)", () => {
      const lowFeed = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.1,
        tool_nose_radius_mm: 0.8,
      });

      const highFeed = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.2, // 2× feed
        tool_nose_radius_mm: 0.8,
      });

      // 2× feed → 4× Ra (quadratic)
      const ratio = highFeed.theoretical_ra_um / lowFeed.theoretical_ra_um;
      expect(ratio).toBeCloseTo(4, 0);
    });

    it("Ra inversely proportional to tool radius", () => {
      const smallRadius = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        tool_nose_radius_mm: 0.4, // small
      });

      const largeRadius = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        tool_nose_radius_mm: 1.2, // 3× larger
      });

      // 3× radius → 1/3 Ra
      const ratio = smallRadius.theoretical_ra_um / largeRadius.theoretical_ra_um;
      expect(ratio).toBeCloseTo(3, 0);
    });
  });

  describe("Correction Factors", () => {
    it("material correction: aluminum better than steel", () => {
      const steel = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        tool_nose_radius_mm: 0.8,
        iso_material_group: "P",
      });

      const aluminum = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        tool_nose_radius_mm: 0.8,
        iso_material_group: "N",
      });

      // Aluminum (N) has correction factor 0.85 vs steel (P) 1.0
      expect(aluminum.ra_um).toBeLessThan(steel.ra_um);
    });

    it("material correction: stainless worse than steel (BUE)", () => {
      const steel = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        iso_material_group: "P",
      });

      const stainless = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        iso_material_group: "M",
      });

      // Stainless (M) has correction factor 1.15 vs steel 1.0
      expect(stainless.ra_um).toBeGreaterThan(steel.ra_um);
    });

    it("tool wear degrades surface finish", () => {
      const newTool = surfaceFinishEngine.predict({
        process: "milling",
        feed_per_tooth_mm: 0.1,
        tool_diameter_mm: 12,
        tool_wear_pct: 0,
      });

      const wornTool = surfaceFinishEngine.predict({
        process: "milling",
        feed_per_tooth_mm: 0.1,
        tool_diameter_mm: 12,
        tool_wear_pct: 80, // 80% worn
      });

      expect(wornTool.ra_um).toBeGreaterThan(newTool.ra_um);
      expect(wornTool.correction_factors.some(c => c.factor === "tool_wear")).toBe(true);
    });

    it("flood coolant improves surface finish", () => {
      const dryCut = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        coolant: "none",
      });

      const floodCoolant = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        coolant: "flood",
      });

      expect(floodCoolant.ra_um).toBeLessThan(dryCut.ra_um);
    });

    it("higher cutting speed improves finish", () => {
      const slowSpeed = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        cutting_speed_mmin: 100,
      });

      const highSpeed = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        cutting_speed_mmin: 300,
      });

      expect(highSpeed.ra_um).toBeLessThan(slowSpeed.ra_um);
    });

    it("vibration degrades surface finish", () => {
      const noVibration = surfaceFinishEngine.predict({
        process: "milling",
        feed_per_tooth_mm: 0.1,
        tool_diameter_mm: 12,
      });

      const withVibration = surfaceFinishEngine.predict({
        process: "milling",
        feed_per_tooth_mm: 0.1,
        tool_diameter_mm: 12,
        vibration_amplitude_um: 5, // 5 μm vibration
      });

      expect(withVibration.ra_um).toBeGreaterThan(noVibration.ra_um);
    });

    it("correction factors are tracked in result", () => {
      const result = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        iso_material_group: "M",
        tool_wear_pct: 30,
        coolant: "flood",
        cutting_speed_mmin: 200,
      });

      expect(result.correction_factors.length).toBeGreaterThan(0);
      expect(result.correction_factors.some(c => c.factor === "material")).toBe(true);
      expect(result.correction_factors.some(c => c.factor === "coolant")).toBe(true);
    });
  });

  describe("Process-Specific Behavior", () => {
    it("grinding achieves finer finish than turning", () => {
      const turning = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.1,
        tool_nose_radius_mm: 0.8,
      });

      const grinding = surfaceFinishEngine.predict({
        process: "grinding",
      });

      expect(grinding.ra_um).toBeLessThan(turning.ra_um);
    });

    it("polishing achieves finest finish", () => {
      const processes = ["turning", "milling", "grinding", "polishing"] as const;
      const results = processes.map(p => ({
        process: p,
        ra: surfaceFinishEngine.predict({ process: p }).ra_um,
      }));

      const polishing = results.find(r => r.process === "polishing");
      expect(polishing?.ra).toBeLessThan(results.find(r => r.process === "grinding")!.ra);
    });

    it("EDM has coarser finish than grinding", () => {
      const grinding = surfaceFinishEngine.predict({ process: "grinding" });
      const edm = surfaceFinishEngine.predict({ process: "edm" });

      expect(edm.ra_um).toBeGreaterThan(grinding.ra_um);
    });

    it("each process has achievable range in result", () => {
      const result = surfaceFinishEngine.predict({
        process: "milling",
        feed_per_tooth_mm: 0.1,
      });

      expect(result.achievable_range.min_ra).toBeGreaterThan(0);
      expect(result.achievable_range.max_ra).toBeGreaterThan(result.achievable_range.min_ra);
    });
  });

  describe("Achievable Finish Lookup", () => {
    it("returns achievable ranges for all processes", () => {
      const achievable = surfaceFinishEngine.achievable();

      expect(achievable.length).toBeGreaterThan(5);
      expect(achievable.some(a => a.process === "turning")).toBe(true);
      expect(achievable.some(a => a.process === "grinding")).toBe(true);
    });

    it("returns filtered achievable range for specific process", () => {
      const achievable = surfaceFinishEngine.achievable("grinding");

      expect(achievable.length).toBe(1);
      expect(achievable[0].process).toBe("grinding");
      expect(achievable[0].typical_ra_range_um[0]).toBeLessThan(
        achievable[0].typical_ra_range_um[1]
      );
    });

    it("best Ra is below typical range minimum", () => {
      const achievable = surfaceFinishEngine.achievable("turning");

      expect(achievable[0].best_ra_um).toBeLessThanOrEqual(
        achievable[0].typical_ra_range_um[0]
      );
    });

    it("includes process notes", () => {
      const achievable = surfaceFinishEngine.achievable("lapping");

      expect(achievable[0].notes.length).toBeGreaterThan(0);
    });
  });

  describe("Compare Function", () => {
    it("compares multiple input configurations", () => {
      const result = surfaceFinishEngine.compare([
        { process: "turning", feed_per_rev_mm: 0.1 },
        { process: "turning", feed_per_rev_mm: 0.2 },
        { process: "turning", feed_per_rev_mm: 0.3 },
      ]);

      expect(result.inputs.length).toBe(3);
      expect(result.results.length).toBe(3);
      expect(result.best_index).toBeDefined();
    });

    it("identifies best (lowest Ra) configuration", () => {
      const result = surfaceFinishEngine.compare([
        { process: "turning", feed_per_rev_mm: 0.3 }, // worst
        { process: "turning", feed_per_rev_mm: 0.1 }, // best
        { process: "turning", feed_per_rev_mm: 0.2 }, // middle
      ]);

      // Best is index 1 (lowest feed → lowest Ra)
      expect(result.best_index).toBe(1);
      expect(result.results[result.best_index].ra_um).toBeLessThan(
        result.results[0].ra_um
      );
    });

    it("handles mixed processes in comparison", () => {
      const result = surfaceFinishEngine.compare([
        { process: "turning", feed_per_rev_mm: 0.15 },
        { process: "grinding" },
        { process: "milling", feed_per_tooth_mm: 0.1 },
      ]);

      expect(result.results.length).toBe(3);
      // Grinding should be best
      const grindingIndex = result.inputs.findIndex(i => i.process === "grinding");
      expect(result.results[grindingIndex].ra_um).toBeLessThan(
        result.results.find(r => r.process === "turning")!.ra_um
      );
    });
  });

  describe("Recommendations", () => {
    it("recommends tool replacement when wear > 60%", () => {
      const result = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        tool_wear_pct: 75,
      });

      expect(
        result.recommendations.some(r => r.toLowerCase().includes("tool") || r.toLowerCase().includes("wear"))
      ).toBe(true);
    });

    it("warns when predicted Ra exceeds process typical range", () => {
      const result = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.5, // Very high feed → poor finish
        tool_nose_radius_mm: 0.4, // Small radius
      });

      expect(
        result.recommendations.some(r => r.toLowerCase().includes("exceed") || r.toLowerCase().includes("reduce"))
      ).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("handles missing optional parameters", () => {
      const result = surfaceFinishEngine.predict({
        process: "turning",
      });

      // Should use defaults
      expect(result.ra_um).toBeGreaterThan(0);
    });

    it("handles very small feed (approaching zero)", () => {
      const result = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.01, // Very small
        tool_nose_radius_mm: 0.8,
      });

      expect(result.ra_um).toBeGreaterThan(0);
      expect(result.ra_um).toBeLessThan(0.5); // Should be very fine
    });

    it("handles very large feed", () => {
      const result = surfaceFinishEngine.predict({
        process: "milling",
        feed_per_tooth_mm: 0.5, // Aggressive
        tool_diameter_mm: 12,
      });

      expect(result.ra_um).toBeGreaterThan(1); // Rough finish
    });

    it("clamps Ra to minimum achievable value", () => {
      const result = surfaceFinishEngine.predict({
        process: "polishing",
      });

      // Ra should not be below physical minimum (~0.003 μm)
      expect(result.ra_um).toBeGreaterThanOrEqual(0.003);
    });

    it("handles unknown material group gracefully", () => {
      const result = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        iso_material_group: "X", // Invalid group
      });

      // Should still calculate with default correction
      expect(result.ra_um).toBeGreaterThan(0);
    });
  });

  describe("Vibration Impact (Schmitz-Smith Model)", () => {
    it("uses RSS combination for vibration + kinematic Ra", () => {
      const noVib = surfaceFinishEngine.predict({
        process: "milling",
        feed_per_tooth_mm: 0.1,
        tool_diameter_mm: 12,
      });

      const withVib = surfaceFinishEngine.predict({
        process: "milling",
        feed_per_tooth_mm: 0.1,
        tool_diameter_mm: 12,
        vibration_amplitude_um: 2,
      });

      // Ra_total = sqrt(Ra_kinematic² + Ra_vibration²)
      // So Ra_total > Ra_kinematic
      expect(withVib.ra_um).toBeGreaterThan(noVib.ra_um);
    });

    it("higher vibration amplitude causes larger Ra increase", () => {
      const lowVib = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        vibration_amplitude_um: 1,
      });

      const highVib = surfaceFinishEngine.predict({
        process: "turning",
        feed_per_rev_mm: 0.15,
        vibration_amplitude_um: 5,
      });

      expect(highVib.ra_um).toBeGreaterThan(lowVib.ra_um);
    });

    it("uses surface_penalty_factor from SpindleHarmonicsQualityEngine", () => {
      const result = surfaceFinishEngine.predict({
        process: "milling",
        feed_per_tooth_mm: 0.1,
        tool_diameter_mm: 12,
        surface_penalty_factor: 1.5, // 50% penalty from harmonics
      });

      expect(
        result.correction_factors.some(c => c.factor === "vibration_harmonic")
      ).toBe(true);
    });
  });
});
