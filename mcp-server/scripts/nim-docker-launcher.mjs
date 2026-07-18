#!/usr/bin/env node
/**
 * nim-docker-launcher.mjs — Idempotent NVIDIA NIM container activator
 *
 * The sibling of ollama-docker-launcher.mjs for the NIM backend. PRISM
 * already ships a complete NIM *client* (.claude/hooks/lib/nim-hook-bridge.mjs)
 * wired into the 3-backend router (local-llm-bridge.mjs: NIM→vLLM→Ollama).
 * It "never worked" for exactly one reason: the NIM *server* was never
 * provisioned, so isNimAvailable() always returned false and the router
 * silently fell through to Ollama. This launcher closes that gap.
 *
 * Pipeline:
 *   1. Short-circuit if NIM already answers at NIM_URL (idempotent).
 *   2. HARD precondition gate (R12 — fail loud, never fake success):
 *        - Docker daemon reachable?         else status=blocked-docker
 *        - NGC_API_KEY present?             else status=blocked-ngc-key
 *      Both are operator-only (a hook cannot create an NVIDIA NGC key and
 *      should not silently start Docker for a 10-30GB pull). The exact
 *      remediation command is surfaced in the JSON, never hidden.
 *   3. `docker login nvcr.io` with the NGC key.
 *   4. Idempotent `docker run -d --gpus all` of the NIM image (skips if a
 *      container of the same name is already Up).
 *   5. Poll NIM_URL/models until ready (cold start can take minutes — the
 *      first run pulls the model weights inside the container).
 *   6. Emit JSON status + persist NIM_RUNTIME_STATE.json.
 *
 * Usage:
 *   node mcp-server/scripts/nim-docker-launcher.mjs
 *   node mcp-server/scripts/nim-docker-launcher.mjs --model=meta/llama-3.1-8b-instruct
 *   node mcp-server/scripts/nim-docker-launcher.mjs --dry-run   # print plan, do nothing
 *
 * Safety: non-destructive (no down/rm/volume wipe). Exits non-zero only on
 * a hard blocker; all soft failures are reported in the JSON for the caller
 * to remediate. Mirrors ollama-docker-launcher.mjs conventions exactly.
 */

import { spawn, execFileSync } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const MCP_ROOT = resolve(dirname(__filename), "..");
const REPO_ROOT = resolve(MCP_ROOT, "..");
const STATE_DIR = resolve(REPO_ROOT, "state", "shared");
const STATE_FILE = resolve(STATE_DIR, "NIM_RUNTIME_STATE.json");

const DOCKER_DESKTOP_WINDOWS = "C:/Program Files/Docker/Docker/Docker Desktop.exe";

// The bridge (nim-hook-bridge.mjs) defaults to model meta/llama-3.1-8b-instruct
// and NIM_URL http://127.0.0.1:8000/v1. Keep these in lockstep with it.
const DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";
const DEFAULT_PORT = 8000;
const DEFAULT_CONTAINER = "prism-nim";
const NGC_REGISTRY = "nvcr.io";

// ── Pure core (exported for hermetic tests) ─────────────────────────────────

export function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (arg.startsWith("--")) {
      const [k, v] = arg.slice(2).split("=");
      out[k] = v ?? true;
    }
  }
  return out;
}

/**
 * Map a NIM model id (vendor/name) to its nvcr.io image reference. NIM
 * publishes one image per model under nvcr.io/nim/<vendor>/<name>:latest.
 * Pure.
 */
export function nimModelToImage(model, tag = "latest") {
  const m = String(model || "").trim().replace(/^\/+|\/+$/g, "");
  if (!m || !m.includes("/")) return null;
  return `${NGC_REGISTRY}/nim/${m}:${tag}`;
}

/**
 * Decide the launcher's precondition verdict. Pure — all environment facts
 * are passed in so this is fully testable.
 *
 * @param {{nimUp:boolean, dockerUp:boolean, ngcKeyPresent:boolean}} f
 * @returns {{action:'noop-already-up'|'blocked-docker'|'blocked-ngc-key'|'proceed', reason:string}}
 */
export function decidePrecondition({ nimUp, dockerUp, ngcKeyPresent }) {
  if (nimUp) return { action: "noop-already-up", reason: "NIM already answering at NIM_URL — nothing to do" };
  if (!dockerUp) {
    return {
      action: "blocked-docker",
      reason: "Docker daemon unreachable. NIM is a container — start Docker Desktop, then re-run. (operator-only: a hook must not trigger a 10-30GB image pull unattended)",
    };
  }
  if (!ngcKeyPresent) {
    return {
      action: "blocked-ngc-key",
      reason: "NGC_API_KEY not set. Get a free key at build.nvidia.com (NGC → Setup → Generate API Key), then: setx NGC_API_KEY <key>  (new shell) and re-run.",
    };
  }
  return { action: "proceed", reason: "docker up + NGC key present + NIM down — provision" };
}

/**
 * Build the idempotent `docker run` argv for the NIM container. Pure.
 * --gpus all is mandatory (NIM is GPU-only). The model cache is volume-
 * mounted so a container restart never re-pulls weights.
 */
export function buildNimRunArgs({
  containerName = DEFAULT_CONTAINER,
  image,
  port = DEFAULT_PORT,
  cacheDir = "/opt/nim/.cache",
  hostCacheVol = "prism-nim-cache",
  shmSize = "16GB",
} = {}) {
  if (!image) return null;
  return [
    "run", "-d",
    "--name", containerName,
    "--restart", "unless-stopped",
    "--gpus", "all",
    "--shm-size", shmSize,
    "-e", "NGC_API_KEY",
    "-v", `${hostCacheVol}:${cacheDir}`,
    "-p", `${port}:8000`,
    image,
  ];
}

// ── Imperative shell ────────────────────────────────────────────────────────

const ARGS = parseArgs(process.argv.slice(2));
const MODEL = ARGS.model || process.env.NIM_HOOK_MODEL || DEFAULT_MODEL;
const PORT = Number(ARGS.port || process.env.NIM_PORT || DEFAULT_PORT);
const NIM_URL = (process.env.NIM_URL || `http://127.0.0.1:${PORT}/v1`).replace(/\/$/, "");
const DRY_RUN = Boolean(ARGS["dry-run"]);
const READY_TIMEOUT_MS = Number(ARGS["timeout"] ?? 600_000); // cold pull can be long

function sh(cmd, args, opts = {}) {
  try {
    const stdout = execFileSync(cmd, args, {
      encoding: "utf8", timeout: opts.timeout ?? 15_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, stdout: stdout.trim(), stderr: "" };
  } catch (err) {
    return { ok: false, stdout: (err.stdout ?? "").toString().trim(), stderr: (err.stderr ?? err.message).toString().trim(), code: err.status };
  }
}

async function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function dockerReady() {
  const r = sh("docker", ["version", "--format", "{{.Server.Version}}"], { timeout: 3000 });
  return r.ok && r.stdout.length > 0;
}

async function nimReady() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${NIM_URL}/models`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch { return false; }
}

function containerRunning(name) {
  const r = sh("docker", ["ps", "--filter", `name=^/${name}$`, "--format", "{{.Names}}"], { timeout: 8000 });
  return r.ok && r.stdout.split("\n").includes(name);
}

function emit(report, code = 0) {
  try { mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(STATE_FILE, JSON.stringify(report, null, 2), "utf8"); } catch { /* ignore */ }
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  process.exit(code);
}

async function main() {
  const report = {
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    model: MODEL,
    nimUrl: NIM_URL,
    image: nimModelToImage(MODEL),
    steps: {},
  };

  const nimUp = await nimReady();
  const dockerUp = nimUp ? true : dockerReady(); // skip docker probe if NIM already up
  const ngcKeyPresent = Boolean(process.env.NGC_API_KEY && process.env.NGC_API_KEY.trim());
  const verdict = decidePrecondition({ nimUp, dockerUp, ngcKeyPresent });
  report.steps.precondition = { ...verdict, nimUp, dockerUp, ngcKeyPresent };

  if (verdict.action === "noop-already-up") {
    report.status = "ok-already-up";
    emit(report, 0);
  }
  if (verdict.action === "blocked-docker") {
    report.status = "blocked";
    report.reason = verdict.reason;
    report.operatorAction = `! "${DOCKER_DESKTOP_WINDOWS}"   (then re-run this launcher)`;
    emit(report, 2);
  }
  if (verdict.action === "blocked-ngc-key") {
    report.status = "blocked";
    report.reason = verdict.reason;
    report.operatorAction = "Obtain NGC key at https://build.nvidia.com → setx NGC_API_KEY <key> → new shell → re-run";
    emit(report, 3);
  }

  const image = nimModelToImage(MODEL);
  if (!image) {
    report.status = "fail";
    report.reason = `model id '${MODEL}' is not vendor/name form — cannot derive nvcr.io image`;
    emit(report, 4);
  }
  const runArgs = buildNimRunArgs({ image, port: PORT });

  if (DRY_RUN) {
    report.status = "dry-run";
    report.plan = {
      login: `docker login ${NGC_REGISTRY} -u $oauthtoken -p $NGC_API_KEY`,
      run: `docker ${runArgs.join(" ")}`,
      readyProbe: `${NIM_URL}/models`,
    };
    emit(report, 0);
  }

  // Idempotent: container already up → just wait for readiness.
  if (!containerRunning(DEFAULT_CONTAINER)) {
    const login = sh("docker", ["login", NGC_REGISTRY, "-u", "$oauthtoken", "-p", process.env.NGC_API_KEY], { timeout: 30_000 });
    report.steps.ngc_login = { ok: login.ok, stderr: login.ok ? "" : login.stderr.slice(0, 200) };
    if (!login.ok) {
      report.status = "fail";
      report.reason = "docker login nvcr.io failed — NGC_API_KEY likely invalid/expired";
      emit(report, 5);
    }
    const run = sh("docker", runArgs, { timeout: 120_000 });
    report.steps.docker_run = { ok: run.ok, stdout: run.stdout.slice(0, 120), stderr: run.ok ? "" : run.stderr.slice(0, 300) };
    if (!run.ok) {
      report.status = "fail";
      report.reason = "docker run failed (image pull / GPU / port). See steps.docker_run.stderr";
      emit(report, 6);
    }
  } else {
    report.steps.docker_run = { ok: true, alreadyRunning: true };
  }

  // Poll readiness — first cold start pulls weights inside the container.
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let ready = false;
  while (Date.now() < deadline) {
    if (await nimReady()) { ready = true; break; }
    await wait(5000);
  }
  report.steps.ready = { ready, waitedMs: READY_TIMEOUT_MS - (deadline - Date.now()) };
  report.finishedAt = new Date().toISOString();
  report.status = ready ? "ok" : "started-not-ready";
  if (!ready) report.reason = "container started but NIM_URL/models not answering before timeout — cold weight-pull may still be in progress; re-run to re-poll";
  emit(report, ready ? 0 : 7);
}

// Run only as a script — never on import (tests import the pure core).
const invokedAsScript = (() => {
  try { return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]); }
  catch { return false; }
})();
if (invokedAsScript) {
  main().catch((err) => {
    const report = { status: "fail", reason: "unhandled-exception", error: err?.message, stack: err?.stack };
    try { mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(STATE_FILE, JSON.stringify(report, null, 2), "utf8"); } catch { /* ignore */ }
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    process.exit(1);
  });
}
