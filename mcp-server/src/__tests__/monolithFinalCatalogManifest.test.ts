/**
 * MonolithFinalCatalogManifestEngine round-trip tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-FINAL-CATALOG-MANIFEST.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithFinalCatalogManifestEngine,
  monolithFinalCatalogManifestEngine,
} from "../engines/MonolithFinalCatalogManifestEngine.js";

const engine = monolithFinalCatalogManifestEngine;

describe("MonolithFinalCatalogManifestEngine — metadata", () => {
  it("preserves all 5 monolith metadata fields verbatim", () => {
    expect(engine.getMetadata()).toEqual({
      version: "1.0.0",
      generated: "2026-01-17",
      description: "Complete manufacturer catalog integration from 44 PDFs",
      totalManufacturers: 25,
      totalLines: 9500,
    });
  });
});

describe("MonolithFinalCatalogManifestEngine — extended Guhring hydraulic chucks", () => {
  it("ships exactly 10 extended chuck records (same diameters as consolidated)", () => {
    expect(engine.listGuhringExtendedChucks()).toHaveLength(10);
  });

  it("Δ6mm extended: adds operatingTemp + maxCoolantPressure + maxAdjustment fields", () => {
    expect(engine.getGuhringExtendedChuckByClampingDia(6)).toEqual({
      clampingDia: 6, maxRpm: 50000, maxTorque: 16,
      minInsertionDepth: 27, maxAdjustment: 10, maxRadialForce: 225,
      operatingTemp: "20-50°C", maxCoolantPressure: 80, shankTolerance: "h6",
    });
  });

  it("Δ32mm extended: 770 Nm torque, 6500 N radial, 25000 RPM, full extended fields", () => {
    expect(engine.getGuhringExtendedChuckByClampingDia(32)).toEqual({
      clampingDia: 32, maxRpm: 25000, maxTorque: 770,
      minInsertionDepth: 51, maxAdjustment: 10, maxRadialForce: 6500,
      operatingTemp: "20-50°C", maxCoolantPressure: 80, shankTolerance: "h6",
    });
  });

  it("ALL 10 chucks share operatingTemp = '20-50°C' (catalog invariant)", () => {
    const chucks = engine.listGuhringExtendedChucks();
    expect(chucks.every((c) => c.operatingTemp === "20-50°C")).toBe(true);
  });

  it("ALL 10 chucks share maxCoolantPressure = 80 bar (catalog invariant)", () => {
    const chucks = engine.listGuhringExtendedChucks();
    expect(chucks.every((c) => c.maxCoolantPressure === 80)).toBe(true);
  });

  it("ALL 10 chucks share maxAdjustment = 10 mm (catalog invariant)", () => {
    const chucks = engine.listGuhringExtendedChucks();
    expect(chucks.every((c) => c.maxAdjustment === 10)).toBe(true);
  });

  it("ALL 10 chucks share shankTolerance = h6 (cross-catalog invariant)", () => {
    const chucks = engine.listGuhringExtendedChucks();
    expect(chucks.every((c) => c.shankTolerance === "h6")).toBe(true);
  });

  it("RPM boundary identical to consolidated (50000 for ≤20mm, 25000 for ≥25mm)", () => {
    const chucks = engine.listGuhringExtendedChucks();
    const small = chucks.filter((c) => c.clampingDia <= 20);
    const large = chucks.filter((c) => c.clampingDia >= 25);
    expect(small.every((c) => c.maxRpm === 50000)).toBe(true);
    expect(large.every((c) => c.maxRpm === 25000)).toBe(true);
  });

  it("getGuhringExtendedChuckByClampingDia unknown returns null", () => {
    expect(engine.getGuhringExtendedChuckByClampingDia(7)).toBe(null);
    expect(engine.getGuhringExtendedChuckByClampingDia(100)).toBe(null);
  });

  it("getGuhringExtendedChuckByClampingDia NaN/Infinity returns null (R12)", () => {
    expect(engine.getGuhringExtendedChuckByClampingDia(NaN)).toBe(null);
    expect(engine.getGuhringExtendedChuckByClampingDia(Infinity)).toBe(null);
  });
});

describe("MonolithFinalCatalogManifestEngine — CAT series 4216 metadata", () => {
  it("series 4216: G6.3 balance @ 15000 RPM, ANSI/ASME B 5.50 taper", () => {
    expect(engine.getCatSeries4216Metadata()).toEqual({
      seriesNumber: "4216",
      balanceQuality: "G6.3 at 15,000 RPM",
      taperStandard: "ANSI/ASME B 5.50",
      coolant: "Through center and flange",
      retentionKnob: { CAT40: "5/8-11", CAT50: "1-8" },
    });
  });

  it("CAT40 retention knob: 5/8-11 thread", () => {
    expect(engine.getCatSeries4216Metadata().retentionKnob.CAT40).toBe("5/8-11");
  });

  it("CAT50 retention knob: 1-8 thread (coarser)", () => {
    expect(engine.getCatSeries4216Metadata().retentionKnob.CAT50).toBe("1-8");
  });
});

describe("MonolithFinalCatalogManifestEngine — hydraulic chuck features", () => {
  it("ships exactly 4 verbatim features per monolith", () => {
    const f = engine.listGuhringHydraulicChuckFeatures();
    expect(f).toHaveLength(4);
  });

  it("includes the canonical Guhring features verbatim", () => {
    const f = engine.listGuhringHydraulicChuckFeatures();
    expect(f).toEqual([
      "Max 3μm concentricity deviation",
      "Fast and simple tool change",
      "Vibration cushioning effect",
      "Optimal tool life and surface quality",
    ]);
  });
});

describe("MonolithFinalCatalogManifestEngine — stats + immutability", () => {
  it("stats reports correct counts", () => {
    const s = engine.stats();
    expect(s.version).toBe("1.0.0");
    expect(s.totalManufacturers).toBe(25);
    expect(s.totalLines).toBe(9500);
    expect(s.extendedChuckCount).toBe(10);
    expect(s.catSeriesNumber).toBe("4216");
    expect(s.featureCount).toBe(4);
  });

  it("fresh instance returns identical data", () => {
    const fresh = new MonolithFinalCatalogManifestEngine();
    expect(fresh.stats()).toEqual(engine.stats());
  });

  it("getMetadata immutability: mutating returned doesn't affect store", () => {
    const m = engine.getMetadata();
    m.totalLines = 999;
    expect(engine.getMetadata().totalLines).toBe(9500);
  });

  it("listGuhringExtendedChucks immutability: mutating doesn't affect store", () => {
    const a = engine.listGuhringExtendedChucks();
    a.pop();
    expect(engine.listGuhringExtendedChucks()).toHaveLength(10);
  });

  it("getCatSeries4216Metadata immutability: mutating retentionKnob doesn't affect store", () => {
    const m = engine.getCatSeries4216Metadata();
    m.retentionKnob.CAT40 = "BOGUS";
    expect(engine.getCatSeries4216Metadata().retentionKnob.CAT40).toBe("5/8-11");
  });
});
