#!/usr/bin/env node
// ram-zombie-watch.mjs — fleet watchdog for the Monitor tool. Single-write-per-tick.
// Stdout = events. Stderr = errors (captured to task output file, not the event stream).
//
// Each tick produces AT MOST ONE stdout write so Monitor sees it as one notification.
// Per-condition cooldown prevents alert spam — same alert won't re-emit within ALERT_COOLDOWN_MS.

import { spawnSync } from "node:child_process";
import os from "node:os";
import { existsSync, statSync, readdirSync } from "node:fs";
import path from "node:path";

const PRISM_ROOT             = "H:/prism";
const TASKLIST_TIMEOUT_MS    = 8000;
const REAPER_TIMEOUT_MS      = 30000;
const STALE_LOCK_MAX_AGE_MS  = 5 * 60 * 1000;
const ALERT_COOLDOWN_MS      = 5 * 60 * 1000;
const SUMMARY_TRIM_CHARS     = 200;
const STDERR_TRIM_CHARS      = 120;

const NODE_MAX = Number(process.env.NODE_MAX ?? 40);
const BASH_MAX = Number(process.env.BASH_MAX ?? 30);
const RAM_MAX  = Number(process.env.RAM_MAX  ?? 85);
const POLL_SEC = Number(process.env.POLL_SEC ?? 60);
const HB_EVERY = Number(process.env.HB_EVERY ?? 30);

const REAPERS = [
  ["stale-claims", `${PRISM_ROOT}/.claude/hooks/stale-claim-sweeper.mjs`, []],
  ["git-locks",    `${PRISM_ROOT}/.claude/hooks/git-lock-sweeper.mjs`,    []],
  ["node-janitor", `${PRISM_ROOT}/.claude/hooks/node-process-janitor.mjs`, ["--full"]],
];

let hbCounter = 0;
const lastAlertAt = { node: 0, bash: 0, ram: 0, locks: 0 };

function nowZ() {
  return new Date().toISOString().slice(11, 19) + "Z";
}

function logErr(line) {
  process.stderr.write(`[${nowZ()}] ${line}\n`);
}

function countProcess(image) {
  try {
    const r = spawnSync(
      "tasklist",
      ["/FI", `IMAGENAME eq ${image}`, "/FO", "CSV", "/NH"],
      { encoding: "utf8", timeout: TASKLIST_TIMEOUT_MS },
    );
    if (r.error) {
      logErr(`countProcess(${image}) spawn error: ${r.error.message}`);
      return 0;
    }
    if (r.status !== 0 || !r.stdout) return 0;
    if (r.stdout.includes("No tasks are running")) return 0;
    return r.stdout.split(/\r?\n/).filter(l => l.includes(image)).length;
  } catch (e) {
    logErr(`countProcess(${image}) threw: ${e.message}`);
    return 0;
  }
}

function ramPct() {
  const free = os.freemem();
  const total = os.totalmem();
  return total ? Math.round((1 - free / total) * 100) : 0;
}

function findStaleGitLocks() {
  const candidates = [];
  const parentDir = path.dirname(PRISM_ROOT);
  let dirs = [];
  try {
    dirs = readdirSync(parentDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith("prism"))
      .map(d => path.join(parentDir, d.name));
  } catch (e) {
    logErr(`findStaleGitLocks: cannot read ${parentDir}: ${e.message}`);
  }
  const cct = `${PRISM_ROOT}/.claude/worktrees`;
  try {
    if (existsSync(cct)) {
      for (const d of readdirSync(cct, { withFileTypes: true })) {
        if (d.isDirectory()) dirs.push(path.join(cct, d.name));
      }
    }
  } catch (e) {
    logErr(`findStaleGitLocks: cannot read ${cct}: ${e.message}`);
  }
  const now = Date.now();
  for (const d of dirs) {
    const lockPath = path.join(d, ".git", "index.lock");
    try {
      if (existsSync(lockPath)) {
        const st = statSync(lockPath);
        if (now - st.mtimeMs > STALE_LOCK_MAX_AGE_MS) candidates.push(lockPath);
      }
    } catch (e) {
      logErr(`findStaleGitLocks: stat ${lockPath} failed: ${e.message}`);
    }
  }
  return candidates;
}

function runReaper(label, scriptPath, args) {
  try {
    const r = spawnSync(process.execPath, [scriptPath, ...args], {
      encoding: "utf8",
      timeout: REAPER_TIMEOUT_MS,
    });
    if (r.error) {
      logErr(`reaper(${label}) spawn error: ${r.error.message}`);
      return `error: ${r.error.message.slice(0, STDERR_TRIM_CHARS)}`;
    }
    const out = (r.stdout || "").trim();
    const err = (r.stderr || "").trim();
    let summary = out.split(/\r?\n/)[0] || "(no output)";
    try {
      const j = JSON.parse(out);
      if (j.systemMessage) summary = j.systemMessage;
      else if (j.continue !== undefined) summary = `continue=${j.continue}`;
    } catch { /* not JSON */ }
    if (err && summary === "(no output)") summary = `stderr: ${err.slice(0, STDERR_TRIM_CHARS)}`;
    return summary.slice(0, SUMMARY_TRIM_CHARS);
  } catch (e) {
    logErr(`reaper(${label}) threw: ${e.message}`);
    return `error: ${e.message.slice(0, STDERR_TRIM_CHARS)}`;
  }
}

function shouldFireAlertNow(conditionKey, now) {
  return (now - lastAlertAt[conditionKey]) > ALERT_COOLDOWN_MS;
}

function tick() {
  const now = Date.now();
  const ts = nowZ();
  const nodeN = countProcess("node.exe");
  const bashN = countProcess("bash.exe");
  const ram = ramPct();
  const locks = findStaleGitLocks().length;

  const buf = [];
  const activeAlerts = [];
  const cooledAlerts = [];

  function check(key, val, max) {
    if (val > max) {
      if (shouldFireAlertNow(key, now)) {
        activeAlerts.push(`${key}=${val}`);
        lastAlertAt[key] = now;
      } else {
        cooledAlerts.push(`${key}=${val}`);
      }
    }
  }
  check("node", nodeN, NODE_MAX);
  check("bash", bashN, BASH_MAX);
  check("ram",  ram,   RAM_MAX);
  check("locks", locks, 0);

  if (activeAlerts.length) {
    buf.push(`[${ts}] ALERT ${activeAlerts.join(" ")} — reaping`);
    for (const [label, script, args] of REAPERS) {
      const summary = runReaper(label, script, args);
      buf.push(`[${ts}]   ${label.padEnd(13)}: ${summary}`);
    }
    const post = {
      node: countProcess("node.exe"),
      bash: countProcess("bash.exe"),
      ram: ramPct(),
      locks: findStaleGitLocks().length,
    };
    buf.push(`[${ts}]   post-reap    : node=${post.node} bash=${post.bash} ram=${post.ram}% locks=${post.locks}`);
  }

  hbCounter += 1;
  if (hbCounter >= HB_EVERY) {
    let line = `[${ts}] heartbeat  node=${nodeN} bash=${bashN} ram=${ram}% locks=${locks}`;
    if (cooledAlerts.length) line += `  (cooled: ${cooledAlerts.join(" ")})`;
    buf.push(line);
    hbCounter = 0;
  }

  if (buf.length) process.stdout.write(buf.join("\n") + "\n");
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.on(sig, () => {
    process.stdout.write(`[${nowZ()}] watchdog shutting down (${sig})\n`);
    process.exit(0);
  });
}
process.on("uncaughtException", (e) => {
  process.stdout.write(`[${nowZ()}] watchdog crashed: ${e.message?.slice(0, SUMMARY_TRIM_CHARS) ?? "unknown"}\n`);
  process.exit(1);
});

process.stdout.write(`[${nowZ()}] watchdog armed  thresholds: node>${NODE_MAX} bash>${BASH_MAX} ram>${RAM_MAX}% poll=${POLL_SEC}s hb=${HB_EVERY * POLL_SEC}s cooldown=${ALERT_COOLDOWN_MS / 1000}s\n`);
tick();
setInterval(tick, POLL_SEC * 1000);
