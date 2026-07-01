/**
 * bg-app-throttle.mjs — pure-injected helper for FLEET-REAPER-MS3/U-FR-MS3-B.
 *
 * Tier-1.5 between soft-relief and serviceRestart: under memory squeeze,
 * drop the top-N non-Claude heavy processes (Chrome/Discord/Steam) to
 * BelowNormal priority. Reversible (hysteresis: drop at memPressurePct,
 * restore at memPressurePct - 5). The apps don't notice (idle UI threads
 * don't lose anything) and Claude gets the cycles.
 *
 * Strictly additive; respects fleet-wide PRISM_FLEET_REAPER_DISABLE plus its
 * own PRISM_FR_BG_THROTTLE_DISABLE kill switch.
 *
 * Anti-regression rules from spec U-FR-MS3-B:
 *   1. Exclusion list is exhaustive — anything not listed gets throttled
 *      (preferred over false-positive exclusion). Claude descendants are
 *      ALWAYS excluded (computed from procIndex, not hardcoded names).
 *   2. Hysteresis asymmetric — drop at memPressurePct, restore at -5.
 *   3. Stamp file capped at 1 MB; if exceeded, restore all + reset.
 *   4. PRISM_FR_BG_THROTTLE_DISABLE=1 reverts to no-op.
 *   5. Never apply to a PID more than once without restoring first
 *      (stamp tracks touched PIDs; second-pass skips already-throttled).
 *
 * Knobs:
 *   PRISM_FR_BG_THROTTLE_DISABLE=1     master kill switch
 *   PRISM_FR_BG_THROTTLE_TOP_N=N       max candidates per sweep, clamp 1..10 (default 3)
 *   PRISM_FR_BG_THROTTLE_MIN_RSS_MB=N  floor — only consider procs over this RSS (default 500)
 */

const HYSTERESIS_PCT = 5;
export const DEFAULT_TOP_N = 3;
export const DEFAULT_MIN_RSS_MB = 500;
export const MIN_TOP_N = 1;
export const MAX_TOP_N = 10;
export const MIN_MIN_RSS_MB = 64;
export const MAX_MIN_RSS_MB = 32768;
export const STAMP_MAX_BYTES = 1024 * 1024;

// Names that are ALWAYS excluded from throttling. Lowercase compared.
// (Claude descendants are computed dynamically — not on this list — so a
//  hypothetical non-claude.exe child of claude.exe is still protected.)
const EXCLUDED_NAMES = new Set([
  "claude.exe", "node.exe", "git.exe", "bash.exe", "sh.exe",
  "pwsh.exe", "powershell.exe", "python.exe", "python3.exe",
  "csrss.exe", "winlogon.exe", "services.exe", "lsass.exe",
  "svchost.exe", "dwm.exe", "explorer.exe", "wininit.exe",
  "system", "idle", "smss.exe", "registry", "memory compression",
  "system idle process",
]);

function clampInt(v, def, lo, hi) {
  // null/undefined → default (env-var miss is the canonical caller; Number(null)=0
  // would otherwise clamp to MIN which is the wrong fallback semantic).
  if (v === null || v === undefined) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}

/** Resolve a process's full ancestor chain (PIDs only) up to maxHops. */
export function ancestorChain(pid, procIndex, maxHops = 12) {
  const chain = [];
  const seen = new Set();
  let cur = pid;
  for (let i = 0; i < maxHops; i++) {
    if (!Number.isFinite(cur) || cur <= 0 || seen.has(cur)) break;
    seen.add(cur);
    const p = procIndex.get(cur);
    if (!p) break;
    chain.push(cur);
    if (!Number.isFinite(p.ppid) || p.ppid <= 0) break;
    cur = p.ppid;
  }
  return chain;
}

/** True if pid is claude.exe or any descendant of one. */
export function isClaudeRelated(pid, procIndex) {
  const chain = ancestorChain(pid, procIndex);
  for (const ancestor of chain) {
    const p = procIndex.get(ancestor);
    if (p && (p.name || "").toLowerCase() === "claude.exe") return true;
  }
  return false;
}

/**
 * True if a process should be excluded from throttling. Reasons:
 *   - name is in EXCLUDED_NAMES (Claude-related runtimes + OS critical procs)
 *   - process is Claude-related (descendant of any claude.exe)
 *   - process is currently Realtime priority (RT-critical, e.g., audio drivers)
 *   - process exe path starts with C:\Windows\System32\ (defensive)
 */
export function shouldExclude(proc, procIndex) {
  if (!proc || !Number.isFinite(proc.pid)) return true;
  const name = (proc.name || "").toLowerCase();
  if (EXCLUDED_NAMES.has(name)) return true;
  if (proc.priorityClass === "Realtime" || proc.priorityClass === 256) return true;
  if (typeof proc.executablePath === "string") {
    const p = proc.executablePath.toLowerCase();
    if (p.startsWith("c:\\windows\\system32\\") || p.startsWith("c:/windows/system32/")) return true;
  }
  if (isClaudeRelated(proc.pid, procIndex)) return true;
  return false;
}

/**
 * Pure decision: which procs are throttle candidates this sweep?
 * Returns the top-N processes sorted by RSS descending, filtered by
 * exclusion + RSS floor + not-already-stamped.
 *
 * @param {Array<object>} procs   process list with {pid, name, rssBytes, ...}
 * @param {Map<number,object>} procIndex  for ancestor resolution
 * @param {object} opts
 * @param {number} [opts.topN]
 * @param {number} [opts.minRssMb]
 * @param {Set<number>} [opts.alreadyThrottled]  PIDs from prior stamp
 */
export function pickThrottleCandidates(procs, procIndex, {
  topN = DEFAULT_TOP_N,
  minRssMb = DEFAULT_MIN_RSS_MB,
  alreadyThrottled = new Set(),
} = {}) {
  if (!Array.isArray(procs)) return [];
  const minRssBytes = minRssMb * 1024 * 1024;
  const eligible = [];
  for (const p of procs) {
    if (!Number.isFinite(p?.rssBytes)) continue;
    if (p.rssBytes < minRssBytes) continue;
    if (alreadyThrottled.has(p.pid)) continue;
    if (shouldExclude(p, procIndex)) continue;
    eligible.push(p);
  }
  eligible.sort((a, b) => (b.rssBytes || 0) - (a.rssBytes || 0));
  return eligible.slice(0, topN);
}

/**
 * Pure decision: should we throttle, restore, or no-op this sweep?
 * Returns one of {action: "throttle"|"restore"|"noop", ...}.
 *
 * Hysteresis: drop at memPressurePct, restore at memPressurePct - 5.
 * - usedPct >= memPressurePct AND no prior throttle → "throttle" new candidates
 * - usedPct >= memPressurePct AND prior throttle exists → "throttle" any NEW eligible (excludes already-throttled)
 * - usedPct < memPressurePct - 5 AND prior throttle exists → "restore" all
 * - otherwise → "noop"
 */
export function decideAction({
  usedPct,
  memPressurePct,
  hysteresisDrop = HYSTERESIS_PCT,
  priorStampPids = [],
  env = process.env,
} = {}) {
  if (env.PRISM_FR_BG_THROTTLE_DISABLE === "1") return { action: "noop", reason: "disabled-by-env" };
  if (env.PRISM_FLEET_REAPER_DISABLE === "1") return { action: "noop", reason: "master-disabled" };
  if (!Number.isFinite(usedPct) || !Number.isFinite(memPressurePct)) {
    return { action: "noop", reason: "invalid-pressure" };
  }
  const restoreAt = Math.max(0, memPressurePct - hysteresisDrop);
  const hasPriorThrottle = Array.isArray(priorStampPids) && priorStampPids.length > 0;
  if (usedPct >= memPressurePct) return { action: "throttle", reason: "pressure-warn", restoreAt };
  if (hasPriorThrottle && usedPct < restoreAt) return { action: "restore", reason: "pressure-cleared", restoreAt };
  return { action: "noop", reason: hasPriorThrottle ? "in-hysteresis-band" : "below-pressure", restoreAt };
}

/** Construct the stamp payload (pure). */
export function buildStamp({
  nowMs = Date.now(),
  topN,
  minRssMb,
  usedPctAtThrottle,
  memPressurePct,
  pids = [],
  pidDetails = [],
} = {}) {
  return {
    schemaVersion: 1,
    throttledAt: nowMs,
    throttledAtIso: new Date(nowMs).toISOString(),
    usedPctAtThrottle,
    memPressurePct,
    topN,
    minRssMb,
    pids,
    pidDetails,
  };
}

/** Read + parse the stamp file. Fail-soft: missing/corrupt → empty stamp. */
export function readStamp(path, _io = {}) {
  const exists = _io.existsSync || ((p) => {
    try { require("node:fs").accessSync(p); return true; } catch { return false; }
  });
  const read = _io.readFileSync || ((p) => require("node:fs").readFileSync(p, "utf8"));
  const stat = _io.statSync || ((p) => require("node:fs").statSync(p));
  if (!exists(path)) return { pids: [], pidDetails: [] };
  try {
    const s = stat(path);
    if (s.size > STAMP_MAX_BYTES) {
      // Per spec rule #3 — if exceeded, caller restores all + resets. Surface
      // as the special "oversized" stamp so the caller can react.
      return { oversized: true, pids: [], pidDetails: [] };
    }
    const text = read(path, "utf8");
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return { pids: [], pidDetails: [] };
    return {
      ...parsed,
      pids: Array.isArray(parsed.pids) ? parsed.pids.filter(p => Number.isFinite(p) && p > 0) : [],
      pidDetails: Array.isArray(parsed.pidDetails) ? parsed.pidDetails : [],
    };
  } catch {
    return { pids: [], pidDetails: [] };
  }
}

/** Test-only clamping accessors. */
export function clampTopN(v) { return clampInt(v, DEFAULT_TOP_N, MIN_TOP_N, MAX_TOP_N); }
export function clampMinRssMb(v) { return clampInt(v, DEFAULT_MIN_RSS_MB, MIN_MIN_RSS_MB, MAX_MIN_RSS_MB); }

/** Test-only EXCLUDED_NAMES accessor (defensive — don't mutate). */
export function _excludedNamesForTest() { return new Set(EXCLUDED_NAMES); }
