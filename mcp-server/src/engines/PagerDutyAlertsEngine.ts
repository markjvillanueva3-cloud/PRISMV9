/**
 * PagerDutyAlertsEngine — U-LPR-OBS3
 *
 * PagerDuty integration for incident alerting:
 * - Event routing and escalation
 * - Alert severity mapping (P1-P4)
 * - Runbook attachment per alert type
 * - RACI matrix per alert
 * - On-call schedule awareness
 * - Alert deduplication and grouping
 * - Maintenance window handling
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OBS3
 * @phase PHASE-10 (Observability + SLO)
 */

import * as crypto from 'crypto';
import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export type AlertSeverity = 'critical' | 'error' | 'warning' | 'info';
export type AlertStatus = 'triggered' | 'acknowledged' | 'resolved';

export interface AlertEvent {
  routingKey: string;
  eventAction: 'trigger' | 'acknowledge' | 'resolve';
  dedupKey: string;
  payload: AlertPayload;
  links?: AlertLink[];
  images?: AlertImage[];
}

export interface AlertPayload {
  summary: string;
  source: string;
  severity: AlertSeverity;
  timestamp?: string;
  component?: string;
  group?: string;
  class?: string;
  customDetails?: Record<string, unknown>;
}

export interface AlertLink {
  href: string;
  text: string;
}

export interface AlertImage {
  src: string;
  href?: string;
  alt?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  routingKey: string;
  escalationPolicy?: string;
  runbookUrl?: string;
  raci: RACIAssignment;
  tags: string[];
  enabled: boolean;
  suppressDuplicatesFor?: number;  // seconds
  maintenanceWindows?: string[];   // window IDs to skip
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  threshold: number;
  duration?: number;  // seconds
  labels?: Record<string, string>;
}

export interface RACIAssignment {
  responsible: string[];   // who does the work
  accountable: string;     // who is ultimately accountable
  consulted: string[];     // who should be asked for input
  informed: string[];      // who should be notified
}

export interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
}

export interface EscalationLevel {
  level: number;
  targets: string[];       // user/team IDs
  delayMinutes: number;    // delay before escalating to next level
}

export interface OnCallSchedule {
  id: string;
  name: string;
  timezone: string;
  currentOnCall: string;
  nextRotation: number;    // timestamp
}

export interface MaintenanceWindow {
  id: string;
  name: string;
  services: string[];
  startTime: number;
  endTime: number;
  createdBy: string;
}

export interface ActiveAlert {
  id: string;
  dedupKey: string;
  ruleId: string;
  status: AlertStatus;
  severity: AlertSeverity;
  summary: string;
  source: string;
  triggeredAt: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  escalationLevel: number;
  incidentId?: string;     // linked PD incident
  lastNotificationAt: number;
  notificationCount: number;
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByRule: Record<string, number>;
  avgAcknowledgeTimeMs: number;
  avgResolveTimeMs: number;
  suppressedAlerts: number;
}

export interface PagerDutyConfig {
  apiEndpoint: string;
  routingKey: string;
  defaultEscalationPolicy: string;
  defaultSeverity: AlertSeverity;
  deduplicationWindowSeconds: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class PagerDutyAlertsEngine {
  private config: PagerDutyConfig;
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, ActiveAlert> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private onCallSchedules: Map<string, OnCallSchedule> = new Map();
  private maintenanceWindows: Map<string, MaintenanceWindow> = new Map();
  private suppressedDedup: Map<string, number> = new Map();  // dedupKey -> lastTriggeredAt
  private stats: AlertStats = {
    totalAlerts: 0,
    activeAlerts: 0,
    acknowledgedAlerts: 0,
    resolvedAlerts: 0,
    alertsBySeverity: { critical: 0, error: 0, warning: 0, info: 0 },
    alertsByRule: {},
    avgAcknowledgeTimeMs: 0,
    avgResolveTimeMs: 0,
    suppressedAlerts: 0,
  };
  private totalAckTime = 0;
  private totalResolveTime = 0;
  private ackCount = 0;
  private resolveCount = 0;

  private defaultConfig: PagerDutyConfig = {
    apiEndpoint: 'https://events.pagerduty.com/v2/enqueue',
    routingKey: '',
    defaultEscalationPolicy: 'default',
    defaultSeverity: 'error',
    deduplicationWindowSeconds: 300,
  };

  constructor(config?: Partial<PagerDutyConfig>) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Gets current configuration.
   */
  getConfig(): PagerDutyConfig {
    return { ...this.config };
  }

  /**
   * Updates configuration.
   */
  configure(config: Partial<PagerDutyConfig>): void {
    this.config = { ...this.config, ...config };
    log.info('[PD] Configuration updated');
  }

  /**
   * Registers an alert rule.
   */
  registerRule(rule: AlertRule): boolean {
    if (this.rules.has(rule.id)) {
      log.warn(`[PD] Rule already exists: ${rule.id}`);
      return false;
    }

    this.rules.set(rule.id, rule);
    log.info(`[PD] Rule registered: ${rule.name}`);
    return true;
  }

  /**
   * Updates an alert rule.
   */
  updateRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const rule = this.rules.get(id);
    if (!rule) return null;

    const updated = { ...rule, ...updates, id };
    this.rules.set(id, updated);
    return updated;
  }

  /**
   * Deletes an alert rule.
   */
  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /**
   * Gets a rule by ID.
   */
  getRule(id: string): AlertRule | null {
    return this.rules.get(id) || null;
  }

  /**
   * Lists all rules.
   */
  listRules(filter?: { enabled?: boolean; severity?: AlertSeverity }): AlertRule[] {
    let rules = [...this.rules.values()];

    if (filter?.enabled !== undefined) {
      rules = rules.filter(r => r.enabled === filter.enabled);
    }
    if (filter?.severity) {
      rules = rules.filter(r => r.severity === filter.severity);
    }

    return rules;
  }

  /**
   * Registers an escalation policy.
   */
  registerEscalationPolicy(policy: EscalationPolicy): void {
    this.escalationPolicies.set(policy.id, policy);
    log.info(`[PD] Escalation policy registered: ${policy.name}`);
  }

  /**
   * Gets escalation policy.
   */
  getEscalationPolicy(id: string): EscalationPolicy | null {
    return this.escalationPolicies.get(id) || null;
  }

  /**
   * Registers on-call schedule.
   */
  registerOnCallSchedule(schedule: OnCallSchedule): void {
    this.onCallSchedules.set(schedule.id, schedule);
  }

  /**
   * Gets current on-call for schedule.
   */
  getCurrentOnCall(scheduleId: string): string | null {
    const schedule = this.onCallSchedules.get(scheduleId);
    return schedule?.currentOnCall || null;
  }

  /**
   * Creates maintenance window.
   */
  createMaintenanceWindow(window: MaintenanceWindow): void {
    this.maintenanceWindows.set(window.id, window);
    log.info(`[PD] Maintenance window created: ${window.name}`);
  }

  /**
   * Checks if service is in maintenance.
   */
  isInMaintenance(serviceId: string): boolean {
    const now = Date.now();
    for (const window of this.maintenanceWindows.values()) {
      if (window.services.includes(serviceId) &&
          now >= window.startTime &&
          now <= window.endTime) {
        return true;
      }
    }
    return false;
  }

  /**
   * Triggers an alert.
   */
  triggerAlert(input: {
    ruleId: string;
    summary: string;
    source: string;
    component?: string;
    group?: string;
    customDetails?: Record<string, unknown>;
    links?: AlertLink[];
  }): ActiveAlert | null {
    const rule = this.rules.get(input.ruleId);
    if (!rule) {
      log.warn(`[PD] Unknown rule: ${input.ruleId}`);
      return null;
    }

    if (!rule.enabled) {
      log.debug(`[PD] Rule disabled: ${input.ruleId}`);
      return null;
    }

    // Check maintenance windows
    if (rule.maintenanceWindows?.some(wid => {
      const w = this.maintenanceWindows.get(wid);
      return w && Date.now() >= w.startTime && Date.now() <= w.endTime;
    })) {
      log.debug(`[PD] Alert suppressed due to maintenance window`);
      this.stats.suppressedAlerts++;
      return null;
    }

    // Generate dedup key
    const dedupKey = this.generateDedupKey(input.ruleId, input.source, input.component);

    // Check if alert already active (return existing, don't suppress)
    const existing = this.activeAlerts.get(dedupKey);
    if (existing && existing.status !== 'resolved') {
      existing.lastNotificationAt = Date.now();
      existing.notificationCount++;
      return existing;
    }

    // Check deduplication for new alerts
    if (rule.suppressDuplicatesFor) {
      const lastTriggered = this.suppressedDedup.get(dedupKey);
      if (lastTriggered && Date.now() - lastTriggered < rule.suppressDuplicatesFor * 1000) {
        log.debug(`[PD] Alert deduplicated: ${dedupKey}`);
        this.stats.suppressedAlerts++;
        return null;
      }
    }

    const id = this.generateId('alert');
    const now = Date.now();

    const alert: ActiveAlert = {
      id,
      dedupKey,
      ruleId: input.ruleId,
      status: 'triggered',
      severity: rule.severity,
      summary: input.summary,
      source: input.source,
      triggeredAt: now,
      escalationLevel: 0,
      lastNotificationAt: now,
      notificationCount: 1,
    };

    this.activeAlerts.set(dedupKey, alert);
    this.suppressedDedup.set(dedupKey, now);

    // Update stats
    this.stats.totalAlerts++;
    this.stats.activeAlerts++;
    this.stats.alertsBySeverity[rule.severity]++;
    this.stats.alertsByRule[input.ruleId] = (this.stats.alertsByRule[input.ruleId] || 0) + 1;

    log.warn(`[PD] Alert triggered: ${input.summary} (${rule.severity})`);

    return alert;
  }

  /**
   * Acknowledges an alert.
   */
  acknowledgeAlert(dedupKey: string, acknowledgedBy: string): ActiveAlert | null {
    const alert = this.activeAlerts.get(dedupKey);
    if (!alert) return null;
    if (alert.status !== 'triggered') return alert;

    const now = Date.now();
    alert.status = 'acknowledged';
    alert.acknowledgedAt = now;
    alert.acknowledgedBy = acknowledgedBy;

    // Update stats
    this.stats.activeAlerts--;
    this.stats.acknowledgedAlerts++;
    this.totalAckTime += now - alert.triggeredAt;
    this.ackCount++;
    this.stats.avgAcknowledgeTimeMs = this.totalAckTime / this.ackCount;

    log.info(`[PD] Alert acknowledged: ${dedupKey} by ${acknowledgedBy}`);
    return alert;
  }

  /**
   * Resolves an alert.
   */
  resolveAlert(dedupKey: string, resolvedBy: string): ActiveAlert | null {
    const alert = this.activeAlerts.get(dedupKey);
    if (!alert) return null;
    if (alert.status === 'resolved') return alert;

    const now = Date.now();
    const wasAcked = alert.status === 'acknowledged';

    alert.status = 'resolved';
    alert.resolvedAt = now;
    alert.resolvedBy = resolvedBy;

    // Update stats
    if (wasAcked) {
      this.stats.acknowledgedAlerts--;
    } else {
      this.stats.activeAlerts--;
    }
    this.stats.resolvedAlerts++;
    this.totalResolveTime += now - alert.triggeredAt;
    this.resolveCount++;
    this.stats.avgResolveTimeMs = this.totalResolveTime / this.resolveCount;

    log.info(`[PD] Alert resolved: ${dedupKey} by ${resolvedBy}`);
    return alert;
  }

  /**
   * Escalates an alert to next level.
   */
  escalateAlert(dedupKey: string): ActiveAlert | null {
    const alert = this.activeAlerts.get(dedupKey);
    if (!alert) return null;
    if (alert.status === 'resolved') return alert;

    const rule = this.rules.get(alert.ruleId);
    const policyId = rule?.escalationPolicy || this.config.defaultEscalationPolicy;
    const policy = this.escalationPolicies.get(policyId);

    if (policy && alert.escalationLevel < policy.levels.length - 1) {
      alert.escalationLevel++;
      alert.lastNotificationAt = Date.now();
      log.warn(`[PD] Alert escalated to level ${alert.escalationLevel}: ${dedupKey}`);
    }

    return alert;
  }

  /**
   * Gets an alert by dedup key.
   */
  getAlert(dedupKey: string): ActiveAlert | null {
    return this.activeAlerts.get(dedupKey) || null;
  }

  /**
   * Lists active alerts.
   */
  listActiveAlerts(filter?: {
    status?: AlertStatus;
    severity?: AlertSeverity;
    ruleId?: string;
  }): ActiveAlert[] {
    let alerts = [...this.activeAlerts.values()];

    if (filter?.status) {
      alerts = alerts.filter(a => a.status === filter.status);
    }
    if (filter?.severity) {
      alerts = alerts.filter(a => a.severity === filter.severity);
    }
    if (filter?.ruleId) {
      alerts = alerts.filter(a => a.ruleId === filter.ruleId);
    }

    return alerts.sort((a, b) => b.triggeredAt - a.triggeredAt);
  }

  /**
   * Builds PagerDuty event payload.
   */
  buildEventPayload(alert: ActiveAlert, action: 'trigger' | 'acknowledge' | 'resolve'): AlertEvent {
    const rule = this.rules.get(alert.ruleId);

    return {
      routingKey: rule?.routingKey || this.config.routingKey,
      eventAction: action,
      dedupKey: alert.dedupKey,
      payload: {
        summary: alert.summary,
        source: alert.source,
        severity: alert.severity,
        timestamp: new Date(alert.triggeredAt).toISOString(),
        customDetails: {
          ruleId: alert.ruleId,
          escalationLevel: alert.escalationLevel,
          notificationCount: alert.notificationCount,
        },
      },
      links: rule?.runbookUrl ? [{ href: rule.runbookUrl, text: 'Runbook' }] : undefined,
    };
  }

  /**
   * Gets runbook URL for alert rule.
   */
  getRunbookUrl(ruleId: string): string | null {
    const rule = this.rules.get(ruleId);
    return rule?.runbookUrl || null;
  }

  /**
   * Gets RACI for alert rule.
   */
  getRaci(ruleId: string): RACIAssignment | null {
    const rule = this.rules.get(ruleId);
    return rule?.raci || null;
  }

  /**
   * Gets statistics.
   */
  getStats(): AlertStats {
    return { ...this.stats };
  }

  /**
   * Registers standard PRISM alert rules.
   */
  registerStandardRules(): void {
    this.registerRule({
      id: 'lora-autorollback',
      name: 'LoRA Auto-Rollback Fired',
      description: 'LoRA model rolled back due to quality degradation',
      condition: { metric: 'lora_rollback_total', operator: 'gt', threshold: 0 },
      severity: 'error',
      routingKey: this.config.routingKey,
      runbookUrl: 'https://runbooks.prism.internal/lora-rollback',
      raci: {
        responsible: ['ml-engineer'],
        accountable: 'ml-lead',
        consulted: ['sre-team'],
        informed: ['product-owner'],
      },
      tags: ['ml', 'lora', 'quality'],
      enabled: true,
    });

    this.registerRule({
      id: 'tenant-isolation-breach',
      name: 'Tenant Isolation Breach Detected',
      description: 'Cross-tenant data access attempt detected',
      condition: { metric: 'tenant_breach_total', operator: 'gt', threshold: 0 },
      severity: 'critical',
      routingKey: this.config.routingKey,
      runbookUrl: 'https://runbooks.prism.internal/tenant-breach',
      raci: {
        responsible: ['security-team', 'sre-oncall'],
        accountable: 'ciso',
        consulted: ['legal'],
        informed: ['cto', 'affected-tenant'],
      },
      tags: ['security', 'tenant', 'critical'],
      enabled: true,
    });

    this.registerRule({
      id: 'sim-false-negative',
      name: 'Simulation False Negative',
      description: 'Simulation passed but machine crashed',
      condition: { metric: 'sim_false_negative_total', operator: 'gt', threshold: 0 },
      severity: 'critical',
      routingKey: this.config.routingKey,
      runbookUrl: 'https://runbooks.prism.internal/sim-false-negative',
      raci: {
        responsible: ['simulation-team', 'safety-engineer'],
        accountable: 'vp-engineering',
        consulted: ['ml-team', 'physics-team'],
        informed: ['ceo', 'affected-shop'],
      },
      tags: ['safety', 'simulation', 'critical'],
      enabled: true,
    });

    this.registerRule({
      id: 'mtconnect-stream-loss',
      name: 'MTConnect Stream Loss Mid-Cut',
      description: 'Lost MTConnect data stream during active machining',
      condition: { metric: 'mtconnect_stream_lost', operator: 'eq', threshold: 1 },
      severity: 'critical',
      routingKey: this.config.routingKey,
      runbookUrl: 'https://runbooks.prism.internal/mtconnect-loss',
      raci: {
        responsible: ['sre-oncall', 'shop-manager'],
        accountable: 'operations-lead',
        consulted: ['machine-vendor'],
        informed: ['operator'],
      },
      tags: ['mtconnect', 'connectivity', 'safety'],
      enabled: true,
    });

    this.registerRule({
      id: 'program-gen-slo-breach',
      name: 'Program Generation SLO Breach',
      description: 'p95 program generation latency exceeded 30s',
      condition: { metric: 'program_gen_p95_seconds', operator: 'gt', threshold: 30 },
      severity: 'warning',
      routingKey: this.config.routingKey,
      runbookUrl: 'https://runbooks.prism.internal/program-gen-slo',
      raci: {
        responsible: ['sre-team'],
        accountable: 'sre-lead',
        consulted: ['backend-team'],
        informed: ['product-owner'],
      },
      tags: ['slo', 'performance', 'latency'],
      enabled: true,
      suppressDuplicatesFor: 300,
    });

    this.registerRule({
      id: 'safety-score-critical',
      name: 'Safety Score Below Threshold',
      description: 'Safety score S(x) dropped below 0.70',
      condition: { metric: 'safety_score', operator: 'lt', threshold: 0.70 },
      severity: 'critical',
      routingKey: this.config.routingKey,
      runbookUrl: 'https://runbooks.prism.internal/safety-score',
      raci: {
        responsible: ['safety-engineer', 'operator'],
        accountable: 'safety-lead',
        consulted: ['physics-team'],
        informed: ['shop-manager'],
      },
      tags: ['safety', 'critical'],
      enabled: true,
    });

    log.info('[PD] Standard PRISM alert rules registered');
  }

  /**
   * Clears all data (for testing).
   */
  clear(): void {
    this.rules.clear();
    this.activeAlerts.clear();
    this.escalationPolicies.clear();
    this.onCallSchedules.clear();
    this.maintenanceWindows.clear();
    this.suppressedDedup.clear();
    this.stats = {
      totalAlerts: 0,
      activeAlerts: 0,
      acknowledgedAlerts: 0,
      resolvedAlerts: 0,
      alertsBySeverity: { critical: 0, error: 0, warning: 0, info: 0 },
      alertsByRule: {},
      avgAcknowledgeTimeMs: 0,
      avgResolveTimeMs: 0,
      suppressedAlerts: 0,
    };
    this.totalAckTime = 0;
    this.totalResolveTime = 0;
    this.ackCount = 0;
    this.resolveCount = 0;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateDedupKey(ruleId: string, source: string, component?: string): string {
    const parts = [ruleId, source];
    if (component) parts.push(component);
    return crypto.createHash('sha256').update(parts.join(':')).digest('hex').substring(0, 32);
  }
}

export const pagerDutyAlertsEngine = new PagerDutyAlertsEngine();
