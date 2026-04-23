/**
 * LatheLoRADriftDetectorEngine Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRADriftDetectorEngine } from "../engines/LatheLoRADriftDetectorEngine.js";

describe("LatheLoRADriftDetectorEngine", () => {
  beforeEach(() => {
    latheLoRADriftDetectorEngine.reset();
  });

  describe("configuration", () => {
    it("should return default configuration", () => {
      const config = latheLoRADriftDetectorEngine.getConfig();
      expect(config.window_size).toBe(100);
      expect(config.min_samples).toBe(20);
      expect(config.warning_threshold).toBe(1.5);
      expect(config.critical_threshold).toBe(2.5);
    });

    it("should update configuration", () => {
      latheLoRADriftDetectorEngine.setConfig({
        window_size: 50,
        warning_threshold: 2.0,
      });
      const config = latheLoRADriftDetectorEngine.getConfig();
      expect(config.window_size).toBe(50);
      expect(config.warning_threshold).toBe(2.0);
    });
  });

  describe("sample recording", () => {
    it("should record quality samples", () => {
      latheLoRADriftDetectorEngine.recordSample({
        timestamp: Date.now(),
        model_id: "lathe-lora-v1",
        prompt_hash: "abc123",
        physics_score: 0.9,
        safety_score: 0.95,
        coherence_score: 0.85,
        latency_ms: 150,
      });

      const samples = latheLoRADriftDetectorEngine.getSamples("lathe-lora-v1");
      expect(samples.length).toBe(1);
      expect(samples[0].physics_score).toBe(0.9);
    });

    it("should trim samples beyond window size", () => {
      latheLoRADriftDetectorEngine.setConfig({ window_size: 10 });

      for (let i = 0; i < 25; i++) {
        latheLoRADriftDetectorEngine.recordSample({
          timestamp: Date.now() + i,
          model_id: "test-model",
          prompt_hash: `hash-${i}`,
          physics_score: 0.8,
          safety_score: 0.9,
          coherence_score: 0.85,
          latency_ms: 100,
        });
      }

      const samples = latheLoRADriftDetectorEngine.getSamples("test-model");
      expect(samples.length).toBeLessThanOrEqual(20); // window_size * 2
    });
  });

  describe("baseline management", () => {
    it("should calculate baseline from samples", () => {
      // Add enough samples for baseline
      for (let i = 0; i < 25; i++) {
        latheLoRADriftDetectorEngine.recordSample({
          timestamp: Date.now() + i,
          model_id: "baseline-model",
          prompt_hash: `hash-${i}`,
          physics_score: 0.85 + (i % 5) * 0.02,
          safety_score: 0.90,
          coherence_score: 0.80,
          latency_ms: 100 + i,
        });
      }

      const baseline = latheLoRADriftDetectorEngine.setBaseline("baseline-model");
      expect(baseline.model_id).toBe("baseline-model");
      expect(baseline.samples_count).toBe(25);
      expect(baseline.metrics.physics_mean).toBeGreaterThan(0);
      expect(baseline.metrics.safety_mean).toBeCloseTo(0.9, 1);
    });

    it("should reject baseline with insufficient samples", () => {
      latheLoRADriftDetectorEngine.recordSample({
        timestamp: Date.now(),
        model_id: "sparse-model",
        prompt_hash: "hash-1",
        physics_score: 0.9,
        safety_score: 0.95,
        coherence_score: 0.85,
        latency_ms: 150,
      });

      expect(() => {
        latheLoRADriftDetectorEngine.setBaseline("sparse-model");
      }).toThrow(/Insufficient samples/);
    });

    it("should allow setting explicit baseline", () => {
      const baseline = latheLoRADriftDetectorEngine.setBaseline("explicit-model", {
        model_id: "explicit-model",
        created_at: Date.now(),
        samples_count: 100,
        metrics: {
          physics_mean: 0.9,
          physics_std: 0.05,
          safety_mean: 0.95,
          safety_std: 0.02,
          coherence_mean: 0.85,
          coherence_std: 0.08,
          latency_mean: 120,
          latency_std: 20,
        },
      });

      expect(baseline.metrics.physics_mean).toBe(0.9);
      expect(latheLoRADriftDetectorEngine.getBaseline("explicit-model")).toBeDefined();
    });
  });

  describe("drift detection", () => {
    beforeEach(() => {
      // Set up baseline
      latheLoRADriftDetectorEngine.setBaseline("drift-model", {
        model_id: "drift-model",
        created_at: Date.now(),
        samples_count: 100,
        metrics: {
          physics_mean: 0.90,
          physics_std: 0.05,
          safety_mean: 0.95,
          safety_std: 0.02,
          coherence_mean: 0.85,
          coherence_std: 0.05,
          latency_mean: 100,
          latency_std: 10,
        },
      });
    });

    it("should detect stable metrics within threshold", () => {
      // Add samples close to baseline
      for (let i = 0; i < 25; i++) {
        latheLoRADriftDetectorEngine.recordSample({
          timestamp: Date.now() + i,
          model_id: "drift-model",
          prompt_hash: `hash-${i}`,
          physics_score: 0.89 + Math.random() * 0.02,
          safety_score: 0.94 + Math.random() * 0.02,
          coherence_score: 0.84 + Math.random() * 0.02,
          latency_ms: 98 + Math.random() * 4,
        });
      }

      const detections = latheLoRADriftDetectorEngine.detectDrift("drift-model");
      const physicsDetection = detections.find(d => d.type === "physics_accuracy");
      expect(physicsDetection?.status).toBe("stable");
    });

    it("should detect critical drift when metrics degrade significantly", () => {
      // Add samples with significantly degraded physics
      for (let i = 0; i < 25; i++) {
        latheLoRADriftDetectorEngine.recordSample({
          timestamp: Date.now() + i,
          model_id: "drift-model",
          prompt_hash: `hash-${i}`,
          physics_score: 0.70, // Well below baseline 0.90
          safety_score: 0.95,
          coherence_score: 0.85,
          latency_ms: 100,
        });
      }

      const detections = latheLoRADriftDetectorEngine.detectDrift("drift-model");
      const physicsDetection = detections.find(d => d.type === "physics_accuracy");
      expect(physicsDetection?.status).toBe("critical");
      expect(physicsDetection?.deviation).toBeGreaterThan(2.5);
    });

    it("should detect warning level drift", () => {
      // Add samples with moderate degradation
      for (let i = 0; i < 25; i++) {
        latheLoRADriftDetectorEngine.recordSample({
          timestamp: Date.now() + i,
          model_id: "drift-model",
          prompt_hash: `hash-${i}`,
          physics_score: 0.80, // Moderately below baseline 0.90
          safety_score: 0.95,
          coherence_score: 0.85,
          latency_ms: 100,
        });
      }

      const detections = latheLoRADriftDetectorEngine.detectDrift("drift-model");
      const physicsDetection = detections.find(d => d.type === "physics_accuracy");
      // 0.80 - 0.90 = -0.10, divided by std 0.05 = -2.0 deviation
      expect(["warning", "drifting"]).toContain(physicsDetection?.status);
    });

    it("should return no baseline message when baseline not set", () => {
      const detections = latheLoRADriftDetectorEngine.detectDrift("unknown-model");
      expect(detections[0].message).toContain("No baseline set");
    });
  });

  describe("retraining triggers", () => {
    beforeEach(() => {
      latheLoRADriftDetectorEngine.setBaseline("retrain-model", {
        model_id: "retrain-model",
        created_at: Date.now(),
        samples_count: 100,
        metrics: {
          physics_mean: 0.90,
          physics_std: 0.05,
          safety_mean: 0.95,
          safety_std: 0.02,
          coherence_mean: 0.85,
          coherence_std: 0.05,
          latency_mean: 100,
          latency_std: 10,
        },
      });
    });

    it("should not need retraining when metrics stable", () => {
      for (let i = 0; i < 25; i++) {
        latheLoRADriftDetectorEngine.recordSample({
          timestamp: Date.now() + i,
          model_id: "retrain-model",
          prompt_hash: `hash-${i}`,
          physics_score: 0.89,
          safety_score: 0.94,
          coherence_score: 0.84,
          latency_ms: 102,
        });
      }

      const result = latheLoRADriftDetectorEngine.needsRetraining("retrain-model");
      expect(result.needed).toBe(false);
      expect(result.urgency).toBe("low");
    });

    it("should indicate high urgency retraining for critical drift", () => {
      for (let i = 0; i < 25; i++) {
        latheLoRADriftDetectorEngine.recordSample({
          timestamp: Date.now() + i,
          model_id: "retrain-model",
          prompt_hash: `hash-${i}`,
          physics_score: 0.65, // Critical degradation
          safety_score: 0.95,
          coherence_score: 0.85,
          latency_ms: 100,
        });
      }

      const result = latheLoRADriftDetectorEngine.needsRetraining("retrain-model");
      expect(result.needed).toBe(true);
      expect(result.urgency).toBe("high");
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it("should respect cooldown period after triggering", () => {
      for (let i = 0; i < 25; i++) {
        latheLoRADriftDetectorEngine.recordSample({
          timestamp: Date.now() + i,
          model_id: "retrain-model",
          prompt_hash: `hash-${i}`,
          physics_score: 0.65,
          safety_score: 0.95,
          coherence_score: 0.85,
          latency_ms: 100,
        });
      }

      // First trigger
      const first = latheLoRADriftDetectorEngine.triggerRetraining("retrain-model");
      expect(first.triggered).toBe(true);

      // Second trigger should be in cooldown
      const second = latheLoRADriftDetectorEngine.needsRetraining("retrain-model");
      expect(second.needed).toBe(false);
      expect(second.reasons.some(r => r.includes("cooldown"))).toBe(true);
    });
  });

  describe("summary generation", () => {
    it("should generate drift summary", () => {
      latheLoRADriftDetectorEngine.setBaseline("summary-model", {
        model_id: "summary-model",
        created_at: Date.now(),
        samples_count: 50,
        metrics: {
          physics_mean: 0.90,
          physics_std: 0.05,
          safety_mean: 0.95,
          safety_std: 0.02,
          coherence_mean: 0.85,
          coherence_std: 0.05,
          latency_mean: 100,
          latency_std: 10,
        },
      });

      for (let i = 0; i < 25; i++) {
        latheLoRADriftDetectorEngine.recordSample({
          timestamp: Date.now() + i,
          model_id: "summary-model",
          prompt_hash: `hash-${i}`,
          physics_score: 0.88,
          safety_score: 0.94,
          coherence_score: 0.84,
          latency_ms: 105,
        });
      }

      const summary = latheLoRADriftDetectorEngine.getSummary("summary-model");
      expect(summary).toContain("Drift Summary: summary-model");
      expect(summary).toContain("Samples: 25");
      expect(summary).toContain("physics_accuracy");
    });
  });

  describe("sample management", () => {
    it("should clear samples for model", () => {
      for (let i = 0; i < 10; i++) {
        latheLoRADriftDetectorEngine.recordSample({
          timestamp: Date.now() + i,
          model_id: "clear-model",
          prompt_hash: `hash-${i}`,
          physics_score: 0.9,
          safety_score: 0.95,
          coherence_score: 0.85,
          latency_ms: 100,
        });
      }

      expect(latheLoRADriftDetectorEngine.getSamples("clear-model").length).toBe(10);
      latheLoRADriftDetectorEngine.clearSamples("clear-model");
      expect(latheLoRADriftDetectorEngine.getSamples("clear-model").length).toBe(0);
    });

    it("should limit samples returned", () => {
      for (let i = 0; i < 20; i++) {
        latheLoRADriftDetectorEngine.recordSample({
          timestamp: Date.now() + i,
          model_id: "limit-model",
          prompt_hash: `hash-${i}`,
          physics_score: 0.9,
          safety_score: 0.95,
          coherence_score: 0.85,
          latency_ms: 100,
        });
      }

      const samples = latheLoRADriftDetectorEngine.getSamples("limit-model", 5);
      expect(samples.length).toBe(5);
    });
  });
});
