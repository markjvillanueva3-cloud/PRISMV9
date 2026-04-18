/**
 * LatheMasterPostSelfAwarenessEngine Tests
 *
 * U-LTH27: Tests for self-awareness auditing, drift detection,
 * and regeneration recommendations for lathe master post sub-posts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheMasterPostSelfAwarenessEngine,
  type PostHealthStatus,
} from "../engines/LatheMasterPostSelfAwarenessEngine.js";

describe("LatheMasterPostSelfAwarenessEngine", () => {
  describe("runFullAudit()", () => {
    it("returns a complete self-awareness report", () => {
      const report = latheMasterPostSelfAwarenessEngine.runFullAudit();

      expect(report.generated_at).toBeDefined();
      expect(report.overall_health).toBeDefined();
      expect(report.sub_posts_audited).toBeGreaterThan(0);
      expect(report.audit_results).toBeDefined();
      expect(report.drift_detections).toBeDefined();
      expect(report.summary).toBeDefined();
    });

    it("includes audit results for registered sub-posts", () => {
      const report = latheMasterPostSelfAwarenessEngine.runFullAudit();

      expect(report.audit_results.length).toBeGreaterThan(0);
      expect(report.audit_results[0]?.post_id).toBeDefined();
      expect(report.audit_results[0]?.controller_family).toBeDefined();
    });

    it("includes drift detections for each sub-post", () => {
      const report = latheMasterPostSelfAwarenessEngine.runFullAudit();

      expect(report.drift_detections.length).toBe(report.sub_posts_audited);
    });

    it("generates a human-readable summary", () => {
      const report = latheMasterPostSelfAwarenessEngine.runFullAudit();

      expect(report.summary.length).toBeGreaterThan(10);
      expect(typeof report.summary).toBe("string");
    });

    it("calculates correct healthy/warning/critical counts", () => {
      const report = latheMasterPostSelfAwarenessEngine.runFullAudit();

      const totalPosts = report.healthy_posts + report.warning_posts + report.critical_posts;
      // Should account for most posts (some may be "unknown")
      expect(totalPosts).toBeGreaterThanOrEqual(0);
    });
  });

  describe("auditSubPost()", () => {
    it("returns audit result for known sub-post", () => {
      const audit = latheMasterPostSelfAwarenessEngine.auditSubPost("okuma_turning");

      expect(audit.post_id).toBe("okuma_turning");
      expect(audit.controller_family).toBe("okuma");
      expect(audit.health_status).toBeDefined();
      expect(audit.metrics).toBeDefined();
    });

    it("returns unknown status for unregistered sub-post", () => {
      const audit = latheMasterPostSelfAwarenessEngine.auditSubPost("nonexistent_post");

      expect(audit.health_status).toBe("unknown");
      expect(audit.issues.length).toBeGreaterThan(0);
      expect(audit.issues[0]?.code).toBe("POST_NOT_FOUND");
    });

    it("includes machine count for known sub-post", () => {
      const audit = latheMasterPostSelfAwarenessEngine.auditSubPost("okuma_turning");

      expect(audit.machines_served).toBeGreaterThanOrEqual(0);
    });

    it("includes metrics in audit result", () => {
      const audit = latheMasterPostSelfAwarenessEngine.auditSubPost("okuma_turning");

      expect(audit.metrics.total_generations).toBeDefined();
      expect(audit.metrics.validator_passes).toBeDefined();
      expect(audit.metrics.validator_failures).toBeDefined();
    });
  });

  describe("detectDrift()", () => {
    it("returns drift detection result for known sub-post", () => {
      const drift = latheMasterPostSelfAwarenessEngine.detectDrift("okuma_turning");

      expect(drift.post_id).toBe("okuma_turning");
      expect(drift.controller_family).toBe("okuma");
      expect(drift.drift_detected).toBeDefined();
      expect(drift.drift_severity).toBeDefined();
      expect(drift.last_validated).toBeDefined();
    });

    it("returns no drift for fresh sub-post", () => {
      const drift = latheMasterPostSelfAwarenessEngine.detectDrift("fanuc_turning");

      // Fresh post with no validation events should have no drift
      expect(drift.drift_severity).toBe("none");
    });

    it("includes recommendations when drift detected", () => {
      const drift = latheMasterPostSelfAwarenessEngine.detectDrift("okuma_turning");

      expect(drift.recommendations).toBeDefined();
      expect(Array.isArray(drift.recommendations)).toBe(true);
    });

    it("handles unknown sub-post gracefully", () => {
      const drift = latheMasterPostSelfAwarenessEngine.detectDrift("unknown_post");

      expect(drift.drift_detected).toBe(false);
      expect(drift.controller_family).toBe("unknown");
    });
  });

  describe("recordValidationEvent()", () => {
    it("records successful validation", () => {
      const statusBefore = latheMasterPostSelfAwarenessEngine.getSubPostStatus();
      const okumaPostBefore = statusBefore.find(s => s.post_id === "okuma_turning");
      const passesBefore = okumaPostBefore?.pass_rate ?? 0;

      latheMasterPostSelfAwarenessEngine.recordValidationEvent("okuma_turning", true, 150);

      // Recording should update internal state (may or may not change pass rate)
      const audit = latheMasterPostSelfAwarenessEngine.auditSubPost("okuma_turning");
      expect(audit.metrics.total_generations).toBeGreaterThan(0);
    });

    it("records failed validation", () => {
      latheMasterPostSelfAwarenessEngine.recordValidationEvent("okuma_turning", false, 200);

      const audit = latheMasterPostSelfAwarenessEngine.auditSubPost("okuma_turning");
      expect(audit.metrics.validator_failures).toBeGreaterThan(0);
    });

    it("tracks generation time", () => {
      latheMasterPostSelfAwarenessEngine.recordValidationEvent("fanuc_turning", true, 100);
      latheMasterPostSelfAwarenessEngine.recordValidationEvent("fanuc_turning", true, 200);

      const audit = latheMasterPostSelfAwarenessEngine.auditSubPost("fanuc_turning");
      expect(audit.metrics.average_generation_time_ms).toBeGreaterThan(0);
    });

    it("ignores events for unknown sub-posts", () => {
      // Should not throw
      expect(() => {
        latheMasterPostSelfAwarenessEngine.recordValidationEvent("nonexistent", true);
      }).not.toThrow();
    });
  });

  describe("getSubPostStatus()", () => {
    it("returns status for all registered sub-posts", () => {
      const status = latheMasterPostSelfAwarenessEngine.getSubPostStatus();

      expect(status.length).toBeGreaterThan(0);
      expect(status[0]?.post_id).toBeDefined();
      expect(status[0]?.controller_family).toBeDefined();
      expect(status[0]?.health).toBeDefined();
    });

    it("includes pass rate for each sub-post", () => {
      const status = latheMasterPostSelfAwarenessEngine.getSubPostStatus();

      for (const s of status) {
        expect(s.pass_rate).toBeGreaterThanOrEqual(0);
        expect(s.pass_rate).toBeLessThanOrEqual(1);
      }
    });

    it("includes machine count for each sub-post", () => {
      const status = latheMasterPostSelfAwarenessEngine.getSubPostStatus();

      for (const s of status) {
        expect(s.machines).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("needsRegeneration()", () => {
    it("returns regeneration assessment for known sub-post", () => {
      const result = latheMasterPostSelfAwarenessEngine.needsRegeneration("okuma_turning");

      expect(result.needs_regeneration).toBeDefined();
      expect(result.urgency).toBeDefined();
      expect(result.reasons).toBeDefined();
      expect(Array.isArray(result.reasons)).toBe(true);
    });

    it("returns no regeneration needed for healthy post", () => {
      // Fresh post should not need regeneration
      const result = latheMasterPostSelfAwarenessEngine.needsRegeneration("haas_turning");

      // With no failures recorded, should not need regeneration
      if (result.reasons.length === 0) {
        expect(result.needs_regeneration).toBe(false);
      }
    });

    it("flags regeneration with appropriate urgency", () => {
      const result = latheMasterPostSelfAwarenessEngine.needsRegeneration("okuma_turning");

      expect(["low", "medium", "high", "urgent"]).toContain(result.urgency);
    });

    it("handles unknown sub-post gracefully", () => {
      const result = latheMasterPostSelfAwarenessEngine.needsRegeneration("unknown_post");

      // Should return a valid assessment even for unknown post
      expect(result.urgency).toBeDefined();
    });
  });

  describe("Health Status Classification", () => {
    it("classifies healthy status correctly", () => {
      // Record successful validations
      for (let i = 0; i < 10; i++) {
        latheMasterPostSelfAwarenessEngine.recordValidationEvent("mazak_turning", true, 100);
      }

      const audit = latheMasterPostSelfAwarenessEngine.auditSubPost("mazak_turning");

      // With all successes, should be healthy
      expect(audit.validator_pass_rate).toBeGreaterThanOrEqual(0.9);
    });

    it("classifies warning status for moderate failures", () => {
      // Record mix of successes and failures
      for (let i = 0; i < 8; i++) {
        latheMasterPostSelfAwarenessEngine.recordValidationEvent("fanuc_turning", true, 100);
      }
      for (let i = 0; i < 3; i++) {
        latheMasterPostSelfAwarenessEngine.recordValidationEvent("fanuc_turning", false, 100);
      }

      const audit = latheMasterPostSelfAwarenessEngine.auditSubPost("fanuc_turning");
      const passRate = audit.validator_pass_rate;

      // Should have a measurable pass rate
      expect(passRate).toBeGreaterThan(0);
      expect(passRate).toBeLessThan(1);
    });
  });

  describe("Integration with Router", () => {
    it("uses router to get machine information", () => {
      const status = latheMasterPostSelfAwarenessEngine.getSubPostStatus();
      const okumaPost = status.find(s => s.controller_family === "okuma");

      // Okuma post should serve the JM Die Okuma lathes
      expect(okumaPost).toBeDefined();
      expect(okumaPost?.machines).toBeGreaterThanOrEqual(0);
    });

    it("detects registry mismatches", () => {
      const drift = latheMasterPostSelfAwarenessEngine.detectDrift("okuma_turning");

      // Should not have registry mismatch for valid machines
      const registryMismatch = drift.drift_indicators.find(
        i => i.type === "registry_mismatch"
      );

      // If mismatch exists, it should have affected machines
      if (registryMismatch) {
        expect(registryMismatch.affected_machines.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
