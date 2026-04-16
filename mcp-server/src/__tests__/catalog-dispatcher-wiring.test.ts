/**
 * Catalog Dispatcher Wiring — Integration Tests
 * ================================================
 * Verifies that dataDispatcher correctly wires the 7 new catalog actions:
 *   - catalog_machine_lookup / catalog_machine_stats
 *   - catalog_tool_lookup
 *   - catalog_holder_lookup / catalog_holder_recommend
 *   - catalog_workholding_lookup / catalog_workholding_stats
 *
 * Tests exercise the full dispatcher path: action -> filter logic -> catalog data.
 */

import { describe, it, expect } from "vitest";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";

// ============================================================================
// TEST HELPERS (same pattern as data-actions.test.ts)
// ============================================================================

interface CapturedTool {
  name: string;
  description: string;
  schema: any;
  handler: (args: any) => Promise<any>;
}

function createMockServer(): { server: any; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, description: string, schema: any, handler: any) {
      tools.push({ name, description, schema, handler });
    },
  };
  return { server, tools };
}

async function callAction(
  tool: CapturedTool,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}

// ============================================================================
// SETUP
// ============================================================================

const { server, tools } = createMockServer();
registerDataDispatcher(server);
const data = tools[0];

// ============================================================================
// catalog_machine_lookup
// ============================================================================

describe("catalog_machine_lookup", () => {
  it("should return machines when no filters applied", async () => {
    const res = await callAction(data, "catalog_machine_lookup", {});
    expect(res.count).toBeGreaterThan(0);
    expect(res.machines).toBeDefined();
    expect(res.machines.length).toBeGreaterThan(0);
    const m = res.machines[0];
    expect(m).toHaveProperty("brand");
    expect(m).toHaveProperty("model");
    expect(m).toHaveProperty("type");
    expect(m).toHaveProperty("spindle");
  });

  it("should filter by brand (Haas)", async () => {
    const res = await callAction(data, "catalog_machine_lookup", { brand: "Haas" });
    expect(res.count).toBeGreaterThan(0);
    for (const m of res.machines) {
      expect(m.brand.toLowerCase()).toContain("haas");
    }
  });

  it("should filter by brand (DMG)", async () => {
    const res = await callAction(data, "catalog_machine_lookup", { brand: "DMG" });
    expect(res.count).toBeGreaterThan(0);
    for (const m of res.machines) {
      expect(m.brand.toLowerCase()).toContain("dmg");
    }
  });

  it("should filter by type (VMC)", async () => {
    const res = await callAction(data, "catalog_machine_lookup", { type: "VMC" });
    expect(res.count).toBeGreaterThan(0);
    for (const m of res.machines) {
      expect(m.type.toLowerCase()).toBe("vmc");
    }
  });

  it("should filter by min_rpm", async () => {
    const res = await callAction(data, "catalog_machine_lookup", { min_rpm: 15000 });
    expect(res.count).toBeGreaterThan(0);
    for (const m of res.machines) {
      expect(m.spindle.max_rpm).toBeGreaterThanOrEqual(15000);
    }
  });

  it("should filter by taper (BT40)", async () => {
    const res = await callAction(data, "catalog_machine_lookup", { taper: "BT40" });
    expect(res.count).toBeGreaterThan(0);
    for (const m of res.machines) {
      expect(m.spindle.taper.toLowerCase()).toContain("bt40");
    }
  });

  it("should return empty array for nonexistent brand", async () => {
    const res = await callAction(data, "catalog_machine_lookup", { brand: "ZZZZNOTEXIST" });
    expect(res.count).toBe(0);
    expect(res.machines).toHaveLength(0);
  });

  it("should respect limit parameter", async () => {
    const res = await callAction(data, "catalog_machine_lookup", { limit: 3 });
    expect(res.machines.length).toBeLessThanOrEqual(3);
  });
});

// ============================================================================
// catalog_machine_stats
// ============================================================================

describe("catalog_machine_stats", () => {
  it("should return catalog statistics", async () => {
    const res = await callAction(data, "catalog_machine_stats", {});
    expect(res).toBeDefined();
    // Stats should have counts or summary data
    expect(typeof res).toBe("object");
  });
});

// ============================================================================
// catalog_tool_lookup
// ============================================================================

describe("catalog_tool_lookup", () => {
  it("should return tool data with no filters", async () => {
    const res = await callAction(data, "catalog_tool_lookup", {});
    expect(res).toBeDefined();
    expect(res.series).toBeDefined();
    expect(res.coatings).toBeDefined();
    expect(res.catalog).toBeDefined();
    expect(res.series.length).toBeGreaterThan(0);
    expect(res.coatings.length).toBeGreaterThan(0);
  });

  it("should filter series by name", async () => {
    const res = await callAction(data, "catalog_tool_lookup", { series: "Z-Carb" });
    expect(res.series.length).toBeGreaterThan(0);
    for (const s of res.series) {
      const combined = (s.series + " " + s.name).toLowerCase();
      expect(combined).toContain("z-carb");
    }
  });

  it("should filter by coating", async () => {
    const res = await callAction(data, "catalog_tool_lookup", { coating: "Ti-NAMITE" });
    expect(res.coatings.length).toBeGreaterThan(0);
    for (const c of res.coatings) {
      const combined = (c.name + " " + c.designation).toLowerCase();
      expect(combined).toContain("ti-namite");
    }
  });

  it("should filter speed/feed by ISO group", async () => {
    const res = await callAction(data, "catalog_tool_lookup", { iso_group: "P" });
    // speed_feed_zr and speed_feed_quick should be filtered
    if (res.speed_feed_zr.length > 0) {
      for (const r of res.speed_feed_zr) {
        expect(r.iso_group).toBe("P");
      }
    }
    if (res.speed_feed_quick.length > 0) {
      for (const r of res.speed_feed_quick) {
        expect(r.iso_group).toBe("P");
      }
    }
  });

  it("should filter by material keyword", async () => {
    const res = await callAction(data, "catalog_tool_lookup", { material: "steel" });
    // At least one of speed_feed arrays should have results
    const totalSf = res.speed_feed_zr.length + res.speed_feed_quick.length;
    expect(totalSf).toBeGreaterThan(0);
  });

  it("should return catalog metadata", async () => {
    const res = await callAction(data, "catalog_tool_lookup", {});
    expect(res.catalog).toBeDefined();
    expect(res.catalog).toHaveProperty("manufacturer");
  });
});

// ============================================================================
// catalog_holder_lookup
// ============================================================================

describe("catalog_holder_lookup", () => {
  it("should return holders with no filters", async () => {
    const res = await callAction(data, "catalog_holder_lookup", {});
    expect(res.count).toBeGreaterThan(0);
    expect(res.holders).toBeDefined();
    expect(res.holders.length).toBeGreaterThan(0);
    expect(res.tapers).toBeDefined();
    expect(res.tapers.length).toBeGreaterThan(0);
  });

  it("should filter by taper (BBT40)", async () => {
    const res = await callAction(data, "catalog_holder_lookup", { taper: "BBT40" });
    expect(res.count).toBeGreaterThan(0);
    for (const h of res.holders) {
      expect(h.taper).toBe("BBT40");
    }
  });

  it("should filter by type (hydraulic)", async () => {
    const res = await callAction(data, "catalog_holder_lookup", { type: "hydraulic" });
    expect(res.count).toBeGreaterThan(0);
    for (const h of res.holders) {
      expect(h.type).toBe("hydraulic");
    }
  });

  it("should use findHolders when taper + tool_diameter_mm provided", async () => {
    const res = await callAction(data, "catalog_holder_lookup", {
      taper: "BBT40",
      tool_diameter_mm: 10,
    });
    expect(res.holders).toBeDefined();
    // All returned holders should accept 10mm tool
    for (const h of res.holders) {
      expect(h.taper).toBe("BBT40");
      expect(h.bore_range_mm[0]).toBeLessThanOrEqual(10);
      expect(h.bore_range_mm[1]).toBeGreaterThanOrEqual(10);
    }
  });

  it("should return available tapers list", async () => {
    const res = await callAction(data, "catalog_holder_lookup", {});
    expect(res.tapers).toContain("BBT40");
    expect(res.tapers).toContain("HSK-A63");
  });

  it("should return empty for nonexistent taper", async () => {
    const res = await callAction(data, "catalog_holder_lookup", { taper: "ZZZNOTTAPER" });
    expect(res.count).toBe(0);
    expect(res.holders).toHaveLength(0);
  });

  it("should have expected fields on holder objects", async () => {
    const res = await callAction(data, "catalog_holder_lookup", { taper: "BBT40", limit: 1 });
    const h = res.holders[0];
    expect(h).toHaveProperty("model");
    expect(h).toHaveProperty("type");
    expect(h).toHaveProperty("taper");
    expect(h).toHaveProperty("bore_range_mm");
    expect(h).toHaveProperty("gauge_length_mm");
    expect(h).toHaveProperty("max_rpm");
    expect(h).toHaveProperty("runout_um");
    expect(h).toHaveProperty("balance_grade");
  });
});

// ============================================================================
// catalog_holder_recommend
// ============================================================================

describe("catalog_holder_recommend", () => {
  it("should recommend a holder for BBT40 / 10mm / 20000rpm", async () => {
    const res = await callAction(data, "catalog_holder_recommend", {
      taper: "BBT40",
      tool_diameter_mm: 10,
      required_rpm: 20000,
    });
    expect(res.recommendation).toBeDefined();
    expect(res.recommendation.taper).toBe("BBT40");
    expect(res.recommendation.max_rpm).toBeGreaterThanOrEqual(20000);
  });

  it("should recommend a holder for HSK-A63 / 6mm / 25000rpm", async () => {
    const res = await callAction(data, "catalog_holder_recommend", {
      taper: "HSK-A63",
      tool_diameter_mm: 6,
      required_rpm: 25000,
    });
    expect(res.recommendation).toBeDefined();
    expect(res.recommendation.taper).toBe("HSK-A63");
    expect(res.recommendation.max_rpm).toBeGreaterThanOrEqual(25000);
  });

  it("should prefer lowest runout among candidates", async () => {
    const res = await callAction(data, "catalog_holder_recommend", {
      taper: "BBT40",
      tool_diameter_mm: 12,
      required_rpm: 15000,
    });
    expect(res.recommendation).toBeDefined();
    // BIG DAISHOWA holders generally have 3um runout
    expect(res.recommendation.runout_um).toBeLessThanOrEqual(5);
  });

  it("should return error when required params missing", async () => {
    const res = await callAction(data, "catalog_holder_recommend", {
      taper: "BBT40",
      // missing tool_diameter_mm and required_rpm
    });
    expect(res.error).toBeDefined();
    expect(res.error).toContain("requires");
  });

  it("should return error for impossible criteria", async () => {
    const res = await callAction(data, "catalog_holder_recommend", {
      taper: "BBT40",
      tool_diameter_mm: 0.01, // too small
      required_rpm: 999999,   // too fast
    });
    expect(res.error).toBeDefined();
  });

  it("should optionally filter by holder type", async () => {
    const res = await callAction(data, "catalog_holder_recommend", {
      taper: "BBT40",
      tool_diameter_mm: 20,
      required_rpm: 15000,
      type: "hydraulic",
    });
    if (res.recommendation) {
      expect(res.recommendation.type).toBe("hydraulic");
    }
    // If no hydraulic holder fits, we get an error — that is acceptable
  });
});

// ============================================================================
// catalog_workholding_lookup
// ============================================================================

describe("catalog_workholding_lookup", () => {
  it("should return all vises with no filters", async () => {
    const res = await callAction(data, "catalog_workholding_lookup", {});
    expect(res.vises).toBeDefined();
    expect(res.vises.length).toBeGreaterThan(0);
    const v = res.vises[0];
    expect(v).toHaveProperty("brand");
    expect(v).toHaveProperty("model");
    expect(v).toHaveProperty("jaw_width_mm");
    expect(v).toHaveProperty("clamping_force_kn");
  });

  it("should find a vise by model query", async () => {
    const res = await callAction(data, "catalog_workholding_lookup", { model: "OV6" });
    expect(res.vise).toBeDefined();
    expect(res.vise.model).toContain("OV6");
    expect(res.vise.brand).toBe("Orange Vise");
  });

  it("should filter by min_jaw_width_mm", async () => {
    const res = await callAction(data, "catalog_workholding_lookup", {
      min_jaw_width_mm: 150, // ~6 inch vises
    });
    expect(res.vises).toBeDefined();
    expect(res.vises.length).toBeGreaterThan(0);
    for (const v of res.vises) {
      expect(v.jaw_width_mm).toBeGreaterThanOrEqual(150);
    }
  });

  it("should filter by part_width_mm", async () => {
    const res = await callAction(data, "catalog_workholding_lookup", {
      part_width_mm: 100, // part is 100mm wide
    });
    expect(res.vises).toBeDefined();
    expect(res.vises.length).toBeGreaterThan(0);
    for (const v of res.vises) {
      expect(v.max_opening_mm).toBeGreaterThanOrEqual(100);
    }
  });

  it("should find soft jaws by vise_width_mm", async () => {
    const sixInchMm = Math.round(6 * 25.4 * 100) / 100; // 152.4
    const res = await callAction(data, "catalog_workholding_lookup", {
      vise_width_mm: sixInchMm,
    });
    expect(res.soft_jaws).toBeDefined();
    expect(res.soft_jaws.length).toBeGreaterThan(0);
    for (const j of res.soft_jaws) {
      expect(j.fits_vise_width_mm).toBe(sixInchMm);
    }
  });

  it("should find soft jaws filtered by material", async () => {
    const sixInchMm = Math.round(6 * 25.4 * 100) / 100;
    const res = await callAction(data, "catalog_workholding_lookup", {
      vise_width_mm: sixInchMm,
      jaw_material: "aluminum",
    });
    expect(res.soft_jaws).toBeDefined();
    expect(res.soft_jaws.length).toBeGreaterThan(0);
    for (const j of res.soft_jaws) {
      expect(j.material.toLowerCase()).toContain("aluminum");
    }
  });

  it("should return error for nonexistent model", async () => {
    const res = await callAction(data, "catalog_workholding_lookup", {
      model: "NONEXISTENT_MODEL_XYZ",
    });
    expect(res.error).toBeDefined();
    expect(res.error).toContain("No vise found");
  });
});

// ============================================================================
// catalog_workholding_stats
// ============================================================================

describe("catalog_workholding_stats", () => {
  it("should return summary counts", async () => {
    const res = await callAction(data, "catalog_workholding_stats", {});
    expect(res).toBeDefined();
    expect(res.vises).toBeGreaterThan(0);
    expect(res.soft_jaws).toBeGreaterThan(0);
    expect(res.tombstones).toBeGreaterThan(0);
    expect(res.subplates).toBeGreaterThan(0);
  });
});
