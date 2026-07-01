#!/usr/bin/env node
// scripts/xgalaxy-inject.mjs — CLI for U-GCF-XGALAXY-INJECT (GALAXY-CONTEXT-FEDERATION-MS0).
// Selective cross-galaxy context-card inject. ALWAYS exits 0 (fail-soft plumbing — never breaks a caller).
//
//   node scripts/xgalaxy-inject.mjs --slot alpha --query "qdrant memory schema migration"
//   node scripts/xgalaxy-inject.mjs --galaxy token-optimization --query "..." --json
//   node scripts/xgalaxy-inject.mjs --query "..." --k 5 --threshold 0.2 --index <path>
//
// Knobs (env): PRISM_GCF_XGALAXY_{DISABLE,K,THRESHOLD,MAX_BYTES}.

import { maybeInjectCrossGalaxy } from "./lib/xgalaxy-inject.mjs";

function parseArgs(argv) {
  const a = { json: false, query: "", slot: "", galaxy: "", index: "", k: undefined, threshold: undefined };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--json") a.json = true;
    else if (t === "--query") a.query = argv[++i] || "";
    else if (t === "--slot") a.slot = argv[++i] || "";
    else if (t === "--galaxy") a.galaxy = argv[++i] || "";
    else if (t === "--index") a.index = argv[++i] || "";
    else if (t === "--k") a.k = parseInt(argv[++i], 10);
    else if (t === "--threshold") a.threshold = parseFloat(argv[++i]);
  }
  return a;
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  const res = maybeInjectCrossGalaxy({
    query: a.query,
    slot: a.slot || undefined,
    galaxy: a.galaxy || undefined,
    indexPath: a.index || undefined,
    k: Number.isFinite(a.k) ? a.k : undefined,
    threshold: Number.isFinite(a.threshold) ? a.threshold : undefined,
  });
  if (a.json) process.stdout.write(JSON.stringify(res) + "\n");
  else process.stdout.write(res.text ? res.text + "\n" : `(no cross-galaxy inject: ${res.reason})\n`);
  process.exit(0);
}

main();
