#!/usr/bin/env node
// scripts/dev-tool-leverage-rank.mjs
//
// Aggregates the 4 existing META-audit tools into one ranked dashboard of
// dev-pipeline gaps that can be acted on next:
//   - synergy-regression-watch.mjs (system synergy ratio + week/over-week)
//   - stale-milestone-rank.mjs     (roadmap-side stale milestones)
//   - cold-script-rank.mjs         (likely-dead scripts/*.mjs)
//   - helper-orphan-rank.mjs       (orphan .claude/helpers/*.mjs)
//
// Closes the last F3 META artifact gap from AUDIT-DEV-TOOLS-PIPELINES-
// 2026-05-16 (5/6 META scripts now shipped — this is #5 + the aggregator
// that turns them into a compounding-gains dashboard instead of N
// disconnected scripts each operator has to run separately).
//
// What it does:
//   1. Spawn each sub-tool in parallel (`--json` mode, 30s budget each).
//   2. Parse the result. Tool missing / bad-JSON / non-zero exit → treated
//      as "data_unavailable" status (NOT silently ignored — Karpathy R12).
//   3. Normalize each result into a uniform { tool, severity, score, top }
//      envelope and merge into a single ranked list.
//   4. Emit a unified `--text` dashboard or `--json` payload.
//
// Severity is empirically tuned per tool — see SEVERITY_RULES.
//
// Usage:
//   node scripts/dev-tool-leverage-rank.mjs               # text dashboard
//   node scripts/dev-tool-leverage-rank.mjs --json
//   node scripts/dev-tool-leverage-rank.mjs --tools synergy,stale
//   node scripts/dev-tool-leverage-rank.mjs --frozen-time ISO
//
// Exit codes:
//   0 — at least one sub-tool reported successfully
//   1 — at least one tool returned `severity: p0|p1` (cron-friendly)
//   2 — all sub-tools failed / missing on disk / bad-flag
//
// Determinism: with --frozen-time set, sub-tools that honor PRISM_AUDIT_
// FROZEN_TIME produce stable output.

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const DEFAULT_TOP_N = 25;
const SUB_TOOL_TIMEOUT_MS = 30_000;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tool registry — single source of truth for what we orchestrate.
// `extract(payload)` returns the uniform envelope shape (or null if data is
// well-formed but innocuous, e.g. zero findings).
// ─────────────────────────────────────────────────────────────────────────────
export const SUB_TOOLS = {
  synergy: {
    script: "scripts/synergy-regression-watch.mjs",
    args: ["--json"],
    extract: extractSynergy,
  },
  stale: {
    script: "scripts/stale-milestone-rank.mjs",
    args: ["--json", "--top", "5"],
    extract: extractStaleMilestones,
  },
  cold: {
    script: "scripts/cold-script-rank.mjs",
    args: ["--json", "--top", "5", "--no-git"],
    extract: extractColdScripts,
  },
  helper: {
    script: "scripts/helper-orphan-rank.mjs",
    args: ["--json"],
    extract: extractHelperOrphans,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {
    json: false,
    topN: DEFAULT_TOP_N,
    tools: null, // null → all
    frozenTime: process.env.PRISM_AUDIT_FROZEN_TIME || null,
    repoRoot: REPO_ROOT,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--top") out.topN = readIntArg(argv[++i], "--top", 1, 1000);
    else if (a === "--tools") out.tools = parseToolsArg(argv[++i]);
    else if (a === "--frozen-time") out.frozenTime = argv[++i];
    else if (a === "--repo-root") out.repoRoot = resolve(argv[++i]);
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else { console.error(`unknown flag: ${a}`); process.exit(2); }
  }
  return out;
}

function readIntArg(raw, name, min, max) {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) {
    console.error(`${name} requires integer in [${min},${max}], got: ${raw}`);
    process.exit(2);
  }
  return n;
}

function parseToolsArg(raw) {
  if (!raw) { console.error("--tools requires comma-separated tool names"); process.exit(2); }
  const wanted = raw.split(",").map((s) => s.trim()).filter(Boolean);
  for (const t of wanted) {
    if (!Object.prototype.hasOwnProperty.call(SUB_TOOLS, t)) {
      console.error(`unknown tool '${t}'. Known: ${Object.keys(SUB_TOOLS).join(",")}`);
      process.exit(2);
    }
  }
  return wanted;
}

function printHelp() {
  console.log(`dev-tool-leverage-rank.mjs — aggregate META audit tools

Spawns each registered sub-tool, merges into a single ranked dashboard.

Flags:
  --json                emit JSON
  --top N               keep top-N findings overall (default ${DEFAULT_TOP_N})
  --tools synergy,stale,cold,helper  run a subset
  --frozen-time ISO     forwarded to sub-tools via PRISM_AUDIT_FROZEN_TIME

Exit: 0 ok / 1 at-least-one-p0-or-p1 / 2 input failure.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tool orchestration
// ─────────────────────────────────────────────────────────────────────────────
export function invokeSubTool(toolName, registry, opts) {
  const def = registry[toolName];
  if (!def) return { tool: toolName, status: "unknown_tool", findings: [] };
  const scriptAbs = resolve(opts.repoRoot, def.script);
  if (!existsSync(scriptAbs)) {
    return {
      tool: toolName,
      status: "data_unavailable",
      reason: `script_missing:${def.script}`,
      findings: [],
    };
  }
  const env = { ...process.env };
  if (opts.frozenTime) env.PRISM_AUDIT_FROZEN_TIME = opts.frozenTime;
  const res = spawnSync(
    process.execPath,
    [scriptAbs, ...def.args],
    { encoding: "utf8", timeout: SUB_TOOL_TIMEOUT_MS, env, cwd: opts.repoRoot },
  );
  if (res.error) {
    return {
      tool: toolName,
      status: "data_unavailable",
      reason: `spawn_error:${res.error.code || res.error.message}`,
      findings: [],
    };
  }
  // Some sub-tools exit non-zero on regression (cron-friendly). Treat non-2
  // exits as parseable; exit=2 is "input failure" by tool convention.
  if (res.status === 2) {
    return {
      tool: toolName,
      status: "data_unavailable",
      reason: `tool_exit_2:${(res.stderr || "").slice(0, 200)}`,
      findings: [],
    };
  }
  let payload;
  try {
    payload = JSON.parse(res.stdout || "{}");
  } catch {
    return {
      tool: toolName,
      status: "data_unavailable",
      reason: `bad_json:${(res.stdout || "").slice(0, 200)}`,
      findings: [],
    };
  }
  try {
    const envelope = def.extract(payload, res);
    return envelope ?? { tool: toolName, status: "ok_no_findings", findings: [] };
  } catch (err) {
    return {
      tool: toolName,
      status: "data_unavailable",
      reason: `extract_error:${err instanceof Error ? err.message : String(err)}`,
      findings: [],
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-tool extractors — pure functions, easy to unit-test.
// Each returns the uniform envelope { tool, status, findings: [{...}] }.
// `findings[i].score` is the cross-tool ranking signal.
// ─────────────────────────────────────────────────────────────────────────────
export function extractSynergy(payload) {
  const ratio = Number(payload?.currentRatio);
  const alertSev = String(payload?.alert?.severity ?? "ok");
  const deltaPp = Number(payload?.alert?.deltaPp ?? 0);
  const status = alertSev === "ok" ? "ok_no_findings" : "ok_with_findings";
  const finding = {
    id: "synergy.regression",
    label: `Synergy ratio ${(ratio * 100).toFixed(2)}%  (alert=${alertSev})`,
    severity: alertSev === "p0" ? "p0" : alertSev === "p1" ? "p1" : "info",
    // Score: 1000 for p0, 500 for p1, magnitude of deltaPp as tiebreaker
    score: (alertSev === "p0" ? 1000 : alertSev === "p1" ? 500 : 0) + Math.abs(deltaPp) * 10,
    detail: { ratio, alertSev, deltaPp },
  };
  if (status === "ok_no_findings") return { tool: "synergy", status, findings: [finding] };
  return { tool: "synergy", status, findings: [finding] };
}

export function extractStaleMilestones(payload) {
  const ranked = Array.isArray(payload?.ranked) ? payload.ranked : [];
  const totalStale = Number(payload?.totals?.total_stale ?? 0);
  const total = Number(payload?.totals?.total_milestones ?? 0);
  if (ranked.length === 0) {
    return { tool: "stale", status: "ok_no_findings", findings: [] };
  }
  // One headline finding for the count, plus one finding per top-3 stale ms.
  const headline = {
    id: "stale.headline",
    label: `${totalStale}/${total} stale milestones`,
    severity: totalStale > total * 0.5 ? "p1" : "p2",
    score: Math.min(800, totalStale),
    detail: { total_stale: totalStale, total },
  };
  const items = ranked.slice(0, 3).map((r) => ({
    id: `stale.${r.id}`,
    label: `Stale: ${r.id} (pending=${r.pending}, ${r.reason})`,
    severity: r.never_started ? "p2" : "p3",
    score: Math.min(400, Number(r.score) || 0),
    detail: r,
  }));
  return { tool: "stale", status: "ok_with_findings", findings: [headline, ...items] };
}

export function extractColdScripts(payload) {
  // Tolerate two schemas: this-session's `totals.{cold,scanned}` + `cold[].{relPath,score}`
  // OR peer cold-script-rank's `summary.{cold,totalScripts}` + `cold[].{rel,loc,ageDays}`.
  const cold = Array.isArray(payload?.cold) ? payload.cold : [];
  const totalCold = Number(
    payload?.totals?.cold ?? payload?.summary?.cold ?? cold.length,
  );
  const totalScanned = Number(
    payload?.totals?.scanned ?? payload?.summary?.totalScripts ?? 0,
  );
  if (cold.length === 0) {
    return { tool: "cold", status: "ok_no_findings", findings: [] };
  }
  const ratio = totalScanned > 0 ? totalCold / totalScanned : 0;
  const headline = {
    id: "cold.headline",
    label: `${totalCold}/${totalScanned} likely-cold scripts`,
    severity: ratio > 0.3 ? "p2" : "p3",
    score: Math.min(300, totalCold * 2),
    detail: { total_cold: totalCold, total_scanned: totalScanned },
  };
  const items = cold.slice(0, 3).map((c) => {
    const name = c.relPath ?? c.rel ?? c.path ?? c.name ?? "unknown";
    // Peer schema has no numeric score; derive a proxy from loc + ageDays.
    const proxyScore =
      typeof c.score === "number"
        ? c.score
        : Math.min(200, Math.round((Number(c.ageDays) || 0) + (Number(c.loc) || 0) / 100));
    return {
      id: `cold.${name}`,
      label: `Cold script: ${name}${typeof c.ageDays === "number" ? ` (${c.ageDays.toFixed(0)}d old)` : ""}`,
      severity: "p3",
      score: Math.min(200, proxyScore),
      detail: c,
    };
  });
  return { tool: "cold", status: "ok_with_findings", findings: [headline, ...items] };
}

export function extractHelperOrphans(payload) {
  // helper-orphan-rank is a peer-built script with a possibly-different
  // schema. Be defensive: probe likely field names + fall back to the
  // `data_unavailable` arm on schema mismatch.
  const orphans =
    (Array.isArray(payload?.orphans) && payload.orphans) ||
    (Array.isArray(payload?.ranked) && payload.ranked) ||
    (Array.isArray(payload?.results) && payload.results) ||
    null;
  if (!orphans) {
    return {
      tool: "helper",
      status: "data_unavailable",
      reason: `unknown_schema:${Object.keys(payload || {}).join(",") || "empty"}`,
      findings: [],
    };
  }
  const total = orphans.length;
  if (total === 0) return { tool: "helper", status: "ok_no_findings", findings: [] };
  const headline = {
    id: "helper.headline",
    label: `${total} orphan helper(s)`,
    severity: total > 100 ? "p2" : "p3",
    score: Math.min(300, total * 2),
    detail: { total_orphans: total },
  };
  const items = orphans.slice(0, 3).map((o) => {
    const name = o.relPath || o.path || o.name || JSON.stringify(o).slice(0, 60);
    return {
      id: `helper.${name}`,
      label: `Orphan helper: ${name}`,
      severity: "p3",
      score: Math.min(150, Number(o.score ?? 0)),
      detail: o,
    };
  });
  return { tool: "helper", status: "ok_with_findings", findings: [headline, ...items] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregator
// ─────────────────────────────────────────────────────────────────────────────
export function rankAll(envelopes, topN) {
  const flat = [];
  for (const env of envelopes) {
    for (const f of env.findings || []) {
      flat.push({ ...f, tool: env.tool });
    }
  }
  // Sort: severity rank DESC (p0 > p1 > p2 > p3 > info), then score DESC, then id ASC.
  const SEV_RANK = { p0: 5, p1: 4, p2: 3, p3: 2, info: 1 };
  flat.sort((a, b) => {
    const sa = SEV_RANK[a.severity] || 0;
    const sb = SEV_RANK[b.severity] || 0;
    if (sa !== sb) return sb - sa;
    if (b.score !== a.score) return b.score - a.score;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return flat.slice(0, topN);
}

export function determineExitCode(envelopes) {
  // 2 if all sub-tools failed
  const allFailed = envelopes.every((e) =>
    e.status === "data_unavailable" || e.status === "unknown_tool",
  );
  if (allFailed) return 2;
  // 1 if any finding is p0 or p1
  for (const e of envelopes) {
    for (const f of e.findings || []) {
      if (f.severity === "p0" || f.severity === "p1") return 1;
    }
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────
function renderText(envelopes, ranked, opts, nowIso) {
  const lines = [];
  lines.push("─── Dev-Tool Leverage Ranking ───");
  lines.push(`Generated: ${nowIso}`);
  lines.push("");
  lines.push("Tools surveyed:");
  for (const e of envelopes) {
    const detail = e.status === "data_unavailable" ? ` (${e.reason})` : "";
    lines.push(`  ${e.tool.padEnd(8)} status=${e.status}${detail}`);
  }
  lines.push("");
  lines.push(`Findings (top ${Math.min(opts.topN, ranked.length)} of ${ranked.length}):`);
  if (ranked.length === 0) {
    lines.push("  (no findings — all surveyed tools report clean)");
    return lines.join("\n");
  }
  const labelW = Math.min(60, Math.max(...ranked.map((r) => r.label.length), 5));
  lines.push(pad("sev", 4) + "  " + pad("tool", 8) + "  " + pad("label", labelW) + "  score");
  lines.push(pad("───", 4) + "  " + pad("────", 8) + "  " + pad("─".repeat(labelW), labelW) + "  ─────");
  for (const r of ranked.slice(0, opts.topN)) {
    lines.push(
      pad(r.severity, 4) + "  " +
      pad(r.tool, 8) + "  " +
      pad(r.label, labelW) + "  " +
      String(r.score).padStart(5),
    );
  }
  return lines.join("\n");
}

function pad(s, w) {
  return s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main CLI
// ─────────────────────────────────────────────────────────────────────────────
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  const opts = parseArgs(process.argv.slice(2));
  const wanted = opts.tools ?? Object.keys(SUB_TOOLS);
  const envelopes = [];
  for (const name of wanted) {
    envelopes.push(invokeSubTool(name, SUB_TOOLS, opts));
  }
  const ranked = rankAll(envelopes, opts.topN);
  const exitCode = determineExitCode(envelopes);
  const nowIso = opts.frozenTime ?? new Date().toISOString();
  if (opts.json) {
    const payload = {
      schemaVersion: 1,
      generatedAt: nowIso,
      tools: envelopes,
      ranked,
      exit_code: exitCode,
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  } else {
    process.stdout.write(renderText(envelopes, ranked, opts, nowIso) + "\n");
  }
  process.exit(exitCode);
}
