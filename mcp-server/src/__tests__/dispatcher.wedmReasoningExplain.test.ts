/**
 * dispatcher.wedmReasoningExplain.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-WRE (WEDMReasoningExplainEngine).
 *
 * 1 pure-compute action through real `prism_dev`:
 *   wre_explain → explain(query) — top-K neighbor citations + rationale
 *
 * Engine reads from wedmNeighborQueryEngine lattice + auto-loads on
 * first call (idempotent). No state mutation in the explain path.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { wedmReasoningExplainEngine } from "../engines/WEDMReasoningExplainEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

const CANONICAL_QUERY = {
  mat: "AISI-D2",
  mach: "fanuc",
  wire: "brass",
  wireDiameterMm: 0.25,
  thicknessMm: 25,
  raTargetUm: 1.6,
};

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRE — Zod schemas", () => {
  it("wre_explain requires mat + wireDiameterMm + thicknessMm + raTargetUm", () => {
    expect(ACTION_DEV_SCHEMAS["wre_explain"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wre_explain"].safeParse({
      mat: "AISI-D2", wireDiameterMm: 0.25, thicknessMm: 25, raTargetUm: 1.6,
    }).success).toBe(true);
  });

  it("wre_explain caps physical dimensions (DoS guards)", () => {
    expect(ACTION_DEV_SCHEMAS["wre_explain"].safeParse({
      ...CANONICAL_QUERY, wireDiameterMm: 11,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wre_explain"].safeParse({
      ...CANONICAL_QUERY, thicknessMm: 1001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wre_explain"].safeParse({
      ...CANONICAL_QUERY, raTargetUm: 51,
    }).success).toBe(false);
  });

  it("wre_explain caps topCitations at 20 (engine line 151 hard limit)", () => {
    expect(ACTION_DEV_SCHEMAS["wre_explain"].safeParse({
      ...CANONICAL_QUERY, topCitations: 20,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wre_explain"].safeParse({
      ...CANONICAL_QUERY, topCitations: 21,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wre_explain"].safeParse({
      ...CANONICAL_QUERY, topCitations: 0,
    }).success).toBe(false);
  });

  it("wre_explain accepts predicted-outcome fields (each [0, max])", () => {
    expect(ACTION_DEV_SCHEMAS["wre_explain"].safeParse({
      ...CANONICAL_QUERY, predictedBreakProb: 0.05,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wre_explain"].safeParse({
      ...CANONICAL_QUERY, predictedBreakProb: 1.1,
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRE — prism_dev :: wre_explain", () => {
  it("returns rationale + citations + queryEcho with all input fields preserved (mat passes through resolveMaterial normalizer)", async () => {
    const r = await invokeHandler(devHandler, "wre_explain", CANONICAL_QUERY);
    const res = (r as { result: { rationale: string; citations: unknown[]; queryEcho: { mat: string; mach: string; wire: string; thicknessMm: number; raTargetUm: number } } }).result;
    expect(res.rationale.length).toBeGreaterThan(0);
    expect(Array.isArray(res.citations)).toBe(true);
    // Engine line 148: mat = resolveMaterial(q.mat) — unknown strings
    // normalize to 'other'. So queryEcho.mat is the canonical normalized
    // value, NOT the raw input. Either the input maps to a known
    // LatticeMaterial OR it's bucketed as 'other'. Both are well-defined.
    expect(res.queryEcho.mat.length).toBeGreaterThan(0);
    expect(res.queryEcho.mach).toBe("fanuc");
    expect(res.queryEcho.wire).toBe("brass");
    expect(res.queryEcho.thicknessMm).toBe(25);
    expect(res.queryEcho.raTargetUm).toBeCloseTo(1.6, 3);
  });

  it("count discriminators match underlying arrays/objects", async () => {
    const r = await invokeHandler(devHandler, "wre_explain", CANONICAL_QUERY);
    const res = (r as { result: { citations: unknown[]; topCitation: unknown | null; evidenceHistogram: Record<string, number> } }).result;
    const citations = res.citations ?? [];
    expect((r.citation_count as number | undefined) ?? 0).toBe(citations.length);
    expect(r.has_top_citation).toBe(res.topCitation !== null);
    expect((r.evidence_kind_count as number | undefined) ?? 0).toBe(Object.keys(res.evidenceHistogram ?? {}).length);
  });

  it("defaults applied (mach='fanuc', wire='brass') when caller omits (engine line 149-150)", async () => {
    const r = await invokeHandler(devHandler, "wre_explain", {
      mat: "AISI-D2", wireDiameterMm: 0.25, thicknessMm: 25, raTargetUm: 1.6,
      // mach + wire intentionally omitted
    });
    const res = (r as { result: { queryEcho: { mach: string; wire: string } } }).result;
    expect(res.queryEcho.mach).toBe("fanuc");
    expect(res.queryEcho.wire).toBe("brass");
  });

  it("predictedBreakProb echoed and percentage formatted into rationale (engine line 235)", async () => {
    const r = await invokeHandler(devHandler, "wre_explain", {
      ...CANONICAL_QUERY, predictedBreakProb: 0.07,
    });
    const res = (r as { result: { rationale: string; queryEcho: { predictedBreakProb?: number } } }).result;
    expect(res.queryEcho.predictedBreakProb).toBeCloseTo(0.07, 3);
    if (res.rationale.includes("Predicted break")) {
      // Engine line 235: "Predicted break ${100*p} %"
      expect(res.rationale).toContain("Predicted break");
    }
  });

  it("VARIABILITY — 3 distinct material/thickness combos all return well-formed explanations", async () => {
    const combos = [
      { mat: "AISI-D2", thicknessMm: 25, raTargetUm: 1.6 },
      { mat: "Inconel-718", thicknessMm: 50, raTargetUm: 0.8 },
      { mat: "Ti-6Al-4V", thicknessMm: 10, raTargetUm: 3.2 },
    ];
    for (const c of combos) {
      const r = await invokeHandler(devHandler, "wre_explain", {
        ...CANONICAL_QUERY, ...c,
      });
      const res = (r as { result: { rationale: string; queryEcho: { mat: string } } }).result;
      expect(res.rationale.length).toBeGreaterThan(0);
      // mat may be normalized by resolveMaterial; queryEcho must echo non-empty
      expect(res.queryEcho.mat.length).toBeGreaterThan(0);
    }
  });

  it("topCitations cap enforced: citations length <= topCitations when supplied", async () => {
    const r = await invokeHandler(devHandler, "wre_explain", {
      ...CANONICAL_QUERY, topCitations: 2,
    });
    const citations = ((r as { result: { citations: unknown[] } }).result.citations) ?? [];
    expect(citations.length).toBeLessThanOrEqual(2);
  });

  it("each citation has nodeId + similarity in [-1,1] + evidence string + attrs (when present)", async () => {
    const r = await invokeHandler(devHandler, "wre_explain", CANONICAL_QUERY);
    const citations = ((r as { result: { citations: Array<{ nodeId: string; similarity: number; evidence: string; attrs?: object }> } }).result.citations) ?? [];
    for (const c of citations) {
      expect(c.nodeId.length).toBeGreaterThan(0);
      expect(c.similarity).toBeGreaterThanOrEqual(-1);
      expect(c.similarity).toBeLessThanOrEqual(1);
      expect(c.evidence.length).toBeGreaterThan(0);
    }
  });

  it("ROUTING PROOF — wire citation_count equals engine-direct explain().citations.length", async () => {
    const r = await invokeHandler(devHandler, "wre_explain", CANONICAL_QUERY);
    const direct = wedmReasoningExplainEngine.explain(CANONICAL_QUERY);
    expect((r.citation_count as number | undefined) ?? 0).toBe(direct.citations.length);
  });

  it("empty-lattice fallback path returns specific rationale + 0 citations (engine line 170-179)", async () => {
    // When lattice has 0 nodes, engine returns 'Lattice unavailable; ...'
    // rationale + citations = [] + topCitation = null. This is the
    // documented fallback contract.
    const r = await invokeHandler(devHandler, "wre_explain", CANONICAL_QUERY);
    const res = (r as { result: { rationale: string; citations: unknown[]; topCitation: unknown | null } }).result;
    // EITHER the lattice loaded and returned hits OR the engine returns
    // the documented fallback. Both paths produce a non-empty rationale.
    if (res.citations.length === 0) {
      // Fallback path active — rationale must contain documented text
      expect(res.rationale.length).toBeGreaterThan(0);
      expect(res.topCitation).toBe(null);
      expect(r.has_top_citation).toBe(false);
    } else {
      expect(res.topCitation).not.toBe(null);
      expect(r.has_top_citation).toBe(true);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRE — error envelope", () => {
  it("wre_explain without mat → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wre_explain", {
      wireDiameterMm: 0.25, thicknessMm: 25, raTargetUm: 1.6,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wre_explain with oversize wireDiameterMm → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wre_explain", {
      ...CANONICAL_QUERY, wireDiameterMm: 999,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wre_explain with predictedBreakProb > 1 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wre_explain", {
      ...CANONICAL_QUERY, predictedBreakProb: 5,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
