/**
 * LatheLoRAHealthMonitorEngine Tests
 * LATHE-LORA-MS0 U-LLR23: Health monitoring and alerting
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAHealthMonitorEngine, type HealthCheck, type QualityCheck } from "../engines/LatheLoRAHealthMonitorEngine.js";

describe("LatheLoRAHealthMonitorEngine", () => {
  beforeEach(() => {
    latheLoRAHealthMonitorEngine.reset();
  });

  describe("setConfig / getConfig", () => {
    it("has sensible defaults", () => {
      const config = latheLoRAHealthMonitorEngine.getConfig();

      expect(config.check_interval_ms).toBe(60000);
      expect(config.latency_threshold_ms).toBe(5000);
      expect(config.error_rate_threshold).toBe(0.1);
      expect(config.consecutive_failures_alert).toBe(3);
      expect(config.memory_threshold_mb).toBe(8000);
      expect(config.quality_check_enabled).toBe(true);
    });

    it("allows config updates", () => {
      latheLoRAHealthMonitorEngine.setConfig({
        latency_threshold_ms: 3000,
        error_rate_threshold: 0.05,
      });

      const config = latheLoRAHealthMonitorEngine.getConfig();
      expect(config.latency_threshold_ms).toBe(3000);
      expect(config.error_rate_threshold).toBe(0.05);
    });
  });

  describe("registerModel", () => {
    it("registers model with initial metrics", () => {
      latheLoRAHealthMonitorEngine.registerModel("lathe-lora-7b");

      const metrics = latheLoRAHealthMonitorEngine.getMetrics("lathe-lora-7b");

      expect(metrics).toBeDefined();
      expect(metrics?.checks_total).toBe(0);
      expect(metrics?.uptime_percent).toBe(100);
      expect(metrics?.consecutive_failures).toBe(0);
    });

    it("is idempotent", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      expect(latheLoRAHealthMonitorEngine.getAllMetrics().length).toBe(1);
    });
  });

  describe("recordHealthCheck", () => {
    it("records healthy check", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      const check: HealthCheck = {
        model_id: "model-1",
        timestamp: Date.now(),
        status: "healthy",
        latency_ms: 250,
        available: true,
        response_valid: true,
      };

      latheLoRAHealthMonitorEngine.recordHealthCheck(check);

      const metrics = latheLoRAHealthMonitorEngine.getMetrics("model-1");
      expect(metrics?.checks_total).toBe(1);
      expect(metrics?.checks_passed).toBe(1);
      expect(metrics?.uptime_percent).toBe(100);
    });

    it("records unhealthy check", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      latheLoRAHealthMonitorEngine.recordHealthCheck({
        model_id: "model-1",
        timestamp: Date.now(),
        status: "unhealthy",
        latency_ms: 0,
        available: false,
        response_valid: false,
        error: "Connection refused",
      });

      const metrics = latheLoRAHealthMonitorEngine.getMetrics("model-1");
      expect(metrics?.checks_passed).toBe(0);
      expect(metrics?.consecutive_failures).toBe(1);
    });

    it("auto-registers unknown model", () => {
      latheLoRAHealthMonitorEngine.recordHealthCheck({
        model_id: "new-model",
        timestamp: Date.now(),
        status: "healthy",
        latency_ms: 100,
        available: true,
        response_valid: true,
      });

      expect(latheLoRAHealthMonitorEngine.getMetrics("new-model")).toBeDefined();
    });

    it("calculates latency percentiles", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      for (let i = 0; i < 20; i++) {
        latheLoRAHealthMonitorEngine.recordHealthCheck({
          model_id: "model-1",
          timestamp: Date.now(),
          status: "healthy",
          latency_ms: 100 + i * 10,
          available: true,
          response_valid: true,
        });
      }

      const metrics = latheLoRAHealthMonitorEngine.getMetrics("model-1");
      expect(metrics?.avg_latency_ms).toBeGreaterThan(100);
      expect(metrics?.p95_latency_ms).toBeGreaterThan(metrics?.avg_latency_ms ?? 0);
    });

    it("creates alert on high latency", () => {
      latheLoRAHealthMonitorEngine.setConfig({ latency_threshold_ms: 100 });
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      latheLoRAHealthMonitorEngine.recordHealthCheck({
        model_id: "model-1",
        timestamp: Date.now(),
        status: "healthy",
        latency_ms: 500,
        available: true,
        response_valid: true,
      });

      const alerts = latheLoRAHealthMonitorEngine.getActiveAlerts("model-1");
      expect(alerts.some(a => a.message.includes("latency"))).toBe(true);
    });

    it("creates alert on consecutive failures", () => {
      latheLoRAHealthMonitorEngine.setConfig({ consecutive_failures_alert: 2 });
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      for (let i = 0; i < 3; i++) {
        latheLoRAHealthMonitorEngine.recordHealthCheck({
          model_id: "model-1",
          timestamp: Date.now(),
          status: "unhealthy",
          latency_ms: 0,
          available: false,
          response_valid: false,
        });
      }

      const alerts = latheLoRAHealthMonitorEngine.getActiveAlerts("model-1");
      expect(alerts.some(a => a.message.includes("consecutive"))).toBe(true);
    });

    it("creates alert on memory threshold", () => {
      latheLoRAHealthMonitorEngine.setConfig({ memory_threshold_mb: 4000 });
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      latheLoRAHealthMonitorEngine.recordHealthCheck({
        model_id: "model-1",
        timestamp: Date.now(),
        status: "healthy",
        latency_ms: 100,
        available: true,
        response_valid: true,
        memory_usage_mb: 5000,
      });

      const alerts = latheLoRAHealthMonitorEngine.getActiveAlerts("model-1");
      expect(alerts.some(a => a.message.includes("Memory"))).toBe(true);
    });
  });

  describe("recordQualityCheck", () => {
    it("records passing quality check", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      const check: QualityCheck = {
        model_id: "model-1",
        timestamp: Date.now(),
        passed: true,
        physics_score: 85,
        safety_score: 90,
        coherence_score: 88,
        sample_prompt: "What is CSS?",
        sample_response: "Constant Surface Speed...",
        issues: [],
      };

      latheLoRAHealthMonitorEngine.recordQualityCheck(check);

      const history = latheLoRAHealthMonitorEngine.getQualityHistory("model-1");
      expect(history.length).toBe(1);
      expect(history[0].passed).toBe(true);
    });

    it("creates alert on failed quality check", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      latheLoRAHealthMonitorEngine.recordQualityCheck({
        model_id: "model-1",
        timestamp: Date.now(),
        passed: false,
        physics_score: 70,
        safety_score: 80,
        coherence_score: 75,
        sample_prompt: "test",
        sample_response: "bad response",
        issues: ["Missing physics terminology", "Incomplete explanation"],
      });

      const alerts = latheLoRAHealthMonitorEngine.getActiveAlerts("model-1");
      expect(alerts.some(a => a.message.includes("Quality check failed"))).toBe(true);
    });

    it("creates alert on low physics score", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      latheLoRAHealthMonitorEngine.recordQualityCheck({
        model_id: "model-1",
        timestamp: Date.now(),
        passed: true,
        physics_score: 60,
        safety_score: 90,
        coherence_score: 85,
        sample_prompt: "test",
        sample_response: "response",
        issues: [],
      });

      const alerts = latheLoRAHealthMonitorEngine.getActiveAlerts("model-1");
      expect(alerts.some(a => a.message.includes("Physics score"))).toBe(true);
    });

    it("creates error alert on low safety score", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      latheLoRAHealthMonitorEngine.recordQualityCheck({
        model_id: "model-1",
        timestamp: Date.now(),
        passed: false,
        physics_score: 80,
        safety_score: 50,
        coherence_score: 70,
        sample_prompt: "test",
        sample_response: "response",
        issues: ["Safety concerns"],
      });

      const alerts = latheLoRAHealthMonitorEngine.getActiveAlerts("model-1");
      const safetyAlert = alerts.find(a => a.message.includes("Safety score"));
      expect(safetyAlert?.severity).toBe("error");
    });
  });

  describe("getQualityCheckPrompts", () => {
    it("returns quality check prompts", () => {
      const prompts = latheLoRAHealthMonitorEngine.getQualityCheckPrompts();

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].prompt).toBeDefined();
      expect(prompts[0].expected_keywords).toBeDefined();
    });
  });

  describe("evaluateQualityResponse", () => {
    it("evaluates response with found keywords", () => {
      const prompt = {
        prompt: "What is surface speed?",
        expected_keywords: ["SFM", "feet", "minute", "surface"],
      };

      const result = latheLoRAHealthMonitorEngine.evaluateQualityResponse(
        prompt,
        "Surface speed is measured in SFM (Surface Feet per Minute)."
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.found_keywords).toContain("SFM");
    });

    it("fails with missing keywords", () => {
      const prompt = {
        prompt: "What is surface speed?",
        expected_keywords: ["SFM", "feet", "minute", "surface", "cutting"],
      };

      const result = latheLoRAHealthMonitorEngine.evaluateQualityResponse(
        prompt,
        "I don't know."
      );

      expect(result.passed).toBe(false);
      expect(result.missing_keywords.length).toBeGreaterThan(0);
    });
  });

  describe("createAlert / resolveAlert", () => {
    it("creates and resolves alert", () => {
      const alert = latheLoRAHealthMonitorEngine.createAlert(
        "model-1",
        "warning",
        "Test alert"
      );

      expect(alert.id).toBeDefined();
      expect(alert.resolved).toBe(false);

      const resolved = latheLoRAHealthMonitorEngine.resolveAlert(alert.id);
      expect(resolved).toBe(true);

      const alerts = latheLoRAHealthMonitorEngine.getActiveAlerts("model-1");
      expect(alerts.find(a => a.id === alert.id)).toBeUndefined();
    });

    it("prevents duplicate unresolved alerts", () => {
      latheLoRAHealthMonitorEngine.createAlert("model-1", "warning", "Same message");
      latheLoRAHealthMonitorEngine.createAlert("model-1", "warning", "Same message");

      const alerts = latheLoRAHealthMonitorEngine.getActiveAlerts("model-1");
      expect(alerts.filter(a => a.message === "Same message").length).toBe(1);
    });
  });

  describe("getActiveAlerts / getAllAlerts", () => {
    it("filters by model", () => {
      latheLoRAHealthMonitorEngine.createAlert("model-1", "warning", "Alert 1");
      latheLoRAHealthMonitorEngine.createAlert("model-2", "error", "Alert 2");

      const model1Alerts = latheLoRAHealthMonitorEngine.getActiveAlerts("model-1");
      expect(model1Alerts.length).toBe(1);
      expect(model1Alerts[0].model_id).toBe("model-1");
    });

    it("returns all when no filter", () => {
      latheLoRAHealthMonitorEngine.createAlert("model-1", "warning", "Alert 1");
      latheLoRAHealthMonitorEngine.createAlert("model-2", "error", "Alert 2");

      const allAlerts = latheLoRAHealthMonitorEngine.getActiveAlerts();
      expect(allAlerts.length).toBe(2);
    });

    it("respects limit in getAllAlerts", () => {
      for (let i = 0; i < 10; i++) {
        latheLoRAHealthMonitorEngine.createAlert("model-1", "info", `Alert ${i}`);
        latheLoRAHealthMonitorEngine.resolveAlert(`alert-${i}`);
      }

      const limited = latheLoRAHealthMonitorEngine.getAllAlerts("model-1", 5);
      expect(limited.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getHealthStatus", () => {
    it("returns unknown for unregistered model", () => {
      expect(latheLoRAHealthMonitorEngine.getHealthStatus("unknown")).toBe("unknown");
    });

    it("returns unknown for model with no checks", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");
      expect(latheLoRAHealthMonitorEngine.getHealthStatus("model-1")).toBe("unknown");
    });

    it("returns healthy for good model", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");
      latheLoRAHealthMonitorEngine.recordHealthCheck({
        model_id: "model-1",
        timestamp: Date.now(),
        status: "healthy",
        latency_ms: 100,
        available: true,
        response_valid: true,
      });

      expect(latheLoRAHealthMonitorEngine.getHealthStatus("model-1")).toBe("healthy");
    });

    it("returns unhealthy on consecutive failures", () => {
      latheLoRAHealthMonitorEngine.setConfig({ consecutive_failures_alert: 2 });
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      for (let i = 0; i < 3; i++) {
        latheLoRAHealthMonitorEngine.recordHealthCheck({
          model_id: "model-1",
          timestamp: Date.now(),
          status: "unhealthy",
          latency_ms: 0,
          available: false,
          response_valid: false,
        });
      }

      expect(latheLoRAHealthMonitorEngine.getHealthStatus("model-1")).toBe("unhealthy");
    });

    it("returns degraded on high error rate", () => {
      latheLoRAHealthMonitorEngine.setConfig({ error_rate_threshold: 0.3, consecutive_failures_alert: 10 });
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      // Interleave failures to avoid consecutive failures triggering unhealthy
      const pattern = [true, false, true, false, true, false, true, false, false, false];
      for (let i = 0; i < 10; i++) {
        const healthy = pattern[i];
        latheLoRAHealthMonitorEngine.recordHealthCheck({
          model_id: "model-1",
          timestamp: Date.now(),
          status: healthy ? "healthy" : "degraded",
          latency_ms: healthy ? 100 : 50,
          available: true,
          response_valid: healthy,
        });
      }

      expect(latheLoRAHealthMonitorEngine.getHealthStatus("model-1")).toBe("degraded");
    });
  });

  describe("getHealthHistory / getQualityHistory", () => {
    it("returns health check history", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");

      for (let i = 0; i < 5; i++) {
        latheLoRAHealthMonitorEngine.recordHealthCheck({
          model_id: "model-1",
          timestamp: Date.now() + i,
          status: "healthy",
          latency_ms: 100,
          available: true,
          response_valid: true,
        });
      }

      const history = latheLoRAHealthMonitorEngine.getHealthHistory("model-1", 3);
      expect(history.length).toBe(3);
    });
  });

  describe("generateReport", () => {
    it("generates health report", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");
      latheLoRAHealthMonitorEngine.recordHealthCheck({
        model_id: "model-1",
        timestamp: Date.now(),
        status: "healthy",
        latency_ms: 150,
        available: true,
        response_valid: true,
      });

      const report = latheLoRAHealthMonitorEngine.generateReport("model-1");

      expect(report).toContain("Health Report");
      expect(report).toContain("model-1");
      expect(report).toContain("HEALTHY");
      expect(report).toContain("Uptime:");
      expect(report).toContain("Avg Latency:");
    });

    it("returns error for unknown model", () => {
      const report = latheLoRAHealthMonitorEngine.generateReport("unknown");
      expect(report).toContain("not registered");
    });
  });

  describe("getSummary", () => {
    it("returns overall summary", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");
      latheLoRAHealthMonitorEngine.registerModel("model-2");

      latheLoRAHealthMonitorEngine.recordHealthCheck({
        model_id: "model-1",
        timestamp: Date.now(),
        status: "healthy",
        latency_ms: 100,
        available: true,
        response_valid: true,
      });

      latheLoRAHealthMonitorEngine.createAlert("model-2", "error", "Test error");

      const summary = latheLoRAHealthMonitorEngine.getSummary();

      expect(summary).toContain("Health Monitor Summary");
      expect(summary).toContain("Models:");
      expect(summary).toContain("Active Alerts:");
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      latheLoRAHealthMonitorEngine.registerModel("model-1");
      latheLoRAHealthMonitorEngine.createAlert("model-1", "warning", "Test");

      latheLoRAHealthMonitorEngine.reset();

      expect(latheLoRAHealthMonitorEngine.getAllMetrics().length).toBe(0);
      expect(latheLoRAHealthMonitorEngine.getActiveAlerts().length).toBe(0);
    });
  });
});
