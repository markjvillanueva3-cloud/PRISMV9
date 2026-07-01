/**
 * SFC PAGE PANEL VALIDATION PROBE -- the 4 standalone codex-page panels that the
 * main sfc_calculate does NOT cover: deflection, power_torque, engagement, cycle_time.
 * Prints each engine function's result for a representative input vs the hand-computed
 * reference value, so a real defect is visible before writing the closed-loop test.
 * Run: node_modules/.bin/tsx scripts/sfc-panel-validate-probe.mjs  (from mcp-server-relative root)
 */
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENG = (f) => pathToFileURL(resolve(__dirname, "..", "mcp-server", "src", "engines", f)).href;

const { calculateSpindlePower } = await import(ENG("ManufacturingCalculations.ts"));
const { calculateToolDeflection } = await import(ENG("AdvancedCalculations.ts"));
const { calculateEngagementAngle, estimateCycleTime } = await import(ENG("ToolpathCalculations.ts"));

const r3 = (x) => (typeof x === "number" ? Math.round(x * 1000) / 1000 : x);

console.log("=== power_torque: calculateSpindlePower(Fc=500, Vc=150, D=12, eta=0.80) ===");
const pw = calculateSpindlePower(500, 150, 12, 0.80);
console.log("  power_cutting_kw =", pw.power_cutting_kw, "(ref Fc*Vc/60000 = 1.25)");
console.log("  power_spindle_kw =", pw.power_spindle_kw, "(ref 1.25/0.80 = 1.5625)");
console.log("  torque_nm        =", pw.torque_nm, "rpm =", pw.rpm, "(ref rpm=3979, torque=3.75)");

console.log("\n=== deflection: calculateToolDeflection(F=500, D=12, L=50, E=600GPa, runout=0.005) ===");
const df = calculateToolDeflection(500, 12, 50, 600, 0.005);
// I = pi*12^4/64 = 1017.88 mm^4 ; delta = 500*50^3/(3*600000*1017.88) = 0.03412 mm
console.log("  static_deflection  =", r3(df.static_deflection), "mm (ref delta=F*L^3/3EI = 0.0341)");
console.log("  dynamic_deflection =", r3(df.dynamic_deflection), "mm (must be >= static)");
console.log("  safety_factor      =", r3(df.safety_factor));
// scaling check: double the overhang -> 8x deflection (L^3)
const df2 = calculateToolDeflection(500, 12, 100, 600, 0.005);
console.log("  L=100 static_deflection =", r3(df2.static_deflection), "mm (ref ~8x the L=50 value)");

console.log("\n=== engagement: calculateEngagementAngle(D=12, ae, fz=0.1, climb) ===");
for (const ae of [6, 12, 3]) {
  const en = calculateEngagementAngle(12, ae, 0.1, true, 150);
  console.log(`  ae=${ae} (${(ae/12*100).toFixed(0)}% immersion): radial_engagement_percent=${r3(en.radial_engagement_percent)} arc_of_engagement=${r3(en.arc_of_engagement)} deg (textbook engagement arc = acos(1-2ae/D)deg: half->90, slot->180, quarter->60)`);
}

console.log("\n=== cycle_time: estimateCycleTime(cut=1000mm, feed=500mm/min, rapid=200mm, 1 tool) ===");
const ct = estimateCycleTime(1000, 500, 200, 1, 0.5, 30000);
console.log("  total_time =", r3(ct.total_time), "min (ref cut 1000/500=2.0 + rapid 200/30000=0.0067 ~= 2.007)");
console.log("  full result keys:", Object.keys(ct).join(", "));
