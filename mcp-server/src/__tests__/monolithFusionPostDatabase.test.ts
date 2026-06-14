/**
 * MonolithFusionPostDatabaseEngine round-trip tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-FUSION-POST-LOADER.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithFusionPostDatabaseEngine,
  monolithFusionPostDatabaseEngine,
} from "../engines/MonolithFusionPostDatabaseEngine.js";

const engine = monolithFusionPostDatabaseEngine;

describe("MonolithFusionPostDatabaseEngine — data integrity", () => {
  it("version is '8.9.400' per monolith source", () => {
    expect(engine.version).toBe("8.9.400");
  });

  it("ships exactly 11 vendor catalogs", () => {
    const v = engine.listVendors();
    expect(v).toHaveLength(11);
    expect(v.map((c) => c.id).sort()).toEqual([
      "brother", "dmgMori", "doosan", "fanuc", "haas",
      "heidenhain", "hurco", "makino", "mazak", "okuma", "siemens",
    ]);
  });

  it("totalPostCount sums to 153 across 11 vendors", () => {
    // 53 + 48 + 11 + 7 + 8 + 3 + 4 + 6 + 6 + 4 + 3
    expect(engine.totalPostCount()).toBe(153);
  });

  it("haas catalog: 53 posts + Haas NGC controller + 10 model families + 4 capabilities", () => {
    const c = engine.getVendor("haas");
    expect(c?.postCount).toBe(53);
    expect(c?.vendor).toBe("Haas Automation");
    expect(c?.controller).toBe("Haas NGC / Pre-NGC");
    expect(c?.models).toHaveLength(10);
    expect(c?.capabilities).toEqual(["milling", "turning", "5-axis", "probing"]);
  });

  it("haas g187Smoothing feature preserves modes verbatim (Rough/Medium/Finish)", () => {
    const c = engine.getVendor("haas");
    expect(c?.features.g187Smoothing).toEqual({
      code: "G187", modes: ["Rough", "Medium", "Finish"], desc: "Surface smoothing mode",
    });
  });

  it("haas probing macros: O9810/O9811/O9812 (Renishaw)", () => {
    const c = engine.getVendor("haas");
    expect(c?.features.probing?.macros).toEqual(["O9810", "O9811", "O9812"]);
  });

  it("mazak: 48 posts + Mazatrol SmoothX/SmoothG + sub-spindle M83/M84", () => {
    const c = engine.getVendor("mazak");
    expect(c?.postCount).toBe(48);
    expect(c?.controller).toBe("Mazatrol SmoothX/SmoothG");
    expect(c?.features.subSpindle?.mCodes).toEqual(["M83", "M84"]);
    expect(c?.features.integrexModes?.codes).toEqual(["G112", "G113"]);
  });

  it("siemens: SINUMERIK controller + 7 models including SINUMERIK ONE + TRAORI feature", () => {
    const c = engine.getVendor("siemens");
    expect(c?.controller).toBe("SINUMERIK");
    expect(c?.models).toContain("SINUMERIK ONE");
    expect(c?.models).toHaveLength(7);
    expect(c?.features.traori?.code).toBe("TRAORI");
  });

  it("fanuc: 4 features all carrying G-codes (G05.1 Q1, G5.1, G08 P1, G05.1 Q3)", () => {
    const c = engine.getVendor("fanuc");
    expect(c?.features.aiContour?.code).toBe("G05.1 Q1");
    expect(c?.features.nanoSmoothing?.code).toBe("G5.1");
    expect(c?.features.hpcc?.code).toBe("G08 P1");
    expect(c?.features.aicc2?.code).toBe("G05.1 Q3");
  });

  it("heidenhain: 8 posts + TNC controller + M128 TCPM + DCM/AFC features", () => {
    const c = engine.getVendor("heidenhain");
    expect(c?.postCount).toBe(8);
    expect(c?.features.tcpm?.code).toBe("M128");
    expect(c?.features.dcm?.code).toBe("DCM");
    expect(c?.features.afc?.code).toBe("AFC");
  });

  it("okuma: G370/G371 collision avoidance + G06.2 Super-NURBS", () => {
    const c = engine.getVendor("okuma");
    expect(c?.features.collisionAvoidance?.code).toBe("G370/G371");
    expect(c?.features.superNurbs?.code).toBe("G06.2");
  });

  it("brother: 16000 RPM spindle + 0.9s tool change", () => {
    const c = engine.getVendor("brother");
    expect(c?.features.rapidSpindle?.maxRPM).toBe(16000);
    expect(c?.features.fastToolChange?.time).toBe(0.9);
  });

  it("makino: G05.1 Q2 SGI.5 feature preserved", () => {
    const c = engine.getVendor("makino");
    expect(c?.features.sgi5?.code).toBe("G05.1 Q2");
  });
});

describe("MonolithFusionPostDatabaseEngine — get* fail-soft (R12)", () => {
  it("getVendor unknown id returns null", () => {
    expect(engine.getVendor("UNKNOWN_VENDOR")).toBe(null);
  });

  it("getVendor empty/whitespace returns null", () => {
    expect(engine.getVendor("")).toBe(null);
    expect(engine.getVendor("   ")).toBe(null);
  });

  it("listByCapability empty/whitespace returns []", () => {
    expect(engine.listByCapability("")).toEqual([]);
    expect(engine.listByCapability("   ")).toEqual([]);
  });

  it("findByModel empty/whitespace returns []", () => {
    expect(engine.findByModel("")).toEqual([]);
    expect(engine.findByModel("   ")).toEqual([]);
  });

  it("search invalid limit returns []", () => {
    expect(engine.search("haas", 0)).toEqual([]);
    expect(engine.search("haas", -1)).toEqual([]);
    expect(engine.search("haas", 3.5)).toEqual([]);
  });
});

describe("MonolithFusionPostDatabaseEngine — filters", () => {
  it("listByCapability('5-axis') returns the 5-axis-capable vendors", () => {
    // Per source: haas, mazak, siemens, heidenhain, okuma, dmgMori, makino — 7 vendors
    const hits = engine.listByCapability("5-axis");
    expect(hits.length).toBe(7);
    expect(hits.map((c) => c.id).sort()).toEqual([
      "dmgMori", "haas", "heidenhain", "makino", "mazak", "okuma", "siemens",
    ]);
  });

  it("listByCapability('turning') returns the turning-capable vendors (8)", () => {
    // haas, mazak, siemens, fanuc, heidenhain, okuma, dmgMori, hurco, doosan = 9
    const hits = engine.listByCapability("turning");
    expect(hits.length).toBe(9);
  });

  it("listByCapability('robotics') matches only fanuc", () => {
    const hits = engine.listByCapability("robotics");
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe("fanuc");
  });

  it("findByModel('VF') matches haas (case-insensitive substring on model array)", () => {
    const hits = engine.findByModel("VF");
    expect(hits.some((c) => c.id === "haas")).toBe(true);
  });

  it("findByModel('Integrex') matches mazak only", () => {
    const hits = engine.findByModel("Integrex");
    const ids = hits.map((c) => c.id);
    expect(ids).toContain("mazak");
  });

  it("findByModel partial-match: 'speedio' matches brother (case-insensitive)", () => {
    const hits = engine.findByModel("speedio");
    expect(hits.some((c) => c.id === "brother")).toBe(true);
  });
});

describe("MonolithFusionPostDatabaseEngine — search", () => {
  it("search 'sinumerik' matches siemens via controller field", () => {
    const hits = engine.search("sinumerik");
    expect(hits.some((c) => c.id === "siemens")).toBe(true);
  });

  it("search 'mazatrol' matches mazak via controller field", () => {
    const hits = engine.search("mazatrol");
    expect(hits.some((c) => c.id === "mazak")).toBe(true);
  });

  it("search 'milling' matches multiple vendors via capability", () => {
    const hits = engine.search("milling");
    expect(hits.length).toBeGreaterThan(5);
  });

  it("search respects limit cap", () => {
    const hits = engine.search("milling", 3);
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it("search empty returns []", () => {
    expect(engine.search("")).toEqual([]);
    expect(engine.search("   ")).toEqual([]);
  });

  it("search no-match returns []", () => {
    expect(engine.search("ZZZ_NONEXISTENT_CONTROLLER")).toEqual([]);
  });
});

describe("MonolithFusionPostDatabaseEngine — stats + immutability", () => {
  it("stats reports 11 vendors + 153 total posts + correct version", () => {
    const s = engine.stats();
    expect(s.vendorCount).toBe(11);
    expect(s.totalPostCount).toBe(153);
    expect(s.version).toBe("8.9.400");
    expect(s.byCapability).toHaveProperty("milling");
    expect(s.byCapability).toHaveProperty("5-axis");
  });

  it("fresh instance returns same data", () => {
    const fresh = new MonolithFusionPostDatabaseEngine();
    expect(fresh.totalPostCount()).toBe(153);
    expect(fresh.listVendors()).toHaveLength(11);
  });

  it("listVendors immutability: mutating returned array doesn't affect store", () => {
    const a = engine.listVendors();
    a.pop();
    expect(engine.listVendors()).toHaveLength(11);
  });

  it("getVendor immutability: mutating returned models doesn't affect store", () => {
    const c = engine.getVendor("haas");
    if (c) c.models.pop();
    expect(engine.getVendor("haas")?.models).toHaveLength(10);
  });
});
