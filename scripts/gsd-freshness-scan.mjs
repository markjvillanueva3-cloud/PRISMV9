#!/usr/bin/env node
/**
 * gsd-freshness-scan.mjs — GSD doctrine docs freshness audit
 *   (CLEANUP-MS0 / U-CLEANUP-H5)
 *
 * Daily cron sweep over `mcp-server/data/docs/gsd/` and `sections/`:
 *   - mtime staleness: files unmodified for > N days (default 90)
 *   - count-drift: GSD_QUICK.md header line claims counts (dispatchers,
 *     actions, engines, hooks, skills, scripts); cross-check against
 *     PRISM-INVENTORY-LATEST.md when available
 *
 * Outputs:
 *   - state/shared/GSD_FRESHNESS_REPORT.md  (human)
 *   - state/shared/GSD_FRESHNESS_REPORT.json (machine; schemaVersion 1)
 *
 * Advisory only — never auto-edits the docs. Operator reviews + updates
 * the doctrine when reality drifts.
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-H5.
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync,
  statSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { dirname, isAbsolute as pathIsAbsolute, resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_REPO = resolve(__dirname, "..");

const DEFAULT_GSD_DIR_REL = "mcp-server/data/docs/gsd";
const DEFAULT_INVENTORY_REL = "PRISM-INVENTORY-LATEST.md";
const DEFAULT_OUT_MD_REL = "state/shared/GSD_FRESHNESS_REPORT.md";
const DEFAULT_OUT_JSON_REL = "state/shared/GSD_FRESHNESS_REPORT.json";

const DEFAULT_STALE_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Severity codes — same shape as H4's drift detector for dashboard parity.
export const SEVERITY = Object.freeze({
  P0: "P0",
  P1: "P1",
  P2: "P2",
});

/**
 * Parse argv.
 */
export function parseArgs(argv) {
  const opts = {
    json: false,
    help: false,
    frozenTime: null,
    staleDays: DEFAULT_STALE_DAYS,
    gsdDir: null,
    inventory: null,
    outMd: null,
    outJson: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--frozen-time") opts.frozenTime = argv[++i] ?? null;
    else if (a === "--stale-days") {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) opts.staleDays = Math.floor(n);
    } else if (a === "--gsd-dir") opts.gsdDir = argv[++i] ?? null;
    else if (a === "--inventory") opts.inventory = argv[++i] ?? null;
    else if (a === "--out-md") opts.outMd = argv[++i] ?? null;
    else if (a === "--out-json") opts.outJson = argv[++i] ?? null;
  }
  return opts;
}

/**
 * Recursively list all .md files under a directory, bounded depth.
 *
 * Pure-functional: returns `[{relPath, abs, mtimeMs, sizeBytes}, ...]`.
 *
 * @param {string} dir
 * @param {number} maxDepth
 * @returns {Array<{relPath:string, abs:string, mtimeMs:number, sizeBytes:number}>}
 */
export function walkMarkdown(dir, maxDepth = 4) {
  const out = [];
  if (!existsSync(dir)) return out;
  const stack = [{ d: dir, depth: 0 }];
  while (stack.length > 0) {
    const { d, depth } = stack.pop();
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch (_) {
      continue;
    }
    for (const ent of entries) {
      const p = join(d, ent.name);
      if (ent.isDirectory()) {
        if (depth < maxDepth) stack.push({ d: p, depth: depth + 1 });
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith(".md")) {
        let st;
        try {
          st = statSync(p);
        } catch (_) {
          continue;
        }
        out.push({
          relPath: relative(dir, p).replace(/\\/g, "/"),
          abs: p,
          mtimeMs: st.mtimeMs,
          sizeBytes: st.size,
        });
      }
    }
  }
  // Stable sort by relPath
  out.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return out;
}

/**
 * Parse the count-header from GSD_QUICK.md.
 *
 * Looks for a line of the form: "## 95 dispatchers | 6346 actions | 3018 engines | 357 hooks | 503 skills | 244 scripts"
 *
 * Returns an object keyed by category (dispatchers, actions, engines,
 * hooks, skills, scripts), each → number, OR null if no header found.
 *
 * @param {string} contents
 */
export function parseQuickCounts(contents) {
  if (typeof contents !== "string") return null;
  const lines = contents.split(/\r?\n/);
  for (const line of lines) {
    if (!line.includes(" dispatchers")) continue;
    const counts = {};
    const re = /(\d+)\s+(dispatchers|actions|engines|hooks|skills|scripts)\b/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      counts[m[2]] = Number(m[1]);
    }
    if (Object.keys(counts).length > 0) return counts;
  }
  return null;
}

/**
 * Parse the inventory snapshot (PRISM-INVENTORY-LATEST.md) for the
 * same set of categories. Returns null if file can't be parsed.
 *
 * @param {string} contents
 */
export function parseInventoryCounts(contents) {
  if (typeof contents !== "string") return null;
  // The inventory has lines like:
  //   "- Engines (files): 3163"
  //   "- Dispatchers: 97"
  // Match a few common shapes.
  const counts = {};
  const patterns = [
    [/\bengines?\b[^\n]*\b(\d{2,5})\b/i, "engines"],
    [/\bdispatchers?\b[^\n]*\b(\d{2,4})\b/i, "dispatchers"],
    [/\bactions?\b[^\n]*\b(\d{2,5})\b/i, "actions"],
    [/\bhooks?\b[^\n]*\b(\d{2,4})\b/i, "hooks"],
    [/\bskills?\b[^\n]*\b(\d{2,4})\b/i, "skills"],
    [/\bscripts?\b[^\n]*\b(\d{2,4})\b/i, "scripts"],
  ];
  for (const [re, key] of patterns) {
    const m = contents.match(re);
    if (m) counts[key] = Number(m[1]);
  }
  return Object.keys(counts).length === 0 ? null : counts;
}

/**
 * Build the freshness report.
 *
 * Pure: relies entirely on provided inputs.
 *
 * @param {object} args
 */
export function buildReport({ files, quickCounts, inventoryCounts, staleDays, nowIso }) {
  const findings = [];
  const nowMs = Date.parse(nowIso);

  for (const f of files) {
    const ageDays = Number.isFinite(nowMs)
      ? Math.max(0, Math.round((nowMs - f.mtimeMs) / MS_PER_DAY))
      : null;
    if (ageDays !== null && ageDays > staleDays) {
      findings.push({
        severity: SEVERITY.P1,
        kind: "stale_mtime",
        file: f.relPath,
        ageDays,
        observation: `mtime is ${ageDays}d old (> ${staleDays}d threshold)`,
      });
    }
  }

  // Count-drift findings.
  const countDrift = [];
  if (quickCounts && inventoryCounts) {
    for (const key of Object.keys(quickCounts)) {
      const claimed = quickCounts[key];
      const observed = inventoryCounts[key];
      if (!Number.isFinite(observed)) continue;
      const delta = observed - claimed;
      const pctDelta = claimed > 0 ? Math.abs(delta) / claimed : 0;
      if (claimed !== observed) {
        // Severity: >= 25% delta or absolute > 50 → P0; else P1.
        const severity = pctDelta >= 0.25 || Math.abs(delta) > 50 ? SEVERITY.P0 : SEVERITY.P1;
        const finding = {
          severity,
          kind: "count_drift",
          category: key,
          claimed,
          observed,
          delta,
          observation: `${key}: GSD_QUICK claims ${claimed}, inventory observes ${observed} (Δ ${delta})`,
        };
        findings.push(finding);
        countDrift.push(finding);
      }
    }
  }

  const bySeverity = {
    P0: findings.filter((f) => f.severity === SEVERITY.P0).length,
    P1: findings.filter((f) => f.severity === SEVERITY.P1).length,
    P2: findings.filter((f) => f.severity === SEVERITY.P2).length,
  };
  const byKind = {};
  for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;

  // Sort: P0 first, then P1, then P2; within severity by file then kind.
  const sevOrder = { P0: 0, P1: 1, P2: 2 };
  findings.sort((a, b) => {
    if (sevOrder[a.severity] !== sevOrder[b.severity]) {
      return sevOrder[a.severity] - sevOrder[b.severity];
    }
    return (a.file || a.category || "").localeCompare(b.file || b.category || "");
  });

  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    staleDays,
    totals: {
      files: files.length,
      drift: findings.length,
    },
    bySeverity,
    byKind,
    quickCounts,
    inventoryCounts,
    countDrift,
    findings,
    oldestFile:
      files.length > 0
        ? files
            .slice()
            .sort((a, b) => a.mtimeMs - b.mtimeMs)[0]
        : null,
    newestFile:
      files.length > 0
        ? files
            .slice()
            .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]
        : null,
  };
}

export function renderMarkdown(report) {
  const lines = [];
  lines.push(`# GSD Freshness Audit`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Stale threshold: ${report.staleDays} days`);
  lines.push("");
  lines.push(`## Totals`);
  lines.push("");
  lines.push(`- GSD docs scanned: **${report.totals.files}**`);
  lines.push(`- Drift findings: **${report.totals.drift}**`);
  lines.push("");
  lines.push(`## Severity counts`);
  lines.push("");
  lines.push(`- 🔴 P0 (major count drift): **${report.bySeverity.P0}**`);
  lines.push(`- 🟠 P1 (stale mtime / minor drift): **${report.bySeverity.P1}**`);
  lines.push(`- 🟡 P2: **${report.bySeverity.P2}**`);
  lines.push("");

  if (report.quickCounts || report.inventoryCounts) {
    lines.push(`## Count cross-check`);
    lines.push("");
    lines.push(`| Category | GSD_QUICK | Inventory | Δ |`);
    lines.push(`|---|---:|---:|---:|`);
    const allKeys = new Set([
      ...Object.keys(report.quickCounts ?? {}),
      ...Object.keys(report.inventoryCounts ?? {}),
    ]);
    for (const k of [...allKeys].sort()) {
      const c = report.quickCounts?.[k];
      const o = report.inventoryCounts?.[k];
      const d = Number.isFinite(c) && Number.isFinite(o) ? o - c : "n/a";
      lines.push(`| ${k} | ${c ?? "n/a"} | ${o ?? "n/a"} | ${d} |`);
    }
    lines.push("");
  }

  lines.push(`## Findings`);
  lines.push("");
  if (report.findings.length === 0) {
    lines.push(`_no drift_`);
  } else {
    lines.push(`| Sev | Kind | File/Category | Observation |`);
    lines.push(`|---|---|---|---|`);
    for (const f of report.findings.slice(0, 50)) {
      const what = f.file ?? f.category ?? "—";
      lines.push(`| ${f.severity} | ${f.kind} | ${what} | ${f.observation} |`);
    }
  }
  lines.push("");

  if (report.oldestFile) {
    lines.push(`## File age extremes`);
    lines.push("");
    lines.push(`- Oldest: \`${report.oldestFile.relPath}\` (${new Date(report.oldestFile.mtimeMs).toISOString()})`);
    lines.push(`- Newest: \`${report.newestFile.relPath}\` (${new Date(report.newestFile.mtimeMs).toISOString()})`);
    lines.push("");
  }
  lines.push(`---`);
  lines.push(`Source: CLEANUP-MS0 / U-CLEANUP-H5 gsd-freshness-scan.mjs`);
  return lines.join("\n") + "\n";
}

function readTextSafe(path) {
  try {
    return { ok: true, value: readFileSync(path, "utf-8") };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function abs(repo, p) {
  return pathIsAbsolute(p) ? p : resolve(repo, p);
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
        "gsd-freshness-scan.mjs — GSD doctrine docs freshness audit",
        "",
        "Flags:",
        "  --json                 emit machine JSON to stdout (no MD write)",
        "  --stale-days N         mtime-stale threshold (default 90)",
        "  --frozen-time ISO      freeze 'now' for deterministic output",
        "  --gsd-dir <path>       override GSD docs dir",
        "  --inventory <path>     override PRISM-INVENTORY-LATEST.md path",
        "  --out-md <path>        override output md path",
        "  --out-json <path>      override output json path",
        "  -h, --help             print help and exit",
      ].join("\n"),
    );
    return { exitCode: 0 };
  }

  const gsdDir = abs(repo, opts.gsdDir ?? DEFAULT_GSD_DIR_REL);
  const invPath = abs(repo, opts.inventory ?? DEFAULT_INVENTORY_REL);
  const outMd = abs(repo, opts.outMd ?? DEFAULT_OUT_MD_REL);
  const outJson = abs(repo, opts.outJson ?? DEFAULT_OUT_JSON_REL);
  const nowIso = opts.frozenTime ?? new Date().toISOString();

  if (!existsSync(gsdDir)) {
    err(`[H5] FATAL: GSD dir not found: ${gsdDir}`);
    return { exitCode: 1 };
  }

  const files = walkMarkdown(gsdDir);
  const quickPath = join(gsdDir, "GSD_QUICK.md");
  const quickRes = readTextSafe(quickPath);
  const invRes = readTextSafe(invPath);

  const quickCounts = quickRes.ok ? parseQuickCounts(quickRes.value) : null;
  const inventoryCounts = invRes.ok ? parseInventoryCounts(invRes.value) : null;

  const report = buildReport({
    files,
    quickCounts,
    inventoryCounts,
    staleDays: opts.staleDays,
    nowIso,
  });

  if (opts.json) {
    out(JSON.stringify(report, null, 2));
    return { exitCode: 0, report };
  }

  writeAtomic(outJson, JSON.stringify(report, null, 2) + "\n");
  writeAtomic(outMd, renderMarkdown(report));

  out(
    `[H5] gsd freshness — ${report.totals.files} files, ${report.totals.drift} drift ` +
      `(${report.bySeverity.P0} P0 / ${report.bySeverity.P1} P1)`,
  );
  return { exitCode: 0, report };
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
      console.error("[H5] uncaught:", e);
      process.exit(1);
    },
  );
}

export const _internals = {
  DEFAULT_STALE_DAYS,
};
