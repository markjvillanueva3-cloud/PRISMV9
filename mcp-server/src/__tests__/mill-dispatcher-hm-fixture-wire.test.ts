/**
 * prism_mill mill_hm_fixture_* wiring test
 * ========================================
 * U-MILL-HM-FIXTURE (slot:bravo, 2026-06-11): wires the structured catalog +
 * part-dims auto-select DATA surface of `MonolithHyperMillFixtureDatabaseEngine`
 * into prism_mill. The engine was dispatcher-dark for these methods -- only its
 * fuzzy `search()` was transitively reachable via CatalogUnifiedQueryEngine
 * (prism_intelligence); `listVises/listChucks/listClamps/getVise/getChuck/
 * autoSelect/stats` were exposed nowhere. These are distinct from the physics
 * `fixture_*`/`workholding_*` force calculators (clamp force / deflection) --
 * this is read-only catalog DATA + deterministic threshold-based selection.
 *
 * The engine is a pure in-memory const catalog (NO disk, NO singleton writes,
 * NO inference), so the round-trip needs no monkeypatch. Assertions check
 * concrete catalog values + the exact monolith-faithful selection thresholds.
 * The dispatcher returns top-level `slimResponse(result)` (no `.data` envelope);
 * slimResponse STRIPS null/empty-array keys, so null-selection results are
 * asserted via the explicit `*_found` booleans (false survives slimming).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerMillDispatcher } from "../tools/dispatchers/millDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerMillDispatcher(fakeServer as any);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("prism_mill mill_hm_fixture_* (U-MILL-HM-FIXTURE)", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer().handler;
  });

  // ---- HAPPY 1: stats reflects the exact monolith catalog cardinality ----
  it("mill_hm_fixture_stats returns 6 vises, 7 chucks, 3 clamp families, total 16", async () => {
    const r = await call(handler, "mill_hm_fixture_stats");
    expect(r.vises).toBe(6);
    expect(r.chucks).toBe(7);
    expect(r.clamp_families).toBe(3);
    expect(r.total).toBe(16);
  });

  // ---- HAPPY 2: the vise/chuck catalogs list every record with its specs ----
  it("mill_hm_fixture_vises lists all 6 vises incl. Centric_6-200 (jawWidth 120, centric)", async () => {
    const r = await call(handler, "mill_hm_fixture_vises");
    expect(Array.isArray(r.vises)).toBe(true);
    expect(r.vises.length).toBe(6);
    const centric = r.vises.find((v: any) => v.id === "Centric_6-200");
    expect(centric?.jawWidth).toBe(120);
    expect(centric?.family).toBe("centric");
    expect(centric?.maxY).toBe(200);
  });

  it("mill_hm_fixture_chucks lists all 7 chucks incl. the three collets", async () => {
    const r = await call(handler, "mill_hm_fixture_chucks");
    expect(r.chucks.length).toBe(7);
    const collets = r.chucks.filter((c: any) => c.family === "collet");
    expect(collets.length).toBe(3);
    const fiveC = r.chucks.find((c: any) => c.id === "5C_Collet");
    expect(fiveC?.colletType).toBe("5C");
    expect(fiveC?.maxDia).toBe(26.5);
  });

  // ---- HAPPY 3: getVise returns the exact record + found flag ----
  it("mill_hm_fixture_get_vise resolves a known id with found=true", async () => {
    const r = await call(handler, "mill_hm_fixture_get_vise", { id: "Standard_8-200" });
    expect(r.found).toBe(true);
    expect(r.vise.id).toBe("Standard_8-200");
    expect(r.vise.maxOpening).toBe(200);
    expect(r.vise.family).toBe("standard");
  });

  // ---- HAPPY 4: auto_select small part -> small fixtures (monolith thresholds) ----
  it("mill_hm_fixture_auto_select for a 150x150x30mm part picks Centric_6-200 / 3_Jaw_Chuck_20-150 / short clamp", async () => {
    const r = await call(handler, "mill_hm_fixture_auto_select", { part_dims: { x: 150, y: 150, z: 30 } });
    expect(r.vise_found).toBe(true);
    expect(r.chuck_found).toBe(true);
    expect(r.clamp_found).toBe(true);
    expect(r.vise).toBe("Centric_6-200");          // maxDim 150 <= 200 (small)
    expect(r.chuck).toBe("3_Jaw_Chuck_20-150");     // dia 150 <= 150 (small)
    expect(r.clamp.size).toBe("080-020");           // z 30 <= 48 (short)
    expect(r.clamp.projection).toBe("06-48");
  });

  // ---- HAPPY 5: auto_select large part crosses every threshold to the big fixtures ----
  it("mill_hm_fixture_auto_select for a 350x450x120mm part picks Centric_6-500 / 3_Jaw_Chuck_20-600 / long clamp", async () => {
    const r = await call(handler, "mill_hm_fixture_auto_select", { part_dims: { x: 350, y: 450, z: 120 } });
    expect(r.vise).toBe("Centric_6-500");           // maxDim 450 > 300
    expect(r.chuck).toBe("3_Jaw_Chuck_20-600");     // dia 450 > 400
    expect(r.clamp.size).toBe("120-050");           // z 120 > 112 (long)
    expect(r.clamp.projection).toBe("120-267");
  });

  // ---- HAPPY 6: search surfaces the collet chucks by family keyword ----
  it("mill_hm_fixture_search 'collet' returns the 3 collet chucks, each _kind chuck", async () => {
    const r = await call(handler, "mill_hm_fixture_search", { query: "collet" });
    expect(r.count).toBe(3);
    expect(r.hits.every((h: any) => h._kind === "chuck")).toBe(true);
    expect(r.hits.every((h: any) => h.family === "collet")).toBe(true);
  });

  // ---- FAILURE 1: get_vise without an id is rejected by the guard ----
  it("mill_hm_fixture_get_vise rejects a missing id", async () => {
    const r = await call(handler, "mill_hm_fixture_get_vise", {});
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("id");
  });

  // ---- FAILURE 2: auto_select without part_dims is rejected by the guard ----
  it("mill_hm_fixture_auto_select rejects a missing part_dims object", async () => {
    const r = await call(handler, "mill_hm_fixture_auto_select", {});
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("part_dims");
  });

  // ---- ADVERSARIAL 1: an unknown id returns found=false, not a throw ----
  it("mill_hm_fixture_get_chuck on an unknown id returns found=false (no throw)", async () => {
    const r = await call(handler, "mill_hm_fixture_get_chuck", { id: "NONEXISTENT_CHUCK" });
    expect(r.found).toBe(false);
    // vise/chuck null key is stripped by slimResponse -- the found flag is the contract
    expect(r.chuck).toBe(undefined);
  });

  // ---- ADVERSARIAL 2: invalid X/Y dims null out vise+chuck but a valid Z still selects a clamp ----
  it("mill_hm_fixture_auto_select with negative x / NaN y nulls vise+chuck but still selects a clamp from valid z", async () => {
    const r = await call(handler, "mill_hm_fixture_auto_select", { part_dims: { x: -5, y: Number.NaN, z: 10 } });
    expect(r.vise_found).toBe(false);
    expect(r.chuck_found).toBe(false);
    expect(r.clamp_found).toBe(true);
    expect(r.clamp.projection).toBe("06-48"); // z 10 <= 48 -> short clamp
  });

  // ---- ADVERSARIAL 3: get_vise on an unknown id returns found=false (symmetric w/ get_chuck) ----
  it("mill_hm_fixture_get_vise on an unknown id returns found=false (no throw)", async () => {
    const r = await call(handler, "mill_hm_fixture_get_vise", { id: "NOT_A_REAL_VISE" });
    expect(r.found).toBe(false);
    expect(r.vise).toBe(undefined); // null key stripped by slimResponse
  });

  // ---- BOUNDARY: dia 151 crosses the chuck small->medium cutoff (<=150 small); z 60 crosses clamp short->medium ----
  it("mill_hm_fixture_auto_select at the 151mm/60mm boundary flips chuck to 20-400 and clamp to medium", async () => {
    const r = await call(handler, "mill_hm_fixture_auto_select", { part_dims: { x: 151, y: 151, z: 60 } });
    expect(r.vise).toBe("Centric_6-200");        // maxDim 151 still <= 200 (small)
    expect(r.chuck).toBe("3_Jaw_Chuck_20-400");  // dia 151 > 150 -> medium
    expect(r.clamp.size).toBe("080-040");        // z 60 in (48,112] -> medium
    expect(r.clamp.projection).toBe("70-112");
  });
});
