#!/usr/bin/env node
/**
 * node-staleness-rank.mjs — META artifact for /forge-audit-v2
 *
 * Re-runnable measurement: ranks stale canonical-truth-source nodes,
 * recall/routing health, coverage gaps, and INJECTION QUALITY (auto-injection
 * hooks that fire on UserPromptSubmit/SessionStart).
 *
 * USAGE:
 *   node scripts/node-staleness-rank.mjs           # human-readable
 *   node scripts/node-staleness-rank.mjs --json    # machine-readable
 *   node scripts/node-staleness-rank.mjs --history # tail recent baselines
 *
 * EXIT: 0=healthy, 1=warn, 2=critical.
 *
 * Sister tools: synergy-regression-watch.mjs, memory-size-watch.mjs,
 * ollama-offload-dashboard.mjs.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPO = process.env.PRISM_REPO || "H:/prism";
const HISTORY_FILE = path.join(REPO, "state/shared/node-staleness-history.jsonl");

// --- Named thresholds (no inline magic numbers per linter) ---
const MEMORY_CEILING_BYTES = 24576;
const MEMORY_PCT_TRUNCATING = 1.0;
const MEMORY_PCT_IMMINENT = 0.97;
const MEMORY_PCT_WARN = 0.90;
const OLLAMA_TARGET_RATIO = 0.30;
const OLLAMA_CRIT_RATIO = 0.10;
const WIKI_GAP_CRIT = 1500;
const WIKI_GAP_WARN = 500;
const GIT_UNCOMMITTED_WARN = 1000;
const DRIFT_CRIT_COUNT = 5;
const INJECTION_NOISE_LINES_WARN = 50;
const INJECTION_NOISE_LINES_CRIT = 100;
const INJECTION_TIP_AUTO_NOISE_THRESHOLD = 3;

const SURFACES = [
  { key: "ENGINE_DIGEST",      rel: "mcp-server/data/docs/ENGINE_DIGEST.md",              warnH: 24,  critH: 72 },
  { key: "DISPATCHER_DIGEST",  rel: "mcp-server/data/docs/DISPATCHER_DIGEST.md",          warnH: 24,  critH: 72 },
  { key: "DIRECTORY_DIGEST",   rel: "mcp-server/data/docs/DIRECTORY_DIGEST.md",           warnH: 48,  critH: 120 },
  { key: "CODE_SYSTEM_INDEX",  rel: "mcp-server/data/docs/CODE_SYSTEM_INDEX.json",        warnH: 24,  critH: 72 },
  { key: "PRISM_INVENTORY",    rel: "PRISM-INVENTORY-LATEST.md",                          warnH: 24,  critH: 48 },
  { key: "AWARENESS_SNAPSHOT", rel: "state/shared/AWARENESS-SNAPSHOT.md",                 warnH: 12,  critH: 48 },
  { key: "BUILD_STATE",        rel: "state/shared/BUILD_STATE.json",                      warnH: 24,  critH: 72 },
  { key: "MILESTONE_PROGRESS", rel: "state/shared/MILESTONE_PROGRESS.json",               warnH: 24,  critH: 72 },
  { key: "WIKI_INDEX",         rel: "knowledge/wiki/index.md",                            warnH: 24,  critH: 72 },
  { key: "SKILL_TRIGGERS",     rel: "knowledge/wiki/architecture/_skill-triggers.jsonl",  warnH: 24,  critH: 72 },
  { key: "SYSTEM_GRAPH",       rel: "state/shared/system-viz/system-graph.json",          warnH: 6,   critH: 24 },
];

const MEMORY_MD = "C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md";

function statOrNull(absPath) {
  try { return fs.statSync(absPath); } catch { return null; }
}

function classifyAge(ageH, warnH, critH) {
  if (ageH > critH) return "critical";
  if (ageH > warnH) return "warn";
  return "fresh";
}

function scanSurfaces() {
  const now = Date.now();
  return SURFACES.map(s => {
    const abs = path.join(REPO, s.rel);
    const st = statOrNull(abs);
    if (!st) return { ...s, exists: false, status: "missing", ageHours: null, sizeKB: null };
    const ageH = (now - st.mtimeMs) / 3600000;
    return {
      ...s,
      exists: true,
      ageHours: +ageH.toFixed(2),
      sizeKB: +(st.size / 1024).toFixed(1),
      status: classifyAge(ageH, s.warnH, s.critH),
    };
  });
}

function memoryHealth() {
  const st = statOrNull(MEMORY_MD);
  if (!st) return { exists: false, status: "missing" };
  const bytes = fs.readFileSync(MEMORY_MD).length;
  const pct = bytes / MEMORY_CEILING_BYTES;
  let status = "fresh";
  if (pct >= MEMORY_PCT_TRUNCATING) status = "critical";
  else if (pct >= MEMORY_PCT_IMMINENT) status = "critical";
  else if (pct >= MEMORY_PCT_WARN) status = "warn";
  return { exists: true, bytes, ceiling: MEMORY_CEILING_BYTES, pctOfCeiling: +pct.toFixed(4), status };
}

function ollamaOffloadHealth() {
  // Schema v2.0.0: counters live at TOP LEVEL (.offloaded, .keptOnClaude).
  // Older schema may have wrapped them under .totals — fall back to that shape.
  const statsPath = path.join(REPO, "mcp-server/data/state/ollama-offload-stats.json");
  const st = statOrNull(statsPath);
  if (!st) return { exists: false, status: "missing" };
  try {
    const o = JSON.parse(fs.readFileSync(statsPath, "utf8"));
    const src = typeof o.offloaded === "number" ? o : (o.totals || {});
    const offloaded = src.offloaded || 0;
    const kept = src.keptOnClaude || 0;
    const total = offloaded + kept;
    const ratio = total ? offloaded / total : 0;
    let status = "fresh";
    if (ratio < OLLAMA_CRIT_RATIO) status = "critical";
    else if (ratio < OLLAMA_TARGET_RATIO) status = "warn";
    return {
      exists: true, offloaded, keptOnClaude: kept, total,
      ratio: +ratio.toFixed(3), target: OLLAMA_TARGET_RATIO,
      gap: +(OLLAMA_TARGET_RATIO - ratio).toFixed(3), status,
      schemaVersion: o.schemaVersion || "unknown",
    };
  } catch (e) {
    return { exists: true, parseError: e.message, status: "warn" };
  }
}

// wikiCoverage() removed in OBSOLESCENCE-CLEANUP-MS0/U-OBS-A2 (2026-05-17).
// MasterIndexEngine.classifyAllNodes() already classifies all nodes including
// wiki coverage; orphan-inventory.mjs + refresh-orphan-report.mjs surface
// orphans (built-with-low-degree). Consumers wanting wiki gap should call
// `prism_session:master_index_query` instead of duplicating the calc here.
// The build() function below returns wikiCoverage as a placeholder advising
// the new surface to keep the JSON shape compatible.
function wikiCoverage() {
  return {
    exists: true,
    status: "delegated",
    advisory: "Use prism_session:master_index_query for wiki coverage; this tool no longer duplicates classifyAllNodes",
  };
}

function envelopeDrift() {
  // Real drift values observed in MILESTONE_PROGRESS.json:
  //   "consistent" (606) — aligned, NOT drift
  //   "n/a" (64) — unmeasurable, NOT drift
  //   "claims_completed_but_units_pending" (11) — REAL drift
  // Earlier regex swept consistent/n/a as drift — over-counted 60×.
  // Allowlist the known-good values; everything else counts as drift.
  const ALIGNED_VALUES = new Set(["none", "in_sync", "aligned", "consistent", "n/a"]);
  const mpPath = path.join(REPO, "state/shared/MILESTONE_PROGRESS.json");
  const st = statOrNull(mpPath);
  if (!st) return { exists: false, status: "missing" };
  try {
    const raw = fs.readFileSync(mpPath, "utf8");
    const tally = {};
    for (const m of (raw.match(/"drift":\s*"[^"]+"/g) || [])) {
      const v = m.match(/"drift":\s*"([^"]+)"/)[1];
      tally[v] = (tally[v] || 0) + 1;
    }
    const drifted = Object.entries(tally)
      .filter(([k]) => !ALIGNED_VALUES.has(k))
      .reduce((sum, [, n]) => sum + n, 0);
    let status = "fresh";
    if (drifted > DRIFT_CRIT_COUNT) status = "critical";
    else if (drifted > 0) status = "warn";
    return { exists: true, driftedMilestones: drifted, breakdown: tally, status };
  } catch (e) {
    return { exists: true, parseError: e.message, status: "warn" };
  }
}

// utilizationClassificationHealth() removed in OBSOLESCENCE-CLEANUP-MS0/U-OBS-A2
// (2026-05-17). The F4 classifier degeneracy this function detected was FIXED
// in AUTO-INVOCATION-MS0/ITER 5 by re-tuning scripts/awareness-snapshot.mjs
// classify() to use isBuiltArtifact() instead of binary-doc-edge. After the
// fix, orphans went from 0 → 12,129 (real punch list) and ghosts from
// 281,683 → 823. Consumers wanting current classification stats should read
// AWARENESS-SNAPSHOT.md directly OR call MasterIndexEngine.classifyAllNodes()
// via prism_session:master_index_query.
function utilizationClassificationHealth() {
  return {
    exists: true,
    status: "delegated",
    advisory: "F4 fixed in AUTO-INVOCATION-MS0/ITER 5; read AWARENESS-SNAPSHOT.md OR call prism_session:master_index_query for live classification",
  };
}

function gitUncommitted() {
  try {
    const out = execFileSync("git", ["-C", REPO, "status", "--porcelain"], {
      encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    });
    const count = out.split("\n").filter(Boolean).length;
    return { count, status: count > GIT_UNCOMMITTED_WARN ? "warn" : "fresh" };
  } catch (e) {
    return { error: e.message, status: "warn" };
  }
}

// --- Auto-injection quality scan ---
// Pulls every UserPromptSubmit + SessionStart hook from BOTH settings.json layers,
// counts them, flags known-noise candidates by name pattern. Future enhancement:
// shadow-run each hook against an empty stdin and measure output size.
const INJECTION_NOISE_PATTERNS = [
  /discipline-expert/i,        // Random Sales/UI/UX/Software Dev expert blocks
  /tip-auto-/i,                // Auto-ingested unfiltered tribal tips
  /comprehensive-build-enforce/i, // Boilerplate text fires every prompt
  /ai-features-inject/i,       // Generic "Before creating" block
];
function injectionAudit() {
  const candidates = [
    "C:/Users/wompu/.claude/settings.json",
    path.join(REPO, ".claude/settings.json"),
  ];
  const results = [];
  for (const cfg of candidates) {
    const st = statOrNull(cfg);
    if (!st) continue;
    try {
      const j = JSON.parse(fs.readFileSync(cfg, "utf8"));
      const hooks = j.hooks || {};
      const upPlus = ["UserPromptSubmit", "SessionStart"];
      for (const evt of upPlus) {
        const groups = hooks[evt] || [];
        for (const g of groups) {
          for (const h of (g.hooks || [])) {
            const cmd = h.command || h.prompt || h.url || "(unknown)";
            const name = (cmd.match(/[^/\\]+\.mjs/) || cmd.match(/[^/\\]+\.py/) || [cmd])[0];
            const isNoise = INJECTION_NOISE_PATTERNS.some(rx => rx.test(name));
            results.push({ source: cfg.includes("wompu") ? "global" : "project", event: evt, name, matcher: g.matcher || "*", noiseFlag: isNoise });
          }
        }
      }
    } catch {}
  }
  const noiseCount = results.filter(r => r.noiseFlag).length;
  const tipAutoCount = results.filter(r => /tip-auto-/i.test(r.name)).length;
  let status = "fresh";
  if (noiseCount >= INJECTION_NOISE_LINES_CRIT) status = "critical";
  else if (noiseCount >= INJECTION_NOISE_LINES_WARN) status = "warn";
  else if (tipAutoCount >= INJECTION_TIP_AUTO_NOISE_THRESHOLD) status = "warn";
  return { totalInjectors: results.length, noiseFlagged: noiseCount, byEvent: tally(results, "event"), bySource: tally(results, "source"), noiseSample: results.filter(r => r.noiseFlag).slice(0, 8), status };
}
function tally(arr, key) {
  const out = {};
  for (const r of arr) out[r[key]] = (out[r[key]] || 0) + 1;
  return out;
}

function build() {
  const surfaces = scanSurfaces();
  const memory = memoryHealth();
  const ollama = ollamaOffloadHealth();
  const wiki = wikiCoverage();
  const drift = envelopeDrift();
  const git = gitUncommitted();
  const injections = injectionAudit();
  const utilization = utilizationClassificationHealth();

  const order = { critical: 0, warn: 1, fresh: 2, missing: 0 };
  const ranked = surfaces.slice().sort((a, b) => {
    const oa = order[a.status] ?? 3;
    const ob = order[b.status] ?? 3;
    if (oa !== ob) return oa - ob;
    return (b.ageHours || 0) - (a.ageHours || 0);
  });

  const criticalAny =
    ranked.some(s => s.status === "critical" || s.status === "missing") ||
    memory.status === "critical" ||
    ollama.status === "critical" ||
    wiki.status === "critical" ||
    drift.status === "critical" ||
    injections.status === "critical" ||
    utilization.status === "critical";
  const warnAny =
    ranked.some(s => s.status === "warn") ||
    memory.status === "warn" || ollama.status === "warn" ||
    wiki.status === "warn" || drift.status === "warn" ||
    git.status === "warn" || injections.status === "warn" ||
    utilization.status === "warn";

  return {
    generatedAt: new Date().toISOString(),
    repo: REPO,
    summary: {
      surfaces: {
        fresh: surfaces.filter(s => s.status === "fresh").length,
        warn: surfaces.filter(s => s.status === "warn").length,
        critical: surfaces.filter(s => s.status === "critical").length,
        missing: surfaces.filter(s => s.status === "missing").length,
      },
      memoryStatus: memory.status,
      ollamaStatus: ollama.status,
      wikiCoverageStatus: wiki.status,
      envelopeDriftStatus: drift.status,
      injectionStatus: injections.status,
      utilizationStatus: utilization.status,
      uncommittedFiles: git.count,
    },
    surfacesRanked: ranked,
    memory, ollama, wikiCoverage: wiki, envelopeDrift: drift, git, injections, utilization,
    exitCode: criticalAny ? 2 : warnAny ? 1 : 0,
  };
}

function appendHistory(report) {
  try {
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    const row = {
      at: report.generatedAt,
      sumCrit: report.summary.surfaces.critical,
      sumWarn: report.summary.surfaces.warn,
      mem: report.memory.pctOfCeiling,
      ollama: report.ollama.ratio,
      wikiGap: report.wikiCoverage.coverageGap,
      drift: report.envelopeDrift.driftedMilestones,
      git: report.git.count,
      injNoise: report.injections.noiseFlagged,
      injTotal: report.injections.totalInjectors,
      ghost: report.utilization.ghost,
      orphan: report.utilization.orphan,
      ghostPct: report.utilization.ghostPct,
      exit: report.exitCode,
    };
    const tmp = HISTORY_FILE + "." + process.pid + ".tmp";
    let existing = "";
    try { existing = fs.readFileSync(HISTORY_FILE, "utf8"); } catch {}
    fs.writeFileSync(tmp, existing + JSON.stringify(row) + "\n");
    fs.renameSync(tmp, HISTORY_FILE);
  } catch (e) {
    process.stderr.write(`[node-staleness-rank] history append failed: ${e.message}\n`);
  }
}

function printHistory() {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf8");
    const rows = raw.trim().split("\n").map(l => JSON.parse(l));
    console.log(JSON.stringify(rows.slice(-20), null, 2));
  } catch {
    console.log(JSON.stringify({ history: [], note: "no baselines yet" }, null, 2));
  }
}

function printHuman(r) {
  const lines = [];
  lines.push(`node-staleness-rank @ ${r.generatedAt}`);
  const verdict = r.exitCode === 0 ? "HEALTHY" : r.exitCode === 1 ? "WARN" : "CRITICAL";
  lines.push(`exit=${r.exitCode}  ${verdict}`);
  lines.push("");
  lines.push("Truth-source surfaces:");
  for (const s of r.surfacesRanked) {
    const tag = s.status === "critical" ? "❌" : s.status === "warn" ? "⚠️ " : "✅";
    lines.push(`  ${tag} ${s.key.padEnd(22)} ${String(s.ageHours).padStart(6)}h  ${s.rel}`);
  }
  lines.push("");
  lines.push(`Memory:     ${r.memory.status}  ${r.memory.bytes}/${r.memory.ceiling}B  ${(r.memory.pctOfCeiling*100).toFixed(1)}%`);
  lines.push(`Ollama:     ${r.ollama.status}  ${(r.ollama.ratio*100).toFixed(1)}% offload (target 30%, gap ${(r.ollama.gap*100).toFixed(1)}pp)`);
  if (r.wikiCoverage.status === "delegated") {
    lines.push(`Wiki gap:   delegated → prism_session:master_index_query`);
  } else {
    lines.push(`Wiki gap:   ${r.wikiCoverage.status}  ${r.wikiCoverage.built} built / ${r.wikiCoverage.wikiEntries} indexed = ${r.wikiCoverage.coverageGap} gap`);
  }
  lines.push(`Env drift:  ${r.envelopeDrift.status}  ${r.envelopeDrift.driftedMilestones} milestones`);
  lines.push(`Git:        ${r.git.status}  ${r.git.count} uncommitted`);
  lines.push(`Injectors:  ${r.injections.status}  ${r.injections.totalInjectors} hooks, ${r.injections.noiseFlagged} noise-flagged`);
  if (r.utilization.status === "delegated") {
    lines.push(`Util-class: delegated → read AWARENESS-SNAPSHOT.md (F4 fix shipped 2026-05-16)`);
  } else {
    lines.push(`Util-class: ${r.utilization.status}  ${r.utilization.ghost} ghost / ${r.utilization.orphan} orphan (ghost ${(r.utilization.ghostPct*100).toFixed(1)}%, degenerate=${r.utilization.classifierDegenerate})`);
  }
  console.log(lines.join("\n"));
}

const args = process.argv.slice(2);
if (args.includes("--history")) {
  printHistory();
} else {
  const report = build();
  appendHistory(report);
  if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else printHuman(report);
  process.exit(report.exitCode);
}
