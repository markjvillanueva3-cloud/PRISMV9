#!/usr/bin/env node
/**
 * build-awareness-health.mjs — Awareness Health Rollup
 *   (CLEANUP-MS0 / U-CLEANUP-H6)
 *
 * Daily 08:17 cron digest combining the outputs of H1-H5 audits into a
 * single operator dashboard at state/shared/AWARENESS_HEALTH_DASHBOARD.md.
 *
 * Inputs (all OPTIONAL — missing sources reported as "(n/a)"):
 *   - H1: state/shared/MEMORY_GARDEN_REPORT.json   (memory.unreferenced etc)
 *   - H2: state/shared/SKILL_UTILIZATION_REPORT.json (proposedArchive, byTier)
 *   - H3: state/shared/HOOK_UTILIZATION_REPORT.json  (orphans, dormant)
 *   - H4: state/shared/CLAUDE_MD_DRIFT_REPORT.json   (P0/P1 drift)
 *   - H5: state/shared/GSD_FRESHNESS_REPORT.json     (stale + count drift)
 *
 * Output:
 *   - state/shared/AWARENESS_HEALTH_DASHBOARD.md  (human-readable rollup)
 *   - state/shared/AWARENESS_HEALTH_DASHBOARD.json (machine; schemaVersion 1)
 *
 * Overall health score (0-100):
 *   100 - (P0 count × 10) - (P1 count × 3) - (P2 count × 1) - (orphan/proposed factor)
 *   clamped to [0, 100]. < 50 = red, < 75 = yellow, >= 75 = green.
 *
 * Trend tracking: appends a single timestamped summary row to
 * state/shared/awareness-health-trends.jsonl on every run; the latest
 * 30-day rolling window is summarized in the dashboard.
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-H6.
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  appendFileSync,
  statSync,
} from "node:fs";
import { dirname, isAbsolute as pathIsAbsolute, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_REPO = resolve(__dirname, "..");

const DEFAULT_INPUTS = {
  h1: "state/shared/MEMORY_GARDEN_REPORT.json",
  h2: "state/shared/SKILL_UTILIZATION_REPORT.json",
  h3: "state/shared/HOOK_UTILIZATION_REPORT.json",
  h4: "state/shared/CLAUDE_MD_DRIFT_REPORT.json",
  h5: "state/shared/GSD_FRESHNESS_REPORT.json",
};
const DEFAULT_OUT_MD_REL = "state/shared/AWARENESS_HEALTH_DASHBOARD.md";
const DEFAULT_OUT_JSON_REL = "state/shared/AWARENESS_HEALTH_DASHBOARD.json";
const DEFAULT_TRENDS_REL = "state/shared/awareness-health-trends.jsonl";

const TREND_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const SCORE_P0_PENALTY = 10;
const SCORE_P1_PENALTY = 3;
const SCORE_P2_PENALTY = 1;
const SCORE_ORPHAN_DIVISOR = 50; // every 50 orphans/proposed = 1 point off
const SCORE_RED_BELOW = 50;
const SCORE_YELLOW_BELOW = 75;

/**
 * Parse argv.
 */
export function parseArgs(argv) {
  const opts = {
    json: false,
    help: false,
    frozenTime: null,
    inputs: { ...DEFAULT_INPUTS },
    outMd: null,
    outJson: null,
    trendsPath: null,
    skipTrendsAppend: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--frozen-time") opts.frozenTime = argv[++i] ?? null;
    else if (a === "--h1") opts.inputs.h1 = argv[++i] ?? opts.inputs.h1;
    else if (a === "--h2") opts.inputs.h2 = argv[++i] ?? opts.inputs.h2;
    else if (a === "--h3") opts.inputs.h3 = argv[++i] ?? opts.inputs.h3;
    else if (a === "--h4") opts.inputs.h4 = argv[++i] ?? opts.inputs.h4;
    else if (a === "--h5") opts.inputs.h5 = argv[++i] ?? opts.inputs.h5;
    else if (a === "--out-md") opts.outMd = argv[++i] ?? null;
    else if (a === "--out-json") opts.outJson = argv[++i] ?? null;
    else if (a === "--trends") opts.trendsPath = argv[++i] ?? null;
    else if (a === "--skip-trends-append") opts.skipTrendsAppend = true;
  }
  return opts;
}

function readJsonSafe(path) {
  try {
    const raw = readFileSync(path, "utf-8");
    return { ok: true, value: JSON.parse(raw), mtimeMs: statSync(path).mtimeMs };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function abs(repo, p) {
  return pathIsAbsolute(p) ? p : resolve(repo, p);
}

/**
 * Compute the rolling 30-day summary from the trends JSONL.
 *
 * @param {string} contents
 * @param {string} nowIso
 */
export function summarizeTrend(contents, nowIso) {
  if (typeof contents !== "string" || contents.length === 0) {
    return { samples: 0, scoreP50: null, scoreMin: null, scoreMax: null };
  }
  const nowMs = Date.parse(nowIso);
  const cutoff = Number.isFinite(nowMs) ? nowMs - TREND_WINDOW_DAYS * MS_PER_DAY : 0;
  const scores = [];
  for (const line of contents.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      const t = Date.parse(r.ts ?? r.generatedAt ?? "");
      if (!Number.isFinite(t) || t < cutoff) continue;
      if (Number.isFinite(r.score)) scores.push(r.score);
    } catch (_) {
      /* skip malformed line */
    }
  }
  if (scores.length === 0) return { samples: 0, scoreP50: null, scoreMin: null, scoreMax: null };
  const sorted = scores.slice().sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length / 2)];
  return {
    samples: scores.length,
    scoreP50: p50,
    scoreMin: sorted[0],
    scoreMax: sorted[sorted.length - 1],
  };
}

/**
 * Read all input reports and project the digest fields.
 *
 * Pure-functional: parsers run on the raw values; missing inputs surface
 * as `available:false` on each section.
 *
 * @param {object} reports - keyed by h1..h5 with `{ok, value}` or `{ok:false}`
 */
export function projectSections(reports) {
  const out = {};

  // H1 memory garden
  if (reports.h1?.ok) {
    const r = reports.h1.value;
    out.memory = {
      available: true,
      totalFiles: r.totals?.files ?? r.scannedFiles ?? null,
      unreferenced: r.totals?.unreferenced ?? r.unreferenced?.length ?? null,
      dangling: r.totals?.danglingPointers ?? r.danglingPointers?.length ?? null,
      stalePathRefs: r.totals?.stalePathRefs ?? null,
      verdict: r.verdict ?? null,
    };
  } else {
    out.memory = { available: false };
  }

  // H2 skill utilization
  if (reports.h2?.ok) {
    const r = reports.h2.value;
    out.skills = {
      available: true,
      total: r.totals?.skills ?? null,
      active: r.counts?.active ?? null,
      proposedArchive: r.proposedArchive?.length ?? r.counts?.unknown_stale ?? 0,
      staleTelemetry: r.counts?.stale_30d ?? null,
      telemetryAvailable: r.totals?.telemetryAvailable ?? null,
    };
  } else {
    out.skills = { available: false };
  }

  // H3 hook utilization
  if (reports.h3?.ok) {
    const r = reports.h3.value;
    out.hooks = {
      available: true,
      total: r.totals?.hooks ?? null,
      wired: r.totals?.wired ?? null,
      orphans: r.issueCounts?.orphan_file ?? null,
      dormant: r.issueCounts?.dormant_30d ?? null,
      tierMismatch: r.issueCounts?.tier_mismatch ?? null,
      noTelemetry: r.issueCounts?.no_telemetry ?? null,
    };
  } else {
    out.hooks = { available: false };
  }

  // H4 CLAUDE.md drift
  if (reports.h4?.ok) {
    const r = reports.h4.value;
    out.claudeMd = {
      available: true,
      claimsAnalyzed: r.totals?.claimsAnalyzed ?? null,
      drift: r.totals?.drift ?? null,
      p0: r.bySeverity?.P0 ?? null,
      p1: r.bySeverity?.P1 ?? null,
      driftRate: r.totals?.driftRate ?? null,
    };
  } else {
    out.claudeMd = { available: false };
  }

  // H5 GSD freshness
  if (reports.h5?.ok) {
    const r = reports.h5.value;
    out.gsd = {
      available: true,
      files: r.totals?.files ?? null,
      drift: r.totals?.drift ?? null,
      p0: r.bySeverity?.P0 ?? null,
      p1: r.bySeverity?.P1 ?? null,
      countDriftCategories: r.countDrift?.length ?? 0,
    };
  } else {
    out.gsd = { available: false };
  }

  return out;
}

/**
 * Sum severity penalties across all available sections.
 *
 * Reports we know contribute P0/P1/P2: H4 + H5.
 * Orphan/proposed counts contribute via SCORE_ORPHAN_DIVISOR.
 *
 * @param {ReturnType<typeof projectSections>} sections
 */
export function aggregateSeverityCounts(sections) {
  const out = { P0: 0, P1: 0, P2: 0, orphanLike: 0 };
  if (sections.claudeMd?.available) {
    out.P0 += sections.claudeMd.p0 ?? 0;
    out.P1 += sections.claudeMd.p1 ?? 0;
  }
  if (sections.gsd?.available) {
    out.P0 += sections.gsd.p0 ?? 0;
    out.P1 += sections.gsd.p1 ?? 0;
  }
  if (sections.skills?.available) {
    out.orphanLike += sections.skills.proposedArchive ?? 0;
  }
  if (sections.hooks?.available) {
    out.orphanLike += sections.hooks.orphans ?? 0;
    out.P1 += sections.hooks.dormant ?? 0; // dormant hooks → P1 weight
    out.P0 += sections.hooks.tierMismatch ?? 0; // T0 not blocking → P0
  }
  if (sections.memory?.available) {
    out.orphanLike +=
      (sections.memory.unreferenced ?? 0) +
      (sections.memory.dangling ?? 0) +
      (sections.memory.stalePathRefs ?? 0);
  }
  return out;
}

/**
 * Compute health score 0..100 from aggregated severity.
 */
export function computeScore({ P0, P1, P2, orphanLike }) {
  const raw =
    100 -
    P0 * SCORE_P0_PENALTY -
    P1 * SCORE_P1_PENALTY -
    P2 * SCORE_P2_PENALTY -
    Math.floor(orphanLike / SCORE_ORPHAN_DIVISOR);
  return Math.max(0, Math.min(100, raw));
}

export function classifyHealth(score) {
  if (score < SCORE_RED_BELOW) return "red";
  if (score < SCORE_YELLOW_BELOW) return "yellow";
  return "green";
}

/**
 * Build the dashboard report.
 */
export function buildDashboard({ sections, trendSummary, nowIso }) {
  const severity = aggregateSeverityCounts(sections);
  const score = computeScore(severity);
  const status = classifyHealth(score);
  const availableSources = Object.entries(sections)
    .filter(([_, v]) => v.available)
    .map(([k]) => k);

  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    score,
    status,
    severity,
    availableSources,
    sections,
    trend: trendSummary,
  };
}

/**
 * Render markdown.
 */
export function renderMarkdown(dash) {
  const statusBadge =
    dash.status === "green" ? "🟢 GREEN" : dash.status === "yellow" ? "🟡 YELLOW" : "🔴 RED";
  const lines = [];
  lines.push(`# Awareness Health Dashboard`);
  lines.push("");
  lines.push(`Generated: ${dash.generatedAt}`);
  lines.push("");
  lines.push(`## Overall: ${statusBadge}  ·  score **${dash.score}/100**`);
  lines.push("");
  lines.push(`### Severity totals (aggregated across H1-H5)`);
  lines.push("");
  lines.push(`| Tier | Count |`);
  lines.push(`|---|---:|`);
  lines.push(`| 🔴 P0 | ${dash.severity.P0} |`);
  lines.push(`| 🟠 P1 | ${dash.severity.P1} |`);
  lines.push(`| 🟡 P2 | ${dash.severity.P2} |`);
  lines.push(`| ⚪ orphan-like | ${dash.severity.orphanLike} |`);
  lines.push("");

  if (dash.trend && dash.trend.samples > 0) {
    lines.push(`### 30-day trend`);
    lines.push("");
    lines.push(`- Samples: **${dash.trend.samples}**`);
    lines.push(`- Median score: **${dash.trend.scoreP50}**`);
    lines.push(`- Min / Max: **${dash.trend.scoreMin}** / **${dash.trend.scoreMax}**`);
    lines.push("");
  }

  function sectionBlock(title, available, rows) {
    lines.push(`## ${title}`);
    lines.push("");
    if (!available) {
      lines.push(`_source not available — run the upstream audit_`);
      lines.push("");
      return;
    }
    lines.push(`| Metric | Value |`);
    lines.push(`|---|---:|`);
    for (const [k, v] of rows) {
      lines.push(`| ${k} | ${v ?? "n/a"} |`);
    }
    lines.push("");
  }

  sectionBlock("H1 — Memory Garden", dash.sections.memory.available, [
    ["total files", dash.sections.memory.totalFiles],
    ["unreferenced", dash.sections.memory.unreferenced],
    ["dangling pointers", dash.sections.memory.dangling],
    ["stale path refs", dash.sections.memory.stalePathRefs],
    ["verdict", dash.sections.memory.verdict],
  ]);
  sectionBlock("H2 — Skill Utilization", dash.sections.skills.available, [
    ["total skills", dash.sections.skills.total],
    ["active (telemetry≥1)", dash.sections.skills.active],
    ["proposed archive", dash.sections.skills.proposedArchive],
    ["stale (telemetry==0)", dash.sections.skills.staleTelemetry],
    ["telemetry available", dash.sections.skills.telemetryAvailable],
  ]);
  sectionBlock("H3 — Hook Utilization", dash.sections.hooks.available, [
    ["total hooks", dash.sections.hooks.total],
    ["wired", dash.sections.hooks.wired],
    ["orphan files", dash.sections.hooks.orphans],
    ["dormant (30d)", dash.sections.hooks.dormant],
    ["tier mismatch", dash.sections.hooks.tierMismatch],
    ["no telemetry", dash.sections.hooks.noTelemetry],
  ]);
  sectionBlock("H4 — CLAUDE.md Drift", dash.sections.claudeMd.available, [
    ["claims analyzed", dash.sections.claudeMd.claimsAnalyzed],
    ["drift", dash.sections.claudeMd.drift],
    ["P0", dash.sections.claudeMd.p0],
    ["P1", dash.sections.claudeMd.p1],
    ["drift rate", dash.sections.claudeMd.driftRate],
  ]);
  sectionBlock("H5 — GSD Freshness", dash.sections.gsd.available, [
    ["GSD files", dash.sections.gsd.files],
    ["drift", dash.sections.gsd.drift],
    ["P0", dash.sections.gsd.p0],
    ["P1", dash.sections.gsd.p1],
    ["count-drift categories", dash.sections.gsd.countDriftCategories],
  ]);

  lines.push(`---`);
  lines.push(`Source: CLEANUP-MS0 / U-CLEANUP-H6 build-awareness-health.mjs`);
  return lines.join("\n") + "\n";
}

function writeAtomic(dest, contents) {
  const destDir = dirname(dest);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const tag = `${process.pid}-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const tmp = `${dest}.tmp-${tag}`;
    try {
      writeFileSync(tmp, contents, "utf-8");
      renameSync(tmp, dest);
      return;
    } catch (e) {
      lastErr = e;
      try {
        if (existsSync(tmp)) unlinkSync(tmp);
      } catch (_) {
        /* ignore */
      }
    }
  }
  throw lastErr ?? new Error(`writeAtomic failed for ${dest}`);
}

function appendTrend(path, dash) {
  const destDir = dirname(path);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  const row =
    JSON.stringify({
      ts: dash.generatedAt,
      score: dash.score,
      status: dash.status,
      P0: dash.severity.P0,
      P1: dash.severity.P1,
      orphanLike: dash.severity.orphanLike,
    }) + "\n";
  appendFileSync(path, row, "utf-8");
}

export async function main({
  argv,
  repo = DEFAULT_REPO,
  out = (...a) => console.log(...a),
  err = (...a) => console.error(...a),
} = {}) {
  const opts = parseArgs(argv ?? []);
  if (opts.help) {
    out(
      [
        "build-awareness-health.mjs — Awareness Health Rollup",
        "",
        "Flags:",
        "  --json                 emit machine JSON to stdout (no MD write)",
        "  --frozen-time ISO      freeze 'now' for deterministic output",
        "  --h1..--h5 <path>      override individual input report paths",
        "  --out-md <path>        override dashboard MD path",
        "  --out-json <path>      override dashboard JSON path",
        "  --trends <path>        override trends JSONL path",
        "  --skip-trends-append   read trends but do not append",
        "  -h, --help             print help and exit",
      ].join("\n"),
    );
    return { exitCode: 0 };
  }

  const inputs = {};
  for (const k of ["h1", "h2", "h3", "h4", "h5"]) {
    inputs[k] = abs(repo, opts.inputs[k]);
  }
  const outMd = abs(repo, opts.outMd ?? DEFAULT_OUT_MD_REL);
  const outJson = abs(repo, opts.outJson ?? DEFAULT_OUT_JSON_REL);
  const trendsPath = abs(repo, opts.trendsPath ?? DEFAULT_TRENDS_REL);
  const nowIso = opts.frozenTime ?? new Date().toISOString();

  const reports = {};
  for (const k of ["h1", "h2", "h3", "h4", "h5"]) {
    reports[k] = readJsonSafe(inputs[k]);
  }

  // Read trends (best-effort).
  let trendContents = "";
  try {
    trendContents = readFileSync(trendsPath, "utf-8");
  } catch (_) {
    /* missing trends file = empty history */
  }
  const trendSummary = summarizeTrend(trendContents, nowIso);

  const sections = projectSections(reports);
  const dash = buildDashboard({ sections, trendSummary, nowIso });

  if (opts.json) {
    out(JSON.stringify(dash, null, 2));
    return { exitCode: 0, dash };
  }

  writeAtomic(outJson, JSON.stringify(dash, null, 2) + "\n");
  writeAtomic(outMd, renderMarkdown(dash));
  if (!opts.skipTrendsAppend) {
    appendTrend(trendsPath, dash);
  }

  out(
    `[H6] awareness health — score ${dash.score}/100 (${dash.status}) ` +
      `from ${dash.availableSources.length}/5 sources; P0=${dash.severity.P0}, ` +
      `P1=${dash.severity.P1}, orphan-like=${dash.severity.orphanLike}`,
  );
  return { exitCode: 0, dash };
}

const invokedAsScript = (() => {
  try {
    const argv1 = process.argv[1];
    if (!argv1) return false;
    return resolve(argv1) === resolve(__filename);
  } catch (_) {
    return false;
  }
})();

if (invokedAsScript) {
  main({ argv: process.argv.slice(2) }).then(
    (r) => process.exit(r.exitCode),
    (e) => {
      console.error("[H6] uncaught:", e);
      process.exit(1);
    },
  );
}

export const _internals = {
  TREND_WINDOW_DAYS,
  SCORE_P0_PENALTY,
  SCORE_P1_PENALTY,
  SCORE_P2_PENALTY,
  SCORE_ORPHAN_DIVISOR,
  SCORE_RED_BELOW,
  SCORE_YELLOW_BELOW,
};
