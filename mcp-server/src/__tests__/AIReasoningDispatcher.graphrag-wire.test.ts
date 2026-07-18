/**
 * Round-trip wiring test for prism_ai:graphrag_retrieve
 * (GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC02). Invokes THROUGH executeAIReasoningAction
 * (schema validation + dispatch). Hermetic via fixture find-cache + adjacency
 * pointed at by PRISM_VIZ_FINDCACHE_PATH + PRISM_VIZ_ADJ_PATH.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { graphRAGRetrievalEngine } from "../engines/GraphRAGRetrievalEngine.js";

const FINDCACHE = {
  nodes: [
    { id: "eng.mill.facemill", label: "Face Mill", info: "facing cutter for flat surfaces" },
    { id: "eng.mill.feedcalc", label: "Feed Calculator", info: "chip load and feed rate" },
    { id: "eng.lathe.turn", label: "Turning Tool", info: "lathe insert" },
  ],
};
const ADJ = {
  adjacency: {
    "eng.mill.facemill": { in: [], out: [{ id: "eng.mill.feedcalc", type: "uses" }] },
    "eng.mill.feedcalc": { in: [{ id: "eng.mill.facemill", type: "uses" }], out: [] },
  },
};

let dir: string;
let prevFc: string | undefined;
let prevAdj: string | undefined;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "graphrag-wire-"));
  const fc = join(dir, "find-cache.json");
  writeFileSync(fc, JSON.stringify(FINDCACHE));
  const adj = join(dir, "node-adjacency.json");
  writeFileSync(adj, JSON.stringify(ADJ));
  prevFc = process.env.PRISM_VIZ_FINDCACHE_PATH;
  prevAdj = process.env.PRISM_VIZ_ADJ_PATH;
  process.env.PRISM_VIZ_FINDCACHE_PATH = fc;
  process.env.PRISM_VIZ_ADJ_PATH = adj;
  graphRAGRetrievalEngine._resetCacheForTest(); // defensive: drop any cache from a prior test file
});
afterAll(() => {
  if (prevFc === undefined) delete process.env.PRISM_VIZ_FINDCACHE_PATH;
  else process.env.PRISM_VIZ_FINDCACHE_PATH = prevFc;
  if (prevAdj === undefined) delete process.env.PRISM_VIZ_ADJ_PATH;
  else process.env.PRISM_VIZ_ADJ_PATH = prevAdj;
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("prism_ai:graphrag_retrieve round-trip", () => {
  it("retrieves + ego-expands through the dispatcher", async () => {
    const r = await executeAIReasoningAction("graphrag_retrieve", { query: "face mill feed", noLlm: true, topK: 5 });
    expect(r.success).toBe(true);
    const d = r.data as { entities: { id: string; seed: boolean }[]; entityCount: number; summarizer: string };
    expect(d.entities[0].id).toBe("eng.mill.facemill");
    expect(d.entities[0].seed).toBe(true);
    expect(d.entities.map((e) => e.id)).toContain("eng.mill.feedcalc"); // ego neighbor
    expect(d.summarizer).toBe("extractive"); // noLlm
  });

  it("schema rejects a missing query before the engine runs", async () => {
    const r = await executeAIReasoningAction("graphrag_retrieve", { topK: 3 });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("schema rejects an empty query", async () => {
    const r = await executeAIReasoningAction("graphrag_retrieve", { query: "" });
    expect(r.success).toBe(false);
  });
});
