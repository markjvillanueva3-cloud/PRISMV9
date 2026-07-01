#!/usr/bin/env node
/**
 * five-hour-limit-tracker.mjs -- ZULU-ACCOUNT-CYCLE-MS0 / U-5H-LIMIT-TRACKER
 * (slot:zulu, 2026-06-18). The CALIBRATION keystone the chain was missing.
 *
 * THE DISCOVERY (verified against 2 live transcripts 2026-06-18): Claude Code
 * DOES record the 5h-ceiling event in its own transcript JSONL. When the account
 * hits its rolling 5h session limit, a record is written:
 *   { type:"assistant", timestamp:"...", error:"rate_limit", isApiErrorMessage:true,
 *     apiErrorStatus:429,
 *     message:{ content:[{ type:"text",
 *       text:"You've hit your session limit . resets 3:10pm (America/Chicago)" }] } }
 *
 * This FLIPS the keystone's standing assumption ("the 5h ceiling is not locally
 * derivable" -- see five-hour-token-sum.mjs / populate-5h-quota.mjs, which fall
 * back to a GUESSED 88M ceiling). The ceiling IS locally observable: it is the
 * rolling-5h weighted-token SUM at the moment of a session-limit 429. This tracker
 * mines those events and turns them into the real per-account ceiling, so the
 * account-switch can arm WITHOUT the operator guessing a number.
 *
 * TWO KINDS OF 429 -- must NOT be conflated (verified both shapes live):
 *   - SESSION LIMIT  : "You've hit your session limit . resets 3:10pm (...)"
 *                      -> the real 5h ceiling. The ONLY kind we calibrate from.
 *   - SERVER THROTTLE: "Server is temporarily limiting requests (not your usage
 *                      limit) . Rate limited" -> Anthropic-side backpressure,
 *                      NOT the account ceiling. EXCLUDED from calibration.
 *
 * WEIGHTED-SUM CONSISTENCY: weighted = input + output + 1.25*cacheCreation +
 * 0.1*cacheRead, identical to five-hour-token-sum.mjs (the figure the switch gate
 * and populator already use), so the ceiling we report is in the SAME units the
 * arm/trigger consumes. R12: the 1.25/0.1 are the published cache BILLING weights;
 * the exact 5h rate-limit weighting is Anthropic-internal, so the OBSERVED ceiling
 * (a real crossing in these very units) is more trustworthy than any assumed one.
 *
 * BOUNDED WINDOW (the correctness subtlety): five-hour-token-sum.fiveHourTokenSum
 * sums tsMs >= windowStart with NO upper bound -- correct for "now", WRONG for a
 * PAST event (it would include tokens spent AFTER the 429). So calibration uses an
 * exact [T-5h, T] both-ends window via a sorted prefix sum.
 *
 * COMMANDS:
 *   node scripts/five-hour-limit-tracker.mjs --calibrate   # mine 429s -> observed ceiling, write sidecar
 *   node scripts/five-hour-limit-tracker.mjs --status      # live: current weighted, %used, burn, ETA
 *   node scripts/five-hour-limit-tracker.mjs --calibrate --since-days 14 --pct 0.9 --json
 *   node scripts/five-hour-limit-tracker.mjs --calibrate --no-write
 *
 * Importable: every pure function + the two orchestrators (calibrateCeiling,
 * liveStatus) are exported and fs/clock-injectable for tests.
 */

import fsDefault from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { pathToFileURL } from "node:url";
import {
  extractUsageTsFromBlock,
  dedupKeepMaxTs,
  parseTsMs,
  listTranscripts,
  fiveHourTokenSum,
  defaultProjectsRoot,
  CACHE_WRITE_MULT,
  CACHE_READ_MULT,
  FIVE_HOURS_MS,
} from "./lib/five-hour-token-sum.mjs";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
export const DEFAULT_OBSERVED_CEILING_PATH = path.join(ROOT, "state", "shared", "five-hour-ceiling-observed.json");
// ACCOUNT-SWITCH BOUNDARY (U-5H-ACCOUNT-BOUNDARY): the rolling-5h sum is per-ACCOUNT. After a switch
// the new account has a fresh 5h budget, so the window must floor at the switch instant -- else the
// sum counts the OLD account's tokens and falsely reads ~100% (the bug an operator hits on a manual
// account switch). Boundary sources: the manual marker (written by --mark-switch) + the auto-switch
// coordinator's status:"switched" ledger events.
export const DEFAULT_SWITCH_BOUNDARY_PATH = path.join(ROOT, "state", "shared", "account-switch-boundary.json");
export const DEFAULT_SWITCH_MONITOR_PATH = path.join(ROOT, "state", "shared", "account-switch-monitor.jsonl");
export const DEFAULT_SINCE_DAYS = 30;       // recent enough to reflect the current plan
export const DEFAULT_BURN_WINDOW_MS = 30 * 60 * 1000; // 30 min trailing rate
export const DEFAULT_ARM_PCT = 0.92;        // mid 90-95% -- matches arm-account-switch DEFAULT_PCT
const DAY_MS = 24 * 60 * 60 * 1000;

// ============================== PURE CORE ==============================

/**
 * Weighted token cost of one extracted usage record. Mirrors sumWindow's
 * weightedTokens (five-hour-token-sum.mjs) EXACTLY so the ceiling is comparable
 * to the live figure the switch gate consumes. PURE.
 */
export function weightedOf(rec) {
  if (!rec) return 0;
  return rec.input + rec.output + CACHE_WRITE_MULT * rec.cacheCreation + CACHE_READ_MULT * rec.cacheRead;
}

/**
 * Classify a rate-limit message's text. Word-based (NO middot literal -- the live
 * text uses a non-ASCII separator; matching words keeps this source ASCII-only and
 * is robust to separator changes). PURE.
 *   "server-throttle" : Anthropic backpressure, NOT the account ceiling.
 *   "session-limit"   : the 5h usage ceiling -- the only kind we calibrate from.
 *   "unknown"         : a 429 whose text we cannot classify (counted, not used).
 */
export function classifyRateLimitText(text) {
  const t = String(text || "").toLowerCase();
  if (!t) return "unknown";
  // Server throttle FIRST: its text explicitly disclaims the usage limit, so its
  // "(not your usage limit)" must win over any incidental "limit" word.
  if (/not your usage limit|server is temporarily limiting/.test(t)) return "server-throttle";
  // Require an explicit limit-word. A bare "resets <time>" is NOT sufficient on its
  // own (P2b: avoid false-positives from any future 429 text that mentions a reset
  // clock without being a usage-limit). The verified session-limit text always
  // carries "session limit"/"usage limit"; parseResetClock reads the reset separately.
  if (/session limit|usage limit|hit your .*limit|reached your .*limit/.test(t)) return "session-limit";
  return "unknown";
}

/**
 * Extract a rate-limit classification from a parsed transcript block, or null if
 * the block is not a rate-limit 429 event. PURE. Guards on the exact verified
 * shape: error==="rate_limit" && isApiErrorMessage===true && apiErrorStatus===429.
 * @returns {{tsMs:number|null, kind:string, text:string, sessionId:string|null}|null}
 */
export function classifyRateLimitRecord(block) {
  if (!block || typeof block !== "object") return null;
  if (block.error !== "rate_limit" || block.isApiErrorMessage !== true || block.apiErrorStatus !== 429) return null;
  let text = "";
  const content = block.message && Array.isArray(block.message.content) ? block.message.content : null;
  if (content) {
    for (const c of content) {
      if (c && c.type === "text" && typeof c.text === "string") { text = c.text; break; }
    }
  }
  return {
    tsMs: parseTsMs(block.timestamp),
    kind: classifyRateLimitText(text),
    text,
    sessionId: typeof block.sessionId === "string" ? block.sessionId : null,
  };
}

/**
 * Best-effort parse of the reset clock in a session-limit text:
 * "...resets 3:10pm (America/Chicago)" -> { raw:"3:10pm", tz:"America/Chicago" }.
 * Returns null when no reset clause is present. PURE, informational only.
 */
export function parseResetClock(text) {
  const t = String(text || "");
  const m = t.match(/resets\s+([0-9]{1,2}:[0-9]{2}\s*(?:am|pm)?)\s*(?:\(([^)]+)\))?/i);
  if (!m) return null;
  return { raw: m[1].replace(/\s+/g, "").toLowerCase(), tz: m[2] || null };
}

/**
 * Cluster session-limit events into distinct ceiling crossings. Within one 5h
 * window a limit produces many retries (every blocked request logs a 429); they
 * are ONE crossing. A new cluster starts when the gap from the previous event
 * exceeds clusterGapMs (default 5h: events >5h apart are necessarily different
 * windows). Returns the FIRST event of each cluster (the clean crossing instant).
 * Input events need a finite tsMs; null-ts events are dropped. PURE.
 */
export function clusterEvents(events, clusterGapMs = FIVE_HOURS_MS) {
  const sorted = events.filter((e) => e && Number.isFinite(e.tsMs)).slice().sort((a, b) => a.tsMs - b.tsMs);
  const firsts = [];
  let prevTs = -Infinity;
  for (const e of sorted) {
    if (e.tsMs - prevTs > clusterGapMs) firsts.push(e);
    prevTs = e.tsMs;
  }
  return firsts;
}

/**
 * Build a sorted prefix-sum index over deduped usage records for O(log n) bounded
 * window sums. Returns { ts:number[] (ascending), prefix:number[] } where
 * prefix[i] = sum of weighted(records[0..i-1]) and prefix[0] = 0. PURE.
 */
export function buildPrefixSums(records) {
  const withTs = records.filter((r) => r && Number.isFinite(r.tsMs)).slice().sort((a, b) => a.tsMs - b.tsMs);
  const ts = new Array(withTs.length);
  const prefix = new Array(withTs.length + 1);
  prefix[0] = 0;
  for (let i = 0; i < withTs.length; i++) {
    ts[i] = withTs[i].tsMs;
    prefix[i + 1] = prefix[i] + weightedOf(withTs[i]);
  }
  return { ts, prefix, earliestMs: withTs.length ? withTs[0].tsMs : null };
}

// First index with ts[i] >= target (lower_bound). PURE.
function lowerBound(ts, target) {
  let lo = 0, hi = ts.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (ts[mid] < target) lo = mid + 1; else hi = mid; }
  return lo;
}
// First index with ts[i] > target (upper_bound). PURE.
function upperBound(ts, target) {
  let lo = 0, hi = ts.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (ts[mid] <= target) lo = mid + 1; else hi = mid; }
  return lo;
}

/**
 * Weighted token sum over the closed window [startMs, endMs] from a prefix index.
 * Both bounds inclusive. PURE.
 */
export function weightedInWindow(prefixData, startMs, endMs) {
  const { ts, prefix } = prefixData;
  if (!ts.length || endMs < startMs) return 0;
  const lo = lowerBound(ts, startMs);
  const hi = upperBound(ts, endMs);
  return prefix[hi] - prefix[lo];
}

function median(nums) {
  return percentile(nums, 0.5);
}

/**
 * Linear-interpolation percentile (numpy type-7) over an unsorted array. p in
 * [0,1]. null for an empty array. PURE.
 */
export function percentile(nums, p) {
  const s = nums.filter((n) => Number.isFinite(n)).slice().sort((a, b) => a - b);
  if (!s.length) return null;
  if (s.length === 1) return s[0];
  const idx = (s.length - 1) * Math.min(1, Math.max(0, p));
  const lo = Math.floor(idx);
  const frac = idx - lo;
  return lo + 1 < s.length ? s[lo] + frac * (s[lo + 1] - s[lo]) : s[lo];
}

/**
 * Calibrate the observed ceiling from usage records + session-limit events. For
 * each crossing (cluster-first event) the ceiling estimate is the weighted sum
 * over [T-5h, T]. An observation is "partial" if our record history does not cover
 * the full 5h before the event (would undercount) -- partial observations are
 * surfaced but EXCLUDED from the min/median/max unless they are all we have (R12).
 * Returns { observations, full, min, median, max, count, partialCount }. PURE.
 */
export function calibrateFromEvidence(records, events, { windowMs = FIVE_HOURS_MS, clusterGapMs = FIVE_HOURS_MS } = {}) {
  const deduped = dedupKeepMaxTs(records);
  const prefixData = buildPrefixSums(deduped);
  const crossings = clusterEvents(events, clusterGapMs);
  const observations = crossings.map((e) => {
    const start = e.tsMs - windowMs;
    const ceiling = weightedInWindow(prefixData, start, e.tsMs);
    // partial = we lack records covering the full window start (history truncated)
    const partial = prefixData.earliestMs == null || prefixData.earliestMs > start;
    return {
      tsMs: e.tsMs,
      at: new Date(e.tsMs).toISOString(),
      ceiling,
      coverage: partial ? "partial" : "full",
      reset: parseResetClock(e.text),
      sessionId: e.sessionId || null,
    };
  });
  const full = observations.filter((o) => o.coverage === "full");
  const usable = full.length ? full : observations; // fall back to partial only if no full obs
  const ceilings = usable.map((o) => o.ceiling).filter((c) => c > 0).sort((a, b) => a - b);
  return {
    observations,
    usedCoverage: full.length ? "full" : (observations.length ? "partial-fallback" : "none"),
    ceilings,
    min: ceilings.length ? ceilings[0] : null,
    p25: percentile(ceilings, 0.25),
    median: median(ceilings),
    p90: percentile(ceilings, 0.9),
    max: ceilings.length ? ceilings[ceilings.length - 1] : null,
    count: ceilings.length,
    partialCount: observations.length - full.length,
  };
}

// Minimum observations before a percentile is meaningful; below this we fall back
// to the single safe lower bound (the min). With <4 crossings a p25 is noise.
const MIN_OBS_FOR_PERCENTILE = 4;

/**
 * Recommend an arm budget from calibration stats. R12/R16 -- this is the number
 * that decides when the fleet swaps accounts, so the aggregator matters:
 *   - MIN is UNSAFE: the lowest crossings are dominated by the SEPARATE weekly
 *     limit / Opus sub-limit firing at a low 5h sum (observed live: a 12M crossing
 *     among 30+ days of 70-176M). Arming at min would thrash accounts every session.
 *   - MEDIAN is UNSAFE: it OVER-shoots low-but-real 5h days (arming above a real
 *     cutoff -> we get blocked before the switch fires).
 * So we use the robust LOWER percentile (p25 of full-coverage crossings): below
 * most real 5h cutoffs (never-blocked, honoring "autonomous no matter what") while
 * rejecting the artifact outliers. With <4 observations a percentile is noise, so
 * we fall back to the single min (the only honest lower bound we have). Returns the
 * budget to pass to `arm-account-switch --budget` (arm fires the swap at `pct` of
 * it). null when no usable observation exists. PURE.
 */
export function recommendBudget(stats, pct = DEFAULT_ARM_PCT) {
  if (!stats || stats.count == null || stats.count < 1) return null;
  const enough = stats.count >= MIN_OBS_FOR_PERCENTILE;
  const basisValue = enough ? stats.p25 : stats.min;
  if (basisValue == null || !(basisValue > 0)) return null;
  return {
    budget: Math.round(basisValue),      // pass to --budget; arm applies its own pct
    triggerAt: Math.round(basisValue * pct),
    pct,
    basis: enough ? "p25-observed-ceiling" : "min-observed-ceiling (few obs)",
    // P1: with <4 crossings the basis IS the raw min, which can be a weekly-limit/
    // sub-limit artifact (the very thing p25 rejects). Flag it so the actuation
    // point (arm --auto) refuses to auto-arm a low-confidence ceiling without an
    // explicit operator override -- one artifact crossing must not drive the switch.
    lowConfidence: !enough,
    min: stats.min,
    p25: stats.p25,
    median: stats.median,
    max: stats.max,
  };
}

/**
 * Live status math. PURE.
 * @param {number} currentWeighted  rolling 5h weighted sum (now)
 * @param {number|null} ceiling     observed/configured ceiling (weighted tokens)
 * @param {number} burnWeighted     weighted tokens in the trailing burn window
 * @param {number} burnWindowMs     length of that trailing window
 */
export function computeStatus({ currentWeighted, ceiling, burnWeighted, burnWindowMs }) {
  const burnPerMin = burnWindowMs > 0 ? burnWeighted / (burnWindowMs / 60000) : 0;
  const hasCeiling = Number.isFinite(ceiling) && ceiling > 0;
  const pctUsed = hasCeiling ? currentWeighted / ceiling : null;
  const remaining = hasCeiling ? Math.max(0, ceiling - currentWeighted) : null;
  const etaMinutes = hasCeiling && burnPerMin > 0 ? remaining / burnPerMin : null;
  return {
    currentWeighted,
    ceiling: hasCeiling ? ceiling : null,
    pctUsed,
    remaining,
    burnPerMin,
    etaMinutes,
    zone: pctUsed == null ? "unknown" : pctUsed >= 0.92 ? "critical" : pctUsed >= 0.75 ? "warn" : "ok",
  };
}

/**
 * Effective rolling-window length, floored at the last account-switch boundary. After a switch
 * <requestedMs ago, the window shrinks to [boundary, now] so ONLY the current account's usage is
 * summed (the new account's fresh budget tracks from 0). Backward-compatible: a null/older boundary
 * returns requestedMs unchanged. Never larger than requestedMs, never negative. PURE.
 * @param {number} nowMs
 * @param {number} requestedMs  the nominal window (5h, or the burn window)
 * @param {number|null} boundaryMs  last account-switch instant, or null
 */
export function effectiveWindowMs(nowMs, requestedMs, boundaryMs) {
  if (!Number.isFinite(boundaryMs)) return requestedMs;
  const floorStart = nowMs - requestedMs;
  if (boundaryMs <= floorStart) return requestedMs; // boundary older than the window -> no effect
  return Math.max(0, nowMs - boundaryMs);
}

// ============================== I/O (injectable) ==============================

/**
 * Stream ONE transcript line-by-line (never loads the whole file -- the multi-
 * hundred-MB transcripts would blow V8's 512MB string cap; see the tribal-index
 * clobber lesson). Cheap substring prefilter before JSON.parse. Collects usage
 * records (tsMs >= sinceMs) and session-limit 429 events (tsMs >= sinceMs).
 * Fail-soft: a bad line is skipped, a bad file resolves to empty.
 * @returns {Promise<{usageRecords:object[], events:object[]}>}
 */
export function scanTranscript(file, { sinceMs = 0, _fs = fsDefault } = {}) {
  return new Promise((resolve) => {
    const usageRecords = [];
    const events = [];
    let stream;
    try {
      stream = _fs.createReadStream(file, { encoding: "utf8" });
    } catch {
      resolve({ usageRecords, events });
      return;
    }
    stream.on("error", () => resolve({ usageRecords, events }));
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (!line) return;
      const hasUsage = line.includes('"usage"');
      const hasRl = line.includes('"apiErrorStatus"');
      if (!hasUsage && !hasRl) return;
      let block;
      try { block = JSON.parse(line); } catch { return; }
      if (hasRl) {
        const ev = classifyRateLimitRecord(block);
        if (ev && ev.kind === "session-limit" && ev.tsMs != null && ev.tsMs >= sinceMs) events.push(ev);
      }
      if (hasUsage) {
        const rec = extractUsageTsFromBlock(block);
        if (rec && rec.tsMs != null && rec.tsMs >= sinceMs) usageRecords.push(rec);
      }
    });
    rl.on("close", () => resolve({ usageRecords, events }));
    rl.on("error", () => resolve({ usageRecords, events }));
  });
}

/** Read the observed-ceiling sidecar -> doc or null (missing/corrupt). Fail-soft. */
export function readObservedCeiling(file = DEFAULT_OBSERVED_CEILING_PATH, _fs = fsDefault) {
  try { return JSON.parse(_fs.readFileSync(file, "utf8")); } catch { return null; }
}

/** Atomic write (tmp + rename). Creates the dir. Throws on failure (fail-loud). */
export function writeObservedCeiling(file, doc, _fs = fsDefault) {
  const dir = path.dirname(file);
  if (!_fs.existsSync(dir)) _fs.mkdirSync(dir, { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  _fs.writeFileSync(tmp, JSON.stringify(doc, null, 2));
  _fs.renameSync(tmp, file);
}

/**
 * The most-recent account-switch boundary (epoch ms), or null if none. Reads BOTH sources and
 * returns the MAX (latest switch) that is finite and not in the future:
 *   (a) the manual marker {switchedAtMs|switchedAt} written by --mark-switch, and
 *   (b) the latest status:"switched" record in the auto-switch coordinator ledger
 *       (account-switch-monitor.jsonl), so an AUTO swap also floors the window with no manual step.
 * Fail-soft: a missing/corrupt source contributes nothing (never throws). Injected fs for tests.
 */
export function readSwitchBoundaryMs({
  nowMs,
  boundaryPath = DEFAULT_SWITCH_BOUNDARY_PATH,
  monitorPath = DEFAULT_SWITCH_MONITOR_PATH,
  _fs = fsDefault,
} = {}) {
  const candidates = [];
  // (a) manual marker
  try {
    const doc = JSON.parse(_fs.readFileSync(boundaryPath, "utf8"));
    const ms = Number(doc?.switchedAtMs);
    if (Number.isFinite(ms)) candidates.push(ms);
    else if (typeof doc?.switchedAt === "string") {
      const p = parseTsMs(doc.switchedAt);
      if (p != null) candidates.push(p);
    }
  } catch { /* no manual marker -- fine */ }
  // (b) latest auto-coordinator "switched" event (scan from the tail, stop at the first hit)
  try {
    const lines = _fs.readFileSync(monitorPath, "utf8").split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line || !line.includes('"switched"')) continue;
      let rec;
      try { rec = JSON.parse(line); } catch { continue; }
      if (rec && rec.status === "switched" && typeof rec.at === "string") {
        const p = parseTsMs(rec.at);
        if (p != null) { candidates.push(p); break; }
      }
    }
  } catch { /* no ledger -- fine */ }
  const valid = candidates.filter((m) => Number.isFinite(m) && (!Number.isFinite(nowMs) || m <= nowMs));
  return valid.length ? Math.max(...valid) : null;
}

/**
 * Stamp a manual account-switch boundary at `atMs` (atomic tmp+rename, fail-loud). The operator runs
 * `--mark-switch` immediately after logging into a different Claude account; the live tracker then
 * floors the 5h window here so the new account's budget tracks from 0. Returns the written doc.
 */
export function writeSwitchBoundary(atMs, { account = null, boundaryPath = DEFAULT_SWITCH_BOUNDARY_PATH, _fs = fsDefault } = {}) {
  if (!Number.isFinite(atMs)) throw new Error("writeSwitchBoundary: atMs (finite epoch ms) is required");
  const doc = {
    schemaVersion: "1.0.0",
    switchedAtMs: atMs,
    switchedAt: new Date(atMs).toISOString(),
    account: account || null,
    note: "account-switch boundary -- five-hour-limit-tracker floors the rolling 5h window here so the new account's budget tracks from 0 (true per-account real-time tracking).",
  };
  const dir = path.dirname(boundaryPath);
  if (!_fs.existsSync(dir)) _fs.mkdirSync(dir, { recursive: true });
  const tmp = `${boundaryPath}.tmp-${process.pid}`;
  _fs.writeFileSync(tmp, JSON.stringify(doc, null, 2));
  _fs.renameSync(tmp, boundaryPath);
  return doc;
}

// ============================== ORCHESTRATORS ==============================

/**
 * Mine all transcripts for session-limit 429s, calibrate the observed ceiling,
 * recommend an arm budget, and (unless write===false) persist the result.
 * @param {object} opts
 * @param {number} opts.nowMs        REQUIRED clock (injected; no Date.now in core path)
 * @param {number} [opts.sinceDays]  only events/records newer than this (default 30)
 * @param {number} [opts.pct]        arm pct for the recommendation (default 0.92)
 * @param {boolean}[opts.write]      write the observed-ceiling sidecar (default true)
 * @param {string} [opts.projectsRoot] / [opts.ceilingPath]
 * @param {function}[opts._scan]     injected scanTranscript (tests)
 * @param {function}[opts._list]     injected listTranscripts (tests)
 * @param {object} [opts._fs]        injected fs (tests)
 */
export async function calibrateCeiling({
  nowMs,
  sinceDays = DEFAULT_SINCE_DAYS,
  pct = DEFAULT_ARM_PCT,
  write = true,
  windowMs = FIVE_HOURS_MS,
  projectsRoot = defaultProjectsRoot(),
  ceilingPath = DEFAULT_OBSERVED_CEILING_PATH,
  _scan = scanTranscript,
  _list = listTranscripts,
  _fs = fsDefault,
} = {}) {
  if (!Number.isFinite(nowMs)) throw new Error("calibrateCeiling: nowMs (finite epoch ms) is required");
  const sinceMs = nowMs - sinceDays * DAY_MS;
  const files = _list(projectsRoot, { _fs });
  const allRecords = [];
  const allEvents = [];
  for (const f of files) {
    const { usageRecords, events } = await _scan(f, { sinceMs, _fs });
    if (usageRecords.length) allRecords.push(...usageRecords);
    if (events.length) allEvents.push(...events);
  }
  const stats = calibrateFromEvidence(allRecords, allEvents, { windowMs });
  const recommend = recommendBudget(stats, pct);
  // observedCeiling is the ROBUST estimate the system arms against (recommend.budget
  // = p25 of crossings, or min when <4 obs), NOT the raw min -- see recommendBudget.
  const observedCeiling = recommend ? recommend.budget : null;
  // hardCeilingEstimate is the REALISTIC level near which blocking actually occurs
  // (p90 of crossings, or max with <4 obs) -- the honest denominator for the live
  // "% to limit" so the operator is not falsely alarmed at the conservative arm
  // point (R7: arm-trigger and proximity-to-limit are orthogonal signals).
  const hardCeilingEstimate = stats.count >= MIN_OBS_FOR_PERCENTILE ? stats.p90 : stats.max;
  const doc = {
    schemaVersion: "1.0.0",
    source: "five-hour-limit-tracker:429-session-limit-calibration",
    computedAt: new Date(nowMs).toISOString(),
    sinceDays,
    windowMs,
    transcriptsScanned: files.length,
    usageRecords: allRecords.length,
    sessionLimitEvents: allEvents.length,
    observedCeiling,                     // robust CONSERVATIVE arm estimate (recommend.budget) -- when to switch
    hardCeilingEstimate,                 // REALISTIC near-blocking level (p90) -- the honest live "% to limit" denominator
    minObservedCrossing: stats.min,      // raw lowest crossing (often a weekly-limit/sub-limit artifact)
    p25Crossing: stats.p25,
    medianCrossing: stats.median,
    p90Crossing: stats.p90,
    maxObservedCrossing: stats.max,
    crossings: stats.count,
    partialCrossings: stats.partialCount,
    usedCoverage: stats.usedCoverage,
    lowConfidence: recommend ? !!recommend.lowConfidence : null, // <4 crossings -> arm --auto refuses without override
    caveat: "Low crossings (well below the cluster) likely reflect the SEPARATE weekly/sub limit, not the 5h ceiling; the robust p25 rejects them. The 5h window here is rolling [T-5h,T]; Anthropic's block is fixed-clock, so a crossing slightly over-estimates that block's usage.",
    recommend,
    observations: stats.observations,
  };
  if (write && observedCeiling != null) writeObservedCeiling(ceilingPath, doc, _fs);
  return { ...doc, wrote: !!(write && observedCeiling != null) };
}

/**
 * Live status: current rolling-5h weighted (cheap, peek-tail), trailing-window
 * burn rate, % of the observed/configured ceiling, projected time-to-limit.
 * Ceiling precedence: explicit opts.ceiling > observed-ceiling sidecar >
 * PRISM_5H_WEIGHTED_BUDGET env. Reuses fiveHourTokenSum (correct at "now").
 */
export function liveStatus({
  nowMs,
  ceiling = null,
  burnWindowMs = DEFAULT_BURN_WINDOW_MS,
  projectsRoot = defaultProjectsRoot(),
  ceilingPath = DEFAULT_OBSERVED_CEILING_PATH,
  switchBoundaryPath = DEFAULT_SWITCH_BOUNDARY_PATH,
  switchMonitorPath = DEFAULT_SWITCH_MONITOR_PATH,
  env = process.env,
  _sum = fiveHourTokenSum,
  _readCeiling = readObservedCeiling,
  _readBoundary = readSwitchBoundaryMs,
  _fs = fsDefault,
} = {}) {
  if (!Number.isFinite(nowMs)) throw new Error("liveStatus: nowMs (finite epoch ms) is required");
  // Per-account floor: after a switch the rolling 5h window starts at the switch instant, so the
  // NEW account's budget tracks from 0 (else the sum counts the old account's tokens -> false ~100%).
  const boundaryMs = _readBoundary({ nowMs, boundaryPath: switchBoundaryPath, monitorPath: switchMonitorPath, _fs });
  const effFullMs = effectiveWindowMs(nowMs, FIVE_HOURS_MS, boundaryMs);
  const effBurnMs = effectiveWindowMs(nowMs, burnWindowMs, boundaryMs);
  const full = _sum({ nowMs, windowMs: effFullMs, projectsRoot, _fs });
  const burn = _sum({ nowMs, windowMs: effBurnMs, projectsRoot, _fs });
  // The status "% to limit" uses the REALISTIC hard ceiling (p90), NOT the
  // conservative arm point -- otherwise it falsely reads >100% while the account
  // is still working (R7: proximity != arm trigger). The arm trigger is reported
  // separately so the operator sees both: "how close am I" + "would the switch fire".
  let resolvedCeiling = Number.isFinite(ceiling) && ceiling > 0 ? ceiling : null;
  let ceilingSource = resolvedCeiling != null ? "explicit" : null;
  let armTrigger = null;
  if (resolvedCeiling == null) {
    const doc = _readCeiling(ceilingPath, _fs);
    if (doc) {
      const hard = Number(doc.hardCeilingEstimate);
      const obs = Number(doc.observedCeiling);
      if (Number.isFinite(hard) && hard > 0) { resolvedCeiling = hard; ceilingSource = "observed-sidecar:hard(p90)"; }
      else if (Number.isFinite(obs) && obs > 0) { resolvedCeiling = obs; ceilingSource = "observed-sidecar:arm(p25)"; }
      if (doc.recommend && Number.isFinite(Number(doc.recommend.triggerAt))) armTrigger = Number(doc.recommend.triggerAt);
    }
  }
  if (resolvedCeiling == null) {
    const envBudget = Number(env?.PRISM_5H_WEIGHTED_BUDGET);
    if (Number.isFinite(envBudget) && envBudget > 0) { resolvedCeiling = envBudget; ceilingSource = "env-budget"; }
  }
  const status = computeStatus({
    currentWeighted: full.weightedTokens,
    ceiling: resolvedCeiling,
    burnWeighted: burn.weightedTokens,
    burnWindowMs: effBurnMs,
  });
  const flooredToSwitch = Number.isFinite(boundaryMs) && effFullMs < FIVE_HOURS_MS;
  return {
    ...status,
    ceilingSource,
    armTrigger,
    armWouldFire: armTrigger != null ? full.weightedTokens >= armTrigger : null,
    nowMs,
    usedTokensRaw: full.usedTokens,
    transcriptsInWindow: full.transcriptsInWindow,
    cappedTranscripts: full.cappedTranscripts,
    // Per-account boundary signal: when flooredToSwitch, the % reflects ONLY the current account's
    // usage since the switch (true real-time per-account tracking), not the old account's tokens.
    accountSwitchBoundaryMs: Number.isFinite(boundaryMs) ? boundaryMs : null,
    accountSwitchBoundaryAt: Number.isFinite(boundaryMs) ? new Date(boundaryMs).toISOString() : null,
    windowFlooredToSwitch: flooredToSwitch,
    effectiveWindowMs: effFullMs,
  };
}

// ============================== CLI ==============================

function parseArgs(argv) {
  const a = { mode: "calibrate", json: false, write: true, sinceDays: DEFAULT_SINCE_DAYS, pct: DEFAULT_ARM_PCT };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--status") a.mode = "status";
    else if (t === "--calibrate") a.mode = "calibrate";
    else if (t === "--mark-switch") a.mode = "mark-switch";
    else if (t === "--account") a.account = argv[++i];
    else if (t === "--json") a.json = true;
    else if (t === "--no-write") a.write = false;
    else if (t === "--since-days") a.sinceDays = Number(argv[++i]);
    else if (t === "--pct") a.pct = Number(argv[++i]);
  }
  return a;
}

function fmt(n) {
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : String(n);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === "mark-switch") {
    const now = Date.now();
    const doc = writeSwitchBoundary(now, { account: args.account });
    if (args.json) { process.stdout.write(JSON.stringify(doc, null, 2) + "\n"); return; }
    process.stdout.write(
      `[5h-tracker] account-switch boundary STAMPED at ${doc.switchedAt}` +
        (doc.account ? ` (account=${doc.account})` : "") + "\n" +
      `  The live 5h window now floors here -- the new account's budget tracks from 0.\n` +
      `  Verify: node H:/prism/scripts/five-hour-limit-tracker.mjs --status\n`,
    );
    return;
  }
  if (args.mode === "status") {
    const s = liveStatus({ nowMs: Date.now() });
    if (args.json) { process.stdout.write(JSON.stringify(s, null, 2) + "\n"); return; }
    const pctStr = s.pctUsed == null ? "n/a (no ceiling -- run --calibrate)" : `${(s.pctUsed * 100).toFixed(1)}%`;
    const eta = s.etaMinutes == null ? "n/a" : `${s.etaMinutes.toFixed(0)} min`;
    const armLine = s.armTrigger == null ? "  arm trigger      : (not calibrated)\n"
      : `  arm trigger      : ${fmt(s.armTrigger)} -> switch ${s.armWouldFire ? "WOULD FIRE NOW" : "not yet"}\n`;
    process.stdout.write(
      `[5h-tracker] LIVE  zone=${s.zone}\n` +
      `  current weighted : ${fmt(s.currentWeighted)}\n` +
      `  hard ceiling est : ${s.ceiling == null ? "unknown" : fmt(s.ceiling)} (source=${s.ceilingSource || "none"})\n` +
      `  used (realistic) : ${pctStr}\n` +
      (s.windowFlooredToSwitch
        ? `  account switch   : window floored to ${s.accountSwitchBoundaryAt} (eff ${(s.effectiveWindowMs / 3600000).toFixed(2)}h -- NEW account, tracking from 0)\n`
        : s.accountSwitchBoundaryAt
          ? `  account switch   : last ${s.accountSwitchBoundaryAt} (>5h ago -- full window)\n`
          : "") +
      armLine +
      `  burn rate        : ${fmt(s.burnPerMin)} weighted/min\n` +
      `  time to limit    : ${eta}\n` +
      `  transcripts/win  : ${s.transcriptsInWindow}${s.cappedTranscripts ? ` (capped:${s.cappedTranscripts})` : ""}\n`,
    );
    return;
  }
  const r = await calibrateCeiling({ nowMs: Date.now(), sinceDays: args.sinceDays, pct: args.pct, write: args.write });
  if (args.json) { process.stdout.write(JSON.stringify(r, null, 2) + "\n"); return; }
  process.stdout.write(`[5h-tracker] CALIBRATE  (scanned ${r.transcriptsScanned} transcripts, last ${r.sinceDays}d)\n`);
  process.stdout.write(`  session-limit 429 events : ${r.sessionLimitEvents}  -> distinct crossings: ${r.crossings} (partial:${r.partialCrossings}, coverage=${r.usedCoverage})\n`);
  if (r.observedCeiling == null) {
    process.stdout.write(
      "  observed ceiling : NONE -- no session-limit 429 in the window. Keep running; the\n" +
      "  tracker will calibrate the first time the account hits its 5h limit. Until then\n" +
      "  the account-switch stays in dry-run (no honest ceiling to arm against -- R12).\n",
    );
    // MARKER-DRIFT WARN (R12): 0 events across MANY transcripts is suspicious -- if a
    // 5h limit has been hit recently, Claude Code may have changed its rate-limit
    // record shape (the isCompactSummary->compact_boundary regression class). Surface
    // it LOUD so a silently-frozen ceiling is caught, not mistaken for "never limited".
    if (r.sessionLimitEvents === 0 && r.transcriptsScanned > 5) {
      process.stdout.write(
        `  WARNING: 0 session-limit 429 events across ${r.transcriptsScanned} transcripts. If you HAVE\n` +
        "  hit a 5h limit recently, the transcript rate-limit marker may have changed shape\n" +
        "  (verify: grep a recent transcript for '\"apiErrorStatus\":429'). Do NOT assume the\n" +
        "  account is simply under its limit -- a marker change would silently freeze calibration.\n",
      );
    }
    return;
  }
  process.stdout.write(
    `  crossing distribution (weighted tokens): min=${fmt(r.minObservedCrossing)}  p25=${fmt(r.p25Crossing)}  median=${fmt(r.medianCrossing)}  max=${fmt(r.maxObservedCrossing)}\n` +
    `  robust ceiling (arm basis=${r.recommend ? r.recommend.basis : "n/a"}): ${fmt(r.observedCeiling)}\n` +
    `  note: low crossings likely = separate weekly/sub limit, not the 5h ceiling (rejected by p25).\n`,
  );
  for (const o of r.observations) {
    process.stdout.write(`    - ${o.at}  crossing=${fmt(o.ceiling)}  coverage=${o.coverage}${o.reset ? `  resets=${o.reset.raw}` : ""}\n`);
  }
  if (r.recommend) {
    // P2a: forward a non-default --pct so the recommended command fires at exactly
    // the reported triggerAt (arm-account-switch applies its OWN default 0.92 if --pct is omitted).
    const pctArg = r.recommend.pct !== DEFAULT_ARM_PCT ? ` --pct ${r.recommend.pct}` : "";
    process.stdout.write(
      `\n  RECOMMENDED ARM (switches at ${(r.recommend.pct * 100).toFixed(0)}% = ${fmt(r.recommend.triggerAt)} weighted):\n` +
      `    node H:/prism/scripts/arm-account-switch.mjs --budget ${r.recommend.budget}${pctArg}\n` +
      `  or one-command:  node H:/prism/scripts/arm-account-switch.mjs --auto\n` +
      `  (operator-gated -- arming swaps credentials + staggered-restarts the fleet)\n`,
    );
    if (r.recommend.lowConfidence) {
      process.stdout.write(
        `  WARNING: LOW CONFIDENCE -- only ${r.crossings} crossing(s) (<${4}); the basis is the raw min, which\n` +
        `  may be a weekly-limit artifact. 'arm --auto' will REFUSE this ceiling without --accept-low-confidence.\n`,
      );
    }
  }
  process.stdout.write(`  wrote observed-ceiling sidecar: ${r.wrote ? DEFAULT_OBSERVED_CEILING_PATH : "(skipped)"}\n`);
}

const __direct = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; }
})();
if (__direct) {
  main().catch((e) => { process.stderr.write(`[5h-tracker] fatal: ${e?.stack || e}\n`); process.exit(1); });
}
