#!/usr/bin/env node
/**
 * fleet-services-watchdog.mjs — periodic health-probe + restart-if-down for the
 * 4 local-compute services the 12+ chat fleet depends on:
 *
 *   1. Docker engine             — qdrant/postgres/prometheus/ollama containers
 *   2. Ollama daemon (:11434)    — local LLM inference
 *   3. NVIDIA NIM (:8000)        — local NIM TensorRT-LLM (work PC only)
 *   4. PRISM Fleet Reaper task   — Windows scheduled task that reaps orphans
 *
 * Why: the SessionStart autostart hooks (ollama-autostart, nim-autostart, the
 * local-compute-intent autostart) only fire when a NEW chat opens. Nothing
 * restarts a service that crashes mid-session. With 12+ concurrent chats on
 * one PC, a single crashed Docker daemon or NIM cascade-kills LLM offload
 * everywhere. This watchdog is the missing 5-min cadence keepalive.
 *
 * Modes:
 *   --once       single sweep (intended for scheduled task)
 *   --status     read-only — report current state, no restarts
 *   --json       machine-readable output (combine with --status or --once)
 *   --dry-run    skip restart actions, just log what WOULD restart
 *
 * Knobs:
 *   PRISM_FLEET_SVC_DISABLE=1            skip everything (CI-friendly)
 *   PRISM_FLEET_SVC_DRY_RUN=1            same as --dry-run
 *   PRISM_FLEET_SVC_COOLDOWN_SEC=N       min seconds between restarts of same service (default 300)
 *   PRISM_FLEET_SVC_NIM_DISABLE=1        skip NIM probes (home PC has no NIM)
 *   PRISM_FLEET_SVC_DOCKER_DISABLE=1     skip Docker probes
 *   PRISM_FLEET_SVC_OLLAMA_URL=...       override Ollama URL (default http://127.0.0.1:11434)
 *   PRISM_FLEET_SVC_NIM_URL=...          override NIM URL (default http://127.0.0.1:8000)
 *
 * Companion: install-fleet-services-watchdog-task.ps1 (registers Windows
 * scheduled task — SYSTEM principal, 5-min cadence, +90s phase offset from
 * fleet-reaper to avoid burst load).
 */

import { existsSync, writeFileSync, mkdirSync, appendFileSync, statSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync, spawn } from "node:child_process";

const LEDGER = "H:/prism/state/shared/.fleet-services-watchdog.jsonl";
const STATE_FILE = "H:/prism/state/shared/.fleet-services-watchdog-state.json";
const LOCK_FILE = "H:/prism/.claude/cache/fleet-services-watchdog.lock";
const LOCK_TTL_MS = 90_000; // generous for slow Docker restarts

const SERVICES = ["docker", "ollama", "nim", "fleet-reaper-task"];

// ── Pure helpers ──

export function getConfig(env = process.env) {
  return {
    disabled: env.PRISM_FLEET_SVC_DISABLE === "1",
    dryRun: env.PRISM_FLEET_SVC_DRY_RUN === "1",
    cooldownSec: Math.max(30, Number(env.PRISM_FLEET_SVC_COOLDOWN_SEC) || 300),
    nimDisabled: env.PRISM_FLEET_SVC_NIM_DISABLE === "1",
    dockerDisabled: env.PRISM_FLEET_SVC_DOCKER_DISABLE === "1",
    ollamaUrl: (env.PRISM_FLEET_SVC_OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, ""),
    nimUrl: (env.PRISM_FLEET_SVC_NIM_URL || "http://127.0.0.1:8000").replace(/\/+$/, ""),
  };
}

/** Pure: classify probe result into health state. */
export function classifyServiceHealth(probe) {
  if (!probe || typeof probe !== "object") return "unknown";
  if (probe.error === "disabled") return "skipped";
  if (probe.up === true) return "up";
  if (probe.up === false) return "down";
  return "unknown";
}

/** Pure: should we restart this service? Decision based on state + cooldown. */
export function decideRestart({ health, lastRestartAt, cooldownSec, nowMs, dryRun }) {
  if (health === "up") return { restart: false, reason: "already-up" };
  if (health === "skipped") return { restart: false, reason: "disabled-via-knob" };
  if (health === "unknown") return { restart: false, reason: "probe-inconclusive" };
  if (dryRun) return { restart: false, reason: "dry-run", wouldRestart: true };
  if (lastRestartAt && (nowMs - lastRestartAt) < cooldownSec * 1000) {
    const ageSec = Math.round((nowMs - lastRestartAt) / 1000);
    return { restart: false, reason: `cooldown-active (${ageSec}s < ${cooldownSec}s)` };
  }
  return { restart: true, reason: "down-and-cooldown-expired" };
}

/** Pure: build the restart command for each service. */
export function buildRestartCommand(service) {
  switch (service) {
    case "docker": return {
      cmd: process.execPath,
      args: [
        "H:/prism/mcp-server/scripts/ollama-docker-launcher.mjs",
        "--services=postgres,prism-server,prometheus,ollama,qdrant",
        "--skip-pull",
      ],
      detached: true,
    };
    case "ollama": return {
      // Ollama runs inside Docker compose; restarting docker brings ollama too.
      // If a non-Docker Ollama install exists at H:/Tools/ollama/, the user
      // owns that — we don't try to fork a native ollama serve.
      cmd: process.execPath,
      args: [
        "H:/prism/mcp-server/scripts/ollama-docker-launcher.mjs",
        "--services=ollama",
        "--skip-pull",
      ],
      detached: true,
    };
    case "nim": return {
      cmd: "powershell",
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "H:/Tools/nim/start.ps1"],
      detached: true,
    };
    case "fleet-reaper-task": return {
      cmd: "schtasks",
      args: ["/Run", "/TN", "PRISM Fleet Reaper"],
      detached: false,
    };
    default: return null;
  }
}

/** Pure: parse `schtasks /Query /TN ... /V /FO LIST` stdout → status string. */
export function parseTaskQueryStatus(stdout) {
  if (!stdout || typeof stdout !== "string") return "unknown";
  const lines = stdout.split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(/^\s*Status:\s*(.+?)\s*$/i);
    if (m) {
      const s = m[1].trim().toLowerCase();
      if (s === "ready") return "ready";
      if (s === "running") return "running";
      if (s === "disabled") return "disabled";
      if (s === "queued") return "queued";
      return s;
    }
  }
  return "unknown";
}

/** Pure: aggregate per-service results into a summary. */
export function aggregateReport(serviceResults) {
  const summary = {
    timestamp: new Date().toISOString(),
    services: {},
    healthy: 0,
    degraded: 0,
    restarted: 0,
    skipped: 0,
    unknown: 0,
  };
  for (const [svc, r] of Object.entries(serviceResults || {})) {
    summary.services[svc] = {
      health: r.health,
      action: r.action,
      reason: r.reason,
      restartedAt: r.restartedAt || null,
    };
    if (r.health === "up") summary.healthy++;
    else if (r.health === "down") summary.degraded++;
    else if (r.health === "skipped") summary.skipped++;
    else summary.unknown++;
    if (r.action === "restarted") summary.restarted++;
  }
  return summary;
}

// ── State persistence (injectable for tests) ──

export function readState(path = STATE_FILE, deps = {}) {
  const _exists = deps.existsSync || existsSync;
  const _read = deps.readFileSync || readFileSync;
  if (!_exists(path)) return { lastRestart: {} };
  try {
    const j = JSON.parse(_read(path, "utf8"));
    return j && typeof j === "object" ? j : { lastRestart: {} };
  } catch {
    return { lastRestart: {} };
  }
}

export function saveState(path, state, deps = {}) {
  const _write = deps.writeFileSync || writeFileSync;
  const _exists = deps.existsSync || existsSync;
  const _mkdir = deps.mkdirSync || mkdirSync;
  try {
    const dir = dirname(path);
    if (!_exists(dir)) _mkdir(dir, { recursive: true });
    _write(path, JSON.stringify(state, null, 2));
    return true;
  } catch {
    return false;
  }
}

export function appendLedger(path, entry, deps = {}) {
  const _append = deps.appendFileSync || appendFileSync;
  const _exists = deps.existsSync || existsSync;
  const _mkdir = deps.mkdirSync || mkdirSync;
  try {
    const dir = dirname(path);
    if (!_exists(dir)) _mkdir(dir, { recursive: true });
    _append(path, JSON.stringify(entry) + "\n");
    return true;
  } catch {
    return false;
  }
}

// ── Lock (prevents concurrent watchdog runs) ──

export function acquireLock(path = LOCK_FILE, ttlMs = LOCK_TTL_MS, deps = {}) {
  const _exists = deps.existsSync || existsSync;
  const _read = deps.readFileSync || readFileSync;
  const _write = deps.writeFileSync || writeFileSync;
  const _mkdir = deps.mkdirSync || mkdirSync;
  const nowMs = deps.now ? deps.now() : Date.now();
  try {
    if (_exists(path)) {
      const data = JSON.parse(_read(path, "utf8"));
      if (nowMs - data.ts < ttlMs) return false;
    }
    const dir = dirname(path);
    if (!_exists(dir)) _mkdir(dir, { recursive: true });
    _write(path, JSON.stringify({ ts: nowMs, pid: process.pid }));
    return true;
  } catch {
    return false;
  }
}

export function releaseLock(path = LOCK_FILE, deps = {}) {
  try {
    const _unlink = deps.unlinkSync || (await import("node:fs")).unlinkSync;
    _unlink(path);
    return true;
  } catch {
    return false;
  }
}

// ── Probes (async, injectable fetch/spawn) ──

export async function probeOllama({ url, timeoutMs, fetchImpl = fetch }) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(`${url}/api/tags`, { signal: ctl.signal });
    if (!r.ok) return { up: false, error: `HTTP ${r.status}` };
    const j = await r.json().catch(() => null);
    return { up: true, modelCount: j?.models?.length || 0 };
  } catch (e) {
    return { up: false, error: e.code || e.message || "unknown" };
  } finally {
    clearTimeout(t);
  }
}

export async function probeNim({ url, timeoutMs, fetchImpl = fetch }) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(`${url}/v1/models`, { signal: ctl.signal });
    return { up: r.ok, status: r.status };
  } catch (e) {
    return { up: false, error: e.code || e.message || "unknown" };
  } finally {
    clearTimeout(t);
  }
}

export function probeDocker({ spawnImpl = spawnSync, timeoutMs }) {
  try {
    const r = spawnImpl("docker", ["info", "--format", "{{.ServerVersion}}"], {
      timeout: timeoutMs,
      encoding: "utf8",
    });
    if (r.status === 0 && r.stdout && r.stdout.trim()) {
      return { up: true, version: r.stdout.trim() };
    }
    return { up: false, error: r.stderr?.trim() || `exit ${r.status}` };
  } catch (e) {
    return { up: false, error: e.message || "spawn-failed" };
  }
}

export function probeFleetReaperTask({ spawnImpl = spawnSync, timeoutMs }) {
  try {
    const r = spawnImpl("schtasks", ["/Query", "/TN", "PRISM Fleet Reaper", "/V", "/FO", "LIST"], {
      timeout: timeoutMs,
      encoding: "utf8",
    });
    if (r.status !== 0) return { up: false, error: `schtasks exit ${r.status}` };
    const status = parseTaskQueryStatus(r.stdout);
    // Ready + Running are both healthy; only disabled/unknown count as down
    const up = status === "ready" || status === "running" || status === "queued";
    return { up, status };
  } catch (e) {
    return { up: false, error: e.message || "spawn-failed" };
  }
}

// ── Restart action (side-effecting, lock-guarded) ──

export function executeRestart(service, { spawnImpl = spawn, deps = {} } = {}) {
  const cmd = buildRestartCommand(service);
  if (!cmd) return { ok: false, error: "no-command-for-service" };
  try {
    const child = spawnImpl(cmd.cmd, cmd.args, {
      detached: cmd.detached,
      stdio: "ignore",
      windowsHide: true,
    });
    if (child && typeof child.unref === "function" && cmd.detached) child.unref();
    return { ok: true, pid: child?.pid || null };
  } catch (e) {
    return { ok: false, error: e.message || "spawn-failed" };
  }
}

// ── Orchestrator ──

export async function runSweep(opts = {}) {
  const env = opts.env || process.env;
  const cfg = getConfig(env);
  if (cfg.disabled) {
    return { ok: true, summary: { skipped: true, reason: "PRISM_FLEET_SVC_DISABLE=1" } };
  }
  const dryRun = cfg.dryRun || opts.dryRun;
  const nowMs = opts.nowMs || Date.now();
  const timeoutMs = opts.probeTimeoutMs || 2000;
  const state = readState(opts.statePath || STATE_FILE, opts.deps || {});

  const probes = {
    docker: cfg.dockerDisabled
      ? { up: null, error: "disabled" }
      : probeDocker({ timeoutMs, spawnImpl: opts.spawnImpl || spawnSync }),
    ollama: await probeOllama({ url: cfg.ollamaUrl, timeoutMs, fetchImpl: opts.fetchImpl }),
    nim: cfg.nimDisabled
      ? { up: null, error: "disabled" }
      : await probeNim({ url: cfg.nimUrl, timeoutMs, fetchImpl: opts.fetchImpl }),
    "fleet-reaper-task": probeFleetReaperTask({ timeoutMs, spawnImpl: opts.spawnImpl || spawnSync }),
  };

  const serviceResults = {};
  for (const svc of SERVICES) {
    const probe = probes[svc];
    const health = classifyServiceHealth(probe);
    const lastRestartAt = state.lastRestart?.[svc] || 0;
    const decision = decideRestart({
      health,
      lastRestartAt,
      cooldownSec: cfg.cooldownSec,
      nowMs,
      dryRun,
    });
    let action = "none";
    let restartedAt = null;
    if (decision.restart) {
      const r = executeRestart(svc, { spawnImpl: opts.spawnImplDetached });
      action = r.ok ? "restarted" : "restart-failed";
      restartedAt = r.ok ? nowMs : null;
      if (r.ok) {
        state.lastRestart = state.lastRestart || {};
        state.lastRestart[svc] = nowMs;
      }
    } else if (decision.wouldRestart) {
      action = "would-restart-dry-run";
    }
    serviceResults[svc] = {
      health,
      action,
      reason: decision.reason,
      restartedAt,
      probe,
    };
  }

  const summary = aggregateReport(serviceResults);
  saveState(opts.statePath || STATE_FILE, state, opts.deps || {});
  appendLedger(opts.ledgerPath || LEDGER, summary, opts.deps || {});
  return { ok: true, summary };
}

// ── CLI ──

const isMain = (() => {
  try {
    return import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
           import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
  } catch { return false; }
})();

function parseArgs(argv) {
  return {
    once: argv.includes("--once"),
    status: argv.includes("--status"),
    json: argv.includes("--json"),
    dryRun: argv.includes("--dry-run"),
  };
}

function renderText(report) {
  const lines = [];
  lines.push(`[fleet-svc-watchdog] ${report.summary?.timestamp || new Date().toISOString()}`);
  if (report.summary?.skipped) {
    lines.push(`  SKIPPED — ${report.summary.reason}`);
    return lines.join("\n");
  }
  const svcs = report.summary?.services || {};
  for (const [svc, r] of Object.entries(svcs)) {
    const icon = r.health === "up" ? "✓" : r.health === "down" ? "✗" : r.health === "skipped" ? "·" : "?";
    lines.push(`  ${icon} ${svc.padEnd(20)} health=${r.health.padEnd(8)} action=${r.action.padEnd(20)} ${r.reason}`);
  }
  const s = report.summary;
  lines.push(`  totals: ${s.healthy} healthy · ${s.degraded} degraded · ${s.restarted} restarted · ${s.skipped} skipped · ${s.unknown} unknown`);
  return lines.join("\n");
}

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (args.status) {
    const state = readState();
    const out = args.json ? JSON.stringify(state, null, 2) : JSON.stringify(state, null, 2);
    process.stdout.write(out + "\n");
    process.exit(0);
  }
  if (!acquireLock()) {
    process.stdout.write(JSON.stringify({ ok: false, reason: "lock-held" }) + "\n");
    process.exit(0);
  }
  runSweep({ dryRun: args.dryRun }).then((report) => {
    process.stdout.write((args.json ? JSON.stringify(report, null, 2) : renderText(report)) + "\n");
    process.exit(0);
  }).catch((e) => {
    process.stderr.write(`[fleet-svc-watchdog] error: ${e.message}\n`);
    process.exit(1);
  }).finally(() => {
    try {
      const { unlinkSync } = await import("node:fs");
      if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);
    } catch {}
  });
}
