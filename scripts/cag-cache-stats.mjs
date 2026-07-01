#!/usr/bin/env node
// cag-cache-stats.mjs -- CLI dashboard for fleet-wide CAG hit-rate telemetry (PSN leg #10).
// U-CAG-HITRATE-TELEMETRY (slot:bravo, 2026-06-14). The consumer for the recordCagStat sink
// instrumented into galaxy-reasoning-bridge.reasonForGalaxy (the shared AI substrate for all
// 34 galaxies). Sibling of ollama-offload-dashboard.mjs but for the CAG cache layer.
//
//   node scripts/cag-cache-stats.mjs            # human dashboard
//   node scripts/cag-cache-stats.mjs --json     # machine-readable summary
//   node scripts/cag-cache-stats.mjs --file <p> # read a specific stats file
import { readCagStats, summarizeCagStats, CAG_STATS_FILE } from "./lib/galaxy-cag-cache.mjs";

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const fi = argv.indexOf("--file");
  const file = fi >= 0 && argv[fi + 1] ? argv[fi + 1] : CAG_STATS_FILE;
  const summary = summarizeCagStats(readCagStats(file));

  if (json) {
    console.log(JSON.stringify({ file, ...summary }, null, 2));
    return;
  }

  const pct = (r) => `${(r * 100).toFixed(1)}%`;
  // warm hit-rate is null when it cannot be honestly computed (untagged legacy misses, or no warm
  // traffic yet) -- render "n/a", never a misleading 0% (U-CAG-HITRATE-HONESTY).
  const warmPct = (r) => (r === null || r === undefined ? "n/a" : pct(r));
  console.log(`CAG hit-rate (fleet-wide AI substrate, PSN leg #10)`);
  console.log(`  source: ${file}`);
  console.log(`  lookups: ${summary.total}  hits: ${summary.hits}  misses: ${summary.misses}  hitRate: ${pct(summary.hitRate)}`);
  // Warm hit-rate = hits over RECOVERABLE traffic (hits + invalidated); cold/novel first-ask misses
  // are excluded because a cache can never serve a never-before-asked question. This is the metric
  // that separates a cold-start-dominated low raw rate from a genuine (invalidation-churn) problem.
  console.log(`  warm hit-rate (recoverable traffic only): ${warmPct(summary.warmHitRate)}   [recoverable(invalidated): ${summary.addressableMisses} | cold/novel: ${summary.coldMisses} | untagged: ${summary.unclassifiedMisses} | legacy-quarantined: ${summary.legacyUntaggedBaseline ?? 0}]`);
  if (summary.warmHitRate === null) {
    console.log(summary.unclassifiedMisses > 0
      ? `    (warm-rate accumulating: ${summary.unclassifiedMisses} NEW untagged miss(es) beyond the legacy baseline -- an un-instrumented caller exists)`
      : `    (no warm traffic yet -- every lookup so far was a first-ask; cold-start, NOT a cache fault)`);
  } else if (summary.addressableMisses === 0) {
    console.log(`    (0 invalidations -- the cache is working; a low raw rate here is pure cold-start/low-volume, not a defect)`);
  }
  console.log(`  galaxies with CAG traffic: ${summary.galaxies}`);
  if (summary.total === 0) {
    console.log(`  (no CAG traffic recorded yet -- run a cache-on reasonForGalaxy call to populate)`);
    return;
  }
  const rows = Object.entries(summary.byGalaxy).sort((a, b) => b[1].total - a[1].total);
  console.log(`  per-galaxy (top 40 by lookups):`);
  for (const [g, v] of rows.slice(0, 40)) {
    const churn = v.addressableMisses > 0 ? ` !${v.addressableMisses}inval` : "";
    console.log(`    ${g.padEnd(22)} ${String(v.total).padStart(7)} lookups   ${pct(v.hitRate).padStart(7)} hit   warm ${warmPct(v.warmHitRate).padStart(6)}${churn}   (${v.hits}h/${v.misses}m)`);
  }
}

main();
