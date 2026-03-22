/**
 * BOX Data Wave 2 Tests — AlarmDiagnostics, ShopToolLibrary, ManufacturerCatalogIndex, RawToolingNormalizer
 */

import { describe, it, expect } from "vitest";

describe("AlarmDiagnosticsEngine", () => {
  it("should import and instantiate", async () => {
    const { alarmDiagnosticsEngine } = await import("../engines/AlarmDiagnosticsEngine.js");
    expect(alarmDiagnosticsEngine).toBeDefined();
  });

  it("should get summary stats", async () => {
    const { alarmDiagnosticsEngine } = await import("../engines/AlarmDiagnosticsEngine.js");
    const summary = alarmDiagnosticsEngine.getSummary();
    expect(summary).toBeDefined();
    // Should have alarm data loaded
    expect(typeof summary).toBe("object");
  });

  it("should search alarms", async () => {
    const { alarmDiagnosticsEngine } = await import("../engines/AlarmDiagnosticsEngine.js");
    const results = alarmDiagnosticsEngine.searchAlarms("power");
    expect(Array.isArray(results)).toBe(true);
  });

  it("should list controllers", async () => {
    const { alarmDiagnosticsEngine } = await import("../engines/AlarmDiagnosticsEngine.js");
    const controllers = alarmDiagnosticsEngine.listControllers();
    expect(Array.isArray(controllers)).toBe(true);
  });
});

describe("ShopToolLibraryEngine", () => {
  it("should import and instantiate", async () => {
    const { shopToolLibraryEngine } = await import("../engines/ShopToolLibraryEngine.js");
    expect(shopToolLibraryEngine).toBeDefined();
  });

  it("should load all tools", async () => {
    const { shopToolLibraryEngine } = await import("../engines/ShopToolLibraryEngine.js");
    const tools = shopToolLibraryEngine.loadAll();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    // All should be shop proven
    for (const t of tools) {
      expect(t.shopProven).toBe(true);
    }
  });

  it("should get summary", async () => {
    const { shopToolLibraryEngine } = await import("../engines/ShopToolLibraryEngine.js");
    const summary = shopToolLibraryEngine.getSummary();
    expect(summary).toBeDefined();
    expect(typeof summary).toBe("object");
  });

  it("should search by category", async () => {
    const { shopToolLibraryEngine } = await import("../engines/ShopToolLibraryEngine.js");
    const boring = shopToolLibraryEngine.getByCategory("boring_finish");
    expect(Array.isArray(boring)).toBe(true);
  });
});

describe("ManufacturerCatalogIndexEngine", () => {
  it("should import and instantiate", async () => {
    const { manufacturerCatalogIndexEngine } = await import("../engines/ManufacturerCatalogIndexEngine.js");
    expect(manufacturerCatalogIndexEngine).toBeDefined();
  });

  it("should return catalogs", async () => {
    const { manufacturerCatalogIndexEngine } = await import("../engines/ManufacturerCatalogIndexEngine.js");
    const catalogs = manufacturerCatalogIndexEngine.getCatalogs();
    expect(Array.isArray(catalogs)).toBe(true);
    expect(catalogs.length).toBeGreaterThan(20);
  });

  it("should return workholding catalogs", async () => {
    const { manufacturerCatalogIndexEngine } = await import("../engines/ManufacturerCatalogIndexEngine.js");
    const wh = manufacturerCatalogIndexEngine.getWorkholding();
    expect(Array.isArray(wh)).toBe(true);
    expect(wh.length).toBe(10); // 10 workholding manufacturers
  });

  it("should return raw tooling entries", async () => {
    const { manufacturerCatalogIndexEngine } = await import("../engines/ManufacturerCatalogIndexEngine.js");
    const raw = manufacturerCatalogIndexEngine.getRawTooling();
    expect(Array.isArray(raw)).toBe(true);
    expect(raw.length).toBe(10); // 10 raw tooling JS files
  });

  it("should report gaps", async () => {
    const { manufacturerCatalogIndexEngine } = await import("../engines/ManufacturerCatalogIndexEngine.js");
    const gaps = manufacturerCatalogIndexEngine.getGaps();
    expect(gaps).toBeDefined();
  });

  it("should return summary", async () => {
    const { manufacturerCatalogIndexEngine } = await import("../engines/ManufacturerCatalogIndexEngine.js");
    const summary = manufacturerCatalogIndexEngine.getSummary();
    expect(summary).toBeDefined();
  });

  it("should search by manufacturer", async () => {
    const { manufacturerCatalogIndexEngine } = await import("../engines/ManufacturerCatalogIndexEngine.js");
    const results = manufacturerCatalogIndexEngine.searchByManufacturer("Kennametal");
    expect(results).toBeDefined();
  });
});

describe("RawToolingNormalizerEngine", () => {
  it("should import and instantiate", async () => {
    const { rawToolingNormalizerEngine } = await import("../engines/RawToolingNormalizerEngine.js");
    expect(rawToolingNormalizerEngine).toBeDefined();
  });

  it("should return summary", async () => {
    const { rawToolingNormalizerEngine } = await import("../engines/RawToolingNormalizerEngine.js");
    const summary = rawToolingNormalizerEngine.getSummary();
    expect(summary).toBeDefined();
  });
});

describe("OkumaParametricProgramEngine — convertToHardcode", () => {
  it("should convert a simple macro to hardcode", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const macro = `O1001
V1 = 2.0
V2 = 1.5
V3 = [V1 - V2]
G50 S2500
G0 X[V1] Z0.1
G1 X[V2] F0.012
IF [V3 GT 0.1] GOTO N100
G1 Z-1.0
N100 G1 Z-2.0
M30`;
    const result = okumaParametricProgramEngine.convertToHardcode(macro);
    expect(result.gcode).toContain("G50");
    expect(result.gcode).toContain("M30");
    expect(result.gcode).not.toContain("V1");
    expect(result.gcode).not.toContain("V2");
    expect(result.variables[1]).toBe(2.0);
    expect(result.variables[2]).toBe(1.5);
    expect(result.variables[3]).toBeCloseTo(0.5);
    // V3=0.5 > 0.1 is true, so should jump to N100 (skip Z-1.0)
    expect(result.gcode).toContain("2.");  // X2.0
    expect(result.gcode).toContain("1.5"); // X1.5
  });
});
