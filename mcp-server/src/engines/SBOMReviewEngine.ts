/**
 * SBOMReviewEngine — U-LPR-OPS-SBOM-REVIEW
 *
 * Quarterly SBOM review + OSV delta triage. Maintains a component catalog,
 * tracks vulnerability records linked to components, computes the delta
 * between OSV snapshots (new / unchanged / resolved), enforces quarterly
 * review cadence with remediation SLAs per severity, and flags
 * overdue-remediation conditions that block production changes.
 *
 * Data model:
 *   - Component: package identity + version + license + supplier + last-reviewed.
 *   - Vulnerability: OSV/CVE id + severity + affected components + published.
 *   - OSVSnapshot: point-in-time vulnerability set for delta computation.
 *   - Remediation: per-vulnerability resolution record with due date.
 *
 * Remediation SLAs (NIST SP 800-40r4, CISA BOD 22-01 alignment):
 *   critical → 7 days
 *   high     → 30 days
 *   medium   → 90 days
 *   low      → 180 days
 *
 * Cadence: quarterly (90 d) full-SBOM review required; missed review
 * elevates the posture to "overdue" and produces alerts.
 *
 * Reference: NIST SP 800-161r1 (C-SCRM), NIST SP 800-40r4 (Patch Mgmt),
 *   NTIA SBOM Minimum Elements (2021-07-12), OSV Schema (osv.dev).
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OPS-SBOM-REVIEW
 * @phase PHASE-11 (Production Ops Maturity)
 */

import { log } from "../utils/Logger.js";

export type VulnSeverity = "none" | "low" | "medium" | "high" | "critical";
export type RemediationStatus = "open" | "in_progress" | "resolved" | "accepted_risk" | "false_positive";
export type ComponentType = "npm" | "pypi" | "cargo" | "go" | "maven" | "nuget" | "gem" | "rpm" | "deb" | "apk" | "other";

export interface Component {
  id: string; // purl-like identifier, e.g. pkg:npm/zod@3.22.4
  type: ComponentType;
  name: string;
  version: string;
  license: string; // SPDX license expression
  supplier: string; // org or maintainer
  direct_dependency: boolean;
  last_reviewed_at: number | null;
  hash_sha256: string | null;
}

export interface Vulnerability {
  id: string; // OSV/CVE id (e.g. CVE-2024-01234 or GHSA-xxxx-xxxx-xxxx)
  aliases: string[];
  summary: string;
  severity: VulnSeverity;
  cvss_score: number | null; // 0..10
  affected_component_ids: string[];
  first_seen_at: number;
  published_at: number;
  fixed_in_version: string | null;
  reference_urls: string[];
}

export interface OSVSnapshot {
  id: string;
  captured_at: number;
  source: string; // e.g. "osv.dev", "github-advisory"
  vulnerability_ids: string[];
}

export interface OSVDelta {
  from_snapshot: string;
  to_snapshot: string;
  new_vulnerabilities: string[];
  resolved_vulnerabilities: string[];
  unchanged_vulnerabilities: string[];
  delta_computed_at: number;
}

export interface Remediation {
  id: string;
  vulnerability_id: string;
  status: RemediationStatus;
  assigned_to: string;
  opened_at: number;
  due_at: number;
  resolved_at: number | null;
  resolution_notes: string;
  compensating_controls: string[];
}

export interface SBOMReview {
  id: string;
  review_cycle: string; // e.g. "2026-Q2"
  started_at: number;
  completed_at: number | null;
  reviewer: string;
  components_reviewed: number;
  new_vulns_count: number;
  resolved_vulns_count: number;
  unresolved_critical_count: number;
  notes: string;
}

export interface SBOMPosture {
  generated_at: number;
  overall: "healthy" | "at_risk" | "overdue";
  last_review: SBOMReview | null;
  days_since_last_review: number | null;
  quarterly_review_overdue: boolean;
  overdue_remediations: Remediation[];
  critical_open: number;
  high_open: number;
  findings: string[];
}

export interface SBOMStats {
  components_registered: number;
  components_by_type: Record<ComponentType, number>;
  vulnerabilities_registered: number;
  vulnerabilities_by_severity: Record<VulnSeverity, number>;
  snapshots_captured: number;
  deltas_computed: number;
  remediations_registered: number;
  remediations_by_status: Record<RemediationStatus, number>;
  reviews_completed: number;
}

// Remediation SLA (in days) per severity — NIST SP 800-40r4, CISA BOD 22-01 aligned.
const REMEDIATION_SLA_DAYS: Record<VulnSeverity, number> = {
  critical: 7,
  high: 30,
  medium: 90,
  low: 180,
  none: 365, // informational only; no hard SLA
};

const QUARTERLY_REVIEW_WINDOW_MS = 90 * 24 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

export class SBOMReviewEngine {
  private components: Map<string, Component> = new Map();
  private vulnerabilities: Map<string, Vulnerability> = new Map();
  private snapshots: Map<string, OSVSnapshot> = new Map();
  private deltas: OSVDelta[] = [];
  private remediations: Map<string, Remediation> = new Map();
  private reviews: SBOMReview[] = [];
  private remediationCounter = 0;
  private reviewCounter = 0;
  private deltaCounter = 0;

  // ── Components ─────────────────────────────────────────────────

  registerComponent(c: Component): Component {
    if (!c.id) throw new Error("component.id (purl) required");
    if (!c.version) throw new Error("component.version required");
    this.components.set(c.id, { ...c });
    log.info("[SBOM] Registered component: " + c.id + " (" + c.type + ")");
    return { ...c };
  }

  getComponent(id: string): Component | null {
    const c = this.components.get(id);
    return c ? { ...c } : null;
  }

  listComponents(filter?: { type?: ComponentType; direct_only?: boolean }): Component[] {
    let out = Array.from(this.components.values()).map(c => ({ ...c }));
    if (filter?.type) out = out.filter(c => c.type === filter.type);
    if (filter?.direct_only) out = out.filter(c => c.direct_dependency);
    return out;
  }

  // ── Vulnerabilities ────────────────────────────────────────────

  registerVulnerability(v: Omit<Vulnerability, "first_seen_at"> & { first_seen_at?: number }): Vulnerability {
    if (!v.id) throw new Error("vulnerability.id required");
    if (v.cvss_score !== null && (v.cvss_score < 0 || v.cvss_score > 10)) {
      throw new Error("cvss_score must be in [0, 10] or null");
    }
    for (const cid of v.affected_component_ids) {
      if (!this.components.has(cid)) {
        throw new Error("Unknown component reference: " + cid);
      }
    }
    // Preserve first_seen_at if vuln already known; otherwise stamp now.
    const existing = this.vulnerabilities.get(v.id);
    const firstSeen = existing?.first_seen_at ?? (v.first_seen_at ?? Date.now());
    const full: Vulnerability = {
      id: v.id,
      aliases: [...v.aliases],
      summary: v.summary,
      severity: v.severity,
      cvss_score: v.cvss_score,
      affected_component_ids: [...v.affected_component_ids],
      first_seen_at: firstSeen,
      published_at: v.published_at,
      fixed_in_version: v.fixed_in_version,
      reference_urls: [...v.reference_urls],
    };
    this.vulnerabilities.set(v.id, full);
    log.info("[SBOM] Registered vulnerability " + v.id + " severity=" + v.severity);
    return { ...full };
  }

  getVulnerability(id: string): Vulnerability | null {
    const v = this.vulnerabilities.get(id);
    return v ? { ...v } : null;
  }

  listVulnerabilities(filter?: { severity?: VulnSeverity; component_id?: string }): Vulnerability[] {
    let out = Array.from(this.vulnerabilities.values()).map(v => ({ ...v }));
    if (filter?.severity) out = out.filter(v => v.severity === filter.severity);
    if (filter?.component_id) out = out.filter(v => v.affected_component_ids.includes(filter.component_id!));
    return out;
  }

  // ── OSV snapshots + delta ──────────────────────────────────────

  captureSnapshot(input: { id: string; source: string; vulnerability_ids: string[]; captured_at?: number }): OSVSnapshot {
    if (!input.id) throw new Error("snapshot.id required");
    if (this.snapshots.has(input.id)) {
      throw new Error("Snapshot already exists: " + input.id);
    }
    // Do not require vuln ids to already be registered — snapshots can reference
    // upstream vulns not yet triaged into the catalog.
    const snap: OSVSnapshot = {
      id: input.id,
      captured_at: input.captured_at ?? Date.now(),
      source: input.source,
      vulnerability_ids: [...input.vulnerability_ids],
    };
    this.snapshots.set(input.id, snap);
    return { ...snap };
  }

  listSnapshots(): OSVSnapshot[] {
    return Array.from(this.snapshots.values())
      .map(s => ({ ...s }))
      .sort((a, b) => a.captured_at - b.captured_at);
  }

  /**
   * Compute delta between two snapshots using set semantics on vulnerability_ids.
   * Persists the delta to history so reviewers have an audit trail.
   */
  computeDelta(fromSnapshotId: string, toSnapshotId: string): OSVDelta {
    const from = this.snapshots.get(fromSnapshotId);
    const to = this.snapshots.get(toSnapshotId);
    if (!from) throw new Error("Unknown snapshot: " + fromSnapshotId);
    if (!to) throw new Error("Unknown snapshot: " + toSnapshotId);
    if (from.captured_at >= to.captured_at) {
      throw new Error("from snapshot must be captured before to snapshot");
    }
    const fromSet = new Set(from.vulnerability_ids);
    const toSet = new Set(to.vulnerability_ids);
    const newV: string[] = [];
    const unchanged: string[] = [];
    const resolved: string[] = [];
    for (const id of toSet) {
      if (fromSet.has(id)) unchanged.push(id);
      else newV.push(id);
    }
    for (const id of fromSet) {
      if (!toSet.has(id)) resolved.push(id);
    }
    this.deltaCounter++;
    const delta: OSVDelta = {
      from_snapshot: fromSnapshotId,
      to_snapshot: toSnapshotId,
      new_vulnerabilities: newV,
      resolved_vulnerabilities: resolved,
      unchanged_vulnerabilities: unchanged,
      delta_computed_at: Date.now(),
    };
    this.deltas.push(delta);
    log.info(
      "[SBOM] Delta " + fromSnapshotId + "→" + toSnapshotId +
      ": +" + newV.length + " / -" + resolved.length + " / =" + unchanged.length
    );
    return { ...delta };
  }

  listDeltas(): OSVDelta[] {
    return this.deltas.map(d => ({ ...d }));
  }

  // ── Remediations ───────────────────────────────────────────────

  openRemediation(input: {
    vulnerability_id: string;
    assigned_to: string;
    now?: number;
    id?: string;
  }): Remediation {
    const vuln = this.vulnerabilities.get(input.vulnerability_id);
    if (!vuln) throw new Error("Unknown vulnerability: " + input.vulnerability_id);
    if (!input.assigned_to) throw new Error("assigned_to required");
    this.remediationCounter++;
    const now = input.now ?? Date.now();
    const slaDays = REMEDIATION_SLA_DAYS[vuln.severity];
    const rem: Remediation = {
      id: input.id || "REM-" + String(this.remediationCounter).padStart(5, "0"),
      vulnerability_id: input.vulnerability_id,
      status: "open",
      assigned_to: input.assigned_to,
      opened_at: now,
      due_at: now + slaDays * DAY_MS,
      resolved_at: null,
      resolution_notes: "",
      compensating_controls: [],
    };
    this.remediations.set(rem.id, rem);
    log.info("[SBOM] Opened remediation " + rem.id + " for " + input.vulnerability_id + " due in " + slaDays + "d");
    return { ...rem };
  }

  updateRemediation(input: {
    id: string;
    status?: RemediationStatus;
    resolution_notes?: string;
    compensating_controls?: string[];
    now?: number;
  }): Remediation {
    const r = this.remediations.get(input.id);
    if (!r) throw new Error("Unknown remediation: " + input.id);
    if (input.status) {
      r.status = input.status;
      if (input.status === "resolved" || input.status === "accepted_risk" || input.status === "false_positive") {
        r.resolved_at = input.now ?? Date.now();
      }
    }
    if (typeof input.resolution_notes === "string") r.resolution_notes = input.resolution_notes;
    if (input.compensating_controls) r.compensating_controls = [...input.compensating_controls];
    return { ...r };
  }

  listRemediations(filter?: { status?: RemediationStatus; overdue_only?: boolean; now?: number }): Remediation[] {
    const now = filter?.now ?? Date.now();
    let out = Array.from(this.remediations.values()).map(r => ({ ...r }));
    if (filter?.status) out = out.filter(r => r.status === filter.status);
    if (filter?.overdue_only) {
      out = out.filter(r => (r.status === "open" || r.status === "in_progress") && r.due_at < now);
    }
    return out;
  }

  // ── Quarterly reviews ──────────────────────────────────────────

  startReview(input: { review_cycle: string; reviewer: string; now?: number }): SBOMReview {
    if (!input.review_cycle) throw new Error("review_cycle required");
    if (!input.reviewer) throw new Error("reviewer required");
    this.reviewCounter++;
    const review: SBOMReview = {
      id: "REV-" + String(this.reviewCounter).padStart(4, "0"),
      review_cycle: input.review_cycle,
      started_at: input.now ?? Date.now(),
      completed_at: null,
      reviewer: input.reviewer,
      components_reviewed: 0,
      new_vulns_count: 0,
      resolved_vulns_count: 0,
      unresolved_critical_count: 0,
      notes: "",
    };
    this.reviews.push(review);
    return { ...review };
  }

  completeReview(input: {
    id: string;
    components_reviewed: number;
    new_vulns_count: number;
    resolved_vulns_count: number;
    unresolved_critical_count: number;
    notes: string;
    now?: number;
  }): SBOMReview {
    const review = this.reviews.find(r => r.id === input.id);
    if (!review) throw new Error("Unknown review: " + input.id);
    if (review.completed_at !== null) throw new Error("Review already completed");
    if (input.components_reviewed < 0) throw new Error("components_reviewed must be >= 0");
    review.components_reviewed = input.components_reviewed;
    review.new_vulns_count = input.new_vulns_count;
    review.resolved_vulns_count = input.resolved_vulns_count;
    review.unresolved_critical_count = input.unresolved_critical_count;
    review.notes = input.notes;
    review.completed_at = input.now ?? Date.now();
    log.info(
      "[SBOM] Completed review " + review.id + " (" + review.review_cycle +
      ") components=" + input.components_reviewed +
      " critical_open=" + input.unresolved_critical_count
    );
    return { ...review };
  }

  listReviews(): SBOMReview[] {
    return this.reviews.map(r => ({ ...r }));
  }

  // ── Posture ────────────────────────────────────────────────────

  getPosture(now: number = Date.now()): SBOMPosture {
    const completedReviews = this.reviews.filter(r => r.completed_at !== null);
    const last = completedReviews
      .slice()
      .sort((a, b) => (b.completed_at ?? 0) - (a.completed_at ?? 0))[0] ?? null;

    const daysSince = last !== null && last.completed_at !== null
      ? Math.floor((now - last.completed_at) / DAY_MS)
      : null;
    const quarterlyOverdue =
      last === null ||
      last.completed_at === null ||
      (now - last.completed_at) > QUARTERLY_REVIEW_WINDOW_MS;

    const overdueRems = this.listRemediations({ overdue_only: true, now });
    const openCritical = Array.from(this.remediations.values())
      .filter(r => (r.status === "open" || r.status === "in_progress"))
      .filter(r => {
        const v = this.vulnerabilities.get(r.vulnerability_id);
        return v?.severity === "critical";
      }).length;
    const openHigh = Array.from(this.remediations.values())
      .filter(r => (r.status === "open" || r.status === "in_progress"))
      .filter(r => {
        const v = this.vulnerabilities.get(r.vulnerability_id);
        return v?.severity === "high";
      }).length;

    let overall: "healthy" | "at_risk" | "overdue";
    if (openCritical > 0 || overdueRems.length > 0) overall = "at_risk";
    else if (quarterlyOverdue) overall = "overdue";
    else overall = "healthy";

    const findings: string[] = [];
    if (overdueRems.length > 0) {
      findings.push(overdueRems.length + " remediations past their SLA — immediate action required");
    }
    if (openCritical > 0) {
      findings.push(openCritical + " critical vulnerabilities unresolved");
    }
    if (quarterlyOverdue) {
      findings.push("Quarterly SBOM review is overdue (>90 days since last completed review)");
    }
    if (overall === "healthy") findings.push("SBOM posture healthy. Continue quarterly review cadence.");

    return {
      generated_at: now,
      overall,
      last_review: last ? { ...last } : null,
      days_since_last_review: daysSince,
      quarterly_review_overdue: quarterlyOverdue,
      overdue_remediations: overdueRems,
      critical_open: openCritical,
      high_open: openHigh,
      findings,
    };
  }

  getStats(): SBOMStats {
    const byType: Record<ComponentType, number> = {
      npm: 0, pypi: 0, cargo: 0, go: 0, maven: 0, nuget: 0, gem: 0, rpm: 0, deb: 0, apk: 0, other: 0,
    };
    for (const c of this.components.values()) byType[c.type]++;
    const bySev: Record<VulnSeverity, number> = { none: 0, low: 0, medium: 0, high: 0, critical: 0 };
    for (const v of this.vulnerabilities.values()) bySev[v.severity]++;
    const byStatus: Record<RemediationStatus, number> = {
      open: 0, in_progress: 0, resolved: 0, accepted_risk: 0, false_positive: 0,
    };
    for (const r of this.remediations.values()) byStatus[r.status]++;
    return {
      components_registered: this.components.size,
      components_by_type: byType,
      vulnerabilities_registered: this.vulnerabilities.size,
      vulnerabilities_by_severity: bySev,
      snapshots_captured: this.snapshots.size,
      deltas_computed: this.deltas.length,
      remediations_registered: this.remediations.size,
      remediations_by_status: byStatus,
      reviews_completed: this.reviews.filter(r => r.completed_at !== null).length,
    };
  }

  clearAll(): { components: number; vulnerabilities: number; remediations: number; reviews: number } {
    const cc = this.components.size;
    const vc = this.vulnerabilities.size;
    const rc = this.remediations.size;
    const rvc = this.reviews.length;
    this.components.clear();
    this.vulnerabilities.clear();
    this.snapshots.clear();
    this.deltas = [];
    this.remediations.clear();
    this.reviews = [];
    this.remediationCounter = 0;
    this.reviewCounter = 0;
    this.deltaCounter = 0;
    return { components: cc, vulnerabilities: vc, remediations: rc, reviews: rvc };
  }
}

export const sbomReviewEngine = new SBOMReviewEngine();
