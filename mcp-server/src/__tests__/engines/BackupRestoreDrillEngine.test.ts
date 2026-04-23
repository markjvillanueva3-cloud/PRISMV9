import { describe, it, expect, beforeEach } from "vitest";
import { backupRestoreDrillEngine } from "../../engines/BackupRestoreDrillEngine.js";
import { createHash } from "node:crypto";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

describe("BackupRestoreDrillEngine", () => {
  beforeEach(() => {
    backupRestoreDrillEngine.clearAll();
  });

  describe("defaults and registration", () => {
    it("initializes with 5 default assets", () => {
      const assets = backupRestoreDrillEngine.listAssets();
      expect(assets.length).toBe(5);
      expect(assets.find(a => a.id === "BKUP-001")).toBeDefined();
      expect(assets.find(a => a.id === "BKUP-003")?.category).toBe("database");
    });

    it("filters assets by tier and category", () => {
      const tier0 = backupRestoreDrillEngine.listAssets("tier-0");
      expect(tier0.length).toBe(3);
      for (const a of tier0) expect(a.tier).toBe("tier-0");

      const weights = backupRestoreDrillEngine.listAssets(undefined, "model_weights");
      expect(weights.length).toBe(1);
      expect(weights[0].id).toBe("BKUP-002");
    });

    it("registers a new asset with validation", () => {
      const res = backupRestoreDrillEngine.registerAsset({
        id: "BKUP-TEST",
        category: "object_storage",
        tier: "tier-1",
        name: "Object storage",
        description: "Generic blobs",
        rto_hours: 6,
        rpo_hours: 2,
        drill_cadence: "quarterly",
        retention_days: 60,
        storage_locations: ["s3://test"],
        owner: "test",
      });
      expect(res.success).toBe(true);
      expect(backupRestoreDrillEngine.getAsset("BKUP-TEST")?.rto_hours).toBe(6);
    });

    it("rejects invalid asset registration", () => {
      expect(() => backupRestoreDrillEngine.registerAsset({
        id: "",
        category: "database",
        tier: "tier-0",
        name: "x",
        description: "x",
        rto_hours: 1,
        rpo_hours: 1,
        drill_cadence: "weekly",
        retention_days: 1,
        storage_locations: [],
        owner: "x",
      })).toThrow(/asset.id required/);

      expect(() => backupRestoreDrillEngine.registerAsset({
        id: "BKUP-X",
        category: "database",
        tier: "tier-0",
        name: "x",
        description: "x",
        rto_hours: 0,
        rpo_hours: 1,
        drill_cadence: "weekly",
        retention_days: 1,
        storage_locations: [],
        owner: "x",
      })).toThrow(/rto_hours must be positive/);
    });
  });

  describe("backup recording and attestation", () => {
    it("records a successful backup and issues a valid attestation", () => {
      const now = Date.now();
      const { job, attestation } = backupRestoreDrillEngine.recordBackup({
        asset_id: "BKUP-001",
        started_at: now - 60000,
        completed_at: now,
        size_bytes: 2048,
        payload_sha256: sha256("training-snapshot-1"),
        storage_location: "s3://prism-backups-primary/training/1.tar",
        success: true,
        notes: "nominal",
      });
      expect(job.job_id).toMatch(/^job-[0-9a-f]{12}$/);
      expect(attestation).not.toBeNull();
      expect(attestation!.algorithm).toBe("HMAC-SHA256");
      expect(attestation!.signature_hex).toMatch(/^[0-9a-f]{64}$/);

      const verify = backupRestoreDrillEngine.verifyAttestation(attestation!, {
        asset_id: "BKUP-001",
        payload_sha256: job.payload_sha256,
      });
      expect(verify.valid).toBe(true);
    });

    it("rejects malformed payload_sha256", () => {
      const now = Date.now();
      expect(() => backupRestoreDrillEngine.recordBackup({
        asset_id: "BKUP-001",
        started_at: now - 1000,
        completed_at: now,
        size_bytes: 1,
        payload_sha256: "not-a-hash",
        storage_location: "s3://x",
        success: true,
        notes: "",
      })).toThrow(/64 hex characters/);
    });

    it("does not issue attestation for failed backup", () => {
      const now = Date.now();
      const { attestation } = backupRestoreDrillEngine.recordBackup({
        asset_id: "BKUP-001",
        started_at: now - 1000,
        completed_at: now,
        size_bytes: 0,
        payload_sha256: sha256("fail"),
        storage_location: "s3://x",
        success: false,
        notes: "aborted",
      });
      expect(attestation).toBeNull();
    });

    it("fails verification on tampered payload_sha256", () => {
      const now = Date.now();
      const { attestation } = backupRestoreDrillEngine.recordBackup({
        asset_id: "BKUP-001",
        started_at: now - 100,
        completed_at: now,
        size_bytes: 10,
        payload_sha256: sha256("original"),
        storage_location: "s3://x",
        success: true,
        notes: "",
      });
      expect(attestation).not.toBeNull();
      const tampered = { ...attestation!, payload_sha256: sha256("tampered") };
      const res = backupRestoreDrillEngine.verifyAttestation(tampered);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/signature invalid/);
    });

    it("fails verification when expected asset_id mismatches", () => {
      const now = Date.now();
      const { attestation } = backupRestoreDrillEngine.recordBackup({
        asset_id: "BKUP-001",
        started_at: now - 100,
        completed_at: now,
        size_bytes: 10,
        payload_sha256: sha256("x"),
        storage_location: "s3://x",
        success: true,
        notes: "",
      });
      const res = backupRestoreDrillEngine.verifyAttestation(attestation!, {
        asset_id: "BKUP-002",
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/asset_id mismatch/);
    });
  });

  describe("restore drills and RTO", () => {
    it("records a drill and evaluates rto_met against asset RTO", () => {
      const backupStart = Date.now() - 3600000;
      const backupEnd = backupStart + 60000;
      const { job } = backupRestoreDrillEngine.recordBackup({
        asset_id: "BKUP-003", // tier-0, RTO 4hr
        started_at: backupStart,
        completed_at: backupEnd,
        size_bytes: 100,
        payload_sha256: sha256("pg-dump"),
        storage_location: "s3://x",
        success: true,
        notes: "",
      });
      const drillStart = Date.now();
      const drill = backupRestoreDrillEngine.recordDrill({
        asset_id: "BKUP-003",
        job_id: job.job_id,
        started_at: drillStart,
        completed_at: drillStart + 30 * 60 * 1000, // 30 min
        verification_outcome: "pass",
        findings: [],
        operator: "test-operator",
      });
      expect(drill.actual_rto_minutes).toBeCloseTo(30, 5);
      expect(drill.rto_met).toBe(true); // 30 min < 240 min
      expect(drill.attestation_verified).toBe(true);
    });

    it("flags rto_met=false when drill exceeds asset RTO", () => {
      const { job } = backupRestoreDrillEngine.recordBackup({
        asset_id: "BKUP-003",
        started_at: 0,
        completed_at: 1000,
        size_bytes: 1,
        payload_sha256: sha256("x"),
        storage_location: "s3://x",
        success: true,
        notes: "",
      });
      const drillStart = Date.now();
      const drill = backupRestoreDrillEngine.recordDrill({
        asset_id: "BKUP-003",
        job_id: job.job_id,
        started_at: drillStart,
        completed_at: drillStart + 5 * 3600 * 1000, // 5 hr > 4 hr RTO
        verification_outcome: "pass",
        findings: ["slow transfer"],
        operator: "op",
      });
      expect(drill.rto_met).toBe(false);
    });

    it("marks attestation_verified=false when no attestation exists for job_id", () => {
      const drill = backupRestoreDrillEngine.recordDrill({
        asset_id: "BKUP-001",
        job_id: "job-nonexistent",
        started_at: 0,
        completed_at: 1000,
        verification_outcome: "degraded",
        findings: ["missing attestation"],
        operator: "op",
      });
      expect(drill.attestation_verified).toBe(false);
    });
  });

  describe("compliance and plan generation", () => {
    it("marks all assets overdue when no drills have run", () => {
      const comp = backupRestoreDrillEngine.getDrillCompliance();
      expect(comp.length).toBe(5);
      for (const c of comp) expect(c.band).toBe("overdue");
    });

    it("transitions to current after successful drill within cadence", () => {
      const { job } = backupRestoreDrillEngine.recordBackup({
        asset_id: "BKUP-001",
        started_at: 0,
        completed_at: 1000,
        size_bytes: 1,
        payload_sha256: sha256("x"),
        storage_location: "s3://x",
        success: true,
        notes: "",
      });
      const now = Date.now();
      backupRestoreDrillEngine.recordDrill({
        asset_id: "BKUP-001",
        job_id: job.job_id,
        started_at: now - 1000,
        completed_at: now,
        verification_outcome: "pass",
        findings: [],
        operator: "op",
      });
      const comp = backupRestoreDrillEngine.getDrillCompliance(now);
      const bkup001 = comp.find(c => c.asset_id === "BKUP-001");
      expect(bkup001?.band).toBe("current");
    });

    it("generatePlan flags non_compliant when any tier-0 is overdue", () => {
      const plan = backupRestoreDrillEngine.generatePlan();
      expect(plan.overall).toBe("non_compliant");
      expect(plan.overdue_asset_ids.length).toBeGreaterThan(0);
      expect(plan.recommendations.some(r => /tier-0/.test(r))).toBe(true);
    });
  });

  describe("stats", () => {
    it("aggregates stats across multiple backups and drills", () => {
      const s1 = backupRestoreDrillEngine.recordBackup({
        asset_id: "BKUP-001",
        started_at: 0,
        completed_at: 100,
        size_bytes: 10,
        payload_sha256: sha256("a"),
        storage_location: "s3://a",
        success: true,
        notes: "",
      });
      backupRestoreDrillEngine.recordBackup({
        asset_id: "BKUP-002",
        started_at: 0,
        completed_at: 100,
        size_bytes: 20,
        payload_sha256: sha256("b"),
        storage_location: "s3://b",
        success: false,
        notes: "failed",
      });
      const now = Date.now();
      backupRestoreDrillEngine.recordDrill({
        asset_id: "BKUP-001",
        job_id: s1.job.job_id,
        started_at: now - 1000,
        completed_at: now,
        verification_outcome: "pass",
        findings: [],
        operator: "op",
      });
      const stats = backupRestoreDrillEngine.getStats();
      expect(stats.assets_registered).toBe(5);
      expect(stats.backups_recorded).toBe(2);
      expect(stats.attestations_issued).toBe(1); // only successful backup
      expect(stats.drills_run).toBe(1);
      expect(stats.drills_passed).toBe(1);
    });
  });
});
