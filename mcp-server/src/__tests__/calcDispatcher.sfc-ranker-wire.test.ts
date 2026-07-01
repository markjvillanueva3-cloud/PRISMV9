/**
 * sfc_rank_hypotheses + sfc_ranker_stats -- calcDispatcher wiring test
 * (OSCAR-SFC-SELFLEARN-WIRE, bravo 2026-06-11)
 * ============================================================================
 * Wires the orphan SFCMultiHypothesisRankerEngine (FALSE // WIRE-EXEMPT marker;
 * zero real callers) so the SFC Bayesian candidate-ranking primitive is reachable.
 * Round-tripped THROUGH the dispatcher; parity-asserted against the direct static
 * engine call (deterministic). use_rag_priors:false keeps it self-contained.
 */
import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { SFCMultiHypothesisRankerEngine } from "../engines/SFCMultiHypothesisRankerEngine.js";

interface CapturedTool {
  name: string;
  handler: (a: { action: string; params: Record<string, unknown> }) => Promise<unknown>;
}
function createMockServer() {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
  return { server, tools };
}
async function callAction(tool: CapturedTool, action: string, params: Record<string, unknown> = {}) {
  const out = await tool.handler({ action, params });
  const r = out as { content?: Array<{ text: string }> };
  const text = r?.content?.[0]?.text;
  return (text ? JSON.parse(text) : out) as Record<string, unknown>;
}
const { server, tools } = createMockServer();
registerCalcDispatcher(server);
const calc = tools[0];

const THREE = {
  material: "4140 Steel",
  iso_group: "M",
  use_rag_priors: false,
  candidates: [
    { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0, source_confidence: 0.7 },
    { source: "adapter", sfm: 280, fpt: 0.12, doc: 1.8, source_confidence: 0.9 },
    { source: "rag", sfm: 320, fpt: 0.08, doc: 2.2, source_confidence: 0.6 },
  ],
};

describe("sfc_rank_hypotheses + sfc_ranker_stats -- SFC Bayesian ranker wiring", () => {
  it("ranks 3 candidates: ok, 3 ranked, sequential ranks, posterior_score descending", async () => {
    const r = await callAction(calc, "sfc_rank_hypotheses", THREE);
    expect(r.success).toBe(true);
    expect(r.ok).toBe(true);
    const rc = r.ranked_candidates as Array<{ rank: number; posterior_score: number; source: string }>;
    expect(rc.length).toBe(3);
    expect(rc.map((c) => c.rank)).toEqual([1, 2, 3]);
    for (let i = 1; i < rc.length; i++) expect(rc[i - 1].posterior_score).toBeGreaterThanOrEqual(rc[i].posterior_score);
  });

  it("dispatcher result == direct static engine call (deterministic parity, proves real pass-through)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod-inferred input, fields validated by the engine
    const direct = SFCMultiHypothesisRankerEngine.rank(THREE as any);
    const via = await callAction(calc, "sfc_rank_hypotheses", THREE);
    const vrc = via.ranked_candidates as Array<{ source: string; rank: number }>;
    expect(vrc.length).toBe(direct.ranked_candidates.length);
    expect(vrc.map((c) => c.source)).toEqual(direct.ranked_candidates.map((c) => c.source));
    expect(vrc.map((c) => c.rank)).toEqual(direct.ranked_candidates.map((c) => c.rank));
  });

  it("top_k limits the ranked set (5 candidates, top_k 2 -> 2 ranked)", async () => {
    const r = await callAction(calc, "sfc_rank_hypotheses", {
      material: "Steel", use_rag_priors: false, top_k: 2,
      candidates: [
        { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
        { source: "adapter", sfm: 280, fpt: 0.12, doc: 1.8 },
        { source: "rag", sfm: 320, fpt: 0.08, doc: 2.2 },
        { source: "iql", sfm: 310, fpt: 0.09, doc: 2.1 },
        { source: "hybrid", sfm: 295, fpt: 0.11, doc: 1.9 },
      ],
    });
    expect((r.ranked_candidates as unknown[]).length).toBe(2);
  });

  it("empty candidates -> success:false descriptive error (R12, no crash)", async () => {
    const r = await callAction(calc, "sfc_rank_hypotheses", { material: "Steel", candidates: [] });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/non-empty array/);
  });

  it("missing candidates array -> success:false", async () => {
    const r = await callAction(calc, "sfc_rank_hypotheses", { material: "Steel" });
    expect(r.success).toBe(false);
  });

  it("missing material -> success:false", async () => {
    const r = await callAction(calc, "sfc_rank_hypotheses", {
      candidates: [{ source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 }],
    });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/material/);
  });

  it("adversarial: negative sfm is zod-rejected by the engine -> ok:false + warning, NOT a crash", async () => {
    const r = await callAction(calc, "sfc_rank_hypotheses", {
      material: "Steel", use_rag_priors: false,
      candidates: [{ source: "formula", sfm: -100, fpt: 0.1, doc: 2.0 }],
    });
    // The dispatcher ran (structural guards passed) ...
    expect(r.success).toBe(true);
    // ... but the engine zod-validates sfm > 0 and fails LOUD with ok:false + a warning,
    // rather than ranking a physically-invalid negative cutting speed.
    expect(r.ok).toBe(false);
    const warn = Array.isArray(r.warnings) ? (r.warnings as string[]).join(" ") : String(r.warnings ?? "");
    expect(warn).toMatch(/Invalid input|sfm|too_small/i);
  });

  it("sfc_ranker_stats -> ready boolean + self_awareness object", async () => {
    const r = await callAction(calc, "sfc_ranker_stats");
    expect(r.success).toBe(true);
    expect(typeof r.ready).toBe("boolean");
    expect(r.self_awareness).toBeTruthy();
  });
});
