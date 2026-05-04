/**
 * Tests for MastercamMaterialPhysicsBridge
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP01
 */

import { describe, it, expect } from "vitest";
import { mastercamMaterialPhysicsBridge } from "../engines/MastercamMaterialPhysicsBridge.js";

describe("MastercamMaterialPhysicsBridge", () => {
  describe("calculateMillingPhysics", () => {
    it("should calculate full physics for steel milling", () => {
      const result = mastercamMaterialPhysicsBridge.calculateMillingPhysics({
        material_id: "mc-4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        helix_angle_deg: 30,
        rake_angle_deg: 10,
        spindle_rpm: 5000,
        feed_mm_min: 1000,
        axial_depth_mm: 5,
        radial_depth_mm: 6,
        cutting_mode: "climb",
        coolant: "flood"
      });

      expect(result).not.toBeNull();
      expect(result?.cutting_force_N).toBeGreaterThan(100);
      expect(result?.power_kW).toBeGreaterThan(0.1);
      expect(result?.tool_life_min).toBeGreaterThan(5);
      expect(result?.mrr_cm3_min).toBeGreaterThan(1);
      expect(result?.predicted_Ra_um).toBeGreaterThan(0);
    });

    it("should calculate lower forces for aluminum", () => {
      const steel = mastercamMaterialPhysicsBridge.calculateMillingPhysics({
        material_id: "mc-4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        helix_angle_deg: 30,
        rake_angle_deg: 10,
        spindle_rpm: 5000,
        feed_mm_min: 1000,
        axial_depth_mm: 5,
        radial_depth_mm: 6,
        cutting_mode: "climb",
        coolant: "flood"
      });

      const aluminum = mastercamMaterialPhysicsBridge.calculateMillingPhysics({
        material_id: "mc-6061",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        helix_angle_deg: 30,
        rake_angle_deg: 10,
        spindle_rpm: 5000,
        feed_mm_min: 1000,
        axial_depth_mm: 5,
        radial_depth_mm: 6,
        cutting_mode: "climb",
        coolant: "mist"
      });

      expect(aluminum?.cutting_force_N).toBeLessThan(steel?.cutting_force_N || 0);
      expect(aluminum?.power_kW).toBeLessThan(steel?.power_kW || 0);
    });

    it("should calculate higher forces for hardened steel", () => {
      const soft = mastercamMaterialPhysicsBridge.calculateMillingPhysics({
        material_id: "mc-4140",
        tool_diameter_mm: 10,
        tool_flutes: 4,
        helix_angle_deg: 35,
        rake_angle_deg: 8,
        spindle_rpm: 4000,
        feed_mm_min: 600,
        axial_depth_mm: 2,
        radial_depth_mm: 5,
        cutting_mode: "climb",
        coolant: "flood"
      });

      const hard = mastercamMaterialPhysicsBridge.calculateMillingPhysics({
        material_id: "mc-d2-hard",
        tool_diameter_mm: 10,
        tool_flutes: 4,
        helix_angle_deg: 35,
        rake_angle_deg: 8,
        spindle_rpm: 4000,
        feed_mm_min: 600,
        axial_depth_mm: 2,
        radial_depth_mm: 5,
        cutting_mode: "climb",
        coolant: "mist"
      });

      expect(hard?.cutting_force_N).toBeGreaterThan(soft?.cutting_force_N || 0);
    });

    it("should warn when speed exceeds recommended", () => {
      const result = mastercamMaterialPhysicsBridge.calculateMillingPhysics({
        material_id: "mc-ti6al4v",
        tool_diameter_mm: 10,
        tool_flutes: 4,
        helix_angle_deg: 30,
        rake_angle_deg: 10,
        spindle_rpm: 8000, // Too fast for titanium
        feed_mm_min: 800,
        axial_depth_mm: 3,
        radial_depth_mm: 5,
        cutting_mode: "climb",
        coolant: "high_pressure"
      });

      expect(result?.warnings.length).toBeGreaterThan(0);
    });

    it("should recommend correct coolant for material", () => {
      const result = mastercamMaterialPhysicsBridge.calculateMillingPhysics({
        material_id: "mc-inconel718",
        tool_diameter_mm: 8,
        tool_flutes: 4,
        helix_angle_deg: 30,
        rake_angle_deg: 10,
        spindle_rpm: 2000,
        feed_mm_min: 200,
        axial_depth_mm: 1,
        radial_depth_mm: 2,
        cutting_mode: "climb",
        coolant: "flood" // Should recommend high_pressure
      });

      expect(result?.recommendations.some(r => r.includes("high_pressure"))).toBe(true);
    });

    it("should assess deflection risk", () => {
      const result = mastercamMaterialPhysicsBridge.calculateMillingPhysics({
        material_id: "mc-4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        helix_angle_deg: 30,
        rake_angle_deg: 10,
        spindle_rpm: 5000,
        feed_mm_min: 2000,
        axial_depth_mm: 10, // Aggressive
        radial_depth_mm: 10,
        cutting_mode: "climb",
        coolant: "flood"
      });

      expect(["low", "medium", "high"]).toContain(result?.deflection_risk);
    });

    it("should assess chatter risk based on radial engagement", () => {
      const lowEngagement = mastercamMaterialPhysicsBridge.calculateMillingPhysics({
        material_id: "mc-4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        helix_angle_deg: 30,
        rake_angle_deg: 10,
        spindle_rpm: 5000,
        feed_mm_min: 1000,
        axial_depth_mm: 5,
        radial_depth_mm: 2, // Low engagement
        cutting_mode: "climb",
        coolant: "flood"
      });

      const highEngagement = mastercamMaterialPhysicsBridge.calculateMillingPhysics({
        material_id: "mc-4140",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        helix_angle_deg: 30,
        rake_angle_deg: 10,
        spindle_rpm: 5000,
        feed_mm_min: 1000,
        axial_depth_mm: 5,
        radial_depth_mm: 10, // High engagement
        cutting_mode: "climb",
        coolant: "flood"
      });

      expect(lowEngagement?.chatter_risk).toBe("low");
      expect(["medium", "high"]).toContain(highEngagement?.chatter_risk);
    });

    it("should return null for unknown material", () => {
      const result = mastercamMaterialPhysicsBridge.calculateMillingPhysics({
        material_id: "unknown-material",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        helix_angle_deg: 30,
        rake_angle_deg: 10,
        spindle_rpm: 5000,
        feed_mm_min: 1000,
        axial_depth_mm: 5,
        radial_depth_mm: 6,
        cutting_mode: "climb",
        coolant: "flood"
      });

      expect(result).toBeNull();
    });
  });

  describe("calculateTurningPhysics", () => {
    it("should calculate turning physics for steel", () => {
      const result = mastercamMaterialPhysicsBridge.calculateTurningPhysics({
        material_id: "mc-4140",
        insert_nose_radius_mm: 0.8,
        insert_rake_angle_deg: 6,
        spindle_rpm: 1200,
        feed_mm_rev: 0.2,
        depth_of_cut_mm: 2,
        cutting_speed_m_min: 200,
        coolant: "flood"
      });

      expect(result).not.toBeNull();
      expect(result?.cutting_force_N).toBeGreaterThan(100);
      expect(result?.tool_life_min).toBeGreaterThan(5);
      expect(result?.theoretical_Ra_um).toBeGreaterThan(0);
    });

    it("should calculate lower forces for aluminum turning", () => {
      const steel = mastercamMaterialPhysicsBridge.calculateTurningPhysics({
        material_id: "mc-4140",
        insert_nose_radius_mm: 0.8,
        insert_rake_angle_deg: 6,
        spindle_rpm: 1200,
        feed_mm_rev: 0.2,
        depth_of_cut_mm: 2,
        cutting_speed_m_min: 200,
        coolant: "flood"
      });

      const aluminum = mastercamMaterialPhysicsBridge.calculateTurningPhysics({
        material_id: "mc-6061",
        insert_nose_radius_mm: 0.8,
        insert_rake_angle_deg: 6,
        spindle_rpm: 3000,
        feed_mm_rev: 0.2,
        depth_of_cut_mm: 2,
        cutting_speed_m_min: 400,
        coolant: "mist"
      });

      expect(aluminum?.cutting_force_N).toBeLessThan(steel?.cutting_force_N || 0);
    });
  });

  describe("getMaterialPhysicsSummary", () => {
    it("should return quick summary for steel", () => {
      const summary = mastercamMaterialPhysicsBridge.getMaterialPhysicsSummary("mc-4140");
      expect(summary).not.toBeNull();
      expect(summary?.iso_group).toBe("P");
      expect(summary?.kc1_1).toBe(1800);
      expect(summary?.max_speed_m_min).toBeGreaterThan(300);
    });

    it("should return null for unknown material", () => {
      const summary = mastercamMaterialPhysicsBridge.getMaterialPhysicsSummary("unknown");
      expect(summary).toBeNull();
    });
  });

  describe("compareMaterials", () => {
    it("should compare multiple materials", () => {
      const comparison = mastercamMaterialPhysicsBridge.compareMaterials([
        "mc-4140",
        "mc-6061",
        "mc-ti6al4v"
      ]);

      expect(comparison.length).toBe(3);

      const steel = comparison.find(c => c.material.includes("4140"));
      const aluminum = comparison.find(c => c.material.includes("6061"));
      const titanium = comparison.find(c => c.material.includes("Ti-6Al-4V"));

      expect(aluminum?.relative_force).toBeLessThan(steel?.relative_force || 0);
      expect(titanium?.relative_force).toBeGreaterThan(steel?.relative_force || 0);
    });

    it("should skip unknown materials", () => {
      const comparison = mastercamMaterialPhysicsBridge.compareMaterials([
        "mc-4140",
        "unknown",
        "mc-6061"
      ]);

      expect(comparison.length).toBe(2);
    });
  });
});

describe("MastercamMaterialPhysicsBridge — dispatcher wiring (camDispatcher.ts)", () => {
  const MC_PHYS_ACTIONS = [
    "cam_mastercam_physics_calculate_milling",
    "cam_mastercam_physics_calculate_turning",
    "cam_mastercam_physics_get_summary",
    "cam_mastercam_physics_compare_materials",
  ] as const;

  const ACTION_COUNT_EXPECTED = 4;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 4 cam_mastercam_physics_* enum entries", async () => {
    const src = await readDispatcher();
    expect(MC_PHYS_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of MC_PHYS_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares the _mcMatPhys singleton", async () => {
    const src = await readDispatcher();
    expect(src).toMatch(/_mcMatPhys\s*:\s*any/);
  });

  it("registers an mcMatPhys case in the lazy getter switch", async () => {
    const src = await readDispatcher();
    const re =
      /case\s+"mcMatPhys"\s*:\s*return\s+_mcMatPhys\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/MastercamMaterialPhysicsBridge\.js"\s*\)\)\.mastercamMaterialPhysicsBridge/;
    expect(re.test(src)).toBe(true);
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of MC_PHYS_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body resolves the engine via getEngine(\"mcMatPhys\")", async () => {
    const src = await readDispatcher();
    for (const action of MC_PHYS_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?getEngine\\("mcMatPhys"\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("calculate_milling case routes to calculateMillingPhysics() with pass-through params and reports found", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_physics_calculate_milling"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("calculateMillingPhysics");
    expect(body).toContain("params as never");
    expect(body).toContain("found");
  });

  it("calculate_turning case routes to calculateTurningPhysics() with pass-through params", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_physics_calculate_turning"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("calculateTurningPhysics");
    expect(body).toContain("params as never");
    expect(body).toContain("found");
  });

  it("get_summary case accepts material_id|materialId fallback", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_physics_get_summary"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getMaterialPhysicsSummary");
    expect(body).toMatch(/params\.material_id\s*\?\?\s*params\.materialId/);
  });

  it("compare_materials case Array.isArray-guards both material_ids and materialIds; defaults to []", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_physics_compare_materials"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("compareMaterials");
    expect(body).toContain("Array.isArray(params.material_ids)");
    expect(body).toContain("Array.isArray(params.materialIds)");
    expect(body).toContain(".map(String)");
    expect(body).toContain("count");
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of MC_PHYS_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("dispatcher cases inline ZERO physics constants — Kienzle/Taylor sourced through engine only", async () => {
    const src = await readDispatcher();
    for (const action of MC_PHYS_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:[\\s\\S]*?break;`);
      const body = src.match(re)?.[0] ?? "";
      expect(body).not.toMatch(/kc1_1\s*=\s*\d/);
      expect(body).not.toMatch(/kc1\.1\s*=\s*\d/);
      expect(body).not.toMatch(/taylorC\s*=\s*\d/);
    }
  });
});
