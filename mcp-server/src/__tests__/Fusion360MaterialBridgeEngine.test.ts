/**
 * Fusion360MaterialBridgeEngine.test.ts
 *
 * Coverage:
 *   - happy path: 24 materials, audit OK
 *   - per-ISO-group distribution: every group has ≥1 representative
 *   - kienzleFor uses CANONICAL_KIENZLE values (no inline duplication)
 *   - failure modes: unknown id throws on mustLookup, returns null on lookup
 *   - schema rejection on bad inputs
 *   - dispatcher round-trip
 */

import { describe, it, expect } from "vitest";
import {
  Fusion360MaterialBridgeEngine,
  Fusion360MaterialSchema,
  ISOGroupSchema,
  KienzleCoefficientsSchema,
  type Fusion360Material,
  type ISOGroup,
} from "../engines/Fusion360MaterialBridgeEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

const ALL_ISOS: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];

function mustFind(id: string): Fusion360Material {
  const m = Fusion360MaterialBridgeEngine.lookup(id);
  if (m === null) throw new Error(`expected material ${id}, got null`);
  return m;
}

// ── 1. Catalog shape ───────────────────────────────────────────────────────

describe("Fusion360MaterialBridgeEngine — catalog shape", () => {
  it("exposes exactly 24 materials", () => {
    expect(Fusion360MaterialBridgeEngine.count()).toBe(24);
    expect(Fusion360MaterialBridgeEngine.EXPECTED_TOTAL).toBe(24);
    expect(Fusion360MaterialBridgeEngine.list().length).toBe(24);
  });

  it("audit invariant: catalog passes self-audit", () => {
    const audit = Fusion360MaterialBridgeEngine.auditCatalog();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("every ISO group has ≥1 representative material", () => {
    const dist = Fusion360MaterialBridgeEngine.countByISOGroup();
    for (const iso of ALL_ISOS) {
      expect(dist[iso]).toBeGreaterThan(0);
    }
  });

  it("every material id is snake_case", () => {
    for (const m of Fusion360MaterialBridgeEngine.list()) {
      expect(m.id).toMatch(/^[a-z0-9_]+$/);
    }
  });
});

// ── 2. Per-material lookup ──────────────────────────────────────────────────

describe("Fusion360MaterialBridgeEngine — per-material lookup", () => {
  it("aluminum_6061_t6 has expected concrete properties", () => {
    const m = mustFind("aluminum_6061_t6");
    expect(m.iso_group).toBe("N");
    expect(m.density_kg_m3).toBe(2700);
    expect(m.tensile_strength_mpa).toBe(310);
  });

  it("inconel_718 is in S group with high hardness", () => {
    const m = mustFind("inconel_718");
    expect(m.iso_group).toBe("S");
    expect(m.hardness_hrc).toBe(38);
    expect(m.tensile_strength_mpa).toBeGreaterThan(1000);
  });

  it("ti_6al_4v is in S group with low density", () => {
    const m = mustFind("ti_6al_4v");
    expect(m.iso_group).toBe("S");
    expect(m.density_kg_m3).toBe(4430);
  });

  it("hardened D2 is ISO H (post-hardening regime)", () => {
    const m = mustFind("tool_steel_d2_hardened");
    expect(m.iso_group).toBe("H");
    expect(m.hardness_hrc).toBe(60);
  });

  it("annealed D2 is ISO P (pre-hardening regime)", () => {
    const m = mustFind("tool_steel_d2_annealed");
    expect(m.iso_group).toBe("P");
  });

  it("lookup returns null for unknown id", () => {
    expect(Fusion360MaterialBridgeEngine.lookup("nope")).toBeNull();
  });

  it("mustLookup throws for unknown id (failure mode)", () => {
    expect(() => Fusion360MaterialBridgeEngine.mustLookup("nope")).toThrow(/unknown material id/);
  });
});

// ── 3. ISO group filtering ────────────────────────────────────────────────

describe("Fusion360MaterialBridgeEngine — ISO group filtering", () => {
  it("listByISOGroup('S') returns superalloys (Inconel + Ti)", () => {
    const sgroup = Fusion360MaterialBridgeEngine.listByISOGroup("S");
    expect(sgroup.length).toBeGreaterThanOrEqual(3);
    const ids = sgroup.map(m => m.id);
    expect(ids).toContain("inconel_718");
    expect(ids).toContain("inconel_625");
    expect(ids).toContain("ti_6al_4v");
  });

  it("listByISOGroup('K') returns cast iron only", () => {
    const kgroup = Fusion360MaterialBridgeEngine.listByISOGroup("K");
    expect(kgroup.length).toBeGreaterThanOrEqual(2);
    for (const m of kgroup) expect(m.iso_group).toBe("K");
  });

  it("listByISOGroup('H') returns hardened steel only", () => {
    const hgroup = Fusion360MaterialBridgeEngine.listByISOGroup("H");
    expect(hgroup.length).toBeGreaterThanOrEqual(1);
    for (const m of hgroup) expect(m.iso_group).toBe("H");
  });
});

// ── 4. Kienzle bridging ──────────────────────────────────────────────────

describe("Fusion360MaterialBridgeEngine — Kienzle bridging", () => {
  it("kienzleFor('aluminum_6061_t6') returns N-group canonical values", () => {
    const k = Fusion360MaterialBridgeEngine.kienzleFor("aluminum_6061_t6");
    expect(k.kc1_1).toBe(CANONICAL_KIENZLE.N.kc1_1);
    expect(k.mc).toBe(CANONICAL_KIENZLE.N.mc);
    expect(k.source).toContain("CANONICAL_KIENZLE[N]");
  });

  it("kienzleFor('steel_1018_crs') returns P-group canonical values", () => {
    const k = Fusion360MaterialBridgeEngine.kienzleFor("steel_1018_crs");
    expect(k.kc1_1).toBe(CANONICAL_KIENZLE.P.kc1_1);
    expect(k.mc).toBe(CANONICAL_KIENZLE.P.mc);
  });

  it("kienzleFor('inconel_718') returns S-group canonical values (kc1.1 = 2800)", () => {
    const k = Fusion360MaterialBridgeEngine.kienzleFor("inconel_718");
    expect(k.kc1_1).toBe(2800);
    expect(k.kc1_1).toBe(CANONICAL_KIENZLE.S.kc1_1);
  });

  it("kienzleFor return values pass the schema", () => {
    const k = Fusion360MaterialBridgeEngine.kienzleFor("aluminum_6061_t6");
    expect(() => KienzleCoefficientsSchema.parse(k)).not.toThrow();
  });

  it("kienzleFor throws on unknown material id", () => {
    expect(() => Fusion360MaterialBridgeEngine.kienzleFor("unobtanium")).toThrow(/unknown material id/);
  });
});

// ── 5. Search ─────────────────────────────────────────────────────────────

describe("Fusion360MaterialBridgeEngine — search", () => {
  it("search returns empty array on empty query", () => {
    expect(Fusion360MaterialBridgeEngine.search("")).toEqual([]);
  });

  it("search matches display_name case-insensitively (INCONEL → 2 hits)", () => {
    const results = Fusion360MaterialBridgeEngine.search("INCONEL");
    expect(results.length).toBe(2);
    for (const m of results) expect(m.display_name.toLowerCase().includes("inconel")).toBe(true);
  });

  it("search matches fusion_class ('Tool' → tool steels)", () => {
    const results = Fusion360MaterialBridgeEngine.search("Tool");
    expect(results.length).toBeGreaterThanOrEqual(3);
    for (const m of results) {
      const text = (m.id + " " + m.display_name + " " + m.fusion_class).toLowerCase();
      expect(text).toContain("tool");
    }
  });

  it("search returns empty for unknown term", () => {
    expect(Fusion360MaterialBridgeEngine.search("vibranium")).toEqual([]);
  });
});

// ── 6. Schema validation ──────────────────────────────────────────────────

describe("Fusion360MaterialBridgeEngine — schema validation", () => {
  it("Fusion360MaterialSchema rejects non-snake_case id", () => {
    expect(() => Fusion360MaterialSchema.parse({
      id: "BadId", display_name: "x", fusion_class: "x", iso_group: "P",
      density_kg_m3: 1, tensile_strength_mpa: 1, yield_strength_mpa: 1, elongation_pct: 1,
    })).toThrow();
  });

  it("Fusion360MaterialSchema rejects negative density", () => {
    expect(() => Fusion360MaterialSchema.parse({
      id: "ok_id", display_name: "x", fusion_class: "x", iso_group: "P",
      density_kg_m3: -1, tensile_strength_mpa: 1, yield_strength_mpa: 1, elongation_pct: 1,
    })).toThrow();
  });

  it("ISOGroupSchema rejects unknown group", () => {
    const bad: unknown = "X";
    expect(() => ISOGroupSchema.parse(bad)).toThrow();
  });

  it("KienzleCoefficientsSchema rejects negative kc1_1", () => {
    expect(() => KienzleCoefficientsSchema.parse({ kc1_1: -1, mc: 0.25, source: "x" })).toThrow();
  });
});

// ── 7. Frozen catalog mutation guard ─────────────────────────────────────

describe("Fusion360MaterialBridgeEngine — immutability", () => {
  it("returned materials are frozen", () => {
    const m = mustFind("aluminum_6061_t6");
    expect(Object.isFrozen(m)).toBe(true);
  });

  it("list() returns a defensive copy", () => {
    const a = Fusion360MaterialBridgeEngine.list();
    expect(a.length).toBe(24);
    a.pop();
    expect(Fusion360MaterialBridgeEngine.list().length).toBe(24);
  });
});

// ── 8. Dispatcher round-trip ─────────────────────────────────────────────

describe("Fusion360MaterialBridgeEngine — dispatcher round-trip", () => {
  it("ACTIONS array exposes the material bridge actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_fusion360_material_list");
    expect(mod.ACTIONS).toContain("cam_fusion360_material_lookup");
    expect(mod.ACTIONS).toContain("cam_fusion360_material_search");
    expect(mod.ACTIONS).toContain("cam_fusion360_material_by_iso");
    expect(mod.ACTIONS).toContain("cam_fusion360_material_kienzle");
    expect(mod.ACTIONS).toContain("cam_fusion360_material_audit");
  });

  it("engine reachable via the dynamic-import path", async () => {
    const mod = await import("../engines/Fusion360MaterialBridgeEngine.js");
    expect(mod.Fusion360MaterialBridgeEngine.count()).toBe(24);
  });
});
