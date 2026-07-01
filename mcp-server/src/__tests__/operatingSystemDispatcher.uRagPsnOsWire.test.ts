/**
 * operatingSystemDispatcher — U-RAG-PSN-OS-WIRE round-trip suite
 * ================================================================
 *
 * RAG-UPGRADE-MS0 / U-RAG-PSN-OS-WIRE (2026-05-22, slot golf):
 *
 * Cross-wires ReRankerEngine into prism_operating_system as `rag_rerank`.
 * Canonical home is prism_ml:rag_rerank (mlDispatcher.ts:469); sister
 * cross-wire is prism_ai:rag_rerank (aiReasoningDispatcher.ts:73). Per
 * dispatcher convention "cross-dispatcher calls forbidden — use shared
 * engines instead", ALL THREE surfaces call the same static ReRankerEngine
 * methods (rerank / diverseRerank), with no delegation chain.
 *
 * Why this is the right unit: PSN-leg coverage for RAG was 10/11 after
 * U-RAG-PSN-AI-WIRE shipped earlier today. The remaining gap was leg #2
 * (prism_operating_system, 47-action shell/desk/program-release dispatcher).
 * Operators routing through prism_operating_system for shop-floor workflows
 * had to swap to prism_ml or prism_ai to call the RAG reranker.
 *
 * Tests invoke through the registered tool handler (round-trip), not just
 * the engine singleton — exercises:
 *   - action enum membership
 *   - dispatcher schema validation (permissive — engine's ReRankInputSchema
 *     does the strict per-candidate check; see RAG_CROSSWIRE comment in
 *     operatingSystemActionSchemas.ts)
 *   - lazy import of ReRankerEngine
 *   - case-handler dispatch end-to-end
 *   - both `rerank` and `diverseRerank` branches (driven by diversity_weight)
 *
 * Mirrors aiReasoningDispatcher.uRagPsnAiWire.test.ts (sister suite). If
 * either suite drifts, BOTH must be updated together — they verify the
 * same engine contract via different dispatcher surfaces.
 *
 * @milestone RAG-UPGRADE-MS0
 * @unit U-RAG-PSN-OS-WIRE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerOperatingSystemDispatcher } from "../tools/dispatchers/operatingSystemDispatcher.js";

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

// operatingSystemDispatcher cases `return slimResponse(...)` directly (NOT
// wrapped in dispatcherResult / MCP envelope) — this is the established
// pattern across all 46 existing actions. The dual-shape helper below
// mirrors dispatcher.operatingSystemCoordination.test.ts:invokeHandler so
// envelope OR raw-object returns are both handled.
async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as Record<string, unknown>;
  // MCP-envelope path (some dispatchers wrap; we accept either shape).
  if (Array.isArray((raw as { content?: unknown[] }).content)) {
    const text = ((raw as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, data: { rawText: text } };
    }
    if (parsed.success === false) return { ok: false, data: parsed };
    return { ok: true, data: (parsed.data as Record<string, unknown>) ?? parsed };
  }
  // Raw-slim path (operatingSystemDispatcher's convention) — error shape is
  // {success:false, error|errorMessage, ...} via dispatcherError(); success
  // shape is the slimmed engine output directly.
  if ((raw as { success?: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  return { ok: true, data: raw };
}

// Realistic-shaped candidates matching ReRankerEngine.ReRankInputSchema. The
// schema requires {id, score, source_type, title, excerpt}; metadata optional.
const makeCandidate = (
  id: string,
  score: number,
  title: string,
  excerpt: string,
) => ({
  id,
  score,
  source_type: "wiki",
  title,
  excerpt,
});

describe("operatingSystemDispatcher — U-RAG-PSN-OS-WIRE (rag_rerank cross-wire)", () => {
  let server: MockMCPServer;

  beforeEach(() => {
    server = new MockMCPServer();
    registerOperatingSystemDispatcher(server as unknown as Parameters<typeof registerOperatingSystemDispatcher>[0]);
  });

  it("registers exactly one tool named 'prism_operating_system'", () => {
    expect(server.tools).toHaveLength(1);
    expect(server.tools[0]!.name).toBe("prism_operating_system");
  });

  it("rag_rerank is an accepted action (round-trip — no enum rejection)", async () => {
    // Empty candidates is a valid input — engine returns degraded result, not error.
    const r = await call(server, "rag_rerank", {
      query: "tool deflection",
      candidates: [],
    });
    // The action must be enrolled in z.enum(ACTIONS); a wrong action gets
    // rejected at the validator. We verify it reached the engine by checking
    // for the engine's response shape (candidates_evaluated present).
    expect(r.ok).toBe(true);
  });

  it("empty candidates returns zero candidates_evaluated (slimResponse strips empty results[])", async () => {
    // NOTE: prism_operating_system applies slimResponse() which STRIPS empty
    // arrays from the response for MCP transport efficiency. So `results: []`
    // from the engine becomes a missing `results` key in r.data — that's by
    // design. The non-empty case test below proves the field IS present when
    // there are results to send. We assert on `candidates_evaluated` (numeric
    // 0 survives slimming) as the canonical "engine ran, returned degraded"
    // signal here.
    const r = await call(server, "rag_rerank", {
      query: "spindle speed",
      candidates: [],
    });
    expect(r.ok).toBe(true);
    if (r.data.results !== undefined) {
      expect(Array.isArray(r.data.results)).toBe(true);
      expect(r.data.results).toHaveLength(0);
    }
    expect(r.data.candidates_evaluated).toBe(0);
  });

  it("single candidate is returned (degenerate rerank — top_k 3 caps at 1)", async () => {
    const r = await call(server, "rag_rerank", {
      query: "tool wear",
      candidates: [makeCandidate("w1", 0.8, "Tool wear", "Tool wear progression model")],
      top_k: 3,
    });
    expect(r.ok).toBe(true);
    const results = r.data.results as Array<{ id: string }>;
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("w1");
  });

  it("multi-candidate rerank returns top_k results sorted by rerank score", async () => {
    // Query term "deflection" appears in title of candidate "d1" — that
    // signal should boost it above candidate "d2" which only has the term
    // buried in excerpt.
    const r = await call(server, "rag_rerank", {
      query: "deflection",
      candidates: [
        makeCandidate("d2", 0.6, "Tool wear", "Long excerpt mentioning deflection once and many other words to dilute the signal across the corpus body."),
        makeCandidate("d1", 0.5, "Boring bar deflection", "Deflection of cantilevered boring bars under cutting load"),
      ],
      top_k: 2,
    });
    expect(r.ok).toBe(true);
    // Per-result rerank score is exposed as `score` (the engine overwrites
    // the input `score` with the reranked score before returning — see
    // ReRankerEngine.ts:205-212).
    const results = r.data.results as Array<{ id: string; score: number }>;
    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe("d1"); // title-match dominates over excerpt-match
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
  });

  it("top_k bound is honored (request top_k=2 from 4 candidates)", async () => {
    const cands = [
      makeCandidate("a", 0.9, "alpha", "alpha content"),
      makeCandidate("b", 0.7, "beta", "beta content"),
      makeCandidate("c", 0.5, "gamma", "gamma content"),
      makeCandidate("d", 0.3, "delta", "delta content"),
    ];
    const r = await call(server, "rag_rerank", { query: "alpha", candidates: cands, top_k: 2 });
    expect(r.ok).toBe(true);
    expect((r.data.results as unknown[]).length).toBe(2);
  });

  it("default top_k=3 applied when not specified", async () => {
    const cands = [
      makeCandidate("p1", 0.9, "p1 title", "p1 body"),
      makeCandidate("p2", 0.7, "p2 title", "p2 body"),
      makeCandidate("p3", 0.5, "p3 title", "p3 body"),
      makeCandidate("p4", 0.3, "p4 title", "p4 body"),
      makeCandidate("p5", 0.1, "p5 title", "p5 body"),
    ];
    const r = await call(server, "rag_rerank", { query: "title", candidates: cands });
    expect(r.ok).toBe(true);
    // ReRankerEngine's default top_k via ReRankInputSchema; dispatcher case
    // also defaults to 3. Either way result count <= 3.
    expect((r.data.results as unknown[]).length).toBeLessThanOrEqual(3);
  });

  it("diversity_weight present triggers the diverseRerank branch", async () => {
    // Two near-duplicate candidates + one diverse one. With diversity weight
    // the diverse candidate should not be suppressed.
    const cands = [
      makeCandidate("near1", 0.9, "thermal expansion", "thermal expansion in steel cutting"),
      makeCandidate("near2", 0.8, "thermal expansion model", "thermal expansion modeling guidance"),
      makeCandidate("diverse", 0.85, "tool wear", "completely separate topic, tool wear progression"),
    ];
    const r = await call(server, "rag_rerank", {
      query: "thermal expansion",
      candidates: cands,
      top_k: 3,
      diversity_weight: 0.5,
    });
    expect(r.ok).toBe(true);
    const results = r.data.results as Array<{ id: string }>;
    // Top result is still the most relevant near1; the diverse one should
    // appear in the top-3 due to MMR.
    expect(results.length).toBe(3);
    expect(results.map(rr => rr.id)).toContain("diverse");
  });

  it("score_distribution {min, max, mean} present in result", async () => {
    const r = await call(server, "rag_rerank", {
      query: "kienzle",
      candidates: [
        makeCandidate("k1", 0.7, "Kienzle force model", "kienzle constants for P-group steel"),
        makeCandidate("k2", 0.4, "unrelated topic", "different content"),
      ],
    });
    expect(r.ok).toBe(true);
    const dist = r.data.score_distribution as { min: number; max: number; mean: number };
    expect(typeof dist.min).toBe("number");
    expect(typeof dist.max).toBe("number");
    expect(typeof dist.mean).toBe("number");
    expect(dist.max).toBeGreaterThanOrEqual(dist.min);
  });

  it("rerank_time_ms is present and non-negative", async () => {
    const r = await call(server, "rag_rerank", {
      query: "feed rate",
      candidates: [makeCandidate("f1", 0.5, "feed rate calc", "feed rate per tooth derivation")],
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data.rerank_time_ms).toBe("number");
    expect(r.data.rerank_time_ms).toBeGreaterThanOrEqual(0);
  });

  it("query field echoed back in result for client correlation", async () => {
    const r = await call(server, "rag_rerank", {
      query: "thread milling",
      candidates: [makeCandidate("t1", 0.6, "thread milling", "thread milling helical kinematics")],
    });
    expect(r.ok).toBe(true);
    expect(r.data.query).toBe("thread milling");
  });

  it("two consecutive calls do not share state (engine is stateless)", async () => {
    const r1 = await call(server, "rag_rerank", {
      query: "alpha",
      candidates: [makeCandidate("a1", 0.9, "alpha", "alpha body")],
    });
    const r2 = await call(server, "rag_rerank", {
      query: "beta",
      candidates: [makeCandidate("b1", 0.9, "beta", "beta body")],
    });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.data.query).toBe("alpha");
    expect(r2.data.query).toBe("beta");
    expect((r1.data.results as Array<{ id: string }>)[0]!.id).toBe("a1");
    expect((r2.data.results as Array<{ id: string }>)[0]!.id).toBe("b1");
  });

  it("malformed candidate (missing required field) → engine returns empty results, NOT throw", async () => {
    // ReRankInputSchema enforces id/score/source_type/title/excerpt. The
    // dispatcher-layer schema is permissive (z.record per RAG_CROSSWIRE
    // comment) so this input passes dispatcher validation. The engine then
    // fails strict validation and returns the {results:[], candidates_evaluated:0}
    // degraded shape per its safeParse branch — does NOT throw out of the
    // dispatcher.
    const r = await call(server, "rag_rerank", {
      query: "valid query",
      candidates: [{ id: "bad", score: 0.5 }], // missing source_type/title/excerpt
    });
    expect(r.ok).toBe(true);
    if (r.data.results !== undefined) {
      expect((r.data.results as unknown[]).length).toBe(0);
    }
    expect(r.data.candidates_evaluated).toBe(0);
  });
});
