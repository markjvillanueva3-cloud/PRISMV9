#!/usr/bin/env node
// scripts/advisory-decay-report.mjs
// U-ADVISORY-DECAY (2026-06-09, slot:alpha): observability for the advisory-decay
// gate. Prints, per advisory hook, the CORRECT conversion metric (taken/INJECTED,
// not taken/fired) and the decay classification:
//   noise        -- >= 50 injections at < 5% conversion. MUTED *only if the hook
//                   self-gates via decayDecision* (opt-in; a hook whose success
//                   metric is not ollama-offload, e.g. a reaper, shows here but is
//                   never actually muted).
//   unmeasurable -- records `suggested` but has NO numeric `offloaded` taken-signal
//                   (e.g. grep-index-first). CANNOT be judged -- must be
//                   instrumented before it can ever be muted. This is the real
//                   gap this report surfaces.
//   insufficient -- has a signal but < 50 injections. Too thin to judge -> fires.
//   healthy      -- >= 50 injections at >= 5% conversion. Worth its token cost.
//
// Read-only. Honest by construction: it shows the metric, not a verdict to act on
// blindly. Usage:
//   node scripts/advisory-decay-report.mjs            # table
//   node scripts/advisory-decay-report.mjs --json     # machine-readable
//   PRISM_ADVISORY_DECAY_MAX_TAKE=0.10 node scripts/advisory-decay-report.mjs

import { decayReport, DEFAULTS, DEFAULT_STATS_PATH } from "./lib/advisory-decay.mjs";

const asJson = process.argv.includes("--json");
const rows = decayReport();

if (asJson) {
  process.stdout.write(JSON.stringify({ statsPath: DEFAULT_STATS_PATH, defaults: DEFAULTS, rows }, null, 2) + "\n");
  process.exit(0);
}

if (!rows.length) {
  process.stdout.write(`advisory-decay: no byHook telemetry at ${DEFAULT_STATS_PATH}\n`);
  process.exit(0);
}

const pct = (r) => (r === null ? "  n/a" : `${(r * 100).toFixed(1)}%`.padStart(5));
const icon = { noise: "[MUTE]", unmeasurable: "[?? ]", insufficient: "[thin]", healthy: "[ ok ]" };

process.stdout.write(
  `\nadvisory-decay report  (bar: < ${(DEFAULTS.maxTakeRate * 100).toFixed(0)}% over >= ${DEFAULTS.minInjections} injections; probe 1/${DEFAULTS.probeInterval})\n` +
  `metric = taken / INJECTED (the token-costing count), NOT taken / fired\n\n` +
  `  status        take  xtake   inj  taken  hook\n` +
  `  ------------  -----  -----  ----  -----  ----------------------------------\n`,
);
// `take` = own-bucket conversion (taken/INJECTED); for a PURE-ADVISORY hook this is the
// misleading own-offloaded-always-0 reading. `xtake` = the TRUE cross-bucket take-rate read
// from the EXECUTION bucket the suggestion drives (CONVERSION_BUCKET_MAP); n/a when the
// conversion bucket is uninstrumented (U-ADVISORY-DECAY-XBUCKET, observability only).
for (const r of rows) {
  const tag = (icon[r.status] || "[   ]");
  const taken = r.taken === null ? "  -" : String(r.taken).padStart(3);
  process.stdout.write(
    `  ${tag} ${r.status.padEnd(7)} ${pct(r.takeRate)} ${pct(r.crossBucketTakeRate)} ${String(r.injected).padStart(4)}  ${taken}    ${r.hookKey}\n`,
  );
}

// Surface the genuine actionable gaps honestly.
const unmeasurable = rows.filter((r) => r.status === "unmeasurable");
const noise = rows.filter((r) => r.status === "noise");
process.stdout.write("\n");
if (unmeasurable.length) {
  process.stdout.write(
    `INSTRUMENTATION GAP: ${unmeasurable.length} hook(s) inject advisories but record NO taken-signal\n` +
    `  (${unmeasurable.map((r) => r.hookKey).join(", ")}). Their conversion is UNMEASURED, not zero --\n` +
    `  they can never be decayed until given a real taken-signal. Route to each hook's owner.\n`,
  );
}
if (noise.length) {
  process.stdout.write(
    `\nNOISE (report-only): ${noise.map((r) => r.hookKey).join(", ")} -- >= 50 injections at < ${(DEFAULTS.maxTakeRate * 100).toFixed(0)}% conversion.\n` +
    `  MUTED only if the hook self-gates via decayDecision (opt-in). A hook whose success metric\n` +
    `  is not ollama-offload (e.g. a coordinator) shows here but is never actually muted.\n`,
  );
}
process.stdout.write("\n");
