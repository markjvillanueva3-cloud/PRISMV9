/**
 * OSCAR-SFC-9AXIS-MS0/U-OSC-COMBO-SWEEP -- run PRISM SFC across the cartesian product of the
 * now-live axes and quantify the variability each contributes. Demonstrates the goal's first
 * clause ("calculations for every possible combination ... with max variability") now that
 * tool_material / coolant / machine_rigidity actually move the output (this session's wiring).
 * Read-only (no engine change). Run: cd mcp-server && npx tsx scripts/sfc-combination-sweep.ts
 */
import { ultimateSpeedFeedEngine } from "../src/engines/UltimateSpeedFeedEngine.js";

const ISO = ["P", "M", "K", "N", "S", "H"] as const;
const DIA = [6, 12, 20];
const FLUTES = [3, 4];
const TOOLMAT = ["carbide", "hss", "cermet", "ceramic", "cbn"];
const COOLANT = ["flood", "dry", "mist", "mql", "air_blast", "through_tool", "cryogenic"];
const RIGID = ["low", "medium", "high"];
const OP = ["milling", "turning", "drilling"] as const;
const STRAT = ["conventional", "hsm", "adaptive"];
const MODE = ["tool_life", "balanced", "productivity"] as const;

function run(o: Record<string, unknown>): number | null {
  try { return ultimateSpeedFeedEngine.calculate(o as any).cutting_speed.value; } catch { return null; }
}

const base: Record<string, unknown> = { iso_group: "P", tool_diameter_mm: 12, flutes: 4, operation: "milling", tool_material: "carbide", coolant: "flood", machine_rigidity: "medium", strategy: "conventional", optimize_for: "balanced" };

function axisSpread(axis: string, values: unknown[]): string {
  const vs = values.map(v => run({ ...base, [axis]: v })).filter((x): x is number => x != null && isFinite(x));
  if (!vs.length) return `${axis}: (no data)`;
  const mn = Math.min(...vs), mx = Math.max(...vs);
  return `${axis.padEnd(16)} ${values.length} values -> Vc ${mn.toFixed(0)}..${mx.toFixed(0)} m/min (${(mx / mn).toFixed(2)}x spread)`;
}

console.log("=== PER-AXIS variability (fixed base: P / 12mm / 4FL / milling / carbide / flood / medium / conventional / balanced) ===");
console.log(axisSpread("iso_group", [...ISO]));
console.log(axisSpread("tool_diameter_mm", DIA));
console.log(axisSpread("flutes", FLUTES));
console.log(axisSpread("tool_material", TOOLMAT));
console.log(axisSpread("coolant", COOLANT));
console.log(axisSpread("machine_rigidity", RIGID));
console.log(axisSpread("operation", [...OP]));
console.log(axisSpread("strategy", STRAT));
console.log(axisSpread("optimize_for", [...MODE]));

console.log("\n=== FULL combinatorial sweep ===");
let cells = 0, ok = 0;
let gMin = Infinity, gMax = -Infinity;
const seen = new Set<number>();
const t0 = Number(process.hrtime.bigint() / 1000000n);
for (const iso of ISO) for (const dia of DIA) for (const fl of FLUTES) for (const tm of TOOLMAT)
for (const cl of COOLANT) for (const rg of RIGID) for (const op of OP) for (const st of STRAT) for (const md of MODE) {
  cells++;
  const vc = run({ iso_group: iso, tool_diameter_mm: dia, flutes: fl, operation: op, tool_material: tm, coolant: cl, machine_rigidity: rg, strategy: st, optimize_for: md });
  if (vc != null && isFinite(vc)) { ok++; gMin = Math.min(gMin, vc); gMax = Math.max(gMax, vc); seen.add(Math.round(vc)); }
}
const t1 = Number(process.hrtime.bigint() / 1000000n);
console.log(`combinations enumerated: ${cells}`);
console.log(`computed OK:             ${ok}`);
console.log(`distinct Vc values:      ${seen.size}  (a flat/inert axis space would collapse to far fewer)`);
console.log(`global Vc range:         ${gMin.toFixed(0)} .. ${gMax.toFixed(0)} m/min  (${(gMax / gMin).toFixed(1)}x)`);
console.log(`wall time:               ${t1 - t0} ms (${((t1 - t0) / cells).toFixed(3)} ms/cell)`);
console.log(`\nAxes exercised: iso(${ISO.length}) x dia(${DIA.length}) x flutes(${FLUTES.length}) x tool_material(${TOOLMAT.length}) x coolant(${COOLANT.length}) x rigidity(${RIGID.length}) x operation(${OP.length}) x strategy(${STRAT.length}) x mode(${MODE.length})`);
