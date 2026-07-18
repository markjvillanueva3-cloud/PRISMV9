/**
 * galaxy-knowledge-ledger.mjs -- durable iteration + saturation ledger for the
 * fleet-wide knowledge-accretion loop (FLEET-KNOWLEDGE-MAX / U-ZKM-ITERATE,
 * slot:zulu 2026-06-14).
 *
 * WHY: the operator goal is "loop every galaxy >=10x each, extracting reputable
 * external sources (courses/books/articles/seminars/videos), until physically
 * impossible (no more reputable sources)". That prose is UNBOUNDED -- it has no
 * stop test. This ledger converts it into a DETERMINISTIC loss function so a cron
 * loop can terminate honestly (R12):
 *
 *   A galaxy is SATURATED  <=>  iterations >= targetIterations (default 10)
 *                               AND the last `saturationConsecutive` (default 2)
 *                               iterations EACH added < noveltyThreshold new
 *                               reputable sources.
 *
 * "new reputable sources -> 0" is the measurable proxy for "no more reputable
 * sources to extract". novelty is computed against the galaxy's cumulative
 * source-key set, so re-citing an already-used source does NOT count as novelty.
 *
 * This module is PURE + side-effect-free except load/save (atomic write, fail
 * loud on a corrupt existing ledger -- never clobber, mirrors the tribal-index
 * fail-loud lesson [[reference_tribal_index_v8_string_cap_2026_06_08]]).
 *
 * The per-iteration WORK unit is the existing, proven `galaxy-deepen-foundations`
 * workflow (WebFetch-confirmed, R12-gated, physics-safe). This ledger only TRACKS
 * + GATES it; it never fabricates sources.
 *
 * ASCII-only. Node >=18 (uses node:fs, node:crypto).
 */

import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync, openSync, closeSync, unlinkSync, statSync } from "node:fs";
import { dirname } from "node:path";

export const SCHEMA_VERSION = "1.0.0";

export const DEFAULTS = Object.freeze({
  targetIterations: 10, // operator: ">=10 times each"
  noveltyThreshold: 2, // an iteration adding < 2 NEW sources is "low novelty"
  saturationConsecutive: 2, // # consecutive low-novelty iters (past target) to saturate
  maxIterations: 30, // HARD ceiling: saturate regardless of novelty. Backstop against a model
  // hallucinating fresh-looking citations forever (which would reset the low-novelty streak and
  // defeat the novelty->0 stop). 30 = 3x the >=10 floor; configurable. The novelty rule normally
  // fires first; this just guarantees physical termination.
});

/** Stable key for a source so re-citing the same URL/title is not counted as novel. */
export function sourceKey(s) {
  if (s == null) return "";
  let str = String(s).trim().toLowerCase();
  // strip protocol + trailing slash so http/https + trailing-slash variants collapse
  str = str.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return str;
}

/** Build a fresh ledger for a list of galaxy descriptors {galaxy, owner, physics, file}. */
export function initLedger(galaxies, opts = {}) {
  if (!Array.isArray(galaxies) || galaxies.length === 0) {
    throw new Error("initLedger: galaxies must be a non-empty array");
  }
  const cfg = { ...DEFAULTS, ...opts };
  const out = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: opts.at || null,
    config: {
      targetIterations: cfg.targetIterations,
      noveltyThreshold: cfg.noveltyThreshold,
      saturationConsecutive: cfg.saturationConsecutive,
      maxIterations: cfg.maxIterations,
    },
    galaxies: {},
  };
  for (const g of galaxies) {
    const name = typeof g === "string" ? g : g.galaxy;
    if (!name) throw new Error("initLedger: every galaxy needs a name");
    if (out.galaxies[name]) throw new Error(`initLedger: duplicate galaxy '${name}'`);
    out.galaxies[name] = {
      galaxy: name,
      owner: (typeof g === "object" && g.owner) || null,
      physics: !!(typeof g === "object" && g.physics),
      file: (typeof g === "object" && g.file) || `knowledge/wiki/${name}/${name}-foundations.md`,
      iterations: 0,
      totalNewSources: 0,
      consecutiveLowNovelty: 0,
      saturated: false,
      sourceKeys: [], // cumulative distinct source keys consumed
      history: [], // [{iter, newSources, courseBookSources, novelSources, note, at}]
    };
  }
  return out;
}

function cfgOf(ledger) {
  return { ...DEFAULTS, ...(ledger.config || {}) };
}

/** Pure saturation test over a galaxy entry + config (no ledger lookup) -- single source of truth. */
function computeSaturated(cfg, e) {
  if (e.iterations >= cfg.maxIterations) return true; // hard ceiling backstop
  return e.iterations >= cfg.targetIterations && e.consecutiveLowNovelty >= cfg.saturationConsecutive;
}

/** Saturation predicate -- the deterministic loss function. Pure. */
export function isSaturated(ledger, galaxy) {
  const e = ledger.galaxies?.[galaxy];
  if (!e) throw new Error(`isSaturated: unknown galaxy '${galaxy}'`);
  return computeSaturated(cfgOf(ledger), e);
}

/**
 * Record one completed iteration for a galaxy. Mutates + returns the ledger entry.
 *  result: { sources: string[] (URLs/titles cited this iter),
 *            courseBookSources?: number, note?: string, at?: string }
 * novelty = count of sources whose key is NOT already in the galaxy's cumulative set.
 */
export function recordIteration(ledger, galaxy, result = {}) {
  const e = ledger.galaxies?.[galaxy];
  if (!e) throw new Error(`recordIteration: unknown galaxy '${galaxy}'`);
  const cfg = cfgOf(ledger);

  const seen = new Set(e.sourceKeys);
  const citedKeys = Array.isArray(result.sources) ? result.sources.map(sourceKey).filter(Boolean) : [];
  let novel = 0;
  for (const k of citedKeys) {
    if (!seen.has(k)) {
      seen.add(k);
      novel += 1;
    }
  }

  e.iterations += 1;
  e.totalNewSources += novel;
  e.sourceKeys = Array.from(seen);

  if (novel < cfg.noveltyThreshold) e.consecutiveLowNovelty += 1;
  else e.consecutiveLowNovelty = 0;

  e.saturated = computeSaturated(cfg, e); // cached convenience; isSaturated() is authoritative

  e.history.push({
    iter: e.iterations,
    newSources: novel,
    citedSources: citedKeys.length,
    courseBookSources: Number(result.courseBookSources) || 0,
    note: result.note ? String(result.note).slice(0, 240) : "",
    at: result.at || null,
  });
  if (result.at) ledger.updatedAt = result.at;
  return e;
}

/** The `n` least-iterated, non-saturated galaxies -- what the cron/Workflow picks next.
 *  Uses computeSaturated (NOT the cached e.saturated flag) so a post-init config change can never
 *  desync scheduling from the live loss function (single source of truth). */
export function nextGalaxies(ledger, n = 3) {
  const cfg = cfgOf(ledger);
  const open = Object.values(ledger.galaxies)
    .filter((e) => !computeSaturated(cfg, e))
    .sort((a, b) => a.iterations - b.iterations || a.galaxy.localeCompare(b.galaxy));
  return open.slice(0, Math.max(0, n));
}

/** Whole-fleet termination: every galaxy saturated (computed, not the cached flag). */
export function fleetDone(ledger) {
  const cfg = cfgOf(ledger);
  return Object.values(ledger.galaxies).every((e) => computeSaturated(cfg, e));
}

/** Compact progress summary. Pure. */
export function summary(ledger) {
  const gals = Object.values(ledger.galaxies);
  const cfg = cfgOf(ledger);
  return {
    schemaVersion: ledger.schemaVersion,
    total: gals.length,
    saturated: gals.filter((e) => computeSaturated(cfg, e)).length,
    atTarget: gals.filter((e) => e.iterations >= cfg.targetIterations).length,
    totalIterations: gals.reduce((s, e) => s + e.iterations, 0),
    minIterations: gals.length ? Math.min(...gals.map((e) => e.iterations)) : 0,
    maxIterations: gals.length ? Math.max(...gals.map((e) => e.iterations)) : 0,
    fleetDone: fleetDone(ledger),
    target: cfg.targetIterations,
  };
}

/** Load -- FAIL LOUD on a corrupt existing ledger (never silently re-init + clobber). */
export function loadLedger(path) {
  if (!existsSync(path)) return null;
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    throw new Error(`loadLedger: cannot read existing ledger ${path}: ${e.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // existing file present but unparseable -> fail loud, do NOT return null (which would clobber)
    throw new Error(`loadLedger: existing ledger ${path} is corrupt (will NOT clobber): ${e.message}`);
  }
  if (!parsed || typeof parsed !== "object" || !parsed.galaxies) {
    throw new Error(`loadLedger: existing ledger ${path} missing 'galaxies' (will NOT clobber)`);
  }
  return parsed;
}

/** Atomic save (tmp + rename). Stamps updatedAt if `at` given. */
export function saveLedger(path, ledger, at) {
  if (!ledger || !ledger.galaxies) throw new Error("saveLedger: refusing to write a ledger with no galaxies");
  if (at) ledger.updatedAt = at;
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(ledger, null, 2), "utf8");
  renameSync(tmp, path);
  return path;
}

const LOCK_STALE_MS = 10 * 60 * 1000; // a lock older than this is presumed orphaned (crashed holder)

/** Synchronous sleep without busy-spin (Atomics.wait on a throwaway buffer). */
function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) { /* spin fallback if SAB unavailable */ }
  }
}

/**
 * Cross-process exclusive lock on `${path}.lock` (O_EXCL create). Serializes the cron and a manual
 * --record so a whole-document save never silently overwrites a concurrent writer's update (scrutiny
 * P1 lost-update fix). Stale locks (>10 min, crashed holder) are reclaimed. Released in finally.
 */
export function withLock(path, fn, { retries = 80, intervalMs = 250 } = {}) {
  const lockPath = `${path}.lock`;
  let fd = null;
  for (let i = 0; ; i++) {
    try {
      fd = openSync(lockPath, "wx"); // wx = O_CREAT|O_EXCL|O_WRONLY -> throws EEXIST if held
      break;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > LOCK_STALE_MS) { unlinkSync(lockPath); continue; }
      } catch { /* lock vanished between stat + use -> retry */ }
      if (i >= retries) throw new Error(`withLock: ${lockPath} still held after ${retries} retries`);
      sleepSync(intervalMs);
    }
  }
  try {
    return fn();
  } finally {
    try { closeSync(fd); } catch { /* already closed */ }
    try { unlinkSync(lockPath); } catch { /* already gone */ }
  }
}

/**
 * Lock + RELOAD-fresh + mutate + save, atomically vs other processes. `mutate(ledger)` runs against the
 * freshly-reloaded ledger (so a concurrent writer's committed update is never lost). If absent and
 * `galaxies` is supplied, inits; else throws. Returns mutate()'s return value.
 */
export function lockedUpdate(path, mutate, { at, galaxies } = {}) {
  return withLock(path, () => {
    let ledger = loadLedger(path);
    if (!ledger) {
      if (!galaxies) throw new Error("lockedUpdate: no ledger present and no galaxies to init");
      ledger = initLedger(galaxies, { at });
    }
    const r = mutate(ledger);
    saveLedger(path, ledger, at);
    return r;
  });
}
