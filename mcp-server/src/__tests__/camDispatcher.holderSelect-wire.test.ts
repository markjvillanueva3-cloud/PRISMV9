/**
 * camDispatcher U-WIRE-HOLDER-SELECT round-trip tests.
 *
 * Validates 3 new prism_cam actions wiring the dispatcher-DARK HolderSelectionEngine
 * (the verified core of the tool-holder DB, CATALOG-APP-WIRING-MS0/U-HOLDER-SELECT):
 *   cam_holder_select        -> select() : pick a REAL branded holder by taper + shank
 *                               bore-fit (HAIMER/GUHRING/BIG DAISHOWA, 643 unified)
 *   cam_holder_by_type_brand -> byTypeBrand() : the type -> brand library view
 *   cam_holder_stats         -> stats() : counts by brand / type / taper
 *
 * Distinct from dataDispatcher's holder_* actions, which wrap toolHolderDatabaseEngine
 * (the bare v_flange/bt_taper interface set this engine explicitly does NOT own); no
 * engine is double-wired.
 *
 * Pattern (mirrors camDispatcher.uwireCamSubprogSync.test.ts): LIVE dispatcher round-trip
 * via registerCamDispatcher(shim). prism_cam wraps a successful result as
 * content[0].text = JSON.stringify(slimResponse(result)) (engine payload is TOP-LEVEL),
 * and returns raw { success:false } on a schema/throw. slimResponse strips null/undefined
 * /empty but KEEPS false/0 -> a no-match select returns { matched:false } (the null
 * `holder` key is stripped). Engine is a stateless singleton -> no reset.
 *
 * Reference values are REAL (probed against the live branded catalogs 2026-06-15):
 *   total 643 = HAIMER 489 + GUHRING 23 + BIG DAISHOWA 131; types include shrink_fit,
 *   hydraulic, weldon, collet_chuck, power_chuck, milling_chuck, ER. CAT40 shank 3.0 mm
 *   shrink_fit -> a HAIMER shrink-fit bore[3,3]; CAT40 shank 6.35 mm hydraulic -> a
 *   hydraulic holder bore-fitting 6.35.
 *
 * Wired slot:romeo 2026-06-15 -- task #14 (HolderSelectionEngine -> prism_cam).
 *
 * @milestone CATALOG-APP-WIRING-MS0
 * @unit U-WIRE-HOLDER-SELECT
 */

import { describe, it, expect } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerCamDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}
async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find((t) => t.name === "prism_cam") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

describe("U-WIRE-HOLDER-SELECT — HolderSelectionEngine via prism_cam", () => {
  it("registers the prism_cam tool", () => {
    const tool = newServer().tools.find((t) => t.name === "prism_cam");
    expect(tool?.name).toBe("prism_cam");
  });

  // ── cam_holder_stats (whole-catalog load proof) ─────────────────────────
  it("cam_holder_stats reports all 3 branded catalogs loaded", async () => {
    const s = newServer();
    const r = await call(s, "cam_holder_stats");
    expect(r.ok).toBe(true);
    // >= current real totals (won't break if a catalog grows; proves all 3 loaded)
    expect(r.data.total as number).toBeGreaterThanOrEqual(643);
    const byBrand = r.data.byBrand as Record<string, number>;
    expect(byBrand.HAIMER).toBeGreaterThanOrEqual(489);
    expect(byBrand.GUHRING).toBeGreaterThanOrEqual(23);
    expect(byBrand["BIG DAISHOWA"]).toBeGreaterThanOrEqual(131);
    const byType = r.data.byType as Record<string, number>;
    expect(byType.shrink_fit).toBeGreaterThan(0);
    expect(byType.hydraulic).toBeGreaterThan(0);
  });

  // ── cam_holder_select (happy paths) ─────────────────────────────────────
  it("cam_holder_select CAT40 / 3.0mm / shrink_fit -> a fitting HAIMER shrink-fit", async () => {
    const s = newServer();
    const r = await call(s, "cam_holder_select", {
      taper: "CAT40",
      shank_diameter_mm: 3.0,
      type_preference: "shrink_fit",
    });
    expect(r.ok).toBe(true);
    expect(r.data.matched).toBe(true);
    const h = r.data.holder as Record<string, unknown>;
    expect(h.type).toBe("shrink_fit");
    expect(h.taper).toBe("CAT40");
    // shrink-fit is an EXACT-bore holder: bore must equal the 3.0 mm shank
    expect(h.boreMinMm as number).toBeCloseTo(3.0, 2);
    expect(h.boreMaxMm as number).toBeCloseTo(3.0, 2);
    expect(h.brand).toBe("HAIMER");
  });

  it("cam_holder_select honors typePreference=hydraulic at 6.35mm", async () => {
    const s = newServer();
    const r = await call(s, "cam_holder_select", {
      taper: "CAT40",
      shank_diameter_mm: 6.35,
      type_preference: "hydraulic",
    });
    expect(r.ok).toBe(true);
    expect(r.data.matched).toBe(true);
    const h = r.data.holder as Record<string, unknown>;
    expect(h.type).toBe("hydraulic");
    expect(h.taper).toBe("CAT40");
    // range-grip holder: shank within [boreMin, boreMax]
    expect(6.35).toBeGreaterThanOrEqual(h.boreMinMm as number);
    expect(6.35).toBeLessThanOrEqual(h.boreMaxMm as number);
  });

  // ── cam_holder_select (failure + adversarial) ───────────────────────────
  it("cam_holder_select unknown taper -> matched:false (no throw)", async () => {
    const s = newServer();
    const r = await call(s, "cam_holder_select", { taper: "ZZZ99", shank_diameter_mm: 12 });
    expect(r.ok).toBe(true);
    expect(r.data.matched).toBe(false);
    expect(r.data.holder).toBeUndefined(); // null stripped by slimResponse
  });

  it("cam_holder_select NaN shank -> rejected at schema (adversarial; z.number() blocks NaN)", async () => {
    const s = newServer();
    const r = await call(s, "cam_holder_select", { taper: "CAT40", shank_diameter_mm: Number.NaN });
    // NaN is rejected at the validation boundary -- it never reaches the engine
    expect(r.ok).toBe(false);
  });

  it("cam_holder_select negative shank -> matched:false (adversarial, engine guards shank>0)", async () => {
    const s = newServer();
    const r = await call(s, "cam_holder_select", { taper: "CAT40", shank_diameter_mm: -5 });
    expect(r.ok).toBe(true);
    expect(r.data.matched).toBe(false);
  });

  it("cam_holder_select missing taper -> schema error (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "cam_holder_select", { shank_diameter_mm: 10 });
    expect(r.ok).toBe(false);
  });

  it("cam_holder_select missing shank_diameter_mm -> schema error (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "cam_holder_select", { taper: "CAT40" });
    expect(r.ok).toBe(false);
  });

  // ── cam_holder_by_type_brand (library view) ─────────────────────────────
  it("cam_holder_by_type_brand groups type -> brand -> holders", async () => {
    const s = newServer();
    const r = await call(s, "cam_holder_by_type_brand");
    expect(r.ok).toBe(true);
    const lib = r.data.by_type_brand as Record<string, Record<string, unknown[]>>;
    expect(Object.keys(lib)).toContain("shrink_fit");
    expect(Array.isArray(lib.shrink_fit.HAIMER)).toBe(true);
    expect(lib.shrink_fit.HAIMER.length).toBeGreaterThan(0);
  });
});
