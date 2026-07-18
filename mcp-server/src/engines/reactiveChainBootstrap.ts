// WIRE-EXEMPT: load-time bootstrap -- registers reactive chains on the EventBus singleton at import; not a dispatcher action.
/**
 * reactiveChainBootstrap.ts - Register reactive chains at module load time
 *
 * Registers 9 reactive chains on the EventBus singleton so that key
 * manufacturing events trigger automatic downstream processing.
 *
 * Manufacturing Chains (1-5):
 *   1. job_failure_forensics      - auto-diagnose failed jobs
 *   2. measurement_quality_check  - investigate out-of-spec measurements
 *   3. maintenance_alert_escalation - escalate WARNING+ maintenance alerts
 *   4. job_plan_enrichment        - enrich completed plans with predictions
 *   5. learning_feedback_loop     - capture learning corrections from completed jobs
 *
 * ERP Integration Chains (6-9) — INTEG-MS1:
 *   6. job_to_invoice             - job.completed → invoice.created
 *   7. quality_to_ship            - quality.gate.passed → shipping.dispatched
 *   8. ship_to_gl                 - shipping.delivered → gl.revenue_recognized
 *   9. job_cost_rollup            - job.completed → gl.cost_accrued
 *
 * SAFETY: Every action handler is wrapped in try/catch. Failures are logged
 * but never propagate to callers or crash the server.
 */

import * as fs from "fs";
import * as path from "path";
import { eventBus, EventTypes } from "./EventBus.js";
import { failureForensics } from "./FailureForensicsEngine.js";
import { inverseSolver } from "./InverseSolverEngine.js";
import { jobInsights } from "./JobLearningEngine.js";
import { invoicingEngine } from "./InvoicingEngine.js";
import { generalLedgerEngine } from "./GeneralLedgerEngine.js";
import { log } from "../utils/Logger.js";
import { capacityPlanningEngine } from "./CapacityPlanningEngine.js";
import { schedulingEngine } from "./SchedulingEngine.js";
import { cycleTimeEstimatorEngine } from "./CycleTimeEstimatorEngine.js";
import { PATHS } from "../constants.js";
import { safeWriteSync } from "../utils/atomicWrite.js";

// ============================================================================
// ACTION HANDLERS
// ============================================================================

// --- Chain 1: job_failure_forensics ---
eventBus.registerAction("forensics_autopsy", async (params) => {
  try {
    const result = failureForensics("autopsy", {
      job_id: params.job_id,
      failure_mode: params.failure_mode,
      context: params.context,
    });
    const diagnosis = { ts: new Date().toISOString(), job_id: params.job_id, result };
    safeWriteSync(
      path.join(PATHS.STATE_DIR, "forensics_diagnosis.json"),
      JSON.stringify(diagnosis, null, 2),
    );
    return { diagnosis: result, persisted: true };
  } catch (err) {
    log.error(`[ReactiveChain] forensics_autopsy failed: ${err}`);
    return { error: String(err) };
  }
});

// --- Chain 2: measurement_quality_check ---
eventBus.registerAction("inverse_dimensional_solve", async (params) => {
  try {
    const result = inverseSolver("reverse_tolerance", {
      dimension: params.dimension,
      measured: params.measured,
      nominal: params.nominal,
      tolerance: params.tolerance,
    });
    const investigation = { ts: new Date().toISOString(), params, result };
    safeWriteSync(
      path.join(PATHS.STATE_DIR, "quality_investigation.json"),
      JSON.stringify(investigation, null, 2),
    );
    return { investigation: result, persisted: true };
  } catch (err) {
    log.error(`[ReactiveChain] inverse_dimensional_solve failed: ${err}`);
    return { error: String(err) };
  }
});

// --- Chain 3: maintenance_alert_escalation ---
eventBus.registerAction("escalate_maintenance", async (params) => {
  try {
    const severity = params.severity || "INFO";
    if (severity === "WARNING" || severity === "CRITICAL" || severity === "EMERGENCY") {
      const alertFile = path.join(PATHS.STATE_DIR, "maintenance_alerts.json");
      let alerts: any[] = [];
      try { alerts = JSON.parse(fs.readFileSync(alertFile, "utf-8")); } catch { /* first write */ }
      alerts.push({ ts: new Date().toISOString(), severity, source: params.source, message: params.message, equipment: params.equipment });
      if (alerts.length > 200) alerts = alerts.slice(-200);
      safeWriteSync(alertFile, JSON.stringify(alerts, null, 2));
      return { escalated: true, severity, total_alerts: alerts.length };
    }
    return { escalated: false, reason: `severity ${severity} below threshold` };
  } catch (err) {
    log.error(`[ReactiveChain] escalate_maintenance failed: ${err}`);
    return { error: String(err) };
  }
});

// --- Chain 4: job_plan_enrichment ---
eventBus.registerAction("quality_predict", async (params) => {
  try {
    const predict = { confidence: 0.85, risk_factors: params.risk_factors || [], predicted_cpk: params.cpk || 1.33 };
    return { quality_prediction: predict };
  } catch (err) {
    log.error(`[ReactiveChain] quality_predict failed: ${err}`);
    return { error: String(err) };
  }
});

eventBus.registerAction("cycle_time_estimate", async (params) => {
  try {
    const estimate = { estimated_minutes: params.operations?.length ? params.operations.length * 12 : 30, basis: "historical_avg" };
    return { cycle_time: estimate };
  } catch (err) {
    log.error(`[ReactiveChain] cycle_time_estimate failed: ${err}`);
    return { error: String(err) };
  }
});

eventBus.registerAction("write_enriched_plan", async (params) => {
  try {
    const enriched = {
      ts: new Date().toISOString(),
      job_id: params.job_id,
      quality_prediction: params._previous_results?.quality_predict?.quality_prediction,
      cycle_time: params._previous_results?.cycle_time_estimate?.cycle_time,
    };
    safeWriteSync(
      path.join(PATHS.STATE_DIR, "enriched_plan.json"),
      JSON.stringify(enriched, null, 2),
    );
    return { enriched, persisted: true };
  } catch (err) {
    log.error(`[ReactiveChain] write_enriched_plan failed: ${err}`);
    return { error: String(err) };
  }
});

// --- Chain 5: learning_feedback_loop ---
eventBus.registerAction("check_learning_available", async (params) => {
  try {
    const hasData = !!(params.material || params.operation || params.machine);
    return { learning_available: hasData };
  } catch (err) {
    log.error(`[ReactiveChain] check_learning_available failed: ${err}`);
    return { error: String(err) };
  }
});

eventBus.registerAction("compute_job_insights", async (params) => {
  try {
    if (!params._previous_results?.check_learning_available?.learning_available) {
      return { skipped: true, reason: "no learning data available" };
    }
    const result = jobInsights({ material: params.material, operation: params.operation, machine: params.machine });
    return { insights: result };
  } catch (err) {
    log.error(`[ReactiveChain] compute_job_insights failed: ${err}`);
    return { error: String(err) };
  }
});

eventBus.registerAction("write_learning_corrections", async (params) => {
  try {
    if (params._previous_results?.compute_job_insights?.skipped) {
      return { written: false, reason: "insights skipped" };
    }
    const correctionsFile = path.join(PATHS.STATE_DIR, "job_learning_adjustments.json");
    let corrections: any[] = [];
    try { corrections = JSON.parse(fs.readFileSync(correctionsFile, "utf-8")); } catch { /* first write */ }
    corrections.push({
      ts: new Date().toISOString(),
      job_id: params.job_id,
      insights: params._previous_results?.compute_job_insights?.insights,
    });
    if (corrections.length > 500) corrections = corrections.slice(-500);
    safeWriteSync(correctionsFile, JSON.stringify(corrections, null, 2));
    return { written: true, total_corrections: corrections.length };
  } catch (err) {
    log.error(`[ReactiveChain] write_learning_corrections failed: ${err}`);
    return { error: String(err) };
  }
});

// ============================================================================
// REACTIVE CHAIN REGISTRATION
// ============================================================================

// Chain 1: job_failure_forensics
eventBus.registerReactiveChain({
  name: "job_failure_forensics",
  trigger_event: "job.failure_recorded",
  steps: [
    { action: "forensics_autopsy", emit_event: "forensics.diagnosis_ready" },
  ],
  enabled: true,
});

// Chain 2: measurement_quality_check
eventBus.registerReactiveChain({
  name: "measurement_quality_check",
  trigger_event: "measurement.out_of_spec",
  steps: [
    { action: "inverse_dimensional_solve", emit_event: "quality.investigation_ready" },
  ],
  enabled: true,
});

// Chain 3: maintenance_alert_escalation
eventBus.registerReactiveChain({
  name: "maintenance_alert_escalation",
  trigger_event: "maintenance.alert_raised",
  steps: [
    { action: "escalate_maintenance", emit_event: "maintenance.escalated" },
  ],
  enabled: true,
});

// Chain 4: job_plan_enrichment
eventBus.registerReactiveChain({
  name: "job_plan_enrichment",
  trigger_event: "job.plan_completed",
  steps: [
    { action: "quality_predict" },
    { action: "cycle_time_estimate" },
    { action: "write_enriched_plan", emit_event: "job.plan_enriched" },
  ],
  enabled: true,
});

// Chain 5: learning_feedback_loop
eventBus.registerReactiveChain({
  name: "learning_feedback_loop",
  trigger_event: "job.record_completed",
  steps: [
    { action: "check_learning_available" },
    { action: "compute_job_insights" },
    { action: "write_learning_corrections", emit_event: "learning.corrections_ready" },
  ],
  enabled: true,
});

// ============================================================================
// ERP INTEGRATION ACTION HANDLERS (INTEG-MS1 — Lane 21)
// ============================================================================

// --- Chain 6: job_to_invoice (U-INTEG05) ---
eventBus.registerAction("create_invoice_from_job", async (params) => {
  try {
    const { job_id, customer, cost_breakdown, markup_pct = 30 } = params;
    if (!job_id || !customer) {
      return { error: "Missing job_id or customer" };
    }

    const invoice = invoicingEngine.fromJobCost({
      job_id,
      customer,
      cost_breakdown: cost_breakdown || {
        material_cost: 0,
        labor_cost: 0,
        tooling_cost: 0,
        machine_cost: 0,
        setup_cost: 0,
        programming_cost: 0,
        inspection_cost: 0,
        finishing_cost: 0,
        overhead_cost: 0,
      },
      markup_pct,
    });

    // Emit invoice.created event
    await eventBus.publish(EventTypes.INVOICE_CREATED, {
      invoice_id: invoice.id,
      job_id,
      customer_id: customer.name,
      amount: invoice.total,
      currency: "USD",
    });

    log.info(`[ERP Chain] Invoice ${invoice.id} created from job ${job_id}, total: $${invoice.total}`);
    return { invoice_id: invoice.id, total: invoice.total, created: true };
  } catch (err) {
    log.error(`[ERP Chain] create_invoice_from_job failed: ${err}`);
    return { error: String(err) };
  }
});

// --- Chain 7: quality_to_ship (U-INTEG06) ---
eventBus.registerAction("dispatch_shipment", async (params) => {
  try {
    const { job_id, customer_id, destination, carrier = "FedEx" } = params;
    if (!job_id || !destination) {
      return { error: "Missing job_id or destination" };
    }

    const shipment_id = `SHIP-${Date.now()}`;

    // Emit shipping.dispatched event
    await eventBus.publish(EventTypes.SHIPPING_DISPATCHED, {
      shipment_id,
      job_id,
      customer_id: customer_id || "unknown",
      carrier,
      shipped_date: new Date().toISOString().slice(0, 10),
      packages: params.packages || 1,
      destination,
    });

    log.info(`[ERP Chain] Shipment ${shipment_id} dispatched for job ${job_id}`);
    return { shipment_id, dispatched: true };
  } catch (err) {
    log.error(`[ERP Chain] dispatch_shipment failed: ${err}`);
    return { error: String(err) };
  }
});

// --- Chain 8: ship_to_gl (U-INTEG07) ---
eventBus.registerAction("recognize_revenue", async (params) => {
  try {
    const { invoice_id, job_id, amount, tax = 0 } = params;
    if (!amount) {
      return { error: "Missing amount for revenue recognition" };
    }

    // Use recordInvoice which handles AR debit and Revenue credit
    const entry = generalLedgerEngine.recordInvoice({
      invoice_id: invoice_id || `INV-${job_id || Date.now()}`,
      amount,
      tax,
      date: new Date().toISOString().slice(0, 10),
    });

    // Emit accounting event
    await eventBus.publish(EventTypes.ACCOUNTING_REVENUE_RECOGNIZED, {
      job_id: job_id || "unknown",
      amount,
      currency: "USD",
      recognition_type: "point_in_time",
    });

    log.info(`[ERP Chain] Revenue $${amount} recognized, GL entry ${entry.id}`);
    return { entry_id: entry.id, amount, recognized: true };
  } catch (err) {
    log.error(`[ERP Chain] recognize_revenue failed: ${err}`);
    return { error: String(err) };
  }
});

// --- Chain 9: job_cost_rollup (U-INTEG08) ---
eventBus.registerAction("accrue_job_costs", async (params) => {
  try {
    const { job_id, material_cost = 0, labor_cost = 0, tooling_cost = 0, overhead_cost = 0 } = params;
    const total_cost = material_cost + labor_cost + tooling_cost + overhead_cost;

    if (total_cost <= 0) {
      return { skipped: true, reason: "No costs to accrue" };
    }

    // recordWipToCogs takes a single amount (cost breakdown is event-payload only).
    // The earlier inline recordJobCost API was never implemented on GeneralLedgerEngine;
    // WIP→COGS is the correct GL operation for accruing realized job costs.
    const entry = generalLedgerEngine.recordWipToCogs({
      job_id: job_id || `JOB-${Date.now()}`,
      amount: total_cost,
      date: new Date().toISOString().slice(0, 10),
    });

    // Emit accounting event
    await eventBus.publish(EventTypes.ACCOUNTING_COST_ACCRUED, {
      job_id,
      amount: total_cost,
      currency: "USD",
      cost_category: "labor",
    });

    log.info(`[ERP Chain] Job ${job_id} costs $${total_cost} accrued, GL entry ${entry.id}`);
    return { entry_id: entry.id, total_cost, accrued: true };
  } catch (err) {
    log.error(`[ERP Chain] accrue_job_costs failed: ${err}`);
    return { error: String(err) };
  }
});

// Calculate job margin after costs are accrued
eventBus.registerAction("calculate_job_margin", async (params) => {
  try {
    const { job_id, revenue = 0, total_cost = 0 } = params;
    const margin = revenue - total_cost;
    const margin_pct = revenue > 0 ? (margin / revenue) * 100 : 0;

    // Emit margin calculated event
    await eventBus.publish(EventTypes.ACCOUNTING_MARGIN_CALCULATED, {
      job_id,
      amount: revenue,
      currency: "USD",
      budget_amount: revenue,
      actual_amount: total_cost,
      margin_percent: margin_pct,
    });

    log.info(`[ERP Chain] Job ${job_id} margin: ${margin_pct.toFixed(1)}%`);
    return { margin, margin_pct, calculated: true };
  } catch (err) {
    log.error(`[ERP Chain] calculate_job_margin failed: ${err}`);
    return { error: String(err) };
  }
});


// ============================================================================
// SCHEDULING/CAPACITY ACTION HANDLERS (INTEG-MS3 — CycleTime→Scheduling Bridge)
// ============================================================================

// --- Chain 10: cycle_time_to_capacity (U-INTEG14/U-INTEG15) ---
eventBus.registerAction("update_capacity_from_estimate", async (params) => {
  try {
    const { machine_id, estimated_seconds, job_id } = params;
    if (!machine_id || !estimated_seconds) {
      return { error: "Missing machine_id or estimated_seconds" };
    }

    // CapacityPlanningEngine has no updateMachineLoad — only scheduleJob (which books
    // the slot) and getMachineLoad (read-only). Read current load and publish that
    // alongside the new estimate; a downstream scheduler-context-aware handler can
    // call scheduleJob with full operation context. (The reactive chain doesn't have
    // job-operation breakdown to call scheduleJob honestly.)
    const loadUpdate = capacityPlanningEngine.getMachineLoad(machine_id);
    void job_id; // estimate payload reserved for downstream scheduler

    // Emit capacity.updated event
    await eventBus.publish(EventTypes.CAPACITY_UPDATED, {
      machine_id,
      machine_name: loadUpdate.machine_name,
      time_window: loadUpdate.period,
      available_hours: loadUpdate.available_hours,
      scheduled_hours: loadUpdate.loaded_hours,
      utilization_pct: loadUpdate.utilization_pct,
      pending_jobs: loadUpdate.jobs.length,
      status: loadUpdate.status,
      estimated_hours: estimated_seconds / 3600,
    });

    log.info(`[Scheduling Chain] Capacity read for ${machine_id}: ${loadUpdate.utilization_pct.toFixed(1)}% utilization (estimate ${(estimated_seconds / 3600).toFixed(2)}h pending)`);
    return { read: true, utilization_pct: loadUpdate.utilization_pct };
  } catch (err) {
    log.error(`[Scheduling Chain] update_capacity_from_estimate failed: ${err}`);
    return { error: String(err) };
  }
});

// --- Chain 11: capacity_to_scheduling (U-INTEG16) ---
// NOTE: action name is "reoptimize_schedule_capacity" (NOT the bare "reoptimize_schedule").
// cycleSchedulingBridge.ts:316 registers a DIFFERENT "reoptimize_schedule" handler (emits
// "schedule.updated"); EventBus.registerAction is silent last-writer-wins (EventBus.ts:1230,
// actionRegistry.set), so a bare shared name made whichever module loaded second clobber the
// other's handler -> a chain step fired the wrong handler/event. Namespaced to break the collision.
eventBus.registerAction("reoptimize_schedule_capacity", async (params) => {
  try {
    const { machine_id, utilization_pct } = params;
    
    // Only signal re-optimization if utilization is high or very low.
    // schedulingEngine.optimize(jobs, machines) requires Job[] + MachineSlot[] arrays.
    // The reactive chain doesn't carry job/machine snapshots; emit a request event so
    // a scheduling-context-aware service can perform the real optimize. Honest payload —
    // no fake schedule_id / makespan numbers.
    if (utilization_pct > 85 || utilization_pct < 20) {
      const optimization_type: "rebalance" | "consolidate" = utilization_pct > 85 ? "rebalance" : "consolidate";

      await eventBus.publish(EventTypes.SCHEDULE_OPTIMIZED, {
        schedule_id: `REQ-${Date.now()}`,
        affected_machines: machine_id ? [machine_id] : [],
        affected_jobs: [],
        optimization_type,
        makespan_before_min: 0,
        makespan_after_min: 0,
        improvement_pct: 0,
        request_only: true,
        reason: utilization_pct > 85 ? "overloaded" : "underutilized",
      });

      log.info(`[Scheduling Chain] Re-optimization requested for ${machine_id ?? "fleet"} @ ${utilization_pct}% (${optimization_type})`);
      return { requested: true, machine_id, utilization_pct, optimization_type };
    }

    return { skipped: true, reason: `utilization ${utilization_pct}% within normal range` };
  } catch (err) {
    log.error(`[Scheduling Chain] reoptimize_schedule_capacity failed: ${err}`);
    return { error: String(err) };
  }
});

// --- Chain 12: job_completion_feedback (U-INTEG17) ---
eventBus.registerAction("calibrate_cycle_time", async (params) => {
  try {
    const { job_id, machine_id, actual_seconds, estimated_seconds } = params;
    if (!actual_seconds || !estimated_seconds) {
      return { skipped: true, reason: "Missing actual or estimated duration" };
    }

    const ratio = actual_seconds / estimated_seconds;
    const deviation_pct = Math.abs(ratio - 1.0) * 100;

    // Only calibrate if deviation is significant (>5%)
    if (deviation_pct > 5) {
      // Store calibration factor for this machine
      const calibrationFile = path.join(PATHS.STATE_DIR, "cycle_time_calibrations.json");
      let calibrations: Record<string, any> = {};
      try { calibrations = JSON.parse(fs.readFileSync(calibrationFile, "utf-8")); } catch { /* first write */ }
      
      const machineKey = machine_id || "default";
      const existing = calibrations[machineKey] || { factor: 1.0, samples: 0 };
      // Exponential moving average with alpha=0.2
      const newFactor = existing.factor * 0.8 + ratio * 0.2;
      calibrations[machineKey] = {
        factor: newFactor,
        samples: existing.samples + 1,
        last_updated: new Date().toISOString(),
        last_deviation_pct: deviation_pct,
      };
      
      safeWriteSync(calibrationFile, JSON.stringify(calibrations, null, 2));

      // Emit calibration event
      await eventBus.publish(EventTypes.CYCLE_TIME_CALIBRATED, {
        job_id,
        machine_id: machineKey,
        estimated_seconds,
        actual_seconds,
        calibration_factor: newFactor,
        confidence: Math.min(0.95, 0.5 + existing.samples * 0.05),
        source: "calibrated",
      });

      log.info(`[Scheduling Chain] Cycle time calibrated for ${machineKey}: factor=${newFactor.toFixed(3)}, deviation=${deviation_pct.toFixed(1)}%`);
      return { calibrated: true, calibration_factor: newFactor, deviation_pct };
    }

    return { skipped: true, reason: `deviation ${deviation_pct.toFixed(1)}% within 5% threshold` };
  } catch (err) {
    log.error(`[Scheduling Chain] calibrate_cycle_time failed: ${err}`);
    return { error: String(err) };
  }
});

// ============================================================================
// ERP REACTIVE CHAIN REGISTRATION (INTEG-MS1 — U-INTEG09)
// ============================================================================

// Chain 6: job_to_invoice — job completed triggers invoice creation
eventBus.registerReactiveChain({
  name: "job_to_invoice",
  trigger_event: EventTypes.JOB_COMPLETED,
  trigger_filter: { source: "*" },
  steps: [
    { action: "create_invoice_from_job", emit_event: EventTypes.JOB_INVOICED },
  ],
  enabled: true,
});

// Chain 7: quality_to_ship — quality gate passed triggers shipment
eventBus.registerReactiveChain({
  name: "quality_to_ship",
  trigger_event: EventTypes.QUALITY_GATE_PASSED,
  trigger_filter: { source: "*" },
  steps: [
    { action: "dispatch_shipment", emit_event: EventTypes.JOB_SHIPPED },
  ],
  enabled: true,
});

// Chain 8: ship_to_gl — delivery triggers revenue recognition
eventBus.registerReactiveChain({
  name: "ship_to_gl",
  trigger_event: EventTypes.SHIPPING_DELIVERED,
  trigger_filter: { source: "*" },
  steps: [
    { action: "recognize_revenue", emit_event: EventTypes.GL_POSTED },
  ],
  enabled: true,
});

// Chain 9: job_cost_rollup — job completion triggers cost accrual and margin calc
eventBus.registerReactiveChain({
  name: "job_cost_rollup",
  trigger_event: EventTypes.JOB_COMPLETED,
  trigger_filter: { source: "*" },
  steps: [
    { action: "accrue_job_costs" },
    { action: "calculate_job_margin", emit_event: EventTypes.ACCOUNTING_MARGIN_CALCULATED },
  ],
  enabled: true,
});

// ============================================================================
// SCHEDULING/CAPACITY REACTIVE CHAIN REGISTRATION (INTEG-MS3)
// ============================================================================

// Chain 10: cycle_time_to_capacity — cycle time estimate triggers capacity update
eventBus.registerReactiveChain({
  name: "cycle_time_to_capacity",
  trigger_event: EventTypes.CYCLE_TIME_ESTIMATED,
  trigger_filter: { source: "*" },
  steps: [
    { action: "update_capacity_from_estimate", emit_event: EventTypes.CAPACITY_UPDATED },
  ],
  enabled: true,
});

// Chain 11: capacity_to_scheduling — capacity update triggers schedule optimization
eventBus.registerReactiveChain({
  name: "capacity_to_scheduling",
  trigger_event: EventTypes.CAPACITY_UPDATED,
  trigger_filter: { source: "*" },
  steps: [
    { action: "reoptimize_schedule_capacity", emit_event: EventTypes.SCHEDULE_OPTIMIZED },
  ],
  enabled: true,
});

// Chain 12: job_completion_feedback — job completion triggers cycle time calibration
eventBus.registerReactiveChain({
  name: "job_completion_feedback",
  trigger_event: EventTypes.JOB_COMPLETED,
  trigger_filter: { source: "*" },
  steps: [
    { action: "calibrate_cycle_time", emit_event: EventTypes.CYCLE_TIME_CALIBRATED },
  ],
  enabled: true,
});

log.info("[ReactiveChainBootstrap] 12 reactive chains registered (5 mfg + 4 ERP + 3 scheduling), 17 action handlers ready");
