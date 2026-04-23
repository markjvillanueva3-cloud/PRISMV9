/**
 * Tests for LatheLoRAMonitoringEngine — LATHE-LORA-MS0 U-LLR49
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAMonitoringEngine } from "../engines/LatheLoRAMonitoringEngine.js";

describe("LatheLoRAMonitoringEngine", () => {
  beforeEach(() => {
    latheLoRAMonitoringEngine.reset();
  });

  const makeRecord = (deploymentId: string, success = true, latency = 100) => ({
    timestamp: Date.now(),
    deployment_id: deploymentId,
    latency_ms: latency,
    success,
  });

  describe("Configuration", () => {
    it("should have default config", () => {
      const c = latheLoRAMonitoringEngine.getConfig();
      expect(c.error_rate_threshold).toBe(0.05);
      expect(c.latency_threshold_ms).toBe(2000);
    });

    it("should update config", () => {
      latheLoRAMonitoringEngine.setConfig({ error_rate_threshold: 0.01 });
      expect(latheLoRAMonitoringEngine.getConfig().error_rate_threshold).toBe(0.01);
    });
  });

  describe("Request Recording", () => {
    it("should record request", () => {
      latheLoRAMonitoringEngine.recordRequest(makeRecord("d1"));
      const records = latheLoRAMonitoringEngine.getRecordsInWindow("d1");
      expect(records.length).toBe(1);
    });

    it("should record multiple deployments", () => {
      latheLoRAMonitoringEngine.recordRequest(makeRecord("d1"));
      latheLoRAMonitoringEngine.recordRequest(makeRecord("d2"));
      expect(latheLoRAMonitoringEngine.getMonitoredDeployments().length).toBe(2);
    });
  });

  describe("Health Computation", () => {
    it("should report unknown with no data", () => {
      const h = latheLoRAMonitoringEngine.getHealth("none");
      expect(h.state).toBe("unknown");
      expect(h.request_count).toBe(0);
    });

    it("should report healthy for good metrics", () => {
      for (let i = 0; i < 20; i++) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", true, 100));
      }
      const h = latheLoRAMonitoringEngine.getHealth("d1");
      expect(h.state).toBe("healthy");
    });

    it("should report degraded on high errors", () => {
      for (let i = 0; i < 15; i++) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", true, 100));
      }
      for (let i = 0; i < 2; i++) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", false, 100));
      }
      const h = latheLoRAMonitoringEngine.getHealth("d1");
      expect(["degraded", "unhealthy"]).toContain(h.state);
    });

    it("should compute error rate", () => {
      for (let i = 0; i < 8; i++) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", true));
      }
      for (let i = 0; i < 2; i++) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", false));
      }
      const h = latheLoRAMonitoringEngine.getHealth("d1");
      expect(h.error_rate).toBeCloseTo(0.2, 2);
    });

    it("should compute latency percentiles", () => {
      const latencies = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
      for (const l of latencies) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", true, l));
      }
      const h = latheLoRAMonitoringEngine.getHealth("d1");
      expect(h.p50_latency_ms).toBeGreaterThan(200);
      expect(h.p95_latency_ms).toBeGreaterThan(h.p50_latency_ms);
      expect(h.p99_latency_ms).toBeGreaterThanOrEqual(h.p95_latency_ms);
    });
  });

  describe("Alerts", () => {
    it("should emit alert on high error rate", () => {
      for (let i = 0; i < 15; i++) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", true, 100));
      }
      for (let i = 0; i < 5; i++) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", false, 100));
      }
      const alerts = latheLoRAMonitoringEngine.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it("should emit alert on high latency", () => {
      for (let i = 0; i < 20; i++) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", true, 5000));
      }
      const alerts = latheLoRAMonitoringEngine.getActiveAlerts();
      expect(alerts.some(a => a.metric === "p95_latency")).toBe(true);
    });

    it("should acknowledge alert", () => {
      for (let i = 0; i < 20; i++) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", true, 5000));
      }
      const alerts = latheLoRAMonitoringEngine.getActiveAlerts();
      if (alerts.length > 0) {
        latheLoRAMonitoringEngine.acknowledgeAlert(alerts[0].id);
        expect(alerts[0].acknowledged).toBe(true);
      }
    });

    it("should deduplicate alerts within 1 minute", () => {
      for (let i = 0; i < 30; i++) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", true, 5000));
      }
      const alerts1 = latheLoRAMonitoringEngine.getAllAlerts();
      for (let i = 0; i < 30; i++) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", true, 5000));
      }
      const alerts2 = latheLoRAMonitoringEngine.getAllAlerts();
      expect(alerts2.length).toBe(alerts1.length); // deduped
    });
  });

  describe("Stats", () => {
    it("should compute aggregate stats", () => {
      for (let i = 0; i < 10; i++) {
        latheLoRAMonitoringEngine.recordRequest(makeRecord("d1", true));
      }
      const stats = latheLoRAMonitoringEngine.getStats();
      expect(stats.monitored_deployments).toBe(1);
      expect(stats.total_requests).toBe(10);
    });

    it("should return summary", () => {
      expect(latheLoRAMonitoringEngine.getSummary()).toContain("Monitoring");
    });
  });
});
