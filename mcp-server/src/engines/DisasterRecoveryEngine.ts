/**
 * DisasterRecoveryEngine — U-LPR-OPS-DR
 *
 * Disaster Recovery / Business Continuity Plan with:
 * - RTO (Recovery Time Objective): 4 hours
 * - RPO (Recovery Point Objective): 1 hour
 * - Failure scenario classification and recovery runbooks
 * - Replication lag tracking and drill validation
 * - Tier-based recovery priorities (tier-0 critical, tier-1 important, tier-2 deferrable)
 *
 * Reference: NIST SP 800-34 (Contingency Planning Guide for Federal Information Systems)
 * Reference: ISO 22301 (Business Continuity Management Systems)
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OPS-DR
 * @phase PHASE-11 (Production Ops Maturity)
 */

import { log } from "../utils/Logger.js";

export type DisasterTier = "tier-0" | "tier-1" | "tier-2";
export type DisasterCategory =
  | "hardware_failure"
  | "network_outage"
  | "data_corruption"
  | "region_failure"
  | "ransomware"
  | "human_error"
  | "supply_chain";

export interface RTORPOTarget {
  tier: DisasterTier;
  rto_hours: number;
  rpo_hours: number;
  description: string;
}

export interface DRScenario {
  id: string;
  category: DisasterCategory;
  tier: DisasterTier;
  name: string;
  description: string;
  detection_signals: string[];
  runbook_steps: string[];
  estimated_recovery_minutes: number;
  last_drilled_timestamp: number | null;
  last_drill_outcome: "pass" | "fail" | "degraded" | null;
}

export interface ReplicationStatus {
  source: string;
  destination: string;
  lag_seconds: number;
  last_sync_timestamp: number;
  healthy: boolean;
  rpo_compliant: boolean;
}

export interface DRDrillResult {
  scenario_id: string;
  drill_timestamp: number;
  outcome: "pass" | "fail" | "degraded";
  actual_rto_minutes: number;
  actual_rpo_minutes: number;
  rto_met: boolean;
  rpo_met: boolean;
  notes: string;
  findings: string[];
}

export interface DRPlan {
  generated_at: number;
  rto_rpo_targets: RTORPOTarget[];
  scenarios: DRScenario[];
  replications: ReplicationStatus[];
  overall_compliance: "compliant" | "at_risk" | "non_compliant";
  untested_scenarios: string[];
  last_full_drill_timestamp: number | null;
  next_drill_due_date: string;
  recommendations: string[];
}

export interface DRStats {
  scenarios_registered: number;
  drills_run: number;
  drills_passed: number;
  drills_failed: number;
  last_drill_timestamp: number | null;
  avg_rto_minutes: number;
  avg_rpo_minutes: number;
}

const DEFAULT_RTO_RPO: RTORPOTarget[] = [
  { tier: "tier-0", rto_hours: 4, rpo_hours: 1, description: "Critical: production serving, active tenancy" },
  { tier: "tier-1", rto_hours: 8, rpo_hours: 4, description: "Important: reporting, analytics, secondary services" },
  { tier: "tier-2", rto_hours: 24, rpo_hours: 24, description: "Deferrable: archival, historical logs, non-critical" },
];

const DEFAULT_SCENARIOS: DRScenario[] = [
  {
    id: "DR-001",
    category: "region_failure",
    tier: "tier-0",
    name: "Primary region outage",
    description: "Primary cloud region becomes unavailable (network partition, cloud provider incident)",
    detection_signals: ["health_probe_fail_rate > 50%", "p99_latency > 10s", "error_rate > 20%"],
    runbook_steps: [
      "1. Confirm region outage via cloud provider status page",
      "2. Declare DR event in incident management system",
      "3. Initiate DNS failover to DR region (TTL 60s)",
      "4. Promote DR region database replica to primary",
      "5. Verify DR region serves requests (canary probes)",
      "6. Update status page and notify customers",
      "7. Monitor convergence and ramp traffic",
    ],
    estimated_recovery_minutes: 45,
    last_drilled_timestamp: null,
    last_drill_outcome: null,
  },
  {
    id: "DR-002",
    category: "data_corruption",
    tier: "tier-0",
    name: "Database corruption or accidental deletion",
    description: "Logical corruption, DROP TABLE, or malicious data deletion",
    detection_signals: ["consistency_check_fail", "missing_row_count > threshold", "checksum_mismatch"],
    runbook_steps: [
      "1. Isolate affected database (revoke write access)",
      "2. Identify last known-good timestamp from replication log",
      "3. Restore from point-in-time backup (RPO: 1hr)",
      "4. Replay WAL/redo logs up to corruption timestamp",
      "5. Validate restore via checksums and sample queries",
      "6. Switch traffic to restored instance",
      "7. Post-mortem to identify root cause",
    ],
    estimated_recovery_minutes: 90,
    last_drilled_timestamp: null,
    last_drill_outcome: null,
  },
  {
    id: "DR-003",
    category: "ransomware",
    tier: "tier-0",
    name: "Ransomware / malicious encryption",
    description: "Encrypted files detected, ransom note, or unauthorized access to backup systems",
    detection_signals: ["unexpected_encryption_events", "suspicious_process_activity", "backup_integrity_fail"],
    runbook_steps: [
      "1. ISOLATE: Disconnect affected systems from network immediately",
      "2. Do NOT pay ransom; do NOT restart affected systems",
      "3. Engage incident response team and law enforcement",
      "4. Verify clean backup integrity (air-gapped or immutable)",
      "5. Rebuild affected systems from known-good images",
      "6. Restore data from last verified-clean backup",
      "7. Rotate all credentials and certificates",
      "8. Post-incident forensics and disclosure",
    ],
    estimated_recovery_minutes: 240,
    last_drilled_timestamp: null,
    last_drill_outcome: null,
  },
  {
    id: "DR-004",
    category: "hardware_failure",
    tier: "tier-1",
    name: "Storage array failure",
    description: "Disk array or SAN degradation exceeding redundancy threshold",
    detection_signals: ["raid_degraded", "disk_smart_errors", "io_latency_spike"],
    runbook_steps: [
      "1. Fail over to redundant storage tier",
      "2. Replace failed hardware components",
      "3. Trigger RAID rebuild and monitor progress",
      "4. Verify data integrity via scrub",
      "5. Return to normal operations",
    ],
    estimated_recovery_minutes: 120,
    last_drilled_timestamp: null,
    last_drill_outcome: null,
  },
  {
    id: "DR-005",
    category: "human_error",
    tier: "tier-1",
    name: "Accidental config change causing outage",
    description: "Misconfiguration pushed to production (bad deploy, wrong feature flag)",
    detection_signals: ["deploy_correlation_with_errors", "rollback_ready_flag"],
    runbook_steps: [
      "1. Trigger automated rollback via CD pipeline",
      "2. Validate rollback via health probes",
      "3. Notify team and document change",
      "4. Add regression test to prevent recurrence",
    ],
    estimated_recovery_minutes: 15,
    last_drilled_timestamp: null,
    last_drill_outcome: null,
  },
];

export class DisasterRecoveryEngine {
  private scenarios: Map<string, DRScenario> = new Map();
  private drillHistory: DRDrillResult[] = [];
  private replications: ReplicationStatus[] = [];
  private rtoRpoTargets: RTORPOTarget[] = [...DEFAULT_RTO_RPO];

  constructor() {
    for (const s of DEFAULT_SCENARIOS) this.scenarios.set(s.id, { ...s });
  }

  /**
   * Register or update a DR scenario.
   * @param scenario Full scenario definition
   */
  registerScenario(scenario: DRScenario): { success: boolean; scenario_id: string } {
    if (!scenario.id) throw new Error("scenario.id required");
    this.scenarios.set(scenario.id, { ...scenario });
    log.info("[DR] Registered scenario: " + scenario.id);
    return { success: true, scenario_id: scenario.id };
  }

  getScenario(id: string): DRScenario | null {
    return this.scenarios.get(id) ?? null;
  }

  listScenarios(tier?: DisasterTier, category?: DisasterCategory): DRScenario[] {
    let out = Array.from(this.scenarios.values());
    if (tier) out = out.filter(s => s.tier === tier);
    if (category) out = out.filter(s => s.category === category);
    return out;
  }

  /**
   * Record a DR drill outcome. Enforces RTO/RPO evaluation per-tier.
   */
  recordDrill(result: Omit<DRDrillResult, "rto_met" | "rpo_met">): DRDrillResult {
    const scenario = this.scenarios.get(result.scenario_id);
    if (!scenario) throw new Error("Unknown scenario: " + result.scenario_id);
    const target = this.rtoRpoTargets.find(t => t.tier === scenario.tier);
    if (!target) throw new Error("No RTO/RPO target for tier: " + scenario.tier);
    const rtoMet = result.actual_rto_minutes <= target.rto_hours * 60;
    const rpoMet = result.actual_rpo_minutes <= target.rpo_hours * 60;
    const full: DRDrillResult = { ...result, rto_met: rtoMet, rpo_met: rpoMet };
    this.drillHistory.push(full);
    scenario.last_drilled_timestamp = result.drill_timestamp;
    scenario.last_drill_outcome = result.outcome;
    log.info("[DR] Drill " + result.scenario_id + ": " + result.outcome + " (RTO met: " + rtoMet + ", RPO met: " + rpoMet + ")");
    return full;
  }

  /**
   * Update replication lag for a source→destination pair.
   * RPO-compliant if lag <= target RPO for tier-0 (default 1hr = 3600s).
   */
  updateReplication(status: Omit<ReplicationStatus, "rpo_compliant">): ReplicationStatus {
    const tier0 = this.rtoRpoTargets.find(t => t.tier === "tier-0");
    const rpoSeconds = (tier0?.rpo_hours ?? 1) * 3600;
    const rpoCompliant = status.lag_seconds <= rpoSeconds;
    const full: ReplicationStatus = { ...status, rpo_compliant: rpoCompliant };
    const existing = this.replications.findIndex(r => r.source === status.source && r.destination === status.destination);
    if (existing >= 0) this.replications[existing] = full;
    else this.replications.push(full);
    return full;
  }

  getReplications(): ReplicationStatus[] {
    return [...this.replications];
  }

  /**
   * Evaluate DR compliance across all scenarios and replications.
   * Returns overall status and remediation recommendations.
   */
  generatePlan(): DRPlan {
    const now = Date.now();
    const scenarios = Array.from(this.scenarios.values());
    const drillCutoffMs = 90 * 24 * 3600 * 1000; // 90-day drill cadence
    const untested = scenarios
      .filter(s => s.last_drilled_timestamp === null || now - s.last_drilled_timestamp > drillCutoffMs)
      .map(s => s.id);
    const replicationsNonCompliant = this.replications.filter(r => !r.rpo_compliant);
    const tier0Untested = scenarios.some(s => s.tier === "tier-0" && (s.last_drilled_timestamp === null || now - s.last_drilled_timestamp > drillCutoffMs));
    const recentDrills = this.drillHistory.filter(d => now - d.drill_timestamp < drillCutoffMs);
    const recentFailures = recentDrills.filter(d => d.outcome === "fail" || !d.rto_met || !d.rpo_met);
    let overall: "compliant" | "at_risk" | "non_compliant" = "compliant";
    if (replicationsNonCompliant.length > 0 || recentFailures.length > 0) overall = "non_compliant";
    else if (untested.length > 0 || tier0Untested) overall = "at_risk";
    const lastFullDrill = this.drillHistory.length > 0 ? this.drillHistory[this.drillHistory.length - 1].drill_timestamp : null;
    const nextDrillDate = new Date(now + 90 * 24 * 3600 * 1000).toISOString().split("T")[0];
    const recommendations: string[] = [];
    if (untested.length > 0) recommendations.push("Drill " + untested.length + " scenarios overdue (90-day cadence)");
    if (replicationsNonCompliant.length > 0) recommendations.push("RPO breach: " + replicationsNonCompliant.length + " replication pair(s) exceed 1hr lag");
    if (recentFailures.length > 0) recommendations.push("Address " + recentFailures.length + " failed drill(s) before next cycle");
    if (tier0Untested) recommendations.push("CRITICAL: tier-0 scenario has never been drilled — schedule immediately");
    if (recommendations.length === 0) recommendations.push("DR posture is compliant. Continue 90-day drill cadence.");
    const plan: DRPlan = {
      generated_at: now,
      rto_rpo_targets: [...this.rtoRpoTargets],
      scenarios,
      replications: [...this.replications],
      overall_compliance: overall,
      untested_scenarios: untested,
      last_full_drill_timestamp: lastFullDrill,
      next_drill_due_date: nextDrillDate,
      recommendations,
    };
    log.info("[DR] Plan generated: " + overall);
    return plan;
  }

  getDrillHistory(limit?: number): DRDrillResult[] {
    return limit && limit > 0 ? this.drillHistory.slice(-limit) : [...this.drillHistory];
  }

  getStats(): DRStats {
    const drills = this.drillHistory;
    const passed = drills.filter(d => d.outcome === "pass" && d.rto_met && d.rpo_met).length;
    const failed = drills.filter(d => d.outcome === "fail" || !d.rto_met || !d.rpo_met).length;
    const avgRTO = drills.length > 0 ? drills.reduce((s, d) => s + d.actual_rto_minutes, 0) / drills.length : 0;
    const avgRPO = drills.length > 0 ? drills.reduce((s, d) => s + d.actual_rpo_minutes, 0) / drills.length : 0;
    return {
      scenarios_registered: this.scenarios.size,
      drills_run: drills.length,
      drills_passed: passed,
      drills_failed: failed,
      last_drill_timestamp: drills.length > 0 ? drills[drills.length - 1].drill_timestamp : null,
      avg_rto_minutes: avgRTO,
      avg_rpo_minutes: avgRPO,
    };
  }

  getRTORPOTargets(): RTORPOTarget[] {
    return [...this.rtoRpoTargets];
  }

  clearAll(): { scenarios_cleared: number; drills_cleared: number; replications_cleared: number } {
    const sc = this.scenarios.size;
    const dc = this.drillHistory.length;
    const rc = this.replications.length;
    this.scenarios.clear();
    for (const s of DEFAULT_SCENARIOS) this.scenarios.set(s.id, { ...s });
    this.drillHistory = [];
    this.replications = [];
    return { scenarios_cleared: sc, drills_cleared: dc, replications_cleared: rc };
  }
}

export const disasterRecoveryEngine = new DisasterRecoveryEngine();
