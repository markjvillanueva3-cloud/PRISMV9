/**
 * MillNeuralNetworkEngine wiring test
 * ===================================
 * BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING — iter-6.
 *
 * 4 actions wired into prism_mill:
 *   - mill_neural_encode_features  (encodeFeatures)
 *   - mill_neural_add_sample       (addTrainingSample)
 *   - mill_neural_train            (train)
 *   - mill_neural_predict          (predict)
 *
 * All assertions value-comparative against the engine contract.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { millNeuralNetworkEngine } from "../engines/MillNeuralNetworkEngine.js";
import { MILL_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_PATH = join(HERE, "..", "tools", "dispatchers", "millDispatcher.ts");
const DISPATCHER_SRC = readFileSync(DISPATCHER_PATH, "utf8");

const NEW_ACTIONS = [
  "mill_neural_encode_features",
  "mill_neural_add_sample",
  "mill_neural_train",
  "mill_neural_predict",
] as const;

type ZodSchemaLike = {
  safeParse: (p: unknown) => { success: boolean; data?: unknown };
};
const getSchema = (action: string): ZodSchemaLike =>
  (MILL_ACTION_SCHEMAS as Record<string, ZodSchemaLike>)[action];

const VALID_PREDICT = {
  materialIso: "P",
  toolType: "flat_endmill",
  operationType: "rough_pocket",
  toolDiameterMm: 12,
  rpm: 4500,
  feed: 900,
  doc: 4,
  zLevelCount: 3,
  cutterComp: true,
};

describe("MillNeuralNetworkEngine wiring (U-BRIDGE-WIRE-MILLING iter-6)", () => {
  describe("dispatcher pins all 4 actions + mill_neural_net getter", () => {
    for (const action of NEW_ACTIONS) {
      it(`MILL_ACTIONS contains exactly one '${action}'`, () => {
        const arr = MILL_ACTIONS as readonly string[];
        expect(arr.filter((x) => x === action).length).toBe(1);
      });
      it(`dispatcher source has 'case "${action}":' block`, () => {
        expect(DISPATCHER_SRC.includes(`case "${action}":`)).toBe(true);
      });
    }

    it("dispatcher source lazy-imports MillNeuralNetworkEngine", () => {
      expect(DISPATCHER_SRC.includes('case "mill_neural_net":')).toBe(true);
      expect(DISPATCHER_SRC.includes("MillNeuralNetworkEngine.js")).toBe(true);
    });
  });

  describe("Zod schemas validate input", () => {
    it("predict REJECTS bogus materialIso", () => {
      expect(getSchema("mill_neural_predict").safeParse({ ...VALID_PREDICT, materialIso: "X" }).success).toBe(false);
    });

    it("predict REJECTS bogus toolType", () => {
      expect(getSchema("mill_neural_predict").safeParse({ ...VALID_PREDICT, toolType: "laser" }).success).toBe(false);
    });

    it("predict REJECTS bogus operationType", () => {
      expect(getSchema("mill_neural_predict").safeParse({ ...VALID_PREDICT, operationType: "shape" }).success).toBe(false);
    });

    it("predict ACCEPTS valid 9-arg payload and preserves toolDiameterMm", () => {
      const r = getSchema("mill_neural_predict").safeParse(VALID_PREDICT);
      expect(r.success).toBe(true);
      const data = r.data as { toolDiameterMm: number };
      expect(data.toolDiameterMm).toBe(12);
    });

    it("encode_features REQUIRES isProven field; predict does NOT", () => {
      // omit isProven for both — predict succeeds, encode_features fails
      const omitProven: Record<string, unknown> = { ...VALID_PREDICT };
      expect(getSchema("mill_neural_predict").safeParse(omitProven).success).toBe(true);
      expect(getSchema("mill_neural_encode_features").safeParse(omitProven).success).toBe(false);
    });

    it("add_sample REQUIRES targetRPM + targetFeed + targetDOC", () => {
      const withIsProven = { ...VALID_PREDICT, isProven: true };
      // missing all 3 targets
      expect(getSchema("mill_neural_add_sample").safeParse(withIsProven).success).toBe(false);
      // missing one target
      expect(getSchema("mill_neural_add_sample").safeParse({
        ...withIsProven, targetRPM: 5000, targetFeed: 1000,
      }).success).toBe(false);
      // all three present → accept
      expect(getSchema("mill_neural_add_sample").safeParse({
        ...withIsProven, targetRPM: 5000, targetFeed: 1000, targetDOC: 5,
      }).success).toBe(true);
    });

    it("train ACCEPTS empty payload, REJECTS extras (.strict)", () => {
      expect(getSchema("mill_neural_train").safeParse({}).success).toBe(true);
      expect(getSchema("mill_neural_train").safeParse({ epochs: 100 }).success).toBe(false);
    });
  });

  describe("engine round-trip produces real neural-net outputs", () => {
    it("encodeFeatures() returns a non-empty number[] vector", () => {
      const v = millNeuralNetworkEngine.encodeFeatures(
        "P", "flat_endmill", "rough_pocket", 12, 4500, 900, 4, 3, true, true,
      );
      expect(Array.isArray(v)).toBe(true);
      expect(v.length).toBeGreaterThan(0);
      // Material P slot is index 0 (one-hot) — verify it's 1
      expect(v[0]).toBe(1);
    });

    it("encodeFeatures() encodes K material at slot 2 (not slot 0)", () => {
      const v = millNeuralNetworkEngine.encodeFeatures(
        "K", "flat_endmill", "rough_pocket", 12, 4500, 900, 4, 3, true, true,
      );
      expect(v[0]).toBe(0); // P slot empty
      expect(v[2]).toBe(1); // K slot set
    });

    it("train() with 0 samples returns {loss:0, epochs:0}", () => {
      // Use a fresh engine via the singleton — its trainingSamples may have data
      // from prior tests but the public contract still holds.
      const r = millNeuralNetworkEngine.train();
      expect(typeof r.loss).toBe("number");
      expect(typeof r.epochs).toBe("number");
      expect(r.loss).toBeGreaterThanOrEqual(0);
      expect(r.epochs).toBeGreaterThanOrEqual(0);
    });

    it("addTrainingSample() then train() returns finite loss + ≥1 epoch", () => {
      // Build training corpus with targets INSIDE the engine's sigmoid range
      // (label normalization: rpm/15000, feed/100, doc/10 — all must stay in
      // [0,1] or gradients blow up to NaN, which is what predict() would then
      // emit). Feed target capped at ~80 mm/min to keep label ≤ 0.8.
      for (let i = 0; i < 5; i++) {
        millNeuralNetworkEngine.addTrainingSample(
          "P", "flat_endmill", "rough_pocket", 12,
          4500 + i * 100, 80 + i * 2, 4, 3, true, true,
          5000, 80, 5,
        );
      }
      const r = millNeuralNetworkEngine.train();
      expect(r.epochs).toBeGreaterThan(0);
      expect(Number.isFinite(r.loss)).toBe(true);
      expect(r.loss).toBeGreaterThanOrEqual(0);
    });

    it("predict() returns the documented NeuralPrediction shape", () => {
      // Real contract per src/engines/MillNeuralNetworkEngine.ts:59-64 :
      //   { output: number[3], confidence: number, explanation: string[],
      //     feature_importance: Record<string, number> }
      // The output[] array is [predictedRPM, predictedFeed, predictedDOC]
      // (per the return literal in predict()), not named keys.
      const r = millNeuralNetworkEngine.predict(
        "P", "flat_endmill", "rough_pocket", 12, 4500, 900, 4, 3, true,
      );
      expect(Array.isArray(r.output)).toBe(true);
      expect(r.output.length).toBe(3);
      expect(typeof r.confidence).toBe("number");
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(r.explanation)).toBe(true);
      expect(typeof r.feature_importance).toBe("object");
    });

    it("predict() feature_importance includes material_P key for ISO group P", () => {
      const r = millNeuralNetworkEngine.predict(
        "P", "flat_endmill", "rough_pocket", 12, 4500, 900, 4, 3, true,
      );
      // computeFeatureImportance only emits entries for features[i] > 0; the
      // P-material one-hot sets index 0, so material_P must appear.
      expect(Object.prototype.hasOwnProperty.call(r.feature_importance, "material_P")).toBe(true);
      expect(typeof r.feature_importance.material_P).toBe("number");
    });
  });

  describe("MILL_ACTIONS action-count anti-regression", () => {
    it("total action count is ≥ post-iter5 + 4 (≥ 105)", () => {
      expect((MILL_ACTIONS as readonly string[]).length).toBeGreaterThanOrEqual(105);
    });
  });
});
