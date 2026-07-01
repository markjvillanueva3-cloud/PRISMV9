#!/usr/bin/env node
// U-PSN-QDRANT-REVIVE-2026-05-24 — operator-runnable Qdrant revival script
//
// Steps:
//   (a) Verify docker is present on PATH
//   (b) Look for an existing qdrant container (running or stopped)
//   (c) If exists+stopped → docker start qdrant
//   (d) If missing      → docker run -d --name qdrant ...
//   (e) Poll /healthz until 200 or 60s timeout
//
// Usage:
//   node H:/prism/scripts/qdrant-revive.mjs              # execute
//   node H:/prism/scripts/qdrant-revive.mjs --dry-run    # print plan only
//
// Exit codes: 0 = Qdrant confirmed healthy · 1 = failed / timeout · 2 = docker absent

import { spawnSync } from "node:child_process";
import { QDRANT_URL, probeHealth } from "./qdrant-health.mjs";

const QDRANT_DATA_DIR = process.env.QDRANT_DATA_DIR || "H:/prism/state/qdrant-data";
const QDRANT_IMAGE    = process.env.QDRANT_IMAGE    || "qdrant/qdrant:latest";
const QDRANT_NAME     = process.env.QDRANT_NAME     || "qdrant";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS  = 60000;

function log(step, message, extra = {}) {
  const line = { ts: new Date().toISOString(), step, message, ...extra };
  process.stdout.write(JSON.stringify(line) + "\n");
}

/**
 * Run a docker command synchronously. Returns { ok, stdout, stderr, status }.
 * @param {string[]} args
 * @param {{ dryRun?: boolean, spawnImpl?: function }} opts
 */
function docker(args, opts = {}) {
  if (opts.dryRun) {
    log("dry-run", `would run: docker ${args.join(" ")}`);
    return { ok: true, stdout: "", stderr: "", status: 0, skipped: true };
  }
  const spawnImpl = opts.spawnImpl || spawnSync;
  const r = spawnImpl("docker", args, { encoding: "utf8", timeout: 30000 });
  if (r.error) {
    return { ok: false, stdout: "", stderr: String(r.error.message || r.error), status: -1 };
  }
  return { ok: r.status === 0, stdout: r.stdout || "", stderr: r.stderr || "", status: r.status };
}

/**
 * Check docker is on PATH. Returns { present: boolean, version?: string }.
 * @param {{ dryRun?: boolean, spawnImpl?: function }} opts
 */
export function checkDockerPresent(opts = {}) {
  if (opts.dryRun) {
    log("dry-run", "would run: docker --version");
    return { present: true };
  }
  const spawnImpl = opts.spawnImpl || spawnSync;
  const r = spawnImpl("docker", ["--version"], { encoding: "utf8", timeout: 5000 });
  if (r.error || r.status !== 0) {
    return { present: false, error: r.error?.message || `exit ${r.status}` };
  }
  const version = (r.stdout || "").split("\n")[0].trim();
  return { present: true, version };
}

/**
 * Find an existing container named QDRANT_NAME.
 * Returns { found: boolean, running: boolean, id?: string }
 * @param {{ dryRun?: boolean, spawnImpl?: function }} opts
 */
export function findQdrantContainer(opts = {}) {
  const r = docker(["ps", "-a", "--filter", `name=^${QDRANT_NAME}$`, "--format", "{{.ID}}|{{.Status}}"], opts);
  if (r.skipped) {
    return { found: false, running: false };
  }
  if (!r.ok) {
    return { found: false, running: false, error: r.stderr };
  }
  const lines = r.stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { found: false, running: false };
  }
  const [id, status = ""] = lines[0].split("|");
  const running = /^up/i.test(status);
  return { found: true, running, id: id.slice(0, 12), status };
}

/**
 * Start an existing stopped container.
 * @param {{ dryRun?: boolean, spawnImpl?: function }} opts
 */
export function startQdrantContainer(opts = {}) {
  log("start", `starting existing container '${QDRANT_NAME}'`);
  const r = docker(["start", QDRANT_NAME], opts);
  if (r.skipped) {
    return { ok: true };
  }
  if (!r.ok) {
    log("start-fail", "docker start failed", { stderr: r.stderr.slice(0, 200) });
    return { ok: false, error: r.stderr };
  }
  log("start-ok", `container '${QDRANT_NAME}' started`);
  return { ok: true };
}

/**
 * Create and start a new Qdrant container.
 * @param {{ dryRun?: boolean, spawnImpl?: function }} opts
 */
export function createQdrantContainer(opts = {}) {
  const runArgs = [
    "run", "-d",
    "--name", QDRANT_NAME,
    "-p", "6333:6333",
    "-p", "6334:6334",
    "-v", `${QDRANT_DATA_DIR}:/qdrant/storage`,
    "--restart", "unless-stopped",
    QDRANT_IMAGE,
  ];
  log("create", `creating container '${QDRANT_NAME}'`, { image: QDRANT_IMAGE, dataDir: QDRANT_DATA_DIR });
  const r = docker(runArgs, opts);
  if (r.skipped) {
    return { ok: true };
  }
  if (!r.ok) {
    log("create-fail", "docker run failed", { stderr: r.stderr.slice(0, 200) });
    return { ok: false, error: r.stderr };
  }
  log("create-ok", `container '${QDRANT_NAME}' created`, { id: r.stdout.trim().slice(0, 12) });
  return { ok: true };
}

/**
 * Poll Qdrant /healthz until reachable or timeout.
 * @param {{ pollIntervalMs?: number, pollTimeoutMs?: number, dryRun?: boolean, spawnImpl?: function }} opts
 * @returns {Promise<{ healthy: boolean, elapsedMs: number }>}
 */
export async function pollUntilHealthy(opts = {}) {
  const intervalMs = opts.pollIntervalMs ?? POLL_INTERVAL_MS;
  const timeoutMs  = opts.pollTimeoutMs  ?? POLL_TIMEOUT_MS;
  const spawnImpl  = opts.spawnImpl || spawnSync;

  if (opts.dryRun) {
    log("dry-run", `would poll ${QDRANT_URL}/healthz every ${intervalMs}ms up to ${timeoutMs}ms`);
    return { healthy: true, elapsedMs: 0 };
  }

  const start = Date.now();
  log("poll", `polling ${QDRANT_URL}/healthz`, { timeoutMs });

  while (Date.now() - start < timeoutMs) {
    const h = probeHealth(spawnImpl);
    if (h.reachable) {
      const elapsedMs = Date.now() - start;
      log("healthy", "Qdrant is reachable", { elapsedMs, version: h.version });
      return { healthy: true, elapsedMs };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const elapsedMs = Date.now() - start;
  log("poll-timeout", "Qdrant did not become healthy in time", { elapsedMs, timeoutMs });
  return { healthy: false, elapsedMs };
}

/**
 * Full revival pipeline.
 * @param {{ dryRun?: boolean, spawnImpl?: function, pollIntervalMs?: number, pollTimeoutMs?: number }} opts
 * @returns {Promise<{ ok: boolean, action: string, healthy: boolean }>}
 */
export async function runRevive(opts = {}) {
  log("revive-start", "qdrant-revive: starting", { dryRun: opts.dryRun ?? false, url: QDRANT_URL });

  // (a) docker present?
  const dockerCheck = checkDockerPresent(opts);
  if (!dockerCheck.present) {
    log("no-docker", "docker not found on PATH", { error: dockerCheck.error });
    return { ok: false, action: "no-docker", healthy: false };
  }
  log("docker-ok", "docker found", { version: dockerCheck.version });

  // Already healthy?
  if (!opts.dryRun) {
    const already = probeHealth(opts.spawnImpl);
    if (already.reachable) {
      log("already-healthy", "Qdrant already running — nothing to do", { version: already.version });
      return { ok: true, action: "already-running", healthy: true };
    }
  }

  // (b) find container
  const found = findQdrantContainer(opts);
  log("container-check", "container state", { found: found.found, running: found.running, status: found.status });

  let actionResult;
  let action;

  if (found.running) {
    // (c) already running but healthz not responding — just wait
    log("already-running-unhealthy", "container running but Qdrant not yet healthy — polling");
    action = "wait";
    actionResult = { ok: true };
  } else if (found.found) {
    // (c) stopped container — start it
    action = "start";
    actionResult = startQdrantContainer(opts);
  } else {
    // (d) no container — create one
    action = "create";
    actionResult = createQdrantContainer(opts);
  }

  if (!actionResult.ok) {
    return { ok: false, action, healthy: false, error: actionResult.error };
  }

  // (e) poll
  const { healthy, elapsedMs } = await pollUntilHealthy(opts);
  if (!healthy) {
    log("revive-fail", "Qdrant did not come up within timeout", { action });
    return { ok: false, action, healthy: false };
  }

  log("revive-ok", "Qdrant is healthy", { action, elapsedMs });
  return { ok: true, action, healthy: true };
}

// ── CLI entry point ────────────────────────────────────────────────────────────

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv1 = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv1);
  } catch { return false; }
})();

if (invokedDirect) {
  const dryRun = process.argv.includes("--dry-run");
  runRevive({ dryRun }).then((result) => {
    process.exit(result.ok ? 0 : 1);
  }).catch((e) => {
    process.stderr.write(`[qdrant-revive] FATAL: ${e?.stack || e?.message || e}\n`);
    process.exit(2);
  });
}
