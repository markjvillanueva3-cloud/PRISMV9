/**
 * R9-MS5 Measurement & Inspection Integration Tests
 * ===================================================
 * Validates: CMM import, surface finish comparison, in-machine probing,
 * drift analysis, calibration bias detection, dispatcher routing.
 */

import {
  measurementIntegration, importCMMData, compareSurfaceFinish,
  recordProbeData, analyzeDrift, detectCalibrationBias,
} from "../../src/engines/MeasurementIntegrationEngine.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

// ─── T1: measure_cmm_import — basic ──────────────────────────────────────────
console.log("T1: measure_cmm_import — basic");
{
  const r = measurementIntegration("measure_cmm_import", {
    machine: "CMM-01",
    part_number: "BRACKET-A",
    operation: "Final Inspection",
    measurements: [
      { feature_name: "Length", nominal: 100, tolerance_plus: 0.1, tolerance_minus: -0.1, actual: 100.05, unit: "mm" },
      { feature_name: "Width", nominal: 50, tolerance_plus: 0.05, tolerance_minus: -0.05, actual: 50.02, unit: "mm" },
      { feature_name: "Hole Dia", nominal: 10, tolerance_plus: 0.02, tolerance_minus: -0.02, actual: 10.01, unit: "mm" },
    ],
  });
  assert(r.report_id.startsWith("CMM-"), "T1.1 report ID format");
  assert(r.part_number === "BRACKET-A", "T1.2 part number");
  assert(r.measurements.length === 3, "T1.3 3 measurements");
  assert(r.summary.total_features === 3, "T1.4 total features 3");
  assert(r.summary.in_spec === 3, "T1.5 all 3 in spec");
  assert(r.summary.out_of_spec === 0, "T1.6 0 out of spec");
  assert(r.summary.pass === true, "T1.7 pass = true");
  assert(r.summary.cpk_estimate > 0, "T1.8 cpk > 0");
}

// ─── T2: measure_cmm_import — out of spec ────────────────────────────────────
console.log("T2: measure_cmm_import — out of spec");
{
  const r = measurementIntegration("measure_cmm_import", {
    part_number: "SHAFT-B",
    measurements: [
      { feature_name: "OD", nominal: 25, tolerance_plus: 0.02, tolerance_minus: -0.02, actual: 25.05, unit: "mm" },
      { feature_name: "Length", nominal: 100, tolerance_plus: 0.1, tolerance_minus: -0.1, actual: 100.03, unit: "mm" },
    ],
  });
  assert(r.summary.pass === false, "T2.1 fail (OD out of spec)");
  assert(r.summary.out_of_spec === 1, "T2.2 1 out of spec");
  assert(r.summary.worst_deviation !== null, "T2.3 has worst deviation");
  assert(r.summary.worst_deviation!.feature === "OD", "T2.4 worst is OD");
}

// ─── T3: measure_cmm_import — deviations computed ───────────────────────────
console.log("T3: measure_cmm_import — deviation calc");
{
  const r = measurementIntegration("measure_cmm_import", {
    measurements: [
      { feature_name: "Bore", nominal: 20, tolerance_plus: 0.05, tolerance_minus: -0.05, actual: 20.03, unit: "mm" },
    ],
  });
  const m = r.measurements[0];
  assert(m.deviation === 0.03, "T3.1 deviation = 0.03");
  assert(m.in_spec === true, "T3.2 in spec");
  assert(m.deviation_pct > 0, "T3.3 deviation_pct > 0");
}

// ─── T4: measure_cmm_history — retrieve ──────────────────────────────────────
console.log("T4: measure_cmm_history");
{
  const r = measurementIntegration("measure_cmm_history", {});
  assert(r.total >= 3, "T4.1 at least 3 reports from T1-T3");
  assert(Array.isArray(r.reports), "T4.2 reports is array");
  assert(typeof r.pass_rate === "number", "T4.3 has pass rate");
}

// ─── T5: measure_cmm_history — filter by part ───────────────────────────────
console.log("T5: measure_cmm_history — filter");
{
  const r = measurementIntegration("measure_cmm_history", { part_number: "BRACKET-A" });
  assert(r.total >= 1, "T5.1 found BRACKET-A reports");
}

// ─── T6: measure_cmm_get — retrieve specific ────────────────────────────────
console.log("T6: measure_cmm_get");
{
  const r = measurementIntegration("measure_cmm_get", { report_id: "CMM-0001" });
  assert(r.report_id === "CMM-0001", "T6.1 found report");
  assert(r.measurements.length > 0, "T6.2 has measurements");
}

// ─── T7: measure_cmm_get — not found ────────────────────────────────────────
console.log("T7: measure_cmm_get — not found");
{
  const r = measurementIntegration("measure_cmm_get", { report_id: "CMM-NOPE" });
  assert(r.error !== undefined, "T7.1 error for missing report");
}

// ─── T8: measure_surface — predicted vs measured ─────────────────────────────
console.log("T8: measure_surface — comparison");
{
  const r = measurementIntegration("measure_surface", {
    predicted_ra_um: 1.6,
    measured_ra_um: 1.4,
    predicted_rz_um: 6.4,
    measured_rz_um: 5.8,
  });
  assert(r.measurement_id.startsWith("SF-"), "T8.1 ID format");
  assert(r.predicted_ra_um === 1.6, "T8.2 predicted Ra");
  assert(r.measured_ra_um === 1.4, "T8.3 measured Ra");
  assert(r.ra_error_pct > 0, "T8.4 Ra error > 0");
  assert(r.rz_error_pct > 0, "T8.5 Rz error > 0");
  assert(["excellent", "good", "fair", "poor"].includes(r.model_accuracy), "T8.6 valid accuracy");
  assert(r.correction_factor > 0, "T8.7 correction factor > 0");
}

// ─── T9: measure_surface — excellent accuracy ────────────────────────────────
console.log("T9: measure_surface — excellent accuracy");
{
  const r = measurementIntegration("measure_surface", {
    predicted_ra_um: 1.6,
    measured_ra_um: 1.55,
  });
  assert(r.model_accuracy === "excellent", "T9.1 < 10% error → excellent");
  assert(r.ra_error_pct < 10, "T9.2 ra error < 10%");
}

// ─── T10: measure_surface — poor accuracy ────────────────────────────────────
console.log("T10: measure_surface — poor accuracy");
{
  const r = measurementIntegration("measure_surface", {
    predicted_ra_um: 1.0,
    measured_ra_um: 2.0,
  });
  assert(r.model_accuracy === "poor", "T10.1 100% error → poor");
}

// ─── T11: measure_surface_history ────────────────────────────────────────────
console.log("T11: measure_surface_history");
{
  const r = measurementIntegration("measure_surface_history", {});
  assert(r.total >= 3, "T11.1 at least 3 surface results from T8-T10");
  assert(typeof r.avg_ra_error_pct === "number", "T11.2 has avg Ra error");
}

// ─── T12: measure_probe_record — basic ───────────────────────────────────────
console.log("T12: measure_probe_record — basic");
{
  const r = measurementIntegration("measure_probe_record", {
    machine: "Haas-VF2",
    feature: "Bore-1",
    nominal: 25.0,
    measured: 25.01,
    part_count: 1,
  });
  assert(r.probe_id.startsWith("PRB-"), "T12.1 probe ID format");
  assert(r.machine === "Haas-VF2", "T12.2 machine echoed");
  assert(r.feature === "Bore-1", "T12.3 feature echoed");
  assert(r.deviation === 0.01, "T12.4 deviation = 0.01");
}

// ─── T13: measure_probe_record — multiple readings for drift ─────────────────
console.log("T13: measure_probe_record — multiple readings");
{
  // Record a series of increasing deviations to simulate drift
  for (let i = 2; i <= 10; i++) {
    measurementIntegration("measure_probe_record", {
      machine: "Haas-VF2",
      feature: "Bore-1",
      nominal: 25.0,
      measured: 25.0 + i * 0.002, // increasing drift: 0.004, 0.006, ..., 0.020
      part_count: i,
    });
  }
  const history = measurementIntegration("measure_probe_history", {
    machine: "Haas-VF2",
    feature: "Bore-1",
  });
  assert(history.total === 10, "T13.1 10 readings total");
  assert(history.readings.length === 10, "T13.2 10 readings in array");
}

// ─── T14: measure_probe_drift — detect positive drift ────────────────────────
console.log("T14: measure_probe_drift — positive drift");
{
  const r = measurementIntegration("measure_probe_drift", {
    machine: "Haas-VF2",
    feature: "Bore-1",
    tolerance: 0.05,
  });
  assert(r.direction === "positive", "T14.1 positive drift direction");
  assert(r.rate_um_per_part > 0, "T14.2 positive drift rate");
  assert(r.total_drift_um > 0, "T14.3 total drift > 0");
  assert(r.parts_to_tolerance > 0, "T14.4 parts to tolerance > 0");
  assert(["none", "adjust_offset", "inspect_tool", "stop_machine"].includes(r.action), "T14.5 valid action");
  assert(r.recommended_offset !== undefined, "T14.6 has recommended offset");
}

// ─── T15: measure_probe_drift — stable (few readings) ───────────────────────
console.log("T15: measure_probe_drift — stable");
{
  // Record just 1 reading on a different feature
  measurementIntegration("measure_probe_record", {
    machine: "DMG-DMU50",
    feature: "Face-Z",
    nominal: 0,
    measured: 0.001,
    part_count: 1,
  });
  const r = measurementIntegration("measure_probe_drift", {
    machine: "DMG-DMU50",
    feature: "Face-Z",
  });
  assert(r.direction === "stable", "T15.1 stable with < 2 readings");
  assert(r.action === "none", "T15.2 no action needed");
}

// ─── T16: measure_probe_history ──────────────────────────────────────────────
console.log("T16: measure_probe_history");
{
  const r = measurementIntegration("measure_probe_history", {
    machine: "Haas-VF2",
    feature: "Bore-1",
  });
  assert(r.machine === "Haas-VF2", "T16.1 machine");
  assert(r.feature === "Bore-1", "T16.2 feature");
  assert(r.total === 10, "T16.3 total 10");
}

// ─── T17: measure_bias_detect — with bias ────────────────────────────────────
console.log("T17: measure_bias_detect — with systematic bias");
{
  // Record consistent positive bias on a new feature
  for (let i = 0; i < 5; i++) {
    measurementIntegration("measure_probe_record", {
      machine: "Haas-VF2",
      feature: "Bore-X-axis",
      nominal: 50.0,
      measured: 50.005, // consistent +5µm bias
      part_count: i + 1,
    });
  }
  const r = measurementIntegration("measure_bias_detect", { machine: "Haas-VF2" });
  assert(r.biases.length >= 1, "T17.1 at least 1 bias detected");
  const xBias = r.biases.find((b: any) => b.axis === "X");
  assert(xBias !== undefined, "T17.2 found X-axis bias");
  assert(xBias!.bias_um > 2, "T17.3 bias > 2µm");
  assert(xBias!.sample_count === 5, "T17.4 sample count 5");
  assert(xBias!.confidence > 0, "T17.5 confidence > 0");
  assert(xBias!.recommendation.length > 0, "T17.6 has recommendation");
}

// ─── T18: measure_bias_detect — no bias ──────────────────────────────────────
console.log("T18: measure_bias_detect — no bias for unknown machine");
{
  const r = measurementIntegration("measure_bias_detect", { machine: "Unknown-Machine" });
  assert(r.biases.length === 0, "T18.1 no biases for unknown machine");
}

// ─── T19: measure_summary — overall health ───────────────────────────────────
console.log("T19: measure_summary");
{
  const r = measurementIntegration("measure_summary", {});
  assert(r.cmm.reports >= 3, "T19.1 cmm reports >= 3");
  assert(typeof r.cmm.pass_rate_pct === "number", "T19.2 has cmm pass rate");
  assert(r.surface.comparisons >= 3, "T19.3 surface comparisons >= 3");
  assert(typeof r.surface.avg_ra_error_pct === "number", "T19.4 has avg Ra error");
  assert(r.probing.features_tracked >= 2, "T19.5 probing features >= 2");
  assert(["good", "needs_attention"].includes(r.overall_health), "T19.6 valid health status");
}

// ─── T20: Direct API — importCMMData ─────────────────────────────────────────
console.log("T20: Direct API — importCMMData");
{
  const r = importCMMData({
    part_number: "DIRECT-TEST",
    measurements: [
      { feature_name: "L", nominal: 100, tolerance_plus: 0.5, tolerance_minus: -0.5, actual: 100.1, unit: "mm" },
    ],
  });
  assert(r.report_id.startsWith("CMM-"), "T20.1 direct import works");
  assert(r.part_number === "DIRECT-TEST", "T20.2 part number");
}

// ─── T21: Direct API — compareSurfaceFinish ──────────────────────────────────
console.log("T21: Direct API — compareSurfaceFinish");
{
  const r = compareSurfaceFinish({ predicted_ra_um: 0.8, measured_ra_um: 0.9 });
  assert(r.measurement_id.startsWith("SF-"), "T21.1 direct compare works");
  assert(r.correction_factor > 1, "T21.2 correction > 1 (under-predicted)");
}

// ─── T22: Direct API — recordProbeData + analyzeDrift ────────────────────────
console.log("T22: Direct API — recordProbeData + analyzeDrift");
{
  for (let i = 0; i < 5; i++) {
    recordProbeData({
      machine: "Direct-Mill",
      feature: "Slot-1",
      nominal: 10,
      measured: 10 + i * 0.001,
      part_count: i + 1,
    });
  }
  const drift = analyzeDrift({ machine: "Direct-Mill", feature: "Slot-1" });
  assert(drift.direction !== undefined, "T22.1 has direction");
  assert(typeof drift.rate_um_per_part === "number", "T22.2 has rate");
}

// ─── T23: Direct API — detectCalibrationBias ─────────────────────────────────
console.log("T23: Direct API — detectCalibrationBias");
{
  const biases = detectCalibrationBias({});
  assert(Array.isArray(biases), "T23.1 returns array");
}

// ─── T24: measure_cmm_import — defaults ──────────────────────────────────────
console.log("T24: measure_cmm_import — defaults");
{
  const r = measurementIntegration("measure_cmm_import", {});
  assert(r.report_id.startsWith("CMM-"), "T24.1 auto-generated ID");
  assert(r.summary.total_features === 0, "T24.2 no features with empty input");
  assert(r.summary.pass === true, "T24.3 empty = pass (no failures)");
}

// ─── T25: Edge — unknown action ──────────────────────────────────────────────
console.log("T25: Edge — unknown action");
{
  const r = measurementIntegration("measure_nonexistent", {});
  assert(r.error !== undefined, "T25.1 unknown action returns error");
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(60)}`);
console.log(`R9-MS5 Measurement Integration: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"=".repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
