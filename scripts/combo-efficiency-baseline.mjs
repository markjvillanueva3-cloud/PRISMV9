#!/usr/bin/env node
/**
 * COMBO-EFFICIENCY-MS0 / P0-U02 — Combo-efficiency telemetry baseline collector
 *
 * Pure aggregator over the four PSN substrate dashboards. Emits a single JSON
 * that becomes the cross-iter delta surface so future COMBO-EFFICIENCY iters
 * (P1-U01 take-rate fix, P1-U02 wiki link densifier, P1-U03 unwired bridge
 * surfacer) can measure improvement against a stable baseline.
 *
 * Substrates measured:
 *   • Obsidian brain  — wiki/memory link density
 *   • System-viz      — ghost.unwired-engine count + orphan count
 *   • Master-index    — route-suggest fires / takes / take-rate
 *   • Ollama          — offload rate, tokens saved
 *   • PSN combo       — cross-substrate nudge/hit totals (umbrella metric)
 *
 * Sources (all read-only):
 *   state/shared/dashboards/psn-savings-aggregate.json
 *   state/shared/dashboards/mcp-route-takerate-audit.json
 *   state/shared/.knowledge-link-audit.json
 *   mcp-server/data/state/ollama-offload-stats.json
 *   state/shared/AWARENESS-SNAPSHOT.json  (system-viz ghost counts — already aggregated)
 *
 * Output:
 *   state/shared/dashboards/combo-efficiency-baseline.json (schemaVersion 1.0.0)
 *
 * Substrate health thresholds:
 *   GREEN   — substrate working at >= target
 *   YELLOW  — degraded but functional (e.g. take-rate 5-30%)
 *   RED     — broken/dead (e.g. 0% take-rate, 100% Ollama skip)
 *   UNKNOWN — source file missing or unparseable
 *
 * The aggregator NEVER throws on missing sources — substrates with missing
 * inputs get status UNKNOWN. This keeps the cron-safe contract: a broken
 * source upstream doesn't take down the whole baseline emit.
 *
 * Pure exports (testable without filesystem):
 *   classifyObsidian(audit)
 *   classifyMasterIndex(audit)
 *   classifyOllama(stats)
 *   classifySystemViz(awareness)
 *   classifyComboUmbrella(psn)
 *   computeOverallScore(substrates)
 *   buildBaseline({psn, route, link, ollama, awareness})
 *
 * Side-effecting wrapper:
 *   collectBaseline({prismRoot?, outPath?}) — reads sources, writes JSON
 *
 * CLI:
 *   node scripts/combo-efficiency-baseline.mjs           # write to default path
 *   node scripts/combo-efficiency-baseline.mjs --dry     # print to stdout, no write
 *   node scripts/combo-efficiency-baseline.mjs --root <dir>  # use alternate prism root
 *
 * Knobs:
 *   PRISM_COMBO_EFFICIENCY_BASELINE_DISABLE=1  — no-op the CLI
 */

import fs from "node:fs";
import path from "node:path";

export const SCHEMA_VERSION = "1.0.0";

// ─── Threshold table (single source of truth) ──────────────────────────────
// All thresholds are inclusive lower bounds for GREEN unless noted.
export const THRESHOLDS = {
  obsidian: {
    wikiBreakPctGreen: 1.0,    // <= 1.0% broken → GREEN
    wikiBreakPctYellow: 5.0,   // <= 5.0% → YELLOW, else RED
  },
  masterIndex: {
    takeRateGreen: 0.30,       // >= 30% → GREEN
    takeRateYellow: 0.05,      // >= 5%  → YELLOW, else RED
  },
  ollama: {
    offloadRateGreen: 0.30,    // >= 30% → GREEN
    offloadRateYellow: 0.10,   // >= 10% → YELLOW, else RED
  },
  systemViz: {
    unwiredGreen: 100,         // <= 100 unwired → GREEN
    unwiredYellow: 400,        // <= 400 → YELLOW, else RED
  },
};

// ─── Pure classifiers (no I/O) ─────────────────────────────────────────────

/**
 * Classify Obsidian wiki↔memory link density from .knowledge-link-audit.json.
 * Audit shape: { broken: [...], wikiDir, memDir, generatedAt, ... }
 * The audit doesn't store totalLinks directly — we treat brokenCount as the
 * primary signal and compute breakPct only when totalLinks is provided.
 */
export function classifyObsidian(audit) {
  if (!audit || typeof audit !== "object") {
    return { status: "UNKNOWN", reason: "audit-missing", brokenCount: null, breakPct: null };
  }
  const brokenCount = Array.isArray(audit.broken) ? audit.broken.length : null;
  if (brokenCount === null) {
    return { status: "UNKNOWN", reason: "audit-shape-invalid", brokenCount: null, breakPct: null };
  }
  // totalLinks may be explicit (newer audits) or implicit (we only have broken).
  // Without total, we fall back to absolute-count thresholds.
  const totalLinks = typeof audit.totalLinks === "number" && audit.totalLinks > 0
    ? audit.totalLinks
    : null;
  const breakPct = totalLinks ? (brokenCount / totalLinks) * 100 : null;
  let status;
  if (breakPct !== null) {
    if (breakPct <= THRESHOLDS.obsidian.wikiBreakPctGreen) status = "GREEN";
    else if (breakPct <= THRESHOLDS.obsidian.wikiBreakPctYellow) status = "YELLOW";
    else status = "RED";
  } else {
    // Absolute count fallback: <500 broken → GREEN, <2000 → YELLOW, else RED.
    if (brokenCount < 500) status = "GREEN";
    else if (brokenCount < 2000) status = "YELLOW";
    else status = "RED";
  }
  return {
    status,
    reason: breakPct !== null ? `${breakPct.toFixed(2)}% broken` : `${brokenCount} broken (no total)`,
    brokenCount,
    breakPct,
    totalLinks,
    wikiDir: audit.wikiDir ?? null,
    memDir: audit.memDir ?? null,
  };
}

/**
 * Classify master-index suggestion adoption from mcp-route-takerate-audit.json.
 * Audit shape: { summary: {totalFires, totalTakes, fleetTakeRate, dominantClassifier, ...}, rows: [...] }
 */
export function classifyMasterIndex(audit) {
  if (!audit || typeof audit !== "object" || !audit.summary) {
    return { status: "UNKNOWN", reason: "audit-missing", fires: null, takes: null, takeRate: null };
  }
  const s = audit.summary;
  const fires = typeof s.totalFires === "number" ? s.totalFires : null;
  const takes = typeof s.totalTakes === "number" ? s.totalTakes : null;
  const takeRate = typeof s.fleetTakeRate === "number" ? s.fleetTakeRate : null;
  if (fires === null || takes === null || takeRate === null) {
    return { status: "UNKNOWN", reason: "summary-shape-invalid", fires, takes, takeRate };
  }
  let status;
  if (takeRate >= THRESHOLDS.masterIndex.takeRateGreen) status = "GREEN";
  else if (takeRate >= THRESHOLDS.masterIndex.takeRateYellow) status = "YELLOW";
  else status = "RED";
  return {
    status,
    reason: `take-rate ${(takeRate * 100).toFixed(1)}% (${takes}/${fires})`,
    fires,
    takes,
    takeRate,
    dominantClassifier: s.dominantClassifier ?? null,
    dominantShare: s.dominantShare ?? null,
    healthSignal: s.healthSignal ?? null,
  };
}

/**
 * Classify Ollama offload effectiveness from ollama-offload-stats.json.
 * Stats shape: { offloaded, keptOnClaude, estimatedTokensSaved, byCategory, byHook, ... }
 */
export function classifyOllama(stats) {
  if (!stats || typeof stats !== "object") {
    return { status: "UNKNOWN", reason: "stats-missing", offloaded: null, keptOnClaude: null, offloadRate: null };
  }
  const offloaded = typeof stats.offloaded === "number" ? stats.offloaded : null;
  const keptOnClaude = typeof stats.keptOnClaude === "number" ? stats.keptOnClaude : null;
  if (offloaded === null || keptOnClaude === null) {
    return { status: "UNKNOWN", reason: "stats-shape-invalid", offloaded, keptOnClaude, offloadRate: null };
  }
  const total = offloaded + keptOnClaude;
  // Edge case: total === 0 → no traffic yet, status UNKNOWN (not RED — we have no signal).
  if (total === 0) {
    return { status: "UNKNOWN", reason: "no-traffic-yet", offloaded, keptOnClaude, offloadRate: 0, tokensSaved: stats.estimatedTokensSaved ?? 0 };
  }
  const offloadRate = offloaded / total;
  let status;
  if (offloadRate >= THRESHOLDS.ollama.offloadRateGreen) status = "GREEN";
  else if (offloadRate >= THRESHOLDS.ollama.offloadRateYellow) status = "YELLOW";
  else status = "RED";
  return {
    status,
    reason: `offload ${(offloadRate * 100).toFixed(1)}% (${offloaded}/${total})`,
    offloaded,
    keptOnClaude,
    offloadRate,
    tokensSaved: stats.estimatedTokensSaved ?? 0,
    silentSuggestions: stats.silentSuggestions ?? 0,
    injectedSuggestions: stats.injectedSuggestions ?? 0,
  };
}

/**
 * Classify system-viz orphan/ghost density from AWARENESS-SNAPSHOT.json.
 * Awareness shape (per build-state-snapshot.mjs / awareness-snapshot generator):
 *   { unwiredEngines, ghostCount, orphanCount, ... } — fields vary, we read defensively.
 */
export function classifySystemViz(awareness) {
  if (!awareness || typeof awareness !== "object") {
    return { status: "UNKNOWN", reason: "awareness-missing", unwiredEngines: null, ghostCount: null, orphanCount: null };
  }
  // Multiple possible field names — read each, prefer the most specific.
  const unwiredEngines = typeof awareness.unwiredEngines === "number"
    ? awareness.unwiredEngines
    : typeof awareness.unwired === "number" ? awareness.unwired : null;
  const ghostCount = typeof awareness.ghostCount === "number"
    ? awareness.ghostCount
    : typeof awareness.ghosts === "number" ? awareness.ghosts : null;
  const orphanCount = typeof awareness.orphanCount === "number"
    ? awareness.orphanCount
    : typeof awareness.orphans === "number" ? awareness.orphans : null;
  if (unwiredEngines === null) {
    return { status: "UNKNOWN", reason: "unwired-count-missing", unwiredEngines, ghostCount, orphanCount };
  }
  let status;
  if (unwiredEngines <= THRESHOLDS.systemViz.unwiredGreen) status = "GREEN";
  else if (unwiredEngines <= THRESHOLDS.systemViz.unwiredYellow) status = "YELLOW";
  else status = "RED";
  return {
    status,
    reason: `${unwiredEngines} unwired engines${ghostCount !== null ? `, ${ghostCount} ghosts` : ""}${orphanCount !== null ? `, ${orphanCount} orphans` : ""}`,
    unwiredEngines,
    ghostCount,
    orphanCount,
  };
}

/**
 * Combo umbrella metric — cross-substrate nudge/hit totals from psn-savings-aggregate.
 */
export function classifyComboUmbrella(psn) {
  if (!psn || typeof psn !== "object" || !psn.totals) {
    return { status: "UNKNOWN", reason: "psn-missing", nudges: null, hits: null, savedTokens: null };
  }
  const t = psn.totals;
  const nudges = typeof t.nudges === "number" ? t.nudges : null;
  const hits = typeof t.hits === "number" ? t.hits : null;
  const savedTokens = typeof t.savedTokens === "number" ? t.savedTokens : null;
  if (nudges === null || hits === null) {
    return { status: "UNKNOWN", reason: "totals-shape-invalid", nudges, hits, savedTokens };
  }
  // Umbrella status: don't double-grade — this is observational, not a gate.
  return {
    status: "OBSERVED",
    reason: `${hits} hits / ${nudges} nudges / ${(savedTokens ?? 0).toLocaleString()} tokens saved`,
    nudges,
    hits,
    savedTokens: savedTokens ?? 0,
    misses: typeof t.misses === "number" ? t.misses : null,
    ledgersWithData: typeof t.ledgersWithData === "number" ? t.ledgersWithData : null,
  };
}

/**
 * Overall combo score — weighted average of substrate health (0..1).
 * UNKNOWN substrates are excluded from the weighted denominator (don't penalize
 * for a missing source — surface it as a separate `unknownCount`).
 *
 * Status → numeric weight: GREEN=1.0, YELLOW=0.5, RED=0.0, UNKNOWN=excluded, OBSERVED=excluded.
 */
export function computeOverallScore(substrates) {
  if (!substrates || typeof substrates !== "object") return { score: null, zone: "UNKNOWN", contributingCount: 0, unknownCount: 0 };
  const weights = { GREEN: 1.0, YELLOW: 0.5, RED: 0.0 };
  let sum = 0;
  let contributing = 0;
  let unknown = 0;
  for (const key of Object.keys(substrates)) {
    const s = substrates[key];
    if (!s || typeof s.status !== "string") continue;
    if (s.status === "UNKNOWN") { unknown++; continue; }
    if (!(s.status in weights)) continue;  // skip OBSERVED + anything else
    sum += weights[s.status];
    contributing++;
  }
  if (contributing === 0) return { score: null, zone: "UNKNOWN", contributingCount: 0, unknownCount: unknown };
  const score = sum / contributing;
  let zone;
  if (score >= 0.75) zone = "GREEN";
  else if (score >= 0.40) zone = "YELLOW";
  else zone = "RED";
  return { score, zone, contributingCount: contributing, unknownCount: unknown };
}

/**
 * Build the full baseline object (pure — takes parsed sources as input).
 */
export function buildBaseline({ psn, route, link, ollama, awareness, generatedAt } = {}) {
  const substrates = {
    obsidian: classifyObsidian(link),
    systemViz: classifySystemViz(awareness),
    masterIndex: classifyMasterIndex(route),
    ollama: classifyOllama(ollama),
  };
  const combo = classifyComboUmbrella(psn);
  const overall = computeOverallScore(substrates);
  // Surface blockers + recommendations so future iters know what to fix first.
  const blockers = [];
  const recommendations = [];
  for (const [name, s] of Object.entries(substrates)) {
    if (s.status === "RED") blockers.push(`${name}: ${s.reason}`);
    if (s.status === "UNKNOWN") blockers.push(`${name} UNKNOWN: ${s.reason}`);
  }
  if (substrates.ollama.status === "RED") {
    recommendations.push("Run P0-U01 (Revive Ollama) — gates P1-U02 wiki link densifier + P1-U03 bridge surfacer if Ollama-shaped.");
  }
  if (substrates.masterIndex.status === "RED") {
    recommendations.push("Run P1-U01 (take-rate fix) — biggest single leverage; turns nudges into adoptions.");
  }
  if (substrates.obsidian.status === "RED" || substrates.obsidian.status === "YELLOW") {
    recommendations.push("Run P1-U02 (wiki link densifier) — closes broken `[[name]]` tokens.");
  }
  if (substrates.systemViz.status === "RED" || substrates.systemViz.status === "YELLOW") {
    recommendations.push("Run P1-U03 (unwired bridge surfacer) — top-10 highest-fan-in unwired engines.");
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: generatedAt ?? new Date().toISOString(),
    generatedBy: "combo-efficiency-baseline.mjs",
    substrates,
    comboUmbrella: combo,
    overall,
    blockers,
    recommendations,
  };
}

// ─── I/O wrapper (safe defaults) ──────────────────────────────────────────

const DEFAULT_SOURCES = {
  psn:       "state/shared/dashboards/psn-savings-aggregate.json",
  route:     "state/shared/dashboards/mcp-route-takerate-audit.json",
  link:      "state/shared/.knowledge-link-audit.json",
  ollama:    "mcp-server/data/state/ollama-offload-stats.json",
  awareness: "state/shared/AWARENESS-SNAPSHOT.json",
};
const DEFAULT_OUT = "state/shared/dashboards/combo-efficiency-baseline.json";

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;  // missing or invalid → null (classifier surfaces UNKNOWN)
  }
}

export function collectBaseline({ prismRoot = ".", outPath = null, write = true } = {}) {
  const resolve = (rel) => path.join(prismRoot, rel);
  const sources = {
    psn:       safeReadJson(resolve(DEFAULT_SOURCES.psn)),
    route:     safeReadJson(resolve(DEFAULT_SOURCES.route)),
    link:      safeReadJson(resolve(DEFAULT_SOURCES.link)),
    ollama:    safeReadJson(resolve(DEFAULT_SOURCES.ollama)),
    awareness: safeReadJson(resolve(DEFAULT_SOURCES.awareness)),
  };
  const baseline = buildBaseline(sources);
  if (write) {
    const out = outPath ?? resolve(DEFAULT_OUT);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(baseline, null, 2));
    return { baseline, written: out };
  }
  return { baseline, written: null };
}

// ─── CLI ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dry: false, root: ".", out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry") args.dry = true;
    else if (a === "--root") args.root = argv[++i] ?? ".";
    else if (a === "--out") args.out = argv[++i] ?? null;
  }
  return args;
}

function cliMain(argv) {
  if (process.env.PRISM_COMBO_EFFICIENCY_BASELINE_DISABLE === "1") {
    console.log(JSON.stringify({ ok: true, skipped: "disabled-via-env" }));
    return 0;
  }
  const { dry, root, out } = parseArgs(argv);
  const result = collectBaseline({ prismRoot: root, outPath: out, write: !dry });
  if (dry) {
    console.log(JSON.stringify(result.baseline, null, 2));
  } else {
    console.log(JSON.stringify({ ok: true, written: result.written, zone: result.baseline.overall.zone, score: result.baseline.overall.score, blockerCount: result.baseline.blockers.length }));
  }
  return 0;
}

// Run only when invoked directly (not when imported by tests).
const isMain = (() => {
  try {
    const invokedAs = process.argv[1] && path.resolve(process.argv[1]);
    const selfPath = new URL(import.meta.url).pathname.replace(/^\//, "");
    return invokedAs && path.resolve(selfPath) === invokedAs;
  } catch { return false; }
})();
if (isMain) {
  process.exit(cliMain(process.argv.slice(2)));
}
