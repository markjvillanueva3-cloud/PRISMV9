#!/usr/bin/env node
/**
 * .claude/hooks/hermes-proxy-health-inject.mjs
 *
 * SessionStart hook -- surfaces a DARK or HUNG Hermes proxy (:8645) LOUDLY,
 * with the diagnosable reason + the exact remediation, so the operator/fleet
 * SEE it instead of the proxy silently degrading to Ollama with the real
 * cause buried in hermes-proxy-start.log.
 *
 * Why this exists (the meta-fix, alpha 2026-06-26): the operator ran the
 * "utilize hermes more" /goal 4+ times because the blocker was INVISIBLE.
 * Every Hermes-dependent system (the octopus 5-lens persona panel, the
 * verified-offload strong tier, the graph-improvement cron, the vault-digest)
 * fail-softs to no-op when :8645 is down -- and `fleet-task-health-watch`
 * can't catch it because the "PRISM Hermes Proxy" task reports
 * SCHED_S_TASK_RUNNING (the keepalive ran) even when the proxy itself never
 * served. The actual root cause today: a corrupt aiohttp install + a version
 * drift (3.14.1 vs the maintainer pin aiohttp==3.13.4) wedged the proxy; the
 * residual /health hang is an expired xAI OAuth PKCE credential. This hook
 * classifies WHICH of those it is and prints the fix.
 *
 * Discipline (clone of substrate-health-inject.mjs, the proven SessionStart
 * advisory pattern):
 *   - ADVISORY only, NEVER blocking -- additionalContext + exit 0 on any error.
 *   - Silent when the proxy is healthy (healthy legs are silent, like the
 *     PSN-leg-state injector) -- a banner ONLY when something is wrong.
 *   - TIGHT timeouts: the proxy can HANG (the current OAuth state), so the
 *     listener check + /health probe are hard-bounded -- this hook must never
 *     hang SessionStart.
 *   - Cache at state/shared/.cache/hermes-proxy-health-last.json, short TTL
 *     (10m) so we don't re-probe every session but catch a fresh outage soon.
 *   - Fail-soft on every error class -- no inject is better than a crashed one.
 *
 * Knobs:
 *   PRISM_HERMES_HEALTH_INJECT=0       -- disable entirely
 *   PRISM_HERMES_HEALTH_TTL_MS=N       -- cache TTL (default 600000 = 10m)
 *   PRISM_HERMES_PROXY_URL             -- proxy base (default http://127.0.0.1:8645/v1)
 *   PRISM_HERMES_HEALTH_PORT=N         -- listener port (default 8645)
 *
 * Stdin: SessionStart JSON envelope (ignored). Stdout: hookSpecificOutput.
 * Exit: always 0 (advisory).
 */

// tier: T2
import net from "node:net";
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/PRISM";
const CACHE_DIR = path.join(PRISM_ROOT, "state/shared/.cache");
const CACHE_FILE = path.join(CACHE_DIR, "hermes-proxy-health-last.json");
const START_LOG = process.env.PRISM_HERMES_PROXY_LOG || path.join(PRISM_ROOT, "state/shared/hermes-proxy-start.log");
const DEFAULT_TTL_MS = 600000;          // 10m -- liveness needs freshness, but not every session
const PORT = Number(process.env.PRISM_HERMES_HEALTH_PORT) || 8645;
const BASE_URL = (process.env.PRISM_HERMES_PROXY_URL || `http://127.0.0.1:${PORT}/v1`).replace(/\/+$/, "");
const LISTEN_TIMEOUT_MS = 1200;         // TCP connect ceiling
const HEALTH_TIMEOUT_MS = 2500;         // /health ceiling (proxy may HANG -> hard bound)
const MAX_LOG_BYTES = 200_000;          // tail-read cap (hostile/giant-log guard)
const MAX_CACHE_BYTES = 100_000;

const DEPENDENTS = "octopus 5-lens persona panel · verified-offload strong tier · graph-improvement cron · vault-digest";

function emit(additionalContext) {
  const payload = additionalContext
    ? { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }
    : {};
  process.stdout.write(JSON.stringify(payload) + "\n");
  process.exit(0);
}

/**
 * Classify the proxy's last start-log tail into a machine reason. Pure.
 * Order matters: a bind-conflict / missing-dep line is the operative failure
 * even though an earlier "Listening on" line is also present in the tail.
 * @param {string} logTail
 * @returns {"missing-dep"|"bind-conflict"|"started"|"unknown"}
 */
export function classifyStartLog(logTail) {
  if (typeof logTail !== "string" || !logTail.trim()) return "unknown";
  const s = logTail.toLowerCase();
  // Find the LAST occurrence of each signal; the latest one wins (the most
  // recent start attempt's outcome), so a recovered proxy isn't tarred by an
  // older failure line still in the tail.
  const idxDep = Math.max(s.lastIndexOf("requires aiohttp"), s.lastIndexOf("modulenotfounderror"), s.lastIndexOf("importerror"));
  const idxBind = Math.max(s.lastIndexOf("errno 10048"), s.lastIndexOf("failed to bind"), s.lastIndexOf("address already in use"));
  const idxOk = s.lastIndexOf("listening on");
  const best = Math.max(idxDep, idxBind, idxOk);
  if (best < 0) return "unknown";
  if (best === idxDep) return "missing-dep";
  if (best === idxBind) return "bind-conflict";
  return "started";
}

/**
 * Remediation line for a (state, reason) pair. Pure. The exact commands that
 * un-dark the proxy -- encodes the 2026-06-26 diagnosis so a future operator
 * doesn't have to re-derive it.
 * @param {{state:string, reason:string}} s
 * @returns {string}
 */
export function remediationFor({ state, reason }) {
  if (state === "hung") {
    return "proxy listens but serves no HTTP (even /health) -- most likely the xAI OAuth PKCE credential is expired. " +
      "Operator action (browser login; I can't authenticate): `hermes auth reset xai-oauth` then re-run, then `Start-ScheduledTask 'PRISM Hermes Proxy'`.";
  }
  if (state === "degraded") {
    return "proxy up but xAI OAuth not authenticated. Operator: `hermes auth add xai-oauth --type oauth` (browser PKCE).";
  }
  // state === "down"
  if (reason === "missing-dep") {
    return "Hermes venv aiohttp is broken/missing. Fix: `\"$PRISM_HERMES_PY\" -m pip install aiohttp==3.13.4` (the hermes-agent pin), then `Start-ScheduledTask 'PRISM Hermes Proxy'`.";
  }
  if (reason === "bind-conflict") {
    return "a stale proxy holds :8645. Kill it (Stop-Process on the python hermes_cli proxy pid), wait ~20s for TIME_WAIT, then `Start-ScheduledTask 'PRISM Hermes Proxy'`.";
  }
  return "proxy not listening. Run `node scripts/hermes-proxy-ensure.mjs` (idempotent) or `Start-ScheduledTask 'PRISM Hermes Proxy'`; see " + START_LOG + " for the reason.";
}

/**
 * Render the SessionStart banner from a probe result. Pure. Returns null when
 * the proxy is healthy (UP) -- a healthy leg is SILENT.
 * @param {{state:"up"|"down"|"hung"|"degraded", reason:string, ageMs?:number}} st
 * @returns {string|null}
 */
export function formatHermesHealth(st) {
  if (!st || typeof st !== "object") return null;
  // Only the three known BAD states render. "up", an unknown state, or a
  // malformed cache => SILENT (never raise a false DARK alarm from garbage).
  const label = { down: "DARK (not listening)", hung: "HUNG (listens, serves nothing)", degraded: "DEGRADED (OAuth not authenticated)" }[st.state];
  if (!label) return null;
  const ageLabel = st.ageMs == null || st.ageMs === 0 ? "fresh" : `cached ${Math.floor(st.ageMs / 60000)}m ago`;
  return [
    `## 🔴 Hermes proxy health -- ${label} · ${ageLabel}`,
    `   Hermes-dependent systems are silently degraded to Ollama/no-op: ${DEPENDENTS}`,
    `   -> Fix: ${remediationFor({ state: st.state, reason: st.reason })}`,
    `   _Probe :${PORT}. Disable: PRISM_HERMES_HEALTH_INJECT=0_`,
  ].join("\n");
}

function readCache(ttlMs) {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const stt = statSync(CACHE_FILE);
    if (stt.size > MAX_CACHE_BYTES) return null;
    const ageMs = Date.now() - stt.mtimeMs;
    if (ageMs > ttlMs) return null;
    const j = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (!j || typeof j !== "object" || typeof j.state !== "string") return null;
    return { st: j, ageMs };
  } catch { return null; }
}

function writeCacheAtomic(st) {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    const tmp = `${CACHE_FILE}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, JSON.stringify(st), "utf8");
    renameSync(tmp, CACHE_FILE);
  } catch { /* best-effort */ }
}

/** TCP connect probe: is something listening on :PORT? Impure, hard-bounded. */
function checkListener(port, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const sock = net.connect({ port, host: "127.0.0.1" });
    const done = (v) => { if (settled) return; settled = true; try { sock.destroy(); } catch {} resolve(v); };
    sock.setTimeout(timeoutMs);
    sock.once("connect", () => done(true));
    sock.once("timeout", () => done(false));
    sock.once("error", () => done(false));
  });
}

/**
 * Derive the proxy's ROOT /health URL from the (possibly /v1-suffixed) API base.
 * Pure. The proxy serves /health at the ORIGIN root, NOT under /v1 -- the
 * OpenAI-compat surface (/chat/completions, /models, /embeddings, ...) lives
 * under /v1, but /health does not. Probing `${BASE_URL}/health` when BASE_URL
 * ends in /v1 hits /v1/health, which the proxy 404s ("path_not_allowed"), so
 * classifyHealth() reads a fully-healthy proxy as HUNG and fires a false
 * fleet-wide SessionStart alarm (the 2026-06-27 false-positive this fixes).
 * @param {string} baseUrl
 * @returns {string}
 */
export function healthUrlFor(baseUrl) {
  try {
    return `${new URL(baseUrl).origin}/health`;
  } catch {
    // malformed base -- commonly a scheme-less host:port (e.g. "127.0.0.1:8645/v1").
    // new URL() throws without a scheme, so prepend http:// (only when no scheme is
    // present) and re-derive the origin -> a FETCHABLE root /health. Without this the
    // fallback emitted a scheme-less URL that fetch() rejects -> classifyHealth='hung'
    // -> a NEW false HUNG (the same false-alarm class this hook exists to prevent).
    const s = String(baseUrl || "").trim();
    const withScheme = /:\/\//.test(s) ? s : `http://${s}`;
    try {
      return `${new URL(withScheme).origin}/health`;
    } catch {
      // truly unparseable (e.g. empty) -> last-resort string strip, never throws.
      return `${s.replace(/\/+$/, "").replace(/\/v1$/i, "")}/health`;
    }
  }
}

/**
 * Is the fleet's Hermes lane repointed OFF the local :8645 proxy? Pure.
 *
 * Per HERMES-OPERATING-DOCTRINE.md (2026-06-30, §1/§4): when PRISM_HERMES_PROXY_URL points at a
 * DIRECT cloud lane (e.g. NVIDIA integrate.api.nvidia.com), the fleet's hermes-mcp-server /
 * ask-hermes / octopus voices use THAT lane, NOT the local :8645 proxy -- so a dark :8645 is
 * EXPECTED ("not an error", doctrine §4) and this hook must stay SILENT instead of firing a false
 * DARK alarm that sends the operator on a phantom "fix Hermes" errand (the recurring 4+-session
 * waste this fixes -- golf fleet-hygiene 2026-07-02). :8645 is the critical lane ONLY when
 * PRISM_HERMES_PROXY_URL is UNSET (hermes-mcp-server.mjs then defaults to http://127.0.0.1:8645/v1)
 * or explicitly points at the local proxy port.
 *
 * @param {string|undefined} proxyUrl  process.env.PRISM_HERMES_PROXY_URL
 * @param {number|string} localPort    the local proxy port that IS :8645 (default 8645)
 * @returns {boolean}  true => fleet lane is off :8645 => a dark :8645 is expected (stay silent)
 */
export function isFleetLaneOffProxy(proxyUrl, localPort = 8645) {
  const raw = String(proxyUrl || "").trim();
  if (!raw) return false;                       // unset -> hermes-mcp defaults to local :8645 -> :8645 IS the lane
  let host, port;
  try {
    const u = new URL(/:\/\//.test(raw) ? raw : `http://${raw}`);
    host = u.hostname;
    port = u.port || (u.protocol === "https:" ? "443" : "80");
  } catch {
    return false;                               // unparseable -> conservative: keep the alarm
  }
  // WHATWG new URL() returns IPv6 hostnames bracketed (e.g. "[::1]"), so match that form.
  // (A bare unbracketed "::1" is never produced -- `new URL("http://::1")` throws and is caught above.)
  const isLocalHost = host === "127.0.0.1" || host === "localhost" || host === "[::1]";
  if (isLocalHost) return String(port) !== String(localPort);   // local lane: off :8645 iff a DIFFERENT local port
  // Remote host: treat as a real off-:8645 cloud lane only when the host looks like a genuine
  // domain/IP (contains a dot). A non-dotted hostname token (e.g. "nonsense") is ambiguous ->
  // conservative keep-the-alarm. (A purely numeric value like "12345" is WHATWG-coerced to the
  // dotted IPv4 host "0.0.48.57" and thus read as a real remote lane -> silenced; that is a
  // defensible silence on a misconfigured env, not a garbage keep-alarm case.)
  return host.includes(".");
}

/** /health probe with a hard AbortController bound. Impure. `healthUrl` is the
 *  fully-resolved ROOT health endpoint (from healthUrlFor -- it is NOT under /v1).
 *  `bodyComplete` is true ONLY if r.text() fully resolved within the bound --
 *  a response whose headers arrive but whose BODY hangs (the proxy's wedged
 *  handler) aborts the body read, leaving bodyComplete=false. */
async function probeHealth(healthUrl, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(healthUrl, { signal: ctrl.signal, headers: { Authorization: "Bearer prism" } });
    let body = "", bodyComplete = false;
    try { body = await r.text(); bodyComplete = true; } catch { /* body read aborted/failed -> incomplete */ }
    return { ok: r.ok, status: r.status, body, bodyComplete };
  } catch (e) {
    return { ok: false, aborted: (e && e.name === "AbortError"), bodyComplete: false };
  } finally { clearTimeout(t); }
}

/**
 * Classify a /health response into the serving state. Pure.
 * HEALTHY requires BOTH the headers OK and the body fully read within the
 * bound -- a 200 whose body hangs (bodyComplete=false) is a wedged handler and
 * must read as HUNG, not up (the header-then-body-hang variant). An explicit
 * authenticated:false in a complete body is DEGRADED.
 * @param {{ok?:boolean, bodyComplete?:boolean, body?:string}} h
 * @returns {"up"|"degraded"|"hung"}
 */
export function classifyHealth(h = {}) {
  if (!h || !h.ok || !h.bodyComplete) return "hung";
  if (/"authenticated"\s*:\s*false/i.test(String(h.body || ""))) return "degraded";
  return "up";
}

function readLogTail() {
  try {
    if (!existsSync(START_LOG)) return "";
    const stt = statSync(START_LOG);
    const start = Math.max(0, stt.size - MAX_LOG_BYTES);
    const buf = readFileSync(START_LOG);
    return buf.subarray(start).toString("utf8");
  } catch { return ""; }
}

/** Live probe -> {state, reason}. Impure. */
async function probe() {
  const listening = await checkListener(PORT, LISTEN_TIMEOUT_MS);
  const reason = classifyStartLog(readLogTail());
  if (!listening) return { state: "down", reason };
  const h = await probeHealth(healthUrlFor(BASE_URL), HEALTH_TIMEOUT_MS);
  return { state: classifyHealth(h), reason };
}

async function main() {
  if (process.env.PRISM_HERMES_HEALTH_INJECT === "0") return emit(null);
  // Doctrine gate (HERMES-OPERATING-DOCTRINE.md 2026-06-30 §1/§4): when the fleet hermes lane is
  // repointed OFF the local :8645 proxy (PRISM_HERMES_PROXY_URL -> a direct cloud lane like NVIDIA),
  // a dark :8645 is EXPECTED and harmless -- the fleet uses the direct lane, not :8645. Firing the
  // 🔴 DARK alarm here sent 4+ sessions on a phantom "fix Hermes" errand for a legacy proxy. Stay
  // SILENT in that mode. Sibling of sierra's meta-health live-probe gate (a5b71672f9). golf 2026-07-02.
  if (isFleetLaneOffProxy(process.env.PRISM_HERMES_PROXY_URL, PORT)) return emit(null);
  const ttlMs = Number(process.env.PRISM_HERMES_HEALTH_TTL_MS) || DEFAULT_TTL_MS;
  const cached = readCache(ttlMs);
  let st, ageMs;
  if (cached) { st = cached.st; ageMs = cached.ageMs; }
  else { st = await probe(); writeCacheAtomic(st); ageMs = 0; }
  emit(formatHermesHealth({ ...st, ageMs }));
}

function isInvokedDirectly() {
  if (typeof process.argv[1] !== "string") return false;
  try { return path.relative(fileURLToPath(import.meta.url), path.resolve(process.argv[1])) === ""; }
  catch { return false; }
}

if (isInvokedDirectly()) {
  main().catch(() => emit(null));
}
