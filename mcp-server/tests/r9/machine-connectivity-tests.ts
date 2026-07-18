/**
 * R9-MS0 MachineConnectivityEngine Tests
 * ========================================
 * 100 tests across 14 test sections (T1-T14)
 *
 * T1:      Machine registration
 * T2:      Connection management
 * T3:      Live data ingestion
 * T4:      Alert generation from data
 * T5:      Live status query
 * T6:      All machine statuses
 * T7:      Chatter detection
 * T8:      Tool wear monitoring
 * T9:      Tool wear updates & predictions
 * T10:     Thermal drift tracking
 * T11:     Alert management
 * T12-T13: Dispatcher integration
 * T14:     Edge cases
 */

import {
  machineConnectivity,
  registerMachine,
  unregisterMachine,
  listMachines,
  getMachine,
  connectMachine,
  disconnectMachine,
  ingestLiveData,
  getLiveStatus,
  getAllMachineStatuses,
  detectChatter,
  startToolWearMonitor,
  updateToolWear,
  getToolWear,
  updateThermalState,
  getThermalState,
  acknowledgeAlert,
  getAlertHistory,
} from "../../src/engines/MachineConnectivityEngine.js";

// ─── Test Harness ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, msg: string): void {
  total++;
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

// ─── T1: Machine registration ─────────────────────────────────────────────

console.log("\nT1: Machine registration");
{
  const m1 = registerMachine({
    id: "haas-vf2",
    name: "Haas VF-2",
    manufacturer: "Haas",
    model: "VF-2",
    protocol: "mtconnect",
    endpoint: "http://192.168.1.100:5000",
    poll_interval_ms: 1000,
  });
  assert(m1.id === "haas-vf2", "T1.1 correct ID");
  assert(m1.name === "Haas VF-2", "T1.2 correct name");
  assert(m1.protocol === "mtconnect", "T1.3 correct protocol");

  const m2 = registerMachine({
    id: "dmg-dmu50",
    name: "DMG DMU 50",
    manufacturer: "DMG Mori",
    model: "DMU 50",
    protocol: "opcua",
    poll_interval_ms: 500,
  });
  assert(m2.manufacturer === "DMG Mori", "T1.4 second machine");

  const m3 = registerMachine({
    id: "mazak-qt200",
    name: "Mazak QT-200",
    manufacturer: "Mazak",
    model: "QT-200",
    protocol: "mtconnect",
    poll_interval_ms: 1000,
  });
  assert(m3.id === "mazak-qt200", "T1.5 third machine");

  const list = listMachines();
  assert(list.length >= 3, "T1.6 three machines registered");

  const found = getMachine("haas-vf2");
  assert(found !== null, "T1.7 getMachine works");
  assert(found!.name === "Haas VF-2", "T1.8 correct machine");

  const notFound = getMachine("nonexistent");
  assert(notFound === null, "T1.9 not found returns null");
}

// ─── T2: Connection management ────────────────────────────────────────────

console.log("\nT2: Connection management");
{
  const c1 = connectMachine("haas-vf2");
  assert(c1.connected === true, "T2.1 connected");
  assert(c1.message.includes("Haas VF-2"), "T2.2 message includes name");

  const c2 = connectMachine("dmg-dmu50");
  assert(c2.connected === true, "T2.3 second machine connected");

  const c3 = connectMachine("nonexistent");
  assert(c3.connected === false, "T2.4 connect nonexistent fails");

  const d1 = disconnectMachine("haas-vf2");
  assert(d1 === true, "T2.5 disconnected");

  const d2 = disconnectMachine("nonexistent");
  assert(d2 === false, "T2.6 disconnect nonexistent fails");

  // Reconnect for further tests
  connectMachine("haas-vf2");
}

// ─── T3: Live data ingestion ──────────────────────────────────────────────

console.log("\nT3: Live data ingestion");
{
  const alerts1 = ingestLiveData("haas-vf2", {
    state: "running",
    program: "O1234",
    tool: "T03",
    spindle_rpm: 6000,
    spindle_load_pct: 45,
    feed_rate_mmmin: 500,
    position: { x: 50, y: 25, z: -10 },
    cycle_time_elapsed_sec: 120,
    part_count: 3,
    coolant_active: true,
    feed_override_pct: 100,
  });
  assert(Array.isArray(alerts1), "T3.1 returns alerts array");
  assert(alerts1.length === 0, "T3.2 no alerts for normal data");

  // Verify data stored
  const status = getLiveStatus("haas-vf2");
  assert(status !== null, "T3.3 status available");
  assert(status!.current.state === "running", "T3.4 state is running");
  assert(status!.current.spindle_rpm === 6000, "T3.5 RPM stored");
  assert(status!.current.tool === "T03", "T3.6 tool stored");
  assert(status!.current.position.x === 50, "T3.7 position stored");
  assert(status!.current.coolant_active === true, "T3.8 coolant stored");

  // Partial update
  ingestLiveData("haas-vf2", { spindle_load_pct: 55, part_count: 4 });
  const status2 = getLiveStatus("haas-vf2");
  assert(status2!.current.spindle_load_pct === 55, "T3.9 partial update load");
  assert(status2!.current.part_count === 4, "T3.10 partial update part count");
  assert(status2!.current.spindle_rpm === 6000, "T3.11 RPM preserved from previous");
}

// ─── T4: Alert generation from data ──────────────────────────────────────

console.log("\nT4: Alert generation from data");
{
  // Overload warning
  const a1 = ingestLiveData("haas-vf2", { spindle_load_pct: 88 });
  assert(a1.length >= 1, "T4.1 overload warning generated");
  assert(a1[0].type === "overload_trending", "T4.2 correct alert type");
  assert(a1[0].severity === "warning", "T4.3 warning severity");

  // Overload critical
  const a2 = ingestLiveData("haas-vf2", { spindle_load_pct: 96 });
  assert(a2.some(a => a.severity === "critical"), "T4.4 critical at 96%");

  // Feed override low
  const a3 = ingestLiveData("haas-vf2", { spindle_load_pct: 50, feed_override_pct: 40, state: "running" });
  assert(a3.some(a => a.type === "feed_override_low"), "T4.5 feed override alert");

  // Alarm state
  const a4 = ingestLiveData("haas-vf2", { state: "alarm", spindle_load_pct: 0, feed_override_pct: 100 });
  assert(a4.some(a => a.type === "alarm_active"), "T4.6 alarm state alert");
  assert(a4.some(a => a.severity === "critical"), "T4.7 alarm is critical");
}

// ─── T5: Live status query ───────────────────────────────────────────────

console.log("\nT5: Live status query");
{
  // Reset to normal state
  ingestLiveData("haas-vf2", { state: "running", spindle_load_pct: 40, feed_override_pct: 100 });

  const status = getLiveStatus("haas-vf2");
  assert(status !== null, "T5.1 status found");
  assert(status!.machine.id === "haas-vf2", "T5.2 correct machine");
  assert(status!.connected === true, "T5.3 connected");
  assert(status!.current.state === "running", "T5.4 current state");
  assert(typeof status!.last_update === "string", "T5.5 has timestamp");
  assert(Array.isArray(status!.alerts), "T5.6 alerts array");

  const none = getLiveStatus("nonexistent");
  assert(none === null, "T5.7 nonexistent returns null");
}

// ─── T6: All machine statuses ────────────────────────────────────────────

console.log("\nT6: All machine statuses");
{
  const all = getAllMachineStatuses();
  assert(all.length >= 3, "T6.1 all machines returned");
  assert(all.some(s => s.machine.id === "haas-vf2"), "T6.2 haas in list");
  assert(all.some(s => s.machine.id === "dmg-dmu50"), "T6.3 dmg in list");
}

// ─── T7: Chatter detection ──────────────────────────────────────────────

console.log("\nT7: Chatter detection");
{
  // Not enough data
  const c1 = detectChatter("mazak-qt200");
  assert(c1.chatter_detected === false, "T7.1 no chatter with insufficient data");
  assert(c1.action.includes("Insufficient"), "T7.2 insufficient data message");

  // Feed stable data to dmg (fresh machine with no erratic history)
  connectMachine("dmg-dmu50");
  for (let i = 0; i < 15; i++) {
    ingestLiveData("dmg-dmu50", { spindle_load_pct: 40 + Math.random() * 2, spindle_rpm: 6000 });
  }
  const c2 = detectChatter("dmg-dmu50");
  assert(c2.chatter_detected === false, "T7.3 no chatter on stable signal");
  assert(c2.current_rpm === 6000, "T7.4 correct RPM");

  // Feed erratic data (simulating chatter)
  connectMachine("mazak-qt200");
  const loads = [30, 55, 25, 60, 20, 58, 22, 62, 18, 65, 28, 50, 35, 70, 15];
  for (const load of loads) {
    ingestLiveData("mazak-qt200", { spindle_load_pct: load, spindle_rpm: 4000 });
  }
  const c3 = detectChatter("mazak-qt200");
  assert(c3.chatter_detected === true, "T7.5 chatter detected on erratic signal");
  assert(c3.severity > 0, "T7.6 severity > 0");
  assert(c3.recommended_rpm.length >= 1, "T7.7 has recommended RPM");
  assert(c3.action.includes("Chatter"), "T7.8 action mentions chatter");
}

// ─── T8: Tool wear monitoring ────────────────────────────────────────────

console.log("\nT8: Tool wear monitoring");
{
  // Start monitoring
  ingestLiveData("haas-vf2", { spindle_load_pct: 30 });
  const tw1 = startToolWearMonitor("haas-vf2", "T05", 45);
  assert(tw1.tool_id === "T05", "T8.1 correct tool ID");
  assert(tw1.cutting_time_min === 0, "T8.2 zero cutting time");
  assert(tw1.predicted_remaining_life_min === 45, "T8.3 expected life");
  assert(tw1.wear_rate === "normal", "T8.4 initial wear rate");
  assert(tw1.spindle_load_trend.initial_pct === 30, "T8.5 initial load captured");

  // Get status
  const tw2 = getToolWear("haas-vf2", "T05");
  assert(tw2 !== null, "T8.6 status found");
  assert(tw2!.tool_id === "T05", "T8.7 correct tool");

  // Not found
  const tw3 = getToolWear("haas-vf2", "T99");
  assert(tw3 === null, "T8.8 missing tool returns null");
}

// ─── T9: Tool wear updates & predictions ────────────────────────────────

console.log("\nT9: Tool wear updates & predictions");
{
  // Simulate gradual load increase (normal wear)
  ingestLiveData("haas-vf2", { spindle_load_pct: 35 });
  const u1 = updateToolWear("haas-vf2", "T05", 10);
  assert(u1 !== null, "T9.1 update succeeded");
  assert(u1!.cutting_time_min === 10, "T9.2 cutting time updated");
  assert(u1!.spindle_load_trend.current_pct === 35, "T9.3 current load");
  assert(u1!.spindle_load_trend.slope > 0, "T9.4 positive slope");

  // Simulate more wear
  ingestLiveData("haas-vf2", { spindle_load_pct: 50 });
  const u2 = updateToolWear("haas-vf2", "T05", 20);
  assert(u2!.spindle_load_trend.current_pct === 50, "T9.5 increased load");
  assert(u2!.predicted_remaining_life_min > 0, "T9.6 has predicted remaining life");

  // High wear rate
  ingestLiveData("haas-vf2", { spindle_load_pct: 75 });
  const u3 = updateToolWear("haas-vf2", "T05", 25);
  assert(u3!.wear_rate !== "stable", "T9.7 not stable at high wear");

  // Near end of life
  ingestLiveData("haas-vf2", { spindle_load_pct: 85 });
  const u4 = updateToolWear("haas-vf2", "T05", 28);
  assert(u4!.predicted_remaining_life_min < 30, "T9.8 low remaining life");

  // Update nonexistent tool
  const u5 = updateToolWear("haas-vf2", "T99", 5);
  assert(u5 === null, "T9.9 nonexistent tool returns null");
}

// ─── T10: Thermal drift tracking ─────────────────────────────────────────

console.log("\nT10: Thermal drift tracking");
{
  // Cold machine
  const t1 = updateThermalState("haas-vf2", 22, 25, 0);
  assert(t1.machine_id === "haas-vf2", "T10.1 correct machine");
  assert(t1.ambient_temp_C === 22, "T10.2 ambient temp");
  assert(t1.spindle_temp_C === 25, "T10.3 spindle temp");
  assert(t1.estimated_z_drift_mm > 0, "T10.4 some drift estimated");
  assert(t1.compensation_active === false, "T10.5 not compensated (no warmup)");
  assert(t1.recommendation.includes("warmup"), "T10.6 recommends warmup");

  // After warmup
  const t2 = updateThermalState("haas-vf2", 22, 38, 20);
  assert(t2.compensation_active === true, "T10.7 compensated after warmup");
  assert(t2.estimated_z_drift_mm > t1.estimated_z_drift_mm, "T10.8 more drift at higher temp");

  // Get status
  const t3 = getThermalState("haas-vf2");
  assert(t3 !== null, "T10.9 status found");
  assert(t3!.spindle_temp_C === 38, "T10.10 correct temp");

  // No data
  const t4 = getThermalState("nonexistent");
  assert(t4 === null, "T10.11 nonexistent returns null");
}

// ─── T11: Alert management ──────────────────────────────────────────────

console.log("\nT11: Alert management");
{
  const history = getAlertHistory("haas-vf2");
  assert(history.length >= 1, "T11.1 has alert history");
  assert(history[0].machine_id === "haas-vf2", "T11.2 correct machine");

  // Acknowledge
  const alertId = history[0].id;
  const ack = acknowledgeAlert("haas-vf2", alertId);
  assert(ack === true, "T11.3 acknowledged");

  // Acknowledge nonexistent
  const ack2 = acknowledgeAlert("haas-vf2", "nonexistent-alert");
  assert(ack2 === false, "T11.4 acknowledge nonexistent fails");

  // Acknowledge on nonexistent machine
  const ack3 = acknowledgeAlert("nonexistent", alertId);
  assert(ack3 === false, "T11.5 acknowledge on missing machine fails");
}

// ─── T12: Dispatcher — registration & status ────────────────────────────

console.log("\nT12: Dispatcher — registration & status");
{
  const reg = machineConnectivity("machine_register", {
    id: "test-disp",
    name: "Test Dispatcher Machine",
    manufacturer: "Test",
    model: "T100",
    protocol: "mock",
  });
  assert(reg.id === "test-disp", "T12.1 register via dispatcher");

  const list = machineConnectivity("machine_list", {});
  assert(list.total >= 4, "T12.2 list via dispatcher");

  const conn = machineConnectivity("machine_connect", { id: "test-disp" });
  assert(conn.connected === true, "T12.3 connect via dispatcher");

  const status = machineConnectivity("machine_live_status", { id: "test-disp" });
  assert(status.machine.id === "test-disp", "T12.4 status via dispatcher");

  const allStatus = machineConnectivity("machine_all_status", {});
  assert(allStatus.machines.length >= 4, "T12.5 all status via dispatcher");

  const disconn = machineConnectivity("machine_disconnect", { id: "test-disp" });
  assert(disconn.disconnected === true, "T12.6 disconnect via dispatcher");
}

// ─── T13: Dispatcher — advanced features ─────────────────────────────────

console.log("\nT13: Dispatcher — advanced features");
{
  // Ingest via dispatcher
  machineConnectivity("machine_connect", { id: "test-disp" });
  const ingest = machineConnectivity("machine_ingest", {
    id: "test-disp",
    data: { state: "running", spindle_rpm: 3000, spindle_load_pct: 40 },
  });
  assert(typeof ingest.alerts_generated === "number", "T13.1 ingest via dispatcher");

  // Chatter via dispatcher
  for (let i = 0; i < 12; i++) {
    machineConnectivity("machine_ingest", { id: "test-disp", data: { spindle_load_pct: 40, spindle_rpm: 3000 } });
  }
  const chatter = machineConnectivity("chatter_detect_live", { id: "test-disp" });
  assert(typeof chatter.chatter_detected === "boolean", "T13.2 chatter via dispatcher");

  // Tool wear via dispatcher
  const twStart = machineConnectivity("tool_wear_start", { id: "test-disp", tool_id: "T10", expected_life_min: 60 });
  assert(twStart.tool_id === "T10", "T13.3 tool wear start via dispatcher");

  const twStatus = machineConnectivity("tool_wear_status", { id: "test-disp", tool_id: "T10" });
  assert(twStatus.tool_id === "T10", "T13.4 tool wear status via dispatcher");

  const twUpdate = machineConnectivity("tool_wear_update", { id: "test-disp", tool_id: "T10", cutting_time_min: 10 });
  assert(twUpdate.cutting_time_min === 10, "T13.5 tool wear update via dispatcher");

  // Thermal via dispatcher
  const thermal = machineConnectivity("thermal_update", { id: "test-disp", ambient_C: 22, spindle_C: 30, warmup_min: 5 });
  assert(thermal.machine_id === "test-disp", "T13.6 thermal update via dispatcher");

  const thermalStatus = machineConnectivity("thermal_status", { id: "test-disp" });
  assert(thermalStatus.ambient_temp_C === 22, "T13.7 thermal status via dispatcher");

  // Alert history via dispatcher
  const alertHist = machineConnectivity("alert_history", { id: "haas-vf2" });
  assert(Array.isArray(alertHist.alerts), "T13.8 alert history via dispatcher");

  // Unregister via dispatcher
  const unreg = machineConnectivity("machine_unregister", { id: "test-disp" });
  assert(unreg.removed === true, "T13.9 unregister via dispatcher");
}

// ─── T14: Edge cases ─────────────────────────────────────────────────────

console.log("\nT14: Edge cases");
{
  // Status of nonexistent machine
  const s1 = machineConnectivity("machine_live_status", { id: "nonexistent" });
  assert(s1.error !== undefined, "T14.1 error for nonexistent machine");

  // Ingest to nonexistent machine
  const i1 = machineConnectivity("machine_ingest", { id: "nonexistent", data: {} });
  assert(i1.alerts_generated === 0, "T14.2 ingest to nonexistent returns 0 alerts");

  // Tool wear on nonexistent
  const tw1 = machineConnectivity("tool_wear_status", { id: "nonexistent", tool_id: "T01" });
  assert(tw1.error !== undefined, "T14.3 tool wear on nonexistent");

  // Thermal on nonexistent
  const th1 = machineConnectivity("thermal_status", { id: "nonexistent" });
  assert(th1.error !== undefined, "T14.4 thermal on nonexistent");

  // Unknown action
  let threw = false;
  try {
    machineConnectivity("bad_action", {});
  } catch {
    threw = true;
  }
  assert(threw, "T14.5 unknown action throws");

  // Unregister and verify removed
  const before = listMachines().length;
  registerMachine({ id: "temp-test", name: "Temp", manufacturer: "X", model: "Y", protocol: "mock", poll_interval_ms: 1000 });
  assert(listMachines().length === before + 1, "T14.6 machine added");
  unregisterMachine("temp-test");
  assert(listMachines().length === before, "T14.7 machine removed");
  assert(getMachine("temp-test") === null, "T14.8 no longer findable");
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log(`R9-MS0 MachineConnectivityEngine: ${passed}/${total} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
