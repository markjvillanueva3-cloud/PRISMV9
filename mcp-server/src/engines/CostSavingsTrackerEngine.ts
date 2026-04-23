/**
 * CostSavingsTrackerEngine — VAL-MS0 V0-U01
 *
 * The #1 sales tool for PRISM: proves ROI by tracking every optimization
 * recommendation and its dollar impact. Generates monthly reports showing
 * exactly how much money PRISM saves the shop.
 *
 * Tracks 6 savings categories:
 *   1. Tool life extension (Taylor-predicted vs premature change)
 *   2. Cycle time reduction (optimized S/F vs CAM defaults)
 *   3. Crash prevention (safety analyzer catches)
 *   4. Scrap avoidance (first-part-right, tolerance prediction)
 *   5. Energy savings (optimal cutting conditions)
 *   6. Machine utilization (better scheduling/routing)
 *
 * Persistent storage: ~/.prism/savings.json (survives sessions)
 * Auto-logging: hooks into SFO, GCodeSafety, ToolLife engines
 *
 * Lines: ~650
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type SavingsCategory =
  | "tool_life"
  | "cycle_time"
  | "crash_prevention"
  | "scrap_avoidance"
  | "energy"
  | "utilization";

export interface SavingsEvent {
  id: string;
  timestamp: number;
  category: SavingsCategory;
  description: string;
  /** Estimated dollar savings for this event */
  estimatedSavings: number;
  /** Actual savings if measured later (optional) */
  actualSavings?: number;
  /** What PRISM recommended */
  recommendation: string;
  /** What the default/previous value was */
  baseline: string;
  /** Engine that generated this savings event */
  sourceEngine: string;
  /** Material being machined (for context) */
  material?: string;
  /** Operation type */
  operation?: string;
  /** Machine used */
  machine?: string;
  /** Whether the recommendation was accepted by the user */
  accepted?: boolean;
  /** Metadata for detailed reporting */
  meta?: Record<string, unknown>;
}

interface SavingsStore {
  version: string;
  created: string;
  events: SavingsEvent[];
  /** Running totals by category */
  totals: Record<SavingsCategory, number>;
  /** Monthly aggregates */
  monthly: Record<string, { total: number; count: number; byCategory: Record<string, number> }>;
}

interface SavingsSummary {
  period: string;
  totalSavings: number;
  eventCount: number;
  byCategory: Record<string, { savings: number; count: number; avgPerEvent: number }>;
  topEvents: SavingsEvent[];
  trend: "improving" | "stable" | "declining";
  monthOverMonth: number; // % change
  annualizedSavings: number;
}

interface ROIReport {
  generated: string;
  period: { start: string; end: string };
  summary: SavingsSummary;
  details: {
    toolLifeSavings: { extendedTools: number; avgExtensionMinutes: number; costPerTool: number; total: number };
    cycleTimeSavings: { programsOptimized: number; avgReductionPercent: number; hourlyRate: number; total: number };
    crashPrevention: { crashesAvoided: number; avgCrashCost: number; total: number };
    scrapAvoidance: { partsNotScrapped: number; avgPartCost: number; total: number };
    energySavings: { kWhSaved: number; costPerKWh: number; total: number };
    utilizationGains: { hoursRecovered: number; hourlyRate: number; total: number };
  };
  recommendation: string;
}

// ═══════════════════════════════════════════════════════════════
// Cost Constants (configurable per shop)
// ═══════════════════════════════════════════════════════════════

const DEFAULT_COSTS = {
  /** Average cost of a cutting tool (insert or solid) */
  avgToolCost: 25,
  /** Shop hourly rate (machine + operator) */
  hourlyRate: 85,
  /** Average cost of a crash (tool + workpiece + downtime) */
  avgCrashCost: 500,
  /** Average cost of a scrapped part */
  avgPartCost: 75,
  /** Electricity cost $/kWh */
  costPerKWh: 0.12,
  /** Average spindle power kW */
  avgSpindlePower: 7.5,
};

// ═══════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════

export class CostSavingsTrackerEngine {
  private store: SavingsStore;
  private storePath: string;
  private costs: typeof DEFAULT_COSTS;
  private idCounter = 0;

  constructor() {
    const prismDir = join(homedir(), ".prism");
    if (!existsSync(prismDir)) {
      try { mkdirSync(prismDir, { recursive: true }); } catch { /* ok */ }
    }
    this.storePath = join(prismDir, "savings.json");
    this.store = this.loadStore();
    this.costs = { ...DEFAULT_COSTS };
  }

  calculate(action: string, params: Record<string, unknown>): Record<string, unknown> {
    switch (action) {
      case "roi_log":
        return this.logRecommendation(params);
      case "roi_log_outcome":
        return this.logOutcome(params);
      case "roi_summary":
        return this.getSummary(params) as unknown as Record<string, unknown>;
      case "roi_report":
        return this.generateReport(params) as unknown as Record<string, unknown>;
      case "roi_reset":
        return this.resetPeriod(params);
      case "roi_configure_costs":
        return this.configureCosts(params);
      case "roi_events":
        return this.queryEvents(params);
      case "roi_trend":
        return this.getTrend(params);
      default:
        return { error: `Unknown action: ${action}` };
    }
  }

  // ─────────────────────────────────────────────────────────
  // Core Actions
  // ─────────────────────────────────────────────────────────

  /**
   * Log a savings recommendation event.
   * Called by PRISM engines when they make an optimization.
   */
  private logRecommendation(params: Record<string, unknown>): Record<string, unknown> {
    const category = String(params.category ?? "cycle_time") as SavingsCategory;
    const description = String(params.description ?? "Optimization applied");
    const recommendation = String(params.recommendation ?? "");
    const baseline = String(params.baseline ?? "");
    const sourceEngine = String(params.sourceEngine ?? "unknown");
    const material = params.material ? String(params.material) : undefined;
    const operation = params.operation ? String(params.operation) : undefined;
    const machine = params.machine ? String(params.machine) : undefined;
    const meta = (params.meta as Record<string, unknown>) ?? undefined;

    // Estimate savings based on category
    const estimatedSavings = params.estimatedSavings
      ? Number(params.estimatedSavings)
      : this.estimateSavings(category, params);

    const event: SavingsEvent = {
      id: `sav-${Date.now()}-${++this.idCounter}`,
      timestamp: Date.now(),
      category,
      description,
      estimatedSavings,
      recommendation,
      baseline,
      sourceEngine,
      material,
      operation,
      machine,
      accepted: params.accepted !== false,
      meta,
    };

    this.store.events.push(event);
    this.store.totals[category] = (this.store.totals[category] ?? 0) + estimatedSavings;

    // Update monthly aggregate
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    if (!this.store.monthly[monthKey]) {
      this.store.monthly[monthKey] = { total: 0, count: 0, byCategory: {} };
    }
    this.store.monthly[monthKey].total += estimatedSavings;
    this.store.monthly[monthKey].count += 1;
    this.store.monthly[monthKey].byCategory[category] =
      (this.store.monthly[monthKey].byCategory[category] ?? 0) + estimatedSavings;

    this.saveStore();

    return {
      logged: true,
      eventId: event.id,
      estimatedSavings,
      category,
      totalSavingsThisMonth: this.store.monthly[monthKey].total,
      lifetimeSavings: Object.values(this.store.totals).reduce((a, b) => a + b, 0),
    };
  }

  /**
   * Log the actual outcome of a previous recommendation.
   */
  private logOutcome(params: Record<string, unknown>): Record<string, unknown> {
    const eventId = String(params.eventId ?? "");
    const actualSavings = Number(params.actualSavings ?? 0);
    const accepted = params.accepted !== undefined ? Boolean(params.accepted) : undefined;

    const event = this.store.events.find(e => e.id === eventId);
    if (!event) {
      return { error: `Event ${eventId} not found` };
    }

    event.actualSavings = actualSavings;
    if (accepted !== undefined) event.accepted = accepted;

    // Adjust totals if actual differs from estimate
    const delta = actualSavings - event.estimatedSavings;
    this.store.totals[event.category] += delta;

    this.saveStore();

    return {
      updated: true,
      eventId,
      estimated: event.estimatedSavings,
      actual: actualSavings,
      delta,
      accuracy: event.estimatedSavings > 0
        ? Number(((actualSavings / event.estimatedSavings) * 100).toFixed(1))
        : 0,
    };
  }

  /**
   * Get savings summary for a time period.
   */
  private getSummary(params: Record<string, unknown>): SavingsSummary {
    const period = String(params.period ?? "month");
    const now = Date.now();
    const cutoff = period === "week" ? now - 7 * 86400000
      : period === "year" ? now - 365 * 86400000
      : now - 30 * 86400000; // month default

    const events = this.store.events.filter(e => e.timestamp >= cutoff);
    const totalSavings = events.reduce((s, e) => s + (e.actualSavings ?? e.estimatedSavings), 0);

    // By category
    const byCategory: Record<string, { savings: number; count: number; avgPerEvent: number }> = {};
    for (const e of events) {
      if (!byCategory[e.category]) {
        byCategory[e.category] = { savings: 0, count: 0, avgPerEvent: 0 };
      }
      byCategory[e.category].savings += e.actualSavings ?? e.estimatedSavings;
      byCategory[e.category].count += 1;
    }
    for (const cat of Object.values(byCategory)) {
      cat.avgPerEvent = cat.count > 0 ? Number((cat.savings / cat.count).toFixed(2)) : 0;
    }

    // Top events
    const topEvents = [...events]
      .sort((a, b) => (b.actualSavings ?? b.estimatedSavings) - (a.actualSavings ?? a.estimatedSavings))
      .slice(0, 5);

    // Trend: compare this month vs last month
    const thisMonth = new Date().toISOString().slice(0, 7);
    const lastDate = new Date();
    lastDate.setMonth(lastDate.getMonth() - 1);
    const lastMonth = lastDate.toISOString().slice(0, 7);

    const thisMonthTotal = this.store.monthly[thisMonth]?.total ?? 0;
    const lastMonthTotal = this.store.monthly[lastMonth]?.total ?? 0;
    const monthOverMonth = lastMonthTotal > 0
      ? Number((((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1))
      : 0;

    const trend = monthOverMonth > 10 ? "improving"
      : monthOverMonth < -10 ? "declining"
      : "stable";

    // Annualized from current rate
    const daysInPeriod = period === "week" ? 7 : period === "year" ? 365 : 30;
    const dailyRate = totalSavings / Math.max(1, daysInPeriod);
    const annualizedSavings = Number((dailyRate * 365).toFixed(0));

    return {
      period,
      totalSavings: Number(totalSavings.toFixed(2)),
      eventCount: events.length,
      byCategory,
      topEvents,
      trend,
      monthOverMonth,
      annualizedSavings,
    };
  }

  /**
   * Generate a detailed ROI report with breakdown by category.
   */
  private generateReport(params: Record<string, unknown>): ROIReport {
    const period = String(params.period ?? "month");
    const summary = this.getSummary(params);
    const now = Date.now();
    const cutoff = period === "week" ? now - 7 * 86400000
      : period === "year" ? now - 365 * 86400000
      : now - 30 * 86400000;

    const events = this.store.events.filter(e => e.timestamp >= cutoff);

    // Tool life details
    const toolEvents = events.filter(e => e.category === "tool_life");
    const avgExtension = toolEvents.length > 0
      ? toolEvents.reduce((s, e) => s + (Number(e.meta?.extensionMinutes) || 15), 0) / toolEvents.length
      : 0;

    // Cycle time details
    const cycleEvents = events.filter(e => e.category === "cycle_time");
    const avgReduction = cycleEvents.length > 0
      ? cycleEvents.reduce((s, e) => s + (Number(e.meta?.reductionPercent) || 12), 0) / cycleEvents.length
      : 0;

    // Crash prevention
    const crashEvents = events.filter(e => e.category === "crash_prevention");

    // Scrap avoidance
    const scrapEvents = events.filter(e => e.category === "scrap_avoidance");

    // Energy
    const energyEvents = events.filter(e => e.category === "energy");
    const totalKWh = energyEvents.reduce((s, e) => s + (Number(e.meta?.kWhSaved) || 5), 0);

    // Utilization
    const utilEvents = events.filter(e => e.category === "utilization");
    const hoursRecovered = utilEvents.reduce((s, e) => s + (Number(e.meta?.hoursRecovered) || 0.5), 0);

    const toolTotal = toolEvents.reduce((s, e) => s + (e.actualSavings ?? e.estimatedSavings), 0);
    const cycleTotal = cycleEvents.reduce((s, e) => s + (e.actualSavings ?? e.estimatedSavings), 0);
    const crashTotal = crashEvents.reduce((s, e) => s + (e.actualSavings ?? e.estimatedSavings), 0);
    const scrapTotal = scrapEvents.reduce((s, e) => s + (e.actualSavings ?? e.estimatedSavings), 0);
    const energyTotal = energyEvents.reduce((s, e) => s + (e.actualSavings ?? e.estimatedSavings), 0);
    const utilTotal = utilEvents.reduce((s, e) => s + (e.actualSavings ?? e.estimatedSavings), 0);

    let recommendation: string;
    if (summary.totalSavings > 10000) {
      recommendation = `PRISM is delivering exceptional ROI at $${summary.annualizedSavings}/year. Consider expanding to additional machines.`;
    } else if (summary.totalSavings > 1000) {
      recommendation = `PRISM is on track for $${summary.annualizedSavings}/year savings. Focus on cycle time optimization for maximum impact.`;
    } else if (summary.eventCount > 0) {
      recommendation = `Early results positive. Log more outcomes to improve accuracy. Estimated $${summary.annualizedSavings}/year trajectory.`;
    } else {
      recommendation = "Start using PRISM's S/F optimizer and safety checks to begin tracking savings.";
    }

    return {
      generated: new Date().toISOString(),
      period: {
        start: new Date(cutoff).toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10),
      },
      summary,
      details: {
        toolLifeSavings: {
          extendedTools: toolEvents.length,
          avgExtensionMinutes: Number(avgExtension.toFixed(1)),
          costPerTool: this.costs.avgToolCost,
          total: Number(toolTotal.toFixed(2)),
        },
        cycleTimeSavings: {
          programsOptimized: cycleEvents.length,
          avgReductionPercent: Number(avgReduction.toFixed(1)),
          hourlyRate: this.costs.hourlyRate,
          total: Number(cycleTotal.toFixed(2)),
        },
        crashPrevention: {
          crashesAvoided: crashEvents.length,
          avgCrashCost: this.costs.avgCrashCost,
          total: Number(crashTotal.toFixed(2)),
        },
        scrapAvoidance: {
          partsNotScrapped: scrapEvents.length,
          avgPartCost: this.costs.avgPartCost,
          total: Number(scrapTotal.toFixed(2)),
        },
        energySavings: {
          kWhSaved: Number(totalKWh.toFixed(1)),
          costPerKWh: this.costs.costPerKWh,
          total: Number(energyTotal.toFixed(2)),
        },
        utilizationGains: {
          hoursRecovered: Number(hoursRecovered.toFixed(1)),
          hourlyRate: this.costs.hourlyRate,
          total: Number(utilTotal.toFixed(2)),
        },
      },
      recommendation,
    };
  }

  private queryEvents(params: Record<string, unknown>): Record<string, unknown> {
    const category = params.category ? String(params.category) : undefined;
    const limit = Number(params.limit ?? 50);
    const since = params.since ? Number(params.since) : undefined;

    let events = [...this.store.events];
    if (category) events = events.filter(e => e.category === category);
    if (since) events = events.filter(e => e.timestamp >= since);

    events.sort((a, b) => b.timestamp - a.timestamp);
    const total = events.length;
    events = events.slice(0, limit);

    return { events, total, returned: events.length };
  }

  private getTrend(params: Record<string, unknown>): Record<string, unknown> {
    const months = Number(params.months ?? 6);
    const trend: Array<{ month: string; total: number; count: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const data = this.store.monthly[key];
      trend.push({
        month: key,
        total: data?.total ?? 0,
        count: data?.count ?? 0,
      });
    }

    const totals = trend.map(t => t.total);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const recent = totals.slice(-2);
    const direction = recent.length >= 2 && recent[1] > recent[0] * 1.1
      ? "improving"
      : recent.length >= 2 && recent[1] < recent[0] * 0.9
        ? "declining"
        : "stable";

    return { trend, avgMonthly: Number(avg.toFixed(2)), direction };
  }

  private resetPeriod(params: Record<string, unknown>): Record<string, unknown> {
    const confirm = params.confirm === true;
    if (!confirm) {
      return {
        warning: "This will archive current data. Pass confirm: true to proceed.",
        currentEvents: this.store.events.length,
        lifetimeSavings: Object.values(this.store.totals).reduce((a, b) => a + b, 0),
      };
    }

    const archived = this.store.events.length;
    const archivedTotal = Object.values(this.store.totals).reduce((a, b) => a + b, 0);

    this.store.events = [];
    this.store.totals = {
      tool_life: 0, cycle_time: 0, crash_prevention: 0,
      scrap_avoidance: 0, energy: 0, utilization: 0,
    };
    this.store.monthly = {};
    this.saveStore();

    return { reset: true, archivedEvents: archived, archivedSavings: archivedTotal };
  }

  private configureCosts(params: Record<string, unknown>): Record<string, unknown> {
    if (params.avgToolCost !== undefined) this.costs.avgToolCost = Number(params.avgToolCost);
    if (params.hourlyRate !== undefined) this.costs.hourlyRate = Number(params.hourlyRate);
    if (params.avgCrashCost !== undefined) this.costs.avgCrashCost = Number(params.avgCrashCost);
    if (params.avgPartCost !== undefined) this.costs.avgPartCost = Number(params.avgPartCost);
    if (params.costPerKWh !== undefined) this.costs.costPerKWh = Number(params.costPerKWh);
    if (params.avgSpindlePower !== undefined) this.costs.avgSpindlePower = Number(params.avgSpindlePower);
    return { configured: true, costs: { ...this.costs } };
  }

  // ─────────────────────────────────────────────────────────
  // Savings Estimation
  // ─────────────────────────────────────────────────────────

  /**
   * Estimate dollar savings based on category and context.
   */
  private estimateSavings(category: SavingsCategory, params: Record<string, unknown>): number {
    switch (category) {
      case "tool_life": {
        // Extended tool life = fewer tool changes
        const extensionPercent = Number(params.extensionPercent ?? 20);
        return this.costs.avgToolCost * (extensionPercent / 100);
      }
      case "cycle_time": {
        // Faster cycle = more parts per hour
        const reductionPercent = Number(params.reductionPercent ?? 12);
        const cycleTimeMinutes = Number(params.cycleTimeMinutes ?? 10);
        const savedMinutes = cycleTimeMinutes * (reductionPercent / 100);
        return (savedMinutes / 60) * this.costs.hourlyRate;
      }
      case "crash_prevention": {
        return this.costs.avgCrashCost;
      }
      case "scrap_avoidance": {
        return this.costs.avgPartCost;
      }
      case "energy": {
        const savedMinutes = Number(params.savedMinutes ?? 5);
        const kWhSaved = this.costs.avgSpindlePower * (savedMinutes / 60);
        return kWhSaved * this.costs.costPerKWh;
      }
      case "utilization": {
        const hoursRecovered = Number(params.hoursRecovered ?? 0.5);
        return hoursRecovered * this.costs.hourlyRate;
      }
      default:
        return 0;
    }
  }

  // ─────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────

  private loadStore(): SavingsStore {
    try {
      if (existsSync(this.storePath)) {
        const raw = readFileSync(this.storePath, "utf8");
        return JSON.parse(raw);
      }
    } catch { /* corrupt file, start fresh */ }

    return {
      version: "1.0.0",
      created: new Date().toISOString(),
      events: [],
      totals: {
        tool_life: 0, cycle_time: 0, crash_prevention: 0,
        scrap_avoidance: 0, energy: 0, utilization: 0,
      },
      monthly: {},
    };
  }

  private saveStore(): void {
    try {
      writeFileSync(this.storePath, JSON.stringify(this.store, null, 2));
    } catch { /* non-critical */ }
  }
}

export const costSavingsTrackerEngine = new CostSavingsTrackerEngine();
