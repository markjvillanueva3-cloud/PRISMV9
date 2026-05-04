/**
 * Tests for MastercamMaterialBridgeEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP01
 */

import { describe, it, expect } from "vitest";
import { mastercamMaterialBridgeEngine } from "../engines/MastercamMaterialBridgeEngine.js";

describe("MastercamMaterialBridgeEngine", () => {
  describe("findMaterial", () => {
    it("should find material by ID", () => {
      const mat = mastercamMaterialBridgeEngine.findMaterial("mc-4140");
      expect(mat).not.toBeNull();
      expect(mat?.name).toContain("4140");
    });

    it("should find material by name substring", () => {
      const mat = mastercamMaterialBridgeEngine.findMaterial("inconel");
      expect(mat).not.toBeNull();
      expect(mat?.iso_group).toBe("S");
    });

    it("should find material by mastercam class", () => {
      const mat = mastercamMaterialBridgeEngine.findMaterial("austenitic");
      expect(mat).not.toBeNull();
      expect(mat?.iso_group).toBe("M");
    });

    it("should return null for unknown material", () => {
      const mat = mastercamMaterialBridgeEngine.findMaterial("unobtanium");
      expect(mat).toBeNull();
    });
  });

  describe("getPhysicsProfile", () => {
    it("should return full physics profile for steel", () => {
      const profile = mastercamMaterialBridgeEngine.getPhysicsProfile("mc-4140");
      expect(profile).not.toBeNull();
      expect(profile?.kienzle.kc1_1).toBe(1800);
      expect(profile?.kienzle.mc).toBeCloseTo(0.25, 2);
      expect(profile?.taylor.C).toBe(350);
      expect(profile?.taylor.n).toBeCloseTo(0.25, 2);
    });

    it("should return correct profile for aluminum", () => {
      const profile = mastercamMaterialBridgeEngine.getPhysicsProfile("mc-6061");
      expect(profile?.material.iso_group).toBe("N");
      expect(profile?.kienzle.kc1_1).toBe(700);
      expect(profile?.machinability_rating).toBe(1.0);
    });

    it("should return correct profile for titanium", () => {
      const profile = mastercamMaterialBridgeEngine.getPhysicsProfile("mc-ti6al4v");
      expect(profile?.material.iso_group).toBe("S");
      expect(profile?.kienzle.kc1_1).toBe(2800);
      expect(profile?.recommended_coolant).toBe("high_pressure");
    });

    it("should return correct profile for hardened steel", () => {
      const profile = mastercamMaterialBridgeEngine.getPhysicsProfile("mc-d2-hard");
      expect(profile?.material.iso_group).toBe("H");
      expect(profile?.kienzle.kc1_1).toBe(3200);
      expect(profile?.machinability_rating).toBe(0.15);
    });
  });

  describe("mapToISO", () => {
    it("should map steel to ISO P", () => {
      expect(mastercamMaterialBridgeEngine.mapToISO("Steel - Low Carbon")).toBe("P");
    });

    it("should map stainless to ISO M", () => {
      expect(mastercamMaterialBridgeEngine.mapToISO("Stainless Steel - Austenitic")).toBe("M");
    });

    it("should map cast iron to ISO K", () => {
      expect(mastercamMaterialBridgeEngine.mapToISO("Cast Iron - Gray")).toBe("K");
    });

    it("should map aluminum to ISO N", () => {
      expect(mastercamMaterialBridgeEngine.mapToISO("Aluminum - Wrought")).toBe("N");
    });

    it("should map titanium to ISO S", () => {
      expect(mastercamMaterialBridgeEngine.mapToISO("Titanium - Alpha-Beta")).toBe("S");
    });

    it("should map hardened tool steel to ISO H", () => {
      expect(mastercamMaterialBridgeEngine.mapToISO("Tool Steel - Hardened")).toBe("H");
    });
  });

  describe("calculateCuttingForce", () => {
    it("should calculate cutting force for steel", () => {
      const result = mastercamMaterialBridgeEngine.calculateCuttingForce("mc-4140", 5, 0.15);
      expect(result).not.toBeNull();
      expect(result?.force_N).toBeGreaterThan(500);
      expect(result?.specific_force_N_mm2).toBeGreaterThan(1500);
    });

    it("should calculate lower force for aluminum", () => {
      const steel = mastercamMaterialBridgeEngine.calculateCuttingForce("mc-4140", 5, 0.15);
      const aluminum = mastercamMaterialBridgeEngine.calculateCuttingForce("mc-6061", 5, 0.15);
      expect(aluminum?.force_N).toBeLessThan(steel?.force_N || 0);
    });

    it("should calculate higher force for hardened steel", () => {
      const soft = mastercamMaterialBridgeEngine.calculateCuttingForce("mc-4140", 5, 0.15);
      const hard = mastercamMaterialBridgeEngine.calculateCuttingForce("mc-d2-hard", 5, 0.15);
      expect(hard?.force_N).toBeGreaterThan(soft?.force_N || 0);
    });
  });

  describe("estimateToolLife", () => {
    it("should estimate tool life for steel at moderate speed", () => {
      const result = mastercamMaterialBridgeEngine.estimateToolLife("mc-4140", 150);
      expect(result).not.toBeNull();
      expect(result?.life_min).toBeGreaterThan(10);
    });

    it("should show reduced life at higher speeds", () => {
      const slow = mastercamMaterialBridgeEngine.estimateToolLife("mc-4140", 150);
      const fast = mastercamMaterialBridgeEngine.estimateToolLife("mc-4140", 300);
      expect(fast?.life_min).toBeLessThan(slow?.life_min || 0);
    });

    it("should show very short life for superalloys", () => {
      const steel = mastercamMaterialBridgeEngine.estimateToolLife("mc-4140", 100);
      const inconel = mastercamMaterialBridgeEngine.estimateToolLife("mc-inconel718", 50);
      expect(inconel?.life_min).toBeLessThan(steel?.life_min || 0);
    });
  });

  describe("listMaterials", () => {
    it("should list all materials", () => {
      const materials = mastercamMaterialBridgeEngine.listMaterials();
      expect(materials.length).toBeGreaterThan(10);
    });
  });

  describe("listByISO", () => {
    it("should filter materials by ISO group", () => {
      const steels = mastercamMaterialBridgeEngine.listByISO("P");
      expect(steels.length).toBeGreaterThan(2);
      expect(steels.every(m => m.iso_group === "P")).toBe(true);
    });
  });

  describe("getStats", () => {
    it("should return material statistics", () => {
      const stats = mastercamMaterialBridgeEngine.getStats();
      expect(stats.total_materials).toBeGreaterThan(10);
      expect(stats.by_iso_group.P).toBeGreaterThan(0);
      expect(stats.by_iso_group.N).toBeGreaterThan(0);
    });
  });
});

describe("MastercamMaterialBridgeEngine — dispatcher wiring (camDispatcher.ts)", () => {
  const MC_MAT_ACTIONS = [
    "cam_mastercam_material_find",
    "cam_mastercam_material_get_physics",
    "cam_mastercam_material_map_to_iso",
    "cam_mastercam_material_calculate_force",
    "cam_mastercam_material_estimate_tool_life",
    "cam_mastercam_material_list",
    "cam_mastercam_material_list_by_iso",
    "cam_mastercam_material_get_stats",
  ] as const;

  const ACTION_COUNT_EXPECTED = 8;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 8 cam_mastercam_material_* enum entries", async () => {
    const src = await readDispatcher();
    expect(MC_MAT_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of MC_MAT_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares the _mcMatBridge singleton", async () => {
    const src = await readDispatcher();
    expect(src).toMatch(/_mcMatBridge\s*:\s*any/);
  });

  it("registers an mcMatBridge case in the lazy getter switch", async () => {
    const src = await readDispatcher();
    const re =
      /case\s+"mcMatBridge"\s*:\s*return\s+_mcMatBridge\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/MastercamMaterialBridgeEngine\.js"\s*\)\)\.mastercamMaterialBridgeEngine/;
    expect(re.test(src)).toBe(true);
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of MC_MAT_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body resolves the engine via getEngine(\"mcMatBridge\")", async () => {
    const src = await readDispatcher();
    for (const action of MC_MAT_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?getEngine\\("mcMatBridge"\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("find case routes to findMaterial() with query|material fallback and reports found", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_material_find"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("findMaterial");
    expect(body).toMatch(/params\.query\s*\?\?\s*params\.material/);
    expect(body).toContain("found");
  });

  it("get_physics case routes to getPhysicsProfile() with material_id|materialId fallback", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_material_get_physics"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getPhysicsProfile");
    expect(body).toMatch(/params\.material_id\s*\?\?\s*params\.materialId/);
  });

  it("map_to_iso case accepts mastercam_class|mastercamClass|class triple fallback", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_material_map_to_iso"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("mapToISO");
    expect(body).toMatch(/params\.mastercam_class/);
    expect(body).toContain("mastercamClass");
    expect(body).toMatch(/params\.class/);
  });

  it("calculate_force case Number.isFinite-guards ap and fz, clamps to >= 0, accepts triple fallback names", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_material_calculate_force"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("calculateCuttingForce");
    expect(body).toContain("Number.isFinite");
    expect(body).toContain("Math.max");
    expect(body).toMatch(/params\.axial_depth_mm/);
    expect(body).toMatch(/params\.feed_per_tooth_mm/);
    expect(body).toMatch(/params\.ap_mm/);
    expect(body).toMatch(/params\.fz_mm/);
  });

  it("estimate_tool_life case rejects vc <= 0 (returns null without engine call) and accepts vc fallbacks", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_material_estimate_tool_life"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("estimateToolLife");
    expect(body).toContain("Number.isFinite");
    expect(body).toMatch(/vcRaw\s*>\s*0/);
    expect(body).toMatch(/params\.cutting_speed_m_min/);
    expect(body).toMatch(/params\.vc_m_min/);
  });

  it("list_by_iso case defaults iso to \"P\" and accepts triple fallback names", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_material_list_by_iso"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("listByISO");
    expect(body).toMatch(/params\.iso\s*\?\?\s*params\.iso_group/);
    expect(body).toContain("isoGroup");
    expect(body).toContain('"P"');
  });

  it("get_stats case routes to getStats() and spreads roll-up", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_material_get_stats"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getStats()");
    expect(body).toMatch(/\.\.\.stats/);
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of MC_MAT_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("dispatcher imports physics ONLY through the engine — no inline Kienzle/Taylor constants in cases", async () => {
    const src = await readDispatcher();
    // Sanity check: case bodies must not contain literal kc1.1 = ... or Taylor C/n inline values
    for (const action of ["cam_mastercam_material_calculate_force", "cam_mastercam_material_estimate_tool_life"]) {
      const re = new RegExp(`case\\s+"${action}"\\s*:[\\s\\S]*?break;`);
      const body = src.match(re)?.[0] ?? "";
      // No inline Kienzle constants (kc1.1 numeric literals like 1800, 2100, 2800)
      expect(body).not.toMatch(/kc1_1\s*=\s*\d/);
      expect(body).not.toMatch(/kc1\.1\s*=\s*\d/);
      // No inline Taylor constants
      expect(body).not.toMatch(/taylorC\s*=\s*\d/);
    }
  });
});
