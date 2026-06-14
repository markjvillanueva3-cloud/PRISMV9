#!/usr/bin/env node
// psn-attribution-report.mjs — query PSN-leg attribution coverage (lever #2 read side).
//
// The recordLegConsult tap (U-PSN-ATTR01, wired into master-index-precheck-inject)
// writes per-retrieval leg attribution to state/shared/psn-attribution.jsonl. This
// CLI is the consumer that makes that data USABLE: it answers "which of the 11 PSN
// legs is the fleet (or one session) actually consulting?" — the live blindness the
// context-learning-accel synthesis named. Pure read over the lib; the eventual
// prism_session:psn_attribution dispatcher action is a thin wrapper over this.
//
// Usage:
//   node scripts/psn-attribution-report.mjs                 # fleet-wide aggregate
//   node scripts/psn-attribution-report.mjs --session <id>  # one session's N/11
//   node scripts/psn-attribution-report.mjs --json          # machine-readable
//   node scripts/psn-attribution-report.mjs --ledger <path> # override ledger path
//
// Fail-soft: a missing/corrupt ledger reports zero coverage, never throws.

import { aggregateLegCoverage, sessionLegCoverage, renderCoverage, PSN_LEGS } from "./lib/psn-attribution-lib.mjs";

function parseArgs(argv) {
  const out = { session: null, json: false, ledgerPath: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--session") out.session = argv[++i] ?? null;
    else if (a === "--ledger") out.ledgerPath = argv[++i] ?? undefined;
  }
  return out;
}

// Build a per-leg bar line (canonical taxonomy order, including 0-count legs so
// the gaps are visible — the point is seeing which legs are NEVER consulted).
function renderByLeg(byLeg) {
  const max = Math.max(1, ...PSN_LEGS.map((l) => byLeg[l] || 0));
  return PSN_LEGS.map((leg) => {
    const n = byLeg[leg] || 0;
    const bar = "█".repeat(Math.round((n / max) * 20));
    const flag = n === 0 ? " (never consulted)" : "";
    return `  ${leg.padEnd(15)} ${String(n).padStart(6)} ${bar}${flag}`;
  }).join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const opts = args.ledgerPath ? { ledgerPath: args.ledgerPath } : {};

  if (args.session) {
    const cov = sessionLegCoverage(args.session, opts);
    if (args.json) { process.stdout.write(JSON.stringify(cov, null, 2) + "\n"); return; }
    process.stdout.write(`# PSN-attribution — session ${args.session}\n`);
    process.stdout.write(`${renderCoverage(cov)}\n`);
    process.stdout.write(`records: ${cov.records}\n\n${renderByLeg(cov.byLeg)}\n`);
    return;
  }

  const agg = aggregateLegCoverage(opts);
  if (args.json) { process.stdout.write(JSON.stringify(agg, null, 2) + "\n"); return; }
  process.stdout.write("# PSN-attribution — fleet-wide aggregate\n");
  process.stdout.write(`${renderCoverage(agg)}\n`);
  process.stdout.write(`records: ${agg.records} · sessions: ${agg.sessions}\n\n${renderByLeg(agg.byLeg)}\n`);
  if (agg.records === 0) {
    process.stdout.write("\n_(empty ledger — the recordLegConsult tap writes on master-index-precheck retrievals; "
      + "consult some knowledge first, or check PRISM_PSN_ATTRIBUTION_DISABLE.)_\n");
  }
}

main();
