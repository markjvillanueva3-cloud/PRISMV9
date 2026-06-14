/**
 * ScheduleProjectedCapacityEngine.ts — PRISM networking-marketplace Phase-2 differentiator
 * (galaxy:business, slot:hotel). CAPACITY-AWARE matching: a shop with a full backlog can't hit the
 * need-by date no matter how cheap or capable it is. This projects a supplier's free hours over a
 * horizon from its committed orders (rough-cut capacity planning), finds the earliest slot a new job
 * fits, and emits a capacity score for the RFQ ranking criterion.
 *
 * Dates are CALLER-SUPPLIED ISO strings (deterministic — no wall-clock read). FAIL-LOUD (R12): a
 * non-finite/negative capacity or job-hours, or an unparseable ISO date, throws.
 */

import { z } from "zod";
import {
  CAPACITY_PROJECTION_SCHEMA_VERSION,
  DEFAULT_CAPACITY_HOURS_PER_WEEK,
  DEFAULT_HORIZON_WEEKS,
  OVERCOMMIT_UTILIZATION,
  TIGHT_UTILIZATION,
  DAYS_PER_WEEK,
} from "../data/capacity-projection-policy.js";

const CommittedOrderSchema = z.object({
  hoursRequired: z.number().finite("hoursRequired must be finite").nonnegative("hoursRequired must be >= 0"),
  dueDateISO: z.string().min(1, "committed order dueDateISO is required"),
});

const ProjectInputSchema = z.object({
  supplierId: z.string().min(1, "supplierId is required"),
  asOfISO: z.string().min(1, "asOfISO is required"),
  capacityHoursPerWeek: z.number().finite().positive("capacityHoursPerWeek must be > 0").default(DEFAULT_CAPACITY_HOURS_PER_WEEK),
  horizonWeeks: z.number().int().positive("horizonWeeks must be > 0").default(DEFAULT_HORIZON_WEEKS),
  committed: z.array(CommittedOrderSchema).default([]),
});
export type ProjectCapacityInput = z.input<typeof ProjectInputSchema>;

export interface WeekLoad {
  weekIndex: number;
  committedHours: number;
  availableHours: number; // max(0, capacity - committed) — an oversold week offers no free hours
  utilization: number; // committed / capacity (can exceed 1.0 when oversold)
  status: "open" | "tight" | "overcommitted";
}

export interface CapacityProjection {
  supplierId: string;
  capacityHoursPerWeek: number;
  horizonWeeks: number;
  weeks: WeekLoad[];
  totalCapacityHours: number;
  totalCommittedHours: number;
  totalAvailableHours: number;
  avgUtilization: number;
  overcommittedWeeks: number;
  capacityScore: number; // [0,1] — more free capacity → higher (for RFQ ranking)
  schemaVersion: string;
}

export interface SlotResult {
  fits: boolean;
  /** week index at which the job's hours are fully covered by cumulative free capacity; null if it never fits in horizon. */
  earliestCompletionWeek: number | null;
  hoursStillNeeded: number; // 0 when it fits
}

export class ScheduleProjectedCapacityEngine {
  /** Whole weeks from `asOfISO` to `dueISO` (clamped to >= 0). Throws on an unparseable date. */
  static #weekIndex(asOfISO: string, dueISO: string): number {
    const a = Date.parse(asOfISO);
    const d = Date.parse(dueISO);
    if (Number.isNaN(a)) throw new Error(`ScheduleProjectedCapacityEngine: unparseable asOfISO '${asOfISO}'`);
    if (Number.isNaN(d)) throw new Error(`ScheduleProjectedCapacityEngine: unparseable dueDateISO '${dueISO}'`);
    const days = (d - a) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.floor(days / DAYS_PER_WEEK));
  }

  static #round2(x: number): number {
    return Math.round(x * 100) / 100;
  }

  /** Project per-week load over the horizon. Jobs due beyond the horizon are clamped into the last week. */
  static project(input: ProjectCapacityInput): CapacityProjection {
    const p = ProjectInputSchema.parse(input);
    const cap = p.capacityHoursPerWeek;
    const committedByWeek = new Array<number>(p.horizonWeeks).fill(0);

    for (const order of p.committed) {
      const wk = Math.min(ScheduleProjectedCapacityEngine.#weekIndex(p.asOfISO, order.dueDateISO), p.horizonWeeks - 1);
      committedByWeek[wk] += order.hoursRequired;
    }

    const weeks: WeekLoad[] = committedByWeek.map((committedHours, weekIndex) => {
      const utilization = committedHours / cap;
      const availableHours = Math.max(0, cap - committedHours);
      const status: WeekLoad["status"] =
        utilization >= OVERCOMMIT_UTILIZATION ? "overcommitted" : utilization >= TIGHT_UTILIZATION ? "tight" : "open";
      return {
        weekIndex,
        committedHours: ScheduleProjectedCapacityEngine.#round2(committedHours),
        availableHours: ScheduleProjectedCapacityEngine.#round2(availableHours),
        utilization: ScheduleProjectedCapacityEngine.#round2(utilization),
        status,
      };
    });

    const totalCapacityHours = cap * p.horizonWeeks;
    const totalCommittedHours = ScheduleProjectedCapacityEngine.#round2(
      committedByWeek.reduce((s, h) => s + h, 0),
    );
    const totalAvailableHours = ScheduleProjectedCapacityEngine.#round2(
      weeks.reduce((s, w) => s + w.availableHours, 0),
    );
    const avgUtilization = ScheduleProjectedCapacityEngine.#round2(totalCommittedHours / totalCapacityHours);
    const overcommittedWeeks = weeks.filter((w) => w.status === "overcommitted").length;
    // Score from FREE fraction of total capacity (clamped) — an oversold week can't push the score negative.
    const capacityScore = ScheduleProjectedCapacityEngine.#round2(
      Math.max(0, Math.min(1, totalAvailableHours / totalCapacityHours)),
    );

    return {
      supplierId: p.supplierId,
      capacityHoursPerWeek: cap,
      horizonWeeks: p.horizonWeeks,
      weeks,
      totalCapacityHours,
      totalCommittedHours,
      totalAvailableHours,
      avgUtilization,
      overcommittedWeeks,
      capacityScore,
      schemaVersion: CAPACITY_PROJECTION_SCHEMA_VERSION,
    };
  }

  /**
   * Earliest week by which cumulative FREE capacity covers `jobHours`. Walks weeks accumulating each
   * week's available hours; returns the week the running total first reaches `jobHours`.
   */
  static earliestSlot(input: ProjectCapacityInput & { jobHours: number }): SlotResult {
    if (typeof input.jobHours !== "number" || !Number.isFinite(input.jobHours) || input.jobHours < 0) {
      throw new Error("ScheduleProjectedCapacityEngine.earliestSlot: jobHours must be a finite >= 0 number");
    }
    const proj = ScheduleProjectedCapacityEngine.project(input);
    let cumulative = 0;
    for (const w of proj.weeks) {
      cumulative += w.availableHours;
      if (cumulative >= input.jobHours) {
        return { fits: true, earliestCompletionWeek: w.weekIndex, hoursStillNeeded: 0 };
      }
    }
    return {
      fits: false,
      earliestCompletionWeek: null,
      hoursStillNeeded: ScheduleProjectedCapacityEngine.#round2(input.jobHours - cumulative),
    };
  }

  static schemaVersion(): string {
    return CAPACITY_PROJECTION_SCHEMA_VERSION;
  }
}

export const scheduleProjectedCapacityEngine = ScheduleProjectedCapacityEngine;
