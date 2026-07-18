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
 *   node mcp-server/scripts/ollama-docker-launcher.mjs --skip-pull --ensure-native-ollama  # fleet-launch prewarm: Docker stack + start native Ollama (:11434) if down
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
import net from "node:net";

const __filename = fileURLToPath(import.meta.url);
const MCP_ROOT = resolve(dirname(__filename), "..");
const REPO_ROOT = resolve(MCP_ROOT, "..");
const COMPOSE_FILE = resolve(REPO_ROOT, "docker-compose.yml");
const STATE_DIR = resolve(REPO_ROOT, "state", "shared");
const STATE_FILE = resolve(STATE_DIR, "DOCKER_RUNTIME_STATE.json");

const DOCKER_DESKTOP_WINDOWS = "C:/Program Files/Docker/Docker/Docker Desktop.exe";

// NIM-drop / Ollama-standardization (2026-06-09): `ollama` REMOVED from the
// default compose set. Native Ollama owns host :11434 (started at logon by the
// `PRISM Ollama Serve` scheduled task); bringing up the compose `ollama` service
// would collide on :11434 (the SERVICE_PORTS pre-filter usually skips it, but
// not starting it at all is the robust fix). Pass --services=ollama explicitly
// only if you intentionally want the containerized fallback (native must be off).
const DEFAULT_SERVICES = ["postgres", "prism-server", "prometheus", "qdrant"];
const DEFAULT_MODELS = ["nomic-embed-text", "mistral:7b", "qwen2.5-coder:3b", "codellama:7b"];

/**
 * U-INFRA-DOCKER-FIX (delta, 2026-05-18): canonical host-port map for each
 * compose service. Used to pre-filter services whose listen-port is already
 * bound by a host-native process (e.g. native PostgreSQL on :5432 blocking
 * the prism-postgres container from binding). Without this filter, ONE port
 * conflict aborts the entire compose-up, including all sibling services.
 * KEEP-IN-SYNC: when adding a service to docker-compose.yml, add it here too.
 */
export const SERVICE_PORTS = Object.freeze({
  postgres: 5432,
  prometheus: 9090,
  ollama: 11434,
  qdrant: 6333,
  // Pinned from docker-compose.yml ports "3000:3000" — host port is 3000
  // (compose host:container). Previously was 3100 here which silently
  // probed the WRONG port. Caught by per-file scrutiny Arm A P2-7.
  "prism-server": 3000,
});

/** Default TCP probe timeout when checking host-port availability (ms). */
const DEFAULT_PROBE_TIMEOUT_MS = 500;

const ARGS = parseArgs(process.argv.slice(2));
const SERVICES = (ARGS.services ?? DEFAULT_SERVICES.join(",")).split(",").map((s) => s.trim()).filter(Boolean);

// Fail-fast guard (2026-06-09): `mcp` is NOT a docker-compose service — the MCP
// server runs as a NATIVE node daemon on :3100, not in compose. A caller passing
// `--services=mcp` (a documented misuse, see mcp-connectivity-check.mjs) otherwise
// gets a raw `no such service: mcp` from compose + a stale DOCKER_RUNTIME_STATE
// status:fail. Redirect to the correct MCP recovery path instead.
if (SERVICES.includes("mcp")) {
  process.stderr.write(
    "[ollama-docker-launcher] 'mcp' is not a compose service — the MCP server is a native node daemon on :3100.\n" +
    "  To (re)start/reap it:  node H:/prism/scripts/singleton-service-guard.mjs --fix\n" +
    "  Or run directly:       TRANSPORT=http node H:/prism/mcp-server/dist/index.js\n" +
    "  (Remove 'mcp' from --services; valid services: " + DEFAULT_SERVICES.join(", ") + ", qdrant)\n",
  );
  process.exit(2);
}

const MODELS   = (ARGS.models   ?? DEFAULT_MODELS.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const SKIP_PULL = Boolean(ARGS["skip-pull"]);
const START_TIMEOUT_MS = Number(ARGS["timeout"] ?? 120_000);

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
 * Probe whether a TCP port is already in use on the local host. Returns a
 * Promise<boolean> — true if something is listening (connect succeeded);
 * false if the port is free (connect refused / timed out). Never throws.
 * Pure shell impl-detail; pure decision logic lives in
 * filterServicesByPortConflicts.
 */
export async function probeHostPort(port, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  return new Promise((resolveProbe) => {
    const sock = net.connect({ port, host: "127.0.0.1" });
    let done = false;
    const finish = (inUse) => {
      if (done) return;
      done = true;
      try { sock.destroy(); } catch { /* ignore */ }
      resolveProbe(inUse);
    };
    sock.once("connect", () => finish(true));
    sock.once("error", () => finish(false));
    setTimeout(() => finish(false), timeoutMs);
  });
}

/**
 * Pure decision: given a service list + a port map + an injected probe,
 * return { kept, skipped[] } where each skipped entry carries the conflict
 * reason. Services without an entry in portMap are passed through unchanged
 * (no port → no conflict can be detected → trust compose to surface).
 *
 * The probe is dep-injected so tests run hermetically without binding ports.
 * R12 fail-loud: a probe that throws is treated as "could not determine" →
 * service is KEPT with a `probeError` advisory rather than silently dropped.
 *
 * @param {string[]} services        services the operator wants to launch
 * @param {Record<string,number>} portMap  service-name → host port
 * @param {(port:number)=>Promise<boolean>} probeImpl  port-in-use probe
 * @returns {Promise<{kept:string[], skipped:Array<{service:string,port:number,reason:string,error?:string}>}>}
 */
export async function filterServicesByPortConflicts(services, portMap, probeImpl) {
  const kept = [];
  const skipped = [];
  for (const svc of services) {
    const port = portMap[svc];
    if (port == null) { kept.push(svc); continue; }
    let inUse;
    try {
      inUse = await probeImpl(port);
    } catch (err) {
      // R12: probe failure ≠ silent skip. Keep the service, attach the error.
      kept.push(svc);
      skipped.push({ service: svc, port, reason: "probe-error-kept-anyway", error: err && err.message });
      continue;
    }
    if (inUse) {
      skipped.push({ service: svc, port, reason: "host-port-in-use" });
    } else {
      kept.push(svc);
    }
  }
  return { kept, skipped };
}

/**
 * Pure decision for --ensure-native-ollama (FLEET-LAUNCHER-IMPROVE-MS0/U-FLI05).
 * Native Ollama owns host :11434 (the `PRISM Ollama Serve` logon scheduled task)
 * and is NOT a compose service. Probe it; start the task ONLY when it is down --
 * idempotent, so an already-serving Ollama never gets a transient duplicate
 * `ollama serve` that errors on the bound port. Both side-effects are dep-injected
 * (probe + runTask) so this is hermetically testable without a real Ollama or
 * schtasks. Returns the `report.steps.native_ollama` shape.
 *
 * @param {{probe:()=>Promise<{ok:boolean,reason?:string,models?:string[]}>, runTask:()=>{ok:boolean,stdout?:string,stderr?:string}, taskName?:string}} deps
 */
export async function ensureNativeOllama({ probe, runTask, taskName = "PRISM Ollama Serve" } = {}) {
  const p = await probe();
  if (p.ok) {
    return { status: "already-running", port: 11434, models: p.models ?? [] };
  }
  const run = runTask();
  return {
    status: run.ok ? "started-via-scheduled-task" : "start-failed",
    probeReason: p.reason ?? "unreachable",
    task: taskName,
    detail: run.ok ? (run.stdout || "ran") : (run.stderr || "schtasks failed"),
  };
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

async function probeDirectOllama() {
  // Direct (non-Docker) Ollama at the canonical port. If reachable, the
  // user already has Ollama running natively (Windows installer / brew /
  // systemd) and Docker is unnecessary for the ollama-only path.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch("http://127.0.0.1:11434/api/tags", { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    const data = await res.json().catch(() => ({}));
    const models = Array.isArray(data?.models) ? data.models.map((m) => m?.name).filter(Boolean) : [];
    return { ok: true, port: 11434, models };
  } catch (err) {
    return { ok: false, reason: err?.name === "AbortError" ? "timeout" : "unreachable", error: err?.message };
  }
}

async function main() {
  const report = {
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    services_requested: SERVICES,
    models_requested: SKIP_PULL ? [] : MODELS,
    steps: {},
  };

  // ENSURE-NATIVE-OLLAMA (FLEET-LAUNCHER-IMPROVE-MS0/U-FLI05, tango 2026-06-10):
  // the fleet launcher passes --ensure-native-ollama so the local LLM backbone is
  // warm when the chats start their Ollama offload. Native Ollama owns host :11434
  // (the `PRISM Ollama Serve` logon scheduled task) and is NOT a compose service.
  // Probe it; start the task ONLY if it's down -- idempotent, so an already-serving
  // Ollama never gets a transient duplicate `ollama serve` that errors on the bound
  // port. Independent of the Docker stack below (runs even if Docker is unavailable).
  if (ARGS["ensure-native-ollama"]) {
    report.steps.native_ollama = await ensureNativeOllama({
      probe: probeDirectOllama,
      runTask: () => sh("schtasks", ["/run", "/tn", "PRISM Ollama Serve"], { timeout: 10_000 }),
    });
    if (report.steps.native_ollama.status === "start-failed") {
      log("warn", "native Ollama ensure -- scheduled-task start failed", report.steps.native_ollama);
    }
  }

  // 0. Direct-Ollama short-circuit. If the request is ollama-only AND a
  //    native Ollama daemon already answers at :11434, skip Docker. This
  //    is the common Windows path (Ollama installer runs as a service)
  //    where Docker Desktop is not needed for offload telemetry.
  const ollamaOnly = SERVICES.length > 0 && SERVICES.every((s) => s === "ollama");
  if (ollamaOnly) {
    const probe = await probeDirectOllama();
    report.steps.ollama_direct_probe = probe;
    if (probe.ok) {
      report.status = "ok-direct";
      report.reason = "native-ollama-reachable";
      report.ollama = { mode: "direct", port: 11434, models: probe.models };
      emit(report);
      process.exit(0);
    }
  }

  // 1. Docker Desktop
  report.steps.docker_ready = await ensureDockerReady();
  if (!report.steps.docker_ready.ok) {
    report.status = "fail";
    report.reason = "docker-daemon-unreachable";
    emit(report);
    process.exit(2);
  }

  // 1.5. Pre-filter services by host-port conflict (U-INFRA-DOCKER-FIX).
  //      A host-native process holding 5432/9090/etc. would otherwise abort
  //      the entire compose-up with a binding error, killing all sibling
  //      services. Skip the conflicted service, keep going, surface advisory.
  const portFilter = await filterServicesByPortConflicts(SERVICES, SERVICE_PORTS, probeHostPort);
  report.steps.port_conflict_filter = {
    kept: portFilter.kept,
    skipped: portFilter.skipped,
  };
  const SERVICES_TO_LAUNCH = portFilter.kept;
  if (portFilter.skipped.length > 0) {
    for (const s of portFilter.skipped) {
      log("warn", "service skipped — host port already bound", { service: s.service, port: s.port, reason: s.reason });
    }
  }
  if (SERVICES_TO_LAUNCH.length === 0) {
    report.status = "fail";
    report.reason = "all-services-port-conflicted";
    emit(report);
    process.exit(4);
  }

  // 2. Compose up
  report.steps.compose_up = composeUp(SERVICES_TO_LAUNCH);
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

// Run main() ONLY when invoked as a CLI. Importing the module for tests
// must not trigger Docker launch + process.exit. Windows path normalization:
// process.argv[1] uses backslashes; import.meta.url uses forward slashes.
const SELF_URL = import.meta.url;
const ARGV1_URL = process.argv[1]
  ? "file:///" + resolve(process.argv[1]).replace(/\\/g, "/")
  : "";
const IS_ENTRYPOINT = SELF_URL === ARGV1_URL;

if (IS_ENTRYPOINT) {
  main().catch((err) => {
    const report = { status: "fail", reason: "unhandled-exception", error: err.message, stack: err.stack };
    emit(report);
    process.exit(1);
  });
}
