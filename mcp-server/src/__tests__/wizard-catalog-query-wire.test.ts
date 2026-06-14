/**
 * Mill + Lathe wizard catalog-query wiring (CATALOG-APP-WIRING-MS0/U8, slot:romeo).
 *
 * Proves the mill (prism_mill) and lathe (prism_turning) galaxies can query the full
 * 62.7K vendor corpus through a dispatcher action — the wizard-app half of the goal.
 *
 * R15-VALIDATE: round-tripped THROUGH each dispatcher, with real numbers. A query for
 * a previously-dormant vendor (Accupro, 0 refs before the corpus loader) must return
 * tools, proving the corpus reaches the wizard galaxies end-to-end.
 */
import { describe, it, expect, beforeEach } from "vitest";

type Handler = (args: { action: string; params: Record<string, unknown> }) => Promise<unknown>;

function makeServer() {
  let handler: Handler | null = null;
  const server = { tool: (_n: string, _d: string, _s: unknown, h: Handler) => { handler = h; } };
  return { server, get: () => handler! };
}

async function call(handler: Handler, action: string, params: Record<string, unknown>) {
  const raw = await handler({ action, params });
  const r = raw as { content?: Array<{ text: string }> };
  if (r.content?.[0]?.text) return JSON.parse(r.content[0].text);
  return raw as Record<string, unknown>;
}

describe("mill wizard catalog query (prism_mill)", () => {
  let mill: Handler;
  let MILL_ACTIONS: readonly string[];
  beforeEach(async () => {
    const { server, get } = makeServer();
    const mod = await import("../tools/dispatchers/millDispatcher.js");
    MILL_ACTIONS = mod.MILL_ACTIONS;
    mod.registerMillDispatcher(server);
    mill = get();
  });

  it("registers mill_tool_catalog_query in the MILL_ACTIONS enum", () => {
    expect(MILL_ACTIONS).toContain("mill_tool_catalog_query");
  });

  it("returns corpus tools for a previously-dormant vendor (Accupro)", async () => {
    const r = await call(mill, "mill_tool_catalog_query", { manufacturer: "Accupro", max_results: 10 });
    expect(r.success).toBe(true);
    expect(r.corpus_ensured).toBe(true);
    expect(r.count as number).toBeGreaterThan(0);            // Accupro tools present (was 0)
    expect(Array.isArray(r.tools)).toBe(true);
    expect((r.tools as unknown[]).length).toBe(r.count);
  });

  it("a corpus query for end mills returns corpus-scale results, not a tiny seed", async () => {
    const r = await call(mill, "mill_tool_catalog_query", { type: "end_mill", max_results: 5000 });
    expect(r.success).toBe(true);
    expect(r.count as number).toBeGreaterThan(100); // many cataloged end mills, not 6 ISO recipes
  });
});

describe("lathe wizard catalog query (prism_turning)", () => {
  let turning: Handler;
  beforeEach(async () => {
    const { server, get } = makeServer();
    const mod = await import("../tools/dispatchers/turningDispatcher.js");
    mod.registerTurningDispatcher(server);
    turning = get();
  });

  it("routes through the outer fall-through into the inner block and returns corpus tools", async () => {
    // This proves the outer-switch fall-through case was added (without it the action
    // would hit the unknown-action default instead of the inner corpus query).
    const r = await call(turning, "turning_tool_catalog_query", { manufacturer: "Korloy", max_results: 10 });
    const data = (r.data ?? r) as Record<string, unknown>;
    expect(data.corpus_ensured).toBe(true);
    expect(data.count as number).toBeGreaterThan(0);          // Korloy (dormant before U1) present
    expect(Array.isArray(data.tools)).toBe(true);
  });
});
