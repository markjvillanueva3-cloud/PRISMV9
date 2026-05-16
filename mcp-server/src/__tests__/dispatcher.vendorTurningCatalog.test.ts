/**
 * dispatcher.vendorTurningCatalog.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-VTC dispatcher wiring (6 actions).
 *
 * Drives all 6 surfaces through the real `prism_turning` dispatcher:
 *   - turning_iso1832_parse          → parseISO1832Designation (PURE)
 *   - turning_chipbreaker_classify   → classifyChipbreaker     (PURE)
 *   - turning_vendor_insert_search   → searchInserts           (catalog)
 *   - turning_vendor_grade_recommend → recommendGrade          (catalog)
 *   - turning_vendor_iso_code_resolve→ resolveISOCode          (catalog)
 *   - turning_vendor_catalog_stats   → getStats                (catalog)
 *
 * The engine-direct suite (`VendorTurningCatalogExtractor.test.ts`, 31
 * cases, GREEN-verified before wiring) proves the ISO-1832 parsing math.
 * This file pins the contracts only a dispatcher round-trip can verify:
 *   1. All 6 actions register on the prism_turning Zod enum.
 *   2. The dispatcher wraps every result as { success, data }.
 *   3. CATALOG ACTIVATION: the ~4095-insert Tungaloy+Widia catalog was
 *      dormant dead data (zero callers of ensureCatalogsLoaded). This
 *      wiring hydrates it — the stats action MUST report a non-empty
 *      catalog, proving the activation actually fires through the wire.
 *
 * Reference values pinned from ISO 1832 + the engine's decode tables.
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

interface ParsedInsert {
  iso_shape: string;
  iso_clearance: string;
  iso_tolerance: string;
  iso_fixing: string;
  ic_mm: number;
  thickness_mm: number;
  nose_radius_mm: number;
  chipbreaker?: string;
  cutting_edge_count: number;
}
interface VendorStat {
  vendor: string;
  stats: { total_inserts: number; total_grades: number };
}

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-VTC — all 6 schemas registered", () => {
  const ACTIONS = [
    "turning_iso1832_parse",
    "turning_chipbreaker_classify",
    "turning_vendor_insert_search",
    "turning_vendor_grade_recommend",
    "turning_vendor_iso_code_resolve",
    "turning_vendor_catalog_stats",
  ] as const;

  for (const a of ACTIONS) {
    it(`${a} schema is a usable Zod object`, () => {
      expect(typeof TURNING_ACTION_SCHEMAS[a].safeParse).toBe("function");
    });
  }
});

describe("WIRE-UNWIRED-MS0/U-WIRE-VTC — schema rejection paths", () => {
  it("iso1832_parse rejects a designation shorter than 7 chars", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_iso1832_parse.safeParse({ designation: "CNMG" }).success).toBe(false);
  });

  it("iso1832_parse accepts a full designation", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_iso1832_parse.safeParse({ designation: "CNMG120408" }).success).toBe(true);
  });

  it("chipbreaker_classify rejects an empty code", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_chipbreaker_classify.safeParse({ code: "" }).success).toBe(false);
  });

  it("grade_recommend rejects an unknown operation", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_vendor_grade_recommend.safeParse({
      iso_group: "P", operation: "honing",
    }).success).toBe(false);
  });

  it("grade_recommend rejects an unknown substrate", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_vendor_grade_recommend.safeParse({
      iso_group: "P", operation: "roughing", substrate: "diamond_dust",
    }).success).toBe(false);
  });

  it("insert_search rejects a non-integer limit", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_vendor_insert_search.safeParse({ limit: 5.5 }).success).toBe(false);
  });

  it("insert_search accepts an empty query", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_vendor_insert_search.safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-VTC — pure decoders round-trip", () => {
  it("iso1832_parse decodes CNMG120408 to canonical ISO-1832 fields", async () => {
    const r = await invokeHandler(turningHandler, "turning_iso1832_parse", {
      designation: "CNMG120408",
    });
    expect(r.success).toBe(true);
    const d = r.data as ParsedInsert;
    expect(d.iso_shape).toBe("C");        // Rhombic 80°
    expect(d.iso_clearance).toBe("N");    // 0°
    expect(d.iso_tolerance).toBe("M");
    expect(d.iso_fixing).toBe("G");
    expect(d.ic_mm).toBe(12.7);           // ISO_IC_CODES["12"]
    expect(d.thickness_mm).toBe(4.76);    // ISO_THICKNESS_CODES["04"]
    expect(d.nose_radius_mm).toBe(0.8);   // ISO_NOSE_RADIUS_CODES["08"]
    expect(d.cutting_edge_count).toBe(2); // C-shape → 2 edges
  });

  it("iso1832_parse decodes a square insert SNMG to 8 cutting edges", async () => {
    const r = await invokeHandler(turningHandler, "turning_iso1832_parse", {
      designation: "SNMG120408",
    });
    expect(r.success).toBe(true);
    const d = r.data as ParsedInsert;
    expect(d.iso_shape).toBe("S");
    expect(d.cutting_edge_count).toBe(8); // square → 8 usable corners
  });

  it("chipbreaker_classify maps PM→medium, MF→finishing, MR→roughing", async () => {
    const pm = await invokeHandler(turningHandler, "turning_chipbreaker_classify", { code: "PM" });
    const mf = await invokeHandler(turningHandler, "turning_chipbreaker_classify", { code: "MF" });
    const mr = await invokeHandler(turningHandler, "turning_chipbreaker_classify", { code: "MR" });
    expect((pm.data as { chipbreaker_type: string }).chipbreaker_type).toBe("medium");
    expect((mf.data as { chipbreaker_type: string }).chipbreaker_type).toBe("finishing");
    expect((mr.data as { chipbreaker_type: string }).chipbreaker_type).toBe("roughing");
  });

  it("chipbreaker_classify falls back to 'universal' for an unknown code", async () => {
    const r = await invokeHandler(turningHandler, "turning_chipbreaker_classify", { code: "ZZ" });
    expect(r.success).toBe(true);
    expect((r.data as { chipbreaker_type: string }).chipbreaker_type).toBe("universal");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-VTC — CATALOG ACTIVATION (dormant→hydrated)", () => {
  it("catalog_stats hydrates the ~4095-insert catalog (was dead data, zero loader callers)", async () => {
    const r = await invokeHandler(turningHandler, "turning_vendor_catalog_stats", {});
    expect(r.success).toBe(true);
    const data = r.data as { vendors: VendorStat[] };
    // The whole point of this wire: ensureCatalogsLoaded() must fire and
    // populate the catalogs Map. A zero-vendor result means the activation
    // failed (loader still dormant) — that is the regression this guards.
    expect(data.vendors.length).toBeGreaterThan(0);
    const totalInserts = data.vendors.reduce((s, v) => s + v.stats.total_inserts, 0);
    expect(totalInserts).toBeGreaterThan(1000); // Tungaloy+Widia ≈ 4095
  });

  it("insert_search returns real catalog hits for a square-insert query", async () => {
    const r = await invokeHandler(turningHandler, "turning_vendor_insert_search", {
      shape: "S", limit: 25,
    });
    expect(r.success).toBe(true);
    const data = r.data as { inserts: Array<{ iso_shape: string; vendor: string }> };
    expect(data.inserts.length).toBeGreaterThan(0);
    for (const ins of data.inserts) expect(ins.iso_shape).toBe("S");
  });

  it("grade_recommend returns ISO-P roughing grades from the hydrated catalog", async () => {
    const r = await invokeHandler(turningHandler, "turning_vendor_grade_recommend", {
      iso_group: "P", operation: "roughing",
    });
    expect(r.success).toBe(true);
    const data = r.data as { grades: Array<{ iso_groups: string[] }> };
    // Catalog has Tungaloy+Widia P-grades — must return at least one, and
    // every returned grade must legitimately cover ISO-P.
    expect(data.grades.length).toBeGreaterThan(0);
    for (const g of data.grades) expect(g.iso_groups).toContain("P");
  });

  it("iso_code_resolve returns parsed fields + catalog matches", async () => {
    const r = await invokeHandler(turningHandler, "turning_vendor_iso_code_resolve", {
      designation: "CNMG120408",
    });
    expect(r.success).toBe(true);
    const data = r.data as { parsed: ParsedInsert | null; matches: unknown[] };
    expect(data.parsed).not.toBeNull();
    expect(data.parsed!.iso_shape).toBe("C");
    expect(Array.isArray(data.matches)).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-VTC — dispatcher-boundary rejection", () => {
  it("rejects a too-short designation at the dispatcher boundary (success !== true)", async () => {
    const r = await invokeHandler(turningHandler, "turning_iso1832_parse", {
      designation: "CN",
    });
    expect(r.success).not.toBe(true);
  });

  it("rejects an empty chipbreaker code at the dispatcher boundary", async () => {
    const r = await invokeHandler(turningHandler, "turning_chipbreaker_classify", {
      code: "",
    });
    expect(r.success).not.toBe(true);
  });
});
