/**
 * LatheMasterPostSelfAwarenessEngine Tests — LATHE-MASTER U-LTH27
 *
 * Tests for sub-post drift detection, audit, and remediation recommendations.
 * Exit Gate: Seeded drift detection produces remediation recommendation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  LatheMasterPostSelfAwarenessEngine,
  type SubPostEntry,
  type SubPostDialect,
  type DriftDetectionResult,
  type AuditReport,
  type ValidationStatus,
  type SubPostFeatures,
  SubPostEntrySchema,
  AuditConfigSchema,
  RegisterSubPostInputSchema,
} from "../engines/LatheMasterPostSelfAwarenessEngine.js";

describe("LatheMasterPostSelfAwarenessEngine", () => {
  beforeEach(() => {
    LatheMasterPostSelfAwarenessEngine.clearRegistry();
  });

  describe("registerSubPost", () => {
    it("registers a new sub-post with minimal input", () => {
      const entry = LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "okuma-lb3000-post",
        name: "Okuma LB3000 Post",
        dialect: "okuma",
      });

      expect(entry.id).toBe("okuma-lb3000-post");
      expect(entry.name).toBe("Okuma LB3000 Post");
      expect(entry.dialect).toBe("okuma");
      expect(entry.version).toBe("1.0.0");
      expect(entry.validationStatus.passed).toBe(true);
      expect(entry.checksum).toBeTruthy();
    });

    it("registers with full features specified", () => {
      const features: SubPostFeatures = {
        cssSupport: true,
        cannedCycles: ["G70", "G71", "G76"],
        liveTooling: true,
        subSpindle: true,
        cAxis: true,
        yAxis: true,
        bAxis: false,
        barFeeder: false,
        partCatcher: true,
      };

      const entry = LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "okuma-multus-post",
        name: "Okuma Multus B300 Post",
        dialect: "okuma",
        version: "2.0.0",
        machineIds: ["okuma-multus-b300"],
        features,
      });

      expect(entry.features.liveTooling).toBe(true);
      expect(entry.features.subSpindle).toBe(true);
      expect(entry.features.cannedCycles).toEqual(["G70", "G71", "G76"]);
      expect(entry.machineIds).toContain("okuma-multus-b300");
    });

    it("registers all 7 dialects", () => {
      const dialects: SubPostDialect[] = ["okuma", "fanuc", "mitsubishi", "haas", "mazak", "citizen", "generic"];

      for (const dialect of dialects) {
        const entry = LatheMasterPostSelfAwarenessEngine.registerSubPost({
          id: `${dialect}-post`,
          name: `${dialect.toUpperCase()} Post`,
          dialect,
        });
        expect(entry.dialect).toBe(dialect);
      }

      expect(LatheMasterPostSelfAwarenessEngine.getAllSubPosts()).toHaveLength(7);
    });

    it("updates existing sub-post on re-registration", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "test-post",
        name: "Test Post v1",
        dialect: "generic",
      });

      const updated = LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "test-post",
        name: "Test Post v2",
        dialect: "fanuc",
        version: "2.0.0",
      });

      expect(updated.name).toBe("Test Post v2");
      expect(updated.dialect).toBe("fanuc");
      expect(updated.version).toBe("2.0.0");
      expect(LatheMasterPostSelfAwarenessEngine.getAllSubPosts()).toHaveLength(1);
    });
  });

  describe("getSubPost and getAllSubPosts", () => {
    beforeEach(() => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({ id: "post-1", name: "Post 1", dialect: "okuma" });
      LatheMasterPostSelfAwarenessEngine.registerSubPost({ id: "post-2", name: "Post 2", dialect: "fanuc" });
      LatheMasterPostSelfAwarenessEngine.registerSubPost({ id: "post-3", name: "Post 3", dialect: "okuma" });
    });

    it("retrieves sub-post by ID", () => {
      const post = LatheMasterPostSelfAwarenessEngine.getSubPost("post-2");
      expect(post).toBeDefined();
      expect(post?.name).toBe("Post 2");
      expect(post?.dialect).toBe("fanuc");
    });

    it("returns undefined for non-existent ID", () => {
      const post = LatheMasterPostSelfAwarenessEngine.getSubPost("non-existent");
      expect(post).toBeUndefined();
    });

    it("returns all registered sub-posts", () => {
      const all = LatheMasterPostSelfAwarenessEngine.getAllSubPosts();
      expect(all).toHaveLength(3);
      expect(all.map(p => p.id)).toContain("post-1");
      expect(all.map(p => p.id)).toContain("post-2");
      expect(all.map(p => p.id)).toContain("post-3");
    });

    it("filters by dialect", () => {
      const okumaOnly = LatheMasterPostSelfAwarenessEngine.getSubPostsByDialect("okuma");
      expect(okumaOnly).toHaveLength(2);
      expect(okumaOnly.every(p => p.dialect === "okuma")).toBe(true);
    });
  });

  describe("detectDrift", () => {
    it("detects no drift when state matches", () => {
      const entry = LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "stable-post",
        name: "Stable Post",
        dialect: "okuma",
        version: "1.0.0",
      });

      const result = LatheMasterPostSelfAwarenessEngine.detectDrift("stable-post", {
        dialect: "okuma",
        version: "1.0.0",
        checksum: entry.checksum,
      });

      expect(result.hasDrift).toBe(false);
      expect(result.driftSeverity).toBe("none");
      expect(result.changes).toHaveLength(0);
      expect(result.requiresRegeneration).toBe(false);
    });

    it("detects dialect change drift", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "dialect-drift-post",
        name: "Dialect Drift Post",
        dialect: "okuma",
      });

      const result = LatheMasterPostSelfAwarenessEngine.detectDrift("dialect-drift-post", {
        dialect: "fanuc",
      });

      expect(result.hasDrift).toBe(true);
      expect(result.driftType).toContain("dialect_change");
      expect(result.driftSeverity).toBe("high");
      expect(result.changes.some(c => c.field === "dialect")).toBe(true);
    });

    it("detects version mismatch", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "version-drift-post",
        name: "Version Drift Post",
        dialect: "generic",
        version: "1.0.0",
      });

      const result = LatheMasterPostSelfAwarenessEngine.detectDrift("version-drift-post", {
        version: "2.0.0",
      });

      expect(result.hasDrift).toBe(true);
      expect(result.driftType).toContain("version_mismatch");
      expect(result.changes.some(c => c.field === "version")).toBe(true);
    });

    it("detects feature change drift", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "feature-drift-post",
        name: "Feature Drift Post",
        dialect: "okuma",
        features: {
          cssSupport: true,
          cannedCycles: ["G70", "G71"],
          liveTooling: false,
          subSpindle: false,
          cAxis: false,
          yAxis: false,
          bAxis: false,
          barFeeder: false,
          partCatcher: false,
        },
      });

      const result = LatheMasterPostSelfAwarenessEngine.detectDrift("feature-drift-post", {
        features: {
          cssSupport: true,
          cannedCycles: ["G70", "G71", "G76"],
          liveTooling: true,
          subSpindle: false,
          cAxis: false,
          yAxis: false,
          bAxis: false,
          barFeeder: false,
          partCatcher: false,
        },
      });

      expect(result.hasDrift).toBe(true);
      expect(result.driftType).toContain("feature_change");
    });

    it("detects validation failure drift", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "validation-drift-post",
        name: "Validation Drift Post",
        dialect: "generic",
      });

      const result = LatheMasterPostSelfAwarenessEngine.detectDrift("validation-drift-post", {
        validationStatus: {
          lastValidatedAt: new Date().toISOString(),
          passed: false,
          errors: [{ code: "E001", message: "Validation failed", severity: "critical" }],
          warnings: [],
          parityPercent: 80,
          safetyCriticalCount: 0,
        },
      });

      expect(result.hasDrift).toBe(true);
      expect(result.driftType).toContain("validation_failure");
      expect(result.driftType).toContain("parity_drop");
    });

    it("detects safety divergence drift with critical severity", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "safety-drift-post",
        name: "Safety Drift Post",
        dialect: "generic",
      });

      const result = LatheMasterPostSelfAwarenessEngine.detectDrift("safety-drift-post", {
        validationStatus: {
          lastValidatedAt: new Date().toISOString(),
          passed: false,
          errors: [],
          warnings: [],
          parityPercent: 95,
          safetyCriticalCount: 3,
        },
      });

      expect(result.hasDrift).toBe(true);
      expect(result.driftType).toContain("safety_divergence");
      expect(result.driftSeverity).toBe("critical");
      expect(result.requiresRegeneration).toBe(true);
    });

    it("detects missing sub-post", () => {
      const result = LatheMasterPostSelfAwarenessEngine.detectDrift("non-existent-post");

      expect(result.hasDrift).toBe(true);
      expect(result.driftType).toContain("missing_sub_post");
      expect(result.driftSeverity).toBe("critical");
      expect(result.requiresRegeneration).toBe(true);
      expect(result.remediationRecommendations.length).toBeGreaterThan(0);
      expect(result.remediationRecommendations[0].action).toBe("register_sub_post");
    });

    it("detects checksum mismatch", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "checksum-drift-post",
        name: "Checksum Drift Post",
        dialect: "generic",
      });

      const result = LatheMasterPostSelfAwarenessEngine.detectDrift("checksum-drift-post", {
        checksum: "invalid-checksum",
      });

      expect(result.hasDrift).toBe(true);
      expect(result.driftType).toContain("checksum_mismatch");
    });
  });

  describe("remediationRecommendations (Exit Gate)", () => {
    it("produces remediation for safety divergence", () => {
      const result = LatheMasterPostSelfAwarenessEngine.seedDriftForTesting(
        "safety-test-post",
        "safety_divergence",
        {
          validationStatus: {
            lastValidatedAt: new Date().toISOString(),
            passed: false,
            errors: [],
            warnings: [],
            parityPercent: 90,
            safetyCriticalCount: 2,
          },
        }
      );

      expect(result.remediationRecommendations.length).toBeGreaterThan(0);
      const safetyRec = result.remediationRecommendations.find(r => r.action === "address_safety_issues");
      expect(safetyRec).toBeDefined();
      expect(safetyRec?.priority).toBe(1);
      expect(safetyRec?.steps.length).toBeGreaterThan(0);
    });

    it("produces remediation for dialect change", () => {
      const result = LatheMasterPostSelfAwarenessEngine.seedDriftForTesting(
        "dialect-test-post",
        "dialect_change",
        { dialect: "fanuc" }
      );

      const dialectRec = result.remediationRecommendations.find(r => r.action === "update_dialect_mapping");
      expect(dialectRec).toBeDefined();
      expect(dialectRec?.automated).toBe(true);
    });

    it("produces remediation for validation failure", () => {
      const result = LatheMasterPostSelfAwarenessEngine.seedDriftForTesting(
        "validation-test-post",
        "validation_failure",
        {
          validationStatus: {
            lastValidatedAt: new Date().toISOString(),
            passed: false,
            errors: [{ code: "E100", message: "Structure error", severity: "major" }],
            warnings: [],
            parityPercent: 85,
            safetyCriticalCount: 0,
          },
        }
      );

      const valRec = result.remediationRecommendations.find(r => r.action === "fix_validation_errors");
      expect(valRec).toBeDefined();
    });

    it("produces remediation for parity drop", () => {
      const result = LatheMasterPostSelfAwarenessEngine.seedDriftForTesting(
        "parity-test-post",
        "parity_drop",
        {
          validationStatus: {
            lastValidatedAt: new Date().toISOString(),
            passed: true,
            errors: [],
            warnings: [],
            parityPercent: 80,
            safetyCriticalCount: 0,
          },
        }
      );

      const parityRec = result.remediationRecommendations.find(r => r.action === "restore_parity");
      expect(parityRec).toBeDefined();
      expect(parityRec?.estimatedEffort).toBe("large");
    });

    it("sorts recommendations by priority", () => {
      const result = LatheMasterPostSelfAwarenessEngine.seedDriftForTesting(
        "multi-drift-post",
        "safety_divergence",
        {
          dialect: "fanuc",
          version: "3.0.0",
          validationStatus: {
            lastValidatedAt: new Date().toISOString(),
            passed: false,
            errors: [],
            warnings: [],
            parityPercent: 70,
            safetyCriticalCount: 5,
          },
        }
      );

      expect(result.remediationRecommendations.length).toBeGreaterThan(2);
      for (let i = 1; i < result.remediationRecommendations.length; i++) {
        expect(result.remediationRecommendations[i].priority)
          .toBeGreaterThanOrEqual(result.remediationRecommendations[i - 1].priority);
      }
    });
  });

  describe("auditAllSubPosts", () => {
    beforeEach(() => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({ id: "audit-post-1", name: "Audit Post 1", dialect: "okuma" });
      LatheMasterPostSelfAwarenessEngine.registerSubPost({ id: "audit-post-2", name: "Audit Post 2", dialect: "fanuc" });
      LatheMasterPostSelfAwarenessEngine.registerSubPost({ id: "audit-post-3", name: "Audit Post 3", dialect: "haas" });
    });

    it("audits all registered sub-posts", () => {
      const report = LatheMasterPostSelfAwarenessEngine.auditAllSubPosts();

      expect(report.totalSubPosts).toBe(3);
      expect(report.audited).toBe(3);
      expect(report.results).toHaveLength(3);
      expect(report.auditId).toMatch(/^audit-\d+$/);
    });

    it("generates audit summary with health status", () => {
      const report = LatheMasterPostSelfAwarenessEngine.auditAllSubPosts();

      expect(report.summary).toBeDefined();
      expect(["healthy", "degraded", "critical"]).toContain(report.summary.healthStatus);
      expect(report.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.overallScore).toBeLessThanOrEqual(100);
    });

    it("accepts custom audit config", () => {
      const report = LatheMasterPostSelfAwarenessEngine.auditAllSubPosts({
        includeOrphans: false,
        parityThreshold: 90,
        maxSafetyDivergences: 1,
        validateAll: true,
      });

      expect(report.totalSubPosts).toBe(3);
    });

    it("tracks passed vs failed counts", () => {
      const report = LatheMasterPostSelfAwarenessEngine.auditAllSubPosts();

      expect(report.passed + report.failed).toBe(report.audited);
      expect(report.driftDetected).toBeGreaterThanOrEqual(0);
      expect(report.criticalIssues).toBeGreaterThanOrEqual(0);
    });
  });

  describe("updateValidationStatus", () => {
    it("updates validation status for existing sub-post", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "status-update-post",
        name: "Status Update Post",
        dialect: "generic",
      });

      const newStatus: ValidationStatus = {
        lastValidatedAt: new Date().toISOString(),
        passed: false,
        errors: [{ code: "E001", message: "Test error", severity: "major" }],
        warnings: [],
        parityPercent: 92,
        safetyCriticalCount: 0,
      };

      const updated = LatheMasterPostSelfAwarenessEngine.updateValidationStatus(
        "status-update-post",
        newStatus
      );

      expect(updated).not.toBeNull();
      expect(updated?.validationStatus.passed).toBe(false);
      expect(updated?.validationStatus.parityPercent).toBe(92);
    });

    it("returns null for non-existent sub-post", () => {
      const result = LatheMasterPostSelfAwarenessEngine.updateValidationStatus(
        "non-existent",
        {
          lastValidatedAt: new Date().toISOString(),
          passed: true,
          errors: [],
          warnings: [],
          parityPercent: 100,
          safetyCriticalCount: 0,
        }
      );

      expect(result).toBeNull();
    });

    it("captures snapshot on significant status change", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "snapshot-post",
        name: "Snapshot Post",
        dialect: "okuma",
      });

      LatheMasterPostSelfAwarenessEngine.updateValidationStatus("snapshot-post", {
        lastValidatedAt: new Date().toISOString(),
        passed: false,
        errors: [],
        warnings: [],
        parityPercent: 80,
        safetyCriticalCount: 0,
      });

      const history = LatheMasterPostSelfAwarenessEngine.getSnapshotHistory("snapshot-post");
      expect(history.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getSnapshotHistory", () => {
    it("returns empty array for non-existent post", () => {
      const history = LatheMasterPostSelfAwarenessEngine.getSnapshotHistory("non-existent");
      expect(history).toEqual([]);
    });

    it("returns snapshots for registered post", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "history-post",
        name: "History Post",
        dialect: "generic",
      });

      const history = LatheMasterPostSelfAwarenessEngine.getSnapshotHistory("history-post");
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].subPostId).toBe("history-post");
    });
  });

  describe("getStatistics", () => {
    it("returns correct statistics", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({ id: "stat-1", name: "Stat 1", dialect: "okuma" });
      LatheMasterPostSelfAwarenessEngine.registerSubPost({ id: "stat-2", name: "Stat 2", dialect: "okuma" });
      LatheMasterPostSelfAwarenessEngine.registerSubPost({ id: "stat-3", name: "Stat 3", dialect: "fanuc" });

      const stats = LatheMasterPostSelfAwarenessEngine.getStatistics();

      expect(stats.totalSubPosts).toBe(3);
      expect(stats.byDialect.okuma).toBe(2);
      expect(stats.byDialect.fanuc).toBe(1);
      expect(stats.byDialect.haas).toBe(0);
      expect(stats.byValidationStatus.passed).toBe(3);
      expect(stats.byValidationStatus.failed).toBe(0);
      expect(stats.totalSnapshots).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getVersion", () => {
    it("returns version string", () => {
      const version = LatheMasterPostSelfAwarenessEngine.getVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("Zod schema validation", () => {
    it("validates SubPostEntrySchema", () => {
      const entry = LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "schema-test",
        name: "Schema Test",
        dialect: "okuma",
      });

      expect(() => SubPostEntrySchema.parse(entry)).not.toThrow();
    });

    it("validates AuditConfigSchema with defaults", () => {
      const config = AuditConfigSchema.parse({});
      expect(config.includeOrphans).toBe(true);
      expect(config.parityThreshold).toBe(95);
      expect(config.maxSafetyDivergences).toBe(0);
      expect(config.validateAll).toBe(false);
    });

    it("rejects invalid RegisterSubPostInput", () => {
      expect(() => RegisterSubPostInputSchema.parse({
        id: "",
        name: "Test",
        dialect: "okuma",
      })).toThrow();

      expect(() => RegisterSubPostInputSchema.parse({
        id: "test",
        name: "Test",
        dialect: "invalid-dialect",
      })).toThrow();
    });
  });

  describe("failure modes", () => {
    it("handles empty registry gracefully", () => {
      const stats = LatheMasterPostSelfAwarenessEngine.getStatistics();
      expect(stats.totalSubPosts).toBe(0);

      const all = LatheMasterPostSelfAwarenessEngine.getAllSubPosts();
      expect(all).toEqual([]);

      const audit = LatheMasterPostSelfAwarenessEngine.auditAllSubPosts();
      expect(audit.totalSubPosts).toBe(0);
      expect(audit.summary.healthStatus).toBe("healthy");
    });

    it("handles concurrent registrations", () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(LatheMasterPostSelfAwarenessEngine.registerSubPost({
          id: `concurrent-${i}`,
          name: `Concurrent ${i}`,
          dialect: "generic",
        }))
      );

      return Promise.all(promises).then(results => {
        expect(results).toHaveLength(10);
        expect(LatheMasterPostSelfAwarenessEngine.getAllSubPosts()).toHaveLength(10);
      });
    });

    it("handles rapid status updates", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "rapid-update",
        name: "Rapid Update",
        dialect: "generic",
      });

      for (let i = 0; i < 20; i++) {
        LatheMasterPostSelfAwarenessEngine.updateValidationStatus("rapid-update", {
          lastValidatedAt: new Date().toISOString(),
          passed: i % 2 === 0,
          errors: [],
          warnings: [],
          parityPercent: 90 + (i % 10),
          safetyCriticalCount: 0,
        });
      }

      const history = LatheMasterPostSelfAwarenessEngine.getSnapshotHistory("rapid-update");
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe("adversarial inputs", () => {
    it("handles very long IDs", () => {
      const longId = "a".repeat(1000);
      const entry = LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: longId,
        name: "Long ID Post",
        dialect: "generic",
      });

      expect(entry.id).toBe(longId);
      expect(LatheMasterPostSelfAwarenessEngine.getSubPost(longId)).toBeDefined();
    });

    it("handles special characters in names", () => {
      const specialName = "Post <script>alert('xss')</script> & \"quotes\" 'apostrophes'";
      const entry = LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "special-chars",
        name: specialName,
        dialect: "generic",
      });

      expect(entry.name).toBe(specialName);
    });

    it("handles unicode in IDs and names", () => {
      const entry = LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "ポスト-日本語",
        name: "日本語ポスト 中文 한국어",
        dialect: "fanuc",
      });

      expect(entry.id).toBe("ポスト-日本語");
      expect(LatheMasterPostSelfAwarenessEngine.getSubPost("ポスト-日本語")).toBeDefined();
    });

    it("handles empty machineIds array", () => {
      const entry = LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "empty-machines",
        name: "Empty Machines",
        dialect: "generic",
        machineIds: [],
      });

      expect(entry.machineIds).toEqual([]);
    });

    it("handles empty cannedCycles array", () => {
      const entry = LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "no-cycles",
        name: "No Cycles",
        dialect: "generic",
        features: {
          cssSupport: false,
          cannedCycles: [],
          liveTooling: false,
          subSpindle: false,
          cAxis: false,
          yAxis: false,
          bAxis: false,
          barFeeder: false,
          partCatcher: false,
        },
      });

      expect(entry.features.cannedCycles).toEqual([]);
    });

    it("handles boundary parity values", () => {
      LatheMasterPostSelfAwarenessEngine.registerSubPost({
        id: "boundary-parity",
        name: "Boundary Parity",
        dialect: "generic",
      });

      const update0 = LatheMasterPostSelfAwarenessEngine.updateValidationStatus("boundary-parity", {
        lastValidatedAt: new Date().toISOString(),
        passed: false,
        errors: [],
        warnings: [],
        parityPercent: 0,
        safetyCriticalCount: 0,
      });
      expect(update0?.validationStatus.parityPercent).toBe(0);

      const update100 = LatheMasterPostSelfAwarenessEngine.updateValidationStatus("boundary-parity", {
        lastValidatedAt: new Date().toISOString(),
        passed: true,
        errors: [],
        warnings: [],
        parityPercent: 100,
        safetyCriticalCount: 0,
      });
      expect(update100?.validationStatus.parityPercent).toBe(100);
    });
  });

  describe("dispatcher wiring verification", () => {
    const DISPATCHER_PATH = path.resolve(__dirname, "../tools/dispatchers/camDispatcher.ts");

    it("has schema import in dispatcher", () => {
      const content = fs.readFileSync(DISPATCHER_PATH, "utf-8");
      expect(content).toContain('import { ACTION_LATHE_SELFAWARE_SCHEMAS }');
      expect(content).toContain('latheMasterPostSelfAwarenessActionSchemas.js');
    });

    it("has schemas merged in MERGED_CAM_SCHEMAS", () => {
      const content = fs.readFileSync(DISPATCHER_PATH, "utf-8");
      expect(content).toContain('...ACTION_LATHE_SELFAWARE_SCHEMAS');
    });

    it("has all actions in ACTIONS enum", () => {
      const content = fs.readFileSync(DISPATCHER_PATH, "utf-8");
      const actions = [
        "lathe_selfaware_register",
        "lathe_selfaware_detect_drift",
        "lathe_selfaware_audit",
        "lathe_selfaware_get_stats",
        "lathe_selfaware_update_status",
        "lathe_selfaware_seed_drift",
      ];

      for (const action of actions) {
        expect(content).toContain(`"${action}"`);
      }
    });

    it("has case handlers for all actions", () => {
      const content = fs.readFileSync(DISPATCHER_PATH, "utf-8");
      const casePatterns = [
        'case "lathe_selfaware_register"',
        'case "lathe_selfaware_detect_drift"',
        'case "lathe_selfaware_audit"',
        'case "lathe_selfaware_get_stats"',
        'case "lathe_selfaware_update_status"',
        'case "lathe_selfaware_seed_drift"',
      ];

      for (const pattern of casePatterns) {
        expect(content).toContain(pattern);
      }
    });

    it("has lazy import of engine in case handlers", () => {
      const content = fs.readFileSync(DISPATCHER_PATH, "utf-8");
      expect(content).toContain('LatheMasterPostSelfAwarenessEngine');
      expect(content).toContain('../../engines/LatheMasterPostSelfAwarenessEngine.js');
    });
  });

  describe("E2E dispatcher round-trip (simulated)", () => {
    it("can be invoked via dispatcher pattern", async () => {
      const { LatheMasterPostSelfAwarenessEngine: Engine } = await import(
        "../engines/LatheMasterPostSelfAwarenessEngine.js"
      );

      Engine.clearRegistry();

      const registered = Engine.registerSubPost({
        id: "e2e-post",
        name: "E2E Test Post",
        dialect: "okuma",
      });
      expect(registered.id).toBe("e2e-post");

      const drift = Engine.detectDrift("e2e-post", { dialect: "fanuc" });
      expect(drift.hasDrift).toBe(true);

      const audit = Engine.auditAllSubPosts();
      expect(audit.totalSubPosts).toBe(1);

      const stats = Engine.getStatistics();
      expect(stats.totalSubPosts).toBe(1);
    });
  });
});
