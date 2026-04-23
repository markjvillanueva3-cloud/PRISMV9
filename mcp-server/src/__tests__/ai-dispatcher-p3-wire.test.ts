/**
 * Tests for prism_ai P3 wiring (confidence_*, cross_cam_*).
 * CAM-ML-CLOSEDLOOP-MS0 U-CMCCL12/13/14
 *
 * Exercises all 9 new P3 actions through the real dispatcher —
 * schema validation, case handlers, engine integration.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { confidenceCommitEventBusEngine } from "../engines/ConfidenceCommitEventBusEngine.js";
import { orchestratorConfidenceFeedbackEngine } from "../engines/OrchestratorConfidenceFeedbackEngine.js";
import { crossCAMComparisonLedgerEngine } from "../engines/CrossCAMComparisonLedgerEngine.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerAIReasoningDispatcher(fakeServer);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("prism_ai confidence_commit bus (U-CMCCL12)", () => {
  let handler: Handler;

  beforeAll(async () => {
    handler = await createServer().handler;
  });

  beforeEach(() => {
    confidenceCommitEventBusEngine.reset();
    orchestratorConfidenceFeedbackEngine.reset();
  });

  it("confidence_commit publishes with full payload", async () => {
    const r = await call(handler, "confidence_commit", {
      decisionId: "a1",
      reasoningMode: "chain_of_thought",
      chosenCam: "mastercam",
      confidence: 0.85,
      timestamp: "2026-04-20T00:00:00Z",
      featureClass: "pocket",
      materialClass: "P",
      machineClass: "mill",
    });
    expect(r.event?.decisionId).toBe("a1");
    expect(r.event?.schemaVersion).toBe(1);
  });

  it("confidence_commit rejects missing required field", async () => {
    const r = await call(handler, "confidence_commit", {
      decisionId: "a2",
      reasoningMode: "deductive",
      chosenCam: "mastercam",
      // confidence missing
      timestamp: "2026-04-20T00:00:00Z",
    });
    expect(r.error).toMatch(/confidence/);
  });

  it("confidence_commit surfaces engine errors (invalid camSystem)", async () => {
    const r = await call(handler, "confidence_commit", {
      decisionId: "a3",
      reasoningMode: "deductive",
      chosenCam: "notacam",
      confidence: 0.5,
      timestamp: "2026-04-20T00:00:00Z",
    });
    expect(r.error).toMatch(/invalid chosenCam/);
  });

  it("confidence_attach_outcome resolves the decision", async () => {
    await call(handler, "confidence_commit", {
      decisionId: "a4",
      reasoningMode: "deductive",
      chosenCam: "fusion360",
      confidence: 0.7,
      timestamp: "2026-04-20T00:00:00Z",
    });
    const r = await call(handler, "confidence_attach_outcome", {
      decisionId: "a4",
      observedAt: "2026-04-20T10:00:00Z",
      agreement: 0.8,
    });
    expect(r.resolved?.outcome?.agreement).toBeCloseTo(0.8, 6);
  });

  it("confidence_attach_outcome rejects missing fields", async () => {
    const r = await call(handler, "confidence_attach_outcome", {
      decisionId: "zzz",
      observedAt: "2026-04-20T10:00:00Z",
      // agreement missing
    });
    expect(r.error).toMatch(/agreement/);
  });

  it("confidence_bus_status reports counts and supported sets", async () => {
    await call(handler, "confidence_commit", {
      decisionId: "bs1",
      reasoningMode: "deductive",
      chosenCam: "nx",
      confidence: 0.5,
      timestamp: "2026-04-20T00:00:00Z",
    });
    const r = await call(handler, "confidence_bus_status", {});
    expect(r.pendingCount).toBe(1);
    expect(r.resolvedCount).toBe(0);
    expect(r.supportedCAMs).toContain("mastercam");
    expect(r.supportedReasoningModes).toContain("chain_of_thought");
  });
});

describe("prism_ai confidence_feedback_* (U-CMCCL13)", () => {
  let handler: Handler;

  beforeAll(async () => {
    handler = await createServer().handler;
  });

  beforeEach(() => {
    orchestratorConfidenceFeedbackEngine.reset();
  });

  it("confidence_feedback_lookup returns neutral prior for unseen cell", async () => {
    const r = await call(handler, "confidence_feedback_lookup", {
      camSystem: "mastercam",
      featureClass: "pocket",
      materialClass: "P",
      machineClass: "mill",
    });
    expect(r.lookup?.posteriorMean).toBeCloseTo(0.5, 10);
    expect(r.lookup?.trusted).toBe(false);
  });

  it("confidence_feedback_lookup rejects missing fields", async () => {
    const r = await call(handler, "confidence_feedback_lookup", {
      camSystem: "mastercam",
      // featureClass missing
      materialClass: "P",
      machineClass: "mill",
    });
    expect(r.error).toMatch(/featureClass/);
  });

  it("confidence_feedback_rank returns sorted candidates", async () => {
    const r = await call(handler, "confidence_feedback_rank", {
      featureClass: "pocket",
      materialClass: "P",
      machineClass: "mill",
      candidates: ["powermill", "nx", "catia"],
    });
    expect(r.ranked).toHaveLength(3);
    // All untrusted → all 0.5 → alphabetical
    expect(r.ranked[0].camSystem).toBe("catia");
  });

  it("confidence_feedback_rank rejects empty candidates", async () => {
    const r = await call(handler, "confidence_feedback_rank", {
      featureClass: "pocket",
      materialClass: "P",
      machineClass: "mill",
      candidates: [],
    });
    expect(r.error).toMatch(/candidates/);
  });

  it("confidence_feedback_config returns current config", async () => {
    const r = await call(handler, "confidence_feedback_config", {});
    expect(r.config?.minSamples).toBeGreaterThanOrEqual(1);
    expect(r.totalCells).toBeGreaterThanOrEqual(0);
  });

  it("confidence_feedback_config accepts valid patch", async () => {
    const r = await call(handler, "confidence_feedback_config", {
      set: { minSamples: 10 },
    });
    expect(r.config?.minSamples).toBe(10);
  });

  it("confidence_feedback_config rejects invalid minSamples", async () => {
    const r = await call(handler, "confidence_feedback_config", {
      set: { minSamples: 0 },
    });
    expect(r.error).toMatch(/minSamples/);
  });
});

describe("prism_ai cross_cam_* (U-CMCCL14)", () => {
  let handler: Handler;

  beforeAll(async () => {
    handler = await createServer().handler;
  });

  beforeEach(() => {
    crossCAMComparisonLedgerEngine.reset();
  });

  it("cross_cam_record accumulates with Wilson interval", async () => {
    const r = await call(handler, "cross_cam_record", {
      camSystem: "mastercam",
      featureClass: "pocket",
      materialClass: "P",
      machineClass: "mill",
      success: 1,
      observedAt: "2026-04-20T00:00:00Z",
    });
    expect(r.accumulator?.n).toBe(1);
    expect(r.accumulator?.successes).toBe(1);
    expect(r.accumulator?.wilsonLower).toBeGreaterThan(0);
  });

  it("cross_cam_record rejects missing fields", async () => {
    const r = await call(handler, "cross_cam_record", {
      camSystem: "mastercam",
      featureClass: "pocket",
      materialClass: "P",
      machineClass: "mill",
      // success missing
      observedAt: "2026-04-20T00:00:00Z",
    });
    expect(r.error).toMatch(/success/);
  });

  it("cross_cam_leaderboard returns ranked entries", async () => {
    // mastercam 9/10, fusion360 5/10
    for (let i = 0; i < 10; i += 1) {
      await call(handler, "cross_cam_record", {
        camSystem: "mastercam",
        featureClass: "pocket",
        materialClass: "P",
        machineClass: "mill",
        success: i < 9 ? 1 : 0,
        observedAt: "2026-04-20T00:00:00Z",
      });
      await call(handler, "cross_cam_record", {
        camSystem: "fusion360",
        featureClass: "pocket",
        materialClass: "P",
        machineClass: "mill",
        success: i < 5 ? 1 : 0,
        observedAt: "2026-04-20T00:00:00Z",
      });
    }
    const r = await call(handler, "cross_cam_leaderboard", {
      featureClass: "pocket",
      materialClass: "P",
      machineClass: "mill",
    });
    expect(r.leaderboard?.topCam).toBe("mastercam");
  });

  it("cross_cam_leaderboard rejects missing featureClass", async () => {
    const r = await call(handler, "cross_cam_leaderboard", {
      materialClass: "P",
      machineClass: "mill",
    });
    expect(r.error).toMatch(/featureClass/);
  });

  it("cross_cam_by_cam filters by CAM system", async () => {
    await call(handler, "cross_cam_record", {
      camSystem: "hypermill",
      featureClass: "pocket",
      materialClass: "P",
      machineClass: "mill",
      success: 1,
      observedAt: "2026-04-20T00:00:00Z",
    });
    await call(handler, "cross_cam_record", {
      camSystem: "hypermill",
      featureClass: "slot",
      materialClass: "M",
      machineClass: "mill",
      success: 0,
      observedAt: "2026-04-20T00:00:00Z",
    });
    await call(handler, "cross_cam_record", {
      camSystem: "mastercam",
      featureClass: "slot",
      materialClass: "M",
      machineClass: "mill",
      success: 1,
      observedAt: "2026-04-20T00:00:00Z",
    });
    const r = await call(handler, "cross_cam_by_cam", { camSystem: "hypermill" });
    expect(r.entries).toHaveLength(2);
    for (const e of r.entries) expect(e.camSystem).toBe("hypermill");
  });

  it("cross_cam_by_cam rejects missing camSystem", async () => {
    const r = await call(handler, "cross_cam_by_cam", {});
    expect(r.error).toMatch(/camSystem/);
  });
});
