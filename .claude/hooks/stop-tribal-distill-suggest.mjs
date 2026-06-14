#!/usr/bin/env node
// tier: T3
// U-HFR03 wire — tribal-distillation Stop driver.
//
// Scans skill-loop-verdicts.jsonl for AUTO-PASS shipped clusters with success
// outcome count ≥ TRIBAL_DISTILL_MIN_SUCCESS. Calls proposeTribalEntry; if a
// candidate is produced, surfaces it for operator promotion to
// knowledge/wiki/code-tribal/.
//
// Knobs: PRISM_HFR03_DISABLE=1

import { existsSync, readFileSync } from "node:fs";
import { proposeTribalEntry } from "../../scripts/lib/hermes-frontier-utils.mjs";

const VERDICTS_LEDGER = "H:/prism/state/shared/skill-loop-verdicts.jsonl";

function readVerdicts() {
  if (!existsSync(VERDICTS_LEDGER)) return [];
  let raw;
  try { raw = readFileSync(VERDICTS_LEDGER, "utf8"); } catch { return []; }
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip */ }
  }
  return out;
}

async function main() {
  if (process.env.PRISM_HFR03_DISABLE === "1") process.exit(0);
  const verdicts = readVerdicts();
  if (verdicts.length === 0) process.exit(0);
  // Group outcomes by cluster id (the verdicts ledger uses "id" or "clusterId")
  const byCluster = new Map();
  for (const v of verdicts) {
    const id = v?.id || v?.clusterId;
    if (!id) continue;
    const arr = byCluster.get(id) || [];
    arr.push(v);
    byCluster.set(id, arr);
  }
  const proposals = [];
  for (const [, entries] of byCluster) {
    const cluster = entries[0]; // first entry carries the cluster shape (id, signature, slots, ...)
    const outcomes = entries.map((e) => ({ outcome: e.outcome || "pending" }));
    const proposal = proposeTribalEntry(cluster, outcomes);
    if (proposal) proposals.push(proposal);
  }
  if (proposals.length === 0) process.exit(0);
  const lines = [`💡 Tribal-distillation — ${proposals.length} shipped cluster(s) qualify for tribal-knowledge promotion:`];
  for (const p of proposals.slice(0, 5)) {
    lines.push(`  • ${p.slug} (${p.successCount} successes) → promote to knowledge/wiki/code-tribal/${p.slug}.md`);
  }
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "Stop", additionalContext: lines.join("\n") } }));
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith("stop-tribal-distill-suggest.mjs")) {
  main().catch(() => process.exit(0));
}
