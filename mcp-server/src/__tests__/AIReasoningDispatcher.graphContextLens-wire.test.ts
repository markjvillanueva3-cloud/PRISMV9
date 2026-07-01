/**
 * Round-trip wiring test for prism_ai:graph_context_lens_extract
 * (GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC01). Invokes THROUGH executeAIReasoningAction
 * (schema validation + dispatch), not the engine singleton directly. Hermetic via
 * a fixture adjacency sidecar pointed at by PRISM_VIZ_ADJ_PATH.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const FIXTURE = {
  adjacency: {
    "eng.mill.facemill": { in: [], out: [{ id: "eng.mill.endmill", type: "uses" }] },
    "eng.mill.endmill": { in: [{ id: "eng.mill.facemill", type: "uses" }], out: [] },
    "eng.lathe.turn": { in: [], out: [] },
  },
};

let dir: string;
let prevEnv: string | undefined;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "gcle-wire-"));
  const f = join(dir, "fix-node-adjacency.json");
  writeFileSync(f, JSON.stringify(FIXTURE));
  prevEnv = process.env.PRISM_VIZ_ADJ_PATH;
  process.env.PRISM_VIZ_ADJ_PATH = f;
});
afterAll(() => {
  if (prevEnv === undefined) delete process.env.PRISM_VIZ_ADJ_PATH;
  else process.env.PRISM_VIZ_ADJ_PATH = prevEnv;
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("prism_ai:graph_context_lens_extract round-trip", () => {
  it("ego-graph success through the dispatcher", async () => {
    const r = await executeAIReasoningAction("graph_context_lens_extract", {
      nodeId: "eng.mill.facemill",
      hops: 1,
      enrich: false,
    });
    expect(r.success).toBe(true);
    const d = r.data as { center: string; nodeCount: number; edgeCount: number };
    expect(d.center).toBe("eng.mill.facemill");
    expect(d.nodeCount).toBe(2);
    expect(d.edgeCount).toBe(1);
  });

  it("domain slice through the dispatcher", async () => {
    const r = await executeAIReasoningAction("graph_context_lens_extract", { domain: "mill", enrich: false });
    expect(r.success).toBe(true);
    expect((r.data as { nodeCount: number }).nodeCount).toBe(2);
  });

  it("mermaid render through the dispatcher", async () => {
    const r = await executeAIReasoningAction("graph_context_lens_extract", {
      nodeId: "eng.mill.facemill",
      hops: 1,
      format: "mermaid",
      enrich: false,
    });
    expect(r.success).toBe(true);
    expect(String((r.data as { rendered: string }).rendered).startsWith("graph LR")).toBe(true);
  });

  it("rejects when neither nodeId nor domain given (schema refine -> 400 before engine)", async () => {
    const r = await executeAIReasoningAction("graph_context_lens_extract", { hops: 2 });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error as string).length).toBeGreaterThan(0);
  });
});
