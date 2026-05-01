#!/usr/bin/env node
// Multi-pass Ollama opportunity hunter — qwen2.5-coder:7b classifies uncited engines + dispatcher actions
// against current PPG-MS roadmap; returns ranked opportunities. Free (local). Concurrent.

import fs from "node:fs";
import path from "node:path";

const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const MODEL = "qwen2.5-coder:7b";
const MS_DIR = "H:/prism/mcp-server/data/milestones";
const ENGINE_DIGEST = "H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md";
const DISPATCHER_DIGEST = "H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md";
const OUT = "H:/prism/.scratch/ollama-opportunities.json";

// ---------- Helpers ----------
async function askOllama(prompt, opts = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.3, num_predict: opts.max ?? 800, ...opts.options }
      })
    });
    const j = await res.json();
    const elapsed = Date.now() - t0;
    return { ok: true, response: j.response || "", elapsed_ms: elapsed };
  } catch (err) {
    return { ok: false, error: String(err), elapsed_ms: Date.now() - t0 };
  }
}

// ---------- Load PPG roadmap context ----------
const ppgFiles = fs.readdirSync(MS_DIR).filter(f => f.startsWith("PPG-MS") && f.endsWith(".json"));
const citedEngines = new Set();
const ppgTitles = [];
for (const f of ppgFiles) {
  const j = JSON.parse(fs.readFileSync(path.join(MS_DIR, f), "utf8"));
  ppgTitles.push(`${j.id}: ${j.title}`);
  const text = JSON.stringify(j);
  const matches = text.match(/[A-Z][a-zA-Z0-9]+Engine/g) || [];
  matches.forEach(e => citedEngines.add(e));
}
console.error(`PPG roadmap: ${ppgFiles.length} milestones, ${citedEngines.size} engines cited`);

// ---------- Engine digest scan ----------
const engineLines = fs.readFileSync(ENGINE_DIGEST, "utf8").split(/\r?\n/);
const engineEntries = [];
for (const line of engineLines) {
  const m = line.match(/^\|\s*E\d+\s*\|\s*([A-Z][a-zA-Z0-9]+)\s*\|\s*([^|]+)\|\s*([^|]+)\|/);
  if (m) {
    const name = m[1].trim();
    const file = m[2].trim();
    const desc = m[3].trim();
    engineEntries.push({ name, file, desc });
  }
}
console.error(`Engine digest: ${engineEntries.length} engines parsed`);

// Filter to high-leverage candidates (post-relevant keywords) NOT cited in PPG
const POST_KEYWORDS = /post|toolpath|gcode|wizard|setup|probe|operator|strategy|adaptive|sensor|predict|reason|learn|drift|calibrat|audit|visual|dashboard|forecast|anomal|clust|optimi|invers|forensic|monte|stochast|pareto|bayesian|tribal|wear|chatter|thermal|surface|fixture|clamp|workhold|coolant|chip|rapid|cycle|cost|energy|sustain/i;
const candidates = engineEntries.filter(e =>
  POST_KEYWORDS.test(e.name + " " + e.desc) &&
  !citedEngines.has(e.name + "Engine") &&
  !citedEngines.has(e.name)
);
console.error(`Filtered candidates: ${candidates.length} engines (post-relevant, uncited)`);

// ---------- Chunk + parallel hunt ----------
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Build summary of existing PPG capabilities for context
const ppgSummary = ppgTitles.slice(0, 12).join("\n") + `\n... and ${ppgTitles.length - 12} more.`;

// Hunt 1: classify engine candidates in parallel chunks of 80
const ENGINE_CHUNK = 80;
const engineChunks = chunk(candidates, ENGINE_CHUNK);

async function huntEngines(idx, list) {
  const lines = list.map(e => `- ${e.name}: ${e.desc.slice(0, 110)}`).join("\n");
  const prompt = `You are auditing a CNC manufacturing post-processor roadmap (PPG) for an industrial software platform called PRISM.

CONTEXT: PPG already plans ~225 units across 39 milestones covering: block-by-block S/F, multi-CAM master post (Hurco/Okuma/Mitsubishi/etc), WEDM master post, lathe master post, 5-dialect controllers, omega-tier safety, AGI gates, 3-tier verifier, pre-emit safety predicates, compliance (AS9100/NADCAP/ITAR/ISO13485/IATF16949/CMMC), causal-counterfactual reasoning, self-healing posts, Pareto multi-program authoring, multi-sensor real-time adaptation, federated cross-shop intelligence, operator-facing AI surfaces (AR/voice/GD&T probe).

TASK: From the list of UNCITED engines below, identify the TOP 8 that would add OPERATOR-VISIBLE value to PPG and are NOT already covered by the planned milestones above. Output strict JSON only:
[{"engine":"Name","reason":"specific operator value in <40 words","milestone_target":"NEW or MS#"}]

UNCITED ENGINES (chunk ${idx + 1} of ${engineChunks.length}):
${lines}

JSON output only, no preamble.`;
  return askOllama(prompt, { max: 1500 });
}

// Hunt 2: dispatcher action gaps
async function huntDispatcherGaps() {
  // DISPATCHER_DIGEST.md may not exist; fall back to a hand-summarized list of major dispatcher actions
  let dispatcher;
  if (fs.existsSync(DISPATCHER_DIGEST)) {
    dispatcher = fs.readFileSync(DISPATCHER_DIGEST, "utf8").slice(0, 12000);
  } else {
    dispatcher = `prism_calc: ~700 actions (cutting_force, thermal, deflection, chatter, tool_life, surface_finish, monte_carlo, kalman_filter, pso/ga/sa/de_optimize, etc)
prism_cam: ~1500 actions (toolpath_generate, gcode_*, post_*, vericut_export, ncsimul_export, mastercam_*, hypermill_*, fusion360_*, edm_wire_program, grind_*, laser_*, waterjet_*, cnc_simulate*)
prism_safety: ~30 actions (collision_check, validate_rapid_moves, calculate_clamp_force, predict_tool_breakage, monitor_spindle_thermal)
prism_diagnosis: ~50 actions (forensic_*, inverse_solve, scrap_analyze, alarm_intel_*, error_remediation_*)
prism_intelligence: ~150 actions (job_plan, setup_sheet, what_if, parameter_optimize, ai_orchestrate_*, sfc_*, ppg_*, shop_*, acnc_*)
prism_business: ~400 actions (financial_*, costing_*, quoting_*, scheduling_*, capacity_*, quality_spc_*, customer_*, integration_export_*, traveler_*)
prism_machine_setup: ~70 actions (spindle_load_monitor, opcua_*, mtconnect_*, hobby_cnc_*, cobot_*, machine_capability_*)
prism_machine_live: ~60 actions (machine_register, chatter_detect_live, tool_wear_*, adaptive_*, maint_*, mqtt_*, mtconnect_spindle_load, kiosk_*)
prism_knowledge: ~100 actions (search, cross_query, formula, kg_*, troubleshoot_*, learn_*, tribal_*, obsidian_*)
prism_orchestrate: ~30 actions (agent_execute, swarm_*, roadmap_*, plan_*)
prism_omega: ~6 actions (compute, breakdown, validate, optimize, history, auto_score)
prism_validate: ~13 actions (material, kienzle, taylor, johnson_cook, safety, prediction_validate, calibration_run, benchmark_run, uncertainty_quantify)
prism_quality: ~17 actions (blueprint_*, cmm_plan, cpk_predict, fai_*, gauge_rr, gdt_validate, spc_calculate, tolerance_stack, measurement_analyze)
prism_data: ~140 actions (material_*, machine_*, tool_*, alarm_*, formula_*, coolant_*, coating_*, cmm_*, fusion_material_*, holder_*, surface_finish_*)
prism_thread: ~20 actions (calculate_tap_drill, thread_mill_*, thread_strength, thread_strip)`;
  }
  const prompt = `You are auditing PRISM's MCP dispatcher inventory for a CNC post-processor (PPG) plan.

CURRENT PPG MILESTONES (39 total, ~225 units):
${ppgSummary}

DISPATCHER INVENTORY (excerpt):
${dispatcher}

TASK: Find 8 dispatcher ACTIONS (not engines) that would meaningfully enhance PPG but appear unwired into post emission today. Focus on actions named like *_predict, *_optimize, *_route, *_recommend, *_simulate, *_analyze where the post-processor user (programmer/operator) would directly benefit.

Output strict JSON: [{"action":"name","dispatcher":"prism_X","value":"<40 words","milestone_target":"NEW or MS#"}]

JSON only, no preamble.`;
  return askOllama(prompt, { max: 1500 });
}

// Hunt 3: cross-domain pattern transfer
async function huntCrossDomain() {
  const prompt = `PRISM has engines spanning 15 scientific domains: control theory (PID, LQR, Kalman), materials science (Johnson-Cook, Paris, Norton creep), robotics, machine learning, signal processing (FFT, wavelets), optimization (NSGA-II, GA, PSO, SA, DE), reliability (Weibull, AMSAA, RBD), uncertainty quantification (Monte Carlo, Bayesian, copula), graph theory, computational geometry (NURBS, BVH, Voronoi), thermodynamics, fluid mechanics, structural mechanics, computer vision, NLP.

CURRENT PPG ROADMAP (39 milestones, ~225 units):
${ppgSummary}

TASK: Propose 6 NOVEL cross-domain pattern transfers that would benefit PPG specifically — taking a technique mature in one domain and applying it to manufacturing posts where it's not common. Be concrete, not generic.

Output strict JSON: [{"transfer_name":"X→Y","source_domain":"...","target_problem":"...","value":"<60 words","milestone_target":"NEW or MS#"}]

JSON only, no preamble.`;
  return askOllama(prompt, { max: 1800 });
}

// Hunt 4: business-model / GTM opportunities (free reasoning, no engine citation)
async function huntBusinessOpps() {
  const prompt = `Context: PRISM PPG (post processor) is a CNC manufacturing platform competing with SolidCAM iMachining ($8-15k/seat), Vericut ($5-12k), Mastercam, hyperMILL. Customer #1 is JM Die Company (21 machines). Roadmap has 39 milestones covering technical depth + compliance + GTM.

TASK: Propose 6 business-model OR go-to-market angles that are non-obvious but would create defensible advantage. Examples: pricing structures, ecosystem plays, distribution moats, network effects, data flywheels. Think: "what's the unfair advantage no competitor can copy quickly?"

Output strict JSON: [{"angle_name":"...","mechanism":"<80 words","why_unique_to_prism":"<40 words"}]

JSON only, no preamble.`;
  return askOllama(prompt, { max: 1800 });
}

// Hunt 5: failure-mode / risk / what-could-go-wrong
async function huntFailureModes() {
  const prompt = `Context: PRISM PPG roadmap has 39 milestones covering everything from block-by-block S/F to AR setup sheets to federated learning. Many capabilities depend on each other.

TASK: Identify 5 NON-OBVIOUS failure modes or strategic risks in this plan that scrutiny passes typically miss. Examples: capability that only works for shops with specific tooling, dep that creates a bottleneck, capability that competitors will rapidly copy, capability that creates regulatory exposure, capability that confuses operators rather than helping.

Output strict JSON: [{"risk_name":"...","mode":"<80 words","mitigation":"<40 words"}]

JSON only, no preamble.`;
  return askOllama(prompt, { max: 1800 });
}

// ---------- Run all hunts in controlled parallel waves ----------
console.error(`Starting hunts: ${engineChunks.length} engine chunks + 4 thematic hunts...`);
const t0 = Date.now();

const allEnginePromises = engineChunks.map((c, i) => huntEngines(i, c));
const thematic = [
  huntDispatcherGaps(),
  huntCrossDomain(),
  huntBusinessOpps(),
  huntFailureModes()
];

const [engineResults, dispatcherR, crossR, bizR, failR] = await Promise.all([
  Promise.all(allEnginePromises),
  ...thematic
]);

const elapsed = Date.now() - t0;
console.error(`All hunts complete in ${(elapsed / 1000).toFixed(1)}s`);

// ---------- Parse + collect ----------
function tryJson(text) {
  if (!text) return null;
  // Extract first JSON array from response (qwen sometimes adds ```json fences)
  const match = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

const engineOpps = [];
for (let i = 0; i < engineResults.length; i++) {
  const r = engineResults[i];
  if (!r.ok) { console.error(`Engine chunk ${i} failed: ${r.error}`); continue; }
  const arr = tryJson(r.response);
  if (Array.isArray(arr)) engineOpps.push(...arr);
  else console.error(`Engine chunk ${i}: unparseable, raw len=${r.response.length}`);
}

const dispatcherOpps = tryJson(dispatcherR.response) || [];
const crossOpps = tryJson(crossR.response) || [];
const bizOpps = tryJson(bizR.response) || [];
const failOpps = tryJson(failR.response) || [];

// De-dupe engine opps by name
const seen = new Set();
const dedupedEngine = [];
for (const o of engineOpps) {
  const k = (o.engine || "").toLowerCase();
  if (!k || seen.has(k)) continue;
  seen.add(k);
  dedupedEngine.push(o);
}

const out = {
  meta: {
    generated_at: new Date().toISOString(),
    model: MODEL,
    elapsed_seconds: Math.round(elapsed / 1000),
    ppg_milestones: ppgFiles.length,
    engines_cited_in_ppg: citedEngines.size,
    engine_candidates_audited: candidates.length,
    engine_opportunities_returned: dedupedEngine.length,
    dispatcher_opportunities: dispatcherOpps.length,
    cross_domain_opportunities: crossOpps.length,
    business_opportunities: bizOpps.length,
    failure_modes: failOpps.length
  },
  engine_opportunities: dedupedEngine,
  dispatcher_action_gaps: dispatcherOpps,
  cross_domain_pattern_transfers: crossOpps,
  business_model_angles: bizOpps,
  failure_modes_and_risks: failOpps
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.error(`Wrote ${OUT}`);
console.log(JSON.stringify(out.meta, null, 2));
