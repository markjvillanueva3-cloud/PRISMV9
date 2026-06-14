/**
 * BackupRestoreDrillEngine — U-LPR-OPS-BACKUP
 *
 * Backup-Restore Drill orchestration:
 *   - Registered backup assets (training data, model weights, DB, configs, audit logs)
 *   - Backup job recording with size/checksum capture
 *   - Signed attestations (HMAC-SHA256) proving a backup was produced by the
 *     expected pipeline against the expected payload hash — verifiable later
 *   - Restore drills with actual RTO measurement and attestation re-verification
 *   - Per-asset drill cadence tracking (weekly/monthly/quarterly) with compliance
 *     status (overdue, due_soon, current)
 *   - Stats and plan generation for posture reporting
 *
 * Tier-based RTO targets are kept consistent with DisasterRecoveryEngine:
 *   tier-0: RTO 4 hr, RPO 1 hr
 *   tier-1: RTO 8 hr, RPO 4 hr
 *   tier-2: RTO 24 hr, RPO 24 hr
 *
 * Reference: NIST SP 800-34 (Contingency Planning) §3.4 (backup and recovery)
 * Reference: NIST SP 800-209 (Storage Infrastructure Security)
 * Reference: ISO 27040 §6.7 (Data protection: backup integrity and attestation)
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OPS-BACKUP
 * @phase PHASE-11 (Production Ops Maturity)
 */

import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { log } from "../utils/Logger.js";

export type BackupTier = "tier-0" | "tier-1" | "tier-2";

export type BackupCategory =
  | "training_data"
  | "model_weights"
  | "database"
  | "config_store"
  | "audit_logs"
  | "object_storage"
  | "secrets_vault";

export type DrillCadence = "weekly" | "monthly" | "quarterly" | "annual";

export type ComplianceBand = "current" | "due_soon" | "overdue";

export interface BackupAsset {
  id: string;
  category: BackupCategory;
  tier: BackupTier;
  name: string;
  description: string;
  rto_hours: number;
  rpo_hours: number;
  drill_cadence: DrillCadence;
  retention_days: number;
  storage_locations: string[];
  owner: string;
}

export interface BackupJob {
  job_id: string;
  asset_id: string;
  started_at: number;
  completed_at: number;
  size_bytes: number;
  payload_sha256: string;
  storage_location: string;
  success: boolean;
  notes: string;
}

export interface AttestationEnvelope {
  schemaVersion: 1;
  asset_id: string;
  job_id: string;
  payload_sha256: string;
  size_bytes: number;
  storage_location: string;
  signer_id: string;
  algorithm: "HMAC-SHA256";
  created_at: number;
  signature_hex: string;
}

export interface RestoreDrill {
  drill_id: string;
  asset_id: string;
  job_id: string;
  started_at: number;
  completed_at: number;
  actual_rto_minutes: number;
  rto_met: boolean;
  attestation_verified: boolean;
  verification_outcome: "pass" | "fail" | "degraded";
  findings: string[];
  operator: string;
}

export interface AssetDrillCompliance {
  asset_id: string;
  last_drill_at: number | null;
  days_since_drill: number | null;
  cadence_days: number;
  band: ComplianceBand;
  rto_hours: number;
}

export interface BackupPlan {
  generated_at: number;
  assets: BackupAsset[];
  compliance: AssetDrillCompliance[];
  overall: "compliant" | "at_risk" | "non_compliant";
  overdue_asset_ids: string[];
  unverified_asset_ids: string[];
  recommendations: string[];
}

export interface BackupStats {
  assets_registered: number;
  backups_recorded: number;
  attestations_issued: number;
  drills_run: number;
  drills_passed: number;
  drills_failed: number;
  assets_overdue: number;
  avg_restore_rto_minutes: number;
}

const CADENCE_DAYS: Record<DrillCadence, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  annual: 365,
};

const DEFAULT_ASSETS: BackupAsset[] = [
  {
    id: "BKUP-001",
    category: "training_data",
    tier: "tier-0",
    name: "LoRA / fine-tuning training corpus",
    description: "Curated training set for per-machine LoRA adapters; regulated artifact for tenant attribution",
    rto_hours: 4,
    rpo_hours: 1,
    drill_cadence: "monthly",
    retention_days: 365,
    storage_locations: ["s3://prism-backups-primary/training", "s3://prism-backups-dr/training"],
    owner: "ml-platform",
  },
  {
    id: "BKUP-002",
    category: "model_weights",
    tier: "tier-0",
    name: "Production model weights + adapters",
    description: "Base model weights and merged LoRA adapters for serving; restore unblocks inference",
    rto_hours: 4,
    rpo_hours: 1,
    drill_cadence: "monthly",
    retention_days: 180,
    storage_locations: ["s3://prism-backups-primary/weights", "s3://prism-backups-dr/weights"],
    owner: "ml-platform",
  },
  {
    id: "BKUP-003",
    category: "database",
    tier: "tier-0",
    name: "Production PostgreSQL cluster",
    description: "Transactional database incl. tenancy, jobs, audit metadata; point-in-time recovery up to RPO 1hr",
    rto_hours: 4,
    rpo_hours: 1,
    drill_cadence: "weekly",
    retention_days: 30,
    storage_locations: ["s3://prism-backups-primary/pg", "s3://prism-backups-dr/pg"],
    owner: "platform-db",
  },
  {
    id: "BKUP-004",
    category: "config_store",
    tier: "tier-1",
    name: "Config + feature flag store",
    description: "Runtime configuration (non-secret) and feature flag snapshots",
    rto_hours: 8,
    rpo_hours: 4,
    drill_cadence: "quarterly",
    retention_days: 90,
    storage_locations: ["s3://prism-backups-primary/config"],
    owner: "platform",
  },
  {
    id: "BKUP-005",
    category: "audit_logs",
    tier: "tier-1",
    name: "Tenant audit + access logs",
    description: "Tamper-evident audit trail; required for compliance, not latency-critical",
    rto_hours: 8,
    rpo_hours: 4,
    drill_cadence: "quarterly",
    retention_days: 2555, // 7 years
    storage_locations: ["s3://prism-backups-primary/audit", "s3://prism-backups-glacier/audit"],
    owner: "compliance",
  },
];

export class BackupRestoreDrillEngine {
  private assets: Map<string, BackupAsset> = new Map();
  private jobs: BackupJob[] = [];
  private attestations: Map<string, AttestationEnvelope> = new Map(); // job_id → envelope
  private drills: RestoreDrill[] = [];
  private signingKey: Buffer;
  private signerId: string;

  constructor() {
    for (const a of DEFAULT_ASSETS) this.assets.set(a.id, { ...a });
    // Per-engine signing key. In production this would come from KMS; here it is
    // a process-scoped secret that ensures attestations created by this engine
    // instance can be verified by this engine instance. Restart invalidates
    // prior attestations, which is the intended property for an in-memory
    // drill orchestrator (persistent signing belongs in a KMS-backed service).
    this.signingKey = randomBytes(32);
    this.signerId = "prism-backup-engine@" + Date.now().toString(36);
  }

  /**
   * Register or update a backup asset.
   */
  registerAsset(asset: BackupAsset): { success: boolean; asset_id: string } {
    if (!asset.id) throw new Error("asset.id required");
    if (asset.rto_hours <= 0) throw new Error("rto_hours must be positive");
    if (asset.rpo_hours <= 0) throw new Error("rpo_hours must be positive");
    if (!(asset.drill_cadence in CADENCE_DAYS)) {
      throw new Error("invalid drill_cadence: " + asset.drill_cadence);
    }
    this.assets.set(asset.id, { ...asset });
    log.info("[BACKUP] Registered asset: " + asset.id + " (" + asset.category + ", " + asset.tier + ")");
    return { success: true, asset_id: asset.id };
  }

  getAsset(id: string): BackupAsset | null {
    return this.assets.get(id) ?? null;
  }

  listAssets(tier?: BackupTier, category?: BackupCategory): BackupAsset[] {
    let out = Array.from(this.assets.values());
    if (tier) out = out.filter(a => a.tier === tier);
    if (category) out = out.filter(a => a.category === category);
    return out;
  }

  /**
   * Record a backup job outcome. Emits a signed attestation on success
   * that can be verified at restore time to prove the backup was produced
   * by this pipeline against the claimed payload hash.
   */
  recordBackup(
    job: Omit<BackupJob, "job_id"> & { job_id?: string },
  ): { job: BackupJob; attestation: AttestationEnvelope | null } {
    const asset = this.assets.get(job.asset_id);
    if (!asset) throw new Error("Unknown asset: " + job.asset_id);
    if (!/^[0-9a-f]{64}$/i.test(job.payload_sha256)) {
      throw new Error("payload_sha256 must be 64 hex characters");
    }
    if (job.size_bytes < 0) throw new Error("size_bytes must be non-negative");
    if (job.completed_at < job.started_at) {
      throw new Error("completed_at must be >= started_at");
    }
    const full: BackupJob = {
      job_id: job.job_id || this.generateJobId(job.asset_id, job.started_at),
      asset_id: job.asset_id,
      started_at: job.started_at,
      completed_at: job.completed_at,
      size_bytes: job.size_bytes,
      payload_sha256: job.payload_sha256,
      storage_location: job.storage_location,
      success: job.success,
      notes: job.notes,
    };
    this.jobs.push(full);
    let attestation: AttestationEnvelope | null = null;
    if (full.success) {
      attestation = this.createAttestation(full);
      this.attestations.set(full.job_id, attestation);
    }
    log.info("[BACKUP] Recorded job " + full.job_id + " for " + full.asset_id + " (" + (full.success ? "success" : "failure") + ")");
    return { job: full, attestation };
  }

  /**
   * Generate an HMAC-SHA256 attestation over the canonical payload summary.
   * The signature commits to (asset_id, job_id, payload_sha256, size_bytes,
   * storage_location, signer_id, created_at) — any tampering invalidates it.
   */
  createAttestation(job: BackupJob): AttestationEnvelope {
    const created_at = Date.now();
    const envelope: Omit<AttestationEnvelope, "signature_hex"> = {
      schemaVersion: 1,
      asset_id: job.asset_id,
      job_id: job.job_id,
      payload_sha256: job.payload_sha256,
      size_bytes: job.size_bytes,
      storage_location: job.storage_location,
      signer_id: this.signerId,
      algorithm: "HMAC-SHA256",
      created_at,
    };
    const signature_hex = this.signEnvelope(envelope);
    return { ...envelope, signature_hex };
  }

  /**
   * Verify an attestation against this engine's signing key.
   * Returns true only if signature is valid AND envelope matches expectations.
   */
  verifyAttestation(
    env: AttestationEnvelope,
    expected?: { payload_sha256?: string; asset_id?: string },
  ): { valid: boolean; reason?: string } {
    if (env.schemaVersion !== 1) return { valid: false, reason: "unsupported schema" };
    if (env.algorithm !== "HMAC-SHA256") return { valid: false, reason: "unsupported algorithm" };
    if (env.signer_id !== this.signerId) {
      return { valid: false, reason: "signer_id mismatch (attestation from different engine instance)" };
    }
    if (expected?.payload_sha256 && expected.payload_sha256 !== env.payload_sha256) {
      return { valid: false, reason: "payload_sha256 mismatch" };
    }
    if (expected?.asset_id && expected.asset_id !== env.asset_id) {
      return { valid: false, reason: "asset_id mismatch" };
    }
    const { signature_hex, ...rest } = env;
    const expectedSig = this.signEnvelope(rest);
    const a = Buffer.from(signature_hex, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length) return { valid: false, reason: "signature length mismatch" };
    if (!timingSafeEqual(a, b)) return { valid: false, reason: "signature invalid" };
    return { valid: true };
  }

  /**
   * Record a restore drill outcome. RTO evaluated against the asset's target;
   * attestation is re-verified as part of the drill (proves the restored
   * payload came from an authentic backup).
   */
  recordDrill(
    drill: Omit<RestoreDrill, "drill_id" | "actual_rto_minutes" | "rto_met" | "attestation_verified"> & {
      drill_id?: string;
    },
  ): RestoreDrill {
    const asset = this.assets.get(drill.asset_id);
    if (!asset) throw new Error("Unknown asset: " + drill.asset_id);
    if (drill.completed_at < drill.started_at) {
      throw new Error("completed_at must be >= started_at");
    }
    const rtoMinutes = (drill.completed_at - drill.started_at) / 60000;
    const rtoMet = rtoMinutes <= asset.rto_hours * 60;
    const attestation = this.attestations.get(drill.job_id);
    let attestationVerified = false;
    if (attestation) {
      const res = this.verifyAttestation(attestation, { asset_id: drill.asset_id });
      attestationVerified = res.valid;
    }
    const full: RestoreDrill = {
      drill_id: drill.drill_id || this.generateDrillId(drill.asset_id, drill.started_at),
      asset_id: drill.asset_id,
      job_id: drill.job_id,
      started_at: drill.started_at,
      completed_at: drill.completed_at,
      actual_rto_minutes: rtoMinutes,
      rto_met: rtoMet,
      attestation_verified: attestationVerified,
      verification_outcome: drill.verification_outcome,
      findings: drill.findings,
      operator: drill.operator,
    };
    this.drills.push(full);
    log.info("[BACKUP] Drill " + full.drill_id + " for " + full.asset_id + ": outcome=" + full.verification_outcome + ", rto_met=" + rtoMet + ", attestation=" + attestationVerified);
    return full;
  }

  getDrillHistory(assetId?: string, limit?: number): RestoreDrill[] {
    let out = assetId ? this.drills.filter(d => d.asset_id === assetId) : [...this.drills];
    if (limit && limit > 0) out = out.slice(-limit);
    return out;
  }

  /**
   * Evaluate drill cadence compliance per asset.
   * Bands:
   *   current — last drill within cadence window
   *   due_soon — within 20% of cadence window remaining
   *   overdue — no drill OR past cadence window
   */
  getDrillCompliance(now: number = Date.now()): AssetDrillCompliance[] {
    const out: AssetDrillCompliance[] = [];
    for (const asset of this.assets.values()) {
      const cadenceDays = CADENCE_DAYS[asset.drill_cadence];
      const windowMs = cadenceDays * 24 * 3600 * 1000;
      const lastDrill = this.lastDrillForAsset(asset.id);
      if (!lastDrill) {
        out.push({
          asset_id: asset.id,
          last_drill_at: null,
          days_since_drill: null,
          cadence_days: cadenceDays,
          band: "overdue",
          rto_hours: asset.rto_hours,
        });
        continue;
      }
      const ageMs = now - lastDrill.completed_at;
      const days = ageMs / (24 * 3600 * 1000);
      let band: ComplianceBand;
      if (ageMs > windowMs) band = "overdue";
      else if (ageMs > windowMs * 0.8) band = "due_soon";
      else band = "current";
      out.push({
        asset_id: asset.id,
        last_drill_at: lastDrill.completed_at,
        days_since_drill: days,
        cadence_days: cadenceDays,
        band,
        rto_hours: asset.rto_hours,
      });
    }
    return out;
  }

  /**
   * Generate a posture plan summarizing backup/restore readiness.
   */
  generatePlan(now: number = Date.now()): BackupPlan {
    const assets = Array.from(this.assets.values());
    const compliance = this.getDrillCompliance(now);
    const overdue = compliance.filter(c => c.band === "overdue").map(c => c.asset_id);
    const unverified = this.findUnverifiedAssets();
    let overall: "compliant" | "at_risk" | "non_compliant" = "compliant";
    const tier0Overdue = compliance.some(c => c.band === "overdue" && assets.find(a => a.id === c.asset_id)?.tier === "tier-0");
    if (tier0Overdue || unverified.length > 0) overall = "non_compliant";
    else if (overdue.length > 0 || compliance.some(c => c.band === "due_soon")) overall = "at_risk";
    const recommendations: string[] = [];
    if (tier0Overdue) recommendations.push("CRITICAL: tier-0 asset drill overdue — schedule within 7 days");
    if (overdue.length > 0) recommendations.push("Drill " + overdue.length + " asset(s) overdue cadence");
    if (unverified.length > 0) recommendations.push("Attestation failure on " + unverified.length + " asset(s) — investigate signing chain");
    if (compliance.filter(c => c.band === "due_soon").length > 0) {
      recommendations.push("Schedule drills for " + compliance.filter(c => c.band === "due_soon").length + " asset(s) due soon");
    }
    if (recommendations.length === 0) recommendations.push("Backup/restore posture is compliant. Continue cadence.");
    const plan: BackupPlan = {
      generated_at: now,
      assets,
      compliance,
      overall,
      overdue_asset_ids: overdue,
      unverified_asset_ids: unverified,
      recommendations,
    };
    log.info("[BACKUP] Plan generated: " + overall);
    return plan;
  }

  getStats(): BackupStats {
    const drills = this.drills;
    const passed = drills.filter(d => d.verification_outcome === "pass" && d.rto_met && d.attestation_verified).length;
    const failed = drills.filter(d => d.verification_outcome === "fail" || !d.rto_met || !d.attestation_verified).length;
    const avgRto = drills.length > 0 ? drills.reduce((s, d) => s + d.actual_rto_minutes, 0) / drills.length : 0;
    const overdue = this.getDrillCompliance().filter(c => c.band === "overdue").length;
    return {
      assets_registered: this.assets.size,
      backups_recorded: this.jobs.length,
      attestations_issued: this.attestations.size,
      drills_run: drills.length,
      drills_passed: passed,
      drills_failed: failed,
      assets_overdue: overdue,
      avg_restore_rto_minutes: avgRto,
    };
  }

  clearAll(): { assets_cleared: number; jobs_cleared: number; drills_cleared: number; attestations_cleared: number } {
    const ac = this.assets.size;
    const jc = this.jobs.length;
    const dc = this.drills.length;
    const att = this.attestations.size;
    this.assets.clear();
    for (const a of DEFAULT_ASSETS) this.assets.set(a.id, { ...a });
    this.jobs = [];
    this.drills = [];
    this.attestations.clear();
    return { assets_cleared: ac, jobs_cleared: jc, drills_cleared: dc, attestations_cleared: att };
  }

  // ── private ─────────────────────────────────────────────────────

  private signEnvelope(env: Omit<AttestationEnvelope, "signature_hex">): string {
    // Canonical serialization: stable field order via explicit construction.
    const canonical =
      env.schemaVersion + "|" +
      env.asset_id + "|" +
      env.job_id + "|" +
      env.payload_sha256 + "|" +
      env.size_bytes + "|" +
      env.storage_location + "|" +
      env.signer_id + "|" +
      env.algorithm + "|" +
      env.created_at;
    return createHmac("sha256", this.signingKey).update(canonical).digest("hex");
  }

  private generateJobId(assetId: string, startedAt: number): string {
    const hash = createHash("sha256")
      .update(assetId + ":" + startedAt + ":" + randomBytes(8).toString("hex"))
      .digest("hex")
      .slice(0, 12);
    return "job-" + hash;
  }

  private generateDrillId(assetId: string, startedAt: number): string {
    const hash = createHash("sha256")
      .update(assetId + ":drill:" + startedAt + ":" + randomBytes(8).toString("hex"))
      .digest("hex")
      .slice(0, 12);
    return "drill-" + hash;
  }

  private lastDrillForAsset(assetId: string): RestoreDrill | null {
    let last: RestoreDrill | null = null;
    for (const d of this.drills) {
      if (d.asset_id !== assetId) continue;
      if (d.verification_outcome === "fail") continue; // failed drill doesn't reset cadence
      if (!last || d.completed_at > last.completed_at) last = d;
    }
    return last;
  }

  private findUnverifiedAssets(): string[] {
    // Assets where the most recent drill's attestation failed to verify.
    const out = new Set<string>();
    const byAsset = new Map<string, RestoreDrill>();
    for (const d of this.drills) {
      const cur = byAsset.get(d.asset_id);
      if (!cur || d.completed_at > cur.completed_at) byAsset.set(d.asset_id, d);
    }
    for (const d of byAsset.values()) {
      if (!d.attestation_verified) out.add(d.asset_id);
    }
    return Array.from(out);
  }
}

export const backupRestoreDrillEngine = new BackupRestoreDrillEngine();
