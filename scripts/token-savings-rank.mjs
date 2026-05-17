#!/usr/bin/env node
// token-savings-rank.mjs — META artifact for /forge-audit-v2 token-savings scope.
// Consolidates every PRISM token-saving signal into one JSON + markdown summary.
// Re-runnable: each finding embeds its own verification channel.
//
// Outputs:
//   --json    machine-readable single object on stdout (CI / cron friendly)
//   --history append {ts, snapshot} to state/shared/token-savings-history.jsonl
//   (default) human-readable markdown to stdout
//
// Exit codes: 0=healthy · 1=warn · 2=critical · 3=measurement-error
//
// Author: /forge-audit-v2 META artifact 2026-05-17 lima
// Sibling helpers: scripts/synergy-regression-watch.mjs · memory-size-watch.mjs

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = "H:/prism";
const HISTORY = path.join(ROOT, "state/shared/token-savings-history.jsonl");
const ARGS = new Set(process.argv.slice(2));

// ---- thresholds (calibrated against 2026-05-17 baseline) -----------------
const TH = {
  ollama_offload_min: 0.30,           // 30% target
  ollama_offload_warn: 0.15,          // < 15% = critical
  memory_md_ceiling_bytes: 24576,
  memory_md_warn_pct: 0.90,
  memory_md_crit_pct: 0.97,
  rtk_archive_warn_pct: 0.50,         // > 50% "No hook installed" = degraded
  rtk_archive_crit_pct: 0.95,         // > 95% = fully broken
  hook_zero_fire_warn: 300,           // > 300 dead hooks = warn
  hook_zero_fire_crit: 480,           // > 480 = systemic dead-code
  error_promote_noop_warn: 0.95,      // > 95% no-op = wasted fires
  claudemd_warn_bytes: 100_000,       // > 100KB = doctrine violation
  claudemd_crit_bytes: 150_000,
  silent_suggest_ratio_warn: 0.05,    // injected/silent ratio
  token_budget_unmapped_warn: 0.40,   // > 40% unmapped slots
  cache_bash_warm_min: 10,            // bash-result-cache must have hits
  cache_systemic_keys_min: 50,        // total keys across all 3 caches that warrant fleet-wide finding
};

// ---- helpers -------------------------------------------------------------
function safeReadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
}
function safeStat(p) {
  try { return fs.statSync(p); } catch { return null; }
}
function safeReadLines(p, max = 100000) {
  try {
    const buf = fs.readFileSync(p, "utf8");
    return buf.split("\n").filter(Boolean).slice(-max);
  } catch { return []; }
}
function safeWc(p) {
  try { return fs.readFileSync(p).length; } catch { return 0; }
}

// ---- signal probes -------------------------------------------------------

function probeOllamaOffload() {
  const stats = safeReadJson(path.join(ROOT, "mcp-server/data/state/ollama-offload-stats.json"));
  if (!stats) return { ok: false, reason: "stats file missing" };
  // Schema: counters live at top level (offloaded/keptOnClaude/...), NOT under stats.totals
  const t = stats.totals || stats;
  const total = (t.offloaded || 0) + (t.keptOnClaude || 0);
  const ratio = total > 0 ? (t.offloaded || 0) / total : 0;
  const silent = t.silentSuggestions || 0;
  const injected = t.injectedSuggestions || 0;
  return {
    ok: true,
    offloaded: t.offloaded || 0,
    keptOnClaude: t.keptOnClaude || 0,
    ratio,
    tokensSaved: t.estimatedTokensSaved || 0,
    silentSuggestions: silent,
    injectedSuggestions: injected,
    suggestSurfaceRatio: silent > 0 ? injected / silent : 0,
    byHook: stats.byHook || {},
    last7dEvents: (stats.recent || {}).eventCount || 0,
    last7dTokensSaved: (stats.recent || {}).tokensSaved || 0,
  };
}

function probeMemorySize() {
  const p = path.join(ROOT, "../../C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md");
  // CRLF normalization on Windows — read the canonical path
  const canonical = "C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md";
  const bytes = safeWc(canonical);
  const pct = bytes / TH.memory_md_ceiling_bytes;
  let status = "fresh";
  if (pct >= TH.memory_md_crit_pct) status = "critical";
  else if (pct >= TH.memory_md_warn_pct) status = "warn";
  return {
    ok: bytes > 0,
    bytes,
    ceilingBytes: TH.memory_md_ceiling_bytes,
    headroomBytes: TH.memory_md_ceiling_bytes - bytes,
    pctOfCeiling: pct,
    status,
  };
}

function probeRtkInstall() {
  const archive = path.join(ROOT, "state/shared/rtk-archive.jsonl");
  const lines = safeReadLines(archive, 5000);
  const totalLines = lines.length;
  let noHookCount = 0;
  for (const l of lines) {
    if (l.includes("No hook installed")) noHookCount++;
  }
  const noHookPct = totalLines > 0 ? noHookCount / totalLines : 1;
  // also check settings.json for rtk-* wired hooks
  const settings = safeReadJson("C:/Users/wompu/.claude/settings.json");
  let wiredCount = 0;
  if (settings && settings.hooks) {
    const dump = JSON.stringify(settings.hooks);
    wiredCount = (dump.match(/rtk-[a-z-]+/g) || []).length;
  }
  return {
    ok: true,
    archiveLineCount: totalLines,
    noHookInstalledCount: noHookCount,
    noHookPct,
    wiredHookEntriesInSettings: wiredCount,
    diagnosis: noHookPct >= TH.rtk_archive_crit_pct
      ? "BROKEN — filter hook not installed; all calls passthrough"
      : noHookPct >= TH.rtk_archive_warn_pct
        ? "DEGRADED — many calls bypassing filter"
        : "OK",
  };
}

function probeHookFireRank() {
  const ledger = path.join(ROOT, "mcp-server/data/state/hook-fire-counts.jsonl");
  const lines = safeReadLines(ledger, 50000);
  const seen = new Set();
  const counts = new Map();
  const decisions = new Map();
  for (const line of lines) {
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    const h = ev.hook || ev.hookName;
    if (!h) continue;
    seen.add(h);
    counts.set(h, (counts.get(h) || 0) + 1);
    if (ev.decision) {
      const key = `${h}::${ev.decision}`;
      decisions.set(key, (decisions.get(key) || 0) + 1);
    }
  }
  // Count hooks on disk
  let onDisk = 0;
  try {
    onDisk = fs.readdirSync(path.join(ROOT, ".claude/hooks"))
      .filter(f => f.endsWith(".mjs")).length;
  } catch {}
  const firing = seen.size;
  const zeroFire = Math.max(0, onDisk - firing);
  // error-pattern-promote noop ratio
  const epFired = counts.get("error-pattern-promote") || 0;
  const epNoop = decisions.get("error-pattern-promote::noop_below_threshold") || 0;
  const epNoopRatio = epFired > 0 ? epNoop / epFired : 0;
  return {
    ok: lines.length > 0,
    totalEvents: lines.length,
    uniqueFiringHooks: firing,
    hooksOnDisk: onDisk,
    zeroFireHooks: zeroFire,
    errorPatternPromote: { fired: epFired, noopBelowThreshold: epNoop, noopRatio: epNoopRatio },
  };
}

function probeClaudemdSize() {
  const bytes = safeWc(path.join(ROOT, "CLAUDE.md"));
  return {
    ok: bytes > 0,
    bytes,
    warnBytes: TH.claudemd_warn_bytes,
    critBytes: TH.claudemd_crit_bytes,
    status: bytes >= TH.claudemd_crit_bytes ? "critical" : bytes >= TH.claudemd_warn_bytes ? "warn" : "fresh",
  };
}

function probeTokenBudget() {
  // Run the existing dashboard; we only consume its JSON head
  const res = spawnSync(process.execPath, [path.join(ROOT, "scripts/token-budget-telemetry-dashboard.mjs"), "--json"], {
    encoding: "utf8", timeout: 8000,
  });
  if (res.status !== 0 || !res.stdout) return { ok: false, reason: "dashboard failed" };
  try {
    const dash = JSON.parse(res.stdout);
    const total = dash.headline?.totalFires || 0;
    const unmapped = dash.bySlot?.unmapped?.fires || 0;
    return {
      ok: true,
      totalFires: total,
      slotsWithFires: dash.headline?.slotsWithFires || 0,
      unmappedFires: unmapped,
      unmappedRatio: total > 0 ? unmapped / total : 0,
      redFires: dash.headline?.redFires || 0,
      criticalFires: dash.headline?.criticalFires || 0,
    };
  } catch { return { ok: false, reason: "dashboard parse failed" }; }
}

function probeCacheUtilization() {
  const out = {};
  for (const name of ["bash-result-cache", "grep-result-cache", "file-read-cache"]) {
    const obj = safeReadJson(path.join(ROOT, ".claude/cache", `${name}.json`)) || {};
    const keys = Object.keys(obj).length;
    let hits = 0;
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object" && typeof v.hits === "number") hits += v.hits;
    }
    out[name] = { keys, hits };
  }
  return { ok: true, ...out };
}

// ---- scoring -------------------------------------------------------------

function score(snapshot) {
  const f = [];
  // F1 — RTK
  if (snapshot.rtk.noHookPct >= TH.rtk_archive_crit_pct) {
    f.push({ id: "F1-RTK-BROKEN", severity: "P0", finding: `RTK filter hook NOT installed — ${snapshot.rtk.noHookInstalledCount}/${snapshot.rtk.archiveLineCount} archive entries (${(snapshot.rtk.noHookPct*100).toFixed(1)}%) carry "No hook installed" warning; 0 rtk-* hooks wired in settings.json`, verify: `cat state/shared/rtk-archive.jsonl | grep -c "No hook installed"` });
  } else if (snapshot.rtk.noHookPct >= TH.rtk_archive_warn_pct) {
    f.push({ id: "F1-RTK-DEGRADED", severity: "P1", finding: `RTK partially bypassed (${(snapshot.rtk.noHookPct*100).toFixed(1)}% passthrough)`, verify: `cat rtk-archive.jsonl | grep -c "No hook installed"` });
  }
  // F2 — MEMORY.md truncation
  if (snapshot.memory.status === "critical") {
    f.push({ id: "F2-MEMORY-TRUNCATING", severity: "P0", finding: `MEMORY.md at ${snapshot.memory.bytes}B / ${snapshot.memory.ceilingBytes}B ceiling (headroom ${snapshot.memory.headroomBytes}B) — fleet-wide recall actively truncating`, verify: `node scripts/memory-size-watch.mjs --json | jq .status` });
  } else if (snapshot.memory.status === "warn") {
    f.push({ id: "F2-MEMORY-NEAR-LIMIT", severity: "P1", finding: `MEMORY.md at ${(snapshot.memory.pctOfCeiling*100).toFixed(1)}% of ceiling`, verify: `node scripts/memory-size-watch.mjs --json` });
  }
  // F3 — Ollama offload
  if (snapshot.ollama.ratio < TH.ollama_offload_warn) {
    f.push({ id: "F3-OLLAMA-OFFLOAD-CRITICAL", severity: "P0", finding: `Ollama offload at ${(snapshot.ollama.ratio*100).toFixed(1)}% vs 30% target — ${snapshot.ollama.offloaded}/${snapshot.ollama.offloaded+snapshot.ollama.keptOnClaude} routed; last 7d only ${snapshot.ollama.last7dTokensSaved} tokens saved`, verify: `node scripts/ollama-offload-dashboard.mjs --json | jq '.totals.offloaded / (.totals.offloaded + .totals.keptOnClaude)'` });
  } else if (snapshot.ollama.ratio < TH.ollama_offload_min) {
    f.push({ id: "F3-OLLAMA-OFFLOAD-LOW", severity: "P1", finding: `Ollama offload at ${(snapshot.ollama.ratio*100).toFixed(1)}% vs 30% target`, verify: `node scripts/ollama-offload-dashboard.mjs --json` });
  }
  // F4 — silent-suggestion gap
  if (snapshot.ollama.suggestSurfaceRatio < TH.silent_suggest_ratio_warn && snapshot.ollama.silentSuggestions > 50) {
    f.push({ id: "F4-OLLAMA-SUGGEST-UI-DARK", severity: "P1", finding: `${snapshot.ollama.silentSuggestions} silent suggestions vs ${snapshot.ollama.injectedSuggestions} injected — operator never sees the routing recommendation`, verify: `node scripts/ollama-offload-dashboard.mjs --json | jq '.totals.injectedSuggestions / .totals.silentSuggestions'` });
  }
  // F5 — error-pattern-promote noop ratio
  if (snapshot.hookFire.errorPatternPromote.noopRatio >= TH.error_promote_noop_warn) {
    f.push({ id: "F5-EPP-NOOP-OVERHEAD", severity: "P1", finding: `error-pattern-promote ${(snapshot.hookFire.errorPatternPromote.noopRatio*100).toFixed(1)}% no-op (${snapshot.hookFire.errorPatternPromote.fired} fires / ${snapshot.hookFire.errorPatternPromote.noopBelowThreshold} below threshold)`, verify: `node scripts/hook-fire-rank.mjs --json | jq '.ranked[] | select(.hook=="error-pattern-promote")'` });
  }
  // F6 — dead hooks
  if (snapshot.hookFire.zeroFireHooks >= TH.hook_zero_fire_crit) {
    f.push({ id: "F6-HOOK-DEAD-CODE-MASS", severity: "P1", finding: `${snapshot.hookFire.zeroFireHooks} of ${snapshot.hookFire.hooksOnDisk} hooks never fired in window (${((snapshot.hookFire.zeroFireHooks/snapshot.hookFire.hooksOnDisk)*100).toFixed(1)}% dead-code)`, verify: `node scripts/hook-fire-rank.mjs --json | jq .totals.zero_fire_hooks` });
  } else if (snapshot.hookFire.zeroFireHooks >= TH.hook_zero_fire_warn) {
    f.push({ id: "F6-HOOK-DEAD-CODE-HIGH", severity: "P2", finding: `${snapshot.hookFire.zeroFireHooks} hooks never fired`, verify: `node scripts/hook-fire-rank.mjs --json` });
  }
  // F7 — CLAUDE.md size
  if (snapshot.claudemd.status === "critical") {
    f.push({ id: "F7-CLAUDEMD-OVERSIZED", severity: "P2", finding: `CLAUDE.md at ${snapshot.claudemd.bytes}B violates "≤200 lines past which compliance collapses" rule cited in the file itself`, verify: `wc -c H:/prism/CLAUDE.md` });
  }
  // F8 — cache reader-path dead across all 3 caches (peer-review-upgraded P1)
  const totalCacheKeys = Object.values(snapshot.cache).filter(v => v && typeof v.keys === "number").reduce((a, v) => a + v.keys, 0);
  const totalCacheHits = Object.values(snapshot.cache).filter(v => v && typeof v.hits === "number").reduce((a, v) => a + v.hits, 0);
  if (totalCacheKeys >= TH.cache_systemic_keys_min && totalCacheHits < TH.cache_bash_warm_min) {
    f.push({ id: "F8-CACHE-READPATH-DEAD", severity: "P1", finding: `Cache reader-path systemically dead: ${totalCacheKeys} keys / ${totalCacheHits} hits across all 3 caches (bash ${snapshot.cache["bash-result-cache"].keys}/${snapshot.cache["bash-result-cache"].hits}, grep ${snapshot.cache["grep-result-cache"].keys}/${snapshot.cache["grep-result-cache"].hits}, file-read ${snapshot.cache["file-read-cache"].keys}/${snapshot.cache["file-read-cache"].hits}) — writers populate but no reader-hook checks`, verify: `node -e "['bash-result-cache','grep-result-cache','file-read-cache'].forEach(n=>{const c=JSON.parse(require('fs').readFileSync('.claude/cache/'+n+'.json','utf8'));console.log(n,Object.keys(c).length,Object.values(c).reduce((a,v)=>a+(v.hits||0),0))})"` });
  }
  // F9 — token-budget slot mapping
  if (snapshot.tokenBudget.ok && snapshot.tokenBudget.unmappedRatio >= TH.token_budget_unmapped_warn) {
    f.push({ id: "F9-TOKEN-BUDGET-SLOT-MAP-BROKEN", severity: "P2", finding: `token-budget-gate ${(snapshot.tokenBudget.unmappedRatio*100).toFixed(1)}% fires unmapped to slot — per-slot pressure visibility broken`, verify: `node scripts/token-budget-telemetry-dashboard.mjs --json | jq '.bySlot.unmapped.fires / .headline.totalFires'` });
  }
  // Order by severity then leverage (P0 > P1 > P2)
  const sev = { P0: 0, P1: 1, P2: 2 };
  f.sort((a, b) => (sev[a.severity] ?? 9) - (sev[b.severity] ?? 9));
  return f;
}

// ---- entrypoint ----------------------------------------------------------

const snapshot = {
  ts: new Date().toISOString(),
  ollama: probeOllamaOffload(),
  memory: probeMemorySize(),
  rtk: probeRtkInstall(),
  hookFire: probeHookFireRank(),
  claudemd: probeClaudemdSize(),
  tokenBudget: probeTokenBudget(),
  cache: probeCacheUtilization(),
};

const findings = score(snapshot);
const p0Count = findings.filter(f => f.severity === "P0").length;
const p1Count = findings.filter(f => f.severity === "P1").length;
const exitCode = p0Count > 0 ? 2 : p1Count > 0 ? 1 : 0;

const out = { snapshot, findings, exitCode, summary: { p0: p0Count, p1: p1Count, p2: findings.length - p0Count - p1Count } };

if (ARGS.has("--history")) {
  fs.mkdirSync(path.dirname(HISTORY), { recursive: true });
  fs.appendFileSync(HISTORY, JSON.stringify({ ts: snapshot.ts, summary: out.summary, findings: findings.map(f => f.id) }) + "\n");
}

if (ARGS.has("--json")) {
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
} else {
  console.log(`# token-savings-rank · ${snapshot.ts}`);
  console.log(`\nP0: ${p0Count} · P1: ${p1Count} · P2: ${out.summary.p2}\n`);
  console.log(`## Snapshot`);
  console.log(`- Ollama offload: ${(snapshot.ollama.ratio*100).toFixed(1)}% (${snapshot.ollama.offloaded}/${snapshot.ollama.offloaded+snapshot.ollama.keptOnClaude}); last 7d ${snapshot.ollama.last7dTokensSaved} tokens saved`);
  console.log(`- MEMORY.md: ${snapshot.memory.bytes}B / ${snapshot.memory.ceilingBytes}B ceiling (status=${snapshot.memory.status})`);
  console.log(`- RTK: ${(snapshot.rtk.noHookPct*100).toFixed(1)}% passthrough; ${snapshot.rtk.wiredHookEntriesInSettings} hooks wired (${snapshot.rtk.diagnosis})`);
  console.log(`- Hooks: ${snapshot.hookFire.uniqueFiringHooks}/${snapshot.hookFire.hooksOnDisk} firing; ${snapshot.hookFire.zeroFireHooks} dead`);
  console.log(`- CLAUDE.md: ${snapshot.claudemd.bytes}B (status=${snapshot.claudemd.status})`);
  console.log(`- token-budget unmapped: ${snapshot.tokenBudget.ok ? (snapshot.tokenBudget.unmappedRatio*100).toFixed(1)+'%' : 'unknown'}`);
  console.log(`- cache bash hits: ${snapshot.cache["bash-result-cache"].hits}`);
  console.log(`\n## Findings (leverage-ranked)`);
  for (const f of findings) {
    console.log(`\n### [${f.severity}] ${f.id}`);
    console.log(`${f.finding}`);
    console.log(`Verify: \`${f.verify}\``);
  }
}

process.exit(exitCode);
