#!/usr/bin/env node
// enrich-ms0-resume-slicer.mjs — slice the 1011 enriched tool-plans into 5
// agent-input files for KNOWLEDGE-ENRICH-MS0 Pass 2 / Pass 3 resumption.
//
// USAGE: node scripts/enrich-ms0-resume-slicer.mjs --pass=2  (or --pass=3)
//
// Reads:  state/shared/roadmap-tool-plans.json
// Writes: state/shared/dashboards/ke-pass{2,3}-resume-slice-{1..5}.json
//
// Each slice carries the unit id + title + Pass 1 evidence the agent needs to
// reason from. Idempotent — re-runnable.

import { readFileSync, writeFileSync } from "node:fs";

const SIDECAR = "H:/prism/state/shared/roadmap-tool-plans.json";
const OUT_DIR = "H:/prism/state/shared/dashboards";
const N_SLICES = 5;

const args = process.argv.slice(2);
const passArg = args.find((a) => a.startsWith("--pass="));
const PASS = passArg ? Number(passArg.split("=")[1]) : 2;
if (PASS !== 2 && PASS !== 3) {
  console.error("FATAL: --pass must be 2 or 3");
  process.exit(1);
}

const doc = JSON.parse(readFileSync(SIDECAR, "utf8"));
const plans = doc.plans || {};
const ids = Object.keys(plans).sort();
if (ids.length === 0) {
  console.error("FATAL: 0 plans in sidecar");
  process.exit(1);
}

// Build payload per unit: only the fields the agent needs.
function payloadFor(id) {
  const plan = plans[id];
  const k = plan.knowledge || {};
  const base = {
    unitId: id,
    title: k.quickContext || id,
    acceptanceCriteria: k.acceptanceCriteria || "",
    relatedSubsystems: k.relatedSubsystems || [],
    pass1: {
      archWiki: (k.resources && k.resources.wiki) || [],
      tribal: (k.resources && k.resources.tribal) || [],
      prismAwareness: k.prismAwareness || [],
    },
  };
  if (PASS === 3 && k.curatedWiki && k.curatedWiki.pass2) {
    base.pass2 = k.curatedWiki.pass2;
  }
  return base;
}

const sliceSize = Math.ceil(ids.length / N_SLICES);
const slices = [];
for (let i = 0; i < N_SLICES; i++) {
  const chunkIds = ids.slice(i * sliceSize, (i + 1) * sliceSize);
  const obj = {};
  for (const id of chunkIds) obj[id] = payloadFor(id);
  slices.push(obj);
}

for (let i = 0; i < N_SLICES; i++) {
  const path = `${OUT_DIR}/ke-pass${PASS}-resume-slice-${i + 1}.json`;
  writeFileSync(path, JSON.stringify(slices[i], null, 1));
  console.log(`wrote ${path} (${Object.keys(slices[i]).length} units)`);
}
console.log(`total: ${ids.length} units sliced into ${N_SLICES} files for Pass ${PASS}`);
