/**
 * OSCAR-SFC-9AXIS-MS0/U-OSC-VENDOR-COMPARE — run PRISM SFC vs published reference
 * baselines (Sandvik / Kennametal / CNCCookbook / HSMAdvisor-public) across the curated
 * BASELINE_DB, and verify whether the newly-wired axes (tool_material, coolant,
 * machine_rigidity) propagate through the 9-axis orchestrator path used by compare().
 *
 * Run: cd mcp-server && npx tsx scripts/sfc-baseline-compare-run.ts
 */
import { speedFeedBaselineComparatorEngine as cmp } from "../src/engines/SpeedFeedBaselineComparatorEngine.js";
import { ultimateSpeedFeedEngine } from "../src/engines/UltimateSpeedFeedEngine.js";

function pct(n: number): string { return (n >= 0 ? "+" : "") + n.toFixed(1) + "%"; }

const entries = cmp.listBaselines();
console.log(`\n=== PASS 1: PRISM SFC vs published baselines (${entries.length} BASELINE_DB cells) ===`);
console.log("material            | dia | op       | cut      | PRISM vc | med vc | vc Δ   | inEnv | agree | HSMAdv vc Δ");
console.log("-".repeat(110));

let inEnvCount = 0, agreeSum = 0, n = 0;
const hsmDevs: number[] = [];
const allVcDevs: number[] = [];
for (const e of entries) {
  const input: any = {
    material: { name: e.material_name, iso_group: e.iso_group },
    tooling: { tool_diameter_mm: e.diameter_mm, tool_material: e.tool_material },
    toolpath: { operation: e.operation, cut_type: e.cut_type },
  };
  let r;
  try { r = cmp.compare(input); } catch (err: any) { console.log(`${e.material_name} — ERROR: ${err?.message}`); continue; }
  if (!r.baseline_found || !r.baseline_median) { console.log(`${e.material_name.padEnd(18)} | no baseline matched`); continue; }
  const hsm = r.per_source.find(s => s.source === "hsmadvisor");
  const hsmStr = hsm ? pct(hsm.vc_variance_pct) : "—";
  console.log(
    `${e.material_name.padEnd(19)} | ${String(e.diameter_mm).padStart(3)} | ${e.operation.padEnd(8)} | ${e.cut_type.padEnd(8)} | ` +
    `${r.prism_output.vc_mpm.toFixed(0).padStart(8)} | ${r.baseline_median.vc_mpm.toFixed(0).padStart(6)} | ${pct(r.variance_pct.vc).padStart(6)} | ` +
    `${(r.in_envelope ? "YES" : "no").padStart(5)} | ${r.agreement_score.toFixed(2)} | ${hsmStr}`,
  );
  inEnvCount += r.in_envelope ? 1 : 0; agreeSum += r.agreement_score; n++;
  allVcDevs.push(Math.abs(r.variance_pct.vc));
  if (hsm) hsmDevs.push(Math.abs(hsm.vc_variance_pct));
}
const mean = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
console.log("-".repeat(110));
console.log(`SUMMARY: ${n} cells | in-envelope (±15%): ${inEnvCount}/${n} (${(100 * inEnvCount / n).toFixed(0)}%) | mean agreement ${(agreeSum / n).toFixed(3)}`);
console.log(`         mean |vc deviation| vs baseline-median: ${mean(allVcDevs).toFixed(1)}%  |  vs HSMAdvisor-public: ${mean(hsmDevs).toFixed(1)}% (n=${hsmDevs.length})`);

console.log(`\n=== PASS 2: do the new axes propagate through the orchestrator (compare path)? ===`);
const baseInput: any = { material: { name: "AISI 4140 Alloy Steel", iso_group: "P" }, tooling: { tool_diameter_mm: 12 }, toolpath: { operation: "milling", cut_type: "roughing" } };
function vcVia(transform: (i: any) => void): number {
  const i = JSON.parse(JSON.stringify(baseInput)); transform(i);
  return cmp.compare(i).prism_output.vc_mpm;
}
const orchCarbide = vcVia(i => { i.tooling.tool_material = "carbide"; });
const orchHss = vcVia(i => { i.tooling.tool_material = "hss"; });
console.log(`orchestrator: tool_material carbide=${orchCarbide.toFixed(1)} vs hss=${orchHss.toFixed(1)} → ${orchCarbide !== orchHss ? "FORWARDED ✓" : "DROPPED ✗ (orchestrator does NOT pass tool_material to the engine)"}`);

console.log(`\n=== PASS 3: confirm axes ARE live at the core engine (direct calculate) ===`);
const dc = (o: any) => ultimateSpeedFeedEngine.calculate({ material: "AISI 4140 Alloy Steel", iso_group: "P", tool_diameter_mm: 12, flutes: 4, operation: "milling", ...o }).cutting_speed.value;
console.log(`core: tool_material carbide=${dc({ tool_material: "carbide" }).toFixed(1)} hss=${dc({ tool_material: "hss" }).toFixed(1)} ceramic=${dc({ tool_material: "ceramic" }).toFixed(1)}`);
console.log(`core: coolant flood=${dc({ coolant: "flood" }).toFixed(1)} dry=${dc({ coolant: "dry" }).toFixed(1)} through_tool=${dc({ coolant: "through_tool" }).toFixed(1)}`);
console.log(`core: rigidity low=${dc({ machine_rigidity: "low" }).toFixed(1)} medium=${dc({ machine_rigidity: "medium" }).toFixed(1)} high=${dc({ machine_rigidity: "high" }).toFixed(1)}`);
