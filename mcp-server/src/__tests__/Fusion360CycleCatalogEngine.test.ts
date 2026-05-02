/**
 * Fusion360CycleCatalogEngine.test.ts
 *
 * Coverage:
 *   - happy path: 52 cycles, audit passes
 *   - per-category counts: drilling=8, 2d=8, 3d=12, 5axis=6, turning=7,
 *     probing=5, threading=3, sheet_metal=3 (= 52 total)
 *   - flag invariants: probing/sheet_metal cycles all require Mfg Ext;
 *     turning cycles all isMillTurn; adaptive cycles include 2D + 3D
 *     adaptive clearing
 *   - failure modes: schema rejection on malformed code, unknown category;
 *     mustLookup throws on unknown
 *   - adversarial: empty search, casing variations, lookup case-sensitivity
 */

import { describe, it, expect } from "vitest";
import {
  Fusion360CycleCatalogEngine,
  Fusion360CycleSchema,
  Fusion360CycleCategorySchema,
  type Fusion360Cycle,
  type Fusion360CycleCategory,
} from "../engines/Fusion360CycleCatalogEngine.js";

const ALL_CATEGORIES: Fusion360CycleCategory[] = [
  "drilling", "2d_milling", "3d_milling", "5axis",
  "turning", "probing", "threading", "sheet_metal",
];

const EXPECTED_PER_CATEGORY: Record<Fusion360CycleCategory, number> = {
  drilling: 8,
  "2d_milling": 8,
  "3d_milling": 12,
  "5axis": 6,
  turning: 7,
  probing: 5,
  threading: 3,
  sheet_metal: 3,
};

function mustLookupOrThrow(code: string): Fusion360Cycle {
  const c = Fusion360CycleCatalogEngine.lookup(code);
  if (c === null) throw new Error(`expected cycle ${code} but lookup returned null`);
  return c;
}

// ── 1. Catalog shape ────────────────────────────────────────────────────────

describe("Fusion360CycleCatalogEngine — catalog shape", () => {
  it("exposes exactly 52 cycles", () => {
    expect(Fusion360CycleCatalogEngine.count()).toBe(52);
    expect(Fusion360CycleCatalogEngine.EXPECTED_TOTAL).toBe(52);
    expect(Fusion360CycleCatalogEngine.list().length).toBe(52);
  });

  it("audit invariant: catalog passes self-audit", () => {
    const audit = Fusion360CycleCatalogEngine.auditCatalog();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("category distribution matches the per-category expectation table", () => {
    const dist = Fusion360CycleCatalogEngine.countByCategory();
    for (const c of ALL_CATEGORIES) {
      expect(dist[c]).toBe(EXPECTED_PER_CATEGORY[c]);
    }
    const total = ALL_CATEGORIES.reduce((acc, c) => acc + dist[c], 0);
    expect(total).toBe(52);
  });

  it("every cycle has non-empty displayName + ≥1 tribal tip", () => {
    const cycles = Fusion360CycleCatalogEngine.list();
    expect(cycles.length).toBe(52);
    for (const c of cycles) {
      expect(c.displayName.length).toBeGreaterThan(0);
      expect(c.tribalTips.length).toBeGreaterThan(0);
    }
  });

  it("every cycle code matches CATEGORY:Name pattern", () => {
    for (const c of Fusion360CycleCatalogEngine.list()) {
      expect(c.code).toMatch(/^[A-Z0-9]+:[A-Za-z0-9_]+$/);
    }
  });
});

// ── 2. Flag invariants ──────────────────────────────────────────────────────

describe("Fusion360CycleCatalogEngine — flag invariants", () => {
  it("every probing cycle requires Mfg Extension license", () => {
    const probing = Fusion360CycleCatalogEngine.listByCategory("probing");
    expect(probing.length).toBe(5);
    for (const c of probing) {
      expect(c.requiresMfgExt).toBe(true);
    }
  });

  it("every sheet_metal cycle requires Mfg Extension license", () => {
    const sheet = Fusion360CycleCatalogEngine.listByCategory("sheet_metal");
    expect(sheet.length).toBe(3);
    for (const c of sheet) {
      expect(c.requiresMfgExt).toBe(true);
    }
  });

  it("every turning cycle is isMillTurn=true", () => {
    const turning = Fusion360CycleCatalogEngine.listByCategory("turning");
    expect(turning.length).toBe(7);
    for (const c of turning) {
      expect(c.isMillTurn).toBe(true);
    }
  });

  it("listAdaptive includes 2D Adaptive + 3D Adaptive Clearing + 5-Axis Adaptive (3 total)", () => {
    const adaptive = Fusion360CycleCatalogEngine.listAdaptive();
    expect(adaptive.length).toBe(3);
    const codes = adaptive.map(c => c.code).sort();
    expect(codes).toEqual([
      "AX5:Adaptive",
      "MILL2D:Adaptive",
      "MILL3D:AdaptiveClearing",
    ]);
    for (const c of adaptive) expect(c.isAdaptive).toBe(true);
  });

  it("listMfgExtOnly returns at least 13 cycles, each with requiresMfgExt=true", () => {
    const mfgExt = Fusion360CycleCatalogEngine.listMfgExtOnly();
    // 5 probing + 3 sheet metal + 5 5-axis (multi-axis contour, swarf, adaptive, flow, multi-axis pocket) + 1 drill probe = 14
    expect(mfgExt.length).toBe(14);
    for (const c of mfgExt) expect(c.requiresMfgExt).toBe(true);
  });

  it("listMillTurn includes all turning cycles + the rotary 5-axis cycle (8 total)", () => {
    const mt = Fusion360CycleCatalogEngine.listMillTurn();
    expect(mt.length).toBe(8); // 7 turning + 1 rotary
    for (const c of mt) expect(c.isMillTurn).toBe(true);
    const codes = mt.map(c => c.code).sort();
    expect(codes).toContain("AX5:Rotary");
    expect(codes).toContain("TURN:Profile");
    expect(codes).toContain("TURN:Thread");
  });
});

// ── 3. Lookup methods ──────────────────────────────────────────────────────

describe("Fusion360CycleCatalogEngine — lookup", () => {
  it("lookup returns the cycle for DRILL:Peck with expected fields", () => {
    const c = mustLookupOrThrow("DRILL:Peck");
    expect(c.code).toBe("DRILL:Peck");
    expect(c.displayName).toBe("Peck Drilling");
    expect(c.category).toBe("drilling");
    expect(c.gCodeCycles).toContain("G83");
    expect(c.aliases).toContain("Deep Drill");
  });

  it("lookup returns null for an unknown code (does not throw)", () => {
    expect(Fusion360CycleCatalogEngine.lookup("DRILL:Nope")).toBeNull();
  });

  it("mustLookup throws for unknown code (failure mode)", () => {
    expect(() => Fusion360CycleCatalogEngine.mustLookup("DRILL:Nope")).toThrow(/unknown cycle code/);
  });

  it("mustLookup returns concrete cycle for known code MILL3D:AdaptiveClearing", () => {
    const c = Fusion360CycleCatalogEngine.mustLookup("MILL3D:AdaptiveClearing");
    expect(c.code).toBe("MILL3D:AdaptiveClearing");
    expect(c.category).toBe("3d_milling");
    expect(c.isAdaptive).toBe(true);
    expect(c.displayName).toBe("3D Adaptive Clearing");
  });

  it("lookup is case-sensitive (adversarial: lowercase variant returns null)", () => {
    expect(Fusion360CycleCatalogEngine.lookup("drill:peck")).toBeNull();
    expect(Fusion360CycleCatalogEngine.lookup("DRILL:peck")).toBeNull();
    expect(Fusion360CycleCatalogEngine.lookup("DRILL:PECK")).toBeNull();
  });
});

// ── 4. Search ──────────────────────────────────────────────────────────────

describe("Fusion360CycleCatalogEngine — search", () => {
  it("search returns empty array on empty query", () => {
    expect(Fusion360CycleCatalogEngine.search("")).toEqual([]);
    expect(Fusion360CycleCatalogEngine.search("   ")).toEqual([]);
  });

  it("search matches displayName case-insensitively (ADAPTIVE → 3 hits)", () => {
    const results = Fusion360CycleCatalogEngine.search("ADAPTIVE");
    expect(results.length).toBe(3);
    for (const c of results) {
      const text = (c.displayName + " " + c.code + " " + c.aliases.join(" ")).toLowerCase();
      expect(text).toContain("adaptive");
    }
  });

  it("search matches aliases (VoluMill → 1 hit on 3D Adaptive Clearing)", () => {
    const results = Fusion360CycleCatalogEngine.search("VoluMill");
    expect(results.length).toBe(1);
    expect(results[0].code).toBe("MILL3D:AdaptiveClearing");
    expect(results[0].aliases).toContain("VoluMill");
  });

  it("search matches code substrings (AX5 → 6 5-axis cycles)", () => {
    const results = Fusion360CycleCatalogEngine.search("AX5");
    expect(results.length).toBe(6);
    for (const c of results) expect(c.code.startsWith("AX5:")).toBe(true);
  });

  it("search returns empty for an unknown term", () => {
    expect(Fusion360CycleCatalogEngine.search("waterjet_undercut")).toEqual([]);
  });
});

// ── 5. Schema validation (failure modes + adversarial) ────────────────────

const baseCycle = {
  code: "DRILL:Test",
  displayName: "Test",
  category: "drilling" as const,
  aliases: [],
  gCodeCycles: [],
  tribalTips: ["x"],
  isAdaptive: false,
  requiresMfgExt: false,
  isMillTurn: false,
};

describe("Fusion360CycleCatalogEngine — schema validation", () => {
  it("Fusion360CycleSchema rejects code without colon (failure mode)", () => {
    expect(() => Fusion360CycleSchema.parse({ ...baseCycle, code: "DRILLTest" })).toThrow();
  });

  it("Fusion360CycleSchema rejects code with lowercase prefix (adversarial)", () => {
    expect(() => Fusion360CycleSchema.parse({ ...baseCycle, code: "drill:Test" })).toThrow();
  });

  it("Fusion360CycleSchema rejects empty displayName (failure mode)", () => {
    expect(() => Fusion360CycleSchema.parse({ ...baseCycle, displayName: "" })).toThrow();
  });

  it("Fusion360CycleSchema rejects empty tribal tip string", () => {
    expect(() => Fusion360CycleSchema.parse({ ...baseCycle, tribalTips: [""] })).toThrow();
  });

  it("Fusion360CycleCategorySchema rejects unknown category", () => {
    const bad: unknown = "waterjet";
    expect(() => Fusion360CycleCategorySchema.parse(bad)).toThrow();
  });
});

// ── 6. Stats ─────────────────────────────────────────────────────────────

describe("Fusion360CycleCatalogEngine — stats", () => {
  it("stats() reports total, by_category, and counts of adaptive/mfgExt/millTurn", () => {
    const stats = Fusion360CycleCatalogEngine.stats();
    expect(stats.total).toBe(52);
    expect(stats.adaptive_count).toBe(3);
    expect(stats.mill_turn_count).toBe(8);
    expect(stats.mfg_ext_count).toBe(14);
    for (const c of ALL_CATEGORIES) {
      expect(stats.by_category[c]).toBe(EXPECTED_PER_CATEGORY[c]);
    }
  });
});

// ── 7. Cross-engine ontology hint (Mastercam parity) ─────────────────────

describe("Fusion360CycleCatalogEngine — Mastercam parity", () => {
  it("turning category cycles cover OD profile + thread + part-off (cross-CAM ontology bridge)", () => {
    const turning = Fusion360CycleCatalogEngine.listByCategory("turning");
    const codes = turning.map(c => c.code);
    expect(codes).toContain("TURN:Profile");
    expect(codes).toContain("TURN:Thread");
    expect(codes).toContain("TURN:Part");
  });

  it("drilling category cycles cover the standard G81/G82/G83 family", () => {
    const drilling = Fusion360CycleCatalogEngine.listByCategory("drilling");
    const allG = drilling.flatMap(c => c.gCodeCycles);
    expect(allG).toContain("G81");
    expect(allG).toContain("G82");
    expect(allG).toContain("G83");
    expect(allG).toContain("G73");
    expect(allG).toContain("G85");
  });
});

// ── 8. Frozen catalog mutation guard ─────────────────────────────────────

describe("Fusion360CycleCatalogEngine — immutability", () => {
  it("returned cycles are frozen", () => {
    const c = Fusion360CycleCatalogEngine.mustLookup("DRILL:Peck");
    expect(Object.isFrozen(c)).toBe(true);
    expect(Object.isFrozen(c.aliases)).toBe(true);
    expect(Object.isFrozen(c.gCodeCycles)).toBe(true);
    expect(Object.isFrozen(c.tribalTips)).toBe(true);
  });

  it("list() returns a defensive copy (popping does not affect catalog)", () => {
    const a = Fusion360CycleCatalogEngine.list();
    expect(a.length).toBe(52);
    a.pop();
    expect(a.length).toBe(51);
    expect(Fusion360CycleCatalogEngine.list().length).toBe(52);
  });
});

// ── 9. Dispatcher round-trip ─────────────────────────────────────────────

describe("Fusion360CycleCatalogEngine — dispatcher round-trip (prism_cam)", () => {
  it("ACTIONS array exposes Fusion 360 cycle catalog actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_fusion360_cycle_catalog_list");
    expect(mod.ACTIONS).toContain("cam_fusion360_cycle_catalog_search");
    expect(mod.ACTIONS).toContain("cam_fusion360_cycle_catalog_lookup");
    expect(mod.ACTIONS).toContain("cam_fusion360_cycle_catalog_stats");
    expect(mod.ACTIONS).toContain("cam_fusion360_cycle_catalog_audit");
  });

  it("engine reachable via the same dynamic-import path the dispatcher uses", async () => {
    const mod = await import("../engines/Fusion360CycleCatalogEngine.js");
    expect(mod.Fusion360CycleCatalogEngine.count()).toBe(52);
    const audit = mod.Fusion360CycleCatalogEngine.auditCatalog();
    expect(audit.ok).toBe(true);
  });
});
