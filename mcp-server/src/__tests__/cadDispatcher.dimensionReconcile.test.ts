/**
 * cadDispatcher.dimensionReconcile.test.ts — round-trip wire test for the
 * `cad_dimension_reconcile` action (XRAY cross-source dimension determination).
 * Invokes THROUGH prism_cad (not the engine singleton) to prove the ACTIONS enum +
 * static import + switch case are coherent. Engine math is covered independently by
 * CrossSourceDimensionReconciliationEngine.test.ts.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}
function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, _description: string, _schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, handler });
    },
  };
}
let handler: CapturedTool["handler"];
async function invoke(action: string, params: Record<string, unknown> = {}): Promise<any> {
  const res = (await handler({ action, params })) as any;
  if (res && res.success === false) return res;
  const text = res?.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return { __raw: text }; }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

describe("cadDispatcher cad_dimension_reconcile (XRAY cross-source dimension determination)", () => {
  it("3 sources agreeing on a diameter → confirmed consensus through the dispatcher", async () => {
    const res = await invoke("cad_dimension_reconcile", {
      candidates: [
        { value_mm: 10.0, type: "diameter", source: "print", confidence: 0.7 },
        { value_mm: 10.02, type: "diameter", source: "cad", confidence: 0.95 },
        { value_mm: 9.99, type: "diameter", source: "cnc", confidence: 0.9 },
      ],
    });
    expect(res.success).toBe(true);
    expect(res.data.dimensions).toHaveLength(1);
    expect(res.data.dimensions[0].status).toBe("confirmed");
    expect(res.data.dimensions[0].sources.length).toBe(3);          // all 3 sources touch the cluster
    expect(res.data.dimensions[0].metric_sources.length).toBe(2);   // but only print+cad vote the value
    expect(res.data.dimensions[0].cnc_presence).toBe(true);         // CNC corroborates presence only
    expect(res.data.dimensions[0].value_trusted).toBe(true);
    expect(res.data.dimensions[0].confidence).toBe(0.985);          // noisy-OR of 2 METRIC sources (cnc excluded)
    expect(res.data.coverage.multi_source_rate).toBe(1);
  });

  it("a CNC-only feature round-trips as presence_only with an untrusted value (metric_sources slimmed away)", async () => {
    const res = await invoke("cad_dimension_reconcile", {
      candidates: [{ value_mm: 12.0, type: "diameter", source: "cnc", confidence: 0.9 }],
    });
    expect(res.success).toBe(true);
    expect(res.data.dimensions).toHaveLength(1);
    const d = res.data.dimensions[0];
    // status + value_trusted are the canonical, WIRE-SAFE presence signals (string + false survive slimResponse)
    expect(d.status).toBe("presence_only");
    expect(d.value_trusted).toBe(false);
    expect(d.cnc_presence).toBe(true);
    // metric_sources:[] is stripped by slimResponse over the wire — read it defensively, never .length
    expect(d.metric_sources ?? []).toEqual([]);
    expect(res.data.coverage.presence_only).toBe(1);
  });

  it("labeled cross-source disagreement → flagged conflict (not averaged) through the dispatcher", async () => {
    const res = await invoke("cad_dimension_reconcile", {
      candidates: [
        { value_mm: 10.0, type: "diameter", source: "print", label: "bore", confidence: 0.7 },
        { value_mm: 12.0, type: "diameter", source: "cad", label: "bore", confidence: 0.95 },
      ],
    });
    expect(res.success).toBe(true);
    expect(res.data.conflicts).toHaveLength(1);
    expect(res.data.conflicts[0].label).toBe("bore");
  });

  it("no candidates → honest empty report, no crash", async () => {
    const res = await invoke("cad_dimension_reconcile", {});
    expect(res.success).toBe(true);
    expect(res.data.coverage.total).toBe(0);
    // NOTE: the dispatcher runs result through slimResponse(), which strips empty
    // arrays for transport (responseSlimmer.ts:24) — so dimensions/conflicts come
    // back ABSENT, not []. That is the real wire contract; the strict []==[] case is
    // asserted against the engine directly in CrossSourceDimensionReconciliationEngine.test.ts.
    expect(res.data.dimensions ?? []).toEqual([]);
    expect(res.data.conflicts ?? []).toEqual([]);
  });
});
