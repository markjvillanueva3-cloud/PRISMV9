/**
 * WEDMMaintenanceSchedulerEngine — WEDM AGI Phase 4 / P4-MS3 / U-P4-09.
 *
 * Turns a `RULReport` (from `WEDMRULEngine`) into a concrete list of
 * `ServiceTask`s and, optionally, packs those tasks into available
 * maintenance windows using a priority-first greedy scheduler.
 *
 * Task mapping (one per unhealthy component):
 *
 *   guide_wear       → replace diamond wire guides
 *   wire_erosion     → re-spool wire (fresh material)
 *   filter_capacity  → regenerate / replace ion-exchange resin
 *   filter_clogging  → swap particulate filter cartridge
 *   wire_fatigue     → preventive re-spool (cumulative damage high)
 *
 * Priority is driven by the RUL band:
 *
 *   imminent → P1  (next available window)
 *   soon     → P2  (within ~1 week)
 *   planned  → P3  (within ~1 month)
 *   healthy  → no task emitted
 *
 * `assignWindows()` greedily packs P1 → P3 tasks into supplied
 * `ServiceWindow`s sorted by start time. A task only enters a window if
 * the window has enough minutes remaining. Unassigned tasks are
 * returned in `overflow` so the caller can surface a "no slot found"
 * alert to the planner.
 *
 * This engine does NOT execute maintenance — it emits a plan. Execution
 * is a separate concern (shop floor task queue, handoff packets, etc.).
 *
 * Composes with:
 *   - WEDMRULEngine                 (input: RULReport)
 *   - WEDMDegradationModelEngine    (upstream state)
 *   - WEDMHumanHandoffEngine        (P1 tasks can spawn a handoff packet)
 *
 * @module engines/WEDMMaintenanceSchedulerEngine
 */

import type {
  ComponentRUL,
  RULBand,
  RULReport,
} from "./WEDMRULEngine.js";
import type { DegradationComponent } from "./WEDMDegradationModelEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type ServicePriority = 1 | 2 | 3;

export type ServiceAction =
  | "replace_wire_guides"
  | "respool_wire"
  | "regenerate_resin"
  | "swap_particulate_filter"
  | "preventive_respool";

export interface ServiceTask {
  component: DegradationComponent;
  action: ServiceAction;
  priority: ServicePriority;
  /** Expected service time in minutes. */
  estMinutes: number;
  /** RUL window deadline in hours. */
  dueWithinHours: number;
  /** Source band that created the task. */
  band: RULBand;
  reason: string;
}

export interface ServiceWindow {
  /** Opaque identifier ("shift-2026-04-17-A"). */
  id: string;
  /** Start of window as epoch ms (or a monotone hour count — engine is unit-agnostic). */
  startAt: number;
  /** Total duration of the window in minutes. */
  durationMinutes: number;
}

export interface ScheduleAssignment {
  window: ServiceWindow;
  tasks: ServiceTask[];
  minutesUsed: number;
  minutesRemaining: number;
}

export interface ScheduleResult {
  assignments: ScheduleAssignment[];
  overflow: ServiceTask[];
}

export interface MaintenanceCatalog {
  action: ServiceAction;
  defaultMinutes: number;
  componentLabel: string;
}

// ============================================================================
// ACTION CATALOG
// ============================================================================

const ACTION_BY_COMPONENT: Record<DegradationComponent, MaintenanceCatalog> = {
  guide_wear: {
    action: "replace_wire_guides",
    defaultMinutes: 45,
    componentLabel: "wire guides",
  },
  wire_erosion: {
    action: "respool_wire",
    defaultMinutes: 20,
    componentLabel: "wire spool",
  },
  filter_capacity: {
    action: "regenerate_resin",
    defaultMinutes: 60,
    componentLabel: "ion-exchange resin",
  },
  filter_clogging: {
    action: "swap_particulate_filter",
    defaultMinutes: 15,
    componentLabel: "particulate filter",
  },
  wire_fatigue: {
    action: "preventive_respool",
    defaultMinutes: 25,
    componentLabel: "wire (fatigue)",
  },
};

// ============================================================================
// BAND → PRIORITY
// ============================================================================

function bandToPriority(band: RULBand): ServicePriority | null {
  switch (band) {
    case "imminent":
      return 1;
    case "soon":
      return 2;
    case "planned":
      return 3;
    case "healthy":
      return null;
  }
}

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMMaintenanceSchedulerEngine {
  /**
   * Emit a `ServiceTask` for every unhealthy component. Healthy
   * components contribute nothing. Tasks come back sorted by priority
   * then by RUL hours.
   */
  planFromRUL(report: RULReport): ServiceTask[] {
    const tasks: ServiceTask[] = [];
    for (const c of Object.values(report.components) as ComponentRUL[]) {
      const priority = bandToPriority(c.band);
      if (priority === null) continue;
      const catalog = ACTION_BY_COMPONENT[c.component];
      tasks.push({
        component: c.component,
        action: catalog.action,
        priority,
        estMinutes: catalog.defaultMinutes,
        dueWithinHours: Number.isFinite(c.rul_hours) ? c.rul_hours : 0,
        band: c.band,
        reason: `${catalog.componentLabel} RUL ${c.rul_hours === 0 ? "0" : c.rul_hours.toPrecision(3)} hr (band=${c.band})`,
      });
    }
    tasks.sort((a, b) => a.priority - b.priority || a.dueWithinHours - b.dueWithinHours);
    return tasks;
  }

  /**
   * Greedily pack `tasks` into time-ordered `windows`. P1 tasks go first,
   * then P2, then P3. Within a priority, smallest-RUL-first. Windows are
   * consumed in order. Tasks that don't fit end up in `overflow`.
   */
  assignWindows(
    tasks: ServiceTask[],
    windows: ServiceWindow[],
  ): ScheduleResult {
    const sortedWindows = [...windows].sort((a, b) => a.startAt - b.startAt);
    const assignments: ScheduleAssignment[] = sortedWindows.map((w) => ({
      window: w,
      tasks: [],
      minutesUsed: 0,
      minutesRemaining: w.durationMinutes,
    }));

    const sortedTasks = [...tasks].sort(
      (a, b) => a.priority - b.priority || a.dueWithinHours - b.dueWithinHours,
    );
    const overflow: ServiceTask[] = [];

    for (const task of sortedTasks) {
      const slot = assignments.find((a) => a.minutesRemaining >= task.estMinutes);
      if (!slot) {
        overflow.push(task);
        continue;
      }
      slot.tasks.push(task);
      slot.minutesUsed += task.estMinutes;
      slot.minutesRemaining -= task.estMinutes;
    }

    return { assignments, overflow };
  }

  /** Convenience: plan + assign in one call. */
  plan(
    report: RULReport,
    windows: ServiceWindow[] = [],
  ): { tasks: ServiceTask[]; schedule: ScheduleResult } {
    const tasks = this.planFromRUL(report);
    const schedule = this.assignWindows(tasks, windows);
    return { tasks, schedule };
  }

  /** Convenience accessor for the action catalog. */
  actionFor(component: DegradationComponent): MaintenanceCatalog {
    return { ...ACTION_BY_COMPONENT[component] };
  }
}

/** Shared singleton. */
export const wedmMaintenanceSchedulerEngine = new WEDMMaintenanceSchedulerEngine();
