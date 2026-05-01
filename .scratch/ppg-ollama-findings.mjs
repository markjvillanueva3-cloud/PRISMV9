#!/usr/bin/env node
// Apply 2 actionable Ollama findings: Bayesian UQ → predictive QA (MS33), Graph theory → supply-chain (MS37)
import { promises as fs } from "node:fs";
import path from "node:path";
const MS_DIR = "H:/prism/mcp-server/data/milestones";
const NOW = new Date().toISOString();
const TAG = "ollama-findings-2026-04-29";
const changes = [];
async function load(id){const p=path.join(MS_DIR,`${id}.json`);return{p,json:JSON.parse(await fs.readFile(p,"utf8"))};}
async function save(p,j){j.last_updated=NOW;await fs.writeFile(p,JSON.stringify(j,null,2)+"\n");}
function patched(j){return Array.isArray(j._patches)&&j._patches.includes(TAG);}
function mark(j){j._patches=[...new Set([...(j._patches||[]),TAG])];}

// MS33 — add Bayesian UQ → predictive quality unit
{
  const {p,json}=await load("PPG-MS33");
  if(!patched(json)){
    json.units.push({
      id:"U-PPGM205b",
      title:"Bayesian UQ → predictive per-characteristic quality assurance",
      scope:"src/engines/PredictiveQAPerCharacteristicEngine.ts — for each toleranced characteristic, fits Bayesian posterior over (process Cpk, machine drift rate, tool wear contribution); predicts probability of escape (out-of-tolerance shipment) for next N parts; surfaces in wizard with confidence interval. Closes the gap between process capability (current SPC) and predictive escape risk (forward-looking). Cross-domain transfer from uncertainty quantification to quality control. Variability: ≥3 characteristic classes (size/orientation/profile). Adversarial: zero-sample characteristic (cold start), bimodal Cpk history.",
      files_to_modify:["src/engines/PredictiveQAPerCharacteristicEngine.ts","src/engines/PreEmitSafetyPredicateEngine.ts"],
      tests_to_add:["src/__tests__/PredictiveQAPerCharacteristic.integration.test.ts"],
      ollama_finding_source:"cross-domain: Bayesian UQ → quality control (qwen2.5-coder:7b 2026-04-29)"
    });
    json.total_units=json.units.length;
    json.completion_criteria.push("Predictive QA per-characteristic emits P(escape) with confidence band on JM Die D2 reference; ≥80% accuracy at characteristic-level escape prediction");
    mark(json);await save(p,json);
    changes.push("PPG-MS33: +U-PPGM205b (Bayesian UQ → predictive QA per-characteristic)");
  }
}
// MS37 — add Graph theory → supply-chain unit
{
  const {p,json}=await load("PPG-MS37");
  if(!patched(json)){
    json.units.push({
      id:"U-PPGM226",
      title:"Graph theory → tool/material supply-chain optimization (multi-supplier, multi-job, multi-machine flow)",
      scope:"src/engines/SupplyChainGraphOptimizerEngine.ts — models tool inventory + supplier lead times + job demand as a flow network; solves min-cost flow (existing graph theory algorithms in prism_calc: graph_mst_kruskal, graph_bellman_ford, graph_topo_sort, network_flow_calc) to optimize: (a) which supplier to order from, (b) when to order (lead time vs stockout risk), (c) which tools to share across jobs (set cover), (d) which jobs to bundle for tooling efficiency. Cross-domain transfer from graph theory to manufacturing supply chain. Composes with PredictiveToolProcurement (U-PPGM222). Variability: ≥3 supply chain regimes (single-supplier, multi-supplier dual-source, geographic multi-region). Adversarial: supplier outage mid-order, demand spike, missing lead-time data.",
      files_to_modify:["src/engines/SupplyChainGraphOptimizerEngine.ts","src/engines/PredictiveToolProcurementEngine.ts"],
      tests_to_add:["src/__tests__/SupplyChainGraphOptimizer.integration.test.ts"],
      ollama_finding_source:"cross-domain: Graph theory → supply chain (qwen2.5-coder:7b 2026-04-29)"
    });
    json.total_units=json.units.length;
    json.completion_criteria.push("Supply-chain graph optimizer reduces stockout events by additional ≥30% over U-PPGM222 baseline on 90-day pilot");
    mark(json);await save(p,json);
    changes.push("PPG-MS37: +U-PPGM226 (Graph theory → supply-chain min-cost flow)");
  }
}
console.log(JSON.stringify({patched_at:NOW,tag:TAG,changes},null,2));
