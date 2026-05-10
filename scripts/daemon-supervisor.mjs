#!/usr/bin/env node
/**
 * daemon-supervisor.mjs — PRISM-STAB-MS0 (2026-05-09).
 *
 * Generic supervisor for long-running background processes (Quartz, the
 * context-bundle aggregator, etc.). Each daemon gets a registry entry at
 *   state/shared/daemons/<name>.json
 * with PID, command, args, started, log path. Liveness is checked via
 * process.kill(pid, 0) — works on Windows + POSIX.
 *
 * Subcommands:
 *   start <name> -- <command> [args...]   spawn detached, register
 *   stop <name>                           kill the daemon, remove registry
 *   restart <name>                        stop+start using stored command
 *   status <name>                         is it alive? print json
 *   list                                  all registered daemons
 *
 * The supervisor itself is short-lived — it spawns the child detached/unref'd
 * (using the pattern from git-sync-stop.mjs U-A1, but with the orphan reaper
 * U-A3 as a backstop in case anything escapes). Each child writes stdout+stderr
 * to state/shared/daemons/<name>.log.
 *
 * Idempotent: `start` on an already-alive daemon is a no-op (returns existing).
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const REGISTRY_DIR = "H:/prism/state/shared/daemons";
const LOG_DIR = REGISTRY_DIR; // co-located: <name>.json + <name>.log

const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,40}$/;

function ensureDirs() {
  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
}

function regPath(name) {
  return path.join(REGISTRY_DIR, `${name}.json`);
}

function logPath(name) {
  return path.join(LOG_DIR, `${name}.log`);
}

function readReg(name) {
  try { return JSON.parse(fs.readFileSync(regPath(name), "utf-8")); }
  catch { return null; }
}

function writeReg(name, entry) {
  ensureDirs();
  const tmp = `${regPath(name)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(entry, null, 2) + "\n");
  fs.renameSync(tmp, regPath(name));
}

function removeReg(name) {
  try { fs.unlinkSync(regPath(name)); } catch { /* ok */ }
}

function isAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code !== "ESRCH"; }
}

function validName(name) {
  return typeof name === "string" && NAME_RE.test(name);
}

function cmdStart(name, command, args) {
  if (!validName(name)) {
    return { ok: false, error: `invalid name: must match ${NAME_RE}` };
  }
  if (!command) {
    return { ok: false, error: "no command provided" };
  }
  ensureDirs();
  const existing = readReg(name);
  if (existing && isAlive(existing.pid)) {
    return { ok: true, message: "already running", entry: existing };
  }
  // Open log file for stdout+stderr append
  const logFd = fs.openSync(logPath(name), "a");
  const startedAt = new Date().toISOString();
  fs.writeSync(logFd, `\n--- daemon-supervisor: starting at ${startedAt} ---\n`);

  const child = spawn(command, args, {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });
  child.unref();
  fs.closeSync(logFd); // child has its own copy now

  if (!child.pid) {
    return { ok: false, error: "spawn returned no PID" };
  }
  const entry = {
    name,
    pid: child.pid,
    command,
    args,
    started: startedAt,
    log: logPath(name),
    machine: process.env.COMPUTERNAME || "unknown",
  };
  writeReg(name, entry);
  return { ok: true, message: "started", entry };
}

function cmdStop(name) {
  const entry = readReg(name);
  if (!entry) return { ok: false, error: `no registry entry for ${name}` };
  let killed = false;
  if (isAlive(entry.pid)) {
    try {
      process.kill(entry.pid, "SIGTERM");
      killed = true;
    } catch (e) {
      return { ok: false, error: `kill failed: ${e.message}`, entry };
    }
  }
  removeReg(name);
  return { ok: true, killed, entry };
}

function cmdStatus(name) {
  const entry = readReg(name);
  if (!entry) return { ok: false, error: `no registry entry for ${name}` };
  return { ok: true, alive: isAlive(entry.pid), entry };
}

function cmdRestart(name) {
  const entry = readReg(name);
  if (!entry) return { ok: false, error: `no registry entry for ${name}` };
  cmdStop(name);
  return cmdStart(name, entry.command, entry.args || []);
}

function cmdList() {
  ensureDirs();
  const files = fs.readdirSync(REGISTRY_DIR).filter((f) => f.endsWith(".json"));
  const daemons = [];
  for (const f of files) {
    const name = f.replace(/\.json$/, "");
    const entry = readReg(name);
    if (!entry) continue;
    daemons.push({ ...entry, alive: isAlive(entry.pid) });
  }
  return { ok: true, count: daemons.length, daemons };
}

// ── CLI ──
function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const name = argv[1];

  let result;
  switch (cmd) {
    case "start": {
      const sepIdx = argv.indexOf("--");
      if (sepIdx === -1 || sepIdx === argv.length - 1) {
        result = { ok: false, error: "start requires: <name> -- <command> [args...]" };
        break;
      }
      const command = argv[sepIdx + 1];
      const cmdArgs = argv.slice(sepIdx + 2);
      result = cmdStart(name, command, cmdArgs);
      break;
    }
    case "stop":
      result = cmdStop(name);
      break;
    case "restart":
      result = cmdRestart(name);
      break;
    case "status":
      result = cmdStatus(name);
      break;
    case "list":
      result = cmdList();
      break;
    default:
      result = {
        ok: false,
        error: `unknown command: ${cmd}`,
        usage: [
          "daemon-supervisor.mjs <command> [...]",
          "  start <name> -- <command> [args...]",
          "  stop <name>",
          "  restart <name>",
          "  status <name>",
          "  list",
        ].join("\n"),
      };
  }
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main();
