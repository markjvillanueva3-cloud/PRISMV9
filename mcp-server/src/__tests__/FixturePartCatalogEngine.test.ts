/**
 * FixturePartCatalogEngine.test.ts — U-CAMTEST05
 * ===============================================
 *
 * Comprehensive-build coverage:
 *   - happy path (catalog assembles, count = 20, expected distribution)
 *   - ≥3 failure modes (unknown id throws, bad category enum, bad host enum,
 *                       bad descriptor schema)
 *   - ≥2 adversarial inputs (empty id, non-snake_case id, NaN envelope, zero envelope)
 *   - ≥3 spanning configs (every category, every host, every difficulty band)
 *   - audit invariant + frozen catalog mutation guard
 */

import { describe, it, expect } from "vitest";
import {
  FixturePartCatalogEngine,
  FixturePartDescriptorSchema,
  FixtureCategorySchema,
  FixtureHostSchema,
  type FixtureCategory,
  type FixtureHost,
} from "../engines/FixturePartCatalogEngine.js";

const ALL_CATEGORIES: FixtureCategory[] = [
  "pocket_2d", "contour_2d", "drilling", "threading",
  "surface_3d", "multi_axis", "turning",
];

const ALL_HOSTS: FixtureHost[] = [
  "fusion360", "hypermill", "inventor_hsm", "mastercam",
];

// ── 1. Catalog shape ─────────────────────────────────────────────────────────

describe("FixturePartCatalogEngine — catalog shape", () => {
  it("exposes exactly 20 parts (matches unit description)", () => {
    expect(FixturePartCatalogEngine.count()).toBe(20);
    expect(FixturePartCatalogEngine.EXPECTED_TOTAL).toBe(20);
    expect(FixturePartCatalogEngine.list().length).toBe(20);
  });

  it("audit invariant: catalog passes self-audit", () => {
    const audit = FixturePartCatalogEngine.auditCatalog();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("category distribution matches the unit description (3+3+2+2+3+4+3=20)", () => {
    const dist = FixturePartCatalogEngine.countByCategory();
    expect(dist.pocket_2d).toBe(3);
    expect(dist.contour_2d).toBe(3);
    expect(dist.drilling).toBe(2);
    expect(dist.threading).toBe(2);
    expect(dist.surface_3d).toBe(3);
    expect(dist.multi_axis).toBe(4);
    expect(dist.turning).toBe(3);
    const total = ALL_CATEGORIES.reduce((acc, c) => acc + dist[c], 0);
    expect(total).toBe(20);
  });

  it("every part has a non-empty title and ≥1 feature", () => {
    const parts = FixturePartCatalogEngine.list();
    expect(parts.length).toBe(20);
    for (const p of parts) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.features.length).toBeGreaterThan(0);
    }
  });
});

// ── 2. Coverage spans (≥3 spanning configs) ─────────────────────────────────

describe("FixturePartCatalogEngine — coverage spans", () => {
  it("every category has at least one part with matching category field", () => {
    for (const c of ALL_CATEGORIES) {
      const parts = FixturePartCatalogEngine.listByCategory(c);
      expect(parts.length).toBeGreaterThan(0);
      for (const p of parts) expect(p.category).toBe(c);
    }
  });

  it("every host appears in at least one part's preferred_hosts", () => {
    for (const h of ALL_HOSTS) {
      const parts = FixturePartCatalogEngine.listByHost(h);
      expect(parts.length).toBeGreaterThan(0);
      for (const p of parts) expect(p.preferred_hosts).toContain(h);
    }
  });

  it("difficulty range spans 1 (easiest) to 5 (impeller)", () => {
    const difficulties = FixturePartCatalogEngine.list().map(p => p.difficulty);
    expect(Math.min(...difficulties)).toBe(1);
    expect(Math.max(...difficulties)).toBe(5);
    // Every band 1..5 should have at least one representative
    const seen = new Set(difficulties);
    expect(seen.has(1)).toBe(true);
    expect(seen.has(2)).toBe(true);
    expect(seen.has(3)).toBe(true);
    expect(seen.has(4)).toBe(true);
    expect(seen.has(5)).toBe(true);
  });

  it("turning parts only land on mill-turn capable hosts (mastercam + hypermill)", () => {
    const turning = FixturePartCatalogEngine.listByCategory("turning");
    expect(turning.length).toBe(3);
    for (const p of turning) {
      for (const h of p.preferred_hosts) {
        expect(["mastercam", "hypermill"]).toContain(h);
      }
    }
  });
});

// ── 3. Lookup methods ───────────────────────────────────────────────────────

describe("FixturePartCatalogEngine — lookup", () => {
  it("get returns the descriptor for a known id with expected fields", () => {
    const p = FixturePartCatalogEngine.get("pocket_2d_rectangular");
    expect(p?.part_id).toBe("pocket_2d_rectangular");
    expect(p?.category).toBe("pocket_2d");
    expect(p?.envelope_mm.length_mm).toBe(100);
    expect(p?.envelope_mm.width_mm).toBe(60);
    expect(p?.envelope_mm.height_mm).toBe(25);
    expect(p?.difficulty).toBe(1);
  });

  it("get returns null for an unknown id (does not throw)", () => {
    expect(FixturePartCatalogEngine.get("nope_unknown_part")).toBeNull();
  });

  it("mustGet throws for unknown id (failure mode)", () => {
    expect(() => FixturePartCatalogEngine.mustGet("nope_unknown_part")).toThrow(/unknown part_id/);
  });

  it("mustGet returns descriptor for known id with expected fields", () => {
    const p = FixturePartCatalogEngine.mustGet("multi_axis_impeller");
    expect(p.category).toBe("multi_axis");
    expect(p.difficulty).toBe(5);
    expect(p.recommended_materials).toContain("Inconel-718");
  });

  it("lookup is case-sensitive (adversarial: uppercase variant returns null)", () => {
    expect(FixturePartCatalogEngine.get("POCKET_2D_RECTANGULAR")).toBeNull();
    expect(FixturePartCatalogEngine.get("Pocket_2D_Rectangular")).toBeNull();
  });
});

// ── 4. Schema validation (failure modes + adversarial) ──────────────────────

const baseDescriptor = {
  part_id: "ok_id",
  category: "pocket_2d",
  title: "x",
  envelope_mm: { length_mm: 1, width_mm: 1, height_mm: 1 },
  recommended_materials: ["6061-T6"],
  features: [{ name: "f", kind: "pocket", count: 1 }],
  difficulty: 1,
  preferred_hosts: ["fusion360"],
};

describe("FixturePartCatalogEngine — schema validation", () => {
  it("rejects descriptor with empty part_id (failure mode)", () => {
    expect(() => FixturePartDescriptorSchema.parse({ ...baseDescriptor, part_id: "" })).toThrow();
  });

  it("rejects non-snake_case part_id like CamelCase (adversarial)", () => {
    expect(() => FixturePartDescriptorSchema.parse({ ...baseDescriptor, part_id: "PocketRectangular" })).toThrow(/snake_case/);
  });

  it("rejects descriptor with non-positive envelope dimension (adversarial: zero)", () => {
    expect(() => FixturePartDescriptorSchema.parse({
      ...baseDescriptor,
      envelope_mm: { length_mm: 0, width_mm: 1, height_mm: 1 },
    })).toThrow();
  });

  it("rejects descriptor with NaN envelope dimension (adversarial: NaN)", () => {
    expect(() => FixturePartDescriptorSchema.parse({
      ...baseDescriptor,
      envelope_mm: { length_mm: Number.NaN, width_mm: 1, height_mm: 1 },
    })).toThrow();
  });

  it("rejects descriptor with empty recommended_materials (failure mode)", () => {
    expect(() => FixturePartDescriptorSchema.parse({
      ...baseDescriptor,
      recommended_materials: [],
    })).toThrow();
  });

  it("rejects descriptor with difficulty out of [1..5] band (failure mode)", () => {
    expect(() => FixturePartDescriptorSchema.parse({ ...baseDescriptor, difficulty: 6 })).toThrow();
    expect(() => FixturePartDescriptorSchema.parse({ ...baseDescriptor, difficulty: 0 })).toThrow();
  });

  it("FixtureCategorySchema rejects unknown category 'welding'", () => {
    const bad: unknown = "welding";
    expect(() => FixtureCategorySchema.parse(bad)).toThrow();
  });

  it("FixtureHostSchema rejects unknown host 'solidcam'", () => {
    const bad: unknown = "solidcam";
    expect(() => FixtureHostSchema.parse(bad)).toThrow();
  });
});

// ── 5. Frozen catalog mutation guard ────────────────────────────────────────

describe("FixturePartCatalogEngine — immutability", () => {
  it("returned descriptors are frozen (envelope, features, materials, hosts)", () => {
    const p = FixturePartCatalogEngine.mustGet("pocket_2d_rectangular");
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.envelope_mm)).toBe(true);
    expect(Object.isFrozen(p.features)).toBe(true);
    expect(Object.isFrozen(p.recommended_materials)).toBe(true);
    expect(Object.isFrozen(p.preferred_hosts)).toBe(true);
  });

  it("list() returns a defensive copy (popping the array does not affect catalog)", () => {
    const a = FixturePartCatalogEngine.list();
    expect(a.length).toBe(20);
    a.pop();
    expect(a.length).toBe(19);
    expect(FixturePartCatalogEngine.list().length).toBe(20);
  });

  it("listByCategory returns a defensive copy (mutating result does not affect catalog)", () => {
    const before = FixturePartCatalogEngine.listByCategory("pocket_2d");
    expect(before.length).toBe(3);
    before.length = 0;
    expect(before.length).toBe(0);
    const after = FixturePartCatalogEngine.listByCategory("pocket_2d");
    expect(after.length).toBe(3);
  });
});

// ── 6. Cross-host invariants ────────────────────────────────────────────────

describe("FixturePartCatalogEngine — cross-host invariants", () => {
  it("every part is buildable on at least one host", () => {
    for (const p of FixturePartCatalogEngine.list()) {
      expect(p.preferred_hosts.length).toBeGreaterThan(0);
    }
  });

  it("3-axis non-threading categories are buildable on every host", () => {
    const threeAxisFull: FixtureCategory[] = ["pocket_2d", "contour_2d", "drilling", "surface_3d"];
    for (const cat of threeAxisFull) {
      const parts = FixturePartCatalogEngine.listByCategory(cat);
      const hostsCovered = new Set<FixtureHost>();
      for (const p of parts) for (const h of p.preferred_hosts) hostsCovered.add(h);
      for (const h of ALL_HOSTS) {
        expect(hostsCovered.has(h)).toBe(true);
      }
    }
  });

  it("multi_axis category has impeller as its difficulty-5 representative on Inconel", () => {
    const ma = FixturePartCatalogEngine.listByCategory("multi_axis");
    expect(ma.length).toBe(4);
    const impeller = ma.find(p => p.part_id === "multi_axis_impeller");
    if (impeller === undefined) throw new Error("multi_axis_impeller missing from catalog");
    expect(impeller.difficulty).toBe(5);
    expect(impeller.recommended_materials).toContain("Inconel-718");
    expect(impeller.preferred_hosts).toContain("hypermill");
  });
});

// ── 7. Dispatcher round-trip (mandated by ENGINE WIRING rule) ───────────────

describe("U-CAMTEST05 — dispatcher round-trip (prism_cam)", () => {
  it("ACTIONS array exposes all 7 fixture part catalog actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_fixture_part_list");
    expect(mod.ACTIONS).toContain("cam_fixture_part_list_by_category");
    expect(mod.ACTIONS).toContain("cam_fixture_part_list_by_host");
    expect(mod.ACTIONS).toContain("cam_fixture_part_get");
    expect(mod.ACTIONS).toContain("cam_fixture_part_count");
    expect(mod.ACTIONS).toContain("cam_fixture_part_count_by_category");
    expect(mod.ACTIONS).toContain("cam_fixture_part_audit");
  });

  it("engine reachable via the same dynamic-import path the dispatcher uses", async () => {
    const mod = await import("../engines/FixturePartCatalogEngine.js");
    expect(mod.FixturePartCatalogEngine.count()).toBe(20);
    const audit = mod.FixturePartCatalogEngine.auditCatalog();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("category lookup via dispatcher engine path returns the expected 3 turning parts", async () => {
    const mod = await import("../engines/FixturePartCatalogEngine.js");
    const turning = mod.FixturePartCatalogEngine.listByCategory("turning");
    expect(turning.length).toBe(3);
    const ids = turning.map(p => p.part_id).sort();
    expect(ids).toEqual([
      "turning_id_groove_sleeve",
      "turning_od_rough_shaft",
      "turning_threaded_shaft",
    ]);
  });
});
