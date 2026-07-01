/**
 * brand-catalog-tool-search-wire.test.ts — round-trip E2E for the BRAND-CATALOG-APP-WIRING
 * (slot:romeo, 2026-06-19). Proves the EXISTING POST /api/v1/data/tool/search path
 * (routes/data.ts:60 -> toolRegistry.search()) serves the brand catalog once the emitter has
 * written CuttingTool-schema shards into the registry's load dir — the actual route contract,
 * not just the emitter singleton.
 *
 * Isolation: PRISM_TOOLS_DB + PRISM_DATA_DIR are pointed at a fresh temp dir BEFORE the registry
 * (and thus constants.ts) is dynamically imported, so ONLY the emitted fixture loads — deterministic
 * totals. The dynamic import inside beforeAll is required because static ESM imports are hoisted
 * above any top-level env mutation.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Canonical brand-catalog records (real loadBrandCatalog() shape) spanning drill / endmill / insert.
const FIXTURE = [
  { id: "ACCU-D1", brand: "Accupro", category: "drill", type: "drill", diameter_mm: 1.191, oal_mm: 6.75, flute_len_mm: 7.14, geometry_complete: true },
  { id: "ACCU-E6", brand: "Accupro", category: "solid_mill", type: "endmill", diameter_mm: 6, num_flutes: 4, geometry_complete: true },
  { id: "ACCU-D3", brand: "Accupro", category: "drill", type: "drill", diameter_mm: 3, geometry_complete: true },
  { id: "ISC-INS", brand: "Iscar", category: "insert", type: "insert", diameter_mm: 12.7, coating: "TiAlN", geometry_complete: true },
];
const STAMP = "2026-06-19T00:00:00.000Z";

let reg: any;
let TMP: string;

beforeAll(async () => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "brandcat-rt-"));
  process.env.PRISM_TOOLS_DB = path.join(TMP, "tools");
  process.env.PRISM_DATA_DIR = path.join(TMP, "data");
  fs.mkdirSync(process.env.PRISM_TOOLS_DB, { recursive: true });
  fs.mkdirSync(path.join(process.env.PRISM_DATA_DIR, "tools"), { recursive: true }); // empty -> no extra tools

  // emit the fixture as registry shards into the isolated TOOLS_DB
  const { emitRegistryJson } = await import("../../../scripts/emit-brand-catalog-registry-json.mjs");
  const r = emitRegistryJson({ outDir: process.env.PRISM_TOOLS_DB, records: FIXTURE as any, stampedAt: STAMP });
  expect(r.totalTools).toBe(4);

  // import the registry AFTER env is set so constants.ts resolves the temp paths
  const { ToolRegistry } = await import("../registries/ToolRegistry.js");
  reg = new ToolRegistry();
  await reg.load();
});

afterAll(() => {
  delete process.env.PRISM_TOOLS_DB;
  delete process.env.PRISM_DATA_DIR;
  if (TMP) fs.rmSync(TMP, { recursive: true, force: true });
});

describe("brand catalog -> /tool/search wire", () => {
  it("loads only the emitted brand-catalog tools (isolation holds)", () => {
    // every loaded tool is a brand-catalog record (namespaced id) — proves the wire, not leakage
    const all = reg.search({ query: "*", limit: 1000 });
    expect(all.total).toBe(4);
    expect(all.tools.every((t: any) => t.id.startsWith("BC::"))).toBe(true);
    expect(all.tools.every((t: any) => t.source === "brand-catalog")).toBe(true);
  });

  it("text search returns the route envelope {tools,total,hasMore}", () => {
    const res = reg.search({ query: "Accupro", limit: 50 });
    expect(res).toHaveProperty("tools");
    expect(res).toHaveProperty("total");
    expect(res).toHaveProperty("hasMore");
    expect(res.total).toBe(3); // 3 Accupro records
    expect(res.tools.every((t: any) => t.id.startsWith("BC::ACCUPRO::"))).toBe(true);
  });

  it("paginates correctly (limit/offset/hasMore) — the FE's fetchAllLiveToolRows contract", () => {
    const p0 = reg.search({ query: "*", limit: 2, offset: 0 });
    expect(p0.tools.length).toBe(2);
    expect(p0.total).toBe(4);
    expect(p0.hasMore).toBe(true);

    const p1 = reg.search({ query: "*", limit: 2, offset: 2 });
    expect(p1.tools.length).toBe(2);
    expect(p1.hasMore).toBe(false);

    // no id appears on both pages (real slicing, not a constant)
    const ids0 = new Set(p0.tools.map((t: any) => t.id));
    expect(p1.tools.some((t: any) => ids0.has(t.id))).toBe(false);
  });

  it("filters by diameter range over brand tools", () => {
    const big = reg.search({ query: "Accupro", diameter_min: 5 });
    expect(big.total).toBe(1); // only the Ø6 endmill
    expect(big.tools[0].id).toBe("BC::ACCUPRO::ACCU-E6");
  });

  it("filters by type (faceted index over brand tools)", () => {
    const inserts = reg.search({ type: "insert" });
    expect(inserts.total).toBe(1);
    expect(inserts.tools[0].id).toBe("BC::ISCAR::ISC-INS");
    expect(inserts.tools[0].coating).toBe("TiAlN");
  });

  it("filters by manufacturer index", () => {
    const iscar = reg.search({ manufacturer: "Iscar" });
    expect(iscar.total).toBe(1);
    expect(iscar.tools[0].catalog_number).toBe("ISC-INS");
  });

  it("retrieves a brand tool by namespaced id AND original catalog number (GET /tool/:id path)", async () => {
    const byId = await reg.getByIdOrCatalog("BC::ISCAR::ISC-INS");
    expect(byId?.id).toBe("BC::ISCAR::ISC-INS");
    const byCat = await reg.getByIdOrCatalog("ISC-INS");
    expect(byCat?.id).toBe("BC::ISCAR::ISC-INS"); // catalog_number lookup resolves the namespaced tool
  });

  it("empty result is a clean envelope (not a throw) for a no-match query", () => {
    const none = reg.search({ query: "nonexistentbrandxyz", limit: 10 });
    expect(none.total).toBe(0);
    expect(none.tools).toEqual([]);
    expect(none.hasMore).toBe(false);
  });
});
