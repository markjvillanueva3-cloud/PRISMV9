/**
 * HandbookMaintenanceIntelligenceEngine — HBK-MS5
 * =================================================
 * Extracts maintenance intelligence from handbook data: PM schedules,
 * parts BOM, consumable tracking, and annual cost estimation.
 *
 * Data flows from MachineHandbookRegistryEngine (maintenance_schedule + parts_book)
 * through this engine to produce actionable maintenance cost models that feed into
 * QuoteToShipOrchestratorEngine and CapacityPlanningEngine (HBK-MS8).
 *
 * References:
 * - MachineHandbookRegistryEngine (HandbookMaintenanceTask, HandbookPartsEntry schemas)
 * - Industry standard: CNC machine PM costs typically 3-8% of purchase price annually
 * - Labor rates: US shop average $35-65/hr for maintenance technician
 */

import { z } from "zod";
import { log } from "../utils/Logger.js";
import type {
  HandbookMaintenanceTask,
  HandbookPartsEntry,
  MachineHandbook,
} from "./MachineHandbookRegistryEngine.js";

// ════════════════════════════════════════════════════════════════════
// SECTION 1: INPUT/OUTPUT SCHEMAS
// ════════════════════════════════════════════════════════════════════

/** Interval → annual frequency mapping (based on 2,000 operating hours/year, 250 work days). */
const INTERVAL_ANNUAL_FREQUENCY: Record<string, number> = {
  daily: 250,
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  semi_annual: 2,
  annual: 1,
  hours_250: 8,      // 2000/250
  hours_500: 4,      // 2000/500
  hours_1000: 2,     // 2000/1000
  hours_2000: 1,     // 2000/2000
  hours_5000: 0.4,   // 2000/5000
  hours_10000: 0.2,  // 2000/10000
  as_needed: 2,      // conservative estimate: twice per year
};

export const MaintenanceCostConfigSchema = z.object({
  machine_id: z.string(),
  labor_rate_per_hour: z.number().positive().default(50),
  operating_hours_per_year: z.number().positive().default(2000),
  work_days_per_year: z.number().positive().default(250),
  parts_markup_pct: z.number().min(0).max(100).default(15),
  include_downtime_cost: z.boolean().default(false),
  machine_hourly_rate: z.number().optional(), // for downtime costing
});
export type MaintenanceCostConfig = z.infer<typeof MaintenanceCostConfigSchema>;

/** PM task with computed annual cost and frequency. */
export interface MaintenanceTaskCost {
  task_id: string;
  task: string;
  interval: string;
  category: string;
  annual_frequency: number;
  labor_time_min: number;
  labor_cost_annual: number;
  parts_cost_annual: number;
  total_cost_annual: number;
  parts_needed: Array<{ part_number: string; description: string; quantity: number; unit_cost?: number }>;
  safety_warnings: string[];
  requires_power_off: boolean;
}

/** Consumable with replacement tracking. */
export interface ConsumableItem {
  oem_part_number: string;
  description: string;
  category: string;
  quantity_per_machine: number;
  replacement_interval_hours: number | null;
  annual_replacements: number;
  unit_price_usd: number | null;
  annual_cost: number | null;
  cross_references: Array<{ vendor: string; part_number: string }>;
  critical: boolean;
}

/** Full annual cost breakdown. */
export interface AnnualMaintenanceCost {
  machine_id: string;
  labor_cost: number;
  parts_cost: number;
  consumable_cost: number;
  downtime_cost: number;
  total_annual_cost: number;
  cost_per_operating_hour: number;
  task_count: number;
  consumable_count: number;
  critical_parts_count: number;
  tasks: MaintenanceTaskCost[];
  consumables: ConsumableItem[];
  confidence: number;
  confidence_notes: string[];
  category_breakdown: Record<string, { labor: number; parts: number; total: number }>;
}

/** Maintenance calendar entry. */
export interface CalendarEntry {
  month: number;
  tasks: Array<{
    task_id: string;
    task: string;
    category: string;
    estimated_time_min: number;
    requires_power_off: boolean;
  }>;
  total_time_min: number;
  estimated_downtime_hours: number;
}

/** Registry interface (dependency injection). */
interface HandbookRegistryLike {
  getByMachineId(id: string): MachineHandbook | null | undefined;
  list(): Array<{ machine_id: string }>;
}

// ════════════════════════════════════════════════════════════════════
// SECTION 2: ENGINE CLASS
// ════════════════════════════════════════════════════════════════════

export class HandbookMaintenanceIntelligenceEngine {

  /**
   * Get structured PM schedule for a machine, sorted by frequency.
   * Returns tasks with annual frequency and categorization.
   */
  getMaintenanceSchedule(
    machineId: string,
    registry: HandbookRegistryLike,
  ): { tasks: HandbookMaintenanceTask[]; task_count: number; categories: string[] } | null {
    const handbook = registry.getByMachineId(machineId);
    if (!handbook || !handbook.maintenance_schedule || handbook.maintenance_schedule.length === 0) {
      log.warn(`[MaintenanceIntelligence] No maintenance schedule for machine: ${machineId}`);
      return null;
    }

    const tasks = [...handbook.maintenance_schedule].sort((a, b) => {
      const freqA = INTERVAL_ANNUAL_FREQUENCY[a.interval] ?? 1;
      const freqB = INTERVAL_ANNUAL_FREQUENCY[b.interval] ?? 1;
      return freqB - freqA; // highest frequency first
    });

    const categories = [...new Set(tasks.map(t => t.category))];

    return { tasks, task_count: tasks.length, categories };
  }

  /**
   * Get parts BOM for a machine, categorized and sorted by criticality.
   */
  getPartsBOM(
    machineId: string,
    registry: HandbookRegistryLike,
  ): { parts: HandbookPartsEntry[]; part_count: number; categories: string[]; critical_count: number } | null {
    const handbook = registry.getByMachineId(machineId);
    if (!handbook || !handbook.parts_book || handbook.parts_book.length === 0) {
      log.warn(`[MaintenanceIntelligence] No parts book for machine: ${machineId}`);
      return null;
    }

    const parts = [...handbook.parts_book].sort((a, b) => {
      // Critical parts first, then by category
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      return a.category.localeCompare(b.category);
    });

    const categories = [...new Set(parts.map(p => p.category))];
    const critical_count = parts.filter(p => p.critical).length;

    return { parts, part_count: parts.length, categories, critical_count };
  }

  /**
   * Get consumable items with replacement tracking.
   * Consumables are parts with replacement_interval_hours defined.
   */
  getConsumables(
    machineId: string,
    registry: HandbookRegistryLike,
    operatingHoursPerYear: number = 2000,
  ): ConsumableItem[] {
    const handbook = registry.getByMachineId(machineId);
    if (!handbook || !handbook.parts_book) return [];

    const consumables: ConsumableItem[] = [];

    for (const part of handbook.parts_book) {
      if (part.category === "consumable" || part.replacement_interval_hours != null) {
        const intervalHours = part.replacement_interval_hours ?? 2000; // default annual
        const annualReplacements = operatingHoursPerYear / intervalHours;
        const annualCost = part.unit_price_usd != null
          ? part.unit_price_usd * part.quantity_per_machine * annualReplacements
          : null;

        consumables.push({
          oem_part_number: part.oem_part_number,
          description: part.description,
          category: part.category,
          quantity_per_machine: part.quantity_per_machine,
          replacement_interval_hours: part.replacement_interval_hours ?? null,
          annual_replacements: Math.round(annualReplacements * 100) / 100,
          unit_price_usd: part.unit_price_usd ?? null,
          annual_cost: annualCost != null ? Math.round(annualCost * 100) / 100 : null,
          cross_references: part.cross_references ?? [],
          critical: part.critical,
        });
      }
    }

    return consumables.sort((a, b) => {
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      return (b.annual_cost ?? 0) - (a.annual_cost ?? 0);
    });
  }

  /**
   * Estimate annual maintenance cost for a machine.
   * Combines PM labor, parts costs, and consumable costs into a total burden.
   *
   * Cost model:
   *   labor_cost = Σ(task.estimated_time_min / 60 * labor_rate * annual_frequency)
   *   parts_cost = Σ(part.unit_price * quantity * annual_frequency * (1 + markup))
   *   consumable_cost = Σ(consumable.unit_price * qty * annual_replacements * (1 + markup))
   *   downtime_cost = Σ(task.estimated_time_min / 60 * machine_hourly_rate * annual_frequency) [optional]
   *   total = labor + parts + consumable + downtime
   */
  estimateAnnualCost(
    config: MaintenanceCostConfig,
    registry: HandbookRegistryLike,
  ): AnnualMaintenanceCost {
    const parsed = MaintenanceCostConfigSchema.parse(config);
    const { machine_id, labor_rate_per_hour, operating_hours_per_year,
      work_days_per_year, parts_markup_pct, include_downtime_cost, machine_hourly_rate } = parsed;

    const handbook = registry.getByMachineId(machine_id);
    const tasks: MaintenanceTaskCost[] = [];
    const confidenceNotes: string[] = [];
    let totalLabor = 0;
    let totalParts = 0;
    let totalDowntime = 0;
    const categoryBreakdown: Record<string, { labor: number; parts: number; total: number }> = {};

    // Recalculate interval frequencies based on config
    const intervalFreq = { ...INTERVAL_ANNUAL_FREQUENCY };
    if (operating_hours_per_year !== 2000) {
      intervalFreq.hours_250 = operating_hours_per_year / 250;
      intervalFreq.hours_500 = operating_hours_per_year / 500;
      intervalFreq.hours_1000 = operating_hours_per_year / 1000;
      intervalFreq.hours_2000 = operating_hours_per_year / 2000;
      intervalFreq.hours_5000 = operating_hours_per_year / 5000;
      intervalFreq.hours_10000 = operating_hours_per_year / 10000;
    }
    if (work_days_per_year !== 250) {
      intervalFreq.daily = work_days_per_year;
      intervalFreq.weekly = work_days_per_year / 5;
    }

    const markupMultiplier = 1 + parts_markup_pct / 100;

    if (handbook?.maintenance_schedule) {
      for (const mt of handbook.maintenance_schedule) {
        const freq = intervalFreq[mt.interval] ?? 1;
        const laborMin = mt.estimated_time_min ?? 30; // default 30 min if unspecified
        const laborCost = (laborMin / 60) * labor_rate_per_hour * freq;
        let partsCost = 0;

        const partsForTask: MaintenanceTaskCost["parts_needed"] = [];
        for (const pn of mt.parts_needed) {
          // Look up price from parts_book
          const bookEntry = handbook.parts_book?.find(
            bp => bp.oem_part_number === pn.part_number,
          );
          const unitCost = bookEntry?.unit_price_usd;
          const cost = unitCost != null ? unitCost * pn.quantity * freq * markupMultiplier : 0;
          partsCost += cost;
          partsForTask.push({
            part_number: pn.part_number,
            description: pn.description,
            quantity: pn.quantity,
            unit_cost: unitCost,
          });
        }

        const downtimeCost = include_downtime_cost && machine_hourly_rate
          ? (laborMin / 60) * machine_hourly_rate * freq
          : 0;

        totalLabor += laborCost;
        totalParts += partsCost;
        totalDowntime += downtimeCost;

        // Category breakdown
        if (!categoryBreakdown[mt.category]) {
          categoryBreakdown[mt.category] = { labor: 0, parts: 0, total: 0 };
        }
        categoryBreakdown[mt.category].labor += laborCost;
        categoryBreakdown[mt.category].parts += partsCost;
        categoryBreakdown[mt.category].total += laborCost + partsCost;

        tasks.push({
          task_id: mt.task_id,
          task: mt.task,
          interval: mt.interval,
          category: mt.category,
          annual_frequency: freq,
          labor_time_min: laborMin,
          labor_cost_annual: Math.round(laborCost * 100) / 100,
          parts_cost_annual: Math.round(partsCost * 100) / 100,
          total_cost_annual: Math.round((laborCost + partsCost) * 100) / 100,
          parts_needed: partsForTask,
          safety_warnings: mt.safety_warnings,
          requires_power_off: mt.requires_power_off,
        });
      }
    }

    // Consumable costs
    const consumables = this.getConsumables(machine_id, registry, operating_hours_per_year);
    let totalConsumable = 0;
    for (const c of consumables) {
      if (c.annual_cost != null) {
        totalConsumable += c.annual_cost * markupMultiplier;
      }
    }

    // Confidence scoring
    let confidence = 0.3; // base: we have an engine
    if (handbook?.maintenance_schedule && handbook.maintenance_schedule.length > 0) {
      confidence += 0.2; // have PM schedule
      if (handbook.maintenance_schedule.length >= 10) confidence += 0.1; // comprehensive schedule
    }
    if (handbook?.parts_book && handbook.parts_book.length > 0) {
      confidence += 0.1; // have parts book
      const pricedParts = handbook.parts_book.filter(p => p.unit_price_usd != null);
      if (pricedParts.length > 0) {
        confidence += 0.1; // have pricing data
        if (pricedParts.length / handbook.parts_book.length > 0.8) confidence += 0.1; // >80% priced
      }
    }
    if (consumables.length > 0) confidence += 0.1;

    // Confidence notes
    if (!handbook) {
      confidenceNotes.push("No handbook data available — cost estimate is zero");
    } else {
      if (!handbook.maintenance_schedule || handbook.maintenance_schedule.length === 0) {
        confidenceNotes.push("No PM schedule in handbook — labor costs estimated at zero");
      }
      if (!handbook.parts_book || handbook.parts_book.length === 0) {
        confidenceNotes.push("No parts book — parts/consumable costs not available");
      } else {
        const unpriced = handbook.parts_book.filter(p => p.unit_price_usd == null).length;
        if (unpriced > 0) {
          confidenceNotes.push(`${unpriced}/${handbook.parts_book.length} parts have no pricing — costs underestimated`);
        }
      }
      const noTimeEstimate = handbook.maintenance_schedule?.filter(t => t.estimated_time_min == null).length ?? 0;
      if (noTimeEstimate > 0) {
        confidenceNotes.push(`${noTimeEstimate} tasks use default 30-min labor estimate`);
      }
    }

    const totalAnnual = totalLabor + totalParts + totalConsumable + totalDowntime;
    const criticalCount = handbook?.parts_book?.filter(p => p.critical).length ?? 0;

    // Output sanity checks
    if (totalAnnual < 0) {
      log.warn(`[MaintenanceIntelligence] ${machine_id}: negative total cost (${totalAnnual}) — data error`);
      confidenceNotes.push("WARNING: Negative total cost detected — review input data");
    }
    if (totalAnnual > 500_000) {
      log.warn(`[MaintenanceIntelligence] ${machine_id}: unusually high annual cost ($${totalAnnual}) — verify parts pricing`);
      confidenceNotes.push("WARNING: Annual cost exceeds $500k — verify parts book pricing");
    }
    if (operating_hours_per_year > 8760) {
      confidenceNotes.push("WARNING: Operating hours exceed 8760 (hours in a year)");
    }

    log.info(`[MaintenanceIntelligence] ${machine_id}: $${totalAnnual.toFixed(0)}/yr ` +
      `(labor=$${totalLabor.toFixed(0)}, parts=$${totalParts.toFixed(0)}, ` +
      `consumables=$${totalConsumable.toFixed(0)}, downtime=$${totalDowntime.toFixed(0)}), ` +
      `conf=${confidence.toFixed(2)}`);

    return {
      machine_id,
      labor_cost: Math.round(totalLabor * 100) / 100,
      parts_cost: Math.round(totalParts * 100) / 100,
      consumable_cost: Math.round(totalConsumable * 100) / 100,
      downtime_cost: Math.round(totalDowntime * 100) / 100,
      total_annual_cost: Math.round(totalAnnual * 100) / 100,
      cost_per_operating_hour: Math.round((totalAnnual / operating_hours_per_year) * 100) / 100,
      task_count: tasks.length,
      consumable_count: consumables.length,
      critical_parts_count: criticalCount,
      tasks,
      consumables,
      confidence: Math.min(confidence, 1),
      confidence_notes: confidenceNotes,
      category_breakdown: categoryBreakdown,
    };
  }

  /**
   * Generate a 12-month maintenance calendar for a machine.
   * Maps PM tasks to the months they should be performed.
   */
  getMaintenanceCalendar(
    machineId: string,
    registry: HandbookRegistryLike,
  ): CalendarEntry[] {
    const handbook = registry.getByMachineId(machineId);
    if (!handbook?.maintenance_schedule || handbook.maintenance_schedule.length === 0) return [];

    const calendar: CalendarEntry[] = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      tasks: [],
      total_time_min: 0,
      estimated_downtime_hours: 0,
    }));

    for (const task of handbook.maintenance_schedule) {
      const freq = INTERVAL_ANNUAL_FREQUENCY[task.interval] ?? 1;
      const timeMin = task.estimated_time_min ?? 30;

      // Map intervals to months
      let months: number[];
      switch (task.interval) {
        case "daily":
        case "weekly":
          // Appears every month
          months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
          break;
        case "monthly":
          months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
          break;
        case "quarterly":
          months = [3, 6, 9, 12];
          break;
        case "semi_annual":
          months = [6, 12];
          break;
        case "annual":
        case "hours_5000":
        case "hours_10000":
          months = [12]; // year-end
          break;
        case "hours_250":
          months = [2, 3, 5, 6, 8, 9, 11, 12]; // ~every 6 weeks
          break;
        case "hours_500":
          months = [3, 6, 9, 12];
          break;
        case "hours_1000":
          months = [6, 12];
          break;
        case "hours_2000":
          months = [12];
          break;
        default:
          months = [6, 12]; // as_needed: semi-annual
      }

      for (const m of months) {
        const entry = calendar[m - 1];
        entry.tasks.push({
          task_id: task.task_id,
          task: task.task,
          category: task.category,
          estimated_time_min: timeMin,
          requires_power_off: task.requires_power_off,
        });
        // For daily/weekly, use per-month aggregation
        if (task.interval === "daily") {
          entry.total_time_min += timeMin * (250 / 12); // ~21 days/month
        } else if (task.interval === "weekly") {
          entry.total_time_min += timeMin * (52 / 12); // ~4.3 weeks/month
        } else {
          entry.total_time_min += timeMin;
        }
      }
    }

    // Calculate downtime hours
    for (const entry of calendar) {
      entry.total_time_min = Math.round(entry.total_time_min);
      entry.estimated_downtime_hours = Math.round(entry.total_time_min / 60 * 100) / 100;
    }

    return calendar;
  }

  /**
   * Compare maintenance costs across multiple machines.
   * Useful for job routing — prefer machines with lower maintenance burden.
   */
  compareMachines(
    machineIds: string[],
    registry: HandbookRegistryLike,
    config?: Partial<MaintenanceCostConfig>,
  ): Array<AnnualMaintenanceCost & { rank: number }> {
    const results = machineIds.map(id =>
      this.estimateAnnualCost(
        { machine_id: id, ...config } as MaintenanceCostConfig,
        registry,
      ),
    );

    // Sort by cost_per_operating_hour ascending (cheapest first)
    results.sort((a, b) => a.cost_per_operating_hour - b.cost_per_operating_hour);

    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }
}

/** Singleton instance. */
export const handbookMaintenanceIntelligenceEngine = new HandbookMaintenanceIntelligenceEngine();
