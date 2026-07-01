/**
 * SFC vendor-validation (per-cell goal-matched) -- slot:oscar, 2026-06-19
 *
 * The default `speedFeedBaselineComparatorEngine.compare()` runs the NineAxis
 * orchestrator with NO mode + NO machine + a default g6_3 holder (12,000-RPM cap).
 * Published Sandvik/Kennametal/CNCCookbook/HSMAdvisor reference data is a MIX of
 * conservative (HSS), balanced, and aggressive (catalog carbide max-MRR) intents,
 * measured on balanced holders + HSM spindles.
 *
 * Forcing ONE global goal is apples-to-oranges either way (balanced under-shoots
 * carbide catalogs; aggressive over-shoots HSS/ceramic). The methodologically
 * honest metric is PER-CELL: run PRISM across all three goals under an unclamped
 * reference machine and ask "does PRISM's recommendation RANGE bracket / land
 * within +/-15% of the published number for SOME goal?". That isolates physics
 * fidelity from the product-default-goal question.
 *
 * Run: cd mcp-server && npx tsx scripts/sfc-vendor-validation-fair.ts
 * R12: every number below is computed live; no claim is asserted that isn't.
 */
import { speedFeedBaselineComparatorEngine as cmp } from "../src/engines/SpeedFeedBaselineComparatorEngine.js";
import type { NineAxisInput } from "../src/engines/SpeedFeedNineAxisOrchestratorEngine.js";

function pct(n: number): string { return (n >= 0 ? "+" : "") + n.toFixed(0) + "%"; }
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

// Reference machine: balanced holder on an HSM spindle so RPM is not the limiter.
const REF_MACHINE = { max_rpm: 24000, power_kw: 22, rigidity: "high" as const };
const REF_HOLDER = { balance_class: "g2_5" as const, operator_has_balancer: true };
const MODES: Array<[string, string | undefined]> = [
  ["cost", "cost_batch"], ["balanced", undefined], ["productivity", "aggressive_rush"],
];

function cellInput(e: ReturnType<typeof cmp.listBaselines>[number], mode: string | undefined): NineAxisInput {
  const base = {
    material: { name: e.material_name, iso_group: e.iso_group },
    tooling: { tool_diameter_mm: e.diameter_mm, tool_material: e.tool_material },
    toolpath: { operation: e.operation, cut_type: e.cut_type },
    machine: REF_MACHINE,
    tool_holder: REF_HOLDER,
    ...(mode ? { mode } : {}),
  };
  return base as unknown as NineAxisInput;
}

function bareInput(e: ReturnType<typeof cmp.listBaselines>[number]): NineAxisInput {
  return {
    material: { name: e.material_name, iso_group: e.iso_group },
    tooling: { tool_diameter_mm: e.diameter_mm, tool_material: e.tool_material },
    toolpath: { operation: e.operation, cut_type: e.cut_type },
  } as unknown as NineAxisInput;
}
const finite = (v: number, where: string): number => {
  if (!Number.isFinite(v)) throw new Error(`non-finite Vc (${v}) at ${where}`); // R12: never let NaN bias the summary
  return v;
};

const entries = cmp.listBaselines();
let defInEnv = 0, bestInEnv = 0, contained = 0, n = 0, unmatched = 0;
const defDevs: number[] = []; const bestDevs: number[] = [];
console.log(`\n=== PRISM SFC vs published vendor baselines (${entries.length} DB entries) ===`);
console.log(`material                              | pub | PRISM default | range [bare..fair-prod] | bestDelta | contained`);
console.log("-".repeat(118));

for (const e of entries) {
  // Customer out-of-box: bare input (no machine/holder/mode -> default goal, g6_3 12k cap).
  const bare = cmp.compare(bareInput(e));
  if (!bare.baseline_found || !bare.baseline_median) {
    unmatched++;
    console.log(`${(`${e.material_name} ${e.iso_group}/${e.diameter_mm}mm/${e.operation}/${e.cut_type}`).slice(0, 37).padEnd(37)} | UNMATCHED in BASELINE_DB (no self-lookup) -- excluded`);
    continue;
  }
  const pub = bare.baseline_median.vc_mpm;
  const defVc = finite(bare.prism_output.vc_mpm, "bare-default");
  const defDelta = (defVc - pub) / pub * 100;

  // Fidelity ceiling: best PRISM can produce across {bare-default} U {3 goals on an unclamped ref machine}.
  const fairVcs = MODES.map(([, m]) => finite(cmp.compare(cellInput(e, m)).prism_output.vc_mpm, `fair-${m}`));
  const allVcs = [defVc, ...fairVcs];
  const lo = Math.min(...allVcs), hi = Math.max(...allVcs);
  const deltas = allVcs.map(v => (v - pub) / pub * 100);
  const best = deltas.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a), deltas[0]!);
  const isContained = pub >= lo * 0.99 && pub <= hi * 1.01;

  n++;
  if (Math.abs(defDelta) <= 15) defInEnv++;
  if (Math.abs(best) <= 15) bestInEnv++;
  if (isContained) contained++;
  defDevs.push(Math.abs(defDelta)); bestDevs.push(Math.abs(best));

  const label = `${e.material_name} ${e.iso_group}/${e.diameter_mm}mm/${e.operation}/${e.cut_type}`;
  console.log(
    `${label.slice(0, 37).padEnd(37)} | ${pub.toFixed(0).padStart(3)} | ` +
    `${defVc.toFixed(0).padStart(4)} (${pct(defDelta).padStart(5)}) | ` +
    `[${lo.toFixed(0).padStart(4)}..${hi.toFixed(0).padStart(4)}] | ${pct(best).padStart(5)}  | ${isContained ? "YES" : " no"}`,
  );
}
console.log("-".repeat(118));
console.log(`SUMMARY: ${entries.length} DB entries, ${n} scored, ${unmatched} unmatched (excluded):`);
console.log(`  default-goal (customer out-of-box): in-envelope(+/-15%) ${defInEnv}/${n} (${(100 * defInEnv / n).toFixed(0)}%) | mean |dev| ${mean(defDevs).toFixed(1)}%`);
console.log(`  best over {default}U{3 goals,ref-machine} (fidelity ceiling): in-envelope ${bestInEnv}/${n} (${(100 * bestInEnv / n).toFixed(0)}%) | mean |dev| ${mean(bestDevs).toFixed(1)}%`);
console.log(`  pub contained in PRISM Vc range:    ${contained}/${n} (${(100 * contained / n).toFixed(0)}%)`);
