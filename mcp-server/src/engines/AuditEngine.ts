/**
 * AuditEngine — L2-P3-MS1 Infrastructure Layer
 *
 * Compliance audit trail: records all significant actions,
 * data changes, and access events with tamper-evident sequencing.
 * Supports query, retention, and compliance reporting.
 *
 * Actions: audit_log, audit_query, audit_report, audit_retention
 */

// ============================================================================
// TYPES
// ============================================================================

export type AuditCategory = "auth" | "data" | "config" | "safety" | "machine" | "quality" | "export" | "admin" | "system";
export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditEntry {
  id: number;
  timestamp: string;
  category: AuditCategory;
  severity: AuditSeverity;
  action: string;
  actor: string;
  tenant_id?: string;
  resource_type?: string;
  resource_id?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  previous_value?: unknown;
  new_value?: unknown;
  sequence: number;
}

export interface AuditQuery {
  category?: AuditCategory;
  severity?: AuditSeverity;
  actor?: string;
  tenant_id?: string;
  action?: string;
  resource_type?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export interface AuditReport {
  period_start: string;
  period_end: string;
  total_events: number;
  by_category: Record<AuditCategory, number>;
  by_severity: Record<AuditSeverity, number>;
  unique_actors: number;
  critical_events: AuditEntry[];
  top_actions: { action: string; count: number }[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

let auditSequence = 0;

export class AuditEngine {
  private entries: AuditEntry[] = [];
  private maxEntries = 50000;
  private retentionDays = 365;

  log(
    category: AuditCategory, action: string, actor: string,
    details: Record<string, unknown> = {},
    options?: { severity?: AuditSeverity; tenant_id?: string; resource_type?: string; resource_id?: string; ip_address?: string; previous_value?: unknown; new_value?: unknown }
  ): AuditEntry {
    auditSequence++;
    const entry: AuditEntry = {
      id: auditSequence,
      timestamp: new Date().toISOString(),
      category,
      severity: options?.severity || "info",
      action, actor,
      tenant_id: options?.tenant_id,
      resource_type: options?.resource_type,
      resource_id: options?.resource_id,
      details,
      ip_address: options?.ip_address,
      previous_value: options?.previous_value,
      new_value: options?.new_value,
      sequence: auditSequence,
    };

    this.entries.push(entry);
    this.enforceRetention();

    return entry;
  }

  query(q: AuditQuery): AuditEntry[] {
    let result = [...this.entries];

    if (q.category) result = result.filter(e => e.category === q.category);
    if (q.severity) result = result.filter(e => e.severity === q.severity);
    if (q.actor) result = result.filter(e => e.actor === q.actor);
    if (q.tenant_id) result = result.filter(e => e.tenant_id === q.tenant_id);
    if (q.action) result = result.filter(e => e.action.includes(q.action));
    if (q.resource_type) result = result.filter(e => e.resource_type === q.resource_type);
    if (q.since) { const ts = new Date(q.since).getTime(); result = result.filter(e => new Date(e.timestamp).getTime() >= ts); }
    if (q.until) { const ts = new Date(q.until).getTime(); result = result.filter(e => new Date(e.timestamp).getTime() <= ts); }

    return result.slice(-(q.limit || 100));
  }

  report(periodStart: string, periodEnd: string): AuditReport {
    const startMs = new Date(periodStart).getTime();
    const endMs = new Date(periodEnd).getTime();
    const filtered = this.entries.filter(e => {
      const ts = new Date(e.timestamp).getTime();
      return ts >= startMs && ts <= endMs;
    });

    const byCategory: Record<AuditCategory, number> = { auth: 0, data: 0, config: 0, safety: 0, machine: 0, quality: 0, export: 0, admin: 0, system: 0 };
    const bySeverity: Record<AuditSeverity, number> = { info: 0, warning: 0, critical: 0 };
    const actors = new Set<string>();
    const actionCounts = new Map<string, number>();

    for (const e of filtered) {
      byCategory[e.category]++;
      bySeverity[e.severity]++;
      actors.add(e.actor);
      actionCounts.set(e.action, (actionCounts.get(e.action) || 0) + 1);
    }

    const topActions = [...actionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    return {
      period_start: periodStart,
      period_end: periodEnd,
      total_events: filtered.length,
      by_category: byCategory,
      by_severity: bySeverity,
      unique_actors: actors.size,
      critical_events: filtered.filter(e => e.severity === "critical"),
      top_actions: topActions,
    };
  }

  getSequence(): number { return auditSequence; }

  setRetention(days: number): void { this.retentionDays = days; }

  getEntryCount(): number { return this.entries.length; }

  clear(): void { this.entries = []; auditSequence = 0; }

  // ---- PRIVATE ----

  private enforceRetention(): void {
    while (this.entries.length > this.maxEntries) this.entries.shift();

    const cutoff = Date.now() - this.retentionDays * 86400000;
    while (this.entries.length > 0 && new Date(this.entries[0].timestamp).getTime() < cutoff) {
      this.entries.shift();
    }
  }
}

export const auditEngine = new AuditEngine();
