/**
 * WEDM Regression Suite — Permanent CI tests
 * Selected from the 30-part validation suite: the most critical scenarios
 * that must never regress. Covers all ISO groups, thickness extremes,
 * precision targets, negative tests, and physics consistency.
 *
 * Run: npx vitest run src/__tests__/wedm-regression-suite.test.ts
 */

import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
// 1. EDMEngine — wireEDM Core Physics
// ═══════════════════════════════════════════════════════════════════════

describe("WEDM Regression — EDMEngine wireEDM", () => {

  describe("standard scenarios", () => {
    it("R1: D2 blanking die 25mm — Ra < 1.0µm, kerf 0.25-0.35mm", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const r = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "H", wire_diameter_mm: 0.25, num_cuts: 4 });
      expect(r.predicted_ra.value).toBeLessThan(1.0);
      expect(r.kerf_width.value).toBeGreaterThan(0.25);
      expect(r.kerf_width.value).toBeLessThan(0.35);
      expect(r.cutting_speed.value).toBeGreaterThan(0);
      expect(r.cutting_speed.unit).toBeDefined();
    });

    it("R9: 5-pass finish — Ra < 0.3µm mirror finish", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const r = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "H", num_cuts: 5 });
      expect(r.predicted_ra.value).toBeLessThan(0.3);
      expect(r.predicted_ra.value).toBeGreaterThan(0);
    });

    it("default wire diameter is 0.25mm when not specified", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const r = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "P" });
      expect(r.kerf_width.value).toBeGreaterThan(0.25);
      expect(r.cutting_speed.value).toBeGreaterThan(0);
    });
  });

  describe("thickness extremes", () => {
    it("R6: 200mm forging die — very slow but valid parameters", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const r = edmEngine.wireEDM({ workpiece_thickness_mm: 200, material_iso_group: "H", wire_diameter_mm: 0.25, num_cuts: 3 });
      expect(r.cutting_speed.value).toBeGreaterThan(0);
      expect(r.cutting_speed.value).toBeLessThan(3);
      expect(r.wire_tension.value).toBeGreaterThan(10);
    });

    it("R7: 0.5mm orifice plate — fast cutting, narrow kerf", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const r = edmEngine.wireEDM({ workpiece_thickness_mm: 0.5, material_iso_group: "M", wire_diameter_mm: 0.10, num_cuts: 3 });
      expect(r.cutting_speed.value).toBeGreaterThan(50);
      expect(r.kerf_width.value).toBeLessThan(0.18);
    });

    it("medium thickness 50mm — speed between thin and thick", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const thin = edmEngine.wireEDM({ workpiece_thickness_mm: 5, material_iso_group: "P" });
      const med = edmEngine.wireEDM({ workpiece_thickness_mm: 50, material_iso_group: "P" });
      const thick = edmEngine.wireEDM({ workpiece_thickness_mm: 150, material_iso_group: "P" });
      expect(med.cutting_speed.value).toBeLessThan(thin.cutting_speed.value);
      expect(med.cutting_speed.value).toBeGreaterThan(thick.cutting_speed.value);
    });
  });

  describe("fine wire", () => {
    it("R8: Fine wire 0.10mm — narrow kerf for micro features", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const r = edmEngine.wireEDM({ workpiece_thickness_mm: 20, material_iso_group: "H", wire_diameter_mm: 0.10, num_cuts: 5 });
      expect(r.kerf_width.value).toBeLessThan(0.20);
      expect(r.predicted_ra.value).toBeLessThan(0.3);
    });

    it("fine wire kerf is narrower than standard wire", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const fine = edmEngine.wireEDM({ workpiece_thickness_mm: 20, material_iso_group: "H", wire_diameter_mm: 0.10, num_cuts: 3 });
      const std = edmEngine.wireEDM({ workpiece_thickness_mm: 20, material_iso_group: "H", wire_diameter_mm: 0.25, num_cuts: 3 });
      expect(fine.kerf_width.value).toBeLessThan(std.kerf_width.value);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. EDMFeasibilityEngine — Feasibility Assessment
// ═══════════════════════════════════════════════════════════════════════

describe("WEDM Regression — EDMFeasibilityEngine", () => {

  describe("positive feasibility", () => {
    it("R2: Tool steel through-profile — feasible, no blockers", async () => {
      const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
      const r = edmFeasibilityEngine.assess({
        material: "tool steel",
        features: [{ name: "die", is_through: true, profile_length_mm: 200, min_corner_radius_mm: 0.3, tolerance_mm: 0.01 }],
        workpiece: { thickness_mm: 25, length_mm: 200, width_mm: 150, height_mm: 25 },
      });
      expect(r.overall_feasible).toBe(true);
      expect(r.blockers).toHaveLength(0);
    });

    it("steel through-slot — standard feasibility pass", async () => {
      const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
      const r = edmFeasibilityEngine.assess({
        material: "steel",
        features: [{ name: "slot", is_through: true, profile_length_mm: 80, tolerance_mm: 0.02 }],
        workpiece: { thickness_mm: 15, length_mm: 100, width_mm: 80, height_mm: 15 },
      });
      expect(r.overall_feasible).toBe(true);
      expect(r.blockers).toHaveLength(0);
    });
  });

  describe("negative tests — correct rejections", () => {
    it("R3: Ceramic — blocked as non-conductive", async () => {
      const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
      const r = edmFeasibilityEngine.assess({
        material: "ceramic",
        features: [{ name: "profile", is_through: true, profile_length_mm: 50, tolerance_mm: 0.01 }],
        workpiece: { thickness_mm: 10, length_mm: 50, width_mm: 50, height_mm: 10 },
      });
      expect(r.overall_feasible).toBe(false);
      expect(r.blockers.length).toBeGreaterThan(0);
    });

    it("R4: Blind pocket — blocked for wire EDM", async () => {
      const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
      const r = edmFeasibilityEngine.assess({
        material: "steel",
        features: [{ name: "pocket", is_through: false, profile_length_mm: 40, tolerance_mm: 0.05 }],
        workpiece: { thickness_mm: 20, length_mm: 80, width_mm: 60, height_mm: 20 },
      });
      expect(r.overall_feasible).toBe(false);
      expect(r.blockers.some(b => /through/i.test(b))).toBe(true);
    });

    it("plastic — blocked as non-conductive", async () => {
      const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
      const r = edmFeasibilityEngine.assess({
        material: "plastic",
        features: [{ name: "slot", is_through: true, profile_length_mm: 30, tolerance_mm: 0.05 }],
        workpiece: { thickness_mm: 5, length_mm: 30, width_mm: 20, height_mm: 5 },
      });
      expect(r.overall_feasible).toBe(false);
      expect(r.blockers.length).toBeGreaterThan(0);
    });
  });

  describe("conductivity classification", () => {
    it("R5: Titanium — feasible but high resistivity", async () => {
      const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
      const r = edmFeasibilityEngine.check_conductivity({
        material: "titanium",
        features: [{ name: "profile", is_through: true, profile_length_mm: 60 }],
        workpiece: { thickness_mm: 5, length_mm: 40, width_mm: 20, height_mm: 5 },
      });
      expect(r.feasible).toBe(true);
      expect(r.resistivity).toBeGreaterThan(100);
    });

    it("R10: Copper — EASY classification, low resistivity", async () => {
      const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
      const r = edmFeasibilityEngine.check_conductivity({
        material: "copper",
        features: [{ name: "profile", is_through: true, profile_length_mm: 50 }],
        workpiece: { thickness_mm: 10, length_mm: 100, width_mm: 100, height_mm: 10 },
      });
      expect(r.feasible).toBe(true);
      expect(r.resistivity).toBeCloseTo(1.7, 0);
      expect(r.classification).toBe("EASY");
    });

    it("aluminum — EASY classification", async () => {
      const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
      const r = edmFeasibilityEngine.check_conductivity({
        material: "aluminum",
        features: [{ name: "profile", is_through: true, profile_length_mm: 50 }],
        workpiece: { thickness_mm: 10, length_mm: 50, width_mm: 50, height_mm: 10 },
      });
      expect(r.feasible).toBe(true);
      expect(r.resistivity).toBeLessThan(10);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Surface Integrity & Machine Selection
// ═══════════════════════════════════════════════════════════════════════

describe("WEDM Regression — Surface Integrity & Machine Selection", () => {

  describe("surface integrity assessment", () => {
    it("R11: Aerospace surface integrity — safety_critical flag", async () => {
      const { edmMonitorSurfaceIntegrityEngine } = await import("../engines/EDMMonitorSurfaceIntegrityEngine.js");
      const r = edmMonitorSurfaceIntegrityEngine.assessSurfaceIntegrity({
        material: "inconel_718", pulse_on_us: 2, pulse_energy_mj: 3,
        num_skim_passes: 4, flushing_mode: "submerged", application: "aerospace",
      });
      expect(r.recast.depth_um).toBeGreaterThan(0);
      expect(r.recast.after_skims_um).toBeLessThan(r.recast.depth_um);
      expect(r.safety_critical).toBe(true);
    });

    it("more skim passes reduce recast layer depth", async () => {
      const { edmMonitorSurfaceIntegrityEngine } = await import("../engines/EDMMonitorSurfaceIntegrityEngine.js");
      const few = edmMonitorSurfaceIntegrityEngine.assessSurfaceIntegrity({
        material: "inconel_718", pulse_on_us: 2, pulse_energy_mj: 3,
        num_skim_passes: 1, flushing_mode: "submerged", application: "aerospace",
      });
      const many = edmMonitorSurfaceIntegrityEngine.assessSurfaceIntegrity({
        material: "inconel_718", pulse_on_us: 2, pulse_energy_mj: 3,
        num_skim_passes: 5, flushing_mode: "submerged", application: "aerospace",
      });
      expect(many.recast.after_skims_um).toBeLessThan(few.recast.after_skims_um);
    });
  });

  describe("machine selection", () => {
    it("R12: 600×400mm part — some machines rejected for travel", async () => {
      const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
      const r = edmMaterialMachineWireEngine.selectMachine({
        part_x_mm: 600, part_y_mm: 400, part_z_mm: 80,
        part_weight_kg: 150, material: "D2", min_corner_radius_mm: 0.5,
      });
      expect(r.recommended_machines.length).toBeGreaterThan(0);
      expect(r.rejected_machines.length).toBeGreaterThan(0);
    });

    it("small part — most machines acceptable", async () => {
      const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
      const r = edmMaterialMachineWireEngine.selectMachine({
        part_x_mm: 50, part_y_mm: 50, part_z_mm: 20,
        part_weight_kg: 2, material: "steel", min_corner_radius_mm: 0.15,
      });
      expect(r.recommended_machines.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Physics Monotonicity & Consistency
// ═══════════════════════════════════════════════════════════════════════

describe("WEDM Regression — Physics Consistency", () => {

  describe("thickness monotonicity", () => {
    it("R13: thicker parts always cut slower", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const speeds = [10, 50, 100].map(t =>
        edmEngine.wireEDM({ workpiece_thickness_mm: t, material_iso_group: "H" }).cutting_speed.value
      );
      expect(speeds[0]).toBeGreaterThan(speeds[1]);
      expect(speeds[1]).toBeGreaterThan(speeds[2]);
    });

    it("speed ratio 10mm vs 100mm is 3-15x", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const thin = edmEngine.wireEDM({ workpiece_thickness_mm: 10, material_iso_group: "P" }).cutting_speed.value;
      const thick = edmEngine.wireEDM({ workpiece_thickness_mm: 100, material_iso_group: "P" }).cutting_speed.value;
      const ratio = thin / thick;
      expect(ratio).toBeGreaterThan(3);
      expect(ratio).toBeLessThan(15);
    });
  });

  describe("pass count vs surface finish", () => {
    it("R14: more passes always improve Ra", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const ras = [1, 3, 5].map(n =>
        edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "H", num_cuts: n }).predicted_ra.value
      );
      expect(ras[0]).toBeGreaterThan(ras[1]);
      expect(ras[1]).toBeGreaterThan(ras[2]);
    });

    it("single roughing pass Ra > 2.0µm", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const r = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "H", num_cuts: 1 });
      expect(r.predicted_ra.value).toBeGreaterThan(2.0);
    });
  });

  describe("ISO group speed ordering", () => {
    it("R15: ISO N (aluminum) faster than S (superalloy)", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const n = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "N" }).cutting_speed.value;
      const s = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "S" }).cutting_speed.value;
      expect(n).toBeGreaterThan(s);
      expect(n).toBeGreaterThan(5);
    });

    it("ISO H (hardened) slower than P (steel)", async () => {
      const { edmEngine } = await import("../engines/EDMEngine.js");
      const p = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "P" }).cutting_speed.value;
      const h = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "H" }).cutting_speed.value;
      expect(p).toBeGreaterThan(h);
    });
  });
});
