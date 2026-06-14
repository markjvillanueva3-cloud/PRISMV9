/**
 * Tests for SpeedFeedShopLibraryBridgeEngine (U-OSC9-08).
 *
 * Coverage:
 *   - Singleton + shape contract
 *   - Schema validation (required fields, ranges, bad enums)
 *   - Filter pipeline: category, diameter range, drop reasons
 *   - Unit conversion: in → mm via diameter_mm
 *   - Material normalization: 6 patterns + fallback
 *   - Default flutes by category
 *   - Cost overrides + fallback cost
 *   - Empty-library short-circuit (no orchestrator call)
 *   - Top-K convenience method
 *   - Result-shape invariants (counts sum to total; ranked ≤ filtered)
 *   - Material.name auto-default + tooling field-name correctness
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  speedFeedShopLibraryBridgeEngine,
  SpeedFeedShopLibraryBridgeEngine,
  ShopLibraryBridgeInputSchema,
} from "../engines/SpeedFeedShopLibraryBridgeEngine.js";
import * as shopLibMod from "../engines/ShopToolLibraryEngine.js";
import * as orchestratorMod from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

// ============================================================================
// FIXTURES
// ============================================================================

const baseShopTool: shopLibMod.ShopTool = {
  id: "ix-0",
  category: "end_mill",
  type: "flat_end_mill",
  description: "6mm 4FL Carbide End Mill",
  diameter: 6,
  unit: "mm",
  toolNumber: 1,
  flutes: 4,
  material: "Solid Carbide",
};

function mkTool(overrides: Partial<shopLibMod.ShopTool> = {}): shopLibMod.ShopTool {
  return { ...baseShopTool, ...overrides, id: `ix-${overrides.toolNumber ?? Math.random()}` };
}

type ToolLibEntry = NonNullable<orchestratorMod.NineAxisInput["tool_library"]>[number];
type NineAxisResultLike = Pick<orchestratorMod.NineAxisResult, "mrr_ranking">;

/**
 * Build a minimal stub orchestrator result. We rank by descending diameter (deterministic for tests)
 * and only populate `mrr_ranking` — the bridge reads that field only.
 *
 * Return type widened via a typed structural-cast helper so we never write `as any`.
 */
function stubOrchestratorResult(library: ToolLibEntry[]): orchestratorMod.NineAxisResult {
  const ranking: orchestratorMod.MRRRankingEntry[] = library
    .slice()
    .sort((a, b) => b.diameter_mm - a.diameter_mm)
    .map((t, i) => ({
      rank: i + 1,
      config_label: t.label,
      tool_diameter_mm: t.diameter_mm,
      flutes: t.flutes,
      tool_material: t.tool_material,
      coating: t.coating,
      mrr_cm3min: 100 - i,
      cost_per_part_usd: 1.5 + i * 0.1,
      tool_life_min: 60 - i,
      score: 1 - i * 0.05,
    }));

  const minimal: NineAxisResultLike = { mrr_ranking: ranking };
  // Bridge only reads mrr_ranking. Other fields of NineAxisResult are intentionally absent — the
  // structural cast goes through `unknown` (not `any`) to declare the narrowing explicitly.
  return minimal as unknown as orchestratorMod.NineAxisResult;
}

// ============================================================================
// SHARED MOCK HELPERS
// ============================================================================

function mockShopLib(tools: shopLibMod.ShopTool[]): void {
  vi.spyOn(shopLibMod.shopToolLibraryEngine, "loadAll").mockReturnValue(tools);
}

function mockOrchestrator() {
  return vi
    .spyOn(orchestratorMod.speedFeedNineAxisOrchestratorEngine, "run")
    .mockImplementation((input: orchestratorMod.NineAxisInput) =>
      stubOrchestratorResult(input.tool_library ?? []),
    );
}

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SpeedFeedShopLibraryBridgeEngine — singleton + shape", () => {
  it("exports a singleton instance of the class", () => {
    expect(speedFeedShopLibraryBridgeEngine).toBeInstanceOf(SpeedFeedShopLibraryBridgeEngine);
  });

  it("exposes run() and topKForMaterialAndDiameter()", () => {
    expect(typeof speedFeedShopLibraryBridgeEngine.run).toBe("function");
    expect(typeof speedFeedShopLibraryBridgeEngine.topKForMaterialAndDiameter).toBe("function");
  });
});

describe("ShopLibraryBridgeInputSchema — Zod validation", () => {
  it("accepts a minimal input (material only) + applies max_tools default", () => {
    const parsed = ShopLibraryBridgeInputSchema.parse({ material: { iso_group: "P" } });
    expect(parsed.material.iso_group).toBe("P");
    expect(parsed.max_tools).toBe(200);
  });

  it("rejects missing material", () => {
    expect(() => ShopLibraryBridgeInputSchema.parse({})).toThrow();
  });

  it("rejects bad iso_group", () => {
    expect(() => ShopLibraryBridgeInputSchema.parse({ material: { iso_group: "Z" } })).toThrow();
  });

  it("rejects diameter_range_mm with max < min", () => {
    expect(() =>
      ShopLibraryBridgeInputSchema.parse({
        material: { iso_group: "M" },
        diameter_range_mm: { min: 10, max: 5 },
      }),
    ).toThrow();
  });

  it("rejects max_tools > 2000", () => {
    expect(() =>
      ShopLibraryBridgeInputSchema.parse({ material: { iso_group: "P" }, max_tools: 5000 }),
    ).toThrow();
  });

  it("rejects bad optimization_mode", () => {
    expect(() =>
      ShopLibraryBridgeInputSchema.parse({
        material: { iso_group: "P" },
        optimization_mode: "rocket_fast" as unknown as "prism_optimized",
      }),
    ).toThrow();
  });
});

describe("SpeedFeedShopLibraryBridgeEngine.run() — filter pipeline", () => {
  it("filters by category", () => {
    mockShopLib([
      mkTool({ toolNumber: 1, category: "end_mill", diameter: 6 }),
      mkTool({ toolNumber: 2, category: "twist_drill", diameter: 6 }),
      mkTool({ toolNumber: 3, category: "end_mill", diameter: 8 }),
    ]);
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({
      material: { iso_group: "P" },
      category_filter: "end_mill",
    });

    expect(result.summary.filtered_count).toBe(2);
    expect(result.summary.dropped.category_mismatch).toBe(1);
  });

  it("filters by diameter_range_mm", () => {
    mockShopLib([
      mkTool({ toolNumber: 1, diameter: 3 }),
      mkTool({ toolNumber: 2, diameter: 6 }),
      mkTool({ toolNumber: 3, diameter: 12 }),
      mkTool({ toolNumber: 4, diameter: 25 }),
    ]);
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({
      material: { iso_group: "P" },
      diameter_range_mm: { min: 4, max: 20 },
    });

    expect(result.summary.filtered_count).toBe(2);
    expect(result.summary.dropped.out_of_diameter_range).toBe(2);
  });

  it("drops tools with no/zero/NaN diameter", () => {
    mockShopLib([
      mkTool({ toolNumber: 1, diameter: 6 }),
      mkTool({ toolNumber: 2, diameter: 0 }),
      mkTool({ toolNumber: 3, diameter: NaN }),
      mkTool({ toolNumber: 4, diameter: undefined as unknown as number }),
    ]);
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });

    expect(result.summary.dropped.no_diameter).toBe(3);
    expect(result.summary.filtered_count).toBe(1);
  });

  it("de-dups by tool_number", () => {
    mockShopLib([
      mkTool({ toolNumber: 5 }),
      mkTool({ toolNumber: 5, category: "twist_drill" }),
      mkTool({ toolNumber: 6 }),
    ]);
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });

    expect(result.summary.dropped.duplicate_tool_number).toBe(1);
    expect(result.summary.filtered_count).toBe(2);
  });

  it("respects max_tools cap", () => {
    const tools = Array.from({ length: 20 }, (_, i) => mkTool({ toolNumber: i + 1 }));
    mockShopLib(tools);
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({
      material: { iso_group: "P" },
      max_tools: 7,
    });

    expect(result.summary.filtered_count).toBe(20);
    expect(result.summary.ranked_count).toBe(7);
    expect(result.mrr_ranking.length).toBe(7);
  });
});

describe("SpeedFeedShopLibraryBridgeEngine.run() — unit + material normalization", () => {
  it("converts diameter from inches to mm (0.5 in → 12.7 mm)", () => {
    mockShopLib([mkTool({ toolNumber: 1, diameter: 0.5, unit: "in" })]);
    const spy = mockOrchestrator();

    speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });

    const call = spy.mock.calls[0][0];
    expect(call.tool_library?.[0].diameter_mm).toBeCloseTo(12.7, 5);
  });

  it("normalizes 6 material strings to canonical ToolMaterial values", () => {
    mockShopLib([
      mkTool({ toolNumber: 1, material: "Solid Carbide" }),
      mkTool({ toolNumber: 2, material: "HSS-Co8" }),
      mkTool({ toolNumber: 3, material: "Cermet" }),
      mkTool({ toolNumber: 4, material: "Ceramic" }),
      mkTool({ toolNumber: 5, material: "CBN" }),
      mkTool({ toolNumber: 6, material: "PCD" }),
    ]);
    const spy = mockOrchestrator();

    speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });

    const call = spy.mock.calls[0][0];
    const mats = call.tool_library?.map((t) => t.tool_material) ?? [];
    expect(mats).toEqual(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]);
  });

  it("defaults to carbide on unknown material + warns", () => {
    mockShopLib([mkTool({ toolNumber: 1, material: "Unobtanium" })]);
    const spy = mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });

    expect(result.summary.defaulted_material_count).toBe(1);
    const call = spy.mock.calls[0][0];
    expect(call.tool_library?.[0].tool_material).toBe("carbide");
    expect(result.warnings.some((w) => /Unobtanium/i.test(w))).toBe(true);
  });

  it("defaults flutes by category when missing", () => {
    mockShopLib([
      mkTool({ toolNumber: 1, category: "twist_drill", flutes: undefined }),
      mkTool({ toolNumber: 2, category: "face_mill", flutes: undefined }),
    ]);
    const spy = mockOrchestrator();

    speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });

    const call = spy.mock.calls[0][0];
    expect(call.tool_library?.[0].flutes).toBe(2); // twist_drill
    expect(call.tool_library?.[1].flutes).toBe(5); // face_mill
  });
});

describe("SpeedFeedShopLibraryBridgeEngine.run() — cost handling", () => {
  it("uses cost overrides when provided", () => {
    mockShopLib([mkTool({ toolNumber: 42 })]);
    const spy = mockOrchestrator();

    speedFeedShopLibraryBridgeEngine.run({
      material: { iso_group: "P" },
      cost_overrides_by_tool_number: { "42": 175.5 },
    });

    const call = spy.mock.calls[0][0];
    expect(call.tool_library?.[0].cost_usd).toBe(175.5);
  });

  it("falls back to $30 + warns when no override", () => {
    mockShopLib([mkTool({ toolNumber: 1 }), mkTool({ toolNumber: 2 })]);
    const spy = mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });

    expect(result.summary.defaulted_cost_count).toBe(2);
    const call = spy.mock.calls[0][0];
    expect(call.tool_library?.every((t) => t.cost_usd === 30)).toBe(true);
    expect(result.warnings.some((w) => /fallback cost/.test(w))).toBe(true);
  });
});

describe("SpeedFeedShopLibraryBridgeEngine.run() — empty-library short-circuit", () => {
  it("returns structured empty when library is empty + does NOT call orchestrator", () => {
    mockShopLib([]);
    const spy = mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });

    expect(result.mrr_ranking).toEqual([]);
    expect(result.summary.total_shop_tools).toBe(0);
    expect(result.summary.filtered_count).toBe(0);
    expect(result.warnings[0]).toMatch(/no shop tools survived/);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns structured empty when all tools filtered out", () => {
    mockShopLib([mkTool({ toolNumber: 1, diameter: 50 })]);
    const spy = mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({
      material: { iso_group: "P" },
      diameter_range_mm: { min: 1, max: 5 },
    });

    expect(result.mrr_ranking).toEqual([]);
    expect(result.summary.dropped.out_of_diameter_range).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("SpeedFeedShopLibraryBridgeEngine.run() — orchestrator integration", () => {
  it("delegates MRR ranking to orchestrator + preserves rank order", () => {
    mockShopLib([
      mkTool({ toolNumber: 1, diameter: 6 }),
      mkTool({ toolNumber: 2, diameter: 12 }),
      mkTool({ toolNumber: 3, diameter: 3 }),
    ]);
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });

    expect(result.mrr_ranking.length).toBe(3);
    // stub ranks by descending diameter
    expect(result.mrr_ranking[0].tool_diameter_mm).toBe(12);
    expect(result.mrr_ranking[1].tool_diameter_mm).toBe(6);
    expect(result.mrr_ranking[2].tool_diameter_mm).toBe(3);
  });

  it("builds source_tool_by_label index with the real tool_number", () => {
    mockShopLib([mkTool({ toolNumber: 7, description: "10mm 3FL HSS End Mill" })]);
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });
    const label = result.mrr_ranking[0].config_label;
    expect(result.source_tool_by_label[label]).toEqual({
      tool_number: 7,
      description: "10mm 3FL HSS End Mill",
      category: "end_mill",
    });
  });

  it("downgrades orchestrator throws to structured error (warnings, empty ranking)", () => {
    mockShopLib([mkTool({ toolNumber: 1 })]);
    vi.spyOn(orchestratorMod.speedFeedNineAxisOrchestratorEngine, "run").mockImplementation(() => {
      throw new Error("kc lookup failed for ISO Z");
    });

    const result = speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });

    expect(result.mrr_ranking).toEqual([]);
    expect(
      result.warnings.some((w) => /orchestrator failure.*kc lookup failed/.test(w)),
    ).toBe(true);
  });

  it("forwards optimization_mode to orchestrator", () => {
    mockShopLib([mkTool({ toolNumber: 1 })]);
    const spy = mockOrchestrator();

    speedFeedShopLibraryBridgeEngine.run({
      material: { iso_group: "P" },
      optimization_mode: "aggressive_rush",
    });

    expect(spy.mock.calls[0][0].mode).toBe("aggressive_rush");
  });

  it("defaults optimization_mode to prism_optimized when unspecified", () => {
    mockShopLib([mkTool({ toolNumber: 1 })]);
    const spy = mockOrchestrator();

    speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });

    expect(spy.mock.calls[0][0].mode).toBe("prism_optimized");
  });

  it("defaults material.name to ISO-group fallback when caller omits it", () => {
    mockShopLib([mkTool({ toolNumber: 1 })]);
    const spy = mockOrchestrator();

    speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "M" } });

    expect(spy.mock.calls[0][0].material.name).toBe("ISO-M generic");
  });

  it("passes anchor tooling via tool_diameter_mm (NOT diameter_mm — different field name)", () => {
    mockShopLib([mkTool({ toolNumber: 1, diameter: 8.5 })]);
    const spy = mockOrchestrator();

    speedFeedShopLibraryBridgeEngine.run({ material: { iso_group: "P" } });

    expect(spy.mock.calls[0][0].tooling.tool_diameter_mm).toBe(8.5);
  });
});

describe("SpeedFeedShopLibraryBridgeEngine.topKForMaterialAndDiameter()", () => {
  it("returns at most K entries", () => {
    mockShopLib(
      Array.from({ length: 10 }, (_, i) => mkTool({ toolNumber: i + 1, diameter: 5 + i })),
    );
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.topKForMaterialAndDiameter("P", 1, 20, 3);

    expect(result.mrr_ranking.length).toBe(3);
  });

  it("scopes the diameter window correctly", () => {
    mockShopLib([
      mkTool({ toolNumber: 1, diameter: 2 }),
      mkTool({ toolNumber: 2, diameter: 5 }),
      mkTool({ toolNumber: 3, diameter: 8 }),
      mkTool({ toolNumber: 4, diameter: 15 }),
    ]);
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.topKForMaterialAndDiameter("M", 4, 10, 10);

    expect(result.summary.filtered_count).toBe(2);
  });
});

describe("SpeedFeedShopLibraryBridgeEngine — filter ordering (P1-fix Reviewer B)", () => {
  it("no_diameter wins when a tool fails BOTH no_diameter AND category_filter", () => {
    mockShopLib([mkTool({ toolNumber: 1, diameter: 0, category: "turning" })]);
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({
      material: { iso_group: "P" },
      category_filter: "end_mill",
    });

    expect(result.summary.dropped.no_diameter).toBe(1);
    expect(result.summary.dropped.category_mismatch).toBe(0);
    expect(result.summary.filtered_count).toBe(0);
  });

  it("category wins over diameter_range when both fail (category checked after diameter validity)", () => {
    mockShopLib([mkTool({ toolNumber: 1, diameter: 100, category: "turning" })]);
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({
      material: { iso_group: "P" },
      category_filter: "end_mill",
      diameter_range_mm: { min: 1, max: 20 },
    });

    expect(result.summary.dropped.category_mismatch).toBe(1);
    expect(result.summary.dropped.out_of_diameter_range).toBe(0);
  });
});

describe("SpeedFeedShopLibraryBridgeEngine — real orchestrator integration (P1-fix Reviewer B)", () => {
  it("end-to-end with REAL NineAxisOrchestrator (no mock) — anchors contract drift", () => {
    mockShopLib([
      mkTool({ toolNumber: 101, diameter: 6, flutes: 4, material: "Solid Carbide", category: "end_mill", description: "6mm 4FL Carbide EM" }),
      mkTool({ toolNumber: 102, diameter: 10, flutes: 4, material: "Solid Carbide", category: "end_mill", description: "10mm 4FL Carbide EM" }),
      mkTool({ toolNumber: 103, diameter: 12, flutes: 2, material: "HSS-Co8", category: "end_mill", description: "12mm 2FL HSS EM" }),
    ]);

    const result = speedFeedShopLibraryBridgeEngine.run({
      material: { iso_group: "P", hardness_hb: 200, name: "1018 steel" },
      cost_overrides_by_tool_number: { "101": 45, "102": 60, "103": 25 },
    });

    // Real orchestrator must produce a non-empty MRR ranking (contract anchor).
    expect(result.summary.filtered_count).toBe(3);
    expect(result.mrr_ranking.length).toBeGreaterThan(0);
    expect(result.mrr_ranking.length).toBeLessThanOrEqual(3);

    // Every ranked entry has the canonical MRRRankingEntry shape — direct value assertions.
    for (const entry of result.mrr_ranking) {
      expect(entry.rank).toBeGreaterThanOrEqual(1);
      expect(typeof entry.config_label).toBe("string");
      expect(entry.config_label.length).toBeGreaterThan(0);
      expect(entry.tool_diameter_mm).toBeGreaterThan(0);
      expect(entry.flutes).toBeGreaterThan(0);
      expect(Number.isFinite(entry.mrr_cm3min)).toBe(true);
      expect(Number.isFinite(entry.score)).toBe(true);
    }

    // Ranks are 1-indexed + monotonic — broken if orchestrator drops the sort step.
    const ranks = result.mrr_ranking.map((e) => e.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));

    // Every ranked label resolves to a source ShopTool with one of the 3 fixture T-numbers.
    const expectedToolNumbers = [101, 102, 103];
    for (const entry of result.mrr_ranking) {
      expect(result.source_tool_by_label).toHaveProperty(entry.config_label);
      const src = result.source_tool_by_label[entry.config_label];
      expect(expectedToolNumbers).toContain(src.tool_number);
      expect(src.category).toBe("end_mill");
    }
  });
});

describe("SpeedFeedShopLibraryBridgeEngine — invariants", () => {
  it("dropped + filtered counts sum to total_shop_tools", () => {
    mockShopLib([
      mkTool({ toolNumber: 1, diameter: 6 }),
      mkTool({ toolNumber: 2, diameter: 0 }),
      mkTool({ toolNumber: 3, category: "turning", diameter: 10 }),
      mkTool({ toolNumber: 4, diameter: 100 }),
      mkTool({ toolNumber: 1, diameter: 6 }),
    ]);
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({
      material: { iso_group: "P" },
      category_filter: "end_mill",
      diameter_range_mm: { min: 1, max: 20 },
    });

    const totalDropped =
      result.summary.dropped.no_diameter +
      result.summary.dropped.out_of_diameter_range +
      result.summary.dropped.category_mismatch +
      result.summary.dropped.duplicate_tool_number;

    expect(result.summary.total_shop_tools).toBe(5);
    expect(result.summary.filtered_count + totalDropped).toBe(5);
    expect(result.summary.filtered_count).toBe(1);
    expect(totalDropped).toBe(4);
  });

  it("ranked_count never exceeds filtered_count", () => {
    mockShopLib(Array.from({ length: 5 }, (_, i) => mkTool({ toolNumber: i + 1 })));
    mockOrchestrator();

    const result = speedFeedShopLibraryBridgeEngine.run({
      material: { iso_group: "P" },
      max_tools: 100,
    });

    expect(result.summary.ranked_count).toBeLessThanOrEqual(result.summary.filtered_count);
    expect(result.summary.ranked_count).toBe(5);
  });
});
