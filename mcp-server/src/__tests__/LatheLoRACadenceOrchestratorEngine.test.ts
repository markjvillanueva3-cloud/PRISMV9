/**
 * LatheLoRACadenceOrchestratorEngine Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRACadenceOrchestratorEngine } from "../engines/LatheLoRACadenceOrchestratorEngine.js";

describe("LatheLoRACadenceOrchestratorEngine", () => {
  beforeEach(() => {
    latheLoRACadenceOrchestratorEngine.reset();
  });

  describe("configuration", () => {
    it("should return default configuration", () => {
      const config = latheLoRACadenceOrchestratorEngine.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.schedule.check_interval_hours).toBe(24);
      expect(config.schedule.auto_deploy).toBe(false);
      expect(config.schedule.require_validation).toBe(true);
    });

    it("should update configuration", () => {
      latheLoRACadenceOrchestratorEngine.setConfig({
        enabled: true,
        schedule: {
          check_interval_hours: 12,
          auto_deploy: true,
        },
      });
      const config = latheLoRACadenceOrchestratorEngine.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.schedule.check_interval_hours).toBe(12);
      expect(config.schedule.auto_deploy).toBe(true);
    });
  });

  describe("cadence lifecycle", () => {
    it("should start cadence for model", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("lathe-lora-v1");
      expect(run.id).toMatch(/^cadence-/);
      expect(run.model_id).toBe("lathe-lora-v1");
      expect(run.state).toBe("monitoring");
      expect(run.events.length).toBe(1);
      expect(run.events[0].event).toBe("start_monitoring");
    });

    it("should reject starting duplicate active cadence", () => {
      latheLoRACadenceOrchestratorEngine.startCadence("model-1");
      expect(() => {
        latheLoRACadenceOrchestratorEngine.startCadence("model-1");
      }).toThrow(/Active cadence run exists/);
    });

    it("should get active run for model", () => {
      const started = latheLoRACadenceOrchestratorEngine.startCadence("active-model");
      const active = latheLoRACadenceOrchestratorEngine.getActiveRun("active-model");
      expect(active?.id).toBe(started.id);
    });

    it("should return null for model without active run", () => {
      const active = latheLoRACadenceOrchestratorEngine.getActiveRun("unknown");
      expect(active).toBeNull();
    });
  });

  describe("state transitions", () => {
    it("should transition monitoring -> drift_detected", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("drift-model");
      const updated = latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected", {
        metric: "physics_accuracy",
        deviation: 2.1,
      });

      expect(updated?.state).toBe("drift_detected");
      expect(updated?.events.length).toBe(2);
    });

    it("should transition drift_detected -> collecting_data -> training", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("training-model");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");

      const current = latheLoRACadenceOrchestratorEngine.getRun(run.id);
      expect(current?.state).toBe("collecting_data");

      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      const afterTraining = latheLoRACadenceOrchestratorEngine.getRun(run.id);
      expect(afterTraining?.state).toBe("training");
    });

    it("should complete full training cycle", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("full-cycle");

      // monitoring -> drift_detected
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected");
      // drift_detected -> collecting_data
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      // collecting_data -> training
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      // training -> validating
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "training_complete");
      // validating -> deploying
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "validation_passed");
      // deploying -> deployed
      const deployed = latheLoRACadenceOrchestratorEngine.processEvent(run.id, "deploy_complete");

      expect(deployed?.state).toBe("deployed");
      expect(deployed?.completed_at).toBeDefined();
      expect(deployed?.events.length).toBe(7);
    });

    it("should handle validation failure", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("fail-model");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "training_complete");

      const failed = latheLoRACadenceOrchestratorEngine.processEvent(run.id, "validation_failed");
      expect(failed?.state).toBe("monitoring");
    });

    it("should handle error during deployment", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("error-deploy");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "training_complete");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "validation_passed");

      const errored = latheLoRACadenceOrchestratorEngine.processEvent(run.id, "error");
      expect(errored?.state).toBe("rolling_back");
    });

    it("should handle invalid transition gracefully", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("invalid-trans");
      // Can't go from monitoring directly to training_complete
      const result = latheLoRACadenceOrchestratorEngine.processEvent(run.id, "training_complete");
      // Should return run without changing state
      expect(result?.state).toBe("monitoring");
    });

    it("should reset run to idle", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("reset-model");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected");

      const success = latheLoRACadenceOrchestratorEngine.resetRun(run.id);
      expect(success).toBe(true);

      const current = latheLoRACadenceOrchestratorEngine.getRun(run.id);
      expect(current?.state).toBe("idle");
    });
  });

  describe("metrics tracking", () => {
    it("should update run metrics", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("metrics-model");

      const success = latheLoRACadenceOrchestratorEngine.updateMetrics(run.id, {
        samples_collected: 150,
        training_duration_ms: 60000,
        validation_score: 0.92,
        previous_score: 0.85,
        improvement: 0.07,
      });

      expect(success).toBe(true);

      const updated = latheLoRACadenceOrchestratorEngine.getRun(run.id);
      expect(updated?.metrics?.samples_collected).toBe(150);
      expect(updated?.metrics?.improvement).toBe(0.07);
    });
  });

  describe("training permission", () => {
    it("should allow training when in drift_detected state", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("train-allow");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected");

      const check = latheLoRACadenceOrchestratorEngine.canTrain("train-allow");
      expect(check.allowed).toBe(true);
    });

    it("should deny training when not in correct state", () => {
      latheLoRACadenceOrchestratorEngine.startCadence("train-deny");

      const check = latheLoRACadenceOrchestratorEngine.canTrain("train-deny");
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("does not allow training");
    });

    it("should deny training when no active run", () => {
      const check = latheLoRACadenceOrchestratorEngine.canTrain("no-run");
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("No active cadence run");
    });

    it("should respect training frequency limit", () => {
      // Create completed run with recent timestamp
      const run1 = latheLoRACadenceOrchestratorEngine.startCadence("freq-model");
      latheLoRACadenceOrchestratorEngine.processEvent(run1.id, "drift_detected");
      latheLoRACadenceOrchestratorEngine.processEvent(run1.id, "start_training");
      latheLoRACadenceOrchestratorEngine.processEvent(run1.id, "start_training");
      latheLoRACadenceOrchestratorEngine.processEvent(run1.id, "training_complete");
      latheLoRACadenceOrchestratorEngine.processEvent(run1.id, "validation_passed");
      latheLoRACadenceOrchestratorEngine.processEvent(run1.id, "deploy_complete");
      // Reset first run to idle so we can start another
      latheLoRACadenceOrchestratorEngine.resetRun(run1.id);

      // Start new run and try to train immediately
      const run2 = latheLoRACadenceOrchestratorEngine.startCadence("freq-model");
      latheLoRACadenceOrchestratorEngine.processEvent(run2.id, "drift_detected");

      const check = latheLoRACadenceOrchestratorEngine.canTrain("freq-model");
      // Should be limited due to frequency (max 168h = 1 week)
      expect(check.reason).toContain("frequency limit");
    });
  });

  describe("deployment permission", () => {
    it("should allow deployment when validated", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("deploy-allow");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "training_complete");

      // Add validation score
      latheLoRACadenceOrchestratorEngine.updateMetrics(run.id, {
        validation_score: 0.95,
        previous_score: 0.90,
        improvement: 0.05,
      });

      const check = latheLoRACadenceOrchestratorEngine.canDeploy("deploy-allow");
      expect(check.allowed).toBe(true);
    });

    it("should deny deployment without validation score", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("deploy-no-score");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "training_complete");

      const check = latheLoRACadenceOrchestratorEngine.canDeploy("deploy-no-score");
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("Validation required");
    });

    it("should deny deployment if score degraded", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("deploy-degraded");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "start_training");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "training_complete");

      latheLoRACadenceOrchestratorEngine.updateMetrics(run.id, {
        validation_score: 0.80,
        previous_score: 0.90,
        improvement: -0.10,
      });

      const check = latheLoRACadenceOrchestratorEngine.canDeploy("deploy-degraded");
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("degraded");
    });
  });

  describe("notifications", () => {
    it("should generate notifications for configured events", () => {
      latheLoRACadenceOrchestratorEngine.setConfig({
        notify_on_events: ["drift_detected", "training_complete"],
      });

      const run = latheLoRACadenceOrchestratorEngine.startCadence("notify-model");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected");

      const notifications = latheLoRACadenceOrchestratorEngine.getNotifications();
      expect(notifications.some(n => n.event === "drift_detected")).toBe(true);
    });

    it("should clear notifications", () => {
      latheLoRACadenceOrchestratorEngine.setConfig({
        notify_on_events: ["drift_detected"],
      });

      const run = latheLoRACadenceOrchestratorEngine.startCadence("clear-notify");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected");

      expect(latheLoRACadenceOrchestratorEngine.getNotifications().length).toBeGreaterThan(0);

      latheLoRACadenceOrchestratorEngine.clearNotifications();
      expect(latheLoRACadenceOrchestratorEngine.getNotifications().length).toBe(0);
    });
  });

  describe("reporting", () => {
    it("should generate cadence report", () => {
      const run = latheLoRACadenceOrchestratorEngine.startCadence("report-model");
      latheLoRACadenceOrchestratorEngine.processEvent(run.id, "drift_detected");
      latheLoRACadenceOrchestratorEngine.updateMetrics(run.id, {
        samples_collected: 100,
        improvement: 0.05,
      });

      const report = latheLoRACadenceOrchestratorEngine.generateReport("report-model");
      expect(report).toContain("# Cadence Report: report-model");
      expect(report).toContain("State: drift_detected");
      expect(report).toContain("Check Interval:");
    });

    it("should get state diagram", () => {
      const diagram = latheLoRACadenceOrchestratorEngine.getStateDiagram();
      expect(diagram).toContain("idle");
      expect(diagram).toContain("monitoring");
      expect(diagram).toContain("training");
      expect(diagram).toContain("deployed");
    });
  });

  describe("run queries", () => {
    it("should get all runs", () => {
      const r1 = latheLoRACadenceOrchestratorEngine.startCadence("model-1");
      latheLoRACadenceOrchestratorEngine.resetRun(r1.id);

      const r2 = latheLoRACadenceOrchestratorEngine.startCadence("model-2");
      latheLoRACadenceOrchestratorEngine.resetRun(r2.id);

      const runs = latheLoRACadenceOrchestratorEngine.getAllRuns();
      expect(runs.length).toBe(2);
    });

    it("should get runs by state", () => {
      const r1 = latheLoRACadenceOrchestratorEngine.startCadence("state-model-1");
      const r2 = latheLoRACadenceOrchestratorEngine.startCadence("state-model-2");
      latheLoRACadenceOrchestratorEngine.processEvent(r2.id, "drift_detected");

      // Note: r1 was overwritten by r2 since same model can't have two active runs
      // Need different models
      latheLoRACadenceOrchestratorEngine.reset();

      const run1 = latheLoRACadenceOrchestratorEngine.startCadence("model-a");
      const run2 = latheLoRACadenceOrchestratorEngine.startCadence("model-b");
      latheLoRACadenceOrchestratorEngine.processEvent(run2.id, "drift_detected");

      const monitoring = latheLoRACadenceOrchestratorEngine.getRunsByState("monitoring");
      expect(monitoring.length).toBe(1);

      const drifting = latheLoRACadenceOrchestratorEngine.getRunsByState("drift_detected");
      expect(drifting.length).toBe(1);
    });

    it("should limit runs returned", () => {
      for (let i = 0; i < 5; i++) {
        const run = latheLoRACadenceOrchestratorEngine.startCadence(`limit-model-${i}`);
        latheLoRACadenceOrchestratorEngine.resetRun(run.id);
      }

      const runs = latheLoRACadenceOrchestratorEngine.getAllRuns(3);
      expect(runs.length).toBe(3);
    });
  });
});
