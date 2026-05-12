/**
 * Dedicated tests for DigitalTwinFormulasEngine
 * Methods: ekfPredict, ekfUpdate, driftDetect, modelDivergence
 */
import { describe, it, expect } from "vitest";
import { digitalTwinFormulasEngine } from "../engines/DigitalTwinFormulasEngine.js";

describe("DigitalTwinFormulasEngine", () => {
  describe("ekfPredict", () => {
    it("should compute x_pred = F*x and grow covariance by Q", () => {
      const r = digitalTwinFormulasEngine.ekfPredict({
        state: [1, 0],
        F: [[1, 1], [0, 1]],
        P: [[1, 0], [0, 1]],
        Q: [[0.1, 0], [0, 0.1]],
      });
      expect(r.x_pred).toHaveLength(2);
      expect(r.x_pred[0]).toBeCloseTo(1, 5);
      expect(r.x_pred[1]).toBeCloseTo(0, 5);
      expect(r.P_pred).toHaveLength(2);
      expect(r.P_pred[0][0]).toBeGreaterThan(0.1);
    });

    it("should apply control input B*u when provided", () => {
      const r = digitalTwinFormulasEngine.ekfPredict({
        state: [0, 0],
        F: [[1, 0], [0, 1]],
        B: [[1, 0], [0, 1]],
        u: [5, 3],
        P: [[1, 0], [0, 1]],
        Q: [[0.01, 0], [0, 0.01]],
      });
      expect(r.x_pred[0]).toBeCloseTo(5, 3);
      expect(r.x_pred[1]).toBeCloseTo(3, 3);
    });
  });

  describe("ekfUpdate", () => {
    it("should reduce covariance after measurement update", () => {
      const P_pred = [[2, 0], [0, 2]];
      const r = digitalTwinFormulasEngine.ekfUpdate({
        x_pred: [1, 0],
        P_pred,
        z: [1.1],
        H: [[1, 0]],
        R: [[0.5]],
      });
      expect(r.x_updated).toHaveLength(2);
      expect(r.x_updated[0]).toBeGreaterThan(1);
      expect(r.x_updated[0]).toBeLessThanOrEqual(1.1);
      expect(r.P_updated[0][0]).toBeLessThan(P_pred[0][0]);
      expect(r.K).toBeDefined();
      expect(r.innovation).toHaveLength(1);
    });

    it("should compute Kalman gain K = P*H'/(H*P*H'+R)", () => {
      const r = digitalTwinFormulasEngine.ekfUpdate({
        x_pred: [0],
        P_pred: [[4]],
        z: [2],
        H: [[1]],
        R: [[1]],
      });
      expect(r.K[0][0]).toBeCloseTo(0.8, 2);
      expect(r.x_updated[0]).toBeCloseTo(1.6, 2);
    });
  });

  describe("driftDetect", () => {
    it("should detect upward drift via CUSUM", () => {
      const data = [10, 10.1, 9.9, 10, 15, 15.1, 14.9, 15, 15.2, 15];
      const r = digitalTwinFormulasEngine.driftDetect({
        observations: data,
        mu: 10,
        k: 1,
        h: 5,
      });
      expect(r.alarm_detected).toBe(true);
      expect(r.cusum_upper).toBeDefined();
      expect(r.alarm_indices.length).toBeGreaterThan(0);
    });

    it("should not alarm on stable process", () => {
      const data = [10, 10.1, 9.9, 10.05, 9.95, 10.02, 9.98];
      const r = digitalTwinFormulasEngine.driftDetect({
        observations: data,
        mu: 10,
        k: 1,
        h: 5,
      });
      expect(r.alarm_detected).toBe(false);
    });
  });

  describe("modelDivergence", () => {
    it("should compute RMSE between predicted and actual", () => {
      const r = digitalTwinFormulasEngine.modelDivergence({
        predicted: [1, 2, 3, 4, 5],
        actual: [1.1, 2.2, 2.8, 4.1, 5.3],
      });
      expect(r.rmse).toBeGreaterThan(0);
      expect(r.rmse).toBeLessThan(1);
      expect(typeof r.kl_divergence).toBe("number");
    });

    it("should return zero RMSE for identical sequences", () => {
      const r = digitalTwinFormulasEngine.modelDivergence({
        predicted: [1, 2, 3],
        actual: [1, 2, 3],
      });
      expect(r.rmse).toBeCloseTo(0, 8);
    });
  });
});
