#!/usr/bin/env node
/**
 * mcp-server-watchdog.mjs — periodic /health probe + escalate on persistent wedge.
 *
 * Closes the gap surfaced 2026-05-19: the MCP server can be "listening but
 * unresponsive" (port bound, CLOSE_WAIT accumulating, /health timing out)
 * mid-life. The supervisor scheduled task only fires AtStartup + AtLogon so
 * it never noticed. This watchdog runs every 5 min as a separate scheduled
 * task — its only job is wedge detection + escalation.
 *
 * Behavior:
 *   - Probe GET /health with PRISM_MCP_WATCHDOG_TIMEOUT_MS (default 10000).
 *   - Healthy = HTTP 2xx/3xx (NOT 5xx — server's degraded signal).
 *   - On failure: increment `consecutiveFails` in state file.
 *   - After PRISM_MCP_WATCHDOG_FAIL_THRESHOLD consecutive failures (default 2,
 *     = 10 min of confirmed wedge), escalate:
 *       1. Find the PID listening on :3100 (Win32 `netstat -ano`).
 *       2. `taskkill /F /PID <pid>` to terminate the wedged process.
 *       3. Spawn the supervisor (`mcp-server-supervisor.mjs`) detached.
 *       4. Reset consecutiveFails to 0 and stamp `lastEscalationAt`.
 *   - On healthy: reset consecutiveFails to 0.
 *
 * State file: H:/prism/mcp-server/data/state/watchdog-state.json (small, atomic
 * write; idempotent across multiple watchdog runs — only ONE escalation per
 * confirmed wedge episode).
 *
 * Log: H:/prism/mcp-server/logs/watchdog.log (rotates at 1 MB).
 *
 * Knobs:
 *   PRISM_MCP_WATCHDOG_DISABLE=1        watchdog exits 0 immediately
 *   PRISM_MCP_WATCHDOG_TIMEOUT_MS=N     /health timeout (default 10000)
 *   PRISM_MCP_WATCHDOG_FAIL_THRESHOLD=N consecutive fails before escalation (default 2)
 *   PRISM_MCP_WATCHDOG_DRY_RUN=1        probe + decide, never kill/spawn (burn-in)
 *   PRISM_MCP_WATCHDOG_BOOTGUARD=1      enable the BOOTING guard (default OFF) — defer escalation
 *                                       while a peer is mid-boot; co-enable with the step-4 stamp
 *   PRISM_MCP_SERVER_HOST/PORT          override 127.0.0.1:3100
 *
 * Safety:
 *   - Single-fail escalation = false-positive on transient slow response.
 *     Threshold ≥ 2 enforced (the runtime clamps).
 *   - Cooldown after escalation: `lastEscalationAt` gates the next escalation
 *     by at least PRISM_MCP_WATCHDOG_TIMEOUT_MS × FAIL_THRESHOLD ms so a
 *     just-respawned server gets time to come up before being killed again.
 *   - DRY_RUN mode prints what it would do without killing/spawning.
 */

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";

const SERVER_HOST = process.env.PRISM_MCP_SERVER_HOST || "127.0.0.1";
const SERVER_PORT = parseInt(process.env.PRISM_MCP_SERVER_PORT || "3100", 10);
const HEALTH_URL = `http://${SERVER_HOST}:${SERVER_PORT}/health`;

const TIMEOUT_MS = parseInt(process.env.PRISM_MCP_WATCHDOG_TIMEOUT_MS || "10000", 10);
const FAIL_THRESHOLD = Math.max(2, parseInt(process.env.PRISM_MCP_WATCHDOG_FAIL_THRESHOLD || "2", 10));
const KILL_SWITCH = process.env.PRISM_MCP_WATCHDOG_DISABLE === "1";
const DRY_RUN = process.env.PRISM_MCP_WATCHDOG_DRY_RUN === "1" || process.argv.includes("--dry-run");
// MCP-OOM-PERMANENT (slot:kilo 2026-05-23): memory-pressure preemptive restart.
// Watchdog reads /health.memory.rss_mb every probe cycle. If RSS exceeds
// PRISM_MCP_WATCHDOG_RSS_THRESHOLD_MB (default 3072 = 3GB, well below the
// 4GB heap cap shipped in MCP-OOM-FIX), trigger an ORDERLY preemptive restart
// (same kill+respawn path as wedge escalation, but reason="rss_pressure"). This
// replaces unbounded growth → OOM crash with bounded growth → orderly recycle.
// Cooldown PRISM_MCP_WATCHDOG_PREEMPT_COOLDOWN_MS (default 30min) prevents
// flapping. Disable via PRISM_MCP_WATCHDOG_RSS_THRESHOLD_MB=0.
// BLACKWELL-TUNE (golf 2026-06-09): 3072 -> 18432 (18GB). A 3GB preempt-restart on a
// 136GB box was a top cause of fleet MCP disconnects (restart == disconnect). 18GB stays
// BELOW the 24GB heap floor so the restart is still orderly (before any OOM), but only
// fires under genuine pressure. Env-overridable; =0 disables.
const RSS_THRESHOLD_MB = parseInt(process.env.PRISM_MCP_WATCHDOG_RSS_THRESHOLD_MB || "18432", 10);
const PREEMPT_COOLDOWN_MS = parseInt(process.env.PRISM_MCP_WATCHDOG_PREEMPT_COOLDOWN_MS || "1800000", 10);
// MCP-CONCURRENCY-HARDEN (slot golf 2026-06-09): inflight-aware preempt restart.
// The RSS preempt-restart is a DISCONNECT for every in-flight agent call. Under an
// ultracode parallel-agent burst RSS legitimately spikes from N concurrent fresh
// request-servers (MCP-CONCURRENCY-FIX) -- not a leak -- so restarting then kills
// the whole burst at the worst moment. DEFER the preempt while /health reports
// inflight >= INFLIGHT_DEFER, UNLESS RSS has crossed the hard ceiling RSS_HARD_MB
// (a genuine runaway leak must still recycle -- a controlled restart beats an OOM
// crash even mid-burst). INFLIGHT_DEFER=0 disables the defer (always restart on RSS,
// pre-2026-06-09 behavior). Unknown inflight (older server without the field) is
// treated as 0 so the pre-existing behavior is preserved (fail-safe). Decision lives
// in the unit-tested pure lib lib/mcp-preempt-decision.mjs (decideRestart precedent).
const INFLIGHT_DEFER = Math.max(0, parseInt(process.env.PRISM_MCP_WATCHDOG_INFLIGHT_DEFER || "8", 10));
const RSS_HARD_MB = parseInt(process.env.PRISM_MCP_WATCHDOG_RSS_HARD_MB || String(RSS_THRESHOLD_MB + 10240), 10);

const STATE_FILE = "H:/prism/mcp-server/data/state/watchdog-state.json";
const LOG_FILE = "H:/prism/mcp-server/logs/watchdog.log";
const SUPERVISOR_SCRIPT = "H:/prism/scripts/mcp-server-supervisor.mjs";
const LOG_MAX_BYTES = 1_048_576;

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
  // Echo to stderr so a scheduled-task Event-Viewer trace exists.
  process.stderr.write(`[watchdog] ${level} ${msg}\n`);
}

// ---------- state ----------

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { consecutiveFails: 0, lastProbeAt: 0, lastEscalationAt: 0, lastFailReason: null };
  }
}

function saveState(s) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    const tmp = STATE_FILE + "." + process.pid + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
    fs.renameSync(tmp, STATE_FILE);
  } catch (e) {
    log("error", "Failed to save state", { error: e && e.message });
  }
}

// ---------- health probe ----------

function probeHealth() {
  return new Promise((resolve) => {
    const url = new URL(HEALTH_URL);
    const req = http.request(
      {
        hostname: url.hostname,
        port: parseInt(url.port, 10),
        path: url.pathname,
        method: "GET",
        timeout: TIMEOUT_MS,
      },
      (res) => {
        // Drain to free the socket. Cap TOTAL body at 4KB (not per-chunk, which
        // pre-MCP-OOM-PERMANENT truncated single-chunk /health responses to 200
        // bytes and broke any downstream JSON parse).
        let body = "";
        res.on("data", (b) => { if (body.length < 4096) body += b.toString(); });
        res.on("end", () => {
          const ok = res.statusCode >= 200 && res.statusCode < 400;
          // MCP-OOM-PERMANENT: extract memory.rss_mb for pressure-restart logic.
          let rssMB = null;
          let heapUsedMB = null;
          let uptimeSec = null;
          let inflight = null;
          try {
            const j = JSON.parse(body);
            rssMB = j?.memory?.rss_mb ?? null;
            heapUsedMB = j?.memory?.heap_used_mb ?? null;
            uptimeSec = j?.uptime_seconds ?? null;
            // MCP-CONCURRENCY-HARDEN: live concurrency for the inflight-aware preempt
            // defer. Absent on a pre-2026-06-09 server -> null -> treated as 0 downstream.
            inflight = j?.concurrency?.inflight ?? null;
          } catch {
            // body may be truncated or non-JSON — pressure check just skips
          }
          resolve({ ok, statusCode: res.statusCode, snippet: body.slice(0, 200), rssMB, heapUsedMB, uptimeSec, inflight });
        });
      }
    );
    req.on("error", (err) => resolve({ ok: false, error: err && err.code, message: err && err.message }));
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, error: "ETIMEDOUT" }); });
    req.end();
  });
}

// ---------- find listener PID on Windows ----------

function findListenerPid(port) {
  try {
    const r = spawnSync("netstat", ["-ano"], { encoding: "utf-8", windowsHide: true });
    if (r.status !== 0) return null;
    for (const line of r.stdout.split(/\r?\n/)) {
      // " TCP    127.0.0.1:3100   0.0.0.0:0   LISTENING   <pid>"
      const m = line.match(/\s127\.0\.0\.1:(\d+)\s+.*\s+LISTENING\s+(\d+)\s*$/);
      if (m && parseInt(m[1], 10) === port) return parseInt(m[2], 10);
    }
  } catch {}
  return null;
}

// ---------- escalation ----------

function escalate(state) {
  log("error", "Wedge confirmed — escalating", {
    consecutiveFails: state.consecutiveFails,
    threshold: FAIL_THRESHOLD,
    lastFailReason: state.lastFailReason,
  });
  if (DRY_RUN) {
    log("info", "DRY_RUN — would kill wedged PID and spawn supervisor");
    return;
  }
  // Step 1: find + kill the wedged listener PID.
  const pid = findListenerPid(SERVER_PORT);
  if (pid) {
    log("warn", "Killing wedged listener", { pid });
    const r = spawnSync("taskkill", ["/F", "/PID", String(pid)], { encoding: "utf-8", windowsHide: true });
    log("info", "taskkill result", { code: r.status, stdout: (r.stdout || "").slice(0, 200), stderr: (r.stderr || "").slice(0, 200) });
  } else {
    log("warn", "No listener PID found on port — server may already be down", { port: SERVER_PORT });
  }
  // Step 2: spawn the supervisor detached. It probes /health first
  // (idempotent) and only spawns the server if it's confirmed down.
  if (!fs.existsSync(SUPERVISOR_SCRIPT)) {
    log("error", "Supervisor script not found — cannot respawn", { path: SUPERVISOR_SCRIPT });
    return;
  }
  log("info", "Spawning supervisor", { script: SUPERVISOR_SCRIPT });
  const child = spawn(process.execPath, [SUPERVISOR_SCRIPT, "--once"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  log("info", "Supervisor spawned detached", { childPid: child.pid });
}

// ---------- main ----------

async function main() {
  if (KILL_SWITCH) {
    log("info", "Watchdog disabled via PRISM_MCP_WATCHDOG_DISABLE=1 — exiting 0");
    process.exit(0);
  }

  const state = loadState();
  state.lastProbeAt = Date.now();

  const probe = await probeHealth();
  if (probe.ok) {
    if (state.consecutiveFails > 0) {
      log("info", "Recovery detected", { priorFails: state.consecutiveFails, statusCode: probe.statusCode });
    } else {
      log("debug", "Healthy", { statusCode: probe.statusCode, rssMB: probe.rssMB, uptimeSec: probe.uptimeSec });
    }
    state.consecutiveFails = 0;
    state.lastFailReason = null;
    // MCP-OOM-PERMANENT: preemptive restart on RSS pressure (replaces OOM crash
    // with orderly recycle). Only fires when:
    //   (1) RSS_THRESHOLD_MB > 0 (operator hasn't disabled the feature)
    //   (2) probe returned a usable rssMB number
    //   (3) RSS exceeds threshold
    //   (4) cooldown since lastPreemptiveRestartAt has elapsed
    //   (5) uptime ≥ 60s (avoid restarting a server still cold-starting)
    const rssMB = probe.rssMB;
    const sinceLastPreempt = Date.now() - (state.lastPreemptiveRestartAt || 0);
    const uptimeOk = (probe.uptimeSec ?? 0) >= 60;
    if (RSS_THRESHOLD_MB > 0 && typeof rssMB === "number" && rssMB >= RSS_THRESHOLD_MB && sinceLastPreempt >= PREEMPT_COOLDOWN_MS && uptimeOk) {
      // MCP-CONCURRENCY-HARDEN: decide restart-now vs defer-past-the-burst via the
      // unit-tested pure lib. Lazy import (only under confirmed pressure) keeps the
      // common no-pressure probe import-free; fail-OPEN to restart so a missing or
      // broken lib can never strand a memory-pressured server (pre-2026-06-09 behavior).
      let decision;
      try {
        const { decidePreemptRestart } = await import("./lib/mcp-preempt-decision.mjs");
        decision = decidePreemptRestart({
          rssMB,
          rssThresholdMB: RSS_THRESHOLD_MB,
          rssHardMB: RSS_HARD_MB,
          inflight: probe.inflight,
          inflightDeferAt: INFLIGHT_DEFER,
          sinceLastPreemptMs: sinceLastPreempt,
          cooldownMs: PREEMPT_COOLDOWN_MS,
          uptimeSec: probe.uptimeSec,
        });
      } catch (e) {
        log("warn", "preempt-decision lib failed - failing OPEN to restart", { error: e && e.message });
        decision = { action: "restart", reason: `rss_pressure_${rssMB}MB`, inflight: 0, hardLeak: false };
      }
      if (decision.action === "defer") {
        log("info", "Memory pressure - DEFERRING preempt-restart (parallel-agent burst in flight)", {
          rssMB,
          thresholdMB: RSS_THRESHOLD_MB,
          hardCeilingMB: RSS_HARD_MB,
          inflight: decision.inflight,
          inflightDeferAt: INFLIGHT_DEFER,
        });
        // Do NOT stamp lastPreemptiveRestartAt - re-evaluate next cycle. A sustained
        // leak that outlives the burst restarts in the following lull; a true runaway
        // crosses RSS_HARD_MB and recycles immediately even mid-burst (hard-ceiling).
      } else if (decision.action === "restart") {
        log("warn", "Memory pressure - preemptive restart", {
          rssMB,
          thresholdMB: RSS_THRESHOLD_MB,
          hardCeilingMB: RSS_HARD_MB,
          heapUsedMB: probe.heapUsedMB,
          uptimeSec: probe.uptimeSec,
          inflight: decision.inflight,
          hardLeak: decision.hardLeak,
          reason: decision.reason,
          sinceLastPreemptMs: sinceLastPreempt,
          cooldownMs: PREEMPT_COOLDOWN_MS,
        });
        // Reuse the same kill+respawn path as wedge escalation - supervisor's
        // O_EXCL PID lock keeps concurrent spawns safe.
        const preemptState = { ...state, consecutiveFails: FAIL_THRESHOLD, lastFailReason: `rss_pressure_${rssMB}MB` };
        escalate(preemptState);
        state.lastPreemptiveRestartAt = Date.now();
        // Reset failure counters since the server was healthy at probe time.
        state.consecutiveFails = 0;
      }
      // decision.action === "skip" is unreachable under the outer guard above
      // (threshold/uptime/cooldown already satisfied) -> intentional no-op.
    }
    saveState(state);
    process.exit(0);
  }

  // Failure case.
  state.consecutiveFails++;
  state.lastFailReason = probe.error || `HTTP ${probe.statusCode}` || "unknown";
  log("warn", "Health probe failed", {
    consecutiveFails: state.consecutiveFails,
    threshold: FAIL_THRESHOLD,
    reason: state.lastFailReason,
    statusCode: probe.statusCode,
  });

  if (state.consecutiveFails >= FAIL_THRESHOLD) {
    // Cooldown: if we just escalated, wait for the supervisor to respawn before
    // killing again. Cooldown window = TIMEOUT_MS × FAIL_THRESHOLD (the time it
    // takes the next probe-cycle to confirm a successful spawn).
    const sinceLastEsc = Date.now() - (state.lastEscalationAt || 0);
    const cooldownMs = TIMEOUT_MS * FAIL_THRESHOLD;
    if (sinceLastEsc < cooldownMs) {
      log("info", "Escalation in cooldown — skipping", { sinceLastEsc, cooldownMs });
      saveState(state);
      process.exit(0);
    }
    // MCP-ALWAYS-CONNECTED step 3 (golf 2026-06-02): BOOTING guard before the destructive
    // kill+respawn. The boot-reset flap (root-caused 2026-06-02): the server cold-boots ~50s;
    // if this watchdog kills a process that is still booting (e.g. one the supervisor just
    // respawned, /health not yet 200), it resets the boot clock → perpetual flap. Consult the
    // unified port lock via the shared decideRestart predicate: if a peer is BOOTING (fresh
    // bootStartedAt + live owner PID), DEFER — do NOT kill, do NOT stamp lastEscalationAt, and
    // HOLD consecutiveFails so a genuinely-wedged server still escalates once boot grace exhausts.
    // DEFAULT-ON as of MCP-RESILIENCE FIX-3 (2026-06-04) — off ONLY via PRISM_MCP_WATCHDOG_BOOTGUARD=0.
    // Flipped from default-off once the CONSUMER's producer — the bootStartedAt port-lock STAMP —
    // shipped fleet-wide this session (U-BOOTGRACE-PRODUCER-WIRE: supervisor spawnChild + daemon start),
    // satisfying the original "co-enable producer+consumer together after both reviewed" precondition.
    // Gate mirrors bootGuardEnabled() (canonical + tested in lib/mcp-reconnect-action.mjs); kept INLINE
    // here so the gate carries NO import dependency — a missing/broken lib must never brick the watchdog.
    // STAMP CONTRACT step 4 MUST honor for this guard to be safe: write bootStartedAt ONCE at
    // child spawn; refresh/clear the lock to healthy when /health first passes; bootStartedAt is the
    // boot-START epoch (monotonic, never bumped per-refresh). KNOWN BOUND (Reviewer-B P1 #2): bare
    // lock.pid is PID-reuse-fallible — a dead boot whose PID got recycled to a live unrelated proc
    // reads ownerAlive=true and DEFERS, but only until the ~90s grace exhausts (≤1 watchdog cycle,
    // never permanent). Full closure = step 4 stamps process START-TIME alongside pid so a recycled
    // PID is detectable; do NOT cross-check the listener PID here (a booting server has not bound
    // :3100 yet, so findListenerPid is null mid-boot and the check would defeat the boot-defer).
    // Fail-OPEN: any guard error falls through to escalate so recovery can never be broken by the
    // guard (dynamic import keeps a missing/broken lib from killing the watchdog — fail-soft > R11).
    if (process.env.PRISM_MCP_WATCHDOG_BOOTGUARD !== "0") {  // bootGuardEnabled() — DEFAULT-ON, off only on "0"
      try {
        const { readPortLock, decideRestart, isOwnerAlive } = await import("./lib/mcp-reconnect-action.mjs");
        const lock = readPortLock();
        const ownerAlive = lock && Number.isInteger(lock.pid) ? isOwnerAlive(lock.pid) : undefined;
        const decision = decideRestart({ healthUp: false, lock, now: Date.now(), ownerAlive });
        if (decision.state === "booting") {
          log("info", "Boot-guard: peer is booting — deferring escalation (no kill)", {
            reason: decision.reason, bootAgeMs: decision.bootAgeMs, ownerPid: lock && lock.pid,
          });
          saveState(state); // consecutiveFails preserved (NOT reset) → wedged server still escalates later
          process.exit(0);
        }
      } catch (e) {
        log("warn", "Boot-guard check failed — failing OPEN to escalation", { error: e && e.message });
      }
    }
    escalate(state);
    state.consecutiveFails = 0;
    state.lastEscalationAt = Date.now();
  }
  saveState(state);
  process.exit(0);
}

main().catch((err) => {
  log("error", "Watchdog fatal", { error: err && err.message, stack: err && err.stack });
  process.exit(2);
});
