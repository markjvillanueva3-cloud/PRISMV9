/**
 * cadAutomationDispatcher cad_learning tribal-injection wiring (U-CAD-LEARN-TRIBAL-INJECT).
 *
 * Round-trips THROUGH prism_cad_automation to prove the knowledge-injection arm is
 * wired: cad_learning_recommend feeds CADTribalDrawInjectionEngine + the tracked CAD
 * tribal corpus into CADTrialErrorLearningEngine.recommendAdjustments and surfaces the
 * curated lessons as recommendation.tribalTips. READ-ONLY: recommendAdjustments computes
 * from a copy of in-memory state and persists nothing, so this test never touches the
 * live ledger (the dedupe/sort/cap MATH + record persistence are covered deterministically
 * in CADTrialErrorLearningEngine.test.ts).
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
  return {
    tools,
    tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
}
let handler: CapturedTool["handler"];
async function invoke(action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && Array.isArray((res as { content?: unknown[] }).content)) {
    const text = (res as { content: Array<{ text?: string }> }).content[0]?.text ?? "";
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { _raw: text };
    }
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

describe("cadAutomationDispatcher cad_learning tribal-injection -- wire", () => {
  it("cad_learning_recommend stays in the action enum (anti-regression: additive)", () => {
    expect((CAD_AUTOMATION_ACTIONS as readonly string[]).includes("cad_learning_recommend")).toBe(true);
  });

  it("routes to recommendAdjustments and surfaces the curated CAD tribal lessons as tribalTips", async () => {
    const r = await invoke("cad_learning_recommend", { candidate: { features: ["topology"] } });
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(r.source).toBe("CADTrialErrorLearningEngine.recommendAdjustments");
    expect(Array.isArray(r.tribalTips)).toBe(true);
    const tips = r.tribalTips as Array<{ id: string; tip: string; relevanceScore: number }>;
    // delta-tribal-004 ("topology before tolerance") has universal consume "all cad mutation"
    // -> it is always matched by the real ranker, so the wiring reliably injects it.
    expect(tips.map((t) => t.id)).toContain("delta-tribal-004");
    expect(tips.every((t) => typeof t.tip === "string" && t.tip.length > 0)).toBe(true);
    expect(tips.every((t) => typeof t.relevanceScore === "number")).toBe(true);
  });

  it("disable_tribal=true injects no tribal lessons (escape hatch)", async () => {
    const r = await invoke("cad_learning_recommend", { candidate: {}, disable_tribal: true });
    expect(r.source).toBe("CADTrialErrorLearningEngine.recommendAdjustments");
    // The engine returns tribalTips:[] (verified exactly in the engine test); the dispatcher's
    // responseSlimmer prunes empty arrays, so over the wire the field is absent. Either way: no tips.
    expect((r.tribalTips ?? []) as unknown[]).toEqual([]);
  });

  it("tribal_corpus override is honored (caller-supplied corpus, not the tracked default)", async () => {
    const r = await invoke("cad_learning_recommend", {
      candidate: { features: ["custom"] },
      tribal_corpus: [
        {
          id: "custom-tip-1",
          slug: "custom-lesson",
          kind: "doctrine",
          tip: "Custom shop lesson applies to all cad mutation.",
          consume: "all cad mutation",
          source: "unit-test",
          domain: "cad",
        },
      ],
    });
    const tips = r.tribalTips as Array<{ id: string }>;
    expect(tips.map((t) => t.id)).toContain("custom-tip-1");
    // the tracked-default lessons are NOT present when an override corpus is supplied
    expect(tips.map((t) => t.id)).not.toContain("delta-tribal-004");
  });

  // R15 wiring proof for the closed-loop retrain-signal action (read-only: getLoopEfficacy
  // computes from in-memory state and writes nothing, so this never touches the live ledger).
  it("cad_learning_efficacy round-trips to getLoopEfficacy (closed-loop retrain signal)", async () => {
    const r = await invoke("cad_learning_efficacy", {});
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(JSON.stringify(r)).not.toMatch(/Cannot read propert/i);
    expect(r.source).toBe("CADTrialErrorLearningEngine.getLoopEfficacy");
    // LoopEfficacy contract fields present + correctly typed (lift = baseline - followed).
    expect(typeof r.issued).toBe("number");
    expect(typeof r.attributed).toBe("number");
    expect(typeof r.pending).toBe("number");
    expect(typeof r.lift).toBe("number");
    expect(typeof r.brierScore).toBe("number");
    expect(typeof r.sufficientData).toBe("boolean");
  });

  // U-CAD-LEARN-CALIBRATE wiring proofs (read-only: recommendAdjustments/getLoopEfficacy
  // compute from a copy of in-memory state and persist nothing; the calibration MATH is
  // covered deterministically in CADTrialErrorLearningEngine.test.ts).
  it("cad_learning_recommend attaches the self-calibration block by default", async () => {
    const r = await invoke("cad_learning_recommend", { candidate: { partType: "calib-probe" } });
    expect(r.source).toBe("CADTrialErrorLearningEngine.recommendAdjustments");
    expect(typeof r.calibration).toBe("object");
    const c = (r.calibration ?? {}) as { rawRiskScore?: number; applied?: boolean };
    expect(typeof c.rawRiskScore).toBe("number"); // raw aggregate estimate preserved alongside the corrected risk
  });

  it("disable_calibrate=true omits the calibration block (escape hatch)", async () => {
    const r = await invoke("cad_learning_recommend", { candidate: { partType: "calib-probe" }, disable_calibrate: true });
    expect(r.source).toBe("CADTrialErrorLearningEngine.recommendAdjustments");
    expect(r.calibration).toBeUndefined();
  });

  it("cad_learning_efficacy surfaces calibrationApplied + calibrationShift (measurement -> action)", async () => {
    const r = await invoke("cad_learning_efficacy", {});
    expect(r.source).toBe("CADTrialErrorLearningEngine.getLoopEfficacy");
    expect(typeof r.calibrationApplied).toBe("boolean");
    if ("calibrationShift" in r) expect(typeof r.calibrationShift).toBe("number");
  });
});
