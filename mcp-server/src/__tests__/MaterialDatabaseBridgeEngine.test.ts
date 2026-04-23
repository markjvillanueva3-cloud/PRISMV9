/**
 * MaterialDatabaseBridgeEngine Tests — Phase 0.23 U-UTL9
 */

import { describe, it, expect, beforeEach } from "vitest";
import { materialDatabaseBridgeEngine } from "../engines/MaterialDatabaseBridgeEngine.js";

describe("MaterialDatabaseBridgeEngine", () => {
  beforeEach(() => {
    materialDatabaseBridgeEngine.reset();
  });

  it("initializes with seeded materials", async () => {
    const stats = await materialDatabaseBridgeEngine.getStats();
    expect(stats.totalMaterials).toBeGreaterThan(0);
  });

  it("queries materials by type", async () => {
    const materials = await materialDatabaseBridgeEngine.query({ type: "steel" });
    expect(materials.every(m => m.type === "steel")).toBe(true);
  });

  it("queries materials by grade", async () => {
    const materials = await materialDatabaseBridgeEngine.query({ grade: "6061" });
    expect(materials.every(m => m.grade.includes("6061"))).toBe(true);
  });

  it("queries materials by min machinability", async () => {
    const materials = await materialDatabaseBridgeEngine.query({ minMachinability: 50 });
    expect(materials.every(m => m.machinability >= 50)).toBe(true);
  });

  it("gets material by id", async () => {
    const materials = await materialDatabaseBridgeEngine.query({ limit: 1 });
    if (materials.length > 0) {
      const material = await materialDatabaseBridgeEngine.getMaterial(materials[0].id);
      expect(material).not.toBeNull();
      expect(material?.id).toBe(materials[0].id);
    }
  });

  it("returns null for unknown material id", async () => {
    const material = await materialDatabaseBridgeEngine.getMaterial("nonexistent");
    expect(material).toBeNull();
  });

  it("gets materials by type shortcut", async () => {
    const materials = await materialDatabaseBridgeEngine.getByType("aluminum");
    expect(materials.every(m => m.type === "aluminum")).toBe(true);
  });

  it("respects query limit", async () => {
    const materials = await materialDatabaseBridgeEngine.query({ limit: 5 });
    expect(materials.length).toBeLessThanOrEqual(5);
  });

  it("stats include type breakdown", async () => {
    const stats = await materialDatabaseBridgeEngine.getStats();
    expect(stats.byType).toBeDefined();
    expect(typeof stats.byType).toBe("object");
  });

  it("stats include source breakdown", async () => {
    const stats = await materialDatabaseBridgeEngine.getStats();
    expect(stats.bySource).toBeDefined();
    expect(typeof stats.bySource).toBe("object");
  });

  it("stats include average machinability", async () => {
    const stats = await materialDatabaseBridgeEngine.getStats();
    expect(typeof stats.averageMachinability).toBe("number");
  });

  it("reset clears state", async () => {
    await materialDatabaseBridgeEngine.getStats();
    materialDatabaseBridgeEngine.reset();
    const stats = await materialDatabaseBridgeEngine.getStats();
    expect(stats.totalMaterials).toBeGreaterThan(0);
  });
});
