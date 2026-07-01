/**
 * cadAutomationDispatcher cad_learning_trend wiring (U-CAD-LEARN-TREND).
 *
 * Round-trips THROUGH prism_cad_automation to prove the new cad_learning_trend
 * action is coherent (ACTIONS enum + case + lazy import) and routes to the real
 * CADTrialErrorLearningEngine.getLearningTrend. READ-ONLY: getLearningTrend
 * computes from a copy of the in-memory ledger and mutates nothing, so this test
 * never ingests or touches the persisted ledger (the trend MATH is covered
 * deterministically in CADTrialErrorLearningEngine.test.ts).
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  registerCadAutomationDispatcher,
  CAD_AUTOMATION_ACTIONS,
} from "../tools/dispatchers/cadAutomationDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
function makeStubServer() {
  const tools: CapturedTool[] = [];
  return { tools, tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) { tools.push({ name, handler }); } };
}
let handler: CapturedTool["handler"];
async function invoke(action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && Array.isArray((res as { content?: unknown[] }).content)) {
    const text = (res as { content: Array<{ text?: string }> }).content[0]?.text ?? "";
    try { return JSON.parse(text) as Record<string, unknown>; } catch { return { _raw: text }; }
  }
  return res;
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadAutomationDispatcher(server as unknown as Parameters<typeof registerCadAutomationDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad_automation");
  if (!tool) throw new Error("prism_cad_automation tool was not registered");
  handler = tool.handler;
});

describe("cadAutomationDispatcher cad_learning_trend -- wire", () => {
  it("registers cad_learning_trend in the action enum (anti-regression: additive)", () => {
    expect((CAD_AUTOMATION_ACTIONS as readonly string[]).includes("cad_learning_trend")).toBe(true);
  });

  it("routes to getLearningTrend (real method, NOT 'method not callable'/crash)", async () => {
    const r = await invoke("cad_learning_trend", {});
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(JSON.stringify(r)).not.toMatch(/Cannot read propert/i);
    // proves the case reached the real engine method
    expect(r.source).toBe("CADTrialErrorLearningEngine.getLearningTrend");
    // LearningTrend contract fields are present + correctly typed
    expect(typeof r.sufficientData).toBe("boolean");
    expect(typeof r.improving).toBe("boolean");
    expect(typeof r.earlyFailureRate).toBe("number");
    expect(typeof r.recentFailureRate).toBe("number");
    expect(typeof r.delta).toBe("number");
  });
});
