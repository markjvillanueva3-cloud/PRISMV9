#!/usr/bin/env node
// detect-engine-existence-drift.mjs -- BRAVO-RECONCILE / U-ENGINE-EXISTENCE-DRIFT
//
// Ranks milestone envelopes by ENGINE-EXISTENCE DRIFT: a "wire/build engine X"
// unit whose engine actually EXISTS + is WIRED is drift the git-unit-matcher
// missed. Read-only detection + ranking aid (R12); pairs with close-out-milestone.mjs.
//
// Usage:
//   node scripts/detect-engine-existence-drift.mjs            # rank all non-complete envelopes
//   node scripts/detect-engine-existence-drift.mjs --json     # machine-readable
//   node scripts/detect-engine-existence-drift.mjs --ids A,B  # only these milestone ids
//   node scripts/detect-engine-existence-drift.mjs --min 0.99 # only >= this driftConfidence

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { analyzeMilestone } from "./lib/engine-existence-drift-lib.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENGINES_DIR = path.join(REPO, "mcp-server", "src", "engines");
const DISPATCH_DIR = path.join(REPO, "mcp-server", "src", "tools", "dispatchers");
const MS_DIR = path.join(REPO, "mcp-server", "data", "milestones");

/** Recursively collect *.ts basenames (without extension) under a dir. */
function collectEngineNames(dir) {
  const set = new Set();
  const walk = (d) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith(".ts")) set.add(e.name.replace(/\.ts$/, ""));
    }
  };
  walk(dir);
  return set;
}

/** Concatenate all dispatcher file contents once for substring wiring checks. */
function loadDispatcherBlob(dir) {
  let blob = "";
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return blob; }
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith(".ts")) {
      try { blob += readFileSync(path.join(dir, e.name), "utf8") + "\n"; } catch { /* skip */ }
    }
  }
  return blob;
}

function parseArgs(argv) {
  const a = { json: false, ids: null, min: 0 };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--json") a.json = true;
    else if (t === "--ids") a.ids = new Set((argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean));
    else if (t === "--min") a.min = Number(argv[++i]) || 0;
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv);
  const engineSet = collectEngineNames(ENGINES_DIR);
  const dispatchBlob = loadDispatcherBlob(DISPATCH_DIR);
  const resolver = {
    engineExists: (n) => engineSet.has(n),
    engineWired: (n) => dispatchBlob.includes(n),
  };

  let files;
  try { files = readdirSync(MS_DIR).filter((f) => f.endsWith(".json")); } catch (e) {
    console.error("cannot read milestones dir:", e.message); process.exit(1);
  }

  const reports = [];
  for (const f of files) {
    let env;
    try { env = JSON.parse(readFileSync(path.join(MS_DIR, f), "utf8")); } catch { continue; }
    if (env.status === "completed" || env.status === "complete") continue; // already done
    if (args.ids && !args.ids.has(env.id)) continue;
    const a = analyzeMilestone(env, resolver);
    a.claimedStatus = env.status;
    reports.push(a);
  }

  const rank = { HIGH_CONFIDENCE_DRIFT: 0, PARTIAL_DRIFT: 1, GENUINE_OPEN: 2, INDETERMINATE: 3 };
  reports.sort((x, y) => (rank[x.classification] - rank[y.classification]) || ((y.driftConfidence || 0) - (x.driftConfidence || 0)));

  const filtered = reports.filter((r) => (r.driftConfidence || 0) >= args.min);
  const summary = {
    scanned: reports.length,
    highConfidenceDrift: reports.filter((r) => r.classification === "HIGH_CONFIDENCE_DRIFT").length,
    partialDrift: reports.filter((r) => r.classification === "PARTIAL_DRIFT").length,
    genuineOpen: reports.filter((r) => r.classification === "GENUINE_OPEN").length,
    indeterminate: reports.filter((r) => r.classification === "INDETERMINATE").length,
    engineFiles: engineSet.size,
  };

  if (args.json) {
    process.stdout.write(JSON.stringify({ summary, reports: filtered }, null, 1));
    return;
  }

  console.log("ENGINE-EXISTENCE DRIFT DETECTOR (read-only ranking aid; R12 -- verify before closing)");
  console.log(`scanned ${summary.scanned} non-complete envelopes | ${summary.engineFiles} engine files indexed`);
  console.log(`HIGH_CONFIDENCE_DRIFT=${summary.highConfidenceDrift} PARTIAL=${summary.partialDrift} GENUINE_OPEN=${summary.genuineOpen} INDETERMINATE=${summary.indeterminate}`);
  console.log("");
  for (const r of filtered) {
    if (r.classification === "INDETERMINATE") continue;
    const conf = r.driftConfidence === null ? "n/a" : r.driftConfidence.toFixed(2);
    console.log(`[${r.classification}] conf=${conf} ${r.id} (claimed=${r.claimedStatus}, ${r.engineNamingUnits} engine-units of ${r.notCompleteUnits} open)`);
    if (r.driftUnits.length) console.log(`    drift(engine-exists): ${r.driftUnits.join(", ")}`);
    if (r.missingEngines.length) console.log(`    MISSING engines (real gap): ${r.missingEngines.join(", ")}`);
    if (r.indeterminateUnits.length) console.log(`    indeterminate(no-engine, needs manual): ${r.indeterminateUnits.length}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}

export { main };
