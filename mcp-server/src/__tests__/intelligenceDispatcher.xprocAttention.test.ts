/**
 * intelligenceDispatcher.xprocAttention.test.ts — U-XPROC-NEURAL-T1-04
 * dispatcher round-trip tests for the 6 LIME/ECE/anomaly actions:
 *   xproc_attention_explain / _ece / _baseline_add / _anomaly /
 *   _baseline_get / _baseline_reset
 *
 * Each test invokes through the dispatcher (not the engine singleton)
 * to verify action enum + handler + return shape.
 *
 * @see src/engines/CrossProcessAttentionExplainEngine.ts
 * @see src/tools/dispatchers/intelligenceDispatcher.ts
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";

import { registerIntelligenceDispatcher } from "../tools/dispatchers/intelligenceDispatcher.js";
import { crossProcessNeuralLearningEngine, INPUT_DIM } from "../engines/CrossProcessNeuralLearningEngine.js";
import { crossProcessAttentionExplainEngine } from "../engines/CrossProcessAttentionExplainEngine.js";
import type { OutcomeRecord } from "../engines/CrossProcessOutcomeStore.js";

const SINGLETON_SEED = 21701;

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"],
    ) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (!res.content) return res;
  const content = res.content as Array<{ text?: string }>;
  const text = content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

function rec(partial: {
  process?: OutcomeRecord["process"];
  bridge?: OutcomeRecord["bridge"];
  outcome?: OutcomeRecord["outcome"];
  request?: OutcomeRecord["request_summary"];
  id?: string;
}): OutcomeRecord {
  return {
    schemaVersion: "1.0",
    id: partial.id ?? "evt-att-disp",
    ts: "2026-05-05T18:00:00.000Z",
    bridge: partial.bridge ?? "sf",
    process: partial.process ?? "mill",
    request_summary: partial.request ?? {},
    response_summary: {},
    outcome: partial.outcome ?? { kind: "pending" },
  };
}

beforeAll(() => {
  const server = makeStubServer();
  registerIntelligenceDispatcher(
    server as unknown as Parameters<typeof registerIntelligenceDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_intelligence");
  if (!tool) throw new Error("prism_intelligence tool not registered");
  handler = tool.handler;
});

describe("intelligenceDispatcher xproc_attention_* (U-XPROC-NEURAL-T1-04)", () => {
  beforeEach(() => {
    crossProcessNeuralLearningEngine.reset(SINGLETON_SEED);
    crossProcessAttentionExplainEngine.resetBaseline();
  });

  it("xproc_attention_explain returns weights/top/r2/baselineProb via dispatcher", async () => {
    const body = await invoke("xproc_attention_explain", {
      record: rec({ process: "mill", bridge: "sf" }),
      opts: { samples: 24, seed: 13 },
    });
    expect(body.success).toBe(true);
    const weights = body.weights as number[];
    // INPUT_DIM (144) — one LIME weight per model input feature; U-NN-FEAT* grew the
    // input vector 32→144, so assert the exported dim (never re-staleizes, still catches wrong-length).
    expect(weights.length).toBe(INPUT_DIM);
    const top = body.top as Array<{ index: number; weight: number }>;
    expect(top.length).toBeLessThanOrEqual(8);
    expect(typeof body.baselineProb).toBe("number");
    expect(body.r2).toBeGreaterThanOrEqual(0);
    expect(body.r2).toBeLessThanOrEqual(1);
  });

  it("xproc_attention_explain without record returns dispatcher error", async () => {
    const body = await invoke("xproc_attention_explain", {});
    expect(body.success).toBe(false);
    expect(String(body.error ?? "")).toContain("record");
  });

  it("xproc_attention_ece on empty input returns ece=0 and totalSamples=0", async () => {
    const body = await invoke("xproc_attention_ece", { records: [] });
    expect(body.success).toBe(true);
    expect(body.ece).toBe(0);
    expect(body.totalSamples).toBe(0);
  });

  it("xproc_attention_ece reports total samples and bin counts that sum correctly", async () => {
    const records = [
      rec({ id: "a", outcome: { kind: "success" } }),
      rec({ id: "b", outcome: { kind: "failure" } }),
      rec({ id: "c", outcome: { kind: "operator_override" } }),
      rec({ id: "d", outcome: { kind: "pending" } }),
    ];
    const body = await invoke("xproc_attention_ece", { records, numBins: 5 });
    expect(body.success).toBe(true);
    expect(body.totalSamples).toBe(3); // pending excluded
    const bins = body.bins as Array<{ count: number }>;
    let total = 0;
    for (const b of bins) total += b.count;
    expect(total).toBe(3);
  });

  it("xproc_attention_baseline_add increments baselineN", async () => {
    const records: OutcomeRecord[] = [];
    for (let i = 0; i < 5; i++) records.push(rec({ id: `b${i}`, process: "mill" }));
    const body = await invoke("xproc_attention_baseline_add", { records });
    expect(body.success).toBe(true);
    expect(body.added).toBe(5);
    expect(body.baselineN).toBe(5);
  });

  it("xproc_attention_baseline_get returns the current snapshot", async () => {
    const records: OutcomeRecord[] = [];
    for (let i = 0; i < 5; i++) records.push(rec({ id: `b${i}` }));
    await invoke("xproc_attention_baseline_add", { records });
    const body = await invoke("xproc_attention_baseline_get");
    expect(body.success).toBe(true);
    expect(body.n).toBe(5);
    const mean = body.mean as number[];
    expect(mean.length).toBe(INPUT_DIM); // INPUT_DIM (144) — baseline mean spans the full input feature vector
  });

  it("xproc_attention_anomaly returns notReady=true with empty baseline", async () => {
    const body = await invoke("xproc_attention_anomaly", {
      record: rec({ id: "x" }),
    });
    expect(body.success).toBe(true);
    expect(body.notReady).toBe(true);
    expect(body.isAnomaly).toBe(false);
  });

  it("xproc_attention_anomaly without record returns dispatcher error", async () => {
    const body = await invoke("xproc_attention_anomaly", {});
    expect(body.success).toBe(false);
    expect(String(body.error ?? "")).toContain("record");
  });

  it("xproc_attention_anomaly returns scored result once baseline is populated", async () => {
    const baseline: OutcomeRecord[] = [];
    for (let i = 0; i < 10; i++) {
      baseline.push(
        rec({
          id: `b${i}`,
          process: "mill",
          bridge: "sf",
          request: { tool_diameter_mm: 6 + (i % 3) },
        }),
      );
    }
    await invoke("xproc_attention_baseline_add", { records: baseline });
    const body = await invoke("xproc_attention_anomaly", {
      record: rec({
        id: "ood",
        process: "wedm",
        bridge: "ai",
        request: { workpiece_thickness_mm: 25 },
      }),
      threshold: 0.5,
    });
    expect(body.success).toBe(true);
    expect(body.notReady).toBe(false);
    expect(body.l1Distance).toBeGreaterThan(0);
    expect(typeof body.maxAbsZ).toBe("number");
  });

  it("xproc_attention_baseline_reset clears the baseline", async () => {
    const records: OutcomeRecord[] = [];
    for (let i = 0; i < 6; i++) records.push(rec({ id: `b${i}` }));
    await invoke("xproc_attention_baseline_add", { records });
    let body = await invoke("xproc_attention_baseline_get");
    expect(body.n).toBe(6);
    const reset = await invoke("xproc_attention_baseline_reset");
    expect(reset.success).toBe(true);
    body = await invoke("xproc_attention_baseline_get");
    expect(body.n).toBe(0);
  });

  it("E2E: baseline_add → anomaly → baseline_reset → anomaly notReady", async () => {
    const baseline: OutcomeRecord[] = [];
    for (let i = 0; i < 8; i++) baseline.push(rec({ id: `b${i}`, process: "mill" }));
    await invoke("xproc_attention_baseline_add", { records: baseline });

    const ready = await invoke("xproc_attention_anomaly", {
      record: rec({ id: "in", process: "mill" }),
    });
    expect(ready.notReady).toBe(false);

    await invoke("xproc_attention_baseline_reset");
    const after = await invoke("xproc_attention_anomaly", {
      record: rec({ id: "in", process: "mill" }),
    });
    expect(after.notReady).toBe(true);
  });
});
