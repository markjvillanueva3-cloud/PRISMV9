#!/usr/bin/env node
/**
 * adaptive-thresholds.mjs
 *
 * Reads pipeline-telemetry.jsonl + compounding-gains-ledger.json + outcome
 * signals, and tunes 6 pipeline parameters that are currently hard-coded
 * magic numbers:
 *
 *   1. tier_floor_pct          — % prereq coverage required to start Tier-N work
 *      default 90%; adapt within [80, 95]
 *      tune up if observed: tier-violation rate ≤2% over last 10 milestones
 *      tune down if: blocked-but-could-have-shipped rate >10%
 *
 *   2. context_nudge_pct       — soft compaction nudge threshold
 *      default 60%; adapt within [50, 70]
 *      tune down if: drift incidents (>80% reached) >5% of milestones
 *      tune up if: nudge fires unnecessarily early (avg actual peak <70%)
 *
 *   3. context_urgent_pct      — hard compaction nudge
 *      default 80%; adapt within [70, 85]
 *      tune down if: hallucination/drift recovery events >2 last 10 mss
 *
 *   4. leverage_min            — minimum acceptable leverage_score for a Phase-2 unit
 *      default 14 (currently lowest in graph); adapt within [10, 50]
 *      tune up if: low-leverage units consistently underdeliver (realized < 50% of predicted)
 *
 *   5. dispatcher_capacity_ceiling — max actions per dispatcher before "full"
 *      default 200; adapt within [150, 300]
 *      tune down if: dispatcher response latency increases past target
 *      tune up if: capacity rejects legitimate wiring opportunities
 *
 *   6. expected_wired_delta_tolerance — ± fraction for leverage realization
 *      default 0.20 (±20%); adapt within [0.10, 0.40]
 *      tune tighter if: prediction accuracy >85% over last 10 wire-up units
 *      tune looser if: variance is genuine domain-specific noise
 *
 * Output: H:/prism/state/shared/adaptive-thresholds.json
 *
 * Usage:
 *   node adaptive-thresholds.mjs                       # compute + write
 *   node adaptive-thresholds.mjs --dry-run             # compute only, show diff
 *   node adaptive-thresholds.mjs --reset               # reset to defaults
 *   node adaptive-thresholds.mjs --get <param>         # read a single value
 *
 * The pipeline reads `state/shared/adaptive-thresholds.json` whenever any
 * of these parameters is needed. Falls back to defaults if file missing.
 */

import fs from "node:fs";
import path from "node:path";

const TELEMETRY = "H:/prism/state/shared/pipeline-telemetry.jsonl";
const LEDGER = "H:/prism/state/shared/compounding-gains-ledger.json";
const OUT = "H:/prism/state/shared/adaptive-thresholds.json";
const HISTORY = "H:/prism/state/shared/adaptive-thresholds-history.jsonl";

const DEFAULTS = {
  tier_floor_pct: 90,
  context_nudge_pct: 60,
  context_urgent_pct: 80,
  leverage_min: 14,
  dispatcher_capacity_ceiling: 200,
  expected_wired_delta_tolerance: 0.20,
};

const BOUNDS = {
  tier_floor_pct: [80, 95],
  context_nudge_pct: [50, 70],
  context_urgent_pct: [70, 85],
  leverage_min: [10, 50],
  dispatcher_capacity_ceiling: [150, 300],
  expected_wired_delta_tolerance: [0.10, 0.40],
};

function args() {
  const a = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    }
  }
  return opts;
}

function readJSONL(p) {
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf8").split("\n").filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function readJSON(p, fb) {
  if (!fs.existsSync(p)) return fb;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return fb; }
}

function clamp(v, [lo, hi]) {
  return Math.max(lo, Math.min(hi, v));
}

function recentMilestones(telemetry, n = 10) {
  // Return the N most recent unique milestones from telemetry
  const seen = new Set();
  const out = [];
  for (let i = telemetry.length - 1; i >= 0 && out.length < n; i--) {
    const m = telemetry[i].milestone;
    if (m && !seen.has(m)) {
      seen.add(m);
      out.unshift(m);
    }
  }
  return out;
}

function tune(telemetry, ledger) {
  const recent = recentMilestones(telemetry, 10);
  const tuned = { ...DEFAULTS };
  const reasoning = {};

  // 1. tier_floor_pct
  const tierViolations = telemetry.filter((r) =>
    r.event === "violation" && r.payload?.kind === "tier-skip" &&
    recent.includes(r.milestone),
  ).length;
  const tierViolationRate = recent.length > 0 ? tierViolations / recent.length : 0;
  if (tierViolationRate <= 0.02 && recent.length >= 5) {
    tuned.tier_floor_pct = clamp(DEFAULTS.tier_floor_pct - 5, BOUNDS.tier_floor_pct);
    reasoning.tier_floor_pct = `low violation rate (${(tierViolationRate * 100).toFixed(1)}%) — relaxed by 5pt`;
  } else if (tierViolationRate > 0.10) {
    tuned.tier_floor_pct = clamp(DEFAULTS.tier_floor_pct + 5, BOUNDS.tier_floor_pct);
    reasoning.tier_floor_pct = `high violation rate (${(tierViolationRate * 100).toFixed(1)}%) — tightened by 5pt`;
  } else {
    reasoning.tier_floor_pct = `default (violation rate ${(tierViolationRate * 100).toFixed(1)}%)`;
  }

  // 2. context_nudge_pct
  const driftEvents = telemetry.filter((r) =>
    r.event === "violation" && r.payload?.kind === "context-overrun" &&
    recent.includes(r.milestone),
  ).length;
  if (recent.length > 0 && driftEvents / recent.length > 0.05) {
    tuned.context_nudge_pct = clamp(DEFAULTS.context_nudge_pct - 5, BOUNDS.context_nudge_pct);
    reasoning.context_nudge_pct = `drift incidents at ${((driftEvents / recent.length) * 100).toFixed(1)}% — earlier nudge`;
  } else {
    reasoning.context_nudge_pct = "default (no drift evidence)";
  }

  // 3. context_urgent_pct
  const hallucinationEvents = telemetry.filter((r) =>
    r.event === "violation" && r.payload?.kind === "hallucination-recovery" &&
    recent.includes(r.milestone),
  ).length;
  if (hallucinationEvents > 2) {
    tuned.context_urgent_pct = clamp(DEFAULTS.context_urgent_pct - 5, BOUNDS.context_urgent_pct);
    reasoning.context_urgent_pct = `${hallucinationEvents} hallucination events in last ${recent.length} ms — earlier urgent`;
  } else {
    reasoning.context_urgent_pct = "default (no hallucination evidence)";
  }

  // 4. leverage_min — tune from underdeliver rate
  const wireOutcomes = telemetry.filter((r) =>
    r.event === "outcome" && r.payload?.kind === "leverage-realized" &&
    recent.includes(r.milestone),
  );
  const underdeliver = wireOutcomes.filter((r) =>
    r.payload?.realized && r.payload?.predicted &&
    r.payload.realized < r.payload.predicted * 0.5,
  ).length;
  if (wireOutcomes.length >= 5 && underdeliver / wireOutcomes.length > 0.30) {
    tuned.leverage_min = clamp(DEFAULTS.leverage_min + 5, BOUNDS.leverage_min);
    reasoning.leverage_min = `${((underdeliver / wireOutcomes.length) * 100).toFixed(0)}% units underdelivered — raise floor`;
  } else {
    reasoning.leverage_min = "default";
  }

  // 5. dispatcher_capacity_ceiling — tune from observed dispatcher latency
  const latencyOverruns = telemetry.filter((r) =>
    r.event === "violation" && r.payload?.kind === "dispatcher-latency",
  ).length;
  if (latencyOverruns > 3) {
    tuned.dispatcher_capacity_ceiling = clamp(DEFAULTS.dispatcher_capacity_ceiling - 25, BOUNDS.dispatcher_capacity_ceiling);
    reasoning.dispatcher_capacity_ceiling = `${latencyOverruns} latency overruns — tighten ceiling`;
  } else {
    reasoning.dispatcher_capacity_ceiling = "default";
  }

  // 6. expected_wired_delta_tolerance
  const accurateWires = wireOutcomes.filter((r) =>
    r.payload?.realized && r.payload?.predicted &&
    Math.abs(r.payload.realized - r.payload.predicted) <= r.payload.predicted * 0.10,
  ).length;
  if (wireOutcomes.length >= 10 && accurateWires / wireOutcomes.length > 0.85) {
    tuned.expected_wired_delta_tolerance = clamp(DEFAULTS.expected_wired_delta_tolerance - 0.05, BOUNDS.expected_wired_delta_tolerance);
    reasoning.expected_wired_delta_tolerance = `${((accurateWires / wireOutcomes.length) * 100).toFixed(0)}% predictions within ±10% — tighten`;
  } else {
    reasoning.expected_wired_delta_tolerance = "default";
  }

  return { values: tuned, reasoning, sample_size: recent.length };
}

const opts = args();

if (opts.reset) {
  fs.writeFileSync(OUT, JSON.stringify({
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    values: DEFAULTS,
    reasoning: { reset: "all parameters reset to defaults" },
    sample_size: 0,
  }, null, 2));
  console.log("RESET — all thresholds back to defaults");
  process.exit(0);
}

if (opts.get) {
  const cur = readJSON(OUT, { values: DEFAULTS });
  const v = cur.values?.[opts.get] ?? DEFAULTS[opts.get];
  if (v === undefined) {
    console.error(`Unknown parameter: ${opts.get}`);
    process.exit(1);
  }
  console.log(v);
  process.exit(0);
}

const telemetry = readJSONL(TELEMETRY);
const ledger = readJSON(LEDGER, { entries: [] });

const result = tune(telemetry, ledger);
const out = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  values: result.values,
  defaults: DEFAULTS,
  reasoning: result.reasoning,
  sample_size: result.sample_size,
  telemetry_records: telemetry.length,
  ledger_entries: (ledger.entries || []).length,
};

if (opts.signals) {
  // COMMAND-KERNEL-MS0/U-CK27 — surface dormant-by-data state per parameter.
  // For each of the 6 tuning signals, count matching telemetry records over
  // the recent-milestone window and flag DORMANT (zero signal records) vs.
  // LIVE (≥1 record). R12: name the dormant state explicitly so operators
  // know which signals need producer-side wiring before the tuner adapts.
  const tel = readJSONL(TELEMETRY);
  const recent = recentMilestones(tel, 10);
  const recentSet = new Set(recent);
  const inRecent = (r) => r.milestone && recentSet.has(r.milestone);
  const inWindow = tel.filter(inRecent);
  const signals = {
    tier_floor_pct: {
      expected: 'event="violation" payload.kind="tier-skip"',
      matched: inWindow.filter((r) => r.event === "violation" && r.payload?.kind === "tier-skip").length,
    },
    context_nudge_pct: {
      expected: 'event="violation" payload.kind="context-overrun"',
      matched: inWindow.filter((r) => r.event === "violation" && r.payload?.kind === "context-overrun").length,
    },
    context_urgent_pct: {
      expected: 'event="violation" payload.kind="hallucination-recovery"',
      matched: inWindow.filter((r) => r.event === "violation" && r.payload?.kind === "hallucination-recovery").length,
    },
    leverage_min: {
      expected: 'event="outcome" payload.kind="leverage-realized" {realized, predicted}',
      matched: inWindow.filter((r) => r.event === "outcome" && r.payload?.kind === "leverage-realized").length,
    },
    dispatcher_capacity_ceiling: {
      expected: 'event="violation" payload.kind="dispatcher-latency"',
      matched: inWindow.filter((r) => r.event === "violation" && r.payload?.kind === "dispatcher-latency").length,
    },
    expected_wired_delta_tolerance: {
      expected: 'event="outcome" payload.kind="leverage-realized" (≥10 records)',
      matched: inWindow.filter((r) => r.event === "outcome" && r.payload?.kind === "leverage-realized").length,
    },
  };
  const report = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    telemetryRecords: tel.length,
    recentMilestones: recent,
    recentRecords: inWindow.length,
    signals: Object.fromEntries(Object.entries(signals).map(([k, v]) => [k, {
      ...v,
      status: v.matched > 0 ? "LIVE" : "DORMANT",
    }])),
    dormantCount: Object.values(signals).filter((s) => s.matched === 0).length,
    liveCount: Object.values(signals).filter((s) => s.matched > 0).length,
  };
  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    console.log("ADAPTIVE THRESHOLDS — SIGNAL REPORT");
    console.log("====================================");
    console.log(`Telemetry: ${tel.length} records · recent window: ${recent.length} milestones (${inWindow.length} records)`);
    console.log(`Signals: ${report.liveCount} LIVE · ${report.dormantCount} DORMANT`);
    console.log("");
    for (const [k, v] of Object.entries(report.signals)) {
      const tag = v.status === "LIVE" ? "✓" : "○";
      console.log(`  ${tag} ${k.padEnd(36)} ${v.matched} matched   [${v.expected}]`);
    }
    console.log("");
    if (report.dormantCount > 0) {
      console.log(`R12: ${report.dormantCount} signal(s) are DORMANT — producer-side wiring required before the tuner can adapt those parameters.`);
    }
  }
  process.exit(0);
}

if (opts.trajectory) {
  // Show last 10 tunes per parameter from history.jsonl
  if (!fs.existsSync(HISTORY)) {
    console.log("No threshold history yet. Run a milestone-close to populate.");
    process.exit(0);
  }
  const lines = fs.readFileSync(HISTORY, "utf8").split("\n").filter(Boolean);
  const records = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  console.log("ADAPTIVE THRESHOLDS — TRAJECTORY");
  console.log("================================");
  console.log(`Total tunes recorded: ${records.length}`);
  console.log("");
  for (const k of Object.keys(DEFAULTS)) {
    console.log(`  ${k}:`);
    const trail = records.slice(-10).map((r) => r.values?.[k]).filter((v) => v !== undefined);
    console.log(`    last 10: ${trail.join(" → ")}`);
    if (trail.length >= 2) {
      const swings = trail.slice(1).reduce((a, v, i) => a + Math.abs(v - trail[i]), 0);
      const range = Math.max(...trail) - Math.min(...trail);
      const flag = swings > 2 * range ? " [THRASH]" : "";
      console.log(`    range: ${range}, total swing: ${swings}${flag}`);
    }
    console.log("");
  }
  process.exit(0);
}

if (opts["dry-run"]) {
  const prev = readJSON(OUT, { values: DEFAULTS });
  console.log("ADAPTIVE THRESHOLDS — DRY RUN");
  console.log("==============================");
  console.log("Sample: " + result.sample_size + " milestones, " + telemetry.length + " telemetry records");
  console.log("");
  for (const k of Object.keys(DEFAULTS)) {
    const before = prev.values?.[k] ?? DEFAULTS[k];
    const after = result.values[k];
    const delta = after === before ? "(unchanged)" : `${before} → ${after}`;
    console.log(`  ${k.padEnd(36)} ${delta}`);
    console.log(`    ${result.reasoning[k]}`);
  }
} else {
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  // Append to history.jsonl so --trajectory can show drift over time
  try {
    fs.appendFileSync(HISTORY, JSON.stringify({
      ts: out.generatedAt,
      values: out.values,
      reasoning: out.reasoning,
      sample_size: out.sample_size,
    }) + "\n");
  } catch { /* silent */ }
  console.log("ADAPTIVE THRESHOLDS UPDATED");
  console.log("============================");
  console.log("Sample: " + result.sample_size + " milestones");
  for (const k of Object.keys(DEFAULTS)) {
    console.log(`  ${k.padEnd(36)} = ${result.values[k]}`);
  }
  console.log("");
  console.log(`Wrote: ${OUT}`);
}
