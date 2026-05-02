/**
 * Fusion360ControllerCatalogEngine.test.ts
 *
 * Coverage:
 *   - happy path: 16 controller families, audit OK
 *   - per-family lookup: fanuc / haas / siemens / heidenhain return concrete
 *     vendor + variant counts + capability strings
 *   - search across id/name/manufacturer/postFile (case-insensitive)
 *   - listByDialect / listVariantsByAxisCount filters
 *   - schema rejection on bad inputs
 *   - audit invariant
 *   - dispatcher round-trip
 */

import { describe, it, expect } from "vitest";
import {
  Fusion360ControllerCatalogEngine,
  ControllerFamilySchema,
  ControllerVariantSchema,
  type ControllerFamily,
} from "../engines/Fusion360ControllerCatalogEngine.js";

function mustFind(id: string): ControllerFamily {
  const f = Fusion360ControllerCatalogEngine.lookup(id);
  if (f === null) throw new Error(`expected family ${id}, got null`);
  return f;
}

// ── 1. Catalog shape ───────────────────────────────────────────────────────

describe("Fusion360ControllerCatalogEngine — catalog shape", () => {
  it("exposes exactly 16 controller families", () => {
    expect(Fusion360ControllerCatalogEngine.count()).toBe(16);
    expect(Fusion360ControllerCatalogEngine.EXPECTED_TOTAL).toBe(16);
    expect(Fusion360ControllerCatalogEngine.list().length).toBe(16);
  });

  it("audit invariant: catalog passes self-audit", () => {
    const audit = Fusion360ControllerCatalogEngine.auditCatalog();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("every family has ≥1 variant + ≥1 cycle support entry + ≥1 tribal tip", () => {
    const families = Fusion360ControllerCatalogEngine.list();
    expect(families.length).toBe(16);
    for (const f of families) {
      expect(f.variants.length).toBeGreaterThan(0);
      expect(f.cycleSupport.length).toBeGreaterThan(0);
      expect(f.tribalTips.length).toBeGreaterThan(0);
    }
  });

  it("every family id is snake_case", () => {
    for (const f of Fusion360ControllerCatalogEngine.list()) {
      expect(f.id).toMatch(/^[a-z0-9_]+$/);
    }
  });
});

// ── 2. Per-family lookup ───────────────────────────────────────────────────

describe("Fusion360ControllerCatalogEngine — per-family lookup", () => {
  it("fanuc family lists 4 variants including 5-axis and turning posts", () => {
    const f = mustFind("fanuc");
    expect(f.name).toBe("Fanuc");
    expect(f.manufacturer).toBe("FANUC Corporation");
    expect(f.variants.length).toBe(4);
    const postFiles = f.variants.map(v => v.postFile);
    expect(postFiles).toContain("fanuc.cps");
    expect(postFiles).toContain("fanuc 5axis.cps");
    expect(postFiles).toContain("fanuc turning.cps");
  });

  it("haas family lists NGC, 4-axis, 5-axis (UMC), and turning variants", () => {
    const f = mustFind("haas");
    expect(f.variants.length).toBe(4);
    const descs = f.variants.map(v => v.description);
    expect(descs.some(d => d.includes("UMC"))).toBe(true);
    expect(descs.some(d => d.includes("ST"))).toBe(true);
  });

  it("siemens family uses CYCLE81-89 (Sinumerik dialect, NOT FANUC G-codes)", () => {
    const f = mustFind("siemens");
    expect(f.gCodeDialect).toBe("siemens");
    expect(f.cycleSupport).toContain("CYCLE81");
    expect(f.cycleSupport).toContain("CYCLE83");
    expect(f.cycleSupport).toContain("CYCLE95");
  });

  it("heidenhain family supports TCPM (M128) for 5-axis", () => {
    const f = mustFind("heidenhain");
    const has5Axis = f.variants.find(v => v.axisCount === 5);
    if (has5Axis === undefined) throw new Error("heidenhain 5-axis variant missing");
    expect(has5Axis.capabilities).toContain("TCPM_M128");
    expect(has5Axis.capabilities).toContain("5axis_simultaneous");
  });

  it("brother family is high-RPM tap-center oriented (Speedio)", () => {
    const f = mustFind("brother");
    expect(f.variants.some(v => v.compatibleMachines.some(m => m.includes("Speedio")))).toBe(true);
  });

  it("lookup returns null for unknown family id", () => {
    expect(Fusion360ControllerCatalogEngine.lookup("nope")).toBeNull();
  });

  it("mustLookup throws for unknown family id (failure mode)", () => {
    expect(() => Fusion360ControllerCatalogEngine.mustLookup("nope")).toThrow(/unknown family id/);
  });
});

// ── 3. Search ─────────────────────────────────────────────────────────────

describe("Fusion360ControllerCatalogEngine — search", () => {
  it("search returns empty array on empty query", () => {
    expect(Fusion360ControllerCatalogEngine.search("")).toEqual([]);
    expect(Fusion360ControllerCatalogEngine.search("   ")).toEqual([]);
  });

  it("search matches manufacturer (case-insensitive: 'YAMAZAKI' → mazak)", () => {
    const results = Fusion360ControllerCatalogEngine.search("YAMAZAKI");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("mazak_mazatrol");
  });

  it("search matches postFile substring ('5axis' → multiple families)", () => {
    const results = Fusion360ControllerCatalogEngine.search("5axis");
    expect(results.length).toBeGreaterThanOrEqual(7);
    for (const f of results) {
      const has5Axis = f.variants.some(v => v.postFile.toLowerCase().includes("5axis"));
      expect(has5Axis).toBe(true);
    }
  });

  it("search matches family id ('hurco' → 1 hit)", () => {
    const results = Fusion360ControllerCatalogEngine.search("hurco");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(f => f.id === "hurco")).toBe(true);
  });

  it("search returns empty for unknown term", () => {
    expect(Fusion360ControllerCatalogEngine.search("kuka_robot")).toEqual([]);
  });
});

// ── 4. Filter helpers ─────────────────────────────────────────────────────

describe("Fusion360ControllerCatalogEngine — filter helpers", () => {
  it("listByDialect('siemens') returns only the Siemens family", () => {
    const result = Fusion360ControllerCatalogEngine.listByDialect("siemens");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("siemens");
  });

  it("listByDialect is case-insensitive", () => {
    const upper = Fusion360ControllerCatalogEngine.listByDialect("FANUC");
    const lower = Fusion360ControllerCatalogEngine.listByDialect("fanuc");
    expect(upper.length).toBe(lower.length);
    expect(upper.length).toBeGreaterThanOrEqual(1);
  });

  it("listByDialect returns empty array on empty query", () => {
    expect(Fusion360ControllerCatalogEngine.listByDialect("")).toEqual([]);
  });

  it("listVariantsByAxisCount(5) returns the 5-axis variants across multiple families", () => {
    const fiveAxis = Fusion360ControllerCatalogEngine.listVariantsByAxisCount(5);
    expect(fiveAxis.length).toBeGreaterThanOrEqual(8);
    for (const { variant } of fiveAxis) {
      expect(variant.axisCount).toBe(5);
    }
    const familyIds = new Set(fiveAxis.map(x => x.family.id));
    expect(familyIds.has("fanuc")).toBe(true);
    expect(familyIds.has("haas")).toBe(true);
    expect(familyIds.has("heidenhain")).toBe(true);
  });

  it("listVariantsByAxisCount(3) returns 3-axis variants", () => {
    const threeAxis = Fusion360ControllerCatalogEngine.listVariantsByAxisCount(3);
    expect(threeAxis.length).toBeGreaterThan(0);
    for (const { variant } of threeAxis) expect(variant.axisCount).toBe(3);
  });
});

// ── 5. Stats ──────────────────────────────────────────────────────────────

describe("Fusion360ControllerCatalogEngine — stats", () => {
  it("stats() reports total_families + total_variants > 16 + dialect distribution", () => {
    const stats = Fusion360ControllerCatalogEngine.stats();
    expect(stats.total_families).toBe(16);
    expect(stats.total_variants).toBeGreaterThanOrEqual(20);
    expect(stats.by_dialect.siemens).toBe(1);
    expect(stats.by_dialect.heidenhain).toBe(1);
    expect(stats.axis_count_distribution[5]).toBeGreaterThanOrEqual(8);
  });
});

// ── 6. Schema validation ──────────────────────────────────────────────────

const baseVariant = {
  postFile: "test.cps",
  description: "Test variant",
  axisCount: 3,
  capabilities: [],
  compatibleMachines: [],
};

const baseFamily = {
  id: "test_id",
  name: "Test",
  manufacturer: "Test",
  variants: [baseVariant],
  cycleSupport: ["G81"],
  gCodeDialect: "test",
  tribalTips: ["x"],
};

describe("Fusion360ControllerCatalogEngine — schema validation", () => {
  it("ControllerFamilySchema rejects non-snake_case id", () => {
    expect(() => ControllerFamilySchema.parse({ ...baseFamily, id: "TestId" })).toThrow();
  });

  it("ControllerFamilySchema rejects empty name", () => {
    expect(() => ControllerFamilySchema.parse({ ...baseFamily, name: "" })).toThrow();
  });

  it("ControllerFamilySchema rejects empty variants array", () => {
    expect(() => ControllerFamilySchema.parse({ ...baseFamily, variants: [] })).toThrow();
  });

  it("ControllerFamilySchema rejects empty cycleSupport", () => {
    expect(() => ControllerFamilySchema.parse({ ...baseFamily, cycleSupport: [] })).toThrow();
  });

  it("ControllerVariantSchema rejects axisCount = 1 (out of [2..9] range)", () => {
    expect(() => ControllerVariantSchema.parse({ ...baseVariant, axisCount: 1 })).toThrow();
  });

  it("ControllerVariantSchema rejects axisCount = 10 (out of range)", () => {
    expect(() => ControllerVariantSchema.parse({ ...baseVariant, axisCount: 10 })).toThrow();
  });
});

// ── 7. Frozen catalog mutation guard ─────────────────────────────────────

describe("Fusion360ControllerCatalogEngine — immutability", () => {
  it("returned families are frozen", () => {
    const f = mustFind("fanuc");
    expect(Object.isFrozen(f)).toBe(true);
    expect(Object.isFrozen(f.variants)).toBe(true);
    expect(Object.isFrozen(f.cycleSupport)).toBe(true);
  });

  it("list() returns a defensive copy (popping does not affect catalog)", () => {
    const a = Fusion360ControllerCatalogEngine.list();
    expect(a.length).toBe(16);
    a.pop();
    expect(Fusion360ControllerCatalogEngine.list().length).toBe(16);
  });
});

// ── 8. Dispatcher round-trip ─────────────────────────────────────────────

describe("Fusion360ControllerCatalogEngine — dispatcher round-trip", () => {
  it("ACTIONS array exposes the controller catalog actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_fusion360_controller_list");
    expect(mod.ACTIONS).toContain("cam_fusion360_controller_lookup");
    expect(mod.ACTIONS).toContain("cam_fusion360_controller_search");
    expect(mod.ACTIONS).toContain("cam_fusion360_controller_dialect");
    expect(mod.ACTIONS).toContain("cam_fusion360_controller_stats");
    expect(mod.ACTIONS).toContain("cam_fusion360_controller_audit");
  });

  it("engine reachable via the same dynamic-import path the dispatcher uses", async () => {
    const mod = await import("../engines/Fusion360ControllerCatalogEngine.js");
    expect(mod.Fusion360ControllerCatalogEngine.count()).toBe(16);
    const audit = mod.Fusion360ControllerCatalogEngine.auditCatalog();
    expect(audit.ok).toBe(true);
  });
});
