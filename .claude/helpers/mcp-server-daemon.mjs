#!/usr/bin/env node
/**
 * mcp-server-daemon.mjs — Shared MCP Server Daemon Manager
 *
 * Manages a single PRISM MCP server instance that multiple Claude chats share.
 * Eliminates the "N chats = N processes" contention problem.
 *
 * Commands:
 *   start   - Start the daemon (if not running)
 *   stop    - Stop the daemon
 *   status  - Check if daemon is running
 *   restart - Stop then start
 *   logs    - Tail the daemon logs
 *
 * Usage:
 *   node mcp-server-daemon.mjs start
 *   node mcp-server-daemon.mjs status
 */

import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";
import { writePortLock } from "../../scripts/lib/mcp-reconnect-action.mjs";
import { ensureHeapFloor } from "../../scripts/lib/ensure-heap-floor.mjs";

const MCP_SERVER_DIR = "H:/prism/mcp-server";
const PID_FILE = "H:/prism/.claude/cache/mcp-daemon.pid";
const LOG_FILE = "H:/prism/.claude/cache/mcp-daemon.log";
const CACHE_DIR = "H:/prism/.claude/cache";
const HTTP_PORT = parseInt(process.env.MCP_HTTP_PORT || "3100", 10);
const HTTP_HOST = process.env.MCP_HTTP_HOST || "127.0.0.1";
const HEALTH_URL = `http://${HTTP_HOST}:${HTTP_PORT}/health`;
const STARTUP_TIMEOUT_MS = 30000;
const HEALTH_CHECK_INTERVAL_MS = 1000;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    ensureDir(CACHE_DIR);
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {}
}

function readPid() {
  try {
    const content = fs.readFileSync(PID_FILE, "utf-8").trim();
    return parseInt(content, 10);
  } catch {
    return null;
  }
}

function writePid(pid) {
  ensureDir(CACHE_DIR);
  fs.writeFileSync(PID_FILE, String(pid));
}

function clearPid() {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {}
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: 5000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

async function waitForHealth(timeoutMs = STARTUP_TIMEOUT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkHealth()) {
      return true;
    }
    await new Promise(r => setTimeout(r, HEALTH_CHECK_INTERVAL_MS));
  }
  return false;
}

async function start() {
  // Check if already running
  const existingPid = readPid();
  if (existingPid && isProcessRunning(existingPid)) {
    const healthy = await checkHealth();
    if (healthy) {
      log(`Daemon already running (PID ${existingPid}), health OK`);
      return true;
    }
    log(`Daemon PID ${existingPid} exists but not healthy, killing...`);
    try {
      process.kill(existingPid, "SIGTERM");
      await new Promise(r => setTimeout(r, 2000));
    } catch {}
  }

  // Check if port is in use by another process
  const portInUse = await checkHealth();
  if (portInUse) {
    log(`Port ${HTTP_PORT} already in use and responding to health checks`);
    return true;
  }

  log(`Starting MCP daemon on ${HTTP_HOST}:${HTTP_PORT}...`);

  // Build if needed
  // esbuild emits dist/index.js (see mcp-server/esbuild.config.mjs default outfile)
  const distPath = path.join(MCP_SERVER_DIR, "dist", "index.js");
  if (!fs.existsSync(distPath)) {
    log("Building MCP server first...");
    try {
      execSync("npm run build:fast", { windowsHide: true,
        cwd: MCP_SERVER_DIR,
        stdio: "inherit",
        timeout: 60000
      });
    } catch (e) {
      log(`Build failed: ${e.message}`);
      return false;
    }
  }

  // Start the server
  const logStream = fs.openSync(LOG_FILE, "a");

  // Use process.execPath — `node` may not be on PATH (portable-node setup).
  const child = spawn(process.execPath, ["dist/index.js"], {
    cwd: MCP_SERVER_DIR,
    env: {
      ...process.env,
      TRANSPORT: "http",
      // Server reads PORT (src/index.ts:987), keep HTTP_PORT for any helpers reading it.
      PORT: String(HTTP_PORT),
      HTTP_PORT: String(HTTP_PORT),
      PRISM_BIND_HOST: HTTP_HOST,
      HTTP_HOST: HTTP_HOST,
      NODE_ENV: "production",
      // CRITICAL (2026-06-09): floor the server's heap. A spawn from a portable-node-
      // capped context (e.g. `singleton-service-guard --fix` via the node shim) inherits
      // NODE_OPTIONS=--max-old-space-size=384, and the server OOMs on boot (loads 4000+
      // tribal tips + registries) -- AND OOMs again under heavy multi-agent :3100 load.
      // FLEET-OLLAMA-ROUTING/U-FLOR-MCP-HEAP (2026-06-10): the daemon path had drifted
      // back to the ensureHeapFloor DEFAULT (4096MB / 4GB) while the supervisor moved to
      // 24576MB -- so a daemon-launched :3100 OOM'd under agent load where a supervisor-
      // launched one did not. Read the SAME PRISM_MCP_HEAP_FLOOR_MB env (default 24576 /
      // 24GB; ~136GB host has ample headroom) so both spawn paths floor identically.
      NODE_OPTIONS: ensureHeapFloor(
        process.env.NODE_OPTIONS,
        parseInt(process.env.PRISM_MCP_HEAP_FLOOR_MB || "24576", 10),
      )
    },
    detached: true, windowsHide: true,
    stdio: ["ignore", logStream, logStream]
  });

  child.unref();
  writePid(child.pid);
  // MCP-ALWAYS-CONNECTED / U-BOOTGRACE-PRODUCER-WIRE (golf 2026-06-04): stamp the unified
  // boot-grace lock so decideRestart/BOOTGUARD treat this cold-boot as BOOTING (defer, don't
  // kill). Secondary spawn path (the reconnect-hook's); the supervisor is the primary. Fail-soft.
  try {
    const _stampNow = Date.now();
    writePortLock({ pid: child.pid, startedAt: _stampNow, bootStartedAt: _stampNow, reason: "daemon-helper-spawn", role: "supervisor" });
  } catch {}
  log(`Daemon started with PID ${child.pid}`);

  // Wait for health check
  log("Waiting for server to become healthy...");
  const healthy = await waitForHealth();
  if (healthy) {
    log(`Daemon healthy on http://${HTTP_HOST}:${HTTP_PORT}`);
    return true;
  } else {
    log("WARNING: Daemon started but health check failed. Check logs.");
    return false;
  }
}

async function stop() {
  const pid = readPid();
  if (!pid) {
    log("No PID file found, daemon not running");
    return true;
  }

  if (!isProcessRunning(pid)) {
    log(`PID ${pid} not running, cleaning up`);
    clearPid();
    return true;
  }

  log(`Stopping daemon (PID ${pid})...`);
  try {
    process.kill(pid, "SIGTERM");
    // Wait for graceful shutdown
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (!isProcessRunning(pid)) {
        log("Daemon stopped gracefully");
        clearPid();
        return true;
      }
    }
    // Force kill
    log("Graceful shutdown timed out, force killing...");
    process.kill(pid, "SIGKILL");
    clearPid();
    return true;
  } catch (e) {
    log(`Error stopping daemon: ${e.message}`);
    clearPid();
    return false;
  }
}

async function status() {
  const pid = readPid();
  if (!pid) {
    console.log(JSON.stringify({ running: false, reason: "no_pid_file" }));
    return;
  }

  const processRunning = isProcessRunning(pid);
  const healthy = processRunning ? await checkHealth() : false;

  console.log(JSON.stringify({
    running: processRunning,
    healthy,
    pid,
    url: `http://${HTTP_HOST}:${HTTP_PORT}`,
    pidFile: PID_FILE,
    logFile: LOG_FILE
  }));
}

async function restart() {
  await stop();
  await new Promise(r => setTimeout(r, 1000));
  return start();
}

function logs() {
  try {
    const content = fs.readFileSync(LOG_FILE, "utf-8");
    const lines = content.split("\n").slice(-50);
    console.log(lines.join("\n"));
  } catch (e) {
    console.log(`No logs found: ${e.message}`);
  }
}

async function main() {
  const command = process.argv[2] || "status";

  switch (command) {
    case "start":
      const started = await start();
      process.exit(started ? 0 : 1);
      break;
    case "stop":
      const stopped = await stop();
      process.exit(stopped ? 0 : 1);
      break;
    case "status":
      await status();
      break;
    case "restart":
      const restarted = await restart();
      process.exit(restarted ? 0 : 1);
      break;
    case "logs":
      logs();
      break;
    default:
      console.log("Usage: mcp-server-daemon.mjs [start|stop|status|restart|logs]");
      process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
