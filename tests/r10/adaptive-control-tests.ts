/**
 * R10-Rev9 — Real-Time Adaptive Machining tests
 * Tests: adaptive_chipload, adaptive_chatter, adaptive_wear, adaptive_thermal,
 *        adaptive_override, adaptive_status, adaptive_config, adaptive_log,
 *        adaptive_history, adaptive_get
 */
import { adaptiveControl } from "../../src/engines/AdaptiveControlEngine.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string) {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log(`  FAIL: ${label}`); }
}

// ─── T1: adaptive_status — initial state ────────────────────────────────────

console.log("T1: Status — initial state");
const t1 = adaptiveControl("adaptive_status");
assert(t1.config !== undefined, "T1.1 has config");
const cfg = t1.config as any;
assert(cfg.mode === "full_adaptive", "T1.2 default mode is full_adaptive");
assert(cfg.chipload_tolerance_pct === 15, "T1.3 default chipload tolerance");
assert(cfg.chatter_threshold_mm_s === 2.5, "T1.4 default chatter threshold");
assert(cfg.wear_replacement_pct === 85, "T1.5 default wear replacement");

// ─── T2: adaptive_chipload — nominal ────────────────────────────────────────

console.log("T2: Chipload — nominal");
const t2 = adaptiveControl("adaptive_chipload", {
  target_chipload_mm: 0.1,
  feed_rate_mmpm: 2000,
  spindle_rpm: 5000,
  flutes: 4,
  engagement_angle_deg: 90,
  spindle_load_pct: 50,
  tool_diameter_mm: 12,
});
assert(t2.target_chipload_mm === 0.1, "T2.1 correct target");
assert((t2.actual_chipload_mm as number) > 0, "T2.2 computed actual chipload");
assert((t2.feed_override_pct as number) > 0, "T2.3 has feed override");
assert((t2.force_ratio as number) > 0, "T2.4 has force ratio");
assert(t2.recommendation !== undefined, "T2.5 has recommendation");

// ─── T3: adaptive_chipload — corner entry (high engagement) ─────────────────

console.log("T3: Chipload — corner entry");
const t3 = adaptiveControl("adaptive_chipload", {
  target_chipload_mm: 0.1,
  feed_rate_mmpm: 2000,
  spindle_rpm: 5000,
  flutes: 4,
  engagement_angle_deg: 180,
  spindle_load_pct: 55,
});
const t3nom = adaptiveControl("adaptive_chipload", {
  target_chipload_mm: 0.1,
  feed_rate_mmpm: 2000,
  spindle_rpm: 5000,
  flutes: 4,
  engagement_angle_deg: 90,
  spindle_load_pct: 50,
});
// At 180deg engagement, feed should be reduced compared to 90deg
assert((t3.feed_override_pct as number) < (t3nom.feed_override_pct as number), "T3.1 feed reduced for corner entry");

// ─── T4: adaptive_chipload — light engagement ───────────────────────────────

console.log("T4: Chipload — light engagement");
const t4 = adaptiveControl("adaptive_chipload", {
  target_chipload_mm: 0.1,
  feed_rate_mmpm: 2000,
  spindle_rpm: 5000,
  flutes: 4,
  engagement_angle_deg: 30,
  spindle_load_pct: 25,
});
// Light engagement → feed can increase
assert((t4.feed_override_pct as number) > (t3nom.feed_override_pct as number), "T4.1 feed increased for light engagement");

// ─── T5: adaptive_chipload — emergency stop ─────────────────────────────────

console.log("T5: Chipload — emergency stop");
const t5 = adaptiveControl("adaptive_chipload", {
  target_chipload_mm: 0.1,
  feed_rate_mmpm: 2000,
  spindle_rpm: 5000,
  flutes: 4,
  engagement_angle_deg: 90,
  spindle_load_pct: 98,
});
assert((t5.feed_override_pct as number) === 0, "T5.1 feed = 0 for emergency load");
const alerts5 = t5.alerts as any[];
assert(alerts5.some((a: any) => a.level === "emergency_stop"), "T5.2 emergency alert issued");

// ─── T6: adaptive_chipload — high load warning ──────────────────────────────

console.log("T6: Chipload — high load warning");
const t6 = adaptiveControl("adaptive_chipload", {
  target_chipload_mm: 0.1,
  feed_rate_mmpm: 2000,
  spindle_rpm: 5000,
  flutes: 4,
  engagement_angle_deg: 90,
  spindle_load_pct: 85,
});
const alerts6 = t6.alerts as any[];
assert(alerts6.some((a: any) => a.level === "warning"), "T6.1 warning for high load");
assert((t6.feed_override_pct as number) <= 90, "T6.2 feed capped at 90% for high load");

// ─── T7: adaptive_chatter — no chatter ──────────────────────────────────────

console.log("T7: Chatter — no chatter");
const t7 = adaptiveControl("adaptive_chatter", {
  vibration_mm_s: 1.0,
  spindle_rpm: 5000,
  dominant_frequency_hz: 400,
  flutes: 4,
  tool_diameter_mm: 12,
});
assert(t7.is_chatter === false, "T7.1 no chatter detected");
assert((t7.spindle_override_pct as number) === 100, "T7.2 no spindle change");
assert((t7.feed_adjustment_pct as number) === 100, "T7.3 no feed change");
assert((t7.recommendation as string).includes("stable"), "T7.4 stable recommendation");

// ─── T8: adaptive_chatter — chatter detected ────────────────────────────────

console.log("T8: Chatter — detected");
const t8 = adaptiveControl("adaptive_chatter", {
  vibration_mm_s: 5.0,
  spindle_rpm: 4200,
  dominant_frequency_hz: 1200,
  flutes: 4,
  tool_diameter_mm: 12,
});
assert(t8.is_chatter === true, "T8.1 chatter detected");
assert((t8.recommended_rpm as number) !== 4200, "T8.2 recommends different RPM");
const stableOptions = t8.stable_rpm_options as number[];
assert(stableOptions.length > 0, "T8.3 has stable RPM options");
assert((t8.spindle_override_pct as number) !== 100, "T8.4 spindle override adjusted");
assert((t8.recommendation as string).includes("Chatter"), "T8.5 chatter recommendation");

// ─── T9: adaptive_chatter — conservative RPM selection ──────────────────────

console.log("T9: Chatter — conservative selection");
const t9 = adaptiveControl("adaptive_chatter", {
  vibration_mm_s: 4.0,
  spindle_rpm: 5000,
  dominant_frequency_hz: 800,
  flutes: 4,
});
assert(t9.is_chatter === true, "T9.1 chatter detected");
// Recommended RPM should be lower than current (conservative)
assert((t9.recommended_rpm as number) <= 5000, "T9.2 conservative RPM selection");

// ─── T10: adaptive_wear — fresh tool ────────────────────────────────────────

console.log("T10: Wear — fresh tool");
const t10 = adaptiveControl("adaptive_wear", {
  cutting_time_min: 5,
  expected_life_min: 45,
  baseline_load_pct: 40,
  current_load_pct: 42,
  ra_baseline_um: 1.6,
});
assert((t10.estimated_wear_pct as number) < 30, "T10.1 low wear for fresh tool");
assert((t10.remaining_life_min as number) > 20, "T10.2 significant life remaining");
assert(t10.should_replace === false, "T10.3 should not replace");
assert((t10.feed_compensation_pct as number) === 100, "T10.4 no feed compensation needed");

// ─── T11: adaptive_wear — worn tool ─────────────────────────────────────────

console.log("T11: Wear — worn tool");
const t11 = adaptiveControl("adaptive_wear", {
  cutting_time_min: 40,
  expected_life_min: 45,
  baseline_load_pct: 40,
  current_load_pct: 56,
  flank_wear_mm: 0.25,
  ra_baseline_um: 1.6,
});
assert((t11.estimated_wear_pct as number) > 80, "T11.1 high wear detected");
assert((t11.remaining_life_min as number) < 15, "T11.2 little life remaining");
assert((t11.force_increase_pct as number) > 20, "T11.3 force increase detected");
assert((t11.feed_compensation_pct as number) < 100, "T11.4 feed compensation applied");
assert((t11.ra_degradation_pct as number) > 20, "T11.5 surface finish degraded");

// ─── T12: adaptive_wear — replacement threshold ─────────────────────────────

console.log("T12: Wear — replacement threshold");
const t12 = adaptiveControl("adaptive_wear", {
  cutting_time_min: 42,
  expected_life_min: 45,
  baseline_load_pct: 40,
  current_load_pct: 62,
  flank_wear_mm: 0.28,
});
assert(t12.should_replace === true, "T12.1 should replace at threshold");
assert((t12.recommendation as string).includes("REPLACE"), "T12.2 replacement recommendation");

// ─── T13: adaptive_thermal — cold machine ───────────────────────────────────

console.log("T13: Thermal — cold machine");
const t13 = adaptiveControl("adaptive_thermal", {
  spindle_temp_c: 21,
  ambient_temp_c: 20,
  machine_type: "VMC",
  run_time_min: 5,
});
assert(Math.abs(t13.z_drift_um as number) < 3, "T13.1 minimal drift when cold");
assert(t13.compensation_applied === false, "T13.2 no compensation for small drift");

// ─── T14: adaptive_thermal — warm spindle ───────────────────────────────────

console.log("T14: Thermal — warm spindle");
const t14 = adaptiveControl("adaptive_thermal", {
  spindle_temp_c: 32,
  ambient_temp_c: 20,
  machine_type: "VMC",
  run_time_min: 60,
});
assert(Math.abs(t14.z_drift_um as number) > 5, "T14.1 significant Z drift");
assert(t14.compensation_applied === true, "T14.2 compensation applied");
const comp14 = t14.compensation_values_um as any;
assert(comp14.z !== 0, "T14.3 Z compensation non-zero");
assert(comp14.z < 0, "T14.4 Z compensation is negative (counteracting growth)");
assert((t14.recommendation as string).includes("Compensation applied"), "T14.5 compensation recommendation");

// ─── T15: adaptive_thermal — axis differences ──────────────────────────────

console.log("T15: Thermal — axis differences");
const t15 = adaptiveControl("adaptive_thermal", {
  spindle_temp_c: 35,
  ambient_temp_c: 20,
  machine_type: "HMC",
  spindle_orientation: "horizontal",
  run_time_min: 120,
});
// Z drift should be larger than X/Y drift
assert(Math.abs(t15.z_drift_um as number) > Math.abs(t15.x_drift_um as number), "T15.1 Z drift > X drift");
assert(Math.abs(t15.z_drift_um as number) > Math.abs(t15.y_drift_um as number), "T15.2 Z drift > Y drift");

// ─── T16: adaptive_override — feed override (FOCAS) ─────────────────────────

console.log("T16: Override — feed (FOCAS)");
const t16 = adaptiveControl("adaptive_override", {
  channel: "feed",
  value_pct: 85,
  reason: "high engagement corner",
  controller: "fanuc_focas",
});
assert(t16.status === "issued", "T16.1 override issued");
const cmd16 = t16.controller_command as any;
assert(cmd16.protocol === "FOCAS2", "T16.2 FOCAS2 protocol");
assert(cmd16.function === "cnc_setfeedovrd", "T16.3 correct FOCAS function");
assert(cmd16.parameter === 85, "T16.4 correct value");

// ─── T17: adaptive_override — spindle override (Siemens) ────────────────────

console.log("T17: Override — spindle (Siemens)");
const t17 = adaptiveControl("adaptive_override", {
  channel: "spindle",
  value_pct: 90,
  reason: "chatter suppression",
  controller: "siemens_opcua",
});
const cmd17 = t17.controller_command as any;
assert(cmd17.protocol === "OPC-UA", "T17.1 OPC-UA protocol");
assert(cmd17.node_id.includes("spindleSpeedOvr"), "T17.2 correct OPC-UA node");

// ─── T18: adaptive_override — Haas macro ────────────────────────────────────

console.log("T18: Override — Haas macro");
const t18 = adaptiveControl("adaptive_override", {
  channel: "feed",
  value_pct: 75,
  reason: "wear compensation",
  controller: "haas_macro",
});
const cmd18 = t18.controller_command as any;
assert(cmd18.protocol === "Macro", "T18.1 macro protocol");
assert(cmd18.variable === "#4009", "T18.2 correct macro variable");
assert(cmd18.format.includes("4009"), "T18.3 formatted command");

// ─── T19: adaptive_override — Mazak ─────────────────────────────────────────

console.log("T19: Override — Mazak");
const t19 = adaptiveControl("adaptive_override", {
  channel: "spindle",
  value_pct: 95,
  controller: "mazak_smooth",
});
const cmd19 = t19.controller_command as any;
assert(cmd19.protocol === "MT-LINKi", "T19.1 MT-LINKi protocol");
assert(cmd19.path.includes("spindle_override"), "T19.2 correct path");

// ─── T20: adaptive_override — out of range ──────────────────────────────────

console.log("T20: Override — out of range");
const t20 = adaptiveControl("adaptive_override", {
  channel: "feed",
  value_pct: 250,
});
assert(t20.error !== undefined, "T20.1 error for out of range");

// ─── T21: adaptive_config — read ────────────────────────────────────────────

console.log("T21: Config — read");
const t21 = adaptiveControl("adaptive_config");
assert(t21.config !== undefined, "T21.1 returns config");

// ─── T22: adaptive_config — update ──────────────────────────────────────────

console.log("T22: Config — update");
const t22 = adaptiveControl("adaptive_config", {
  chatter_threshold_mm_s: 3.0,
  wear_replacement_pct: 90,
});
assert(t22.status === "config_updated", "T22.1 config updated");
const updated22 = t22.updated_keys as string[];
assert(updated22.includes("chatter_threshold_mm_s"), "T22.2 threshold updated");
assert(updated22.includes("wear_replacement_pct"), "T22.3 wear threshold updated");

// Verify update applied
const t22b = adaptiveControl("adaptive_config");
assert((t22b.config as any).chatter_threshold_mm_s === 3.0, "T22.4 threshold persisted");

// Reset for remaining tests
adaptiveControl("adaptive_config", { chatter_threshold_mm_s: 2.5, wear_replacement_pct: 85 });

// ─── T23: adaptive_config — invalid keys ────────────────────────────────────

console.log("T23: Config — invalid keys");
const t23 = adaptiveControl("adaptive_config", { invalid_key: 42 });
assert(t23.error !== undefined, "T23.1 error for invalid keys");
assert((t23.valid_keys as string[]).length > 5, "T23.2 lists valid keys");

// ─── T24: adaptive_log ──────────────────────────────────────────────────────

console.log("T24: Override log");
const t24 = adaptiveControl("adaptive_log");
assert((t24.total as number) >= 4, "T24.1 has override log entries");
const overrides24 = t24.overrides as any[];
assert(overrides24.every((o: any) => o.channel && o.value_pct !== undefined && o.timestamp), "T24.2 entries have required fields");

// ─── T25: adaptive_history ──────────────────────────────────────────────────

console.log("T25: Session history");
const t25 = adaptiveControl("adaptive_history");
assert((t25.total_sessions as number) >= 1, "T25.1 has session history");
assert((t25.total_overrides as number) >= 4, "T25.2 has total overrides");

// ─── T26: adaptive_get — stored result ──────────────────────────────────────

console.log("T26: Get — stored result");
const t2id = t2.query_id as string;
const t26 = adaptiveControl("adaptive_get", { id: t2id });
assert(t26.query_id === t2id, "T26.1 correct stored result");
assert(t26.target_chipload_mm !== undefined, "T26.2 has chipload data");

// ─── T27: adaptive_get — not found ──────────────────────────────────────────

console.log("T27: Get — not found");
const t27 = adaptiveControl("adaptive_get", { id: "NONEXISTENT" });
assert(t27.error !== undefined, "T27.1 error for missing id");

// ─── T28: adaptive_get — no id ──────────────────────────────────────────────

console.log("T28: Get — no id");
const t28 = adaptiveControl("adaptive_get", {});
assert(t28.error !== undefined, "T28.1 error without id");

// ─── T29: Unknown action ────────────────────────────────────────────────────

console.log("T29: Unknown action");
const t29 = adaptiveControl("adaptive_invalid");
assert(t29.error !== undefined, "T29.1 error for unknown action");
assert((t29.valid_actions as string[]).length === 10, "T29.2 lists all 10 valid actions");

// ─── T30: adaptive_status — after operations ────────────────────────────────

console.log("T30: Status — after operations");
const t30 = adaptiveControl("adaptive_status");
assert(t30.active === true, "T30.1 session is active");
const session30 = t30.session as any;
assert(session30.overrides > 0, "T30.2 overrides issued");
assert(session30.chatter_events > 0, "T30.3 chatter events recorded");
assert(session30.current_overrides !== undefined, "T30.4 has current overrides");

// ─── T31: Chipload — feed override clamping ─────────────────────────────────

console.log("T31: Chipload — clamping");
const t31 = adaptiveControl("adaptive_chipload", {
  target_chipload_mm: 0.1,
  feed_rate_mmpm: 2000,
  spindle_rpm: 5000,
  flutes: 4,
  engagement_angle_deg: 5,
  spindle_load_pct: 10,
});
assert((t31.feed_override_pct as number) <= 150, "T31.1 feed override capped at max");
assert((t31.feed_override_pct as number) >= 40, "T31.2 feed override above min");

// ─── T32: Chatter — RPM options range ───────────────────────────────────────

console.log("T32: Chatter — RPM options range");
const t32 = adaptiveControl("adaptive_chatter", {
  vibration_mm_s: 6.0,
  spindle_rpm: 8000,
  dominant_frequency_hz: 2000,
  flutes: 4,
});
const options32 = t32.stable_rpm_options as number[];
assert(options32.every((r: number) => r >= 500 && r <= 20000), "T32.1 all RPM options in valid range");
assert(options32.length <= 5, "T32.2 reasonable number of options");

// ─── T33: Wear — VB-based estimation ────────────────────────────────────────

console.log("T33: Wear — VB-based estimation");
const t33 = adaptiveControl("adaptive_wear", {
  cutting_time_min: 10,
  expected_life_min: 45,
  baseline_load_pct: 40,
  current_load_pct: 42,
  flank_wear_mm: 0.15,
});
// VB=0.15mm → 50% of ISO criterion (0.3mm)
assert((t33.estimated_wear_pct as number) >= 45, "T33.1 VB-based wear ≥ 45%");

// ─── T34: Thermal — compensation disabled ───────────────────────────────────

console.log("T34: Thermal — compensation disabled");
adaptiveControl("adaptive_config", { thermal_compensation_enabled: false });
const t34 = adaptiveControl("adaptive_thermal", {
  spindle_temp_c: 40,
  ambient_temp_c: 20,
});
assert(t34.compensation_applied === false, "T34.1 no compensation when disabled");
assert((t34.recommendation as string).includes("disabled"), "T34.2 notes disabled in recommendation");
adaptiveControl("adaptive_config", { thermal_compensation_enabled: true });

// ─── T35: Override — generic controller ─────────────────────────────────────

console.log("T35: Override — generic controller");
const t35 = adaptiveControl("adaptive_override", {
  channel: "coolant_pressure",
  value_pct: 80,
  controller: "generic",
});
const cmd35 = t35.controller_command as any;
assert(cmd35.protocol === "generic", "T35.1 generic protocol");
assert(cmd35.channel === "coolant_pressure", "T35.2 correct channel");

// ─── T36: Chipload — full slot alert ────────────────────────────────────────

console.log("T36: Chipload — full slot alert");
const t36 = adaptiveControl("adaptive_chipload", {
  target_chipload_mm: 0.1,
  feed_rate_mmpm: 2000,
  spindle_rpm: 5000,
  flutes: 4,
  engagement_angle_deg: 160,
  spindle_load_pct: 55,
});
const alerts36 = t36.alerts as any[];
assert(alerts36.some((a: any) => a.level === "info" && a.message.includes("Full-slot")), "T36.1 full-slot alert");

// ─── T37: Wear — zero cutting time ─────────────────────────────────────────

console.log("T37: Wear — zero cutting time");
const t37 = adaptiveControl("adaptive_wear", {
  cutting_time_min: 0,
  expected_life_min: 45,
  baseline_load_pct: 40,
  current_load_pct: 40,
});
assert((t37.estimated_wear_pct as number) === 0, "T37.1 zero wear at start");
assert(t37.should_replace === false, "T37.2 should not replace");
assert((t37.remaining_life_min as number) === 45, "T37.3 full life remaining");

// ─── T38: Thermal — delta temperature ───────────────────────────────────────

console.log("T38: Thermal — delta temperature");
const t38 = adaptiveControl("adaptive_thermal", {
  spindle_temp_c: 28,
  ambient_temp_c: 22,
});
assert((t38.ambient_delta_c as number) === 6, "T38.1 correct delta T");
assert((t38.z_drift_um as number) > 0, "T38.2 positive Z drift");

// ─── T39: Chatter — feed tracks spindle ─────────────────────────────────────

console.log("T39: Chatter — feed tracks spindle");
const t39 = adaptiveControl("adaptive_chatter", {
  vibration_mm_s: 4.0,
  spindle_rpm: 6000,
  dominant_frequency_hz: 1500,
  flutes: 4,
});
assert(t39.is_chatter === true, "T39.1 chatter detected");
// Feed adjustment should match spindle override to maintain chip load
assert((t39.feed_adjustment_pct as number) === (t39.spindle_override_pct as number), "T39.2 feed tracks spindle");

// ─── T40: Integration — full adaptive sequence ──────────────────────────────

console.log("T40: Integration — full adaptive sequence");
// Simulate: start fresh → chipload check → chatter check → wear check → thermal check
const cl = adaptiveControl("adaptive_chipload", {
  target_chipload_mm: 0.1, feed_rate_mmpm: 2000, spindle_rpm: 5000,
  flutes: 4, engagement_angle_deg: 90, spindle_load_pct: 50,
});
const ch = adaptiveControl("adaptive_chatter", {
  vibration_mm_s: 1.5, spindle_rpm: 5000, flutes: 4,
});
const wr = adaptiveControl("adaptive_wear", {
  cutting_time_min: 20, expected_life_min: 45,
  baseline_load_pct: 40, current_load_pct: 46,
});
const th = adaptiveControl("adaptive_thermal", {
  spindle_temp_c: 25, ambient_temp_c: 20,
});
assert(cl.feed_override_pct !== undefined, "T40.1 chipload computed");
assert(ch.is_chatter !== undefined, "T40.2 chatter checked");
assert(wr.estimated_wear_pct !== undefined, "T40.3 wear estimated");
assert(th.z_drift_um !== undefined, "T40.4 thermal computed");
// Session should have all events
const status40 = adaptiveControl("adaptive_status");
assert((status40.session as any).overrides > 0, "T40.5 session tracks all events");

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("");
console.log("=".repeat(60));
console.log(`R10-Rev9 Adaptive Control: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log("=".repeat(60));
if (failures.length > 0) {
  console.log("");
  for (const f of failures) console.log(`  FAIL: ${f}`);
}
if (failed > 0) process.exit(1);
