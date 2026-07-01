/**
 * Round-trip wiring test for prism_dev:community_summary
 * (GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC06). Invokes THROUGH the registered devDispatcher
 * handler (schema validation + dispatch), summarizing the REAL ENGINE_DIGEST.md
 * catalog (live-data E2E) -- extractive default, no Ollama, no network.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_n: string, _d: string, _s: any, fn: Handler) { resolve(fn); },
  };
  registerDevDispatcher(fakeServer);
  return { handler };
}
async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try { return JSON.parse(text); } catch { return r; }
}

describe("devDispatcher · community_summary wiring (E2E round-trip on real catalog)", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer().handler;
  });

  it("summarizes a single domain (Lathe) -> token-bounded extractive summary", async () => {
    const r = await call(handler, "community_summary", { domain: "Lathe" });
    expect(r.success).toBe(true);
    expect(r.data.domain).toBe("Lathe");
    expect(r.data.count).toBeGreaterThan(0); // the real catalog has lathe engines
    expect(r.data.method).toBe("extractive"); // no useLlm -> deterministic
    expect(r.data.tokens).toBeGreaterThan(0);        // produced a real summary
    expect(r.data.tokens).toBeLessThanOrEqual(300);  // token-bounded (<= hard ceiling)
    expect(r.data.summary).toContain("Lathe");
  }, 30_000);

  it("summarizes ALL clusters -> every cluster token-bounded, deterministic order", async () => {
    const r = await call(handler, "community_summary", {});
    expect(r.success).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBeGreaterThanOrEqual(5); // >=5 domains on the real catalog
    expect(r.data.every((c: any) => c.tokens <= 300)).toBe(true);
    const domains = r.data.map((c: any) => c.domain);
    expect(domains).toEqual([...domains].sort());
  }, 30_000);

  it("schema rejects maxTokens over the ceiling (300)", async () => {
    const r = await call(handler, "community_summary", { domain: "Mill", maxTokens: 5000 });
    // schema caps maxTokens at 300 -> validation error surfaced, engine not run
    expect(JSON.stringify(r)).toMatch(/Invalid|error|max/i);
  }, 30_000);
});
