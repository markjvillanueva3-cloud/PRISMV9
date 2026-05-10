#!/usr/bin/env node
// reap-zombie-procs.mjs — Kill orphaned node.exe processes whose parent
// has died but the child kept running (MCP servers, file watchers, helper
// processes spawned by hooks). Each Claude session spawns its own MCP
// servers; when the session closes Claude Code may not always reap them,
// leading to N×session leftover processes that hold file handles, file
// watches, and (critically for our 6-chat repo) compete for .git locks
// + 41MB system-graph.json reads. Diagnosed 2026-05-10 — at the time of
// this script's creation we had 26 node procs alive across 6 active chats.
//
// Conservative strategy:
//   1. Enumerate every node.exe via WMI (PID, ParentPID, age, cmdline)
//   2. Categorize each: protected (active parent, recent activity, on
//      whitelist) vs reapable (orphan + cmdline matches known leak pattern
//      + older than --threshold-min)
//   3. Dry-run by default (lists candidates). --apply actually kills.
//
// Whitelist (NEVER kill, even if parent dead):
//   - PRISM MCP server: dist/index.js (shared infra; if it dies the whole
//     fleet of dispatchers goes away)
//   - tsserver.js — language server backing IDE/LSP tool. Killing it
//     orphans active edit sessions.
//   - Any process whose parent is currently alive (definitionally not orphan)
//
// Reap pattern (orphan + age over threshold + cmdline matches):
//   - @upstash/context7-mcp
//   - @playwright/mcp
//   - mcp-http-bridge.mjs
//   - unified-observability-drain.mjs --watch
//   - typingsInstaller.js (gets relaunched fresh by tsserver as needed)
//   - typescript-language-server (per-project, parent-dependent)
//
// Usage:
//   node reap-zombie-procs.mjs                          # dry-run, threshold 30min
//   node reap-zombie-procs.mjs --apply                  # actually kill
//   node reap-zombie-procs.mjs --threshold-min 60       # only orphans older than 60min
//   node reap-zombie-procs.mjs --json                   # machine-readable

import { spawnSync } from "node:child_process";

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const JSON_OUT = ARGS.includes("--json");
const VERBOSE = ARGS.includes("--verbose");
const THRESHOLD_MIN = (() => {
  const i = ARGS.indexOf("--threshold-min");
  return i >= 0 && i < ARGS.length - 1 ? parseFloat(ARGS[i + 1]) : 30;
})();

const REAP_PATTERNS = [
  { id: "context7-mcp",        re: /@upstash[/\\]context7-mcp/i,            reason: "MCP server orphaned by closed chat" },
  { id: "playwright-mcp",      re: /@playwright[/\\]mcp/i,                  reason: "MCP server orphaned by closed chat" },
  { id: "typingsInstaller",    re: /typingsInstaller\.js/i,                  reason: "Auto-respawned by tsserver — safe to kill" },
  { id: "ts-lang-server",      re: /typescript-language-server[/\\]lib[/\\]cli\.mjs/i, reason: "LSP for closed chat" },
];

const WHITELIST = [
  { id: "prism-mcp-core",      re: /(?:^|\s|[/\\])dist[/\\]index\.js\b/i,    reason: "PRISM MCP core server" },
  { id: "tsserver",            re: /tsserver\.js/i,                          reason: "TypeScript LSP — active editor backing" },
  { id: "dashboard-serve",     re: /dashboard-serve\.mjs/i,                  reason: "PRISM dashboard daemon" },
  { id: "system-viz-on-commit",re: /system-viz-on-commit\.mjs/i,             reason: "Active commit-chain (PID-guarded)" },
  { id: "observability-drain", re: /unified-observability-drain\.mjs/i,      reason: "PRISM observability daemon (intentional long-lived)" },
  { id: "mcp-http-bridge",     re: /mcp-http-bridge\.mjs/i,                  reason: "PRISM MCP HTTP bridge (long-lived service)" },
  { id: "self",                re: /reap-zombie-procs\.mjs/i,                reason: "Self" },
];

function powershellJson(script) {
  const r = spawnSync("powershell", ["-NoProfile", "-Command", script + " | ConvertTo-Json -Depth 4"], {
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (r.status !== 0) {
    return { _error: `powershell exit ${r.status}: ${(r.stderr || "").slice(0, 300)}` };
  }
  try {
    const out = JSON.parse(r.stdout || "[]");
    return Array.isArray(out) ? out : [out];
  } catch (e) {
    return { _error: `parse: ${e.message}; head=${(r.stdout || "").slice(0, 200)}` };
  }
}

// Probe node.exe + bash.exe + powershell.exe in one WMI sweep. Each tool
// call from a chat spawns shells that should die when the command finishes
// but don't always. 6-chat × N tool calls = accumulating idle shells.
const procs = powershellJson(
  "Get-WmiObject Win32_Process -Filter \"Name='node.exe' OR Name='bash.exe' OR Name='powershell.exe'\" | Select-Object Name,ProcessId,ParentProcessId,CommandLine,@{N='Created';E={$_.ConvertToDateTime($_.CreationDate)}}",
);
if (procs._error) {
  console.error(`reap-zombie-procs: ${procs._error}`);
  process.exit(2);
}

const livePids = new Set();
const allPidsScript = "Get-Process | Select-Object -ExpandProperty Id";
const allLive = powershellJson(allPidsScript);
if (Array.isArray(allLive)) for (const pid of allLive) livePids.add(parseInt(pid, 10));

const now = Date.now();

function categorize(p) {
  const pid = parseInt(p.ProcessId, 10);
  const parentPid = parseInt(p.ParentProcessId, 10);
  const cmd = p.CommandLine || "";
  const name = (p.Name || "").toLowerCase();
  const created = p.Created ? new Date(p.Created).getTime() : null;
  const ageMs = created ? now - created : null;
  const ageMin = ageMs != null ? Math.round(ageMs / 60000) : null;
  const parentAlive = livePids.has(parentPid);

  function summary() {
    return { name, pid, parentPid, ageMin, parentAlive, cmd: cmd.slice(0, 140) };
  }

  for (const w of WHITELIST) if (w.re.test(cmd)) return { ...summary(), category: "protected", whitelist: w.id, reason: w.reason };

  if (parentAlive) return { ...summary(), category: "active", reason: `parent ${parentPid} alive` };

  // For bash.exe and powershell.exe, parent-dead + any age > threshold is
  // sufficient. These are tool-call shells that should always exit when
  // their command completes; an orphan means the harness leaked it.
  if (name === "bash.exe" || name === "powershell.exe") {
    if (ageMin != null && ageMin < THRESHOLD_MIN) {
      return { ...summary(), category: "young-orphan", patternId: name, reason: `orphan ${name} but only ${ageMin}m old (<${THRESHOLD_MIN})` };
    }
    return { ...summary(), category: "reapable", patternId: name, reason: `orphan ${name} (parent dead) — leaked tool-call shell` };
  }

  // node.exe — match against known leaky patterns
  for (const r of REAP_PATTERNS) {
    if (r.re.test(cmd)) {
      if (ageMin != null && ageMin < THRESHOLD_MIN) {
        return { ...summary(), category: "young-orphan", patternId: r.id, reason: `orphan but only ${ageMin}m old (<${THRESHOLD_MIN})` };
      }
      return { ...summary(), category: "reapable", patternId: r.id, reason: r.reason };
    }
  }
  return { ...summary(), category: "unmatched-orphan", reason: "orphan but cmdline doesn't match any reap pattern" };
}

const categorized = (procs || []).map(categorize);
const buckets = {};
for (const c of categorized) (buckets[c.category] ||= []).push(c);

const reapable = buckets.reapable || [];
const killed = [];
const failed = [];

if (APPLY && reapable.length) {
  for (const r of reapable) {
    const k = spawnSync("taskkill", ["/F", "/PID", String(r.pid)], { encoding: "utf8", timeout: 10000 });
    if (k.status === 0) killed.push(r);
    else failed.push({ ...r, error: (k.stderr || k.stdout || "").trim().slice(0, 200) });
  }
}

const summary = {
  scannedNode: categorized.length,
  thresholdMin: THRESHOLD_MIN,
  apply: APPLY,
  byCategory: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
  reapable: reapable.length,
  killed: killed.length,
  failed: failed.length,
};

if (JSON_OUT) {
  console.log(JSON.stringify({ summary, buckets, killed, failed }, null, 2));
} else {
  console.log(`reap-zombie-procs (threshold=${THRESHOLD_MIN}min, apply=${APPLY})`);
  console.log(`  scanned node.exe: ${summary.scannedNode}`);
  for (const [cat, n] of Object.entries(summary.byCategory)) {
    console.log(`  ${cat.padEnd(20)}: ${n}`);
  }
  if (!APPLY && reapable.length) {
    console.log(`\n  Re-run with --apply to kill ${reapable.length} reapable node procs.`);
    console.log(`  Sample (top 8 oldest):`);
    for (const r of reapable.sort((a, b) => (b.ageMin || 0) - (a.ageMin || 0)).slice(0, 8)) {
      console.log(`    pid ${r.pid}  ${String(r.ageMin || "?").padStart(4)}m  ${r.patternId.padEnd(20)}  ${(r.cmd || "").slice(0, 60)}`);
    }
  }
  if (APPLY) {
    console.log(`\n  killed: ${killed.length}`);
    if (failed.length) {
      console.log(`  failed: ${failed.length}`);
      for (const f of failed.slice(0, 5)) console.log(`    pid ${f.pid}: ${f.error}`);
    }
  }
  if (VERBOSE && buckets["unmatched-orphan"]?.length) {
    console.log(`\n  Unmatched orphans (review for new reap-pattern candidates):`);
    for (const u of buckets["unmatched-orphan"].slice(0, 8)) {
      console.log(`    pid ${u.pid}  ${u.ageMin || "?"}m  ${(u.cmd || "").slice(0, 100)}`);
    }
  }
}
