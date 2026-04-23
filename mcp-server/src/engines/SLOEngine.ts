/**
 * SLOEngine — U-LPR-OBS5
 *
 * SLO/SLI formalization for production observability:
 * - Availability SLO (≥99.5% monthly)
 * - Latency SLO (p95 program-gen <30s)
 * - Error budget tracking (0.5%/mo)
 * - Burn rate alerting (2%/hr fast-burn, 10%/6hr slow-burn)
 * - SLO compliance reporting
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OBS5
 * @phase PHASE-10 (Observability + SLO)
 */

import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export type SLOType = 'availability' | 'latency' | 'error_rate' | 'throughput';
export type SLOStatusType = 'healthy' | 'at_risk' | 'breached';

export interface SLODefinition {
  id: string;
  name: string;
  description: string;
  type: SLOType;
  target: number;                 // e.g., 0.995 for 99.5%
  windowDays: number;             // rolling window (e.g., 30)
  errorBudgetFraction: number;    // 1 - target (e.g., 0.005)
  burnRates: BurnRateConfig[];
  enabled: boolean;
}

export interface BurnRateConfig {
  name: string;
  multiplier: number;      // e.g., 14.4 for 2%/hr fast-burn
  windowMinutes: number;   // e.g., 60 for 1hr window
  alertSeverity: 'critical' | 'warning';
}

export interface SLOStatus {
  sloId: string;
  status: 'healthy' | 'at_risk' | 'breached';
  currentValue: number;
  target: number;
  errorBudgetRemaining: number;
  errorBudgetConsumed: number;
  burnRateStatus: BurnRateStatus[];
  lastUpdated: number;
}

export interface BurnRateStatus {
  name: string;
  currentRate: number;
  threshold: number;
  alerting: boolean;
}

export interface SLOEvent {
  sloId: string;
  timestamp: number;
  success: boolean;
  value?: number;          // for latency SLOs
  labels?: Record<string, string>;
}

export interface SLOReport {
  sloId: string;
  periodStart: number;
  periodEnd: number;
  totalEvents: number;
  goodEvents: number;
  badEvents: number;
  sli: number;             // actual SLI value
  target: number;          // SLO target
  compliance: boolean;     // sli >= target
  errorBudgetUsed: number;
  errorBudgetRemaining: number;
}

export interface ErrorBudget {
  totalBudget: number;     // absolute count or fraction
  consumed: number;
  remaining: number;
  percentUsed: number;
  projectedExhaustion?: number;  // timestamp
}

export interface SLOStats {
  totalSLOs: number;
  healthySLOs: number;
  atRiskSLOs: number;
  breachedSLOs: number;
  totalEvents: number;
  overallCompliance: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SLOEngine {
  private definitions: Map<string, SLODefinition> = new Map();
  private events: Map<string, SLOEvent[]> = new Map();
  private statusCache: Map<string, SLOStatus> = new Map();

  // Standard burn rate configs
  private readonly FAST_BURN: BurnRateConfig = {
    name: 'fast-burn',
    multiplier: 14.4,   // 2% of monthly budget in 1hr
    windowMinutes: 60,
    alertSeverity: 'critical',
  };

  private readonly SLOW_BURN: BurnRateConfig = {
    name: 'slow-burn',
    multiplier: 6,      // 10% of monthly budget in 6hr
    windowMinutes: 360,
    alertSeverity: 'warning',
  };

  /**
   * Registers an SLO definition.
   */
  registerSLO(def: SLODefinition): boolean {
    if (this.definitions.has(def.id)) {
      log.warn(`[SLO] Already registered: ${def.id}`);
      return false;
    }

    this.definitions.set(def.id, {
      ...def,
      errorBudgetFraction: 1 - def.target,
      burnRates: def.burnRates.length > 0 ? def.burnRates : [this.FAST_BURN, this.SLOW_BURN],
    });
    this.events.set(def.id, []);

    log.info(`[SLO] Registered: ${def.name} (target=${def.target})`);
    return true;
  }

  /**
   * Gets SLO definition.
   */
  getSLO(id: string): SLODefinition | null {
    return this.definitions.get(id) || null;
  }

  /**
   * Lists all SLOs.
   */
  listSLOs(): SLODefinition[] {
    return [...this.definitions.values()];
  }

  /**
   * Records an SLO event (success/failure).
   */
  recordEvent(event: SLOEvent): boolean {
    const events = this.events.get(event.sloId);
    if (!events) {
      log.warn(`[SLO] Unknown SLO: ${event.sloId}`);
      return false;
    }

    events.push(event);

    // Prune old events beyond window
    const def = this.definitions.get(event.sloId)!;
    const cutoff = Date.now() - def.windowDays * 24 * 60 * 60 * 1000;
    const pruned = events.filter(e => e.timestamp >= cutoff);
    this.events.set(event.sloId, pruned);

    // Invalidate status cache
    this.statusCache.delete(event.sloId);

    return true;
  }

  /**
   * Records a latency observation.
   */
  recordLatency(sloId: string, latencyMs: number, labels?: Record<string, string>): boolean {
    const def = this.definitions.get(sloId);
    if (!def || def.type !== 'latency') {
      return false;
    }

    // For latency SLOs, success = latency <= target (in ms)
    const success = latencyMs <= def.target;

    return this.recordEvent({
      sloId,
      timestamp: Date.now(),
      success,
      value: latencyMs,
      labels,
    });
  }

  /**
   * Gets current SLO status.
   */
  getStatus(sloId: string): SLOStatus | null {
    const def = this.definitions.get(sloId);
    const events = this.events.get(sloId);
    if (!def || !events) return null;

    // Check cache
    const cached = this.statusCache.get(sloId);
    if (cached && Date.now() - cached.lastUpdated < 60000) {
      return cached;
    }

    // Calculate SLI
    const goodEvents = events.filter(e => e.success).length;
    const totalEvents = events.length;
    const sli = totalEvents > 0 ? goodEvents / totalEvents : 1;

    // Calculate error budget
    const errorBudgetTotal = def.errorBudgetFraction * totalEvents;
    const badEvents = totalEvents - goodEvents;
    const errorBudgetConsumed = badEvents / (errorBudgetTotal || 1);
    const errorBudgetRemaining = Math.max(0, 1 - errorBudgetConsumed);

    // Calculate burn rates
    const burnRateStatus = def.burnRates.map(br => {
      const windowMs = br.windowMinutes * 60 * 1000;
      const windowStart = Date.now() - windowMs;
      const windowEvents = events.filter(e => e.timestamp >= windowStart);
      const windowBad = windowEvents.filter(e => !e.success).length;
      const windowTotal = windowEvents.length;

      // Burn rate = (bad in window / total in window) / (error budget fraction)
      const currentRate = windowTotal > 0
        ? (windowBad / windowTotal) / def.errorBudgetFraction
        : 0;

      return {
        name: br.name,
        currentRate,
        threshold: br.multiplier,
        alerting: currentRate >= br.multiplier,
      };
    });

    // Determine status
    let status: 'healthy' | 'at_risk' | 'breached';
    if (sli >= def.target && errorBudgetRemaining > 0.2) {
      status = 'healthy';
    } else if (sli >= def.target) {
      status = 'at_risk';
    } else {
      status = 'breached';
    }

    const result: SLOStatus = {
      sloId,
      status,
      currentValue: sli,
      target: def.target,
      errorBudgetRemaining,
      errorBudgetConsumed: 1 - errorBudgetRemaining,
      burnRateStatus,
      lastUpdated: Date.now(),
    };

    this.statusCache.set(sloId, result);
    return result;
  }

  /**
   * Gets error budget for SLO.
   */
  getErrorBudget(sloId: string): ErrorBudget | null {
    const def = this.definitions.get(sloId);
    const events = this.events.get(sloId);
    if (!def || !events) return null;

    const totalEvents = events.length;
    const badEvents = events.filter(e => !e.success).length;
    const totalBudget = def.errorBudgetFraction * totalEvents;
    const consumed = badEvents;
    const remaining = Math.max(0, totalBudget - consumed);
    const percentUsed = totalBudget > 0 ? (consumed / totalBudget) * 100 : 0;

    // Project exhaustion based on current burn rate
    let projectedExhaustion: number | undefined;
    if (remaining > 0 && badEvents > 0) {
      const windowMs = def.windowDays * 24 * 60 * 60 * 1000;
      const eventsPerMs = totalEvents / windowMs;
      const badRate = badEvents / totalEvents;
      const remainingMs = remaining / (eventsPerMs * badRate);
      projectedExhaustion = Date.now() + remainingMs;
    }

    return {
      totalBudget,
      consumed,
      remaining,
      percentUsed,
      projectedExhaustion,
    };
  }

  /**
   * Generates compliance report.
   */
  generateReport(sloId: string, startTime?: number, endTime?: number): SLOReport | null {
    const def = this.definitions.get(sloId);
    const allEvents = this.events.get(sloId);
    if (!def || !allEvents) return null;

    const now = Date.now();
    const periodEnd = endTime || now;
    const periodStart = startTime || (periodEnd - def.windowDays * 24 * 60 * 60 * 1000);

    const events = allEvents.filter(e => e.timestamp >= periodStart && e.timestamp <= periodEnd);
    const goodEvents = events.filter(e => e.success).length;
    const badEvents = events.length - goodEvents;
    const sli = events.length > 0 ? goodEvents / events.length : 1;

    const errorBudgetTotal = def.errorBudgetFraction * events.length;
    const errorBudgetUsed = badEvents / (errorBudgetTotal || 1);

    return {
      sloId,
      periodStart,
      periodEnd,
      totalEvents: events.length,
      goodEvents,
      badEvents,
      sli,
      target: def.target,
      compliance: sli >= def.target,
      errorBudgetUsed,
      errorBudgetRemaining: Math.max(0, 1 - errorBudgetUsed),
    };
  }

  /**
   * Checks if any burn rate is alerting.
   */
  isAlerting(sloId: string): boolean {
    const status = this.getStatus(sloId);
    if (!status) return false;
    return status.burnRateStatus.some(br => br.alerting);
  }

  /**
   * Gets all alerting SLOs.
   */
  getAlertingSLOs(): SLOStatus[] {
    const alerting: SLOStatus[] = [];
    for (const id of this.definitions.keys()) {
      const status = this.getStatus(id);
      if (status && this.isAlerting(id)) {
        alerting.push(status);
      }
    }
    return alerting;
  }

  /**
   * Gets statistics.
   */
  getStats(): SLOStats {
    let healthy = 0, atRisk = 0, breached = 0, totalEvents = 0;

    for (const id of this.definitions.keys()) {
      const status = this.getStatus(id);
      if (!status) continue;

      if (status.status === 'healthy') healthy++;
      else if (status.status === 'at_risk') atRisk++;
      else breached++;

      totalEvents += this.events.get(id)?.length || 0;
    }

    const total = this.definitions.size;
    const overallCompliance = total > 0 ? healthy / total : 1;

    return {
      totalSLOs: total,
      healthySLOs: healthy,
      atRiskSLOs: atRisk,
      breachedSLOs: breached,
      totalEvents,
      overallCompliance,
    };
  }

  /**
   * Registers standard PRISM SLOs.
   */
  registerStandardSLOs(): void {
    this.registerSLO({
      id: 'availability',
      name: 'API Availability',
      description: 'Overall API availability target',
      type: 'availability',
      target: 0.995,  // 99.5%
      windowDays: 30,
      errorBudgetFraction: 0.005,
      burnRates: [this.FAST_BURN, this.SLOW_BURN],
      enabled: true,
    });

    this.registerSLO({
      id: 'program-gen-latency',
      name: 'Program Generation Latency',
      description: 'p95 program generation under 30 seconds',
      type: 'latency',
      target: 30000,  // 30s in ms
      windowDays: 7,
      errorBudgetFraction: 0.05,  // 5% can exceed
      burnRates: [this.FAST_BURN, this.SLOW_BURN],
      enabled: true,
    });

    this.registerSLO({
      id: 'error-rate',
      name: 'Error Rate',
      description: 'Less than 0.1% error rate',
      type: 'error_rate',
      target: 0.999,  // 99.9% success
      windowDays: 7,
      errorBudgetFraction: 0.001,
      burnRates: [this.FAST_BURN, this.SLOW_BURN],
      enabled: true,
    });

    log.info('[SLO] Standard PRISM SLOs registered');
  }

  /**
   * Clears all data (for testing).
   */
  clear(): void {
    this.definitions.clear();
    this.events.clear();
    this.statusCache.clear();
  }
}

export const sloEngine = new SLOEngine();
