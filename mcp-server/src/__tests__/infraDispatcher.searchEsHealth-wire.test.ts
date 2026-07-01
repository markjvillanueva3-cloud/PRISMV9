/**
 * prism_infra search_es_health -- SearchIndexEngine (Elasticsearch lexical backend) wire.
 *
 * Closes the SearchIndexEngine orphan with a read-only, gated, additive observability action
 * (distinct from search_semantic which is EmbeddingPipelineEngine vector search). Proves the
 * gated-OFF default path: PRISM_SEARCH_BACKEND unset/file -> es_enabled:false, NO network call,
 * structured disabled result, never a crash. Routed THROUGH the registered dispatcher.
 */

import { describe, it, expect, afterEach } from "vitest";
import { registerInfraDispatcher } from "../tools/dispatchers/infraDispatcher.js";

type Handler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
let capturedHandler: Handler | null = null;
const fakeServer = {
  tool: (_name: string, _desc: string, _schema: unknown, handler: Handler) => {
    capturedHandler = handler;
  },
};
registerInfraDispatcher(fakeServer);
if (!capturedHandler) throw new Error("infraDispatcher did not register handler");
const infraDispatcher = capturedHandler;

const callInfra = async (action: string, params: Record<string, unknown> = {}): Promise<string> => {
  const raw = await infraDispatcher({ action, params });
  const r = raw as { content?: Array<{ text: string }> };
  // Return the stringified result either way so assertions are robust to response wrapping.
  if (r.content?.[0]?.text) return r.content[0].text;
  return JSON.stringify(raw);
};

const PRIOR = process.env.PRISM_SEARCH_BACKEND;
afterEach(() => {
  if (PRIOR === undefined) delete process.env.PRISM_SEARCH_BACKEND;
  else process.env.PRISM_SEARCH_BACKEND = PRIOR;
});

describe("prism_infra search_es_health (SearchIndexEngine wire)", () => {
  it("reaches the engine (no 'is not a function') and reports ES disabled by default", async () => {
    delete process.env.PRISM_SEARCH_BACKEND; // default = file backend
    const out = await callInfra("search_es_health", {});
    expect(out).not.toMatch(/is not a function/);
    expect(out).toMatch(/"es_enabled"\s*:\s*false/);
    expect(out).toMatch(/"backend"\s*:\s*"file"/);
    // Gated OFF: honest disabled note, no live ES health probe (health is null ->
    // slimmed out of the response by slimResponse; its absence confirms no probe ran).
    expect(out).not.toMatch(/"status"\s*:\s*"(green|yellow|red)"/);
    expect(out).toMatch(/disabled/i);
  });

  it("an explicit non-es backend value also reports disabled (no network)", async () => {
    process.env.PRISM_SEARCH_BACKEND = "file";
    const out = await callInfra("search_es_health", {});
    expect(out).toMatch(/"es_enabled"\s*:\s*false/);
    expect(out).not.toMatch(/is not a function/);
  });

  it("rejects a malformed timeout_ms via the registered schema (not a crash)", async () => {
    delete process.env.PRISM_SEARCH_BACKEND;
    const out = await callInfra("search_es_health", { timeout_ms: -5 });
    expect(out).toMatch(/Invalid params/i);
  });
});
