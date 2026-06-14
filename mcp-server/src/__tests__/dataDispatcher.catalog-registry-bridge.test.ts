/**
 * dataDispatcher — CatalogRegistryBridgeEngine round-trip suite
 * =============================================================
 *
 * WIRING/U-WIRE-CATALOG-REGISTRY-BRIDGE (slot:romeo, 2026-06-03) — wires the
 * previously-unwired CatalogRegistryBridgeEngine into prism_data:
 *   - listMappedCatalogs()        → catalog_registry_list
 *   - getCatalogMappings()        → catalog_registry_mappings
 *   - enrichFromCatalog(mapping)  → catalog_registry_enrich (by catalog name)
 *   - enrichAll()                 → catalog_registry_enrich_all
 *
 * Every assertion calls VIA the dispatcher (not a direct engine import) so it
 * fails if the enum entry, the case, or the lazy import regress.
 *
 * @milestone WIRING
 * @unit U-WIRE-CATALOG-REGISTRY-BRIDGE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";

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

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDataDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. Happy paths — one per wired action
// ─────────────────────────────────────────────────────────────────────
describe("catalog-registry-bridge happy paths — round-trip via prism_data", () => {
  it("catalog_registry_list — returns the mapped catalog names (8 tool + 1 machine = 9)", async () => {
    const r = await call(server, "catalog_registry_list");
    expect(r.ok).toBe(true);
    const catalogs = r.data.catalogs as string[];
    expect(Array.isArray(catalogs)).toBe(true);
    expect(catalogs.length).toBe(9);
    // Spot-check known vendor mappings are present (fails if the mapping table regresses).
    expect(catalogs).toContain("sandvik-tool-catalog");
    expect(catalogs).toContain("kennametal-turning-catalog");
    expect(catalogs).toContain("machine-profiles-catalog");
  });

  it("catalog_registry_mappings — returns the exact per-registry counts {tool:8, machine:1, material:0}", async () => {
    const r = await call(server, "catalog_registry_mappings");
    expect(r.ok).toBe(true);
    expect(r.data.tool).toBe(8);
    expect(r.data.machine).toBe(1);
    expect(r.data.material).toBe(0);
  });

  it("catalog_registry_enrich — known catalog routes to the engine and returns a CatalogEnrichmentResult shape", async () => {
    const r = await call(server, "catalog_registry_enrich", { catalog: "sandvik-tool-catalog" });
    expect(r.ok).toBe(true);
    // Shape-assert (not exact counts — depends on whether the data module is present in test scope).
    expect(r.data.catalog_name).toBe("sandvik-tool-catalog");
    expect(r.data.registry_target).toBe("tool");
    expect(typeof r.data.records_processed).toBe("number");
    expect(Array.isArray(r.data.errors)).toBe(true);
  });

  it("catalog_registry_enrich_all — bulk routes and reports all 9 catalogs processed", async () => {
    const r = await call(server, "catalog_registry_enrich_all");
    expect(r.ok).toBe(true);
    expect(r.data.catalogs_processed).toBe(9);
    expect(Array.isArray(r.data.results)).toBe(true);
    expect((r.data.results as unknown[]).length).toBe(9);
    expect(typeof r.data.processing_time_ms).toBe("number");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability — enrich spans 3 distinct vendor mappings
// ─────────────────────────────────────────────────────────────────────
describe("catalog-registry-bridge variability — distinct vendor mappings", () => {
  for (const catalog of ["kennametal-turning-catalog", "osg-tool-catalog", "guhring-tool-catalog"]) {
    it(`catalog_registry_enrich — ${catalog} routes to tool registry`, async () => {
      const r = await call(server, "catalog_registry_enrich", { catalog });
      expect(r.ok).toBe(true);
      expect(r.data.catalog_name).toBe(catalog);
      expect(r.data.registry_target).toBe("tool");
    });
  }

  it("catalog_registry_enrich — machine-profiles-catalog routes to the machine registry", async () => {
    const r = await call(server, "catalog_registry_enrich", { catalog: "machine-profiles-catalog" });
    expect(r.ok).toBe(true);
    expect(r.data.registry_target).toBe("machine");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Fail-loud rejection — unknown / missing catalog (R12)
// ─────────────────────────────────────────────────────────────────────
describe("catalog-registry-bridge fail-loud rejection", () => {
  it("catalog_registry_enrich — unknown catalog returns a loud error naming the bad input + the valid set", async () => {
    const r = await call(server, "catalog_registry_enrich", { catalog: "does-not-exist-catalog" });
    expect(r.ok).toBe(false);
    expect(String((r.data as { error: string }).error)).toContain("does-not-exist-catalog");
    expect(Array.isArray((r.data as { available: unknown }).available)).toBe(true);
  });

  it("catalog_registry_enrich — missing params.catalog is rejected (not a silent no-op)", async () => {
    const r = await call(server, "catalog_registry_enrich", {});
    expect(r.ok).toBe(false);
    expect(String((r.data as { error: string }).error)).toContain("missing params.catalog");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial edge cases
// ─────────────────────────────────────────────────────────────────────
describe("catalog-registry-bridge adversarial", () => {
  it("catalog_registry_enrich — non-string catalog does not crash the dispatcher", async () => {
    const r = await call(server, "catalog_registry_enrich", { catalog: 12345 as unknown as string });
    // getMapping(12345) → undefined → loud error path; never a thrown crash.
    expect(typeof r.ok).toBe("boolean");
    expect(r.ok).toBe(false);
  });

  it("catalog_registry_list — ignores extraneous params", async () => {
    const r = await call(server, "catalog_registry_list", { junk: true, n: 99 });
    expect(r.ok).toBe(true);
    expect((r.data.catalogs as string[]).length).toBe(9);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Regression guards — wiring + neighbor actions intact
// ─────────────────────────────────────────────────────────────────────
describe("catalog-registry-bridge regression guards", () => {
  it("dispatcher still registers as prism_data with the new actions live", async () => {
    expect(server.tools.length).toBeGreaterThan(0);
    expect(server.tools[0]!.name).toBe("prism_data");
    const r = await call(server, "catalog_registry_mappings");
    expect(r.ok).toBe(true); // new action is not 'Unknown action'
  });

  it("neighbor action regression — tool_enrich_summary still routes", async () => {
    const r = await call(server, "tool_enrich_summary", { tools: [] });
    expect(typeof r.ok).toBe("boolean"); // routes (ok or structured error), not a crash
  });
});
