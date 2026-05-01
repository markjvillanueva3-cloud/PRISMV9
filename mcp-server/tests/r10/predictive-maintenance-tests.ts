/**
 * R10-Rev6 Predictive Maintenance Tests
 * ======================================
 * Validates: analyze, trend, predict, schedule, models, thresholds,
 * alerts, status, history, get, error paths.
 */

import { predictiveMaintenance } from "../../src/engines/PredictiveMaintenanceEngine.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

// ─── T1: Analyze — full machine analysis ──────────────────────────────────
console.log("T1: Analyze — MC-001 full");
{
  const r = predictiveMaintenance("maint_analyze", { machine_id: "MC-001" });
  assert(r.machine_id === "MC-001", "T1.1 machine ID");
  assert(r.analyzed_categories === 5, "T1.2 analyzed all 5 categories");
  assert(r.predictions.length === 5, "T1.3 5 predictions");
  assert(r.predictions[0].prediction_id.startsWith("PM-"), "T1.4 prediction ID format");
  assert(r.predictions[0].category !== undefined, "T1.5 has category");
  assert(r.predictions[0].severity !== undefined, "T1.6 has severity");
  assert(r.predictions[0].remaining_life_hours >= 0, "T1.7 remaining hours >= 0");
  assert(r.predictions[0].confidence_pct > 0, "T1.8 confidence > 0");
  assert(r.predictions[0].evidence.length >= 1, "T1.9 has evidence");
  assert(r.predictions[0].recommended_action.length > 10, "T1.10 has recommended action");
}

// ─── T2: Analyze — single category ───────────────────────────────────────
console.log("T2: Analyze — single category");
{
  const r = predictiveMaintenance("maint_analyze", { machine_id: "MC-001", category: "spindle_bearing" });
  assert(r.analyzed_categories === 1, "T2.1 single category");
  assert(r.predictions[0].category === "spindle_bearing", "T2.2 correct category");
  assert(r.predictions[0].component === "Spindle Bearing Assembly", "T2.3 component name");
}

// ─── T3: Analyze — machine not found ─────────────────────────────────────
console.log("T3: Analyze — not found");
{
  const r = predictiveMaintenance("maint_analyze", { machine_id: "MC-999" });
  assert(r.error !== undefined, "T3.1 error for missing machine");
}

// ─── T4: Trend — spindle bearing data ────────────────────────────────────
console.log("T4: Trend — spindle bearing");
{
  const r = predictiveMaintenance("maint_trend", { machine_id: "MC-001", category: "spindle_bearing" });
  assert(r.machine_id === "MC-001", "T4.1 machine ID");
  assert(r.category === "spindle_bearing", "T4.2 category");
  assert(r.component === "Spindle Bearing Assembly", "T4.3 component");
  assert(r.data_points === 12, "T4.4 12 data points");
  assert(r.data.length === 12, "T4.5 data array");
  assert(r.trend !== undefined, "T4.6 has trend");
  assert(r.trend.slope > 0, "T4.7 positive slope (degrading)");
  assert(r.trend.r_squared >= 0 && r.trend.r_squared <= 1, "T4.8 R² valid range");
  assert(r.trend.direction === "increasing", "T4.9 increasing direction");
  assert(r.current_value > 0, "T4.10 has current value");
  assert(r.normal_range !== undefined, "T4.11 has normal range");
  assert(r.warning_threshold > 0, "T4.12 has warning threshold");
  assert(r.critical_threshold > r.warning_threshold, "T4.13 critical > warning");
}

// ─── T5: Trend — missing category ────────────────────────────────────────
console.log("T5: Trend — missing category");
{
  const r = predictiveMaintenance("maint_trend", { machine_id: "MC-001" });
  assert(r.error !== undefined, "T5.1 error without category");
}

// ─── T6: Trend — machine not found ───────────────────────────────────────
console.log("T6: Trend — machine not found");
{
  const r = predictiveMaintenance("maint_trend", { machine_id: "MC-999", category: "spindle_bearing" });
  assert(r.error !== undefined, "T6.1 error for missing machine");
}

// ─── T7: Predict — single prediction ─────────────────────────────────────
console.log("T7: Predict — single");
{
  const r = predictiveMaintenance("maint_predict", { machine_id: "MC-002", category: "coolant" });
  assert(r.prediction_id.startsWith("PM-"), "T7.1 prediction ID");
  assert(r.category === "coolant", "T7.2 category");
  assert(r.machine_id === "MC-002", "T7.3 machine");
  assert(r.component === "Coolant System", "T7.4 component");
  assert(r.current_value > 0, "T7.5 current value");
  assert(r.threshold_value > 0, "T7.6 threshold");
  assert(r.trend !== undefined, "T7.7 has trend");
  assert(r.severity !== undefined, "T7.8 has severity");
  assert(r.schedule_within.length > 3, "T7.9 has schedule");
  assert(r.cost_of_delay.length > 10, "T7.10 has cost of delay");
}

// ─── T8: Predict — missing category ──────────────────────────────────────
console.log("T8: Predict — no category");
{
  const r = predictiveMaintenance("maint_predict", { machine_id: "MC-001" });
  assert(r.error !== undefined, "T8.1 error without category");
}

// ─── T9: Schedule — maintenance schedule ──────────────────────────────────
console.log("T9: Schedule");
{
  const r = predictiveMaintenance("maint_schedule", {});
  assert(r.total_machines === 3, "T9.1 3 machines");
  assert(r.total_predictions >= 15, "T9.2 at least 15 predictions (5 × 3)");
  assert(r.summary !== undefined, "T9.3 has summary");
  assert(r.summary.critical >= 0, "T9.4 has critical count");
  assert(r.summary.warning >= 0, "T9.5 has warning count");
  assert(r.summary.watch >= 0, "T9.6 has watch count");
  assert(r.summary.normal >= 0, "T9.7 has normal count");
  assert(r.schedule.length >= 15, "T9.8 schedule has all predictions");
  assert(r.schedule[0].prediction_id !== undefined, "T9.9 schedule entry has prediction_id");
  assert(r.schedule[0].severity !== undefined, "T9.10 schedule entry has severity");
}

// ─── T10: Schedule — urgent items sorted by severity ──────────────────────
console.log("T10: Schedule — urgent sorting");
{
  const r = predictiveMaintenance("maint_schedule", {});
  if (r.urgent.length >= 2) {
    const severityOrder: Record<string, number> = { critical: 0, warning: 1 };
    for (let i = 1; i < r.urgent.length; i++) {
      const prev = severityOrder[r.urgent[i - 1].severity] ?? 2;
      const curr = severityOrder[r.urgent[i].severity] ?? 2;
      assert(prev <= curr, `T10.1 urgent sorted: ${r.urgent[i - 1].severity} before ${r.urgent[i].severity}`);
    }
  }
  assert(r.urgent.every((u: any) => u.severity === "critical" || u.severity === "warning"), "T10.2 urgent only critical/warning");
}

// ─── T11: Models — list all ──────────────────────────────────────────────
console.log("T11: Models");
{
  const r = predictiveMaintenance("maint_models", {});
  assert(r.total === 5, "T11.1 5 models");
  assert(r.models.length === 5, "T11.2 models array");
  const categories = r.models.map((m: any) => m.category);
  assert(categories.includes("spindle_bearing"), "T11.3 has spindle_bearing");
  assert(categories.includes("ballscrew"), "T11.4 has ballscrew");
  assert(categories.includes("way_lube"), "T11.5 has way_lube");
  assert(categories.includes("coolant"), "T11.6 has coolant");
  assert(categories.includes("tool_holder"), "T11.7 has tool_holder");
  for (const m of r.models) {
    assert(m.component.length > 5, `T11 ${m.category} has component name`);
    assert(m.signal.length > 10, `T11 ${m.category} has signal description`);
    assert(m.detection_method.length > 10, `T11 ${m.category} has detection method`);
    assert(m.unit.length > 0, `T11 ${m.category} has unit`);
    assert(m.warning > 0, `T11 ${m.category} has warning threshold`);
    assert(m.critical > m.warning, `T11 ${m.category} critical > warning`);
    assert(m.typical_life_hours > 0, `T11 ${m.category} has typical life`);
    assert(m.replacement_cost_usd > 0, `T11 ${m.category} has cost`);
    assert(m.downtime_hours >= 0, `T11 ${m.category} has downtime`);
  }
}

// ─── T12: Thresholds — all categories ────────────────────────────────────
console.log("T12: Thresholds — all");
{
  const r = predictiveMaintenance("maint_thresholds", {});
  assert(r.thresholds.length === 5, "T12.1 5 threshold entries");
}

// ─── T13: Thresholds — specific category ─────────────────────────────────
console.log("T13: Thresholds — specific");
{
  const r = predictiveMaintenance("maint_thresholds", { category: "ballscrew" });
  assert(r.category === "ballscrew", "T13.1 category");
  assert(r.component === "Ballscrew Assembly", "T13.2 component");
  assert(r.unit === "mm", "T13.3 unit");
  assert(r.warning === 0.015, "T13.4 warning threshold");
  assert(r.critical === 0.025, "T13.5 critical threshold");
}

// ─── T14: Thresholds — unknown category ──────────────────────────────────
console.log("T14: Thresholds — unknown");
{
  const r = predictiveMaintenance("maint_thresholds", { category: "flux_capacitor" });
  assert(r.error !== undefined, "T14.1 error for unknown category");
}

// ─── T15: Alerts — generated from analysis ───────────────────────────────
console.log("T15: Alerts");
{
  // Run analysis first to generate alerts
  predictiveMaintenance("maint_analyze", { machine_id: "MC-001" });
  predictiveMaintenance("maint_analyze", { machine_id: "MC-002" });
  predictiveMaintenance("maint_analyze", { machine_id: "MC-003" });
  const r = predictiveMaintenance("maint_alerts", {});
  assert(r.total >= 1, "T15.1 has alerts from analysis");
  assert(r.alerts[0].alert_id.startsWith("MA-"), "T15.2 alert ID format");
  assert(r.alerts[0].prediction_id.startsWith("PM-"), "T15.3 linked to prediction");
  assert(r.alerts[0].severity === "critical" || r.alerts[0].severity === "warning", "T15.4 alert severity");
  assert(r.alerts[0].message.length > 10, "T15.5 has message");
}

// ─── T16: Alerts — filter by machine ─────────────────────────────────────
console.log("T16: Alerts — by machine");
{
  const r = predictiveMaintenance("maint_alerts", { machine_id: "MC-002" });
  assert(r.alerts.every((a: any) => a.machine_id === "MC-002"), "T16.1 all from MC-002");
}

// ─── T17: Status — single machine ───────────────────────────────────────
console.log("T17: Status — single machine");
{
  const r = predictiveMaintenance("maint_status", { machine_id: "MC-001" });
  assert(r.machine_id === "MC-001", "T17.1 machine ID");
  assert(r.machine_name === "Haas VF-2SS", "T17.2 machine name");
  assert(r.hours_since_service === 7500, "T17.3 hours since service");
  assert(["healthy", "fair", "degraded", "critical"].includes(r.overall_health), "T17.4 valid health status");
  assert(["normal", "watch", "warning", "critical"].includes(r.overall_severity), "T17.5 valid severity");
  assert(r.components.length === 5, "T17.6 5 components");
  for (const c of r.components) {
    assert(c.category !== undefined, `T17 ${c.component} has category`);
    assert(c.severity !== undefined, `T17 ${c.component} has severity`);
    assert(c.current_value !== undefined, `T17 ${c.component} has current value`);
    assert(c.recommended_action.length > 10, `T17 ${c.component} has action`);
  }
}

// ─── T18: Status — all machines ──────────────────────────────────────────
console.log("T18: Status — all machines");
{
  const r = predictiveMaintenance("maint_status", {});
  assert(r.total_machines === 3, "T18.1 3 machines");
  assert(r.machines.length === 3, "T18.2 machines array");
  const ids = r.machines.map((m: any) => m.machine_id);
  assert(ids.includes("MC-001"), "T18.3 has MC-001");
  assert(ids.includes("MC-002"), "T18.4 has MC-002");
  assert(ids.includes("MC-003"), "T18.5 has MC-003");
  for (const m of r.machines) {
    assert(m.machine_name.length > 3, `T18 ${m.machine_id} has name`);
    assert(["healthy", "fair", "degraded", "critical"].includes(m.overall_health), `T18 ${m.machine_id} valid health`);
  }
}

// ─── T19: Status — machine not found ─────────────────────────────────────
console.log("T19: Status — not found");
{
  const r = predictiveMaintenance("maint_status", { machine_id: "MC-999" });
  assert(r.error !== undefined, "T19.1 error for missing machine");
}

// ─── T20: History — accumulated predictions ──────────────────────────────
console.log("T20: History");
{
  const r = predictiveMaintenance("maint_history", {});
  assert(r.total >= 15, "T20.1 accumulated predictions");
  assert(r.by_severity !== undefined, "T20.2 has severity breakdown");
  assert(r.by_category !== undefined, "T20.3 has category breakdown");
  assert(r.by_category.spindle_bearing >= 0, "T20.4 has spindle count");
  assert(r.by_category.ballscrew >= 0, "T20.5 has ballscrew count");
  assert(r.predictions.length === r.total, "T20.6 predictions match total");
}

// ─── T21: History — filter by machine ────────────────────────────────────
console.log("T21: History — by machine");
{
  const r = predictiveMaintenance("maint_history", { machine_id: "MC-001" });
  assert(r.predictions.every((p: any) => p.machine_id === "MC-001"), "T21.1 all from MC-001");
}

// ─── T22: Get — specific prediction ──────────────────────────────────────
console.log("T22: Get — specific");
{
  const r = predictiveMaintenance("maint_get", { prediction_id: "PM-0001" });
  assert(r.prediction_id === "PM-0001", "T22.1 correct ID");
  assert(r.category !== undefined, "T22.2 has category");
  assert(r.severity !== undefined, "T22.3 has severity");
  assert(r.machine_id !== undefined, "T22.4 has machine_id");
  assert(r.evidence.length >= 1, "T22.5 has evidence");
}

// ─── T23: Get — not found ────────────────────────────────────────────────
console.log("T23: Get — not found");
{
  const r = predictiveMaintenance("maint_get", { prediction_id: "PM-NOPE" });
  assert(r.error !== undefined, "T23.1 error for missing prediction");
}

// ─── T24: Get — missing param ────────────────────────────────────────────
console.log("T24: Get — no prediction_id");
{
  const r = predictiveMaintenance("maint_get", {});
  assert(r.error !== undefined, "T24.1 error without prediction_id");
}

// ─── T25: Unknown action ─────────────────────────────────────────────────
console.log("T25: Unknown action");
{
  const r = predictiveMaintenance("maint_nonexistent", {});
  assert(r.error !== undefined, "T25.1 unknown action returns error");
}

// ─── T26: MC-001 spindle bearing is degrading ────────────────────────────
console.log("T26: MC-001 spindle degradation");
{
  const r = predictiveMaintenance("maint_predict", { machine_id: "MC-001", category: "spindle_bearing" });
  // MC-001 spindle goes from 1.2 to 5.1 over 12 months — should be warning or critical
  assert(r.severity === "warning" || r.severity === "critical", "T26.1 spindle degraded");
  assert(r.trend.direction === "increasing", "T26.2 increasing trend");
  assert(r.remaining_life_hours >= 0, "T26.3 remaining hours");
}

// ─── T27: MC-002 coolant is degrading ────────────────────────────────────
console.log("T27: MC-002 coolant degradation");
{
  const r = predictiveMaintenance("maint_predict", { machine_id: "MC-002", category: "coolant" });
  // MC-002 coolant goes from 2 to 22 — exceeds warning threshold 15
  assert(r.severity === "warning" || r.severity === "critical", "T27.1 coolant degraded");
  assert(r.current_value > 15, "T27.2 current value exceeds warning");
}

// ─── T28: MC-002 ballscrew is degrading ──────────────────────────────────
console.log("T28: MC-002 ballscrew degradation");
{
  const r = predictiveMaintenance("maint_predict", { machine_id: "MC-002", category: "ballscrew" });
  // MC-002 ballscrew goes from 0.003 to 0.018 — exceeds warning 0.015
  assert(r.severity === "warning" || r.severity === "watch", "T28.1 ballscrew showing wear");
  assert(r.trend.direction === "increasing", "T28.2 increasing backlash");
}

// ─── T29: MC-003 way lube is degrading ───────────────────────────────────
console.log("T29: MC-003 way lube degradation");
{
  const r = predictiveMaintenance("maint_predict", { machine_id: "MC-003", category: "way_lube" });
  // MC-003 way lube goes from 5 to 25 — exceeds warning 15
  assert(r.severity === "warning" || r.severity === "critical", "T29.1 way lube degraded");
}

// ─── T30: MC-003 tool holder showing wear ────────────────────────────────
console.log("T30: MC-003 tool holder");
{
  const r = predictiveMaintenance("maint_predict", { machine_id: "MC-003", category: "tool_holder" });
  // MC-003 tool holder goes from 0.005 to 0.016 — exceeds warning 0.012
  assert(r.severity === "warning" || r.severity === "watch", "T30.1 tool holder showing wear");
}

// ─── T31: Healthy components on MC-002 ───────────────────────────────────
console.log("T31: Healthy components");
{
  const r1 = predictiveMaintenance("maint_predict", { machine_id: "MC-002", category: "spindle_bearing" });
  assert(r1.severity === "normal", "T31.1 MC-002 spindle is normal");
  const r2 = predictiveMaintenance("maint_predict", { machine_id: "MC-002", category: "tool_holder" });
  assert(r2.severity === "normal", "T31.2 MC-002 tool holder is normal");
}

// ─── T32: All machines produce valid predictions ─────────────────────────
console.log("T32: All machines valid");
{
  const machines = ["MC-001", "MC-002", "MC-003"];
  const categories = ["spindle_bearing", "ballscrew", "way_lube", "coolant", "tool_holder"];
  for (const m of machines) {
    for (const c of categories) {
      const r = predictiveMaintenance("maint_predict", { machine_id: m, category: c });
      assert(r.prediction_id !== undefined, `T32 ${m}/${c} has prediction_id`);
      assert(r.confidence_pct > 0, `T32 ${m}/${c} has confidence`);
      assert(["normal", "watch", "warning", "critical"].includes(r.severity), `T32 ${m}/${c} valid severity`);
    }
  }
}

// ─── T33: Evidence quality ───────────────────────────────────────────────
console.log("T33: Evidence quality");
{
  const r = predictiveMaintenance("maint_predict", { machine_id: "MC-001", category: "spindle_bearing" });
  assert(r.evidence.length >= 2, "T33.1 multiple evidence items");
  assert(r.evidence.some((e: string) => e.includes("mm/s RMS")), "T33.2 evidence includes unit");
  assert(r.evidence.some((e: string) => e.includes("normal range")), "T33.3 evidence mentions normal range");
}

// ─── T34: Trend R² correlation quality ───────────────────────────────────
console.log("T34: Trend R² quality");
{
  // MC-001 spindle has a clear upward trend (1.2 → 5.1), should have decent R²
  const r = predictiveMaintenance("maint_trend", { machine_id: "MC-001", category: "spindle_bearing" });
  assert(r.trend.r_squared >= 0.5, "T34.1 decent R² for clear trend");
  assert(r.trend.rate_per_month > 0, "T34.2 positive rate per month");
}

// ─── Summary ────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(60)}`);
console.log(`R10-Rev6 Predictive Maintenance: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"=".repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
