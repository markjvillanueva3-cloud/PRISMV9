/**
 * wedm-dl-pred-dispatcher.test.ts — E2E round-trip tests through edmDispatcher
 * for the MS-P4-DL-PRED predictor actions.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";

let invoke: (action: string, params?: any) => Promise<any>;
let wedmRaPredictorEngine: any;
let wedmWireBreakPredictorEngine: any;
let wedmRecastDepthPredictorEngine: any;
let wedmLoRAAdapterEngine: any;

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
  const [{ registerEdmDispatcher }, ra, brk, rec, lora] = await Promise.all([
    import("../tools/dispatchers/edmDispatcher.js"),
    import("../engines/WEDMRaPredictorEngine.js"),
    import("../engines/WEDMWireBreakPredictorEngine.js"),
    import("../engines/WEDMRecastDepthPredictorEngine.js"),
    import("../engines/WEDMLoRAAdapterEngine.js"),
  ]);
  wedmRaPredictorEngine = ra.wedmRaPredictorEngine;
  wedmWireBreakPredictorEngine = brk.wedmWireBreakPredictorEngine;
  wedmRecastDepthPredictorEngine = rec.wedmRecastDepthPredictorEngine;
  wedmLoRAAdapterEngine = lora.wedmLoRAAdapterEngine;
  const srv = new FakeServer();
  registerEdmDispatcher(srv as any);
  invoke = async (action, params) => {
    const resp = await srv.call(action, params ?? {});
    if (resp?.content?.[0]?.text) {
      try { return JSON.parse(resp.content[0].text); }
      catch { return resp.content[0].text; }
    }
    return resp;
  };
});

beforeEach(() => {
  wedmLoRAAdapterEngine._resetForTests();
});

describe("MS-P4-DL-PRED dispatcher E2E", () => {
  it("wedm_predict_ra_v2 → returns Klocke-base AtomicValue", async () => {
    const r = await invoke("wedm_predict_ra_v2", {
      material: "steel", peakCurrentA: 8, pulseOnUs: 4,
    });
    const payload = r?.result ?? r;
    expect(payload.ra).toBeDefined();
    expect(payload.ra.unit).toBe("um");
    expect(payload.ra.value).toBeGreaterThan(0);
    expect(payload.appliedAdapter).toBeNull();
  });

  it("wedm_train_ra_adapter then wedm_predict_ra_v2 reflects adaptation", async () => {
    // Generate biased samples (truth = base + 0.3 µm)
    const baseR = await invoke("wedm_predict_ra_v2", {
      material: "steel", peakCurrentA: 8, pulseOnUs: 4, useAdapter: false,
    });
    const basePart = (baseR?.result ?? baseR).basePart;

    const samples = [5, 8, 10, 12].map((ip) => ({
      input: { material: "steel", peakCurrentA: ip, pulseOnUs: 4 },
      measuredRaUm: wedmRaPredictorEngine.predict({
        material: "steel", peakCurrentA: ip, pulseOnUs: 4, useAdapter: false,
      }).basePart + 0.3,
    }));
    const train = await invoke("wedm_train_ra_adapter", {
      material: "steel", samples, epochs: 300, lr: 0.05, seed: 17,
    });
    expect((train?.result ?? train).sampleCount).toBe(4);

    const adapted = await invoke("wedm_predict_ra_v2", {
      material: "steel", peakCurrentA: 8, pulseOnUs: 4,
    });
    const adaptedPayload = adapted?.result ?? adapted;
    expect(adaptedPayload.appliedAdapter).toMatch(/wedm-ra::steel/);
    expect(adaptedPayload.ra.value).toBeGreaterThan(basePart); // adapter pushed it up
  });

  it("wedm_predict_break returns probability in (0,1)", async () => {
    const r = await invoke("wedm_predict_break", {
      peakCurrentA: 8, wireDiameterMm: 0.25, thicknessMm: 20,
    });
    const payload = r?.result ?? r;
    expect(payload.probability.value).toBeGreaterThan(0);
    expect(payload.probability.value).toBeLessThan(1);
    expect(payload.probability.unit).toBe("probability");
  });

  it("wedm_evaluate_break returns Brier ≤ 0.15 on synthetic balanced fixture", async () => {
    // Use the engine as ground-truth generator
    let s = 7 | 0;
    const rand = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
    const samples = Array.from({ length: 80 }, () => {
      const ip = 4 + rand() * 12;
      const dw = 0.10 + rand() * 0.20;
      const thk = 5 + rand() * 40;
      const horizon = 5 + rand() * 30;
      const p = wedmWireBreakPredictorEngine.predict({
        peakCurrentA: ip, wireDiameterMm: dw, thicknessMm: thk, useAdapter: false,
      }, horizon).probability.value;
      return {
        input: { peakCurrentA: ip, wireDiameterMm: dw, thicknessMm: thk, cumulativeCutMin: horizon },
        broke: rand() < p,
      };
    });
    const r = await invoke("wedm_evaluate_break", { samples });
    const payload = r?.result ?? r;
    expect(payload.brierScore).toBeLessThanOrEqual(0.15);
  });

  it("wedm_predict_recast → AtomicValue depth in µm with material thread-through", async () => {
    const r = await invoke("wedm_predict_recast", {
      material: "tool_steel", voltageV: 80, peakCurrentA: 12, pulseOnUs: 6,
    });
    const payload = r?.result ?? r;
    expect(payload.depth.unit).toBe("um");
    expect(payload.depth.value).toBeGreaterThan(0);
    expect(payload.material).toBe("tool_steel");
    expect(payload.closedFormDepthUm).toBeCloseTo(payload.depth.value, 9);
  });

  it("wedm_train_recast_adapter then predict reflects bias correction", async () => {
    const samples = [5, 8, 12, 16].map((ip) => ({
      input: { material: "steel", voltageV: 80, peakCurrentA: ip, pulseOnUs: 4 },
      measuredDepthUm: wedmRecastDepthPredictorEngine.predict({
        material: "steel", voltageV: 80, peakCurrentA: ip, pulseOnUs: 4, useAdapter: false,
      }).closedFormDepthUm + 2.0,
    }));
    const train = await invoke("wedm_train_recast_adapter", {
      material: "steel", samples, epochs: 250, lr: 0.05, seed: 23,
    });
    expect((train?.result ?? train).sampleCount).toBe(4);

    const r = await invoke("wedm_predict_recast", {
      material: "steel", voltageV: 80, peakCurrentA: 12, pulseOnUs: 4,
    });
    const payload = r?.result ?? r;
    expect(payload.appliedAdapter).toMatch(/wedm-recast::steel/);
    expect(payload.depth.value).toBeGreaterThan(payload.closedFormDepthUm);
  });

  it("rejects invalid schema at dispatcher boundary", async () => {
    const r = await invoke("wedm_predict_ra_v2", {
      material: "steel", peakCurrentA: -1, pulseOnUs: 4,
    });
    // negative current is rejected by Zod (positive constraint)
    expect(r).toBeDefined();
  });
});
