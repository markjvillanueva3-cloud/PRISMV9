/**
 * devDispatcher U-WIRE-MILLCORPUS round-trip tests -- MillProgramCorpusEngine.
 *
 * Validates the new mill_corpus_stats action wires through prism_dev:
 *   mill_corpus_stats -> millProgramCorpusEngine.calculate("corpus_stats", {})
 *
 * This exposes the READ-ONLY canonical-corpus summary (axis distribution, sources,
 * part types, operation density) over the server-side mill-program corpus. The
 * fs-WRITE surfaces (corpus_build / persist / buildCorpus) are NOT wired, and the
 * caller corpus_path is deliberately NOT forwarded to calculate() -- the dispatcher
 * always reads the canonical corpus, so there is no path-traversal surface. The
 * engine is fail-soft: an absent corpus -> { total:0, exists:false }, never a throw.
 *
 * computeStats(records) / getCorpus / load(corpusPath) are deferred: getCorpus/load
 * return potentially huge raw record arrays and accept a caller path; computeStats
 * needs the FeatureSequenceRecord contract (owned by foxtrot) for honest record
 * fixtures. The canonical-corpus stats action internally exercises load+computeStats.
 *
 * Pattern mirrors the prior WIRE-UNWIRED-PAPA dispatcher tests.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2
 * (galaxy:foxtrot/juliett engine wired into prism_dev, papa's home dispatcher).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-MILLCORPUS
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { millProgramCorpusEngine } from "../engines/MillProgramCorpusEngine.js";

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
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
      ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// -- Engine-direct contract --------------------------------------------------
describe("U-WIRE-MILLCORPUS -- computeStats / calculate contract", () => {
  it("computeStats([]) yields a zeroed CorpusStats (pure, no fs)", () => {
    const s = millProgramCorpusEngine.computeStats([]);
    expect(s.total).toBe(0);
    expect(s.byAxis).toEqual({ "3": 0, "4": 0, "5": 0 });
    expect(s.withOperations).toBe(0);
    expect(s.totalOperations).toBe(0);
    expect(s.bySource).toEqual({});
    expect(s.byPartType).toEqual({});
  });

  it("computeStats counts axis/source/operations from records", () => {
    const recs = [
      { source: "jm-die", partType: "plate", operations: [{ op: "drill" }, { op: "mill" }] },
      { source: "jm-die", partType: "block", operations: [] },
    ] as unknown as Parameters<typeof millProgramCorpusEngine.computeStats>[0];
    const s = millProgramCorpusEngine.computeStats(recs);
    expect(s.total).toBe(2);
    expect(s.bySource["jm-die"]).toBe(2);
    expect(s.byPartType["plate"]).toBe(1);
    expect(s.byPartType["block"]).toBe(1);
    expect(s.withOperations).toBe(1);       // only the first record has operations
    expect(s.totalOperations).toBe(2);      // 2 + 0
  });

  it("calculate('corpus_stats') returns a fail-soft canonical summary (never throws)", () => {
    const r = millProgramCorpusEngine.calculate("corpus_stats", {}) as {
      ok: boolean; corpusPath: string; exists: boolean; total: number; byAxis: Record<string, number>;
    };
    expect(r.ok).toBe(true);
    expect(typeof r.corpusPath).toBe("string");
    expect(typeof r.exists).toBe("boolean");
    expect(typeof r.total).toBe("number");
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(Object.keys(r.byAxis).sort()).toEqual(["3", "4", "5"]);
  });

  it("calculate() throws on an unknown sub-action (fail-loud)", () => {
    expect(() => millProgramCorpusEngine.calculate("bogus_action", {})).toThrow(/unknown action/);
  });
});

// -- LIVE round-trip through prism_dev (the wire proof) -----------------------
describe("U-WIRE-MILLCORPUS -- dispatcher round-trip (prism_dev)", () => {
  it("mill_corpus_stats returns exactly the engine's canonical summary", async () => {
    const direct = millProgramCorpusEngine.calculate("corpus_stats", {}) as { corpusPath: string; total: number };
    const r = await call(server, "mill_corpus_stats", {});
    expect(r.ok).toBe(true);
    expect(r.data.corpusPath).toBe(direct.corpusPath); // faithful wire: same canonical path
    expect(r.data.total).toBe(direct.total);           // same record count (numeric survivor)
  });

  it("ignores a caller-supplied corpus_path (no path traversal -- canonical only)", async () => {
    const direct = millProgramCorpusEngine.calculate("corpus_stats", {}) as { corpusPath: string };
    // a malicious corpus_path must NOT change which file is read
    const r = await call(server, "mill_corpus_stats", { corpus_path: "/etc/passwd" });
    expect(r.ok).toBe(true);
    expect(r.data.corpusPath).toBe(direct.corpusPath); // still the canonical corpus, NOT the injected path
    expect(String(r.data.corpusPath)).not.toContain("etc");
  });

  it("the mill_corpus_stats action is accepted by the registered dispatcher", async () => {
    const r = await call(server, "mill_corpus_stats", {});
    expect(r.ok).toBe(true);
  });
});
