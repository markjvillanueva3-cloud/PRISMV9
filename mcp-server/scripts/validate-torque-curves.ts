#!/usr/bin/env npx tsx
import { MACHINE_TORQUE_CURVES, torqueAtRpm, TORQUE_CURVE_STATS } from "../src/data/machine-torque-curves.js";

console.log("Stats:", JSON.stringify(TORQUE_CURVE_STATS));

// Spot check: Haas VF-2
const vf2 = MACHINE_TORQUE_CURVES["haas_vf_2"];
if (vf2) {
  console.log(`\nHaas VF-2: ${vf2.source} base=${vf2.base_speed_rpm} pts=${vf2.points.length} conf=${vf2.confidence}`);
  for (const rpm of [500, 1087, 4000, 7500]) {
    const r = torqueAtRpm(vf2, rpm);
    const Pcheck = (r.torque_Nm * 2 * Math.PI * rpm) / 60000;
    console.log(`  @${rpm}rpm: T=${r.torque_Nm}Nm P=${r.power_kW}kW region=${r.region} Pcheck=${Pcheck.toFixed(2)}kW`);
  }
}

// Spot check: Okuma GENOS M560-V
const genos = MACHINE_TORQUE_CURVES["okuma_genos_m560_v"];
if (genos) {
  console.log(`\nOkuma GENOS M560-V: ${genos.source} base=${genos.base_speed_rpm} pts=${genos.points.length}`);
  for (const rpm of [500, 1751, 8000, 15000]) {
    const r = torqueAtRpm(genos, rpm);
    console.log(`  @${rpm}rpm: T=${r.torque_Nm}Nm P=${r.power_kW}kW region=${r.region}`);
  }
}

// Check a TIER-B machine
const brother = MACHINE_TORQUE_CURVES["brother_speedio_s300x1"];
if (brother) {
  console.log(`\nBrother SPEEDIO S300X1: ${brother.source} base=${brother.base_speed_rpm} drive=${brother.drive_type_inferred}`);
  for (const rpm of [1000, brother.base_speed_rpm, 10000, 27000]) {
    const r = torqueAtRpm(brother, rpm);
    console.log(`  @${rpm}rpm: T=${r.torque_Nm}Nm P=${r.power_kW}kW region=${r.region}`);
  }
}

// Energy conservation spot checks
console.log("\n--- Energy Conservation Checks ---");
let pass = 0, fail = 0;
for (const [id, curve] of Object.entries(MACHINE_TORQUE_CURVES)) {
  if (curve.points.length < 3) continue;
  // Check mid-point in constant power region
  const midIdx = Math.floor(curve.points.length * 0.7);
  const pt = curve.points[midIdx];
  if (!pt || pt.rpm <= 0) continue;
  const computedP = (pt.torque_Nm * 2 * Math.PI * pt.rpm) / 60000;
  const err = Math.abs(computedP - pt.power_kW) / Math.max(pt.power_kW, 0.01);
  if (err > 0.10) {
    fail++;
    if (fail <= 3) console.log(`  FAIL: ${curve.brand} ${curve.model} @${pt.rpm}rpm: computed=${computedP.toFixed(2)}kW vs stored=${pt.power_kW}kW (err=${(err*100).toFixed(1)}%)`);
  } else {
    pass++;
  }
}
console.log(`Energy conservation: ${pass} pass, ${fail} fail`);

console.log(`\nTotal curve entries: ${Object.keys(MACHINE_TORQUE_CURVES).length}`);
