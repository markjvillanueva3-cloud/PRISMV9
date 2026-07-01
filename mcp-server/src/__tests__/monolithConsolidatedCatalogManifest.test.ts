/**
 * MonolithConsolidatedCatalogManifestEngine round-trip tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-CONSOLIDATED-CATALOG-MANIFEST.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithConsolidatedCatalogManifestEngine,
  monolithConsolidatedCatalogManifestEngine,
} from "../engines/MonolithConsolidatedCatalogManifestEngine.js";

const engine = monolithConsolidatedCatalogManifestEngine;

describe("MonolithConsolidatedCatalogManifestEngine — metadata", () => {
  it("preserves all 7 monolith metadata fields verbatim", () => {
    expect(engine.getMetadata()).toEqual({
      version: "1.0.0",
      generated: "2026-01-17",
      build: "v8.65.032",
      sourceFiles: 8,
      totalSourceLines: 8823,
      totalPdfCatalogs: 44,
      totalPdfSize: "3.1 GB",
    });
  });
});

describe("MonolithConsolidatedCatalogManifestEngine — manufacturer index", () => {
  it("5 categories: 4 toolHolders + 1 workholding + 14 cuttingTools + 2 latheTooling + 3 drilling = 24 entries", () => {
    const idx = engine.getManufacturersByCategory();
    expect(idx.toolHolders).toHaveLength(4);
    expect(idx.workholding).toHaveLength(1);
    expect(idx.cuttingTools).toHaveLength(14);
    expect(idx.latheTooling).toHaveLength(2);
    expect(idx.drilling).toHaveLength(3);
    const total = idx.toolHolders.length + idx.workholding.length
                + idx.cuttingTools.length + idx.latheTooling.length
                + idx.drilling.length;
    expect(total).toBe(24);
  });

  it("toolHolders: exactly the 4 holder vendors (Guhring/BIG DAISHOWA/REGO-FIX/Haimer)", () => {
    expect(engine.getManufacturersByCategory().toolHolders).toEqual([
      "Guhring", "BIG DAISHOWA", "REGO-FIX", "Haimer",
    ]);
  });

  it("workholding: only Orange Vise (matches FinalCatalogGateway manifest)", () => {
    expect(engine.getManufacturersByCategory().workholding).toEqual(["Orange Vise"]);
  });

  it("cuttingTools: 14 vendors including OSG/Kennametal/Sandvik/ISCAR/SECO/Zeni", () => {
    const ct = engine.getManufacturersByCategory().cuttingTools;
    expect(ct).toContain("OSG");
    expect(ct).toContain("Kennametal");
    expect(ct).toContain("Sandvik");
    expect(ct).toContain("ISCAR");
    expect(ct).toContain("SECO");
    expect(ct).toContain("Zeni");
  });

  it("latheTooling: Global CNC + ISCAR CAMFIX (2)", () => {
    expect(engine.getManufacturersByCategory().latheTooling).toEqual([
      "Global CNC", "ISCAR CAMFIX",
    ]);
  });

  it("drilling: Allied Machine + OSG + Kennametal (3, with overlap into cuttingTools)", () => {
    expect(engine.getManufacturersByCategory().drilling).toEqual([
      "Allied Machine", "OSG", "Kennametal",
    ]);
  });

  it("listAllManufacturers dedupes: 22 unique names (OSG + Kennametal counted once each)", () => {
    // 24 raw - 2 dups (OSG appears in cuttingTools+drilling; Kennametal same)
    expect(engine.listAllManufacturers()).toHaveLength(22);
  });

  it("listAllManufacturers is sorted", () => {
    const a = engine.listAllManufacturers();
    const sorted = [...a].sort();
    expect(a).toEqual(sorted);
  });

  it("getCategoriesFor('OSG') returns cuttingTools + drilling (cross-category vendor)", () => {
    expect(engine.getCategoriesFor("OSG")).toEqual(["cuttingTools", "drilling"]);
  });

  it("getCategoriesFor('Kennametal') returns cuttingTools + drilling", () => {
    expect(engine.getCategoriesFor("Kennametal")).toEqual(["cuttingTools", "drilling"]);
  });

  it("getCategoriesFor('Guhring') returns only toolHolders", () => {
    expect(engine.getCategoriesFor("Guhring")).toEqual(["toolHolders"]);
  });

  it("getCategoriesFor unknown returns []", () => {
    expect(engine.getCategoriesFor("UNKNOWN")).toEqual([]);
    expect(engine.getCategoriesFor("")).toEqual([]);
    expect(engine.getCategoriesFor("   ")).toEqual([]);
  });
});

describe("MonolithConsolidatedCatalogManifestEngine — Guhring hydraulic chucks", () => {
  it("ships exactly 10 size records (6/8/10/12/14/16/18/20/25/32 mm clamping)", () => {
    const chucks = engine.listGuhringHydraulicChucks();
    expect(chucks).toHaveLength(10);
    expect(chucks.map((c) => c.clampingDia)).toEqual([6, 8, 10, 12, 14, 16, 18, 20, 25, 32]);
  });

  it("Δ6mm chuck: 16 Nm torque, 225 N radial force, 50000 RPM, h6 shank", () => {
    expect(engine.getGuhringChuckByClampingDia(6)).toEqual({
      clampingDia: 6, maxRpm: 50000, maxTorque: 16,
      minInsertionDepth: 27, maxRadialForce: 225, shankTolerance: "h6",
    });
  });

  it("Δ32mm chuck: 770 Nm torque (largest), 6500 N radial (largest), 25000 RPM (downshifted)", () => {
    expect(engine.getGuhringChuckByClampingDia(32)).toEqual({
      clampingDia: 32, maxRpm: 25000, maxTorque: 770,
      minInsertionDepth: 51, maxRadialForce: 6500, shankTolerance: "h6",
    });
  });

  it("RPM downshift: ≤20mm = 50000 RPM, ≥25mm = 25000 RPM (catalog boundary)", () => {
    const chucks = engine.listGuhringHydraulicChucks();
    const small = chucks.filter((c) => c.clampingDia <= 20);
    const large = chucks.filter((c) => c.clampingDia >= 25);
    expect(small.every((c) => c.maxRpm === 50000)).toBe(true);
    expect(large.every((c) => c.maxRpm === 25000)).toBe(true);
  });

  it("torque scales monotonically with clamping diameter (physics invariant)", () => {
    const chucks = engine.listGuhringHydraulicChucks();
    for (let i = 0; i < chucks.length - 1; i++) {
      expect(chucks[i].maxTorque).toBeLessThan(chucks[i + 1].maxTorque);
    }
  });

  it("radial force scales monotonically with clamping diameter", () => {
    const chucks = engine.listGuhringHydraulicChucks();
    for (let i = 0; i < chucks.length - 1; i++) {
      expect(chucks[i].maxRadialForce).toBeLessThan(chucks[i + 1].maxRadialForce);
    }
  });

  it("all 10 chucks require h6 shank tolerance (catalog-wide invariant)", () => {
    const chucks = engine.listGuhringHydraulicChucks();
    expect(chucks.every((c) => c.shankTolerance === "h6")).toBe(true);
  });

  it("getGuhringChuckByClampingDia unknown diameter returns null", () => {
    expect(engine.getGuhringChuckByClampingDia(7)).toBe(null);
    expect(engine.getGuhringChuckByClampingDia(100)).toBe(null);
  });

  it("getGuhringChuckByClampingDia NaN/Infinity returns null (R12)", () => {
    expect(engine.getGuhringChuckByClampingDia(NaN)).toBe(null);
    expect(engine.getGuhringChuckByClampingDia(Infinity)).toBe(null);
    expect(engine.getGuhringChuckByClampingDia(-Infinity)).toBe(null);
  });
});

describe("MonolithConsolidatedCatalogManifestEngine — stats + immutability", () => {
  it("stats reports correct counts across all dimensions", () => {
    const s = engine.stats();
    expect(s.version).toBe("1.0.0");
    expect(s.build).toBe("v8.65.032");
    expect(s.sourceFiles).toBe(8);
    expect(s.totalSourceLines).toBe(8823);
    expect(s.totalPdfCatalogs).toBe(44);
    expect(s.totalPdfSize).toBe("3.1 GB");
    expect(s.manufacturerCountByCategory.toolHolders).toBe(4);
    expect(s.manufacturerCountByCategory.cuttingTools).toBe(14);
    expect(s.uniqueManufacturerCount).toBe(22);
    expect(s.guhringChuckCount).toBe(10);
  });

  it("fresh instance returns identical stats", () => {
    const fresh = new MonolithConsolidatedCatalogManifestEngine();
    expect(fresh.stats()).toEqual(engine.stats());
  });

  it("getMetadata immutability: mutating returned doesn't affect store", () => {
    const m = engine.getMetadata();
    m.totalSourceLines = 999;
    expect(engine.getMetadata().totalSourceLines).toBe(8823);
  });

  it("getManufacturersByCategory immutability: mutating returned arrays doesn't affect store", () => {
    const idx = engine.getManufacturersByCategory();
    idx.cuttingTools.pop();
    expect(engine.getManufacturersByCategory().cuttingTools).toHaveLength(14);
  });

  it("listGuhringHydraulicChucks immutability: mutating doesn't affect store", () => {
    const chucks = engine.listGuhringHydraulicChucks();
    chucks.pop();
    expect(engine.listGuhringHydraulicChucks()).toHaveLength(10);
  });
});
