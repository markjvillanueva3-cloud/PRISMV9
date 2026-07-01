#!/usr/bin/env node
/**
 * hermes-control-bridge.mjs -- PRISM programmatic control of the Nous Hermes
 * desktop app's backend, WITHOUT the (broken, restart-looping) Electron renderer.
 * (HERMES-CONTROL-MS0/U-BRIDGE-CORE, slot:zulu 2026-06-18.)
 *
 * The Hermes desktop is an Electron UI + a FastAPI Python backend
 * (hermes_cli/web_server.py). The renderer is stuck in a /api/ws -> bootstrap:reset
 * restart loop (vendored UI bug), but the BACKEND boots fine and exposes ~40 REST
 * routes -- "every button and function". This bridge drives that REST surface
 * directly: it launches a HEADLESS backend on a PINNED port (default 9119), reuses
 * one already up, and exposes get/set for config (real-time settings), model, env,
 * cron, mcp servers, sessions, status. It NEVER touches /api/ws or the
 * hermes:bootstrap:reset IPC (the loop triggers), so the broken GUI is irrelevant.
 *
 * Spec + route map: state/shared/specs/HERMES-CONTROL-BRIDGE-SPEC-2026-06-18.md
 * Orthogonal to ask-hermes.mjs (the :8645 INFERENCE proxy) -- this is APP CONTROL (:9119).
 *
 * CONTENTION (R16 gap): the bridge's backend shares HERMES_HOME (config.yaml / auth.json /
 * kanban.db) with the desktop's own backend. Do NOT run the broken desktop AND this bridge
 * at once (SQLite/auth write-contention). The desktop is currently a restart-loop, so the
 * bridge's instance is the de-facto backend. ensureBackend reuses any dashboard already on
 * the port (incl. the desktop's, if you point the port at it).
 *
 * CLI:
 *   node scripts/hermes-control-bridge.mjs status
 *   node scripts/hermes-control-bridge.mjs get-config
 *   node scripts/hermes-control-bridge.mjs set-config '{"agent":{"max_turns":201}}'  # read-merge-write PUT /api/config
 *   node scripts/hermes-control-bridge.mjs models | set-model <id> | cron | mcp | env
 *   node scripts/hermes-control-bridge.mjs call GET /api/status                  # raw passthrough
 *   node scripts/hermes-control-bridge.mjs stop                                  # stop the bridge-spawned backend
 * Flags: --json (machine output) · --port N · --timeout MS · --no-spawn (fail if not already up)
 *
 * Env: PRISM_HERMES_HOME, PRISM_HERMES_DASHBOARD_PORT (default 9119),
 *      HERMES_DASHBOARD_SESSION_TOKEN (else generated + persisted to the sidecar).
 */

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, openSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

const HERMES_HOME = (process.env.PRISM_HERMES_HOME || "C:/Users/wompu/AppData/Local/hermes").replace(/\\/g, "/");
const VENV_PY = `${HERMES_HOME}/hermes-agent/venv/Scripts/python.exe`;
const DEFAULT_PORT = parseInt(process.env.PRISM_HERMES_DASHBOARD_PORT || "9119", 10);
const HOST = "127.0.0.1";
// Sidecar path is overridable via PRISM_HERMES_BRIDGE_SIDECAR so tests never clobber the LIVE
// production sidecar (it holds the adopted session token in plaintext). Read dynamically so a
// test can point it at a tmpdir AFTER import. (gitignored -- see .gitignore.)
function sidecarPath() { return process.env.PRISM_HERMES_BRIDGE_SIDECAR || "H:/prism/state/shared/.hermes-control-bridge.json"; } // {port, token, pid, adopted, at}
const LOG = "H:/prism/state/shared/.hermes-control-bridge.log";
// Paths that need NO session token. ONLY /api/status is confirmed tokenless (the
// probe reaches it with token=""). /api/model/options was assumed public per the
// spec but the LIVE server returns 401 without a token (U-BRIDGE-AUTH 2026-06-18),
// so it is NOT public -- sending the token is harmless on a genuinely-public route
// but required here. Keep this set MINIMAL: when unsure, send the token.
const PUBLIC_PATHS = new Set(["/api/status"]);

const log = (s) => { try { appendFileSync(LOG, `[${nowIso()}] ${s}\n`); } catch { /* best-effort */ } };
// new Date() is fine in a standalone script (NOT a workflow); guard anyway for portability.
function nowIso() { try { return new Date().toISOString(); } catch { return "?"; } }

function genToken() { return randomBytes(32).toString("base64url"); }

function readSidecar() {
  try { return JSON.parse(readFileSync(sidecarPath(), "utf8")); } catch { return null; }
}
function writeSidecar(obj) {
  try { mkdirSync(dirname(sidecarPath()), { recursive: true }); writeFileSync(sidecarPath(), JSON.stringify(obj, null, 2)); } catch { /* best-effort */ }
}

/**
 * One HTTP call to the dashboard. Resolves {status, json, text}; never rejects on a
 * non-2xx (caller decides) but rejects on transport error / timeout (so ensureBackend
 * can distinguish "not up yet" from "up but errored").
 */
export function httpCall(method, path, { body = null, port = DEFAULT_PORT, token = "", timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : Buffer.from(typeof body === "string" ? body : JSON.stringify(body), "utf8");
    const headers = { Accept: "application/json" };
    if (payload) { headers["Content-Type"] = "application/json"; headers["Content-Length"] = payload.length; }
    // Public paths need no token; everything else carries it both ways the server accepts.
    if (token && !PUBLIC_PATHS.has(path)) { headers["X-Hermes-Session-Token"] = token; headers.Authorization = `Bearer ${token}`; }
    const req = httpRequest({ host: HOST, port, method, path, headers, timeout: timeoutMs }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (d) => { data += d; });
      res.on("end", () => {
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch { /* non-JSON (e.g. streaming/log routes) */ }
        resolve({ status: res.statusCode, json, text: data });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(new Error(`ETIMEDOUT after ${timeoutMs}ms`)); });
    if (payload) req.write(payload);
    req.end();
  });
}

/** GET /api/status -> {ok, status, body}. Never throws (a down backend = {ok:false}). */
export async function probe(port = DEFAULT_PORT, token = "", timeoutMs = 3000) {
  try {
    const r = await httpCall("GET", "/api/status", { port, token, timeoutMs });
    return { ok: r.status >= 200 && r.status < 300, status: r.status, body: r.json ?? r.text };
  } catch (e) { return { ok: false, error: (e && e.message) || String(e) }; }
}

/**
 * True iff `token` authorizes a PROTECTED route on `port` (GET /api/config -> 2xx). The public
 * /api/status CANNOT distinguish a valid token from a dead one, so token VALIDITY (for both reuse
 * and adoption) must be proven here -- never via probe(). Never throws (a failure -> false).
 */
async function probeAuthorized(port = DEFAULT_PORT, token = "", timeoutMs = 3000) {
  try { const r = await httpCall("GET", "/api/config", { port, token, timeoutMs }); return r.status >= 200 && r.status < 300; }
  catch { return false; }
}

/**
 * Extract the dashboard session value a running backend injects into its index HTML as
 * `window.__HERMES_SESSION_TOKEN__ = "<value>"`. This is Hermes' OWN canonical mechanism
 * (apps/desktop/electron/dashboard-token.cjs::extractInjectedDashboardToken) -- the Electron
 * renderer authenticates by reading it the same way -- so it is the supported route to recover
 * the value of a backend the bridge did NOT spawn. Pure; returns the string or null. Handles a
 * JSON-escaped value.
 */
export function extractInjectedDashboardToken(html) {
  const match = /window\.__HERMES_SESSION_TOKEN__\s*=\s*("(?:\\.|[^"\\])*")/.exec(String(html || ""));
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

/**
 * Recover the session value a dashboard already on `port` SERVES to its renderer
 * (GET / -> window.__HERMES_SESSION_TOKEN__). Returns the string or null (none found /
 * index unreachable). The index is public -- no value is sent on the request.
 */
export async function resolveServedToken(port = DEFAULT_PORT, timeoutMs = 3000) {
  try {
    const r = await httpCall("GET", "/", { port, timeoutMs });
    return extractInjectedDashboardToken(r.text);
  } catch { return null; }
}

/**
 * Ensure a dashboard backend is reachable on `port`. Reuses one already up (idempotent);
 * else spawns a HEADLESS backend (no Electron) with a self-supplied session token, waits
 * for the ready signal OR a successful probe, then unrefs so it outlives this process.
 * Returns {port, token, reused, pid}. Throws (fail-loud) on missing venv / spawn error /
 * ready timeout -- never returns a half-up backend.
 */
export async function ensureBackend({ port = DEFAULT_PORT, token = null, spawnTimeoutMs = 60000, allowSpawn = true } = {}) {
  const sc = readSidecar();
  // 1) Reuse an already-running backend on this port (try the sidecar token first, then tokenless probe).
  for (const t of [token, sc && sc.port === port ? sc.token : null].filter(Boolean)) {
    // Validity is proven against a PROTECTED route, NOT the public /api/status: a stale same-port
    // sidecar token would pass a tokenless liveness probe and then 401 on the first real call. A
    // dead token here fails -> we fall through to served-token recovery+adoption below.
    if (await probeAuthorized(port, t)) {
      // Preserve `adopted` across reuse: once a backend is adopted (foreign, not bridge-spawned),
      // every subsequent reuse must keep adopted:true so `stop` never kills the operator's backend.
      const adopted = !!(sc && sc.adopted);
      writeSidecar({ port, token: t, pid: sc && sc.pid, adopted, at: nowIso() });
      return { port, token: t, reused: true, adopted, pid: sc && sc.pid };
    }
  }
  // A tokenless probe tells us SOMETHING is up (public /api/status) -- but protected routes need
  // the real token. Rather than give up, recover the token the running dashboard SERVES to its own
  // renderer (window.__HERMES_SESSION_TOKEN__ in the index html -- Hermes' own canonical mechanism,
  // dashboard-token.cjs::resolveServedDashboardToken). This lets the bridge drive an ALREADY-RUNNING
  // backend (the operator's live desktop/launched instance -- the realistic case). We ADOPT a served
  // token ONLY after it authorizes a PROTECTED route (GET /api/config 2xx): a squatter that injects a
  // fake token but 401s the protected surface is NOT adopted (fail-loud, R12). PRISM_HERMES_NO_ADOPT_TOKEN=1
  // opts out (refuse + require an explicit token). pid:null + adopted:true so `stop` never kills it.
  const bare = await probe(port);
  if (bare.ok && !token) {
    // Reached only because the reuse loop found NO working token (incl. a stale same-port sidecar,
    // whose dead token now fails the protected check above). `!token` gates this to the no-explicit-
    // token case (an explicit token that failed should fail-loud, not silently adopt a different one).
    // Recover the value the running dashboard SERVES its renderer (window.__HERMES_SESSION_TOKEN__ --
    // Hermes' own mechanism, dashboard-token.cjs) and ADOPT it ONLY after it authorizes a PROTECTED
    // route. NOTE: canonical dashboard-token.cjs::isForeignBackendToken REFUSES a foreign token; the
    // bridge intentionally adopts-foreign-after-protected-proof (it EXISTS to drive a backend it did
    // not spawn) -- a stricter superset (positive 2xx proof), not the same function. A squatter that
    // injects a fake value but 401s the protected surface is refused (fail-loud, R12);
    // PRISM_HERMES_NO_ADOPT_TOKEN=1 opts out.
    if (process.env.PRISM_HERMES_NO_ADOPT_TOKEN !== "1") {
      const served = await resolveServedToken(port);
      if (served && await probeAuthorized(port, served, 5000)) {
        writeSidecar({ port, token: served, pid: null, adopted: true, at: nowIso() });
        log(`adopted served token of the dashboard already on :${port} (len=${served.length}) -- bridge did not spawn it`);
        return { port, token: served, reused: true, adopted: true, pid: null };
      }
    }
    throw new Error(`a dashboard is already on :${port} but its session token could not be recovered+verified (no window.__HERMES_SESSION_TOKEN__ in its index, the served token failed a protected route, or PRISM_HERMES_NO_ADOPT_TOKEN=1). Stop it, or pass its token via HERMES_DASHBOARD_SESSION_TOKEN.`);
  }
  if (!allowSpawn) throw new Error(`no dashboard on :${port} and --no-spawn set`);

  // 2) Spawn a fresh headless backend.
  if (!existsSync(VENV_PY)) throw new Error(`Hermes venv python not found: ${VENV_PY} (is the app installed?)`);
  const tok = token || genToken();
  const env = { ...process.env, HERMES_HOME: HERMES_HOME.replace(/\//g, "\\"), HERMES_DESKTOP: "1", HERMES_DASHBOARD_SESSION_TOKEN: tok };
  // --skip-build: the dashboard otherwise runs `tsc -b && vite build` on the vendored web
  // workspace, which OOMs (the broken custom UI). We serve REST only -- skip the SPA rebuild.
  const args = ["-m", "hermes_cli.main", "dashboard", "--port", String(port), "--no-open", "--host", HOST, "--skip-build"];
  log(`spawn ${VENV_PY} ${args.join(" ")} (port=${port})`);
  const outFd = openSync(LOG, "a");
  // detached + stdio to the LOG FILE (not a pipe). On Windows a child stays in the
  // launching process's group unless `detached:true`, so it dies the moment the CLI
  // exits (or is SIGTERM'd) -- defeating the bridge's whole purpose (a backend that
  // OUTLIVES the CLI). A piped stdout also re-tethers the child to the parent. So we
  // fully detach, route the child's stdout+stderr to the log file, and detect
  // readiness by POLLING the probe. (U-BRIDGE-DETACH 2026-06-18: the launch reached
  // HERMES_DASHBOARD_READY but the backend died with the CLI -- missing detach.)
  const child = spawn(VENV_PY, args, { cwd: `${HERMES_HOME}/hermes-agent`, env, stdio: ["ignore", outFd, outFd], windowsHide: true, detached: true });

  return await new Promise((resolve, reject) => {
    let settled = false;
    const done = (err, val) => { if (settled) return; settled = true; clearTimeout(timer); clearInterval(poll); if (err) reject(err); else resolve(val); };
    const timer = setTimeout(() => done(new Error(`backend did not become ready within ${spawnTimeoutMs}ms (see ${LOG})`)), spawnTimeoutMs);
    timer.unref?.();
    child.on("error", (e) => done(new Error(`spawn failed: ${(e && e.message) || e}`)));
    child.on("exit", (code) => { if (!settled) done(new Error(`backend exited (code ${code}) before ready -- see ${LOG}`)); });
    // Ready via probe poll: the detached child's stdout now goes to the log file (no
    // pipe to parse), and the probe also confirms the token authorizes a protected
    // route -- which the bare stdout READY line never did.
    const poll = setInterval(async () => { const p = await probe(port, tok); if (p.ok) finishReady(port); }, 1000);
    poll.unref?.();
    async function finishReady(readyPort) {
      // Confirm the token actually authorizes a protected route, not just public /api/status.
      const cfg = await probe(readyPort, tok).catch(() => ({ ok: false }));
      if (!cfg.ok) return; // keep waiting
      child.unref();
      writeSidecar({ port: readyPort, token: tok, pid: child.pid, at: nowIso() });
      log(`ready on :${readyPort} pid=${child.pid}`);
      done(null, { port: readyPort, token: tok, reused: false, pid: child.pid });
    }
  });
}

/** High-level control call: ensure backend, then METHOD path with the token. Throws on non-2xx (R12). */
export async function call(method, path, { body = null, port = DEFAULT_PORT, token = null, timeoutMs = 30000, allowSpawn = true } = {}) {
  const be = await ensureBackend({ port, token, allowSpawn });
  const r = await httpCall(method, path, { body, port: be.port, token: be.token, timeoutMs });
  if (r.status < 200 || r.status >= 300) {
    const detail = r.text ? ` -- ${r.text.slice(0, 300)}` : "";
    throw new Error(`${method} ${path} -> HTTP ${r.status}${detail}`);
  }
  return r.json ?? r.text;
}

// ---- High-level surface (each PROVEN against a route in the spec map) ----
export const getStatus      = (o) => call("GET", "/api/status", o);
export const getConfig      = (o) => call("GET", "/api/config", o);

/** Deep-merge a nested partial `patch` into `base` (objects merge recursively;
 *  scalars + arrays REPLACE). Pure -- returns a new object, never mutates inputs. */
export function deepMerge(base, patch) {
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) return patch;
  const out = { ...(base && typeof base === "object" && !Array.isArray(base) ? base : {}) };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = (v && typeof v === "object" && !Array.isArray(v)) ? deepMerge(out[k], v) : v;
  }
  return out;
}

/**
 * Real-time settings write. PUT /api/config REPLACES the whole config
 * (save_config of body.config, web_server.py:3482) -- it does NOT merge -- so a
 * bare partial would WIPE every unset key. We therefore READ the live config,
 * deep-merge the nested `patch` into it, and PUT the FULL merged config wrapped as
 * {config}. `patch` is a nested partial, e.g. { agent: { max_turns: 201 } }.
 */
export async function setConfig(patch, o = {}) {
  const current = await getConfig(o);
  const merged = deepMerge(current, patch);
  return call("PUT", "/api/config", { ...o, body: { config: merged } });
}
export const getModelOptions= (o) => call("GET", "/api/model/options", o);
export const setModel       = (id, o) => call("POST", "/api/model/set", { ...o, body: { model: id } });
export const listCron       = (o) => call("GET", "/api/cron/jobs", o);
export const listMcpServers = (o) => call("GET", "/api/mcp/servers", o);
export const getEnv         = (o) => call("GET", "/api/env", o);

const __isMain = (() => { try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; } })();
if (__isMain) {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? (argv[i + 1] ?? true) : null; };
  const json = argv.includes("--json");
  const port = flag("--port") ? parseInt(flag("--port"), 10) : DEFAULT_PORT;
  const allowSpawn = !argv.includes("--no-spawn");
  const cmd = argv[0];
  const out = (v) => process.stdout.write((json ? JSON.stringify(v, null, 2) : (typeof v === "string" ? v : JSON.stringify(v, null, 2))) + "\n");
  (async () => {
    try {
      if (cmd === "status") out(await getStatus({ port, allowSpawn }));
      else if (cmd === "get-config") out(await getConfig({ port, allowSpawn }));
      else if (cmd === "set-config") out(await setConfig(JSON.parse(argv[1] || "{}"), { port, allowSpawn }));
      else if (cmd === "models") out(await getModelOptions({ port, allowSpawn }));
      else if (cmd === "set-model") out(await setModel(argv[1], { port, allowSpawn }));
      else if (cmd === "cron") out(await listCron({ port, allowSpawn }));
      else if (cmd === "mcp") out(await listMcpServers({ port, allowSpawn }));
      else if (cmd === "env") out(await getEnv({ port, allowSpawn }));
      else if (cmd === "call") out(await call(argv[1], argv[2], { body: argv[3] ? JSON.parse(argv[3]) : null, port, allowSpawn }));
      else if (cmd === "ensure") out(await ensureBackend({ port, allowSpawn }));
      else if (cmd === "stop") { const sc = readSidecar(); if (sc && sc.adopted) { out(`backend on :${sc.port} was ADOPTED (not spawned by the bridge) -- refusing to kill a backend the bridge does not own`); } else if (sc && sc.pid) { try { process.kill(sc.pid); out(`stopped pid ${sc.pid}`); } catch (e) { out(`could not stop pid ${sc && sc.pid}: ${e.message}`); } } else out("no bridge-spawned backend recorded"); }
      else { process.stderr.write("usage: status|get-config|set-config <json>|models|set-model <id>|cron|mcp|env|call <M> <path> [body]|ensure|stop  [--json --port N --no-spawn]\n"); process.exit(2); }
    } catch (e) { process.stderr.write(`[hermes-control-bridge] ${(e && e.message) || e}\n`); process.exit(1); }
  })();
}
