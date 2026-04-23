/**
 * wedm-dl-core-dispatcher.test.ts — E2E round-trip tests through edmDispatcher
 * for MS-P4-DL-CORE actions.
 *
 * Validates the COMPREHENSIVE-BUILD wiring contract: every engine action in
 * this milestone must be invocable through the dispatcher pathway (schema +
 * lazy import + case branch), not only through the engine singleton.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";

// Dynamically imported to avoid MCP boot side-effects during module load.
let invoke: (action: string, params?: any) => Promise<any>;
let wedmJobOutcomeEngine: any;
let wedmLoRAAdapterEngine: any;
let wedmEWCMemoryEngine: any;
let wedmFewShotMaterialEngine: any;

// Minimal in-process MCP server stand-in — captures the handler that
// registerEdmDispatcher passes to `server.tool()` and lets tests invoke it.
class FakeServer {
  private handler: ((args: { action: string; params: any }) => Promise<any>) | null = null;
  tool(_name: string, _desc: string, _schema: any, handler: any) {
    this.handler = handler;
  }
  async call(action: string, params: any = {}) {
    if (!this.handler) throw new Error("dispatcher not registered");
    return this.handler({ action, params });
  }
}

beforeAll(async () => {
  const [{ registerEdmDispatcher }, joe, lora, ewc, fewshot] = await Promise.all([
    import("../tools/dispatchers/edmDispatcher.js"),
    import("../engines/WEDMJobOutcomeEngine.js"),
    import("../engines/WEDMLoRAAdapterEngine.js"),
    import("../engines/WEDMEWCMemoryEngine.js"),
    import("../engines/WEDMFewShotMaterialEngine.js"),
  ]);
  wedmJobOutcomeEngine = joe.wedmJobOutcomeEngine;
  wedmLoRAAdapterEngine = lora.wedmLoRAAdapterEngine;
  wedmEWCMemoryEngine = ewc.wedmEWCMemoryEngine;
  wedmFewShotMaterialEngine = fewshot.wedmFewShotMaterialEngine;
  const srv = new FakeServer();
  registerEdmDispatcher(srv as any);
  invoke = async (action, params) => {
    const resp = await srv.call(action, params ?? {});
    // dispatcher returns { content: [{ type: "text", text: "<JSON>" }] }
    if (resp?.content?.[0]?.text) {
      try { return JSON.parse(resp.content[0].text); }
      catch { return resp.content[0].text; }
    }
    return resp;
  };
});

beforeEach(() => {
  wedmJobOutcomeEngine._resetForTests();
  wedmLoRAAdapterEngine._resetForTests();
  wedmEWCMemoryEngine._resetForTests();
  wedmFewShotMaterialEngine._resetForTests();
});

describe("MS-P4-DL-CORE dispatcher E2E", () => {
  it("wedm_learn_from_job → records and exposes via wedm_job_history_stats", async () => {
    const outcome = {
      jobId: "e2e-1",
      finishedAt: "2026-04-20T10:00:00.000Z",
      material: "D2",
      thicknessMm: 20,
      wireDiameterMm: 0.25,
      wireMaterial: "brass",
      controller: "mitsubishi",
      predicted: { raUm: 1.2, cycleTimeMin: 45, wireBreaks: 0 },
      actual: { raUm: 1.3, cycleTimeMin: 48, wireBreaks: 0 },
      recipe: { peakCurrentA: 8, pulseOnUs: 4, pulseOffUs: 24, wireTensionN: 12 },
      recordedBy: "e2e",
    };
    const rec = await invoke("wedm_learn_from_job", outcome);
    // response is slimmed to { result, metadata } — unwrap if wrapped
    const payload = rec?.result ?? rec;
    expect(payload.accepted).toBe(true);
    const stats = await invoke("wedm_job_history_stats", {});
    const statsPayload = stats?.result ?? stats;
    expect(statsPayload.totalJobs).toBe(1);
  });

  it("wedm_lora_create → forward round-trip returns base output when scale=0", async () => {
    await invoke("wedm_lora_create", { name: "e2e-lora", rank: 4, alpha: 8, dIn: 2, dOut: 1, seed: 1 });
    await invoke("wedm_lora_set_scale", { name: "e2e-lora", scale: 0 });
    const fwd = await invoke("wedm_lora_forward", {
      name: "e2e-lora", x: [1, 2], W0: [[3, 4]],
    });
    const payload = fwd?.result ?? fwd;
    // W0·x = 3·1 + 4·2 = 11
    expect(payload.y).toEqual([11]);
  });

  it("wedm_ewc_schedule returns Chaudhry 2018 presets via dispatcher", async () => {
    const mnist = await invoke("wedm_ewc_schedule", { preset: "mnist-like" });
    const payload = mnist?.result ?? mnist;
    expect(payload.lambda).toBe(100);
    expect(payload.gamma).toBe(0.97);
  });

  it("wedm_fewshot_bootstrap + wedm_fewshot_predict work end-to-end", async () => {
    const samples = [
      { x: [0.25], target: [0.2] },
      { x: [0.5],  target: [0.7] },
      { x: [0.75], target: [1.2] },
    ];
    const baseLinear = { W0: [[2]], b: [0] }; // base(x) = 2·x
    const r = await invoke("wedm_fewshot_bootstrap", {
      material: "E2E-D2", samples, dIn: 1, dOut: 1,
      rank: 4, alpha: 8, lr: 0.1, nEpochs: 300, seed: 7,
      baseLinear,
    });
    const bootstrapPayload = r?.result ?? r;
    expect(bootstrapPayload.accepted).toBe(true);
    expect(bootstrapPayload.improvementPct).toBeGreaterThan(20);
    const pred = await invoke("wedm_fewshot_predict", { material: "E2E-D2", x: [0.5], baseLinear });
    const predPayload = pred?.result ?? pred;
    expect(predPayload.source).toBe("lora-adapter");
    // Adapter must improve on base (base would return 1.0 for x=0.5) and be
    // within 0.2 of ground truth 0.7 — rank-4 LoRA with 3 samples converges
    // approximately.
    expect(predPayload.y[0]).toBeLessThan(1.0);
    expect(Math.abs(predPayload.y[0] - 0.7)).toBeLessThan(0.2);
    const list = await invoke("wedm_fewshot_list", {});
    const listPayload = list?.result ?? list;
    expect(listPayload.materials).toContain("E2E-D2");
  });

  it("rejects invalid schema at dispatcher boundary", async () => {
    const r = await invoke("wedm_learn_from_job", { jobId: "x", thicknessMm: -1 });
    // dispatcher middleware wraps invalid with { error, action, dispatcher }
    // either structure is acceptable as long as the call did not crash and did
    // not mutate outcome history.
    expect(r).toBeDefined();
    const statsResp = await invoke("wedm_job_history_stats", {});
    const stats = statsResp?.result ?? statsResp;
    expect(stats.totalJobs).toBe(0);
  });
});
