#!/usr/bin/env node
/**
 * hermes-proxy-ensure.mjs -- idempotent keepalive for the Hermes OpenAI proxy
 * (HERMES-BRIDGE-MS0/U-PROXY-ENSURE).
 *
 * scripts/ask-hermes.mjs talks to `hermes proxy` on :8645. That proxy is not a
 * service -- if it is down, the bridge silently degrades to free Ollama. This
 * script makes the Hermes path reliably live: it checks the proxy, and if it is
 * down, spawns `hermes proxy start` DETACHED so it survives this process exit.
 * Idempotent -- running it when the proxy is already up is a no-op. Designed to
 * be driven by the `PRISM Hermes Proxy` scheduled task (install-hermes-proxy-task.ps1)
 * on the same cadence as the other PRISM keepalives, OR run ad-hoc.
 *
 * Usage:
 *   node scripts/hermes-proxy-ensure.mjs [--provider xai|nous] [--port 8645]
 *                                        [--url http://127.0.0.1:8645/v1]
 *                                        [--timeout 6000] [--json]
 *
 * Exit codes:
 *   0  proxy is up (was already up, OR we started it and it became ready)
 *   3  proxy was down and could not be started/confirmed (fail loud -- R12)
 *   2  usage error
 *
 * Design: pure arg/url helpers (exported, unit-tested) + a thin impure shell.
 */

import { existsSync, mkdirSync, openSync, writeSync, closeSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const HERMES_AGENT_DIR = process.env.PRISM_HERMES_AGENT_DIR
  || "C:/Users/wompu/AppData/Local/hermes/hermes-agent";
const HERMES_PY = process.env.PRISM_HERMES_PY
  || `${HERMES_AGENT_DIR}/venv/Scripts/python.exe`;
const READY_PROBES = 30;        // up to ~30 * probeGapMs after a cold start
const PROBE_GAP_MS = 1000;

/** Parse argv -> {provider, port, url, timeout, json, error}. Pure. */
export function parseEnsureArgs(argv) {
  const out = { provider: "xai", port: 8645, url: null, timeout: 6000, json: false, error: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--provider") out.provider = argv[++i] ?? "xai";
    else if (a === "--port") out.port = parseInt(argv[++i] ?? "8645", 10) || 8645;
    else if (a === "--url") out.url = argv[++i] ?? null;
    else if (a === "--timeout") out.timeout = parseInt(argv[++i] ?? "6000", 10) || 6000;
    else if (a.startsWith("--")) { out.error = `unknown flag: ${a}`; return out; }
  }
  if (out.provider !== "xai" && out.provider !== "nous") {
    out.error = `provider must be xai or nous (got ${out.provider})`;
  }
  return out;
}

/** Derive the /v1 base url from port (or honor an explicit --url). Pure. */
export function resolveBaseUrl({ url, port }) {
  if (url) return url.replace(/\/+$/, "");
  return `http://127.0.0.1:${port}/v1`;
}

/** Build the detached spawn argv for `hermes proxy start`. Pure. */
export function buildProxyArgv(pyPath, { provider, port }) {
  return [pyPath, ["-m", "hermes_cli.main", "proxy", "start", "--provider", provider, "--host", "127.0.0.1", "--port", String(port)]];
}

/** Resolve the proxy-start log path (env override `PRISM_HERMES_PROXY_LOG`). Pure. */
export function resolveStartLogPath(env = process.env) {
  return env.PRISM_HERMES_PROXY_LOG || "H:/prism/state/shared/hermes-proxy-start.log";
}

/** Build the detached proxy's stdio. With an open log fd, tee stdout+stderr to it
 *  so a start failure (e.g. the missing-aiohttp dep that silently failed this proxy
 *  for >48h) is DIAGNOSABLE in seconds instead of swallowed by stdio:"ignore" -- the
 *  same R12 fail-loud lesson as the consensus-drain log-tee fix. Without a fd (log
 *  open failed), fall back to "ignore" so logging never blocks the keepalive. Pure. */
export function buildStartStdio(logFd) {
  return typeof logFd === "number" ? ["ignore", logFd, logFd] : "ignore";
}

/** HTTP probe: is the proxy serving /v1/models? Returns boolean. Impure. */
export async function isProxyUp(baseUrl, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: "Bearer prism" }, signal: ctrl.signal,
    });
    return r.ok;
  } catch { return false; }
  finally { clearTimeout(t); }
}

function emit(json, obj) {
  if (json) process.stdout.write(JSON.stringify(obj) + "\n");
  else process.stdout.write((obj.message || obj.status || "") + "\n");
}

async function main() {
  const args = parseEnsureArgs(process.argv.slice(2));
  if (args.error) {
    process.stderr.write(`[hermes-proxy-ensure] ${args.error}\n`);
    process.exit(2);
  }
  const baseUrl = resolveBaseUrl(args);

  if (await isProxyUp(baseUrl, args.timeout)) {
    emit(args.json, { status: "already-up", url: baseUrl });
    process.exit(0);
  }

  if (!existsSync(HERMES_PY)) {
    process.stderr.write(`[hermes-proxy-ensure] hermes python not found at ${HERMES_PY} (set PRISM_HERMES_PY)\n`);
    emit(args.json, { status: "no-python", py: HERMES_PY });
    process.exit(3);
  }

  // Proxy is down -> start it DETACHED so it outlives this process (R14: this is
  // an intentional long-lived service, not a leaked child -- detached+unref'd so
  // we are not its parent and the scheduled-task runner exits cleanly).
  const [cmd, cmdArgs] = buildProxyArgv(HERMES_PY, args);
  // Tee the proxy's own stdout/stderr to an append log: with stdio:"ignore" a start
  // failure (e.g. a missing python dep) is silently swallowed -- the scheduled task
  // just reports exit 3 and the lane degrades to Ollama with no diagnosable reason
  // (this is exactly how the missing-aiohttp failure hid for >48h). R12 fail-loud.
  const startLogPath = resolveStartLogPath();
  let logFd = null;
  try {
    mkdirSync(dirname(startLogPath), { recursive: true });
    logFd = openSync(startLogPath, "a");
    writeSync(logFd, `\n[${new Date().toISOString()}] hermes-proxy-ensure: starting ${cmd} ${cmdArgs.join(" ")}\n`);
  } catch { logFd = null; }
  const child = spawn(cmd, cmdArgs, {
    cwd: HERMES_AGENT_DIR, detached: true, stdio: buildStartStdio(logFd), windowsHide: true,
  });
  child.unref();
  // Safe to close the parent's fd now: libuv dup'd it into the child at spawn time, so the
  // detached proxy keeps writing to the log for its full readiness window (both opens are O_APPEND).
  // DO NOT "fix" this into a leak -- same proven idiom as daemon-supervisor.mjs + hermes-control-bridge.mjs.
  try { if (logFd != null) closeSync(logFd); } catch { /* child keeps its inherited dup */ }
  process.stderr.write(`[hermes-proxy-ensure] started detached proxy pid=${child.pid} provider=${args.provider} port=${args.port} (log: ${startLogPath})\n`);

  // Confirm readiness (cold start can take a few seconds).
  for (let i = 0; i < READY_PROBES; i++) {
    await new Promise((r) => setTimeout(r, PROBE_GAP_MS));
    if (await isProxyUp(baseUrl, args.timeout)) {
      emit(args.json, { status: "started", url: baseUrl, pid: child.pid, readyAfterMs: (i + 1) * PROBE_GAP_MS });
      process.exit(0);
    }
  }
  process.stderr.write(`[hermes-proxy-ensure] proxy did not become ready within ${READY_PROBES * PROBE_GAP_MS}ms -- see ${startLogPath} for the proxy's own startup output (the diagnosable failure reason)\n`);
  emit(args.json, { status: "start-timeout", url: baseUrl, pid: child.pid, log: startLogPath });
  process.exit(3);
}

const _invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/hermes-proxy-ensure.mjs");
if (_invokedDirectly) {
  main().catch((e) => {
    process.stderr.write(`[hermes-proxy-ensure] unexpected: ${e.message}\n`);
    process.exit(3);
  });
}
