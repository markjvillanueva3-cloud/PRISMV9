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

/**
 * Pure decision: should this edit trigger a ping?
 * @returns {{fire:boolean, reason:string}}
 */
export function shouldFire({ filePath, lastFireAt = 0, now = Date.now(), cooldown = DEFAULT_COOLDOWN_MS }) {
  if (!isGraphRelevant(filePath)) return { fire: false, reason: "path not graph-relevant" };
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
  const decision = shouldFire({ filePath, lastFireAt: readLastFire(cf), now, cooldown: cooldownMs(env) });
  if (!decision.fire) return { fired: false, reason: decision.reason };
  writeLastFire(cf, now); // claim the cooldown slot BEFORE the await, so concurrent edits don't double-fire
  const post = await postFn(vizUrl(env));
  return { fired: true, reason: "ok", post };
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

  if (res.fired) {
    telemetry(process.env, { event: res.post && res.post.ok ? "pinged" : "ping-failed", post: res.post, file: stdin?.tool_input?.file_path ?? null, session: stdin?.session_id ?? null });
  }
  // Always continue — this hook is a pure side-effect notifier; it never blocks or nudges.
  process.stdout.write(JSON.stringify({ continue: true }));
}

const invokedDirectly = (() => {
  try { return path.resolve(process.argv[1] || "").endsWith("system-viz-live-bridge.mjs"); }
  catch { return false; }
})();
if (invokedDirectly) main();
