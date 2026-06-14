#!/usr/bin/env node
/**
 * COMBO-EFFICIENCY-MS0 / P1-U03 — Unwired-engine bridge surfacer.
 *
 * Cross-refs the 597 unwired engines (state/shared/UNWIRED-ENGINE-AUDIT-*.json)
 * against the live mcp-server/src/ code tree to compute REFERENCE FAN-IN for
 * each. The top-K by fan-in are the highest-leverage bridges: wiring one of
 * them unlocks the most downstream consumers that already name it but cannot
 * dispatch through it (because the dispatcher action is missing).
 *
 * Output: state/shared/UNWIRED-BRIDGES-TOP10.json (schemaVersion 1.0.0)
 *
 * Why not load the 562 MB system-graph.json:
 *   The graph IS the authoritative edge source, but loading it costs ~3 GB
 *   resident heap. For P1-U03 v1 we use a CHEAPER PROXY: count whole-word
 *   identifier matches across mcp-server/src/ via ripgrep. The proxy
 *   over-counts (e.g. import-site matches alongside use-site matches) but
 *   the RANKING is what matters, and over-count is uniform across all
 *   unwired engines so it doesn't bias the top-K.
 *
 * Safety:
 *   - Pure aggregator + ripgrep wrapper; no mutations.
 *   - Defensive on missing audit file (returns empty result, exit 0).
 *   - Ripgrep timeout per query (8s default) so a runaway pattern can't hang.
 *   - Excludes node_modules, dist, .git, worktree clones (prism-slot-*, prism-*).
 *
 * Pure exports (testable without filesystem / shell):
 *   parseUnwiredAudit(auditJson) → string[]   (engine names)
 *   rankByFanIn(unwiredNames, fanInMap) → { name, fanIn, reasons }[]
 *   selectTopN(ranked, n) → ranked[]
 *   classifyBridgeTier(fanIn) → "platinum" | "gold" | "silver" | "fringe"
 *
 * I/O wrapper (uses ripgrep via child_process):
 *   computeBridgeRankings({prismRoot, auditPath, srcRoot, timeout, ripgrepBin})
 *
 * CLI:
 *   node scripts/unwired-bridge-rank.mjs           # default paths, write top-10
 *   node scripts/unwired-bridge-rank.mjs --top 20  # top 20
 *   node scripts/unwired-bridge-rank.mjs --dry     # stdout only
 *   node scripts/unwired-bridge-rank.mjs --root <dir>  # alternate prism root
 *
 * Knobs:
 *   PRISM_UNWIRED_BRIDGE_RANK_DISABLE=1   no-op the CLI
 *   PRISM_UNWIRED_BRIDGE_RG_TIMEOUT_MS=N  override per-query timeout (default 8000)
 *   PRISM_UNWIRED_BRIDGE_RG_BIN=<path>    override ripgrep binary lookup
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const SCHEMA_VERSION = "1.0.0";

// Bridge tier cutoffs — chosen so:
//  - platinum (>=10 refs): genuine downstream consumers; wiring this unblocks many
//  - gold     (>=5):       solid bridge candidate
//  - silver   (>=2):       at least one referrer beyond self-import
//  - fringe   (<2):        likely orphan or already-imported-only; deprioritize
const TIER_PLATINUM = 10;
const TIER_GOLD     = 5;
const TIER_SILVER   = 2;
const DEFAULT_TIMEOUT_MS = 8000;

// Default ripgrep ignore patterns — exclude noise that would inflate counts
// without representing real downstream consumers. Worktree clones are NOT
// downstream of the canonical engine; they're branch scaffolding.
const RG_IGNORE_GLOBS = [
  "!node_modules",
  "!dist",
  "!.git",
  "!build",
  "!coverage",
  "!*.min.js",
  "!*.bundle.js",
];

// ─── Pure exports ──────────────────────────────────────────────────────────

/**
 * Extract the list of unwired engine names from the audit JSON.
 * Audit shape (per UNWIRED-ENGINE-AUDIT-YYYY-MM-DD.json):
 *   { unwiredEngines: [{engine, mtime, size_kb, suggestedDispatcher}, ...] }
 */
export function parseUnwiredAudit(auditJson) {
  if (!auditJson || typeof auditJson !== "object") return [];
  const arr = Array.isArray(auditJson.unwiredEngines) ? auditJson.unwiredEngines : [];
  return arr
    .map((e) => (e && typeof e.engine === "string" ? e.engine : null))
    .filter(Boolean);
}

/**
 * Rank unwired engines by reference fan-in.
 * @param {string[]} unwiredNames
 * @param {Map<string, {count, files}>} fanInMap  - name → ref data
 * @returns {Array<{name, fanIn, tier, files}>} sorted descending by fanIn
 */
export function rankByFanIn(unwiredNames, fanInMap) {
  if (!Array.isArray(unwiredNames)) return [];
  const map = fanInMap instanceof Map ? fanInMap : new Map();
  const rows = unwiredNames.map((name) => {
    const data = map.get(name);
    const count = data && typeof data.count === "number" ? data.count : 0;
    const files = data && Array.isArray(data.files) ? data.files.slice(0, 5) : [];
    return {
      name,
      fanIn: count,
      tier: classifyBridgeTier(count),
      sampleFiles: files,  // top-5 referring files for triage
    };
  });
  // Stable sort: primary fanIn desc, secondary name asc (deterministic across runs).
  rows.sort((a, b) => {
    if (b.fanIn !== a.fanIn) return b.fanIn - a.fanIn;
    return a.name.localeCompare(b.name);
  });
  return rows;
}

/**
 * Trim to top-N. Defensive on non-positive N.
 */
export function selectTopN(ranked, n) {
  if (!Array.isArray(ranked)) return [];
  const limit = Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
  return ranked.slice(0, limit);
}

/**
 * Classify a fan-in count into a bridge tier label.
 * Boundaries chosen for operator clarity — see header comment.
 */
export function classifyBridgeTier(fanIn) {
  if (typeof fanIn !== "number" || !Number.isFinite(fanIn) || fanIn < 0) return "fringe";
  if (fanIn >= TIER_PLATINUM) return "platinum";
  if (fanIn >= TIER_GOLD)     return "gold";
  if (fanIn >= TIER_SILVER)   return "silver";
  return "fringe";
}

// ─── I/O wrapper ───────────────────────────────────────────────────────────

/**
 * Run ripgrep for a single engine name with whole-word boundary.
 * Returns {count, files: string[]} or null on error/timeout.
 *
 * Whole-word regex `\bName\b` avoids substring matches (e.g. "ToolEngine"
 * shouldn't match "MillToolEngineRouter") while catching all real refs.
 *
 * Implementation note: spawnSync with timeout — the synchronous variant is
 * fine here because we process queries serially with a per-query bound.
 */
function ripgrepFanIn(name, srcRoot, ripgrepBin, timeoutMs, ignoreGlobs) {
  if (!name || typeof name !== "string") return null;
  // Escape any regex metachars in the engine name (defensive).
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const args = [
    "--count-matches",
    "--word-regexp",
    "--no-heading",
    "--with-filename",
  ];
  for (const ign of ignoreGlobs) {
    args.push("--glob", ign);
  }
  args.push(`\\b${escaped}\\b`, srcRoot);
  const r = spawnSync(ripgrepBin, args, {
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
  });
  // Exit code 1 = "no matches found" (normal); 0 = matches; >=2 = real error.
  if (r.error || (r.status !== 0 && r.status !== 1)) return null;
  if (r.status === 1) return { count: 0, files: [] };
  // Output format per line: <filepath>:<count>
  const lines = (r.stdout || "").split(/\r?\n/).filter(Boolean);
  let total = 0;
  const files = [];
  for (const line of lines) {
    const idx = line.lastIndexOf(":");
    if (idx < 0) continue;
    const filePath = line.slice(0, idx);
    const n = Number(line.slice(idx + 1));
    if (Number.isFinite(n) && n > 0) {
      total += n;
      files.push(filePath);
    }
  }
  return { count: total, files };
}

/**
 * Locate ripgrep binary on PATH; honor PRISM_UNWIRED_BRIDGE_RG_BIN override.
 * Returns the resolved binary string or null.
 */
function findRipgrep(override) {
  if (override && typeof override === "string" && fs.existsSync(override)) return override;
  const fromEnv = process.env.PRISM_UNWIRED_BRIDGE_RG_BIN;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  // Probe common locations + fall back to bare 'rg' (PATH lookup at spawn time).
  const candidates = process.platform === "win32"
    ? ["rg.exe", "rg", "C:\\ProgramData\\chocolatey\\bin\\rg.exe"]
    : ["rg", "/usr/local/bin/rg", "/usr/bin/rg"];
  for (const c of candidates) {
    try {
      const r = spawnSync(c, ["--version"], { encoding: "utf8", timeout: 2000 });
      if (!r.error && r.status === 0) return c;
    } catch { /* keep trying */ }
  }
  return null;  // caller falls back to UNKNOWN rankings
}

export function computeBridgeRankings({
  prismRoot = ".",
  auditPath = null,
  srcRoot = null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  ripgrepBin = null,
  ignoreGlobs = RG_IGNORE_GLOBS,
} = {}) {
  const resolve = (rel) => path.join(prismRoot, rel);
  const audit = resolveAuditPath(prismRoot, auditPath);
  const src = srcRoot ?? resolve("mcp-server/src");
  // Read audit; non-throwing on missing.
  let auditJson = null;
  try { auditJson = JSON.parse(fs.readFileSync(audit, "utf8")); }
  catch { /* missing audit → empty result */ }
  const unwired = parseUnwiredAudit(auditJson);
  if (unwired.length === 0) {
    return {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      generatedBy: "unwired-bridge-rank.mjs",
      auditPath: audit,
      srcRoot: src,
      unwiredCount: 0,
      rankings: [],
      blockers: [`audit-missing-or-empty: ${audit}`],
    };
  }
  // Locate ripgrep.
  const rg = findRipgrep(ripgrepBin);
  if (!rg) {
    return {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      generatedBy: "unwired-bridge-rank.mjs",
      auditPath: audit,
      srcRoot: src,
      unwiredCount: unwired.length,
      rankings: [],
      blockers: ["ripgrep-not-found — set PRISM_UNWIRED_BRIDGE_RG_BIN or install rg"],
    };
  }
  // Compute fan-in per engine via ripgrep. Serial — bound by timeout.
  const fanInMap = new Map();
  for (const name of unwired) {
    const fi = ripgrepFanIn(name, src, rg, timeoutMs, ignoreGlobs);
    if (fi !== null) fanInMap.set(name, fi);
  }
  const ranked = rankByFanIn(unwired, fanInMap);
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy: "unwired-bridge-rank.mjs",
    auditPath: audit,
    srcRoot: src,
    unwiredCount: unwired.length,
    ripgrepBin: rg,
    rankings: ranked,
    blockers: [],
  };
}

/**
 * Resolve the audit path: explicit > newest UNWIRED-ENGINE-AUDIT-*.json in state/shared.
 * Returns absolute path string (file existence checked by caller).
 */
function resolveAuditPath(prismRoot, explicit) {
  if (explicit && typeof explicit === "string") return path.resolve(prismRoot, explicit);
  const stateDir = path.join(prismRoot, "state/shared");
  try {
    const entries = fs.readdirSync(stateDir);
    const audits = entries
      .filter((n) => /^UNWIRED-ENGINE-AUDIT-\d{4}-\d{2}-\d{2}\.json$/.test(n))
      .sort()
      .reverse();
    if (audits.length > 0) return path.join(stateDir, audits[0]);
  } catch { /* state dir missing */ }
  return path.join(stateDir, "UNWIRED-ENGINE-AUDIT-LATEST.json");  // placeholder
}

/**
 * Build the top-N output JSON ready to write to disk.
 */
export function buildTopNReport(rankings, n = 10) {
  const topN = selectTopN(rankings.rankings || [], n);
  return {
    ...rankings,
    topN: n,
    rankings: topN,  // truncated for the dashboard view; full list lives in computeBridgeRankings()
    tierCounts: tallyTiers(rankings.rankings || []),
  };
}

function tallyTiers(rankings) {
  const counts = { platinum: 0, gold: 0, silver: 0, fringe: 0 };
  for (const r of rankings) {
    if (counts[r.tier] !== undefined) counts[r.tier] += 1;
  }
  return counts;
}

// ─── CLI ───────────────────────────────────────────────────────────────────

const DEFAULT_OUT = "state/shared/UNWIRED-BRIDGES-TOP10.json";

function parseArgs(argv) {
  const args = { dry: false, root: ".", out: null, top: 10 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry") args.dry = true;
    else if (a === "--root") args.root = argv[++i] ?? ".";
    else if (a === "--out") args.out = argv[++i] ?? null;
    else if (a === "--top") {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) args.top = Math.floor(n);
    }
  }
  return args;
}

function cliMain(argv) {
  if (process.env.PRISM_UNWIRED_BRIDGE_RANK_DISABLE === "1") {
    console.log(JSON.stringify({ ok: true, skipped: "disabled-via-env" }));
    return 0;
  }
  const { dry, root, out, top } = parseArgs(argv);
  const timeoutMs = Number(process.env.PRISM_UNWIRED_BRIDGE_RG_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const full = computeBridgeRankings({ prismRoot: root, timeoutMs });
  const report = buildTopNReport(full, top);
  if (dry) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const outPath = out ?? path.join(root, DEFAULT_OUT);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      ok: true,
      written: outPath,
      unwiredCount: report.unwiredCount,
      topN: report.topN,
      tierCounts: report.tierCounts,
      blockerCount: (report.blockers || []).length,
    }));
  }
  return 0;
}

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
