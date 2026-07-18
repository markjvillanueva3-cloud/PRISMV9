/**
 * AuditFindingToCAPABridgeEngine (G13) — audit-finding → DMAIC bridge.
 *
 * Wires audit findings (from InternalAuditCalendarEngine / AuditEngine /
 * NonConformanceAndCorrectiveActionEngine) into a DMAIC kaizen event via
 * KaizenLeanSigmaEngine. One bridge call: createCapaFromFinding(finding) →
 * opens a kaizen event scoped to the offending operation/dept + records the
 * link both directions.
 *
 * Hotel-soul invariants: PII-free, R12, Object.frozen, audit-trail symmetric
 * (both finding-side and CAPA-side carry the cross-link).
 *
 * @module AuditFindingToCAPABridgeEngine
 * @milestone HOTEL/U-AUDIT-CAPA-BRIDGE (2026-05-26, slot:hotel iter8 /goal Phase 3)
 */

import { kaizenLeanSigmaEngine } from "./KaizenLeanSigmaEngine.js";

export type FindingSeverity = "low" | "medium" | "high" | "critical";

export interface BridgeInput {
  finding_id: string;
  department_code: string;
  severity: FindingSeverity;
  /** Short finding title for the kaizen event subject. */
  title: string;
  /** Free-text finding detail (drives event description). */
  description: string;
  /** Employee who raised the finding (manager opens CAPA). */
  raised_by_employee_id: string;
  /** Champion = floor employee leading remediation. */
  champion_employee_id: string;
  /** Sponsor = manager backing the kaizen (SoD: NOT raised_by). */
  sponsor_employee_id: string;
}

export interface BridgeRecord {
  finding_id: string;
  kaizen_event_id: string;
  department_code: string;
  severity: FindingSeverity;
  bridged_at: string;
  bridged_by_employee_id: string;
}

export interface SystemVizRoost {
  engine_name: string;
  layer: number;
  node_type: "hub" | "sink" | "source" | "orphan" | "ghost" | "normal";
  psn_legs: ReadonlyArray<number>;
  edges_out: ReadonlyArray<string>;
  edges_in: ReadonlyArray<string>;
}

const ALLOWED_SEVERITIES = new Set<FindingSeverity>([
  "low", "medium", "high", "critical",
]);

class AuditFindingToCAPABridgeEngine {
  private bridges: Map<string, BridgeRecord> = new Map();

  /**
   * Spawn a DMAIC kaizen event from an audit finding. Returns the kaizen
   * event id. Idempotent: re-bridging the same finding_id returns the existing
   * bridge without spawning a duplicate event.
   */
  createCapaFromFinding(args: BridgeInput): BridgeRecord {
    if (!args.finding_id) {
      throw new Error("AuditFindingToCAPABridgeEngine: finding_id required");
    }
    if (!args.department_code) {
      throw new Error("AuditFindingToCAPABridgeEngine: department_code required");
    }
    if (!ALLOWED_SEVERITIES.has(args.severity)) {
      throw new Error(
        `AuditFindingToCAPABridgeEngine: invalid severity '${args.severity}'`,
      );
    }
    if (!args.title || args.title.trim().length === 0) {
      throw new Error("AuditFindingToCAPABridgeEngine: title required");
    }
    if (!args.description || args.description.trim().length === 0) {
      throw new Error("AuditFindingToCAPABridgeEngine: description required");
    }
    if (!args.raised_by_employee_id) {
      throw new Error("AuditFindingToCAPABridgeEngine: raised_by_employee_id required");
    }
    if (!args.champion_employee_id) {
      throw new Error("AuditFindingToCAPABridgeEngine: champion_employee_id required");
    }
    if (!args.sponsor_employee_id) {
      throw new Error("AuditFindingToCAPABridgeEngine: sponsor_employee_id required");
    }
    if (args.raised_by_employee_id === args.sponsor_employee_id) {
      throw new Error(
        "AuditFindingToCAPABridgeEngine: raised_by cannot be sponsor (SoD — finder cannot self-sponsor remediation)",
      );
    }

    // Idempotency check — return existing bridge if finding already wired
    const existing = this.bridges.get(args.finding_id);
    if (existing) {
      return Object.freeze({ ...existing });
    }

    // Compose kaizen title (severity-prefixed for triage visibility)
    const sevPrefix = args.severity.toUpperCase();
    const event = kaizenLeanSigmaEngine.openEvent({
      title: `[${sevPrefix}] CAPA from finding ${args.finding_id}: ${args.title}`,
      champion_employee_id: args.champion_employee_id,
      sponsor_employee_id: args.sponsor_employee_id,
    });

    const bridge: BridgeRecord = Object.freeze({
      finding_id: args.finding_id,
      kaizen_event_id: event.id,
      department_code: args.department_code,
      severity: args.severity,
      bridged_at: new Date().toISOString(),
      bridged_by_employee_id: args.sponsor_employee_id,
    });
    this.bridges.set(args.finding_id, bridge);
    return bridge;
  }

  /** Look up the kaizen event id for a finding (returns null if not bridged). */
  getKaizenEventForFinding(finding_id: string): string | null {
    if (!finding_id) {
      throw new Error("AuditFindingToCAPABridgeEngine.getKaizenEventForFinding: finding_id required");
    }
    return this.bridges.get(finding_id)?.kaizen_event_id ?? null;
  }

  /** Look up the finding id that spawned a kaizen event (reverse). */
  getFindingForKaizenEvent(kaizen_event_id: string): string | null {
    if (!kaizen_event_id) {
      throw new Error("AuditFindingToCAPABridgeEngine.getFindingForKaizenEvent: kaizen_event_id required");
    }
    for (const b of this.bridges.values()) {
      if (b.kaizen_event_id === kaizen_event_id) return b.finding_id;
    }
    return null;
  }

  listBridges(args: { department_code?: string; severity?: FindingSeverity } = {}): ReadonlyArray<BridgeRecord> {
    if (args.severity !== undefined && !ALLOWED_SEVERITIES.has(args.severity)) {
      throw new Error(
        `AuditFindingToCAPABridgeEngine.listBridges: invalid severity '${args.severity}'`,
      );
    }
    const out: BridgeRecord[] = [];
    for (const b of this.bridges.values()) {
      if (args.department_code && b.department_code !== args.department_code) continue;
      if (args.severity && b.severity !== args.severity) continue;
      out.push(Object.freeze({ ...b }));
    }
    return Object.freeze(out);
  }

  systemVizRoost(): SystemVizRoost {
    return Object.freeze({
      engine_name: "AuditFindingToCAPABridgeEngine",
      layer: 7,
      node_type: "hub",
      psn_legs: Object.freeze([7, 11]),
      edges_out: Object.freeze(["KaizenLeanSigmaEngine"]),
      edges_in: Object.freeze([
        "InternalAuditCalendarEngine",
        "AuditEngine",
        "NonConformanceAndCorrectiveActionEngine",
        "DepartmentAuditDashboardEngine",
      ]),
    });
  }

  reset(): void {
    this.bridges.clear();
  }
}

export const auditFindingToCAPABridgeEngine = new AuditFindingToCAPABridgeEngine();
