/**
 * OSCAR-SFC-9AXIS-MS0 / U-OSC-AXIS-LIVENESS -- empirical live-vs-inert map of EVERY
 * goal-named axis through the 9-axis ORCHESTRATOR surface (not the core engine).
 *
 * The goal enumerates ~15 axes (machine, spindle, controller, material, workholding,
 * tool-holder type + balance/maxRPM/rigidity/damping/runout, tooling/insert, coolant,
 * toolpath, cutting params, finish). The 102K-combo sweep (U-OSC-COMBO-SWEEP) covered
 * the 9 CORE-ENGINE axes. This probe covers the axes that live ONLY in the orchestrator
 * (machine.max_rpm / spindle / controller / workholding / tool_holder), which the core
 * sweep could not reach, and reports -- with numbers -- which actually move the
 * recommendation vs which are accepted-but-inert.
 *
 * Method: hold a base input, vary ONE axis across its real values, measure the spread
 * (max/min) of recommendation.{cutting_speed_mpm, spindle_rpm, feed_rate_mmmin, mrr_cm3min}.
 * Two bases so both corners are exercised:
 *   A = aluminum Ø6 HSM  (high implied RPM -> exercises max_rpm + balance clamps)
 *   B = steel Ø20 heavy roughing (high cutting force -> exercises clamp-force / torque)
 * spread > 1.001 on either base => axis is LIVE; ~1.000 on both => INERT on this surface.
 *
 * Read-only (no engine change). Run: cd mcp-server && npx tsx scripts/sfc-orchestrator-axis-liveness.ts
 */
import { speedFeedNineAxisOrchestratorEngine } from "../src/engines/SpeedFeedNineAxisOrchestratorEngine.js";

type Rec = { cutting_speed_mpm: number; spindle_rpm: number; feed_rate_mmmin: number; mrr_cm3min: number; tool_life_min: number };

const BASE_A: Record<string, any> = {
  material: { name: "6061-T6 Aluminum", iso_group: "N" },
  tooling: { tool_diameter_mm: 6, flutes: 3, tool_material: "carbide", tool_cost_usd: 45 },
  toolpath: { operation: "milling", cut_type: "roughing", strategy: "hsm" },
  coolant: { type: "flood" },
  machine: { rigidity: "high", max_rpm: 30000 },
  mode: "prism_optimized",
};
const BASE_B: Record<string, any> = {
  material: { name: "AISI 4140 Alloy Steel", iso_group: "P" },
  tooling: { tool_diameter_mm: 20, flutes: 4, tool_material: "carbide", tool_cost_usd: 60 },
  toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional", axial_depth_mm: 12, radial_depth_mm: 16 },
  coolant: { type: "flood" },
  machine: { rigidity: "medium", max_rpm: 10000 },
  mode: "prism_optimized",
};

function rec(base: Record<string, any>, override: (i: Record<string, any>) => void): Rec | null {
  const input = structuredClone(base);
  override(input);
  try {
    const r = speedFeedNineAxisOrchestratorEngine.run(input as any).recommendation;
    return { cutting_speed_mpm: r.cutting_speed_mpm, spindle_rpm: r.spindle_rpm, feed_rate_mmmin: r.feed_rate_mmmin, mrr_cm3min: r.mrr_cm3min, tool_life_min: r.tool_life_min };
  } catch (e) { return null; }
}

function spread(base: Record<string, any>, values: any[], apply: (i: Record<string, any>, v: any) => void) {
  const recs = values.map(v => rec(base, i => apply(i, v))).filter((x): x is Rec => x != null);
  const out: Record<keyof Rec, number> = { cutting_speed_mpm: 1, spindle_rpm: 1, feed_rate_mmmin: 1, mrr_cm3min: 1, tool_life_min: 1 };
  (Object.keys(out) as (keyof Rec)[]).forEach(k => {
    const vs = recs.map(r => r[k]).filter(n => Number.isFinite(n) && n > 0);
    if (vs.length) out[k] = Math.max(...vs) / Math.min(...vs);
  });
  return out;
}

interface AxisDef { name: string; values: any[]; apply: (i: Record<string, any>, v: any) => void; }
const AXES: AxisDef[] = [
  { name: "iso_group (material)", values: ["P","M","K","N","S","H"], apply: (i,v) => { i.material = { name: i.material.name, iso_group: v }; } },
  { name: "tool_material", values: ["carbide","hss","cermet","ceramic","cbn"], apply: (i,v) => { i.tooling.tool_material = v; } },
  { name: "coolant.type", values: ["dry","mist","mql","flood","through_tool","cryogenic"], apply: (i,v) => { i.coolant = { type: v }; } },
  { name: "machine.rigidity", values: ["low","medium","high"], apply: (i,v) => { i.machine.rigidity = v; } },
  { name: "tool_diameter_mm", values: [4,6,12,20], apply: (i,v) => { i.tooling.tool_diameter_mm = v; } },
  { name: "flutes", values: [2,3,4,6], apply: (i,v) => { i.tooling.flutes = v; } },
  { name: "mode (optimization)", values: ["cost_batch","aggressive_rush","prism_optimized"], apply: (i,v) => { i.mode = v; } },
  // -- orchestrator-only axes the core sweep could not reach --
  { name: "machine.max_rpm", values: [4000,10000,24000,60000], apply: (i,v) => { i.machine.max_rpm = v; } },
  { name: "tool_holder.balance_class", values: ["g40","g16","g6_3","g2_5","g0_4"], apply: (i,v) => { i.tool_holder = { ...(i.tool_holder||{}), balance_class: v, operator_has_balancer: true }; } },
  { name: "tool_holder.type (runout/clamp)", values: ["er_collet","mill_chuck","cat40","hsk_a63","shrink_fit"], apply: (i,v) => { i.tool_holder = { ...(i.tool_holder||{}), type: v }; } },
  { name: "spindle.hp", values: [5,15,30,50], apply: (i,v) => { i.spindle = { ...(i.spindle||{}), hp: v }; } },
  { name: "workholding.type", values: ["vacuum","magnetic","kurt_vise","chuck_4jaw","tombstone"], apply: (i,v) => { i.workholding = { ...(i.workholding||{}), type: v }; } },
  { name: "controller.high_speed_machining", values: [false,true], apply: (i,v) => { i.controller = { ...(i.controller||{}), high_speed_machining: v, smoothing: v, ai_contour_control: v }; } },
  // -- goal-named axes the original probe omitted (toolpath strategy + cut type) --
  { name: "toolpath.strategy", values: ["conventional","adaptive","trochoidal","hsm","hpc","slot"], apply: (i,v) => { i.toolpath = { ...(i.toolpath||{}), strategy: v }; } },
  { name: "toolpath.cut_type", values: ["roughing","semi_finishing","finishing"], apply: (i,v) => { i.toolpath = { ...(i.toolpath||{}), cut_type: v }; } },
  // target_ra_um needs a nose radius (the Ra~=fz^2/(32r) cusp model) -> set a corner radius too.
  { name: "toolpath.target_ra_um", values: [0.2,0.4,0.8,1.6,12.5], apply: (i,v) => { i.toolpath = { ...(i.toolpath||{}), target_ra_um: v }; i.tooling = { ...i.tooling, corner_radius_mm: 0.8 }; } },
];

console.log("=== SFC ORCHESTRATOR axis-liveness map (recommendation spread; >1.001 = LIVE) ===");
console.log("axis                                  | base | Vc     RPM    feed   MRR    life  | verdict");
console.log("--------------------------------------|------|-------------------------------------|--------");
for (const ax of AXES) {
  for (const [tag, base] of [["A", BASE_A], ["B", BASE_B]] as const) {
    const s = spread(base, ax.values, ax.apply);
    const mx = Math.max(s.cutting_speed_mpm, s.spindle_rpm, s.feed_rate_mmmin, s.mrr_cm3min, s.tool_life_min);
    const verdict = mx > 1.001 ? `LIVE (${mx.toFixed(2)}x)` : "inert";
    const f = (n: number) => n.toFixed(2).padStart(6);
    console.log(`${ax.name.padEnd(37)} |  ${tag}   |${f(s.cutting_speed_mpm)} ${f(s.spindle_rpm)} ${f(s.feed_rate_mmmin)} ${f(s.mrr_cm3min)} ${f(s.tool_life_min)} | ${verdict}`);
  }
}
console.log("\nVerdict per axis = max spread across A/B (incl tool_life_min). 'inert' on BOTH bases = accepted-but-does-not-move-the-recommendation (the real remaining gap).");
