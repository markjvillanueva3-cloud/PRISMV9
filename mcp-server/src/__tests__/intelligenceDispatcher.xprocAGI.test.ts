/**
 * intelligenceDispatcher.xprocAGI.test.ts — U-XPROC-NEURAL-T1-05
 * dispatcher round-trip tests for xproc_agi_compose.
 *
 * @see src/engines/CrossProcessAGIBridge.ts
 * @see src/tools/dispatchers/intelligenceDispatcher.ts
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";

import { registerIntelligenceDispatcher } from "../tools/dispatchers/intelligenceDispatcher.js";
import { crossProcessNeuralLearningEngine } from "../engines/CrossProcessNeuralLearningEngine.js";

const SINGLETON_SEED = 91501;

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

beforeAll(() => {
  const server = makeStubServer();
  registerIntelligenceDispatcher(
    server as unknown as Parameters<typeof registerIntelligenceDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_intelligence");
  if (!tool) throw new Error("prism_intelligence tool not registered");
  handler = tool.handler;
});

describe("intelligenceDispatcher xproc_agi_compose (U-XPROC-NEURAL-T1-05)", () => {
  beforeEach(() => {
    crossProcessNeuralLearningEngine.reset(SINGLETON_SEED);
  });

  it("xproc_agi_compose returns a populated envelope", async () => {
    const body = await invoke("xproc_agi_compose", {
      request: { intent: "mill a part from 4140" },
    });
    expect(body.success).toBe(true);
    expect(["mill", "lathe", "wedm"]).toContain(body.routedProcess);
    expect(["proceed", "review", "reject"]).toContain(body.recommendation);
    const blended = body.blended as Record<string, number>;
    const sum = blended.mill + blended.lathe + blended.wedm;
    expect(sum).toBeCloseTo(1, 6);
  });

  it("xproc_agi_compose surfaces classification, keyword, neural, outcomeRisk", async () => {
    const body = await invoke("xproc_agi_compose", {
      request: { intent: "turn a shaft on lathe" },
    });
    expect(body.success).toBe(true);
    const classification = body.classification as Record<string, unknown>;
    expect(["mill", "lathe", "wedm"]).toContain(classification.process);
    const keyword = body.keyword as Record<string, number>;
    expect(keyword.mill + keyword.lathe + keyword.wedm).toBeCloseTo(1, 6);
    const neural = body.neural as Record<string, number>;
    expect(neural.mill + neural.lathe + neural.wedm).toBeCloseTo(1, 6);
    const risk = body.outcomeRisk as Record<string, number>;
    expect(risk.success + risk.failure + risk.operator_override).toBeCloseTo(1, 6);
  });

  it("xproc_agi_compose without request returns dispatcher error", async () => {
    const body = await invoke("xproc_agi_compose", {});
    expect(body.success).toBe(false);
    expect(String(body.error ?? "")).toContain("request");
  });

  it("xproc_agi_compose with non-string intent returns dispatcher error", async () => {
    const body = await invoke("xproc_agi_compose", { request: { intent: 123 } });
    expect(body.success).toBe(false);
    expect(String(body.error ?? "")).toContain("intent");
  });

  it("xproc_agi_compose mixWeight=0 yields blended=keyword", async () => {
    const body = await invoke("xproc_agi_compose", {
      request: { intent: "mill" },
      opts: { mixWeight: 0 },
    });
    const blended = body.blended as Record<string, number>;
    const keyword = body.keyword as Record<string, number>;
    expect(blended.mill).toBeCloseTo(keyword.mill, 9);
    expect(blended.lathe).toBeCloseTo(keyword.lathe, 9);
    expect(blended.wedm).toBeCloseTo(keyword.wedm, 9);
  });

  it("xproc_agi_compose mixWeight=1 yields blended=neural", async () => {
    const body = await invoke("xproc_agi_compose", {
      request: { intent: "mill" },
      opts: { mixWeight: 1 },
    });
    const blended = body.blended as Record<string, number>;
    const neural = body.neural as Record<string, number>;
    expect(blended.mill).toBeCloseTo(neural.mill, 9);
    expect(blended.lathe).toBeCloseTo(neural.lathe, 9);
    expect(blended.wedm).toBeCloseTo(neural.wedm, 9);
  });

  it("xproc_agi_compose recommendationReason is populated", async () => {
    const body = await invoke("xproc_agi_compose", {
      request: { intent: "wire EDM die" },
    });
    expect(body.success).toBe(true);
    expect(typeof body.recommendationReason).toBe("string");
    expect(String(body.recommendationReason).length).toBeGreaterThan(5);
  });
});
