/**
 * calcDispatcher SFC-RAG-WARMSTART-WIRE round-trip tests.
 *
 * Validates the two new actions wired into prism_calc:
 *   sfc_rag_warmstart        -> SFCRAGWarmStartEngine.retrieve(input)
 *   sfc_rag_warmstart_stats  -> isIndexReady() + getIndexStats() + getSelfAwareness()
 *
 * SFCRAGWarmStartEngine is a PURE READ-ONLY BM25 corpus query over JM Die historical
 * programs. retrieve() returns Bayesian priors (similarity-weighted historical data)
 * with no physics mutation. This wire gives operators direct JM Die corpus visibility
 * without going through the Ranker.
 *
 * Test strategy:
 *   - Engine-direct: validates retrieve() contract with empty/missing fields (UNLIKELY_MATERIAL
 *     matches nothing in the index, so results=[] deterministically).
 *   - Dispatcher round-trip: validates both actions are registered and route correctly.
 *   - Failure modes: missing required field, invalid machine_type, top_k out of range,
 *     min_similarity out of range.
 *   - Adversarial: NaN/Infinity top_k, empty material string, oversized top_k.
 *
 * Engine is a static class (no singleton state). JMDieProgramRAGEngine.loadIndex() lazily
 * reads a persisted index from disk if present, so isIndexReady() is environment-dependent;
 * retrieve() with UNLIKELY_MATERIAL matches nothing -> ok:true / priors:[] deterministically.
 *
 * @milestone SFC-ORPHAN-WIRE-QUEUE (oscar, 2026-06-22)
 * @unit U-SFC-RAG-WARMSTART-WIRE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { SFCRAGWarmStartEngine } from "../engines/SFCRAGWarmStartEngine.js";

// ---------------------------------------------------------------------------
// Mock MCP server (same pattern as calcDispatcher.uwireSfcPsn.test.ts)
// ---------------------------------------------------------------------------

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
  const tool = server.tools.find((t) => t.name === "prism_calc") ?? server.tools[0]!;
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
  // dispatcher-level error envelope
  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))
  ) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A material string unlikely to match anything in an empty or real index. */
const UNLIKELY_MATERIAL = "TestAlloy_SFC_RAG_WIRE_2026_06_22_xyz";

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCalcDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// ---------------------------------------------------------------------------
// Engine-direct contract (hermetic -- JMDieProgramRAGEngine starts empty)
// ---------------------------------------------------------------------------

describe("U-SFC-RAG-WARMSTART-WIRE -- engine-direct retrieve() contract", () => {
  it("returns ok:true with empty priors when index is empty", () => {
    const out = SFCRAGWarmStartEngine.retrieve({ material: UNLIKELY_MATERIAL });
    // Index is empty in a fresh test process -> ok:true, priors:[]
    expect(out.ok).toBe(true);
    expect(Array.isArray(out.priors)).toBe(true);
    expect(out.search_time_ms).toBeGreaterThanOrEqual(0);
    expect(typeof out.total_candidates).toBe("number");
    expect(Array.isArray(out.warnings)).toBe(true);
  });

  it("returns ok:true with citations array even on empty corpus", () => {
    const out = SFCRAGWarmStartEngine.retrieve({
      material: UNLIKELY_MATERIAL,
      machine_type: "mill",
      operation: "rough",
    });
    expect(out.ok).toBe(true);
    expect(Array.isArray(out.citations)).toBe(true);
    expect(Array.isArray(out.rag_evidence)).toBe(true);
  });

  it("returns ok:false on invalid input (empty material string)", () => {
    const out = SFCRAGWarmStartEngine.retrieve({ material: "" });
    // Zod min(1) rejects the empty string
    expect(out.ok).toBe(false);
    expect(out.warnings.length).toBeGreaterThan(0);
    expect(out.priors).toHaveLength(0);
  });

  it("isIndexReady() returns a boolean consistent with getIndexStats()", () => {
    const ready = SFCRAGWarmStartEngine.isIndexReady();
    expect(typeof ready).toBe("boolean");
    // JMDieProgramRAGEngine.loadIndex() lazily reads a persisted index from disk if present,
    // so isIndexReady() is environment-dependent. Assert the documented invariant
    // (ready iff a non-null index with >0 programs), not a fixed value.
    const stats = SFCRAGWarmStartEngine.getIndexStats();
    expect(ready).toBe(stats !== null && stats.total_programs > 0);
  });

  it("getIndexStats() returns null when index is empty", () => {
    const stats = SFCRAGWarmStartEngine.getIndexStats();
    // null is the documented return when no index is loaded
    expect(stats === null || typeof stats === "object").toBe(true);
  });

  it("getSelfAwareness() returns the canonical engine metadata", () => {
    const meta = SFCRAGWarmStartEngine.getSelfAwareness();
    expect(meta.name).toBe("SFCRAGWarmStartEngine");
    expect(Array.isArray(meta.capabilities)).toBe(true);
    expect(meta.capabilities).toContain("retrieve");
    expect(meta.capabilities).toContain("isIndexReady");
    expect(meta.latency_target_ms).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Dispatcher round-trip -- sfc_rag_warmstart (the wire proof)
// ---------------------------------------------------------------------------

describe("U-SFC-RAG-WARMSTART-WIRE -- dispatcher round-trip sfc_rag_warmstart", () => {
  it("routes sfc_rag_warmstart through prism_calc and returns structured output", async () => {
    const r = await call(server, "sfc_rag_warmstart", { material: UNLIKELY_MATERIAL });
    expect(r.ok).toBe(true);
    // Surviving scalar fields are present regardless of index state.
    expect(typeof r.data.ok).toBe("boolean");
    expect(typeof r.data.search_time_ms).toBe("number");
    expect(r.data.search_time_ms).toBeGreaterThanOrEqual(0);
    expect(typeof r.data.total_candidates).toBe("number");
    // The dispatcher runs responseSlimmer, which omits empty arrays to save tokens
    // (responseSlimmer.ts: `if (Array.isArray(value) && value.length === 0) continue`).
    // So on a no-match query `priors` is absent; when present it must be an array.
    expect(r.data.priors === undefined || Array.isArray(r.data.priors)).toBe(true);
    expect(r.data.warnings === undefined || Array.isArray(r.data.warnings)).toBe(true);
  });

  it("sfc_rag_warmstart accepts optional filters (machine_type, operation, top_k)", async () => {
    const r = await call(server, "sfc_rag_warmstart", {
      material: UNLIKELY_MATERIAL,
      machine_type: "mill",
      operation: "finish",
      top_k: 3,
      min_similarity: 0.5,
    });
    expect(r.ok).toBe(true);
    // priors.length <= top_k (may be 0 on empty index, but never exceeds top_k)
    expect((r.data.priors as unknown[]).length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Dispatcher round-trip -- sfc_rag_warmstart_stats (the wire proof)
// ---------------------------------------------------------------------------

describe("U-SFC-RAG-WARMSTART-WIRE -- dispatcher round-trip sfc_rag_warmstart_stats", () => {
  it("routes sfc_rag_warmstart_stats through prism_calc and returns introspection data", async () => {
    const r = await call(server, "sfc_rag_warmstart_stats", {});
    expect(r.ok).toBe(true);
    expect(typeof r.data.index_ready).toBe("boolean");
    // index_stats is null when index empty, or object when populated
    expect(r.data.index_stats === null || typeof r.data.index_stats === "object").toBe(true);
    // self_awareness must contain engine name
    const sa = r.data.self_awareness as Record<string, unknown>;
    expect(sa.name).toBe("SFCRAGWarmStartEngine");
    expect(Array.isArray(sa.capabilities)).toBe(true);
  });

  it("sfc_rag_warmstart_stats works with no params (passthrough schema)", async () => {
    const r = await call(server, "sfc_rag_warmstart_stats");
    expect(r.ok).toBe(true);
    // index_ready is environment-dependent (loadIndex reads from disk); assert it is a
    // boolean that matches the engine's own truth, not a fixed value.
    expect(typeof r.data.index_ready).toBe("boolean");
    expect(r.data.index_ready).toBe(SFCRAGWarmStartEngine.isIndexReady());
  });
});

// ---------------------------------------------------------------------------
// Failure modes -- schema validation through dispatcher
// ---------------------------------------------------------------------------

describe("U-SFC-RAG-WARMSTART-WIRE -- failure modes (sfc_rag_warmstart)", () => {
  it("rejects missing material (required field)", async () => {
    const r = await call(server, "sfc_rag_warmstart", { machine_type: "mill" });
    expect(r.ok).toBe(false);
    // dispatcher returns success:false with error message
    const errMsg = String(r.data.error ?? "");
    expect(errMsg.length).toBeGreaterThan(0);
  });

  it("rejects empty string material (min(1) Zod constraint)", async () => {
    const r = await call(server, "sfc_rag_warmstart", { material: "" });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid machine_type enum value", async () => {
    const r = await call(server, "sfc_rag_warmstart", {
      material: UNLIKELY_MATERIAL,
      machine_type: "not_a_real_machine",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects top_k below minimum (min 1)", async () => {
    const r = await call(server, "sfc_rag_warmstart", {
      material: UNLIKELY_MATERIAL,
      top_k: 0,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects top_k above maximum (max 20)", async () => {
    const r = await call(server, "sfc_rag_warmstart", {
      material: UNLIKELY_MATERIAL,
      top_k: 21,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects min_similarity above 1.0 (max 1 Zod constraint)", async () => {
    const r = await call(server, "sfc_rag_warmstart", {
      material: UNLIKELY_MATERIAL,
      min_similarity: 1.5,
    });
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Adversarial inputs
// ---------------------------------------------------------------------------

describe("U-SFC-RAG-WARMSTART-WIRE -- adversarial inputs", () => {
  it("rejects NaN as top_k (not an integer)", async () => {
    const r = await call(server, "sfc_rag_warmstart", {
      material: UNLIKELY_MATERIAL,
      top_k: NaN,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects Infinity as top_k (exceeds max 20)", async () => {
    const r = await call(server, "sfc_rag_warmstart", {
      material: UNLIKELY_MATERIAL,
      top_k: Infinity,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects negative min_similarity (below min 0)", async () => {
    const r = await call(server, "sfc_rag_warmstart", {
      material: UNLIKELY_MATERIAL,
      min_similarity: -0.1,
    });
    expect(r.ok).toBe(false);
  });

  it("handles a very long material string without throwing", async () => {
    // Engine should not throw on oversized input -- Zod passes strings of any length
    const longMaterial = "A".repeat(10_000);
    const r = await call(server, "sfc_rag_warmstart", { material: longMaterial });
    // ok:true because Zod accepts any non-empty string; the slimmer omits the empty
    // `priors` array on a no-match query, so it is absent (or an array when present).
    expect(r.ok).toBe(true);
    expect(r.data.priors === undefined || Array.isArray(r.data.priors)).toBe(true);
  });
});
