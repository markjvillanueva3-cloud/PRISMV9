#!/usr/bin/env node
/**
 * ollama-docker-launcher.mjs — Idempotent Docker/Ollama activator
 *
 * Brings up the PRISM local compute stack:
 *   1. Launches Docker Desktop if stopped (Windows-aware)
 *   2. Waits for Docker daemon ready (timeout-guarded)
 *   3. Brings up requested compose services (default: postgres, prism-server,
 *      prometheus, ollama, qdrant) via docker-compose.yml
 *   4. Pulls required Ollama models if missing
 *   5. Health-checks each service
 *   6. Emits a JSON status report on stdout
 *
 * Usage:
 *   node mcp-server/scripts/ollama-docker-launcher.mjs                    # full stack
 *   node mcp-server/scripts/ollama-docker-launcher.mjs --services=ollama  # just ollama
 *   node mcp-server/scripts/ollama-docker-launcher.mjs --skip-pull        # no model pulls
 *   node mcp-server/scripts/ollama-docker-launcher.mjs --models=mistral:7b,nomic-embed-text
 *
 * Safety:
 *   - Non-destructive (no `down`, no `rm`, no volume wipe).
 *   - Exits non-zero only on hard failure (compose syntax error, Docker
 *     Desktop unreachable after timeout). All other errors are reported in
 *     the JSON output so callers can decide remediation.
 */

import { spawn, execFileSync } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const MCP_ROOT = resolve(dirname(__filename), "..");
const REPO_ROOT = resolve(MCP_ROOT, "..");
const COMPOSE_FILE = resolve(REPO_ROOT, "docker-compose.yml");
const STATE_DIR = resolve(REPO_ROOT, "state", "shared");
const STATE_FILE = resolve(STATE_DIR, "DOCKER_RUNTIME_STATE.json");

const DOCKER_DESKTOP_WINDOWS = "C:/Program Files/Docker/Docker/Docker Desktop.exe";

const DEFAULT_SERVICES = ["postgres", "prism-server", "prometheus", "ollama", "qdrant"];
const DEFAULT_MODELS = ["nomic-embed-text", "mistral:7b", "qwen2.5-coder:3b", "codellama:7b"];

const ARGS = parseArgs(process.argv.slice(2));
const SERVICES = (ARGS.services ?? DEFAULT_SERVICES.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const MODELS   = (ARGS.models   ?? DEFAULT_MODELS.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const SKIP_PULL = Boolean(ARGS["skip-pull"]);
const START_TIMEOUT_MS = Number(ARGS["timeout"] ?? 120_000);

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (arg.startsWith("--")) {
      const [k, v] = arg.slice(2).split("=");
      out[k] = v ?? true;
    }
  }
  return out;
}

function sh(cmd, args, opts = {}) {
  try {
    const stdout = execFileSync(cmd, args, { encoding: "utf8", timeout: opts.timeout ?? 15_000, stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, stdout: stdout.trim(), stderr: "" };
  } catch (err) {
    return { ok: false, stdout: (err.stdout ?? "").toString().trim(), stderr: (err.stderr ?? err.message).toString().trim(), code: err.status };
  }
}

function log(level, msg, extra) {
  const entry = { ts: new Date().toISOString(), level, msg, ...(extra ?? {}) };
  process.stderr.write(JSON.stringify(entry) + "\n");
}

async function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Docker Desktop lifecycle ────────────────────────────────────────────

function dockerReady() {
  const r = sh("docker", ["version", "--format", "{{.Server.Version}}"], { timeout: 3000 });
  return r.ok && r.stdout.length > 0;
}

function startDockerDesktop() {
  if (process.platform !== "win32") {
    log("info", "Non-Windows platform — expecting dockerd managed by OS");
    return { started: false, reason: "not-windows" };
  }
  if (!existsSync(DOCKER_DESKTOP_WINDOWS)) {
    return { started: false, reason: "docker-desktop-not-installed", path: DOCKER_DESKTOP_WINDOWS };
  }
  log("info", "Launching Docker Desktop", { path: DOCKER_DESKTOP_WINDOWS });
  try {
    const child = spawn("cmd", ["/c", "start", "", DOCKER_DESKTOP_WINDOWS], { detached: true, stdio: "ignore" });
    child.unref();
    return { started: true };
  } catch (err) {
    return { started: false, reason: "spawn-failed", error: err.message };
  }
}

async function ensureDockerReady() {
  if (dockerReady()) return { ok: true, alreadyRunning: true };
  const start = startDockerDesktop();
  if (!start.started && start.reason !== "not-windows") {
    return { ok: false, reason: start.reason, detail: start };
  }
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (dockerReady()) return { ok: true, alreadyRunning: false, waitedMs: START_TIMEOUT_MS - (deadline - Date.now()) };
    await wait(3000);
  }
  return { ok: false, reason: "docker-ready-timeout", timeoutMs: START_TIMEOUT_MS };
}

// ── Compose services ────────────────────────────────────────────────────

function composeUp(services) {
  if (!existsSync(COMPOSE_FILE)) {
    return { ok: false, reason: "compose-file-missing", path: COMPOSE_FILE };
  }
  const args = ["compose", "-f", COMPOSE_FILE, "up", "-d", ...services];
  log("info", "docker compose up", { services });
  const r = sh("docker", args, { timeout: 180_000 });
  return { ok: r.ok, stdout: r.stdout, stderr: r.stderr };
}

function composePs() {
  const r = sh("docker", ["compose", "-f", COMPOSE_FILE, "ps", "--format", "json"], { timeout: 10_000 });
  if (!r.ok) return { ok: false, containers: [], raw: r.stderr };
  const lines = r.stdout.split("\n").filter(Boolean);
  const parsed = [];
  for (const line of lines) {
    try { parsed.push(JSON.parse(line)); } catch { /* some docker versions wrap array */ }
  }
  if (parsed.length === 0 && r.stdout.startsWith("[")) {
    try { return { ok: true, containers: JSON.parse(r.stdout) }; } catch { /* fall through */ }
  }
  return { ok: true, containers: parsed };
}

// ── Ollama model management ─────────────────────────────────────────────

function ollamaListModels() {
  const r = sh("docker", ["exec", "prism-ollama", "ollama", "list"], { timeout: 10_000 });
  if (!r.ok) return { ok: false, models: [], error: r.stderr };
  const lines = r.stdout.split("\n").slice(1);
  const names = lines.map((l) => (l.trim().split(/\s+/)[0] ?? "")).filter(Boolean);
  return { ok: true, models: names };
}

function ollamaPullModel(model) {
  log("info", "ollama pull", { model });
  const r = sh("docker", ["exec", "prism-ollama", "ollama", "pull", model], { timeout: 600_000 });
  return { model, ok: r.ok, error: r.ok ? null : (r.stderr || "pull failed") };
}

async function ensureModels(wanted) {
  const listing = ollamaListModels();
  if (!listing.ok) {
    return { ok: false, reason: "ollama-list-failed", detail: listing.error, pulled: [], skipped: [] };
  }
  const haveSet = new Set(listing.models);
  const results = { pulled: [], skipped: [], failed: [] };
  for (const m of wanted) {
    const presentKey = [...haveSet].find((h) => h === m || h.startsWith(`${m}:`) || h.startsWith(`${m.split(":")[0]}:`));
    if (presentKey) { results.skipped.push({ model: m, matchedAs: presentKey }); continue; }
    const r = ollamaPullModel(m);
    if (r.ok) results.pulled.push(m); else results.failed.push({ model: m, error: r.error });
  }
  return { ok: results.failed.length === 0, ...results };
}

// ── Health summary ──────────────────────────────────────────────────────

function summarizeHealth(ps, ollamaStatus) {
  const rows = [];
  for (const svc of SERVICES) {
    const container = ps.containers.find((c) => (c.Service === svc) || (c.Name || "").includes(svc));
    rows.push({
      service: svc,
      state: container?.State ?? "missing",
      health: container?.Health ?? "n/a",
      ports: container?.Publishers?.map((p) => `${p.PublishedPort}->${p.TargetPort}`).join(", ") ?? "",
    });
  }
  return { services: rows, ollama: ollamaStatus };
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const report = {
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    services_requested: SERVICES,
    models_requested: SKIP_PULL ? [] : MODELS,
    steps: {},
  };

  // 1. Docker Desktop
  report.steps.docker_ready = await ensureDockerReady();
  if (!report.steps.docker_ready.ok) {
    report.status = "fail";
    report.reason = "docker-daemon-unreachable";
    emit(report);
    process.exit(2);
  }

  // 2. Compose up
  report.steps.compose_up = composeUp(SERVICES);
  if (!report.steps.compose_up.ok) {
    report.status = "fail";
    report.reason = "compose-up-failed";
    emit(report);
    process.exit(3);
  }

  // 3. Wait for containers to settle
  await wait(4000);
  report.steps.compose_ps = composePs();

  // 4. Ollama models
  if (SERVICES.includes("ollama") && !SKIP_PULL) {
    report.steps.ollama = await ensureModels(MODELS);
  } else {
    report.steps.ollama = { skipped: true };
  }

  // 5. Health
  report.steps.health = summarizeHealth(report.steps.compose_ps, report.steps.ollama);
  report.finishedAt = new Date().toISOString();
  report.status = "ok";
  emit(report);
}

function emit(report) {
  try { mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(STATE_FILE, JSON.stringify(report, null, 2), "utf8"); } catch { /* ignore */ }
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

main().catch((err) => {
  const report = { status: "fail", reason: "unhandled-exception", error: err.message, stack: err.stack };
  emit(report);
  process.exit(1);
});
