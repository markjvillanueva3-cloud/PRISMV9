#!/usr/bin/env node
// ram-zombie-watch.mjs — fleet watchdog for the Monitor tool. Single-write-per-tick.
// Stdout = events. Stderr = errors (captured to task output file, not the event stream).
//
// Each tick produces AT MOST ONE stdout write so Monitor sees it as one notification.
// Per-condition cooldown prevents alert spam — same alert won't re-emit within ALERT_COOLDOWN_MS.

import { spawnSync } from "node:child_process";
import os from "node:os";
import { existsSync, statSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

if (process.platform !== "win32") {
  process.stderr.write(
    "ram-zombie-watch: Windows-only (uses tasklist + .git/worktrees layout). Exiting non-zero so caller doesn't get a silent-zero false-healthy.\n"
  );
  process.exit(2);
}

const PRISM_ROOT             = "H:/prism";
const TASKLIST_TIMEOUT_MS    = 8000;
const REAPER_TIMEOUT_MS      = 30000;
const STALE_LOCK_MAX_AGE_MS  = 5 * 60 * 1000;
const ALERT_COOLDOWN_MS      = 5 * 60 * 1000;
const SUMMARY_TRIM_CHARS     = 200;
const STDERR_TRIM_CHARS      = 120;
const COUNT_FAILURE_SENTINEL = -1;          // P1 fix — distinguish failure from zero
const SCHEDTASK_NAMES = [                   // P0 fix — detect existing reapers
  "PRISM Hook Janitor",
  "PRISM Node Orphan Cleaner",
  "PRISM Orphan Process Reaper (PS)",
  "PRISM Zombie Reaper v2",
];

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
      return COUNT_FAILURE_SENTINEL;
    }
    // status null => timeout (signal SIGTERM); status non-zero => tasklist failed
    if (r.signal || r.status === null) {
      logErr(`countProcess(${image}) timed out / killed (signal=${r.signal})`);
      return COUNT_FAILURE_SENTINEL;
    }
    if (r.status !== 0) {
      logErr(`countProcess(${image}) exit=${r.status} stderr=${(r.stderr||"").slice(0, STDERR_TRIM_CHARS)}`);
      return COUNT_FAILURE_SENTINEL;
    }
    if (!r.stdout || r.stdout.includes("No tasks are running")) return 0;
    return r.stdout.split(/\r?\n/).filter(l => l.includes(image)).length;
  } catch (e) {
    logErr(`countProcess(${image}) threw: ${e.message}`);
    return COUNT_FAILURE_SENTINEL;
  }
}

function detectScheduledTasks() {
  // P0 fix: short-circuit when Windows scheduled-task reapers are already armed.
  const detected = [];
  for (const name of SCHEDTASK_NAMES) {
    const r = spawnSync("schtasks", ["/Query", "/TN", name], { encoding: "utf8", timeout: 4000 });
    if (r.status === 0) detected.push(name);
  }
  return detected;
}

function ramPct() {
  const free = os.freemem();
  const total = os.totalmem();
  return total ? Math.round((1 - free / total) * 100) : 0;
}

function findStaleGitLocks() {
  // P1 fix: authoritative source of worktree paths is git's own registry.
  // Each entry under <main>/.git/worktrees/<name>/gitdir points at the worktree's .git file,
  // whose containing directory IS the worktree path.
  const candidates = [];
  const seen = new Set();

  function addLockIfStale(lockPath) {
    if (seen.has(lockPath)) return;
    seen.add(lockPath);
    try {
      if (existsSync(lockPath)) {
        const st = statSync(lockPath);
        if (Date.now() - st.mtimeMs > STALE_LOCK_MAX_AGE_MS) candidates.push(lockPath);
      }
    } catch (e) {
      logErr(`findStaleGitLocks: stat ${lockPath} failed: ${e.message}`);
    }
  }

  // 1. Main repo's own .git/index.lock
  addLockIfStale(path.join(PRISM_ROOT, ".git", "index.lock"));

  // 2. Walk .git/worktrees/<name>/gitdir to find every linked worktree
  const wtRegistry = path.join(PRISM_ROOT, ".git", "worktrees");
  try {
    if (existsSync(wtRegistry)) {
      for (const entry of readdirSync(wtRegistry, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        // The worktree's index.lock lives inside the registry entry itself
        addLockIfStale(path.join(wtRegistry, entry.name, "index.lock"));
        // Also check the worktree's actual working-dir .git file pointer
        const gitdirFile = path.join(wtRegistry, entry.name, "gitdir");
        try {
          if (existsSync(gitdirFile)) {
            const target = readFileSync(gitdirFile, "utf8").trim();
            // target is path/to/worktree/.git → strip the .git suffix
            const wtPath = target.endsWith(".git") ? target.slice(0, -4).replace(/[\\/]+$/, "") : path.dirname(target);
            if (wtPath) addLockIfStale(path.join(wtPath, ".git", "index.lock"));
          }
        } catch (e) {
          logErr(`findStaleGitLocks: gitdir ${gitdirFile}: ${e.message}`);
        }
      }
    }
  } catch (e) {
    logErr(`findStaleGitLocks: cannot read ${wtRegistry}: ${e.message}`);
  }

  // 3. Fallback heuristic: sibling H:/prism-* and .claude/worktrees/* (catches
  //    pre-existing dirs not registered through git's worktree machinery)
  const fallbackDirs = [];
  try {
    const parent = path.dirname(PRISM_ROOT);
    for (const d of readdirSync(parent, { withFileTypes: true })) {
      if (d.isDirectory() && d.name.startsWith("prism")) fallbackDirs.push(path.join(parent, d.name));
    }
  } catch (e) {
    logErr(`findStaleGitLocks fallback: ${e.message}`);
  }
  const cct = path.join(PRISM_ROOT, ".claude", "worktrees");
  try {
    if (existsSync(cct)) {
      for (const d of readdirSync(cct, { withFileTypes: true })) {
        if (d.isDirectory()) fallbackDirs.push(path.join(cct, d.name));
      }
    }
  } catch (e) {
    logErr(`findStaleGitLocks fallback worktrees: ${e.message}`);
  }
  for (const d of fallbackDirs) addLockIfStale(path.join(d, ".git", "index.lock"));

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
    // P1 fix: surface timeout + non-zero exit explicitly instead of returning "(no output)".
    if (r.signal || r.status === null) {
      logErr(`reaper(${label}) timed out / killed (signal=${r.signal})`);
      return `timeout after ${REAPER_TIMEOUT_MS / 1000}s (signal=${r.signal})`;
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
    if (r.status !== 0) summary = `exit=${r.status} ${summary}`;
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
  const blindAlerts = [];

  function check(key, val, max) {
    if (val === COUNT_FAILURE_SENTINEL) {
      // P1 fix: never report blind-tasklist as a healthy zero. Surface as its own
      // alert key with the same cooldown semantics.
      if (shouldFireAlertNow(`blind_${key}`, now)) {
        blindAlerts.push(`${key}=BLIND`);
        lastAlertAt[`blind_${key}`] = now;
      }
      return;
    }
    if (val > max) {
      if (shouldFireAlertNow(key, now)) {
        activeAlerts.push(`${key}=${val}`);
        lastAlertAt[key] = now;
      } else {
        cooledAlerts.push(`${key}=${val}`);
      }
    }
  }
  // lastAlertAt extended dynamically — initialize blind keys lazily on first use
  lastAlertAt.blind_node ??= 0;
  lastAlertAt.blind_bash ??= 0;
  check("node", nodeN, NODE_MAX);
  check("bash", bashN, BASH_MAX);
  check("ram",  ram,   RAM_MAX);
  check("locks", locks, 0);

  if (activeAlerts.length || blindAlerts.length) {
    const head = [...activeAlerts, ...blindAlerts].join(" ");
    buf.push(`[${ts}] ALERT ${head} — reaping`);
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

// P0 fix: redundancy detection. If the Windows scheduled tasks are armed,
// downgrade this script to alert-only (no reaping) unless explicitly overridden
// with PRISM_RAM_WATCH_FORCE_REAP=1. The scheduled tasks run on a 2-5 min cadence
// and racing them on the same reapers risks taskkill /T storms.
const detectedTasks = detectScheduledTasks();
const FORCE_REAP = process.env.PRISM_RAM_WATCH_FORCE_REAP === "1";
const ALERT_ONLY = detectedTasks.length > 0 && !FORCE_REAP;
if (ALERT_ONLY) {
  // Empty out REAPERS so runReaper is never invoked
  REAPERS.length = 0;
  process.stdout.write(
    `[${nowZ()}] watchdog armed  ALERT-ONLY mode — ${detectedTasks.length} scheduled task(s) detected: ${detectedTasks.join(", ")}\n`
  );
} else {
  process.stdout.write(
    `[${nowZ()}] watchdog armed  REAPING mode  no scheduled-task overlap detected\n`
  );
}
process.stdout.write(
  `[${nowZ()}] thresholds: node>${NODE_MAX} bash>${BASH_MAX} ram>${RAM_MAX}% poll=${POLL_SEC}s hb=${HB_EVERY * POLL_SEC}s cooldown=${ALERT_COOLDOWN_MS / 1000}s\n`
);
tick();
setInterval(tick, POLL_SEC * 1000);
