import { ultimateSpeedFeedEngine as E } from "./dist/engines/UltimateSpeedFeedEngine.js";
const input = {
  material: "alloy_steel", tool_diameter_mm: 12, flutes: 4, tool_material: "carbide",
  tool_coating: "AlTiN", operation: "milling", cut_type: "roughing", strategy: "adaptive",
  axial_depth_mm: 8, machine_power_kw: 15, machine_max_rpm: 12000, machine_max_torque_nm: 100,
  tool_stickout_mm: 40, system_stiffness_n_m: 2e7, natural_frequency_hz: 1200, damping_ratio: 0.04,
  tool_cost_usd: 45, machine_cost_per_min: 1.5, tool_change_time_min: 2,
  workpiece_length_mm: 100, feature_tolerance_mm: 0.05, optimize_for: "balanced",
};
const fn = (x) => E.calculate(x);
for (let i = 0; i < 2000; i++) fn(input);            // warmup / JIT
const N = 50000;
let acc = 0;
const t0 = process.hrtime.bigint();
for (let i = 0; i < N; i++) { const r = fn(input); acc += r.cutting_speed.value; }
const t1 = process.hrtime.bigint();
const ms = Number(t1 - t0) / 1e6;
console.log(`N=${N} total=${ms.toFixed(1)}ms per-eval=${(ms / N * 1000).toFixed(2)}us evals/sec=${Math.round(N / (ms / 1000))} acc=${acc.toFixed(0)}`);
console.log("input JSON bytes:", Buffer.byteLength(JSON.stringify(input)));
