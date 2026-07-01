#!/usr/bin/env node
// enrich-ms0-merge-agent-outputs.mjs — merge per-agent Pass 2 / Pass 3 JSON
// outputs back into the sidecar's per-unit knowledge.curatedWiki.passN block.
//
// USAGE: node scripts/enrich-ms0-merge-agent-outputs.mjs --pass=2 [--dry-run]
//
// Reads:  state/shared/dashboards/ke-pass{2,3}-resume-agent-{1..5}.json
// Writes: state/shared/roadmap-tool-plans.json (atomic via tmp+rename)
//
// Idempotent — re-runnable; the latest agent payload wins.

import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";

const SIDECAR = "H:/prism/state/shared/roadmap-tool-plans.json";
const DASH = "H:/prism/state/shared/dashboards";

const args = process.argv.slice(2);
const passArg = args.find((a) => a.startsWith("--pass="));
const PASS = passArg ? Number(passArg.split("=")[1]) : 2;
const DRY = args.includes("--dry-run");
if (PASS !== 2 && PASS !== 3) {
  console.error("FATAL: --pass must be 2 or 3");
  process.exit(1);
}

const merged = {};
let agentsRead = 0;
const missingAgents = [];
for (let i = 1; i <= 5; i++) {
  const p = `${DASH}/ke-pass${PASS}-resume-agent-${i}.json`;
  if (!existsSync(p)) {
    missingAgents.push(i);
    continue;
  }
  let payload;
  try {
    payload = JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    console.error(`FATAL: cannot parse agent-${i} output: ${e.message}`);
    process.exit(1);
  }
  for (const [id, body] of Object.entries(payload)) {
    merged[id] = body;
  }
  agentsRead++;
  console.log(`read agent-${i}: ${Object.keys(payload).length} units`);
}
if (missingAgents.length) {
  console.log(`WARN: agents ${missingAgents.join(",")} missing — proceeding with partial merge`);
}
console.log(`merged ${Object.keys(merged).length} unit payloads across ${agentsRead}/5 agents`);

const doc = JSON.parse(readFileSync(SIDECAR, "utf8"));
const plans = doc.plans || {};
let applied = 0;
let notFound = 0;
for (const [id, body] of Object.entries(merged)) {
  const plan = plans[id];
  if (!plan) {
    notFound++;
    continue;
  }
  if (!plan.knowledge) plan.knowledge = { schema: "2.0.0" };
  if (!plan.knowledge.curatedWiki) plan.knowledge.curatedWiki = {};
  plan.knowledge.curatedWiki[`pass${PASS}`] = body;
  applied++;
}
console.log(`applied to sidecar: ${applied} units · ${notFound} not found in plans`);

// rollup stats per pass
const allIds = Object.keys(plans);
const withPass = allIds.filter((id) =>
  plans[id] &&
  plans[id].knowledge &&
  plans[id].knowledge.curatedWiki &&
  plans[id].knowledge.curatedWiki[`pass${PASS}`],
).length;

doc.knowledgeEnrichment = doc.knowledgeEnrichment || {};
doc.knowledgeEnrichment[`pass${PASS}`] = {
  schema: "2.0.0",
  agentsMerged: agentsRead,
  unitsAttempted: Object.keys(merged).length,
  unitsApplied: applied,
  totalWithPass: withPass,
  total: allIds.length,
  pct: Number(((withPass / allIds.length) * 100).toFixed(1)),
  mergedAt: new Date().toISOString(),
};

if (DRY) {
  console.log("DRY-RUN — sidecar not written");
  console.log("rollup:", JSON.stringify(doc.knowledgeEnrichment[`pass${PASS}`], null, 1));
  return;
}

const tmp = `${SIDECAR}.tmp.${process.pid}`;
writeFileSync(tmp, JSON.stringify(doc, null, 1));
renameSync(tmp, SIDECAR);
console.log(
  `wrote sidecar: ${withPass}/${allIds.length} units carry pass${PASS} ` +
    `(${doc.knowledgeEnrichment[`pass${PASS}`].pct}%)`,
);
