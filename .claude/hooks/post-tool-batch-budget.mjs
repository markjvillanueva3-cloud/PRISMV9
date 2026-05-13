#!/usr/bin/env node
// tier: T3
/**
 * post-tool-batch-budget.mjs — PostToolUse — alarm when a session is burning through the tool budget.
 *
 * U-HKA10 of HOOKS-AUTOMATION-V2-MS0. Complement to U-HKA02 (autonomous-loop-defer, a PreToolUse
 * gate that catches a *burst* / runaway loop): this is a PostToolUse *observer* that catches the
 * slower failure mode — sustained high tool volume over a long session, which is how the token
 * budget actually drains. It can't deny (the tool already ran) — it surfaces a "slow-mode" nudge.
 *
 * Counts tool calls in a sliding window (default 1h) via an append-only epoch-ms log; at/above the
 * ceiling it emits an additionalContext alarm, rate-limited to once per snooze window (default
 * 10 min) so it nags ~once while you're over, not every call. Fall-back per the spec's failure_modes:
 * if the log read fails it just stays quiet (fail-open — can never crash a tool's post-processing).
 *
 * Self-tuning: every RECOMMEND_EVERY calls it records the current window count to a shared samples
 * file and rewrites tool-batch-recommendation.json with recommendCeiling(samples). resolveConfig
 * uses, in order: PRISM_TOOL_BATCH_CEILING env → that recommendation file → DEFAULT_CEILING. So the
 * ceiling adapts to how this fleet actually works without anyone editing settings. scripts/
 * retune-tool-batch-ceiling.mjs does the same recompute on demand (wire it to /loop --interval 7d).
 *
 * @hook PostToolUse:*  (register in settings.json under the "" matcher group so it sees every call)
 *
 * Env:
 *   PRISM_TOOL_BATCH_BUDGET=0     → disable
 *   PRISM_TOOL_BATCH_WINDOW_MS    → counting window (default 3600000 = 1h)
 *   PRISM_TOOL_BATCH_CEILING      → tool calls/window before the alarm (overrides the self-tuned value)
 *   PRISM_TOOL_BATCH_SNOOZE_MS    → min ms between alarms while over the ceiling (default 600000 = 10min)
 *   PRISM_TOOL_BATCH_CACHE_DIR    → override the cache dir
 */

import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_WINDOW_MS = 3_600_000;
const DEFAULT_CEILING = 800;
const DEFAULT_SNOOZE_MS = 600_000;
const RECOMMEND_EVERY = 200;          // re-derive the ceiling roughly every N calls (per session)
const CEILING_FLOOR = 100, CEILING_CAP = 20_000;

// ── cache paths ───────────────────────────────────────────────────────────────
function findRoot(start = process.cwd()) {
  let cur = start;
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const p = path.dirname(cur); if (p === cur) break; cur = p;
  }
  return start;
}
export function cacheDir(env = process.env) {
  return env.PRISM_TOOL_BATCH_CACHE_DIR || path.join(findRoot(), ".claude", "cache");
}
function safeSid(sid) {
  if (typeof sid !== "string" || !sid) return "global";
  return sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
}
export function logPath(sid, env = process.env) { return path.join(cacheDir(env), `tool-batch-${safeSid(sid)}.log`); }
export function statePath(sid, env = process.env) { return path.join(cacheDir(env), `tool-batch-${safeSid(sid)}.state.json`); }
export function samplesPath(env = process.env) { return path.join(cacheDir(env), "tool-batch-samples.jsonl"); }
export function recommendationPath(env = process.env) { return path.join(cacheDir(env), "tool-batch-recommendation.json"); }

// ── pure helpers ──────────────────────────────────────────────────────────────

export function isDisabled(env = process.env) { return String(env.PRISM_TOOL_BATCH_BUDGET ?? "") === "0"; }

/** p90 of a numeric sample array (nearest-rank). */
function p90(samples) {
  const xs = samples.filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const idx = Math.min(xs.length - 1, Math.ceil(0.9 * xs.length) - 1);
  return xs[Math.max(0, idx)];
}
/** Recommend a ceiling from observed window-count samples: ~p90 × 1.4, clamped. */
export function recommendCeiling(samples) {
  const p = p90(Array.isArray(samples) ? samples : []);
  if (p == null || p <= 0) return DEFAULT_CEILING;
  return Math.max(CEILING_FLOOR, Math.min(CEILING_CAP, Math.round(p * 1.4)));
}

/** Read the configured ceiling: env override → self-tuned recommendation file → default. */
export function resolveCeiling(env = process.env) {
  const e = Number(env.PRISM_TOOL_BATCH_CEILING);
  if (Number.isFinite(e) && e > 0) return Math.round(e);
  try {
    const j = JSON.parse(fs.readFileSync(recommendationPath(env), "utf8"));
    const c = Number(j && j.ceiling);
    if (Number.isFinite(c) && c >= CEILING_FLOOR && c <= CEILING_CAP) return Math.round(c);
  } catch { /* no recommendation yet */ }
  return DEFAULT_CEILING;
}
export function resolveConfig(env = process.env) {
  const w = Number(env.PRISM_TOOL_BATCH_WINDOW_MS);
  const s = Number(env.PRISM_TOOL_BATCH_SNOOZE_MS);
  const r = Number(env.PRISM_TOOL_BATCH_RECOMMEND_EVERY); // testability hook; default RECOMMEND_EVERY
  return {
    windowMs: Number.isFinite(w) && w > 0 ? w : DEFAULT_WINDOW_MS,
    ceiling: resolveCeiling(env),
    snoozeMs: Number.isFinite(s) && s >= 0 ? s : DEFAULT_SNOOZE_MS,
    recommendEvery: Number.isFinite(r) && r > 0 ? Math.round(r) : RECOMMEND_EVERY,
  };
}

/** Count epoch-ms timestamps in `file` within [now-windowMs, now+skew]; bounded tail read. */
export function readWindowCount(file, now, windowMs, maxLines = 8192) {
  let lines = [];
  try {
    const raw = fs.readFileSync(file, "utf8");
    lines = raw.split("\n");
    if (lines.length > maxLines) lines = lines.slice(-maxLines);
  } catch { return { count: 0, total: 0, pruneDue: false }; }
  const cutoff = now - windowMs;
  let count = 0, total = 0;
  for (const ln of lines) {
    const s = ln.trim();
    if (!s) continue;                       // skip blank lines (incl. the trailing \n's empty split)
    const t = Number(s);
    if (!Number.isFinite(t)) continue;
    total++;
    if (t >= cutoff && t <= now + 60_000) count++;
  }
  return { count, total, pruneDue: total > count * 2 + 64 };
}

/**
 * @param {{count:number, ceiling:number, lastAlarmAt:number, now:number, snoozeMs:number, windowMs:number}} p
 * @returns {{alarm:boolean, message:string, count:number, ceiling:number}}
 */
export function decideAlarm({ count, ceiling, lastAlarmAt = 0, now, snoozeMs, windowMs = DEFAULT_WINDOW_MS }) {
  if (!(count >= ceiling)) return { alarm: false, message: "", count, ceiling };
  if (lastAlarmAt > 0 && now - lastAlarmAt < snoozeMs) return { alarm: false, message: "", count, ceiling };
  const windowMin = Math.round((windowMs / 60000) * 10) / 10;
  return {
    alarm: true,
    count,
    ceiling,
    message:
      `⚠️ Tool-batch budget: ${count} tool calls in the last ${windowMin}min (≥ ceiling ${ceiling}). ` +
      `You're burning the token budget — slow down: batch independent tool calls into a single message, ` +
      `\`/compact\` now (don't wait for the limit), prefer the digests/indexes over re-exploration, or ` +
      `wrap up this unit and continue in a fresh session. (Raise PRISM_TOOL_BATCH_CEILING or set ` +
      `PRISM_TOOL_BATCH_BUDGET=0 to silence; ceiling auto-tunes from observed usage otherwise.)`,
  };
}

// ── IO glue ───────────────────────────────────────────────────────────────────
function appendTs(file, ts) {
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.appendFileSync(file, String(ts) + "\n"); } catch { /* ignore */ }
}
function rewritePruned(file, kept) {
  try {
    const tmp = file + "." + process.pid + ".tmp";
    fs.writeFileSync(tmp, kept.map(String).join("\n") + (kept.length ? "\n" : ""));
    fs.renameSync(tmp, file);
  } catch { /* ignore */ }
}
function readState(file) {
  try { const j = JSON.parse(fs.readFileSync(file, "utf8")); return j && typeof j === "object" ? j : {}; } catch { return {}; }
}
function writeState(file, obj) {
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); const tmp = file + "." + process.pid + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(obj)); fs.renameSync(tmp, file); } catch { /* ignore */ }
}
function recordSampleAndRecommend(env, windowCount, now) {
  try {
    const sf = samplesPath(env);
    fs.mkdirSync(path.dirname(sf), { recursive: true });
    fs.appendFileSync(sf, JSON.stringify({ at: now, count: windowCount }) + "\n");
    // recompute the recommendation from up to the last 500 samples
    let lines = [];
    try { lines = fs.readFileSync(sf, "utf8").split("\n").filter((l) => l.trim().startsWith("{")).slice(-500); } catch { /* ignore */ }
    const counts = [];
    for (const ln of lines) { try { const j = JSON.parse(ln); if (Number.isFinite(j.count)) counts.push(j.count); } catch { /* ignore */ } }
    const rec = { ceiling: recommendCeiling(counts), computedAt: now, sampleCount: counts.length };
    const rp = recommendationPath(env);
    const tmp = rp + "." + process.pid + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(rec, null, 2)); fs.renameSync(tmp, rp);
  } catch { /* ignore */ }
}
function telemetry(env, rec) {
  try {
    const f = path.join(cacheDir(env), "hook-telemetry.jsonl");
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify({ hook: "post-tool-batch-budget", t: new Date().toISOString(), ...rec }) + "\n");
  } catch { /* ignore */ }
}

/**
 * @returns {{alarm:boolean, message:string, count:number, ceiling:number, disabled?:boolean}}
 */
export function runBudget({ stdin, env = process.env, now = Date.now() }) {
  if (isDisabled(env)) return { alarm: false, message: "", count: 0, ceiling: 0, disabled: true };
  const sid = stdin?.session_id;
  const cfg = resolveConfig(env);
  const lf = logPath(sid, env);
  appendTs(lf, now);
  const { count, pruneDue } = readWindowCount(lf, now, cfg.windowMs);
  if (pruneDue) {
    // re-read to get the kept timestamps for the rewrite (cheap; we just wrote one line)
    let kept = [];
    try {
      const cutoff = now - cfg.windowMs;
      kept = fs.readFileSync(lf, "utf8").split("\n").map((l) => Number(l.trim())).filter((t) => Number.isFinite(t) && t >= cutoff && t <= now + 60_000);
    } catch { kept = [now]; }
    rewritePruned(lf, kept);
  }
  const sf = statePath(sid, env);
  const st = readState(sf);
  const callCount = (Number.isFinite(st.callCount) ? st.callCount : 0) + 1;
  const dec = decideAlarm({ count, ceiling: cfg.ceiling, lastAlarmAt: st.lastAlarmAt || 0, now, snoozeMs: cfg.snoozeMs, windowMs: cfg.windowMs });
  const newState = { callCount, lastAlarmAt: dec.alarm ? now : (st.lastAlarmAt || 0), lastCount: count, sessionStartAt: st.sessionStartAt || now };
  writeState(sf, newState);
  if (callCount % cfg.recommendEvery === 0) recordSampleAndRecommend(env, count, now);
  return dec;
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

function main() {
  let stdin = null;
  try {
    if (!process.stdin.isTTY) {
      const raw = fs.readFileSync(0, "utf8");
      if (raw && raw.trim().startsWith("{")) stdin = JSON.parse(raw);
    }
  } catch { stdin = null; }

  let res;
  try { res = runBudget({ stdin }); }
  catch { return emit({ continue: true }); }

  if (!res.alarm) return emit({ continue: true });
  telemetry(process.env, { event: "alarm", count: res.count, ceiling: res.ceiling, session: stdin?.session_id ?? null });
  return emit({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: res.message } });
}

const invokedDirectly = (() => {
  try { return path.resolve(process.argv[1] || "").endsWith("post-tool-batch-budget.mjs"); }
  catch { return false; }
})();
if (invokedDirectly) main();
