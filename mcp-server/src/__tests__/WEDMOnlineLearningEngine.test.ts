/**
 * WEDMOnlineLearningEngine — Unit Tests
 * @milestone WEDM-NEXT-MS0
 * @unit U-WN04
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMOnlineLearningEngine,
  ProductionFeedback,
  ModelState,
} from "../engines/WEDMOnlineLearningEngine.js";

describe("WEDMOnlineLearningEngine", () => {
  let engine: WEDMOnlineLearningEngine;

  beforeEach(() => {
    engine = new WEDMOnlineLearningEngine();
  });

  const createFeedback = (overrides: Partial<ProductionFeedback> = {}): ProductionFeedback => ({
    parameters: {
      gapVoltage: 50,
      wireTension: 12,
      flushingPressure: 0.8,
      pulseOnTime: 15,
      pulseOffTime: 30,
      wireSpeed: 8,
    },
    actualOutcomes: {
      mrr: 25,
      surfaceRa: 1.2,
      wireConsumption: 40,
      energyConsumption: 3.5,
    },
    material: "D2",
    thickness: 25,
    timestamp: new Date().toISOString(),
    ...overrides,
  });

  describe("initializeModel", () => {
    it("creates a new model for material/machine combination", () => {
      const { modelId, modelState } = engine.initializeModel("D2", "machine-01");

      expect(modelId).toBe("d2_machine-01");
      expect(modelState.observationCount).toBe(0);
      expect(modelState.learningRate).toBe(0.01);
      expect(Object.keys(modelState.coefficients)).toContain("mrr");
      expect(Object.keys(modelState.biases)).toContain("mrr");
    });

    it("returns existing model if already initialized", () => {
      const first = engine.initializeModel("steel", "default");
      const second = engine.initializeModel("steel", "default");
      expect(first.modelId).toBe(second.modelId);
    });

    it("uses default machine ID when not specified", () => {
      const { modelId } = engine.initializeModel("aluminum");
      expect(modelId).toBe("aluminum_default");
    });

    it("normalizes material names to lowercase", () => {
      const { modelId } = engine.initializeModel("INCONEL", "MACHINE-02");
      expect(modelId).toBe("inconel_MACHINE-02");
    });
  });

  describe("predict", () => {
    it("makes predictions for given parameters", () => {
      const params = {
        gapVoltage: 50, wireTension: 12, flushingPressure: 0.8,
        pulseOnTime: 15, pulseOffTime: 30, wireSpeed: 8,
      };
      const result = engine.predict("D2", params, 25);

      expect(result.predictions.mrr).toBeGreaterThan(0);
      expect(result.predictions.surfaceRa).toBeGreaterThan(0);
      expect(result.predictions.wireConsumption).toBeGreaterThan(0);
      expect(result.predictions.energyConsumption).toBeGreaterThan(0);
    });

    it("returns confidence scores between 0.5 and 0.95", () => {
      const result = engine.predict("steel", {
        gapVoltage: 60, wireTension: 10, flushingPressure: 1.0,
        pulseOnTime: 20, pulseOffTime: 40, wireSpeed: 6
      }, 30);

      expect(result.confidence.mrr).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence.mrr).toBeLessThanOrEqual(0.95);
    });

    it("adjusts predictions based on thickness factor", () => {
      const params = {
        gapVoltage: 50, wireTension: 12, flushingPressure: 0.8,
        pulseOnTime: 15, pulseOffTime: 30, wireSpeed: 8,
      };
      const thin = engine.predict("D2", params, 10);
      const thick = engine.predict("D2", params, 100);
      expect(thick.predictions.mrr).toBeGreaterThan(thin.predictions.mrr);
    });

    it("returns model version (observation count)", () => {
      const result = engine.predict("copper", {
        gapVoltage: 40, wireTension: 8, flushingPressure: 0.5,
        pulseOnTime: 10, pulseOffTime: 20, wireSpeed: 10
      }, 15);
      expect(result.modelVersion).toBe(0);
    });
  });

  describe("updateFromFeedback", () => {
    it("updates model coefficients and increments observation count", () => {
      const feedback = createFeedback();
      const result = engine.updateFromFeedback(feedback);

      expect(result.updated).toBe(true);
      expect(result.modelId).toBe("d2_default");
      expect(typeof result.predictionErrors.mrr).toBe("number");

      const state = engine.getModelState("D2");
      expect(state?.observationCount).toBe(1);
    });

    it("returns prediction errors for all four outcomes", () => {
      const result = engine.updateFromFeedback(createFeedback());
      expect(Object.keys(result.predictionErrors)).toEqual(
        expect.arrayContaining(["mrr", "surfaceRa", "wireConsumption", "energyConsumption"])
      );
    });

    it("penalizes aggressive parameters on wire break", () => {
      engine.initializeModel("D2");
      const stateBefore = engine.getModelState("D2")!;
      const mrrGapBefore = stateBefore.coefficients.mrr.gapVoltage;

      engine.updateFromFeedback(createFeedback({ wireBreakOccurred: true }));

      const stateAfter = engine.getModelState("D2")!;
      expect(stateAfter.coefficients.mrr.gapVoltage).toBeLessThan(mrrGapBefore);
    });

    it("tracks feedback history up to 1000 entries", () => {
      for (let i = 0; i < 1050; i++) {
        engine.updateFromFeedback(createFeedback());
      }
      const exported = engine.exportModel("D2");
      expect(exported?.history.length).toBeLessThanOrEqual(1000);
    });
  });

  describe("batchUpdate", () => {
    it("processes multiple feedback entries across materials", () => {
      const feedbackList = [
        createFeedback({ material: "steel" }),
        createFeedback({ material: "steel" }),
        createFeedback({ material: "aluminum" }),
      ];
      const result = engine.batchUpdate(feedbackList);

      expect(result.totalUpdates).toBe(3);
      expect(result.modelsUpdated).toContain("steel_default");
      expect(result.modelsUpdated).toContain("aluminum_default");
      expect(result.averageError).toBeGreaterThanOrEqual(0);
    });

    it("handles empty batch gracefully", () => {
      const result = engine.batchUpdate([]);
      expect(result.totalUpdates).toBe(0);
      expect(result.averageError).toBe(0);
      expect(result.modelsUpdated).toHaveLength(0);
    });
  });

  describe("getStats / getModelState", () => {
    it("returns null for non-existent model", () => {
      expect(engine.getStats("nonexistent")).toBeNull();
      expect(engine.getModelState("unknown")).toBeNull();
    });

    it("returns stats with convergence metric after updates", () => {
      engine.updateFromFeedback(createFeedback());
      const stats = engine.getStats("D2");

      expect(stats?.totalObservations).toBe(1);
      expect(stats?.convergenceMetric).toBeGreaterThanOrEqual(0);
      expect(stats?.convergenceMetric).toBeLessThanOrEqual(1);
      expect(stats?.learningRateHistory.length).toBeGreaterThan(0);
    });
  });

  describe("resetModel", () => {
    it("returns false for non-existent model", () => {
      expect(engine.resetModel("nonexistent")).toBe(false);
    });

    it("resets model to initial state and clears history", () => {
      engine.updateFromFeedback(createFeedback({ material: "steel" }));
      engine.updateFromFeedback(createFeedback({ material: "steel" }));

      expect(engine.resetModel("steel")).toBe(true);

      const state = engine.getModelState("steel");
      expect(state?.observationCount).toBe(0);

      const exported = engine.exportModel("steel");
      expect(exported?.history.length).toBe(0);
    });
  });

  describe("exportModel / importModel", () => {
    it("export returns null for non-existent model", () => {
      expect(engine.exportModel("unknown")).toBeNull();
    });

    it("exports deep copy of model state", () => {
      engine.initializeModel("copper");
      const exported = engine.exportModel("copper");

      exported!.state.learningRate = 999;
      const current = engine.getModelState("copper");
      expect(current?.learningRate).not.toBe(999);
    });

    it("imports model state and history successfully", () => {
      const mockState: ModelState = {
        coefficients: {
          mrr: { gapVoltage: 0.5, wireTension: 0.1, flushingPressure: 0.2, pulseOnTime: 0.4, pulseOffTime: -0.3, wireSpeed: 0.15 },
          surfaceRa: { gapVoltage: 0.3, wireTension: 0.05, flushingPressure: 0.1, pulseOnTime: 0.35, pulseOffTime: -0.2, wireSpeed: 0.1 },
          wireConsumption: { gapVoltage: 0.25, wireTension: 0.35, flushingPressure: 0.1, pulseOnTime: 0.3, pulseOffTime: -0.15, wireSpeed: 0.45 },
          energyConsumption: { gapVoltage: 0.45, wireTension: 0.1, flushingPressure: 0.15, pulseOnTime: 0.4, pulseOffTime: -0.3, wireSpeed: 0.2 },
        },
        biases: { mrr: 28, surfaceRa: 1.3, wireConsumption: 45, energyConsumption: 4.5 },
        observationCount: 50,
        lastUpdated: new Date().toISOString(),
        learningRate: 0.005,
        momentumTerms: {
          mrr: { gapVoltage: 0, wireTension: 0, flushingPressure: 0, pulseOnTime: 0, pulseOffTime: 0, wireSpeed: 0 },
          surfaceRa: { gapVoltage: 0, wireTension: 0, flushingPressure: 0, pulseOnTime: 0, pulseOffTime: 0, wireSpeed: 0 },
          wireConsumption: { gapVoltage: 0, wireTension: 0, flushingPressure: 0, pulseOnTime: 0, pulseOffTime: 0, wireSpeed: 0 },
          energyConsumption: { gapVoltage: 0, wireTension: 0, flushingPressure: 0, pulseOnTime: 0, pulseOffTime: 0, wireSpeed: 0 },
        },
      };
      const history = [createFeedback()];

      expect(engine.importModel("imported_test", mockState, history)).toBe(true);

      const models = engine.listModels();
      expect(models.map(m => m.modelId)).toContain("imported_test");
    });
  });

  describe("listModels", () => {
    it("returns empty array when no models exist", () => {
      expect(engine.listModels()).toHaveLength(0);
    });

    it("lists all active models with metadata", () => {
      engine.initializeModel("steel");
      engine.initializeModel("aluminum");
      engine.updateFromFeedback(createFeedback({ material: "copper", machineId: "m02" }));

      const models = engine.listModels();
      expect(models).toHaveLength(3);
      expect(models.find(m => m.modelId === "copper_m02")?.observationCount).toBe(1);
    });
  });

  describe("detectDrift", () => {
    it("returns no drift with insufficient data", () => {
      const result = engine.detectDrift("D2");
      expect(result.driftDetected).toBe(false);
      expect(result.recommendation).toContain("Insufficient data");
    });

    it("detects drift when recent errors exceed historical", () => {
      for (let i = 0; i < 30; i++) {
        engine.updateFromFeedback(createFeedback({
          predictedOutcomes: { mrr: 25, surfaceRa: 1.2, wireConsumption: 40, energyConsumption: 3.5 },
          actualOutcomes: { mrr: 25, surfaceRa: 1.2, wireConsumption: 40, energyConsumption: 3.5 },
        }));
      }
      for (let i = 0; i < 15; i++) {
        engine.updateFromFeedback(createFeedback({
          predictedOutcomes: { mrr: 25, surfaceRa: 1.2, wireConsumption: 40, energyConsumption: 3.5 },
          actualOutcomes: { mrr: 50, surfaceRa: 2.5, wireConsumption: 80, energyConsumption: 7.0 },
        }));
      }

      const result = engine.detectDrift("D2");
      expect(result.driftScore).toBeGreaterThan(0);
    });
  });

  describe("edge cases and adversarial inputs", () => {
    it("handles minimum parameter values", () => {
      const result = engine.predict("steel", {
        gapVoltage: 0.1, wireTension: 1, flushingPressure: 0.1,
        pulseOnTime: 0.5, pulseOffTime: 5, wireSpeed: 1,
      }, 1);
      expect(Number.isFinite(result.predictions.mrr)).toBe(true);
      expect(result.predictions.mrr).toBeGreaterThanOrEqual(0);
    });

    it("handles very thick workpieces (500mm)", () => {
      const result = engine.predict("D2", {
        gapVoltage: 80, wireTension: 20, flushingPressure: 1.5,
        pulseOnTime: 25, pulseOffTime: 50, wireSpeed: 5,
      }, 500);
      expect(Number.isFinite(result.predictions.mrr)).toBe(true);
    });

    it("handles rapid consecutive updates (100)", () => {
      for (let i = 0; i < 100; i++) {
        engine.updateFromFeedback(createFeedback());
      }
      expect(engine.getModelState("D2")?.observationCount).toBe(100);
    });

    it("handles NaN in feedback gracefully via normalized error", () => {
      const fb = createFeedback();
      fb.actualOutcomes.mrr = NaN;
      const result = engine.updateFromFeedback(fb);
      expect(Number.isNaN(result.predictionErrors.mrr)).toBe(true);
    });
  });

  describe("multi-material variation", () => {
    it.each([
      ["D2", 50, 0.8],
      ["aluminum", 30, 0.5],
      ["inconel", 60, 1.2],
    ])("predicts for %s material at thickness %d", (material, thickness, expectedMinMrr) => {
      const result = engine.predict(material, {
        gapVoltage: 50, wireTension: 12, flushingPressure: 0.8,
        pulseOnTime: 15, pulseOffTime: 30, wireSpeed: 8,
      }, thickness);

      expect(result.predictions.mrr).toBeGreaterThan(0);
      expect(result.confidence.mrr).toBeGreaterThanOrEqual(0.5);
    });
  });
});

describe("prism_edm dispatcher round-trip", () => {
  it("wedm_online_init creates model via dispatcher", async () => {
    const { registerEdmDispatcher } = await import("../tools/dispatchers/edmDispatcher.js");

    let capturedResult: any;
    const mockServer = {
      tool: (_name: string, _desc: string, _schema: any, handler: any) => {
        mockServer._handler = handler;
      },
      _handler: null as any,
    };

    registerEdmDispatcher(mockServer);
    const result = await mockServer._handler({
      action: "wedm_online_init",
      params: { material: "steel", machine_id: "test-m1" },
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.modelId).toBe("steel_test-m1");
    expect(parsed.modelState.observationCount).toBe(0);
  });

  it("wedm_online_predict returns predictions via dispatcher", async () => {
    const { registerEdmDispatcher } = await import("../tools/dispatchers/edmDispatcher.js");

    const mockServer = { tool: (_n: string, _d: string, _s: any, h: any) => { mockServer._handler = h; }, _handler: null as any };
    registerEdmDispatcher(mockServer);

    await mockServer._handler({ action: "wedm_online_init", params: { material: "copper" } });

    const result = await mockServer._handler({
      action: "wedm_online_predict",
      params: {
        material: "copper",
        parameters: { gapVoltage: 45, wireTension: 10, flushingPressure: 0.7, pulseOnTime: 12, pulseOffTime: 25, wireSpeed: 7 },
        thickness: 20,
      },
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.predictions.mrr).toBeGreaterThan(0);
    expect(parsed.confidence.mrr).toBeGreaterThanOrEqual(0.5);
  });

  it("wedm_online_update processes feedback via dispatcher", async () => {
    const { registerEdmDispatcher } = await import("../tools/dispatchers/edmDispatcher.js");

    const mockServer = { tool: (_n: string, _d: string, _s: any, h: any) => { mockServer._handler = h; }, _handler: null as any };
    registerEdmDispatcher(mockServer);

    const result = await mockServer._handler({
      action: "wedm_online_update",
      params: {
        feedback: {
          parameters: { gapVoltage: 50, wireTension: 12, flushingPressure: 0.8, pulseOnTime: 15, pulseOffTime: 30, wireSpeed: 8 },
          actualOutcomes: { mrr: 28, surfaceRa: 1.1, wireConsumption: 42, energyConsumption: 3.8 },
          material: "titanium",
          thickness: 35,
          timestamp: new Date().toISOString(),
        },
      },
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.updated).toBe(true);
    expect(parsed.modelId).toBe("titanium_default");
  });

  it("wedm_online_list returns all models via dispatcher", async () => {
    const { registerEdmDispatcher } = await import("../tools/dispatchers/edmDispatcher.js");

    const mockServer = { tool: (_n: string, _d: string, _s: any, h: any) => { mockServer._handler = h; }, _handler: null as any };
    registerEdmDispatcher(mockServer);

    await mockServer._handler({ action: "wedm_online_init", params: { material: "brass" } });
    await mockServer._handler({ action: "wedm_online_init", params: { material: "graphite", machine_id: "edm-2" } });

    const result = await mockServer._handler({ action: "wedm_online_list", params: {} });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.models.length).toBeGreaterThanOrEqual(2);
  });

  it("wedm_online_drift detects drift state via dispatcher", async () => {
    const { registerEdmDispatcher } = await import("../tools/dispatchers/edmDispatcher.js");

    const mockServer = { tool: (_n: string, _d: string, _s: any, h: any) => { mockServer._handler = h; }, _handler: null as any };
    registerEdmDispatcher(mockServer);

    const result = await mockServer._handler({
      action: "wedm_online_drift",
      params: { material: "unknown-material" },
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.driftDetected).toBe(false);
    expect(parsed.recommendation).toContain("Insufficient");
  });
});
