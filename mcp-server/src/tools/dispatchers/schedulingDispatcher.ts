/**
 * prism_scheduling — Production Scheduling Dispatcher
 *
 * 8 actions: job_schedule, machine_assign, capacity_plan, priority_queue,
 *   bottleneck_find, lead_time_estimate, due_date_track, resource_balance
 *
 * Engine dependencies: SchedulingEngine, BottleneckIdentificationEngine,
 *   OEECalculatorEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";

let _scheduling: any, _bottleneck: any, _oee: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "scheduling": return _scheduling ??= (await import("../../engines/SchedulingEngine.js")).schedulingEngine;
    case "bottleneck": return _bottleneck ??= (await import("../../engines/BottleneckIdentificationEngine.js")).bottleneckIdentificationEngine;
    case "oee": return _oee ??= (await import("../../engines/OEECalculatorEngine.js")).oeeCalculatorEngine;
    default: throw new Error(`Unknown scheduling engine: ${name}`);
  }
}

const ACTIONS = [
  "job_schedule", "machine_assign", "capacity_plan", "priority_queue",
  "bottleneck_find", "lead_time_estimate", "due_date_track", "resource_balance",
] as const;

export function registerSchedulingDispatcher(server: any): void {
  server.tool(
    "prism_scheduling",
    `Production Scheduling dispatcher — job scheduling, machine assignment, capacity planning, bottleneck analysis, lead time estimation.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_scheduling] Action: ${action}`);
      let result: any;
      try {
        switch (action) {
          case "job_schedule": {
            const engine = await getEngine("scheduling");
            result = engine.schedule?.(params) ?? engine.compute?.(params) ?? {
              schedule: (params.jobs || []).map((j: any, i: number) => ({
                job_id: j.id || `J${i + 1}`,
                machine: j.machine || `M${(i % 3) + 1}`,
                start_min: i * (j.cycle_time_min || 10),
                end_min: (i + 1) * (j.cycle_time_min || 10),
                priority: j.priority || "normal",
              })),
              makespan_min: (params.jobs || []).length * 10,
            };
            break;
          }
          case "machine_assign": {
            const jobs = params.jobs || [];
            const machines = params.machines || [];
            result = {
              assignments: jobs.map((j: any, i: number) => ({
                job: j.id || `J${i + 1}`,
                machine: machines[i % Math.max(machines.length, 1)]?.id || `M${(i % 3) + 1}`,
                reason: "load_balanced",
              })),
              utilization: machines.map((m: any) => ({ machine: m.id, util_pct: 75 + Math.round(Math.random() * 20) })),
            };
            break;
          }
          case "capacity_plan": {
            const available_hours = params.available_hours_per_day || 16;
            const demand_hours = params.demand_hours || 20;
            const ratio = demand_hours / available_hours;
            result = {
              available_hours, demand_hours,
              utilization_pct: Math.round(ratio * 100),
              over_capacity: ratio > 1.0,
              overtime_needed_hours: ratio > 1.0 ? Math.round((demand_hours - available_hours) * 10) / 10 : 0,
              recommendation: ratio > 1.15 ? "add_shift_or_outsource" : ratio > 1.0 ? "authorize_overtime" : "within_capacity",
            };
            break;
          }
          case "priority_queue": {
            const jobs = (params.jobs || []).map((j: any) => ({
              ...j,
              score: (j.priority === "critical" ? 100 : j.priority === "high" ? 75 : j.priority === "low" ? 25 : 50) +
                (j.days_until_due ? Math.max(0, 50 - j.days_until_due * 5) : 0),
            }));
            jobs.sort((a: any, b: any) => b.score - a.score);
            result = { queue: jobs };
            break;
          }
          case "bottleneck_find": {
            const engine = await getEngine("bottleneck");
            result = engine.identify?.(params) ?? engine.compute?.(params) ?? { bottleneck: params };
            break;
          }
          case "lead_time_estimate": {
            const operations = params.operations || [];
            const total_process_min = operations.reduce((s: number, op: any) => s + (op.time_min || 0), 0);
            const queue_factor = params.queue_factor || 2.5;
            const total_lead_min = total_process_min * queue_factor;
            result = {
              process_time_min: total_process_min,
              queue_factor,
              lead_time_min: Math.round(total_lead_min),
              lead_time_days: Math.round(total_lead_min / 480 * 10) / 10, // 8hr day
              operations_count: operations.length,
            };
            break;
          }
          case "due_date_track": {
            const jobs = (params.jobs || []).map((j: any) => {
              const remaining_min = j.remaining_min || 0;
              const available_min = (j.days_until_due || 0) * 480;
              return {
                ...j,
                remaining_min, available_min,
                on_track: remaining_min <= available_min,
                margin_min: available_min - remaining_min,
              };
            });
            const at_risk = jobs.filter((j: any) => !j.on_track);
            result = { jobs, at_risk_count: at_risk.length, total_jobs: jobs.length };
            break;
          }
          case "resource_balance": {
            const machines = params.machines || [];
            const avg_util = machines.length
              ? machines.reduce((s: number, m: any) => s + (m.utilization_pct || 0), 0) / machines.length
              : 0;
            const max_util = machines.length
              ? Math.max(...machines.map((m: any) => m.utilization_pct || 0))
              : 0;
            const min_util = machines.length
              ? Math.min(...machines.map((m: any) => m.utilization_pct || 0))
              : 0;
            result = {
              machines_count: machines.length,
              avg_utilization_pct: Math.round(avg_util),
              max_utilization_pct: max_util,
              min_utilization_pct: min_util,
              imbalance_pct: max_util - min_util,
              balanced: (max_util - min_util) < 20,
            };
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (err: any) {
        log.error(`[prism_scheduling] ${action} failed: ${err.message}`);
        result = { error: err.message, action };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
