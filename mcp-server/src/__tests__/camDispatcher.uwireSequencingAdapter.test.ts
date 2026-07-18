/**
 * camDispatcher U-WIRE-SEQUENCING-ADAPTER round-trip tests -- IntelligentSequencingAdapter.
 *
 * Validates the new sequence_select_orchestrated action wires through prism_cam:
 *   sequence_select_orchestrated -> intelligentSequencingAdapter.selectSequenceOrchestrated(req)
 *
 * The Adapter (NOT the base engine -- the base IntelligentSequencingEngine is already
 * wired INTERNALLY into the PrintToProgram pipelines, CAMX-MS0.3) scores 5 candidate
 * sequencing strategies (FULL/MINIMAL/TOOL_GROUPED/THERMAL_SAFE/QUALITY) via the
 * PipelineDecisionOrchestrator, executes the winner, and returns the full sequenced
 * result. Output: { strategy, result, tool_change_savings_pct, thermal_gaps_inserted,
 * decision, no_candidates }. Pure read/decision surface (no fs, no mutation).
 *
 * NOTE: this is a DIFFERENT surface from the existing `sequence_operations` action
 * (camDispatcher) which calls the CAM engine's raw `sequenceOperations()`. The
 * orchestrated 5-strategy adapter had no dispatcher action until this wire.
 *
 * Content-sensitive proofs (a stub that ignored the request would fail these):
 *   - an EMPTY operations list takes the deterministic no_candidates branch:
 *     { no_candidates:true, strategy:"MINIMAL", result.operations:[], savings:0 }.
 *   - a non-empty list preserves every input op id through the sequencing (real
 *     machining ops are never the inserted thermal_wait/probing ops the filters drop).
 *   - the orchestrated reorder never INCREASES tool changes vs the input ordering.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2
 * (galaxy:kilo engine wired into prism_cam; committed to shared tree w/ slot:papa->kilo
 * attribution -- kilo not live + its slot worktree is stale-without-the-engine).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-SEQUENCING-ADAPTER
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { IntelligentSequencingAdapter } from "../engines/IntelligentSequencingAdapter.js";

const STRATEGIES = ["FULL", "MINIMAL", "TOOL_GROUPED", "THERMAL_SAFE", "QUALITY"];

// A realistic op list: roughing+finishing mix (triggers thermal logic) with
// interleaved tools T1,T2,T1,T3,T4 -> 4 tool changes (a tool-grouping opportunity).
const OPS = [
  { id: "op1", type: "roughing", operation: "pocket_rough", tool_id: "T1", phase: 1 },
  { id: "op2", type: "finishing", operation: "wall_finish", tool_id: "T2", phase: 5 },
  { id: "op3", type: "roughing", operation: "face_rough", tool_id: "T1", phase: 1 },
  { id: "op4", type: "drilling", operation: "drill", tool_id: "T3", phase: 2 },
  { id: "op5", type: "parting", operation: "cutoff", tool_id: "T4", phase: 7 },
];

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
  const tool = server.tools.find((t) => t.name === "prism_cam") ?? server.tools[0]!;
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

type SeqReq = Parameters<IntelligentSequencingAdapter["selectSequenceOrchestrated"]>[0];

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// -- Engine-direct reference behavior ----------------------------------------
describe("U-WIRE-SEQUENCING-ADAPTER -- selectSequenceOrchestrated contract", () => {
  it("an empty operations list takes the deterministic no_candidates branch", () => {
    const eng = new IntelligentSequencingAdapter();
    const d = eng.selectSequenceOrchestrated({ decision_point: "p2p.sequence_order", operations: [] } as unknown as SeqReq);
    expect(d.no_candidates).toBe(true);
    expect(d.strategy).toBe("MINIMAL");            // the explicit empty-list strategy
    expect(d.result.operations.length).toBe(0);
    expect(d.tool_change_savings_pct).toBe(0);
  });

  it("a non-empty list selects a real strategy and preserves every input op id", () => {
    const eng = new IntelligentSequencingAdapter();
    const d = eng.selectSequenceOrchestrated({ decision_point: "p2p.sequence_order", operations: OPS } as unknown as SeqReq);
    expect(d.no_candidates).toBe(false);
    expect(STRATEGIES).toContain(d.strategy);       // a catalog strategy, not a fabrication
    const outIds = new Set(d.result.operations.map((o) => o.id));
    for (const op of OPS) expect(outIds.has(op.id)).toBe(true); // sequencing reorders but never drops a real machining op
    expect(typeof d.tool_change_savings_pct).toBe("number");
  });

  it("the orchestrated reorder never increases tool changes vs the input ordering", () => {
    const eng = new IntelligentSequencingAdapter();
    const d = eng.selectSequenceOrchestrated({ decision_point: "p2p.sequence_order", operations: OPS, objective: "cost" } as unknown as SeqReq);
    expect(d.no_candidates).toBe(false);
    expect(d.result.tool_changes).toBeLessThanOrEqual(4); // input ordering has 4 changes; reorder can only hold or reduce
    expect(d.tool_change_savings_pct).toBeGreaterThanOrEqual(0);
    expect(d.tool_change_savings_pct).toBeLessThanOrEqual(100);
  });
});

// -- LIVE round-trip through prism_cam (the wire proof) -----------------------
describe("U-WIRE-SEQUENCING-ADAPTER -- dispatcher round-trip (prism_cam)", () => {
  it("sequence_select_orchestrated returns a sequenced result through the dispatcher", async () => {
    const r = await call(server, "sequence_select_orchestrated", { decision_point: "p2p.sequence_order", operations: OPS });
    expect(r.ok).toBe(true);
    expect(r.data.blocked).toBeUndefined();                                  // not blocked by a pre-toolpath hook
    expect(r.data.no_candidates).toBe(false);                                // false survives slimResponse
    expect(STRATEGIES).toContain(r.data.strategy as string);
    expect(typeof r.data.tool_change_savings_pct).toBe("number");
  });

  it("an empty operations array round-trips the no_candidates branch", async () => {
    const r = await call(server, "sequence_select_orchestrated", { decision_point: "p2p.sequence_order", operations: [] });
    expect(r.ok).toBe(true);
    expect(r.data.no_candidates).toBe(true);                                 // true survives slimResponse
    expect(r.data.strategy).toBe("MINIMAL");
  });
});

// -- Schema validation through the dispatcher (adversarial) -------------------
describe("U-WIRE-SEQUENCING-ADAPTER -- schema rejection (prism_cam)", () => {
  it("rejects a missing decision_point", async () => {
    const r = await call(server, "sequence_select_orchestrated", { operations: OPS });
    expect(r.ok).toBe(false);
  });

  it("rejects a missing operations field (operations is required)", async () => {
    const r = await call(server, "sequence_select_orchestrated", { decision_point: "p2p.sequence_order" });
    expect(r.ok).toBe(false);
  });

  it("rejects an invalid objective", async () => {
    const r = await call(server, "sequence_select_orchestrated", { decision_point: "p2p.sequence_order", operations: OPS, objective: "fastest" });
    expect(r.ok).toBe(false);
  });

  it("rejects an operation missing the required 'type' field", async () => {
    const r = await call(server, "sequence_select_orchestrated", { decision_point: "p2p.sequence_order", operations: [{ id: "x", operation: "rough" }] });
    expect(r.ok).toBe(false);
  });
});
