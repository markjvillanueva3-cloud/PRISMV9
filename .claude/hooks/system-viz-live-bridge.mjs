#!/usr/bin/env node
// tier: T3
/**
 * system-viz-live-bridge.mjs — PostToolUse(Edit|Write|MultiEdit) → ping the live system-viz.
 *
 * U-HKA07 of HOOKS-AUTOMATION-V2-MS0. (Spec asked for a `type:"http"` hook; realised as a
 * `type:"command"` hook that does the HTTP itself, so it works regardless of harness support
 * for the http hook type.)
 *
 * WHY: with the /system-viz tab open, a graph-relevant edit should make the map self-update
 * within ~1s instead of needing a manual regen. This hook fire-and-forgets a POST to the
 * local viz server's debounced /api/refresh endpoint (added to state/shared/system-viz/_server.cjs
 * in this same unit). The endpoint responds immediately and collapses bursts into one regen,
 * so even a 50-edit session triggers ~1 regen.
 *
 * Costs nothing when the viz isn't running: ECONNREFUSED is instant; the request also has a
 * ~180ms timeout; and a per-session client cooldown means it doesn't even attempt the round-trip
 * more than once every few seconds during a MultiEdit burst. ALWAYS outputs {continue:true} —
 * a viz that's down/slow/404 never blocks or delays an edit.
 *
 * @hook PostToolUse:(Edit|Write|MultiEdit)  (register in settings.json under that matcher)
 *
 * Env:
 *   PRISM_VIZ_LIVE=0                → disable entirely
 *   PRISM_VIZ_URL                   → viz base URL (default http://localhost:8765)
 *   PRISM_VIZ_LIVE_COOLDOWN_MS      → min ms between client-side pings (default 3000)
 *   PRISM_VIZ_LIVE_CACHE_DIR        → override the cooldown-state dir
 */

import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_COOLDOWN_MS = 3000;
const REQUEST_TIMEOUT_MS = 180;
// Backoff multiplier when viz server is unreachable — collapses ECONNREFUSED storms
// (the dominant hook-telemetry noise source: 1,347 ping-failed events / 4.3% stream).
const VIZ_DOWN_BACKOFF_MS = 5 * 60 * 1000; // 5 min — viz is optional; don't retry hot

// Edits to these don't move the system graph (or would self-trigger) — skip the ping.
const IRRELEVANT_PATH_RX =
  /(^|[\\/])(?:node_modules|\.git|\.claude[\\/]+cache|state[\\/]+shared[\\/]+system-viz|dist|build|coverage|\.next|__snapshots__)[\\/]|(^|[\\/])(?:mcp-server[\\/]+data[\\/]+state)[\\/]|\.(?:log|lock|tmp|map)$/i;

export function isGraphRelevant(filePath) {
  if (typeof filePath !== "string" || !filePath) return false;
  return !IRRELEVANT_PATH_RX.test(filePath);
}

export function isDisabled(env = process.env) {
  return String(env.PRISM_VIZ_LIVE ?? "") === "0";
}
function cooldownMs(env = process.env) {
  const n = Number(env.PRISM_VIZ_LIVE_COOLDOWN_MS);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_COOLDOWN_MS;
}
export function vizUrl(env = process.env) {
  return (env.PRISM_VIZ_URL || "http://localhost:8765").replace(/\/+$/, "") + "/api/refresh";
}

function findRoot(start = process.cwd()) {
  let cur = start;
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const p = path.dirname(cur); if (p === cur) break; cur = p;
  }
  return start;
}
export function cacheDir(env = process.env) {
  return env.PRISM_VIZ_LIVE_CACHE_DIR || path.join(findRoot(), ".claude", "cache");
}
function safeSid(sid) {
  if (typeof sid !== "string" || !sid) return "global";
  return sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
}
export function cooldownFile(sid, env = process.env) {
  return path.join(cacheDir(env), `viz-live-bridge-${safeSid(sid)}.ts`);
}
export function vizDownFile(sid, env = process.env) {
  return path.join(cacheDir(env), `viz-live-bridge-${safeSid(sid)}.down`);
}

/**
 * Pure decision: should this edit trigger a ping?
 * @param vizDownUntil - epoch ms; if now < this, viz was recently unreachable, skip.
 * @returns {{fire:boolean, reason:string}}
 */
export function shouldFire({ filePath, lastFireAt = 0, now = Date.now(), cooldown = DEFAULT_COOLDOWN_MS, vizDownUntil = 0 }) {
  if (!isGraphRelevant(filePath)) return { fire: false, reason: "path not graph-relevant" };
  if (vizDownUntil > 0 && now < vizDownUntil) return { fire: false, reason: `viz-down backoff (until ${new Date(vizDownUntil).toISOString()})` };
  // lastFireAt 0/falsy ⇒ never fired this session ⇒ no cooldown to honour.
  if (lastFireAt > 0 && now - lastFireAt < cooldown) return { fire: false, reason: `within client cooldown (${cooldown}ms)` };
  return { fire: true, reason: "ok" };
}

function readLastFire(file) {
  try { const n = Number(fs.readFileSync(file, "utf8").trim()); return Number.isFinite(n) ? n : 0; } catch { return 0; }
}
function writeLastFire(file, ts) {
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, String(ts)); } catch { /* ignore */ }
}
function readVizDownUntil(file) {
  try { const n = Number(fs.readFileSync(file, "utf8").trim()); return Number.isFinite(n) ? n : 0; } catch { return 0; }
}
function writeVizDownUntil(file, ts) {
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, String(ts)); } catch { /* ignore */ }
}

/** Default poster: fire-and-(near-)forget POST. Resolves to {ok, status} or {ok:false, error}. */
async function defaultPost(url) {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    let body = null; try { body = await r.json(); } catch { /* ignore */ }
    return { ok: r.ok, httpStatus: r.status, status: body && body.status };
  } catch (e) {
    return { ok: false, error: (e && e.name) || String(e) }; // AbortError / TypeError(ECONNREFUSED) / ...
  }
}

function telemetry(env, rec) {
  try {
    const f = path.join(cacheDir(env), "hook-telemetry.jsonl");
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify({ hook: "system-viz-live-bridge", t: new Date().toISOString(), ...rec }) + "\n");
  } catch { /* ignore */ }
}

/**
 * @returns {{fired:boolean, reason:string, post?:object}}
 */
export async function runBridge({ stdin, env = process.env, now = Date.now(), postFn = defaultPost }) {
  if (isDisabled(env)) return { fired: false, reason: "disabled" };
  const filePath = stdin?.tool_input?.file_path ?? stdin?.tool_input?.path;
  if (typeof filePath !== "string" || !filePath) return { fired: false, reason: "no file_path" };
  const sid = stdin?.session_id;
  const cf = cooldownFile(sid, env);
  const df = vizDownFile(sid, env);
  const decision = shouldFire({
    filePath, lastFireAt: readLastFire(cf), now, cooldown: cooldownMs(env),
    vizDownUntil: readVizDownUntil(df),
  });
  if (!decision.fire) return { fired: false, reason: decision.reason };
  writeLastFire(cf, now); // claim the cooldown slot BEFORE the await, so concurrent edits don't double-fire
  const post = await postFn(vizUrl(env));
  // Any fetch-level exception (post.error is set) means viz is not usable right
  // now — TypeError=ECONNREFUSED (off), TimeoutError/AbortError=too slow. All are
  // expected when viz is optional; set a 5-min backoff so we don't spam telemetry
  // with 1000+ ping-failed events per session. A post that came back with ok:false
  // but NO error field = a real HTTP failure (4xx/5xx) — that stays ping-failed.
  if (post && post.ok === false && post.error) {
    writeVizDownUntil(df, now + VIZ_DOWN_BACKOFF_MS);
  } else if (post && post.ok) {
    // Viz answered — clear any stale backoff so a server that just came up is
    // pinged immediately instead of waiting out the full 5-min window.
    try { fs.unlinkSync(df); } catch { /* no backoff file — fine */ }
  }
  return { fired: true, reason: "ok", post };
}

/**
 * Pure: build the hook-telemetry.jsonl record for a runBridge result — or null to log nothing.
 *
 * `viz-not-running` (the optional /system-viz dev server simply isn't up — a fetch-level
 * TypeError/AbortError) is the EXPECTED steady state of an optional tool, not an error.
 * Logging it was the dominant recurring `error:"TypeError"` line in hook-telemetry.jsonl
 * (one per session per 5-min backoff window, fleet-wide) — so it is no longer logged at all.
 * `pinged` (viz answered) and `ping-failed` (viz is UP but returned a real HTTP 4xx/5xx —
 * a genuine fault) are still logged.
 *
 * Why no longer logged at all (vs the prior `event:"viz-not-running"` info classification
 * documented in CLAUDE.md's recent-regressions log): even an info-level row was still
 * 1 record per session per 5-min backoff window across the fleet — pure noise for an
 * optional dev tool. The per-session `.down` sidecar (`viz-live-bridge-<sid>.down`)
 * stores the backoff-until epoch; operators can `ls -la` the sidecar (or check its mtime)
 * to see when viz was last detected down. The sidecar is intentionally minimal — for
 * richer viz-down forensics, check the /system-viz dev server's own logs.
 * `scripts/hook-health-check.mjs` still has `viz-not-running` in its `NEUTRAL_EVENTS` set
 * to correctly classify historical JSONL rows written before this fix.
 *
 * Decision table:
 *   res falsy / not fired           → null  (cooldown / backoff / irrelevant path)
 *   post falsy or empty {}          → null  (malformed poster injection — never produced
 *                                            by defaultPost; guards against adversarial
 *                                            custom postFn returning a bare {})
 *   post.ok === true                → "pinged" record
 *   post.error set                  → null  (viz off / unreachable — expected)
 *   post.ok === false (HTTP fault)  → "ping-failed" record
 *
 * @returns {object|null} telemetry record to append, or null when nothing should be logged.
 */
export function telemetryRecordFor(res, stdin) {
  if (!res || !res.fired) return null;
  const post = res.post;
  const file = stdin?.tool_input?.file_path ?? null;
  const session = stdin?.session_id ?? null;
  // Malformed post (undefined, null, or bare {} from a custom postFn) ⇒ don't log.
  // defaultPost always returns {ok:true,...} or {ok:false,httpStatus} or {ok:false,error}.
  // A post with NO ok AND NO error is non-diagnostic noise — never emit ping-failed for it.
  if (!post || (post.ok === undefined && post.error === undefined)) return null;
  if (post.ok) return { event: "pinged", post, file, session };
  // Fetch-level exception (post.error set) ⇒ viz server not running — expected, don't log.
  if (post.error) return null;
  // post.ok === false with NO error field ⇒ a real HTTP failure from a server that IS up.
  return { event: "ping-failed", post, file, session };
}

async function main() {
  let stdin = null;
  try {
    if (!process.stdin.isTTY) {
      const raw = fs.readFileSync(0, "utf8");
      if (raw && raw.trim().startsWith("{")) stdin = JSON.parse(raw);
    }
  } catch { stdin = null; }

  let res;
  try { res = await runBridge({ stdin }); }
  catch { return process.stdout.write(JSON.stringify({ continue: true })); }

  // viz-not-running (the optional dev server is off) is an expected state, not an error —
  // telemetryRecordFor returns null for it, so it never reaches hook-telemetry.jsonl.
  const rec = telemetryRecordFor(res, stdin);
  if (rec) telemetry(process.env, rec);
  // Always continue — this hook is a pure side-effect notifier; it never blocks or nudges.
  process.stdout.write(JSON.stringify({ continue: true }));
}

const invokedDirectly = (() => {
  try { return path.resolve(process.argv[1] || "").endsWith("system-viz-live-bridge.mjs"); }
  catch { return false; }
})();
if (invokedDirectly) main();
