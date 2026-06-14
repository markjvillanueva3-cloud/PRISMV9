#!/usr/bin/env node
/**
 * mcp-server-supervisor.mjs — Spawn and supervise the PRISM MCP HTTP server.
 *
 * Mirrors the canonical supervisor pattern (install-fleet-reaper-task.ps1
 * driven). Designed to run as a Windows scheduled task on AtStartup +
 * AtLogon so the server is up before any Claude Code chat opens. Also runs
 * on-demand from the CLI.
 *
 * Behavior:
 *   - On launch: probe /health. If already up → log "already running" and
 *     exit 0 (idempotent — never double-binds).
 *   - Spawn `node H:/prism/mcp-server/dist/index.js` with TRANSPORT=http
 *     PORT=3100 HOST=127.0.0.1. Inherit stderr; capture stdout to log.
 *   - On child exit: exponential backoff respawn (5s → 60s cap). Reset
 *     backoff after 60s of stable uptime.
 *   - SIGTERM / SIGINT: stop respawn loop, propagate to child, wait 5s for
 *     graceful shutdown, then SIGKILL.
 *   - PID lock via O_EXCL — refuses to start if another supervisor PID is
 *     alive (cross-process check).
 *
 * Flags:
 *   --dry-run    Probe + log only, never spawn. Returns 0 if server up, 1 if down.
 *   --once       Spawn once, exit when child exits. No respawn loop.
 *
 * Knobs:
 *   PRISM_MCP_SUPERVISOR_DISABLE=1   exit 0 immediately (kill switch)
 *   PRISM_MCP_SERVER_PORT=N          override default 3100
 *   PRISM_MCP_SERVER_HOST=H          override default 127.0.0.1
 *   PRISM_MCP_BACKOFF_INITIAL_MS=N   default 5000
 *   PRISM_MCP_BACKOFF_MAX_MS=N       default 60000
 *   PRISM_MCP_UPTIME_RESET_MS=N      stable-uptime threshold for backoff reset, default 60000
 *
 * Reversibility: kill the supervisor PID; the PID lockfile is removed on
 * SIGTERM/exit. Re-run the scheduled-task installer's -Uninstall flag to
 * remove the autostart hook.
 */

import { spawn } from "node:child_process";
import { ensureHeapFloor } from "./lib/ensure-heap-floor.mjs";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { writePortLock } from "./lib/mcp-reconnect-action.mjs";

const SERVER_ENTRY = "H:/prism/mcp-server/dist/index.js";
const SERVER_HOST = process.env.PRISM_MCP_SERVER_HOST || "127.0.0.1";
const SERVER_PORT = parseInt(process.env.PRISM_MCP_SERVER_PORT || "3100", 10);
const HEALTH_URL = `http://${SERVER_HOST}:${SERVER_PORT}/health`;

const PID_FILE = "H:/prism/mcp-server/data/state/server-supervisor.pid";
const LOG_FILE = "H:/prism/mcp-server/logs/supervisor.log";
const LOG_MAX_BYTES = 1_048_576; // 1 MB

const BACKOFF_INITIAL_MS = parseInt(process.env.PRISM_MCP_BACKOFF_INITIAL_MS || "5000", 10);
const BACKOFF_MAX_MS = parseInt(process.env.PRISM_MCP_BACKOFF_MAX_MS || "60000", 10);
const UPTIME_RESET_MS = parseInt(process.env.PRISM_MCP_UPTIME_RESET_MS || "60000", 10);

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const ONCE = args.has("--once");

const KILL_SWITCH = process.env.PRISM_MCP_SUPERVISOR_DISABLE === "1";

// ---------- logging ----------

let logDirEnsured = false;
function log(level, msg, data = {}) {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    pid: process.pid,
    level,
    msg,
    ...data,
  });
  try {
    if (!logDirEnsured) {
      fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
      logDirEnsured = true;
    }
    try {
      const st = fs.statSync(LOG_FILE);
      if (st.size > LOG_MAX_BYTES) {
        try { fs.renameSync(LOG_FILE, LOG_FILE + ".1"); } catch {}
      }
    } catch {}
    fs.appendFileSync(LOG_FILE, entry + "\n");
  } catch {}
  // Always echo to stderr so a scheduled-task event-viewer trace exists.
  process.stderr.write(`[supervisor] ${level} ${msg}\n`);
}

// ---------- pid lock ----------

function pidAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0); // signal 0 = check existence, no actual kill
    return true;
  } catch (e) {
    // EPERM means it exists but we lack rights — still alive.
    return e && e.code === "EPERM";
  }
}

function acquirePidLock() {
  try {
    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  } catch {}
  // Stale-pid recovery: if a prior supervisor crashed, its PID file lingers
  // but the PID is dead → overwrite.
  if (fs.existsSync(PID_FILE)) {
    let priorPid = NaN;
    try { priorPid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10); } catch {}
    if (pidAlive(priorPid)) {
      log("error", "Another supervisor is already running", { priorPid });
      return false;
    }
    log("warn", "Stale supervisor PID file detected, taking over", { priorPid });
    try { fs.unlinkSync(PID_FILE); } catch {}
  }
  try {
    // O_EXCL: fail if file appeared between the check and the create
    // (defense against a peer supervisor racing us).
    const fd = fs.openSync(PID_FILE, "wx");
    fs.writeSync(fd, String(process.pid));
    fs.closeSync(fd);
    return true;
  } catch (e) {
    log("error", "Failed to acquire PID lock", { error: e && e.message });
    return false;
  }
}

function releasePidLock() {
  try {
    const cur = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
    if (cur === process.pid) fs.unlinkSync(PID_FILE);
  } catch {}
}

// ---------- health probe ----------

function probeHealth(timeoutMs = 5000) {
  return new Promise((resolve) => {
    const url = new URL(HEALTH_URL);
    const req = http.request(
      {
        hostname: url.hostname,
        port: parseInt(url.port, 10),
        path: url.pathname,
        method: "GET",
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        resolve({ up: res.statusCode >= 200 && res.statusCode < 400, statusCode: res.statusCode });
      }
    );
    req.on("error", (err) => resolve({ up: false, error: err && err.code }));
    req.on("timeout", () => { req.destroy(); resolve({ up: false, error: "ETIMEDOUT" }); });
    req.end();
  });
}

// ---------- supervised spawn ----------

let child = null;
let respawnTimer = null;
let stopping = false;
let backoffMs = BACKOFF_INITIAL_MS;

function clearRespawnTimer() {
  if (respawnTimer) { clearTimeout(respawnTimer); respawnTimer = null; }
}

// MCP-HARDEN (golf 2026-06-02): extracted so the child-exit handler can branch
// on the bind-fail-fast clean-exit path BEFORE deciding whether to respawn.
function scheduleRespawn(uptimeMs) {
  if (stopping || ONCE) return;
  // Reset backoff on stable uptime.
  if (uptimeMs >= UPTIME_RESET_MS) {
    backoffMs = BACKOFF_INITIAL_MS;
  }
  const delay = Math.min(backoffMs, BACKOFF_MAX_MS);
  log("info", "Scheduling respawn", { delayMs: delay });
  respawnTimer = setTimeout(() => { respawnTimer = null; spawnChild(); }, delay);
  // Exponential backoff for next consecutive crash.
  backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
}

function spawnChild() {
  if (stopping) return;
  log("info", "Spawning MCP server", { entry: SERVER_ENTRY, host: SERVER_HOST, port: SERVER_PORT });
  const startedAt = Date.now();
  // MCP-OOM-FIX (slot:kilo 2026-05-23): bump heap to 4GB. Server was OOM-
  // killed every ~14 min (exit code 0xFFFFFFFF = Windows abnormal kill) at
  // RSS 720MB / heap 624/664MB — past Node 22's default ~1.5GB old-space
  // cap. Driver: prism_guard:error_ledger_recall_similar called constantly
  // by peer chats, accumulating retained references. 4GB cap moves the
  // OOM horizon out by ~10x (multi-hour mitigation). The true leak fix
  // belongs in a separate session targeting error_ledger_recall_similar
  // ref-retention. ensureHeapFloor (2026-06-09): floor to 4096MB, OVERRIDING a
  // too-small inherited cap. The prior `includes("--max-old-space-size") ? keep`
  // logic wrongly treated the portable-node 384MB shim cap as an operator override
  // and kept it → boot OOM if ever shim-invoked. A deliberately LARGER heap
  // (e.g. =8192) is still respected. Shared with mcp-server-daemon.mjs (FIX-7).
  // BLACKWELL-TUNE (golf 2026-06-09): 4096 -> 24576 (24GB), env-overridable. The 4GB
  // cap was a band-aid for the error_ledger_recall_similar leak (see above); on the
  // 136GB Blackwell it forced OOM-restart disconnects every few hours. 24GB on a 136GB
  // box pushes the restart horizon ~6x out (the leak fix is still owed separately). A
  // larger inherited NODE_OPTIONS cap is still respected by ensureHeapFloor.
  const heapFloorMB = parseInt(process.env.PRISM_MCP_HEAP_FLOOR_MB || "24576", 10);
  const nextNodeOpts = ensureHeapFloor(process.env.NODE_OPTIONS, heapFloorMB);
  child = spawn(process.execPath, [SERVER_ENTRY], {
    // DOTENV-CWD-FIX (slot:zulu 2026-06-10): the scheduled task runs this
    // supervisor as SYSTEM with "Start In: N/A" -> cwd is System32, and the
    // server's dotenv.config() (src/index.ts) is cwd-relative -- so EVERY var
    // in mcp-server/.env (ANTHROPIC_API_KEY, PRISM_OBSIDIAN_API_KEY, ...) was
    // silently unloaded on the supervised path while loading fine via
    // scripts/start-http.mjs launched from the repo. Pin cwd to the server
    // root so both launch paths see the same env.
    cwd: "H:/prism/mcp-server",
    env: {
      ...process.env,
      TRANSPORT: "http",
      PORT: String(SERVER_PORT),
      HOST: SERVER_HOST,
      PRISM_BIND_HOST: SERVER_HOST,
      NODE_OPTIONS: nextNodeOpts,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  // MCP-ALWAYS-CONNECTED / U-BOOTGRACE-PRODUCER-WIRE (golf 2026-06-04): stamp the unified
  // port lock at spawn so the boot-grace consumer (decideRestart + watchdog BOOTGUARD) sees a
  // BOOTING server during the ~50s cold boot and DEFERS instead of killing → ends the flap.
  // Before this, NO spawner wrote bootStartedAt, so the whole FIX4/6 boot-grace was dormant
  // (zero producers). Fail-soft: a stamp failure never blocks the spawn.
  try {
    const _stampNow = Date.now();
    writePortLock({ pid: child.pid, startedAt: _stampNow, bootStartedAt: _stampNow, reason: "supervisor-spawn", role: "supervisor" });
  } catch (e) { log("warn", "port-lock boot-stamp failed (non-fatal)", { error: e && e.message }); }
  // Forward child output to log (lightly — most server logs go to its own
  // logs/combined.log file already; we capture stderr in case of crash).
  child.stdout?.on("data", (b) => {
    try { fs.appendFileSync(LOG_FILE, "[child stdout] " + b.toString().slice(0, 500)); } catch {}
  });
  child.stderr?.on("data", (b) => {
    try { fs.appendFileSync(LOG_FILE, "[child stderr] " + b.toString().slice(0, 500)); } catch {}
  });
  child.on("exit", (code, signal) => {
    const uptimeMs = Date.now() - startedAt;
    log(stopping ? "info" : "warn", "Child exited", { code, signal, uptimeMs });
    child = null;
    if (stopping || ONCE) return;
    // MCP-HARDEN (golf 2026-06-02): a short-lived clean exit(0) is the server's
    // bind-fail-fast path (index.ts preflight / listen EADDRINUSE handler) — the
    // child stepped aside because a peer already owns :PORT. Blindly respawning
    // would churn (lose race → exit 0 → respawn → … pinned at the 60s backoff
    // cap). So on a clean fast exit, VERIFY: if a healthy peer owns the port,
    // stand down with no respawn (the fleet is served). If NO healthy peer, the
    // exit(0) meant something else → respawn normally. This is the supervisor
    // cooperation the server-side exit(0) semantics depend on.
    if (code === 0 && !signal && uptimeMs < UPTIME_RESET_MS) {
      probeHealth(3000).then((p) => {
        if (stopping) return;
        if (p.up) {
          log("info", "Child exited cleanly and a healthy peer owns the port — standing down (no respawn churn)", { port: SERVER_PORT, statusCode: p.statusCode });
          releasePidLock();
          process.exit(0);
        }
        log("info", "Child exited 0 but no healthy peer found — respawning", { error: p.error });
        scheduleRespawn(uptimeMs);
      });
      return;
    }
    scheduleRespawn(uptimeMs);
  });
  child.on("error", (err) => {
    log("error", "Child process error", { error: err && err.message });
  });
}

// ---------- shutdown ----------

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  log("info", "Supervisor shutting down", { signal });
  clearRespawnTimer();
  if (child) {
    try { child.kill("SIGTERM"); } catch {}
    // SIGKILL fallback after 5s.
    setTimeout(() => {
      if (child) {
        log("warn", "Child did not exit cleanly within 5s, sending SIGKILL");
        try { child.kill("SIGKILL"); } catch {}
      }
    }, 5000).unref();
  }
  // Give the child exit handler a moment, then release lock and exit.
  setTimeout(() => {
    releasePidLock();
    process.exit(0);
  }, 6000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
// On Windows, scheduled task termination sends CTRL_BREAK_EVENT via the
// shell wrapper — surface it the same way.
process.on("SIGBREAK", () => shutdown("SIGBREAK"));

// ---------- main ----------

async function main() {
  if (KILL_SWITCH) {
    log("info", "Supervisor disabled via PRISM_MCP_SUPERVISOR_DISABLE=1 — exiting 0");
    process.exit(0);
  }

  // Idempotency: if a server is already responding healthy, do nothing.
  const probe = await probeHealth();
  if (probe.up) {
    log("info", "MCP server already up — supervisor exiting", { statusCode: probe.statusCode });
    process.exit(0);
  }
  log("info", "MCP server not responding, proceeding to spawn", { error: probe.error });

  if (DRY_RUN) {
    log("info", "Dry-run mode — would spawn but exiting", { entry: SERVER_ENTRY });
    process.exit(1);
  }

  if (!acquirePidLock()) {
    process.exit(2);
  }

  spawnChild();
  // Keep the event loop alive until shutdown — the child handle does that
  // implicitly, but if it ever dies and respawnTimer fires, the gap is
  // bridged by the timer. No explicit keep-alive needed.
}

main().catch((err) => {
  log("error", "Supervisor fatal", { error: err && err.message, stack: err && err.stack });
  releasePidLock();
  process.exit(3);
});
